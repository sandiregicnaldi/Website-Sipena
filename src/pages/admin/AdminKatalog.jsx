import React, { useState } from 'react';
import './AdminLayout.css';

const KATEGORI_LIST = ['Sejarah', 'Pedoman', 'Teknologi', 'Manuskrip', 'Manajemen', 'Sastra', 'Ilmiah', 'Lainnya'];
const STATUS_LIST = ['Terbit', 'Proses', 'Review'];

const INITIAL_BOOKS = [
  { id: 1, judul: 'Sejarah Perpustakaan Nasional RI',   penulis: 'Dr. Ahmad Fauzi',    kategori: 'Sejarah',   tahun: 2026, isbn: '978-602-xxx-001', status: 'Terbit' },
  { id: 2, judul: 'Pedoman Katalogisasi Perpustakaan',  penulis: 'Dra. Siti Rahayu',   kategori: 'Pedoman',   tahun: 2026, isbn: '978-602-xxx-002', status: 'Terbit' },
  { id: 3, judul: 'Literasi Informasi di Era Digital',  penulis: 'Prof. Budi Santoso', kategori: 'Teknologi', tahun: 2026, isbn: '978-602-xxx-003', status: 'Proses' },
  { id: 4, judul: 'Naskah Nusantara: Koleksi Pilihan',  penulis: 'Drs. Hendra Wijaya', kategori: 'Manuskrip', tahun: 2025, isbn: '978-602-xxx-004', status: 'Review' },
  { id: 5, judul: 'Manajemen Arsip Modern',             penulis: 'Dr. Rina Dewi',      kategori: 'Manajemen', tahun: 2025, isbn: '978-602-xxx-005', status: 'Terbit' },
];

const STATUS_BADGE = { 'Terbit': 'badge-green', 'Proses': 'badge-amber', 'Review': 'badge-blue' };

const EMPTY_FORM = { judul: '', penulis: '', kategori: 'Sejarah', tahun: new Date().getFullYear(), isbn: '', status: 'Proses' };

// ── Toast Notification ──────────────────────────────────────────────────────
const Toast = ({ msg, onClose }) => (
  <div style={{
    position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999,
    background: '#0f172a', color: 'white', padding: '1rem 1.5rem',
    borderRadius: '0.75rem', boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
    display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '280px',
    animation: 'slideUp 0.3s ease'
  }}>
    <span style={{ fontSize: '1.2rem' }}>✅</span>
    <span style={{ flex: 1, fontSize: '0.9rem' }}>{msg}</span>
    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.1rem' }}>×</button>
  </div>
);

