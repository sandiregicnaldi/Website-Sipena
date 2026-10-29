import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { Download, BookOpen, Share2, Printer, Star, Lock, PlayCircle, X, Loader2, Eye, Maximize2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';
import BookSection from '../components/BookSection';
import { SipenaAPI } from '../lib/api';
import './BookDetail.css';

const CATEGORY_COLORS = {
  'Anak-anak': '#0ea5e9',
  'Biografi & Memoar': '#8b5cf6',
  'Ekonomi & Management': '#059669',
  'Fiksi': '#e11d48',
  'Hukum & Politik': '#4f46e5',
  'Humaniora': '#d97706',
  'Inkubator Literasi': '#2563eb',
  'Kesehatan': '#10b981',
  'Komik': '#f59e0b',
  'Lifestyle': '#ec4899',
  'Sastra': '#1e3a8a',
  'Sejarah': '#b91c1c',
  'Budaya': '#047857',
  'Anak': '#0ea5e9',
  'Hukum': '#6b21a8',
  'Pendidikan': '#92400e',
  'Umum': '#475569'
};

const BookDetail = () => {
  const { id } = useParams();
  const { isLoggedIn } = useAuth();
  const { showAlert, showToast } = useDialog();
  const navigate = useNavigate();
  const location = useLocation();

  const [book, setBook] = useState(null);
  const [relatedBooks, setRelatedBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [showRatingPopup, setShowRatingPopup] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [downloadPopupRating, setDownloadPopupRating] = useState(0);
  const [submittingRating, setSubmittingRating] = useState(false);

  // Mode pembaca dokumen (Full Screen & Inline)
  const [showFullscreenReader, setShowFullscreenReader] = useState(false);
  const [isReadingInline, setIsReadingInline] = useState(false);

  const readerRef = useRef(null);
  const dwellTimerRef = useRef(null);

  // Trigger pencatatan pembaca: deduplikasi per sesi via sessionStorage
  const recordReadTrigger = async () => {
    if (!id) return;
    const sessionKey = `sipena_read_${id}`;
    if (sessionStorage.getItem(sessionKey)) return;
    sessionStorage.setItem(sessionKey, '1');
    try {
      await SipenaAPI.recordBookRead(id);
      setBook(prev => prev ? ({ ...prev, readCount: (prev.readCount || 0) + 1 }) : prev);
    } catch (err) {
      console.error('Failed to record read:', err);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchBookData();
  }, [id]);

  // Tutup mode pembaca layar penuh dengan tombol Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowFullscreenReader(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Solusi 1: Dwell Time / Active Engagement (Pengguna membaca aktif inline atau fullscreen selama >= 15 detik)
  useEffect(() => {
    if (!isLoggedIn || !book) return;
    if (!isReadingInline && !showFullscreenReader) return;

    if (!dwellTimerRef.current) {
      dwellTimerRef.current = setTimeout(() => {
        recordReadTrigger();
      }, 15000);
    }

    return () => {
      if (dwellTimerRef.current) {
        clearTimeout(dwellTimerRef.current);
        dwellTimerRef.current = null;
      }
    };
  }, [id, isLoggedIn, book, isReadingInline, showFullscreenReader]);

  const fetchBookData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [bookData, related] = await Promise.all([
        SipenaAPI.getBookById(id),
        SipenaAPI.getRelatedBooks(id)
      ]);

      setBook(bookData);
      setRelatedBooks(
        (related || []).map(b => ({
          id: b.id,
          title: b.title,
          author: b.authorName || 'Penulis Anonim',
          color: CATEGORY_COLORS[b.category] || '#1e3a8a'
        }))
      );
      if (bookData?.ratingAvg) {
        setRating(Math.round(bookData.ratingAvg));
      }
    } catch (err) {
      console.error('Failed to load book:', err);
      setError('Buku tidak ditemukan atau gagal dimuat dari server.');
    } finally {
      setLoading(false);
    }
  };

  const handleProtectedAction = (actionCallback) => {
    if (!isLoggedIn) {
      setShowLoginPrompt(true);
    } else {
      actionCallback();
    }
  };

  const handleReadOnline = () => {
    handleProtectedAction(() => {
      recordReadTrigger();
      setShowFullscreenReader(true);
    });
  };

  const handleDownload = () => {
    handleProtectedAction(async () => {
      try {
        // Record real download count in PostgreSQL
        await SipenaAPI.downloadBook(id);
        if (book) {
          setBook(prev => ({ ...prev, downloadCount: (prev.downloadCount || 0) + 1 }));
        }
      } catch (err) {
        console.error('Download log error:', err);
      }

      // Open PDF file (custom or sample)
      window.open(book?.fileUrl || '/sample.pdf', '_blank');

      // Trigger rating modal
      setTimeout(() => setShowRatingPopup(true), 500);
    });
  };

  const handleRatingSubmit = async (ratingVal) => {
    if (!isLoggedIn) {
      setShowLoginPrompt(true);
      return;
    }

    try {
      setSubmittingRating(true);
      const res = await SipenaAPI.rateBook(id, { rating: ratingVal });
      if (res && res.success) {
        setRating(ratingVal);
        if (book) {
          setBook(prev => ({
            ...prev,
            ratingAvg: res.ratingAvg,
            ratingCount: res.ratingCount
          }));
        }
        setShowRatingPopup(false);
        showToast({ message: `Terima kasih! Penilaian ${ratingVal} bintang Anda berhasil disimpan.`, type: 'success' });
      }
    } catch (err) {
      console.error('Failed to submit rating:', err);
      showAlert({
        title: 'Gagal Menyimpan Rating',
        message: 'Pastikan Anda sudah login untuk memberikan ulasan dan rating buku.',
        type: 'warning'
      });
    } finally {
      setSubmittingRating(false);
    }
  };

  if (loading) {
    return (
      <main className="book-detail-page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
        <Loader2 size={40} className="animate-spin" color="var(--accent-color, #2563eb)" />
        <p style={{ color: 'var(--text-secondary)' }}>Memuat data buku dari database...</p>
      </main>
    );
  }

  if (error || !book) {
    return (
      <main className="book-detail-page" style={{ textAlign: 'center', padding: '6rem 1rem' }}>
        <div className="container">
          <h2>Buku Tidak Ditemukan</h2>
          <p style={{ color: 'var(--text-secondary)', margin: '1rem 0 2rem' }}>{error || 'Data buku tidak tersedia di sistem.'}</p>
          <Link to="/buku" className="btn btn-primary">Kembali ke Katalog</Link>
        </div>
      </main>
    );
  }

  const coverColor = CATEGORY_COLORS[book.category] || '#1e3a8a';

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
            <div className="book-detail-cover" style={{ backgroundColor: coverColor }}>
              <span className="book-detail-title-mock">{book.title}</span>
            </div>
            
            <div className="book-detail-actions">
              <button className="btn btn-primary action-btn" onClick={handleReadOnline}>
                <BookOpen size={18} /> Baca Online
              </button>
              <button className="btn btn-outline action-btn" onClick={handleDownload}>
                <Download size={18} /> Unduh PDF
              </button>
              <button
                className="btn btn-outline action-btn share-btn"
                onClick={() => {
                  navigator.clipboard?.writeText(window.location.href);
                  showToast({ message: 'Tautan buku berhasil disalin ke clipboard!', type: 'info' });
                }}
              >
                <Share2 size={18} /> Bagikan
              </button>
            </div>
            
            {/* Real Rating & Engagement Stats Widget */}
            <div className="book-rating" style={{ padding: '1.5rem' }}>
              <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: 600 }}>Beri Rating Buku Ini</p>
              <div className="stars" style={{ cursor: 'pointer' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star 
                    key={star} 
                    size={24} 
                    fill={(hoverRating || rating) >= star ? "#fbbf24" : "transparent"} 
                    color={(hoverRating || rating) >= star ? "#fbbf24" : "#cbd5e1"} 
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => handleRatingSubmit(star)}
                    style={{ transition: 'all 0.2s' }}
                  />
                ))}
              </div>
              <span style={{ marginTop: '0.5rem', display: 'block', fontSize: '0.85rem' }}>
                {book.ratingAvg > 0
                  ? `★ ${book.ratingAvg.toFixed(1)} / 5 (${book.ratingCount || 0} ulasan)`
                  : '(Belum ada ulasan)'}
              </span>
              
              {/* Engagement Stats: Dibaca & Diunduh */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.5rem',
                marginTop: '1.1rem',
                paddingTop: '0.9rem',
                borderTop: '1px solid var(--border-color, #e2e8f0)',
                width: '100%'
              }}>
                <div style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.5rem',
                  padding: '0.6rem 0.35rem',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.2rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#2563eb' }}>
                    <Eye size={15} />
                    <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', lineHeight: 1 }}>
                      {book.readCount || 0}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>
                    Kali Dibaca
                  </span>
                </div>

                <div style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.5rem',
                  padding: '0.6rem 0.35rem',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.2rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#059669' }}>
                    <Download size={15} />
                    <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', lineHeight: 1 }}>
                      {book.downloadCount || 0}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>
                    Kali Diunduh
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Info & Reader */}
          <div className="book-detail-content">
            <h1 className="detail-title">{book.title}</h1>
            <h2 className="detail-author">Oleh: {book.authorName || 'Penulis Anonim'}</h2>
            
            <div className="metadata-grid">
              <div className="meta-item">
                <span className="meta-label">Penerbit</span>
                <span className="meta-value">Perpusnas Press</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Tahun Terbit</span>
                <span className="meta-value">{book.year || '2026'}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Kategori</span>
                <span className="meta-value">{book.category || 'Umum'}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Nomor Induk Perpusnas (NIP)</span>
                <span className="meta-value" style={{ fontWeight: 600, color: 'var(--accent-color, #2563eb)' }}>
                  {book.nip || '-'}
                </span>
              </div>
              <div className="meta-item">
                <span className="meta-label">ISBN Cetak / Digital</span>
                <span className="meta-value">{book.isbn || '-'}{book.isbnDigital ? ` / ${book.isbnDigital}` : ''}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Editor</span>
                <span className="meta-value">{book.editor || '-'}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Desain Sampul</span>
                <span className="meta-value">{book.coverDesigner || '-'}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Penata Letak</span>
                <span className="meta-value">{book.layoutDesigner || '-'}</span>
              </div>
            </div>

            <div className="synopsis-section">
              <h3>Abstrak</h3>
              <p>{book.synopsis || 'Belum ada abstrak untuk buku ini.'}</p>
            </div>

            {/* Modern PDF Reader Section */}
            <div className="pdf-reader-section" ref={readerRef} id="pdf-reader-section">
              <div className="pdf-header">
                <h3><BookOpen size={20} /> Baca Online (PDF Reader)</h3>
                <div className="pdf-header-actions" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  {isReadingInline && (
                    <button
                      className="btn btn-outline"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                      onClick={handleReadOnline}
                    >
                      <Maximize2 size={15} /> Layar Penuh
                    </button>
                  )}
                  {isReadingInline && (
                    <button
                      className="btn btn-outline"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                      onClick={() => setIsReadingInline(false)}
                    >
                      <X size={15} /> Tutup
                    </button>
                  )}
                  <button className="icon-btn" title="Unduh PDF" onClick={handleDownload}><Download size={18} /></button>
                  <button className="icon-btn" title="Cetak PDF" onClick={() => handleProtectedAction(() => showAlert({ title: 'Fitur Segera Hadir', message: 'Fitur cetak dokumen langsung sedang disiapkan.', type: 'info' }))}><Printer size={18} /></button>
                </div>
              </div>
              <div className="pdf-viewer-container" style={!isReadingInline ? { height: 'auto', minHeight: '260px' } : {}}>
                  {!isLoggedIn ? (
                    <div className="pdf-fallback" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '3rem 1.5rem', textAlign: 'center', backgroundColor: '#f1f5f9' }}>
                      <Lock size={44} color="#94a3b8" style={{ marginBottom: '1rem' }} />
                      <h4 style={{ marginBottom: '0.5rem', color: '#334155' }}>Akses Dokumen Terkunci</h4>
                      <p style={{ marginBottom: '1.5rem', color: '#64748b', maxWidth: '440px', fontSize: '0.9rem' }}>Anda harus masuk (login) terlebih dahulu untuk dapat membaca naskah secara penuh dan mengunduh PDF.</p>
                      <button onClick={() => navigate('/login', { state: { from: location } })} className="btn btn-primary">
                        Masuk ke Akun
                      </button>
                    </div>
                  ) : !isReadingInline ? (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '3rem 1.5rem',
                      textAlign: 'center',
                      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'
                    }}>
                      <div style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        backgroundColor: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '1rem',
                        color: 'var(--accent-color, #2563eb)'
                      }}>
                        <BookOpen size={28} />
                      </div>
                      <h4 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.4rem' }}>
                        Baca Buku Secara Online
                      </h4>
                      <p style={{ fontSize: '0.875rem', color: '#64748b', maxWidth: '450px', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                        Buka dokumen naskah digital dalam mode layar penuh (Full Screen) untuk pengalaman membaca yang lebih nyaman, jernih, dan fokus.
                      </p>
                      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button
                          className="btn btn-primary"
                          onClick={handleReadOnline}
                          style={{ padding: '0.6rem 1.4rem', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
                        >
                          <Maximize2 size={16} /> Buka Layar Penuh (Full Screen)
                        </button>
                        <button
                          className="btn btn-outline"
                          onClick={() => {
                            recordReadTrigger();
                            setIsReadingInline(true);
                          }}
                          style={{ padding: '0.6rem 1.2rem', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
                        >
                          <BookOpen size={16} /> Tampilkan di Sini
                        </button>
                      </div>
                    </div>
                  ) : (
                    <iframe 
                      src={`${book.fileUrl || '/sample.pdf'}#toolbar=1&navpanes=0&scrollbar=1`} 
                      title="PDF Viewer"
                      width="100%" 
                      height="100%"
                      style={{ border: 'none' }}
                    >
                      <p>Browser Anda tidak mendukung pratinjau PDF. Silakan unduh PDF untuk membacanya.</p>
                    </iframe>
                  )}
              </div>
            </div>

            {/* Audiobook / Video Section */}
            {book.audioUrl && (
              <div className="audiobook-section" style={{ marginTop: '3rem' }}>
                <div className="pdf-header">
                  <h3><PlayCircle size={20} /> Audiobook / Video Terkait</h3>
                </div>
                <div className="video-container" style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-color)' }}>
                  <iframe 
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                    src={book.audioUrl} 
                    title="Audiobook Player" 
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                  />
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Real Related Books from PostgreSQL */}
        {relatedBooks.length > 0 && (
          <div className="related-books-section" style={{ marginTop: '4rem' }}>
            <BookSection title="Buku Terkait" books={relatedBooks} showDownloads={false} />
          </div>
        )}

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
              border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)'
            }}>
              <X size={20} />
            </button>
            
            <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)', fontSize: '1.25rem' }}>Buku Berhasil Diunduh!</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              Sambil menunggu unduhan selesai, yuk berikan rating untuk buku <strong>"{book.title}"</strong>. Penilaian Anda langsung tersimpan di server.
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
                  style={{ cursor: 'pointer', transition: 'transform 0.2s', transform: (hoverRating || downloadPopupRating) >= star ? 'scale(1.15)' : 'scale(1)' }}
                />
              ))}
            </div>

            <button 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
              disabled={downloadPopupRating === 0 || submittingRating}
              onClick={() => handleRatingSubmit(downloadPopupRating)}
            >
              {submittingRating ? 'Menyimpan...' : 'Kirim Penilaian'}
            </button>
            <button 
              onClick={() => setShowRatingPopup(false)} 
              style={{ 
                width: '100%', padding: '0.75rem', marginTop: '0.5rem', 
                background: 'none', border: 'none', color: 'var(--text-tertiary)', 
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
              border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)'
            }}>
              <X size={20} />
            </button>
            
            <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--bg-secondary, #f1f5f9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Lock size={32} color="var(--accent-color, #2563eb)" />
              </div>
            </div>

            <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)', fontSize: '1.25rem' }}>Akses Terkunci</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem', lineHeight: 1.5 }}>
              Fitur ini memerlukan akses akun. Silakan masuk (login) atau daftar terlebih dahulu untuk mengunduh dan memberikan rating.
            </p>

            <button 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
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
                background: 'none', border: 'none', color: 'var(--text-tertiary)', 
                cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600
              }}
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Full-Screen PDF Reader Modal */}
      {showFullscreenReader && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: '#0f172a',
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Header Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.75rem 1.5rem',
            backgroundColor: '#1e293b',
            borderBottom: '1px solid #334155',
            color: 'white',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 0 }}>
              <button
                onClick={() => setShowFullscreenReader(false)}
                className="btn btn-outline"
                style={{
                  color: 'white',
                  borderColor: '#475569',
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  padding: '0.45rem 0.85rem',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  cursor: 'pointer'
                }}
              >
                <X size={16} /> Tutup Layar Penuh (Esc)
              </button>
              <div style={{ minWidth: 0 }}>
                <h4 style={{
                  margin: 0,
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '450px'
                }}>
                  {book.title}
                </h4>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>
                  Oleh: {book.authorName || 'Penulis Anonim'}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                onClick={handleDownload}
                className="btn btn-primary"
                style={{
                  padding: '0.45rem 1rem',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  cursor: 'pointer'
                }}
              >
                <Download size={16} /> Unduh PDF
              </button>
              <button
                onClick={() => {
                  if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(() => {});
                  } else {
                    document.exitFullscreen().catch(() => {});
                  }
                }}
                className="icon-btn"
                title="Toggle Browser Fullscreen"
                style={{ color: '#cbd5e1', padding: '0.45rem', cursor: 'pointer' }}
              >
                <Maximize2 size={20} />
              </button>
            </div>
          </div>

          {/* Iframe Viewport */}
          <div style={{ flex: 1, width: '100%', height: 'calc(100% - 56px)', backgroundColor: '#334155' }}>
            <iframe
              src={`${book.fileUrl || '/sample.pdf'}#toolbar=1&navpanes=0&scrollbar=1`}
              title={`Baca ${book.title}`}
              width="100%"
              height="100%"
              style={{ border: 'none', display: 'block' }}
            >
              <p>Browser Anda tidak mendukung pratinjau PDF. Silakan unduh PDF untuk membacanya.</p>
            </iframe>
          </div>
        </div>
      )}
    </main>
  );
};

export default BookDetail;
