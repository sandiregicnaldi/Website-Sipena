const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  const client = await pool.connect();
  const res = await client.query("SELECT value FROM app_settings WHERE key = 'categories'");
  const cats = res.rows[0].value;
  
  console.log('\n=== TERBITAN STAGES di app_settings ===');
  const terbitan = cats.terbitan;
  (terbitan?.stages || []).forEach(s => {
    console.log(`  ${s.label}: score=${s.score}, perPageScore=${s.perPageScore}, pageMultiplier=${s.pageMultiplier}`);
  });

  client.release();
  await pool.end();
}
check().catch(console.error);
