import React, { useState } from 'react';
import { User, BookOpen, Download, Settings, Search, MessageSquare, Mail, Phone, HelpCircle } from 'lucide-react';
import { useFAQ } from '../context/FAQContext';
import './FAQPage.css';

const CATEGORY_ICONS = {
  'Pendaftaran & Akun': <User size={20} color="var(--accent-color)" />,
  'Penerbitan Buku': <BookOpen size={20} color="var(--accent-color)" />,
  'Koleksi & Unduhan': <Download size={20} color="var(--accent-color)" />,
  'Teknis & Sistem': <Settings size={20} color="var(--accent-color)" />,
};

const FAQItem = ({ q, a }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className={`faq-item ${open ? 'open' : ''}`}>
      <button className="faq-question" onClick={() => setOpen(o => !o)}>
        <span>{q}</span>
        <svg className="faq-chevron" width="18" height="18" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="faq-answer">
          <p style={{ whiteSpace: 'pre-line' }}>{a}</p>
        </div>
      )}
    </div>
  );
};

const FAQPage = () => {
  const { faqs, FAQ_KATEGORI } = useFAQ();
  const [activeKat, setActiveKat] = useState(null);
  const [search, setSearch] = useState('');

  // Pastikan kategori urut sesuai FAQ_KATEGORI ditambah kategori baru jika ada
  const allCategories = Array.from(
    new Set([
      ...(FAQ_KATEGORI || []),
      ...faqs.map(f => f.kategori).filter(Boolean)
    ])
  );

  // Kelompokkan FAQ berdasarkan kategori secara dinamis
  const groupedData = allCategories.map(cat => ({
    kategori: cat,
    items: faqs
      .filter(f => f.kategori === cat)
      .map(f => ({ id: f.id, q: f.pertanyaan, a: f.jawaban }))
  })).filter(g => g.items.length > 0);

  const filtered = groupedData.map(kat => ({
    ...kat,
    items: kat.items.filter(item =>
      item.q.toLowerCase().includes(search.toLowerCase()) ||
      item.a.toLowerCase().includes(search.toLowerCase())
    )
  })).filter(kat => kat.items.length > 0);

  return (
    <main className="faq-page">
      {/* Hero */}
      <section className="faq-hero">
        <div className="container">
          <span className="faq-tag">Pusat Bantuan</span>
          <h1 className="faq-hero-title">Pertanyaan yang<br /><span>Sering Diajukan</span></h1>
          <p className="faq-hero-desc">Temukan jawaban atas pertanyaan Anda seputar layanan SiPena dan Perpusnas Press.</p>
          {/* Search */}
          <div className="faq-search-wrap">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              className="faq-search"
              placeholder="Cari pertanyaan..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Category tabs */}
      {!search && (
        <section className="faq-tabs-section">
          <div className="container">
            <div className="faq-tabs">
              <button
                className={`faq-tab ${activeKat === null ? 'active' : ''}`}
                onClick={() => setActiveKat(null)}
              >Semua</button>
              {groupedData.map(kat => (
                <button
                  key={kat.kategori}
                  className={`faq-tab ${activeKat === kat.kategori ? 'active' : ''}`}
                  onClick={() => setActiveKat(k => k === kat.kategori ? null : kat.kategori)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  {CATEGORY_ICONS[kat.kategori] || <HelpCircle size={20} color="var(--accent-color)" />}
                  {kat.kategori}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ content */}
      <section className="faq-content-section">
        <div className="container">
          {(search ? filtered : (activeKat ? filtered.filter(k => k.kategori === activeKat) : filtered))
            .map(kat => (
              <div key={kat.kategori} className="faq-group">
                <div className="faq-group-header">
                  <span className="faq-group-icon" style={{ display: 'flex', alignItems: 'center' }}>
                    {CATEGORY_ICONS[kat.kategori] || <HelpCircle size={20} color="var(--accent-color)" />}
                  </span>
                  <h2 className="faq-group-title">{kat.kategori}</h2>
                  <span className="faq-group-count">{kat.items.length} pertanyaan</span>
                </div>
                <div className="faq-list">
                  {kat.items.map((item, i) => (
                    <FAQItem key={item.id || i} q={item.q} a={item.a} />
                  ))}
                </div>
              </div>
            ))
          }
          {filtered.length === 0 && (
            <div className="faq-empty">
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                <Search size={48} color="var(--text-tertiary)" />
              </div>
              <h3>Pertanyaan tidak ditemukan</h3>
              <p>Coba kata kunci lain atau hubungi kami langsung di <strong>sipena@perpusnas.go.id</strong></p>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="faq-cta-section">
        <div className="container">
          <div className="faq-cta-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div className="faq-cta-icon" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageSquare size={40} color="#93c5fd" />
            </div>
            <h2>Masih punya pertanyaan?</h2>
            <p>Tim kami siap membantu Anda. Hubungi kami melalui email atau telepon pada jam kerja.</p>
            <div className="faq-cta-actions">
              <a href="mailto:sipena@perpusnas.go.id" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                <Mail size={16} /> Kirim Email
              </a>
              <a href="tel:0213922749" className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                <Phone size={16} /> Hubungi Kami
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default FAQPage;
