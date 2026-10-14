import { db } from "../db";
import { stages, projects, notifications, users } from "../db/schema";
import { eq, sql, and, ne, inArray } from "drizzle-orm";
import { getRequiredSkills } from "../data/skillMapping";

function checkTerbitanStageActive(label: string, allStages: any[]): boolean {
    const normLabel = label.trim().toLowerCase();

    const isStageDone = (exactLabel: string) => {
        const found = allStages.find(s => s.label?.trim().toLowerCase() === exactLabel.toLowerCase());
        if (!found) return true; // jika tahapan opsional/tidak ada di proyek, jangan memblokir
        return found.status === 'done' || found.status === 'archived';
    };

    if (normLabel === 'kelengkapan naskah') return true;
    if (normLabel === 'pembuatan surat penerimaan terbitan') return isStageDone('kelengkapan naskah');
    if (normLabel === 'penyuntingan') return isStageDone('kelengkapan naskah');
    if (normLabel === 'tata letak naskah') return isStageDone('penyuntingan');
    if (normLabel === 'penginputan nomor induk penerbitan') return isStageDone('kelengkapan naskah');
    if (normLabel === 'desain sampul') return isStageDone('kelengkapan naskah');

    if (normLabel === 'pembuatan dummy') {
        return isStageDone('tata letak naskah') && isStageDone('desain sampul') && isStageDone('penginputan nomor induk penerbitan');
    }
    if (normLabel === 'kendali kualitas') {
        return isStageDone('pembuatan dummy') && isStageDone('pembuatan surat penerimaan terbitan');
    }
    if (normLabel === 'penerbitan isbn') {
        return isStageDone('kendali kualitas');
    }
    if (normLabel === 'pembuatan dummy final') {
        return isStageDone('penerbitan isbn');
    }
    if (normLabel === 'unggah ke sipena dan ipusnas') {
        return isStageDone('pembuatan dummy final');
    }
    if (normLabel === 'pembuatan surat keterangan terbit') {
        return isStageDone('unggah ke sipena dan ipusnas');
    }
    if (normLabel === 'serah terima karya cetak dan rekam') {
        return isStageDone('pembuatan surat keterangan terbit');
    }

    // Type terjemahan
    if (normLabel === 'terjemahkan') return true;
    if (normLabel === 'penyuntingan naskah terjemahan') return isStageDone('terjemahkan');

    return false;
}

// Helper to handle sequential activation rules including the special Terbitan rules
async function autoActivateStages(tx: any, projectId: string) {
    try {
        const allStages = await tx.select().from(stages).where(eq(stages.projectId, projectId)).orderBy(stages.order);
        
        const projectRows = await tx.select().from(projects).where(eq(projects.id, projectId)).limit(1);
        const projectInfo = projectRows[0];

        if (!projectInfo) return;

        const isTerbitan = projectInfo.category === 'terbitan';
        const isSequential = projectInfo.workflowType === 'sequential';

        if (!isSequential) return;

        for (let i = 0; i < allStages.length; i++) {
            const stage = allStages[i];
            
            // Skip stages that are already processed or in feedback loop
            if (['done', 'archived', 'review', 'revision'].includes(stage.status)) {
                continue;
            }

            let shouldBeActive = false;

            if (i === 0) {
                // First stage is always active
                shouldBeActive = true;
            } else if (isTerbitan) {
                shouldBeActive = checkTerbitanStageActive(stage.label, allStages);
            } else {
                // Regular sequential: active if the directly preceding stage is done
                const prevStage = allStages[i - 1];
                shouldBeActive = prevStage.status === 'done' || prevStage.status === 'archived';
            }

            if (shouldBeActive && stage.status !== 'active') {
                await tx.update(stages)
                    .set({ status: 'active' })
                    .where(eq(stages.id, stage.id));

                // Notify PJ if assigned — use raw insert to avoid relation query
                if (stage.pjId) {
                    await tx.insert(notifications).values({
                        userId: stage.pjId,
                        type: 'assigned',
                        title: 'Tugas Baru Aktif',
                        message: `Tahap "${stage.label}" kini aktif dan ditugaskan kepada Anda.`,
                        projectId: projectId,
                    });
                }
            } else if (!shouldBeActive && stage.status === 'active' && isTerbitan) {
                // Koreksi: tahapan Terbitan yang terlanjur 'active' padahal syarat DAG belum terpenuhi
                // → kembalikan ke 'draft' agar tidak dihitung sebagai beban kerja aktif
                console.log(`[autoActivateStages] Resetting wrongly-active stage "${stage.label}" back to draft`);
                await tx.update(stages)
                    .set({ status: 'draft' })
                    .where(eq(stages.id, stage.id));
            }
        }
    } catch (err) {
        console.error(`[autoActivateStages] ERROR for project ${projectId}:`, err);
        throw err; // re-throw so caller's try-catch can log it as non-fatal
    }
}

