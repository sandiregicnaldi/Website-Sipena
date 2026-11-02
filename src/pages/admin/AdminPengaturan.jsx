import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Settings, Save, Key, CheckCircle, XCircle } from 'lucide-react';
import './AdminLayout.css';

// ── Toast ──────────────────────────────────────────────────────────────────
const Toast = ({ msg, type = 'success', onClose }) => (
  <div style={{
    position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999,
    background: type === 'success' ? '#0f172a' : '#7f1d1d', color: 'white', padding: '1rem 1.5rem',
    borderRadius: '0.75rem', boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
    display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '280px'
  }}>
    <span style={{ display: 'flex', alignItems: 'center' }}>
      {type === 'success' ? <CheckCircle size={18} color="#10b981" /> : <XCircle size={18} color="#ef4444" />}
    </span>
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
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Settings size={24} color="var(--accent-color)" /> Profil Admin
        </h1>
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
            <button className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', alignSelf: 'flex-start' }} onClick={handleSimpan}>
                <Save size={16} /> Simpan Perubahan
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
            <button className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', alignSelf: 'flex-start' }} onClick={handleUbahPassword}>
                <Key size={16} /> Ubah Kata Sandi
              </button>
          </form>
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
  </Routes>
);

export default AdminPengaturan;
