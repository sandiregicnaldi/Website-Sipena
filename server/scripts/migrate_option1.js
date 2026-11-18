const fs = require('fs');
const readline = require('readline');
const path = require('path');
const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:pgadmin123@localhost:5432/sipena_dev'
});

// Helper parsing SQL VALUES
function parseSqlValues(valuesStr) {
    const rows = [];
    let currentRow = [];
    let currentVal = '';
    let inQuotes = false;
    let quoteChar = '';
    let inRow = false;
    let isEscaped = false;

    for (let i = 0; i < valuesStr.length; i++) {
        const char = valuesStr[i];

        if (isEscaped) {
            currentVal += char;
            isEscaped = false;
            continue;
        }

        if (char === '\\') {
            isEscaped = true;
            continue;
        }

        if (!inRow) {
            if (char === '(') {
                inRow = true;
                currentRow = [];
                currentVal = '';
                inQuotes = false;
            }
            continue;
        }

        if (inQuotes) {
            if (char === quoteChar) {
                if (valuesStr[i + 1] === quoteChar) {
                    currentVal += quoteChar;
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                currentVal += char;
            }
        } else {
            if (char === "'" || char === '"') {
                inQuotes = true;
                quoteChar = char;
            } else if (char === ',') {
                currentRow.push(cleanVal(currentVal));
                currentVal = '';
            } else if (char === ')') {
                currentRow.push(cleanVal(currentVal));
                rows.push(currentRow);
                currentRow = [];
                currentVal = '';
                inRow = false;
            } else {
                currentVal += char;
            }
        }
    }

    return rows;
}

function cleanVal(val) {
    val = val.trim();
    if (val.toUpperCase() === 'NULL') return null;
    return val;
}

function cleanHtml(text) {
    if (!text) return '';
    return text
        .replace(/<br\s*[\/]?>/gi, '\n')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .trim();
}

async function runMigration() {
    console.log('🚀 MEMULAI MIGRASI OPSI 1: BUKU & PENULIS DARI SQL DUMP KE POSTGRESQL...\n');

    const sqlPath = path.resolve(__dirname, '../../migration/epublishing_LIVE_2026.sql');
    if (!fs.existsSync(sqlPath)) {
        throw new Error('File SQL dump tidak ditemukan di ' + sqlPath);
    }

    const publicDir = path.resolve(__dirname, '../../public');
    const coversDir = path.join(publicDir, 'covers');
    const pdfDir = path.join(publicDir, 'file pdf buku');
    const fotoPenulisDir = path.join(publicDir, 'foto penulis');

    console.log('📁 Mengecek folder aset di public:');
    console.log('   - Covers:', fs.existsSync(coversDir) ? 'Tersedia' : 'Tidak Ditemukan');
    console.log('   - PDFs:', fs.existsSync(pdfDir) ? 'Tersedia' : 'Tidak Ditemukan');
    console.log('   - Foto Penulis:', fs.existsSync(fotoPenulisDir) ? 'Tersedia' : 'Tidak Ditemukan');

    const kategoriMap = {};
    const jenisMap = {};
    const rawPenulis = [];
    const rawCatalogs = [];

    const fileStream = fs.createReadStream(sqlPath, { encoding: 'utf8' });
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    console.log('\n⏳ Membaca dan mem-parsing file SQL 50MB...');
    for await (const line of rl) {
        if (line.startsWith('INSERT INTO `kategori_topik`') || line.startsWith('INSERT INTO kategori_topik')) {
            const valIdx = line.indexOf('VALUES');
            if (valIdx !== -1) {
                const rows = parseSqlValues(line.slice(valIdx + 6));
                for (const r of rows) kategoriMap[r[0]] = r[1];
            }
        } else if (line.startsWith('INSERT INTO `jenis_pustaka`') || line.startsWith('INSERT INTO jenis_pustaka')) {
            const valIdx = line.indexOf('VALUES');
            if (valIdx !== -1) {
                const rows = parseSqlValues(line.slice(valIdx + 6));
                for (const r of rows) jenisMap[r[0]] = r[1];
            }
        } else if (line.startsWith('INSERT INTO `penulis`') || line.startsWith('INSERT INTO penulis')) {
            const valIdx = line.indexOf('VALUES');
            if (valIdx !== -1) {
                const rows = parseSqlValues(line.slice(valIdx + 6));
                rawPenulis.push(...rows);
            }
        } else if (line.startsWith('INSERT INTO `catalogs`') || line.startsWith('INSERT INTO catalogs')) {
            const valIdx = line.indexOf('VALUES');
            if (valIdx !== -1) {
                const rows = parseSqlValues(line.slice(valIdx + 6));
                rawCatalogs.push(...rows);
            }
        }
    }

    console.log(`✅ Parsing selesai:`);
    console.log(`   - Kategori: ${Object.keys(kategoriMap).length} kategori`);
    console.log(`   - Penulis : ${rawPenulis.length} penulis`);
    console.log(`   - Buku    : ${rawCatalogs.length} katalog buku`);

    // --- 1. MIGRASI PENULIS KE TABEL user ---
    console.log('\n👤 Memulai migrasi data Penulis ke tabel PostgreSQL "user"...');
    const authorNameToId = new Map();
    let authorInserted = 0;
    let authorSkipped = 0;

    for (const p of rawPenulis) {
        const oldId = p[0];
        const name = p[1]?.trim();
        const bio = cleanHtml(p[2]);
        if (!name) continue;

        const userId = `penulis_${oldId}`;
        const email = `penulis.${oldId}@perpusnaspress.id`;

        // Cek foto
        let photoUrl = null;
        if (fs.existsSync(path.join(fotoPenulisDir, `${oldId}.jpg`))) {
            photoUrl = `/foto penulis/${oldId}.jpg`;
        } else if (fs.existsSync(path.join(fotoPenulisDir, `${oldId}.png`))) {
            photoUrl = `/foto penulis/${oldId}.png`;
        }

        authorNameToId.set(name.toLowerCase(), userId);

        try {
            await pool.query(`
                INSERT INTO "user" (
                    id, name, email, email_verified, role, status,
                    bio, image, profesi, domisili, created_at, updated_at
                ) VALUES (
                    $1, $2, $3, true, 'penulis', 'active',
                    $4, $5, 'Penulis Perpusnas Press', 'Indonesia', NOW(), NOW()
                )
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    bio = EXCLUDED.bio,
                    image = COALESCE(EXCLUDED.image, "user".image),
                    updated_at = NOW()
            `, [userId, name, email, bio, photoUrl]);

            authorInserted++;
        } catch (err) {
            console.error(`Gagal insert penulis ${name}:`, err.message);
            authorSkipped++;
        }
    }
    console.log(`✅ Migrasi Penulis Selesai: ${authorInserted} tersimpan / ter-update (${authorSkipped} dilewati).`);

    // --- 2. MIGRASI KATALOG KE TABEL books ---
    console.log('\n📚 Memulai migrasi data Buku ke tabel PostgreSQL "books"...');
    let booksInserted = 0;
    let booksSkipped = 0;
    let coverFoundCount = 0;
    let pdfFoundCount = 0;

    for (const c of rawCatalogs) {
        const oldId = c[0];
        const title = c[1]?.trim();
        const authorName = c[2]?.trim() || 'Perpusnas Press';
        const publishLocation = c[3];
        const publisher = c[4];
        const yearRaw = parseInt(c[5], 10);
        const year = (!isNaN(yearRaw) && yearRaw > 1900 && yearRaw < 2100) ? yearRaw : null;
        const isbn = c[6]?.trim() || null;
        const isbnDigital = c[7]?.trim() || null;
        const halaman = c[8]?.trim() || null;
        const synopsis = cleanHtml(c[9]) || null;
        const jenisId = c[10];
        const kategoriId = c[11];
        const ratingRaw = parseFloat(c[17]);
        const ratingAvg = (!isNaN(ratingRaw) && ratingRaw > 0) ? ratingRaw : 5.0;
        const pdfFileRaw = c[19]?.trim();
        const editor = c[31]?.trim() || null;
        const layoutDesigner = c[32]?.trim() || null;
        const coverDesigner = c[33]?.trim() || null;

        if (!title) continue;

        // Tentukan Kategori Resmi SiPena
        let category = 'Umum';
        if (jenisId === '2') {
            category = 'Pedoman / Standar';
        } else if (jenisId === '3') {
            category = 'Prosiding';
        } else if (jenisId === '4') {
            category = 'Laporan';
        } else if (jenisId === '5') {
            category = 'Majalah / Jurnal';
        } else if (kategoriMap[kategoriId]) {
            const mapped = kategoriMap[kategoriId];
            if (mapped === 'Ekonomi & Management') category = 'Ekonomi & Management';
            else if (mapped === 'Biografi & Memoar') category = 'Biografi & Memoar';
            else if (mapped === 'Hukum & Politik') category = 'Hukum & Politik';
            else if (mapped === 'Sains & Teknologi') category = 'Humaniora';
            else category = mapped;
        }

        // Tentukan Cover URL
        let coverUrl = null;
        if (fs.existsSync(path.join(coversDir, `${oldId}.jpg`))) {
            coverUrl = `/covers/${oldId}.jpg`;
            coverFoundCount++;
        } else if (fs.existsSync(path.join(coversDir, `${oldId}.png`))) {
            coverUrl = `/covers/${oldId}.png`;
            coverFoundCount++;
        }

        // Tentukan PDF URL
        let fileUrl = null;
        if (pdfFileRaw && fs.existsSync(path.join(pdfDir, pdfFileRaw))) {
            fileUrl = `/file pdf buku/${pdfFileRaw}`;
            pdfFoundCount++;
        } else if (fs.existsSync(path.join(pdfDir, `${oldId}.pdf`))) {
            fileUrl = `/file pdf buku/${oldId}.pdf`;
            pdfFoundCount++;
        }

        // Cari Author ID jika cocok
        let matchedAuthorId = null;
        if (authorName) {
            for (const [authorNameKey, aId] of authorNameToId.entries()) {
                if (authorName.toLowerCase().includes(authorNameKey)) {
                    matchedAuthorId = aId;
                    break;
                }
            }
        }

        try {
            await pool.query(`
                INSERT INTO books (
                    title, author_id, author_name, year, isbn, isbn_digital,
                    cover_url, file_url, category, synopsis,
                    editor, layout_designer, cover_designer,
                    rating_avg, rating_count, status, created_at, updated_at
                ) VALUES (
                    $1, $2, $3, $4, $5, $6,
                    $7, $8, $9, $10,
                    $11, $12, $13,
                    $14, 1, 'published', NOW(), NOW()
                )
            `, [
                title, matchedAuthorId, authorName, year, isbn, isbnDigital,
                coverUrl, fileUrl, category, synopsis,
                editor, layoutDesigner, coverDesigner,
                ratingAvg
            ]);

            booksInserted++;
            if (booksInserted % 250 === 0) {
                console.log(`   Progress: ${booksInserted} / ${rawCatalogs.length} buku terimpor...`);
            }
        } catch (err) {
            console.error(`Gagal insert buku "${title}":`, err.message);
            booksSkipped++;
        }
    }

    console.log(`\n=================================================`);
    console.log(`🎉 MIGRASI OPSI 1 SELESAI DENGAN SUKSES!`);
    console.log(`=================================================`);
    console.log(`📚 Total Buku Terimpor : ${booksInserted} buku`);
    console.log(`🖼️ Sampul Buku Cocok   : ${coverFoundCount} sampul`);
    console.log(`📄 Dokumen PDF Cocok   : ${pdfFoundCount} file PDF`);
    console.log(`✍️ Total Penulis        : ${authorInserted} penulis`);
    console.log(`=================================================\n`);

    const finalCount = await pool.query('SELECT count(*) FROM books');
    console.log(`📊 Total Buku di Database PostgreSQL Saat Ini: ${finalCount.rows[0].count} buku!`);

    await pool.end();
}

runMigration().catch(err => {
    console.error('Fatal error saat migrasi:', err);
    process.exit(1);
});
