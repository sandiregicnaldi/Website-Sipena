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
                  <span className="row-cover-title">{book.title}</span>
                  {/* Hover overlay */}
                  <div className="row-cover-overlay">
                    <span className="overlay-play">▶ Baca</span>
                  </div>
                </div>
                {/* Info */}
                <div className="row-info">
                  <p className="row-book-title">{book.title}</p>
                  <p className="row-book-author">{book.author}</p>
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
