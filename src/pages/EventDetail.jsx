import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Clock, ArrowLeft, Users, Share2, CheckCircle, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import jsPDF from 'jspdf';
import './EventDetail.css';

// Mock database matching the EventSection data
const MOCK_EVENTS = [
  {
    id: 1,
    title: 'Peluncuran Buku Sejarah Nusantara',
    date: '25 Agustus 2026',
    time: '09:00 - 12:00 WIB',
    location: 'Gedung Perpustakaan Nasional RI',
    address: 'Jl. Medan Merdeka Sel. No.11, Jakarta Pusat',
    image: 'https://images.unsplash.com/photo-1544928147-79a2dbc1f389?auto=format&fit=crop&w=1200&q=80',
    description: 'Acara peluncuran buku terbaru terbitan Perpusnas Press dengan bedah buku bersama penulis.',
    fullContent: `Bergabunglah bersama kami dalam acara peluncuran buku terbaru terbitan Perpusnas Press yang berjudul "Sejarah Nusantara". Acara ini akan mengupas tuntas latar belakang penulisan, riset yang dilakukan, serta temuan-temuan baru terkait sejarah nusantara yang jarang terekspos.\n\nSelain peluncuran, akan ada sesi bedah buku yang menghadirkan narasumber ahli di bidang sejarah, serta sesi tanya jawab interaktif dengan penulis.\n\nPeserta yang hadir secara langsung akan mendapatkan kesempatan untuk membeli buku dengan harga khusus dan mendapatkan tanda tangan penulis. Jangan lewatkan kesempatan berharga ini!`,
    speaker: 'Prof. Dr. H. Aminuddin, M.A. (Sejarawan)',
    quota: 150,
    pinPresensi: '123456',
    zoomLink: 'https://zoom.us/j/123456789'
  }
];

const EventDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Mock states for demonstration
  const [isRegistered, setIsRegistered] = useState(false);
  const [hasAttended, setHasAttended] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [presensiStatus, setPresensiStatus] = useState({ open: true, msg: '' });

  const event = MOCK_EVENTS.find(e => e.id === parseInt(id)) || MOCK_EVENTS[0];

  React.useEffect(() => {
    const checkPresensiOpen = () => {
      const months = { 'Januari': 0, 'Februari': 1, 'Maret': 2, 'April': 3, 'Mei': 4, 'Juni': 5, 'Juli': 6, 'Agustus': 7, 'September': 8, 'Oktober': 9, 'November': 10, 'Desember': 11 };
      
      const dateParts = event.date.split(' ');
      if(dateParts.length !== 3) return { open: true, msg: '' };
      const day = parseInt(dateParts[0]);
      const month = months[dateParts[1]];
      const year = parseInt(dateParts[2]);

      const timeParts = event.time.split(' - ');
      if(timeParts.length !== 2) return { open: true, msg: '' };
      const endTimeStr = timeParts[1].replace(' WIB', '').trim();
      const [endHr, endMin] = endTimeStr.split(':').map(Number);

      const eventEndTime = new Date(year, month, day, endHr, endMin, 0);
      const eventOpenTime = new Date(eventEndTime.getTime() - 10 * 60000); // 10 menit sebelum acara selesai

      const now = new Date();

      if (now < eventOpenTime) {
        return { open: false, msg: `Presensi akan dibuka pada ${eventOpenTime.toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})} WIB (10 menit sebelum acara selesai)` };
      } else if (now > eventEndTime) {
        return { open: false, msg: 'Waktu presensi telah berakhir.' };
      } else {
        return { open: true, msg: '' };
      }
    };

    setPresensiStatus(checkPresensiOpen());
    const interval = setInterval(() => {
      setPresensiStatus(checkPresensiOpen());
    }, 60000); // Cek setiap menit

    return () => clearInterval(interval);
  }, [event]);

  const handleDaftar = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    setIsRegistered(true);
    alert('Anda berhasil terdaftar dalam kegiatan ini!');
  };

  const handlePresensi = (e) => {
    e.preventDefault();
    if (pinInput === event.pinPresensi) {
      setHasAttended(true);
      setShowPinModal(false);
      alert('Presensi berhasil dicatat! Anda sekarang dapat mengunduh sertifikat.');
    } else {
      alert('PIN Presensi salah. Silakan coba lagi.');
    }
  };

  const downloadSertifikat = () => {
    if (!user) return;
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
    doc.text(event.title, 148.5, 145, { align: 'center' });

    // Date
    doc.setFontSize(12);
    doc.setTextColor(100, 116, 139);
    doc.text(`Jakarta, ${event.date}`, 148.5, 175, { align: 'center' });

    doc.save(`Sertifikat_${event.title.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <main className="event-detail-page">
      <div className="event-hero" style={{backgroundImage: `url(${event.image})`}}>
        <div className="event-hero-overlay"></div>
        <div className="container event-hero-content">
          <Link to="/" className="back-link">
            <ArrowLeft size={16} /> Kembali ke Beranda
          </Link>
          <div className="event-badges">
            <span className="event-badge bg-accent">Terbuka Untuk Umum</span>
          </div>
          <h1 className="event-title-large">{event.title}</h1>
        </div>
      </div>

      <div className="container">
        <div className="event-content-grid">
          
          <div className="event-main-content">
            <section className="event-description-block">
              <h2>Tentang Kegiatan Ini</h2>
              <div className="event-text">
                {event.fullContent.split('\n\n').map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </section>

            <section className="event-speaker-block">
              <h2>Narasumber / Pembicara</h2>
              <div className="speaker-card">
                <div className="speaker-avatar">
                  <Users size={32} color="var(--text-tertiary)" />
                </div>
                <div className="speaker-info">
                  <h3>{event.speaker}</h3>
                  <p>Hadir dan berbagi ilmu secara eksklusif</p>
                </div>
              </div>
            </section>
          </div>

          <aside className="event-sidebar">
            <div className="event-info-card">
              <h3>Detail Waktu & Lokasi</h3>
              <ul className="event-info-list">
                <li>
                  <div className="info-icon"><Calendar size={20} /></div>
                  <div className="info-text">
                    <span className="info-label">Tanggal</span>
                    <span className="info-value">{event.date}</span>
                  </div>
                </li>
                <li>
                  <div className="info-icon"><Clock size={20} /></div>
                  <div className="info-text">
                    <span className="info-label">Waktu</span>
                    <span className="info-value">{event.time}</span>
                  </div>
                </li>
                <li>
                  <div className="info-icon"><MapPin size={20} /></div>
                  <div className="info-text">
                    <span className="info-label">Lokasi</span>
                    <span className="info-value">{event.location}</span>
                    <span className="info-subtext">{event.address}</span>
                  </div>
                </li>
                <li>
                  <div className="info-icon"><Users size={20} /></div>
                  <div className="info-text">
                    <span className="info-label">Kuota Peserta</span>
                    <span className="info-value">{event.quota} {typeof event.quota === 'number' ? 'Orang' : ''}</span>
                  </div>
                </li>
              </ul>

              <div className="event-actions-sidebar">
                {/* ── BUTTON LOGIC ── */}
                {!user ? (
                  <button className="btn btn-primary w-100" onClick={() => navigate('/login')}>
                    Masuk untuk Mendaftar
                  </button>
                ) : !isRegistered ? (
                  <button className="btn btn-primary w-100" onClick={handleDaftar}>
                    Daftar Kegiatan
                  </button>
                ) : !hasAttended ? (
                  <>
                    <div style={{background: '#f0fdf4', color: '#166534', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem'}}>
                      <CheckCircle size={18} /> Anda sudah terdaftar
                    </div>
                    {event.zoomLink && (
                      <a href={event.zoomLink} target="_blank" rel="noopener noreferrer" className="btn btn-outline w-100 mb-2" style={{textAlign: 'center'}}>
                        🔗 Buka Tautan Acara (Zoom/YT)
                      </a>
                    )}
                    <button 
                      className="btn btn-primary w-100" 
                      onClick={() => setShowPinModal(true)}
                      disabled={!presensiStatus.open}
                      style={{ opacity: presensiStatus.open ? 1 : 0.6, cursor: presensiStatus.open ? 'pointer' : 'not-allowed' }}
                    >
                      📝 Isi Daftar Hadir
                    </button>
                    {!presensiStatus.open && (
                      <div style={{fontSize: '0.75rem', color: 'var(--danger)', marginTop: '0.5rem', textAlign: 'center', fontWeight: 600}}>
                        {presensiStatus.msg}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div style={{background: '#f0fdf4', color: '#166534', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem'}}>
                      <CheckCircle size={18} /> Presensi Berhasil
                    </div>
                    <button className="btn btn-primary w-100" onClick={downloadSertifikat} style={{display: 'flex', justifyContent: 'center', gap: '0.5rem'}}>
                      <Download size={18} /> Unduh Sertifikat
                    </button>
                  </>
                )}
                
                <button className="btn btn-outline w-100 mt-2" style={{display: 'flex', justifyContent: 'center', gap: '0.5rem'}} onClick={() => alert('Tautan berhasil disalin!')}>
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
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '400px' }}>
            <h3 style={{marginTop: 0, marginBottom: '0.5rem'}}>Isi Daftar Hadir</h3>
            <p style={{fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem'}}>
              Silakan masukkan Kode Presensi / PIN yang diberikan oleh panitia acara (Hint: 123456).
            </p>
            <form onSubmit={handlePresensi}>
              <input 
                type="text" 
                placeholder="Masukkan PIN" 
                required 
                value={pinInput} 
                onChange={e => setPinInput(e.target.value)}
                style={{width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: '1.2rem', textAlign: 'center', letterSpacing: '2px'}}
              />
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowPinModal(false)}>Batal</button>
                <button type="submit" className="btn btn-primary">Konfirmasi Hadir</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </main>
  );
};

export default EventDetail;
