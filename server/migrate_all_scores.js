/**
 * migrate_all_scores.js
 * 
 * Memastikan SEMUA kategori proyek (Terbitan, Medsos, Keuangan, dll)
 * tersimpan dengan nilai poin yang benar di database app_settings.
 * 
 * Jalankan di server Pusdatin dengan: node migrate_all_scores.js
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ─── KONFIGURASI LENGKAP SEMUA KATEGORI ──────────────────────────────────────
// score        = poin tetap
// perPageScore = poin per N halaman (0 jika pakai poin tetap)
// pageMultiplier = N (pembagi halaman, default 10)

const SCORES_BY_LABEL = {
  // ── TERBITAN ──────────────────────────────────────────────────────────────
  'Kelengkapan Naskah':                         { score: 1,   perPageScore: 0,   pageMultiplier: 1  },
  'Pembuatan Surat Penerimaan Terbitan':        { score: 1,   perPageScore: 0,   pageMultiplier: 1  },
  'Penyuntingan':                               { score: 0,   perPageScore: 1.5, pageMultiplier: 10 },
  'Tata Letak Naskah':                          { score: 0,   perPageScore: 1,   pageMultiplier: 10 },
  'Penginputan Nomor Induk Penerbitan':         { score: 1,   perPageScore: 0,   pageMultiplier: 1  },
  'Desain Sampul':                              { score: 5,   perPageScore: 0,   pageMultiplier: 1  },
  'Pembuatan Dummy':                            { score: 1,   perPageScore: 0,   pageMultiplier: 1  },
  'Kendali Kualitas':                           { score: 5,   perPageScore: 0,   pageMultiplier: 1  },
  'Penerbitan ISBN':                            { score: 3,   perPageScore: 0,   pageMultiplier: 1  },
  'Pembuatan Dummy Final':                      { score: 1,   perPageScore: 0,   pageMultiplier: 1  },
  'Unggah ke Sipena dan Ipusnas':               { score: 1,   perPageScore: 0,   pageMultiplier: 1  },
  'Pembuatan Surat Keterangan Terbit':          { score: 1,   perPageScore: 0,   pageMultiplier: 1  },
  'Serah Terima Karya Cetak dan Rekam':         { score: 1,   perPageScore: 0,   pageMultiplier: 1  },
  // Terjemahan (typeStages)
  'Terjemahkan':                                { score: 0,   perPageScore: 1,   pageMultiplier: 10 },
  'Penyuntingan Naskah Terjemahan':             { score: 0,   perPageScore: 1,   pageMultiplier: 10 },

  // ── MEDSOS ────────────────────────────────────────────────────────────────
  // Poin medsos biasanya 0 (fleksibel, admin yang menentukan saat klaim)
  // Tapi struktur tetap disimpan agar frontend membacanya konsisten
  
  // ── KEUANGAN ──────────────────────────────────────────────────────────────
  // Poin keuangan biasanya 0 (fleksibel)
};

function calcScore(label, pageCount) {
  const cfg = SCORES_BY_LABEL[label?.trim()];
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

    // ─── STEP 1: Baca & update app_settings untuk semua kategori ────────────
    console.log('\n[STEP 1] Membaca Master Data dari app_settings...');
    const settingsRes = await client.query(
      "SELECT value FROM app_settings WHERE key = 'categories'"
    );

    if (settingsRes.rows.length === 0) {
      throw new Error('Data app_settings tidak ditemukan! Jalankan server sekali dulu agar data di-seed.');
    }

    let categoriesMap = settingsRes.rows[0].value;
    let mapsUpdated = 0;

    // Patch semua stage di semua kategori
    for (const catKey of Object.keys(categoriesMap)) {
      const cat = categoriesMap[catKey];
      let catChanged = false;

      // Patch stages utama
      if (Array.isArray(cat.stages)) {
        cat.stages = cat.stages.map(s => {
          const cfg = SCORES_BY_LABEL[s.label?.trim()];
          if (cfg) {
            catChanged = true;
            return { ...s, score: cfg.score, perPageScore: cfg.perPageScore ?? 0, pageMultiplier: cfg.pageMultiplier ?? 1 };
          }
          return s;
        });
      }

      // Patch typeStages (misal: terjemahan dalam terbitan)
      if (cat.typeStages && typeof cat.typeStages === 'object') {
        for (const typeKey of Object.keys(cat.typeStages)) {
          if (Array.isArray(cat.typeStages[typeKey])) {
            cat.typeStages[typeKey] = cat.typeStages[typeKey].map(s => {
              const cfg = SCORES_BY_LABEL[s.label?.trim()];
              if (cfg) {
                catChanged = true;
                return { ...s, score: cfg.score, perPageScore: cfg.perPageScore ?? 0, pageMultiplier: cfg.pageMultiplier ?? 1 };
              }
              return s;
            });
          }
        }
      }

      if (catChanged) {
        console.log(`  [OK] Kategori "${cat.label || catKey}" — poin tahapan diperbarui`);
        categoriesMap[catKey] = cat;
        mapsUpdated++;
      } else {
        console.log(`  [--] Kategori "${cat.label || catKey}" — tidak ada perubahan poin`);
      }
    }

    await client.query(
      "UPDATE app_settings SET value = $1, updated_at = NOW() WHERE key = 'categories'",
      [JSON.stringify(categoriesMap)]
    );
    console.log(`\n  ✅ Master Data (app_settings) diperbarui: ${mapsUpdated} kategori berubah\n`);

    // ─── STEP 2: Recalculate skor semua tahapan yang done/archived ───────────
    console.log('[STEP 2] Recalculate skor semua tahapan yang sudah selesai...');

    const stagesRes = await client.query(`
      SELECT
        s.id,
        s.label,
        s.status,
        s.score AS old_score,
        p.page_count,
        p.id AS project_id,
        p.title AS project_title,
        p.category
      FROM stages s
      JOIN projects p ON p.id = s.project_id
      WHERE (s.status = 'done' OR s.status = 'archived')
      ORDER BY p.category, p.id, s."order"
    `);

    console.log(`  Ditemukan ${stagesRes.rows.length} tahapan untuk diproses.\n`);

    let updatedCount = 0;
    let skippedCount = 0;
    let unknownCount = 0;

    for (const row of stagesRes.rows) {
      const newScore = calcScore(row.label, row.page_count || 0);

      if (newScore === null) {
        // Label tidak dikenal di SCORES_BY_LABEL — biarkan (kategori fleksibel)
        unknownCount++;
        continue;
      }

      if (newScore === Number(row.old_score)) {
        skippedCount++;
        continue;
      }

      await client.query(
        'UPDATE stages SET score = $1 WHERE id = $2',
        [newScore, row.id]
      );
      console.log(`  [UPDATE] [${row.category}] "${row.label}" (${row.project_title}) — ${row.old_score} → ${newScore} poin${row.page_count ? ` (${row.page_count} hal)` : ''}`);
      updatedCount++;
    }

    await client.query('COMMIT');

    console.log('\n══════════════════════════════════════════════════════════');
    console.log('✅ MIGRASI LENGKAP SELESAI!');
    console.log(`   Tahapan diperbarui             : ${updatedCount}`);
    console.log(`   Tahapan tidak berubah           : ${skippedCount}`);
    console.log(`   Tahapan fleksibel (skip/manual) : ${unknownCount}`);
    console.log('══════════════════════════════════════════════════════════\n');

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
