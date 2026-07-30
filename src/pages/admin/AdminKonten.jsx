import React, { useState } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { CheckCircle, Image, Layout, Edit, Trash2, Plus, Save, Compass, Target, BarChart2, History, Users, MapPin, HelpCircle, BookMarked, FileText, Upload, ClipboardCheck, MessageSquare, BookOpen, Package, Award, Globe, DollarSign, Shield, ChevronDown, ChevronUp } from 'lucide-react';
import { usePanduan } from '../../context/PanduanContext';
import './AdminLayout.css';

// ── Toast ──────────────────────────────────────────────────────────────────
const Toast = ({ msg, onClose }) => (
  <div style={{
    position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999,
    background: '#0f172a', color: 'white', padding: '1rem 1.5rem',
    borderRadius: '0.75rem', boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
    display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '280px'
  }}>
    <CheckCircle size={18} color="#10b981" />
    <span style={{ flex: 1, fontSize: '0.9rem' }}>{msg}</span>
    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.1rem' }}>×</button>
  </div>
);

// ── Banner / Hero ───────────────────────────────────────────────────────────
const EMPTY_BANNER = { kategori: '', judul: '', subjudul: '', deskripsi: '', btn1Label: 'Baca Sekarang', btn1Url: '', btn2Label: 'Unduh PDF', btn2Url: '' };

