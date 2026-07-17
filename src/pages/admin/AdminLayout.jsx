import React, { useState } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AdminDashboard from './AdminDashboard';
import AdminKatalog from './AdminKatalog';
import AdminPengguna from './AdminPengguna';
import AdminKegiatan from './AdminKegiatan';
import AdminKonten from './AdminKonten';
import AdminLaporan from './AdminLaporan';
import AdminPengaturan from './AdminPengaturan';
import './AdminLayout.css';

// ── Icons as inline SVG ─────────────────────────────────────────────────────
const Icon = ({ d, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const ICONS = {
  home:      'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10',
  book:      'M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15z',
  users:     'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
  calendar:  'M8 2v4 M16 2v4 M3 10h18 M21 8H3a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1z',
  layout:    'M3 3h7v9H3z M14 3h7v5h-7z M14 12h7v9h-7z M3 16h7v5H3z',
  chart:     'M18 20V10 M12 20V4 M6 20v-6',
  settings:  'M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  logout:    'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9',
  chevron:   'M6 9l6 6 6-6',
  menu:      'M3 12h18 M3 6h18 M3 18h18',
  user:      'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
};

const SVGIcon = ({ name, size = 18 }) => {
  const paths = ICONS[name]?.split(' M ') || [];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {paths.map((p, i) => (
        <path key={i} d={i === 0 ? p : 'M ' + p} />
      ))}
    </svg>
  );
};

// ── Sidebar nav config ───────────────────────────────────────────────────────
const NAV_ITEMS = [
  { label: 'Beranda',     path: '/admin',             icon: 'home' },
  { label: 'Katalog Buku', path: '/admin/katalog',    icon: 'book',
    sub: [
      { label: 'Daftar Buku',      path: '/admin/katalog' },
      { label: 'Tambah Buku',      path: '/admin/katalog/tambah' },
      { label: 'Kategori',         path: '/admin/katalog/kategori' },
    ]
  },
  { label: 'Pengguna',    path: '/admin/pengguna',    icon: 'users',
    sub: [
      { label: 'Penulis',          path: '/admin/pengguna/penulis' },
      { label: 'Calon Penulis',    path: '/admin/pengguna/calon-penulis' },
      { label: 'Pengunjung',       path: '/admin/pengguna/pengunjung' },
      { label: 'Pegawai',          path: '/admin/pengguna/pegawai' },
    ]
  },
  { label: 'Kegiatan',    path: '/admin/kegiatan',    icon: 'calendar',
    sub: [
      { label: 'Daftar Kegiatan',  path: '/admin/kegiatan' },
      { label: 'Tambah Kegiatan',  path: '/admin/kegiatan/tambah' },
    ]
  },
  { label: 'Konten Web',  path: '/admin/konten',      icon: 'layout',
    sub: [
      { label: 'Banner / Hero',    path: '/admin/konten/banner' },
      { label: 'Tentang Kami',     path: '/admin/konten/tentang' },
      { label: 'FAQ',              path: '/admin/konten/faq' },
    ]
  },
  { label: 'Laporan',     path: '/admin/laporan',     icon: 'chart' },
  { label: 'Pengaturan',  path: '/admin/pengaturan',  icon: 'settings',
    sub: [
      { label: 'Profil Admin',     path: '/admin/pengaturan/profil' },
      { label: 'Pengguna Sistem',  path: '/admin/pengaturan/sistem' },
    ]
  },
];

// ── NavItem ──────────────────────────────────────────────────────────────────
const NavItem = ({ item, collapsed }) => {
  const location = useLocation();
  const [open, setOpen] = useState(() =>
    item.sub?.some(s => location.pathname.startsWith(s.path))
  );
  const isActive = item.sub
    ? item.sub.some(s => location.pathname.startsWith(s.path))
    : location.pathname === item.path;

  if (item.sub) {
    return (
      <li className={`nav-group ${isActive ? 'active' : ''}`}>
        <button className="nav-link nav-link--parent" onClick={() => setOpen(o => !o)}>
          <SVGIcon name={item.icon} size={18} />
          {!collapsed && <span>{item.label}</span>}
          {!collapsed && (
            <span className={`nav-chevron ${open ? 'open' : ''}`}>
              <SVGIcon name="chevron" size={14} />
            </span>
          )}
        </button>
        {open && !collapsed && (
          <ul className="nav-sub">
            {item.sub.map(s => (
              <li key={s.path}>
                <Link
                  to={s.path}
                  className={`nav-sub-link ${location.pathname === s.path ? 'active' : ''}`}
                >
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </li>
    );
  }

  return (
    <li>
      <Link
        to={item.path}
        className={`nav-link ${isActive ? 'active' : ''}`}
        title={collapsed ? item.label : ''}
      >
        <SVGIcon name={item.icon} size={18} />
        {!collapsed && <span>{item.label}</span>}
      </Link>
    </li>
  );
};

// ── AdminLayout ──────────────────────────────────────────────────────────────
const AdminLayout = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  if (!isAdmin) {
    return (
      <div className="admin-unauth">
        <h2>Akses Ditolak</h2>
        <p>Anda tidak memiliki izin untuk mengakses halaman admin.</p>
        <button onClick={() => navigate('/login')} className="btn btn-primary">
          Kembali ke Login
        </button>
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className={`admin-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
      {/* ── SIDEBAR ── */}
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          {!collapsed && (
            <div className="brand-block">
              <span className="brand-star">★</span>
              <div>
                <div className="brand-name">SiPena</div>
                <div className="brand-tagline">SISTEM INFORMASI PENERBITAN</div>
              </div>
            </div>
          )}
          <button className="collapse-btn" onClick={() => setCollapsed(c => !c)} title="Toggle Sidebar">
            <SVGIcon name="menu" size={20} />
          </button>
        </div>

        {/* User mini-profile */}
        <div className="sidebar-user">
          <div className="sidebar-avatar">
            <SVGIcon name="user" size={22} />
          </div>
          {!collapsed && (
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.username}</div>
              <div className="sidebar-user-role">Administrator</div>
            </div>
          )}
        </div>

        <nav className="sidebar-nav">
          <ul>
            {NAV_ITEMS.map(item => (
              <NavItem key={item.path} item={item} collapsed={collapsed} />
            ))}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <button className="nav-link nav-link--logout" onClick={handleLogout}>
            <SVGIcon name="logout" size={18} />
            {!collapsed && <span>Keluar</span>}
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div className="admin-main">
        {/* Topbar */}
        <header className="admin-topbar">
          <div className="topbar-left">
            <div className="topbar-logo-text">
              <span className="topbar-star">★</span>
              <span className="topbar-perpusnas">PERPUSNAS PRESS</span>
              <span className="topbar-full">Perpustakaan Nasional RI</span>
            </div>
          </div>
          <div className="topbar-right">
            <div className="topbar-user">
              <div className="topbar-avatar"><SVGIcon name="user" size={18} /></div>
              <span>{user?.username}</span>
              <span className="topbar-badge">Administrator</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="admin-content">
          <Routes>
            <Route index element={<AdminDashboard />} />
            <Route path="katalog/*" element={<AdminKatalog />} />
            <Route path="pengguna/*" element={<AdminPengguna />} />
            <Route path="kegiatan/*" element={<AdminKegiatan />} />
            <Route path="konten/*" element={<AdminKonten />} />
            <Route path="laporan" element={<AdminLaporan />} />
            <Route path="pengaturan/*" element={<AdminPengaturan />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
