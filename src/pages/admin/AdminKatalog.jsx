import React, { useState, useRef, useEffect } from 'react';
import './AdminLayout.css';
import { ExternalLink, Image as ImageIcon, FileText, Edit, Trash2, Eye, CheckCircle, BookOpen } from 'lucide-react';
import AdminPagination from '../../components/AdminPagination';
import ImageCropModal from '../../components/ImageCropModal';

const KATEGORI_BUKU_OPTIONS = [
  'Anak-anak',
  'Biografi & Memoar',
  'Ekonomi & Management',
  'Fiksi',
  'Hukum & Politik',
  'Humaniora',
  'Inkubator Literasi',
  'Kesehatan',
  'Komik',
  'Lifestyle',
  'Pedoman / Standar',
  'Prosiding',
  'Laporan',
  'Majalah / Jurnal'
];

const KATEGORI_KHUSUS = [
  'Pedoman / Standar',
  'Prosiding',
  'Laporan',
  'Majalah / Jurnal'
];

const INITIAL_BOOKS = [
  { id: 1, judul: 'Sejarah Perpustakaan Nasional RI', penulis: 'Dr. Ahmad Fauzi', tahun: 2026, kategori: 'Humaniora', nip: 'NIP. 2026.01.001', editor: 'Drs. Hendro Wibowo', desainSampul: 'Rian Pratama', penataLetak: 'Bagus Wicaksono', isbnCetak: '978-602-001', isbnDigital: '978-602-001-E', sampul: true, pdf: true, youtube: 'https://youtube.com/...' },
  { id: 2, judul: 'Pedoman Katalogisasi Perpustakaan', penulis: 'Dra. Siti Rahayu', tahun: 2026, kategori: 'Inkubator Literasi', nip: 'NIP. 2026.02.002', editor: 'M. Syarif', desainSampul: 'Dinda Caroline', penataLetak: 'Agus Santoso', isbnCetak: '978-602-002', isbnDigital: '', sampul: true, pdf: false, youtube: '' },
];

import { SipenaAPI } from '../../lib/api';
import { useDialog } from '../../context/DialogContext';

