
import { Request, Response } from "express";
import { StageService } from "../services/stageService";
import { db } from "../db";
import { stages, projects, users, appSettings, auditLogs } from "../db/schema";
import { eq, and, asc, sql } from "drizzle-orm";
import { CATEGORIES } from "../data/categories";
import { z } from "zod";
import { notifyUser, notifyAllAdmins } from "../services/telegramService";
import { writeAuditLog } from "../services/logService";
import { getRequiredSkills } from "../data/skillMapping";
import { autoAssignStages } from "../services/autoAssignService";


const updateStageSchema = z.object({
    label: z.string().optional(),
    description: z.string().nullable().optional(),
    status: z.enum(['draft', 'active', 'review', 'revision', 'done', 'archived']).optional(),
    progress: z.number().min(0).max(100).optional(),
    deadline: z.string().optional(), // Date string
    pjId: z.string().nullable().optional(), // User ID
    coPjId: z.string().nullable().optional(), // User ID (legacy single co-PJ)
    coPjIds: z.array(z.string()).max(2).optional(), // Array of User IDs (maksimal 2 kolaborator)
    resultLink: z.string().optional(),
    notes: z.array(z.object({ from: z.string(), text: z.string(), time: z.string() })).optional(),
    score: z.number().min(0).optional(),
    proposalStatus: z.enum(['pending', 'accepted', 'rejected']).nullable().optional(),
});

const addNoteSchema = z.object({
    from: z.string(),
    text: z.string(),
    time: z.string(),
    attachment: z.string().optional(),  // URL gambar/file yang dilampirkan (dari clipboard atau file input)
});

