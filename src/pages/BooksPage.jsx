import React, { useState } from 'react';
import { Search, Filter, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import BookRow from '../components/BookRow';
import './BooksPage.css';

const BooksPage = () => {
  // Dummy Data for Books Page
  const allBooks = Array.from({ length: 12 }, (_, i) => ({
    id: i + 1,
    title: `Buku Literasi Nusantara Vol ${i + 1}`,
    author: `Penulis ${i + 1}`,
    downloads: 100 + (i * 15),
    color: `hsl(${i * 30}, 70%, 40%)`
  }));

  return (
    <main className="books-page">
      <div className="page-header">
        <div className="container">
          <h1 className="page-title">Katalog Buku</h1>
          <p className="page-subtitle">Jelajahi berbagai koleksi buku, naskah kuno, dan literatur dari Perpusnas Press</p>
        </div>
      </div>

      <div className="container books-content">
        {/* Filter and Sort Bar */}
        <div className="toolbar">
          {/* Remove search box as requested */}
          <div className="toolbar-actions">
            <div className="dropdown">
              <button className="dropdown-btn">
                <Filter size={16} /> Kategori <ChevronDown size={14} />
              </button>
            </div>
            <div className="dropdown">
              <button className="dropdown-btn">
                Urut berdasarkan <ChevronDown size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Book Slider */}
        <BookRow title="" books={allBooks} viewAllLink="" />

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

export default BooksPage;
