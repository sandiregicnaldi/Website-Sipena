import React, { useState, useRef, useEffect } from 'react';
import './AdminLayout.css';
import { 
  Users, FileDown, Calendar, Globe, Edit, Trash2, 
  CheckCircle, Plus, Save, KeyRound, Sparkles, RefreshCw, 
  ToggleLeft, ToggleRight, Loader2, Award, Clock, Upload, Image, X
} from 'lucide-react';
import { useEvent, checkIfClaimOpen } from '../../context/EventContext';
import { useDialog } from '../../context/DialogContext';
import { SipenaAPI } from '../../lib/api';
import AdminPagination from '../../components/AdminPagination';
import ImageCropModal from '../../components/ImageCropModal';

const STATUS_LIST  = ['Akan Datang', 'Segera', 'Selesai'];
const STATUS_BADGE = { 'Akan Datang': 'badge-blue', 'Segera': 'badge-amber', 'Selesai': 'badge-green' };

const EMPTY_FORM = {
  judul: '', tanggal: '', jamKegiatan: '09:00 - 12:00 WIB', lokasi: '', urlZoom: '',
  narasumber: [''], penjelasan: '', status: 'Akan Datang',
  peserta: 0, certificateToken: '', isClaimOpen: null, claimOpensAt: null,
  bannerUrl: ''
};

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