export const StageController = {
    async update(req: Request, res: Response) {
        try {
            const data = updateStageSchema.parse(req.body);
            const stageId = String(req.params.id);
            const isAdmin = req.user?.role === 'admin' || req.user?.isReviewer === true || req.user?.role === 'reviewer';
            const userId = req.user?.id;

            console.log(`[StageController.update] stageId=${stageId}, isAdmin=${isAdmin}, userId=${userId}, body=`, JSON.stringify(req.body));

            // Fetch stage for authorization checks
            const existingStage = await db.query.stages.findFirst({
                where: eq(stages.id, stageId),
            });

            if (!existingStage) {
                return res.status(404).json({ error: "Stage not found" });
            }

            // Authorization check: only PJ or admin can update
            if (!isAdmin) {
                const isMyStage = (!!userId && existingStage.pjId === userId) || 
                    (!!userId && existingStage.coPjIds && Array.isArray(existingStage.coPjIds) && (existingStage.coPjIds as string[]).includes(userId)) || 
                    (!!userId && existingStage.coPjId === userId);
                const isOnlyAssigning = Object.keys(data).every(k => ['pjId', 'coPjId', 'coPjIds', 'deadline', 'score'].includes(k));

                // --- BYPASS: PJ Penyuntingan sebagai Reviewer Tata Letak Naskah ---
                let isTataLetakReviewer = false;
                const isTataLetakStage = existingStage.label?.trim().toLowerCase() === 'tata letak naskah';
                if (isTataLetakStage) {
                    const stageProject = await db.query.projects.findFirst({
                        where: eq(projects.id, existingStage.projectId),
                        columns: { id: true, category: true, createdBy: true },
                    });
                    if (stageProject?.category === 'terbitan') {
                        const suntingStage = await db.query.stages.findFirst({
                            where: sql`${stages.projectId} = ${existingStage.projectId} AND LOWER(TRIM(${stages.label})) = 'penyuntingan'`
                        });
                        if (suntingStage && suntingStage.pjId === userId) {
                            isTataLetakReviewer = true;
                        }
                    }
                }
                // --- END BYPASS ---

                // For non-lainnya: only the stage's PJ or project creator can update
                // For lainnya: anyone can assign PJ/deadline on unassigned stages
                const stageProjectAuth = await db.query.projects.findFirst({
                    where: eq(projects.id, existingStage.projectId),
                    columns: { id: true, category: true, createdBy: true },
                });
                const isProjectCreator = stageProjectAuth?.createdBy === userId;
                
                // isTataLetakReviewer gets full pass — checked BEFORE the isMyStage gate
                if (!isTataLetakReviewer) {
                    if (!isMyStage && !isProjectCreator) {
                        const isFlexible = !['terbitan', 'medsos', 'keuangan'].includes(stageProjectAuth?.category || '');
                        const isUpdatingLabel = (data.label !== undefined || data.description !== undefined) && Object.keys(data).every(k => ['label', 'description'].includes(k));

                        // Block if: not lainnya, OR lainnya but trying to change more than just pjId/deadline/label
                        if (!isFlexible || (!isOnlyAssigning && !isUpdatingLabel)) {
                            return res.status(403).json({ error: "Forbidden: Anda bukan penanggung jawab tahap ini" });
                        }
                    }

                    // Non-admin can only update: progress, resultLink, status (to 'review', 'active', or 'archived'), label
                    if (data.status && data.status !== 'review' && data.status !== 'active' && data.status !== 'archived') {
                        return res.status(403).json({ error: "Forbidden: Status tidak diizinkan untuk diubah oleh user" });
                    }
                }

                // Non-admin cannot assign PJ or change deadline — EXCEPT for 'lainnya' category projects, Project Creator, or PJ of this stage
                if (data.pjId !== undefined || data.deadline || data.coPjId !== undefined) {
                    const stageProject = await db.query.projects.findFirst({
                        where: eq(projects.id, existingStage.projectId),
                        columns: { id: true, category: true, createdBy: true },
                    });
                    const isFlexible = !['terbitan', 'medsos', 'keuangan'].includes(stageProject?.category || '');
                    const isCreator = stageProject?.createdBy === userId;
                    
                    if (!stageProject || (!isFlexible && !isCreator && !isMyStage)) {
                        return res.status(403).json({ error: "Forbidden: Hanya admin, pembuat proyek, atau PJ tahapan yang bisa mengubah penugasan" });
                    }
                    if (!isCreator && isMyStage && !isFlexible) {
                        if (data.pjId !== undefined && data.pjId !== existingStage.pjId) {
                            return res.status(403).json({ error: "Forbidden: Anda hanya diizinkan untuk mengubah PJ pendamping (Join PJ)." });
                        }
                        if (data.deadline && existingStage.deadline && new Date(data.deadline).getTime() !== existingStage.deadline.getTime()) {
                            return res.status(403).json({ error: "Forbidden: Anda tidak diizinkan untuk merubah deadline." });
                        }
                    }
                }
            } else {
                // Admin restriction: cannot update progress or resultLink on stages assigned to other PJs
                // EXCEPT when performing QC actions (status change to 'revision' or 'done')
                const isAdminPjOfStage = existingStage.pjId === userId || 
                    (existingStage.coPjIds && Array.isArray(existingStage.coPjIds) && (existingStage.coPjIds as string[]).includes(userId as string)) || 
                    existingStage.coPjId === userId;
                const isQcAction = data.status === 'revision' || data.status === 'done';
                if (!isAdminPjOfStage && existingStage.pjId && !isQcAction) {
                    if (data.progress !== undefined) {
                        return res.status(403).json({ error: "Forbidden: Admin tidak bisa mengubah progress tahapan PJ lain" });
                    }
                    if (data.resultLink) {
                        return res.status(403).json({ error: "Forbidden: Admin tidak bisa mengubah link hasil kerja PJ lain" });
                    }
                }
            }

            // Build updateData explicitly — strip empty strings that would break PostgreSQL types
            const updateData: any = {};
            if (data.label) updateData.label = data.label;
            if (data.description !== undefined) updateData.description = data.description || null;
            if (data.status) updateData.status = data.status;
            if (data.pjId !== undefined) updateData.pjId = data.pjId || null;
            
            // Kolaborator / Co-PJ handling (maksimal 2 orang)
            if (data.coPjIds !== undefined) {
                const targetPjId = data.pjId !== undefined ? data.pjId : existingStage.pjId;
                const cleanCoPjIds = Array.from(new Set(data.coPjIds.filter(id => id && id !== targetPjId))).slice(0, 2);
                updateData.coPjIds = cleanCoPjIds;
                updateData.coPjId = cleanCoPjIds[0] || null; // sync legacy column
            } else if (data.coPjId !== undefined) {
                updateData.coPjId = data.coPjId || null;
                updateData.coPjIds = data.coPjId ? [data.coPjId] : [];
            }

            if (data.resultLink) updateData.resultLink = data.resultLink;
            if (data.progress !== undefined) updateData.progress = data.progress;
            if (data.deadline) updateData.deadline = new Date(data.deadline);
            if (data.notes) updateData.notes = data.notes;
            if (data.score !== undefined) updateData.score = data.score;
            if (data.proposalStatus !== undefined) updateData.proposalStatus = data.proposalStatus;

            // --- PRELIM SAJA: Jika Tata Letak Naskah & isPrelimOnly ---
            if (existingStage.label?.trim().toLowerCase() === 'tata letak naskah' && ((data as any).isPrelimOnly === true || (data as any).meta?.isPrelimOnly === true)) {
                updateData.score = 5;
            }

            console.log(`[StageController.update] updateData=`, JSON.stringify(updateData));

            // Set approvedAt timestamp (HANYA jika belum pernah disetujui sebelumnya) dan reviewerId saat status disetujui 'done'
            if (data.status === 'done' && existingStage.status !== 'done') {
                if (!existingStage.approvedAt) {
                    updateData.approvedAt = new Date();
                }
                // Simpan siapa yang approve (admin reviewer atau PJ penyuntingan)
                let isTataLetakReviewerObj = false;
                if (!isAdmin && existingStage.label?.trim().toLowerCase() === 'tata letak naskah') {
                    const stageProject = await db.query.projects.findFirst({
                        where: eq(projects.id, existingStage.projectId),
                        columns: { id: true, category: true },
                    });
                    if (stageProject?.category === 'terbitan') {
                        const suntingStage = await db.query.stages.findFirst({
                            where: sql`${stages.projectId} = ${existingStage.projectId} AND LOWER(TRIM(${stages.label})) = 'penyuntingan'`
                        });
                        if (suntingStage && suntingStage.pjId === userId) {
                            isTataLetakReviewerObj = true;
                        }
                    }
                }

                if (isAdmin || isTataLetakReviewerObj) {
                    updateData.reviewerId = userId;
                }
            }

            // Fitur B: Auto-fill skor dari master data saat approval
            // Berlaku jika status di-set ke 'done' dan admin TIDAK menginput skor manual (atau skor masih 0)
            if (data.status === 'done' && existingStage.status !== 'done' && updateData.score === undefined) {
                try {
                    const approvalProject = await db.query.projects.findFirst({
                        where: eq(projects.id, existingStage.projectId),
                        columns: { id: true, category: true, pageCount: true },
                    });
                    if (approvalProject) {
                        let categoriesMap: Record<string, any> = CATEGORIES;
                        const settingsRow = await db.query.appSettings.findFirst({
                            where: sql`${appSettings.key} = 'categories'`,
                        });
                        if (settingsRow?.value) {
                            categoriesMap = settingsRow.value as Record<string, any>;
                        }
                        const catKey = approvalProject.category?.toLowerCase() || 'lainnya';
                        const masterStages: any[] = categoriesMap?.[catKey]?.stages || [];
                        const ms = masterStages.find((m: any) =>
                            m.label?.trim().toLowerCase() === existingStage.label?.trim().toLowerCase()
                        );
                        if (ms) {
                            let autoScore = 0;
                            const pc = Number(approvalProject.pageCount) || 0;
                            if (ms.perPageScore && Number(ms.perPageScore) > 0 && pc > 0) {
                                const multiplier = Number(ms.pageMultiplier) || 10;
                                autoScore = Math.round((pc / multiplier) * Number(ms.perPageScore) * 100) / 100;
                            } else if (ms.score !== undefined) {
                                autoScore = Number(ms.score) || 0;
                            }
                            if (autoScore > 0) {
                                updateData.score = autoScore;
                                console.log(`[auto-fill score] ${existingStage.label}: autoScore=${autoScore} (pageCount=${pc})`);
                            }
                        }
                    }
                } catch (e) {
                    console.error('[auto-fill score] Gagal mengisi skor otomatis:', e);
                }
            }

            const stage = await StageService.updateStage(stageId, updateData);
            res.json(stage);

            // Audit log: stage approved
            if (data.status === 'done' && existingStage.status !== 'done') {
                const stageWithProject = await db.query.stages.findFirst({
                    where: eq(stages.id, stageId),
                    with: { project: true, pj: true },
                });
                const pjUser = (stageWithProject as any)?.pj;
                let calculatedScore = (stageWithProject as any)?.score !== undefined && (stageWithProject as any)?.score !== null
                    ? Number((stageWithProject as any).score)
                    : 0;
                if (((stageWithProject as any)?.score === undefined || (stageWithProject as any)?.score === null) && (stageWithProject as any)?.project) {
                    try {
                        let categoriesMap: Record<string, any> = CATEGORIES;
                        const settingsRow = await db.query.appSettings.findFirst({
                            where: sql`${appSettings.key} = 'categories'`,
                        });
                        if (settingsRow?.value) {
                            categoriesMap = settingsRow.value as Record<string, any>;
                        }
                        const proj = (stageWithProject as any).project;
                        const catKey = proj.category?.toLowerCase() || 'lainnya';
                        const masterStages: any[] = categoriesMap?.[catKey]?.stages || [];
                        const masterStage = masterStages.find(
                            (s: any) => s.label?.trim().toLowerCase() === existingStage.label?.trim().toLowerCase()
                        );
                        if (masterStage && masterStage.score !== undefined) {
                            if (masterStage.perPageScore && masterStage.perPageScore > 0 && proj.pageCount && proj.pageCount > 0) {
                                const multiplier = Number(masterStage.pageMultiplier) || 1;
                                calculatedScore = Math.round(((proj.pageCount / multiplier) * Number(masterStage.perPageScore)) * 100) / 100;
                            } else {
                                calculatedScore = Number(masterStage.score) || 0;
                            }
                        }
                    } catch (e) {
                        console.error('Failed to compute dynamic score for audit log:', e);
                    }
                }

                writeAuditLog({
                    userId,
                    action: 'approve_stage',
                    target: `${(stageWithProject as any)?.project?.title} → ${existingStage.label}`,
                    targetId: stageId,
                    meta: {
                        projectId: existingStage.projectId,
                        stageLabel: existingStage.label,
                        pjId: existingStage.pjId || null,
                        pjName: pjUser?.name || '—',
                        score: calculatedScore,
                    },
                    ipAddress: req.ip,
                });
            }

            // Audit log: stage score updated / corrected
            if (data.score !== undefined && existingStage.score !== data.score) {
                const stageWithProject = await db.query.stages.findFirst({
                    where: eq(stages.id, stageId),
                    with: { project: true, pj: true },
                });
                const pjUser = (stageWithProject as any)?.pj;
                writeAuditLog({
                    userId,
                    action: 'update_project',
                    target: `Koreksi Poin: ${(stageWithProject as any)?.project?.title} → ${existingStage.label} (${existingStage.score || 0} → ${data.score} Poin)`,
                    targetId: stageId,
                    meta: {
                        projectId: existingStage.projectId,
                        stageLabel: existingStage.label,
                        pjId: existingStage.pjId || null,
                        pjName: pjUser?.name || '—',
                        oldScore: existingStage.score || 0,
                        newScore: data.score,
                    },
                    ipAddress: req.ip,
                });

                // Update approve_stage audit log entries so approval log stays 100% in sync
                try {
                    const approveLogs = await db.query.auditLogs.findMany({
                        where: and(eq(auditLogs.action, 'approve_stage'), eq(auditLogs.targetId, stageId))
                    });
                    for (const al of approveLogs) {
                        await db.update(auditLogs).set({
                            meta: { ...(al.meta as object || {}), score: data.score }
                        }).where(eq(auditLogs.id, al.id));
                    }
                } catch (e) {
                    console.error('Failed to sync approve_stage audit log score:', e);
                }
            }

            // Kirim notifikasi Telegram berdasarkan perubahan status
            if (data.status) {
                // Ambil data proyek & stage lengkap untuk konteks pesan
                const fullStage = await db.query.stages.findFirst({
                    where: eq(stages.id, stageId),
                    with: { project: true },
                });

                setImmediate(async () => {
                    if (!fullStage) return;
                    const projectTitle = (fullStage as any).project?.title || stageId;

                    // PJ mengubah status → review: Notif ke semua admin
                    if (data.status === 'review' && existingStage.pjId) {
                        const pjUser = await db.query.users.findFirst({
                            where: eq(users.id, existingStage.pjId),
                            columns: { name: true },
                        });
                        await notifyAllAdmins([
                            `🔍 <b>MENUNGGU REVIEW / QC</b>`,
                            ``,
                            `<b>${pjUser?.name || 'PJ'}</b> telah menyelesaikan tahap:`,
                            `📄 Proyek: <b>${projectTitle}</b>`,
                            `📌 Tahap: <b>${fullStage.label}</b>`,
                            ``,
                            `Silakan lakukan review dan approve/reject di Dasbor Penerbitan.`,
                        ].join('\n'));
                    }

                    // Admin revisi → revision: Notif ke PJ tahap tersebut
                    if (data.status === 'revision' && existingStage.pjId) {
                        const revisionNote = (data.notes as any)?.[data.notes!.length - 1]?.text || '';
                        await notifyUser(existingStage.pjId, [
                            `❌ <b>HASIL KERJA PERLU DIREVISI</b>`,
                            ``,
                            `Tahapan Anda dikembalikan untuk diperbaiki:`,
                            `📄 Proyek: <b>${projectTitle}</b>`,
                            `📌 Tahap: <b>${fullStage.label}</b>`,
                            revisionNote ? `💬 Catatan: <i>${revisionNote}</i>` : '',
                            ``,
                            `Silakan perbaiki dan submit ulang.`,
                        ].filter(Boolean).join('\n'));
                    }

                    // Admin approve → done: Notif ke PJ tahap berikutnya (jika ada)
                    if (data.status === 'done') {
                        const nextStage = await db.query.stages.findFirst({
                            where: and(
                                eq(stages.projectId, fullStage.projectId),
                                eq(stages.status, 'active')
                            ),
                            orderBy: [asc(stages.order)],
                        });
                        if (nextStage?.pjId) {
                            await notifyUser(nextStage.pjId, [
                                `🟢 <b>GILIRAN ANDA DIMULAI</b>`,
                                ``,
                                `Tahap sebelumnya telah disetujui. Kini giliran Anda:`,
                                `📄 Proyek: <b>${projectTitle}</b>`,
                                `📌 Tahap: <b>${nextStage.label}</b>`,
                                ``,
                                `Silakan mulai bekerja dan update progress di Dasbor Penerbitan.`,
                            ].join('\n'));
                        }
                    }
                });
            }

            // Kirim notifikasi saat proposalStatus berubah (accepted/rejected)
            if (data.proposalStatus && existingStage.pjId) {
                const fullStage = await db.query.stages.findFirst({
                    where: eq(stages.id, stageId),
                    with: { project: true },
                });
                const projectTitle = (fullStage as any)?.project?.title || stageId;

                setImmediate(async () => {
                    if (!existingStage.pjId) return;
                    if (data.proposalStatus === 'accepted') {
                        // Notif ke PJ Tata Letak bahwa usulan diterima
                        await notifyUser(existingStage.pjId, [
                            `✅ <b>USULAN ANDA DITERIMA</b>`,
                            ``,
                            `Usulan tata letak Anda telah disetujui oleh PJ Penyuntingan.`,
                            `📄 Proyek: <b>${projectTitle}</b>`,
                            `📌 Tahap: <b>${existingStage.label}</b>`,
                            ``,
                            `Silakan ajukan Review di Dasbor Penerbitan.`,
                        ].join('\n'));
                    } else if (data.proposalStatus === 'rejected') {
                        // Notif ke PJ Tata Letak bahwa usulan perlu direvisi
                        await notifyUser(existingStage.pjId, [
                            `🔄 <b>USULAN PERLU DIREVISI</b>`,
                            ``,
                            `Usulan tata letak Anda dikembalikan untuk diperbaiki.`,
                            `📄 Proyek: <b>${projectTitle}</b>`,
                            `📌 Tahap: <b>${existingStage.label}</b>`,
                            ``,
                            `Cek catatan revisi di Dasbor Penerbitan.`,
                        ].join('\n'));
                    }
                });
            }
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            console.error("[StageController.update] error:", error);
            res.status(500).json({ error: (error as any)?.message || "Failed to update stage" });
        }
    },

    async claim(req: Request, res: Response) {
        try {
            const id = String(req.params.id);
            const { deadline } = req.body;
            const sessionUser = req.user;

            if (!sessionUser) return res.status(401).json({ error: "Unauthorized" });
            if (!deadline) return res.status(400).json({ error: "Deadline harus diisi" });

            // Fetch full user from DB — req.user hanya berisi data session (skills tidak ikut)
            const fullUserRows = await db.select().from(users).where(eq(users.id, sessionUser.id)).limit(1);
            const user = fullUserRows[0];
            if (!user) return res.status(401).json({ error: "User tidak ditemukan" });

            const stageRows = await db.select().from(stages).where(eq(stages.id, id)).limit(1);
            const stage = stageRows[0];
            if (!stage) return res.status(404).json({ error: "Tahapan tidak ditemukan" });

            if (stage.pjId) return res.status(400).json({ error: "Tahapan ini sudah diambil oleh orang lain" });

            const requiredSkills = getRequiredSkills(stage.label);
            const userSkills = ((user as any).skills || []).map((s: string) => s.toLowerCase());
            
            console.log(`[claim] stageLabel=${stage.label}, requiredSkills=${JSON.stringify(requiredSkills)}, userSkills=${JSON.stringify(userSkills)}, userRole=${user.role}`);
            
            let isSkillMatched = false;
            if (requiredSkills.length === 0) {
                isSkillMatched = true; // No specific skill required — anyone can take it
            } else {
                isSkillMatched = requiredSkills.some(skill => userSkills.includes(skill.toLowerCase()));
            }

            if (!isSkillMatched && user.role !== 'admin' && !(user as any).isReviewer) {
                console.log(`[claim] REJECTED — userSkills=${JSON.stringify(userSkills)}, required=${JSON.stringify(requiredSkills)}`);
                return res.status(403).json({ error: `Keahlian Anda tidak sesuai. Tahapan ini membutuhkan: ${requiredSkills.join(', ')}. Keahlian Anda: ${userSkills.join(', ') || '(kosong)'}` });
            }

            const deadlineDate = new Date(deadline);
            if (isNaN(deadlineDate.getTime())) {
                return res.status(400).json({ error: "Format deadline tidak valid" });
            }

            // Validasi urutan deadline berdasarkan stage order
            const allProjectStages = await db.select().from(stages).where(eq(stages.projectId, stage.projectId));
            
            // Cek tahapan sebelumnya (order < stage.order)
            const previousStages = allProjectStages.filter(s => s.order < stage.order && s.deadline);
            if (previousStages.length > 0) {
                const maxPrevDeadline = new Date(Math.max(...previousStages.map(s => s.deadline!.getTime())));
                
                const dDate = new Date(deadlineDate);
                dDate.setHours(0, 0, 0, 0);
                const prevDDate = new Date(maxPrevDeadline);
                prevDDate.setHours(0, 0, 0, 0);
                
                if (dDate < prevDDate) {
                    return res.status(400).json({ error: `Tanggal target tidak boleh lebih awal dari tahapan sebelumnya. Batas minimal: ${maxPrevDeadline.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}` });
                }
            }

            // Cek tahapan setelahnya (order > stage.order)
            const nextStages = allProjectStages.filter(s => s.order > stage.order && s.deadline);
            if (nextStages.length > 0) {
                const minNextDeadline = new Date(Math.min(...nextStages.map(s => s.deadline!.getTime())));
                
                const dDate = new Date(deadlineDate);
                dDate.setHours(0, 0, 0, 0);
                const nextDDate = new Date(minNextDeadline);
                nextDDate.setHours(0, 0, 0, 0);
                
                if (dDate > nextDDate) {
                    return res.status(400).json({ error: `Tanggal target tidak boleh melebihi tahapan selanjutnya. Batas maksimal: ${minNextDeadline.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}` });
                }
            }

            // Direct DB update — bypass StageService untuk menghindari konflik tipe deadline
            const [updated] = await db.update(stages)
                .set({
                    pjId: user.id,
                    deadline: deadlineDate,
                    status: 'active'
                })
                .where(eq(stages.id, id))
                .returning();

            writeAuditLog({
                userId: user.id,
                action: 'claim_stage',
                target: `Stage: ${stage.label}`,
                targetId: id,
                meta: { deadline },
                ipAddress: req.ip,
            });

            res.json({ message: "Berhasil mengambil tahapan", data: updated });
        } catch (error: any) {
            console.error('[StageController.claim] error:', error);
            res.status(500).json({ error: error.message || "Gagal mengambil tahapan" });
        }
    },

    async delete(req: Request, res: Response) {
        try {
            const stageId = String(req.params.id);
            const isAdmin = req.user?.role === 'admin' || req.user?.isReviewer === true || req.user?.role === 'reviewer';
            const userId = req.user?.id;

            // Fetch stage for authorization checks
            const existingStage = await db.query.stages.findFirst({
                where: eq(stages.id, stageId),
                with: { project: true }
            });

            if (!existingStage) {
                return res.status(404).json({ error: "Stage not found" });
            }

            const isMyStage = existingStage.pjId === userId;
            const isProjectCreator = existingStage.project?.createdBy === userId;

            // Authorization: Only Admin, Project Creator, or PJ of the stage can delete
            if (!isAdmin && !isProjectCreator && !isMyStage) {
                return res.status(403).json({ error: "Forbidden: Anda tidak memiliki akses untuk menghapus tahap ini" });
            }

            await StageService.deleteStage(stageId);

            // Audit log
            if (req.user) {
                writeAuditLog({
                    userId: req.user.id,
                    action: 'delete_project', // fallback if delete_stage doesn't exist
                    target: 'STAGES',
                    targetId: stageId,
                    meta: { note: `User ${req.user.name} menghapus stage ${stageId}` }
                });
            }

            res.json({ message: "Stage deleted successfully" });
        } catch (error: any) {
            console.error('[StageController.delete] error:', error);
            res.status(500).json({ error: error.message || "Gagal menghapus stage" });
        }
    },

    async addNote(req: Request, res: Response) {
        try {
            const note = addNoteSchema.parse(req.body);
            const stage = await StageService.addNote(String(req.params.id), note);
            res.json(stage);
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            res.status(500).json({ error: "Failed to add note" });
        }
    },

    async getCandidates(req: Request, res: Response) {
        try {
            const result = await StageService.getCandidates(String(req.params.id));
            res.json(result);
        } catch (error: any) {
            if (error.message === "Stage not found") {
                return res.status(404).json({ error: "Stage not found" });
            }
            console.error(error);
            res.status(500).json({ error: "Failed to get candidates" });
        }
    },

    async getCandidatesByLabel(req: Request, res: Response) {
        try {
            const label = req.query.label;
            if (!label) {
                return res.status(400).json({ error: "Label is required" });
            }
            const result = await StageService.getCandidatesByLabel(String(label));
            res.json(result);
        } catch (error: any) {
            console.error(error);
            res.status(500).json({ error: "Failed to get candidates" });
        }
    },

    async create(req: Request, res: Response) {
        try {
            const schema = z.object({
                projectId: z.string(),
                label: z.string().min(1),
                description: z.string().optional(),
                order: z.number(),
            });
            const data = schema.parse(req.body);
            const isAdmin = req.user?.role === 'admin' || req.user?.isReviewer === true || req.user?.role === 'reviewer';
            if (!isAdmin) {
                const project = await db.query.projects.findFirst({
                    where: eq(projects.id, data.projectId),
                    columns: { id: true, category: true },
                });
                const isFlexible = !['terbitan', 'medsos', 'keuangan'].includes(project?.category || '');
                if (!project || !isFlexible) {
                    return res.status(403).json({ error: "Forbidden: Hanya admin yang bisa menambahkan tahapan ke proyek terstruktur" });
                }
            }
            const [newStage] = await db
                .insert(stages)
                .values({
                    projectId: data.projectId,
                    label: data.label,
                    description: data.description || null,
                    order: data.order,
                    status: 'active', // Lainnya stages start as active so PJ can immediately work on them
                })
                .returning();
            res.status(201).json(newStage);
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            res.status(500).json({ error: "Failed to create stage" });
        }
    },

    async requestRevision(req: Request, res: Response) {
        try {
            const { reason } = z.object({ reason: z.string().min(5, "Alasan minimal 5 karakter") }).parse(req.body);
            const stageId = String(req.params.id);
            const userId = req.user?.id;
            const isAdmin = req.user?.role === 'admin' || req.user?.isReviewer === true || req.user?.role === 'reviewer';

            const existingStage = await db.query.stages.findFirst({
                where: eq(stages.id, stageId),
            });

            if (!existingStage) return res.status(404).json({ error: "Stage not found" });
            if (existingStage.status !== 'done') {
                return res.status(400).json({ error: "Hanya bisa mengajukan revisi untuk tahapan yang sudah selesai (done)" });
            }

            // Only PJ of the stage OR Admin can request revision
            if (!isAdmin && existingStage.pjId !== userId) {
                return res.status(403).json({ error: "Forbidden: Hanya PJ atau Admin yang bisa mengajukan revisi" });
            }

            const requesterUser = await db.query.users.findFirst({
                where: eq(users.id, userId!),
                columns: { name: true },
            });

            const currentNotes = (existingStage.notes as any[]) || [];
            const newNote = {
                from: requesterUser?.name || (isAdmin ? 'Admin' : 'PJ'),
                text: `[REVISI] ${reason}`,
                time: new Date().toISOString()
            };
            const newNotes = [...currentNotes, newNote];

            const [updated] = await db.update(stages)
                .set({
                    status: 'active',
                    revisionReason: reason,
                    revisionCount: (existingStage.revisionCount || 0) + 1,
                    notes: newNotes,
                    revisedAt: new Date(),
                })
                .where(eq(stages.id, stageId))
                .returning();

            res.json(updated);

            // Audit log: revision requested — include revisionCount so frontend shows "Ke-X" correctly
            const stageWithProject = await db.query.stages.findFirst({
                where: eq(stages.id, stageId),
                with: { project: true, pj: true },
            });
            const newRevisionCount = (existingStage.revisionCount || 0) + 1;
            writeAuditLog({
                userId,
                action: 'revise_stage',
                target: `${(stageWithProject as any)?.project?.title} → ${existingStage.label}`,
                targetId: stageId,
                meta: {
                    reason,
                    revisionCount: newRevisionCount,
                    projectId: existingStage.projectId,
                    stageLabel: existingStage.label,
                    pjName: (stageWithProject as any)?.pj?.name || '—',
                },
                ipAddress: req.ip,
            });

            // Kirim notifikasi Telegram
            setImmediate(async () => {
                const fullStage = await db.query.stages.findFirst({
                    where: eq(stages.id, stageId),
                    with: { project: true },
                });
                if (!fullStage) return;
                const projectTitle = (fullStage as any).project?.title || stageId;

                if (isAdmin && existingStage.pjId) {
                    // Admin buka revisi → beri tahu PJ
                    await notifyUser(existingStage.pjId, [
                        `🔄 <b>REVISI DIBUKA KEMBALI</b>`,
                        ``,
                        `Admin telah membuka kembali tahapan Anda untuk direvisi:`,
                        `📄 Proyek: <b>${projectTitle}</b>`,
                        `📌 Tahap: <b>${fullStage.label}</b>`,
                        `💬 Alasan: <i>${reason}</i>`,
                        ``,
                        `Silakan lakukan perbaikan dan submit ulang.`,
                    ].join('\n'));
                } else {
                    // PJ ajukan revisi → beri tahu semua admin
                    await notifyAllAdmins([
                        `🔄 <b>PERMINTAAN REVISI OLEH PJ</b>`,
                        ``,
                        `<b>${requesterUser?.name || 'PJ'}</b> mengajukan revisi tahapan:`,
                        `📄 Proyek: <b>${projectTitle}</b>`,
                        `📌 Tahap: <b>${fullStage.label}</b>`,
                        `💬 Alasan: <i>${reason}</i>`,
                        ``,
                        `Tahapan kini kembali aktif dan dapat diedit PJ.`,
                    ].join('\n'));
                }
            });
        } catch (error) {
            if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors[0]?.message || error.errors });
            console.error("[StageController.requestRevision] error:", error);
            res.status(500).json({ error: "Failed to request revision" });
        }
    },

    async updateResultLink(req: Request, res: Response) {
        try {
            const { url } = z.object({ url: z.string().url("URL tidak valid, harus diawali http:// atau https://") }).parse(req.body);
            const stageId = String(req.params.id);
            const isAdmin = req.user?.role === 'admin' || req.user?.isReviewer === true || req.user?.role === 'reviewer';

            if (!isAdmin) return res.status(403).json({ error: "Forbidden: Hanya admin yang bisa mengubah link hasil kerja" });

            const existingStage = await db.query.stages.findFirst({ where: eq(stages.id, stageId) });
            if (!existingStage) return res.status(404).json({ error: "Stage not found" });

            const [updated] = await db.update(stages)
                .set({ resultLink: url })
                .where(eq(stages.id, stageId))
                .returning();

            res.json(updated);
        } catch (error) {
            if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors[0]?.message || error.errors });
            console.error("[StageController.updateResultLink] error:", error);
            res.status(500).json({ error: "Failed to update result link" });
        }
    },

    /**
     * POST /api/stages/auto-assign-preview
     * Preview penugasan otomatis PJ dan deadline sebelum proyek benar-benar dibuat.
     * Body: { category: string, stages: [{ label, order }], startDate?: string }
     */
    async autoAssignPreview(req: Request, res: Response) {
        try {
            const { category, stages: stageList, startDate, workflow } = req.body;

            if (!category || !Array.isArray(stageList) || stageList.length === 0) {
                return res.status(400).json({ error: "category dan stages wajib diisi" });
            }

            // Normalisasi input stages: pastikan label & order ada
            const normalized = stageList
                .filter((s: any) => s.label)
                .map((s: any, idx: number) => ({
                    label: String(s.label).trim(),
                    order: Number(s.order) || idx + 1,
                }));

            const start = startDate ? new Date(startDate) : new Date();
            const wf: 'sequential' | 'parallel' = workflow === 'parallel' ? 'parallel' : 'sequential';
            const result = await autoAssignStages(normalized, start, wf);

            // Format response agar deadline jadi string ISO
            const formatted = result.map((r) => ({
                ...r,
                deadline: r.deadline ? r.deadline.toISOString() : null,
            }));

            return res.json({ assignments: formatted });
        } catch (error) {
            console.error("[StageController.autoAssignPreview] error:", error);
            res.status(500).json({ error: "Gagal menghitung prakiraan penugasan" });
        }
    },
};
