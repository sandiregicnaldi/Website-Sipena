import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import HeroCarousel from '../components/HeroCarousel';
import BookRow from '../components/BookRow';
import FeaturedAuthors from '../components/FeaturedAuthors';
import EventSection from '../components/EventSection';
import { SipenaAPI } from '../lib/api';
import './Home.css';

const DEFAULT_NEW_BOOKS = [
  { id: 1, title: 'Syair Ulama Saleh', author: 'Penulis Anonim', color: '#1e293b', readCount: 0, downloadCount: 0 },
  { id: 2, title: 'Alih Bahasa Rapport von het Vernigen', author: 'Johannes de Hartogh', color: '#b91c1c', readCount: 0, downloadCount: 0 },
  { id: 3, title: 'USANA, SAGARA, BANAWA', author: 'Pande Putu Abdi Jaya', color: '#1d4ed8', readCount: 0, downloadCount: 0 },
  { id: 4, title: 'Hikayat Tuanku nan Muda Pagaruyung', author: 'M. Yusuf', color: '#047857', readCount: 0, downloadCount: 0 },
  { id: 5, title: 'Mari Mengenal Lebih Dekat HATIBALI', author: 'Perpusnas Press', color: '#6d28d9', readCount: 0, downloadCount: 0 },
  { id: 14, title: 'Babad Diponegoro', author: 'Kyai Mojo', color: '#0f766e', readCount: 0, downloadCount: 0 },
  { id: 15, title: 'Sejarah Nasional Indonesia', author: 'Sartono Kartodirdjo', color: '#c2410c', readCount: 0, downloadCount: 0 },
  { id: 16, title: 'Kesusastraan Melayu Klasik', author: 'Liaw Yock Fang', color: '#6d28d9', readCount: 0, downloadCount: 0 },
  { id: 17, title: 'Kitab Primbon Jawa', author: 'Kanjeng Pangeran', color: '#1d4ed8', readCount: 0, downloadCount: 0 },
  { id: 18, title: 'Serat Centhini', author: 'Paku Buwana V', color: '#b91c1c', readCount: 0, downloadCount: 0 },
];

const CATEGORY_COLORS = {
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
  'Sastra': '#1e3a8a',
  'Sejarah': '#b91c1c',
  'Budaya': '#047857',
  'Umum': '#475569'
};

const Home = () => {
  const [newBooks, setNewBooks] = useState(DEFAULT_NEW_BOOKS);

  useEffect(() => {
    SipenaAPI.getBooks({ limit: 10 })
      .then(res => {
        const items = res?.data || (Array.isArray(res) ? res : []);
        if (items && items.length > 0) {
          setNewBooks(items.map(b => ({
            id: b.id,
            title: b.title,
            author: b.authorName || 'Penulis Anonim',
            coverUrl: b.coverUrl,
            color: CATEGORY_COLORS[b.category] || '#1e293b',
            readCount: b.readCount || 0,
            downloadCount: b.downloadCount || 0,
            ratingAvg: Number(b.ratingAvg || b.rating || 0),
          })));
        }
      })
      .catch(err => {
        console.warn('Failed to fetch dynamic books for Home, using fallback:', err);
      });
  }, []);

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
