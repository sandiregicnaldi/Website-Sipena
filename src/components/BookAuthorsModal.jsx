import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, X, BookOpen, Copy, Check } from 'lucide-react';
import './BookAuthorsModal.css';

/**
 * Parses author string into individual clean author names,
 * respecting Indonesian academic degrees (e.g. "Jusman Sani, S.E., M.E").
 */
export const parseAuthorsList = (authorStr) => {
  if (!authorStr || typeof authorStr !== 'string') return [];
  const rawParts = authorStr.split(/[,;\n]+/).map(p => p.trim()).filter(Boolean);

  const degrees = new Set([
    's.e', 's.e.', 'm.e', 'm.e.', 's.pd', 's.pd.', 'm.pd', 'm.pd.',
    's.hum', 's.hum.', 'm.hum', 'm.hum.', 's.sos', 's.sos.', 'm.si', 'm.si.',
    's.kom', 's.kom.', 'm.kom', 'm.kom.', 's.sn', 's.sn.', 'm.sn', 'm.sn.',
    'dr', 'dr.', 'dra', 'dra.', 'drs', 'drs.', 'prof', 'prof.', 'ph.d', 'ph.d.',
    'dkk', 'dkk.', 'dkk..', 'dan kawan-kawan', 'et al', 'et al.'
  ]);

  const authors = [];
  for (let i = 0; i < rawParts.length; i++) {
    const part = rawParts[i];
    const lower = part.toLowerCase();

    // Skip standalone "dkk"
    if (lower === 'dkk' || lower === 'dkk.' || lower === 'et al' || lower === 'et al.') {
      continue;
    }

    // Attach degree to previous author if applicable
    if (degrees.has(lower) && authors.length > 0) {
      authors[authors.length - 1] += `, ${part}`;
    } else {
      authors.push(part);
    }
  }

  return authors.length > 0 ? authors : [authorStr.trim()];
};

/**
 * Checks if author string is long enough to warrant a "Selengkapnya" button.
 */
export const isLongAuthor = (authorStr) => {
  if (!authorStr || typeof authorStr !== 'string') return false;
  const str = authorStr.trim();
  // Lebih dari 45 karakter atau memiliki 2 pemisah koma/titik koma (3+ orang)
  return str.length > 45 || (str.match(/[,;]/g) || []).length >= 2;
};

const BookAuthorsModal = ({ isOpen, data, onClose }) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    // Lock body scroll
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !data) return null;

  const authors = parseAuthorsList(data.author);

  const handleCopyAll = (e) => {
    e.stopPropagation();
    if (data.author) {
      navigator.clipboard?.writeText(data.author);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="book-authors-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="book-authors-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="book-authors-header">
          <div className="book-authors-header-info">
            <span className="book-authors-badge">
              <Users size={14} /> Daftar Penulis ({authors.length} Orang)
            </span>
            <h3 className="book-authors-book-title" title={data.title}>
              {data.title}
            </h3>
          </div>
          <button
            type="button"
            className="book-authors-close-btn"
            onClick={onClose}
            aria-label="Tutup modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body: Scrollable list of authors */}
        <div className="book-authors-body">
          <div className="book-authors-list">
            {authors.map((authorName, idx) => {
              const initial = authorName.replace(/^(dr\.|dra\.|drs\.|prof\.|h\.|hj\.)\s+/i, '').charAt(0).toUpperCase() || 'P';
              return (
                <div key={idx} className="book-authors-item">
                  <div className="book-authors-item-index">{idx + 1}</div>
                  <div className="book-authors-item-avatar">{initial}</div>
                  <div className="book-authors-item-name">{authorName}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="book-authors-footer">
          <button
            type="button"
            className="book-authors-copy-btn"
            onClick={handleCopyAll}
            title="Salin seluruh nama penulis"
          >
            {copied ? <Check size={14} color="#059669" /> : <Copy size={14} />}
            <span>{copied ? 'Tersalin!' : 'Salin Semua'}</span>
          </button>

          <div className="book-authors-footer-actions">
            <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>
              Tutup
            </button>
            {data.id && (
              <Link
                to={`/buku/${data.id}`}
                className="btn btn-primary btn-sm book-authors-detail-btn"
                onClick={onClose}
              >
                <BookOpen size={14} /> Detail Buku
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookAuthorsModal;
