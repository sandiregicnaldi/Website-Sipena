import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, BookOpen, Download, X, Star, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
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

  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [showRatingPopup, setShowRatingPopup] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);
  const [downloadPopupRating, setDownloadPopupRating] = useState(0);

  const handleDownload = () => {
    if (!isLoggedIn) {
      setShowLoginPrompt(true);
    } else {
      window.open('/sample.pdf', '_blank');
      setTimeout(() => setShowRatingPopup(true), 500);
    }
  };

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
              <button onClick={handleDownload} className="hero-btn-secondary" style={{ border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                <Download size={18} /> Unduh PDF
              </button>
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

      {/* Download Rating Popup */}
      {showRatingPopup && (
        <div className="modal-overlay" style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', 
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
          backdropFilter: 'blur(4px)'
        }}>
          <div className="modal-content" style={{
            background: 'var(--bg-primary, #fff)', padding: '2.5rem', borderRadius: '1rem', 
            width: '100%', maxWidth: '400px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
            textAlign: 'center', position: 'relative'
          }}>
            <button onClick={() => setShowRatingPopup(false)} style={{
              position: 'absolute', top: '1rem', right: '1rem', background: 'none', 
              border: 'none', cursor: 'pointer', color: 'var(--text-tertiary, #64748b)'
            }}>
              <X size={20} />
            </button>
            
            <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary, #0f172a)', fontSize: '1.25rem' }}>Buku Berhasil Diunduh!</h3>
            <p style={{ color: 'var(--text-secondary, #475569)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              Sambil menunggu unduhan selesai, yuk berikan rating untuk buku <strong>"{slide.title}"</strong>. Penilaian Anda sangat berarti bagi kami.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Star 
                  key={star} 
                  size={32} 
                  fill={(hoverRating || downloadPopupRating) >= star ? "#fbbf24" : "transparent"} 
                  color={(hoverRating || downloadPopupRating) >= star ? "#fbbf24" : "#cbd5e1"} 
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setDownloadPopupRating(star)}
                  style={{cursor: 'pointer', transition: 'transform 0.2s', transform: (hoverRating || downloadPopupRating) >= star ? 'scale(1.15)' : 'scale(1)'}}
                />
              ))}
            </div>

            <button 
              className="hero-btn-primary" 
              style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', border: 'none', cursor: 'pointer' }}
              disabled={downloadPopupRating === 0}
              onClick={() => {
                setShowRatingPopup(false);
                alert(`Terima kasih atas rating ${downloadPopupRating} bintang Anda!`);
              }}
            >
              Kirim Penilaian
            </button>
            <button 
              onClick={() => setShowRatingPopup(false)} 
              style={{ 
                width: '100%', padding: '0.75rem', marginTop: '0.5rem', 
                background: 'none', border: 'none', color: 'var(--text-tertiary, #64748b)', 
                cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600
              }}
            >
              Nanti Saja
            </button>
          </div>
        </div>
      )}

      {/* Login Prompt Popup */}
      {showLoginPrompt && (
        <div className="modal-overlay" style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', 
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
          backdropFilter: 'blur(4px)'
        }}>
          <div className="modal-content" style={{
            background: 'var(--bg-primary, #fff)', padding: '2.5rem', borderRadius: '1rem', 
            width: '100%', maxWidth: '400px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
            textAlign: 'center', position: 'relative'
          }}>
            <button onClick={() => setShowLoginPrompt(false)} style={{
              position: 'absolute', top: '1rem', right: '1rem', background: 'none', 
              border: 'none', cursor: 'pointer', color: 'var(--text-tertiary, #64748b)'
            }}>
              <X size={20} />
            </button>
            
            <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--bg-secondary, #f1f5f9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Lock size={32} color={slide.accentColor || '#2563eb'} />
              </div>
            </div>

            <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary, #0f172a)', fontSize: '1.25rem' }}>Akses Terkunci</h3>
            <p style={{ color: 'var(--text-secondary, #475569)', fontSize: '0.9rem', marginBottom: '2rem', lineHeight: 1.5 }}>
              Fitur ini memerlukan akses akun. Silakan masuk (login) atau daftar terlebih dahulu untuk mengunduh dan memberikan rating.
            </p>

            <button 
              className="hero-btn-primary" 
              style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', border: 'none', cursor: 'pointer', background: slide.accentColor || '#2563eb', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
              onClick={() => {
                setShowLoginPrompt(false);
                navigate('/login', { state: { from: location } });
              }}
            >
              Masuk ke Akun
            </button>
            <button 
              onClick={() => setShowLoginPrompt(false)} 
              style={{ 
                width: '100%', padding: '0.75rem', marginTop: '0.5rem', 
                background: 'none', border: 'none', color: 'var(--text-tertiary, #64748b)', 
                cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600
              }}
            >
              Batal
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default HeroCarousel;
