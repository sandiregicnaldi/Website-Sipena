const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkNipCount() {
  const client = await pool.connect();
  try {
    const res = await client.query(`SELECT count(*) FROM nip_records`);
    console.log('Total NIP records in DB:', res.rows[0].count);

    const sample = await client.query(`SELECT id, title, visual_format, created_at FROM nip_records ORDER BY created_at DESC LIMIT 5`);
    console.log('Latest 5 records:', sample.rows);
  } finally {
    client.release();
    await pool.end();
  }
}

checkNipCount().catch(console.error);
