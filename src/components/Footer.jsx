import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container">
        
        {/* Newsletter Section */}
        <div className="newsletter-section">
          <div className="newsletter-text">
            <h3>Dapatkan Update Buku Terbaru!</h3>
            <p>Berlangganan newsletter kami untuk mendapatkan informasi buku gratis dan terbitan terbaru langsung ke email Anda.</p>
          </div>
          <div className="newsletter-form">
            <input type="email" placeholder="Alamat Email Anda" className="newsletter-input" />
            <button className="btn btn-primary">Berlangganan</button>
          </div>
        </div>

        <div className="footer-grid">
          <div className="footer-col">
            <h4 className="footer-title">Profil</h4>
            <ul className="footer-links">
              <li><Link to="/tentang">Tentang Perpusnas Press</Link></li>
              <li><Link to="/tentang#sejarah">Visi &amp; Misi</Link></li>
              <li><Link to="/tentang#tim">Struktur Organisasi</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4 className="footer-title">Layanan Penerbitan</h4>
            <ul className="footer-links">
              <li><a href="#prosedur">Prosedur Penerbitan</a></li>
              <li><a href="#proses">Proses Penerbitan</a></li>
              <li><a href="#pedoman">Pedoman Penulisan</a></li>
              <li><Link to="/faq">FAQ / Bantuan</Link></li>
            </ul>
          </div>


          <div className="footer-col">
            <h4 className="footer-title">Kontak Kami</h4>
            <p className="contact-info">Perpusnas PRESS</p>
            <p className="contact-info">Perpustakaan Nasional Republik Indonesia</p>
            <p className="contact-info">Jl. Salemba Raya No. 28A Jakarta Pusat</p>
            <p className="contact-info">Telp: 021-3922749, 3154864</p>
            <p className="contact-info">Fax: 021-3101472</p>
          </div>
        </div>

        <div className="footer-brand-section">
          <div className="brand-logo">
            <img src="/logo-white.png" alt="Logo Perpusnas Press" style={{ width: '220px', height: 'auto', objectFit: 'contain' }} />
          </div>
          
          <div className="brand-desc">
            <p>
              Penerbit resmi Perpustakaan Nasional RI yang berdedikasi untuk menerbitkan buku-buku berkualitas dan mencerdaskan kehidupan bangsa.
            </p>
          </div>

          <div className="brand-socials">
            <a href="#fb" className="social-item">
              <span className="social-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
              </span>
              <span className="social-text">PERPUSNAS PRESS</span>
            </a>
            <a href="#ig" className="social-item">
              <span className="social-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
              </span>
              <span className="social-text">PERPUSNAS PRESS</span>
            </a>
            <a href="#tw" className="social-item">
              <span className="social-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path></svg>
              </span>
              <span className="social-text">PERPUSNAS PRESS</span>
            </a>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Perpustakaan Nasional RI. Hak Cipta Dilindungi.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
