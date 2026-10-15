import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Mail, Globe, MapPin, ExternalLink, BookOpen, Edit3, ArrowLeft, Loader2 } from 'lucide-react';
import BookRow from '../components/BookRow';
import { useAuth } from '../context/AuthContext';
import { SipenaAPI } from '../lib/api';
import './AuthorProfile.css';

// Default mock author data (Reference: Dinda Marlina Carolina)
const defaultMockAuthor = {
  id: 'mock-1',
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
  
  perpusnasWorks: [
    { id: 1, title: 'Kesusastraan Melayu Klasik', author: 'Dinda Marlina Carolina', color: '#6d28d9' },
    { id: 2, title: 'Menelusuri Jejak Sastra', author: 'Dinda Marlina Carolina', color: '#be185d' },
    { id: 3, title: 'Hikayat Perempuan Parnapa', author: 'Dinda Marlina Carolina', color: '#047857' }
  ],

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

const AuthorProfile = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [authorData, setAuthorData] = useState(defaultMockAuthor);

  useEffect(() => {
    let isMounted = true;

    const fetchAuthor = async () => {
      setLoading(true);

      // If id matches mock demo ID
      if (!id || id === 'mock-1') {
        if (isMounted) {
          setAuthorData(defaultMockAuthor);
          setLoading(false);
        }
        return;
      }

      try {
        const res = await SipenaAPI.getAuthorById(id);
        if (isMounted && res) {
          // Parse external works if string
          let parsedKarya = [];
          if (Array.isArray(res.karyaEksternal)) {
            parsedKarya = res.karyaEksternal;
          } else if (typeof res.karyaEksternal === 'string' && res.karyaEksternal.trim()) {
            try {
              parsedKarya = JSON.parse(res.karyaEksternal);
            } catch (e) {
              console.warn('Failed to parse karyaEksternal', e);
            }
          }

          // Format perpusnas works
          const perpusnasWorks = Array.isArray(res.perpusnasWorks)
            ? res.perpusnasWorks.map((b, idx) => ({
                id: b.id,
                title: b.title,
                author: b.authorName || b.author || res.name,
                color: b.color || (idx % 2 === 0 ? '#1e3a8a' : '#047857')
              }))
            : [];

          setAuthorData({
            id: res.id,
            name: res.name || 'Nama Penulis',
            role: res.profesi || 'Penulis & Kontributor Perpusnas Press',
            location: res.domisili || 'Indonesia',
            email: res.email || '',
            website: res.website || '',
            bio: res.bio || 'Belum ada biografi singkat yang ditambahkan.',
            photoUrl: res.image || '',
            coverUrl: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=1200&q=80',
            color: '#1e3a8a',
            externalWorks: parsedKarya.map((w, idx) => ({
              id: w.id || idx + 1,
              title: w.title || w.judul || 'Tanpa Judul',
              publisher: w.publisher || w.penerbit || 'Penerbit Independen',
              year: w.year || w.tahun || '',
              link: w.link || w.url || '#',
              storeName: w.storeName || w.namaToko || 'Toko Resmi'
            })),
            perpusnasWorks
          });
        }
      } catch (err) {
        console.warn('Author not found in database, checking logged-in user or falling back to mock:', err);
        // If current user previewing their own profile
        if (user && user.id === id) {
          const userKarya = Array.isArray(user.karyaEksternal) ? user.karyaEksternal : [];
          setAuthorData({
            id: user.id,
            name: user.name || 'Nama Penulis',
            role: user.profesi || 'Penulis & Kontributor',
            location: user.domisili || 'Indonesia',
            email: user.email || '',
            website: user.website || '',
            bio: user.bio || 'Belum ada biografi yang ditambahkan.',
            photoUrl: user.image || '',
            coverUrl: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=1200&q=80',
            color: '#1e3a8a',
            externalWorks: userKarya.map((w, idx) => ({
              id: w.id || idx + 1,
              title: w.title || w.judul || 'Tanpa Judul',
              publisher: w.publisher || w.penerbit || 'Penerbit Independen',
              year: w.year || w.tahun || '',
              link: w.link || w.url || '#',
              storeName: w.storeName || w.namaToko || 'Toko Resmi'
            })),
            perpusnasWorks: []
          });
        } else {
          // Graceful fallback to default mock so demo pages never break
          setAuthorData(defaultMockAuthor);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchAuthor();

    return () => {
      isMounted = false;
    };
  }, [id, user]);

  const isCurrentUser = user && user.id === authorData.id;

  if (loading) {
    return (
      <main className="author-profile-page">
        <div className="container" style={{ padding: '6rem 0', textAlign: 'center' }}>
          <Loader2 size={40} className="animate-spin text-primary" style={{ margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Memuat profil penulis...</p>
        </div>
      </main>
    );
  }

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
            {authorData.photoUrl ? (
              <img src={authorData.photoUrl} alt={authorData.name} />
            ) : (
              <div className="author-photo-placeholder">
                <span>{authorData.name ? authorData.name.charAt(0).toUpperCase() : 'P'}</span>
              </div>
            )}
          </div>
          
          <div className="author-main-info">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h1 className="author-name-large">{authorData.name}</h1>
                <h2 className="author-role-large">{authorData.role}</h2>
              </div>
              {isCurrentUser && (
                <Link to="/dasbor-penulis?tab=karya" className="btn btn-outline btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Edit3 size={15} /> Edit Profil Saya
                </Link>
              )}
            </div>
            
            <div className="author-contact-grid">
              {authorData.location && (
                <div className="contact-item">
                  <MapPin size={16} /> <span>{authorData.location}</span>
                </div>
              )}
              {authorData.email && (
                <div className="contact-item">
                  <Mail size={16} /> <span>{authorData.email}</span>
                </div>
              )}
              {authorData.website && (
                <div className="contact-item">
                  <Globe size={16} /> 
                  <a 
                    href={authorData.website.startsWith('http') ? authorData.website : `https://${authorData.website}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    {authorData.website}
                  </a>
                </div>
              )}
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
            {authorData.externalWorks && authorData.externalWorks.length > 0 ? (
              <div className="external-works-list">
                {authorData.externalWorks.map(work => (
                  <div key={work.id} className="external-work-card">
                    <div className="work-icon">
                      <BookOpen size={24} color={authorData.color} />
                    </div>
                    <div className="work-details">
                      <h4>{work.title}</h4>
                      <p>{work.publisher} {work.year ? `(${work.year})` : ''}</p>
                      {work.link && work.link !== '#' ? (
                        <a href={work.link} target="_blank" rel="noopener noreferrer" className="store-link">
                          Beli di {work.storeName || 'Toko Resmi'} <ExternalLink size={14} />
                        </a>
                      ) : (
                        <span className="store-badge-plain">{work.storeName || 'Penerbit Eksternal'}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-external-box">
                <BookOpen size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                <p>Belum ada karya di luar Perpusnas Press yang dicantumkan.</p>
              </div>
            )}
          </div>
        </div>

        {/* Perpusnas Works */}
        {authorData.perpusnasWorks && authorData.perpusnasWorks.length > 0 && (
          <div className="author-perpusnas-works">
            <BookRow 
              title={`Karya ${authorData.name} di Perpusnas Press`} 
              books={authorData.perpusnasWorks} 
              viewAllLink="" 
            />
          </div>
        )}
      </div>
    </main>
  );
};

export default AuthorProfile;
