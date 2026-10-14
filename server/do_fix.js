const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.connect().then(async client => {
  // Cek raw value
  const r = await client.query(
    "SELECT id, label, approved_at::text, approved_at::timestamptz AS ts FROM stages WHERE project_id = 'PRJ-2026-YMR9' LIMIT 3"
  );
  for (const row of r.rows) {
    console.log('label:', row.label);
    console.log('  approved_at text:', row.approved_at);
    console.log('  approved_at ts  :', row.ts);
  }

  // Coba WHERE langsung dengan CAST
  const r2 = await client.query(
    "SELECT COUNT(*) FROM stages WHERE project_id = 'PRJ-2026-YMR9' AND approved_at::date = '2026-08-01'"
  );
  console.log('\nStage dengan approved_at = 2026-08-01:', r2.rows[0].count);

  // Langsung update dengan date filter
  const r3 = await client.query(
    "UPDATE stages SET approved_at = '2026-07-31 16:59:00' WHERE project_id = 'PRJ-2026-YMR9' AND approved_at::date = '2026-08-01' RETURNING label"
  );
  console.log('Updated:', r3.rowCount, 'rows');
  r3.rows.forEach(x => console.log(' -', x.label));

  client.release();
  pool.end();
}).catch(e => { console.error(e.message); pool.end(); });
