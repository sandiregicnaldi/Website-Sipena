const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function fixData() {
  const client = await pool.connect();
  try {
    const PROJECT_ID = 'PRJ-2026-61OT';

    console.log('=== FIX 1: Restore Desain Sampul approved_at to 12 Juni 2026 ===');
    const updateDesainRes = await client.query(`
      UPDATE stages
      SET approved_at = '2026-06-12 12:00:00+00'
      WHERE project_id = $1 AND label = 'Desain Sampul'
      RETURNING id, label, approved_at;
    `, [PROJECT_ID]);
    console.log('Updated Desain Sampul:', updateDesainRes.rows);

    console.log('\n=== FIX 2: Activate Kendali Kualitas for PRJ-2026-61OT ===');
    const updateKkRes = await client.query(`
      UPDATE stages
      SET status = 'active'
      WHERE project_id = $1 AND label = 'Kendali Kualitas' AND status = 'draft'
      RETURNING id, label, status;
    `, [PROJECT_ID]);
    console.log('Activated Kendali Kualitas:', updateKkRes.rows);

    console.log('\n=== AUDIT & AUTO-ACTIVATE OTHER 10-STAGE TERBITAN PROJECTS ===');
    const projectsRes = await client.query(`
      SELECT p.id, p.title
      FROM projects p
      JOIN stages s ON s.project_id = p.id
      WHERE p.category = 'terbitan' AND p.deleted_at IS NULL
      GROUP BY p.id, p.title
      HAVING COUNT(s.id) = 10;
    `);

    for (const p of projectsRes.rows) {
      const stagesRes = await client.query(`
        SELECT id, "order", label, status
        FROM stages
        WHERE project_id = $1
        ORDER BY "order" ASC;
      `, [p.id]);

      const stageMap = {};
      stagesRes.rows.forEach(s => stageMap[s.label] = s.status);

      const d1 = stageMap['Kelengkapan Naskah'] === 'done' || stageMap['Kelengkapan Naskah'] === 'archived';
      const d2 = stageMap['Pembuatan Surat Penerimaan Terbitan'] === 'done' || stageMap['Pembuatan Surat Penerimaan Terbitan'] === 'archived';
      const d3 = stageMap['Penyuntingan'] === 'done' || stageMap['Penyuntingan'] === 'archived';
      const d4 = stageMap['Tata Letak Naskah'] === 'done' || stageMap['Tata Letak Naskah'] === 'archived';
      const d5 = stageMap['Desain Sampul'] === 'done' || stageMap['Desain Sampul'] === 'archived';

      if (d1 && d2 && d3 && d4 && d5 && stageMap['Kendali Kualitas'] === 'draft') {
        const fixKk = await client.query(`
          UPDATE stages
          SET status = 'active'
          WHERE project_id = $1 AND label = 'Kendali Kualitas' AND status = 'draft'
          RETURNING id, label, status;
        `, [p.id]);
        console.log(`Activated Kendali Kualitas for legacy project [${p.id}] ${p.title}:`, fixKk.rows);
      }
    }

  } finally {
    client.release();
    await pool.end();
  }
}

fixData().catch(console.error);
