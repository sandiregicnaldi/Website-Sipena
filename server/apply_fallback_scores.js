const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    // 1. Baca pengaturan dari database (yang baru saja diubah user)
    const settingsRes = await client.query("SELECT value FROM app_settings WHERE key = 'categories'");
    const categoriesMap = settingsRes.rows[0].value;
    const terbitanStages = categoriesMap.terbitan.stages;

    const penyuntinganCfg = terbitanStages.find(s => s.label === 'Penyuntingan');
    const tataLetakCfg = terbitanStages.find(s => s.label === 'Tata Letak Naskah');

    console.log('=== SETTING SAAT INI DI DATABASE ===');
    console.log(`Penyuntingan: Poin Tetap = ${penyuntinganCfg.score} | Per Halaman = ${penyuntinganCfg.perPageScore}`);
    console.log(`Tata Letak: Poin Tetap = ${tataLetakCfg.score} | Per Halaman = ${tataLetakCfg.perPageScore}\n`);

    // 2. Audit dan perbarui skor 0 di proyek Mei & Juni
    const res = await client.query(`
      SELECT
        s.id, s.label, s.status, s.score, p.title, p.page_count, s.approved_at
      FROM stages s
      JOIN projects p ON p.id = s.project_id
      WHERE p.category = 'terbitan'
        AND s.label IN ('Penyuntingan', 'Tata Letak Naskah')
        AND (s.status = 'done' OR s.status = 'archived')
        AND s.score = 0
    `);

    console.log(`=== AUDIT & EKSEKUSI: Ditemukan ${res.rows.length} tahapan dengan skor 0 ===`);
    let updatedCount = 0;

    for (const row of res.rows) {
      let newScore = 0;
      const cfg = row.label === 'Penyuntingan' ? penyuntinganCfg : tataLetakCfg;

      if (cfg.perPageScore > 0 && row.page_count > 0) {
          // Jika ternyata halamannya ada (walau jarang)
          newScore = Math.round((row.page_count / cfg.pageMultiplier) * cfg.perPageScore);
      } else if (cfg.score > 0) {
          // FALLBACK LOGIC: gunakan skor tetap
          newScore = cfg.score;
      }

      console.log(`- Proyek: ${row.title} (${row.approved_at ? new Date(row.approved_at).toLocaleString('id-ID', { month: 'long' }) : 'N/A'})`);
      console.log(`  Tahap: ${row.label} | Halaman: ${row.page_count ?? '0/Kosong'}`);
      
      if (newScore > 0) {
          await client.query('UPDATE stages SET score = $1 WHERE id = $2', [newScore, row.id]);
          console.log(`  ✅ Diperbarui menjadi -> ${newScore} Poin`);
          updatedCount++;
      } else {
          console.log(`  ⚠️ Tetap 0 (Tidak ada poin fallback yang diatur)`);
      }
    }

    console.log(`\nSelesai! Berhasil memperbarui ${updatedCount} tahapan.`);

  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(console.error);
