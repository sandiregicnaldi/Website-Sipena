import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  User, Mail, MapPin, Calendar, Building2, Briefcase,
  Globe, FileText, Plus, Trash2, Save, Camera, ArrowLeft, Link as LinkIcon
} from 'lucide-react';
import './AuthorDashboard.css';

const AuthorDashboard = () => {
  const { user, updateProfile, logout, isAuthor } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Redirect if not logged in or not an author
  if (!user) {
    navigate('/login');
    return null;
  }

  const [form, setForm] = useState({
    namaLengkap: user.namaLengkap || '',
    bio: user.bio || '',
    keahlian: user.keahlian || '',
    website: user.website || '',
    lokasi: user.lokasi || '',
    karyaEksternal: user.karyaEksternal || [],
    fotoProfil: user.fotoProfil || null,
  });

  const [newKarya, setNewKarya] = useState({ judul: '', penerbit: '', tahun: '', url: '' });
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('biodata');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setForm(prev => ({ ...prev, fotoProfil: ev.target.result }));
      reader.readAsDataURL(file);
    }
  };

  const handleAddKarya = () => {
    if (!newKarya.judul.trim()) return;
    setForm(prev => ({
      ...prev,
      karyaEksternal: [...prev.karyaEksternal, { ...newKarya, id: Date.now() }]
    }));
    setNewKarya({ judul: '', penerbit: '', tahun: '', url: '' });
  };

  const handleRemoveKarya = (id) => {
    setForm(prev => ({
      ...prev,
      karyaEksternal: prev.karyaEksternal.filter(k => k.id !== id)
    }));
  };

  const handleSave = () => {
    updateProfile(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const infoItems = [
    { label: 'Email', value: user.email, icon: <Mail size={16} /> },
    { label: 'Tempat & Tanggal Lahir', value: user.tempatLahir && user.tanggalLahir ? `${user.tempatLahir}, ${new Date(user.tanggalLahir).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}` : '-', icon: <Calendar size={16} /> },
    { label: 'Status', value: user.status || '-', icon: <Briefcase size={16} /> },
    { label: 'Instansi / Lembaga', value: user.instansi || '-', icon: <Building2 size={16} /> },
  ];

  return (
    <main className="dashboard-page">
      <div className="container">
        <div className="dashboard-header">
          <button className="back-link-btn" onClick={() => navigate('/')}>
            <ArrowLeft size={16} /> Kembali ke Beranda
          </button>
          <h1 className="dashboard-title">Profil Saya</h1>
          <p className="dashboard-subtitle">Kelola informasi dan karya-karya Anda di SIPena</p>
        </div>

        <div className="dashboard-grid">

          {/* ── LEFT SIDEBAR ─────────────────────────────────────── */}
          <aside className="dashboard-sidebar">
            {/* Photo */}
            <div className="profile-photo-section">
              <div className="photo-wrapper" onClick={() => fileInputRef.current.click()}>
                {form.fotoProfil ? (
                  <img src={form.fotoProfil} alt="Foto Profil" className="photo-img" />
                ) : (
                  <div className="photo-placeholder">
                    <User size={48} color="#94a3b8" />
                  </div>
                )}
                <div className="photo-overlay">
                  <Camera size={20} />
                  <span>Ganti Foto</span>
                </div>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handlePhotoChange}
                style={{ display: 'none' }}
              />
              <h2 className="sidebar-name">{user.namaLengkap || user.username}</h2>
              <span className="role-badge">{isAuthor ? '✍️ Penulis' : '👤 Pengunjung'}</span>
            </div>

            {/* Static info */}
            <div className="sidebar-info-list">
              {infoItems.map((item, i) => (
                <div key={i} className="info-row">
                  <span className="info-row-icon">{item.icon}</span>
                  <div>
                    <span className="info-row-label">{item.label}</span>
                    <span className="info-row-value">{item.value}</span>
                  </div>
                </div>
              ))}
            </div>

            <button className="btn-logout" onClick={() => { logout(); navigate('/'); }}>
              Keluar dari Akun
            </button>
          </aside>

          {/* ── RIGHT CONTENT ─────────────────────────────────────── */}
          <div className="dashboard-content">
            {/* Tabs */}
            <div className="dash-tabs">
              <button className={`dash-tab ${activeTab === 'biodata' ? 'active' : ''}`} onClick={() => setActiveTab('biodata')}>
                <User size={16} /> Biodata & Bio
              </button>
              <button className={`dash-tab ${activeTab === 'karya' ? 'active' : ''}`} onClick={() => setActiveTab('karya')}>
                <LinkIcon size={16} /> Karya Eksternal
              </button>
            </div>

            {/* ── TAB 1: BIODATA ─────────────────────────────────── */}
            {activeTab === 'biodata' && (
              <div className="tab-panel">
                <div className="form-section">
                  <div className="form-group">
                    <label>Nama Lengkap</label>
                    <div className="input-with-icon">
                      <User size={18} className="input-icon" />
                      <input type="text" name="namaLengkap" value={form.namaLengkap} onChange={handleChange} placeholder="Nama lengkap Anda" />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Lokasi Saat Ini</label>
                    <div className="input-with-icon">
                      <MapPin size={18} className="input-icon" />
                      <input type="text" name="lokasi" value={form.lokasi} onChange={handleChange} placeholder="Misal: Yogyakarta, Indonesia" />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Website / Portofolio</label>
                    <div className="input-with-icon">
                      <Globe size={18} className="input-icon" />
                      <input type="text" name="website" value={form.website} onChange={handleChange} placeholder="https://namasaya.com" />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Keahlian / Bidang Penulisan</label>
                    <div className="input-with-icon">
                      <Briefcase size={18} className="input-icon" />
                      <input type="text" name="keahlian" value={form.keahlian} onChange={handleChange} placeholder="Misal: Fiksi Sejarah, Sastra Anak" />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Biografi Singkat</label>
                    <div className="input-with-icon textarea-container">
                      <FileText size={18} className="input-icon textarea-icon" />
                      <textarea name="bio" value={form.bio} onChange={handleChange} rows="5" placeholder="Ceritakan latar belakang, pengalaman menulis, dan penghargaan yang pernah Anda raih..."></textarea>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 2: KARYA EKSTERNAL ─────────────────────────── */}
            {activeTab === 'karya' && (
              <div className="tab-panel">
                <p className="tab-desc">Tambahkan karya-karya Anda yang diterbitkan di luar Perpusnas Press beserta tautan pembelian atau aksesnya.</p>

                {/* List existing */}
                <div className="karya-list">
                  {form.karyaEksternal.length === 0 && (
                    <div className="empty-state">
                      <FileText size={40} color="#cbd5e1" />
                      <p>Belum ada karya eksternal yang ditambahkan.</p>
                    </div>
                  )}
                  {form.karyaEksternal.map((k) => (
                    <div key={k.id} className="karya-card">
                      <div className="karya-info">
                        <h4>{k.judul}</h4>
                        <p>{k.penerbit}{k.tahun ? ` · ${k.tahun}` : ''}</p>
                        {k.url && (
                          <a href={k.url} target="_blank" rel="noopener noreferrer" className="karya-link">
                            <LinkIcon size={13} /> Lihat / Beli
                          </a>
                        )}
                      </div>
                      <button className="karya-delete" onClick={() => handleRemoveKarya(k.id)} title="Hapus">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add new */}
                <div className="add-karya-section">
                  <h3>Tambah Karya Baru</h3>
                  <div className="add-karya-grid">
                    <input type="text" placeholder="Judul Buku *" value={newKarya.judul} onChange={e => setNewKarya(p => ({ ...p, judul: e.target.value }))} />
                    <input type="text" placeholder="Nama Penerbit" value={newKarya.penerbit} onChange={e => setNewKarya(p => ({ ...p, penerbit: e.target.value }))} />
                    <input type="text" placeholder="Tahun Terbit" value={newKarya.tahun} onChange={e => setNewKarya(p => ({ ...p, tahun: e.target.value }))} />
                    <input type="text" placeholder="URL Tautan (Tokopedia, Gramedia, dll.)" value={newKarya.url} onChange={e => setNewKarya(p => ({ ...p, url: e.target.value }))} />
                  </div>
                  <button className="btn btn-outline add-btn" onClick={handleAddKarya}>
                    <Plus size={16} /> Tambahkan Karya
                  </button>
                </div>
              </div>
            )}

            {/* Save button */}
            <div className="dashboard-footer-actions">
              {saved && <span className="save-success">✅ Perubahan berhasil disimpan!</span>}
              <button className="btn btn-primary save-btn" onClick={handleSave}>
                <Save size={18} /> Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default AuthorDashboard;
