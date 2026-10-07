import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, LogOut, User as UserIcon, LayoutDashboard, Search, ShieldCheck, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Header.css';

const Header = () => {
  const { user, logout, isLoggedIn, isAuthor, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate('/');
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="header">
      <div className="container header-inner">
        {/* LEFT: Logo & Navigation */}
        <div className="header-left">
          <Link to="/" className="logo-link" style={{ textDecoration: 'none' }}>
            <div className="brand-text">
              <span className="brand-title">SiPena</span>
              <span className="brand-subtitle">(Sistem Informasi Penerbitan)</span>
            </div>
          </Link>
          <nav className="main-nav">
            <ul className="nav-list">
              <li><Link to="/"                 className="nav-item">Home</Link></li>
              <li><Link to="/buku"             className="nav-item">Buku</Link></li>
              <li><Link to="/penulis"          className="nav-item">Penulis</Link></li>
              <li><Link to="/event"            className="nav-item">Kegiatan</Link></li>
              <li><Link to="/panduan-penerbitan" className="nav-item">Panduan</Link></li>
              <li><Link to="/tentang"          className="nav-item">Tentang</Link></li>
              <li><Link to="/faq"              className="nav-item">FAQ</Link></li>
            </ul>
          </nav>
        </div>

        {/* RIGHT */}
        <div className="header-right">
          <div className="search-bar">
            <input type="text" placeholder="Cari buku, penulis..." className="search-input" />
            <Search size={18} className="search-icon" />
          </div>

          <Link to="/login" className="btn-terbitkan">TERBITKAN BUKU</Link>

          <div className="auth-section">
            {isLoggedIn ? (
              <div className="user-dropdown">
                <span className="user-greeting">
                  <UserIcon size={18} /> {user.username}
                </span>
                <div className="user-dropdown-menu">
                  {isAdmin && (
                    <Link to="/admin" className="dropdown-item">
                      <ShieldCheck size={14} /> Panel Admin
                    </Link>
                  )}
                  {!isAdmin && (
                    <Link to="/profil-saya" className="dropdown-item">
                      <LayoutDashboard size={14} /> Profil Saya
                    </Link>
                  )}
                  <button onClick={handleLogout} className="dropdown-item text-danger">
                    <LogOut size={14} /> Keluar
                  </button>
                </div>
              </div>
            ) : (
              <Link to="/login" className="login-link">
                <UserIcon size={18} /> Masuk
              </Link>
            )}
          </div>

          {/* Hamburger Button — mobile only */}
          <button
            className="hamburger-btn"
            onClick={() => setMenuOpen(prev => !prev)}
            aria-label={menuOpen ? 'Tutup menu' : 'Buka menu'}
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {menuOpen && (
        <div className="mobile-menu">
          <nav className="mobile-nav">
            <Link to="/"                  className="mobile-nav-item" onClick={closeMenu}>Home</Link>
            <Link to="/buku"              className="mobile-nav-item" onClick={closeMenu}>Buku</Link>
            <Link to="/penulis"           className="mobile-nav-item" onClick={closeMenu}>Penulis</Link>
            <Link to="/event"             className="mobile-nav-item" onClick={closeMenu}>Kegiatan</Link>
            <Link to="/panduan-penerbitan" className="mobile-nav-item" onClick={closeMenu}>Panduan</Link>
            <Link to="/tentang"           className="mobile-nav-item" onClick={closeMenu}>Tentang</Link>
            <Link to="/faq"               className="mobile-nav-item" onClick={closeMenu}>FAQ</Link>

            <div className="mobile-menu-divider" />

            <Link to="/login" className="mobile-nav-item mobile-terbitkan" onClick={closeMenu}>
              TERBITKAN BUKU
            </Link>

            <div className="mobile-menu-divider" />

            {isLoggedIn ? (
              <>
                <span className="mobile-nav-user">
                  <UserIcon size={16} /> {user.username}
                </span>
                {isAdmin && (
                  <Link to="/admin" className="mobile-nav-item" onClick={closeMenu}>
                    <ShieldCheck size={14} /> Panel Admin
                  </Link>
                )}
                {!isAdmin && (
                  <Link to="/profil-saya" className="mobile-nav-item" onClick={closeMenu}>
                    <LayoutDashboard size={14} /> Profil Saya
                  </Link>
                )}
                <button className="mobile-nav-item mobile-logout-btn" onClick={handleLogout}>
                  <LogOut size={14} /> Keluar
                </button>
              </>
            ) : (
              <Link to="/login" className="mobile-nav-item" onClick={closeMenu}>
                <UserIcon size={16} /> Masuk
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
