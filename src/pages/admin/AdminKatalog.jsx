import React, { useState, useRef, useEffect } from 'react';
import './AdminLayout.css';
import { ExternalLink, Image as ImageIcon, FileText, Edit, Trash2, Eye, CheckCircle, BookOpen } from 'lucide-react';

const INITIAL_BOOKS = [
  { id: 1, judul: 'Sejarah Perpustakaan Nasional RI', penulis: 'Dr. Ahmad Fauzi', tahun: 2026, isbnCetak: '978-602-001', isbnDigital: '978-602-001-E', sampul: true, pdf: true, youtube: 'https://youtube.com/...' },
  { id: 2, judul: 'Pedoman Katalogisasi Perpustakaan', penulis: 'Dra. Siti Rahayu', tahun: 2026, isbnCetak: '978-602-002', isbnDigital: '', sampul: true, pdf: false, youtube: '' },
];

import { SipenaAPI } from '../../lib/api';

const EMPTY_FORM = { judul: '', penulis: '', tahun: new Date().getFullYear(), isbnCetak: '', isbnDigital: '', sampul: null, pdf: null, youtube: '' };

const Toast = ({ msg, onClose }) => (
  <div style={{
    position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999,
    background: '#0f172a', color: 'white', padding: '1rem 1.5rem',
    borderRadius: '0.75rem', boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
    display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '280px',
    animation: 'slideUp 0.3s ease'
  }}>
    <CheckCircle size={18} color="#10b981" />
    <span style={{ flex: 1, fontSize: '0.9rem' }}>{msg}</span>
    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.1rem' }}>×</button>
  </div>
);

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
        background: 'white', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '600px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.25)', overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column'
      }}>
        <div style={{ background: 'linear-gradient(135deg,#1e3a8a,#2563eb)', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ color: 'white', margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {isEdit ? <Edit size={16} /> : null} {isEdit ? 'Edit Data Buku' : 'Tambah Buku Baru'}
          </h3>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: '1rem' }}>×</button>
        </div>
        <div style={{ overflowY: 'auto', padding: '1.5rem' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Judul Buku *</label>
              <input style={inputStyle} required value={form.judul} onChange={e => setForm(p => ({ ...p, judul: e.target.value }))} placeholder="Judul lengkap buku" />
            </div>
            <div>
              <label style={labelStyle}>Nama Penulis *</label>
              <input style={inputStyle} required value={form.penulis} onChange={e => setForm(p => ({ ...p, penulis: e.target.value }))} placeholder="Nama penulis/pengarang" />
            </div>
            <div>
              <label style={labelStyle}>Tahun Terbit *</label>
              <input style={inputStyle} type="number" required min="1900" max="2100" value={form.tahun} onChange={e => setForm(p => ({ ...p, tahun: Number(e.target.value) }))} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>ISBN Cetak</label>
                <input style={inputStyle} value={form.isbnCetak} onChange={e => setForm(p => ({ ...p, isbnCetak: e.target.value }))} placeholder="978-..." />
              </div>
              <div>
                <label style={labelStyle}>ISBN Digital</label>
                <input style={inputStyle} value={form.isbnDigital} onChange={e => setForm(p => ({ ...p, isbnDigital: e.target.value }))} placeholder="978-..." />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>File Sampul</label>
                <input type="file" style={inputStyle} accept="image/*" onChange={() => setForm(p => ({ ...p, sampul: true }))} />
              </div>
              <div>
                <label style={labelStyle}>File PDF Buku</label>
                <input type="file" style={inputStyle} accept="application/pdf" onChange={() => setForm(p => ({ ...p, pdf: true }))} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Sinopsis / Deskripsi Buku</label>
              <textarea rows="4" style={{ ...inputStyle, resize: 'vertical' }} value={form.sinopsis || ''} onChange={e => setForm(p => ({ ...p, sinopsis: e.target.value }))} placeholder="Tuliskan sinopsis singkat buku ini..."></textarea>
            </div>
            <div>
              <label style={labelStyle}>Link Youtube Audiobook</label>
              <input style={inputStyle} type="url" value={form.youtube} onChange={e => setForm(p => ({ ...p, youtube: e.target.value }))} placeholder="https://youtube.com/..." />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button type="button" onClick={onClose} className="btn btn-outline">Batal</button>
              <button type="submit" className="btn btn-primary">{isEdit ? 'Simpan Perubahan' : 'Tambah Buku'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// ── AdminKatalog ────────────────────────────────────────────────────────────
const AdminKatalog = () => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const fetchBooks = async () => {
    try {
      setLoading(true);
      const data = await SipenaAPI.getBooks();
      const mapped = data.map(b => ({
        id: b.id,
        judul: b.title,
        penulis: b.authorName || 'Tidak diketahui',
        tahun: b.year,
        isbnCetak: b.isbn,
        isbnDigital: b.isbnDigital,
        sampul: b.coverUrl,
        pdf: b.fileUrl,
        youtube: b.audioUrl,
        sinopsis: b.synopsis
      }));
      setBooks(mapped);
    } catch (err) {
      console.error(err);
      showToast('Gagal mengambil data buku dari server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'add') {
      const data = {
        ...EMPTY_FORM,
        judul: params.get('judul') || '',
        penulis: params.get('penulis') || '',
        isbnCetak: params.get('isbn') || '',
        sinopsis: params.get('sinopsis') || ''
      };
      setModal({ mode: 'tambah', data });
      // Remove query params from URL without reloading
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const filtered = books.filter(b =>
    b.judul.toLowerCase().includes(search.toLowerCase()) ||
    b.penulis.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenTambah = () => setModal({ mode: 'tambah', data: null });
  const handleOpenEdit = (book) => setModal({ mode: 'edit', data: { ...book } });

  const handleHapus = async (id) => {
    const book = books.find(b => b.id === id);
    if (window.confirm(`Apakah Anda yakin ingin menghapus buku "${book.judul}"?\n\nTindakan ini tidak dapat dibatalkan.`)) {
      try {
        await SipenaAPI.deleteBook(id);
        showToast(`Buku "${book.judul}" berhasil dihapus.`);
        fetchBooks();
      } catch (err) {
        showToast('Gagal menghapus buku.');
      }
    }
  };

  const handleSave = async (formData) => {
    const payload = {
      title: formData.judul,
      authorName: formData.penulis,
      year: formData.tahun,
      isbn: formData.isbnCetak,
      isbnDigital: formData.isbnDigital,
      synopsis: formData.sinopsis,
      coverUrl: formData.sampul === true ? '/default-cover.jpg' : formData.sampul,
      fileUrl: formData.pdf === true ? '/default-pdf.pdf' : formData.pdf,
      audioUrl: formData.youtube
    };

    try {
      if (modal.mode === 'edit') {
        await SipenaAPI.updateBook(formData.id, payload);
        showToast(`Data buku "${formData.judul}" berhasil diperbarui.`);
      } else {
        await SipenaAPI.createBook(payload);
        showToast(`Buku "${formData.judul}" berhasil ditambahkan ke katalog.`);
      }
      fetchBooks();
      setModal(null);
    } catch (err) {
      console.error(err);
      showToast('Gagal menyimpan data buku.');
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <BookOpen size={24} color="var(--accent-color)" /> Daftar Buku
        </h1>
        <p>Kelola koleksi buku cetak, buku digital, dan audiobook.</p>
      </div>

      <div className="admin-card">
        <div className="admin-card-header">
          <input
            type="text" placeholder="Cari judul atau penulis..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: '0.45rem 0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', width: '260px' }}
          />
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total: <strong>{filtered.length}</strong> buku</span>
            <button className="btn btn-primary" onClick={handleOpenTambah} style={{ padding: '0.45rem 1rem', fontSize: '0.875rem' }}>
              + Tambah Buku
            </button>
          </div>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Judul & Penulis</th>
                <th>Tahun</th>
                <th>ISBN (Cetak/Digital)</th>
                <th>Aset File</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '2rem' }}>Tidak ada buku yang sesuai.</td></tr>
              ) : filtered.map(b => (
                <tr key={b.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>{b.judul}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Oleh: {b.penulis}</div>
                  </td>
                  <td>{b.tahun}</td>
                  <td style={{ fontSize: '0.85rem' }}>
                    {b.isbnCetak && <div>Cetak: {b.isbnCetak}</div>}
                    {b.isbnDigital && <div>Digital: {b.isbnDigital}</div>}
                    {!b.isbnCetak && !b.isbnDigital && <span style={{ color: 'var(--text-tertiary)' }}>-</span>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {b.sampul && <a href="#" target="_blank" rel="noopener noreferrer" className="badge badge-blue" style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', textDecoration: 'none' }}><ImageIcon size={12} /> Sampul</a>}
                      {b.pdf && <a href="#" target="_blank" rel="noopener noreferrer" className="badge badge-blue" style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', textDecoration: 'none' }}><FileText size={12} /> PDF</a>}
                      {b.youtube && <a href={b.youtube} target="_blank" rel="noopener noreferrer" className="badge badge-blue" style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', textDecoration: 'none' }}><ExternalLink size={12} /> Youtube</a>}
                      {!b.sampul && !b.pdf && !b.youtube && <span style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>-</span>}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <button className="btn btn-outline" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }} onClick={() => handleOpenEdit(b)}>
                        Edit
                      </button>
                      <button className="btn btn-outline" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => handleHapus(b.id)}>
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
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
