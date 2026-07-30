import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, FileText, BarChart2, Book, PenTool, Clipboard } from 'lucide-react';
import './AdminLayout.css';
import './AdminDashboard.css';

// ── Mock data ────────────────────────────────────────────────────────────────
const STATS = [
  { label: 'Total Buku',        value: 1290, sub: '+12 bulan ini',  cls: 'stat-card--blue',   icon: <BookOpen size={16} /> },
  { label: 'Pedoman / Standar', value: 42,   sub: '+2 bulan ini',   cls: 'stat-card--amber',  icon: <Clipboard size={16} /> },
  { label: 'Prosiding',         value: 8,    sub: '+1 bulan ini',   cls: 'stat-card--red',    icon: <FileText size={16} /> },
  { label: 'Laporan',           value: 54,   sub: '+5 bulan ini',   cls: 'stat-card--green',  icon: <BarChart2 size={16} /> },
  { label: 'Majalah / Jurnal',  value: 28,   sub: '+3 bulan ini',   cls: 'stat-card--teal',   icon: <Book size={16} /> },
  { label: 'Total Penulis',     value: 187,  sub: '+6 bulan ini',   cls: 'stat-card--purple', icon: <PenTool size={16} /> },
];

// Download per year (2015-2026)
const CHART_DATA = [
  { year: '2015', val: 120  },
  { year: '2016', val: 480  },
  { year: '2017', val: 900  },
  { year: '2018', val: 2800 },
  { year: '2019', val: 3100 },
  { year: '2020', val: 4200 },
  { year: '2021', val: 5300 },
  { year: '2022', val: 6100 },
  { year: '2023', val: 6800 },
  { year: '2024', val: 14800},
  { year: '2025', val: 9600 },
  { year: '2026', val: 2900 },
];

const RECENT_BOOKS = [
  { id: 1, judul: 'Sejarah Perpustakaan Nasional RI',   penulis: 'Dr. Ahmad Fauzi',    kategori: 'Sejarah',    status: 'Terbit',    tanggal: '2026-06-10' },
  { id: 2, judul: 'Pedoman Katalogisasi Perpustakaan',  penulis: 'Dra. Siti Rahayu',   kategori: 'Pedoman',    status: 'Terbit',    tanggal: '2026-05-22' },
  { id: 3, judul: 'Literasi Informasi di Era Digital',  penulis: 'Prof. Budi Santoso', kategori: 'Teknologi',  status: 'Proses',    tanggal: '2026-07-01' },
  { id: 4, judul: 'Naskah Nusantara: Koleksi Pilihan',  penulis: 'Drs. Hendra Wijaya', kategori: 'Manuskrip',  status: 'Review',    tanggal: '2026-07-05' },
  { id: 5, judul: 'Manajemen Arsip Modern',             penulis: 'Dr. Rina Dewi',      kategori: 'Manajemen',  status: 'Terbit',    tanggal: '2026-04-18' },
];

const RECENT_USERS = [
  { id: 1, nama: 'Agus Pratama',    role: 'Calon Penulis', email: 'agus@email.com',    tanggal: '2026-07-15' },
  { id: 2, nama: 'Sari Indah',      role: 'Pengunjung',    email: 'sari@email.com',    tanggal: '2026-07-14' },
  { id: 3, nama: 'Wahyu Nugroho',   role: 'Penulis',       email: 'wahyu@email.com',   tanggal: '2026-07-12' },
  { id: 4, nama: 'Dian Kusuma',     role: 'Calon Penulis', email: 'dian@email.com',    tanggal: '2026-07-11' },
  { id: 5, nama: 'Rizki Fauzan',    role: 'Pengunjung',    email: 'rizki@email.com',   tanggal: '2026-07-10' },
];

const ROLE_BADGE = {
  'Penulis':       'badge-blue',
  'Calon Penulis': 'badge-amber',
  'Pengunjung':    'badge-gray',
  'Pegawai':       'badge-purple',
};

const STATUS_BADGE = {
  'Terbit': 'badge-green',
  'Proses': 'badge-amber',
  'Review': 'badge-blue',
};

