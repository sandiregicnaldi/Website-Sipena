const fs = require('fs');
const path = require('path');
const readline = require('readline');
const crypto = require('crypto');
const { Pool } = require('pg');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

function generateId() {
    return crypto.randomBytes(16).toString('hex');
}

function parseDate(dateStr) {
    if (!dateStr || dateStr === 'NULL' || dateStr === '0000-00-00 00:00:00') {
        return new Date();
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? new Date() : d;
}

function cleanHtml(text) {
    if (!text) return null;
    const cleaned = text
        .replace(/<br\s*[\/]?>/gi, '\n')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .trim();
    return cleaned.length > 0 ? cleaned : null;
}

async function migrateOption2() {
    console.log('===============================================================');
    console.log('🚀 MEMULAI MIGRASI OPSI 2: AKUN MEMBER / PEMBACA KE POSTGRESQL');
    console.log('===============================================================\n');

    const startTime = Date.now();
    const sqlPath = path.resolve(__dirname, '../../migration/epublishing_LIVE_2026.sql');

    if (!fs.existsSync(sqlPath)) {
        throw new Error(`File dump SQL tidak ditemukan di ${sqlPath}`);
    }

    console.log(`⏳ Membaca file dump dari: ${sqlPath}`);
    const fileStream = fs.createReadStream(sqlPath, { encoding: 'utf8' });
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let totalRawRows = 0;
    const memberMap = new Map(); // cleanEmail -> member object

    console.log('⏳ Mem-parsing data tabel `members` & deduplikasi email...');
    for await (const line of rl) {
        if (!line.startsWith('INSERT INTO `members` VALUES ')) continue;

        const valuesStr = line.substring('INSERT INTO `members` VALUES '.length).trim();
        let inString = false;
        let escape = false;
        let currentTuple = [];
        let currentField = '';
        let inTuple = false;

        for (let i = 0; i < valuesStr.length; i++) {
            const char = valuesStr[i];

            if (escape) {
                currentField += char;
                escape = false;
                continue;
            }

            if (char === '\\') {
                escape = true;
                continue;
            }

            if (char === "'" && !inString) {
                inString = true;
                continue;
            }

            if (char === "'" && inString) {
                if (valuesStr[i + 1] === "'") {
                    currentField += "'";
                    i++;
                    continue;
                }
                inString = false;
                continue;
            }

            if (inString) {
                currentField += char;
                continue;
            }

            if (char === '(' && !inTuple) {
                inTuple = true;
                currentTuple = [];
                currentField = '';
                continue;
            }

            if (char === ')' && inTuple) {
                inTuple = false;
                currentTuple.push(currentField.trim() === 'NULL' ? null : currentField);
                currentField = '';
                totalRawRows++;

                // Tuple indices:
                // 0: ID, 1: NIK, 2: Nama, 3: EmailAddress, 4: Password, 5: NoHP
                // 10: AlamatJalan, 16: Deskripsi, 19: NamaPerusahaan, 31: CreateDate, 34: UpdateDate
                const id = currentTuple[0];
                const nama = currentTuple[2];
                const emailRaw = currentTuple[3];
                const password = currentTuple[4];
                const noHp = currentTuple[5];
                const alamat = currentTuple[10];
                const deskripsi = currentTuple[16];
                const perusahaan = currentTuple[19];
                const createDate = currentTuple[31];
                const updateDate = currentTuple[34];

                if (emailRaw && emailRaw.trim()) {
                    const cleanEmail = emailRaw.trim().toLowerCase();
                    const existing = memberMap.get(cleanEmail);

                    // Ambil yang paling baru berdasarkan createDate
                    if (!existing || (createDate && (!existing.createDate || createDate > existing.createDate))) {
                        memberMap.set(cleanEmail, {
                            legacyId: id,
                            name: (nama || '').trim() || cleanEmail.split('@')[0],
                            email: cleanEmail,
                            password: (password || '').trim(),
                            phone: (noHp || '').trim() || null,
                            alamatLengkap: (alamat || '').trim() || null,
                            instansi: (perusahaan || '').trim() || null,
                            bio: cleanHtml(deskripsi),
                            createdAt: parseDate(createDate),
                            updatedAt: parseDate(updateDate || createDate)
                        });
                    }
                }
                continue;
            }

            if (char === ',' && inTuple) {
                currentTuple.push(currentField.trim() === 'NULL' ? null : currentField);
                currentField = '';
                continue;
            }

            currentField += char;
        }
    }

    console.log(`✅ Selesai parsing:`);
    console.log(`   - Total baris mentah tabel members: ${totalRawRows.toLocaleString()}`);
    console.log(`   - Baris duplikat email disaring   : ${(totalRawRows - memberMap.size).toLocaleString()}`);
    console.log(`   - Total akun unik untuk dimigrasi : ${memberMap.size.toLocaleString()}\n`);

    // Batch insert ke PostgreSQL
    const members = Array.from(memberMap.values());
    const BATCH_SIZE = 500;
    let insertedUsers = 0;
    let insertedAccounts = 0;
    let skippedExisting = 0;

    console.log(`💾 Memasukkan ${members.length.toLocaleString()} akun ke PostgreSQL ("user" & "account")...`);

    for (let i = 0; i < members.length; i += BATCH_SIZE) {
        const batch = members.slice(i, i + BATCH_SIZE);
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            for (const m of batch) {
                const userId = generateId();

                // 1. Insert ke tabel "user" (ON CONFLICT DO NOTHING untuk melindungi akun existing)
                const userRes = await client.query(`
                    INSERT INTO "user" (
                        id, name, email, email_verified, role, status,
                        phone, alamat_lengkap, instansi, bio,
                        created_at, updated_at
                    ) VALUES (
                        $1, $2, $3, true, 'pengunjung', 'active',
                        $4, $5, $6, $7,
                        $8, $9
                    )
                    ON CONFLICT (email) DO NOTHING
                    RETURNING id
                `, [
                    userId,
                    m.name,
                    m.email,
                    m.phone,
                    m.alamatLengkap,
                    m.instansi,
                    m.bio,
                    m.createdAt,
                    m.updatedAt
                ]);

                if (userRes.rows.length === 0) {
                    // Email sudah ada di DB sebelumnya
                    skippedExisting++;
                    continue;
                }

                const actualUserId = userRes.rows[0].id;
                insertedUsers++;

                // 2. Insert ke tabel "account" untuk autentikasi kredensial Better-Auth
                const accountId = generateId();
                await client.query(`
                    INSERT INTO "account" (
                        id, account_id, provider_id, user_id, password,
                        created_at, updated_at
                    ) VALUES (
                        $1, $2, 'credential', $3, $4,
                        $5, $6
                    )
                `, [
                    accountId,
                    actualUserId,
                    actualUserId,
                    m.password,
                    m.createdAt,
                    m.updatedAt
                ]);

                insertedAccounts++;
            }

            await client.query('COMMIT');
        } catch (err) {
            await client.query('ROLLBACK');
            client.release();
            throw err;
        } finally {
            client.release();
        }

        const processed = Math.min(i + BATCH_SIZE, members.length);
        const percent = ((processed / members.length) * 100).toFixed(1);
        process.stdout.write(`\r   Progress: ${processed.toLocaleString()} / ${members.length.toLocaleString()} (${percent}%) | User: ${insertedUsers} | Account: ${insertedAccounts}`);
    }

    const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('\n\n===============================================================');
    console.log('🎉 MIGRASI OPSI 2 SELESAI DENGAN SUKSES!');
    console.log('===============================================================');
    console.log(`⏱️ Waktu eksekusi       : ${elapsedSeconds} detik`);
    console.log(`👥 Total User Baru      : ${insertedUsers.toLocaleString()}`);
    console.log(`🔑 Total Akun Kredensial: ${insertedAccounts.toLocaleString()}`);
    console.log(`🛡️ User Sudah Ada/Skip  : ${skippedExisting}`);

    // Quick verification query
    console.log('\n🔍 Memverifikasi data di PostgreSQL...');
    const totalUsers = await pool.query('SELECT COUNT(*) FROM "user"');
    const totalPengunjung = await pool.query(`SELECT COUNT(*) FROM "user" WHERE role = 'pengunjung'`);
    const totalAccounts = await pool.query('SELECT COUNT(*) FROM "account"');

    console.log(`   - Total semua user di DB : ${parseInt(totalUsers.rows[0].count).toLocaleString()}`);
    console.log(`   - Total user pengunjung  : ${parseInt(totalPengunjung.rows[0].count).toLocaleString()}`);
    console.log(`   - Total akun login di DB : ${parseInt(totalAccounts.rows[0].count).toLocaleString()}`);

    await pool.end();
}

migrateOption2().catch(err => {
    console.error('\n❌ Terjadi kesalahan saat migrasi:', err);
    process.exit(1);
});
