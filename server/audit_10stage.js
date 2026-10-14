const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function audit10StageProjects() {
  const client = await pool.connect();
  try {
    const projectsRes = await client.query(`
      SELECT p.id, p.title, p.category, p.status, COUNT(s.id) as stage_count
      FROM projects p
      JOIN stages s ON s.project_id = p.id
      WHERE p.category = 'terbitan' AND p.deleted_at IS NULL
      GROUP BY p.id, p.title, p.category, p.status
      HAVING COUNT(s.id) = 10
      ORDER BY p.created_at DESC;
    `);

    console.log(`=== AUDIT 10-STAGE TERBITAN PROJECTS (Total: ${projectsRes.rows.length}) ===`);

    for (const p of projectsRes.rows) {
      const stagesRes = await client.query(`
        SELECT id, "order", label, status, approved_at
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
      const kkStatus = stageMap['Kendali Kualitas'];

      const shouldKkBeActiveOrDone = d1 && d2 && d3 && d4 && d5;
      const isStuck = shouldKkBeActiveOrDone && (kkStatus === 'draft');

      if (isStuck) {
        console.log(`STUCK PROJECT: [${p.id}] ${p.title}`);
        console.log(`  Stages above (Naskah..Desain Sampul) are ALL DONE, but Kendali Kualitas status is: '${kkStatus}'`);
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
}

audit10StageProjects().catch(console.error);
