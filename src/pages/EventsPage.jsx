import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, ArrowRight, Clock, Users } from 'lucide-react';
import { useEvent } from '../context/EventContext';
import './EventsPage.css';

const STATUS_COLOR = {
  'Akan Datang': { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  'Segera':      { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  'Selesai':     { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
};

// Fallback gambar berdasarkan kata kunci judul
const getDefaultImage = (judul = '') => {
  const lower = judul.toLowerCase();
  if (lower.includes('workshop') || lower.includes('penulisan'))
    return 'https://images.unsplash.com/photo-1455390582262-044cdead27d8?auto=format&fit=crop&w=600&q=80';
  if (lower.includes('seminar') || lower.includes('digital'))
    return 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80';
  if (lower.includes('pameran') || lower.includes('koleksi'))
    return 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=600&q=80';
  return 'https://images.unsplash.com/photo-1544928147-79a2dbc1f389?auto=format&fit=crop&w=600&q=80';
};

const EventsPage = () => {
  const { events, peserta } = useEvent();

  // Format tanggal dari "2026-08-10" → "10 Agustus 2026"
  const formatTanggal = (tanggal) => {
    if (!tanggal) return '-';
    return new Date(tanggal).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  };

  // Ambil hari & singkatan bulan untuk badge
  const getBadgeParts = (tanggal) => {
    const d = new Date(tanggal);
    const hari = d.getDate();
    const bulan = d.toLocaleDateString('id-ID', { month: 'short' }).toUpperCase();
    return { hari, bulan };
  };

  return (
    <main className="events-page dark-page">
      <div className="page-header">
        <div className="container">
          <h1 className="page-title">Kegiatan Kami</h1>
          <p className="page-subtitle">Ikuti berbagai kegiatan, seminar, dan acara menarik dari Perpusnas Press</p>
        </div>
      </div>

      <div className="container events-container">
        {events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#94a3b8' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📅</div>
            <p style={{ fontSize: '1.1rem' }}>Belum ada kegiatan yang dijadwalkan.</p>
          </div>
        ) : (
          <div className="events-grid-large">
            {events.map(ev => {
              const { hari, bulan } = getBadgeParts(ev.tanggal);
              const statusStyle     = STATUS_COLOR[ev.status] || STATUS_COLOR['Akan Datang'];
              const jumlahPeserta   = (peserta[ev.id] || []).length;
              const gambar          = ev.bannerUrl || getDefaultImage(ev.judul);

              return (
                <div key={ev.id} className="event-card-large">
                  <div className="event-image-large">
                    <img src={gambar} alt={ev.judul} />
                    <div className="event-date-badge-large">
                      <span className="date-day">{hari}</span>
                      <span className="date-month">{bulan}</span>
                    </div>
                    {/* Badge status */}
                    <span style={{
                      position: 'absolute', top: '0.75rem', right: '0.75rem',
                      background: statusStyle.bg, color: statusStyle.color,
                      border: `1px solid ${statusStyle.border}`,
                      borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700,
                      padding: '0.2rem 0.65rem', letterSpacing: '0.02em'
                    }}>
                      {ev.status}
                    </span>
                  </div>
                  <div className="event-content-large">
                    <h2 className="event-title-large">{ev.judul}</h2>
                    <div className="event-meta-large">
                      <span className="meta-item"><Calendar size={15} /> {formatTanggal(ev.tanggal)}</span>
                      <span className="meta-item"><Clock size={15} /> {ev.jamKegiatan} WIB</span>
                      <span className="meta-item"><MapPin size={15} /> {ev.lokasi}</span>
                      {jumlahPeserta > 0 && (
                        <span className="meta-item"><Users size={15} /> {jumlahPeserta} mendaftar</span>
                      )}
                    </div>
                    <p className="event-desc-large">{ev.penjelasan}</p>
                    <Link to={`/event/${ev.id}`} className="event-btn-large">
                      Lihat Detail <ArrowRight size={16} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
};

export default EventsPage;

