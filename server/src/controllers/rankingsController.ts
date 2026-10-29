import { Request, Response } from "express";
import { db } from "../db";
import { stages, appSettings, users, projects } from "../db/schema";
import { and, sql } from "drizzle-orm";

/**
 * Cek apakah tahapan Terbitan benar-benar terbuka (unlocked) berdasarkan status semua tahapan.
 * Diperlukan karena stage bisa berstatus 'active' di DB tapi masih terkunci secara logika DAG.
 */
function isTerbitanStageReallyActive(label: string, allStages: Array<{ label: string; status: string }>): boolean {
    const isDone = (lbl: string) => {
        const s = allStages.find(x => x.label === lbl);
        return !!s && (s.status === 'done' || s.status === 'archived');
    };
    const hasStage = (lbl: string) => allStages.some(x => x.label === lbl);

    switch (label) {
        case 'Kelengkapan Naskah':
            return true;
        case 'Pembuatan Surat Penerimaan Terbitan':
            return isDone('Kelengkapan Naskah');
        case 'Penyuntingan':
            return isDone('Kelengkapan Naskah');
        case 'Tata Letak Naskah':
            return isDone('Penyuntingan');
        case 'Penginputan Nomor Induk Penerbitan':
            return isDone('Kelengkapan Naskah');
        case 'Desain Sampul':
            return isDone('Kelengkapan Naskah');
        case 'Pembuatan Dummy':
            return isDone('Tata Letak Naskah') &&
                   (!hasStage('Penginputan Nomor Induk Penerbitan') || isDone('Penginputan Nomor Induk Penerbitan')) &&
                   isDone('Desain Sampul');
        case 'Kendali Kualitas':
            return (!hasStage('Pembuatan Dummy') || isDone('Pembuatan Dummy')) &&
                   isDone('Penyuntingan') &&
                   isDone('Tata Letak Naskah') &&
                   isDone('Desain Sampul') &&
                   isDone('Pembuatan Surat Penerimaan Terbitan') &&
                   (!hasStage('Penginputan Nomor Induk Penerbitan') || isDone('Penginputan Nomor Induk Penerbitan'));
        case 'Penerbitan ISBN':
            return isDone('Kendali Kualitas');
        case 'Pembuatan Dummy Final':
            return isDone('Penerbitan ISBN');
        case 'Unggah ke Sipena dan Ipusnas':
            return (!hasStage('Pembuatan Dummy Final') || isDone('Pembuatan Dummy Final')) && isDone('Penerbitan ISBN');
        case 'Pembuatan Surat Keterangan Terbit':
            return isDone('Unggah ke Sipena dan Ipusnas');
        case 'Serah Terima Karya Cetak dan Rekam':
            return isDone('Unggah ke Sipena dan Ipusnas');
        default:
            return false;
    }
}

