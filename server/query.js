const { Pool } = require('pg');
require('dotenv').config();

async function test() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  // 1. Cari satu stage dengan category 'terbitan'
  const res = await pool.query(`
    SELECT s.id, s.score, s.status, s."projectId" 
    FROM stages s
    JOIN projects p ON p.id = s."projectId"
    WHERE p.category = 'terbitan'
    LIMIT 1
  `);
  
  if (res.rows.length === 0) {
    console.log("No terbitan stage found.");
    process.exit(0);
  }
  
  const stageId = res.rows[0].id;
  console.log("Before update:", res.rows[0]);
  
  // 2. Coba update score jadi 99
  await pool.query(`UPDATE stages SET score = 99 WHERE id = $1`, [stageId]);
  
  // 3. Baca lagi
  const res2 = await pool.query(`SELECT id, score, status FROM stages WHERE id = $1`, [stageId]);
  console.log("After manual update:", res2.rows[0]);
  
  process.exit(0);
}

test().catch(console.error);
