import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './AdminLayout.css';

// ── Toast ──────────────────────────────────────────────────────────────────
const Toast = ({ msg, type = 'success', onClose }) => (
  <div style={{
    position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999,
    background: type === 'success' ? '#0f172a' : '#7f1d1d', color: 'white', padding: '1rem 1.5rem',
    borderRadius: '0.75rem', boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
    display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '280px'
  }}>
    <span style={{ fontSize: '1.2rem' }}>{type === 'success' ? '✅' : '❌'}</span>
    <span style={{ flex: 1, fontSize: '0.9rem' }}>{msg}</span>
    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.1rem' }}>×</button>
  </div>
);

// ── Profil Admin ────────────────────────────────────────────────────────────
const ProfilAdmin = () => {
  const { user } = useAuth();
  const [form, setForm] = useState({
    nama: user?.username || '',
    email: user?.email || '',
    jabatan: 'Administrator',
    instansi: 'Perpustakaan Nasional RI',
  });
  const [pwForm, setPwForm] = useState({ lama: '', baru: '', konfirmasi: '' });
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSimpan = (e) => {
    e.preventDefault();
    if (!form.nama.trim() || !form.email.trim()) {
      showToast('Nama dan Email tidak boleh kosong.', 'error');
      return;
    }
    // Simulasi simpan — di real app akan call API
    showToast('Profil admin berhasil disimpan!');
  };

  const handleUbahPassword = (e) => {
    e.preventDefault();
    if (!pwForm.lama.trim()) {
      showToast('Kata sandi saat ini wajib diisi.', 'error');
      return;
    }
    if (pwForm.baru.length < 6) {
      showToast('Kata sandi baru minimal 6 karakter.', 'error');
      return;
    }
    if (pwForm.baru !== pwForm.konfirmasi) {
      showToast('Konfirmasi kata sandi tidak cocok.', 'error');
      return;
    }
    setPwForm({ lama: '', baru: '', konfirmasi: '' });
    showToast('Kata sandi berhasil diperbarui!');
  };

  const inputStyle = {
    width: '100%', padding: '0.55rem 0.75rem', border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-md)', fontSize: '0.875rem',
    background: 'var(--bg-primary)', color: 'var(--text-primary)', boxSizing: 'border-box'
  };
  const labelStyle = { display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' };

  return (
    <div>
      <div className="admin-page-header">
        <h1>⚙️ Profil Admin</h1>
        <p>Kelola informasi profil dan keamanan akun administrator.</p>
      </div>
      <div className="admin-grid-2">
        {/* Informasi Akun */}
        <div className="admin-card">
          <div className="admin-card-header"><span className="admin-card-title">Informasi Akun</span></div>
          <form onSubmit={handleSimpan} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { label: 'Nama Lengkap', key: 'nama', type: 'text' },
              { label: 'Email', key: 'email', type: 'email' },
              { label: 'Jabatan', key: 'jabatan', type: 'text' },
              { label: 'Instansi', key: 'instansi', type: 'text' },
            ].map(f => (
              <div key={f.key}>
                <label style={labelStyle}>{f.label}</label>
                <input
                  type={f.type}
                  value={form[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  style={inputStyle}
                />
              </div>
            ))}
            <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', padding: '0.55rem 1.25rem', fontSize: '0.875rem' }}>
              💾 Simpan Perubahan
            </button>
          </form>
        </div>

        {/* Ubah Kata Sandi */}
        <div className="admin-card">
          <div className="admin-card-header"><span className="admin-card-title">Ubah Kata Sandi</span></div>
          <form onSubmit={handleUbahPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { label: 'Kata Sandi Saat Ini', key: 'lama' },
              { label: 'Kata Sandi Baru', key: 'baru' },
              { label: 'Konfirmasi Kata Sandi Baru', key: 'konfirmasi' },
            ].map(f => (
              <div key={f.key}>
                <label style={labelStyle}>{f.label}</label>
                <input
                  type="password"
                  value={pwForm[f.key]}
                  onChange={e => setPwForm(p => ({ ...p, [f.key]: e.target.value }))}
                  style={inputStyle}
                  placeholder={f.key === 'baru' ? 'Minimal 6 karakter' : ''}
                />
              </div>
            ))}
            <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', padding: '0.55rem 1.25rem', fontSize: '0.875rem' }}>
              🔒 Ubah Kata Sandi
            </button>
          </form>
        </div>
      </div>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

// ── Pengguna Sistem (Akun Admin) ────────────────────────────────────────────
const ADMIN_ACCOUNTS = [
  { id: 1, nama: 'Administrator',   email: 'admin@sipena.id',  jabatan: 'Super Admin',       status: 'Aktif' },
  { id: 2, nama: 'Pengelola Konten', email: 'konten@sipena.id', jabatan: 'Pengelola Konten',  status: 'Aktif' },
];

const PenggunaSistem = () => {
  const [accounts, setAccounts] = useState(ADMIN_ACCOUNTS);
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  const inputStyle = {
    width: '100%', padding: '0.55rem 0.75rem', border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-md)', fontSize: '0.875rem',
    background: 'var(--bg-primary)', color: 'var(--text-primary)', boxSizing: 'border-box'
  };

  const handleToggle = (id) => {
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, status: a.status === 'Aktif' ? 'Nonaktif' : 'Aktif' } : a));
    const acc = accounts.find(a => a.id === id);
    showToast(`Akun ${acc.nama} berhasil ${acc.status === 'Aktif' ? 'dinonaktifkan' : 'diaktifkan'}.`);
  };

  return (
    <div>
      <div className="admin-page-header">
        <h1>🔧 Pengguna Sistem</h1>
        <p>Kelola akun admin dan hak akses pengguna sistem SiPena.</p>
      </div>
      <div className="admin-card">
        <div className="admin-card-header">
          <span className="admin-card-title">Daftar Akun Administrator</span>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>#</th><th>Nama</th><th>Email</th><th>Jabatan</th><th>Status</th><th>Aksi</th></tr>
            </thead>
            <tbody>
              {accounts.map((a, i) => (
                <tr key={a.id}>
                  <td style={{ color: 'var(--text-tertiary)' }}>{i + 1}</td>
                  <td style={{ fontWeight: 600 }}>{a.nama}</td>
                  <td style={{ fontSize: '0.82rem' }}>{a.email}</td>
                  <td>{a.jabatan}</td>
                  <td>
                    <span className={`badge ${a.status === 'Aktif' ? 'badge-green' : 'badge-red'}`}>{a.status}</span>
                  </td>
                  <td>
                    <button
                      onClick={() => handleToggle(a.id)}
                      style={{ background: 'none', border: 'none', color: a.status === 'Aktif' ? 'var(--danger)' : '#2563eb', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                    >{a.status === 'Aktif' ? '⏸ Nonaktifkan' : '▶ Aktifkan'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

const AdminPengaturan = () => (
  <Routes>
    <Route index        element={<ProfilAdmin />} />
    <Route path="profil"  element={<ProfilAdmin />} />
    <Route path="sistem"  element={<PenggunaSistem />} />
  </Routes>
);

export default AdminPengaturan;
