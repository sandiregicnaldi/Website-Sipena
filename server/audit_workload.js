const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function auditWorkload() {
  const client = await pool.connect();
  try {
    console.log('=== AUDIT KARTU KESIBUKAN TIM ===\n');

    // 1. Replika logika getWorkload dari backend
    const query = `
      SELECT
        u.name AS pj_name,
        COUNT(s.id) AS stage_count,
        COUNT(DISTINCT p.id) AS project_count,
        STRING_AGG(DISTINCT p.title, ', ' ORDER BY p.title) AS project_titles
      FROM stages s
      JOIN projects p ON p.id = s.project_id
      JOIN "user" u ON u.id = s.pj_id
      WHERE
        p.status NOT IN ('archived', 'done')
        AND p.deleted_at IS NULL
        AND s.status IN ('active', 'review', 'revision')
        AND s.pj_id IS NOT NULL
      GROUP BY u.id, u.name
      ORDER BY stage_count DESC;
    `;
    const { rows } = await client.query(query);

    console.log('Nama PJ                    | Tahapan | Proyek | Keterangan');
    console.log('---------------------------|---------|--------|-----------------------------');
    for (const row of rows) {
      const name = row.pj_name.padEnd(26);
      const stages = String(row.stage_count).padEnd(7);
      const projects = String(row.project_count).padEnd(6);
      console.log(`${name} | ${stages} | ${projects} | OK`);
    }

    console.log('\n=== DETAIL SANDI REGICNALDI (sample) ===');
    const sandiDetail = await client.query(`
      SELECT
        p.title AS proyek,
        p.status AS status_proyek,
        s.label AS tahapan,
        s.status AS status_tahapan
      FROM stages s
      JOIN projects p ON p.id = s.project_id
      JOIN "user" u ON u.id = s.pj_id
      WHERE
        u.name ILIKE '%sandi%'
        AND p.status NOT IN ('archived', 'done')
        AND p.deleted_at IS NULL
        AND s.status IN ('active', 'review', 'revision')
      ORDER BY p.title, s.order;
    `);
    console.log(`\nTotal: ${sandiDetail.rows.length} tahapan aktif`);
    for (const r of sandiDetail.rows) {
      console.log(`  [${r.status_proyek}] ${r.proyek.substring(0, 40).padEnd(40)} → [${r.status_tahapan}] ${r.tahapan}`);
    }

    // 2. Cek apakah ada stage dengan status bukan active/review/revision yang ikut terhitung
    console.log('\n=== CEK APAKAH ADA DATA ANOMALI (stage done/draft yang ikut terhitung) ===');
    const anomaly = await client.query(`
      SELECT s.status, COUNT(*) as jumlah
      FROM stages s
      JOIN projects p ON p.id = s.project_id
      WHERE p.status NOT IN ('archived', 'done')
        AND p.deleted_at IS NULL
        AND s.pj_id IS NOT NULL
      GROUP BY s.status
      ORDER BY jumlah DESC;
    `);
    console.log('Status Tahapan | Jumlah di Proyek Aktif');
    for (const r of anomaly.rows) {
      console.log(`  ${r.status.padEnd(14)} | ${r.jumlah}`);
    }

  } finally {
    client.release();
    await pool.end();
  }
}

auditWorkload().catch(console.error);
