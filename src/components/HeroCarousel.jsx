import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, BookOpen, Download } from 'lucide-react';
import './HeroCarousel.css';

const slides = [
  {
    id: 1,
    title: 'ILPN SUMATRA BARAT',
    subtitle: 'Yang Tak Lekang Digerus Zaman',
    genre: 'Sastra · Budaya',
    desc: 'Eksplorasi literatur dan kekayaan budaya Sumatera Barat melalui koleksi buku dan naskah kuno yang berharga.',
    bookLink: '/buku/1',
    bgColor: '#0f172a',
    accentColor: '#2563eb',
    image: null,
  },
  {
    id: 2,
    title: 'HIKAYAT RAJA-RAJA PASAI',
    subtitle: 'Menelusuri Jejak Sejarah Nusantara',
    genre: 'Sejarah · Islam',
    desc: 'Kronik sejarah yang menggambarkan awal mula masuknya Islam ke Nusantara dengan nilai historis dan sastra sangat tinggi.',
    bookLink: '/buku/2',
    bgColor: '#064e3b',
    accentColor: '#10b981',
    image: null,
  },
  {
    id: 3,
    title: 'SASTRA KLASIK JAWA',
    subtitle: 'Warisan Budaya Leluhur',
    genre: 'Sastra · Filosofi',
    desc: 'Kumpulan serat dan babad yang menceritakan kearifan lokal, filosofi hidup, serta perjalanan sejarah masyarakat Jawa.',
    bookLink: '/buku/3',
    bgColor: '#450a0a',
    accentColor: '#ef4444',
    image: null,
  },
  {
    id: 4,
    title: 'BABAD DIPONEGORO',
    subtitle: 'Epos Perjuangan Sang Pangeran',
    genre: 'Sejarah · Perjuangan',
    desc: 'Naskah agung yang merekam perjuangan Pangeran Diponegoro melawan kolonialisme Belanda dalam Perang Jawa.',
    bookLink: '/buku/4',
    bgColor: '#1a0533',
    accentColor: '#8b5cf6',
    image: null,
  },
  {
    id: 5,
    title: 'SERAT CENTHINI',
    subtitle: 'Ensiklopedia Budaya Jawa',
    genre: 'Budaya · Ensiklopedia',
    desc: 'Mahakarya sastra Jawa yang merangkum pengetahuan, kepercayaan, dan adat istiadat masyarakat Jawa secara lengkap.',
    bookLink: '/buku/5',
    bgColor: '#0c1a10',
    accentColor: '#22c55e',
    image: null,
  },
];

const AUTO_PLAY_INTERVAL = 5000;

const HeroCarousel = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const timerRef = useRef(null);

  const resetTimer = () => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrentSlide(prev => (prev === slides.length - 1 ? 0 : prev + 1));
    }, AUTO_PLAY_INTERVAL);
  };

  useEffect(() => {
    resetTimer();
    return () => clearInterval(timerRef.current);
  }, []);

  const goTo = (idx) => { setCurrentSlide(idx); resetTimer(); };
  const nextSlide = () => goTo(currentSlide === slides.length - 1 ? 0 : currentSlide + 1);
  const prevSlide = () => goTo(currentSlide === 0 ? slides.length - 1 : currentSlide - 1);

  const slide = slides[currentSlide];

  return (
    <section
      className="hero-section"
      style={{ background: `linear-gradient(135deg, ${slide.bgColor} 0%, ${slide.bgColor}cc 60%, #000 100%)` }}
    >
      {/* Background decorative gradient blob */}
      <div className="hero-bg-blob" style={{ backgroundColor: slide.accentColor }}></div>

      <div className="hero-slide">
        {/* Nav Arrows */}
        <button className="hero-nav-btn prev" onClick={prevSlide} aria-label="Sebelumnya">
          <ChevronLeft size={28} />
        </button>
        <button className="hero-nav-btn next" onClick={nextSlide} aria-label="Berikutnya">
          <ChevronRight size={28} />
        </button>

        {/* Content */}
        <div className="container hero-content">
          <div className="hero-text-area">
            <div className="hero-genre-tag">{slide.genre}</div>
            <h1 className="hero-title">{slide.title}</h1>
            <p className="hero-subtitle">{slide.subtitle}</p>
            <p className="hero-desc">{slide.desc}</p>
            <div className="hero-actions">
              <Link to={slide.bookLink} className="hero-btn-primary">
                <BookOpen size={18} /> Baca Sekarang
              </Link>
              <Link to="/buku" className="hero-btn-secondary">
                <Download size={18} /> Unduh PDF
              </Link>
            </div>
          </div>

          <div className="hero-image-area">
            <div className="hero-book-showcase">
              <div className="book-cover-large" style={{ '--book-color': slide.accentColor }}>
                <div className="book-spine" style={{ backgroundColor: slide.accentColor }}></div>
                <div className="book-front" style={{ background: `linear-gradient(145deg, ${slide.accentColor}99, ${slide.bgColor})` }}>
                  <div className="book-title-mock">{slide.title}</div>
                  <div className="book-deco"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dot indicators + slide counter */}
        <div className="hero-bottom-bar">
          <div className="carousel-indicators">
            {slides.map((_, index) => (
              <button
                key={index}
                className={`indicator ${index === currentSlide ? 'active' : ''}`}
                style={index === currentSlide ? { backgroundColor: slide.accentColor } : {}}
                onClick={() => goTo(index)}
                aria-label={`Slide ${index + 1}`}
              />
            ))}
          </div>
          <span className="slide-counter">{currentSlide + 1} / {slides.length}</span>
        </div>
      </div>
    </section>
  );
};

export default HeroCarousel;
