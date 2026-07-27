import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { useEvent } from '../../context/EventContext';
import { FileDown } from 'lucide-react';
import './AdminLayout.css';

// ─── Data simulasi realistis (bisa diganti API nanti) ───────────────────────
const BULAN_LABEL = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];

const RAW_DATA = {
  2024: [
    { pengunjung: 980,  unduhan: 420 },
    { pengunjung: 1120, unduhan: 510 },
    { pengunjung: 1050, unduhan: 480 },
    { pengunjung: 1340, unduhan: 620 },
    { pengunjung: 1560, unduhan: 730 },
    { pengunjung: 1420, unduhan: 680 },
    { pengunjung: 1680, unduhan: 810 },
    { pengunjung: 1390, unduhan: 670 },
    { pengunjung: 1510, unduhan: 720 },
    { pengunjung: 1720, unduhan: 890 },
    { pengunjung: 1850, unduhan: 940 },
    { pengunjung: 2100, unduhan: 1050 },
  ],
  2025: [
    { pengunjung: 1300, unduhan: 590 },
    { pengunjung: 1580, unduhan: 710 },
    { pengunjung: 1450, unduhan: 660 },
    { pengunjung: 1820, unduhan: 850 },
    { pengunjung: 2100, unduhan: 980 },
    { pengunjung: 1960, unduhan: 920 },
    { pengunjung: 2280, unduhan: 1100 },
    { pengunjung: 1950, unduhan: 940 },
    { pengunjung: 2050, unduhan: 990 },
    { pengunjung: 2310, unduhan: 1150 },
    { pengunjung: 2480, unduhan: 1230 },
    { pengunjung: 2720, unduhan: 1380 },
  ],
  2026: [
    { pengunjung: 1200, unduhan: 540 },
    { pengunjung: 1580, unduhan: 780 },
    { pengunjung: 1350, unduhan: 620 },
    { pengunjung: 2100, unduhan: 940 },
    { pengunjung: 2400, unduhan: 1100 },
    { pengunjung: 1900, unduhan: 870 },
    { pengunjung: 2800, unduhan: 1250 },
    { pengunjung: 0,    unduhan: 0 },
    { pengunjung: 0,    unduhan: 0 },
    { pengunjung: 0,    unduhan: 0 },
    { pengunjung: 0,    unduhan: 0 },
    { pengunjung: 0,    unduhan: 0 },
  ],
};

const TOP_BUKU = [
  { judul: 'Sejarah Perpustakaan Nasional RI',   unduhan: 4820, kategori: 'Sejarah'  },
  { judul: 'Pedoman Katalogisasi Perpustakaan',  unduhan: 3610, kategori: 'Panduan'  },
  { judul: 'Literasi Informasi di Era Digital',  unduhan: 2940, kategori: 'Digital'  },
  { judul: 'Naskah Nusantara: Koleksi Pilihan',  unduhan: 2180, kategori: 'Budaya'   },
  { judul: 'Manajemen Arsip Modern',             unduhan: 1760, kategori: 'Manajemen'},
  { judul: 'Kamus Bahasa Daerah Nusantara',      unduhan: 1540, kategori: 'Bahasa'   },
  { judul: 'Panduan Penulisan Ilmiah',           unduhan: 1320, kategori: 'Akademik' },
  { judul: 'Ensiklopedi Budaya Jawa',            unduhan: 1180, kategori: 'Budaya'   },
  { judul: 'Hukum Perpustakaan Indonesia',       unduhan: 990,  kategori: 'Hukum'   },
  { judul: 'Teknologi Informasi Perpustakaan',   unduhan: 870,  kategori: 'Teknologi'},
];

// ─── CSV Utility ─────────────────────────────────────────────────────────────
const downloadCSV = (filename, headers, rows) => {
  const csvContent = [headers, ...rows]
    .map(r => r.map(c => `"${c}"`).join(','))
    .join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// ─── Tooltip kustom Recharts ─────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#0f172a', color: 'white', padding: '0.6rem 1rem',
      borderRadius: '0.5rem', fontSize: '0.82rem', boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
    }}>
      <div style={{ fontWeight: 700, marginBottom: '0.3rem' }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>
          {p.name}: <strong>{p.value.toLocaleString('id-ID')}</strong>
        </div>
      ))}
    </div>
  );
};

