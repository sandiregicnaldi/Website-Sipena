import React, { useState } from 'react';
import './AdminLayout.css';
import './AdminDashboard.css';

const MONTHLY_DATA = [
  { month: 'Jan', download: 540,  pengunjung: 1200 },
  { month: 'Feb', download: 780,  pengunjung: 1580 },
  { month: 'Mar', download: 620,  pengunjung: 1350 },
  { month: 'Apr', download: 940,  pengunjung: 2100 },
  { month: 'Mei', download: 1100, pengunjung: 2400 },
  { month: 'Jun', download: 870,  pengunjung: 1900 },
  { month: 'Jul', download: 1250, pengunjung: 2800 },
];

const BarChart = ({ data }) => {
  const W = 600, H = 240, PAD = { top: 20, right: 20, bottom: 40, left: 50 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const maxVal = Math.max(...data.map(d => Math.max(d.download, d.pengunjung)));
  const barW = (innerW / data.length) * 0.35;
  const groupW = innerW / data.length;
  const toY = v => PAD.top + innerH - (v / maxVal) * innerH;
  const toH = v => (v / maxVal) * innerH;

  const [tooltip, setTooltip] = useState(null);

  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
          const val = Math.round(t * maxVal);
          const y = toY(val);
          return (
            <g key={i}>
              <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#e2e8f0" strokeWidth="1" strokeDasharray={i > 0 ? '4,4' : '0'} />
              <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8">{val >= 1000 ? (val/1000).toFixed(1)+'k' : val}</text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const cx = PAD.left + i * groupW + groupW / 2;
          return (
            <g key={i}>
              <rect
                x={cx - barW - 2} y={toY(d.download)} width={barW} height={toH(d.download)}
                fill="#2563eb" rx="3" opacity="0.85" style={{ cursor:'pointer' }}
                onMouseEnter={() => setTooltip({ x: cx, d, type:'download' })}
                onMouseLeave={() => setTooltip(null)}
              />
              <rect
                x={cx + 2} y={toY(d.pengunjung)} width={barW} height={toH(d.pengunjung)}
                fill="#10b981" rx="3" opacity="0.85" style={{ cursor:'pointer' }}
                onMouseEnter={() => setTooltip({ x: cx, d, type:'pengunjung' })}
                onMouseLeave={() => setTooltip(null)}
              />
              <text x={cx} y={H - 8} textAnchor="middle" fontSize="10" fill="#64748b">{d.month}</text>
            </g>
          );
        })}
        {/* Legend */}
        <rect x={PAD.left} y={6} width={10} height={10} fill="#2563eb" rx="2" />
        <text x={PAD.left + 14} y={15} fontSize="10" fill="#64748b">Download</text>
        <rect x={PAD.left + 80} y={6} width={10} height={10} fill="#10b981" rx="2" />
        <text x={PAD.left + 94} y={15} fontSize="10" fill="#64748b">Pengunjung</text>
      </svg>
      {tooltip && (
        <div className="chart-tooltip" style={{ left: `${(tooltip.x / W) * 100}%`, top: '0' }}>
          <strong>{tooltip.d.month}</strong>
          <span>{tooltip.type === 'download' ? 'Download' : 'Pengunjung'}: {tooltip.d[tooltip.type].toLocaleString('id-ID')}</span>
        </div>
      )}
    </div>
  );
};

const TOP_BOOKS = [
  { judul: 'Sejarah Perpustakaan Nasional RI',  download: 4820 },
  { judul: 'Pedoman Katalogisasi Perpustakaan', download: 3610 },
  { judul: 'Literasi Informasi di Era Digital', download: 2940 },
  { judul: 'Naskah Nusantara: Koleksi Pilihan', download: 2180 },
  { judul: 'Manajemen Arsip Modern',             download: 1760 },
];

const AdminLaporan = () => {
  const maxDl = TOP_BOOKS[0].download;
  return (
    <div>
      <div className="admin-page-header">
        <h1>📊 Laporan & Statistik</h1>
        <p>Pantau performa download dan kunjungan website SiPena.</p>
      </div>
      <div className="admin-grid-2" style={{ marginBottom:'1.25rem' }}>
        <div className="admin-stat-card stat-card--blue" style={{ flexDirection:'row', alignItems:'center', gap:'1rem' }}>
          <div style={{ fontSize:'2.5rem' }}>📥</div>
          <div>
            <div className="stat-label">Total Download (2026)</div>
            <div className="stat-value">14.8k</div>
            <div className="stat-sub">+42% dari tahun lalu</div>
          </div>
        </div>
        <div className="admin-stat-card stat-card--green" style={{ flexDirection:'row', alignItems:'center', gap:'1rem' }}>
          <div style={{ fontSize:'2.5rem' }}>👁️</div>
          <div>
            <div className="stat-label">Total Pengunjung (2026)</div>
            <div className="stat-value">13.3k</div>
            <div className="stat-sub">+28% dari tahun lalu</div>
          </div>
        </div>
      </div>

      <div className="admin-card" style={{ marginBottom:'1.25rem' }}>
        <div className="admin-card-header">
          <span className="admin-card-title">Download & Pengunjung Bulanan (2026)</span>
        </div>
        <BarChart data={MONTHLY_DATA} />
      </div>

      <div className="admin-card">
        <div className="admin-card-header">
          <span className="admin-card-title">Top 5 Buku Paling Banyak Diunduh</span>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem', padding:'0.25rem 0' }}>
          {TOP_BOOKS.map((b, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
              <span style={{
                minWidth:'24px', height:'24px', borderRadius:'50%', background:'var(--accent-color)',
                color:'#fff', fontSize:'0.75rem', fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center'
              }}>{i + 1}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize:'0.875rem', fontWeight:600, marginBottom:'0.2rem' }}>{b.judul}</div>
                <div style={{ background:'var(--bg-primary)', borderRadius:'4px', overflow:'hidden', height:'6px' }}>
                  <div style={{ width:`${(b.download / maxDl) * 100}%`, background:'var(--accent-color)', height:'100%', transition:'width 1s ease' }} />
                </div>
              </div>
              <span style={{ fontSize:'0.82rem', color:'var(--text-secondary)', minWidth:'50px', textAlign:'right' }}>
                {b.download.toLocaleString('id-ID')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminLaporan;
