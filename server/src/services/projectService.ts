import { db } from "../db";
import { projects, stages, notifications, users, appSettings } from "../db/schema";
import { eq, desc, and, sql, inArray } from "drizzle-orm";
import { CATEGORIES } from "../data/categories";
import { notifyUser, notifyAllAdmins } from "./telegramService";
import { DocumentService } from "./documentService";
import { autoAssignStages } from "./autoAssignService";



async function enrichProjectsWithCoPjs<T>(projectsData: T): Promise<T> {
    if (!projectsData) return projectsData;
    const isArray = Array.isArray(projectsData);
    const list: any[] = isArray ? (projectsData as any[]) : [projectsData];

    const userIds = new Set<string>();
    for (const p of list) {
        if (!p || !p.stages) continue;
        for (const s of p.stages) {
            if (s.coPjIds && Array.isArray(s.coPjIds)) {
                for (const id of s.coPjIds) {
                    if (id && typeof id === 'string') userIds.add(id);
                }
            }
            if (s.coPjId && typeof s.coPjId === 'string') {
                userIds.add(s.coPjId);
            }
        }
    }

    if (userIds.size === 0) {
        for (const p of list) {
            if (!p || !p.stages) continue;
            for (const s of p.stages) {
                s.coPjs = s.coPj ? [s.coPj] : [];
            }
        }
        return projectsData;
    }

    const matchedUsers = await db.query.users.findMany({
        where: inArray(users.id, Array.from(userIds)),
        columns: {
            id: true,
            name: true,
            role: true,
        },
    });

    const userMap = new Map(matchedUsers.map(u => [u.id, {
        id: u.id,
        name: u.name,
        role: u.role,
        avatarInitials: u.name ? u.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() : '??'
    }]));

    for (const p of list) {
        if (!p || !p.stages) continue;
        for (const s of p.stages) {
            const rawCoPjIds: string[] = (s.coPjIds && Array.isArray(s.coPjIds) && s.coPjIds.length > 0)
                ? s.coPjIds
                : (s.coPjId ? [s.coPjId] : []);
            
            const populated = rawCoPjIds.map(id => userMap.get(id)).filter(Boolean);
            s.coPjs = populated;
            if (!s.coPj && populated.length > 0) {
                s.coPj = populated[0];
            }
        }
    }

    return projectsData;
}

