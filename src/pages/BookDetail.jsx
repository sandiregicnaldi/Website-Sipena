import React, { useState } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { Download, BookOpen, Share2, Printer, Star, Lock, PlayCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import BookSection from '../components/BookSection';
import './BookDetail.css';

const BookDetail = () => {
  const { id } = useParams();
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);

  // Dummy Book Data
  const book = {
    title: 'Midun Anak Pemberani',
    author: 'M. Yusuf',
    publisher: 'Perpusnas Press',
    year: '2023',
    pages: '150 Halaman',
    isbn: '978-623-123-456-7',
    synopsis: `Midun, seorang anak pemberani yang memiliki sifat jujur, santun, sabar, dan berbudi luhur. Midun disayangi oleh teman-temannya dan orang-orang di sekitarnya. Namun demikian, ada seorang anak bernama Kacak yang tidak suka kepada sifat dan perilaku Midun itu. Kacak adalah keponakan Tuanku Laras, yang memiliki kekuasaan di kampung tempat tinggal mereka, di Sumatera Barat. 
    
    Karena kekuasaan dan kekayaan yang dimiliki, Kacak bertindak sewenang-wenang. Midun berkali-kali mengalami kesengsaraan oleh ulah Kacak dengan cara mengirim orang untuk mencelakakannya. Namun, Midun selalu menanggapinya dengan tabah.`,
    coverColor: '#0ea5e9'
  };

  const relatedBooks = [
    { id: 1, title: 'Petualangan Si Conat', author: 'F.D.J. Pangemanan', color: '#065f46' },
    { id: 2, title: 'Kungkang yang Baik Hati', author: 'Sutradara', color: '#eab308' },
    { id: 3, title: 'Salah Asuhan', author: 'Abdul Muis', color: '#be123c' },
    { id: 4, title: 'Nasrun Belajar di Batavia', author: 'Hasanuddin', color: '#0284c7' },
  ];

  const handleProtectedAction = (actionCallback) => {
    if (!isLoggedIn) {
      if (window.confirm('Fitur ini memerlukan akses akun. Apakah Anda ingin masuk (login) sekarang?')) {
        navigate('/login', { state: { from: location } });
      }
    } else {
      actionCallback();
    }
  };

  const handleDownload = () => {
    handleProtectedAction(() => {
      // Simulate download
      window.open('/sample.pdf', '_blank');
    });
  };

  const handleRating = (value) => {
    handleProtectedAction(() => {
      setRating(value);
      alert(`Terima kasih! Anda memberikan rating ${value} bintang.`);
    });
  };

  return (
    <main className="book-detail-page">
      <div className="container">
        
        {/* Breadcrumb */}
        <div className="breadcrumb">
          <Link to="/">Home</Link> &gt; <Link to="/buku">Katalog Buku</Link> &gt; <span>{book.title}</span>
        </div>

        <div className="book-detail-grid">
          {/* Left Column: Cover & Actions */}
          <div className="book-detail-sidebar">
            <div className="book-detail-cover" style={{backgroundColor: book.coverColor}}>
              <span className="book-detail-title-mock">{book.title}</span>
            </div>
            
            <div className="book-detail-actions">
              <button className="btn btn-primary action-btn" onClick={handleDownload}>
                <Download size={18} /> Unduh PDF
              </button>
              <button className="btn btn-outline action-btn share-btn" onClick={() => alert('Fitur berbagi berhasil disalin ke clipboard!')}>
                <Share2 size={18} /> Bagikan
              </button>
            </div>
            
            <div className="book-rating" style={{padding: '1.5rem'}}>
              <p style={{fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: 600}}>Beri Rating Buku Ini</p>
              <div className="stars" style={{cursor: 'pointer'}}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star 
                    key={star} 
                    size={24} 
                    fill={(hoverRating || rating) >= star ? "#fbbf24" : "transparent"} 
                    color={(hoverRating || rating) >= star ? "#fbbf24" : "#cbd5e1"} 
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => handleRating(star)}
                    style={{transition: 'all 0.2s'}}
                  />
                ))}
              </div>
              <span style={{marginTop: '0.5rem'}}>{rating > 0 ? `Rating Anda: ${rating}/5` : '(Belum ada rating Anda)'}</span>
            </div>
          </div>

          {/* Right Column: Info & Reader */}
          <div className="book-detail-content">
            <h1 className="detail-title">{book.title}</h1>
            <h2 className="detail-author">Oleh: {book.author}</h2>
            
            <div className="metadata-grid">
              <div className="meta-item">
                <span className="meta-label">Penerbit</span>
                <span className="meta-value">{book.publisher}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Tahun Terbit</span>
                <span className="meta-value">{book.year}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Halaman</span>
                <span className="meta-value">{book.pages}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">ISBN</span>
                <span className="meta-value">{book.isbn}</span>
              </div>
            </div>

            <div className="synopsis-section">
              <h3>Sinopsis</h3>
              <p>{book.synopsis}</p>
            </div>

            {/* Modern PDF Reader Section */}
            <div className="pdf-reader-section">
              <div className="pdf-header">
                <h3><BookOpen size={20} /> Baca Online (PDF Reader)</h3>
                <div className="pdf-header-actions" style={{display: 'flex', gap: '1rem'}}>
                  <button className="icon-btn" title="Unduh PDF" onClick={handleDownload}><Download size={18} /></button>
                  <button className="icon-btn" title="Cetak PDF" onClick={() => handleProtectedAction(() => alert('Fitur Cetak segera disiapkan!'))}><Printer size={18} /></button>
                </div>
              </div>
              <div className="pdf-viewer-container">
                  {isLoggedIn ? (
                    <iframe 
                      src="/sample.pdf#toolbar=1&navpanes=0&scrollbar=1" 
                      title="PDF Viewer"
                      width="100%" 
                      height="100%"
                      style={{border: 'none'}}
                    >
                      <p>Browser Anda tidak mendukung pratinjau PDF. Silakan unduh PDF untuk membacanya.</p>
                    </iframe>
                  ) : (
                    <div className="pdf-fallback" style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '2rem', textAlign: 'center', backgroundColor: '#f1f5f9'}}>
                      <Lock size={48} color="#94a3b8" style={{marginBottom: '1rem'}} />
                      <h4 style={{marginBottom: '0.5rem', color: '#334155'}}>Akses Dokumen Terkunci</h4>
                      <p style={{marginBottom: '1.5rem', color: '#64748b'}}>Anda harus masuk (login) terlebih dahulu untuk dapat membaca dan mengunduh PDF secara penuh.</p>
                      <button onClick={() => navigate('/login', { state: { from: location } })} className="btn btn-primary">
                        Masuk ke Akun
                      </button>
                    </div>
                  )}
              </div>
            </div>

            {/* Audiobook / Video Section */}
            <div className="audiobook-section" style={{marginTop: '3rem'}}>
              <div className="pdf-header">
                <h3><PlayCircle size={20} /> Audiobook / Video Terkait</h3>
              </div>
              <div className="video-container" style={{position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-color)'}}>
                <iframe 
                  style={{position: 'absolute', top: 0, left: 0, width: '100%', height: '100%'}}
                  src="https://www.youtube.com/embed/dQw4w9WgXcQ" 
                  title="YouTube video player" 
                  frameBorder="0" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                  allowFullScreen
                ></iframe>
              </div>
              <p style={{marginTop: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)'}}>
                *Catatan: Video di atas adalah contoh penempatan format Audiobook (YouTube) untuk pengembangan ke depan.
              </p>
            </div>

          </div>
        </div>

        {/* Related Books */}
        <div className="related-books-section">
          <BookSection title="Buku Terkait" books={relatedBooks} showDownloads={false} />
        </div>

      </div>
    </main>
  );
};

export default BookDetail;
