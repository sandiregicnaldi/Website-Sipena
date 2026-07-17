import React from 'react';
import { Link } from 'react-router-dom';
import HeroCarousel from '../components/HeroCarousel';
import BookRow from '../components/BookRow';
import FeaturedAuthors from '../components/FeaturedAuthors';
import EventSection from '../components/EventSection';
import './Home.css';

const Home = () => {

  const newBooks = [
    { id: 1, title: 'Syair Ulama Saleh', author: 'Penulis Anonim', color: '#1e293b' },
    { id: 2, title: 'Alih Bahasa Rapport von het Vernigen', author: 'Johannes de Hartogh', color: '#b91c1c' },
    { id: 3, title: 'USANA, SAGARA, BANAWA', author: 'Pande Putu Abdi Jaya', color: '#1d4ed8' },
    { id: 4, title: 'Hikayat Tuanku nan Muda Pagaruyung', author: 'M. Yusuf', color: '#047857' },
    { id: 5, title: 'Mari Mengenal Lebih Dekat HATIBALI', author: 'Perpusnas Press', color: '#6d28d9' },
    { id: 14, title: 'Babad Diponegoro', author: 'Kyai Mojo', color: '#0f766e' },
    { id: 15, title: 'Sejarah Nasional Indonesia', author: 'Sartono Kartodirdjo', color: '#c2410c' },
    { id: 16, title: 'Kesusastraan Melayu Klasik', author: 'Liaw Yock Fang', color: '#6d28d9' },
    { id: 17, title: 'Kitab Primbon Jawa', author: 'Kanjeng Pangeran', color: '#1d4ed8' },
    { id: 18, title: 'Serat Centhini', author: 'Paku Buwana V', color: '#b91c1c' },
  ];

  const authors = [
    {
      id: 1,
      name: 'Rahmat Alfian Hadidharna',
      bio: 'Akrab dipanggil Rahmat, lahir di Kulon Progo. Memulai pendidikan di TK Pertiwi kemudian melanjutkan studi.',
      hasPhoto: false,
      color: '#3b82f6'
    },
    {
      id: 2,
      name: 'Dinda Marlina Carolina',
      bio: 'Lahir di Desa Parnapa. Menyukai dunia sastra dan penulisan sejak kecil.',
      hasPhoto: true,
      photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=150&q=80',
      color: '#ec4899'
    }
  ];

  return (
    <main className="home-page">
      {/* ── HERO ────────────────────────────────── */}
      <HeroCarousel />

      {/* ── KEGIATAN TERBARU ─────────────────────── */}
      <div className="home-section">
        <EventSection />
      </div>

      {/* ── BUKU BARU TERBIT ─────────────────────── */}
      <div className="home-section">
        <BookRow title="Baru Terbit" books={newBooks} viewAllLink="/buku" />
      </div>

      {/* ── PENULIS PILIHAN ──────────────────────── */}
      <div className="home-section">
        <FeaturedAuthors authors={authors} />
      </div>

      {/* ── CTA SELENGKAPNYA ─────────────────────── */}
      <div className="home-cta">
        <Link to="/buku" className="cta-btn">
          Lihat Semua Koleksi Buku
        </Link>
      </div>
    </main>
  );
};

export default Home;
