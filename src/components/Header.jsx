import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, LogOut, User as UserIcon, LayoutDashboard, Search, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Header.css';

const Header = () => {
  const { user, logout, isLoggedIn, isAuthor, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

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
              <li><Link to="/"        className="nav-item">Home</Link></li>
              <li><Link to="/buku"    className="nav-item">Buku</Link></li>
              <li><Link to="/penulis" className="nav-item">Penulis</Link></li>
              <li><Link to="/event"   className="nav-item">Kegiatan</Link></li>
              <li><Link to="/tentang" className="nav-item">Tentang</Link></li>
              <li><Link to="/faq"     className="nav-item">FAQ</Link></li>
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
        </div>
      </div>
    </header>
  );
};

export default Header;
