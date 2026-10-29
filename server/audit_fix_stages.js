const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Aturan DAG terbitan — key: label, value: label-label prerequisite
const TERBITAN_PREREQS = {
  'Kelengkapan Naskah':                   [],
  'Pembuatan Surat Penerimaan Terbitan':  ['Kelengkapan Naskah'],
  'Penyuntingan':                         ['Kelengkapan Naskah'],
  'Tata Letak Naskah':                    ['Penyuntingan'],
  'Penginputan Nomor Induk Penerbitan':   ['Kelengkapan Naskah'],
  'Desain Sampul':                        ['Kelengkapan Naskah'],
  'Pembuatan Dummy':                      ['Tata Letak Naskah', 'Penginputan Nomor Induk Penerbitan', 'Desain Sampul'],
  'Kendali Kualitas':                     ['Pembuatan Dummy', 'Kelengkapan Naskah', 'Penyuntingan', 'Tata Letak Naskah', 'Penginputan Nomor Induk Penerbitan', 'Desain Sampul'],
  'Penerbitan ISBN':                      ['Kendali Kualitas'],
  'Pembuatan Dummy Final':                ['Penerbitan ISBN'],
  'Unggah ke Sipena dan Ipusnas':         ['Pembuatan Dummy Final'],
  'Pembuatan Surat Keterangan Terbit':    ['Unggah ke Sipena dan Ipusnas'],
  'Serah Terima Karya Cetak dan Rekam':  ['Unggah ke Sipena dan Ipusnas'],
};

function isDoneTerbitan(stagesMap, label) {
  const s = stagesMap[label];
  if (!s) return true; // tahapan tidak ada di proyek (proyek lama) → tidak memblokir
  return s.status === 'done' || s.status === 'archived';
}

function prereqsDoneForTerbitan(stagesMap, label) {
  const prereqs = TERBITAN_PREREQS[label];
  if (!prereqs) return true; // label tidak dikenal → tidak diblokir
  return prereqs.every(p => isDoneTerbitan(stagesMap, p));
}

