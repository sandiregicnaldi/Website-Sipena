const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function exportData() {
  const client = await pool.connect();
  try {
    const query = `
      SELECT 
        u.name AS "Personil",
        p.title AS "Proyek",
        s.label AS "Tahapan Kerja",
        s.score AS "Poin"
      FROM stages s
      JOIN projects p ON p.id = s.project_id
      JOIN "user" u ON u.id = s.pj_id
      WHERE s.score > 0
      ORDER BY u.name ASC, p.title ASC, s.order ASC;
    `;
    const { rows } = await client.query(query);
    
    if (rows.length === 0) {
      console.log('Tidak ada data poin yang ditemukan.');
      return;
    }

    // Buat header CSV
    let csvContent = '\uFEFF'; // BOM untuk Excel agar mengenali UTF-8
    csvContent += '"Nama Personil","Judul Proyek","Tahapan Kerja","Poin"\n';

    let totalPoin = 0;
    for (const row of rows) {
      totalPoin += Number(row.Poin);
      const personil = `"${(row.Personil || '').replace(/"/g, '""')}"`;
      const proyek = `"${(row.Proyek || '').replace(/"/g, '""')}"`;
      const tahapan = `"${(row.TahapanKerja || row['Tahapan Kerja'] || '').replace(/"/g, '""')}"`;
      const poin = `"${row.Poin || 0}"`;
      csvContent += `${personil},${proyek},${tahapan},${poin}\n`;
    }

    // Tulis ke file
    const filePath = '../Laporan_Poin_Personil.csv';
    fs.writeFileSync(filePath, csvContent, 'utf8');
    console.log(`Berhasil mengekspor ${rows.length} baris data ke ${filePath}`);
    console.log(`Total keseluruhan poin: ${totalPoin}`);
  } catch (error) {
    console.error('Error mengekspor data:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

exportData();
