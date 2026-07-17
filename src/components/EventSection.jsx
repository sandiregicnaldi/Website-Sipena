import React, { useRef } from 'react';
import './EventSection.css';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const EventSection = () => {
  const scrollRef = useRef(null);
  
  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 350; // Jarak geser
      if (direction === 'left') {
        scrollRef.current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      } else {
        scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    }
  };
  const events = [
    {
      id: 1,
      title: 'Peluncuran Buku Sejarah Nusantara',
      date: '25 Agustus 2026',
      location: 'Gedung Perpustakaan Nasional RI',
      image: 'https://images.unsplash.com/photo-1544928147-79a2dbc1f389?auto=format&fit=crop&w=400&q=80',
      description: 'Acara peluncuran buku terbaru terbitan Perpusnas Press dengan bedah buku bersama penulis.'
    },
    {
      id: 2,
      title: 'Workshop Penulisan Naskah',
      date: '10 September 2026',
      location: 'Online via Zoom',
      image: 'https://images.unsplash.com/photo-1455390582262-044cdead27d8?auto=format&fit=crop&w=400&q=80',
      description: 'Pelatihan intensif bagi calon penulis untuk memahami standar penulisan di Perpusnas Press.'
    },
    {
      id: 3,
      title: 'Pameran Koleksi Langka',
      date: '1 - 7 Oktober 2026',
      location: 'Ruang Pameran Utama Perpusnas',
      image: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=400&q=80',
      description: 'Menampilkan koleksi naskah dan buku langka yang telah direstorasi dan didigitalisasi.'
    }
  ];

  return (
    <section className="event-section">
      <div className="container">
        <div className="event-header">
          <h2 className="section-title">Kegiatan Terbaru</h2>
          <Link to="/event" className="authors-row-viewall" style={{fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-color)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none'}}>
            Semua Kegiatan <ArrowRight size={16} />
          </Link>
        </div>

        <div className="event-slider-container">
          <button className="event-slider-btn left" onClick={() => scroll('left')}><ChevronLeft size={24} /></button>
          
          <div className="event-grid" ref={scrollRef}>
          {events.map((event) => (
            <div key={event.id} className="event-card">
              <div className="event-image">
                <img src={event.image} alt={event.title} />
                <div className="event-date-badge">
                  <span className="date-day">{event.date.split(' ')[0]}</span>
                  <span className="date-month">{event.date.split(' ')[1].substring(0, 3)}</span>
                </div>
              </div>
              <div className="event-content">
                <h3 className="event-title">{event.title}</h3>
                <p className="event-description">{event.description}</p>
                <Link to={`/event/${event.id}`} className="btn btn-outline event-btn" style={{textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center'}}>
                  Lihat Detail <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          ))}
          </div>
          
          <button className="event-slider-btn right" onClick={() => scroll('right')}><ChevronRight size={24} /></button>
        </div>
      </div>
    </section>
  );
};

export default EventSection;
