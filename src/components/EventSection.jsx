import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, ChevronLeft, ChevronRight, Calendar, 
  Clock, MapPin, Video, Award, Sparkles 
} from 'lucide-react';
import { useEvent } from '../context/EventContext';
import './EventSection.css';

const STATUS_COLOR = {
  'Akan Datang': { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  'Segera':      { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  'Selesai':     { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' },
};

// Fallback gambar jika event belum memiliki banner
const getDefaultImage = (judul = '') => {
  const lower = judul.toLowerCase();
  if (lower.includes('workshop') || lower.includes('penulisan'))
    return 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=600';
  if (lower.includes('bedah') || lower.includes('naskah') || lower.includes('literasi'))
    return 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&q=80&w=600';
  if (lower.includes('seminar') || lower.includes('isbn') || lower.includes('digital'))
    return 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=600';
  if (lower.includes('pameran') || lower.includes('koleksi'))
    return 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=600';
  return 'https://images.unsplash.com/photo-1544928147-79a2dbc1f389?auto=format&fit=crop&w=600';
};

const EventSection = () => {
  const scrollRef = useRef(null);
  const { events = [], loading } = useEvent();

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 360;
      if (direction === 'left') {
        scrollRef.current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      } else {
        scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    }
  };

  // Ambil tanggal hari & singkatan bulan untuk badge kalender
  const getBadgeParts = (tanggal) => {
    if (!tanggal) return { hari: '01', bulan: 'BLN' };
    const d = new Date(tanggal);
    if (isNaN(d.getTime())) return { hari: '01', bulan: 'BLN' };
    const hari = String(d.getDate()).padStart(2, '0');
    const bulan = d.toLocaleDateString('id-ID', { month: 'short' }).toUpperCase();
    return { hari, bulan };
  };

  // Format tanggal Indonesia lengkap
  const formatTanggal = (tanggal) => {
    if (!tanggal) return '-';
    const d = new Date(tanggal);
    if (isNaN(d.getTime())) return tanggal;
    return d.toLocaleDateString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  };

  // Urutkan: Kegiatan yang sedang buka klaim atau status Akan Datang diprioritaskan di awal
  const displayEvents = [...events].sort((a, b) => {
    if (a.isClaimActive && !b.isClaimActive) return -1;
    if (!a.isClaimActive && b.isClaimActive) return 1;
    if (a.status !== 'Selesai' && b.status === 'Selesai') return -1;
    if (a.status === 'Selesai' && b.status !== 'Selesai') return 1;
    return new Date(b.tanggal || 0) - new Date(a.tanggal || 0);
  });

  return (
    <section className="event-section">
      <div className="container">
        <div className="event-header">
          <div>
            <h2 className="section-title">Kegiatan Perpusnas Press</h2>
            <p className="section-subtitle-text">Ikuti webinar, workshop, dan bedah buku literasi terkini</p>
          </div>
          <Link to="/event" className="authors-row-viewall" style={{
            fontSize: '0.85rem',
            fontWeight: 600,
            color: 'var(--accent-color)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            textDecoration: 'none'
          }}>
            Semua Kegiatan <ArrowRight size={16} />
          </Link>
        </div>

        <div className="event-slider-container">
          {displayEvents.length > 3 && (
            <button className="event-slider-btn left" onClick={() => scroll('left')} aria-label="Geser kegiatan ke kiri">
              <ChevronLeft size={22} />
            </button>
          )}

          {loading ? (
            <div className="event-grid">
              {[1, 2, 3].map(n => (
                <div key={n} className="event-card event-skeleton-card">
                  <div className="skeleton-image skeleton-shimmer"></div>
                  <div className="event-content">
                    <div className="skeleton-line skeleton-title skeleton-shimmer"></div>
                    <div className="skeleton-line skeleton-meta skeleton-shimmer"></div>
                    <div className="skeleton-line skeleton-desc skeleton-shimmer"></div>
                    <div className="skeleton-btn skeleton-shimmer"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : displayEvents.length === 0 ? (
            <div className="event-empty-box">
              <Calendar size={40} color="var(--text-tertiary)" style={{ marginBottom: '0.75rem' }} />
              <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', margin: '0 0 0.4rem' }}>Belum Ada Kegiatan</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0 0 1rem' }}>
                Nantikan agenda kegiatan, workshop penulisan, dan peluncuran buku terbaru di Portal SiPena.
              </p>
              <Link to="/buku" className="btn btn-outline" style={{ fontSize: '0.85rem' }}>
                Jelajahi Buku Populer
              </Link>
            </div>
          ) : (
            <div className="event-grid" ref={scrollRef}>
              {displayEvents.map((ev) => {
                const { hari, bulan } = getBadgeParts(ev.tanggal);
                const statusStyle = STATUS_COLOR[ev.status] || STATUS_COLOR['Akan Datang'];
                const bannerSrc = ev.bannerUrl || getDefaultImage(ev.judul);

                return (
                  <div key={ev.id} className="event-card">
                    {/* ── GAMBAR & BADGE ── */}
                    <div className="event-image">
                      <img 
                        src={bannerSrc} 
                        alt={ev.judul}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = getDefaultImage(ev.judul);
                        }}
                      />
                      
                      {/* Tanggal badge */}
                      <div className="event-date-badge">
                        <span className="date-day">{hari}</span>
                        <span className="date-month">{bulan}</span>
                      </div>

                      {/* Pill badges di kanan atas */}
                      <div className="event-badges-overlay">
                        {ev.isClaimActive && (
                          <span className="event-pill-badge pill-claim">
                            <Award size={12} /> Klaim Buka
                          </span>
                        )}
                        {ev.urlZoom && (
                          <span className="event-pill-badge pill-zoom">
                            <Video size={12} /> Zoom
                          </span>
                        )}
                        <span 
                          className="event-pill-badge pill-status" 
                          style={{
                            background: statusStyle.bg,
                            color: statusStyle.color,
                            borderColor: statusStyle.border
                          }}
                        >
                          {ev.status}
                        </span>
                      </div>
                    </div>

                    {/* ── KONTEN DESKRIPSI ── */}
                    <div className="event-content">
                      <h3 className="event-title" title={ev.judul}>{ev.judul}</h3>

                      <div className="event-meta-list">
                        <div className="event-meta-item">
                          <Calendar size={14} className="meta-icon" />
                          <span>{formatTanggal(ev.tanggal)}</span>
                        </div>
                        {ev.jamKegiatan && (
                          <div className="event-meta-item">
                            <Clock size={14} className="meta-icon" />
                            <span>{ev.jamKegiatan} WIB</span>
                          </div>
                        )}
                        {(ev.lokasi || ev.urlZoom) && (
                          <div className="event-meta-item">
                            <MapPin size={14} className="meta-icon" />
                            <span className="meta-location-text">
                              {ev.lokasi || (ev.urlZoom ? 'Online (Zoom Meeting)' : 'Perpustakaan Nasional RI')}
                            </span>
                          </div>
                        )}
                      </div>

                      <p className="event-description">{ev.penjelasan || 'Ikuti kegiatan menarik ini bersama narasumber terkemuka.'}</p>

                      <div className="event-footer-action">
                        <Link 
                          to={`/event/${ev.id}`} 
                          className={`btn event-btn ${ev.isClaimActive ? 'btn-claim-active' : 'btn-outline'}`}
                        >
                          <span>{ev.isClaimActive ? 'Klaim Sertifikat' : 'Lihat Detail'}</span>
                          <ArrowRight size={15} />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {displayEvents.length > 3 && (
            <button className="event-slider-btn right" onClick={() => scroll('right')} aria-label="Geser kegiatan ke kanan">
              <ChevronRight size={22} />
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

export default EventSection;

