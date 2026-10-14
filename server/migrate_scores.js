/**
 * migrate_scores.js
 * 
 * Script ini melakukan 2 hal sekaligus:
 * 1. Update app_settings (Master Data kategori Terbitan) dengan nilai poin yang benar
 * 2. Recalculate dan update score semua tahapan Terbitan yang sudah done/archived
 *    (proyek Mei-Juni yang terlanjur tersimpan 0)
 * 
 * Jalankan dengan: node migrate_scores.js
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ─── Konfigurasi Poin Tahapan Terbitan ───────────────────────────────────────
// score      = poin tetap
// perPageScore = poin per 1 halaman (0 jika pakai poin tetap)
// pageMultiplier = pembagi halaman (default 1)
const TERBITAN_STAGE_SCORES = {
  'kelengkapan naskah':                         { score: 1,   perPageScore: 0,   pageMultiplier: 1 },
  'pembuatan surat penerimaan terbitan':        { score: 1,   perPageScore: 0,   pageMultiplier: 1 },
  'penyuntingan':                               { score: 0,   perPageScore: 1.5, pageMultiplier: 10 },
  'tata letak naskah':                          { score: 0,   perPageScore: 1,   pageMultiplier: 10 },
  'penginputan nomor induk penerbitan':         { score: 1,   perPageScore: 0,   pageMultiplier: 1 },
  'desain sampul':                              { score: 5,   perPageScore: 0,   pageMultiplier: 1 },
  'pembuatan dummy':                            { score: 1,   perPageScore: 0,   pageMultiplier: 1 },
  'kendali kualitas':                           { score: 5,   perPageScore: 0,   pageMultiplier: 1 },
  'penerbitan isbn':                            { score: 3,   perPageScore: 0,   pageMultiplier: 1 },
  'pembuatan dummy final':                      { score: 1,   perPageScore: 0,   pageMultiplier: 1 },
  'unggah ke sipena dan ipusnas':               { score: 1,   perPageScore: 0,   pageMultiplier: 1 },
  'pembuatan surat keterangan terbit':          { score: 1,   perPageScore: 0,   pageMultiplier: 1 },
  'serah terima karya cetak dan rekam':         { score: 1,   perPageScore: 0,   pageMultiplier: 1 },
};

function calcScore(stageLabel, pageCount) {
  const key = stageLabel.trim().toLowerCase();
  const cfg = TERBITAN_STAGE_SCORES[key];
  if (!cfg) return null; // tidak dikenal, skip

  if (cfg.perPageScore > 0 && pageCount > 0) {
    return Math.round((pageCount / cfg.pageMultiplier) * cfg.perPageScore);
  }
  return cfg.score;
}

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ─── STEP 1: Baca app_settings saat ini ────────────────────────────────
    console.log('\n[STEP 1] Membaca Master Data dari app_settings...');
    const settingsRes = await client.query(
      "SELECT value FROM app_settings WHERE key = 'categories'"
    );

    let categoriesMap = settingsRes.rows.length > 0 ? settingsRes.rows[0].value : null;
    if (!categoriesMap) {
      throw new Error('Data app_settings tidak ditemukan! Jalankan server sekali dulu agar data di-seed.');
    }

    // ─── STEP 2: Update skor tahapan Terbitan di Master Data ───────────────
    console.log('[STEP 2] Memperbarui skor tahapan Terbitan di Master Data...');
    const terbitanCat = categoriesMap.terbitan;
    if (!terbitanCat || !Array.isArray(terbitanCat.stages)) {
      throw new Error('Kategori terbitan tidak ditemukan di app_settings!');
    }

    const updatedStages = terbitanCat.stages.map(s => {
      const key = s.label.trim().toLowerCase();
      const cfg = TERBITAN_STAGE_SCORES[key];
      if (!cfg) {
        console.log(`  [SKIP] Tahapan tidak dikenal: "${s.label}"`);
        return s;
      }
      console.log(`  [OK] "${s.label}": score=${cfg.score}, perPageScore=${cfg.perPageScore}, pageMultiplier=${cfg.pageMultiplier}`);
      return {
        ...s,
        score: cfg.score,
        perPageScore: cfg.perPageScore,
        pageMultiplier: cfg.pageMultiplier,
      };
    });

    // Update juga typeStages jika ada (misal: terjemahan)
    const updatedCategoriesMap = {
      ...categoriesMap,
      terbitan: {
        ...terbitanCat,
        stages: updatedStages,
      }
    };

    await client.query(
      "UPDATE app_settings SET value = $1, updated_at = NOW() WHERE key = 'categories'",
      [JSON.stringify(updatedCategoriesMap)]
    );
    console.log('  ✅ Master Data berhasil diperbarui!\n');

    // ─── STEP 3: Recalculate skor semua tahapan Terbitan yang done/archived ─
    console.log('[STEP 3] Recalculate skor tahapan Terbitan yang sudah selesai (done/archived)...');

    const stagesRes = await client.query(`
      SELECT
        s.id,
        s.label,
        s.status,
        s.score AS old_score,
        p.page_count,
        p.id AS project_id,
        p.title AS project_title
      FROM stages s
      JOIN projects p ON p.id = s.project_id
      WHERE p.category = 'terbitan'
        AND (s.status = 'done' OR s.status = 'archived')
      ORDER BY p.id, s."order"
    `);

    console.log(`  Ditemukan ${stagesRes.rows.length} tahapan yang perlu diproses.\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const row of stagesRes.rows) {
      const newScore = calcScore(row.label, row.page_count || 0);

      if (newScore === null) {
        console.log(`  [SKIP] "${row.label}" (project: ${row.project_title}) — label tidak dikenal`);
        skippedCount++;
        continue;
      }

      if (newScore === row.old_score) {
        console.log(`  [UNCHANGED] "${row.label}" (project: ${row.project_title}) — sudah benar: ${newScore} poin`);
        skippedCount++;
        continue;
      }

      await client.query(
        'UPDATE stages SET score = $1 WHERE id = $2',
        [newScore, row.id]
      );
      console.log(`  [UPDATED] "${row.label}" (project: ${row.project_title}) — ${row.old_score} → ${newScore} poin (pageCount: ${row.page_count || 'N/A'})`);
      updatedCount++;
    }

    await client.query('COMMIT');

    console.log('\n══════════════════════════════════════════════════════');
    console.log(`✅ MIGRASI SELESAI!`);
    console.log(`   Tahapan diperbarui  : ${updatedCount}`);
    console.log(`   Tahapan tidak berubah: ${skippedCount}`);
    console.log('══════════════════════════════════════════════════════\n');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ ERROR — transaksi dibatalkan (ROLLBACK):', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