async function auditAndFix() {
  const client = await pool.connect();
  try {
    console.log('=== AUDIT TAHAPAN AKTIF YANG SEBENARNYA HARUS DRAFT ===\n');

    // Ambil semua proyek non-parallel yang masih berjalan beserta kategorinya
    const { rows: allProjStages } = await client.query(`
      SELECT s.id, s.status, s."order", s.label, s.project_id, p.category
      FROM stages s
      JOIN projects p ON p.id = s.project_id
      WHERE p.status NOT IN ('archived','done')
        AND p.deleted_at IS NULL
        AND (p.workflow_type IS NULL OR p.workflow_type != 'parallel')
      ORDER BY s.project_id, s."order"
    `);

    // Ambil juga judul proyek
    const { rows: projRows } = await client.query(`
      SELECT id, title FROM projects
      WHERE status NOT IN ('archived','done') AND deleted_at IS NULL
    `);
    const projTitleMap = {};
    for (const p of projRows) projTitleMap[p.id] = p.title;

    // Kelompokkan per proyek
    const byProj = {};
    for (const r of allProjStages) {
      if (!byProj[r.project_id]) byProj[r.project_id] = { category: r.category, stages: [] };
      byProj[r.project_id].stages.push(r);
    }

    const problematicStages = [];

    for (const [pid, proj] of Object.entries(byProj)) {
      const stagesArr = proj.stages;
      const isTerbitan = proj.category === 'terbitan';

      if (isTerbitan) {
        // Gunakan aturan DAG terbitan
        const stagesMap = {};
        for (const s of stagesArr) stagesMap[s.label] = s;

        for (const stage of stagesArr) {
          if (stage.status !== 'active') continue;
          const prereqs = TERBITAN_PREREQS[stage.label];
          if (prereqs === undefined) continue; // label tidak dikenal dalam DAG
          const allPrereqsDone = prereqs.every(p => isDoneTerbitan(stagesMap, p));
          if (!allPrereqsDone) {
            const notDone = prereqs.filter(p => !isDoneTerbitan(stagesMap, p));
            problematicStages.push({
              projectId: pid,
              projectTitle: projTitleMap[pid] || pid,
              stageId: stage.id,
              stageLabel: stage.label,
              stageOrder: stage.order,
              notDonePrev: notDone.map(p => `${p} (${stagesMap[p]?.status || 'tidak ada'})`).join(', ')
            });
          }
        }
      } else {
        // Non-terbitan: urutan index ketat (semua sebelumnya harus done/archived)
        for (const stage of stagesArr) {
          if (stage.status !== 'active') continue;
          const prev = stagesArr.filter(x => x.order < stage.order);
          const allDone = prev.every(x => x.status === 'done' || x.status === 'archived');
          if (!allDone) {
            const notDone = prev.filter(x => x.status !== 'done' && x.status !== 'archived');
            problematicStages.push({
              projectId: pid,
              projectTitle: projTitleMap[pid] || pid,
              stageId: stage.id,
              stageLabel: stage.label,
              stageOrder: stage.order,
              notDonePrev: notDone.map(s => `[${s.order}] ${s.label} (${s.status})`).join(', ')
            });
          }
        }
      }
    }

    if (problematicStages.length === 0) {
      console.log('✅ Tidak ada tahapan bermasalah! Semua tahapan aktif sudah sesuai.');
      return;
    }

    console.log(`⚠  Ditemukan ${problematicStages.length} tahapan "active" yang seharusnya "draft":\n`);
    for (const s of problematicStages) {
      console.log(`  Proyek : ${s.projectTitle.substring(0, 60)}`);
      console.log(`  Tahapan: [${s.stageOrder}] ${s.stageLabel}`);
      console.log(`  Karena : ${s.notDonePrev}`);
      console.log();
    }

    // Tanya konfirmasi (dry run dulu)
    const stageIds = problematicStages.map(s => s.stageId);
    console.log(`\n--- DRY RUN: ${stageIds.length} tahapan akan diubah ke 'draft' ---`);
    console.log('IDs:', stageIds.join(', '));

    // Uncomment baris di bawah untuk BENAR-BENAR mengeksekusi perbaikan
    /*
    const result = await client.query(
      `UPDATE stages SET status = 'draft' WHERE id = ANY($1::text[]) AND status = 'active'`,
      [stageIds]
    );
    console.log(`\n✅ Berhasil mengubah ${result.rowCount} tahapan dari 'active' ke 'draft'.`);
    */

    console.log('\nJalankan dengan flag --fix untuk menerapkan perubahan.');

  } finally {
    client.release();
    await pool.end();
  }
}

const shouldFix = process.argv.includes('--fix');

if (shouldFix) {
  // Re-run dengan eksekusi fix
  const { Pool: Pool2 } = require('pg');
  require('dotenv').config();
  const pool2 = new Pool2({ connectionString: process.env.DATABASE_URL });
  
  pool2.connect().then(async (client) => {
    try {
      // Ambil semua proyek sequential yang masih berjalan
      const allProjStages = await client.query(`
        SELECT s.id, s.status, s."order", s.project_id
        FROM stages s
        JOIN projects p ON p.id = s.project_id
        WHERE p.status NOT IN ('archived','done')
          AND p.deleted_at IS NULL
          AND (p.workflow_type IS NULL OR p.workflow_type != 'parallel')
        ORDER BY s.project_id, s."order"
      `);

      const byProj = {};
      for (const r of allProjStages.rows) {
        if (!byProj[r.project_id]) byProj[r.project_id] = [];
        byProj[r.project_id].push(r);
      }

      const toFix = [];
      for (const [pid, stgs] of Object.entries(byProj)) {
        for (const s of stgs) {
          if (s.status !== 'active') continue;
          const prev = stgs.filter(x => x.order < s.order);
          const allDone = prev.every(x => x.status === 'done' || x.status === 'archived');
          if (!allDone) toFix.push(s.id);
        }
      }

      if (toFix.length === 0) {
        console.log('✅ Tidak ada yang perlu diperbaiki.');
      } else {
        const result = await client.query(
          `UPDATE stages SET status = 'draft' WHERE id = ANY($1::uuid[]) AND status = 'active'`,
          [toFix]
        );
        console.log(`✅ FIXED: ${result.rowCount} tahapan diubah dari 'active' → 'draft'.`);
      }
    } finally {
      client.release();
      await pool2.end();
    }
  });
} else {
  auditAndFix().catch(console.error);
}
