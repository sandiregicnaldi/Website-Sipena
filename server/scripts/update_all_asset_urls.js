const fs = require('fs');
const readline = require('readline');
const path = require('path');
const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:pgadmin123@localhost:5432/sipena_dev'
});

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
                currentRow.push(currentVal.trim().toUpperCase() === 'NULL' ? null : currentVal.trim());
                currentVal = '';
            } else if (char === ')') {
                currentRow.push(currentVal.trim().toUpperCase() === 'NULL' ? null : currentVal.trim());
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

async function updateAllUrls() {
    console.log('🔄 MENYELARASKAN SEMUA COVER_URL DAN FILE_URL AGAR OTOMATIS AKTIF...');

    const sqlPath = path.resolve(__dirname, '../../migration/epublishing_LIVE_2026.sql');
    const fileStream = fs.createReadStream(sqlPath, { encoding: 'utf8' });
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    const rawCatalogs = [];
    for await (const line of rl) {
        if (line.startsWith('INSERT INTO `catalogs`') || line.startsWith('INSERT INTO catalogs')) {
            const valIdx = line.indexOf('VALUES');
            if (valIdx !== -1) {
                rawCatalogs.push(...parseSqlValues(line.slice(valIdx + 6)));
            }
        }
    }

    console.log(`Ditemukan ${rawCatalogs.length} katalog buku. Mulai update ke database PostgreSQL...`);

    let updated = 0;
    for (const c of rawCatalogs) {
        const oldId = c[0];
        const title = c[1]?.trim();
        const pdfFileRaw = c[19]?.trim();
        if (!title || !oldId) continue;

        // Set default cover_url ke /covers/[oldId].jpg
        const coverUrl = `/covers/${oldId}.jpg`;

        // Set default file_url ke /file pdf buku/[pdfFileRaw atau oldId.pdf]
        let fileUrl = null;
        if (pdfFileRaw && pdfFileRaw !== 'NULL') {
            fileUrl = `/file pdf buku/${pdfFileRaw}`;
        } else {
            fileUrl = `/file pdf buku/${oldId}.pdf`;
        }

        try {
            await pool.query(`
                UPDATE books 
                SET cover_url = $1, file_url = $2
                WHERE title = $3 AND (cover_url IS NULL OR file_url IS NULL)
            `, [coverUrl, fileUrl, title]);
            updated++;
        } catch (e) {
            // ignore
        }
    }

    console.log(`✅ Sukses update ${updated} buku dengan path cover & PDF resmi!`);
    await pool.end();
}

updateAllUrls().catch(console.error);
