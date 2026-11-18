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

  const tokens = rawAuthorField.split(/[,;|/&\n]|\bdan\b/gi);
  return tokens.some(token => cleanTitle(token) === cleanTarget);
}

async function fixAndRelink() {
  console.log('===============================================================');
  console.log('🛠️ PERBAIKAN TOTAL: MEMBERSIHKAN RELASI SALAH & RE-LINKING AKURAT');
  console.log('===============================================================\n');

  // 1. Dapatkan semua buku yang saat ini memiliki author_id
  const assignedBooks = await pool.query(`
    SELECT b.id, b.title, b.author_name, b.author_id, u.name as current_author_name
    FROM books b
    JOIN "user" u ON b.author_id = u.id
  `);

  console.log(`🔍 Memeriksa ${assignedBooks.rows.length} buku yang sudah memiliki author_id...`);
  let unlinkedFalseCount = 0;

  for (const b of assignedBooks.rows) {
    if (!isTokenMatch(b.author_name, b.current_author_name)) {
      // Ini adalah false positive dari legacy includes()! Lepas tautannya
      await pool.query(`UPDATE books SET author_id = NULL WHERE id = $1`, [b.id]);
      unlinkedFalseCount++;
      console.log(`❌ [DILEPAS] "${b.title}"`);
      console.log(`   Metadata Pengarang : "${b.author_name}"`);
      console.log(`   Salah Tertaut Ke   : "${b.current_author_name}" (${b.author_id})\n`);
    }
  }

  console.log(`✅ Selesai pembersihan: ${unlinkedFalseCount} buku yang salah tertaut berhasil dilepas!\n`);

  // 2. Sekarang re-link seluruh buku yang author_id-nya NULL hanya dengan exact token matching
  const authorsRes = await pool.query(`SELECT id, name FROM "user" WHERE role = 'penulis'`);
  const nullBooks = await pool.query(`SELECT id, title, author_name FROM books WHERE author_id IS NULL`);

  console.log(`🔗 Memindai ${nullBooks.rows.length} buku dengan author_id NULL untuk dicocokkan secara presisi...`);
  let newlyLinked = 0;

  for (const b of nullBooks.rows) {
    if (!b.author_name) continue;

    for (const a of authorsRes.rows) {
      if (isTokenMatch(b.author_name, a.name)) {
        await pool.query(`UPDATE books SET author_id = $1 WHERE id = $2`, [a.id, b.id]);
        newlyLinked++;
        break;
      }
    }
  }

  console.log(`🎯 Berhasil menautkan ${newlyLinked} buku dengan pencocokan token nama 100% presisi!`);

  const finalValid = await pool.query(`SELECT COUNT(*) FROM books WHERE author_id IS NOT NULL`);
  console.log(`\n📊 Total buku dengan author_id 100% valid saat ini: ${finalValid.rows[0].count}`);

  await pool.end();
}

fixAndRelink().catch(console.error);
