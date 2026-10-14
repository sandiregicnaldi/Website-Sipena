const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  const client = await pool.connect();
  const res = await client.query("SELECT value FROM app_settings WHERE key = 'categories'");
  const cats = res.rows[0].value;

  for (const [catKey, cat] of Object.entries(cats)) {
    console.log(`\n=== ${cat.label || catKey} ===`);
    console.log(`Tipe proyek: ${(cat.types || []).map(t => t.label).join(', ') || '(tidak ada)'}`);
    console.log('Tahapan:');
    (cat.stages || []).forEach(s => {
      const poin = s.perPageScore > 0 ? `${s.perPageScore} per ${s.pageMultiplier} hal` : `${s.score} (tetap)`;
      console.log(`  ${s.order}. ${s.label} — ${poin}`);
    });
    if (cat.typeStages) {
      for (const [tk, ts] of Object.entries(cat.typeStages)) {
        console.log(`TypeStage [${tk}]:`);
        ts.forEach(s => {
          const poin = s.perPageScore > 0 ? `${s.perPageScore} per ${s.pageMultiplier} hal` : `${s.score} (tetap)`;
          console.log(`  ${s.order}. ${s.label} — ${poin}`);
        });
      }
    }
  }
  client.release();
  await pool.end();
}
check().catch(console.error);
