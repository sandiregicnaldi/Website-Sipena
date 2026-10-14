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
      WHERE s.score > 0 AND s.status IN ('done', 'archived')
      ORDER BY u.name ASC, p.title ASC, s.order ASC;
    `;
    const { rows } = await client.query(query);
    
    // Kita gunakan delimiter titik koma (;) agar Excel di region Indonesia otomatis memisahkan kolomnya
    let csvContent = '\uFEFF'; // BOM untuk UTF-8
    csvContent += 'Personil (PJ);Judul Proyek;Tahapan Kerja;Poin\n';

    for (const row of rows) {
      // Hilangkan karakter newline atau titik koma dari data agar tidak merusak format CSV
      const personil = `"${(row.Personil || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`;
      const proyek = `"${(row.Proyek || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`;
      const tahapan = `"${(row.TahapanKerja || row['Tahapan Kerja'] || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`;
      const poin = row.Poin || 0;
      
      csvContent += `${personil};${proyek};${tahapan};${poin}\n`;
    }

    fs.writeFileSync('/tmp/Laporan_Poin_Pusdatin.csv', csvContent, 'utf8');
    console.log(`Berhasil mengekspor ${rows.length} baris data.`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

exportData();
