const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();

  // Cek semua tahapan Penyuntingan & Tata Letak yang done/archived beserta pageCount projeknya
  const res = await client.query(`
    SELECT
      s.id,
      s.label,
      s.status,
      s.score,
      s."approved_at",
      p.id AS project_id,
      p.title AS project_title,
      p.page_count,
      p.category
    FROM stages s
    JOIN projects p ON p.id = s.project_id
    WHERE p.category = 'terbitan'
      AND (s.label = 'Penyuntingan' OR s.label = 'Tata Letak Naskah')
      AND (s.status = 'done' OR s.status = 'archived')
    ORDER BY s.approved_at DESC
  `);

  console.log(`\nDitemukan ${res.rows.length} tahapan Penyuntingan/Tata Letak yang done/archived:\n`);
  res.rows.forEach(r => {
    const approvedMonth = r.approved_at ? new Date(r.approved_at).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) : 'N/A';
    const expectedScore = r.page_count > 0
      ? (r.label === 'Penyuntingan' ? Math.round(r.page_count / 10 * 1.5) : Math.round(r.page_count / 10 * 1))
      : 'tidak bisa dihitung (pageCount kosong)';
    
    console.log(`[${approvedMonth}] ${r.project_title}`);
    console.log(`  Tahap  : ${r.label}`);
    console.log(`  Score DB : ${r.score} | pageCount : ${r.page_count ?? 'NULL'}`);
    console.log(`  Seharusnya : ${expectedScore}`);
    console.log(`  ${r.score === 0 && (!r.page_count || r.page_count === 0) ? '⚠️  pageCount kosong — tidak bisa recalculate!' : r.score === 0 ? '❌ MASIH 0 padahal pageCount ada' : '✅ OK'}`);
    console.log('');
  });

  client.release();
  await pool.end();
}
run().catch(console.error);
