import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import {
  BookOpen,
  FileText,
  BarChart2,
  Book,
  PenTool,
  Clipboard,
  RefreshCw,
  Download,
  Eye,
  Star,
  Trophy,
  Users,
  Calendar,
  LogIn,
  ArrowUpRight
} from 'lucide-react';
import { SipenaAPI } from '../../lib/api';
import './AdminLayout.css';
import './AdminDashboard.css';

// ── Initial / Fallback Data ───────────────────────────────────────────────────
const INITIAL_STATS = [
  { label: 'Total Buku',        value: 0, sub: '+0 bulan ini',  cls: 'stat-card--blue',   icon: <BookOpen size={16} /> },
  { label: 'Pedoman / Standar', value: 0, sub: '+0 bulan ini',  cls: 'stat-card--amber',  icon: <Clipboard size={16} /> },
  { label: 'Prosiding',         value: 0, sub: '+0 bulan ini',  cls: 'stat-card--red',    icon: <FileText size={16} /> },
  { label: 'Laporan',           value: 0, sub: '+0 bulan ini',  cls: 'stat-card--green',  icon: <BarChart2 size={16} /> },
  { label: 'Majalah / Jurnal',  value: 0, sub: '+0 bulan ini',  cls: 'stat-card--teal',   icon: <Book size={16} /> },
  { label: 'Total Penulis',     value: 0, sub: '+0 bulan ini',  cls: 'stat-card--purple', icon: <PenTool size={16} /> },
];

const ICON_MAP = {
  'Total Buku': <BookOpen size={16} />,
  'Pedoman / Standar': <Clipboard size={16} />,
  'Prosiding': <FileText size={16} />,
  'Laporan': <BarChart2 size={16} />,
  'Majalah / Jurnal': <Book size={16} />,
  'Total Penulis': <PenTool size={16} />,
};

