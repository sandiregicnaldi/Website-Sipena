/**
 * autoAssignService.ts
 *
 * Service untuk menentukan PJ dan deadline secara otomatis per tahapan proyek.
 *
 * Logika pemilihan PJ:
 *   1. Filter user aktif yang memiliki skill sesuai label tahapan (berdasarkan STAGE_SKILL_MAP)
 *   2. Hitung beban tugas SPESIFIK per label (bukan total tugas aktif)
 *   3. Pilih user dengan beban terkecil
 *   4. Tiebreaker jika beban sama → user.createdAt paling awal (terdaftar lebih dulu)
 *
 * Logika deadline:
 *   - Kumulatif dari tanggal mulai (startDate)
 *   - Setiap tahap mendapat N Hari Kerja (HK) dari app_settings key 'stage_deadlines'
 *   - HK = skip Sabtu & Minggu (tanpa kalender libur nasional)
 */

import { db } from "../db";
import { stages, users, appSettings } from "../db/schema";
import { eq, and, inArray, sql } from "drizzle-orm";
import { getRequiredSkills } from "../data/skillMapping";

// Default HK per label jika belum ada di app_settings
export const DEFAULT_STAGE_DEADLINES: Record<string, number> = {
    // ── Terbitan (Sequential) ──────────────────────────────────────────────────
    "Kelengkapan Naskah": 1,
    "Pembuatan Surat Penerimaan Terbitan": 1,
    "Penyuntingan": 7,
    "Tata Letak Naskah": 7,
    "Penginputan Nomor Induk Penerbitan": 1,
    "Desain Sampul": 5,
    "Pembuatan Dummy": 1,
    "Kendali Kualitas": 2,
    "Penerbitan ISBN": 3,
    "Pembuatan Dummy Final": 1,
    "Unggah ke Sipena dan Ipusnas": 1,
    "Pembuatan Surat Keterangan Terbit": 1,
    "Serah Terima Karya Cetak dan Rekam": 1,
    // Terjemahan (masuk terbitan)
    "Terjemahkan": 14,
    "Penyuntingan Naskah Terjemahan": 7,

    // ── Media Sosial (Parallel — semua tahap deadline serentak) ───────────────
    "Penyusunan Teks": 2,
    "Perancangan Desain": 2,
    "Tinjauan Konten": 2,
    "Pengunggahan": 2,

    // ── Keuangan (Sequential — kumulatif 2 HK per tahap) ──────────────────────
    "Verifikasi dan Validasi Hasil Kegiatan": 2,
    "Laporan Kinerja dan Evaluasi Kegiatan": 2,
    // Keuangan typeStages (jika ada dari DB)
    "Dokumen rincian anggaran belanja APBN": 2,
    "Kerangka Acuan Kerja (KAK) Penerbitan": 2,
    "Implementasi Kegiatan Penerbitan": 2,
    "Pertanggungjawaban dan Administrasi Keuangan": 2,
};


export interface AssignedStageResult {
    label: string;
    order: number;
    pjId: string | null;
    pjName: string | null;
    deadline: Date | null;
    hk: number;
    reason: string;      // Penjelasan kenapa PJ ini dipilih (untuk preview)
    noEligiblePJ: boolean; // true jika tidak ada PJ yang memenuhi syarat → masuk bursa tugas
}

/**
 * Ambil konfigurasi HK dari app_settings.
 * Jika belum ada, gunakan DEFAULT_STAGE_DEADLINES.
 */
export async function getStageDeadlines(): Promise<Record<string, number>> {
    try {
        const [row] = await db
            .select()
            .from(appSettings)
            .where(eq(appSettings.key, "stage_deadlines"))
            .limit(1);

        if (row?.value) {
            // Merge dengan default agar label baru otomatis punya fallback
            return { ...DEFAULT_STAGE_DEADLINES, ...(row.value as Record<string, number>) };
        }
    } catch (e) {
        console.warn("[autoAssign] Gagal baca stage_deadlines dari DB, pakai default:", e);
    }
    return { ...DEFAULT_STAGE_DEADLINES };
}

/**
 * Simpan konfigurasi HK ke app_settings.
 */
export async function saveStageDeadlines(data: Record<string, number>): Promise<void> {
    await db
        .insert(appSettings)
        .values({ key: "stage_deadlines", value: data as any, updatedAt: new Date() })
        .onConflictDoUpdate({
            target: appSettings.key,
            set: { value: data as any, updatedAt: new Date() },
        });
}

/**
 * Tambahkan N hari kerja ke tanggal, skip Sabtu (6) dan Minggu (0).
 */
export function addWorkingDays(startDate: Date, days: number): Date {
    const result = new Date(startDate);
    let added = 0;
    while (added < days) {
        result.setDate(result.getDate() + 1);
        const day = result.getDay();
        if (day !== 0 && day !== 6) { // 0=Minggu, 6=Sabtu
            added++;
        }
    }
    return result;
}

/**
 * Hitung jumlah tugas AKTIF untuk user tertentu dengan label tahapan tertentu.
 * "Aktif" = status IN ('active', 'review', 'revision')
 */
