import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import './FeaturedAuthors.css';

const FeaturedAuthors = ({ authors }) => {
  return (
    <section className="authors-section">
      <div className="container">
        <div className="authors-row-header">
          <h2 className="authors-row-title">Penulis Pilihan</h2>
          <Link to="/penulis" className="authors-row-viewall">
            Semua Penulis <ArrowRight size={16} />
          </Link>
        </div>

        <div className="authors-grid">
          {authors.map((author, index) => (
            <div className="author-card" key={index}>
              <div className="author-avatar-wrapper">
                {author.hasPhoto ? (
                  <img src={author.photoUrl} alt={author.name} className="author-avatar" />
                ) : (
                  <div className="author-avatar-placeholder" style={{ backgroundColor: author.color }}>
                    {author.name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="author-info">
                <h3 className="author-name">{author.name}</h3>
                <p className="author-bio">{author.bio}</p>
                <Link
                  to={`/penulis/${author.id || index + 1}`}
                  className="btn-read-more"
                >
                  Baca Profil <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedAuthors;