const CATEGORY_COLORS = {
  'Anak-anak': '#0ea5e9',
  'Anak': '#0ea5e9',
  'Biografi & Memoar': '#8b5cf6',
  'Ekonomi & Management': '#059669',
  'Fiksi': '#e11d48',
  'Hukum & Politik': '#4f46e5',
  'Hukum': '#6b21a8',
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

const ROLE_BADGE = {
  'Super Admin':   'badge-red',
  'Admin':         'badge-red',
  'Personil':      'badge-purple',
  'Penulis':       'badge-blue',
  'Calon Penulis': 'badge-amber',
  'Pengunjung':    'badge-gray',
};

const DEFAULT_MONTHLY_DATA = [
  { month: 'Jan', dibaca: 0, diunduh: 0 },
  { month: 'Feb', dibaca: 0, diunduh: 0 },
  { month: 'Mar', dibaca: 0, diunduh: 0 },
  { month: 'Apr', dibaca: 0, diunduh: 0 },
  { month: 'Mei', dibaca: 0, diunduh: 0 },
  { month: 'Jun', dibaca: 0, diunduh: 0 },
  { month: 'Jul', dibaca: 0, diunduh: 0 },
  { month: 'Agu', dibaca: 0, diunduh: 0 },
  { month: 'Sep', dibaca: 0, diunduh: 0 },
  { month: 'Okt', dibaca: 0, diunduh: 0 },
  { month: 'Nov', dibaca: 0, diunduh: 0 },
  { month: 'Des', dibaca: 0, diunduh: 0 },
];

// Custom Tooltip Recharts
const CustomChartTooltip = ({ active, payload, label, selectedYear }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '0.65rem 0.9rem',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        minWidth: '180px'
      }}>
        <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.45rem', color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.35rem' }}>
          {label} {selectedYear}
        </div>
        {payload.map((entry, index) => (
          <div key={`tooltip-${index}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.85rem', fontSize: '0.8rem', marginTop: '0.35rem' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: entry.dataKey === 'dibaca' ? '#0284c7' : '#2563eb', fontWeight: 600 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: entry.fill, display: 'inline-block' }}></span>
              {entry.name}:
            </span>
            <span style={{ fontWeight: 700, color: '#0f172a' }}>
              {Number(entry.value || 0).toLocaleString('id-ID')}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// ── Dashboard ────────────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const [stats, setStats] = useState(INITIAL_STATS);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState([2026, 2025, 2024, 2023, 2022, 2021, 2020]);
  const [monthlyChartData, setMonthlyChartData] = useState(DEFAULT_MONTHLY_DATA);
  const [topDownloadedBooks, setTopDownloadedBooks] = useState([]);
  const [topReadBooks, setTopReadBooks] = useState([]);
  const [topActiveUsers, setTopActiveUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchDashboardData = async (yearToFetch = selectedYear, isManual = false) => {
    try {
      if (isManual) setIsRefreshing(true);
      const res = await SipenaAPI.getDashboardStats({ year: yearToFetch });
      if (res) {
        if (Array.isArray(res.stats)) {
          setStats(res.stats.map(s => ({
            ...s,
            icon: ICON_MAP[s.label] || <BookOpen size={16} />
          })));
        }
        if (Array.isArray(res.availableYears)) {
          setAvailableYears(res.availableYears);
        }
        if (res.selectedYear) {
          setSelectedYear(res.selectedYear);
        }
        if (Array.isArray(res.monthlyChartData) && res.monthlyChartData.length > 0) {
          setMonthlyChartData(res.monthlyChartData);
        }
        if (Array.isArray(res.topDownloadedBooks)) {
          setTopDownloadedBooks(res.topDownloadedBooks);
        }
        if (Array.isArray(res.topReadBooks)) {
          setTopReadBooks(res.topReadBooks);
        }
        if (Array.isArray(res.topActiveUsers)) {
          setTopActiveUsers(res.topActiveUsers);
        }
      }
    } catch (err) {
      console.error('Failed to fetch live dashboard stats:', err);
    } finally {
      setLoading(false);
      if (isManual) setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(selectedYear);
  }, []);

  const handleYearChange = (e) => {
    const yr = parseInt(e.target.value, 10);
    setSelectedYear(yr);
    fetchDashboardData(yr, true);
  };

  const renderRankBadge = (rank) => {
    const cls = rank === 1 ? 'dashboard-rank--gold' : rank === 2 ? 'dashboard-rank--silver' : rank === 3 ? 'dashboard-rank--bronze' : 'dashboard-rank--default';
    return (
      <span className={`dashboard-rank ${cls}`}>
        {rank}
      </span>
    );
  };

  const now = new Date();
  const greet = now.getHours() < 12 ? 'Selamat Pagi' : now.getHours() < 17 ? 'Selamat Siang' : 'Selamat Sore';

  return (
    <div className="admin-dashboard">
      {/* Page header */}
      <div className="admin-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>{greet}, Administrator</h1>
          <p>Selamat datang di panel pengelolaan SiPena — Perpusnas Press</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.75rem',
            color: '#059669',
            background: '#ecfdf5',
            padding: '0.25rem 0.65rem',
            borderRadius: '1rem',
            fontWeight: 600,
            border: '1px solid #a7f3d0'
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span> Live Terhubung
          </span>
          <button
            onClick={() => fetchDashboardData(selectedYear, true)}
            disabled={isRefreshing}
            className="btn btn-outline"
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            title="Muat ulang data live statistik"
          >
            <RefreshCw size={13} className={isRefreshing ? "animate-spin" : ""} /> {isRefreshing ? 'Memperbarui...' : 'Segarkan Data'}
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="admin-stat-grid">
        {stats.map(s => (
          <div key={s.label} className={`admin-stat-card ${s.cls}`}>
            <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {s.icon || ICON_MAP[s.label]} <span>{s.label}</span>
            </div>
            <div className="stat-value">{Number(s.value || 0).toLocaleString('id-ID')}</div>
            <div className="stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── 1. GROUPED BAR CHART: DIBACA & DIUNDUH BERDAMPINGAN DENGAN FILTER TAHUN ── */}
      <div className="admin-card" style={{ marginBottom: '1.25rem' }}>
        <div className="dashboard-chart-header">
          <div>
            <span className="admin-card-title" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart2 size={18} color="var(--accent-color)" /> Grafik Jumlah Dibaca & Diunduh per Bulan
            </span>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
              Perbandingan aktivitas pembaca online dan pengunduh file publikasi
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label htmlFor="dashboard-year-select" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Filter Tahun:
            </label>
            <select
              id="dashboard-year-select"
              value={selectedYear}
              onChange={handleYearChange}
              className="dashboard-year-select"
            >
              {availableYears.map(yr => (
                <option key={yr} value={yr}>Tahun {yr}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ width: '100%', height: 340, marginTop: '0.75rem' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={monthlyChartData}
              margin={{ top: 20, right: 25, left: 10, bottom: 5 }}
              barGap={6}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="month"
                tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                axisLine={{ stroke: '#cbd5e1' }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tickFormatter={(v) => {
                  if (v === 0) return '0';
                  if (v >= 1000) return `${(v / 1000).toLocaleString('id-ID')}k`;
                  return v.toString();
                }}
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={{ stroke: '#cbd5e1' }}
                tickLine={false}
              />
              <Tooltip content={<CustomChartTooltip selectedYear={selectedYear} />} />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: '16px' }}
                iconType="circle"
              />
              <Bar
                dataKey="dibaca"
                name="Jumlah Baca"
                fill="#0284c7"
                radius={[4, 4, 0, 0]}
                maxBarSize={24}
              />
              <Bar
                dataKey="diunduh"
                name="Jumlah Unduh"
                fill="#2563eb"
                radius={[4, 4, 0, 0]}
                maxBarSize={24}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── 2 & 3. DUA KONTAINER: 10 BUKU PALING SERING DIUNDUH & 10 BUKU PALING SERING DIBACA ── */}
      <div className="admin-grid-2" style={{ marginBottom: '1.25rem' }}>
        {/* 10 Teratas Buku Sering Diunduh (Seminggu Terakhir) */}
        <div className="admin-card">
          <div className="admin-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="admin-card-title">10 Teratas Buku Sering Diunduh</span>
              <span style={{ fontSize: '0.72rem', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '0.15rem 0.5rem', borderRadius: '1rem', fontWeight: 600 }}>
                7 Hari Terakhir
              </span>
            </div>
            <Link to="/admin/katalog" style={{ fontSize: '0.82rem', color: 'var(--accent-color)', textDecoration: 'none', fontWeight: 600 }}>
              Lihat Katalog →
            </Link>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: 42, textAlign: 'center' }}>#</th>
                  <th>Buku & Penulis</th>
                  <th>Kategori</th>
                  <th style={{ textAlign: 'right' }}>Unduhan</th>
                  <th style={{ textAlign: 'center', width: 60 }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {topDownloadedBooks.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '2rem' }}>
                      {loading ? 'Memuat data buku terunduh...' : 'Belum ada data unduhan buku.'}
                    </td>
                  </tr>
                ) : (
                  topDownloadedBooks.map((b, idx) => {
                    const bgColor = CATEGORY_COLORS[b.kategori] || '#1e3a8a';
                    return (
                      <tr key={b.id || idx}>
                        <td style={{ textAlign: 'center' }}>
                          {renderRankBadge(idx + 1)}
                        </td>
                        <td>
                          <div className="dashboard-book-cell">
                            <div className="dashboard-book-thumb" style={{ backgroundColor: bgColor }}>
                              {b.coverUrl ? (
                                <img src={b.coverUrl} alt={b.judul} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                              ) : (
                                <span>{b.judul ? b.judul.slice(0, 2).toUpperCase() : 'BK'}</span>
                              )}
                            </div>
                            <div>
                              <div className="dashboard-book-title" title={b.judul}>{b.judul}</div>
                              <div className="dashboard-book-author">{b.penulis}</div>
                            </div>
                          </div>
                        </td>
                        <td><span className="badge badge-gray">{b.kategori}</span></td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#2563eb' }}>
                            <Download size={12} style={{ display: 'inline', marginRight: 2 }} /> {Number(b.unduhanMingguIni || 0).toLocaleString('id-ID')}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                            {Number(b.unduhanTotal || 0).toLocaleString('id-ID')} total
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <Link to={`/buku/${b.id}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem', color: 'var(--accent-color)', textDecoration: 'none', fontWeight: 600 }} title="Buka Detail Buku Publik">
                            Buka ↗
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 10 Teratas Buku Sering Dibaca */}
        <div className="admin-card">
          <div className="admin-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="admin-card-title">10 Teratas Buku Sering Dibaca</span>
              <span style={{ fontSize: '0.72rem', background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '0.15rem 0.5rem', borderRadius: '1rem', fontWeight: 600 }}>
                Pembaca Terbanyak
              </span>
            </div>
            <Link to="/admin/katalog" style={{ fontSize: '0.82rem', color: 'var(--accent-color)', textDecoration: 'none', fontWeight: 600 }}>
              Lihat Katalog →
            </Link>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: 42, textAlign: 'center' }}>#</th>
                  <th>Buku & Penulis</th>
                  <th>Kategori</th>
                  <th style={{ textAlign: 'right' }}>Pembaca</th>
                  <th style={{ textAlign: 'center', width: 60 }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {topReadBooks.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '2rem' }}>
                      {loading ? 'Memuat data buku sering dibaca...' : 'Belum ada data pembaca buku.'}
                    </td>
                  </tr>
                ) : (
                  topReadBooks.map((b, idx) => {
                    const bgColor = CATEGORY_COLORS[b.kategori] || '#1e3a8a';
                    return (
                      <tr key={b.id || idx}>
                        <td style={{ textAlign: 'center' }}>
                          {renderRankBadge(idx + 1)}
                        </td>
                        <td>
                          <div className="dashboard-book-cell">
                            <div className="dashboard-book-thumb" style={{ backgroundColor: bgColor }}>
                              {b.coverUrl ? (
                                <img src={b.coverUrl} alt={b.judul} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                              ) : (
                                <span>{b.judul ? b.judul.slice(0, 2).toUpperCase() : 'BK'}</span>
                              )}
                            </div>
                            <div>
                              <div className="dashboard-book-title" title={b.judul}>{b.judul}</div>
                              <div className="dashboard-book-author">{b.penulis}</div>
                            </div>
                          </div>
                        </td>
                        <td><span className="badge badge-gray">{b.kategori}</span></td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0284c7' }}>
                            <Eye size={12} style={{ display: 'inline', marginRight: 2 }} /> {Number(b.pembacaTotal || 0).toLocaleString('id-ID')}
                          </div>
                          {b.ratingAvg > 0 && (
                            <div style={{ fontSize: '0.72rem', color: '#d97706', fontWeight: 600 }}>
                              ★ {b.ratingAvg.toFixed(1)}
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <Link to={`/buku/${b.id}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem', color: 'var(--accent-color)', textDecoration: 'none', fontWeight: 600 }} title="Buka Detail Buku Publik">
                            Buka ↗
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── 4. PENGGUNA PALING AKTIF DI WEBSITE SIPENA (UNDUH, BACA, MASUK WEBSITE) ── */}
      <div className="admin-card">
        <div className="admin-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <span className="admin-card-title" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={18} color="var(--accent-color)" /> Pengguna Paling Aktif di Website SiPena
            </span>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
              Peringkat keaktifan pengguna berdasarkan frekuensi masuk (login), membaca buku, dan mengunduh buku
            </p>
          </div>
          <Link to="/admin/pengguna" style={{ fontSize: '0.82rem', color: 'var(--accent-color)', textDecoration: 'none', fontWeight: 600 }}>
            Kelola Semua Pengguna →
          </Link>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: 42, textAlign: 'center' }}>#</th>
                <th>Pengguna</th>
                <th>Role</th>
                <th style={{ textAlign: 'center' }}>Masuk / Kunjungan</th>
                <th style={{ textAlign: 'center' }}>Buku Dibaca</th>
                <th style={{ textAlign: 'center' }}>Buku Diunduh</th>
                <th>Terakhir Aktif</th>
                <th style={{ textAlign: 'right' }}>Skor Aktivitas</th>
              </tr>
            </thead>
            <tbody>
              {topActiveUsers.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '2rem' }}>
                    {loading ? 'Memuat data aktivitas pengguna...' : 'Belum ada data aktivitas pengguna.'}
                  </td>
                </tr>
              ) : (
                topActiveUsers.map((u, idx) => (
                  <tr key={u.id || idx}>
                    <td style={{ textAlign: 'center' }}>
                      {renderRankBadge(idx + 1)}
                    </td>
                    <td>
                      <div className="dashboard-user-cell">
                        <div className="dashboard-user-avatar">
                          {u.image ? (
                            <img src={u.image} alt={u.nama} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                          ) : (
                            <span>{u.nama ? u.nama.slice(0, 2).toUpperCase() : 'US'}</span>
                          )}
                        </div>
                        <div>
                          <div className="dashboard-user-name">{u.nama}</div>
                          <div className="dashboard-user-email">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className={`badge ${ROLE_BADGE[u.role] || 'badge-gray'}`}>{u.role}</span></td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="dashboard-activity-pill" style={{ color: '#4338ca', borderColor: '#c7d2fe' }}>
                        <LogIn size={11} /> {Number(u.loginCount || 0).toLocaleString('id-ID')}x
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="dashboard-activity-pill" style={{ color: '#0369a1', borderColor: '#bae6fd' }}>
                        <Eye size={11} /> {Number(u.readCount || 0).toLocaleString('id-ID')}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="dashboard-activity-pill" style={{ color: '#1d4ed8', borderColor: '#bfdbfe' }}>
                        <Download size={11} /> {Number(u.downloadCount || 0).toLocaleString('id-ID')}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                      {u.lastActive ? new Date(u.lastActive).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        color: '#059669',
                        background: '#ecfdf5',
                        border: '1px solid #a7f3d0',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '1rem'
                      }}>
                        ⚡ {u.activityScore || 0} poin
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