export const ProjectService = {
    // Get all projects (admin) — show all active + recently archived (within 60 days)
    async getAllProjects() {
        const result = await db.query.projects.findMany({
            where: sql`${projects.status} IS DISTINCT FROM 'archived' AND ${projects.deletedAt} IS NULL`,
            with: {
                stages: {
                    orderBy: (stages, { asc }) => [asc(stages.order)],
                    with: { pj: true, coPj: true, reviewer: true },
                },
            },
            orderBy: (projects, { desc }) => [desc(projects.createdAt)],
        });
        return await enrichProjectsWithCoPjs(result);
    },

    // Get projects where user is assigned as PJ OR created by the user
    async getProjectsForUser(userId: string) {
        console.log(`[getProjectsForUser] looking for stages with pjId=${userId} or createdBy=${userId}`);

        // Get distinct project IDs where this user is PJ or collaborator
        const assignedStages = await db
            .select({ projectId: stages.projectId })
            .from(stages)
            .where(sql`${stages.pjId} = ${userId} OR ${stages.coPjId} = ${userId} OR (${stages.coPjIds} IS NOT NULL AND ${stages.coPjIds}::jsonb ? ${userId})`)
            .groupBy(stages.projectId);

        const projectIds = new Set(assignedStages.map(s => s.projectId));

        // Also get projects created by this user
        const createdProjects = await db.query.projects.findMany({
            where: sql`${projects.createdBy} = ${userId} AND ${projects.status} IS DISTINCT FROM 'archived' AND ${projects.deletedAt} IS NULL`,
            columns: { id: true },
        });
        createdProjects.forEach(p => projectIds.add(p.id));

        // Exception 1: ALL users can see active flexible category projects (lainnya, bimtek, promosi, deposit, etc.) so anyone can add stages or involve themselves
        const flexibleProjects = await db.query.projects.findMany({
            where: sql`${projects.category} NOT IN ('terbitan', 'medsos', 'keuangan') AND (${projects.status} IS DISTINCT FROM 'archived') AND ${projects.deletedAt} IS NULL`,
            columns: { id: true },
        });
        flexibleProjects.forEach(p => projectIds.add(p.id));

        // Exception 2: Bursa Tugas — ALL users can see projects that have AT LEAST ONE unassigned stage
        const unassignedStages = await db
            .select({ projectId: stages.projectId })
            .from(stages)
            .where(sql`${stages.pjId} IS NULL AND ${stages.status} != 'done' AND ${stages.status} != 'archived'`)
            .groupBy(stages.projectId);
        unassignedStages.forEach(s => projectIds.add(s.projectId));

        const allIds = [...projectIds];
        console.log(`[getProjectsForUser] found ${allIds.length} projects (assigned + created + lainnya)`);

        if (allIds.length === 0) return [];

        const result = await db.query.projects.findMany({
            where: sql`${projects.id} IN (${sql.join(allIds.map(id => sql`${id}`), sql`, `)}) AND ${projects.status} IS DISTINCT FROM 'archived' AND ${projects.deletedAt} IS NULL`,
            with: {
                stages: {
                    orderBy: (stages, { asc }) => [asc(stages.order)],
                    with: { pj: true, coPj: true, reviewer: true },
                },
            },
            orderBy: (projects, { desc }) => [desc(projects.createdAt)],
        });
        return await enrichProjectsWithCoPjs(result);
    },

    // Get project by ID
    async getProjectById(id: string) {
        const result = await db.query.projects.findFirst({
            where: sql`${projects.id} = ${id} AND ${projects.deletedAt} IS NULL`,
            with: {
                stages: {
                    orderBy: (stages, { asc }) => [asc(stages.order)],
                    with: { pj: true, coPj: true, reviewer: true },
                },
            },
        });
        return await enrichProjectsWithCoPjs(result);
    },

    // Get archived projects — admin sees all, users see only their own
    async getArchivedProjects(userId?: string) {
        if (userId) {
            // User: only show projects where they are creator or PJ/collaborator of at least one stage
            const assignedStages = await db
                .select({ projectId: stages.projectId })
                .from(stages)
                .where(sql`${stages.pjId} = ${userId} OR ${stages.coPjId} = ${userId} OR (${stages.coPjIds} IS NOT NULL AND ${stages.coPjIds}::jsonb ? ${userId})`)
                .groupBy(stages.projectId);

            const assignedIds = new Set(assignedStages.map(s => s.projectId));

            const createdProjects = await db.query.projects.findMany({
                where: sql`${projects.status} = 'archived' AND ${projects.createdBy} = ${userId} AND ${projects.deletedAt} IS NULL`,
                columns: { id: true },
            });
            createdProjects.forEach(p => assignedIds.add(p.id));

            const allIds = [...assignedIds];
            if (allIds.length === 0) return [];

            const result = await db.query.projects.findMany({
                where: sql`${projects.status} = 'archived' AND ${projects.id} IN (${sql.join(allIds.map(id => sql`${id}`), sql`, `)}) AND ${projects.deletedAt} IS NULL`,
                with: {
                    stages: {
                        orderBy: (stages, { asc }) => [asc(stages.order)],
                        with: { pj: true, coPj: true, reviewer: true },
                    },
                },
                orderBy: (projects, { desc }) => [desc(projects.updatedAt)],
            });
            return await enrichProjectsWithCoPjs(result);
        }

        // Admin: return all archived projects
        const result = await db.query.projects.findMany({
            where: sql`${projects.status} = 'archived' AND ${projects.deletedAt} IS NULL`,
            with: {
                stages: {
                    orderBy: (stages, { asc }) => [asc(stages.order)],
                    with: { pj: true, coPj: true, reviewer: true },
                },
            },
            orderBy: (projects, { desc }) => [desc(projects.updatedAt)],
        });
        return await enrichProjectsWithCoPjs(result);
    },

    // Create new project
    async createProject(data: {
        title: string;
        category: keyof typeof CATEGORIES;
        type: string;
        description?: string;
        gdriveLink?: string;
        createdBy?: string;
        score?: number;
        pageCount?: number;
        assignMode?: 'manual' | 'auto'; // 'auto' = sistem tentukan PJ & deadline otomatis
        stages?: { label: string; order: number; pjId?: string; deadline?: string; status?: string; progress?: number; score?: number }[];
    }) {
        // Generate ID: PRJ-YYYY-XXXX
        const year = new Date().getFullYear();
        const random = Math.random().toString(36).substr(2, 4).toUpperCase();
        const id = `PRJ-${year}-${random}`;

        // Get category config from database
        const [settingsRow] = await db.select().from(appSettings).where(eq(appSettings.key, "categories")).limit(1);
        const categoriesMap = settingsRow?.value as any || CATEGORIES;
        const categoryConfig = categoriesMap[data.category];
        if (!categoryConfig) throw new Error("Invalid category: " + data.category);

        // Start transaction
        return await db.transaction(async (tx) => {
            // 2. Create Stages (move up to calculate score before inserting project)
            const TYPE_STAGES: Record<string, { label: string; order: number; score?: number }[]> = {
                terjemahan: [
                    { label: "Terjemahkan", order: 1 },
                    { label: "Penyuntingan Naskah Terjemahan", order: 2 },
                ],
            };

            const requestStages = data.stages || [];
            const templateStages = TYPE_STAGES[data.type] || categoryConfig.stages;

            // PRIORITAS: Gunakan stages dari request (mencakup custom stages dari categoriesMap frontend)
            // Fallback ke template hardcoded hanya jika request tidak mengirim stages sama sekali
            let finalStages: any[] = requestStages.length > 0 ? requestStages : templateStages;

            // ── Mode Otomatis: override pjId & deadline per stage dari autoAssignService ──
            if (data.assignMode === 'auto' && finalStages.length > 0) {
                const stageInputs = finalStages.map((s: any, idx: number) => ({
                    label: String(s.label).trim(),
                    order: Number(s.order) || idx + 1,
                }));
                const assigned = await autoAssignStages(
                    stageInputs,
                    new Date(),
                    categoryConfig?.workflow === 'parallel' ? 'parallel' : 'sequential'
                );

                // Merge hasil auto-assign ke finalStages (pertahankan score dan field lainnya)
                finalStages = finalStages.map((s: any, idx: number) => {
                    const a = assigned[idx];
                    if (!a) return s;
                    return {
                        ...s,
                        pjId: a.pjId || null,
                        deadline: a.deadline ? a.deadline.toISOString() : null,
                        status: (categoryConfig?.workflow === 'parallel' || ['promosi', 'lainnya', 'bimtek'].includes(data.category))
                            ? 'active'
                            : (s.status || (idx === 0 ? 'active' : 'draft')),
                    };
                });
                console.log(`[createProject] Auto-assign selesai untuk ${finalStages.length} tahapan`);
            }

            const isFlexible = !['terbitan', 'medsos', 'keuangan'].includes(data.category);
            const projectScore = isFlexible
                ? finalStages.reduce((sum: number, s: any) => sum + (Number(s.score) || 0), 0)
                : (data.score !== undefined ? Number(data.score) : 0);


            // 1. Create Project
            const [newProject] = await tx
                .insert(projects)
                .values({
                    id,
                    title: data.title,
                    category: data.category,
                    type: data.type,
                    workflowType: categoryConfig.workflow,
                    gdriveLink: data.gdriveLink || null,
                    createdBy: data.createdBy || null,
                    score: projectScore,
                    pageCount: data.pageCount || 0,
                })
                .returning();


            if (finalStages.length > 0) {
                const pc = Number(data.pageCount) || 0;
                const isTerbitan = data.category === 'terbitan';

                // Ambil master stages dari DB untuk referensi perPageScore
                const masterStagesForCreate: any[] = categoriesMap?.[data.category]?.stages || [];

                const stageValues = finalStages.map((s: any) => {
                    const isParallel = categoryConfig?.workflow === 'parallel' || ['promosi', 'lainnya', 'bimtek'].includes(data.category);
                    const defaultStatus = isParallel ? 'active' : (s.order === 1 ? 'active' : 'draft');
                    const stageStatus = isParallel 
                        ? (s.status === 'draft' || !s.status ? 'active' : s.status)
                        : (s.status || defaultStatus);
                    const stageProgress = s.progress !== undefined ? s.progress : 0;

                    // Safety net: hitung ulang skor dari perPageScore jika kategori mendukungnya
                    // Prioritas: jika frontend sudah menghitung dengan benar (score > 0), pakai itu.
                    // Jika score masih 0 tapi stage punya perPageScore dan pageCount tersedia, hitung ulang.
                    let stageScore = s.score !== undefined ? Number(s.score) : 0;
                    if (isTerbitan && pc > 0) {
                        const masterStage = masterStagesForCreate.find(
                            (m: any) => m.label?.trim().toLowerCase() === s.label?.trim().toLowerCase()
                        );
                        const perPage = Number(masterStage?.perPageScore ?? s.perPageScore ?? 0);
                        if (perPage > 0) {
                            const multiplier = Number(masterStage?.pageMultiplier ?? s.pageMultiplier ?? 10) || 10;
                            stageScore = Math.round((pc / multiplier) * perPage * 100) / 100;
                        }
                    }

                    return {
                        projectId: id,
                        label: s.label,
                        description: s.description || null,
                        order: s.order,
                        status: stageStatus,
                        progress: stageProgress,
                        pjId: s.pjId || null,
                        coPjId: s.coPjId || (s.coPjIds && s.coPjIds[0]) || null,
                        coPjIds: s.coPjIds && Array.isArray(s.coPjIds) ? s.coPjIds : (s.coPjId ? [s.coPjId] : []),
                        deadline: s.deadline ? new Date(s.deadline) : null,
                        score: stageScore,
                    };
                });
                await tx.insert(stages).values(stageValues);
            }


            // 3. Create Notification (in-app)
            await tx.insert(notifications).values({
                type: "project_created",
                title: "Proyek Baru Dibuat",
                message: `Proyek "${data.title}" telah dibuat.`,
                projectId: id,
            });

            // Get creator info
            const creator = data.createdBy ? await tx.query.users.findFirst({
                where: eq(users.id, data.createdBy),
                columns: { name: true, role: true }
            }) : null;
            const isCreatorAdmin = creator?.role === 'admin';

            // Send Telegram notification to admins if flexible category created by personil with 0 score
            if (isFlexible && !isCreatorAdmin && projectScore === 0 && creator) {
                const categoryLabel = CATEGORIES[data.category]?.label || data.category;
                setImmediate(async () => {
                    await notifyAllAdmins(
                        `Personil atas nama <b>${creator.name}</b> menambahkan Proyek Berjudul <b>${data.title}</b> dengan kategori <b>${categoryLabel}</b>, anda perlu input kolom skor`
                    );
                });
            }

            // 4. Kirim notifikasi Telegram ke setiap PJ yang ditugaskan
            const assignedPJs = finalStages
                .filter((s: any) => s.pjId)
                .map((s: any) => ({ pjId: s.pjId, label: s.label }));

            // Fire-and-forget (jangan block response)
            setImmediate(async () => {
                for (const { pjId, label } of assignedPJs) {
                    const fmt = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
                    const deadlineStage = finalStages.find((s: any) => s.pjId === pjId && s.label === label) as any;
                    const deadlineText = deadlineStage?.deadline ? `\n🗓 Deadline: <b>${fmt(deadlineStage.deadline)}</b>` : '';
                    await notifyUser(pjId, [
                        `🚨 <b>PENUGASAN BARU</b>`,
                        ``,
                        `Anda ditugaskan pada proyek:`,
                        `📄 <b>${data.title}</b>`,
                        `📌 Tahap: <b>${label}</b>${deadlineText}`,
                        ``,
                        `Silakan cek Dasbor Penerbitan untuk detail selengkapnya.`,
                    ].join('\n'));
                }
            });

            return newProject;
        });
    },

    // Update project metadata
    async updateProject(id: string, data: Partial<typeof projects.$inferInsert>) {
        return await db.transaction(async (tx) => {
            const project = await tx.query.projects.findFirst({
                where: eq(projects.id, id),
            });
            if (!project) throw new Error("Project not found");

            const isFlexible = !['terbitan', 'medsos', 'keuangan'].includes(project.category);

            if (data.status === "archived") {
                const now = new Date();
                // Set approvedAt HANYA untuk stage yang belum punya approvedAt
                await tx
                    .update(stages)
                    .set({ approvedAt: now })
                    .where(sql`${stages.projectId} = ${id} AND ${stages.status} IN ('active', 'review', 'revision', 'draft') AND ${stages.approvedAt} IS NULL`);
                
                // Arsipkan HANYA stage yang BELUM 'done'!
                // Stage yang sudah 'done' TETAP 'done' agar poin & status persetujuan tidak hilang
                await tx
                    .update(stages)
                    .set({ status: "archived" })
                    .where(sql`${stages.projectId} = ${id} AND ${stages.status} NOT IN ('done', 'archived')`);
            }

            // Aktifkan kembali proyek terarsip (Reactivate / Unarchive)
            if (data.status === "active" && project.status === "archived") {
                const prjStages = await tx.query.stages.findMany({
                    where: eq(stages.projectId, id),
                    orderBy: (stages, { asc }) => [asc(stages.order)]
                });

                const isParallel = project.workflowType === 'parallel' || ['promosi', 'lainnya', 'bimtek'].includes(project.category);
                let activatedFirstNonDone = false;
                for (const stg of prjStages) {
                    // Jika stage sudah pernah disetujui (punya approvedAt atau status 'done'), PAKSA pastikan statusnya 'done'
                    if (stg.approvedAt || stg.status === 'done') {
                        await tx.update(stages).set({ status: 'done', progress: 100 }).where(eq(stages.id, stg.id));
                    } else if (stg.status === 'archived' || stg.status === 'draft' || stg.status === 'active') {
                        if (isParallel || !activatedFirstNonDone) {
                            await tx.update(stages).set({ status: 'active' }).where(eq(stages.id, stg.id));
                            activatedFirstNonDone = true;
                        } else {
                            await tx.update(stages).set({ status: 'draft' }).where(eq(stages.id, stg.id));
                        }
                    }
                }
            }

            const [updatedProject] = await tx
                .update(projects)
                .set({ ...data, updatedAt: new Date() })
                .where(eq(projects.id, id))
                .returning();

            // Fitur A: Auto-sync skor tahapan saat pageCount berubah (hanya terbitan, bukan arsip)
            const newPageCount = Number(data.pageCount);
            const oldPageCount = Number(project.pageCount) || 0;
            const isPageCountChanged = data.pageCount !== undefined && newPageCount !== oldPageCount;
            const isTerbitan = project.category === 'terbitan';
            const isNotArchived = project.status !== 'archived' && data.status !== 'archived';

            if (isPageCountChanged && isTerbitan && isNotArchived) {
                console.log(`[pageCount sync] Proyek ${id}: pageCount ${oldPageCount} → ${newPageCount}, mensinkronisasi skor tahapan...`);
                const [settingsRow] = await tx.select().from(appSettings).where(eq(appSettings.key, 'categories')).limit(1);
                const categoriesMap: Record<string, any> = (settingsRow?.value as any) || {};
                const masterStages: any[] = categoriesMap?.terbitan?.stages || [];

                const allStages = await tx.query.stages.findMany({
                    where: sql`${stages.projectId} = ${id}`,
                });

                for (const st of allStages) {
                    const ms = masterStages.find((m: any) =>
                        m.label?.trim().toLowerCase() === st.label?.trim().toLowerCase()
                    );
                    if (!ms) continue;

                    let newScore: number;
                    if (ms.perPageScore && Number(ms.perPageScore) > 0 && newPageCount > 0) {
                        const multiplier = Number(ms.pageMultiplier) || 10;
                        newScore = Math.round((newPageCount / multiplier) * Number(ms.perPageScore) * 100) / 100;
                    } else {
                        newScore = Number(ms.score) || 0;
                    }

                    const currentScore = Number(st.score) || 0;
                    if (Math.abs(newScore - currentScore) >= 0.01) {
                        await tx.update(stages).set({ score: newScore }).where(eq(stages.id, st.id));
                        console.log(`[pageCount sync]   ${st.label}: ${currentScore} → ${newScore} (Status: ${st.status})`);
                    }
                }
            }

            return [updatedProject];
        });
    },

    // Soft Delete project (move to trash)
    async deleteProject(id: string) {
        return await db.update(projects).set({ deletedAt: new Date() }).where(eq(projects.id, id));
    },

    // Hard Delete project (permanent)
    async hardDeleteProject(id: string) {
        return await db.delete(projects).where(eq(projects.id, id));
    },

    // Restore project from trash
    async restoreProject(id: string) {
        return await db.update(projects).set({ deletedAt: null }).where(eq(projects.id, id));
    },

    // Get deleted projects (trash)
    async getDeletedProjects(userId?: string) {
        if (userId) {
            // User: only show deleted projects where they are creator or PJ
            const assignedStages = await db
                .select({ projectId: stages.projectId })
                .from(stages)
                .where(eq(stages.pjId, userId))
                .groupBy(stages.projectId);

            const assignedIds = new Set(assignedStages.map(s => s.projectId));

            const createdProjects = await db.query.projects.findMany({
                where: sql`${projects.deletedAt} IS NOT NULL AND ${projects.createdBy} = ${userId}`,
                columns: { id: true },
            });
            createdProjects.forEach(p => assignedIds.add(p.id));

            const allIds = [...assignedIds];
            if (allIds.length === 0) return [];

            return await db.query.projects.findMany({
                where: sql`${projects.deletedAt} IS NOT NULL AND ${projects.id} IN (${sql.join(allIds.map(id => sql`${id}`), sql`, `)})`,
                with: {
                    stages: {
                        orderBy: (stages, { asc }) => [asc(stages.order)],
                        with: { pj: true, coPj: true, reviewer: true },
                    },
                },
                orderBy: (projects, { desc }) => [desc(projects.deletedAt)],
            });
        }

        // Admin: return all deleted projects
        return await db.query.projects.findMany({
            where: sql`${projects.deletedAt} IS NOT NULL`,
            with: {
                stages: {
                    orderBy: (stages, { asc }) => [asc(stages.order)],
                    with: { pj: true, coPj: true, reviewer: true },
                },
            },
            orderBy: (projects, { desc }) => [desc(projects.deletedAt)],
        });
    },

    // Duplicate project (salin nama, kategori, tipe, dan tahapan beserta PJ)
    async duplicateProject(sourceId: string, newTitle: string, createdBy?: string) {
        // Ambil proyek sumber beserta semua tahapannya
        const source = await db.query.projects.findFirst({
            where: eq(projects.id, sourceId),
            with: {
                stages: {
                    orderBy: (stages, { asc }) => [asc(stages.order)],
                },
            },
        });

        if (!source) throw new Error("Proyek sumber tidak ditemukan");

        // Generate ID baru
        const year = new Date().getFullYear();
        const random = Math.random().toString(36).substr(2, 4).toUpperCase();
        const newId = `PRJ-${year}-${random}`;

        return await db.transaction(async (tx) => {
            // Salin project
            const [newProject] = await tx
                .insert(projects)
                .values({
                    id: newId,
                    title: newTitle,
                    category: source.category,
                    type: source.type,
                    workflowType: source.workflowType,
                    gdriveLink: null,           // Tidak disalin
                    createdBy: createdBy || null,
                    score: source.score,
                    status: 'active',
                })
                .returning();

            // Salin semua tahapan — reset progress/status/catatan/hasil
            if (source.stages && source.stages.length > 0) {
                const isParallel = source.workflowType === 'parallel';
                const stageValues = source.stages.map((s, idx) => ({
                    projectId: newId,
                    label: s.label,
                    description: s.description || null,
                    order: s.order,
                    status: (isParallel || idx === 0) ? 'active' : 'draft',
                    pjId: s.pjId || null,   // Salin PJ
                    coPjId: s.coPjId || null, // Salin co-PJ
                    coPjIds: (s as any).coPjIds || (s.coPjId ? [s.coPjId] : []),
                    deadline: null,          // Reset deadline
                    progress: 0,             // Reset progress
                    score: s.score,          // Salin skor tahap
                    notes: null,             // Kosongkan catatan
                    resultLink: null,        // Kosongkan link hasil
                    revisionReason: null,
                    revisionCount: 0,
                    approvedAt: null,
                }));
                await tx.insert(stages).values(stageValues);
            }

            // Notifikasi
            await tx.insert(notifications).values({
                type: 'project_created',
                title: 'Proyek Disalin',
                message: `Proyek "${newTitle}" telah dibuat dari salinan "${source.title}".`,
                projectId: newId,
            });

            // Kembalikan proyek baru dengan stages
            return db.query.projects.findFirst({
                where: eq(projects.id, newId),
                with: {
                    stages: {
                        orderBy: (stages, { asc }) => [asc(stages.order)],
                        with: { pj: true, coPj: true },
                    },
                },
            });
        });
    },

    // Auto-archive projects where ALL stages are done, and the most recently approved stage is older than 3 days
    async autoArchiveProjects() {
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        try {
            const activeProjects = await db.query.projects.findMany({
                where: sql`${projects.status} = 'active'`,
                with: { stages: true },
            });

            for (const project of activeProjects) {
                if (!project.stages || project.stages.length === 0) continue;

                // Skip kategori fleksibel (Lainnya, Promosi, Bimtek, Deposit, dll) — pengarsipan murni MANUAL oleh user/admin
                const catKey = project.category?.toLowerCase() || '';
                const isFlexibleCategory = !['terbitan', 'medsos', 'keuangan'].includes(catKey);
                if (isFlexibleCategory) continue;

                const allDone = project.stages.every((s: any) => s.status === 'done' || s.status === 'archived');
                if (!allDone) continue;

                // Find the latest approvedAt date
                let latestApprovedAt: Date | null = null;
                for (const s of project.stages) {
                    if ((s as any).approvedAt) {
                        const approvedAt = new Date((s as any).approvedAt);
                        if (!latestApprovedAt || approvedAt > latestApprovedAt) {
                            latestApprovedAt = approvedAt;
                        }
                    }
                }

                const referenceDate = latestApprovedAt || project.updatedAt || new Date();

                if (referenceDate < threeDaysAgo) {
                    await this.updateProject(project.id, { status: 'archived' });
                    console.log(`[Auto-Archive] Archived project ${project.id} (${project.title}) - completed > 3 days ago.`);
                }
            }

            // Auto-delete trash > 30 days
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const deletedProjects = await db.query.projects.findMany({
                where: sql`${projects.deletedAt} < ${thirtyDaysAgo}`,
                columns: { id: true, title: true }
            });
            for (const p of deletedProjects) {
                await this.hardDeleteProject(p.id);
                console.log(`[Auto-Trash] Hard deleted project ${p.id} (${p.title}) - in trash > 30 days.`);
            }
        } catch (error) {
            console.error('[Auto-Archive] Error running auto-archive job:', error);
        }
    },

    // Sinkronisasi otomatis skor tahapan pada semua proyek AKTIF (belum diarsipkan) saat master data poin diubah
    async syncActiveProjectsToMaster(categoriesMap: Record<string, any>) {
        if (!categoriesMap || typeof categoriesMap !== 'object') return;

        console.log('[syncActiveProjectsToMaster] Memulai sinkronisasi proyek aktif ke master data poin baru...');

        // Ambil semua proyek yang belum diarsipkan dan belum dihapus
        const activeProjects = await db.query.projects.findMany({
            where: sql`${projects.status} IS DISTINCT FROM 'archived' AND ${projects.deletedAt} IS NULL`,
            with: {
                stages: true,
            },
        });

        let updatedCount = 0;

        for (const p of activeProjects) {
            const catKey = p.category?.toLowerCase() || '';
            const catConfig = categoriesMap[catKey];
            if (!catConfig || !Array.isArray(catConfig.stages)) continue;

            const isFlexible = !['terbitan', 'medsos', 'keuangan'].includes(catKey);
            // Kategori fleksibel murni menggunakan skor kustom per proyek
            if (isFlexible) continue;

            const masterStages: any[] = catConfig.stages;
            const pageCount = Number(p.pageCount) || 0;

            for (const st of p.stages) {
                // Khusus: jika tahap tata letak naskah dengan skor 5 (prelim saja), jangan ditimpa
                if (st.label?.trim().toLowerCase() === 'tata letak naskah' && Number(st.score) === 5) {
                    continue;
                }

                const ms = masterStages.find((m: any) =>
                    m.label?.trim().toLowerCase() === st.label?.trim().toLowerCase()
                );
                if (!ms) continue;

                let expectedScore = 0;
                if (ms.perPageScore && Number(ms.perPageScore) > 0 && pageCount > 0) {
                    const multiplier = Number(ms.pageMultiplier) || 10;
                    expectedScore = Math.round((pageCount / multiplier) * Number(ms.perPageScore) * 100) / 100;
                } else if (ms.score !== undefined) {
                    expectedScore = Number(ms.score) || 0;
                }

                const currentScore = Number(st.score) || 0;
                if (Math.abs(currentScore - expectedScore) >= 0.01) {
                    await db.update(stages).set({ score: expectedScore }).where(eq(stages.id, st.id));
                    updatedCount++;
                    console.log(`[syncActiveProjectsToMaster] ${p.title} (${p.category}) -> ${st.label}: ${currentScore} => ${expectedScore}`);
                }
            }
        }

        console.log(`[syncActiveProjectsToMaster] Selesai: ${updatedCount} tahapan berhasil disinkronkan ke master data baru.`);
        return updatedCount;
    }
};

export function startAutoArchiveJob() {
    // Run immediately on start
    ProjectService.autoArchiveProjects();
    DocumentService.autoCleanTrash().catch(console.error);
    
    // Run every 1 hour (3600000 ms)
    setInterval(() => {
        ProjectService.autoArchiveProjects();
        DocumentService.autoCleanTrash().catch(console.error);
    }, 60 * 60 * 1000);
}