const EMPTY_FORM = { 
  judul: '', 
  penulis: '', 
  tahun: new Date().getFullYear(), 
  kategori: 'Anak-anak', 
  nip: '', 
  isbnCetak: '', 
  isbnDigital: '', 
  editor: '', 
  desainSampul: '', 
  penataLetak: '', 
  sampul: null, 
  pdf: null, 
  sinopsis: '', 
  youtube: '' 
};

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
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [cropModal, setCropModal] = useState({
    isOpen: false,
    imageSrc: null,
    fileName: 'sampul-buku.jpg',
  });
  const coverInputRef = useRef(null);
  const pdfInputRef = useRef(null);

  const handleCoverUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!validTypes.includes(file.type) && !['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
      setUploadError('File sampul harus berupa gambar (.png, .jpg, .webp)');
      if (coverInputRef.current) coverInputRef.current.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Ukuran file sampul maksimal 5 MB');
      if (coverInputRef.current) coverInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      setCropModal({
        isOpen: true,
        imageSrc: ev.target.result,
        fileName: file.name,
      });
    };
    reader.readAsDataURL(file);
    if (coverInputRef.current) coverInputRef.current.value = '';
  };

  const handleCropCoverConfirm = async (croppedFile) => {
    try {
      setCropModal(prev => ({ ...prev, isOpen: false }));
      setUploadingCover(true);
      const res = await SipenaAPI.uploadCover(croppedFile);
      if (res?.url) {
        setForm(p => ({ ...p, sampul: res.url }));
      } else {
        throw new Error('Gagal mengunggah file sampul');
      }
    } catch (err) {
      console.error('Upload cover failed:', err);
      setUploadError(err.response?.data?.error || err.message || 'Gagal mengunggah gambar sampul');
    } finally {
      setUploadingCover(false);
    }
  };

  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setUploadError('File dummy final harus berformat PDF (.pdf)');
      if (pdfInputRef.current) pdfInputRef.current.value = '';
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setUploadError('Ukuran file dummy final PDF maksimal 50 MB');
      if (pdfInputRef.current) pdfInputRef.current.value = '';
      return;
    }
    try {
      setUploadingPdf(true);
      const res = await SipenaAPI.uploadDocument(file);
      if (res?.url) {
        setForm(p => ({ ...p, pdf: res.url }));
      } else {
        throw new Error('Gagal mengunggah file dummy PDF');
      }
    } catch (err) {
      console.error('Upload PDF failed:', err);
      setUploadError(err.response?.data?.error || err.message || 'Gagal mengunggah file dummy PDF');
    } finally {
      setUploadingPdf(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (uploadingCover || uploadingPdf) {
      setUploadError('Mohon tunggu hingga proses unggah file selesai');
      return;
    }
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
        background: 'white', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '640px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.25)', overflow: 'hidden', maxHeight: '92vh', display: 'flex', flexDirection: 'column'
      }}>
        <div style={{ background: 'linear-gradient(135deg,#1e3a8a,#2563eb)', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ color: 'white', margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {isEdit ? <Edit size={16} /> : null} {isEdit ? 'Edit Data Buku' : 'Tambah Buku Baru'}
          </h3>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: '1rem' }}>×</button>
        </div>
        <div style={{ overflowY: 'auto', padding: '1.5rem' }}>
          {data?.fromProject && (
            <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', marginBottom: '1.25rem', color: '#065f46', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle size={16} color="#059669" />
              <span><strong>Data Terhubung Otomatis:</strong> Judul, Penulis, NIP, ISBN, Cover PNG, dan Dummy PDF telah diimpor dari Manajemen Penerbitan. Silakan lengkapi <strong>Kategori Buku</strong> dan <strong>Abstrak</strong>.</span>
            </div>
          )}
          {uploadError && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-md)', padding: '0.65rem 0.85rem', marginBottom: '1rem', color: '#dc2626', fontSize: '0.8rem' }}>
              ⚠️ {uploadError}
            </div>
          )}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                <label style={labelStyle}>Tahun Terbit *</label>
                <input style={inputStyle} type="number" required min="1900" max="2100" value={form.tahun} onChange={e => setForm(p => ({ ...p, tahun: Number(e.target.value) }))} />
              </div>
              <div>
                <label style={labelStyle}>Kategori Buku *</label>
                <select 
                  style={inputStyle} 
                  required 
                  value={form.kategori || 'Anak-anak'} 
                  onChange={e => setForm(p => ({ ...p, kategori: e.target.value }))}
                >
                  <optgroup label="Kategori Buku Umum">
                    {KATEGORI_BUKU_OPTIONS.filter(cat => !KATEGORI_KHUSUS.includes(cat)).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Produk Terbitan Khusus (Sesuai Kartu Beranda)">
                    {KATEGORI_KHUSUS.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
            </div>
            <div>
              <label style={labelStyle}>NIP (Nomor Induk Perpusnas Press)</label>
              <input 
                style={inputStyle} 
                value={form.nip || ''} 
                onChange={e => setForm(p => ({ ...p, nip: e.target.value }))} 
                placeholder="Contoh: NIP. 2026.01.001 (dari Dasbor Manajemen Penerbitan)" 
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>ISBN Cetak</label>
                <input style={inputStyle} value={form.isbnCetak || ''} onChange={e => setForm(p => ({ ...p, isbnCetak: e.target.value }))} placeholder="978-... atau -" />
              </div>
              <div>
                <label style={labelStyle}>ISBN Digital</label>
                <input style={inputStyle} value={form.isbnDigital || ''} onChange={e => setForm(p => ({ ...p, isbnDigital: e.target.value }))} placeholder="978-... atau -" />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Editor</label>
                <input style={inputStyle} value={form.editor || ''} onChange={e => setForm(p => ({ ...p, editor: e.target.value }))} placeholder="Nama editor / penyunting" />
              </div>
              <div>
                <label style={labelStyle}>Desain Sampul</label>
                <input style={inputStyle} value={form.desainSampul || ''} onChange={e => setForm(p => ({ ...p, desainSampul: e.target.value }))} placeholder="Nama desainer sampul" />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Penata Letak</label>
              <input style={inputStyle} value={form.penataLetak || ''} onChange={e => setForm(p => ({ ...p, penataLetak: e.target.value }))} placeholder="Nama penata letak / layouter" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>File Sampul (.png / .jpg / .webp)</label>
                {form.sampul && typeof form.sampul === 'string' && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.65rem', marginBottom: '0.45rem', padding: '0.4rem 0.6rem', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <img src={form.sampul} alt="Sampul" style={{ width: '38px', height: '54px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #cbd5e1' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                      <div style={{ fontSize: '0.75rem', color: '#059669', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>
                          <CheckCircle size={13} /> Sampul aktif
                        </span>
                        <a href={form.sampul} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'underline' }}>
                          Buka Sampul ↗
                        </a>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setForm(p => ({ ...p, sampul: null }));
                        if (coverInputRef.current) coverInputRef.current.value = '';
                      }}
                      style={{ background: '#fee2e2', border: 'none', color: '#dc2626', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', padding: '0.25rem 0.5rem', borderRadius: '4px' }}
                      title="Hapus sampul"
                    >
                      Hapus
                    </button>
                  </div>
                )}
                <input
                  ref={coverInputRef}
                  type="file"
                  style={inputStyle}
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleCoverUpload}
                  disabled={uploadingCover}
                />
                {uploadingCover && (
                  <div style={{ fontSize: '0.75rem', color: '#2563eb', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <div style={{ width: 14, height: 14, border: '2px solid #2563eb', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontWeight: 600 }}>Sedang mengunggah gambar sampul...</span>
                  </div>
                )}
                {form.sampul && typeof form.sampul === 'string' && !uploadingCover && (
                  <small style={{ color: 'var(--text-tertiary)', fontSize: '0.7rem', display: 'block', marginTop: '0.2rem' }}>
                    Pilih file baru di atas jika ingin mengganti file sampul saat ini.
                  </small>
                )}
              </div>
              <div>
                <label style={labelStyle}>File PDF Buku (Dummy Final)</label>
                {form.pdf && typeof form.pdf === 'string' && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem', padding: '0.4rem 0.6rem', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.75rem', color: '#059669' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <CheckCircle size={13} />
                      <span style={{ fontWeight: 600 }}>Dummy PDF aktif:</span>
                      <a href={form.pdf} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'underline' }}>
                        Buka PDF ↗
                      </a>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setForm(p => ({ ...p, pdf: null }));
                        if (pdfInputRef.current) pdfInputRef.current.value = '';
                      }}
                      style={{ background: '#fee2e2', border: 'none', color: '#dc2626', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', padding: '0.25rem 0.5rem', borderRadius: '4px' }}
                      title="Hapus PDF"
                    >
                      Hapus
                    </button>
                  </div>
                )}
                <input
                  ref={pdfInputRef}
                  type="file"
                  style={inputStyle}
                  accept="application/pdf"
                  onChange={handlePdfUpload}
                  disabled={uploadingPdf}
                />
                {uploadingPdf && (
                  <div style={{ fontSize: '0.75rem', color: '#2563eb', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <div style={{ width: 14, height: 14, border: '2px solid #2563eb', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontWeight: 600 }}>Sedang mengunggah berkas PDF...</span>
                  </div>
                )}
                {form.pdf && typeof form.pdf === 'string' && !uploadingPdf && (
                  <small style={{ color: 'var(--text-tertiary)', fontSize: '0.7rem', display: 'block', marginTop: '0.2rem' }}>
                    Pilih file baru di atas jika ingin mengganti file PDF saat ini.
                  </small>
                )}
              </div>
            </div>
            <div>
              <label style={labelStyle}>Abstrak</label>
              <textarea rows="4" style={{ ...inputStyle, resize: 'vertical' }} value={form.sinopsis || ''} onChange={e => setForm(p => ({ ...p, sinopsis: e.target.value }))} placeholder="Tuliskan abstrak buku ini..."></textarea>
            </div>
            <div>
              <label style={labelStyle}>Link Youtube Audiobook</label>
              <input style={inputStyle} type="url" value={form.youtube || ''} onChange={e => setForm(p => ({ ...p, youtube: e.target.value }))} placeholder="https://youtube.com/..." />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button type="button" onClick={onClose} className="btn btn-outline" disabled={uploadingCover || uploadingPdf}>Batal</button>
              <button type="submit" className="btn btn-primary" disabled={uploadingCover || uploadingPdf}>
                {(uploadingCover || uploadingPdf) ? 'Mengunggah file...' : (isEdit ? 'Simpan Perubahan' : 'Tambah Buku')}
              </button>
            </div>
          </form>
        </div>

        <ImageCropModal
          isOpen={cropModal.isOpen}
          imageSrc={cropModal.imageSrc}
          aspectRatio={3 / 4}
          cropShape="rect"
          title="Sesuaikan & Potong Sampul Buku"
          fileName={cropModal.fileName}
          onConfirm={handleCropCoverConfirm}
          onCancel={() => setCropModal(prev => ({ ...prev, isOpen: false, imageSrc: null }))}
        />
      </div>
    </div>
  );
};

