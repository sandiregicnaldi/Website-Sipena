import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Clock, ArrowLeft, Users, Share2, CheckCircle, Download, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useEvent } from '../context/EventContext';
import jsPDF from 'jspdf';
import './EventDetail.css';

const EventDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    events,
    daftarKegiatan,
    konfirmasiHadir,
    getPresensiStatus,
    isUserRegistered,
    isUserHadir,
  } = useEvent();

  const eventId = parseInt(id);
  const event   = events.find(e => e.id === eventId) || events[0];

  const [showPinModal, setShowPinModal]   = useState(false);
  const [pinInput, setPinInput]           = useState('');
  const [pinError, setPinError]           = useState('');
  const [presensiStatus, setPresensiStatus] = useState({ open: false, msg: '' });
  const [justRegistered, setJustRegistered] = useState(false);

  // Cek status presensi tiap menit berdasarkan waktuBuka/waktuTutup dari admin
  useEffect(() => {
    if (!event) return;
    const check = () => setPresensiStatus(getPresensiStatus(event));
    check();
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, [event]);

  if (!event) return <div style={{ padding: '4rem', textAlign: 'center' }}>Kegiatan tidak ditemukan.</div>;

  const registered = user ? isUserRegistered(eventId, user.email) || justRegistered : false;
  const hadir      = user ? isUserHadir(eventId, user.email) : false;

  const handleDaftar = () => {
    if (!user) { navigate('/login'); return; }
    const ok = daftarKegiatan(eventId, user);
    if (ok) {
      setJustRegistered(true);
    } else {
      alert('Anda sudah terdaftar dalam kegiatan ini.');
    }
  };

  const handlePresensi = (e) => {
    e.preventDefault();
    if (pinInput.trim() === event.kode) {
      konfirmasiHadir(eventId, user.email);
      setShowPinModal(false);
      setPinInput('');
      setPinError('');
    } else {
      setPinError('PIN salah. Silakan minta PIN yang benar kepada panitia.');
    }
  };

  const downloadSertifikat = () => {
    if (!user) return;
    const doc = new jsPDF({ orientation: 'landscape' });

    doc.setFillColor(245, 247, 250);
    doc.rect(0, 0, 297, 210, 'F');
    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(2);
    doc.rect(10, 10, 277, 190);

    doc.setFontSize(28);
    doc.setTextColor(30, 58, 138);
    doc.text('SERTIFIKAT KEHADIRAN', 148.5, 50, { align: 'center' });

    doc.setFontSize(14);
    doc.setTextColor(71, 85, 105);
    doc.text('Diberikan kepada:', 148.5, 75, { align: 'center' });

    doc.setFontSize(32);
    doc.setTextColor(15, 23, 42);
    doc.text(user.namaLengkap || user.username, 148.5, 100, { align: 'center' });

    doc.setFontSize(14);
    doc.setTextColor(71, 85, 105);
    doc.text('Atas partisipasinya dalam kegiatan:', 148.5, 125, { align: 'center' });

    doc.setFontSize(20);
    doc.setTextColor(37, 99, 235);
    doc.text(event.judul, 148.5, 145, { align: 'center' });

    doc.setFontSize(12);
    doc.setTextColor(100, 116, 139);
    doc.text(`Jakarta, ${new Date(event.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, 148.5, 175, { align: 'center' });

    doc.save(`Sertifikat_${event.judul.replace(/\s+/g, '_')}.pdf`);
  };

  const eventDate = new Date(event.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <main className="event-detail-page">
      <div className="event-hero" style={{ backgroundImage: event.bannerUrl ? `url(${event.bannerUrl})` : 'linear-gradient(135deg, #1e3a8a 0%, #0c4a6e 100%)' }}>
        <div className="event-hero-overlay"></div>
        <div className="container event-hero-content">
          <Link to="/event" className="back-link">
            <ArrowLeft size={16} /> Kembali ke Daftar Kegiatan
          </Link>
          <div className="event-badges">
            <span className="event-badge bg-accent">Terbuka Untuk Umum</span>
          </div>
          <h1 className="event-title-large">{event.judul}</h1>
        </div>
      </div>

      <div className="container">
        <div className="event-content-grid">

          {/* ── KIRI: Deskripsi & Narasumber ── */}
          <div className="event-main-content">
            <section className="event-description-block">
              <h2>Tentang Kegiatan Ini</h2>
              <div className="event-text">
                {(event.penjelasan || '').split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
              </div>
            </section>

            <section className="event-speaker-block">
              <h2>Narasumber / Pembicara</h2>
              {(Array.isArray(event.narasumber) ? event.narasumber : [event.narasumber]).map((n, i) => (
                <div key={i} className="speaker-card" style={{ marginBottom: '0.75rem' }}>
                  <div className="speaker-avatar">
                    <Users size={28} color="var(--text-tertiary)" />
                  </div>
                  <div className="speaker-info">
                    <h3>{n}</h3>
                    <p>Hadir dan berbagi ilmu secara eksklusif</p>
                  </div>
                </div>
              ))}
            </section>
          </div>

          {/* ── KANAN: Info Card + Tombol ── */}
          <aside className="event-sidebar">
            <div className="event-info-card">
              <h3>Detail Waktu &amp; Lokasi</h3>
              <ul className="event-info-list">
                <li>
                  <div className="info-icon"><Calendar size={20} /></div>
                  <div className="info-text">
                    <span className="info-label">Tanggal</span>
                    <span className="info-value">{eventDate}</span>
                  </div>
                </li>
                <li>
                  <div className="info-icon"><Clock size={20} /></div>
                  <div className="info-text">
                    <span className="info-label">Jam Kegiatan</span>
                    <span className="info-value">{event.jamKegiatan} WIB</span>
                  </div>
                </li>
                <li>
                  <div className="info-icon"><MapPin size={20} /></div>
                  <div className="info-text">
                    <span className="info-label">Lokasi</span>
                    <span className="info-value">{event.lokasi}</span>
                    {event.urlZoom && (
                      <a href={event.urlZoom} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: '0.8rem', color: '#2563eb', display: 'block', marginTop: '0.25rem' }}>
                        🌐 Buka Tautan Zoom
                      </a>
                    )}
                  </div>
                </li>
                <li>
                  <div className="info-icon"><Users size={20} /></div>
                  <div className="info-text">
                    <span className="info-label">Kuota Peserta</span>
                    <span className="info-value">{event.peserta} Orang</span>
                  </div>
                </li>
              </ul>

              {/* ── PRESENSI SCHEDULE INFO ── */}
              <div style={{
                background: presensiStatus.open ? '#f0fdf4' : '#f8fafc',
                border: `1px solid ${presensiStatus.open ? '#86efac' : '#e2e8f0'}`,
                borderRadius: '0.5rem', padding: '0.75rem 1rem', marginBottom: '1rem',
                display: 'flex', alignItems: 'center', gap: '0.6rem'
              }}>
                <KeyRound size={16} color={presensiStatus.open ? '#16a34a' : '#94a3b8'} />
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: presensiStatus.open ? '#15803d' : '#64748b' }}>
                    Presensi: {presensiStatus.open ? '🟢 Sedang Dibuka' : '🔴 Belum / Sudah Ditutup'}
                  </div>
                  {!presensiStatus.open && (
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                      {event.waktuBuka} – {event.waktuTutup} WIB
                    </div>
                  )}
                  {presensiStatus.open && (
                    <div style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 700, letterSpacing: '1px', marginTop: '0.2rem' }}>
                      PIN: {event.kode}
                    </div>
                  )}
                </div>
              </div>

              <div className="event-actions-sidebar">
                {/* ── BUTTON LOGIC ── */}
                {!user ? (
                  <button className="btn btn-primary w-100" onClick={() => navigate('/login')}>
                    Masuk untuk Mendaftar
                  </button>
                ) : !registered ? (
                  <button className="btn btn-primary w-100" onClick={handleDaftar}>
                    🎫 Daftar Sekarang
                  </button>
                ) : !hadir ? (
                  <>
                    <div style={{ background: '#f0fdf4', color: '#166534', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                      <CheckCircle size={18} /> Anda sudah terdaftar
                    </div>
                    {event.urlZoom && (
                      <a href={event.urlZoom} target="_blank" rel="noopener noreferrer"
                        className="btn btn-outline w-100 mb-2" style={{ textAlign: 'center', display: 'block', marginBottom: '0.75rem' }}>
                        🔗 Buka Tautan Zoom
                      </a>
                    )}
                    <button
                      className="btn w-100"
                      onClick={() => setShowPinModal(true)}
                      disabled={!presensiStatus.open}
                      style={{
                        background: presensiStatus.open
                          ? 'linear-gradient(135deg, #16a34a, #15803d)'
                          : '#e2e8f0',
                        color: presensiStatus.open ? 'white' : '#94a3b8',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        padding: '0.85rem',
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        cursor: presensiStatus.open ? 'pointer' : 'not-allowed',
                        transition: 'all 0.2s',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                      }}
                    >
                      📝 Isi Daftar Hadir {presensiStatus.open && <span style={{ background: 'rgba(255,255,255,0.25)', borderRadius: '4px', padding: '0 6px', fontSize: '0.8rem' }}>BUKA</span>}
                    </button>
                    {!presensiStatus.open && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '0.5rem', textAlign: 'center' }}>
                        {presensiStatus.msg}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div style={{ background: '#f0fdf4', color: '#166534', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                      <CheckCircle size={18} /> Presensi Berhasil Dicatat!
                    </div>
                    <button className="btn btn-primary w-100" onClick={downloadSertifikat}
                      style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                      <Download size={18} /> Unduh Sertifikat
                    </button>
                  </>
                )}

                <button className="btn btn-outline w-100 mt-2"
                  style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '0.75rem' }}
                  onClick={() => { navigator.clipboard.writeText(window.location.href); alert('Tautan berhasil disalin!'); }}>
                  <Share2 size={16} /> Bagikan
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* ── MODAL PIN PRESENSI ── */}
      {showPinModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '420px', boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <KeyRound size={22} color="#2563eb" /> Isi Daftar Hadir
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Masukkan Kode PIN Presensi yang diberikan oleh panitia atau tampil di layar acara.
            </p>
            <form onSubmit={handlePresensi}>
              <input
                type="text"
                placeholder="Masukkan PIN"
                required
                autoFocus
                value={pinInput}
                onChange={e => { setPinInput(e.target.value); setPinError(''); }}
                style={{
                  width: '100%', padding: '0.85rem', border: `2px solid ${pinError ? '#ef4444' : 'var(--border-color)'}`,
                  borderRadius: 'var(--radius-md)', marginBottom: '0.5rem', fontSize: '1.4rem',
                  textAlign: 'center', letterSpacing: '4px', boxSizing: 'border-box', fontWeight: 700
                }}
              />
              {pinError && (
                <p style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: '1rem', textAlign: 'center' }}>{pinError}</p>
              )}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => { setShowPinModal(false); setPinInput(''); setPinError(''); }}>Batal</button>
                <button type="submit" className="btn btn-primary">✅ Konfirmasi Hadir</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
};

export default EventDetail;
