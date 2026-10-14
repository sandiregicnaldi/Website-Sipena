/**
 * FIX: Reset approved_at untuk proyek "Bunga 7 Rupa dalam Tarian Jawa Timur Seri 2"
 * yang ter-set bulk 2026-08-01 11:37:40 saat diarsipkan.
 *
 * Berdasarkan investigasi:
 * - Stage dikerjakan Mei–Juli 2026 (note terakhir 30 Juli 2026)
 * - Proyek diarsipkan 1 Agustus 2026 dan semua approved_at tertimpa ke saat itu
 * - Seharusnya approved_at mengikuti tanggal pekerjaan selesai
 *
 * Solusi: set approved_at ke 31 Juli 2026 (hari terakhir pekerjaan)
 * agar poin masuk ke bulan Juli, bukan Agustus.
 */
const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function fix() {
  const client = await pool.connect();
  try {
    const PROJECT_ID = 'PRJ-2026-YMR9'; // Bunga 7 Rupa Seri 2

    // Cek dulu kondisi sekarang
    const before = await client.query(`
      SELECT id, label, approved_at FROM stages
      WHERE project_id = $1
      ORDER BY "order";
    `, [PROJECT_ID]);

    console.log('=== SEBELUM FIX ===');
    for (const s of before.rows) {
      const d = s.approved_at ? new Date(s.approved_at).toLocaleString('id-ID') : 'NULL';
      console.log(`  ${(s.label||'').substring(0,45).padEnd(45)} | approved_at: ${d}`);
    }

    // Set semua approved_at yang bulk-set saat pengarsipan (1 Agustus 2026) ke 31 Juli 2026
    // Scope: hanya PRJ-2026-YMR9, hanya yang approved_at = waktu arsip (rentang ±1 menit)
    const result = await client.query(`
      UPDATE stages
      SET approved_at = '2026-07-31 16:59:00+00'
      WHERE project_id = $1
        AND approved_at >= '2026-08-01 04:30:00+00'
        AND approved_at <= '2026-08-01 04:45:00+00'
      RETURNING id, label;
    `, [PROJECT_ID]);

    console.log(`\n✅ FIXED: ${result.rowCount} tahapan diubah ke 31 Juli 2026`);
    for (const r of result.rows) {
      console.log(`  - ${r.label}`);
    }

    // Verifikasi sesudah
    const after = await client.query(`
      SELECT id, label, approved_at FROM stages
      WHERE project_id = $1
      ORDER BY "order";
    `, [PROJECT_ID]);

    console.log('\n=== SESUDAH FIX ===');
    for (const s of after.rows) {
      const d = s.approved_at ? new Date(s.approved_at).toLocaleString('id-ID') : 'NULL';
      console.log(`  ${(s.label||'').substring(0,45).padEnd(45)} | approved_at: ${d}`);
    }

  } finally {
    client.release();
    await pool.end();
  }
}

fix().catch(console.error);
