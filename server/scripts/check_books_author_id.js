const { Pool } = require('pg');
require('dotenv').config({ path: 'server/.env' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkBooksAuthorId() {
  const total = await pool.query(`SELECT COUNT(*) FROM books`);
  const withAuthorId = await pool.query(`SELECT COUNT(*) FROM books WHERE author_id IS NOT NULL`);
  const nullAuthorId = await pool.query(`SELECT COUNT(*) FROM books WHERE author_id IS NULL`);
  
  console.log({
    totalBooks: total.rows[0].count,
    withAuthorId: withAuthorId.rows[0].count,
    nullAuthorId: nullAuthorId.rows[0].count
  });

  const samples = await pool.query(`
    SELECT b.id, b.title, b.author_name, b.author_id, u.name as user_name
    FROM books b
    LEFT JOIN "user" u ON b.author_id = u.id
    LIMIT 5
  `);
  console.log('Sample books:', samples.rows);

  await pool.end();
}

checkBooksAuthorId().catch(console.error);
