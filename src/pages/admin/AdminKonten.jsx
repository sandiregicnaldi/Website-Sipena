import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import './AdminLayout.css';

const CONTENT_ITEMS = [
  { icon:'🖼️', title:'Banner / Hero', desc:'Kelola gambar dan teks banner utama halaman beranda.', path:'/admin/konten/banner', color:'#2563eb' },
  { icon:'ℹ️', title:'Tentang Kami',  desc:'Edit konten halaman Tentang Perpusnas Press, visi, misi, dan sejarah.', path:'/admin/konten/tentang', color:'#059669' },
  { icon:'❓', title:'FAQ',           desc:'Tambah, ubah, atau hapus pertanyaan yang sering diajukan pengunjung.', path:'/admin/konten/faq', color:'#d97706' },
];

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

const KontenIndex = () => (
  <div>
    <div className="admin-page-header">
      <h1>🖥️ Konten Web</h1>
      <p>Kelola seluruh konten yang tampil di halaman publik website SiPena.</p>
    </div>
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:'1rem' }}>
      {CONTENT_ITEMS.map(item => (
        <Link to={item.path} key={item.path} style={{ textDecoration:'none' }}>
          <div className="admin-card" style={{
            cursor:'pointer', transition:'all 0.2s',
            borderTop:`3px solid ${item.color}`,
          }}
            onMouseEnter={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow='var(--shadow-md)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=''; }}
          >
            <div style={{ fontSize:'2rem', marginBottom:'0.5rem' }}>{item.icon}</div>
            <div style={{ fontWeight:700, marginBottom:'0.3rem', color:'var(--text-primary)' }}>{item.title}</div>
            <div style={{ fontSize:'0.82rem', color:'var(--text-secondary)' }}>{item.desc}</div>
          </div>
        </Link>
      ))}
    </div>
  </div>
);

const AdminKonten = () => (
  <Routes>
    <Route index element={<KontenIndex />} />
    <Route path="banner"  element={<Stub title="🖼️ Banner / Hero" desc="Kelola banner utama halaman beranda." />} />
    <Route path="tentang" element={<Stub title="ℹ️ Tentang Kami"  desc="Edit halaman Tentang Perpusnas Press." />} />
    <Route path="faq"     element={<Stub title="❓ FAQ"           desc="Kelola daftar pertanyaan yang sering diajukan." />} />
  </Routes>
);

export default AdminKonten;
