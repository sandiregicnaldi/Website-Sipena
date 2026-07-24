import React, { useState } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import './AdminLayout.css';

// ── Toast ──────────────────────────────────────────────────────────────────
const Toast = ({ msg, onClose }) => (
  <div style={{
    position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999,
    background: '#0f172a', color: 'white', padding: '1rem 1.5rem',
    borderRadius: '0.75rem', boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
    display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '280px'
  }}>
    <span style={{ fontSize: '1.2rem' }}>✅</span>
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
      <div className="admin-page-header"><h1>🖼️ Banner / Hero</h1><p>Kelola gambar dan teks banner utama halaman beranda SiPena.</p></div>
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
                      <button onClick={() => setModal({ mode: 'edit', data: { ...b } })} style={{ background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>✏️ Edit</button>
                      <button onClick={() => handleToggle(b.id)} style={{ background: 'none', border: 'none', color: b.aktif ? 'var(--danger)' : '#059669', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>{b.aktif ? '⏸ Nonaktifkan' : '▶ Aktifkan'}</button>
                      <button onClick={() => handleHapus(b.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>🗑️ Hapus</button>
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
              <h3 style={{ color: 'white', margin: 0, fontSize: '1rem' }}>{modal.mode === 'edit' ? '✏️ Edit Banner' : '➕ Tambah Banner'}</h3>
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
                <button className="btn btn-primary" onClick={() => handleSaveEdit(modal.data)}>💾 Simpan Banner</button>
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
const TentangEditor = () => {
  const [form, setForm] = useState({
    judul: 'Perpusnas Press',
    deskripsi: 'Perpusnas Press adalah unit penerbitan resmi Perpustakaan Nasional Republik Indonesia. Kami berkomitmen untuk menerbitkan karya-karya berkualitas tinggi yang berkontribusi pada perkembangan ilmu pengetahuan dan kebudayaan Indonesia.',
    visi: 'Menjadi penerbit terkemuka yang menghasilkan karya berkualitas tinggi untuk mencerdaskan bangsa.',
    misi: '1. Menerbitkan karya ilmiah dan populer yang berkualitas\n2. Mendukung pengembangan budaya literasi\n3. Memfasilitasi penulis Indonesia untuk berkarya\n4. Menjadi referensi terpercaya bagi masyarakat',
    telepon: '(021) 3924548',
    email: 'perpusnas@perpusnas.go.id',
    alamat: 'Jl. Salemba Raya No. 28A, Jakarta Pusat 10430',
  });
  const [toast, setToast] = useState('');
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const inputStyle = { width: '100%', padding: '0.55rem 0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', background: 'var(--bg-primary)', color: 'var(--text-primary)', boxSizing: 'border-box' };
  const labelStyle = { display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' };

  return (
    <div>
      <div className="admin-page-header"><h1>ℹ️ Tentang Kami</h1><p>Edit konten halaman Tentang Perpusnas Press, visi, misi, dan informasi kontak.</p></div>
      <div className="admin-grid-2">
        <div className="admin-card">
          <div className="admin-card-header"><span className="admin-card-title">Identitas Lembaga</span></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div><label style={labelStyle}>Nama Lembaga</label><input style={inputStyle} value={form.judul} onChange={e => setForm(p => ({ ...p, judul: e.target.value }))} /></div>
            <div><label style={labelStyle}>Deskripsi Singkat</label><textarea style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }} value={form.deskripsi} onChange={e => setForm(p => ({ ...p, deskripsi: e.target.value }))} /></div>
            <div><label style={labelStyle}>Visi</label><textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} value={form.visi} onChange={e => setForm(p => ({ ...p, visi: e.target.value }))} /></div>
            <div><label style={labelStyle}>Misi (satu per baris)</label><textarea style={{ ...inputStyle, minHeight: '120px', resize: 'vertical' }} value={form.misi} onChange={e => setForm(p => ({ ...p, misi: e.target.value }))} /></div>
          </div>
        </div>
        <div className="admin-card">
          <div className="admin-card-header"><span className="admin-card-title">Informasi Kontak</span></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div><label style={labelStyle}>Nomor Telepon</label><input style={inputStyle} value={form.telepon} onChange={e => setForm(p => ({ ...p, telepon: e.target.value }))} /></div>
            <div><label style={labelStyle}>Email Resmi</label><input type="email" style={inputStyle} value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
            <div><label style={labelStyle}>Alamat Lengkap</label><textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} value={form.alamat} onChange={e => setForm(p => ({ ...p, alamat: e.target.value }))} /></div>
            <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} onClick={() => showToast('Konten Tentang Kami berhasil disimpan!')}>
              💾 Simpan Semua Perubahan
            </button>
          </div>
        </div>
      </div>
      {toast && <Toast msg={toast} onClose={() => setToast('')} />}
    </div>
  );
};

// ── FAQ Editor ──────────────────────────────────────────────────────────────
const INITIAL_FAQS = [
  { id: 1, pertanyaan: 'Apakah semua buku bisa diunduh secara gratis?', jawaban: 'Ya, sebagian besar buku di SiPena dapat diunduh secara gratis. Namun beberapa konten premium mungkin memerlukan pendaftaran akun.' },
  { id: 2, pertanyaan: 'Bagaimana cara mendaftar sebagai penulis?', jawaban: 'Anda dapat mendaftar melalui menu "Daftar" dan memilih peran "Calon Penulis". Setelah itu, tim kami akan melakukan verifikasi.' },
  { id: 3, pertanyaan: 'Format file apa saja yang tersedia?', jawaban: 'Kami menyediakan format PDF, E-Pub, dan beberapa buku dalam format audiobook berbasis video YouTube.' },
  { id: 4, pertanyaan: 'Bagaimana cara mengajukan naskah buku?', jawaban: 'Login ke akun Anda, buka menu "Profil Saya", pilih tab "Naskah Saya", lalu isi formulir pengajuan naskah beserta tautan Google Drive.' },
];

const FAQEditor = () => {
  const [faqs, setFaqs] = useState(INITIAL_FAQS);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState('');
  const [nextId, setNextId] = useState(INITIAL_FAQS.length + 1);
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

  return (
    <div>
      <div className="admin-page-header"><h1>❓ FAQ</h1><p>Tambah, ubah, atau hapus pertanyaan yang sering diajukan oleh pengunjung.</p></div>
      <div className="admin-card">
        <div className="admin-card-header">
          <span className="admin-card-title">Daftar FAQ ({faqs.length} pertanyaan)</span>
          <button className="btn btn-primary" style={{ padding: '0.45rem 1rem', fontSize: '0.875rem' }} onClick={() => setModal({ mode: 'tambah', data: { pertanyaan: '', jawaban: '' } })}>
            + Tambah FAQ
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem' }}>
          {faqs.map((f, i) => (
            <div key={f.id} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1rem', background: 'var(--bg-secondary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--accent-color)', marginRight: '0.5rem' }}>Q{i + 1}.</span>{f.pertanyaan}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.6 }}>{f.jawaban}</div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                  <button onClick={() => setModal({ mode: 'edit', data: { ...f } })} style={{ background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>✏️ Edit</button>
                  <button onClick={() => handleHapus(f.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>🗑️</button>
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
              <h3 style={{ color: 'white', margin: 0, fontSize: '1rem' }}>{modal.mode === 'edit' ? '✏️ Edit FAQ' : '➕ Tambah FAQ Baru'}</h3>
              <button onClick={() => setModal(null)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: '1rem' }}>×</button>
            </div>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div><label style={labelStyle}>Pertanyaan *</label><input style={inputStyle} required value={modal.data.pertanyaan} onChange={e => setModal(p => ({ ...p, data: { ...p.data, pertanyaan: e.target.value } }))} placeholder="Tulis pertanyaan..." /></div>
              <div><label style={labelStyle}>Jawaban *</label><textarea style={{ ...inputStyle, minHeight: '120px', resize: 'vertical' }} required value={modal.data.jawaban} onChange={e => setModal(p => ({ ...p, data: { ...p.data, jawaban: e.target.value } }))} placeholder="Tulis jawaban lengkap..." /></div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button className="btn btn-outline" onClick={() => setModal(null)}>Batal</button>
                <button className="btn btn-primary" onClick={() => { if (modal.data.pertanyaan && modal.data.jawaban) handleSave(modal.data); }}>💾 Simpan</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {toast && <Toast msg={toast} onClose={() => setToast('')} />}
    </div>
  );
};

// ── Index Konten ─────────────────────────────────────────────────────────────
const CONTENT_ITEMS = [
  { icon: '🖼️', title: 'Banner / Hero',  desc: 'Kelola gambar dan teks banner utama halaman beranda.', path: '/admin/konten/banner', color: '#2563eb' },
  { icon: 'ℹ️', title: 'Tentang Kami',  desc: 'Edit konten halaman Tentang Perpusnas Press, visi, misi, dan sejarah.', path: '/admin/konten/tentang', color: '#059669' },
  { icon: '❓', title: 'FAQ',           desc: 'Tambah, ubah, atau hapus pertanyaan yang sering diajukan pengunjung.', path: '/admin/konten/faq', color: '#d97706' },
];

const KontenIndex = () => (
  <div>
    <div className="admin-page-header"><h1>🖥️ Konten Web</h1><p>Kelola seluruh konten yang tampil di halaman publik website SiPena.</p></div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: '1rem' }}>
      {CONTENT_ITEMS.map(item => (
        <Link to={item.path} key={item.path} style={{ textDecoration: 'none' }}>
          <div
            className="admin-card"
            style={{ cursor: 'pointer', transition: 'all 0.2s', borderTop: `3px solid ${item.color}` }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
          >
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{item.icon}</div>
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
    <Route path="faq"     element={<FAQEditor />} />
  </Routes>
);

export default AdminKonten;
