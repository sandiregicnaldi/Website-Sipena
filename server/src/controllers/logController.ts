import { Request, Response } from "express";
import { db } from "../db";
import { auditLogs, sessions, stages, users, appSettings } from "../db/schema";
import { eq, and, gte, lte, gt, isNotNull, sql } from "drizzle-orm";
import { CATEGORIES } from "../data/categories";

export const LogController = {
    async getLogs(req: Request, res: Response) {
        try {
            const type = (req.query.type as string) || 'activity';
            const dateFrom = req.query.dateFrom as string | undefined;
            const dateTo   = req.query.dateTo   as string | undefined;

            const fromDate = dateFrom ? new Date(dateFrom + 'T00:00:00') : null;
            const toDate   = dateTo   ? new Date(dateTo   + 'T23:59:59') : null;

            // ── Tab 1: Login ─────────────────────────────────────────────
            if (type === 'login') {
                const allSessions = await db.query.sessions.findMany({
                    with: { user: true },
                    orderBy: (s, { desc }) => [desc(s.createdAt)],
                    limit: 1000,
                });

                const filtered = allSessions.filter(s => {
                    const t = s.createdAt ? new Date(s.createdAt) : null;
                    if (!t) return true;
                    if (fromDate && t < fromDate) return false;
                    if (toDate   && t > toDate)   return false;
                    return true;
                });

                return res.json(filtered.map(s => ({
                    id:        s.id,
                    time:      s.createdAt,
                    userName:  (s as any).user?.name  || '—',
                    userEmail: (s as any).user?.email || '—',
                    role:      (s as any).user?.role  || '—',
                    ipAddress: s.ipAddress,
                    userAgent: s.userAgent,
                    expiresAt: s.expiresAt,
                })));
            }

            // ── Tab 2: Revisi ─────────────────────────────────────────────
            if (type === 'revision') {
                // Step 1: Get all audit_log revision entries (recorded after system deployed)
                const conds: any[] = [eq(auditLogs.action, 'revise_stage')];
                if (fromDate) conds.push(gte(auditLogs.createdAt, fromDate));
                if (toDate)   conds.push(lte(auditLogs.createdAt, toDate));

                const auditRevisionLogs = await db.query.auditLogs.findMany({
                    where: and(...conds),
                    with:  { user: true },
                    orderBy: (l, { desc }) => [desc(l.createdAt)],
                    limit: 1000,
                });

                // Step 2: Build a timestamp-based map for deduplication.
                const allRevAuditLogs = await db.query.auditLogs.findMany({
                    where: eq(auditLogs.action, 'revise_stage'),
                    columns: { targetId: true, createdAt: true },
                });

                const auditTimestampsPerStage = new Map<string, number[]>();
                for (const log of allRevAuditLogs) {
                    if (!log.targetId || !log.createdAt) continue;
                    const arr = auditTimestampsPerStage.get(log.targetId) || [];
                    arr.push(new Date(log.createdAt).getTime());
                    auditTimestampsPerStage.set(log.targetId, arr);
                }

                const isNoteAlreadyTracked = (stageId: string, noteTimeMs: number): boolean => {
                    const tracked = auditTimestampsPerStage.get(stageId) || [];
                    return tracked.some(t => Math.abs(t - noteTimeMs) < 60_000); // within 60s
                };

                // Step 3: Get all historical stages with revisions
                const revisedStages = await db.query.stages.findMany({
                    where: gt(stages.revisionCount, 0),
                    with: { project: true, pj: true },
                });

                // Step 4: For each stage, expand each [REVISI] note into a separate entry.
                const historicalLogs: any[] = [];
                for (const s of revisedStages) {
                    const notesList = (s.notes as any[]) || [];
                    const revisionNotes = notesList.filter(n => n.text?.startsWith('[REVISI]'));

                    if (revisionNotes.length === 0) {
                        // Fallback: revisedAt -> deadline -> project createdAt -> now
                        const time = s.revisedAt || 
                                     s.deadline || 
                                     (s.project?.createdAt ? new Date(s.project.createdAt) : null) || 
                                     new Date();
                        const timeMs = new Date(time).getTime();
                        if (isNoteAlreadyTracked(s.id, timeMs)) continue;
                        if (fromDate && time < fromDate) continue;
                        if (toDate   && time > toDate)   continue;

                        historicalLogs.push({
                            id: `hist-rev-${s.id}-0`,
                            createdAt: time,
                            action: 'revise_stage',
                            target: `${(s as any).project?.title || '—'} → ${s.label}`,
                            targetId: s.id,
                            user: { name: s.revisionReason ? 'Admin' : '—' },
                            meta: { reason: s.revisionReason || '—', revisionCount: s.revisionCount },
                            ipAddress: null,
                        });
                    } else {
                        // One entry per [REVISI] note, skipping those already in audit_log
                        revisionNotes.forEach((note, idx) => {
                            const time = note.time ? new Date(note.time) : 
                                         (s.revisedAt || 
                                          s.deadline || 
                                          (s.project?.createdAt ? new Date(s.project.createdAt) : null) || 
                                          new Date());
                            const timeMs = time.getTime();

                            // Skip if already tracked in audit_log
                            if (isNoteAlreadyTracked(s.id, timeMs)) return;

                            // Apply date filter per note
                            if (fromDate && time < fromDate) return;
                            if (toDate   && time > toDate)   return;

                            const reason = note.text.replace('[REVISI]', '').trim();
                            const requester = note.from || 'Admin';

                            historicalLogs.push({
                                id: `hist-rev-${s.id}-${idx}`,
                                createdAt: time,
                                action: 'revise_stage',
                                target: `${(s as any).project?.title || '—'} → ${s.label}`,
                                targetId: s.id,
                                user: { name: requester },
                                meta: {
                                    reason,
                                    revisionCount: idx + 1,
                                    pjName: (s as any).pj?.name || '—',
                                },
                                ipAddress: null,
                            });
                        });
                    }
                }

                const combined = [...auditRevisionLogs, ...historicalLogs];
                combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                return res.json(combined);
            }

            // ── Tab 3: Persetujuan ────────────────────────────────────────
            if (type === 'approval') {
                // Step 1: Get audit_log approval entries
                const conds: any[] = [eq(auditLogs.action, 'approve_stage')];
                if (fromDate) conds.push(gte(auditLogs.createdAt, fromDate));
                if (toDate)   conds.push(lte(auditLogs.createdAt, toDate));

                const auditApprovalLogs = await db.query.auditLogs.findMany({
                    where: and(...conds),
                    with:  { user: true },
                    orderBy: (l, { desc }) => [desc(l.createdAt)],
                    limit: 1000,
                });

                // Step 1.5: Build map of stage scores for fallback (dengan dynamic master score)
                let categoriesMap: Record<string, any> = CATEGORIES;
                try {
                    const settingsRow = await db.query.appSettings.findFirst({
                        where: sql`${appSettings.key} = 'categories'`,
                    });
                    if (settingsRow?.value) {
                        categoriesMap = settingsRow.value as Record<string, any>;
                    }
                } catch {}

                const allDoneStages = await db.query.stages.findMany({
                    with: { project: true }
                });
                const stageScoreMap = new Map<string, number>();
                for (const stg of allDoneStages) {
                    if (!stg.id) continue;
                    let calculatedScore = (stg.score !== undefined && stg.score !== null) ? Number(stg.score) : 0;
                    if ((stg.score === undefined || stg.score === null) && stg.project) {
                        const catKey = stg.project.category?.toLowerCase() || 'lainnya';
                        const masterStages: any[] = categoriesMap?.[catKey]?.stages || [];
                        const masterStage = masterStages.find(
                            (s: any) => s.label?.trim().toLowerCase() === stg.label?.trim().toLowerCase()
                        );
                        if (masterStage && masterStage.score !== undefined) {
                            if (masterStage.perPageScore && masterStage.perPageScore > 0 && stg.project.pageCount && stg.project.pageCount > 0) {
                                const multiplier = Number(masterStage.pageMultiplier) || 1;
                                calculatedScore = Math.round(((stg.project.pageCount / multiplier) * Number(masterStage.perPageScore)) * 100) / 100;
                            } else {
                                calculatedScore = Number(masterStage.score) || 0;
                            }
                        }
                    }
                    stageScoreMap.set(stg.id, calculatedScore);
                }

                const enrichedAuditApprovalLogs = auditApprovalLogs.map((l: any) => {
                    const metaScore = (l.meta?.score !== undefined && l.meta?.score !== null) ? Number(l.meta.score) : null;
                    const fallbackScore = stageScoreMap.get(l.targetId);
                    const finalScore = metaScore !== null ? metaScore : (fallbackScore !== undefined ? fallbackScore : 0);
                    return {
                        ...l,
                        meta: {
                            ...l.meta,
                            score: finalScore
                        }
                    };
                });

                // Step 2: For historical approvals, build stageId -> audit_log approval timestamps map
                const allAppAuditLogs = await db.query.auditLogs.findMany({
                    where: eq(auditLogs.action, 'approve_stage'),
                    columns: { targetId: true, createdAt: true },
                });

                const appTimestampsPerStage = new Map<string, number[]>();
                for (const log of allAppAuditLogs) {
                    if (!log.targetId || !log.createdAt) continue;
                    const arr = appTimestampsPerStage.get(log.targetId) || [];
                    arr.push(new Date(log.createdAt).getTime());
                    appTimestampsPerStage.set(log.targetId, arr);
                }

                // Step 3: Get real admin users for historical approver names
                const adminUsers = await db.query.users.findMany({
                    where: eq(users.role, 'admin'),
                    columns: { id: true, name: true },
                });
                const fallbackApproverName = adminUsers[0]?.name || 'Admin';

                // Step 4: Get all completed stages (status = 'done') that have a real PJ
                const completedStages = await db.query.stages.findMany({
                    where: and(
                        eq(stages.status, 'done'),
                        isNotNull(stages.pjId)
                    ),
                    with: { project: true, pj: true },
                });

                const historicalApprovals: any[] = [];
                for (const s of completedStages) {
                    // Determine accurate approval time
                    const approvalTime = s.approvedAt || 
                                         (s.notes && s.notes.length > 0 ? new Date(s.notes[s.notes.length - 1].time) : null) || 
                                         s.deadline || 
                                         (s.project?.createdAt ? new Date(s.project.createdAt) : null) || 
                                         new Date();
                    const approvalMs   = new Date(approvalTime).getTime();

                    // Skip if already tracked in audit_log (within 60s of a known approval timestamp)
                    const tracked = appTimestampsPerStage.get(s.id) || [];
                    const alreadyTracked = tracked.some(t => Math.abs(t - approvalMs) < 60_000);
                    if (alreadyTracked) continue;

                    // Apply date filter
                    if (fromDate && approvalTime < fromDate) continue;
                    if (toDate   && approvalTime > toDate)   continue;

                    historicalApprovals.push({
                        id: `hist-app-${s.id}`,
                        createdAt: approvalTime,
                        action: 'approve_stage',
                        target: `${(s as any).project?.title || '—'} → ${s.label}`,
                        targetId: s.id,
                        user: { name: fallbackApproverName, role: 'admin' },
                        meta: { pjName: (s as any).pj?.name || '—', score: s.score || 0 },
                        ipAddress: null,
                    });
                }

                const combined = [...enrichedAuditApprovalLogs, ...historicalApprovals];
                combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                return res.json(combined);
            }

            // ── Default: Semua aktivitas (audit_log) ─────────────────────
            const conds: any[] = [];
            if (fromDate) conds.push(gte(auditLogs.createdAt, fromDate));
            if (toDate)   conds.push(lte(auditLogs.createdAt, toDate));

            const logs = await db.query.auditLogs.findMany({
                where: conds.length > 0 ? and(...conds) : undefined,
                with:  { user: true },
                orderBy: (l, { desc }) => [desc(l.createdAt)],
                limit: 1000,
            });
            return res.json(logs);

        } catch (error) {
            console.error("[LogController.getLogs] error:", error);
            res.status(500).json({ error: "Failed to fetch logs" });
        }
    },
};
