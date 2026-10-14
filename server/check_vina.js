const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function checkVina() {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT id, email, name, role, status FROM "user" WHERE email ILIKE \'%vina%\'');
    console.log('Query result for Vina:', res.rows);
  } finally {
    client.release();
    await pool.end();
  }
}
checkVina().catch(console.error);
