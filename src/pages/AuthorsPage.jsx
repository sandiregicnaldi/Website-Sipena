import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { SipenaAPI } from '../lib/api';
import { Loader2, Users, Search, X } from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredAuthors = useMemo(() => {
    if (!searchQuery.trim()) return authors;
    const q = searchQuery.toLowerCase().trim();
    return authors.filter(a => 
      (a.name || '').toLowerCase().includes(q) || 
      (a.role || '').toLowerCase().includes(q)
    );
  }, [authors, searchQuery]);

  return (
    <main className="authors-page">
      {/* ── Luminous Modern Hero Header ── */}
      <div className="authors-hero-header">
        <div className="container">
          <div className="authors-hero-badge">
            <Users size={14} /> Komunitas Penulis &amp; Kontributor
          </div>
          <h1 className="authors-hero-title">Daftar Penulis SiPena</h1>
          <p className="authors-hero-subtitle">
            Mengenal lebih dekat para penulis hebat, akademisi, dan peneliti di balik ribuan karya literatur Perpusnas Press.
          </p>

          {/* Clean Search Bar */}
          <div className="authors-search-wrap">
            <div className="authors-search-box">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                placeholder="Cari nama penulis atau bidang keahlian..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => setSearchQuery('')}
                  title="Hapus pencarian"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container authors-content">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
            <Loader2 size={36} className="animate-spin text-primary" />
          </div>
        ) : filteredAuthors.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: '#64748b' }}>
            <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>Tidak ditemukan penulis yang sesuai dengan "{searchQuery}"</p>
            <button 
              type="button" 
              onClick={() => setSearchQuery('')} 
              className="btn btn-outline" 
              style={{ marginTop: '0.75rem' }}
            >
              Reset Pencarian
            </button>
          </div>
        ) : (
          <div className="authors-grid">
            {filteredAuthors.map((author) => (
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
