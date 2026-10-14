const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkDbSize() {
  const client = await pool.connect();
  try {
    const res = await client.query(`SELECT pg_size_pretty(pg_database_size(current_database())) as db_size;`);
    console.log('Database Size:', res.rows[0].db_size);
  } finally {
    client.release();
    await pool.end();
  }
}

checkDbSize().catch(console.error);
