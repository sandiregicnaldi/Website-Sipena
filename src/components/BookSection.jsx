import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Download, ChevronLeft, ChevronRight } from 'lucide-react';
import './BookSection.css';

const BookSection = ({ title, books, showDownloads }) => {
  const scrollRef = useRef(null);

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
          {books.map((book, index) => (
            <Link to={`/buku/${book.id || 1}`} className="book-card" key={index}>
              <div className="book-cover-wrapper">
                {/* Dummy cover if no image */}
                <div className="book-cover-placeholder" style={{backgroundColor: book.color || '#3b82f6'}}>
                  <span className="book-title-overlay">{book.title}</span>
                </div>
                <div className="book-hover-actions">
                  <span className="btn btn-primary btn-sm">Lihat Detail</span>
                </div>
              </div>
              
              <div className="book-info">
                <h3 className="book-title">{book.title}</h3>
                <p className="book-author">{book.author}</p>
                
                {showDownloads && (
                  <div className="book-meta">
                    <span className="download-count">
                      <Download size={14} /> {book.downloads} Unduhan
                    </span>
                  </div>
                )}
              </div>
            </Link>
          ))}
          </div>
          
          {books.length > 4 && (
            <button className="slider-btn right" onClick={() => scroll('right')}><ChevronRight size={24} /></button>
          )}
        </div>
      </div>
    </section>
  );
};

export default BookSection;
