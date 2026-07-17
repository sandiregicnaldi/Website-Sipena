import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import './AdminLayout.css';

const MOCK_BOOKS = [
  { id: 1, judul: 'Sejarah Perpustakaan Nasional RI',  penulis: 'Dr. Ahmad Fauzi',    kategori: 'Sejarah',   tahun: 2026, isbn: '978-602-xxx-001', status: 'Terbit' },
  { id: 2, judul: 'Pedoman Katalogisasi Perpustakaan', penulis: 'Dra. Siti Rahayu',   kategori: 'Pedoman',   tahun: 2026, isbn: '978-602-xxx-002', status: 'Terbit' },
  { id: 3, judul: 'Literasi Informasi di Era Digital', penulis: 'Prof. Budi Santoso', kategori: 'Teknologi', tahun: 2026, isbn: '978-602-xxx-003', status: 'Proses' },
  { id: 4, judul: 'Naskah Nusantara: Koleksi Pilihan', penulis: 'Drs. Hendra Wijaya', kategori: 'Manuskrip', tahun: 2025, isbn: '978-602-xxx-004', status: 'Review' },
  { id: 5, judul: 'Manajemen Arsip Modern',            penulis: 'Dr. Rina Dewi',      kategori: 'Manajemen', tahun: 2025, isbn: '978-602-xxx-005', status: 'Terbit' },
];

const STATUS_BADGE = { 'Terbit':'badge-green', 'Proses':'badge-amber', 'Review':'badge-blue' };

const DaftarBuku = () => {
  const [search, setSearch] = useState('');
  const filtered = MOCK_BOOKS.filter(b =>
    b.judul.toLowerCase().includes(search.toLowerCase()) ||
    b.penulis.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div>
      <div className="admin-page-header">
        <h1>📚 Katalog Buku</h1>
        <p>Kelola seluruh koleksi buku, pedoman, dan prosiding Perpusnas Press.</p>
      </div>
      <div className="admin-card">
        <div className="admin-card-header">
          <input
            type="text" placeholder="Cari judul atau penulis..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding:'0.45rem 0.75rem', border:'1px solid var(--border-color)',
              borderRadius:'var(--radius-md)', fontSize:'0.875rem', width:'260px',
              background:'var(--bg-primary)', color:'var(--text-primary)' }}
          />
          <button className="btn btn-primary" style={{ padding:'0.45rem 1rem', fontSize:'0.875rem' }}>
            + Tambah Buku
          </button>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>#</th><th>Judul</th><th>Penulis</th><th>Kategori</th><th>Tahun</th><th>ISBN</th><th>Status</th><th>Aksi</th></tr>
            </thead>
            <tbody>
              {filtered.map((b,i) => (
                <tr key={b.id}>
                  <td style={{color:'var(--text-tertiary)'}}>{i+1}</td>
                  <td style={{fontWeight:600}}>{b.judul}</td>
                  <td>{b.penulis}</td>
                  <td><span className="badge badge-gray">{b.kategori}</span></td>
                  <td>{b.tahun}</td>
                  <td style={{fontSize:'0.78rem',color:'var(--text-tertiary)'}}>{b.isbn}</td>
                  <td><span className={`badge ${STATUS_BADGE[b.status]}`}>{b.status}</span></td>
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

const AdminKatalog = () => (
  <Routes>
    <Route index element={<DaftarBuku />} />
    <Route path="tambah" element={<Stub title="➕ Tambah Buku" desc="Form penambahan buku baru ke katalog." />} />
    <Route path="kategori" element={<Stub title="🏷️ Kategori Buku" desc="Kelola kategori / klasifikasi buku." />} />
  </Routes>
);

export default AdminKatalog;
