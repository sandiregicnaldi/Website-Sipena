import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';
import { SipenaAPI } from '../lib/api';
import {
  User, Mail, MapPin, Calendar, Building2, Briefcase,
  Globe, FileText, Plus, Trash2, Save, Camera, ArrowLeft, Link as LinkIcon, Type, Hash, AlignLeft, Link2, CheckCircle, Download, PenTool, ExternalLink, Key, Sparkles, Clock, AlertCircle, BookOpen
} from 'lucide-react';
import jsPDF from 'jspdf';
import './AuthorDashboard.css';

const AuthorDashboard = () => {
  const { user, updateProfile, logout, isAuthor, isApplicant, isAdmin } = useAuth();
  const { showAlert, showConfirm, showToast } = useDialog();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  // Redirect if not logged in or is admin
  if (!user || isAdmin) {
    if (isAdmin) navigate('/admin');
    else navigate('/login');
    return null;
  }

  const [form, setForm] = useState({
    namaLengkap: user.namaLengkap || user.name || '',
    email: user.email || '',
    profesi: user.profesi || '',
    domisili: user.domisili || (user.kota ? `${user.kota}, ${user.provinsi}` : ''),
    bio: user.bio || '',
    website: user.website || '',
    tempatLahir: user.tempatLahir || '',
    tanggalLahir: user.tanggalLahir || '',
    pekerjaan: user.pekerjaan || '',
    instansi: user.instansi || '',
    alamat: user.alamat || '',
    provinsi: user.provinsi || '',
    kota: user.kota || '',
    kecamatan: user.kecamatan || '',
    kelurahan: user.kelurahan || '',
    karyaEksternal: Array.isArray(user.karyaEksternal) ? user.karyaEksternal : [],
    fotoProfil: user.fotoProfil || user.image || null,
  });

  const [newKarya, setNewKarya] = useState({ judul: '', penerbit: '', tahun: '', url: '', storeName: '' });
  const [tokenAkselerasi, setTokenAkselerasi] = useState('');
  const [isSubmittingVerification, setIsSubmittingVerification] = useState(false);
  
  // State untuk form pengajuan naskah baru
  const [naskahBaru, setNaskahBaru] = useState({ judul: '', linkDrive: '' });
  const [naskahList, setNaskahList] = useState([
    { id: 1, judul: 'Sejarah Kopi Nusantara', linkDrive: 'https://drive.google.com/...', tanggal: '2026-07-01', status: 'Menunggu', alasan: '' },
    { id: 2, judul: 'Teknik Penulisan Fiksi', linkDrive: 'https://drive.google.com/...', tanggal: '2026-07-05', status: 'Disetujui', alasan: '' },
    { id: 3, judul: 'Misteri Gunung Merapi', linkDrive: 'https://drive.google.com/...', tanggal: '2026-07-10', status: 'Ditolak', alasan: 'Tema tidak sesuai dengan fokus penerbitan Perpusnas Press tahun ini.' },
  ]);

  // State untuk Kegiatan Saya (Mock)
  const [kegiatanList, setKegiatanList] = useState([
    { id: 1, judul: 'Seminar Literasi Digital 2026', tanggal: '2026-08-10', statusPresensi: 'Hadir' },
    { id: 2, judul: 'Workshop Penulisan Ilmiah', tanggal: '2026-07-20', statusPresensi: 'Belum Hadir' },
  ]);

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
      karyaEksternal: [...prev.karyaEksternal, { 
        ...newKarya, 
        storeName: newKarya.storeName.trim() || 'Toko Buku',
        id: Date.now() 
      }]
    }));
    setNewKarya({ judul: '', penerbit: '', tahun: '', url: '', storeName: '' });
  };

  const handleRemoveKarya = (id) => {
    setForm(prev => ({
      ...prev,
      karyaEksternal: prev.karyaEksternal.filter(k => k.id !== id)
    }));
  };

  const handleSave = async () => {
    try {
      await updateProfile(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      showToast({ message: 'Profil dan biodata berhasil diperbarui!', type: 'success' });
    } catch (err) {
      showToast({ message: 'Gagal memperbarui profil: ' + err.message, type: 'error' });
    }
  };

  const handleKirimPengajuanPenulis = async () => {
    if (!form.namaLengkap.trim()) {
      showToast({ message: 'Mohon isi nama penulis/pena Anda', type: 'error' });
      return;
    }
    if (!form.bio.trim()) {
      showToast({ message: 'Mohon isi biografi singkat kepenulisan Anda', type: 'error' });
      return;
    }
    if (form.karyaEksternal.length === 0) {
      showToast({ message: 'Mohon tambahkan minimal 1 buku yang pernah Anda terbitkan', type: 'error' });
      return;
    }

    const confirmed = await showConfirm({
      title: 'Kirim Pengajuan Verifikasi Penulis?',
      message: tokenAkselerasi.trim() 
        ? 'Anda menyertakan Token Akselerasi. Sistem akan langsung memvalidasi token dan mengaktifkan status Penulis Anda.'
        : 'Draf portofolio Anda akan dikirim ke Tim Redaksi Perpusnas Press untuk ditinjau.',
      type: 'info',
      confirmText: 'Ya, Kirim Pengajuan',
      cancelText: 'Periksa Kembali'
    });

    if (!confirmed) return;

    try {
      setIsSubmittingVerification(true);
      const res = await SipenaAPI.submitAuthorRequest({
        ...form,
        token: tokenAkselerasi.trim()
      });

      if (res.instantApproved) {
        await showAlert({
          title: '🎉 Selamat! Akun Berhasil Diverifikasi',
          message: 'Token Akselerasi valid! Akun Anda kini telah resmi menjadi Penulis Terverifikasi Perpusnas Press. Tab profil publik dan pengajuan naskah kini telah terbuka.',
          type: 'success',
          confirmText: 'Mulai Kelola Profil'
        });
        window.location.reload();
      } else {
        await showAlert({
          title: 'Pengajuan Berhasil Dikirim',
          message: 'Draf portofolio Anda telah tersimpan dan sedang dalam antrean review tim redaksi Perpusnas Press. Kami akan segera memperbarui status akun Anda.',
          type: 'success',
          confirmText: 'Selesai'
        });
        window.location.reload();
      }
    } catch (err) {
      showAlert({
        title: 'Pengajuan Gagal',
        message: err.message || 'Terjadi kesalahan saat mengirim pengajuan verifikasi.',
        type: 'danger',
        confirmText: 'Tutup'
      });
    } finally {
      setIsSubmittingVerification(false);
    }
  };

  const handleAjukanNaskah = (e) => {
    e.preventDefault();
    if(!naskahBaru.judul || !naskahBaru.linkDrive) return;
    const judulDiajukan = naskahBaru.judul;
    setNaskahList(prev => [...prev, {
      id: Date.now(),
      judul: judulDiajukan,
      linkDrive: naskahBaru.linkDrive,
      tanggal: new Date().toISOString().split('T')[0],
      status: 'Menunggu',
      alasan: ''
    }]);
    setNaskahBaru({ judul: '', linkDrive: '' });
    showAlert({
      title: 'Naskah Berhasil Diajukan!',
      message: `Naskah "${judulDiajukan}" berhasil dikirim ke sistem kurasi redaksi. Tim editor Perpusnas Press akan segera menelaah kelayakan naskah Anda.`,
      type: 'success',
      confirmText: 'Mengerti'
    });
  };

  const downloadSertifikat = (kegiatan) => {
    const doc = new jsPDF({ orientation: 'landscape' });
    
    // Background and border
    doc.setFillColor(245, 247, 250);
    doc.rect(0, 0, 297, 210, 'F');
    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(2);
    doc.rect(10, 10, 277, 190);

    // Title
    doc.setFontSize(28);
    doc.setTextColor(30, 58, 138);
    doc.text('SERTIFIKAT KEHADIRAN', 148.5, 50, { align: 'center' });
    
    // Subtitle
    doc.setFontSize(14);
    doc.setTextColor(71, 85, 105);
    doc.text('Diberikan kepada:', 148.5, 75, { align: 'center' });

    // Name
    doc.setFontSize(32);
    doc.setTextColor(15, 23, 42);
    doc.text(user.namaLengkap || user.username, 148.5, 100, { align: 'center' });

    // Text
    doc.setFontSize(14);
    doc.setTextColor(71, 85, 105);
    doc.text('Atas partisipasinya dalam kegiatan:', 148.5, 125, { align: 'center' });

    // Event Title
    doc.setFontSize(20);
    doc.setTextColor(37, 99, 235);
    doc.text(kegiatan.judul, 148.5, 145, { align: 'center' });

    // Date
    doc.setFontSize(12);
    doc.setTextColor(100, 116, 139);
    doc.text(`Jakarta, ${new Date(kegiatan.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, 148.5, 175, { align: 'center' });

    doc.save(`Sertifikat_${kegiatan.judul.replace(/\s+/g, '_')}.pdf`);
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
          <p className="dashboard-subtitle">Kelola informasi, naskah, dan sertifikat kegiatan Anda.</p>
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
              <span className="role-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                {isAuthor ? (
                  <>
                    <PenTool size={13} /> Penulis Terverifikasi
                  </>
                ) : user?.isApplicant || user?.role === 'calon_penulis' ? (
                  <span style={{ color: '#d97706', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Clock size={13} /> Menunggu Verifikasi
                  </span>
                ) : (
                  <>
                    <User size={13} /> Pengunjung
                  </>
                )}
              </span>
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
                <User size={16} /> Biodata & Profil
              </button>
              {isAuthor && (
                <button className={`dash-tab ${activeTab === 'naskah' ? 'active' : ''}`} onClick={() => setActiveTab('naskah')}>
                  <FileText size={16} /> Pengajuan Naskah
                </button>
              )}
              <button className={`dash-tab ${activeTab === 'kegiatan' ? 'active' : ''}`} onClick={() => setActiveTab('kegiatan')}>
                <Calendar size={16} /> Kegiatan Saya
              </button>
              {isAuthor && (
                <button className={`dash-tab ${activeTab === 'karya' ? 'active' : ''}`} onClick={() => setActiveTab('karya')}>
                  <PenTool size={16} /> Profil Penulis Publik
                </button>
              )}
              {!isAuthor && (
                <button className={`dash-tab ${activeTab === 'pengajuan-penulis' ? 'active' : ''}`} onClick={() => setActiveTab('pengajuan-penulis')}>
                  <CheckCircle size={16} /> Verifikasi Penulis
                  {(user?.isApplicant || user?.role === 'calon_penulis') && (
                    <span style={{ fontSize: '0.72rem', padding: '0.1rem 0.45rem', borderRadius: '10px', background: '#fef3c7', color: '#b45309', marginLeft: '0.35rem', fontWeight: 600 }}>
                      Review
                    </span>
                  )}
                </button>
              )}
            </div>

            {/* ── TAB 1: BIODATA ─────────────────────────────────── */}
            {activeTab === 'biodata' && (
              <div className="tab-panel">
                <div className="form-section">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label>Tempat Lahir</label>
                      <div className="input-with-icon">
                        <MapPin size={18} className="input-icon" />
                        <input type="text" name="tempatLahir" value={form.tempatLahir} onChange={handleChange} placeholder="Kota Kelahiran" />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Tanggal Lahir</label>
                      <div className="input-with-icon">
                        <Calendar size={18} className="input-icon" />
                        <input type="date" name="tanggalLahir" value={form.tanggalLahir} onChange={handleChange} />
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label>Status / Pekerjaan</label>
                      <div className="input-with-icon">
                        <Briefcase size={18} className="input-icon" />
                        <select name="pekerjaan" value={form.pekerjaan} onChange={handleChange}>
                          <option value="">-- Pilih --</option>
                          <option value="Pelajar/Mahasiswa">Pelajar/Mahasiswa</option>
                          <option value="PNS">PNS</option>
                          <option value="Pegawai Swasta">Pegawai Swasta</option>
                          <option value="Wiraswasta">Wiraswasta</option>
                          <option value="Lainnya">Lainnya</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Instansi / Lembaga</label>
                      <div className="input-with-icon">
                        <Building2 size={18} className="input-icon" />
                        <input type="text" name="instansi" value={form.instansi} onChange={handleChange} placeholder="Nama Instansi/Lembaga Anda" />
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Alamat Lengkap</label>
                    <div className="input-with-icon textarea-container">
                      <MapPin size={18} className="input-icon textarea-icon" />
                      <textarea name="alamat" value={form.alamat} onChange={handleChange} rows="3" placeholder="Jalan, RT/RW, Nomor Rumah"></textarea>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label>Provinsi</label>
                      <div className="input-with-icon">
                        <MapPin size={18} className="input-icon" />
                        <input type="text" name="provinsi" value={form.provinsi} onChange={handleChange} placeholder="Provinsi" />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Kota/Kabupaten</label>
                      <div className="input-with-icon">
                        <MapPin size={18} className="input-icon" />
                        <input type="text" name="kota" value={form.kota} onChange={handleChange} placeholder="Kota/Kabupaten" />
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label>Kecamatan</label>
                      <div className="input-with-icon">
                        <MapPin size={18} className="input-icon" />
                        <input type="text" name="kecamatan" value={form.kecamatan} onChange={handleChange} placeholder="Kecamatan" />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Kelurahan</label>
                      <div className="input-with-icon">
                        <MapPin size={18} className="input-icon" />
                        <input type="text" name="kelurahan" value={form.kelurahan} onChange={handleChange} placeholder="Kelurahan" />
                      </div>
                    </div>
                  </div>

                  <button className="btn btn-primary" onClick={() => {
                    handleSave();
                    showToast({ message: 'Profil dan biodata berhasil diperbarui!', type: 'success' });
                  }} style={{ marginTop: '1rem' }}>
                    <Save size={16} /> Simpan Perubahan
                  </button>
                </div>
              </div>
            )}

            {/* ── TAB PENGAJUAN / VERIFIKASI PENULIS (Opsi 1 Disempurnakan) ── */}
            {activeTab === 'pengajuan-penulis' && !isAuthor && (
              <div className="tab-panel">
                {(user?.isApplicant || user?.role === 'calon_penulis') ? (
                  <div className="author-draft-card" style={{ borderLeft: '5px solid #f59e0b', background: 'white' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.25rem' }}>
                      <div style={{ background: '#fef3c7', padding: '0.75rem', borderRadius: '50%', color: '#d97706', display: 'flex' }}>
                        <Clock size={28} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                          <h3 style={{ margin: 0, color: '#92400e', fontSize: '1.25rem' }}>Pengajuan Verifikasi Sedang Ditinjau</h3>
                          <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '50px', background: '#fef3c7', color: '#b45309', fontWeight: 600 }}>
                            Dalam Antrean
                          </span>
                        </div>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: '1.5' }}>
                          Terima kasih! Draf portofolio kepenulisan Anda telah kami terima dan sedang ditelaah oleh Tim Redaksi Perpusnas Press. Begitu disetujui, akun Anda otomatis menjadi <strong>Penulis Terverifikasi</strong> dan tab Profil Publik & Pengajuan Naskah akan langsung aktif.
                        </p>
                      </div>
                    </div>

                    <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                      <h4 style={{ margin: '0 0 0.85rem', fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <FileText size={16} color="var(--accent-color)" /> Ringkasan Draf yang Diajukan:
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', fontSize: '0.875rem' }}>
                        <div>
                          <span style={{ color: 'var(--text-tertiary)', display: 'block', fontSize: '0.78rem' }}>Nama Penulis Publik</span>
                          <strong style={{ color: 'var(--text-primary)' }}>{form.namaLengkap || user.namaLengkap}</strong>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-tertiary)', display: 'block', fontSize: '0.78rem' }}>Bidang / Profesi Kepenulisan</span>
                          <strong style={{ color: 'var(--text-primary)' }}>{form.profesi || '-'}</strong>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-tertiary)', display: 'block', fontSize: '0.78rem' }}>Domisili Publik</span>
                          <strong style={{ color: 'var(--text-primary)' }}>{form.domisili || '-'}</strong>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-tertiary)', display: 'block', fontSize: '0.78rem' }}>Jumlah Karya Diajukan</span>
                          <strong style={{ color: 'var(--text-primary)' }}>{form.karyaEksternal.length} buku</strong>
                        </div>
                      </div>

                      {form.bio && (
                        <div style={{ marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px dashed var(--border-color)', fontSize: '0.85rem' }}>
                          <span style={{ color: 'var(--text-tertiary)', display: 'block', fontSize: '0.78rem', marginBottom: '0.2rem' }}>Draf Biografi:</span>
                          <p style={{ margin: 0, color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: '1.6' }}>"{form.bio}"</p>
                        </div>
                      )}

                      {form.karyaEksternal.length > 0 && (
                        <div style={{ marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px dashed var(--border-color)' }}>
                          <span style={{ color: 'var(--text-tertiary)', display: 'block', fontSize: '0.78rem', marginBottom: '0.5rem' }}>Daftar Buku di Penerbit Lain:</span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {form.karyaEksternal.map(k => (
                              <div key={k.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                                <div>
                                  <strong>{k.judul}</strong> · <span style={{ color: 'var(--text-secondary)' }}>{k.penerbit} ({k.tahun})</span>
                                </div>
                                <span className="store-link" style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem' }}>
                                  {k.storeName || 'Beli Buku'} ↗
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ background: 'linear-gradient(135deg, #1e3a8a, #2563eb)', color: 'white', padding: '1.5rem 2rem', borderRadius: 'var(--radius-lg)', marginBottom: '2rem', boxShadow: 'var(--shadow-md)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <Sparkles size={24} color="#fef08a" />
                        <h3 style={{ margin: 0, fontSize: '1.35rem', color: 'white' }}>Upgrade Menjadi Penulis Terverifikasi</h3>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.92rem', opacity: 0.9, lineHeight: '1.6', maxWidth: '750px' }}>
                        Tingkatkan akun Pengunjung Anda. Sebagai Penulis resmi Perpusnas Press, Anda dapat memiliki laman profil penulis publik, memamerkan portofolio buku di penerbit lain, dan mengajukan draf naskah langsung ke meja redaksi.
                      </p>
                    </div>

                    <div className="form-section">
                      <h4 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <PenTool size={18} color="var(--accent-color)" /> Langkah 1: Siapkan Draf Profil Kepenulisan Anda
                      </h4>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                        Data ini akan langsung menjadi profil publik Anda di SiPena setelah disetujui.
                      </p>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                          <label>Nama Penulis / Nama Pena *</label>
                          <div className="input-with-icon">
                            <User size={18} className="input-icon" />
                            <input type="text" name="namaLengkap" value={form.namaLengkap} onChange={handleChange} placeholder="Contoh: Dinda Marlina Carolina" required />
                          </div>
                        </div>

                        <div className="form-group">
                          <label>Bidang / Profesi Kepenulisan *</label>
                          <div className="input-with-icon">
                            <PenTool size={18} className="input-icon" />
                            <input type="text" name="profesi" value={form.profesi} onChange={handleChange} placeholder="Contoh: Penulis & Peneliti Sastra" required />
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                          <label>Domisili / Wilayah *</label>
                          <div className="input-with-icon">
                            <MapPin size={18} className="input-icon" />
                            <input type="text" name="domisili" value={form.domisili} onChange={handleChange} placeholder="Contoh: Yogyakarta, Indonesia" required />
                          </div>
                        </div>

                        <div className="form-group">
                          <label>Website / Portofolio / Medsos (Opsional)</label>
                          <div className="input-with-icon">
                            <Globe size={18} className="input-icon" />
                            <input type="text" name="website" value={form.website} onChange={handleChange} placeholder="www.dindamarlina.com atau link medsos" />
                          </div>
                        </div>
                      </div>

                      <div className="form-group">
                        <label>Biografi Singkat Kepenulisan *</label>
                        <div className="input-with-icon textarea-container">
                          <FileText size={18} className="input-icon textarea-icon" />
                          <textarea name="bio" value={form.bio} onChange={handleChange} rows="4" placeholder="Ceritakan ketertarikan sastra, pengalaman menulis, dan latar belakang karya Anda..." required></textarea>
                        </div>
                      </div>

                      {/* Karya Eksternal Tambahan saat Pendaftaran */}
                      <div style={{ marginTop: '1.5rem', background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                        <h5 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                          Buku yang Pernah Diterbitkan di Penerbit Lain (Minimal 1) *
                        </h5>
                        <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          Sertakan judul buku, penerbit, tahun, dan link toko pembelian agar calon pembaca dapat menjangkau karya Anda.
                        </p>

                        {/* List Karya yang sudah ditambahkan */}
                        {form.karyaEksternal.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                            {form.karyaEksternal.map(k => (
                              <div key={k.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                                <div>
                                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{k.judul}</div>
                                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                    {k.penerbit}{k.tahun ? ` (${k.tahun})` : ''} · <span style={{ color: 'var(--accent-color)' }}>Beli di {k.storeName || 'Toko Buku'}</span>
                                  </div>
                                </div>
                                <button type="button" onClick={() => handleRemoveKarya(k.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '0.3rem' }} title="Hapus">
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Input tambah karya baru */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.6rem' }}>
                          <input type="text" placeholder="Judul Buku *" value={newKarya.judul} onChange={e => setNewKarya(p => ({ ...p, judul: e.target.value }))} style={{ padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.85rem' }} />
                          <input type="text" placeholder="Penerbit *" value={newKarya.penerbit} onChange={e => setNewKarya(p => ({ ...p, penerbit: e.target.value }))} style={{ padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.85rem' }} />
                          <input type="text" placeholder="Tahun (e.g. 2023)" value={newKarya.tahun} onChange={e => setNewKarya(p => ({ ...p, tahun: e.target.value }))} style={{ padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.85rem' }} />
                          <input type="text" placeholder="Nama Toko (e.g. Gramedia.com)" value={newKarya.storeName} onChange={e => setNewKarya(p => ({ ...p, storeName: e.target.value }))} style={{ padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.85rem' }} />
                          <input type="url" placeholder="URL Link Toko *" value={newKarya.url} onChange={e => setNewKarya(p => ({ ...p, url: e.target.value }))} style={{ padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.85rem' }} />
                        </div>
                        <button type="button" className="btn btn-outline" onClick={handleAddKarya} style={{ marginTop: '0.75rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Plus size={15} /> Tambahkan Buku ke Draf
                        </button>
                      </div>

                      {/* Langkah 2: Token Akselerasi Opsional */}
                      <div className="token-input-box">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                          <Key size={18} color="#2563eb" />
                          <h5 style={{ margin: 0, fontSize: '0.95rem', color: '#1e3a8a' }}>Langkah 2: Token Akselerasi Perpusnas Press (Opsional)</h5>
                        </div>
                        <p style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          Punya kode token undangan khusus dari tim redaksi? Masukkan kode token di bawah untuk langsung diverifikasi secara instan tanpa masa tunggu antrean review.
                        </p>
                        <div style={{ maxWidth: '400px' }}>
                          <input 
                            type="text" 
                            placeholder="Contoh: PERPUSNAS-PENULIS-2026" 
                            value={tokenAkselerasi} 
                            onChange={e => setTokenAkselerasi(e.target.value)}
                            style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-md)', border: '1px solid #bfdbfe', background: 'white', fontWeight: 600, letterSpacing: '0.5px' }}
                          />
                        </div>
                      </div>

                      {/* Tombol Kirim Pengajuan */}
                      <button 
                        type="button"
                        className="btn btn-primary" 
                        disabled={isSubmittingVerification}
                        onClick={handleKirimPengajuanPenulis}
                        style={{ padding: '0.85rem 2rem', fontSize: '1rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                      >
                        <CheckCircle size={18} /> {isSubmittingVerification ? 'Mengirim Pengajuan...' : 'Kirim Pengajuan Verifikasi Penulis'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── TAB PENGUJUAN NASKAH ─────────────────────────────────── */}
            {activeTab === 'naskah' && isAuthor && (
              <div className="tab-panel">
                <p className="tab-desc">Ajukan draf naskah baru dan pantau status naskah yang sedang dalam proses review.</p>
                
                {/* Form Pengajuan Naskah */}
                <div className="add-karya-section" style={{marginBottom: '2rem'}}>
                  <h3>Ajukan Naskah Baru</h3>
                  <form onSubmit={handleAjukanNaskah} className="form-section">
                    <div className="form-group">
                      <label>Judul Naskah</label>
                      <div className="input-with-icon">
                        <Type size={18} className="input-icon" />
                        <input type="text" required value={naskahBaru.judul} onChange={e => setNaskahBaru(p => ({...p, judul: e.target.value}))} placeholder="Masukkan judul naskah" />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Tautan File Naskah (Google Drive) *</label>
                      <div className="input-with-icon">
                        <Link2 size={18} className="input-icon" />
                        <input type="url" placeholder="https://drive.google.com/..." required value={naskahBaru.linkDrive} onChange={e => setNaskahBaru(p => ({...p, linkDrive: e.target.value}))} />
                      </div>
                    </div>
                    <button type="submit" className="btn btn-primary" style={{alignSelf: 'flex-start'}}><Plus size={16}/> Kirim Pengajuan</button>
                  </form>
                </div>

                {/* Tabel Status Naskah */}
                <h3 className="section-title-sm">Status Naskah Diajukan</h3>
                <div style={{overflowX: 'auto'}}>
                  <table className="admin-table" style={{width: '100%', marginTop: '1rem'}}>
                    <thead>
                      <tr>
                        <th>Judul</th>
                        <th>Berkas Naskah</th>
                        <th>Tanggal Masuk</th>
                        <th>Status</th>
                        <th>Alasan Ditolak</th>
                      </tr>
                    </thead>
                    <tbody>
                      {naskahList.map(n => (
                        <tr key={n.id}>
                          <td style={{fontWeight: 600}}>{n.judul}</td>
                          <td>
                            <a href={n.linkDrive} target="_blank" rel="noopener noreferrer" className="badge badge-blue" style={{textDecoration: 'none'}}>Lihat Berkas</a>
                          </td>
                          <td style={{fontSize: '0.85rem'}}>{n.tanggal}</td>
                          <td>
                            <span className={`admin-badge ${n.status === 'Disetujui' ? 'badge-green' : n.status === 'Ditolak' ? 'badge-red' : 'badge-amber'}`}>
                              {n.status}
                            </span>
                          </td>
                          <td style={{fontSize: '0.85rem', color: 'var(--danger)', maxWidth: '150px'}}>
                            {n.status === 'Ditolak' ? n.alasan : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── TAB KEGIATAN SAYA ─────────────────────────────────── */}
            {activeTab === 'kegiatan' && (
              <div className="tab-panel">
                <p className="tab-desc">Lihat riwayat kegiatan yang Anda ikuti dan unduh sertifikat kehadiran.</p>
                
                <div style={{overflowX: 'auto'}}>
                  <table className="admin-table" style={{width: '100%', marginTop: '1rem'}}>
                    <thead>
                      <tr>
                        <th>Nama Kegiatan</th>
                        <th>Tanggal</th>
                        <th>Status Presensi</th>
                        <th>Sertifikat</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kegiatanList.map(k => (
                        <tr key={k.id}>
                          <td style={{fontWeight: 600}}>{k.judul}</td>
                          <td style={{fontSize: '0.85rem'}}>
                            {new Date(k.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                          <td>
                            <span className={`badge ${k.statusPresensi === 'Hadir' ? 'badge-green' : 'badge-amber'}`}>
                              {k.statusPresensi}
                            </span>
                          </td>
                          <td>
                            {k.statusPresensi === 'Hadir' ? (
                              <button onClick={() => downloadSertifikat(k)} className="btn btn-outline" style={{padding: '0.3rem 0.6rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem'}}>
                                <Download size={14} /> Unduh PDF
                              </button>
                            ) : (
                              <span style={{color: 'var(--text-tertiary)', fontSize: '0.8rem'}}>-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── TAB PROFIL PENULIS (Only Verified Author) ─────────── */}
            {activeTab === 'karya' && isAuthor && (
              <div className="tab-panel">
                <div className="author-tab-header">
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>Profil Penulis Publik</h3>
                    <p style={{ margin: '0.25rem 0 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                      Kelola profil Anda persis seperti yang tampil pada halaman detail penulis bagi pembaca dan pengunjung SiPena.
                    </p>
                  </div>
                  <button 
                    type="button" 
                    className="author-preview-btn" 
                    onClick={() => navigate(`/penulis/${user.id}`)}
                    title="Buka tampilan publik profil saya"
                  >
                    <ExternalLink size={16} /> Lihat Tampilan Publik Profil Saya
                  </button>
                </div>

                <div className="form-section" style={{ marginBottom: '2rem' }}>
                  <div className="form-group">
                    <label>Foto Profil Publik</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                      {form.fotoProfil ? (
                        <img src={form.fotoProfil} alt="Foto Profil" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #e2e8f0', boxShadow: 'var(--shadow-sm)' }} />
                      ) : (
                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid #e2e8f0' }}>
                          <User size={32} color="#94a3b8" />
                        </div>
                      )}
                      <div>
                        <button type="button" className="btn btn-outline" onClick={() => fileInputRef.current.click()} style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Camera size={16} /> Ganti Foto Profil
                        </button>
                        <p style={{ margin: '0.35rem 0 0', fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>Format JPG, PNG atau WebP (Disarankan rasio 1:1)</p>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label>Nama Penulis Publik *</label>
                      <div className="input-with-icon">
                        <User size={18} className="input-icon" />
                        <input type="text" name="namaLengkap" value={form.namaLengkap} onChange={handleChange} placeholder="Contoh: Dinda Marlina Carolina" required />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Profesi / Tagline Kepenulisan *</label>
                      <div className="input-with-icon">
                        <PenTool size={18} className="input-icon" />
                        <input type="text" name="profesi" value={form.profesi} onChange={handleChange} placeholder="Contoh: Penulis & Peneliti Sastra" required />
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label>Domisili / Wilayah *</label>
                      <div className="input-with-icon">
                        <MapPin size={18} className="input-icon" />
                        <input type="text" name="domisili" value={form.domisili} onChange={handleChange} placeholder="Contoh: Yogyakarta, Indonesia" required />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Email Kontak Publik</label>
                      <div className="input-with-icon">
                        <Mail size={18} className="input-icon" />
                        <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="email.penulis@example.com" />
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Website / Portofolio / Media Sosial</label>
                    <div className="input-with-icon">
                      <Globe size={18} className="input-icon" />
                      <input type="text" name="website" value={form.website} onChange={handleChange} placeholder="www.dindamarlina.com atau link medsos" />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Biografi Singkat Penulis</label>
                    <div className="input-with-icon textarea-container">
                      <FileText size={18} className="input-icon textarea-icon" />
                      <textarea name="bio" value={form.bio} onChange={handleChange} rows="5" placeholder="Ceritakan riwayat kepenulisan, fokus karya sastra/riset, dan latar belakang Anda..."></textarea>
                    </div>
                  </div>

                  <button className="btn btn-primary" onClick={handleSave} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Save size={16} /> Simpan Profil Publik
                  </button>
                </div>

                <h3 className="section-title-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <BookOpen size={18} color="var(--accent-color)" /> Karya di Penerbit Lain
                </h3>
                <p className="tab-desc" style={{ marginTop: '-0.5rem', marginBottom: '1.25rem' }}>
                  Tambahkan buku-buku Anda yang telah diterbitkan di luar Perpusnas Press beserta tautan toko online (Gramedia, Tokopedia, Shopee, dll).
                </p>

                {/* List existing */}
                <div className="karya-list" style={{ marginBottom: '1.75rem' }}>
                  {form.karyaEksternal.length === 0 && (
                    <div className="empty-state">
                      <FileText size={40} color="#cbd5e1" />
                      <p>Belum ada karya eksternal yang ditambahkan.</p>
                    </div>
                  )}
                  {form.karyaEksternal.map((k) => (
                    <div key={k.id} className="karya-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '0.75rem' }}>
                      <div className="karya-info">
                        <h4 style={{ margin: '0 0 0.25rem', fontSize: '1.05rem', color: 'var(--text-primary)' }}>{k.judul}</h4>
                        <p style={{ margin: '0 0 0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                          {k.penerbit}{k.tahun ? ` (${k.tahun})` : ''}
                        </p>
                        {k.url && (
                          <a href={k.url} target="_blank" rel="noopener noreferrer" className="store-link">
                            Beli di {k.storeName || 'Toko Buku'} <ExternalLink size={13} />
                          </a>
                        )}
                      </div>
                      <button className="karya-delete" onClick={() => handleRemoveKarya(k.id)} title="Hapus Karya">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add new */}
                <div className="add-karya-section">
                  <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Tambah Karya Baru</h3>
                  <div className="add-karya-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                    <input type="text" placeholder="Judul Buku *" value={newKarya.judul} onChange={e => setNewKarya(p => ({ ...p, judul: e.target.value }))} />
                    <input type="text" placeholder="Nama Penerbit *" value={newKarya.penerbit} onChange={e => setNewKarya(p => ({ ...p, penerbit: e.target.value }))} />
                    <input type="text" placeholder="Tahun Terbit (e.g. 2022)" value={newKarya.tahun} onChange={e => setNewKarya(p => ({ ...p, tahun: e.target.value }))} />
                    <input type="text" placeholder="Nama Toko (e.g. Gramedia.com, Tokopedia)" value={newKarya.storeName} onChange={e => setNewKarya(p => ({ ...p, storeName: e.target.value }))} />
                    <input type="url" placeholder="URL Tautan Pembelian *" value={newKarya.url} onChange={e => setNewKarya(p => ({ ...p, url: e.target.value }))} style={{ gridColumn: '1 / -1' }} />
                  </div>
                  <button className="btn btn-outline add-btn" onClick={handleAddKarya} style={{ marginTop: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Plus size={16} /> Tambahkan Karya ke Profil
                  </button>
                </div>
              </div>
            )}

            {/* Save button */}
            <div className="dashboard-footer-actions">
              {saved && (
                <span className="save-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  <CheckCircle size={15} /> Perubahan berhasil disimpan!
                </span>
              )}
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
