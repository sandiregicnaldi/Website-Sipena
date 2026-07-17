import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import './AdminLayout.css';

const MOCK_EVENTS = [
  { id:1, judul:'Seminar Literasi Digital 2026',        tanggal:'2026-08-10', lokasi:'Aula Perpusnas, Jakarta', status:'Akan Datang', peserta: 120 },
  { id:2, judul:'Workshop Penulisan Ilmiah',             tanggal:'2026-07-20', lokasi:'Online (Zoom)',           status:'Segera',      peserta: 85  },
  { id:3, judul:'Peluncuran Buku Koleksi Nusantara',     tanggal:'2026-06-15', lokasi:'Auditorium Lt.2',         status:'Selesai',     peserta: 200 },
  { id:4, judul:'Pelatihan Katalogisasi untuk Pustakawan',tanggal:'2026-05-28',lokasi:'Ruang Pelatihan B',      status:'Selesai',     peserta: 40  },
];

const STATUS_BADGE = { 'Akan Datang':'badge-blue', 'Segera':'badge-amber', 'Selesai':'badge-green' };

const DaftarKegiatan = () => {
  const [search, setSearch] = useState('');
  const filtered = MOCK_EVENTS.filter(e => e.judul.toLowerCase().includes(search.toLowerCase()));
  return (
    <div>
      <div className="admin-page-header">
        <h1>📅 Kegiatan</h1>
        <p>Kelola seminar, workshop, dan peluncuran buku Perpusnas Press.</p>
      </div>
      <div className="admin-card">
        <div className="admin-card-header">
          <input
            type="text" placeholder="Cari kegiatan..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding:'0.45rem 0.75rem', border:'1px solid var(--border-color)',
              borderRadius:'var(--radius-md)', fontSize:'0.875rem', width:'260px',
              background:'var(--bg-primary)', color:'var(--text-primary)' }}
          />
          <button className="btn btn-primary" style={{ padding:'0.45rem 1rem', fontSize:'0.875rem' }}>
            + Tambah Kegiatan
          </button>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>#</th><th>Judul Kegiatan</th><th>Tanggal</th><th>Lokasi</th><th>Peserta</th><th>Status</th><th>Aksi</th></tr>
            </thead>
            <tbody>
              {filtered.map((e,i) => (
                <tr key={e.id}>
                  <td style={{color:'var(--text-tertiary)'}}>{i+1}</td>
                  <td style={{fontWeight:600}}>{e.judul}</td>
                  <td style={{fontSize:'0.82rem'}}>{new Date(e.tanggal).toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'})}</td>
                  <td style={{fontSize:'0.82rem',color:'var(--text-secondary)'}}>{e.lokasi}</td>
                  <td style={{textAlign:'center'}}>{e.peserta}</td>
                  <td><span className={`badge ${STATUS_BADGE[e.status]}`}>{e.status}</span></td>
                  <td>
                    <button style={{background:'none',border:'none',color:'var(--accent-color)',cursor:'pointer',fontSize:'0.8rem',marginRight:'0.5rem'}}>Edit</button>
                    <button style={{background:'none',border:'none',color:'var(--danger)',cursor:'pointer',fontSize:'0.8rem'}}>Hapus</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const Stub = ({ title, desc }) => (
  <div>
    <div className="admin-page-header"><h1>{title}</h1><p>{desc}</p></div>
    <div className="admin-card admin-stub">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--accent-color)" strokeWidth="1.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
      <h2>Halaman ini sedang dikembangkan</h2>
      <p>Fitur ini akan segera tersedia.</p>
    </div>
  </div>
);

const AdminKegiatan = () => (
  <Routes>
    <Route index element={<DaftarKegiatan />} />
    <Route path="tambah" element={<Stub title="➕ Tambah Kegiatan" desc="Form penambahan kegiatan baru." />} />
  </Routes>
);

export default AdminKegiatan;