// ── AdminKatalog ────────────────────────────────────────────────────────────
const AdminKatalog = () => {
  const { showConfirm, showAlert } = useDialog();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

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
        kategori: b.category || 'Anak-anak',
        nip: b.nip || '',
        isbnCetak: b.isbn || '',
        isbnDigital: b.isbnDigital || '',
        editor: b.editor || '',
        desainSampul: b.coverDesigner || '',
        penataLetak: b.layoutDesigner || '',
        sampul: b.coverUrl,
        pdf: b.fileUrl,
        youtube: b.audioUrl,
        sinopsis: b.synopsis || '',
        readCount: b.readCount || 0,
        downloadCount: b.downloadCount || 0,
        ratingAvg: b.ratingAvg || 0,
        ratingCount: b.ratingCount || 0,
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
        tahun: Number(params.get('tahun')) || new Date().getFullYear(),
        kategori: params.get('kategori') || 'Anak-anak',
        nip: params.get('nip') || '',
        isbnCetak: params.get('isbn') || '',
        isbnDigital: params.get('isbnDigital') || '',
        sampul: params.get('sampul') || null,
        pdf: params.get('pdf') || null,
        editor: params.get('editor') || '',
        penataLetak: params.get('penataLetak') || '',
        desainSampul: params.get('desainSampul') || '',
        sinopsis: params.get('sinopsis') || '',
        projectId: params.get('projectId') || null,
        fromProject: !!(params.get('projectId') || params.get('nip') || params.get('sampul'))
      };
      setModal({ mode: 'tambah', data });
      // Remove query params from URL without reloading
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const filtered = books.filter(b =>
    b.judul.toLowerCase().includes(search.toLowerCase()) ||
    b.penulis.toLowerCase().includes(search.toLowerCase()) ||
    (b.kategori && b.kategori.toLowerCase().includes(search.toLowerCase())) ||
    (b.nip && b.nip.toLowerCase().includes(search.toLowerCase())) ||
    (b.editor && b.editor.toLowerCase().includes(search.toLowerCase()))
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedBooks = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handleOpenTambah = () => setModal({ mode: 'tambah', data: null });
  const handleOpenEdit = (book) => setModal({ mode: 'edit', data: { ...book } });

  const handleHapus = async (id) => {
    const book = books.find(b => b.id === id);
    if (!book) return;
    const ok = await showConfirm({
      title: 'Hapus Buku dari Katalog',
      message: `Apakah Anda yakin ingin menghapus buku "${book.judul}"?\n\nTindakan ini tidak dapat dibatalkan.`,
      type: 'danger',
      confirmText: 'Ya, Hapus Buku'
    });
    if (ok) {
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
      category: formData.kategori,
      nip: formData.nip,
      isbn: formData.isbnCetak,
      isbnDigital: formData.isbnDigital,
      editor: formData.editor,
      coverDesigner: formData.desainSampul,
      layoutDesigner: formData.penataLetak,
      synopsis: formData.sinopsis,
      coverUrl: (typeof formData.sampul === 'string' && formData.sampul) ? formData.sampul : null,
      fileUrl: (typeof formData.pdf === 'string' && formData.pdf) ? formData.pdf : null,
      audioUrl: formData.youtube,
      projectId: formData.projectId || undefined
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
      showToast('Gagal menyimpan data buku: ' + (err.response?.data?.error || err.message || 'Terjadi kesalahan'));
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
            type="text" placeholder="Cari judul, penulis, kategori, NIP..."
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
                <th>Kategori</th>
                <th>Tahun</th>
                <th>Tim Produksi</th>
                <th>NIP & ISBN</th>
                <th>Statistik</th>
                <th>Aset File</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '2rem' }}>Tidak ada buku yang sesuai.</td></tr>
              ) : paginatedBooks.map(b => (
                <tr key={b.id}>
                  <td>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      {b.sampul ? (
                        <img
                          src={b.sampul}
                          alt={b.judul}
                          style={{ width: '40px', height: '56px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border-color)', flexShrink: 0 }}
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      ) : (
                        <div style={{ width: '40px', height: '56px', borderRadius: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <BookOpen size={18} color="var(--text-tertiary)" />
                        </div>
                      )}
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>{b.judul}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Oleh: {b.penulis}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-blue" style={{ fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {b.kategori}
                    </span>
                  </td>
                  <td>{b.tahun}</td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {b.editor && <div><span style={{ color: 'var(--text-tertiary)' }}>Ed:</span> {b.editor}</div>}
                    {b.desainSampul && <div><span style={{ color: 'var(--text-tertiary)' }}>Sampul:</span> {b.desainSampul}</div>}
                    {b.penataLetak && <div><span style={{ color: 'var(--text-tertiary)' }}>Layout:</span> {b.penataLetak}</div>}
                    {!b.editor && !b.desainSampul && !b.penataLetak && <span style={{ color: 'var(--text-tertiary)' }}>-</span>}
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>
                    {b.nip && <div style={{ fontWeight: 600, color: 'var(--accent-color)', marginBottom: '0.2rem' }}>{b.nip}</div>}
                    {b.isbnCetak && <div>Cetak: {b.isbnCetak}</div>}
                    {b.isbnDigital && <div>Digital: {b.isbnDigital}</div>}
                    {!b.nip && !b.isbnCetak && !b.isbnDigital && <span style={{ color: 'var(--text-tertiary)' }}>-</span>}
                  </td>
                  <td style={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <span title="Jumlah pembaca online" style={{ color: 'var(--text-secondary)' }}>
                        👁️ <strong>{b.readCount || 0}</strong> dibaca
                      </span>
                      <span title="Jumlah dokumen diunduh" style={{ color: 'var(--text-secondary)' }}>
                        📥 <strong>{b.downloadCount || 0}</strong> unduh
                      </span>
                      {b.ratingAvg > 0 && (
                        <span style={{ color: '#fbbf24', fontWeight: 600 }}>
                          ★ {b.ratingAvg.toFixed(1)} <small style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>({b.ratingCount})</small>
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {b.sampul && <a href={b.sampul} target="_blank" rel="noopener noreferrer" className="badge badge-blue" style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', textDecoration: 'none' }}><ImageIcon size={12} /> Sampul</a>}
                      {b.pdf && <a href={b.pdf} target="_blank" rel="noopener noreferrer" className="badge badge-blue" style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', textDecoration: 'none' }}><FileText size={12} /> PDF</a>}
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

        <AdminPagination
          currentPage={safePage}
          totalItems={filtered.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          itemName="buku"
        />
      </div>

      {modal && <ModalBuku data={modal.data} onSave={handleSave} onClose={() => setModal(null)} />}
      {toast && <Toast msg={toast} onClose={() => setToast('')} />}
    </div>
  );
};

export default AdminKatalog;
