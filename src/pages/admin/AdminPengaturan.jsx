import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './AdminLayout.css';

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

const ProfilAdmin = () => {
  const { user } = useAuth();
  const [form, setForm] = useState({
    nama: user?.username || '',
    email: user?.email || '',
    jabatan: 'Administrator',
    instansi: 'Perpustakaan Nasional RI',
  });

  return (
    <div>
      <div className="admin-page-header">
        <h1>⚙️ Profil Admin</h1>
        <p>Kelola informasi profil dan keamanan akun administrator.</p>
      </div>
      <div className="admin-grid-2">
        <div className="admin-card">
          <div className="admin-card-header"><span className="admin-card-title">Informasi Akun</span></div>
          <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
            {[
              { label:'Nama Lengkap', key:'nama' },
              { label:'Email', key:'email' },
              { label:'Jabatan', key:'jabatan' },
              { label:'Instansi', key:'instansi' },
            ].map(f => (
              <div key={f.key}>
                <label style={{ display:'block', fontSize:'0.8rem', fontWeight:600, color:'var(--text-secondary)', marginBottom:'0.3rem' }}>{f.label}</label>
                <input
                  type="text"
                  value={form[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  style={{ width:'100%', padding:'0.55rem 0.75rem', border:'1px solid var(--border-color)',
                    borderRadius:'var(--radius-md)', fontSize:'0.875rem',
                    background:'var(--bg-primary)', color:'var(--text-primary)' }}
                />
              </div>
            ))}
            <button className="btn btn-primary" style={{ alignSelf:'flex-start', padding:'0.55rem 1.25rem', fontSize:'0.875rem' }}>
              Simpan Perubahan
            </button>
          </div>
        </div>
        <div className="admin-card">
          <div className="admin-card-header"><span className="admin-card-title">Ubah Kata Sandi</span></div>
          <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
            {['Kata Sandi Saat Ini','Kata Sandi Baru','Konfirmasi Kata Sandi Baru'].map((l,i) => (
              <div key={i}>
                <label style={{ display:'block', fontSize:'0.8rem', fontWeight:600, color:'var(--text-secondary)', marginBottom:'0.3rem' }}>{l}</label>
                <input
                  type="password"
                  style={{ width:'100%', padding:'0.55rem 0.75rem', border:'1px solid var(--border-color)',
                    borderRadius:'var(--radius-md)', fontSize:'0.875rem',
                    background:'var(--bg-primary)', color:'var(--text-primary)' }}
                />
              </div>
            ))}
            <button className="btn btn-primary" style={{ alignSelf:'flex-start', padding:'0.55rem 1.25rem', fontSize:'0.875rem' }}>
              Ubah Kata Sandi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const AdminPengaturan = () => (
  <Routes>
    <Route index element={<ProfilAdmin />} />
    <Route path="profil"  element={<ProfilAdmin />} />
    <Route path="sistem"  element={<Stub title="🔧 Pengguna Sistem" desc="Kelola akun admin dan hak akses pengguna sistem." />} />
  </Routes>
);

export default AdminPengaturan;
