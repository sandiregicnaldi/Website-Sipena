/**
 * fix_all_categories.js
 * 
 * Memperbarui app_settings agar sesuai dengan kondisi terbaru di server Pusdatin:
 * - Keuangan: 2 tipe, 2 tahapan (sesuai screenshot)
 * - Media Sosial: 3 tipe, 4 tahapan dengan poin 3/4/2/1
 * - Terbitan: poin sudah benar (sudah diupdate sebelumnya)
 * 
 * Jalankan: node fix_all_categories.js
 */
const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    const res = await client.query("SELECT value FROM app_settings WHERE key = 'categories'");
    if (!res.rows.length) throw new Error('app_settings tidak ditemukan');

    const cats = JSON.parse(JSON.stringify(res.rows[0].value));

    // ─── KEUANGAN: Update ke kondisi terbaru (sesuai screenshot Pusdatin) ────
    cats.keuangan = {
      ...cats.keuangan,
      label: 'Keuangan',
      types: [
        { id: 'gu-ls', label: 'GU atau LS' },
        { id: 'data-keuangan', label: 'Data Keuangan' },
      ],
      stages: [
        { id: 'verifikasi', label: 'Verifikasi dan Validasi Hasil Kegiatan', order: 1, score: 3, perPageScore: 0, pageMultiplier: 1 },
        { id: 'laporan', label: 'Laporan Kinerja dan Evaluasi Kegiatan',     order: 2, score: 3, perPageScore: 0, pageMultiplier: 1 },
      ],
    };
    console.log('✅ Keuangan: diperbarui (2 tipe, 2 tahapan, poin 3/3)');

    // ─── MEDIA SOSIAL: Update poin sesuai screenshot Pusdatin ────────────────
    cats.medsos = {
      ...cats.medsos,
      label: 'Media Sosial',
      types: [
        { id: 'jumat-baca', label: 'Jumat Baca' },
        { id: 'bagi-buku', label: 'Bagi-Bagi Buku' },
        { id: 'medsos-lainnya', label: 'Lainnya' },
      ],
      stages: [
        { id: 'teks',    label: 'Penyusunan Teks',      order: 1, score: 3, perPageScore: 0, pageMultiplier: 1 },
        { id: 'desain',  label: 'Perancangan Desain',   order: 2, score: 4, perPageScore: 0, pageMultiplier: 1 },
        { id: 'tinjauan',label: 'Tinjauan Konten',      order: 3, score: 2, perPageScore: 0, pageMultiplier: 1 },
        { id: 'unggah',  label: 'Pengunggahan',         order: 4, score: 1, perPageScore: 0, pageMultiplier: 1 },
      ],
    };
    console.log('✅ Media Sosial: diperbarui (3 tipe, 4 tahapan, poin 3/4/2/1)');

    // Simpan ke DB
    await client.query(
      "UPDATE app_settings SET value = $1::jsonb, updated_at = NOW() WHERE key = 'categories'",
      [JSON.stringify(cats)]
    );

    console.log('\n✅ app_settings berhasil diperbarui!\n');

    // Verifikasi
    const v = await client.query("SELECT value FROM app_settings WHERE key = 'categories'");
    const final = v.rows[0].value;

    console.log('=== VERIFIKASI KEUANGAN ===');
    (final.keuangan?.types || []).forEach(t => console.log(`  Tipe: ${t.label}`));
    (final.keuangan?.stages || []).forEach(s => console.log(`  ${s.order}. ${s.label} — ${s.score} poin`));

    console.log('\n=== VERIFIKASI MEDIA SOSIAL ===');
    (final.medsos?.types || []).forEach(t => console.log(`  Tipe: ${t.label}`));
    (final.medsos?.stages || []).forEach(s => console.log(`  ${s.order}. ${s.label} — ${s.score} poin`));

    console.log('\n=== VERIFIKASI TERBITAN (cek poin tetap) ===');
    (final.terbitan?.stages || []).forEach(s => {
      const poin = (s.perPageScore > 0) ? `${s.perPageScore} per ${s.pageMultiplier} hal` : `${s.score} (tetap)`;
      console.log(`  ${s.order}. ${s.label} — ${poin}`);
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
