import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Mail, Globe, MapPin, ExternalLink, BookOpen } from 'lucide-react';
import BookRow from '../components/BookRow';
import './AuthorProfile.css';

const AuthorProfile = () => {
  const { id } = useParams();

  // Mock Author Data
  const authorData = {
    id: id,
    name: 'Dinda Marlina Carolina',
    role: 'Penulis & Peneliti Sastra',
    location: 'Yogyakarta, Indonesia',
    email: 'dinda.marlina@example.com',
    website: 'www.dindamarlina.com',
    bio: `Dinda Marlina Carolina lahir di Desa Parnapa, sebuah desa yang kental dengan budaya dan tradisi lisan. Ia menyukai dunia sastra dan penulisan sejak kecil, banyak menghabiskan waktu luangnya membaca naskah kuno dan cerita rakyat.

    Lulusan Sastra Universitas Indonesia ini telah mendedikasikan lebih dari 10 tahun hidupnya untuk meneliti dan menulis ulang kisah-kisah nusantara agar lebih mudah dipahami oleh generasi muda masa kini. Karya-karyanya seringkali berfokus pada peran perempuan dalam sejarah lokal dan dinamika sosial masyarakat adat.`,
    photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80',
    coverUrl: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=1200&q=80',
    color: '#ec4899',
    
    // Karya di Perpusnas Press
    perpusnasWorks: [
      { id: 1, title: 'Kesusastraan Melayu Klasik', author: 'Dinda Marlina Carolina', color: '#6d28d9' },
      { id: 2, title: 'Menelusuri Jejak Sastra', author: 'Dinda Marlina Carolina', color: '#be185d' },
      { id: 3, title: 'Hikayat Perempuan Parnapa', author: 'Dinda Marlina Carolina', color: '#047857' }
    ],

    // Karya di luar Perpusnas Press
    externalWorks: [
      {
        id: 101,
        title: 'Bunga Rampai Sastra Modern',
        publisher: 'Gramedia Pustaka Utama',
        year: '2022',
        link: 'https://www.gramedia.com',
        storeName: 'Gramedia.com'
      },
      {
        id: 102,
        title: 'Analisis Naskah Kuno Jawa',
        publisher: 'Penerbit Ombak',
        year: '2021',
        link: 'https://www.tokopedia.com',
        storeName: 'Tokopedia (Toko Buku Resmi)'
      },
      {
        id: 103,
        title: 'Antologi Puisi: Suara dari Timur',
        publisher: 'Buku Mojok',
        year: '2020',
        link: 'https://www.shopee.co.id',
        storeName: 'Shopee (Buku Mojok Store)'
      }
    ]
  };

  return (
    <main className="author-profile-page">
      {/* Cover Banner */}
      <div 
        className="author-cover-banner" 
        style={{ backgroundImage: `url(${authorData.coverUrl})` }}
      >
        <div className="banner-overlay"></div>
      </div>

      <div className="container">
        {/* Profile Header (overlaps banner) */}
        <div className="author-header-card">
          <div className="author-photo-large">
            <img src={authorData.photoUrl} alt={authorData.name} />
          </div>
          
          <div className="author-main-info">
            <h1 className="author-name-large">{authorData.name}</h1>
            <h2 className="author-role-large">{authorData.role}</h2>
            
            <div className="author-contact-grid">
              <div className="contact-item">
                <MapPin size={16} /> <span>{authorData.location}</span>
              </div>
              <div className="contact-item">
                <Mail size={16} /> <span>{authorData.email}</span>
              </div>
              <div className="contact-item">
                <Globe size={16} /> <a href={`https://${authorData.website}`} target="_blank" rel="noopener noreferrer">{authorData.website}</a>
              </div>
            </div>
          </div>
        </div>

        <div className="author-content-grid">
          {/* Left Column - Bio */}
          <div className="author-bio-section">
            <h3 className="section-title-sm">Biografi Singkat</h3>
            <div className="bio-text">
              {authorData.bio.split('\n\n').map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </div>

          {/* Right Column - External Works */}
          <div className="author-external-works">
            <h3 className="section-title-sm">Karya di Penerbit Lain</h3>
            <div className="external-works-list">
              {authorData.externalWorks.map(work => (
                <div key={work.id} className="external-work-card">
                  <div className="work-icon">
                    <BookOpen size={24} color={authorData.color} />
                  </div>
                  <div className="work-details">
                    <h4>{work.title}</h4>
                    <p>{work.publisher} ({work.year})</p>
                    <a href={work.link} target="_blank" rel="noopener noreferrer" className="store-link">
                      Beli di {work.storeName} <ExternalLink size={14} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Perpusnas Works */}
        <div className="author-perpusnas-works">
          <BookRow 
            title={`Karya ${authorData.name} di Perpusnas Press`} 
            books={authorData.perpusnasWorks} 
            viewAllLink="" 
          />
        </div>
      </div>
    </main>
  );
};

export default AuthorProfile;