const AdminKegiatan = () => {
  const { 
    events, addEvent, updateEvent, deleteEvent, 
    toggleClaimStatus, getParticipants 
  } = useEvent();
  const { showConfirm } = useDialog();

  const [search, setSearch]           = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize]       = useState(10);
  const [modal, setModal]             = useState(null);
  const [pesertaModal, setPesertaModal] = useState(null);
  const [pesertaList, setPesertaList] = useState([]);
  const [loadingPeserta, setLoadingPeserta] = useState(false);
  const [togglingId, setTogglingId]   = useState(null);
  const [toast, setToast]             = useState('');
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [cropModal, setCropModal] = useState({
    isOpen: false,
    imageSrc: null,
    fileName: 'banner-kegiatan.jpg',
  });
  const bannerFileRef = useRef(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  // Muat data peserta asli dari database saat modal peserta dibuka
  useEffect(() => {
    if (!pesertaModal) {
      setPesertaList([]);
      return;
    }
    const loadRealParticipants = async () => {
      try {
        setLoadingPeserta(true);
        const data = await getParticipants(pesertaModal.id);
        setPesertaList(data || []);
      } catch (err) {
        console.error("Gagal mengambil data peserta:", err);
      } finally {
        setLoadingPeserta(false);
      }
    };
    loadRealParticipants();
  }, [pesertaModal]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const filtered = events.filter(e => (e.judul || '').toLowerCase().includes(search.toLowerCase()));

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedKegiatan = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  // Generator Token Acak
  const generateRandomToken = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let rand = '';
    for (let i = 0; i < 4; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const year = new Date().getFullYear();
    return `SIPENA-${rand}-${year}`;
  };

  const handleBannerUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('File banner harus berupa format gambar (JPG, PNG, atau WEBP).');
      if (bannerFileRef.current) bannerFileRef.current.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Ukuran gambar banner maksimal 5 MB.');
      if (bannerFileRef.current) bannerFileRef.current.value = '';
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
    if (bannerFileRef.current) bannerFileRef.current.value = '';
  };

  const handleCropBannerConfirm = async (croppedFile) => {
    try {
      setCropModal(prev => ({ ...prev, isOpen: false }));
      setUploadingBanner(true);
      const res = await SipenaAPI.uploadCover(croppedFile);
      if (res?.url) {
        setModal(p => ({ ...p, data: { ...p.data, bannerUrl: res.url } }));
        showToast('Banner kegiatan berhasil dipotong & diunggah!');
      } else {
        throw new Error('Gagal mengunggah banner kegiatan.');
      }
    } catch (err) {
      console.error('Upload banner failed:', err);
      showToast(err.response?.data?.error || err.message || 'Gagal mengunggah banner.');
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleSave = async (form) => {
    try {
      if (modal.mode === 'edit') {
        await updateEvent(form);
        showToast(`Kegiatan "${form.judul}" berhasil diperbarui.`);
      } else {
        await addEvent(form);
        showToast(`Kegiatan "${form.judul}" berhasil ditambahkan.`);
      }
      setModal(null);
    } catch (err) {
      showToast(`Gagal menyimpan kegiatan: ${err.message || 'Terjadi kesalahan'}`);
    }
  };

  const handleHapus = async (id) => {
    const ev = events.find(e => e.id === id);
    if (!ev) return;
    const ok = await showConfirm({
      title: 'Hapus Kegiatan',
      message: `Hapus kegiatan "${ev.judul}"?\n\nTindakan ini tidak dapat dibatalkan.`,
      type: 'danger',
      confirmText: 'Ya, Hapus Kegiatan'
    });
    if (ok) {
      try {
        await deleteEvent(id);
        showToast(`Kegiatan "${ev.judul}" berhasil dihapus.`);
      } catch (err) {
        showToast('Gagal menghapus kegiatan.');
      }
    }
  };

  // Sakelar Kilat Buka / Tutup Klaim
  const handleToggleClaim = async (ev, targetState, targetOpensAt) => {
    try {
      setTogglingId(ev.id);
      await toggleClaimStatus(ev.id, targetState, targetOpensAt);
      const stateName = targetOpensAt === null ? 'kembali ke Otomatis (H-15 menit)' : (targetState ? 'DIBUKA' : 'DITUTUP');
      showToast(`Klaim sertifikat "${ev.judul}" telah diatur: ${stateName}.`);
    } catch (err) {
      showToast('Gagal mengubah status klaim sertifikat.');
    } finally {
      setTogglingId(null);
    }
  };

  const exportCSV = () => {
    if (!pesertaModal) return;
    const header = ['No', 'Nama Peserta', 'Email', 'Instansi', 'Nomor Sertifikat', 'Token Digunakan', 'Waktu Klaim', 'Status'];
    const rows   = pesertaList.map((p, idx) => [
      idx + 1,
      p.name || p.nama || '-',
      p.email || '-',
      p.institution || p.instansi || '-',
      p.certificateNumber || p.certificate_number || '-',
      p.tokenUsed || p.token_used || '-',
      p.claimedAt ? new Date(p.claimedAt).toLocaleString('id-ID') : '-',
      p.status || 'Hadir'
    ]);
    const csvContent = [header, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Daftar_Hadir_${pesertaModal.judul.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
          <Calendar size={24} color="var(--accent-color)" /> Kegiatan &amp; Sertifikat
        </h1>
        <p>Kelola seminar, tautan Zoom, token sertifikat kehadiran, dan status klaim peserta.</p>
      </div>

      <div className="admin-card">
        <div className="admin-card-header">
          <input
            type="text" placeholder="Cari kegiatan..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: '0.45rem 0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', width: '260px', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
          />
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total: <strong>{filtered.length}</strong> kegiatan</span>
            <button className="btn btn-primary" style={{ padding: '0.45rem 1rem', fontSize: '0.875rem' }} onClick={() => setModal({ mode: 'tambah', data: EMPTY_FORM })}>
              + Tambah Kegiatan
            </button>
          </div>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Detail Kegiatan</th>
                <th>Pelaksanaan</th>
                <th>Token Sertifikat</th>
                <th>Status Klaim</th>
                <th>Peserta Hadir</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '2rem' }}>Tidak ada kegiatan ditemukan.</td></tr>
              ) : (
                paginatedKegiatan.map((e, i) => {
                  const isManualOpen = e.isClaimOpen === true || e.claimOpensAt === 'open';
                  const isManualClosed = e.claimOpensAt === 'closed' || (e.isClaimOpen === false && e.claimOpensAt === 'closed');
                  const isAuto = !isManualOpen && !isManualClosed;

                  return (
                    <tr key={e.id}>
                      <td style={{ color: 'var(--text-tertiary)' }}>{(safePage - 1) * pageSize + i + 1}</td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>{e.judul}</div>
                        {e.urlZoom ? (
                          <div style={{ fontSize: '0.75rem', color: '#2563eb', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                            <Globe size={11} /> Zoom: <a href={e.urlZoom} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>Buka Link</a>
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Belum ada link Zoom</div>
                        )}
                      </td>
                      <td>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                          {new Date(e.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                          {e.jamKegiatan}
                        </div>
                      </td>
                      <td>
                        {e.certificateToken ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span style={{
                              background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe',
                              padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 700,
                              fontSize: '0.8rem', letterSpacing: '0.5px'
                            }}>
                              {e.certificateToken}
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: '#dc2626', fontStyle: 'italic' }}>Belum Diset</span>
                        )}
                      </td>
                      <td>
                        {/* Status Klaim & Sakelar Kilat */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                          <div>
                            {isManualOpen ? (
                              <span className="badge badge-green" style={{ fontSize: '0.72rem' }}>Dibuka (Manual)</span>
                            ) : isManualClosed ? (
                              <span className="badge badge-red" style={{ fontSize: '0.72rem' }}>Ditutup (Manual)</span>
                            ) : (
                              <span className="badge badge-blue" style={{ fontSize: '0.72rem' }}>Otomatis (H-15)</span>
                            )}
                          </div>

                          <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                            {isManualOpen ? (
                              <button
                                disabled={togglingId === e.id}
                                onClick={() => handleToggleClaim(e, false, 'closed')}
                                style={{
                                  background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b',
                                  padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.7rem',
                                  cursor: 'pointer', fontWeight: 600
                                }}
                              >
                                {togglingId === e.id ? '...' : 'Tutup Klaim'}
                              </button>
                            ) : isManualClosed ? (
                              <button
                                disabled={togglingId === e.id}
                                onClick={() => handleToggleClaim(e, true, 'open')}
                                style={{
                                  background: '#dcfce7', border: '1px solid #86efac', color: '#166534',
                                  padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.7rem',
                                  cursor: 'pointer', fontWeight: 600
                                }}
                              >
                                {togglingId === e.id ? '...' : 'Buka Klaim'}
                              </button>
                            ) : (
                              <button
                                disabled={togglingId === e.id}
                                onClick={() => handleToggleClaim(e, true, 'open')}
                                style={{
                                  background: '#fef3c7', border: '1px solid #fde047', color: '#92400e',
                                  padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.7rem',
                                  cursor: 'pointer', fontWeight: 600
                                }}
                              >
                                {togglingId === e.id ? '...' : 'Buka Sekarang'}
                              </button>
                            )}

                            {!isAuto && (
                              <button
                                disabled={togglingId === e.id}
                                onClick={() => handleToggleClaim(e, null, null)}
                                title="Kembalikan ke pembukaan otomatis (H-15 menit)"
                                style={{
                                  background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569',
                                  padding: '0.15rem 0.35rem', borderRadius: '4px', fontSize: '0.68rem',
                                  cursor: 'pointer'
                                }}
                              >
                                Auto
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e3a8a' }}>
                          {e.participantCount || 0}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>klaim sertifikat</div>
                      </td>
                      <td><span className={`badge ${STATUS_BADGE[e.status]}`}>{e.status}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => setPesertaModal(e)}
                            style={{ background: 'none', border: 'none', color: '#059669', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                          >
                            <Users size={14} /> Peserta ({e.participantCount || 0})
                          </button>
                          <button
                            onClick={() => setModal({ mode: 'edit', data: { ...e } })}
                            style={{ background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                          >
                            <Edit size={12} /> Edit
                          </button>
                          <button
                            onClick={() => handleHapus(e.id)}
                            style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                          >
                            <Trash2 size={12} /> Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <AdminPagination
          currentPage={safePage}
          totalItems={filtered.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          itemName="kegiatan"
        />
      </div>

      {/* MODAL TAMBAH/EDIT KEGIATAN */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', overflowY: 'auto' }}>
          <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '620px', boxShadow: '0 25px 60px rgba(0,0,0,0.25)', overflow: 'hidden', margin: 'auto' }}>
            <div style={{ background: 'linear-gradient(135deg,#1e3a8a,#2563eb)', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ color: 'white', margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {modal.mode === 'edit' ? <Edit size={16} /> : <Plus size={16} />} {modal.mode === 'edit' ? 'Edit Kegiatan & Sertifikat' : 'Tambah Kegiatan Baru'}
              </h3>
              <button onClick={() => setModal(null)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: '1rem' }}>×</button>
            </div>
            <form onSubmit={e => { e.preventDefault(); handleSave(modal.data); }} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Judul Kegiatan *</label>
                <input style={inputStyle} required value={modal.data.judul} onChange={e => setModal(p => ({ ...p, data: { ...p.data, judul: e.target.value } }))} placeholder="Nama kegiatan/webinar/workshop" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Tanggal Pelaksanaan *</label>
                  <input style={inputStyle} type="date" required value={modal.data.tanggal ? modal.data.tanggal.split('T')[0] : ''} onChange={e => setModal(p => ({ ...p, data: { ...p.data, tanggal: e.target.value } }))} />
                </div>
                <div>
                  <label style={labelStyle}>Jam Kegiatan *</label>
                  <input style={inputStyle} type="text" required value={modal.data.jamKegiatan || ''} onChange={e => setModal(p => ({ ...p, data: { ...p.data, jamKegiatan: e.target.value } }))} placeholder="09:00 - 12:00 WIB" />
                </div>
                <div>
                  <label style={labelStyle}>Estimasi Peserta</label>
                  <input style={inputStyle} type="number" min="0" value={modal.data.peserta} onChange={e => setModal(p => ({ ...p, data: { ...p.data, peserta: Number(e.target.value) } }))} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Lokasi Pelaksanaan *</label>
                  <input style={inputStyle} required value={modal.data.lokasi} onChange={e => setModal(p => ({ ...p, data: { ...p.data, lokasi: e.target.value } }))} placeholder="Contoh: Zoom Meeting / Aula Perpusnas" />
                </div>
                <div>
                  <label style={labelStyle}>Tautan Link Zoom (Buka Terbuka)</label>
                  <input style={inputStyle} type="url" value={modal.data.urlZoom || ''} onChange={e => setModal(p => ({ ...p, data: { ...p.data, urlZoom: e.target.value } }))} placeholder="https://zoom.us/j/..." />
                </div>
              </div>

              {/* ── TOKEN SERTIFIKAT KHUSUS ── */}
              <div style={{
                background: '#f8fafc', border: '1px solid #cbd5e1',
                borderRadius: 'var(--radius-md)', padding: '1rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label style={{ ...labelStyle, marginBottom: 0, color: '#1e40af', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <KeyRound size={15} /> Token Sertifikat Khusus *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const newToken = generateRandomToken();
                      setModal(p => ({ ...p, data: { ...p.data, certificateToken: newToken } }));
                    }}
                    style={{
                      background: 'none', border: 'none', color: '#2563eb',
                      cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
                      display: 'inline-flex', alignItems: 'center', gap: '0.2rem'
                    }}
                  >
                    <Sparkles size={12} /> Generate Acak
                  </button>
                </div>
                <input
                  style={{ ...inputStyle, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', background: 'white' }}
                  required
                  placeholder="Mis: SIPENA-LIT2026"
                  value={modal.data.certificateToken || ''}
                  onChange={e => setModal(p => ({ ...p, data: { ...p.data, certificateToken: e.target.value.toUpperCase() } }))}
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: '0.35rem', display: 'block' }}>
                  Kode ini akan dibagikan panitia di ruang Zoom 15 menit sebelum acara berakhir untuk diklaim peserta.
                </span>
              </div>

              <div>
                <label style={labelStyle}>Narasumber / Pembicara *</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {(Array.isArray(modal.data.narasumber) ? modal.data.narasumber : ['']).map((n, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '0.5rem' }}>
                      <input style={inputStyle} required value={n} onChange={e => {
                        const newArr = [...modal.data.narasumber];
                        newArr[idx] = e.target.value;
                        setModal(p => ({ ...p, data: { ...p.data, narasumber: newArr } }));
                      }} placeholder="Nama narasumber beserta gelar" />
                      {idx > 0 && (
                        <button type="button" onClick={() => {
                          const newArr = modal.data.narasumber.filter((_, i) => i !== idx);
                          setModal(p => ({ ...p, data: { ...p.data, narasumber: newArr } }));
                        }} className="btn btn-outline" style={{ padding: '0 0.75rem', color: 'var(--danger)', borderColor: 'var(--danger)' }}>X</button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={() => {
                    const current = Array.isArray(modal.data.narasumber) ? modal.data.narasumber : [];
                    setModal(p => ({ ...p, data: { ...p.data, narasumber: [...current, ''] } }));
                  }} className="btn btn-outline" style={{ alignSelf: 'flex-start', padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>+ Tambah Narasumber</button>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Deskripsi Kegiatan *</label>
                <textarea style={{ ...inputStyle, resize: 'vertical' }} rows="3" required value={modal.data.penjelasan || ''} onChange={e => setModal(p => ({ ...p, data: { ...p.data, penjelasan: e.target.value } }))} placeholder="Deskripsi mengenai kegiatan ini..."></textarea>
              </div>

              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
                  <label style={{ ...labelStyle, marginBottom: 0, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Image size={16} color="var(--primary-color)" /> Banner / Poster Kegiatan
                  </label>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', background: '#e2e8f0', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                    Rekomendasi: 1920 × 1080 px (16:9), maks 5 MB
                  </span>
                </div>

                <input
                  ref={bannerFileRef}
                  type="file"
                  id="bannerFileInput"
                  style={{ display: 'none' }}
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleBannerUpload}
                  disabled={uploadingBanner}
                />

                {modal.data.bannerUrl ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    padding: '0.65rem 0.85rem',
                    background: '#ffffff',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: 0 }}>
                      <img
                        src={modal.data.bannerUrl}
                        alt="Banner Preview"
                        style={{
                          width: '96px',
                          height: '54px',
                          objectFit: 'cover',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          flexShrink: 0
                        }}
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                      <div style={{ minWidth: 0, fontSize: '0.82rem' }}>
                        <div style={{ fontWeight: 600, color: '#059669', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <CheckCircle size={15} /> Banner Siap Digunakan
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.2rem' }}>
                          <a
                            href={modal.data.bannerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#2563eb', textDecoration: 'underline', fontSize: '0.75rem' }}
                          >
                            Buka Gambar Penuh ↗
                          </a>
                          <span style={{ color: '#cbd5e1' }}>•</span>
                          <button
                            type="button"
                            onClick={() => bannerFileRef.current?.click()}
                            disabled={uploadingBanner}
                            style={{ background: 'none', border: 'none', color: '#475569', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.75rem', padding: 0 }}
                          >
                            {uploadingBanner ? 'Mengunggah...' : 'Ganti Gambar'}
                          </button>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setModal(p => ({ ...p, data: { ...p.data, bannerUrl: '' } }));
                        if (bannerFileRef.current) bannerFileRef.current.value = '';
                      }}
                      className="btn btn-outline"
                      style={{
                        padding: '0.35rem 0.65rem',
                        fontSize: '0.75rem',
                        color: 'var(--danger)',
                        borderColor: '#fca5a5',
                        background: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        flexShrink: 0
                      }}
                    >
                      <Trash2 size={13} /> Hapus
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => bannerFileRef.current?.click()}
                    disabled={uploadingBanner}
                    className="btn btn-outline"
                    style={{
                      width: '100%',
                      padding: '0.85rem 1rem',
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      background: '#ffffff',
                      border: '1.5px dashed #cbd5e1',
                      borderRadius: '6px',
                      color: 'var(--text-primary)',
                      cursor: uploadingBanner ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {uploadingBanner ? (
                      <>
                        <Loader2 size={16} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                        <span>Mengunggah file banner...</span>
                      </>
                    ) : (
                      <>
                        <Upload size={16} color="var(--primary-color)" />
                        <span>Pilih & Unggah File Banner (JPG, PNG, WEBP)</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              <div>
                <label style={labelStyle}>Status Kegiatan *</label>
                <select style={inputStyle} required value={modal.data.status} onChange={e => setModal(p => ({ ...p, data: { ...p.data, status: e.target.value } }))}>
                  {STATUS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setModal(null)} className="btn btn-outline">Batal</button>
                <button type="submit" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                  {modal.mode === 'edit' ? <Save size={16} /> : <Plus size={16} />} {modal.mode === 'edit' ? 'Simpan Perubahan' : 'Tambah Kegiatan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PESERTA ASLI DARI DATABASE */}
      {pesertaModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '750px', boxShadow: '0 25px 60px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Users size={18} /> Peserta Sertifikat: {pesertaModal.judul}
                </h3>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Total <strong>{pesertaList.length}</strong> peserta telah berhasil mengklaim sertifikat kegiatan ini.
                </p>
              </div>
              <button onClick={() => setPesertaModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Token Acara: <strong>{pesertaModal.certificateToken || '-'}</strong>
                </span>
                <button
                  onClick={exportCSV}
                  disabled={pesertaList.length === 0}
                  className="btn btn-outline"
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <FileDown size={16} /> Ekspor CSV (Excel)
                </button>
              </div>

              <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                {loadingPeserta ? (
                  <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <Loader2 size={24} className="spin" style={{ margin: '0 auto 0.5rem', display: 'block', animation: 'spin 1s linear infinite' }} />
                    Memuat daftar peserta...
                  </div>
                ) : (
                  <table className="admin-table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th>No</th>
                        <th>Nama Peserta</th>
                        <th>Email &amp; Instansi</th>
                        <th>No. Sertifikat</th>
                        <th>Waktu Klaim</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pesertaList.length === 0 ? (
                        <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '2rem' }}>Belum ada peserta yang mengklaim sertifikat kegiatan ini.</td></tr>
                      ) : (
                        pesertaList.map((p, idx) => (
                          <tr key={p.id}>
                            <td style={{ color: 'var(--text-tertiary)' }}>{idx + 1}</td>
                            <td style={{ fontWeight: 600 }}>{p.name || p.nama}</td>
                            <td style={{ fontSize: '0.82rem' }}>
                              <div>{p.email}</div>
                              <div style={{ color: 'var(--text-tertiary)' }}>{p.institution || p.instansi || '-'}</div>
                            </td>
                            <td style={{ fontSize: '0.8rem', fontWeight: 600, color: '#2563eb' }}>
                              {p.certificateNumber || p.certificate_number || '-'}
                            </td>
                            <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                              {p.claimedAt ? new Date(p.claimedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-'}
                            </td>
                            <td>
                              <span className="badge badge-green">Hadir</span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast} onClose={() => setToast('')} />}

      <ImageCropModal
        isOpen={cropModal.isOpen}
        imageSrc={cropModal.imageSrc}
        aspectRatio={16 / 9}
        cropShape="rect"
        title="Sesuaikan & Potong Banner Kegiatan"
        fileName={cropModal.fileName}
        onConfirm={handleCropBannerConfirm}
        onCancel={() => setCropModal(prev => ({ ...prev, isOpen: false, imageSrc: null }))}
      />
    </div>
  );
};

export default AdminKegiatan;
