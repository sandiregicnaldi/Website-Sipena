import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import './BookRow.css';

/**
 * BookRow — Vidio-style horizontal scrolling row of book cards.
 * Used on the dark Home section.
 */
const BookRow = ({ title, books = [], viewAllLink = '/buku' }) => {
  const scrollRef = useRef(null);

  const scroll = (dir) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -320 : 320, behavior: 'smooth' });
  };

  return (
    <section className="book-row-section">
      <div className="container">
        {/* Row header */}
        {title && (
          <div className="row-header">
            <h2 className="row-title">{title}</h2>
            {viewAllLink && (
              <Link to={viewAllLink} className="row-view-all">
                Selengkapnya <ArrowRight size={16} />
              </Link>
            )}
          </div>
        )}

        {/* Slider */}
        <div className="row-slider-wrapper">
          <button className="row-nav-btn left" onClick={() => scroll('left')} aria-label="Geser kiri">
            <ChevronLeft size={22} />
          </button>

          <div className="row-track" ref={scrollRef}>
            {books.map((book, i) => (
              <Link to={`/buku/${book.id || 1}`} key={i} className="row-card">
                {/* Cover */}
                <div className="row-cover" style={{ backgroundColor: book.color || '#1e3a8a' }}>
                  {(book.coverUrl || book.cover) ? (
                    <img
                      src={book.coverUrl || book.cover}
                      alt={book.title}
                      className="row-cover-img"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : null}
                  <span className="row-cover-title" style={(book.coverUrl || book.cover) ? { display: 'none' } : {}}>{book.title}</span>
                  {/* Hover overlay */}
                  <div className="row-cover-overlay">
                    <span className="overlay-play">▶ Baca</span>
                  </div>
                </div>
                {/* Info */}
                <div className="row-info">
                  <p className="row-book-title">{book.title}</p>
                  <p className="row-book-author">{book.author}</p>
                  {(book.readCount !== undefined || book.downloadCount !== undefined) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap', fontSize: '0.75rem', color: '#64748b', marginTop: '0.35rem', fontWeight: 500 }}>
                      <span title="Jumlah pembaca" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        👁️ <strong>{book.readCount || 0}</strong>
                      </span>
                      <span>•</span>
                      <span title="Jumlah unduhan" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        📥 <strong>{book.downloadCount || 0}</strong>
                      </span>
                      {book.ratingAvg > 0 && (
                        <>
                          <span>•</span>
                          <span style={{ color: '#d97706', fontWeight: 600 }}>★ {book.ratingAvg.toFixed(1)}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>

          <button className="row-nav-btn right" onClick={() => scroll('right')} aria-label="Geser kanan">
            <ChevronRight size={22} />
          </button>
        </div>
      </div>
    </section>
  );
};

export default BookRow;
