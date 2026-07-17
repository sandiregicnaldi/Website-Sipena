import React from 'react';
import { useParams } from 'react-router-dom';
import { Search, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import BookSection from '../components/BookSection';
import './BooksPage.css'; // Reuse BooksPage styling

const TerbitanLainPage = () => {
  const { category } = useParams();

  // Format category for title display
  const getFormattedTitle = () => {
    switch(category) {
      case 'pedoman': return 'Pedoman / Standard';
      case 'prosiding': return 'Prosiding';
      case 'laporan': return 'Laporan';
      case 'jurnal': return 'Majalah / Jurnal';
      default: return 'Produk Terbitan';
    }
  };

  // Dummy Data for the products
  const allProducts = Array.from({ length: 12 }, (_, i) => ({
    id: i + 1,
    title: `${getFormattedTitle()} Vol ${i + 1}`,
    author: `Penulis ${i + 1}`,
    downloads: 100 + (i * 15),
    color: `hsl(${i * 45}, 60%, 45%)`
  }));

  return (
    <main className="books-page">
      <div className="page-header" style={{background: 'linear-gradient(to right, #003399, #228B22)'}}>
        <div className="container">
          <h1 className="page-title">Daftar Produk - {getFormattedTitle()}</h1>
          <p className="page-subtitle">Jelajahi berbagai dokumen, laporan, dan publikasi khusus dari Perpusnas Press</p>
        </div>
      </div>

      <div className="container books-content">
        {/* Filter and Sort Bar */}
        <div className="toolbar" style={{justifyContent: 'flex-end'}}>
          <div className="search-box" style={{marginRight: 'auto', maxWidth: '300px'}}>
            <Search size={18} color="var(--text-tertiary)" />
            <input type="text" placeholder="Judul..." />
          </div>
          
          <div className="toolbar-actions">
            <div className="dropdown">
              <button className="dropdown-btn">
                Urut berdasarkan <ChevronDown size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Book Grid */}
        <BookSection title="" books={allProducts} showDownloads={true} />

        {/* Pagination */}
        <div className="pagination">
          <button className="page-btn" disabled><ChevronLeft size={16} /></button>
          <button className="page-btn active">1</button>
          <button className="page-btn">2</button>
          <button className="page-btn">3</button>
          <span className="page-dots">...</span>
          <button className="page-btn">10</button>
          <button className="page-btn"><ChevronRight size={16} /></button>
        </div>
      </div>
    </main>
  );
};

export default TerbitanLainPage;