const BannerEditor = () => {
  const [banners, setBanners] = useState([
    { id: 1, kategori: 'BUDAYA · ENSIKLOPEDIA', judul: 'SERAT CENTHINI', subjudul: 'Ensiklopedia Budaya Jawa', deskripsi: 'Mahakarya sastra Jawa yang merangkum pengetahuan, kepercayaan, dan adat istiadat masyarakat Jawa secara lengkap.', btn1Label: 'Baca Sekarang', btn1Url: '#', btn2Label: 'Unduh PDF', btn2Url: '#', aktif: true },
    { id: 2, kategori: 'TEKNOLOGI', judul: 'Literasi Digital 2026', subjudul: 'Membangun Masyarakat Cerdas Informasi', deskripsi: 'Panduan dan wawasan terbaru seputar dunia literasi digital di era transformasi kecerdasan buatan.', btn1Label: 'Selengkapnya', btn1Url: '#', btn2Label: '', btn2Url: '', aktif: true },
  ]);
  const [toast, setToast] = useState('');
  const [modal, setModal] = useState(null); // { mode: 'edit' | 'tambah', data: {} }
  const [nextId, setNextId] = useState(3);
  
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const handleToggle = (id) => {
    setBanners(prev => prev.map(b => b.id === id ? { ...b, aktif: !b.aktif } : b));
    const b = banners.find(x => x.id === id);
    showToast(`Banner "${b.judul}" berhasil ${b.aktif ? 'dinonaktifkan' : 'diaktifkan'}.`);
  };
  const handleSaveEdit = (form) => {
    if (modal.mode === 'edit') {
      setBanners(prev => prev.map(b => b.id === form.id ? { ...form } : b));
      showToast(`Banner "${form.judul}" berhasil disimpan.`);
    } else {
      setBanners(prev => [...prev, { ...form, id: nextId, aktif: true }]);
      setNextId(n => n + 1);
      showToast(`Banner "${form.judul}" berhasil ditambahkan.`);
    }
    setModal(null);
  };
  const handleHapus = (id) => {
    if(window.confirm('Hapus banner ini?')) {
      setBanners(prev => prev.filter(b => b.id !== id));
      showToast('Banner berhasil dihapus.');
    }
  };

  const inputStyle = { width: '100%', padding: '0.55rem 0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', background: 'var(--bg-primary)', color: 'var(--text-primary)', boxSizing: 'border-box' };
  const labelStyle = { display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' };

  return (
    <div>
      <div className="admin-page-header">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Image size={24} color="var(--accent-color)" /> Banner / Hero
        </h1>
        <p>Kelola gambar dan teks banner utama halaman beranda SiPena.</p>
      </div>
      <div className="admin-card">
        <div className="admin-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="admin-card-title">Daftar Banner Aktif</span>
          <button className="btn btn-primary" onClick={() => setModal({ mode: 'tambah', data: EMPTY_BANNER })}>+ Tambah Banner</button>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>#</th><th>Info Banner</th><th>Deskripsi</th><th>Tombol Aksi</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody>
              {banners.map((b, i) => (
                <tr key={b.id}>
                  <td style={{ color: 'var(--text-tertiary)' }}>{i + 1}</td>
                  <td>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{b.kategori}</div>
                    <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1rem', marginTop: '0.2rem' }}>{b.judul}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{b.subjudul}</div>
                  </td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', maxWidth: '250px' }}>{b.deskripsi}</td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      {b.btn1Label && <span className="badge badge-gray">{b.btn1Label}</span>}
                      {b.btn2Label && <span className="badge badge-gray">{b.btn2Label}</span>}
                    </div>
                  </td>
                  <td><span className={`badge ${b.aktif ? 'badge-green' : 'badge-red'}`}>{b.aktif ? 'Aktif' : 'Nonaktif'}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <button onClick={() => setModal({ mode: 'edit', data: { ...b } })} style={{ background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}><Edit size={12} /> Edit</button>
                      <button onClick={() => handleToggle(b.id)} style={{ background: 'none', border: 'none', color: b.aktif ? 'var(--danger)' : '#059669', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>{b.aktif ? 'Nonaktifkan' : 'Aktifkan'}</button>
                      <button onClick={() => handleHapus(b.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}><Trash2 size={12} /> Hapus</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {modal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', overflowY: 'auto' }}>
          <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '700px', margin: 'auto', overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ background: 'linear-gradient(135deg,#1e3a8a,#2563eb)', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ color: 'white', margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {modal.mode === 'edit' ? <Edit size={16} /> : <Plus size={16} />} {modal.mode === 'edit' ? 'Edit Banner' : 'Tambah Banner'}
              </h3>
              <button onClick={() => setModal(null)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: '1rem' }}>×</button>
            </div>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                <div><label style={labelStyle}>Kategori</label><input style={inputStyle} value={modal.data.kategori} onChange={e => setModal(p => ({ ...p, data: { ...p.data, kategori: e.target.value } }))} placeholder="Misal: BUDAYA • ENSIKLOPEDIA" /></div>
                <div><label style={labelStyle}>Judul Besar</label><input style={inputStyle} value={modal.data.judul} onChange={e => setModal(p => ({ ...p, data: { ...p.data, judul: e.target.value } }))} placeholder="Misal: SERAT CENTHINI" /></div>
              </div>
              
              <div><label style={labelStyle}>Subjudul / Nama Penulis</label><input style={inputStyle} value={modal.data.subjudul} onChange={e => setModal(p => ({ ...p, data: { ...p.data, subjudul: e.target.value } }))} placeholder="Misal: Ensiklopedia Budaya Jawa" /></div>
              
              <div><label style={labelStyle}>Deskripsi Singkat</label><textarea rows="3" style={{ ...inputStyle, resize: 'vertical' }} value={modal.data.deskripsi} onChange={e => setModal(p => ({ ...p, data: { ...p.data, deskripsi: e.target.value } }))} placeholder="Mahakarya sastra Jawa yang merangkum..." /></div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <div>
                  <label style={labelStyle}>Tombol 1 (Label & URL)</label>
                  <input style={{ ...inputStyle, marginBottom: '0.5rem' }} value={modal.data.btn1Label} onChange={e => setModal(p => ({ ...p, data: { ...p.data, btn1Label: e.target.value } }))} placeholder="Teks Tombol (Mis: Baca Sekarang)" />
                  <input style={inputStyle} value={modal.data.btn1Url} onChange={e => setModal(p => ({ ...p, data: { ...p.data, btn1Url: e.target.value } }))} placeholder="URL Tautan" />
                </div>
                <div>
                  <label style={labelStyle}>Tombol 2 (Label & URL)</label>
                  <input style={{ ...inputStyle, marginBottom: '0.5rem' }} value={modal.data.btn2Label} onChange={e => setModal(p => ({ ...p, data: { ...p.data, btn2Label: e.target.value } }))} placeholder="Teks Tombol (Mis: Unduh PDF)" />
                  <input style={inputStyle} value={modal.data.btn2Url} onChange={e => setModal(p => ({ ...p, data: { ...p.data, btn2Url: e.target.value } }))} placeholder="URL Tautan" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Upload Gambar Background</label>
                  <input type="file" accept="image/*" style={inputStyle} />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Rasio 16:9 atau lebar penuh.</span>
                </div>
                <div>
                  <label style={labelStyle}>Upload Gambar Sampul Buku (Kanan)</label>
                  <input type="file" accept="image/*" style={inputStyle} />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Gambar proporsi buku portrait.</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button className="btn btn-outline" onClick={() => setModal(null)}>Batal</button>
                <button className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }} onClick={() => handleSaveEdit(modal.data)}>
                  <Save size={16} /> Simpan Banner
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {toast && <Toast msg={toast} onClose={() => setToast('')} />}
    </div>
  );
};

// ── Tentang Kami ────────────────────────────────────────────────────────────
import { useTentang } from '../../context/TentangContext';

const TentangEditor = () => {
  const { data, updateData, updateListItem, addListItem, removeListItem } = useTentang();
  const [toast, setToast]     = useState('');
  const [activeTab, setActiveTab] = useState('hero');
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const inputStyle = { width: '100%', padding: '0.55rem 0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', background: 'var(--bg-primary)', color: 'var(--text-primary)', boxSizing: 'border-box' };
  const labelStyle = { display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' };
  const sectionBox = { background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' };

  const TABS = [
    { key: 'hero',      label: 'Hero', icon: <Layout size={15} /> },
    { key: 'visimisi',  label: 'Visi & Misi', icon: <Target size={15} /> },
    { key: 'statistik', label: 'Statistik', icon: <BarChart2 size={15} /> },
    { key: 'sejarah',   label: 'Sejarah', icon: <History size={15} /> },
    { key: 'tim',       label: 'Tim', icon: <Users size={15} /> },
    { key: 'kontak',    label: 'Kontak', icon: <MapPin size={15} /> },
  ];

  return (
    <div>
      <div className="admin-page-header">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Layout size={24} color="var(--accent-color)" /> Tentang Kami
        </h1>
        <p>Edit seluruh konten halaman Tentang Perpusnas Press — hero, visi/misi, statistik, sejarah, tim, dan kontak.</p>
      </div>

      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`btn ${activeTab === t.key ? 'btn-primary' : 'btn-outline'}`}
            style={{ borderRadius: '2rem', padding: '0.4rem 1rem', fontSize: '0.85rem', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: HERO ── */}
      {activeTab === 'hero' && (
        <div className="admin-card">
          <div className="admin-card-header"><span className="admin-card-title">Konten Hero / Pembuka</span></div>
          <div style={{ ...sectionBox, margin: '0 1rem 1rem' }}>
            <div>
              <label style={labelStyle}>Judul (baris pertama)</label>
              <input style={inputStyle} value={data.heroJudul} onChange={e => updateData({ heroJudul: e.target.value })} placeholder="Mis: Perpusnas Press —" />
            </div>
            <div>
              <label style={labelStyle}>Subjudul (baris kedua, teks berwarna)</label>
              <input style={inputStyle} value={data.heroSubjudul} onChange={e => updateData({ heroSubjudul: e.target.value })} placeholder="Mis: Penerbit Resmi Perpustakaan Nasional RI" />
            </div>
            <div>
              <label style={labelStyle}>Deskripsi Pembuka</label>
              <textarea rows="3" style={{ ...inputStyle, resize: 'vertical' }} value={data.heroDeskripsi} onChange={e => updateData({ heroDeskripsi: e.target.value })} />
            </div>
            <button className="btn btn-primary" style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }} onClick={() => showToast('Konten Hero berhasil disimpan!')}><Save size={14} /> Simpan</button>
          </div>
        </div>
      )}

      {/* ── TAB: VISI & MISI ── */}
      {activeTab === 'visimisi' && (
        <div className="admin-card">
          <div className="admin-card-header"><span className="admin-card-title">Visi &amp; Misi</span></div>
          <div style={{ ...sectionBox, margin: '0 1rem 1rem' }}>
            <div>
              <label style={labelStyle}>Visi</label>
              <textarea rows="3" style={{ ...inputStyle, resize: 'vertical' }} value={data.visi} onChange={e => updateData({ visi: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Misi (tiap poin)</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {data.misi.map((m, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ color: 'var(--accent-color)', fontWeight: 700, minWidth: '1.2rem' }}>{i + 1}.</span>
                    <input style={{ ...inputStyle, flex: 1 }} value={m} onChange={e => updateListItem('misi', i, e.target.value.toString()) || updateData({ misi: data.misi.map((x, j) => j === i ? e.target.value : x) })} />
                    <button type="button" onClick={() => removeListItem('misi', i)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '1.1rem' }}>×</button>
                  </div>
                ))}
                <button className="btn btn-outline" style={{ alignSelf: 'flex-start', padding: '0.3rem 0.8rem', fontSize: '0.8rem' }} onClick={() => addListItem('misi', '')}>+ Tambah Poin Misi</button>
              </div>
            </div>
            <button className="btn btn-primary" style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }} onClick={() => showToast('Visi & Misi berhasil disimpan!')}><Save size={14} /> Simpan</button>
          </div>
        </div>
      )}

      {/* ── TAB: STATISTIK ── */}
      {activeTab === 'statistik' && (
        <div className="admin-card">
          <div className="admin-card-header">
            <span className="admin-card-title">Statistik Capaian</span>
            <button className="btn btn-primary" style={{ padding: '0.4rem 0.9rem', fontSize: '0.82rem' }}
              onClick={() => addListItem('statistik', { label: 'Label Baru', value: '0' })}>+ Tambah Statistik</button>
          </div>
          <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {data.statistik.map((s, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.75rem', alignItems: 'center', background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <div>
                  <label style={labelStyle}>Label</label>
                  <input style={inputStyle} value={s.label} onChange={e => updateListItem('statistik', i, { ...s, label: e.target.value })} placeholder="Mis: Judul Buku" />
                </div>
                <div>
                  <label style={labelStyle}>Nilai / Angka</label>
                  <input style={inputStyle} value={s.value} onChange={e => updateListItem('statistik', i, { ...s, value: e.target.value })} placeholder="Mis: 1.290+" />
                </div>
                <button type="button" onClick={() => removeListItem('statistik', i)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '1.3rem', marginTop: '1.2rem' }}>×</button>
              </div>
            ))}
            <button className="btn btn-primary" style={{ alignSelf: 'flex-start', marginTop: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }} onClick={() => showToast('Statistik berhasil disimpan!')}><Save size={14} /> Simpan</button>
          </div>
        </div>
      )}

      {/* ── TAB: SEJARAH / TIMELINE ── */}
      {activeTab === 'sejarah' && (
        <div className="admin-card">
          <div className="admin-card-header">
            <span className="admin-card-title">Timeline Sejarah</span>
            <button className="btn btn-primary" style={{ padding: '0.4rem 0.9rem', fontSize: '0.82rem' }}
              onClick={() => addListItem('timeline', { tahun: '', judul: '', deskripsi: '' })}>+ Tambah Periode</button>
          </div>
          <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {data.timeline.map((t, i) => (
              <div key={i} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr auto', gap: '0.75rem', alignItems: 'start' }}>
                  <div>
                    <label style={labelStyle}>Tahun</label>
                    <input style={inputStyle} value={t.tahun} onChange={e => updateListItem('timeline', i, { ...t, tahun: e.target.value })} placeholder="2026" />
                  </div>
                  <div>
                    <label style={labelStyle}>Judul Peristiwa</label>
                    <input style={inputStyle} value={t.judul} onChange={e => updateListItem('timeline', i, { ...t, judul: e.target.value })} placeholder="Mis: Pendirian Perpusnas Press" />
                  </div>
                  <button type="button" onClick={() => removeListItem('timeline', i)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '1.3rem', marginTop: '1.4rem' }}>×</button>
                </div>
                <div>
                  <label style={labelStyle}>Deskripsi</label>
                  <textarea rows="2" style={{ ...inputStyle, resize: 'vertical' }} value={t.deskripsi} onChange={e => updateListItem('timeline', i, { ...t, deskripsi: e.target.value })} />
                </div>
              </div>
            ))}
            <button className="btn btn-primary" style={{ alignSelf: 'flex-start', marginTop: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }} onClick={() => showToast('Timeline sejarah berhasil disimpan!')}><Save size={14} /> Simpan</button>
          </div>
        </div>
      )}

      {/* ── TAB: TIM ── */}
      {activeTab === 'tim' && (
        <div className="admin-card">
          <div className="admin-card-header">
            <span className="admin-card-title">Anggota Tim</span>
            <button className="btn btn-primary" style={{ padding: '0.4rem 0.9rem', fontSize: '0.82rem' }}
              onClick={() => addListItem('tim', { nama: '', jabatan: '', inisial: '' })}>+ Tambah Anggota</button>
          </div>
          <div style={{ padding: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
            {data.tim.map((t, i) => (
              <div key={i} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--accent-color)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1rem' }}>{t.inisial || '??'}</div>
                  <button type="button" onClick={() => removeListItem('tim', i)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '1.1rem' }}>×</button>
                </div>
                <div>
                  <label style={labelStyle}>Nama Lengkap</label>
                  <input style={inputStyle} value={t.nama} onChange={e => updateListItem('tim', i, { ...t, nama: e.target.value })} placeholder="Dr. Nama Lengkap" />
                </div>
                <div>
                  <label style={labelStyle}>Jabatan</label>
                  <input style={inputStyle} value={t.jabatan} onChange={e => updateListItem('tim', i, { ...t, jabatan: e.target.value })} placeholder="Kepala Bidang ..." />
                </div>
                <div>
                  <label style={labelStyle}>Inisial Avatar (2 huruf)</label>
                  <input style={{ ...inputStyle, textTransform: 'uppercase' }} maxLength={2} value={t.inisial} onChange={e => updateListItem('tim', i, { ...t, inisial: e.target.value.toUpperCase() })} placeholder="HK" />
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: '0 1rem 1rem' }}>
            <button className="btn btn-primary" style={{ marginTop: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }} onClick={() => showToast('Data tim berhasil disimpan!')}><Save size={14} /> Simpan</button>
          </div>
        </div>
      )}

      {/* ── TAB: KONTAK ── */}
      {activeTab === 'kontak' && (
        <div className="admin-card">
          <div className="admin-card-header"><span className="admin-card-title">Informasi Kontak</span></div>
          <div style={{ ...sectionBox, margin: '0 1rem 1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Nomor Telepon</label>
                <input style={inputStyle} value={data.telepon} onChange={e => updateData({ telepon: e.target.value })} />
              </div>
              <div>
                <label style={labelStyle}>Nomor Fax</label>
                <input style={inputStyle} value={data.fax} onChange={e => updateData({ fax: e.target.value })} />
              </div>
              <div>
                <label style={labelStyle}>Email Resmi</label>
                <input type="email" style={inputStyle} value={data.email} onChange={e => updateData({ email: e.target.value })} />
              </div>
              <div>
                <label style={labelStyle}>Email SiPena</label>
                <input type="email" style={inputStyle} value={data.emailSipena} onChange={e => updateData({ emailSipena: e.target.value })} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Alamat Lengkap</label>
              <textarea rows="3" style={{ ...inputStyle, resize: 'vertical' }} value={data.alamat} onChange={e => updateData({ alamat: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Jam Layanan</label>
              <textarea rows="2" style={{ ...inputStyle, resize: 'vertical' }} value={data.jamLayanan} onChange={e => updateData({ jamLayanan: e.target.value })} placeholder="Senin – Jumat: 08.00 – 16.00 WIB&#10;Sabtu – Minggu: Tutup" />
            </div>
            <button className="btn btn-primary" style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }} onClick={() => showToast('Informasi kontak berhasil disimpan!')}><Save size={14} /> Simpan</button>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast} onClose={() => setToast('')} />}
    </div>
  );
};

// ── FAQ Editor ──────────────────────────────────────────────────────────────
const FAQ_KATEGORI = ['Pendaftaran & Akun', 'Penerbitan Buku', 'Koleksi & Unduhan', 'Teknis & Sistem'];

const INITIAL_FAQS = [
  { id: 1, kategori: 'Koleksi & Unduhan', pertanyaan: 'Apakah semua buku bisa diunduh secara gratis?', jawaban: 'Ya, sebagian besar buku di SiPena dapat diunduh secara gratis. Namun beberapa konten premium mungkin memerlukan pendaftaran akun.' },
  { id: 2, kategori: 'Pendaftaran & Akun', pertanyaan: 'Bagaimana cara mendaftar sebagai penulis?', jawaban: 'Anda dapat mendaftar melalui menu "Daftar" dan memilih peran "Calon Penulis". Setelah itu, tim kami akan melakukan verifikasi.' },
  { id: 3, kategori: 'Koleksi & Unduhan', pertanyaan: 'Format file apa saja yang tersedia?', jawaban: 'Kami menyediakan format PDF, E-Pub, dan beberapa buku dalam format audiobook berbasis video YouTube.' },
  { id: 4, kategori: 'Penerbitan Buku', pertanyaan: 'Bagaimana cara mengajukan naskah buku?', jawaban: 'Login ke akun Anda, buka menu "Profil Saya", pilih tab "Naskah Saya", lalu isi formulir pengajuan naskah beserta tautan Google Drive.' },
];

const FAQEditor = () => {
  const [faqs, setFaqs] = useState(INITIAL_FAQS);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState('');
  const [nextId, setNextId] = useState(INITIAL_FAQS.length + 1);
  const [activeTab, setActiveTab] = useState('Semua');
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const inputStyle = { width: '100%', padding: '0.55rem 0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', background: 'var(--bg-primary)', color: 'var(--text-primary)', boxSizing: 'border-box' };
  const labelStyle = { display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' };

  const handleSave = (form) => {
    if (modal.mode === 'edit') {
      setFaqs(prev => prev.map(f => f.id === form.id ? form : f));
      showToast('FAQ berhasil diperbarui.');
    } else {
      setFaqs(prev => [...prev, { ...form, id: nextId }]);
      setNextId(n => n + 1);
      showToast('FAQ baru berhasil ditambahkan.');
    }
    setModal(null);
  };

  const handleHapus = (id) => {
    const faq = faqs.find(f => f.id === id);
    if (window.confirm(`Hapus FAQ: "${faq.pertanyaan}"?`)) {
      setFaqs(prev => prev.filter(f => f.id !== id));
      showToast('FAQ berhasil dihapus.');
    }
  };

  const filteredFaqs = activeTab === 'Semua' ? faqs : faqs.filter(f => f.kategori === activeTab);

  return (
    <div>
      <div className="admin-page-header">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <HelpCircle size={24} color="var(--accent-color)" /> FAQ
        </h1>
        <p>Tambah, ubah, atau hapus pertanyaan yang sering diajukan oleh pengunjung.</p>
      </div>
      
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        <button onClick={() => setActiveTab('Semua')} className={`btn ${activeTab === 'Semua' ? 'btn-primary' : 'btn-outline'}`} style={{ borderRadius: '2rem', padding: '0.5rem 1.25rem', whiteSpace: 'nowrap' }}>Semua</button>
        {FAQ_KATEGORI.map(cat => (
          <button key={cat} onClick={() => setActiveTab(cat)} className={`btn ${activeTab === cat ? 'btn-primary' : 'btn-outline'}`} style={{ borderRadius: '2rem', padding: '0.5rem 1.25rem', whiteSpace: 'nowrap' }}>{cat}</button>
        ))}
      </div>

      <div className="admin-card">
        <div className="admin-card-header">
          <span className="admin-card-title">Daftar FAQ ({filteredFaqs.length} pertanyaan)</span>
          <button className="btn btn-primary" style={{ padding: '0.45rem 1rem', fontSize: '0.875rem' }} onClick={() => setModal({ mode: 'tambah', data: { pertanyaan: '', jawaban: '', kategori: FAQ_KATEGORI[0] } })}>
            + Tambah FAQ
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem' }}>
          {filteredFaqs.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '2rem 0' }}>Tidak ada FAQ di kategori ini.</div>}
          {filteredFaqs.map((f, i) => (
            <div key={f.id} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1rem', background: 'var(--bg-secondary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--accent-color)', marginRight: '0.5rem' }}>Q{i + 1}.</span>{f.pertanyaan}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '0.5rem' }}>{f.jawaban}</div>
                  <span className="badge badge-gray">{f.kategori}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                  <button onClick={() => setModal({ mode: 'edit', data: { ...f } })} style={{ background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}><Edit size={12} /> Edit</button>
                  <button onClick={() => handleHapus(f.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}><Trash2 size={12} /> Hapus</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {modal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '540px', overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ background: 'linear-gradient(135deg,#1e3a8a,#2563eb)', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ color: 'white', margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {modal.mode === 'edit' ? <Edit size={16} /> : <Plus size={16} />} {modal.mode === 'edit' ? 'Edit FAQ' : 'Tambah FAQ Baru'}
              </h3>
              <button onClick={() => setModal(null)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: '1rem' }}>×</button>
            </div>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Kategori *</label>
                <select style={inputStyle} required value={modal.data.kategori || FAQ_KATEGORI[0]} onChange={e => setModal(p => ({ ...p, data: { ...p.data, kategori: e.target.value } }))}>
                  {FAQ_KATEGORI.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div><label style={labelStyle}>Pertanyaan *</label><input style={inputStyle} required value={modal.data.pertanyaan} onChange={e => setModal(p => ({ ...p, data: { ...p.data, pertanyaan: e.target.value } }))} placeholder="Tulis pertanyaan..." /></div>
              <div><label style={labelStyle}>Jawaban *</label><textarea style={{ ...inputStyle, minHeight: '120px', resize: 'vertical' }} required value={modal.data.jawaban} onChange={e => setModal(p => ({ ...p, data: { ...p.data, jawaban: e.target.value } }))} placeholder="Tulis jawaban lengkap..." /></div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button className="btn btn-outline" onClick={() => setModal(null)}>Batal</button>
                <button className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }} onClick={() => { if (modal.data.pertanyaan && modal.data.jawaban) handleSave(modal.data); }}>
                  <Save size={16} /> Simpan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {toast && <Toast msg={toast} onClose={() => setToast('')} />}
    </div>
  );
};

// ── Panduan Penerbitan Editor ─────────────────────────────────────────────
const PANDUAN_TAB_LIST = [
  { key: 'hero',       label: 'Hero / Intro' },
  { key: 'tatacara',  label: 'Tata Cara' },
  { key: 'keuntungan', label: 'Keuntungan' },
];

const ICON_OPTIONS = [
  'FileText','Upload','ClipboardCheck','MessageSquare','BookOpen','Package',
  'Award','Globe','BarChart2','DollarSign','Users','Shield','Target','Compass','MapPin',
];

const WARNA_OPTIONS = [
  { label: 'Biru',   value: '#2563eb' },
  { label: 'Hijau',  value: '#059669' },
  { label: 'Kuning', value: '#d97706' },
  { label: 'Ungu',   value: '#7c3aed' },
  { label: 'Merah Muda', value: '#db2777' },
  { label: 'Cyan',   value: '#0891b2' },
  { label: 'Merah',  value: '#dc2626' },
  { label: 'Coklat', value: '#92400e' },
];

const PanduanEditor = () => {
  const { data, updateData } = usePanduan();
  const [activeTab, setActiveTab] = useState('hero');
  const [toast, setToast] = useState('');
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const inputStyle = { width: '100%', padding: '0.55rem 0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', background: 'var(--bg-primary)', color: 'var(--text-primary)', boxSizing: 'border-box' };
  const labelStyle = { display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' };
  const sectionBox  = { display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' };

  // ── helpers langkah
  const updateLangkah = (i, patch) =>
    updateData({ langkah: data.langkah.map((l, idx) => idx === i ? { ...l, ...patch } : l) });
  const addLangkah = () =>
    updateData({ langkah: [...data.langkah, { id: Date.now(), icon: 'FileText', judul: '', deskripsi: '' }] });
  const removeLangkah = (i) =>
    updateData({ langkah: data.langkah.filter((_, idx) => idx !== i) });
  const moveLangkah = (i, dir) => {
    const arr = [...data.langkah];
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    updateData({ langkah: arr });
  };

  // ── helpers keuntungan
  const updateKeuntungan = (i, patch) =>
    updateData({ keuntungan: data.keuntungan.map((k, idx) => idx === i ? { ...k, ...patch } : k) });
  const addKeuntungan = () =>
    updateData({ keuntungan: [...data.keuntungan, { id: Date.now(), icon: 'Award', warna: '#2563eb', judul: '', deskripsi: '' }] });
  const removeKeuntungan = (i) =>
    updateData({ keuntungan: data.keuntungan.filter((_, idx) => idx !== i) });

  return (
    <div>
      <div className="admin-page-header">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <BookMarked size={24} color="var(--accent-color)" /> Panduan Penerbitan
        </h1>
        <p>Kelola konten halaman Panduan Menerbitkan Buku di sisi pengunjung.</p>
      </div>

      {/* Tab Bar */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {PANDUAN_TAB_LIST.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{
              padding: '0.5rem 1.2rem', borderRadius: '999px', border: 'none', cursor: 'pointer',
              fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s',
              background: activeTab === t.key ? 'var(--accent-color)' : 'var(--bg-secondary)',
              color: activeTab === t.key ? 'white' : 'var(--text-secondary)',
              boxShadow: activeTab === t.key ? '0 2px 8px rgba(37,99,235,0.35)' : 'var(--shadow-sm)',
            }}>{t.label}</button>
        ))}
      </div>

      {/* ── TAB: HERO ── */}
      {activeTab === 'hero' && (
        <div className="admin-card">
          <div className="admin-card-header"><span className="admin-card-title">Teks Hero / Intro Halaman</span></div>
          <div style={{ ...sectionBox, margin: '0 1rem 1rem' }}>
            <div>
              <label style={labelStyle}>Judul Utama Hero</label>
              <input style={inputStyle} value={data.heroJudul}
                onChange={e => updateData({ heroJudul: e.target.value })}
                placeholder="Mis: Terbitkan Karya Anda Bersama Perpusnas Press" />
              <p style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginTop: '0.3rem' }}>
                Teks &quot;Perpusnas Press&quot; di dalam judul akan otomatis ditampilkan dengan warna accent di halaman pengunjung.
              </p>
            </div>
            <div>
              <label style={labelStyle}>Paragraf Deskripsi Hero</label>
              <textarea rows="4" style={{ ...inputStyle, resize: 'vertical' }}
                value={data.heroDeskripsi}
                onChange={e => updateData({ heroDeskripsi: e.target.value })}
                placeholder="Deskripsi singkat tentang Perpusnas Press dan ajakan bagi penulis..." />
            </div>
            <button className="btn btn-primary"
              style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
              onClick={() => showToast('Konten Hero Panduan berhasil disimpan!')}>
              <Save size={14} /> Simpan
            </button>
          </div>
        </div>
      )}

      {/* ── TAB: TATA CARA ── */}
      {activeTab === 'tatacara' && (
        <div className="admin-card">
          <div className="admin-card-header">
            <span className="admin-card-title">Langkah Tata Cara Menerbitkan Buku</span>
            <button className="btn btn-primary" style={{ padding: '0.4rem 0.9rem', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
              onClick={addLangkah}><Plus size={14} /> Tambah Langkah</button>
          </div>
          <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {data.langkah.map((step, i) => (
              <div key={step.id} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#2563eb,#60a5fa)', color: 'white', fontWeight: 800, fontSize: '0.85rem', flexShrink: 0 }}>{i + 1}</div>
                  <div style={{ display: 'flex', gap: '0.3rem', marginLeft: 'auto' }}>
                    <button onClick={() => moveLangkah(i, -1)} title="Naik" style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronUp size={14} /></button>
                    <button onClick={() => moveLangkah(i,  1)} title="Turun" style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronDown size={14} /></button>
                    <button onClick={() => removeLangkah(i)} title="Hapus" style={{ background: 'none', border: '1px solid #fca5a5', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={13} /></button>
                  </div>
                </div>
                {/* Fields */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: '0.75rem' }}>
                  <div>
                    <label style={labelStyle}>Judul Langkah *</label>
                    <input style={inputStyle} value={step.judul} onChange={e => updateLangkah(i, { judul: e.target.value })} placeholder="Mis: Persiapkan Naskah" />
                  </div>
                  <div>
                    <label style={labelStyle}>Ikon</label>
                    <select style={inputStyle} value={step.icon} onChange={e => updateLangkah(i, { icon: e.target.value })}>
                      {ICON_OPTIONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Deskripsi Langkah *</label>
                  <textarea rows="3" style={{ ...inputStyle, resize: 'vertical' }}
                    value={step.deskripsi} onChange={e => updateLangkah(i, { deskripsi: e.target.value })}
                    placeholder="Jelaskan langkah ini secara singkat dan jelas..." />
                </div>
              </div>
            ))}
            {data.langkah.length === 0 && (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>Belum ada langkah. Klik &quot;Tambah Langkah&quot; untuk menambahkan.</div>
            )}
            <button className="btn btn-primary"
              style={{ alignSelf: 'flex-start', marginTop: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
              onClick={() => showToast('Data Tata Cara berhasil disimpan!')}>
              <Save size={14} /> Simpan Semua Langkah
            </button>
          </div>
        </div>
      )}

      {/* ── TAB: KEUNTUNGAN ── */}
      {activeTab === 'keuntungan' && (
        <div className="admin-card">
          <div className="admin-card-header">
            <span className="admin-card-title">Keuntungan Menerbitkan di Perpusnas Press</span>
            <button className="btn btn-primary" style={{ padding: '0.4rem 0.9rem', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
              onClick={addKeuntungan}><Plus size={14} /> Tambah Keuntungan</button>
          </div>
          <div style={{ padding: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
            {data.keuntungan.map((benefit, i) => (
              <div key={benefit.id} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* Preview swatch + remove */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: `${benefit.warna}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: benefit.warna, fontWeight: 800, fontSize: '0.8rem' }}>{i + 1}</span>
                  </div>
                  <button onClick={() => removeKeuntungan(i)} style={{ background: 'none', border: '1px solid #fca5a5', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={13} /></button>
                </div>
                {/* Fields */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                  <div>
                    <label style={labelStyle}>Ikon</label>
                    <select style={inputStyle} value={benefit.icon} onChange={e => updateKeuntungan(i, { icon: e.target.value })}>
                      {ICON_OPTIONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Warna Aksen</label>
                    <select style={inputStyle} value={benefit.warna} onChange={e => updateKeuntungan(i, { warna: e.target.value })}>
                      {WARNA_OPTIONS.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Judul Keuntungan *</label>
                  <input style={inputStyle} value={benefit.judul} onChange={e => updateKeuntungan(i, { judul: e.target.value })} placeholder="Mis: Distribusi Nasional" />
                </div>
                <div>
                  <label style={labelStyle}>Deskripsi *</label>
                  <textarea rows="3" style={{ ...inputStyle, resize: 'vertical' }}
                    value={benefit.deskripsi} onChange={e => updateKeuntungan(i, { deskripsi: e.target.value })}
                    placeholder="Jelaskan keuntungan ini bagi penulis..." />
                </div>
              </div>
            ))}
            {data.keuntungan.length === 0 && (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)', fontSize: '0.9rem', gridColumn: '1/-1' }}>Belum ada keuntungan. Klik &quot;Tambah Keuntungan&quot; untuk menambahkan.</div>
            )}
          </div>
          <div style={{ padding: '0 1rem 1rem' }}>
            <button className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
              onClick={() => showToast('Data Keuntungan berhasil disimpan!')}>
              <Save size={14} /> Simpan Semua Keuntungan
            </button>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast} onClose={() => setToast('')} />}
    </div>
  );
};

// ── Index Konten ─────────────────────────────────────────────────────────────
const CONTENT_ITEMS = [
  { icon: <Image size={24} color="#2563eb" />, title: 'Banner / Hero',        desc: 'Kelola gambar dan teks banner utama halaman beranda.', path: '/admin/konten/banner',  color: '#2563eb' },
  { icon: <Layout size={24} color="#059669" />, title: 'Tentang Kami',        desc: 'Edit konten halaman Tentang Perpusnas Press, visi, misi, dan sejarah.', path: '/admin/konten/tentang', color: '#059669' },
  { icon: <BookMarked size={24} color="#7c3aed" />, title: 'Panduan Penerbitan', desc: 'Kelola tata cara dan keuntungan menerbitkan buku di Perpusnas Press.', path: '/admin/konten/panduan',  color: '#7c3aed' },
  { icon: <HelpCircle size={24} color="#d97706" />, title: 'FAQ',             desc: 'Tambah, ubah, atau hapus pertanyaan yang sering diajukan pengunjung.', path: '/admin/konten/faq',    color: '#d97706' },
];

const KontenIndex = () => (
  <div>
    <div className="admin-page-header">
      <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Layout size={24} color="var(--accent-color)" /> Konten Web
      </h1>
      <p>Kelola seluruh konten yang tampil di halaman publik website SiPena.</p>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: '1rem' }}>
      {CONTENT_ITEMS.map(item => (
        <Link to={item.path} key={item.path} style={{ textDecoration: 'none' }}>
          <div
            className="admin-card"
            style={{ cursor: 'pointer', transition: 'all 0.2s', borderTop: `3px solid ${item.color}` }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
          >
            <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center' }}>{item.icon}</div>
            <div style={{ fontWeight: 700, marginBottom: '0.3rem', color: 'var(--text-primary)' }}>{item.title}</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{item.desc}</div>
          </div>
        </Link>
      ))}
    </div>
  </div>
);

const AdminKonten = () => (
  <Routes>
    <Route index         element={<KontenIndex />} />
    <Route path="banner"  element={<BannerEditor />} />
    <Route path="tentang" element={<TentangEditor />} />
    <Route path="panduan" element={<PanduanEditor />} />
    <Route path="faq"     element={<FAQEditor />} />
  </Routes>
);

export default AdminKonten;
