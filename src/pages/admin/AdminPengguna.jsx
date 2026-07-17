import React, { useState } from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import './AdminLayout.css';

const MOCK_USERS = {
  penulis: [
    { id:1, nama:'Dr. Ahmad Fauzi',    email:'ahmad@email.com',  instansi:'UI',     bergabung:'2024-03-10', status:'Aktif' },
    { id:2, nama:'Prof. Budi Santoso', email:'budi@email.com',   instansi:'ITB',    bergabung:'2024-05-22', status:'Aktif' },
    { id:3, nama:'Dra. Siti Rahayu',   email:'siti@email.com',   instansi:'UGM',    bergabung:'2025-01-08', status:'Aktif' },
  ],
  'calon-penulis': [
    { id:1, nama:'Agus Pratama',  email:'agus@email.com',  instansi:'UNPAD',  bergabung:'2026-07-15', status:'Menunggu' },
    { id:2, nama:'Dian Kusuma',   email:'dian@email.com',  instansi:'UNDIP',  bergabung:'2026-07-11', status:'Menunggu' },
  ],
  pengunjung: [
    { id:1, nama:'Sari Indah',   email:'sari@email.com',   instansi:'-',     bergabung:'2026-07-14', status:'Aktif' },
    { id:2, nama:'Rizki Fauzan', email:'rizki@email.com',  instansi:'-',     bergabung:'2026-07-10', status:'Aktif' },
  ],
  pegawai: [
    { id:1, nama:'Hendra Wijaya', email:'hendra@perpusnas.id', instansi:'Perpusnas', bergabung:'2023-09-01', status:'Aktif' },
  ],
};

const STATUS_BADGE = { 'Aktif':'badge-green', 'Menunggu':'badge-amber', 'Nonaktif':'badge-red' };

const UserTable = ({ type, title }) => {
  const data = MOCK_USERS[type] || [];
  const [search, setSearch] = useState('');
  const filtered = data.filter(u =>
    u.nama.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div>
      <div className="admin-page-header">
        <h1>👥 {title}</h1>
        <p>Kelola akun {title.toLowerCase()} yang terdaftar di SiPena.</p>
      </div>
      <div className="admin-card">
        <div className="admin-card-header">
          <input
            type="text" placeholder="Cari nama atau email..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding:'0.45rem 0.75rem', border:'1px solid var(--border-color)',
              borderRadius:'var(--radius-md)', fontSize:'0.875rem', width:'260px',
              background:'var(--bg-primary)', color:'var(--text-primary)' }}
          />
          <span style={{fontSize:'0.85rem',color:'var(--text-secondary)'}}>
            Total: <strong>{filtered.length}</strong> pengguna
          </span>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>#</th><th>Nama</th><th>Email</th><th>Instansi</th><th>Bergabung</th><th>Status</th><th>Aksi</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0
                ? <tr><td colSpan="7" style={{textAlign:'center',color:'var(--text-tertiary)',padding:'2rem'}}>Tidak ada data.</td></tr>
                : filtered.map((u,i) => (
                  <tr key={u.id}>
                    <td style={{color:'var(--text-tertiary)'}}>{i+1}</td>
                    <td style={{fontWeight:600}}>{u.nama}</td>
                    <td style={{fontSize:'0.82rem'}}>{u.email}</td>
                    <td>{u.instansi}</td>
                    <td style={{fontSize:'0.78rem',color:'var(--text-tertiary)'}}>
                      {new Date(u.bergabung).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'})}
                    </td>
                    <td><span className={`badge ${STATUS_BADGE[u.status]}`}>{u.status}</span></td>
                    <td>
                      {type === 'calon-penulis' && (
                        <button style={{background:'none',border:'none',color:'#059669',cursor:'pointer',fontSize:'0.8rem',marginRight:'0.5rem'}}>✓ Setujui</button>
                      )}
                      <button style={{background:'none',border:'none',color:'var(--danger)',cursor:'pointer',fontSize:'0.8rem'}}>Nonaktifkan</button>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const AdminPengguna = () => {
  const location = useLocation();
  const tabs = [
    { path: '/admin/pengguna/penulis',       label: 'Penulis' },
    { path: '/admin/pengguna/calon-penulis', label: 'Calon Penulis' },
    { path: '/admin/pengguna/pengunjung',    label: 'Pengunjung' },
    { path: '/admin/pengguna/pegawai',       label: 'Pegawai' },
  ];

  return (
    <div>
      {/* Sub-tab navigation */}
      <div style={{ display:'flex', gap:'0.5rem', marginBottom:'1.25rem', borderBottom:'2px solid var(--border-color)', paddingBottom:'0' }}>
        {tabs.map(t => (
          <NavLink
            key={t.path} to={t.path}
            style={({ isActive }) => ({
              padding:'0.5rem 1.1rem', fontSize:'0.875rem', fontWeight:600,
              borderBottom: isActive ? '2px solid var(--accent-color)' : '2px solid transparent',
              color: isActive ? 'var(--accent-color)' : 'var(--text-secondary)',
              marginBottom:'-2px', transition:'all 0.15s', textDecoration:'none',
            })}
          >{t.label}</NavLink>
        ))}
      </div>
      <Routes>
        <Route path="penulis"       element={<UserTable type="penulis"       title="Penulis" />} />
        <Route path="calon-penulis" element={<UserTable type="calon-penulis" title="Calon Penulis" />} />
        <Route path="pengunjung"    element={<UserTable type="pengunjung"    title="Pengunjung" />} />
        <Route path="pegawai"       element={<UserTable type="pegawai"       title="Pegawai" />} />
        <Route index element={<UserTable type="penulis" title="Penulis" />} />
      </Routes>
    </div>
  );
};

export default AdminPengguna;
