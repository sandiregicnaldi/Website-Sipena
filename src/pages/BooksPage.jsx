import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Search, BookOpen, Loader2, X } from 'lucide-react';
import { SipenaAPI } from '../lib/api';
import '../components/BookRow.css';
import './BooksPage.css';

const CATEGORIES = [
  'Semua',
  'Naskah Kuno Nusantara',
  'Non Fiksi',
  'Anak-anak',
  'Biografi & Memoar',
  'Ekonomi & Management',
  'Fiksi',
  'Hukum & Politik',
  'Humaniora',
  'Inkubator Literasi',
  'Kesehatan',
  'Komik',
  'Lifestyle',
  'Pedoman / Standar',
  'Prosiding',
  'Laporan',
  'Majalah / Jurnal',
  'Religi',
  'Perjalanan'
];

const CATEGORY_COLORS = {
  'Naskah Kuno Nusantara': '#78350f',
  'Non Fiksi': '#334155',
  'Anak-anak': '#0ea5e9',
  'Biografi & Memoar': '#8b5cf6',
  'Ekonomi & Management': '#059669',
  'Fiksi': '#e11d48',
  'Hukum & Politik': '#4f46e5',
  'Humaniora': '#d97706',
  'Inkubator Literasi': '#2563eb',
  'Kesehatan': '#10b981',
  'Komik': '#f59e0b',
  'Lifestyle': '#ec4899',
  'Pedoman / Standar': '#d97706',
  'Prosiding': '#dc2626',
  'Laporan': '#059669',
  'Majalah / Jurnal': '#0891b2',
  'Religi': '#0284c7',
  'Perjalanan': '#14b8a6',
  // Backward compatibility
  'Sastra': '#1e3a8a',
  'Sejarah': '#b91c1c',
  'Budaya': '#047857',
  'Anak': '#0ea5e9',
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
      {/* ── Luminous Modern Hero Header ── */}
      <div className="books-hero-header">
        <div className="container">
          <div className="books-hero-badge">
            <BookOpen size={14} /> Koleksi Literatur &amp; Naskah Digital
          </div>
          <h1 className="books-hero-title">Katalog Buku SiPena</h1>
          <p className="books-hero-subtitle">
            Jelajahi berbagai koleksi buku ilmiah, naskah kuno nusantara, dan literatur resmi terbitan Perpusnas Press.
          </p>
        </div>
      </div>

      <div className="container books-content">
        {/* Search & Category Filter Toolbar */}
        <div className="books-toolbar">
          {/* Category Pills */}
          <div className="books-categories-scroll">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => { setCategory(cat); setPage(1); }}
                className={`category-pill ${category === cat ? 'active' : ''}`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="books-search-box">
            <Search size={17} className="search-icon" />
            <input
              type="text"
              placeholder="Cari judul atau penulis..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearch('')}
                title="Hapus pencarian"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Results Counter */}
        <div className="books-results-meta">
          <span>Menampilkan <strong>{books.length}</strong> dari <strong>{total}</strong> koleksi buku</span>
          {category !== 'Semua' && (
            <span className="active-cat-tag">Kategori: <strong>{category}</strong></span>
          )}
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
                    {book.coverUrl ? (
                      <img
                        src={book.coverUrl}
                        alt={book.title}
                        className="row-cover-img"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const fallbackSpan = e.currentTarget.parentElement?.querySelector('.row-cover-title');
                          if (fallbackSpan) fallbackSpan.style.display = 'block';
                        }}
                      />
                    ) : null}
                    <span className="row-cover-title" style={book.coverUrl ? { display: 'none' } : {}}>{book.title}</span>
                    <div className="row-cover-overlay">
                      <span className="overlay-play">▶ Baca</span>
                    </div>
                  </div>
                  <div className="row-info">
                    <p className="row-book-title">{book.title}</p>
                    <p className="row-book-author">{book.authorName || 'Penulis Anonim'}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap', fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.35rem' }}>
                      <span title="Jumlah pembaca">👁️ {book.readCount || 0}</span>
                      <span>•</span>
                      <span title="Jumlah unduhan">📥 {book.downloadCount || 0}</span>
                      {book.ratingAvg > 0 && (
                        <>
                          <span>•</span>
                          <span style={{ color: '#fbbf24', fontWeight: 600 }}>★ {book.ratingAvg.toFixed(1)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Real Dynamic Pagination with Windowing */}
        {totalPages > 1 && (() => {
          const getPageNumbers = () => {
            if (totalPages <= 7) {
              return Array.from({ length: totalPages }, (_, i) => i + 1);
            }
            if (page <= 4) {
              return [1, 2, 3, 4, 5, '...', totalPages];
            }
            if (page >= totalPages - 3) {
              return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
            }
            return [1, '...', page - 1, page, page + 1, '...', totalPages];
          };

          return (
            <div className="pagination" style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
              <button
                className="page-btn"
                disabled={page <= 1}
                onClick={() => { setPage(prev => Math.max(1, prev - 1)); window.scrollTo(0, 0); }}
                title="Halaman Sebelumnya"
              >
                <ChevronLeft size={16} />
              </button>

              {getPageNumbers().map((p, idx) => (
                p === '...' ? (
                  <span key={`dots-${idx}`} style={{ padding: '0.4rem 0.6rem', color: '#64748b', fontWeight: 600 }}>...</span>
                ) : (
                  <button
                    key={p}
                    className={`page-btn ${p === page ? 'active' : ''}`}
                    onClick={() => { setPage(p); window.scrollTo(0, 0); }}
                  >
                    {p}
                  </button>
                )
              ))}

              <button
                className="page-btn"
                disabled={page >= totalPages}
                onClick={() => { setPage(prev => Math.min(totalPages, prev + 1)); window.scrollTo(0, 0); }}
                title="Halaman Berikutnya"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          );
        })()}
      </div>
    </main>
  );
};

export default BooksPage;
