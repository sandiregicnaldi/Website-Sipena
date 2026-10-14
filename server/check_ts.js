const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.connect().then(async client => {
  const r = await client.query(`SELECT id, label, approved_at, approved_at AT TIME ZONE 'UTC' AS utc FROM stages WHERE project_id = 'PRJ-2026-YMR9' ORDER BY "order";`);
  for (const s of r.rows) {
    console.log(`${(s.label||'').substring(0,40).padEnd(40)} | raw: ${s.approved_at} | utc: ${s.utc}`);
  }
  client.release(); pool.end();
}).catch(e => { console.error(e.message); pool.end(); });
