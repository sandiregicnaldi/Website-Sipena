import React from 'react';
import { Link } from 'react-router-dom';
import './AuthorsPage.css';

const AuthorsPage = () => {
  // Dummy data for authors
  const initialAuthors = [
    { id: 1, name: 'Chairunnisa Ahsana AS', role: 'Penulis', imageUrl: '' },
    { id: 2, name: 'Nyoman Payuyasa', role: 'Penulis', imageUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80' },
    { id: 3, name: 'A. Rafik', role: 'Penulis', imageUrl: '' },
    { id: 4, name: 'Aam Amzad', role: 'Penulis', imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80' },
    { id: 5, name: 'Agus Miftahorrahman', role: 'Penulis', imageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80' },
    { id: 6, name: 'Ahmad Salman Kurniawan', role: 'Penulis', imageUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80' },
    { id: 7, name: 'Budi Santoso', role: 'Penulis', imageUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80' },
    { id: 8, name: 'Citra Dewi', role: 'Penulis', imageUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80' },
  ];


  return (
    <main className="authors-page">
      <div className="page-header">
        <div className="container">
          <h1 className="page-title">Daftar Penulis</h1>
          <p className="page-subtitle">Mengenal lebih dekat para penulis dan kontributor hebat di balik karya-karya Perpusnas Press</p>
        </div>
      </div>

      <div className="container authors-content">
        <div className="authors-grid">
          {initialAuthors.map((author) => (
            <div className="author-card" key={author.id}>
              <div className="author-photo-wrapper">
                {author.imageUrl ? (
                  <img src={author.imageUrl} alt={author.name} className="author-photo" />
                ) : (
                  <div className="author-photo-fallback">
                    <span>{author.name.charAt(0)}</span>
                  </div>
                )}
              </div>
              <div className="author-info">
                <h3 className="author-name">{author.name}</h3>
                <p className="author-role">{author.role}</p>
                <Link to={`/penulis/${author.id}`} className="btn btn-outline btn-sm author-btn">Detail Profil</Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
};

export default AuthorsPage;
