import React, { useState } from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import './AdminLayout.css';

const INITIAL_USERS = {
  penulis: [
    { id: 1, nama: 'Dr. Ahmad Fauzi',    email: 'ahmad@email.com',  instansi: 'UI',        bergabung: '2024-03-10', status: 'Aktif' },
    { id: 2, nama: 'Prof. Budi Santoso', email: 'budi@email.com',   instansi: 'ITB',       bergabung: '2024-05-22', status: 'Aktif' },
    { id: 3, nama: 'Dra. Siti Rahayu',   email: 'siti@email.com',   instansi: 'UGM',       bergabung: '2025-01-08', status: 'Aktif' },
  ],
  'calon-penulis': [
    { id: 1, nama: 'Agus Pratama',  email: 'agus@email.com',  instansi: 'UNPAD', bergabung: '2026-07-15', status: 'Menunggu' },
    { id: 2, nama: 'Dian Kusuma',   email: 'dian@email.com',  instansi: 'UNDIP', bergabung: '2026-07-11', status: 'Menunggu' },
  ],
  pengunjung: [
    { id: 1, nama: 'Sari Indah',   email: 'sari@email.com',   instansi: '-', bergabung: '2026-07-14', status: 'Aktif' },
    { id: 2, nama: 'Rizki Fauzan', email: 'rizki@email.com',  instansi: '-', bergabung: '2026-07-10', status: 'Aktif' },
  ],
  pegawai: [
    { id: 1, nama: 'Hendra Wijaya', email: 'hendra@perpusnas.id', instansi: 'Perpusnas', bergabung: '2023-09-01', status: 'Aktif' },
  ],
};

const STATUS_BADGE = { 'Aktif': 'badge-green', 'Menunggu': 'badge-amber', 'Nonaktif': 'badge-red' };

const Toast = ({ msg, type = 'success', onClose }) => (
  <div style={{
    position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999,
    background: type === 'success' ? '#0f172a' : '#7f1d1d', color: 'white', padding: '1rem 1.5rem',
    borderRadius: '0.75rem', boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
    display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '280px'
  }}>
    <span style={{ fontSize: '1.2rem' }}>{type === 'success' ? '✅' : '⚠️'}</span>
    <span style={{ flex: 1, fontSize: '0.9rem' }}>{msg}</span>
    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.1rem' }}>×</button>
  </div>
);

// Shared state lifted up via props pattern using module-level state (simple approach)
let globalUsers = { ...INITIAL_USERS };

