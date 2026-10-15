import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SipenaAPI } from '../lib/api';
import { Loader2 } from 'lucide-react';
import './AuthorsPage.css';

const initialAuthors = [
  { id: 'mock-1', name: 'Dinda Marlina Carolina', role: 'Penulis & Peneliti Sastra', imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80' },
  { id: '2', name: 'Nyoman Payuyasa', role: 'Penulis', imageUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80' },
  { id: '3', name: 'Chairunnisa Ahsana AS', role: 'Penulis', imageUrl: '' },
  { id: '4', name: 'Aam Amzad', role: 'Penulis', imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80' },
  { id: '5', name: 'Agus Miftahorrahman', role: 'Penulis', imageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80' },
  { id: '6', name: 'Ahmad Salman Kurniawan', role: 'Penulis', imageUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80' },
  { id: '7', name: 'Budi Santoso', role: 'Penulis', imageUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80' },
  { id: '8', name: 'Citra Dewi', role: 'Penulis', imageUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80' },
];

const AuthorsPage = () => {
  const [authors, setAuthors] = useState(initialAuthors);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchAuthors = async () => {
      try {
        const liveAuthors = await SipenaAPI.getAuthors();
        if (isMounted && Array.isArray(liveAuthors) && liveAuthors.length > 0) {
          const formattedLive = liveAuthors.map(a => ({
            id: a.id,
            name: a.name,
            role: a.profesi || 'Penulis & Kontributor',
            imageUrl: a.image || ''
          }));

          // Merge: Live verified authors first, followed by initial demo authors (filtering duplicate names)
          const liveNames = new Set(formattedLive.map(a => a.name.toLowerCase()));
          const filteredInitial = initialAuthors.filter(a => !liveNames.has(a.name.toLowerCase()));
          setAuthors([...formattedLive, ...filteredInitial]);
        }
      } catch (err) {
        console.warn('Failed to load authors from API, using initial list:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchAuthors();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className="authors-page">
      <div className="page-header">
        <div className="container">
          <h1 className="page-title">Daftar Penulis</h1>
          <p className="page-subtitle">Mengenal lebih dekat para penulis dan kontributor hebat di balik karya-karya Perpusnas Press</p>
        </div>
      </div>

      <div className="container authors-content">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
            <Loader2 size={36} className="animate-spin text-primary" />
          </div>
        ) : (
          <div className="authors-grid">
            {authors.map((author) => (
              <div className="author-card" key={author.id}>
                <div className="author-photo-wrapper">
                  {author.imageUrl ? (
                    <img src={author.imageUrl} alt={author.name} className="author-photo" />
                  ) : (
                    <div className="author-photo-fallback">
                      <span>{author.name ? author.name.charAt(0).toUpperCase() : 'P'}</span>
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
        )}
      </div>
    </main>
  );
};

export default AuthorsPage;
