import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Search, BookOpen, Loader2 } from 'lucide-react';
import { SipenaAPI } from '../lib/api';
import '../components/BookRow.css';
import './BooksPage.css';

const CATEGORIES = ['Semua', 'Sastra', 'Sejarah', 'Budaya', 'Fiksi', 'Anak', 'Hukum', 'Pendidikan'];

const CATEGORY_COLORS = {
  'Sastra': '#1e3a8a',
  'Sejarah': '#b91c1c',
  'Budaya': '#047857',
  'Anak': '#0ea5e9',
  'Fiksi': '#be123c',
  'Hukum': '#6b21a8',
  'Pendidikan': '#92400e',
  'Umum': '#475569'
};

const BooksPage = () => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Semua');

  const fetchBooks = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 12,
        search: search.trim() || undefined,
        category: category !== 'Semua' ? category : undefined,
      };

      const res = await SipenaAPI.getBooks(params);
      if (res && res.data) {
        setBooks(res.data);
        setTotalPages(res.pagination?.totalPages || 1);
        setTotal(res.pagination?.total || 0);
      } else if (Array.isArray(res)) {
        setBooks(res);
        setTotal(res.length);
        setTotalPages(1);
      }
    } catch (err) {
      console.error('Failed to fetch books:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, [page, category]);

  // Debounced search trigger
  useEffect(() => {
    const handler = setTimeout(() => {
      setPage(1);
      fetchBooks();
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  return (
    <main className="books-page">
      <div className="page-header">
        <div className="container">
          <h1 className="page-title">Katalog Buku</h1>
          <p className="page-subtitle">Jelajahi berbagai koleksi buku, naskah kuno, dan literatur dari Perpusnas Press</p>
        </div>
      </div>

      <div className="container books-content">
        {/* Search & Category Filter Toolbar */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: '2rem'
        }}>
          {/* Category Pills */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => { setCategory(cat); setPage(1); }}
                style={{
                  padding: '0.45rem 1rem', borderRadius: '2rem', fontSize: '0.875rem', fontWeight: 500,
                  cursor: 'pointer', border: '1px solid',
                  backgroundColor: category === cat ? 'var(--accent-color, #2563eb)' : 'transparent',
                  color: category === cat ? '#fff' : 'var(--text-secondary)',
                  borderColor: category === cat ? 'var(--accent-color, #2563eb)' : 'var(--border-color, #cbd5e1)',
                  transition: 'all 0.2s'
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            <input
              type="text"
              placeholder="Cari judul atau penulis..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '0.55rem 0.75rem 0.55rem 2.25rem',
                border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem', background: 'var(--bg-primary)', color: 'var(--text-primary)',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        {/* Results Counter */}
        <div style={{ marginBottom: '1.25rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Menampilkan <strong>{books.length}</strong> dari <strong>{total}</strong> koleksi buku
        </div>

        {/* Loading State */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem 0', gap: '1rem' }}>
            <Loader2 size={36} className="animate-spin" color="var(--accent-color, #2563eb)" />
            <span style={{ color: 'var(--text-secondary)' }}>Memuat katalog buku dari database...</span>
          </div>
        ) : books.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--text-secondary)' }}>
            <BookOpen size={48} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
            <h3>Tidak ada buku yang ditemukan</h3>
            <p>Coba gunakan kata kunci pencarian lain atau pilih kategori Semua.</p>
          </div>
        ) : (
          /* Book Grid */
          <div className="books-grid">
            {books.map((book) => {
              const bgColor = CATEGORY_COLORS[book.category] || '#1e3a8a';
              return (
                <Link to={`/buku/${book.id}`} key={book.id} className="row-card">
                  <div className="row-cover" style={{ backgroundColor: bgColor }}>
                    <span className="row-cover-title">{book.title}</span>
                    <div className="row-cover-overlay">
                      <span className="overlay-play">▶ Baca</span>
                    </div>
                  </div>
                  <div className="row-info">
                    <p className="row-book-title">{book.title}</p>
                    <p className="row-book-author">{book.authorName || 'Penulis Anonim'}</p>
                    {book.ratingAvg > 0 && (
                      <span style={{ fontSize: '0.75rem', color: '#fbbf24', marginTop: '0.2rem', display: 'block' }}>
                        ★ {book.ratingAvg.toFixed(1)} ({book.ratingCount || 0})
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Real Dynamic Pagination */}
        {totalPages > 1 && (
          <div className="pagination" style={{ marginTop: '2.5rem' }}>
            <button
              className="page-btn"
              disabled={page <= 1}
              onClick={() => { setPage(prev => Math.max(1, prev - 1)); window.scrollTo(0, 0); }}
            >
              <ChevronLeft size={16} />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                className={`page-btn ${p === page ? 'active' : ''}`}
                onClick={() => { setPage(p); window.scrollTo(0, 0); }}
              >
                {p}
              </button>
            ))}

            <button
              className="page-btn"
              disabled={page >= totalPages}
              onClick={() => { setPage(prev => Math.min(totalPages, prev + 1)); window.scrollTo(0, 0); }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </main>
  );
};

export default BooksPage;