// ── SVG Line Chart ───────────────────────────────────────────────────────────
const LineChart = ({ data }) => {
  const W = 700, H = 260, PAD = { top: 20, right: 20, bottom: 40, left: 55 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const maxVal = Math.max(...data.map(d => d.val));
  const xStep = innerW / (data.length - 1);

  const toX = i => PAD.left + i * xStep;
  const toY = v => PAD.top + innerH - (v / maxVal) * innerH;

  // Y-axis labels (5 ticks)
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => Math.round(t * maxVal));

  // Polyline points
  const points = data.map((d, i) => `${toX(i)},${toY(d.val)}`).join(' ');

  // Area fill path
  const area = `M${toX(0)},${toY(data[0].val)} ` +
    data.slice(1).map((d, i) => `L${toX(i + 1)},${toY(d.val)}`).join(' ') +
    ` L${toX(data.length - 1)},${PAD.top + innerH} L${toX(0)},${PAD.top + innerH} Z`;

  const [tooltip, setTooltip] = useState(null);

  return (
    <div className="chart-container" style={{ position: 'relative' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ display: 'block', fontFamily: 'Inter, sans-serif' }}
      >
        {/* Grid lines */}
        {yTicks.map((t, i) => {
          const y = toY(t);
          return (
            <g key={i}>
              <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y}
                stroke="#e2e8f0" strokeWidth="1" strokeDasharray={i > 0 ? '4,4' : '0'} />
              <text x={PAD.left - 6} y={y + 4} textAnchor="end"
                fontSize="10" fill="#94a3b8">
                {t >= 1000 ? (t / 1000).toFixed(0) + 'k' : t}
              </text>
            </g>
          );
        })}

        {/* Y-axis label */}
        <text
          transform={`translate(12, ${PAD.top + innerH / 2}) rotate(-90)`}
          textAnchor="middle" fontSize="10" fill="#94a3b8">
          Jumlah Download
        </text>

        {/* Area fill */}
        <path d={area} fill="url(#areaGrad)" opacity="0.25" />
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke="#2563eb"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Dots + X labels */}
        {data.map((d, i) => (
          <g key={i}>
            <text x={toX(i)} y={H - 10} textAnchor="middle" fontSize="10" fill="#64748b">
              {d.year}
            </text>
            <circle
              cx={toX(i)} cy={toY(d.val)} r="5"
              fill="#fff" stroke="#2563eb" strokeWidth="2.5"
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setTooltip({ i, d })}
              onMouseLeave={() => setTooltip(null)}
            />
          </g>
        ))}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div className="chart-tooltip" style={{
          left: `${(tooltip.i / (data.length - 1)) * 100}%`,
        }}>
          <strong>{tooltip.d.year}</strong>
          <span>{tooltip.d.val.toLocaleString('id-ID')} download</span>
        </div>
      )}
    </div>
  );
};

// ── Dashboard ────────────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const now = new Date();
  const greet = now.getHours() < 12 ? 'Selamat Pagi' : now.getHours() < 17 ? 'Selamat Siang' : 'Selamat Sore';

  return (
    <div className="admin-dashboard">
      {/* Page header */}
      <div className="admin-page-header">
        <h1>{greet}, Administrator</h1>
        <p>Selamat datang di panel pengelolaan SiPena — Perpusnas Press</p>
      </div>

      {/* Stat cards */}
      <div className="admin-stat-grid">
        {STATS.map(s => (
          <div key={s.label} className={`admin-stat-card ${s.cls}`}>
            <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {s.icon} <span>{s.label}</span>
            </div>
            <div className="stat-value">{s.value.toLocaleString('id-ID')}</div>
            <div className="stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="admin-card" style={{ marginBottom: '1.25rem' }}>
        <div className="admin-card-header">
          <span className="admin-card-title">Statistik Jumlah Download per Tahun</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>2015 – 2026</span>
        </div>
        <LineChart data={CHART_DATA} />
      </div>

      {/* Bottom grid */}
      <div className="admin-grid-2">
        {/* Recent books */}
        <div className="admin-card">
          <div className="admin-card-header">
            <span className="admin-card-title">Buku Terbaru / Proses</span>
            <Link to="/admin/katalog" style={{ fontSize: '0.82rem', color: 'var(--accent-color)', textDecoration: 'none', fontWeight: 600 }}>Lihat Semua →</Link>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Judul</th>
                  <th>Kategori</th>
                  <th>Status</th>
                  <th>Tanggal</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {RECENT_BOOKS.map(b => (
                  <tr key={b.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{b.judul}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{b.penulis}</div>
                    </td>
                    <td><span className="badge badge-gray">{b.kategori}</span></td>
                    <td><span className={`badge ${STATUS_BADGE[b.status]}`}>{b.status}</span></td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                      {new Date(b.tanggal).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' })}
                    </td>
                    <td>
                      <Link to="/admin/katalog" style={{ fontSize: '0.8rem', color: 'var(--accent-color)', textDecoration: 'none', fontWeight: 600 }}>Lihat →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent users */}
        <div className="admin-card">
          <div className="admin-card-header">
            <span className="admin-card-title">Pengguna Terdaftar Terbaru</span>
            <Link to="/admin/pengguna" style={{ fontSize: '0.82rem', color: 'var(--accent-color)', textDecoration: 'none', fontWeight: 600 }}>Lihat Semua →</Link>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Role</th>
                  <th>Tanggal</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {RECENT_USERS.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{u.nama}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{u.email}</div>
                    </td>
                    <td><span className={`badge ${ROLE_BADGE[u.role] || 'badge-gray'}`}>{u.role}</span></td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                      {new Date(u.tanggal).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' })}
                    </td>
                    <td>
                      <Link to="/admin/pengguna" style={{ fontSize: '0.8rem', color: 'var(--accent-color)', textDecoration: 'none', fontWeight: 600 }}>Lihat →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
