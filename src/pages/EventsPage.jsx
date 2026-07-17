import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, ArrowRight } from 'lucide-react';
import './EventsPage.css';

const EventsPage = () => {
  const events = [
    {
      id: 1,
      title: 'Peluncuran Buku Sejarah Nusantara',
      date: '25 Agustus 2026',
      location: 'Gedung Perpustakaan Nasional RI',
      image: 'https://images.unsplash.com/photo-1544928147-79a2dbc1f389?auto=format&fit=crop&w=600&q=80',
      description: 'Acara peluncuran buku terbaru terbitan Perpusnas Press dengan bedah buku bersama penulis. Jangan lewatkan kesempatan mendapatkan buku dengan tanda tangan langsung.'
    },
    {
      id: 2,
      title: 'Workshop Penulisan Naskah',
      date: '10 September 2026',
      location: 'Online via Zoom',
      image: 'https://images.unsplash.com/photo-1455390582262-044cdead27d8?auto=format&fit=crop&w=600&q=80',
      description: 'Pelatihan intensif bagi calon penulis untuk memahami standar penulisan di Perpusnas Press. Pendaftaran gratis dan terbatas untuk 100 peserta pertama.'
    },
    {
      id: 3,
      title: 'Pameran Koleksi Langka',
      date: '1 - 7 Oktober 2026',
      location: 'Ruang Pameran Utama Perpusnas',
      image: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=600&q=80',
      description: 'Menampilkan koleksi naskah dan buku langka yang telah direstorasi dan didigitalisasi. Pameran terbuka untuk umum.'
    },
    {
      id: 4,
      title: 'Seminar Literasi Digital',
      date: '15 November 2026',
      location: 'Auditorium Perpusnas',
      image: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80',
      description: 'Diskusi panel tentang tantangan dan peluang literasi di era digital, mengundang pakar teknologi dan budayawan.'
    }
  ];

  return (
    <main className="events-page dark-page">
      <div className="page-header">
        <div className="container">
          <h1 className="page-title">Kegiatan Kami</h1>
          <p className="page-subtitle">Ikuti berbagai kegiatan, seminar, dan acara menarik dari Perpusnas Press</p>
        </div>
      </div>

      <div className="container events-container">
        <div className="events-grid-large">
          {events.map(event => (
            <div key={event.id} className="event-card-large">
              <div className="event-image-large">
                <img src={event.image} alt={event.title} />
                <div className="event-date-badge-large">
                  <span className="date-day">{event.date.split(' ')[0]}</span>
                  <span className="date-month">{event.date.split(' ')[1].substring(0, 3)}</span>
                </div>
              </div>
              <div className="event-content-large">
                <h2 className="event-title-large">{event.title}</h2>
                <div className="event-meta-large">
                  <span className="meta-item"><Calendar size={16} /> {event.date}</span>
                  <span className="meta-item"><MapPin size={16} /> {event.location}</span>
                </div>
                <p className="event-desc-large">{event.description}</p>
                <Link to={`/event/${event.id}`} className="event-btn-large">
                  Lihat Detail <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
};

export default EventsPage;
