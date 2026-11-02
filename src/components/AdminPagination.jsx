import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

/**
 * Reusable Pagination Component for Admin Panels
 *
 * @param {number} currentPage - Active page (1-based)
 * @param {number} totalItems - Total count of filtered/available items
 * @param {number} pageSize - Number of items displayed per page
 * @param {function} onPageChange - Callback when page changes (newPage) => void
 * @param {function} onPageSizeChange - Callback when page size changes (newSize) => void
 * @param {number[]} pageSizeOptions - Array of available sizes, defaults to [10, 25, 50, 100]
 * @param {string} itemName - Noun for items (e.g. "buku", "naskah", "pengguna", "data")
 */
const AdminPagination = ({
  currentPage = 1,
  totalItems = 0,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  itemName = 'data'
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, totalItems);

  // Generate page numbers window (with ellipsis support)
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages = [];
    if (safePage <= 4) {
      // Near beginning: 1, 2, 3, 4, 5, '...', totalPages
      for (let i = 1; i <= 5; i++) pages.push(i);
      pages.push('...');
      pages.push(totalPages);
    } else if (safePage >= totalPages - 3) {
      // Near end: 1, '...', totalPages - 4, ..., totalPages
      pages.push(1);
      pages.push('...');
      for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
    } else {
      // Middle: 1, '...', safePage - 1, safePage, safePage + 1, '...', totalPages
      pages.push(1);
      pages.push('...');
      pages.push(safePage - 1);
      pages.push(safePage);
      pages.push(safePage + 1);
      pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  const handlePageClick = (p) => {
    if (typeof p !== 'number') return;
    if (p !== safePage && onPageChange) {
      onPageChange(p);
    }
  };

  const btnStyle = (isActive = false, isDisabled = false) => ({
    padding: '0.35rem 0.65rem',
    minWidth: '32px',
    height: '32px',
    borderRadius: 'var(--radius-md, 6px)',
    border: isActive ? '1px solid #2563eb' : '1px solid var(--border-color, #e2e8f0)',
    background: isActive ? '#2563eb' : (isDisabled ? 'var(--bg-secondary, #f8fafc)' : 'var(--bg-primary, #ffffff)'),
    color: isActive ? '#ffffff' : (isDisabled ? 'var(--text-tertiary, #94a3b8)' : 'var(--text-primary, #0f172a)'),
    fontWeight: isActive ? 700 : 500,
    fontSize: '0.8rem',
    cursor: isDisabled || isActive ? 'default' : 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
    boxShadow: isActive ? '0 2px 4px rgba(37,99,235,0.2)' : 'none'
  });

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '1rem',
      padding: '0.85rem 1rem',
      marginTop: '1rem',
      borderTop: '1px solid var(--border-color, #e2e8f0)',
      background: 'var(--bg-secondary, #f8fafc)',
      borderRadius: '0 0 var(--radius-lg, 12px) var(--radius-lg, 12px)'
    }}>
      {/* Left: Entries selector + summary text */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: 'var(--text-secondary, #64748b)' }}>
          <span>Tampilkan</span>
          <select
            value={pageSize}
            onChange={(e) => {
              const newSize = Number(e.target.value);
              if (onPageSizeChange) onPageSizeChange(newSize);
              if (onPageChange) onPageChange(1);
            }}
            style={{
              padding: '0.3rem 0.5rem',
              borderRadius: 'var(--radius-md, 6px)',
              border: '1px solid var(--border-color, #cbd5e1)',
              background: 'var(--bg-primary, #ffffff)',
              color: 'var(--text-primary, #0f172a)',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <span>per halaman</span>
        </div>

        <span style={{ color: 'var(--border-color, #cbd5e1)', fontSize: '0.9rem' }}>|</span>

        <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #64748b)' }}>
          Menampilkan <strong>{startItem}</strong> – <strong>{endItem}</strong> dari <strong>{totalItems}</strong> {itemName}
        </span>
      </div>

      {/* Right: Page navigation buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
        {/* First page button */}
        <button
          type="button"
          onClick={() => handlePageClick(1)}
          disabled={safePage <= 1}
          style={btnStyle(false, safePage <= 1)}
          title="Halaman Pertama"
        >
          <ChevronsLeft size={14} />
        </button>

        {/* Previous page button */}
        <button
          type="button"
          onClick={() => handlePageClick(safePage - 1)}
          disabled={safePage <= 1}
          style={btnStyle(false, safePage <= 1)}
          title="Halaman Sebelumnya"
        >
          <ChevronLeft size={14} />
        </button>

        {/* Numbered page buttons */}
        {getPageNumbers().map((p, idx) => {
          if (p === '...') {
            return (
              <span
                key={`ellipsis-${idx}`}
                style={{
                  padding: '0 0.35rem',
                  fontSize: '0.85rem',
                  color: 'var(--text-tertiary, #94a3b8)',
                  userSelect: 'none'
                }}
              >
                …
              </span>
            );
          }
          return (
            <button
              key={`page-${p}`}
              type="button"
              onClick={() => handlePageClick(p)}
              style={btnStyle(p === safePage, false)}
            >
              {p}
            </button>
          );
        })}

        {/* Next page button */}
        <button
          type="button"
          onClick={() => handlePageClick(safePage + 1)}
          disabled={safePage >= totalPages}
          style={btnStyle(false, safePage >= totalPages)}
          title="Halaman Selanjutnya"
        >
          <ChevronRight size={14} />
        </button>

        {/* Last page button */}
        <button
          type="button"
          onClick={() => handlePageClick(totalPages)}
          disabled={safePage >= totalPages}
          style={btnStyle(false, safePage >= totalPages)}
          title="Halaman Terakhir"
        >
          <ChevronsRight size={14} />
        </button>
      </div>
    </div>
  );
};

export default AdminPagination;
