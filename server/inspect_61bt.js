const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function inspectProject() {
  const client = await pool.connect();
  try {
    const projRes = await client.query(`SELECT id, title, category, status, created_at, updated_at FROM projects WHERE id = 'PRJ-2026-61BT' OR title ILIKE '%Bunga 7 Rupa dalam Tarian Jawa Timur Seri 1%'`);
    console.log('=== PROJECT INFO ===');
    console.log(projRes.rows);

    if (projRes.rows.length === 0) return;
    const projId = projRes.rows[0].id;

    const stagesRes = await client.query(`
      SELECT id, "order", label, status, pj_id, approved_at, notes, score
      FROM stages
      WHERE project_id = $1
      ORDER BY "order" ASC
    `, [projId]);

    console.log('=== STAGES INFO ===');
    for (const s of stagesRes.rows) {
      console.log(`[${s.order}] ${s.label.padEnd(40)} | status: ${s.status.padEnd(10)} | approved_at: ${s.approved_at} | score: ${s.score}`);
      if (s.notes && s.notes.length > 0) {
        console.log(`     notes (${s.notes.length}):`, JSON.stringify(s.notes[s.notes.length - 1]));
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
}

inspectProject().catch(console.error);
