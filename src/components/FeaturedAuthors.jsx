import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Award } from 'lucide-react';
import './FeaturedAuthors.css';

const FeaturedAuthors = ({ authors = [], loading = false }) => {
  return (
    <section className="authors-section">
      <div className="container">
        <div className="authors-row-header">
          <div>
            <div className="authors-header-badge">
              <Award size={13} /> Penulis Terproduktif
            </div>
            <h2 className="authors-row-title">Penulis Pilihan</h2>
            <p className="authors-row-desc">
              Penulis dengan kontribusi karya literatur terbanyak yang diterbitkan oleh Perpusnas Press
            </p>
          </div>
          <Link to="/penulis" className="authors-row-viewall">
            Semua Penulis <ArrowRight size={16} />
          </Link>
        </div>

        {loading ? (
          <div className="authors-grid">
            {[1, 2, 3, 4].map(n => (
              <div className="author-card author-card-skeleton" key={n}>
                <div className="skeleton-avatar" />
                <div className="skeleton-badge" />
                <div className="skeleton-line title" />
                <div className="skeleton-line text" />
                <div className="skeleton-line text short" />
              </div>
            ))}
          </div>
        ) : (
          <div className="authors-grid">
            {authors.map((author, index) => {
              const initial = author.name ? author.name.trim().charAt(0).toUpperCase() : 'P';
              return (
                <div className="author-card" key={author.id || index}>
                  <div className="author-avatar-wrapper">
                    {author.photoUrl ? (
                      <img
                        src={author.photoUrl}
                        alt={author.name}
                        className="author-avatar"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.parentElement?.querySelector('.author-avatar-placeholder');
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div
                      className="author-avatar-placeholder"
                      style={{
                        backgroundColor: author.color || '#2563eb',
                        display: author.photoUrl ? 'none' : 'flex'
                      }}
                    >
                      {initial}
                    </div>
                  </div>

                  <div className="author-info">
                    {author.totalBooks > 0 && (
                      <div className="author-work-pill">
                        <BookOpen size={12} />
                        <span>{author.totalBooks} Karya Terbit</span>
                      </div>
                    )}
                    <h3 className="author-name" title={author.name}>{author.name}</h3>
                    <p className="author-role">{author.role || 'Penulis Perpusnas Press'}</p>
                    <p className="author-bio">{author.bio}</p>
                    <Link
                      to={`/penulis/${author.id}`}
                      className="btn-read-more"
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
