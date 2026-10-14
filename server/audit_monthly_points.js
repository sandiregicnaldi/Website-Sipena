/**
 * AUDIT: Pastikan poin tahapan yang disetujui Juli 2026
 * TIDAK terakumulasi di bulan Agustus 2026
 *
 * Kolom stages: id, project_id, label, order, status, pj_id, deadline,
 *               progress, result_link, notes, revision_reason, revision_count,
 *               approved_at, revised_at, score, co_pj_id, reviewer_id, proposal_status
 * Kolom projects: updated_at (digunakan sebagai fallback tanggal)
 */
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function auditMonthlyPoints() {
  const client = await pool.connect();
  try {
    console.log('=== AUDIT POIN BULAN JULI vs AGUSTUS 2026 ===\n');

    // 1. Tahapan dengan approvedAt di Juli — ini yang benar
    const juliApproved = await client.query(`
      SELECT
        s.id,
        s.label,
        s.status,
        s.approved_at,
        p.title AS project_title,
        p.updated_at AS project_updated_at,
        u.name AS pj_name
      FROM stages s
      JOIN projects p ON p.id = s.project_id
      LEFT JOIN "user" u ON u.id = s.pj_id
      WHERE s.status IN ('done', 'archived')
        AND (s.pj_id IS NOT NULL OR s.co_pj_id IS NOT NULL)
        AND s.approved_at IS NOT NULL
        AND s.approved_at >= '2026-07-01 00:00:00'
        AND s.approved_at < '2026-08-01 00:00:00'
      ORDER BY s.approved_at DESC;
    `);

    console.log(`Tahapan dengan approvedAt di JULI: ${juliApproved.rows.length} tahapan`);
    if (juliApproved.rows.length > 0) {
      console.log('\nDaftar tahapan Juli (approvedAt):');
      for (const r of juliApproved.rows) {
        const d = new Date(r.approved_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
        console.log(`  [${d}] ${(r.pj_name||'?').substring(0,22).padEnd(22)} | ${(r.label||'?').substring(0,38).padEnd(38)} | ${(r.project_title||'?').substring(0,35)}`);
      }
    }

    // 2. Tahapan done/archived TANPA approvedAt
    //    → backend fallback ke project.updatedAt
    //    → jika project.updatedAt sudah Agustus, poin salah bulan!
    const noApprovedAt = await client.query(`
      SELECT
        s.id,
        s.label,
        s.status,
        s.approved_at,
        p.title AS project_title,
        p.status AS project_status,
        p.updated_at AS project_updated_at,
        u.name AS pj_name
      FROM stages s
      JOIN projects p ON p.id = s.project_id
      LEFT JOIN "user" u ON u.id = s.pj_id
      WHERE s.status IN ('done', 'archived')
        AND (s.pj_id IS NOT NULL OR s.co_pj_id IS NOT NULL)
        AND s.approved_at IS NULL
      ORDER BY p.updated_at DESC;
    `);

    console.log(`\nTahapan done/archived TANPA approvedAt total: ${noApprovedAt.rows.length}`);
    console.log('(Tahapan ini akan menggunakan project.updatedAt sebagai fallback tanggal poin)\n');

    // 3. Dari yg tanpa approvedAt: mana yang project.updatedAt di Agustus?
    //    Artinya poinnya AKAN dihitung di bulan Agustus oleh backend.
    //    Kita perlu tahu apakah tahapan tersebut seharusnya masuk Juli atau Agustus.
    const fallbackAugust = noApprovedAt.rows.filter(r => {
      const projUpdated = r.project_updated_at ? new Date(r.project_updated_at) : null;
      return projUpdated && projUpdated >= new Date('2026-08-01');
    });

    if (fallbackAugust.length > 0) {
      console.log(`⚠  ${fallbackAugust.length} tahapan TANPA approvedAt dengan project.updatedAt di Agustus:`);
      console.log('   Backend akan menghitung poin tahapan ini di AGUSTUS.\n');
      for (const r of fallbackAugust) {
        const projDate = new Date(r.project_updated_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
        console.log(`  PJ        : ${r.pj_name || '?'}`);
        console.log(`  Label     : ${r.label}`);
        console.log(`  Status    : ${r.status}`);
        console.log(`  Proyek    : ${(r.project_title||'?').substring(0, 60)}`);
        console.log(`  Proj upd  : ${projDate} → poin masuk Agustus`);
        console.log(`  Stage ID  : ${r.id}`);
        console.log();
      }
      console.log('Jalankan dengan --fix untuk mengisi approved_at pada tahapan bermasalah.\n');
    } else {
      console.log('✅ Semua tahapan tanpa approvedAt → project.updatedAt sebelum Agustus. Aman!\n');
    }

    // 4. Cek apakah ada tahapan dengan approvedAt di Agustus yang seharusnya Juli
    //    (misal: admin approve terlambat di Agustus untuk pekerjaan Juli)
    const augApproved = await client.query(`
      SELECT
        s.id, s.label, s.approved_at,
        p.title AS project_title,
        u.name AS pj_name
      FROM stages s
      JOIN projects p ON p.id = s.project_id
      LEFT JOIN "user" u ON u.id = s.pj_id
      WHERE s.status IN ('done', 'archived')
        AND (s.pj_id IS NOT NULL OR s.co_pj_id IS NOT NULL)
        AND s.approved_at IS NOT NULL
        AND s.approved_at >= '2026-08-01 00:00:00'
      ORDER BY s.approved_at ASC;
    `);

    console.log(`Tahapan dengan approvedAt di AGUSTUS: ${augApproved.rows.length} tahapan`);
    if (augApproved.rows.length > 0) {
      for (const r of augApproved.rows) {
        const d = new Date(r.approved_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        console.log(`  [${d}] ${(r.pj_name||'?').substring(0,22).padEnd(22)} | ${(r.label||'?').substring(0,38).padEnd(38)} | ${(r.project_title||'?').substring(0,35)}`);
      }
    }

  } finally {
    client.release();
    await pool.end();
  }
}

async function fixMissingApprovedAt() {
  const pool2 = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool2.connect();
  try {
    console.log('=== FIX: Isi approved_at untuk tahapan tanpa approved_at ===\n');
    console.log('CATATAN: Karena stages tidak punya updated_at,');
    console.log('         kita akan gunakan tanggal HARI INI (saat fix dijalankan).');
    console.log('         Untuk data Juli yang benar, Anda perlu input tanggal manual.\n');

    // Cek dulu berapa yang akan diupdate
    const { rows } = await client.query(`
      SELECT s.id, s.label, p.title AS project_title, u.name AS pj_name
      FROM stages s
      JOIN projects p ON p.id = s.project_id
      LEFT JOIN "user" u ON u.id = s.pj_id
      WHERE s.status IN ('done', 'archived')
        AND (s.pj_id IS NOT NULL OR s.co_pj_id IS NOT NULL)
        AND s.approved_at IS NULL;
    `);

    console.log(`Total tahapan tanpa approved_at: ${rows.length}`);
    for (const r of rows) {
      console.log(`  ${r.pj_name?.padEnd(25)} | ${r.label?.padEnd(40)} | ${r.project_title?.substring(0, 40)}`);
    }

    console.log('\nUntuk perbaikan yang akurat, Anda perlu melihat catatan kapan');
    console.log('tahapan ini selesai dan mengisi approved_at secara manual.\n');
    console.log('Atau jika semua tahapan ini memang selesai di Juli, jalankan:');
    console.log('  node audit_monthly_points.js --fix-july');
  } finally {
    client.release();
    await pool2.end();
  }
}

async function fixAllJuly() {
  const pool2 = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool2.connect();
  try {
    // Set approved_at ke 31 Juli 2026 untuk semua tahapan tanpa approved_at
    // yang project.updatedAt-nya sudah Agustus (artinya mungkin selesai di Juli)
    const result = await client.query(`
      UPDATE stages s
      SET approved_at = '2026-07-31 23:59:00+07'
      FROM projects p
      WHERE s.project_id = p.id
        AND s.status IN ('done', 'archived')
        AND (s.pj_id IS NOT NULL OR s.co_pj_id IS NOT NULL)
        AND s.approved_at IS NULL
        AND p.updated_at >= '2026-08-01'
      RETURNING s.id, s.label;
    `);
    console.log(`✅ FIXED: ${result.rowCount} tahapan diisi approved_at = 31 Juli 2026`);
    for (const r of result.rows) {
      console.log(`  ${r.label}`);
    }
  } finally {
    client.release();
    await pool2.end();
  }
}

if (process.argv.includes('--fix')) {
  fixMissingApprovedAt().catch(console.error);
} else if (process.argv.includes('--fix-july')) {
  fixAllJuly().catch(console.error);
} else {
  auditMonthlyPoints().catch(console.error);
}
