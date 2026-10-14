const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query("SELECT value FROM app_settings WHERE key = 'categories'").then(res => {
  const cats = res.rows[0].value;
  console.log('Deposit workflow:', cats.deposit?.workflow);
  console.log('Medsos workflow:', cats.medsos?.workflow);
  pool.end();
});