export const StageService = {
    // Update stage status and handle workflow logic
    async updateStage(stageId: string, data: Partial<typeof stages.$inferInsert>) {
        return await db.transaction(async (tx) => {
            // 1. Get current stage and project info
            const currentStage = await tx.query.stages.findFirst({
                where: eq(stages.id, stageId),
                with: {
                    project: true,
                },
            });

            if (!currentStage) throw new Error("Stage not found");

            console.log(`[updateStage] stageId=${stageId}, data=`, JSON.stringify(data));

            const setValues: typeof stages.$inferInsert & { proposalStatus?: string | null } = {} as any;
            if (data.label !== undefined) setValues.label = data.label;
            if (data.description !== undefined) setValues.description = data.description;
            if (data.status !== undefined) setValues.status = data.status;
            if (data.pjId !== undefined) setValues.pjId = data.pjId;
            if (data.coPjId !== undefined) setValues.coPjId = data.coPjId;
            if (data.coPjIds !== undefined) setValues.coPjIds = data.coPjIds;
            if (data.deadline !== undefined) setValues.deadline = data.deadline;
            if (data.progress !== undefined) setValues.progress = data.progress;
            if (data.resultLink !== undefined) setValues.resultLink = data.resultLink;
            if (data.score !== undefined) setValues.score = data.score;
            if (data.notes !== undefined) setValues.notes = data.notes;
            if (data.revisionReason !== undefined) setValues.revisionReason = data.revisionReason;
            if (data.revisionCount !== undefined) setValues.revisionCount = data.revisionCount;
            if (data.approvedAt !== undefined) setValues.approvedAt = data.approvedAt;
            if (data.revisedAt !== undefined) setValues.revisedAt = data.revisedAt;
            if (data.reviewerId !== undefined) setValues.reviewerId = data.reviewerId;
            if ((data as any).proposalStatus !== undefined) setValues.proposalStatus = (data as any).proposalStatus;

            console.log(`[updateStage] setValues=`, JSON.stringify(setValues));

            const [updatedStage] = await tx
                .update(stages)
                .set(setValues)
                .where(eq(stages.id, stageId))
                .returning();

            console.log(`[updateStage] saved: score=${updatedStage.score}, proposalStatus=${updatedStage.proposalStatus}, pjId=${updatedStage.pjId}`);

            // 2a. Update project total score when stage score is updated
            // For flexible categories: sum all stage scores into project score
            // For terbitan/medsos/keuangan: stage score is stored per-stage only (no project sum)
            if (data.score !== undefined) {
                const isFlexible = !['terbitan', 'medsos', 'keuangan'].includes(currentStage.project.category);
                if (isFlexible) {
                    const allProjectStages = await tx.select().from(stages).where(eq(stages.projectId, currentStage.projectId));
                    const totalProjectScore = allProjectStages.reduce((sum: number, s: any) => {
                        const stageScore = s.id === stageId ? Number(data.score) : (s.score || 0);
                        return sum + Number(stageScore);
                    }, 0);

                    await tx.update(projects)
                        .set({ score: totalProjectScore })
                        .where(eq(projects.id, currentStage.projectId));
                }
                // For terbitan/medsos/keuangan: the score is saved per-stage above (tx.update(stages).set(data)) — no extra action needed
            }

            // 2b. Single-PJ logic: removed for medsos/keuangan to support separate PJs per stage like terbitan
            // (Only custom categories that explicitly require singlePJ would go here if needed, but they are not implemented)

            // 3. Workflow Logic: Status Transitions

            // If status changed to 'review', notify admins
            if (data.status === 'review' && currentStage.status !== 'review') {
                const admins = await tx.query.users.findMany({
                    where: eq(users.role, 'admin'),
                });

                for (const admin of admins) {
                    await tx.insert(notifications).values({
                        userId: admin.id,
                        type: 'review',
                        title: 'Review Diperlukan',
                        message: `Tahap "${currentStage.label}" pada proyek "${currentStage.project.title}" menunggu review.`,
                        projectId: currentStage.projectId,
                    });
                }
            }

            // If status changed to 'revision', notify PJ
            if (data.status === 'revision' && currentStage.status !== 'revision' && currentStage.pjId) {
                await tx.insert(notifications).values({
                    userId: currentStage.pjId,
                    type: 'revision',
                    title: 'Revisi Diperlukan',
                    message: `Tahap "${currentStage.label}" perlu direvisi. Cek catatan untuk detailnya.`,
                    projectId: currentStage.projectId,
                });
            }

            // If status changed to 'done' (Approved), activate next stage
            if (data.status === 'done' && currentStage.status !== 'done') {
                // Notify current PJ it's approved
                if (currentStage.pjId) {
                    await tx.insert(notifications).values({
                        userId: currentStage.pjId,
                        type: 'approved',
                        title: 'Tahap Disetujui',
                        message: `Pekerjaan Anda di tahap "${currentStage.label}" telah disetujui.`,
                        projectId: currentStage.projectId,
                    });
                }

                // Activate next stage if sequential (via our smart auto-activation helper)
                if (currentStage.project.workflowType === 'sequential') {
                    try {
                        await autoActivateStages(tx, currentStage.projectId);
                    } catch (activateErr) {
                        console.error(`[updateStage] autoActivateStages error (non-fatal):`, activateErr);
                        // Non-fatal: don't rollback main update
                    }
                }
            }

            return updatedStage;
        });
    },

    // Delete a stage
    async deleteStage(stageId: string) {
        return await db.transaction(async (tx) => {
            const currentStage = await tx.query.stages.findFirst({
                where: eq(stages.id, stageId),
                with: { project: true }
            });

            if (!currentStage) throw new Error("Stage not found");

            await tx.delete(stages).where(eq(stages.id, stageId));

            // Recalculate total score for flexible categories
            const isFlexible = !['terbitan', 'medsos', 'keuangan'].includes(currentStage.project.category);
            if (isFlexible) {
                const allProjectStages = await tx.select().from(stages).where(eq(stages.projectId, currentStage.projectId));
                const totalProjectScore = allProjectStages.reduce((sum: number, s: any) => sum + (s.score || 0), 0);
                await tx.update(projects)
                    .set({ score: totalProjectScore })
                    .where(eq(projects.id, currentStage.projectId));
            }

            return { message: "Stage deleted successfully" };
        });
    },

    // Add a note/chat to a stage
    async addNote(stageId: string, note: { from: string; text: string; time: string; attachment?: string }) {
        const stage = await db.query.stages.findFirst({
            where: eq(stages.id, stageId),
        });

        if (!stage) throw new Error("Stage not found");

        const currentNotes = (stage.notes as any[]) || [];
        const newNotes = [...currentNotes, note];

        return await db
            .update(stages)
            .set({ notes: newNotes })
            .where(eq(stages.id, stageId))
            .returning();
    },

    // Get PJ candidates for a stage based on skill matching
    async getCandidates(stageId: string) {
        const stage = await db.query.stages.findFirst({
            where: eq(stages.id, stageId),
            with: { project: true },
        });

        if (!stage) throw new Error("Stage not found");

        const requiredSkills = getRequiredSkills(stage.label);

        // Fetch ALL active users, then filter in JS for skill matching.
        // This avoids issues with Drizzle + PostgreSQL jsonb ?| operator parameterization.
        const allActiveUsers = await db.query.users.findMany({
            where: eq(users.status, 'active'),
        });

        let candidates: any[];
        if (requiredSkills.length === 0) {
            // No skill mapping = any active user is eligible
            candidates = allActiveUsers;
        } else {
            // Filter users whose skills array contains at least one of the required skills
            candidates = allActiveUsers.filter((user: any) => {
                const userSkills: string[] = user.skills || [];
                return requiredSkills.some(skill => userSkills.includes(skill));
            });
        }

        console.log(`[getCandidates] stageLabel=${stage.label}, requiredSkills=${JSON.stringify(requiredSkills)}, totalActive=${allActiveUsers.length}, matched=${candidates.length}`);

        // Enrich each candidate with conflict info
        const enriched = await Promise.all(
            candidates.map(async (user: any) => {
                const conflict = await this.checkConflict(user.id, stage.projectId);
                return {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    skills: user.skills || [],
                    avatarInitials: user.avatarInitials || user.avatar_initials,
                    conflict: conflict.conflict,
                    activeStages: conflict.stages.length,
                    conflictStages: conflict.stages,
                };
            })
        );

        return {
            stageId: stage.id,
            stageLabel: stage.label,
            requiredSkills,
            candidates: enriched,
        };
    },

    // Check if a user has active stages in other projects
    async checkConflict(userId: string, currentProjectId: string) {
        const conflicting = await db.query.stages.findMany({
            where: and(
                eq(stages.pjId, userId),
                inArray(stages.status, ['active', 'review', 'revision']),
                ne(stages.projectId, currentProjectId)
            ),
            with: { project: true },
        });

        return {
            conflict: conflicting.length > 0,
            stages: conflicting.map(s => ({
                stageId: s.id,
                stageLabel: s.label,
                projectId: s.projectId,
                projectTitle: (s as any).project?.title || s.projectId,
                status: s.status,
            })),
        };
    },

    // Get PJ candidates by stage label (for pre-creation filtering)
    async getCandidatesByLabel(stageLabel: string) {
        const requiredSkills = getRequiredSkills(stageLabel);

        console.log(`[getCandidatesByLabel] stageLabel=${stageLabel}, requiredSkills=${JSON.stringify(requiredSkills)}`);

        // Fetch ALL active users, then filter in JS for skill matching.
        const allActiveUsers = await db.query.users.findMany({
            where: eq(users.status, 'active'),
        });

        let candidates: any[];
        if (requiredSkills.length === 0) {
            candidates = allActiveUsers;
        } else {
            candidates = allActiveUsers.filter((user: any) => {
                const userSkills: string[] = user.skills || [];
                return requiredSkills.some(skill => userSkills.includes(skill));
            });
        }

        console.log(`[getCandidatesByLabel] totalActive=${allActiveUsers.length}, matched=${candidates.length}`);
        // Log each candidate for debugging
        candidates.forEach((u: any) => {
            console.log(`  -> candidate: ${u.name} (role=${u.role}, skills=${JSON.stringify(u.skills)})`);
        });

        const enriched = await Promise.all(
            candidates.map(async (user: any) => {
                const conflictCount = await db.query.stages.findMany({
                    where: and(
                        eq(stages.pjId, user.id),
                        inArray(stages.status, ['active', 'review', 'revision'])
                    ),
                });

                return {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    skills: user.skills || [],
                    avatarInitials: user.avatarInitials || user.avatar_initials,
                    conflict: conflictCount.length > 0,
                    activeStages: conflictCount.length,
                    conflictStages: conflictCount.map(s => ({
                        stageLabel: s.label,
                        projectId: s.projectId,
                        status: s.status,
                    })),
                };
            })
        );

        return {
            stageLabel,
            requiredSkills,
            candidates: enriched,
        };
    },
};