// ─── Komponen Kartu Ringkasan ─────────────────────────────────────────────────
const StatCard = ({ icon, label, value, sub, color }) => (
  <div style={{
    background: 'white', borderRadius: 'var(--radius-lg)', padding: '1.25rem 1.5rem',
    boxShadow: 'var(--shadow-sm)', borderTop: `4px solid ${color}`,
    display: 'flex', alignItems: 'center', gap: '1.25rem'
  }}>
    <div style={{ fontSize: '2.2rem' }}>{icon}</div>
    <div>
      <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: '0.78rem', color: '#10b981', marginTop: '0.2rem' }}>{sub}</div>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const AdminLaporan = () => {
  const { events, peserta } = useEvent();

  const TAHUN_LIST  = [2024, 2025, 2026];
  const BULAN_LIST  = ['Semua', ...BULAN_LABEL];

  const [filterTahun, setFilterTahun] = useState(2026);
  const [filterBulan, setFilterBulan] = useState('Semua');

  // ── Hitung data grafik berdasarkan filter ──
  const chartData = useMemo(() => {
    const raw = RAW_DATA[filterTahun] || [];
    if (filterBulan === 'Semua') {
      return raw.map((d, i) => ({
        bulan: BULAN_LABEL[i],
        Pengunjung: d.pengunjung,
        Unduhan: d.unduhan,
      })).filter(d => d.Pengunjung > 0 || d.Unduhan > 0);
    }
    const idx = BULAN_LABEL.indexOf(filterBulan);
    return idx >= 0 ? [{
      bulan: BULAN_LABEL[idx],
      Pengunjung: raw[idx]?.pengunjung || 0,
      Unduhan: raw[idx]?.unduhan || 0,
    }] : [];
  }, [filterTahun, filterBulan]);

  // ── Total ringkasan ──
  const totalPengunjung = useMemo(() => {
    const raw = RAW_DATA[filterTahun] || [];
    if (filterBulan === 'Semua') return raw.reduce((s, d) => s + d.pengunjung, 0);
    const idx = BULAN_LABEL.indexOf(filterBulan);
    return raw[idx]?.pengunjung || 0;
  }, [filterTahun, filterBulan]);

  const totalUnduhan = useMemo(() => {
    const raw = RAW_DATA[filterTahun] || [];
    if (filterBulan === 'Semua') return raw.reduce((s, d) => s + d.unduhan, 0);
    const idx = BULAN_LABEL.indexOf(filterBulan);
    return raw[idx]?.unduhan || 0;
  }, [filterTahun, filterBulan]);

  // ── Total peserta dari EventContext ──
  const totalPeserta = useMemo(() =>
    Object.values(peserta).reduce((s, arr) => s + arr.length, 0)
  , [peserta]);

  const periodLabel = filterBulan === 'Semua' ? `Tahun ${filterTahun}` : `${filterBulan} ${filterTahun}`;

  // ── Unduh CSV per seksi ──
  const unduhPengunjung = () => {
    const raw = RAW_DATA[filterTahun] || [];
    const rows = filterBulan === 'Semua'
      ? raw.map((d, i) => [BULAN_LABEL[i], filterTahun, d.pengunjung]).filter(r => r[2] > 0)
      : [[filterBulan, filterTahun, raw[BULAN_LABEL.indexOf(filterBulan)]?.pengunjung || 0]];
    downloadCSV(`Laporan_Pengunjung_${periodLabel.replace(' ','_')}.csv`,
      ['Bulan', 'Tahun', 'Total Pengunjung'], rows);
  };

  const unduhUnduhan = () => {
    const raw = RAW_DATA[filterTahun] || [];
    const rows = filterBulan === 'Semua'
      ? raw.map((d, i) => [BULAN_LABEL[i], filterTahun, d.unduhan]).filter(r => r[2] > 0)
      : [[filterBulan, filterTahun, raw[BULAN_LABEL.indexOf(filterBulan)]?.unduhan || 0]];
    downloadCSV(`Laporan_Unduhan_${periodLabel.replace(' ','_')}.csv`,
      ['Bulan', 'Tahun', 'Total Unduhan'], rows);
  };

  const unduhBukuPopuler = () => {
    downloadCSV(`Top_Buku_${filterTahun}.csv`,
      ['Peringkat', 'Judul Buku', 'Kategori', 'Total Unduhan'],
      TOP_BUKU.map((b, i) => [i + 1, b.judul, b.kategori, b.unduhan])
    );
  };

  const unduhPeserta = () => {
    const rows = events.map(ev => [
      ev.judul,
      ev.tanggal,
      ev.lokasi,
      (peserta[ev.id] || []).length,
      (peserta[ev.id] || []).filter(p => p.status === 'Hadir').length,
    ]);
    downloadCSV(`Laporan_Peserta_${filterTahun}.csv`,
      ['Judul Kegiatan', 'Tanggal', 'Lokasi', 'Total Daftar', 'Total Hadir'], rows);
  };

  const unduhSemua = () => {
    // Gabungkan semua dalam 1 file dengan separator
    const raw = RAW_DATA[filterTahun] || [];
    const rows = [
      ['=== LAPORAN PENGUNJUNG ===', '', '', '', ''],
      ['Bulan', 'Tahun', 'Pengunjung', 'Unduhan', ''],
      ...raw.map((d, i) => d.pengunjung > 0
        ? [BULAN_LABEL[i], filterTahun, d.pengunjung, d.unduhan, ''] : null
      ).filter(Boolean),
      ['', '', '', '', ''],
      ['=== TOP BUKU DIUNDUH ===', '', '', '', ''],
      ['Peringkat', 'Judul', 'Kategori', 'Unduhan', ''],
      ...TOP_BUKU.map((b, i) => [i + 1, b.judul, b.kategori, b.unduhan, '']),
      ['', '', '', '', ''],
      ['=== PESERTA KEGIATAN ===', '', '', '', ''],
      ['Kegiatan', 'Tanggal', 'Lokasi', 'Daftar', 'Hadir'],
      ...events.map(ev => [
        ev.judul, ev.tanggal, ev.lokasi,
        (peserta[ev.id] || []).length,
        (peserta[ev.id] || []).filter(p => p.status === 'Hadir').length,
      ]),
    ];
    downloadCSV(`Laporan_Lengkap_SiPena_${periodLabel.replace(' ','_')}.csv`,
      ['Data', 'Kol1', 'Kol2', 'Kol3', 'Kol4'], rows);
  };

  const inputStyle = {
    padding: '0.45rem 0.85rem', border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-md)', fontSize: '0.875rem',
    background: 'var(--bg-primary)', color: 'var(--text-primary)',
  };

  return (
    <div>
      <div className="admin-page-header">
        <h1>📊 Laporan &amp; Statistik</h1>
        <p>Pantau performa pengunjung, unduhan buku, dan peserta kegiatan SiPena.</p>
      </div>

      {/* ── FILTER GLOBAL ── */}
      <div style={{
        background: 'white', borderRadius: 'var(--radius-lg)', padding: '1rem 1.5rem',
        boxShadow: 'var(--shadow-sm)', marginBottom: '1.5rem',
        display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>🔍 Filter Periode:</span>
          <select style={inputStyle} value={filterTahun} onChange={e => setFilterTahun(Number(e.target.value))}>
            {TAHUN_LIST.map(y => <option key={y} value={y}>Tahun {y}</option>)}
          </select>
          <select style={inputStyle} value={filterBulan} onChange={e => setFilterBulan(e.target.value)}>
            {BULAN_LIST.map(b => <option key={b} value={b}>{b === 'Semua' ? 'Semua Bulan' : b}</option>)}
          </select>
          <span style={{
            background: '#eff6ff', color: '#1d4ed8', padding: '0.3rem 0.75rem',
            borderRadius: '999px', fontSize: '0.78rem', fontWeight: 700
          }}>📅 {periodLabel}</span>
        </div>
        <button onClick={unduhSemua} className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileDown size={16} /> Unduh Semua (CSV)
        </button>
      </div>

      {/* ── KARTU RINGKASAN ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <StatCard icon="👁️" label={`Pengunjung — ${periodLabel}`}
          value={totalPengunjung.toLocaleString('id-ID')} sub="↑ Data kunjungan website" color="#2563eb" />
        <StatCard icon="📥" label={`Unduhan — ${periodLabel}`}
          value={totalUnduhan.toLocaleString('id-ID')} sub="↑ Total unduhan buku" color="#10b981" />
        <StatCard icon="📚" label="Total Buku Terdaftar"
          value={TOP_BUKU.length + '+'} sub="Buku aktif di katalog" color="#8b5cf6" />
        <StatCard icon="👥" label="Peserta Kegiatan"
          value={totalPeserta.toLocaleString('id-ID')} sub={`Dari ${events.length} kegiatan`} color="#f59e0b" />
      </div>

      {/* ── GRAFIK PENGUNJUNG ── */}
      <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
        <div className="admin-card-header">
          <span className="admin-card-title">📈 Tren Pengunjung — {periodLabel}</span>
          <button onClick={unduhPengunjung} className="btn btn-outline"
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <FileDown size={14} /> Unduh CSV
          </button>
        </div>
        <div style={{ padding: '0.5rem 1rem 1rem' }}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="bulan" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                tickFormatter={v => v >= 1000 ? (v/1000).toFixed(1)+'k' : v} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
              <Bar dataKey="Pengunjung" fill="#2563eb" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── GRAFIK UNDUHAN ── */}
      <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
        <div className="admin-card-header">
          <span className="admin-card-title">📥 Tren Unduhan Buku — {periodLabel}</span>
          <button onClick={unduhUnduhan} className="btn btn-outline"
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <FileDown size={14} /> Unduh CSV
          </button>
        </div>
        <div style={{ padding: '0.5rem 1rem 1rem' }}>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="bulan" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                tickFormatter={v => v >= 1000 ? (v/1000).toFixed(1)+'k' : v} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
              <Line dataKey="Unduhan" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: '#10b981' }}
                activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── TOP 10 BUKU TERPOPULER ── */}
      <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
        <div className="admin-card-header">
          <span className="admin-card-title">🏆 Top 10 Buku Paling Banyak Diunduh</span>
          <button onClick={unduhBukuPopuler} className="btn btn-outline"
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <FileDown size={14} /> Unduh CSV
          </button>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>#</th><th>Judul Buku</th><th>Kategori</th><th>Total Unduhan</th><th>Proporsi</th></tr>
            </thead>
            <tbody>
              {TOP_BUKU.map((b, i) => (
                <tr key={i}>
                  <td>
                    <span style={{
                      width: 26, height: 26, borderRadius: '50%',
                      background: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#b45309' : 'var(--bg-primary)',
                      color: i < 3 ? 'white' : 'var(--text-secondary)',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.75rem', fontWeight: 700, border: i >= 3 ? '1px solid var(--border-color)' : 'none'
                    }}>{i + 1}</span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{b.judul}</td>
                  <td><span className="badge badge-gray">{b.kategori}</span></td>
                  <td style={{ fontWeight: 700, color: 'var(--accent-color)' }}>{b.unduhan.toLocaleString('id-ID')}</td>
                  <td style={{ minWidth: 140 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ flex: 1, background: 'var(--bg-primary)', borderRadius: 4, overflow: 'hidden', height: 6 }}>
                        <div style={{ width: `${(b.unduhan / TOP_BUKU[0].unduhan) * 100}%`, background: 'var(--accent-color)', height: '100%', transition: 'width 0.8s ease' }} />
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', minWidth: 36 }}>
                        {Math.round((b.unduhan / TOP_BUKU[0].unduhan) * 100)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── LAPORAN PESERTA KEGIATAN ── */}
      <div className="admin-card">
        <div className="admin-card-header">
          <span className="admin-card-title">📅 Ringkasan Peserta Kegiatan</span>
          <button onClick={unduhPeserta} className="btn btn-outline"
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <FileDown size={14} /> Unduh CSV
          </button>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>#</th><th>Judul Kegiatan</th><th>Tanggal</th><th>Lokasi</th><th>Daftar</th><th>Hadir</th><th>Kehadiran</th></tr>
            </thead>
            <tbody>
              {events.length === 0
                ? <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '2rem' }}>Belum ada data kegiatan.</td></tr>
                : events.map((ev, i) => {
                  const listPeserta = peserta[ev.id] || [];
                  const totalDaftar = listPeserta.length;
                  const totalHadir  = listPeserta.filter(p => p.status === 'Hadir').length;
                  const pct = totalDaftar > 0 ? Math.round((totalHadir / totalDaftar) * 100) : 0;
                  return (
                    <tr key={ev.id}>
                      <td style={{ color: 'var(--text-tertiary)' }}>{i + 1}</td>
                      <td style={{ fontWeight: 600 }}>{ev.judul}</td>
                      <td>{new Date(ev.tanggal).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' })}</td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{ev.lokasi}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{totalDaftar}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#16a34a' }}>{totalHadir}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ flex: 1, background: 'var(--bg-primary)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, background: '#16a34a', height: '100%' }} />
                          </div>
                          <span style={{ fontSize: '0.75rem', minWidth: 32, color: 'var(--text-secondary)' }}>{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminLaporan;
