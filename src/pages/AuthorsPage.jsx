import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { SipenaAPI } from '../lib/api';
import { Loader2, Users, Search, X, BookOpen, ArrowUpDown } from 'lucide-react';
import './AuthorsPage.css';

const AuthorsPage = () => {
  const [authors, setAuthors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('karya_desc'); // 'karya_desc' | 'name_asc'

  useEffect(() => {
    let isMounted = true;

    const fetchAuthors = async () => {
      try {
        setLoading(true);
        const liveAuthors = await SipenaAPI.getAuthors();
        if (isMounted && Array.isArray(liveAuthors) && liveAuthors.length > 0) {
          const formatted = liveAuthors.map(a => ({
            id: a.id,
            name: a.name,
            role: a.profesi || 'Penulis Perpusnas Press',
            imageUrl: a.image || '',
            totalBooks: a.totalBooks || 0,
            bio: a.bioPreview || a.bio || ''
          }));
          setAuthors(formatted);
        }
      } catch (err) {
        console.warn('Failed to load authors from API:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchAuthors();

    return () => {
      isMounted = false;
    };
  }, []);

  const processedAuthors = useMemo(() => {
    let result = [...authors];

    // 1. Filter Pencarian
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(a => 
        (a.name || '').toLowerCase().includes(q) || 
        (a.role || '').toLowerCase().includes(q) ||
        (a.bio || '').toLowerCase().includes(q)
      );
    }

    // 2. Pengurutan (Default: Dari Karya Terbanyak ke Paling Sedikit)
    if (sortBy === 'karya_desc') {
      result.sort((a, b) => (b.totalBooks || 0) - (a.totalBooks || 0));
    } else if (sortBy === 'name_asc') {
      result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    return result;
  }, [authors, searchQuery, sortBy]);

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

          {/* Clean Search Bar & Controls */}
          <div className="authors-search-wrap">
            <div className="authors-search-box">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                placeholder="Cari nama penulis, bidang, atau keahlian..."
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

          {/* Sort Pill Filter */}
          <div className="authors-sort-bar">
            <span className="sort-label"><ArrowUpDown size={13} /> Urutkan:</span>
            <button
              type="button"
              className={`sort-pill ${sortBy === 'karya_desc' ? 'active' : ''}`}
              onClick={() => setSortBy('karya_desc')}
            >
              📚 Karya Terbanyak
            </button>
            <button
              type="button"
              className={`sort-pill ${sortBy === 'name_asc' ? 'active' : ''}`}
              onClick={() => setSortBy('name_asc')}
            >
              🔤 Nama (A - Z)
            </button>
          </div>
        </div>
      </div>

      <div className="container authors-content">
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '5rem 0' }}>
            <Loader2 size={38} className="animate-spin text-primary" />
            <p style={{ color: '#64748b', fontSize: '0.95rem' }}>Memuat daftar dan kontribusi penulis...</p>
          </div>
        ) : processedAuthors.length === 0 ? (
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
          <>
            <div className="authors-count-info">
              Menampilkan <strong>{processedAuthors.length}</strong> penulis terdaftar di Perpusnas Press
            </div>

            <div className="authors-grid">
              {processedAuthors.map((author) => {
                const initial = author.name ? author.name.trim().charAt(0).toUpperCase() : 'P';
                return (
                  <div className="author-card" key={author.id}>
                    <div className="author-photo-wrapper">
                      {author.imageUrl ? (
                        <img
                          src={author.imageUrl}
                          alt={author.name}
                          className="author-photo"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const fallback = e.currentTarget.parentElement?.querySelector('.author-photo-fallback');
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div
                        className="author-photo-fallback"
                        style={{ display: author.imageUrl ? 'none' : 'flex' }}
                      >
                        <span>{initial}</span>
                      </div>
                    </div>

                    <div className="author-info">
                      <div className="author-karya-badge">
                        <BookOpen size={13} />
                        <span><strong>{author.totalBooks}</strong> Karya Terbit</span>
                      </div>
                      <h3 className="author-name" title={author.name}>{author.name}</h3>
                      <p className="author-role">{author.role}</p>
                      <Link to={`/penulis/${author.id}`} className="btn btn-outline btn-sm author-btn">
                        Lihat Karya &amp; Profil
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </main>
  );
};

export default AuthorsPage;