export const RankingsController = {
    /**
     * GET /api/rankings/productivity?month=M&year=Y
     * Gunakan month=-1 untuk "Semua Bulan" (tidak difilter per bulan).
     * Default: bulan & tahun berjalan.
     */
    async getProductivityRankings(req: Request, res: Response) {
        try {
            const now = new Date();
            // month=-1 berarti "Semua Bulan" (tidak filter per bulan)
            const queryMonth = req.query.month !== undefined
                ? parseInt(String(req.query.month), 10)
                : now.getMonth();
            const queryYear = req.query.year !== undefined
                ? parseInt(String(req.query.year), 10)
                : now.getFullYear();
            const allMonths = queryMonth === -1;

            const monthStart = allMonths ? new Date(queryYear, 0, 1) : new Date(queryYear, queryMonth, 1);
            const monthEnd   = allMonths ? new Date(queryYear, 11, 31, 23, 59, 59, 999) : new Date(queryYear, queryMonth + 1, 0, 23, 59, 59, 999);

            // Ambil semua stage done/archived beserta pj, project, dan updatedAt stage
            const completedStages = await db.query.stages.findMany({
                where: and(
                    sql`${stages.status} IN ('done', 'archived')`,
                    sql`(${stages.pjId} IS NOT NULL OR ${stages.coPjId} IS NOT NULL OR (${stages.coPjIds} IS NOT NULL AND jsonb_array_length(${stages.coPjIds}) > 0))`
                ),
                with: {
                    pj: { columns: { id: true, name: true } },
                    coPj: { columns: { id: true, name: true } },
                    reviewer: { columns: { id: true, name: true } },
                    project: {
                        columns: { id: true, title: true, category: true, status: true, updatedAt: true, pageCount: true }
                    },
                },
            });

            // Prefetch seluruh user untuk nama kolaborator
            const allUsers = await db.query.users.findMany({
                columns: { id: true, name: true }
            });
            const userMap = new Map<string, string>(allUsers.map(u => [u.id, u.name || 'Unknown']));

            // Ambil kategoriesMap dari DB settings
            let categoriesMap: Record<string, any> = {};
            try {
                const settingsRow = await db.query.appSettings.findFirst({
                    where: sql`${appSettings.key} = 'categories'`,
                });
                if (settingsRow?.value) {
                    categoriesMap = settingsRow.value as Record<string, any>;
                }
            } catch { /* fallback ke score di DB */ }

            const rankingsMap: Record<string, {
                id: string;
                name: string;
                totalScore: number;
                completedStages: number;
                details: Array<{
                    projectId: string;
                    projectTitle: string;
                    category: string;
                    stageLabel: string;
                    scoreEarned: number;
                    date: string;
                }>;
            }> = {};

            for (const stage of completedStages) {
                if (!stage.project) continue;

                // Urutan tanggal untuk menentukan BULAN penghitungan poin:
                // Poin dihitung di bulan stage DISETUJUI (approvedAt), bukan bulan deadline.
                const completionDate: Date =
                    stage.approvedAt
                        ? new Date(stage.approvedAt)
                        : (stage.project.updatedAt
                            ? new Date(stage.project.updatedAt)
                            : new Date());

                if (completionDate < monthStart || completionDate > monthEnd) continue;

                const catKey = stage.project.category?.toLowerCase() || 'lainnya';

                // Hitung skor akhir — stages.score adalah SINGLE SOURCE OF TRUTH
                let score = 0;
                const isFlexibleCat = !['terbitan', 'medsos', 'keuangan'].includes(catKey);
                if (stage.score !== undefined && stage.score !== null) {
                    score = Number(stage.score);
                } else if (!isFlexibleCat) {
                    const masterStages: any[] = categoriesMap?.[catKey]?.stages || [];
                    const masterStage = masterStages.find(
                        (s: any) => s.label?.trim().toLowerCase() === stage.label?.trim().toLowerCase()
                    );
                    if (masterStage && masterStage.score !== undefined) {
                        if (masterStage.perPageScore && masterStage.perPageScore > 0 && stage.project.pageCount && stage.project.pageCount > 0) {
                            const multiplier = Number(masterStage.pageMultiplier) || 1;
                            score = Math.round(((stage.project.pageCount / multiplier) * Number(masterStage.perPageScore)) * 100) / 100;
                        } else {
                            score = Number(masterStage.score) || 0;
                        }
                    }
                }

                const baseScore = score;

                // Tentukan daftar kolaborator (maksimal 2 orang)
                // Prioritas: coPjIds (array baru) bila berisi data, lalu fallback ke coPjId (field lama)
                const coPjIdsArr = (stage.coPjIds && Array.isArray(stage.coPjIds) && (stage.coPjIds as string[]).length > 0)
                    ? (stage.coPjIds as string[]).filter((id: string) => id && id !== stage.pjId)
                    : (stage.coPjId && stage.coPjId !== stage.pjId ? [stage.coPjId] : []);
                const collaboratorIds = Array.from(new Set(coPjIdsArr)).slice(0, 2);
                const numCollaborators = collaboratorIds.length;

                // Pembagian Poin: BAGI RATA untuk semua personil (PJ + Kolaborator)
                // N personil total → masing-masing mendapat 1/N dari total poin tahapan
                const totalParticipants = 1 + numCollaborators;
                const equalPct = 1 / totalParticipants;
                let pjScore = Math.round(baseScore * equalPct * 100) / 100;
                let coPjScores: number[] = collaboratorIds.map(() => Math.round(baseScore * equalPct * 100) / 100);


                // Simpan perolehan skor untuk PJ Utama
                if (stage.pj && stage.pj.id) {
                    const pjId = stage.pj.id;
                    if (!rankingsMap[pjId]) {
                        rankingsMap[pjId] = { id: pjId, name: stage.pj.name || 'Unknown', totalScore: 0, completedStages: 0, details: [] };
                    }
                    rankingsMap[pjId].totalScore += pjScore;
                    rankingsMap[pjId].completedStages += 1;
                    rankingsMap[pjId].details.push({
                        projectId: stage.project.id,
                        projectTitle: stage.project.title || 'Proyek Tanpa Judul',
                        category: catKey,
                        stageLabel: stage.label || 'Tahap Tidak Diketahui',
                        scoreEarned: pjScore,
                        date: completionDate.toISOString()
                    });
                }

                // Simpan perolehan skor untuk seluruh Kolaborator (Co-PJ)
                collaboratorIds.forEach((coId, idx) => {
                    const coScore = coPjScores[idx] || 0;
                    const coName = userMap.get(coId) || 'Unknown';

                    if (!rankingsMap[coId]) {
                        rankingsMap[coId] = { id: coId, name: coName, totalScore: 0, completedStages: 0, details: [] };
                    }
                    rankingsMap[coId].totalScore += coScore;
                    rankingsMap[coId].completedStages += 1;
                    rankingsMap[coId].details.push({
                        projectId: stage.project.id,
                        projectTitle: stage.project.title || 'Proyek Tanpa Judul',
                        category: catKey,
                        stageLabel: `${stage.label || 'Tahap Tidak Diketahui'} (Kolaborasi ${idx + 1})`,
                        scoreEarned: coScore,
                        date: completionDate.toISOString()
                    });
                });

                // Reviewer mendapat poin bonus saat menyetujui tahapan
                const reviewer = (stage as any).reviewer;
                if (reviewer && reviewer.id) {
                    const reviewerId = reviewer.id;
                    if (!rankingsMap[reviewerId]) {
                        rankingsMap[reviewerId] = { id: reviewerId, name: reviewer.name || 'Unknown', totalScore: 0, completedStages: 0, details: [] };
                    }
                    
                    // Logika poin: 3 poin khusus jika PJ penyuntingan me-review tahap tata letak, selain itu 1 poin
                    let reviewerScore = 1;
                    if ((stage as any).idName === 'tata-letak' && reviewer.role !== 'admin') {
                        reviewerScore = 3;
                    }

                    rankingsMap[reviewerId].totalScore += reviewerScore;
                    rankingsMap[reviewerId].details.push({ projectId: stage.project.id, projectTitle: stage.project.title || 'Proyek Tanpa Judul', category: catKey, stageLabel: `${stage.label || 'Tahap Tidak Diketahui'} (Review)`, scoreEarned: reviewerScore, date: completionDate.toISOString() });
                }
            }

            // Normalisasi totalScore ke 2 desimal
            for (const item of Object.values(rankingsMap)) {
                item.totalScore = Math.round(item.totalScore * 100) / 100;
            }

            const rankings = Object.values(rankingsMap)
                .sort((a, b) => b.totalScore !== a.totalScore
                    ? b.totalScore - a.totalScore
                    : b.completedStages - a.completedStages
                )
                .slice(0, 30);

            res.json({ month: queryMonth, year: queryYear, allMonths, rankings });
        } catch (error) {
            console.error("[RankingsController.getProductivityRankings]", error);
            res.status(500).json({ error: "Gagal mengambil data peringkat produktivitas" });
        }
    },

    /**
     * GET /api/rankings/workload
     * Mengambil statistik beban kerja global untuk seluruh PJ.
     * Hanya menghitung tahapan berstatus 'active', 'review', 'revision' dari proyek yang belum diarsipkan/selesai.
     * Khusus Terbitan: verifikasi apakah tahapan benar-benar terbuka menggunakan logika DAG.
     */
    async getWorkload(req: Request, res: Response) {
        try {
            // Ambil semua proyek yang sedang berjalan (tidak archived & tidak done)
            // Sertakan SEMUA stage per proyek (tidak hanya active) agar logika DAG Terbitan bisa divalidasi
            const activeProjectsList = await db.query.projects.findMany({
                where: sql`${projects.status} NOT IN ('archived', 'done')`,
                with: {
                    stages: {
                        with: {
                            pj: true
                        }
                    }
                }
            });

            // Ambil seluruh user untuk diinisialisasi (agar PJ yang memiliki 0 tahapan tetap muncul)
            const allUsers = await db.query.users.findMany();

            const workloadMap: Record<string, {
                id: string;
                name: string;
                stageCount: number;
                projectIds: Set<string>;
            }> = {};

            // Inisialisasi semua user agar workload = 0 tetap dikembalikan
            for (const u of allUsers) {
                workloadMap[u.id] = {
                    id: u.id,
                    name: u.name || 'Unknown',
                    stageCount: 0,
                    projectIds: new Set()
                };
            }

            // Hitung tahapan yang benar-benar aktif / sedang berjalan untuk tiap PJ
            // Khusus Terbitan: skip tahapan yang statusnya 'active' di DB tapi masih terkunci secara logika DAG
            for (const proj of activeProjectsList) {
                const isTerbitan = proj.category === 'terbitan';

                // Untuk validasi Terbitan: gunakan semua stage proyek
                const allProjStages = proj.stages.map(s => ({ label: s.label ?? '', status: s.status ?? '' }));

                for (const stage of proj.stages) {
                    // Hanya hitung stage yang sedang aktif/dikerjakan
                    if (!['active', 'review', 'revision'].includes(stage.status ?? '')) continue;

                    // Khusus Terbitan: verifikasi apakah tahapan ini benar-benar terbuka (DAG check)
                    if (isTerbitan) {
                        const reallyActive = isTerbitanStageReallyActive(stage.label, allProjStages);
                        if (!reallyActive) continue; // tahapan masih terkunci secara logika DAG
                    }

                    // Kumpulkan semua personil (PJ utama + seluruh kolaborator)
                    const coIds = (stage.coPjIds && Array.isArray(stage.coPjIds) && stage.coPjIds.length > 0)
                        ? (stage.coPjIds as string[]).filter((id: string) => id && id !== stage.pjId)
                        : (stage.coPjId && stage.coPjId !== stage.pjId ? [stage.coPjId] : []);
                    
                    const participants = Array.from(new Set([stage.pjId, ...coIds])).filter(Boolean) as string[];

                    for (const personId of participants) {
                        if (workloadMap[personId]) {
                            workloadMap[personId].stageCount++;
                            workloadMap[personId].projectIds.add(proj.id);
                        }
                    }
                }
            }


            const result = Object.values(workloadMap).map(pj => ({
                id: pj.id,
                name: pj.name,
                stageCount: pj.stageCount,
                projectCount: pj.projectIds.size
            }));

            res.json(result);
        } catch (error) {
            console.error("[RankingsController.getWorkload]", error);
            res.status(500).json({ error: "Gagal mengambil data beban kerja tim" });
        }
    }
};
