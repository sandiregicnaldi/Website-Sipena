import React, { useState, useRef, useEffect } from 'react';
import './AdminLayout.css';
import { 
  Users, FileDown, Calendar, Globe, Edit, Trash2, 
  CheckCircle, Plus, Save, KeyRound, Sparkles, RefreshCw, 
  ToggleLeft, ToggleRight, Loader2, Award, Clock, Upload, Image, X, Eye
} from 'lucide-react';
import jsPDF from 'jspdf';
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
  bannerUrl: '', certificateTemplateUrl: '', certNamePosY: 96
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
  const [uploadingCertTemplate, setUploadingCertTemplate] = useState(false);
  const [cropModal, setCropModal] = useState({
    isOpen: false,
    imageSrc: null,
    fileName: 'banner-kegiatan.jpg',
  });
  const bannerFileRef = useRef(null);
  const certTemplateFileRef = useRef(null);

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

  const handleCertTemplateUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf'];
    const validExts = ['.png', '.jpg', '.jpeg', '.webp', '.pdf'];
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();

    if (!validTypes.includes(file.type) && !validExts.includes(ext)) {
      showToast('Template sertifikat harus berformat PNG, JPG, WEBP, atau PDF.');
      if (certTemplateFileRef.current) certTemplateFileRef.current.value = '';
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      showToast('Ukuran berkas template sertifikat maksimal 15 MB.');
      if (certTemplateFileRef.current) certTemplateFileRef.current.value = '';
      return;
    }

    try {
      setUploadingCertTemplate(true);
      const res = await SipenaAPI.uploadCertificateTemplate(file);
      if (res?.url) {
        setModal(p => ({
          ...p,
          data: {
            ...p.data,
            certificateTemplateUrl: res.url
          }
        }));
        showToast('Berkas template sertifikat berhasil diunggah!');
      } else {
        throw new Error('Gagal mengunggah template sertifikat.');
      }
    } catch (err) {
      console.error('Upload template sertifikat failed:', err);
      showToast(err.response?.data?.error || err.message || 'Gagal mengunggah template sertifikat.');
    } finally {
      setUploadingCertTemplate(false);
      if (certTemplateFileRef.current) certTemplateFileRef.current.value = '';
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

  // Unduh Template Resmi Sertifikat A4 Landscape SiPena
  const handleDownloadCertificateTemplate = () => {
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const width = 297;
      const height = 210;

      // Background
      doc.setFillColor(252, 252, 254);
      doc.rect(0, 0, width, height, 'F');

      // Bingkai ganda elegan (Biru Perpusnas & Emas)
      doc.setDrawColor(30, 58, 138); // Blue 900
      doc.setLineWidth(2.5);
      doc.rect(10, 10, width - 20, height - 20);

      doc.setDrawColor(202, 138, 4); // Amber 600
      doc.setLineWidth(0.8);
      doc.rect(14, 14, width - 28, height - 28);

      // Header Lembaga
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 138);
      doc.text('PERPUSNAS PRESS • PERPUSTAKAAN NASIONAL REPUBLIK INDONESIA', 148.5, 30, { align: 'center' });

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Sistem Informasi & Pengelolaan Penerbitan Buku SiPena', 148.5, 36, { align: 'center' });

      // Judul Sertifikat
      doc.setFontSize(26);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('SERTIFIKAT KEHADIRAN', 148.5, 54, { align: 'center' });

      // Kode Nomor Sertifikat
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text('Nomor Registrasi: {{NOMOR_SERTIFIKAT}}', 148.5, 62, { align: 'center' });

      // Diberikan kepada
      doc.setFontSize(12);
      doc.setTextColor(100, 116, 139);
      doc.text('Diberikan dengan hormat kepada:', 148.5, 80, { align: 'center' });

      // Guideline box untuk Nama Peserta
      const targetPosY = Number(modal?.data?.certNamePosY) || 96;
      doc.setDrawColor(37, 99, 235);
      doc.setLineWidth(0.4);
      doc.setLineDashPattern([3, 2], 0);
      doc.roundedRect(48.5, targetPosY - 9, 200, 14, 2, 2, 'S');
      doc.setLineDashPattern([], 0);

      // Nama Peserta Placeholder
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(37, 99, 235);
      doc.text(`{{NAMA_PESERTA}} (Posisi Vertikal Y: ${targetPosY} mm)`, 148.5, targetPosY, { align: 'center' });

      // Instansi Placeholder
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 116, 139);
      doc.text(`{{INSTANSI}} (Posisi Y: ${targetPosY + 8} mm)`, 148.5, targetPosY + 8, { align: 'center' });

      // Keterangan Partisipasi
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text('Atas partisipasi aktif dan kehadirannya dalam kegiatan:', 148.5, 120, { align: 'center' });

      // Judul Kegiatan
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('{{JUDUL_KEGIATAN}} (Posisi Y: 134 mm)', 148.5, 134, { align: 'center' });

      // Tanggal & Waktu
      doc.setFontSize(10.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Diselenggarakan pada {{TANGGAL}} • {{JAM_KEGIATAN}} (Posisi Y: 144 mm)', 148.5, 144, { align: 'center' });

      // Tanda Tangan
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.5);
      doc.line(40, 168, 100, 168);
      doc.line(197, 168, 257, 168);

      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 138);
      doc.text('Panitia Pelaksana', 70, 175, { align: 'center' });
      doc.text('Perpusnas Press', 227, 175, { align: 'center' });

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text('Dokumen ini adalah template resmi SiPena Perpusnas Press dengan guideline penempatan kode koordinat.', 148.5, 194, { align: 'center' });

      doc.save('Template_Sertifikat_SiPena_A4.pdf');
      showToast('Template sertifikat resmi (A4 Landscape) berhasil diunduh!');
    } catch (err) {
      console.error('Gagal generate template sertifikat:', err);
      showToast('Gagal mengunduh template sertifikat.');
    }
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
          <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '680px', maxHeight: '92vh', boxShadow: '0 25px 60px rgba(0,0,0,0.25)', overflow: 'hidden', margin: 'auto', display: 'flex', flexDirection: 'column' }}>
            <div style={{ background: 'linear-gradient(135deg,#1e3a8a,#2563eb)', padding: '1.1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <h3 style={{ color: 'white', margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {modal.mode === 'edit' ? <Edit size={16} /> : <Plus size={16} />} {modal.mode === 'edit' ? 'Edit Kegiatan & Sertifikat' : 'Tambah Kegiatan Baru'}
              </h3>
              <button onClick={() => setModal(null)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: '1rem' }}>×</button>
            </div>
            <form onSubmit={e => { e.preventDefault(); handleSave(modal.data); }} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
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

              {/* ── 1. BANNER / POSTER KEGIATAN (TAMPILAN WEBSITE) ── */}
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.4rem' }}>
                  <div>
                    <label style={{ ...labelStyle, marginBottom: '0.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Image size={16} color="#0284c7" /> 1. Poster / Banner Kegiatan (Tampilan Website &amp; Katalog)
                    </label>
                    <div style={{ fontSize: '0.73rem', color: '#64748b' }}>
                      Gambar rasio 16:9 yang tampil pada halaman Beranda dan Katalog Kegiatan publik SiPena.
                    </div>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#0369a1', background: '#e0f2fe', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
                    Rekomendasi 16:9 (1920×1080 px, maks 5 MB)
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
                          <CheckCircle size={15} /> Banner Acara Siap Digunakan
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
                            {uploadingBanner ? 'Mengunggah...' : 'Ganti Banner'}
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
                        <span>Pilih &amp; Unggah File Banner Acara (JPG, PNG, WEBP)</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* ── 2. TEMPLATE PIAGAM & POSISI NAMA PESERTA (SERTIFIKAT KLAIM) ── */}
              <div style={{ background: '#f8fafc', padding: '1.1rem', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                <input
                  type="file"
                  ref={certTemplateFileRef}
                  style={{ display: 'none' }}
                  accept=".png,.jpg,.jpeg,.webp,.pdf,image/png,image/jpeg,image/webp,application/pdf"
                  onChange={handleCertTemplateUpload}
                  disabled={uploadingCertTemplate}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.4rem' }}>
                  <div>
                    <label style={{ ...labelStyle, marginBottom: '0.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Award size={16} color="#d97706" /> 2. Desain Template Piagam &amp; Posisi Nama (Khusus Sertifikat Peserta)
                    </label>
                    <div style={{ fontSize: '0.73rem', color: '#64748b' }}>
                      Template sertifikat yang diunduh peserta saat klaim kehadiran. Nama peserta akan dicetak otomatis di atas template ini.
                    </div>
                  </div>
                  <span style={{ fontSize: '0.72rem', background: '#fef3c7', color: '#92400e', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
                    A4 Landscape (297×210 mm)
                  </span>
                </div>

                {/* SINGLE UNIFIED UPLOAD CONTROL */}
                {modal.data.certificateTemplateUrl ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '6px',
                    gap: '0.75rem',
                    flexWrap: 'wrap'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, flex: 1 }}>
                      <CheckCircle size={16} color="#16a34a" style={{ flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#166534' }}>
                          Template Piagam Kustom Aktif
                        </div>
                        <a
                          href={modal.data.certificateTemplateUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: '0.72rem',
                            color: '#2563eb',
                            textDecoration: 'underline',
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {modal.data.certificateTemplateUrl.split('/').pop()}
                        </a>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => certTemplateFileRef.current?.click()}
                        disabled={uploadingCertTemplate}
                        className="btn btn-outline"
                        style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', background: '#fff', color: '#1d4ed8', borderColor: '#bfdbfe' }}
                      >
                        {uploadingCertTemplate ? 'Mengunggah...' : 'Ganti Template'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setModal(p => ({ ...p, data: { ...p.data, certificateTemplateUrl: '' } }))}
                        className="btn btn-outline"
                        title="Hapus template dan gunakan standar"
                        style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', color: '#dc2626', borderColor: '#fca5a5', background: '#fff' }}
                      >
                        <Trash2 size={12} /> Hapus
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => certTemplateFileRef.current?.click()}
                    disabled={uploadingCertTemplate}
                    className="btn btn-outline"
                    style={{
                      width: '100%',
                      padding: '0.85rem 1rem',
                      fontSize: '0.82rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem',
                      background: '#ffffff',
                      border: '1.5px dashed #3b82f6',
                      borderRadius: '6px',
                      color: '#1d4ed8',
                      cursor: uploadingCertTemplate ? 'not-allowed' : 'pointer',
                      fontWeight: 600
                    }}
                  >
                    {uploadingCertTemplate ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Loader2 size={16} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                        <span>Mengunggah file template sertifikat...</span>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Upload size={16} />
                          <span>Klik untuk Unggah Desain Template Piagam (PNG, JPG, WEBP, PDF)</span>
                        </div>
                        <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 'normal' }}>
                          Jika tidak diunggah, sertifikat peserta otomatis menggunakan format resmi standar Perpusnas Press.
                        </span>
                      </>
                    )}
                  </button>
                )}

                {/* ── LIVE INTERACTIVE PREVIEW SERTIFIKAT ── */}
                <div style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '0.85rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Eye size={15} color="#2563eb" /> Live Preview Penempatan Nama (A4 Landscape)
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      Pergeseran vertikal realtime: <strong>{modal.data.certNamePosY ?? 96} mm</strong> dari atas
                    </span>
                  </div>

                  {/* KANVAS PREVIEW A4 (297 x 210 mm) */}
                  <div style={{
                    position: 'relative',
                    width: '100%',
                    aspectRatio: '297 / 210',
                    backgroundColor: '#ffffff',
                    border: '1.5px solid #94a3b8',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
                    userSelect: 'none'
                  }}>
                    {/* Background: Custom Image atau Standar Perpusnas */}
                    {modal.data.certificateTemplateUrl && !modal.data.certificateTemplateUrl.toLowerCase().endsWith('.pdf') ? (
                      <img
                        src={modal.data.certificateTemplateUrl}
                        alt="Template Sertifikat"
                        style={{ width: '100%', height: '100%', objectFit: 'fill', display: 'block' }}
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        background: 'linear-gradient(180deg, #fafafc 0%, #f1f5f9 100%)',
                        padding: '3%',
                        boxSizing: 'border-box',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        position: 'relative'
                      }}>
                        {/* Bingkai Ganda Standar */}
                        <div style={{ position: 'absolute', inset: '3%', border: '2px solid #1e3a8a', borderRadius: '3px', pointerEvents: 'none' }} />
                        <div style={{ position: 'absolute', inset: '4.5%', border: '1px solid #ca8a04', borderRadius: '2px', pointerEvents: 'none' }} />

                        <div style={{ fontSize: 'clamp(6px, 1.4vw, 9px)', fontWeight: 800, color: '#1e3a8a', letterSpacing: '0.5px', marginTop: '1.5%', textAlign: 'center' }}>
                          PERPUSNAS PRESS • PERPUSTAKAAN NASIONAL RI
                        </div>
                        <div style={{ fontSize: 'clamp(10px, 2.5vw, 16px)', fontWeight: 900, color: '#0f172a', marginTop: '1.5%', letterSpacing: '0.5px' }}>
                          SERTIFIKAT KEHADIRAN
                        </div>
                        <div style={{ fontSize: 'clamp(5px, 1.1vw, 8px)', color: '#64748b', marginTop: '0.5%' }}>
                          Nomor Registrasi: SIPENA/CERT/2026/XI/0001
                        </div>
                        <div style={{ fontSize: 'clamp(5.5px, 1.2vw, 8.5px)', color: '#64748b', marginTop: '1.5%' }}>
                          Diberikan dengan hormat kepada:
                        </div>

                        {/* Footer / Tanda Tangan */}
                        <div style={{
                          position: 'absolute',
                          bottom: '6%',
                          left: '8%',
                          right: '8%',
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: 'clamp(5px, 1.1vw, 8px)',
                          color: '#1e3a8a',
                          fontWeight: 700
                        }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ width: '40px', borderBottom: '1px solid #cbd5e1', marginBottom: '2px' }} />
                            Panitia Pelaksana
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ width: '40px', borderBottom: '1px solid #cbd5e1', marginBottom: '2px' }} />
                            Perpusnas Press
                          </div>
                        </div>
                      </div>
                    )}

                    {/* OVERLAY NAMA PESERTA DENGAN GARIS GUIDELINE DINAMIS */}
                    {(() => {
                      const posNumber = Number(modal.data.certNamePosY ?? 96);
                      const safePosY = isNaN(posNumber) ? 96 : posNumber;
                      // Persentase top dihitung dari tinggi A4 Landscape (210 mm)
                      const topPercent = Math.min(100, Math.max(0, (safePosY / 210) * 100));

                      return (
                        <div style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          top: `${topPercent}%`,
                          transform: 'translateY(-50%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          pointerEvents: 'none',
                          zIndex: 10,
                          transition: 'top 0.1s ease-out'
                        }}>
                          {/* Garis Horizontal Putus-putus Penanda Y */}
                          <div style={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            height: '1px',
                            borderTop: '1.5px dashed #2563eb',
                            opacity: 0.6
                          }} />

                          {/* Badge Nama Peserta */}
                          <div style={{
                            position: 'relative',
                            background: 'rgba(30, 58, 138, 0.95)',
                            color: '#ffffff',
                            padding: '3px 10px',
                            borderRadius: '4px',
                            fontSize: 'clamp(8px, 1.8vw, 12px)',
                            fontWeight: 800,
                            letterSpacing: '0.3px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}>
                            <span>Nama Lengkap Peserta, S.Kom., M.T.</span>
                            <span style={{
                              fontSize: 'clamp(6px, 1.2vw, 9px)',
                              background: '#3b82f6',
                              color: '#fff',
                              padding: '1px 5px',
                              borderRadius: '3px',
                              fontWeight: 700
                            }}>
                              Y: {safePosY} mm
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* KONTROL PENGATUR POSISI Y (SLIDER & NUMERIC INPUT) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '0.3rem', margin: 0 }}>
                        Atur Posisi Vertikal Nama (Sumbu Y)
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <input
                          style={{
                            ...inputStyle,
                            width: '75px',
                            padding: '0.3rem 0.5rem',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            textAlign: 'center',
                            background: '#fff'
                          }}
                          type="number"
                          min="30"
                          max="190"
                          step="1"
                          required
                          value={modal.data.certNamePosY ?? 96}
                          onChange={e => {
                            const val = Number(e.target.value);
                            setModal(p => ({ ...p, data: { ...p.data, certNamePosY: isNaN(val) ? 96 : val } }));
                          }}
                        />
                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>mm</span>
                      </div>
                    </div>

                    {/* RANGE SLIDER REALTIME */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', width: '36px' }}>30 mm</span>
                      <input
                        type="range"
                        min="30"
                        max="180"
                        step="1"
                        value={modal.data.certNamePosY ?? 96}
                        onChange={e => {
                          const val = Number(e.target.value);
                          setModal(p => ({ ...p, data: { ...p.data, certNamePosY: val } }));
                        }}
                        style={{
                          flex: 1,
                          cursor: 'pointer',
                          accentColor: '#2563eb'
                        }}
                      />
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', width: '42px', textAlign: 'right' }}>180 mm</span>
                    </div>

                    {/* TOMBOL PINTAS PRESET & INDIKATOR KEAMANAN */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.2rem' }}>
                      <div style={{ display: 'flex', gap: '0.3rem' }}>
                        <button
                          type="button"
                          onClick={() => setModal(p => ({ ...p, data: { ...p.data, certNamePosY: 80 } }))}
                          className="btn btn-outline"
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', background: '#fff' }}
                        >
                          Atas (80 mm)
                        </button>
                        <button
                          type="button"
                          onClick={() => setModal(p => ({ ...p, data: { ...p.data, certNamePosY: 96 } }))}
                          className="btn btn-outline"
                          style={{
                            padding: '0.2rem 0.5rem',
                            fontSize: '0.7rem',
                            background: modal.data.certNamePosY === 96 ? '#eff6ff' : '#fff',
                            borderColor: modal.data.certNamePosY === 96 ? '#3b82f6' : '#cbd5e1',
                            color: modal.data.certNamePosY === 96 ? '#1d4ed8' : '#334155',
                            fontWeight: modal.data.certNamePosY === 96 ? 700 : 500
                          }}
                        >
                          Standar (96 mm)
                        </button>
                        <button
                          type="button"
                          onClick={() => setModal(p => ({ ...p, data: { ...p.data, certNamePosY: 115 } }))}
                          className="btn btn-outline"
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', background: '#fff' }}
                        >
                          Bawah (115 mm)
                        </button>
                      </div>

                      {/* Evaluasi Keamanan Posisi Y */}
                      {(() => {
                        const y = Number(modal.data.certNamePosY ?? 96);
                        if (y < 50) {
                          return <span style={{ fontSize: '0.7rem', color: '#dc2626', fontWeight: 600 }}>⚠️ Terlalu tinggi (mendekati header/kop)</span>;
                        }
                        if (y > 165) {
                          return <span style={{ fontSize: '0.7rem', color: '#dc2626', fontWeight: 600 }}>⚠️ Terlalu rendah (mendekati tanda tangan)</span>;
                        }
                        return <span style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 600 }}>✓ Posisi nama aman di bidang piagam</span>;
                      })()}
                    </div>
                  </div>
                </div>

                {/* KOTAK PANDUAN REFERENSI KODE */}
                <div style={{
                  background: '#ffffff',
                  border: '1px dashed #cbd5e1',
                  borderRadius: '6px',
                  padding: '0.65rem 0.85rem',
                  fontSize: '0.73rem',
                  color: '#475569',
                  lineHeight: 1.5
                }}>
                  <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Sparkles size={13} color="#ca8a04" /> Format Kode Placeholder Tag Sertifikat
                  </div>
                  Jika template sertifikat Anda dibuat di Canva / Photoshop, sesuaikan ruang kosong piagam Anda dengan posisi cetak otomatis berikut:
                  <div style={{ marginTop: '0.35rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.25rem' }}>
                    <div>
                      <code style={{ background: '#eff6ff', color: '#1d4ed8', padding: '0.1rem 0.35rem', borderRadius: '4px', fontWeight: 700 }}>{'{{NAMA}}'}</code> : Posisi Y <strong>{modal.data.certNamePosY ?? 96} mm</strong>
                    </div>
                    <div>
                      <code style={{ background: '#f1f5f9', color: '#334155', padding: '0.1rem 0.35rem', borderRadius: '4px', fontWeight: 700 }}>{'{{NOMOR_SERTIFIKAT}}'}</code> : Posisi Y <strong>62 mm</strong>
                    </div>
                    <div>
                      <code style={{ background: '#f1f5f9', color: '#334155', padding: '0.1rem 0.35rem', borderRadius: '4px', fontWeight: 700 }}>{'{{JUDUL_KEGIATAN}}'}</code> : Posisi Y <strong>134 mm</strong>
                    </div>
                    <div>
                      <code style={{ background: '#f1f5f9', color: '#334155', padding: '0.1rem 0.35rem', borderRadius: '4px', fontWeight: 700 }}>{'{{TANGGAL}}'}</code> : Posisi Y <strong>144 mm</strong>
                    </div>
                  </div>
                  <div style={{ marginTop: '0.5rem', paddingTop: '0.4rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={handleDownloadCertificateTemplate}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        color: '#2563eb',
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                    >
                      <FileDown size={12} /> Unduh Contoh Guideline Template Standar (A4 Landscape PDF)
                    </button>
                  </div>
                </div>
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
