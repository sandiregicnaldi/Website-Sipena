import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, MapPin, Clock, ArrowLeft, Users, Share2 } from 'lucide-react';
import './EventDetail.css';

const EventDetail = () => {
  const { id } = useParams();

  // Mock database matching the EventSection data
  const events = [
    {
      id: 1,
      title: 'Peluncuran Buku Sejarah Nusantara',
      date: '25 Agustus 2026',
      time: '09:00 - 12:00 WIB',
      location: 'Gedung Perpustakaan Nasional RI',
      address: 'Jl. Medan Merdeka Sel. No.11, Jakarta Pusat',
      image: 'https://images.unsplash.com/photo-1544928147-79a2dbc1f389?auto=format&fit=crop&w=1200&q=80',
      description: 'Acara peluncuran buku terbaru terbitan Perpusnas Press dengan bedah buku bersama penulis.',
      fullContent: `Bergabunglah bersama kami dalam acara peluncuran buku terbaru terbitan Perpusnas Press yang berjudul "Sejarah Nusantara". Acara ini akan mengupas tuntas latar belakang penulisan, riset yang dilakukan, serta temuan-temuan baru terkait sejarah nusantara yang jarang terekspos.

Selain peluncuran, akan ada sesi bedah buku yang menghadirkan narasumber ahli di bidang sejarah, serta sesi tanya jawab interaktif dengan penulis.

Peserta yang hadir secara langsung akan mendapatkan kesempatan untuk membeli buku dengan harga khusus dan mendapatkan tanda tangan penulis. Jangan lewatkan kesempatan berharga ini!`,
      speaker: 'Prof. Dr. H. Aminuddin, M.A. (Sejarawan)',
      quota: 150
    },
    {
      id: 2,
      title: 'Workshop Penulisan Naskah',
      date: '10 September 2026',
      time: '13:00 - 16:00 WIB',
      location: 'Online via Zoom',
      address: 'Tautan Zoom akan dikirimkan H-1 acara',
      image: 'https://images.unsplash.com/photo-1455390582262-044cdead27d8?auto=format&fit=crop&w=1200&q=80',
      description: 'Pelatihan intensif bagi calon penulis untuk memahami standar penulisan di Perpusnas Press.',
      fullContent: `Bagi Anda yang bercita-cita menerbitkan karya melalui Perpusnas Press, workshop ini wajib Anda ikuti. Kami akan membahas secara mendetail apa saja kriteria naskah yang lolos seleksi, gaya selingkung Perpusnas Press, hingga tata cara pengajuan naskah.

Workshop akan dipandu langsung oleh tim editor senior Perpusnas Press yang telah menyeleksi ribuan naskah setiap tahunnya. Siapkan naskah terbaik Anda dan mari kita bedah bersama!`,
      speaker: 'Tim Editor Senior Perpusnas Press',
      quota: 500
    },
    {
      id: 3,
      title: 'Pameran Koleksi Langka',
      date: '1 - 7 Oktober 2026',
      time: '08:00 - 16:00 WIB',
      location: 'Ruang Pameran Utama Perpusnas',
      address: 'Lantai 2, Gedung Fasilitas Layanan Perpusnas RI',
      image: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1200&q=80',
      description: 'Menampilkan koleksi naskah dan buku langka yang telah direstorasi dan didigitalisasi.',
      fullContent: `Saksikan secara langsung mahakarya peradaban Nusantara dalam pameran koleksi langka terbesar tahun ini. Perpusnas akan memamerkan puluhan naskah kuno, peta lawas, dan buku-buku langka yang usianya mencapai ratusan tahun.

Sebagian besar koleksi yang dipamerkan telah melalui proses restorasi fisik dan digitalisasi resolusi tinggi. Pameran ini terbuka untuk umum dan gratis. Tersedia pemandu pameran yang akan menjelaskan sejarah di balik setiap koleksi pada jam-jam tertentu.`,
      speaker: '-',
      quota: 'Tidak Terbatas'
    }
  ];

  const event = events.find(e => e.id === parseInt(id)) || events[0];

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
            <div className="event-card-info hide-desktop">
               {/* Mobile only info card */}
            </div>

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
                <button className="btn btn-primary w-100" onClick={() => alert('Fitur pendaftaran event akan segera hadir!')}>
                  Daftar Sekarang
                </button>
                <button className="btn btn-outline w-100 mt-2" style={{display: 'flex', justifyContent: 'center', gap: '0.5rem'}} onClick={() => alert('Tautan berhasil disalin!')}>
                  <Share2 size={16} /> Bagikan
                </button>
              </div>
            </div>
          </aside>

        </div>
      </div>
    </main>
  );
};

export default EventDetail;
