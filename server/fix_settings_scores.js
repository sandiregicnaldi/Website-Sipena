/**
 * fix_settings_scores.js
 * Directly patches app_settings dengan nilai poin yang benar untuk semua tahapan Terbitan.
 */
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    // Baca data saat ini
    const res = await client.query("SELECT value FROM app_settings WHERE key = 'categories'");
    if (res.rows.length === 0) throw new Error('app_settings tidak ditemukan');

    // Deep clone
    const cats = JSON.parse(JSON.stringify(res.rows[0].value));

    // Poin yang benar per label
    const SCORES = {
      'Kelengkapan Naskah':                  { score: 1,   perPageScore: 0,   pageMultiplier: 1  },
      'Pembuatan Surat Penerimaan Terbitan': { score: 1,   perPageScore: 0,   pageMultiplier: 1  },
      'Penyuntingan':                        { score: 0,   perPageScore: 1.5, pageMultiplier: 10 },
      'Tata Letak Naskah':                   { score: 0,   perPageScore: 1,   pageMultiplier: 10 },
      'Penginputan Nomor Induk Penerbitan':  { score: 1,   perPageScore: 0,   pageMultiplier: 1  },
      'Desain Sampul':                       { score: 5,   perPageScore: 0,   pageMultiplier: 1  },
      'Pembuatan Dummy':                     { score: 1,   perPageScore: 0,   pageMultiplier: 1  },
      'Kendali Kualitas':                    { score: 5,   perPageScore: 0,   pageMultiplier: 1  },
      'Penerbitan ISBN':                     { score: 3,   perPageScore: 0,   pageMultiplier: 1  },
      'Pembuatan Dummy Final':               { score: 1,   perPageScore: 0,   pageMultiplier: 1  },
      'Unggah ke Sipena dan Ipusnas':        { score: 1,   perPageScore: 0,   pageMultiplier: 1  },
      'Pembuatan Surat Keterangan Terbit':   { score: 1,   perPageScore: 0,   pageMultiplier: 1  },
      'Serah Terima Karya Cetak dan Rekam':  { score: 1,   perPageScore: 0,   pageMultiplier: 1  },
      // Terjemahan typeStages
      'Terjemahkan':                         { score: 0,   perPageScore: 1,   pageMultiplier: 10 },
      'Penyuntingan Naskah Terjemahan':      { score: 0,   perPageScore: 1,   pageMultiplier: 10 },
    };

    // Patch terbitan.stages
    if (cats.terbitan?.stages) {
      cats.terbitan.stages = cats.terbitan.stages.map(s => {
        const cfg = SCORES[s.label?.trim()];
        if (!cfg) { console.log(`  [SKIP] "${s.label}" — tidak ada konfigurasi`); return s; }
        console.log(`  [OK] "${s.label}": score=${cfg.score}, perPageScore=${cfg.perPageScore}, pageMultiplier=${cfg.pageMultiplier}`);
        return { ...s, score: cfg.score, perPageScore: cfg.perPageScore, pageMultiplier: cfg.pageMultiplier };
      });
    }

    // Patch terbitan.typeStages.terjemahan
    if (cats.terbitan?.typeStages?.terjemahan) {
      cats.terbitan.typeStages.terjemahan = cats.terbitan.typeStages.terjemahan.map(s => {
        const cfg = SCORES[s.label?.trim()];
        if (!cfg) return s;
        console.log(`  [OK typeStage] "${s.label}": score=${cfg.score}, perPageScore=${cfg.perPageScore}, pageMultiplier=${cfg.pageMultiplier}`);
        return { ...s, score: cfg.score, perPageScore: cfg.perPageScore, pageMultiplier: cfg.pageMultiplier };
      });
    }

    // Simpan kembali ke database
    await client.query(
      "UPDATE app_settings SET value = $1::jsonb, updated_at = NOW() WHERE key = 'categories'",
      [JSON.stringify(cats)]
    );

    console.log('\n✅ app_settings berhasil diperbarui!\n');

    // Verifikasi langsung
    const verify = await client.query("SELECT value->'terbitan'->'stages' AS stages FROM app_settings WHERE key = 'categories'");
    const stages = verify.rows[0].stages;
    console.log('=== VERIFIKASI — Terbitan stages di DB setelah update ===');
    stages.forEach(s => {
      console.log(`  ${s.label}: score=${s.score}, perPageScore=${s.perPageScore ?? 'N/A'}, pageMultiplier=${s.pageMultiplier ?? 'N/A'}`);
    });

  } catch (err) {
    console.error('❌ ERROR:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
