/**
 * RESTORE SCRIPT — mengembalikan tahapan terbitan yang salah di-set 'draft' oleh audit_fix_stages.js
 *
 * Aturan alur terbitan yang benar:
 *   - Kelengkapan Naskah          : always (tahap pertama)
 *   - Surat Penerimaan Terbitan   : setelah Kelengkapan Naskah
 *   - Penyuntingan                : setelah Kelengkapan Naskah
 *   - Tata Letak Naskah           : setelah Penyuntingan
 *   - Penginputan NIP             : setelah Kelengkapan Naskah
 *   - Desain Sampul               : setelah Kelengkapan Naskah
 *   - Pembuatan Dummy             : setelah Tata Letak + NIP + Desain Sampul
 *   - Kendali Kualitas            : setelah Pembuatan Dummy (dan semua di atasnya)
 *   - Penerbitan ISBN             : setelah Kendali Kualitas
 *   - Pembuatan Dummy Final       : setelah Penerbitan ISBN
 *   - Unggah ke Sipena            : setelah Pembuatan Dummy Final
 *   - Surat Keterangan Terbit     : setelah Unggah ke Sipena
 *   - Serah Terima Karya          : setelah Surat Keterangan Terbit
 *
 * Untuk proyek NON-terbitan sequential: urutan index tetap berlaku.
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Aturan DAG terbitan — key: label tahapan, value: array label prerequisite
const TERBITAN_PREREQS = {
  'Kelengkapan Naskah':                    [],                             // selalu aktif
  'Pembuatan Surat Penerimaan Terbitan':   ['Kelengkapan Naskah'],
  'Penyuntingan':                          ['Kelengkapan Naskah'],
  'Tata Letak Naskah':                     ['Penyuntingan'],
  'Penginputan Nomor Induk Penerbitan':    ['Kelengkapan Naskah'],
  'Desain Sampul':                         ['Kelengkapan Naskah'],
  'Pembuatan Dummy':                       ['Tata Letak Naskah', 'Penginputan Nomor Induk Penerbitan', 'Desain Sampul'],
  'Kendali Kualitas':                      ['Pembuatan Dummy', 'Kelengkapan Naskah', 'Penyuntingan', 'Tata Letak Naskah', 'Penginputan Nomor Induk Penerbitan', 'Desain Sampul'],
  'Penerbitan ISBN':                       ['Kendali Kualitas'],
  'Pembuatan Dummy Final':                 ['Penerbitan ISBN'],
  'Unggah ke Sipena dan Ipusnas':          ['Pembuatan Dummy Final'],
  'Pembuatan Surat Keterangan Terbit':     ['Unggah ke Sipena dan Ipusnas'],
  'Serah Terima Karya Cetak dan Rekam':   ['Unggah ke Sipena dan Ipusnas'],
};

function isDone(stagesMap, label) {
  const s = stagesMap[label];
  // Jika tahapan tidak ada di proyek (proyek lama), anggap tidak memblokir
  if (!s) return true;
  return s.status === 'done' || s.status === 'archived';
}

function shouldBeActive(stagesMap, label) {
  const prereqs = TERBITAN_PREREQS[label];
  if (!prereqs) return false; // label tidak dikenal
  return prereqs.every(p => isDone(stagesMap, p));
}

async function restoreTerbitanStages(dryRun = true) {
  const client = await pool.connect();
  try {
    console.log(`=== RESTORE TAHAPAN TERBITAN ${dryRun ? '(DRY RUN)' : '(EKSEKUSI)'} ===\n`);

    // Ambil semua proyek terbitan yang masih aktif beserta tahapannya
    const { rows: projects } = await client.query(`
      SELECT p.id, p.title
      FROM projects p
      WHERE p.category = 'terbitan'
        AND p.status NOT IN ('archived', 'done')
        AND p.deleted_at IS NULL
    `);

    const toRestore = []; // stage IDs yang perlu dikembalikan ke 'active'

    for (const proj of projects) {
      const { rows: stages } = await client.query(`
        SELECT id, label, status, "order"
        FROM stages
        WHERE project_id = $1
        ORDER BY "order" ASC
      `, [proj.id]);

      // Buat map label → stage untuk lookup cepat
      const stagesMap = {};
      for (const s of stages) stagesMap[s.label] = s;

      for (const s of stages) {
        // Hanya peduli tahapan yang sekarang statusnya 'draft'
        if (s.status !== 'draft') continue;
        // Jika tahapan ini dikenal dalam aturan terbitan
        if (!(s.label in TERBITAN_PREREQS)) continue;
        // Jika prerequisite-nya sudah selesai, seharusnya tahapan ini 'active'
        if (shouldBeActive(stagesMap, s.label)) {
          toRestore.push({ id: s.id, label: s.label, projectTitle: proj.title });
        }
      }
    }

    if (toRestore.length === 0) {
      console.log('✅ Tidak ada tahapan yang perlu dikembalikan ke active.');
      return;
    }

    console.log(`Ditemukan ${toRestore.length} tahapan yang perlu dikembalikan ke 'active':\n`);
    for (const s of toRestore) {
      console.log(`  [${s.label}] — ${s.projectTitle.substring(0, 60)}`);
    }

    if (dryRun) {
      console.log('\n--- DRY RUN selesai. Jalankan dengan --fix untuk menerapkan. ---');
      return;
    }

    // Eksekusi restore
    const ids = toRestore.map(s => s.id);
    const result = await client.query(
      `UPDATE stages SET status = 'active' WHERE id = ANY($1::uuid[]) AND status = 'draft'`,
      [ids]
    );
    console.log(`\n✅ BERHASIL: ${result.rowCount} tahapan dikembalikan dari 'draft' → 'active'.`);

  } finally {
    client.release();
    await pool.end();
  }
}

const doFix = process.argv.includes('--fix');
restoreTerbitanStages(!doFix).catch(console.error);