async function getActiveLabelCount(userId: string, stageLabel: string): Promise<number> {
    const result = await db.query.stages.findMany({
        where: and(
            eq(stages.pjId, userId),
            inArray(stages.status, ["active", "review", "revision"]),
            sql`LOWER(TRIM(${stages.label})) = LOWER(TRIM(${stageLabel}))`
        ),
        columns: { id: true },
    });
    return result.length;
}

/**
 * Pilih PJ terbaik dari daftar kandidat untuk satu label tahapan.
 * Kriteria:
 *   1. Beban spesifik (jumlah tugas aktif dengan label yang sama) paling kecil
 *   2. Tiebreaker: user.createdAt paling awal (terdaftar lebih dulu di sistem)
 */
async function pickBestPJ(
    eligibleUsers: Array<{ id: string; name: string; createdAt: Date }>,
    stageLabel: string
): Promise<{ user: (typeof eligibleUsers)[0]; loadCount: number; reason: string } | null> {
    if (eligibleUsers.length === 0) return null;

    // Hitung beban per user untuk label ini
    const withLoad = await Promise.all(
        eligibleUsers.map(async (u) => ({
            user: u,
            loadCount: await getActiveLabelCount(u.id, stageLabel),
        }))
    );

    // Sort: beban terkecil dulu, tiebreaker createdAt ascending (terlama terdaftar = prioritas)
    withLoad.sort((a, b) => {
        if (a.loadCount !== b.loadCount) return a.loadCount - b.loadCount;
        return new Date(a.user.createdAt).getTime() - new Date(b.user.createdAt).getTime();
    });

    const winner = withLoad[0];
    const minLoad = winner.loadCount;
    const tied = withLoad.filter((x) => x.loadCount === minLoad);
    const reason =
        tied.length === 1
            ? `Beban "${stageLabel}" terkecil (${minLoad} tugas aktif)`
            : `Beban "${stageLabel}" sama (${minLoad} tugas), dipilih berdasarkan urutan pendaftaran`;

    return { ...winner, reason };
}

/**
 * Fungsi utama: Tentukan PJ dan deadline otomatis untuk setiap tahapan.
 *
 * @param stageLabels - Array label + order secara berurutan
 * @param startDate   - Tanggal mulai proyek (biasanya hari ini)
 * @param workflow    - 'sequential' (default): deadline kumulatif estafet
 *                      'parallel': semua tahap dihitung dari startDate, tidak kumulatif
 * @returns           - Array AssignedStageResult per tahapan
 */
export async function autoAssignStages(
    stageLabels: { label: string; order: number }[],
    startDate: Date,
    workflow: 'sequential' | 'parallel' = 'sequential'
): Promise<AssignedStageResult[]> {
    const deadlineConfig = await getStageDeadlines();

    // Ambil semua user aktif sekaligus (1 query, efisien)
    const allActiveUsers = await db.query.users.findMany({
        where: eq(users.status, "active"),
        columns: { id: true, name: true, skills: true, createdAt: true },
    });

    const results: AssignedStageResult[] = [];

    // Sequential: deadline bergerak maju dari titik terakhir (estafet)
    // Parallel: setiap tahap dihitung dari startDate yang sama (serentak)
    let cumulativeDate = new Date(startDate);

    for (const { label, order } of stageLabels) {
        const hk = deadlineConfig[label] ?? 1;

        let deadline: Date;
        if (workflow === 'parallel') {
            // Semua tahap berakhir pada tanggal yang sama (startDate + HK tahap ini)
            // Tidak kumulatif — masing-masing dihitung dari startDate
            deadline = addWorkingDays(new Date(startDate), hk);
        } else {
            // Sequential: kumulatif — terus maju dari deadline tahap sebelumnya
            cumulativeDate = addWorkingDays(cumulativeDate, hk);
            deadline = new Date(cumulativeDate);
        }

        // Filter user yang memiliki skill sesuai
        const requiredSkills = getRequiredSkills(label);
        let eligibleUsers: Array<{ id: string; name: string; createdAt: Date }>;

        if (requiredSkills.length === 0) {
            // Tidak ada skill requirement → semua user aktif eligible
            eligibleUsers = allActiveUsers.map((u) => ({
                id: u.id,
                name: u.name,
                createdAt: u.createdAt,
            }));
        } else {
            eligibleUsers = allActiveUsers
                .filter((u) => {
                    const userSkills: string[] = (u.skills as string[]) || [];
                    return requiredSkills.some((skill) => userSkills.includes(skill));
                })
                .map((u) => ({
                    id: u.id,
                    name: u.name,
                    createdAt: u.createdAt,
                }));
        }

        if (eligibleUsers.length === 0) {
            results.push({
                label,
                order,
                pjId: null,
                pjName: null,
                deadline,
                hk,
                reason: `Tidak ada user aktif dengan skill: ${requiredSkills.join(", ") || "—"}. Tahap masuk bursa tugas.`,
                noEligiblePJ: true,
            });
            continue;
        }

        const best = await pickBestPJ(eligibleUsers, label);
        if (!best) {
            results.push({
                label, order, pjId: null, pjName: null,
                deadline, hk,
                reason: "Gagal menentukan PJ.",
                noEligiblePJ: true,
            });
            continue;
        }

        results.push({
            label,
            order,
            pjId: best.user.id,
            pjName: best.user.name,
            deadline,
            hk,
            reason: best.reason,
            noEligiblePJ: false,
        });
    }

    return results;
}

