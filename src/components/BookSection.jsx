import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, ChevronLeft, ChevronRight } from 'lucide-react';
import BookAuthorsModal, { isLongAuthor } from './BookAuthorsModal';
import './BookSection.css';

const BookSection = ({ title, books = [], showDownloads }) => {
  const scrollRef = useRef(null);
  const [authorModal, setAuthorModal] = useState(null);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 300; // Jarak geser
      if (direction === 'left') {
        scrollRef.current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      } else {
        scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    }
  };

  return (
    <section className="book-section">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">{title}</h2>
        </div>
        
        <div className="book-slider-container">
          {books.length > 4 && (
            <button className="slider-btn left" onClick={() => scroll('left')}><ChevronLeft size={24} /></button>
          )}
          
          <div className="book-grid" ref={scrollRef}>
          {books.map((book, index) => {
            const authorText = book.author || book.authorName || 'Penulis Anonim';
            const hasMultipleAuthors = isLongAuthor(authorText);

            return (
              <Link to={`/buku/${book.id || 1}`} className="book-card" key={index}>
                <div className="book-cover-wrapper">
                  {/* Dummy cover if no image */}
                  <div className="book-cover-placeholder" style={{ backgroundColor: book.color || '#3b82f6', overflow: 'hidden', position: 'relative' }}>
                    {(book.coverUrl || book.cover) ? (
                      <img
                        src={book.coverUrl || book.cover}
                        alt={book.title}
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const fallbackSpan = e.currentTarget.parentElement?.querySelector('.book-title-overlay');
                          if (fallbackSpan) fallbackSpan.style.display = 'block';
                        }}
                      />
                    ) : null}
                    <span className="book-title-overlay" style={(book.coverUrl || book.cover) ? { display: 'none' } : {}}>{book.title}</span>
                  </div>
                  <div className="book-hover-actions">
                    <span className="btn btn-primary btn-sm">Lihat Detail</span>
                  </div>
                </div>
                
                <div className="book-info">
                  <h3 className="book-title">{book.title}</h3>
                  <div className="book-author-container">
                    <p className="book-author" title={authorText}>{authorText}</p>
                    {hasMultipleAuthors && (
                      <button
                        type="button"
                        className="book-author-more-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setAuthorModal({
                            id: book.id,
                            title: book.title,
                            author: authorText,
                            coverUrl: book.coverUrl || book.cover
                          });
                        }}
                        title="Lihat seluruh daftar penulis"
                      >
                        Selengkapnya
                      </button>
                    )}
                  </div>
                  
                  {showDownloads && (
                    <div className="book-meta">
                      <span className="download-count">
                        <Download size={14} /> {book.downloads} Unduhan
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
          </div>
          
          {books.length > 4 && (
            <button className="slider-btn right" onClick={() => scroll('right')}><ChevronRight size={24} /></button>
          )}
        </div>
      </div>

      {/* Modal Daftar Seluruh Penulis */}
      <BookAuthorsModal
        isOpen={!!authorModal}
        data={authorModal}
        onClose={() => setAuthorModal(null)}
      />
    </section>
  );
};

export default BookSection;
