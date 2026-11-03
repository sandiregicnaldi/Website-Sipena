import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  Calendar, MapPin, Clock, ArrowLeft, Users, Share2, 
  CheckCircle, Download, ExternalLink, Award, Sparkles, 
  AlertCircle, KeyRound, Loader2, Info, Check, ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useEvent, checkIfClaimOpen } from '../context/EventContext';
import { useDialog } from '../context/DialogContext';
import { SipenaAPI } from '../lib/api';
import jsPDF from 'jspdf';
import './EventDetail.css';

const EventDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { showToast } = useDialog();
  const navigate = useNavigate();
  const { events, claimCertificate } = useEvent();

  // State Event & User Certificate
  const [eventDetail, setEventDetail] = useState(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [userCert, setUserCert] = useState(null);

  // Status Klaim Otomatis
  const [claimStatus, setClaimStatus] = useState({ open: false, msg: '' });

  // Modal State
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimToken, setClaimToken] = useState('');
  const [claimName, setClaimName] = useState('');
  const [claimInstitution, setClaimInstitution] = useState('');
  const [claimError, setClaimError] = useState('');
  const [submittingClaim, setSubmittingClaim] = useState(false);

  // Ambil detail event dan data sertifikat dari backend
  useEffect(() => {
    let isMounted = true;
    const loadDetail = async () => {
      try {
        setLoadingEvent(true);
        const data = await SipenaAPI.getEventById(id);
        if (isMounted && data) {
          setEventDetail(data);
          if (data.userCertificate) {
            setUserCert(data.userCertificate);
          }
        }
      } catch (err) {
        // Fallback ke events dari context
        const found = events.find(e => String(e.id) === String(id));
        if (isMounted && found) {
          setEventDetail(found);
        }
      } finally {
        if (isMounted) setLoadingEvent(false);
      }
    };

    if (id) {
      loadDetail();
    }
    return () => { isMounted = false; };
  }, [id, events, user]);

  // Siapkan nilai awal modal saat user tersedia
  useEffect(() => {
    if (user) {
      setClaimName(user.namaLengkap || user.name || '');
      setClaimInstitution(user.instansi || user.domisili || '');
    }
  }, [user]);

  // Evaluasi status pembukaan klaim sertifikat secara real-time
  useEffect(() => {
    const activeEvent = eventDetail || events.find(e => String(e.id) === String(id));
    if (!activeEvent) return;

    const check = () => {
      const status = checkIfClaimOpen(activeEvent);
      setClaimStatus(status);
    };

    check();
    const timer = setInterval(check, 30000); // Periksa tiap 30 detik
    return () => clearInterval(timer);
  }, [eventDetail, events, id]);

  const event = eventDetail || events.find(e => String(e.id) === String(id));

  if (loadingEvent && !event) {
    return (
      <div style={{ padding: '6rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <Loader2 size={32} className="spin" style={{ margin: '0 auto 1rem', display: 'block', animation: 'spin 1s linear infinite' }} />
        Memuat informasi kegiatan...
      </div>
    );
  }

  if (!event) {
    return (
      <div style={{ padding: '6rem 2rem', textAlign: 'center' }}>
        <h2>Kegiatan Tidak Ditemukan</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Kegiatan yang Anda cari mungkin telah dihapus atau tautan tidak valid.</p>
        <Link to="/event" className="btn btn-primary">
          <ArrowLeft size={16} /> Kembali ke Daftar Kegiatan
        </Link>
      </div>
    );
  }

  // Generate & Unduh Dokumen Resmi PDF Sertifikat
  const downloadCertificatePDF = (certData) => {
    if (!event) return;
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const width = 297;
      const height = 210;

      // Background
      doc.setFillColor(250, 250, 252);
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

      // Nomor Registrasi Sertifikat Resmi
      const certNumber = certData?.certificateNumber || certData?.certificate_number || `SIPENA/CERT/${new Date().getFullYear()}/XI/0001`;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(`Nomor Registrasi: ${certNumber}`, 148.5, 62, { align: 'center' });

      // Diberikan kepada
      doc.setFontSize(12);
      doc.setTextColor(100, 116, 139);
      doc.text('Diberikan dengan hormat kepada:', 148.5, 80, { align: 'center' });

      // Nama Peserta
      const recipientName = certData?.name || user?.namaLengkap || user?.name || 'Peserta Terdaftar';
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 138);
      doc.text(recipientName, 148.5, 96, { align: 'center' });

      // Instansi jika ada
      if (certData?.institution) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(71, 85, 105);
        doc.text(certData.institution, 148.5, 104, { align: 'center' });
      }

      // Keterangan Partisipasi
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text('Atas partisipasi aktif dan kehadirannya dalam kegiatan:', 148.5, 120, { align: 'center' });

      // Judul Kegiatan
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(event.judul || event.title || 'Kegiatan SiPena', 148.5, 134, { align: 'center' });

      // Tanggal & Waktu
      const eventDateStr = new Date(event.tanggal || event.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      doc.setFontSize(10.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`Diselenggarakan pada ${eventDateStr} • ${event.jamKegiatan || event.time || ''}`, 148.5, 144, { align: 'center' });

      // Tanda Tangan
      doc.setDrawColor(226, 232, 240);
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
      doc.text('Dokumen ini resmi diterbitkan secara elektronik melalui Portal SiPena Perpusnas Press.', 148.5, 194, { align: 'center' });

      const fileName = `Sertifikat_${(event.judul || event.title || 'Kegiatan').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      doc.save(fileName);
      showToast({ message: 'Sertifikat berhasil diunduh dalam format PDF!', type: 'success' });
    } catch (err) {
      console.error("Gagal generate PDF:", err);
      showToast({ message: 'Terjadi kendala saat mengunduh sertifikat.', type: 'danger' });
    }
  };

  // Submit Klaim Sertifikat via API
  const handleClaimSubmit = async (e) => {
    e.preventDefault();
    setClaimError('');
    if (!claimToken.trim()) {
      setClaimError('Kode token sertifikat wajib diisi.');
      return;
    }
    if (!claimName.trim()) {
      setClaimError('Nama lengkap untuk sertifikat wajib diisi.');
      return;
    }

    try {
      setSubmittingClaim(true);
      const res = await claimCertificate(event.id, {
        token: claimToken.trim(),
        name: claimName.trim(),
        institution: claimInstitution.trim() || undefined,
      });

      const cert = res.certificate;
      setUserCert(cert);
      setShowClaimModal(false);
      setClaimToken('');
      showToast({ message: res.message || 'Sertifikat berhasil diterbitkan!', type: 'success' });

      // Otomatis unduh PDF setelah berhasil klaim
      setTimeout(() => {
        downloadCertificatePDF(cert);
      }, 400);
    } catch (err) {
      console.error("Error claim certificate:", err);
      const errMsg = err?.response?.data?.error || err.message || 'Gagal mengklaim sertifikat. Periksa kembali token Anda.';
      setClaimError(errMsg);
    } finally {
      setSubmittingClaim(false);
    }
  };

  const eventDate = new Date(event.tanggal || event.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const speakers = Array.isArray(event.narasumber) ? event.narasumber : (event.speakers || []);
  const zoomUrl = event.urlZoom || event.zoomUrl;

  return (
    <main className="event-detail-page">
      {/* ── HERO BANNER ── */}
      <div className="event-hero" style={{ backgroundImage: (event.bannerUrl || event.imageUrl) ? `url("${event.bannerUrl || event.imageUrl}")` : 'linear-gradient(135deg, #1e3a8a 0%, #0c4a6e 100%)' }}>
        <div className="event-hero-overlay"></div>
        <div className="container event-hero-content">
          <Link to="/event" className="back-link">
            <ArrowLeft size={16} /> Kembali ke Daftar Kegiatan
          </Link>
          <div className="event-badges">
            <span className="event-badge bg-accent">Terbuka Untuk Umum</span>
            {event.status && (
              <span className={`event-badge ${event.status === 'Selesai' ? 'bg-secondary' : 'bg-primary'}`}>
                {event.status}
              </span>
            )}
          </div>
          <h1 className="event-title-large">{event.judul || event.title}</h1>
        </div>
      </div>

      <div className="container">
        <div className="event-content-grid">

          {/* ── KIRI: Deskripsi & Narasumber ── */}
          <div className="event-main-content">
            <section className="event-description-block">
              <h2>Tentang Kegiatan Ini</h2>
              <div className="event-text">
                {(event.penjelasan || event.description || 'Tidak ada deskripsi rinci untuk kegiatan ini.').split('\n\n').map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </section>

            <section className="event-speaker-block">
              <h2>Narasumber / Pembicara</h2>
              {speakers.length === 0 ? (
                <p style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>Narasumber akan diumumkan segera.</p>
              ) : (
                speakers.map((n, i) => (
                  <div key={i} className="speaker-card" style={{ marginBottom: '0.75rem' }}>
                    <div className="speaker-avatar">
                      <Users size={28} color="var(--text-tertiary)" />
                    </div>
                    <div className="speaker-info">
                      <h3>{n}</h3>
                      <p>Hadir dan berbagi ilmu secara eksklusif</p>
                    </div>
                  </div>
                ))
              )}
            </section>

            {/* Panduan Alur Sertifikat Baru */}
            <section style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem 1.5rem',
              marginTop: '1.5rem'
            }}>
              <h3 style={{ fontSize: '1rem', color: '#1e293b', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={18} color="#2563eb" /> Alur Klaim Sertifikat Kehadiran
              </h3>
              <ol style={{ paddingLeft: '1.25rem', margin: 0, fontSize: '0.875rem', color: '#475569', lineHeight: 1.7 }}>
                <li>Ikuti sesi acara melalui <strong>Tautan Zoom</strong> yang tercantum di halaman ini.</li>
                <li>Pada <strong>15 menit sebelum acara berakhir</strong>, panitia akan mengumumkan <strong>Token Sertifikat</strong> di layar presentasi / chat Zoom.</li>
                <li>Gunakan tombol <strong>"Klaim &amp; Unduh Sertifikat"</strong> pada halaman ini, masukkan token yang didapat, dan sertifikat resmi Anda akan langsung terbit serta tersimpan di akun Anda.</li>
              </ol>
            </section>
          </div>

          {/* ── KANAN: Sidebar Card + Tombol Aksi ── */}
          <aside className="event-sidebar">
            <div className="event-info-card">
              <h3>Detail Pelaksanaan</h3>
              <ul className="event-info-list">
                <li>
                  <div className="info-icon"><Calendar size={20} /></div>
                  <div className="info-text">
                    <span className="info-label">Tanggal Pelaksanaan</span>
                    <span className="info-value">{eventDate}</span>
                  </div>
                </li>
                <li>
                  <div className="info-icon"><Clock size={20} /></div>
                  <div className="info-text">
                    <span className="info-label">Waktu</span>
                    <span className="info-value">{(event.jamKegiatan || event.time || '09:00 - 12:00')} WIB</span>
                  </div>
                </li>
                <li>
                  <div className="info-icon"><MapPin size={20} /></div>
                  <div className="info-text">
                    <span className="info-label">Lokasi Acara</span>
                    <span className="info-value">{event.lokasi || event.location || 'Online / Aula Perpusnas'}</span>
                  </div>
                </li>
              </ul>

              {/* ── AKSES ZOOM LANGSUNG (PUBLIC TANPA LOGIN) ── */}
              {zoomUrl ? (
                <div style={{
                  background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                  border: '1px solid #93c5fd',
                  borderRadius: '0.75rem',
                  padding: '1rem',
                  marginBottom: '1.25rem'
                }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e40af', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                    <ExternalLink size={16} /> Tautan Acara Virtual (Zoom)
                  </div>
                  <p style={{ fontSize: '0.78rem', color: '#3b82f6', margin: '0 0 0.75rem', lineHeight: 1.4 }}>
                    Terbuka untuk umum. Klik tombol di bawah untuk langsung bergabung ke ruang konferensi Zoom:
                  </p>
                  <a
                    href={zoomUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary w-100"
                    style={{
                      background: '#2563eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      textDecoration: 'none',
                      fontSize: '0.9rem',
                      fontWeight: 600
                    }}
                  >
                    <ExternalLink size={16} /> Gabung Sesi Zoom
                  </a>
                </div>
              ) : (
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.5rem',
                  padding: '0.75rem',
                  marginBottom: '1.25rem',
                  fontSize: '0.8rem',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}>
                  <Info size={15} /> Tautan ruang pertemuan virtual akan disediakan panitia saat acara berlangsung.
                </div>
              )}

              {/* ── KARTU SERTIFIKAT KEHADIRAN RESMI ── */}
              <div style={{
                background: userCert ? '#f0fdf4' : (claimStatus.open ? '#f0fdf4' : '#fffbeb'),
                border: `1px solid ${userCert ? '#86efac' : (claimStatus.open ? '#86efac' : '#fde68a')}`,
                borderRadius: '0.75rem',
                padding: '1rem',
                marginBottom: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                  <Award size={18} color={userCert ? '#16a34a' : (claimStatus.open ? '#16a34a' : '#d97706')} />
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: userCert ? '#166534' : (claimStatus.open ? '#166534' : '#92400e') }}>
                    Sertifikat Kehadiran
                  </span>
                </div>

                {/* Kondisi 1: User Sudah Memiliki Sertifikat */}
                {userCert ? (
                  <div>
                    <div style={{
                      background: 'white',
                      border: '1px solid #bbf7d0',
                      borderRadius: '0.5rem',
                      padding: '0.75rem',
                      fontSize: '0.8rem',
                      color: '#166534',
                      marginBottom: '0.75rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
                        <ShieldCheck size={16} color="#16a34a" /> Terverifikasi &amp; Tersimpan di Akun
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.25rem' }}>
                        No: <strong>{userCert.certificateNumber || userCert.certificate_number}</strong>
                      </div>
                    </div>
                    <button
                      className="btn w-100"
                      onClick={() => downloadCertificatePDF(userCert)}
                      style={{
                        background: '#16a34a',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        fontWeight: 600,
                        padding: '0.75rem'
                      }}
                    >
                      <Download size={18} /> Unduh Sertifikat (PDF)
                    </button>
                  </div>
                ) : (
                  /* Kondisi 2: Belum Klaim */
                  <div>
                    <p style={{ fontSize: '0.78rem', color: '#475569', margin: '0 0 0.75rem', lineHeight: 1.4 }}>
                      Dapatkan sertifikat resmi dengan memasukkan token yang diumumkan panitia di ruang Zoom (15 menit sebelum acara usai).
                    </p>

                    {/* Jika Klaim Belum Buka */}
                    {!claimStatus.open ? (
                      <div style={{
                        background: '#fef3c7',
                        border: '1px solid #fde047',
                        borderRadius: '0.5rem',
                        padding: '0.65rem',
                        fontSize: '0.78rem',
                        color: '#92400e',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.45rem'
                      }}>
                        <Clock size={16} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                        <div>
                          <strong>Klaim Belum Dibuka</strong>
                          <div style={{ marginTop: '0.15rem' }}>
                            {claimStatus.msg || 'Tombol klaim akan aktif otomatis 15 menit sebelum acara Zoom berakhir.'}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Jika Klaim Sedang Buka */
                      <div>
                        {!user ? (
                          <button
                            className="btn btn-primary w-100"
                            onClick={() => navigate('/login')}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.5rem',
                              fontWeight: 600
                            }}
                          >
                            Masuk untuk Klaim Sertifikat
                          </button>
                        ) : (
                          <button
                            className="btn w-100"
                            onClick={() => setShowClaimModal(true)}
                            style={{
                              background: 'linear-gradient(135deg, #16a34a, #15803d)',
                              color: 'white',
                              border: 'none',
                              borderRadius: 'var(--radius-md)',
                              padding: '0.85rem',
                              fontWeight: 700,
                              fontSize: '0.95rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.5rem',
                              boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)'
                            }}
                          >
                            <Sparkles size={18} /> Klaim &amp; Unduh Sertifikat
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── BAGIKAN KEGIATAN ── */}
              <button
                className="btn btn-outline w-100"
                style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
                onClick={() => { 
                  navigator.clipboard.writeText(window.location.href); 
                  showToast({ message: 'Tautan kegiatan berhasil disalin ke clipboard!', type: 'info' }); 
                }}
              >
                <Share2 size={16} /> Salin Tautan Kegiatan
              </button>
            </div>
          </aside>
        </div>
      </div>

      {/* ── MODAL KLAIM SERTIFIKAT DENGAN TOKEN ── */}
      {showClaimModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
          backdropFilter: 'blur(3px)'
        }}>
          <div style={{
            background: 'white', padding: '2rem', borderRadius: 'var(--radius-lg)',
            width: '100%', maxWidth: '440px', boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
            position: 'relative'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e3a8a' }}>
              <Award size={24} color="#2563eb" /> Klaim Sertifikat Kehadiran
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              Masukkan <strong>Token Sertifikat Khusus</strong> yang telah diumumkan oleh panitia di layar atau chat Zoom.
            </p>

            <form onSubmit={handleClaimSubmit}>
              {/* Token Input */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Kode Token Sertifikat *
                </label>
                <input
                  type="text"
                  placeholder="Mis: SIPENA-LIT2026"
                  required
                  autoFocus
                  value={claimToken}
                  onChange={e => { setClaimToken(e.target.value.toUpperCase()); setClaimError(''); }}
                  style={{
                    width: '100%', padding: '0.85rem',
                    border: `2px solid ${claimError ? '#ef4444' : '#2563eb'}`,
                    borderRadius: 'var(--radius-md)', fontSize: '1.25rem',
                    textAlign: 'center', letterSpacing: '2px', boxSizing: 'border-box',
                    fontWeight: 700, textTransform: 'uppercase', background: '#f8fafc'
                  }}
                />
              </div>

              {/* Nama Lengkap Input */}
              <div style={{ marginBottom: '0.9rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Nama Lengkap (untuk dicetak di Sertifikat) *
                </label>
                <input
                  type="text"
                  required
                  value={claimName}
                  onChange={e => setClaimName(e.target.value)}
                  placeholder="Nama Lengkap beserta Gelar"
                  style={{
                    width: '100%', padding: '0.65rem 0.85rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)', fontSize: '0.9rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Asal Instansi Input */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Asal Instansi / Universitas / Lembaga (Opsional)
                </label>
                <input
                  type="text"
                  value={claimInstitution}
                  onChange={e => setClaimInstitution(e.target.value)}
                  placeholder="Contoh: Perpustakaan Nasional RI / Umum"
                  style={{
                    width: '100%', padding: '0.65rem 0.85rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)', fontSize: '0.9rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Error Message */}
              {claimError && (
                <div style={{
                  background: '#fef2f2', border: '1px solid #fecaca',
                  borderRadius: '0.5rem', padding: '0.6rem 0.8rem',
                  fontSize: '0.8rem', color: '#b91c1c', marginBottom: '1rem',
                  display: 'flex', alignItems: 'center', gap: '0.4rem'
                }}>
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{claimError}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  disabled={submittingClaim}
                  onClick={() => { setShowClaimModal(false); setClaimError(''); }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submittingClaim}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  {submittingClaim ? (
                    <>
                      <Loader2 size={16} className="spin" style={{ animation: 'spin 1s linear infinite' }} /> Memvalidasi...
                    </>
                  ) : (
                    <>
                      <Check size={16} /> Validasi &amp; Terbitkan Sertifikat
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
};

export default EventDetail;
