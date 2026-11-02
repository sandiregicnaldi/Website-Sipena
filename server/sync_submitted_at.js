/**
 * Script Sinkronisasi submitted_at Tahapan ke Database Produksi
 * 
 * Fungsi:
 * 1. Mengoreksi submitted_at pada tahapan yang disubmit di Oktober (atau bulan sebelumnya)
 *    namun sempat tertimpa menjadi tanggal approval hari ini (November).
 * 2. Mengisi submitted_at yang masih kosong (NULL) dengan riwayat notifikasi pengajuan review.
 * 3. Mengisi fallback untuk tahapan selesai lama menggunakan approved_at / project.created_at.
 * 
 * Cara Penggunaan di Server:
 *   cd server
 *   node sync_submitted_at.js
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  const client = await pool.connect();
  console.log('=== MULAI SINKRONISASI SUBMITTED_AT TAHAPAN ===\n');

  try {
    await client.query('BEGIN');

    // 1. Pastikan kolom submitted_at sudah ada
    await client.query(`ALTER TABLE stages ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP`);

    // 2. Sinkronkan submitted_at dengan waktu notifikasi review PJ
    const syncRes = await client.query(`
      WITH notif_stages AS (
        SELECT 
          n.project_id,
          n.created_at as notif_time,
          TRIM(LOWER(substring(n.message from 'Tahap ["'']([^"'']+)["'']'))) as stage_label
        FROM notifications n
        WHERE n.type = 'review' OR n.message ILIKE '%menunggu review%'
      ),
      latest_notifs AS (
        SELECT DISTINCT ON (project_id, stage_label)
          project_id,
          stage_label,
          notif_time
        FROM notif_stages
        WHERE stage_label IS NOT NULL
        ORDER BY project_id, stage_label, notif_time DESC
      )
      UPDATE stages s
      SET submitted_at = ln.notif_time
      FROM latest_notifs ln
      WHERE ln.project_id = s.project_id 
        AND TRIM(LOWER(s.label)) = ln.stage_label
        AND (
          s.submitted_at IS NULL 
          OR (s.submitted_at >= '2026-11-01' AND ln.notif_time < '2026-11-01')
          OR s.submitted_at > (ln.notif_time + interval '5 minutes')
        )
      RETURNING s.id, s.label, s.submitted_at;
    `);

    console.log(`[1] Berhasil memperbarui ${syncRes.rowCount} tahapan berdasarkan riwayat notifikasi review.`);
    for (const r of syncRes.rows.slice(0, 15)) {
      console.log(`    - Tahap "${r.label}" -> submitted_at: ${r.submitted_at}`);
    }

    // 3. Fallback untuk tahapan selesai lama yang database submitted_at nya masih NULL
    const fallbackRes = await client.query(`
      UPDATE stages s
      SET submitted_at = COALESCE(s.approved_at, p.created_at, NOW())
      FROM projects p
      WHERE s.project_id = p.id
        AND s.submitted_at IS NULL
        AND s.status IN ('done', 'archived')
      RETURNING s.id, s.label, s.submitted_at;
    `);

    console.log(`\n[2] Berhasil mengisi fallback untuk ${fallbackRes.rowCount} tahapan lama yang selesai.`);

    await client.query('COMMIT');
    console.log('\n=== SINKRONISASI SELESAI DENGAN SUKSES ===');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error saat sinkronisasi:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
