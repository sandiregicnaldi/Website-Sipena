import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import '../components/BookRow.css';
import './BooksPage.css';

const BooksPage = () => {
  const allBooks = [
    { id: 1,  title: 'Syair Ulama Saleh',                        author: 'Penulis Anonim',          color: '#1e293b' },
    { id: 2,  title: 'Alih Bahasa Rapport von het Vernigen',      author: 'Johannes de Hartogh',     color: '#b91c1c' },
    { id: 3,  title: 'USANA, SAGARA, BANAWA',                    author: 'Pande Putu Abdi Jaya',    color: '#1d4ed8' },
    { id: 4,  title: 'Hikayat Tuanku nan Muda Pagaruyung',       author: 'M. Yusuf',                color: '#047857' },
    { id: 5,  title: 'Mari Mengenal Lebih Dekat HATIBALI',       author: 'Perpusnas Press',         color: '#6d28d9' },
    { id: 6,  title: 'Babad Diponegoro',                         author: 'Kyai Mojo',               color: '#0f766e' },
    { id: 7,  title: 'Sejarah Nasional Indonesia',                author: 'Sartono Kartodirdjo',     color: '#c2410c' },
    { id: 8,  title: 'Kesusastraan Melayu Klasik',               author: 'Liaw Yock Fang',          color: '#7c3aed' },
    { id: 9,  title: 'Kitab Primbon Jawa',                       author: 'Kanjeng Pangeran',        color: '#0f4c75' },
    { id: 10, title: 'Serat Centhini',                            author: 'Paku Buwana V',           color: '#991b1b' },
    { id: 11, title: 'Hikayat Merong Mahawangsa',                author: 'Anonim',                  color: '#065f46' },
    { id: 12, title: 'Naskah Kuna Palembang',                    author: 'Tim Perpusnas',           color: '#1e3a8a' },
    { id: 13, title: 'Tata Bahasa Jawa Kuno',                    author: 'P.J. Zoetmulder',         color: '#92400e' },
    { id: 14, title: 'Kumpulan Pantun Melayu',                   author: 'R.O. Winstedt',           color: '#3b0764' },
    { id: 15, title: 'Pararaton (Ken Arok)',                      author: 'Kern & Krom',             color: '#134e4a' },
    { id: 16, title: 'Kakawin Ramayana',                          author: 'Mpu Yogiswara',           color: '#7f1d1d' },
    { id: 17, title: 'Lontar Usana Bali',                         author: 'Tim Balai Bahasa',        color: '#1a2e05' },
    { id: 18, title: 'Nagarakretagama',                           author: 'Mpu Prapanca',            color: '#0c4a6e' },
    { id: 19, title: 'Suluk Wujil',                               author: 'Sunan Bonang',            color: '#581c87' },
    { id: 20, title: 'Hikayat Hang Tuah',                        author: 'Anonim',                  color: '#14532d' },
    { id: 21, title: 'Sair Perang Menteng',                       author: 'Ali Haji',                color: '#1e3a8a' },
    { id: 22, title: 'Babat Tanah Jawi',                          author: 'Paku Buwana III',         color: '#7c2d12' },
    { id: 23, title: 'Arjunawiwaha',                              author: 'Mpu Kanwa',               color: '#064e3b' },
    { id: 24, title: 'Desawarnana',                               author: 'Mpu Prapanca',            color: '#312e81' },
    { id: 25, title: 'Sejarah Melayu',                            author: 'Tun Sri Lanang',          color: '#422006' },
    { id: 26, title: 'Panji Angreni',                             author: 'Anonim',                  color: '#0f172a' },
    { id: 27, title: 'Kutaramanawa',                              author: 'Tim Filologi',            color: '#6b21a8' },
    { id: 28, title: 'Tambo Minangkabau',                         author: 'Tim Peneliti',            color: '#166534' },
    { id: 29, title: 'Undang-Undang Melaka',                      author: 'Anonim',                  color: '#1e3a5f' },
    { id: 30, title: 'Cerita Panji Jawa',                         author: 'Poerbatjaraka',           color: '#831843' },
    { id: 31, title: 'Naskah Wangsakerta',                        author: 'Pangeran Wangsakerta',    color: '#365314' },
    { id: 32, title: 'Hikayat Sri Rama',                          author: 'Anonim',                  color: '#1c1917' },
  ];

  return (
    <main className="books-page">
      <div className="page-header">
        <div className="container">
          <h1 className="page-title">Katalog Buku</h1>
          <p className="page-subtitle">Jelajahi berbagai koleksi buku, naskah kuno, dan literatur dari Perpusnas Press</p>
        </div>
      </div>

      <div className="container books-content">
        {/* Book Grid */}
        <div className="books-grid">
          {allBooks.map((book) => (
            <Link to={`/buku/${book.id}`} key={book.id} className="row-card">
              <div className="row-cover" style={{ backgroundColor: book.color || '#1e3a8a' }}>
                <span className="row-cover-title">{book.title}</span>
                <div className="row-cover-overlay">
                  <span className="overlay-play">▶ Baca</span>
                </div>
              </div>
              <div className="row-info">
                <p className="row-book-title">{book.title}</p>
                <p className="row-book-author">{book.author}</p>
              </div>
            </Link>
          ))}
        </div>

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