const UserTable = ({ type, title, onUsersChange, users }) => {
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = (msg, t = 'success') => { setToast({ msg, type: t }); setTimeout(() => setToast(null), 3500); };

  const data = users[type] || [];
  const filtered = data.filter(u =>
    u.nama.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleSetujui = (u) => {
    if (window.confirm(`Setujui ${u.nama} sebagai Penulis resmi?\n\nAkun akan dipindahkan ke tab Penulis.`)) {
      // Remove from calon-penulis, add to penulis
      const updated = {
        ...users,
        'calon-penulis': users['calon-penulis'].filter(x => x.id !== u.id || x.email !== u.email),
        penulis: [...users.penulis, { ...u, status: 'Aktif', bergabung: u.bergabung }]
      };
      onUsersChange(updated);
      showToast(`${u.nama} berhasil disetujui sebagai Penulis resmi.`);
    }
  };

  const handleNonaktifkan = (u) => {
    const isNonaktif = u.status === 'Nonaktif';
    const label = isNonaktif ? 'Aktifkan' : 'Nonaktifkan';
    if (window.confirm(`${label} akun ${u.nama}?`)) {
      const updated = {
        ...users,
        [type]: users[type].map(x =>
          (x.id === u.id && x.email === u.email)
            ? { ...x, status: isNonaktif ? 'Aktif' : 'Nonaktif' }
            : x
        )
      };
      onUsersChange(updated);
      showToast(`Akun ${u.nama} berhasil ${isNonaktif ? 'diaktifkan' : 'dinonaktifkan'}.`);
    }
  };

  const handleHapus = (u) => {
    if (window.confirm(`Hapus akun "${u.nama}" (${u.email}) secara permanen?\n\nTindakan ini tidak dapat dibatalkan.`)) {
      const updated = {
        ...users,
        [type]: users[type].filter(x => !(x.id === u.id && x.email === u.email))
      };
      onUsersChange(updated);
      showToast(`Akun ${u.nama} berhasil dihapus.`);
    }
  };

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
            style={{ padding: '0.45rem 0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', width: '260px', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
          />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total: <strong>{filtered.length}</strong> pengguna</span>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>#</th><th>Nama</th><th>Email</th><th>Instansi</th><th>Bergabung</th><th>Status</th><th>Aksi</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0
                ? <tr><td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '2rem' }}>Tidak ada data.</td></tr>
                : filtered.map((u, i) => (
                  <tr key={`${u.id}-${u.email}`}>
                    <td style={{ color: 'var(--text-tertiary)' }}>{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{u.nama}</td>
                    <td style={{ fontSize: '0.82rem' }}>{u.email}</td>
                    <td>{u.instansi}</td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                      {new Date(u.bergabung).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td><span className={`badge ${STATUS_BADGE[u.status] || 'badge-gray'}`}>{u.status}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {type === 'calon-penulis' && u.status === 'Menunggu' && (
                          <button
                            onClick={() => handleSetujui(u)}
                            style={{ background: 'none', border: 'none', color: '#059669', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                          >✓ Setujui</button>
                        )}
                        <button
                          onClick={() => handleNonaktifkan(u)}
                          style={{ background: 'none', border: 'none', color: u.status === 'Nonaktif' ? '#2563eb' : 'var(--danger)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                        >{u.status === 'Nonaktif' ? '▶ Aktifkan' : '⏸ Nonaktifkan'}</button>
                        <button
                          onClick={() => handleHapus(u)}
                          style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                        >🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

const AdminPengguna = () => {
  const [users, setUsers] = useState(INITIAL_USERS);

  const tabs = [
    { path: '/admin/pengguna/penulis',       label: 'Penulis',       type: 'penulis' },
    { path: '/admin/pengguna/calon-penulis', label: 'Calon Penulis', type: 'calon-penulis' },
    { path: '/admin/pengguna/pengunjung',    label: 'Pengunjung',    type: 'pengunjung' },
    { path: '/admin/pengguna/pegawai',       label: 'Pegawai',       type: 'pegawai' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '2px solid var(--border-color)' }}>
        {tabs.map(t => (
          <NavLink
            key={t.path} to={t.path}
            style={({ isActive }) => ({
              padding: '0.5rem 1.1rem', fontSize: '0.875rem', fontWeight: 600,
              borderBottom: isActive ? '2px solid var(--accent-color)' : '2px solid transparent',
              color: isActive ? 'var(--accent-color)' : 'var(--text-secondary)',
              marginBottom: '-2px', transition: 'all 0.15s', textDecoration: 'none',
            })}
          >
            {t.label}
            <span style={{ marginLeft: '0.4rem', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontSize: '0.72rem', padding: '0 0.4rem', borderRadius: '50px' }}>
              {users[t.type]?.length || 0}
            </span>
          </NavLink>
        ))}
      </div>
      <Routes>
        <Route path="penulis"       element={<UserTable type="penulis"       title="Penulis"       users={users} onUsersChange={setUsers} />} />
        <Route path="calon-penulis" element={<UserTable type="calon-penulis" title="Calon Penulis" users={users} onUsersChange={setUsers} />} />
        <Route path="pengunjung"    element={<UserTable type="pengunjung"    title="Pengunjung"    users={users} onUsersChange={setUsers} />} />
        <Route path="pegawai"       element={<UserTable type="pegawai"       title="Pegawai"       users={users} onUsersChange={setUsers} />} />
        <Route index                element={<UserTable type="penulis"       title="Penulis"       users={users} onUsersChange={setUsers} />} />
      </Routes>
    </div>
  );
};

export default AdminPengguna;