// ── Modal Form Buku ─────────────────────────────────────────────────────────
const ModalBuku = ({ data, onSave, onClose }) => {
  const [form, setForm] = useState(data || EMPTY_FORM);
  const isEdit = !!data?.id;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  const inputStyle = {
    width: '100%', padding: '0.55rem 0.75rem', border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-md)', fontSize: '0.875rem',
    background: 'var(--bg-primary)', color: 'var(--text-primary)', boxSizing: 'border-box'
  };
  const labelStyle = { display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' };

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
    }}>
      <div style={{
        background: 'white', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '540px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.25)', overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#1e3a8a,#2563eb)', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ color: 'white', margin: 0, fontSize: '1rem' }}>{isEdit ? '✏️ Edit Data Buku' : '➕ Tambah Buku Baru'}</h3>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: '1rem' }}>×</button>
        </div>
        {/* Body */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Judul Buku *</label>
            <input style={inputStyle} required value={form.judul} onChange={e => setForm(p => ({ ...p, judul: e.target.value }))} placeholder="Judul lengkap buku" />
          </div>
          <div>
            <label style={labelStyle}>Nama Penulis *</label>
            <input style={inputStyle} required value={form.penulis} onChange={e => setForm(p => ({ ...p, penulis: e.target.value }))} placeholder="Nama penulis/pengarang" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Kategori *</label>
              <select style={{ ...inputStyle }} required value={form.kategori} onChange={e => setForm(p => ({ ...p, kategori: e.target.value }))}>
                {KATEGORI_LIST.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Tahun Terbit *</label>
              <input style={inputStyle} type="number" required min="1900" max="2100" value={form.tahun} onChange={e => setForm(p => ({ ...p, tahun: Number(e.target.value) }))} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>ISBN</label>
              <input style={inputStyle} value={form.isbn} onChange={e => setForm(p => ({ ...p, isbn: e.target.value }))} placeholder="978-602-xxx-xxx" />
            </div>
            <div>
              <label style={labelStyle}>Status *</label>
              <select style={{ ...inputStyle }} required value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                {STATUS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button type="button" onClick={onClose} className="btn btn-outline">Batal</button>
            <button type="submit" className="btn btn-primary">{isEdit ? '💾 Simpan Perubahan' : '➕ Tambah Buku'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── AdminKatalog ────────────────────────────────────────────────────────────
const AdminKatalog = () => {
  const [books, setBooks] = useState(INITIAL_BOOKS);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // null | { mode: 'tambah'|'edit', data: obj }
  const [toast, setToast] = useState('');
  const [nextId, setNextId] = useState(INITIAL_BOOKS.length + 1);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const filtered = books.filter(b =>
    b.judul.toLowerCase().includes(search.toLowerCase()) ||
    b.penulis.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenTambah = () => setModal({ mode: 'tambah', data: null });
  const handleOpenEdit = (book) => setModal({ mode: 'edit', data: { ...book } });

  const handleHapus = (id) => {
    const book = books.find(b => b.id === id);
    if (window.confirm(`Apakah Anda yakin ingin menghapus buku "${book.judul}"?\n\nTindakan ini tidak dapat dibatalkan.`)) {
      setBooks(prev => prev.filter(b => b.id !== id));
      showToast(`Buku "${book.judul}" berhasil dihapus.`);
    }
  };

  const handleSave = (formData) => {
    if (modal.mode === 'edit') {
      setBooks(prev => prev.map(b => b.id === formData.id ? { ...formData } : b));
      showToast(`Data buku "${formData.judul}" berhasil diperbarui.`);
    } else {
      const newBook = { ...formData, id: nextId };
      setBooks(prev => [...prev, newBook]);
      setNextId(n => n + 1);
      showToast(`Buku "${formData.judul}" berhasil ditambahkan ke katalog.`);
    }
    setModal(null);
  };

  return (
    <div>
      <div className="admin-page-header">
        <h1>📚 Katalog Buku</h1>
        <p>Kelola seluruh koleksi buku, pedoman, dan prosiding Perpusnas Press.</p>
      </div>

      <div className="admin-card">
        <div className="admin-card-header">
          <input
            type="text" placeholder="Cari judul atau penulis..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: '0.45rem 0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', width: '260px', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
          />
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total: <strong>{filtered.length}</strong> buku</span>
            <button className="btn btn-primary" style={{ padding: '0.45rem 1rem', fontSize: '0.875rem' }} onClick={handleOpenTambah}>
              + Tambah Buku
            </button>
          </div>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>#</th><th>Judul</th><th>Penulis</th><th>Kategori</th><th>Tahun</th><th>ISBN</th><th>Status</th><th>Aksi</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0
                ? <tr><td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '2rem' }}>Tidak ada buku ditemukan.</td></tr>
                : filtered.map((b, i) => (
                  <tr key={b.id}>
                    <td style={{ color: 'var(--text-tertiary)' }}>{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{b.judul}</td>
                    <td>{b.penulis}</td>
                    <td><span className="badge badge-gray">{b.kategori}</span></td>
                    <td>{b.tahun}</td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>{b.isbn || '-'}</td>
                    <td><span className={`badge ${STATUS_BADGE[b.status] || 'badge-gray'}`}>{b.status}</span></td>
                    <td>
                      <button
                        onClick={() => handleOpenEdit(b)}
                        style={{ background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', fontSize: '0.8rem', marginRight: '0.5rem', fontWeight: 600 }}
                      >✏️ Edit</button>
                      <button
                        onClick={() => handleHapus(b.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                      >🗑️ Hapus</button>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>

      {modal && <ModalBuku data={modal.data} onSave={handleSave} onClose={() => setModal(null)} />}
      {toast && <Toast msg={toast} onClose={() => setToast('')} />}
    </div>
  );
};

export default AdminKatalog;
