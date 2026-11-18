const { Pool } = require('pg');
require('dotenv').config({ path: 'server/.env' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function cleanTitle(s) {
  if (!s) return '';
  return s
    .replace(/\b(prof|dr|dra|drs|ir|h|hj|s\.pd|m\.pd|s\.e|m\.e|s\.si|m\.si|s\.sos|m\.sos|s\.kom|m\.kom|s\.h|m\.h|s\.ip|m\.ip|m\.hum|ph\.d|s\.sn|m\.sn|s\.pt|m\.pt|apt)\b\.?/gi, '')
    .replace(/\b(penyadur|editor|penyunting|pengalih[- ]bahasa|penulis|pengarang|alih[- ]aksara|dkk)\b:?/gi, '')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase()
    .trim();
}

function isTokenMatch(rawAuthorField, targetAuthorName) {
  if (!rawAuthorField || !targetAuthorName) return false;

  const cleanTarget = cleanTitle(targetAuthorName);
  if (!cleanTarget || cleanTarget.length < 3) return false;

  // Split by author delimiters: comma, semicolon, slash, pipe, 'dan', '&', newline
  const tokens = rawAuthorField.split(/[,;|/&\n]|\bdan\b/gi);

  return tokens.some(token => {
    const cleanTok = cleanTitle(token);
    return cleanTok === cleanTarget;
  });
}

async function linkBooksToAuthors() {
  console.log('===============================================================');
  console.log('🔗 MENJALANKAN SMART AUTHOR-BOOK AUTO-LINKER (LANGKAH 3)');
  console.log('===============================================================\n');

  const authorsRes = await pool.query(`SELECT id, name FROM "user" WHERE role = 'penulis'`);
  const booksRes = await pool.query(`SELECT id, title, author_name, author_id FROM books WHERE author_id IS NULL`);

  console.log(`📚 Total buku dengan author_id NULL : ${booksRes.rows.length}`);
  console.log(`👤 Total penulis terdaftar          : ${authorsRes.rows.length}\n`);

  let linkedCount = 0;

  for (const b of booksRes.rows) {
    if (!b.author_name) continue;

    for (const a of authorsRes.rows) {
      if (isTokenMatch(b.author_name, a.name)) {
        await pool.query(`UPDATE books SET author_id = $1 WHERE id = $2`, [a.id, b.id]);
        linkedCount++;
        console.log(`✅ [TERTAUT] Penulis: "${a.name}" (${a.id})`);
        console.log(`   📖 Buku   : "${b.title}"`);
        console.log(`   🏷️ Metadata: "${b.author_name}"\n`);
        break; // Tautkan ke penulis utama yang cocok
      }
    }
  }

  console.log('===============================================================');
  console.log(`🎉 AUTO-LINKING SELESAI: ${linkedCount} buku berhasil dikaitkan secara permanen!`);
  console.log('===============================================================');

  const totalWithAuthorId = await pool.query(`SELECT COUNT(*) FROM books WHERE author_id IS NOT NULL`);
  console.log(`📊 Total buku dengan author_id valid di database: ${totalWithAuthorId.rows[0].count}`);

  await pool.end();
}

linkBooksToAuthors().catch(console.error);
