import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Calendar, MapPin, ArrowRight, Clock, Users, 
  Award, Video, Search, Sparkles, X 
} from 'lucide-react';
import { useEvent } from '../context/EventContext';
import './EventsPage.css';

const STATUS_COLOR = {
  'Akan Datang': { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  'Segera':      { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  'Selesai':     { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' },
};

// Fallback gambar seragam dengan EventSection
const getDefaultImage = (judul = '') => {
  const lower = judul.toLowerCase();
  if (lower.includes('workshop') || lower.includes('penulisan'))
    return 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=600';
  if (lower.includes('bedah') || lower.includes('naskah') || lower.includes('literasi'))
    return 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&q=80&w=600';
  if (lower.includes('seminar') || lower.includes('isbn') || lower.includes('digital'))
    return 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=600';
  if (lower.includes('pameran') || lower.includes('koleksi'))
    return 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&q=80&w=600';
  return 'https://images.unsplash.com/photo-1544928147-79a2dbc1f389?auto=format&fit=crop&q=80&w=600';
};

const FILTER_TABS = ['Semua', 'Akan Datang', 'Segera', 'Selesai'];

const EventsPage = () => {
  const { events = [], loading } = useEvent();
  const [activeTab, setActiveTab] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');

  // Format tanggal Indonesia
  const formatTanggal = (tanggal) => {
    if (!tanggal) return '-';
    const d = new Date(tanggal);
    if (isNaN(d.getTime())) return tanggal;
    return d.toLocaleDateString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  };

  // Ambil hari & singkatan bulan untuk badge kalender
  const getBadgeParts = (tanggal) => {
    if (!tanggal) return { hari: '01', bulan: 'BLN' };
    const d = new Date(tanggal);
    if (isNaN(d.getTime())) return { hari: '01', bulan: 'BLN' };
    const hari = String(d.getDate()).padStart(2, '0');
    const bulan = d.toLocaleDateString('id-ID', { month: 'short' }).toUpperCase();
    return { hari, bulan };
  };

  // Filter & Urutkan
  const filteredEvents = useMemo(() => {
    let list = [...events];

    // Filter tab status
    if (activeTab !== 'Semua') {
      list = list.filter(e => e.status === activeTab);
    }

    // Filter kata kunci pencarian
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(e => 
        (e.judul || '').toLowerCase().includes(q) ||
        (e.penjelasan || '').toLowerCase().includes(q) ||
        (e.lokasi || '').toLowerCase().includes(q) ||
        (Array.isArray(e.narasumber) && e.narasumber.some(n => String(n).toLowerCase().includes(q)))
      );
    }

    // Urutkan: Klaim aktif di atas, lalu berdasarkan tanggal terbaru
    return list.sort((a, b) => {
      if (a.isClaimActive && !b.isClaimActive) return -1;
      if (!a.isClaimActive && b.isClaimActive) return 1;
      if (a.status !== 'Selesai' && b.status === 'Selesai') return -1;
      if (a.status === 'Selesai' && b.status !== 'Selesai') return 1;
      return new Date(b.tanggal || 0) - new Date(a.tanggal || 0);
    });
  }, [events, activeTab, searchQuery]);

  return (
    <main className="events-catalog-page">
      {/* Header Banner Halaman */}
      <div className="events-hero-header">
        <div className="container">
          <div className="events-hero-badge">
            <Sparkles size={14} /> Agenda &amp; Program Literasi
          </div>
          <h1 className="events-hero-title">Kegiatan &amp; Webinar SiPena</h1>
          <p className="events-hero-subtitle">
            Ikuti berbagai workshop penulisan, seminar perbukuan, dan bedah naskah resmi bersama Perpusnas Press.
          </p>

          {/* Bar Kontrol: Filter Tabs & Search */}
          <div className="events-filter-bar">
            <div className="filter-tabs-wrapper">
              {FILTER_TABS.map(tab => (
                <button
                  key={tab}
                  type="button"
                  className={`filter-tab-btn ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                  {tab === 'Semua' ? (
                    <span className="tab-count">{events.length}</span>
                  ) : (
                    <span className="tab-count">
                      {events.filter(e => e.status === tab).length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="events-search-box">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Cari kegiatan, narasumber, atau topik..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button 
                  type="button" 
                  className="search-clear-btn" 
                  onClick={() => setSearchQuery('')}
                  title="Hapus pencarian"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Konten Grid Kegiatan */}
      <div className="container events-catalog-body">
        {loading ? (
          <div className="events-catalog-grid">
            {[1, 2, 3, 4, 5, 6].map(n => (
              <div key={n} className="event-catalog-card skeleton-card">
                <div className="skeleton-image skeleton-shimmer"></div>
                <div className="event-catalog-content">
                  <div className="skeleton-line skeleton-title skeleton-shimmer"></div>
                  <div className="skeleton-line skeleton-meta skeleton-shimmer"></div>
                  <div className="skeleton-line skeleton-desc skeleton-shimmer"></div>
                  <div className="skeleton-btn skeleton-shimmer"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="events-empty-state">
            <Calendar size={52} color="#94a3b8" style={{ marginBottom: '1rem' }} />
            <h3>Tidak Ada Kegiatan Ditemukan</h3>
            <p>
              {searchQuery 
                ? `Tidak ada kegiatan yang sesuai dengan pencarian "${searchQuery}".`
                : activeTab !== 'Semua' 
                  ? `Belum ada kegiatan dengan status "${activeTab}".`
                  : 'Belum ada agenda kegiatan yang dijadwalkan saat ini.'}
            </p>
            {(searchQuery || activeTab !== 'Semua') && (
              <button 
                type="button" 
                className="btn btn-outline" 
                onClick={() => { setSearchQuery(''); setActiveTab('Semua'); }}
              >
                Reset Filter &amp; Pencarian
              </button>
            )}
          </div>
        ) : (
          <div className="events-catalog-grid">
            {filteredEvents.map(ev => {
              const { hari, bulan } = getBadgeParts(ev.tanggal);
              const statusStyle = STATUS_COLOR[ev.status] || STATUS_COLOR['Akan Datang'];
              const bannerSrc = ev.bannerUrl || getDefaultImage(ev.judul);
              const jumlahPeserta = ev.participantCount || 0;

              return (
                <div key={ev.id} className="event-catalog-card">
                  {/* Kontainer Banner Berasio 16:9 Seragam & Presisi */}
                  <div className="event-catalog-image-wrap">
                    <img 
                      src={bannerSrc} 
                      alt={ev.judul}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = getDefaultImage(ev.judul);
                      }}
                    />

                    {/* Badge Kalender (Kiri Atas) */}
                    <div className="event-date-badge">
                      <span className="date-day">{hari}</span>
                      <span className="date-month">{bulan}</span>
                    </div>

                    {/* Overlay Pills (Kanan Atas) */}
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

                  {/* Isi Konten Kartu */}
                  <div className="event-catalog-content">
                    <h3 className="event-catalog-title" title={ev.judul}>
                      {ev.judul}
                    </h3>

                    {/* Meta List: Tanggal, Waktu, Lokasi */}
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
                      {jumlahPeserta > 0 && (
                        <div className="event-meta-item">
                          <Users size={14} className="meta-icon" />
                          <span>{jumlahPeserta} peserta hadir</span>
                        </div>
                      )}
                    </div>

                    {/* Cuplikan Deskripsi */}
                    <p className="event-catalog-desc">
                      {ev.penjelasan || 'Ikuti kegiatan literasi dan kepenulisan ini bersama narasumber terkemuka.'}
                    </p>

                    {/* Tombol Aksi */}
                    <div className="event-catalog-footer">
                      <Link 
                        to={`/event/${ev.id}`} 
                        className={`btn event-btn ${ev.isClaimActive ? 'btn-claim-active' : 'btn-outline'}`}
                      >
                        <span>{ev.isClaimActive ? 'Klaim Sertifikat' : 'Lihat Detail Acara'}</span>
                        <ArrowRight size={15} />
                      </Link>
                    </div>
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

