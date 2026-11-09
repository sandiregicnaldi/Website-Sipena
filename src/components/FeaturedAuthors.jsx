import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Award } from 'lucide-react';
import './FeaturedAuthors.css';

const FeaturedAuthors = ({ authors = [], loading = false }) => {
  return (
    <section className="featured-authors-section">
      <div className="container">
        <div className="featured-authors-header">
          <div>
            <div className="featured-authors-badge">
              <Award size={13} /> Penulis Terproduktif
            </div>
            <h2 className="featured-authors-title">Penulis Pilihan</h2>
            <p className="featured-authors-desc">
              5 Penulis dengan kontribusi karya literatur terbanyak yang diterbitkan oleh Perpusnas Press
            </p>
          </div>
          <Link to="/penulis" className="featured-authors-viewall">
            Semua Penulis <ArrowRight size={16} />
          </Link>
        </div>

        {loading ? (
          <div className="featured-authors-grid">
            {[1, 2, 3, 4, 5].map(n => (
              <div className="featured-author-card featured-author-skeleton" key={n}>
                <div className="featured-skeleton-avatar" />
                <div className="featured-skeleton-badge" />
                <div className="featured-skeleton-line title" />
                <div className="featured-skeleton-line text" />
                <div className="featured-skeleton-line text short" />
              </div>
            ))}
          </div>
        ) : (
          <div className="featured-authors-grid">
            {authors.map((author, index) => {
              const initial = author.name ? author.name.trim().charAt(0).toUpperCase() : 'P';
              return (
                <div className="featured-author-card" key={author.id || index}>
                  <div className="featured-author-avatar-wrapper">
                    {author.photoUrl ? (
                      <img
                        src={author.photoUrl}
                        alt={author.name}
                        className="featured-author-avatar"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.parentElement?.querySelector('.featured-author-avatar-placeholder');
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div
                      className="featured-author-avatar-placeholder"
                      style={{
                        backgroundColor: author.color || '#2563eb',
                        display: author.photoUrl ? 'none' : 'flex'
                      }}
                    >
                      {initial}
                    </div>
                  </div>

                  <div className="featured-author-info">
                    {author.totalBooks > 0 && (
                      <div className="featured-author-pill">
                        <BookOpen size={12} />
                        <span>{author.totalBooks} Karya Terbit</span>
                      </div>
                    )}
                    <h3 className="featured-author-name" title={author.name}>{author.name}</h3>
                    <p className="featured-author-role">{author.role || 'Penulis Perpusnas Press'}</p>
                    <p className="featured-author-bio">{author.bio}</p>
                    <Link
                      to={`/penulis/${author.id}`}
                      className="featured-btn-read-more"
                    >
                      Lihat Karya <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default FeaturedAuthors;
