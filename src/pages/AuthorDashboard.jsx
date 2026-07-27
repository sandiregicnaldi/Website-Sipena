import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  User, Mail, MapPin, Calendar, Building2, Briefcase,
  Globe, FileText, Plus, Trash2, Save, Camera, ArrowLeft, Link as LinkIcon, Type, Hash, AlignLeft, Link2, CheckCircle, Download, PenTool
} from 'lucide-react';
import jsPDF from 'jspdf';
import './AuthorDashboard.css';

const AuthorDashboard = () => {
  const { user, updateProfile, logout, isAuthor, isAdmin } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  // Redirect if not logged in or is admin
  if (!user || isAdmin) {
    if (isAdmin) navigate('/admin');
    else navigate('/login');
    return null;
  }

  const [form, setForm] = useState({
    namaLengkap: user.namaLengkap || '',
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
    karyaEksternal: user.karyaEksternal || [],
    fotoProfil: user.fotoProfil || null,
  });

  const [newKarya, setNewKarya] = useState({ judul: '', penerbit: '', tahun: '', url: '' });
  
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

  const handleAjukanNaskah = (e) => {
    e.preventDefault();
    if(!naskahBaru.judul || !naskahBaru.linkDrive) return;
    setNaskahList(prev => [...prev, {
      id: Date.now(),
      judul: naskahBaru.judul,
      linkDrive: naskahBaru.linkDrive,
      tanggal: new Date().toISOString().split('T')[0],
      status: 'Menunggu',
      alasan: ''
    }]);
    setNaskahBaru({ judul: '', linkDrive: '' });
    alert('Naskah berhasil diajukan!');
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
              <button className={`dash-tab ${activeTab === 'naskah' ? 'active' : ''}`} onClick={() => setActiveTab('naskah')}>
                <FileText size={16} /> Pengajuan Naskah
              </button>
              <button className={`dash-tab ${activeTab === 'kegiatan' ? 'active' : ''}`} onClick={() => setActiveTab('kegiatan')}>
                <Calendar size={16} /> Kegiatan Saya
              </button>
              {isAuthor && (
                <button className={`dash-tab ${activeTab === 'karya' ? 'active' : ''}`} onClick={() => setActiveTab('karya')}>
                  <User size={16} /> Profil Penulis Publik
                </button>
              )}
              {!isAuthor && (
                <button className={`dash-tab ${activeTab === 'pengajuan-penulis' ? 'active' : ''}`} onClick={() => setActiveTab('pengajuan-penulis')}>
                  <CheckCircle size={16} /> Verifikasi Penulis
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

                  <button className="btn btn-primary" onClick={() => alert('Profil berhasil diperbarui!')} style={{ marginTop: '1rem' }}>
                    <Save size={16} /> Simpan Perubahan
                  </button>
                </div>
              </div>
            )}

            {/* ── TAB PENGAJUAN PENULIS ─────────────────────────────────── */}
            {activeTab === 'pengajuan-penulis' && (
              <div className="tab-panel">
                <div className="add-karya-section">
                  <h3>Pengajuan Verifikasi Penulis</h3>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                    Tingkatkan akun Anda menjadi Penulis Terverifikasi. Sebagai penulis, Anda dapat mempublikasikan karya eksternal di halaman utama SiPena dan berpartisipasi aktif dalam komunitas literasi Perpusnas Press.
                  </p>
                  
                  <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
                    <h4 style={{ marginBottom: '0.75rem', color: 'var(--text-primary)' }}>Syarat Menjadi Penulis:</h4>
                    <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <li>Pernah menerbitkan minimal satu buku fisik atau digital.</li>
                      <li>Data profil dan biodata (KTP, Alamat, dll) sudah dilengkapi dan benar.</li>
                      <li>Berkomitmen membagikan karya tulis yang orisinal dan tidak melanggar hak cipta.</li>
                    </ul>
                  </div>

                  <button 
                    className="btn btn-primary" 
                    onClick={() => alert('Pengajuan verifikasi berhasil dikirim! Admin akan segera memproses permintaan Anda.')}
                    style={{ padding: '0.75rem 1.5rem' }}
                  >
                    <CheckCircle size={18} /> Ajukan Diri Sebagai Penulis
                  </button>
                </div>
              </div>
            )}

            {/* ── TAB PENGUJUAN NASKAH ─────────────────────────────────── */}
            {activeTab === 'naskah' && (
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
                <p className="tab-desc">Lengkapi profil publik Anda yang akan ditampilkan di halaman detail penulis bagi pengunjung website.</p>

                <div className="form-section" style={{ marginBottom: '2rem' }}>
                  <div className="form-group">
                    <label>Foto Profil Publik</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      {form.fotoProfil ? (
                        <img src={form.fotoProfil} alt="Foto Profil" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <User size={24} color="#94a3b8" />
                        </div>
                      )}
                      <button className="btn btn-outline" onClick={() => fileInputRef.current.click()} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Camera size={16} /> Unggah Foto Baru
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Biografi Singkat</label>
                    <div className="input-with-icon textarea-container">
                      <FileText size={18} className="input-icon textarea-icon" />
                      <textarea name="bio" value={form.bio} onChange={handleChange} rows="4" placeholder="Ceritakan latar belakang, pengalaman menulis, dan hal menarik lainnya tentang Anda..."></textarea>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Website / Portofolio (Opsional)</label>
                    <div className="input-with-icon">
                      <Globe size={18} className="input-icon" />
                      <input type="text" name="website" value={form.website} onChange={handleChange} placeholder="https://namasaya.com atau link media sosial" />
                    </div>
                  </div>

                  <button className="btn btn-primary" onClick={handleSave}>
                    <Save size={16} /> Simpan Profil Publik
                  </button>
                </div>

                <h3 className="section-title-sm">Karya di Penerbit Lain</h3>
                <p className="tab-desc" style={{ marginTop: '-0.5rem', marginBottom: '1rem' }}>Tambahkan karya-karya Anda yang diterbitkan di luar Perpusnas Press beserta tautan pembelian atau aksesnya.</p>

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
