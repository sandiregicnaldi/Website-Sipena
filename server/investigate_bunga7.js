const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function investigate() {
  const client = await pool.connect();
  try {
    // 1. Cari proyek Bunga 7 Rupa Seri 2
    const proj = await client.query(`
      SELECT id, title, status, created_at, updated_at
      FROM projects
      WHERE title ILIKE '%bunga 7 rupa%seri 2%'
         OR title ILIKE '%bunga 7 rupa%2%'
      ORDER BY created_at;
    `);

    console.log('=== PROYEK BUNGA 7 RUPA ===');
    for (const p of proj.rows) {
      console.log(`  ID    : ${p.id}`);
      console.log(`  Judul : ${p.title}`);
      console.log(`  Status: ${p.status}`);
      console.log(`  Dibuat: ${new Date(p.created_at).toLocaleString('id-ID')}`);
      console.log(`  Update: ${new Date(p.updated_at).toLocaleString('id-ID')}`);
      console.log();
    }

    if (proj.rows.length === 0) {
      console.log('Proyek tidak ditemukan. Coba pencarian lebih luas...');
      const proj2 = await client.query(`SELECT id, title, status FROM projects WHERE title ILIKE '%bunga 7%' ORDER BY created_at;`);
      for (const p of proj2.rows) console.log(`  ${p.id} | ${p.title} | ${p.status}`);
      return;
    }

    // 2. Cek semua stage untuk setiap proyek yang ditemukan
    for (const p of proj.rows) {
      console.log(`\n=== STAGES: ${p.title} ===`);
      const stages = await client.query(`
        SELECT
          s.id, s.label, s.status, s.approved_at,
          s.pj_id, u.name AS pj_name,
          s.reviewer_id, r.name AS reviewer_name,
          s.notes
        FROM stages s
        LEFT JOIN "user" u ON u.id = s.pj_id
        LEFT JOIN "user" r ON r.id = s.reviewer_id
        WHERE s.project_id = $1
        ORDER BY s.order;
      `, [p.id]);

      for (const s of stages.rows) {
        const approvedStr = s.approved_at
          ? new Date(s.approved_at).toLocaleString('id-ID')
          : 'NULL';
        console.log(`  [${s.status.padEnd(8)}] ${(s.label||'').substring(0,40).padEnd(40)} | approved_at: ${approvedStr}`);
        console.log(`           PJ: ${s.pj_name||'-'}  | Reviewer: ${s.reviewer_name||'-'}`);

        // Cek notes untuk melihat apakah ada log approval manual
        if (s.notes && Array.isArray(s.notes) && s.notes.length > 0) {
          const lastNote = s.notes[s.notes.length - 1];
          const noteTime = lastNote.time ? new Date(lastNote.time).toLocaleString('id-ID') : '?';
          console.log(`           Note terakhir [${noteTime}]: ${String(lastNote.text||'').substring(0,60)}`);
        }
      }

      // 3. Cek apakah semua approved_at sama persis (bulk set)
      const approvedTimes = stages.rows
        .filter(s => s.approved_at)
        .map(s => new Date(s.approved_at).toISOString().substring(0,19));

      const uniqueTimes = [...new Set(approvedTimes)];
      if (uniqueTimes.length === 1 && stages.rows.filter(s=>s.approved_at).length > 1) {
        console.log(`\n  ⚠ SEMUA approved_at persis sama: ${uniqueTimes[0]}`);
        console.log('  Ini menandakan approved_at di-set BULK/OTOMATIS, bukan manual per tahapan!');
      }
    }

    // 4. Cek log persetujuan: adakah catatan admin approve di 1 Agustus?
    console.log('\n=== CEK NOTES (approval log) UNTUK STAGE BUNGA 7 RUPA SERI 2 ===');
    for (const p of proj.rows) {
      const stages = await client.query(`
        SELECT s.label, s.notes, s.approved_at
        FROM stages s
        WHERE s.project_id = $1
          AND s.status IN ('done', 'archived')
        ORDER BY s.order;
      `, [p.id]);

      for (const s of stages) {
        if (!s.notes || !Array.isArray(s.notes) || s.notes.length === 0) {
          console.log(`  [${s.label}] → Tidak ada notes/log sama sekali`);
          continue;
        }
        const approvalNotes = s.notes.filter(n =>
          (n.text||'').toLowerCase().includes('setuju') ||
          (n.text||'').toLowerCase().includes('approve') ||
          (n.text||'').toLowerCase().includes('done') ||
          (n.text||'').toLowerCase().includes('selesai')
        );
        if (approvalNotes.length > 0) {
          for (const n of approvalNotes) {
            const t = n.time ? new Date(n.time).toLocaleString('id-ID') : '?';
            console.log(`  [${s.label}] [${t}]: ${String(n.text).substring(0, 80)}`);
          }
        } else {
          console.log(`  [${s.label}] → Notes ada tapi tidak ada log approval`);
        }
      }
    }

  } finally {
    client.release();
    await pool.end();
  }
}

investigate().catch(console.error);
