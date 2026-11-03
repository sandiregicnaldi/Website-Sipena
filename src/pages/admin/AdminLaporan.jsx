import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import * as XLSX from 'xlsx';
import {
  BarChart2, FileSpreadsheet, Download, Eye, BookOpen, Users,
  TrendingUp, Award, Calendar, Search, RefreshCw, CheckCircle2,
  Clock, AlertTriangle, Layers, Filter, Check, ExternalLink,
  ChevronRight, FileText, ArrowUpRight, ShieldCheck, UserCheck, Sparkles, Loader2
} from 'lucide-react';
import { SipenaAPI } from '../../lib/api';
import AdminPagination from '../../components/AdminPagination';
import './AdminLayout.css';

// ─── Toast Component ────────────────────────────────────────────────────────
const Toast = ({ msg, onClose }) => (
  <div style={{
    position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999,
    background: '#0f172a', color: 'white', padding: '1rem 1.5rem',
    borderRadius: '0.75rem', boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
    display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '280px'
  }}>
    <CheckCircle2 size={18} color="#10b981" />
    <span style={{ flex: 1, fontSize: '0.9rem' }}>{msg}</span>
    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.1rem' }}>×</button>
  </div>
);

// ─── Tooltip Kustom Recharts ────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#0f172a', color: 'white', padding: '0.75rem 1rem',
      borderRadius: '0.5rem', fontSize: '0.82rem', boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
      border: '1px solid #334155'
    }}>
      <div style={{ fontWeight: 700, marginBottom: '0.35rem', color: '#cbd5e1' }}>Bulan: {label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <span>{p.name}:</span>
          <strong style={{ color: '#fff' }}>{p.value.toLocaleString('id-ID')} kali</strong>
        </div>
      ))}
    </div>
  );
};

// ─── Stat Card Component ─────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, sub, color, borderTop = true }) => (
  <div style={{
    background: 'white', borderRadius: 'var(--radius-lg)', padding: '1.25rem 1.5rem',
    boxShadow: 'var(--shadow-sm)',
    borderTop: borderTop ? `4px solid ${color}` : '1px solid var(--border-color)',
    borderLeft: !borderTop ? `4px solid ${color}` : undefined,
    display: 'flex', alignItems: 'center', gap: '1.25rem',
    transition: 'transform 0.2s, box-shadow 0.2s',
  }}>
    <div style={{
      width: '46px', height: '46px', borderRadius: '12px',
      background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0
    }}>{icon}</div>
    <div style={{ overflow: 'hidden' }}>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.15, marginTop: '0.15rem' }}>{value}</div>
      {sub && <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{sub}</div>}
    </div>
  </div>
);

// ─── Helper Unduh Spreadsheet & CSV ─────────────────────────────────────────
const exportToExcel = (fileName, sheets) => {
  const wb = XLSX.utils.book_new();
  sheets.forEach(({ name, data }) => {
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
  });
  XLSX.writeFile(wb, `${fileName}.xlsx`);
};

const exportToCSV = (fileName, headers, rows) => {
  const csvContent = [headers, ...rows]
    .map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${fileName}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function AdminLaporan() {
  const [activeTab, setActiveTab] = useState('overview');
  const [filterTahun, setFilterTahun] = useState(2026);
  const [filterBulan, setFilterBulan] = useState('Semua');
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [toast, setToast] = useState('');

  // Search & Pagination per Tab
  const [searchBuku, setSearchBuku] = useState('');
  const [pageBuku, setPageBuku] = useState(1);
  const [pageSizeBuku, setPageSizeBuku] = useState(10);

  const [naskahSubTab, setNaskahSubTab] = useState('proyek'); // 'proyek' | 'pengajuan'
  const [searchNaskah, setSearchNaskah] = useState('');
  const [pageNaskah, setPageNaskah] = useState(1);
  const [pageSizeNaskah, setPageSizeNaskah] = useState(10);

  const [penggunaSubTab, setPenggunaSubTab] = useState('aktif'); // 'aktif' | 'penulis' | 'semua'
  const [searchPengguna, setSearchPengguna] = useState('');
  const [pagePengguna, setPagePengguna] = useState(1);
  const [pageSizePengguna, setPageSizePengguna] = useState(10);

  const [searchKegiatan, setSearchKegiatan] = useState('');
  const [pageKegiatan, setPageKegiatan] = useState(1);
  const [pageSizeKegiatan, setPageSizeKegiatan] = useState(10);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  // ── Ambil Data Laporan Terpadu dari Server ──
  const fetchReport = useCallback(async (year) => {
    try {
      setLoading(true);
      const res = await SipenaAPI.getComprehensiveReports({ year });
      if (res && res.overview) {
        setReport(res);
      }
    } catch (err) {
      console.error("Gagal mengambil data laporan dari server:", err);
      showToast("Gagal memuat laporan dari database. Menggunakan data cadangan sistem.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport(filterTahun);
  }, [fetchReport, filterTahun]);

  const availableYears = report?.availableYears || [2026, 2025, 2024, 2023, 2022];
  const BULAN_NAMES = ['Semua', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  // ── Filter Chart Bulanan ──
  const chartData = useMemo(() => {
    if (!report?.katalogBuku?.monthlyTrends) return [];
    const trends = report.katalogBuku.monthlyTrends;
    if (filterBulan === 'Semua') {
      return trends.map(t => ({
        bulan: t.month,
        Dibaca: t.dibaca,
        Diunduh: t.diunduh,
      }));
    }
    const filtered = trends.find(t => t.month.toLowerCase() === filterBulan.toLowerCase());
    return filtered ? [{ bulan: filtered.month, Dibaca: filtered.dibaca, Diunduh: filtered.diunduh }] : [];
  }, [report, filterBulan]);

  // ── FILTER DATA BUKU ──
  const filteredBukuList = useMemo(() => {
    const list = report?.katalogBuku?.bukuList || [];
    if (!searchBuku.trim()) return list;
    const q = searchBuku.toLowerCase();
    return list.filter(b =>
      b.judul?.toLowerCase().includes(q) ||
      b.penulis?.toLowerCase().includes(q) ||
      b.kategori?.toLowerCase().includes(q) ||
      b.isbn?.toLowerCase().includes(q)
    );
  }, [report, searchBuku]);

  const pagedBuku = useMemo(() => {
    const start = (pageBuku - 1) * pageSizeBuku;
    return filteredBukuList.slice(start, start + pageSizeBuku);
  }, [filteredBukuList, pageBuku, pageSizeBuku]);

  // ── FILTER DATA NASKAH ──
  const filteredProyekList = useMemo(() => {
    const list = report?.manajemenNaskah?.proyekList || [];
    if (!searchNaskah.trim()) return list;
    const q = searchNaskah.toLowerCase();
    return list.filter(p =>
      p.judul?.toLowerCase().includes(q) ||
      p.penulis?.toLowerCase().includes(q) ||
      p.kategori?.toLowerCase().includes(q) ||
      p.pjNama?.toLowerCase().includes(q)
    );
  }, [report, searchNaskah]);

  const filteredPengajuanList = useMemo(() => {
    const list = report?.manajemenNaskah?.pengajuanList || [];
    if (!searchNaskah.trim()) return list;
    const q = searchNaskah.toLowerCase();
    return list.filter(m =>
      m.judul?.toLowerCase().includes(q) ||
      m.penulisNama?.toLowerCase().includes(q) ||
      m.penulisEmail?.toLowerCase().includes(q) ||
      m.kategori?.toLowerCase().includes(q)
    );
  }, [report, searchNaskah]);

  const currentNaskahList = naskahSubTab === 'proyek' ? filteredProyekList : filteredPengajuanList;
  const pagedNaskah = useMemo(() => {
    const start = (pageNaskah - 1) * pageSizeNaskah;
    return currentNaskahList.slice(start, start + pageSizeNaskah);
  }, [currentNaskahList, pageNaskah, pageSizeNaskah]);

  // ── FILTER DATA PENGGUNA ──
  const filteredActiveUsers = useMemo(() => {
    const list = report?.pengguna?.topActiveUsers || [];
    if (!searchPengguna.trim()) return list;
    const q = searchPengguna.toLowerCase();
    return list.filter(u => u.nama?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.role?.toLowerCase().includes(q));
  }, [report, searchPengguna]);

  const filteredPenulis = useMemo(() => {
    const list = report?.pengguna?.penulisList || [];
    if (!searchPengguna.trim()) return list;
    const q = searchPengguna.toLowerCase();
    return list.filter(p => p.nama?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q) || p.profesi?.toLowerCase().includes(q) || p.domisili?.toLowerCase().includes(q));
  }, [report, searchPengguna]);

  const filteredRecentUsers = useMemo(() => {
    const list = report?.pengguna?.recentUsers || [];
    if (!searchPengguna.trim()) return list;
    const q = searchPengguna.toLowerCase();
    return list.filter(u => u.nama?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.role?.toLowerCase().includes(q));
  }, [report, searchPengguna]);

  const currentPenggunaList = penggunaSubTab === 'aktif' ? filteredActiveUsers : penggunaSubTab === 'penulis' ? filteredPenulis : filteredRecentUsers;
  const pagedPengguna = useMemo(() => {
    const start = (pagePengguna - 1) * pageSizePengguna;
    return currentPenggunaList.slice(start, start + pageSizePengguna);
  }, [currentPenggunaList, pagePengguna, pageSizePengguna]);

  // ── FILTER DATA KEGIATAN ──
  const filteredKegiatan = useMemo(() => {
    const list = report?.kegiatan?.kegiatanList || [];
    if (!searchKegiatan.trim()) return list;
    const q = searchKegiatan.toLowerCase();
    return list.filter(k => k.judul?.toLowerCase().includes(q) || k.lokasi?.toLowerCase().includes(q) || k.status?.toLowerCase().includes(q));
  }, [report, searchKegiatan]);

  const pagedKegiatan = useMemo(() => {
    const start = (pageKegiatan - 1) * pageSizeKegiatan;
    return filteredKegiatan.slice(start, start + pageSizeKegiatan);
  }, [filteredKegiatan, pageKegiatan, pageSizeKegiatan]);

  // ── EKSPOR LAPORAN KOMPREHENSIF (MULTI-SHEET EXCEL) ──
  const handleExportFullExcel = () => {
    if (!report) return;
    const overviewSheet = [
      { Metrik: 'Tahun Laporan', Nilai: filterTahun },
      { Metrik: 'Total Judul Buku Terbit', Nilai: report.overview.totalBukuTerbit },
      { Metrik: 'Total Proyek Naskah Penerbitan', Nilai: report.overview.totalProyekNaskah },
      { Metrik: 'Total Pengguna Terdaftar', Nilai: report.overview.totalPengguna },
      { Metrik: 'Total Kegiatan Literasi / Acara', Nilai: report.overview.totalKegiatan },
      { Metrik: 'Total Unduhan Buku Keseluruhan', Nilai: report.overview.totalUnduhan },
      { Metrik: 'Total Pembaca Buku', Nilai: report.overview.totalPembaca },
      { Metrik: 'Total Naskah Masuk dari Penulis', Nilai: report.overview.totalNaskahMasuk },
      { Metrik: 'Total Sertifikat Resmi Diterbitkan', Nilai: report.overview.totalSertifikatDiterbitkan },
    ];

    const bukuSheet = (report.katalogBuku?.bukuList || []).map(b => ({
      No: b.no,
      'Judul Buku': b.judul,
      Penulis: b.penulis,
      Kategori: b.kategori,
      Tahun: b.tahun || '-',
      ISBN: b.isbn,
      NIP: b.nip,
      'Total Unduhan': b.unduhan,
      'Total Pembaca': b.pembaca,
      'Rating Rata-rata': b.ratingAvg,
      Status: b.status,
    }));

    const proyekSheet = (report.manajemenNaskah?.proyekList || []).map(p => ({
      No: p.no,
      'ID Proyek': p.id,
      'Judul Naskah': p.judul,
      Penulis: p.penulis,
      Kategori: p.kategori,
      Tipe: p.tipe,
      'Progress (%)': p.progress,
      'Tahap Terkini': p.tahapTerkini,
      'Penanggung Jawab (PJ)': p.pjNama,
      Deadline: p.deadline ? new Date(p.deadline).toLocaleDateString('id-ID') : '-',
      'Status Keterlambatan': p.isOverdue ? 'Terlambat' : 'Tepat Waktu',
      'Status Proyek': p.status,
    }));

    const penggunaSheet = (report.pengguna?.topActiveUsers || []).map((u, i) => ({
      Ranking: i + 1,
      Nama: u.nama,
      Email: u.email,
      Peran: u.role,
      'Buku Dibaca': u.bukuDibaca,
      'Buku Diunduh': u.bukuDiunduh,
      'Frekuensi Login': u.loginCount,
      'Skor Aktivitas': u.totalAktivitas,
      'Terakhir Aktif': u.terakhirAktif ? new Date(u.terakhirAktif).toLocaleString('id-ID') : '-',
    }));

    const kegiatanSheet = (report.kegiatan?.kegiatanList || []).map(k => ({
      No: k.no,
      'Judul Kegiatan': k.judul,
      Tanggal: new Date(k.tanggal).toLocaleDateString('id-ID'),
      Lokasi: k.lokasi,
      Tipe: k.tipe,
      'Peserta Terdaftar': k.totalPeserta,
      'Sertifikat Diklaim': k.totalHadir,
      'Persentase Kehadiran': `${k.persentaseHadir}%`,
      'Token Sertifikat': k.token,
      'Status Acara': k.status,
    }));

    exportToExcel(`Laporan_Lengkap_SiPena_${filterTahun}`, [
      { name: 'Ringkasan Eksekutif', data: overviewSheet },
      { name: 'Katalog Buku', data: bukuSheet },
      { name: 'Proyek Naskah', data: proyekSheet },
      { name: 'Pengguna Aktif', data: penggunaSheet },
      { name: 'Kegiatan & Peserta', data: kegiatanSheet },
    ]);
    showToast(`Laporan komprehensif tahun ${filterTahun} berhasil diekspor ke Excel (.xlsx)!`);
  };

  const inputStyle = {
    padding: '0.5rem 0.85rem', border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-md)', fontSize: '0.85rem',
    background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none'
  };

  return (
    <div>
      {toast && <Toast msg={toast} onClose={() => setToast('')} />}

      {/* ── HEADER HALAMAN ── */}
      <div className="admin-page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart2 size={24} color="var(--accent-color)" /> Pusat Laporan &amp; Analisis Data SiPena
            </h1>
            <p>Laporan komprehensif terintegrasi data riil dari Katalog Buku, Manajemen Naskah, Pengguna Sistem, dan Kegiatan Acara.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => fetchReport(filterTahun)}
              className="btn btn-outline"
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
            >
              <RefreshCw size={14} className={loading ? "spin" : ""} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              Segarkan
            </button>
            <button
              onClick={handleExportFullExcel}
              className="btn btn-primary"
              disabled={loading || !report}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
            >
              <FileSpreadsheet size={16} /> Unduh Laporan Lengkap (Excel .xlsx)
            </button>
          </div>
        </div>
      </div>

      {/* ── GLOBAL FILTER & TABS ── */}
      <div style={{
        background: 'white', borderRadius: 'var(--radius-lg)', padding: '1rem 1.5rem',
        boxShadow: 'var(--shadow-sm)', marginBottom: '1.5rem',
        display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between'
      }}>
        {/* TAB BUTTONS */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {[
            { id: 'overview', label: 'Ringkasan Eksekutif', icon: <Layers size={15} /> },
            { id: 'buku', label: 'Katalog Buku', icon: <BookOpen size={15} /> },
            { id: 'naskah', label: 'Manajemen Naskah', icon: <FileText size={15} /> },
            { id: 'pengguna', label: 'Pengguna & Penulis', icon: <Users size={15} /> },
            { id: 'kegiatan', label: 'Kegiatan & Sertifikat', icon: <Calendar size={15} /> },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`btn ${activeTab === t.id ? 'btn-primary' : 'btn-outline'}`}
              style={{
                borderRadius: '2rem', padding: '0.45rem 1rem', fontSize: '0.82rem',
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                fontWeight: activeTab === t.id ? 700 : 500
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* PERIODE FILTER */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <Filter size={14} /> Periode:
          </span>
          <select style={inputStyle} value={filterTahun} onChange={e => setFilterTahun(Number(e.target.value))}>
            {availableYears.map(y => <option key={y} value={y}>Tahun {y}</option>)}
          </select>
          <select style={inputStyle} value={filterBulan} onChange={e => setFilterBulan(e.target.value)}>
            {BULAN_NAMES.map(b => <option key={b} value={b}>{b === 'Semua' ? 'Semua Bulan' : `Bulan ${b}`}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="admin-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <Loader2 size={32} className="spin" style={{ margin: '0 auto 1rem', animation: 'spin 1s linear infinite', color: 'var(--accent-color)' }} />
          <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Menghimpun laporan terpadu dari database...</p>
        </div>
      ) : !report ? (
        <div className="admin-card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <AlertTriangle size={32} color="#f59e0b" style={{ margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Data laporan belum dapat dimuat. Pastikan server backend sedang aktif.</p>
          <button onClick={() => fetchReport(filterTahun)} className="btn btn-outline" style={{ marginTop: '1rem' }}>Coba Lagi</button>
        </div>
      ) : (
        <>
          {/* ════════════════════════════════════════════════════════════════
              TAB 1: RINGKASAN EKSEKUTIF (EXECUTIVE OVERVIEW)
             ════════════════════════════════════════════════════════════════ */}
          {activeTab === 'overview' && (
            <div>
              {/* 4 Kartu KPI Utama Pilar */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                <StatCard icon={<BookOpen size={22} color="#2563eb" />} label="Katalog Buku Terbit" value={report.overview.totalBukuTerbit} sub="Buku aktif di SiPena" color="#2563eb" />
                <StatCard icon={<Layers size={22} color="#0891b2" />} label="Proyek Naskah Berjalan" value={report.overview.totalProyekNaskah} sub="Alur editorial & produksi" color="#0891b2" />
                <StatCard icon={<Users size={22} color="#8b5cf6" />} label="Total Pengguna Terdaftar" value={report.overview.totalPengguna} sub="Penulis, staf, pembaca" color="#8b5cf6" />
                <StatCard icon={<Award size={22} color="#f59e0b" />} label="Peserta Kegiatan Literasi" value={report.overview.totalKegiatan} sub={`${report.overview.totalSertifikatDiterbitkan} sertifikat terbit`} color="#f59e0b" />
              </div>

              {/* 4 Kartu Metrik Sekunder */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <StatCard icon={<Eye size={20} color="#0284c7" />} label="Total Pembaca Buku" value={report.overview.totalPembaca.toLocaleString('id-ID')} sub="Frekuensi baca digital" color="#0284c7" borderTop={false} />
                <StatCard icon={<Download size={20} color="#16a34a" />} label="Total Unduhan PDF/EPUB" value={report.overview.totalUnduhan.toLocaleString('id-ID')} sub="Buku diunduh pengguna" color="#16a34a" borderTop={false} />
                <StatCard icon={<FileText size={20} color="#ea580c" />} label="Naskah Masuk dari Penulis" value={report.overview.totalNaskahMasuk} sub="Diajukan melalui web" color="#ea580c" borderTop={false} />
                <StatCard icon={<ShieldCheck size={20} color="#6366f1" />} label="Sertifikat Resmi Diklaim" value={report.overview.totalSertifikatDiterbitkan} sub="Nomor SIPENA terverifikasi" color="#6366f1" borderTop={false} />
              </div>

              {/* Grafik Tren Bulanan Performa Baca vs Unduh */}
              <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
                <div className="admin-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="admin-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <TrendingUp size={16} /> Tren Interaksi Pembaca &amp; Pengunduh ({filterTahun})
                  </span>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {filterBulan === 'Semua' ? '12 Bulan Kalender' : `Bulan ${filterBulan}`}
                  </div>
                </div>
                <div style={{ padding: '1rem 1rem 0.5rem' }}>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="bulan" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: '0.8rem', paddingTop: '0.5rem' }} />
                      <Bar dataKey="Dibaca" fill="#0284c7" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Diunduh" fill="#2563eb" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Rangkuman Cepat 4 Pilar (2 Kolom Berdampingan) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem' }}>
                {/* 5 Top Buku */}
                <div className="admin-card">
                  <div className="admin-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="admin-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Award size={16} color="#f59e0b" /> Top Buku Terpopuler
                    </span>
                    <button onClick={() => setActiveTab('buku')} style={{ background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>Lihat Semua →</button>
                  </div>
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead><tr><th>#</th><th>Judul</th><th>Kategori</th><th>Unduhan</th><th>Dibaca</th></tr></thead>
                      <tbody>
                        {report.katalogBuku.topBuku.slice(0, 5).map((b, i) => (
                          <tr key={b.id || i}>
                            <td><strong>#{i + 1}</strong></td>
                            <td style={{ fontWeight: 600 }}>{b.judul}</td>
                            <td><span className="badge badge-gray">{b.kategori}</span></td>
                            <td style={{ color: '#2563eb', fontWeight: 700 }}>{b.unduhan.toLocaleString('id-ID')}</td>
                            <td style={{ color: '#0284c7', fontWeight: 700 }}>{b.pembaca.toLocaleString('id-ID')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 5 Proyek Naskah Berjalan */}
                <div className="admin-card">
                  <div className="admin-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="admin-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Layers size={16} color="#0891b2" /> Naskah Editorial Berjalan
                    </span>
                    <button onClick={() => setActiveTab('naskah')} style={{ background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>Lihat Semua →</button>
                  </div>
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead><tr><th>Naskah</th><th>Tahap Terkini</th><th>Progress</th><th>PJ</th></tr></thead>
                      <tbody>
                        {report.manajemenNaskah.proyekList.slice(0, 5).map((p, i) => (
                          <tr key={p.id || i}>
                            <td style={{ fontWeight: 600 }}>{p.judul}</td>
                            <td><span className="badge badge-blue">{p.tahapTerkini}</span></td>
                            <td style={{ minWidth: 100 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <div style={{ flex: 1, background: '#e2e8f0', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                                  <div style={{ width: `${p.progress}%`, background: p.progress === 100 ? '#10b981' : '#2563eb', height: '100%' }} />
                                </div>
                                <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{p.progress}%</span>
                              </div>
                            </td>
                            <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{p.pjNama}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              TAB 2: KATALOG BUKU
             ════════════════════════════════════════════════════════════════ */}
          {activeTab === 'buku' && (
            <div>
              {/* Kategori Breakdown Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                {report.katalogBuku.kategoriStats.slice(0, 5).map((cat, idx) => (
                  <div key={idx} style={{ background: 'white', padding: '1rem 1.25rem', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{cat.kategori}</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.2rem' }}>{cat.totalJudul} Judul</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
                      <span>📥 {cat.totalUnduh} Unduh</span>
                      <span>👁️ {cat.totalBaca} Baca</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tabel Top 10 Buku */}
              <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
                <div className="admin-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="admin-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Award size={16} color="#f59e0b" /> Top 10 Buku Paling Banyak Diminati
                  </span>
                  <button
                    onClick={() => {
                      exportToExcel(`Top10_Buku_${filterTahun}`, [{
                        name: 'Top Buku',
                        data: report.katalogBuku.topBuku.map(b => ({
                          Peringkat: b.rank,
                          'Judul Buku': b.judul,
                          Penulis: b.penulis,
                          Kategori: b.kategori,
                          'Total Unduhan': b.unduhan,
                          'Total Pembaca': b.pembaca,
                          Rating: b.ratingAvg,
                        }))
                      }]);
                      showToast('Daftar Top 10 Buku berhasil diekspor!');
                    }}
                    className="btn btn-outline"
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <Download size={13} /> Ekspor Top 10
                  </button>
                </div>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead><tr><th>#</th><th>Judul Buku</th><th>Penulis</th><th>Kategori</th><th>Unduhan</th><th>Dibaca</th><th>Rating</th><th>Proporsi Minat</th></tr></thead>
                    <tbody>
                      {report.katalogBuku.topBuku.map((b, i) => {
                        const maxVal = (report.katalogBuku.topBuku[0]?.unduhan || 1) + (report.katalogBuku.topBuku[0]?.pembaca || 1);
                        const currVal = (b.unduhan + b.pembaca);
                        const pct = Math.round((currVal / maxVal) * 100);
                        return (
                          <tr key={b.id || i}>
                            <td>
                              <span style={{
                                width: 26, height: 26, borderRadius: '50%',
                                background: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#b45309' : '#f1f5f9',
                                color: i < 3 ? 'white' : '#475569',
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.75rem', fontWeight: 800
                              }}>{i + 1}</span>
                            </td>
                            <td style={{ fontWeight: 600 }}>{b.judul}</td>
                            <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{b.penulis}</td>
                            <td><span className="badge badge-gray">{b.kategori}</span></td>
                            <td style={{ fontWeight: 700, color: '#2563eb' }}>{b.unduhan.toLocaleString('id-ID')}</td>
                            <td style={{ fontWeight: 700, color: '#0284c7' }}>{b.pembaca.toLocaleString('id-ID')}</td>
                            <td>⭐ {b.ratingAvg ? b.ratingAvg.toFixed(1) : '5.0'}</td>
                            <td style={{ minWidth: 120 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <div style={{ flex: 1, background: '#e2e8f0', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                                  <div style={{ width: `${pct}%`, background: 'var(--accent-color)', height: '100%' }} />
                                </div>
                                <span style={{ fontSize: '0.72rem', color: '#64748b', minWidth: 30 }}>{pct}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tabel Lengkap Seluruh Katalog Buku */}
              <div className="admin-card">
                <div className="admin-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <span className="admin-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <BookOpen size={16} /> Seluruh Data Buku Terdaftar ({filteredBukuList.length} judul)
                  </span>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <div style={{ position: 'relative' }}>
                      <Search size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                      <input
                        type="text"
                        placeholder="Cari judul, penulis, ISBN..."
                        value={searchBuku}
                        onChange={e => { setSearchBuku(e.target.value); setPageBuku(1); }}
                        style={{ ...inputStyle, paddingLeft: '2rem', width: '220px' }}
                      />
                    </div>
                    <button
                      onClick={() => {
                        exportToExcel(`Katalog_Buku_${filterTahun}`, [{
                          name: 'Katalog Buku',
                          data: filteredBukuList.map(b => ({
                            No: b.no,
                            Judul: b.judul,
                            Penulis: b.penulis,
                            Kategori: b.kategori,
                            Tahun: b.tahun || '-',
                            ISBN: b.isbn,
                            NIP: b.nip,
                            Unduhan: b.unduhan,
                            Dibaca: b.pembaca,
                            Status: b.status,
                          }))
                        }]);
                        showToast('Data katalog buku berhasil diekspor ke Excel!');
                      }}
                      className="btn btn-outline"
                      style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <Download size={13} /> Ekspor Excel
                    </button>
                  </div>
                </div>

                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead><tr><th>#</th><th>Sampul</th><th>Judul &amp; Penulis</th><th>Kategori</th><th>Tahun</th><th>ISBN / NIP</th><th>Unduhan</th><th>Dibaca</th><th>Status</th></tr></thead>
                    <tbody>
                      {pagedBuku.length === 0 ? (
                        <tr><td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Tidak ada buku yang sesuai dengan pencarian.</td></tr>
                      ) : pagedBuku.map((b) => (
                        <tr key={b.id}>
                          <td style={{ color: '#94a3b8' }}>{b.no}</td>
                          <td style={{ width: 44 }}>
                            {b.coverUrl ? (
                              <img src={b.coverUrl} alt="Cover" style={{ width: 32, height: 44, objectFit: 'cover', borderRadius: 4, border: '1px solid #cbd5e1' }} />
                            ) : (
                              <div style={{ width: 32, height: 44, borderRadius: 4, background: '#1e3a8a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.55rem' }}>Buku</div>
                            )}
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{b.judul}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Oleh: {b.penulis}</div>
                          </td>
                          <td><span className="badge badge-gray">{b.kategori}</span></td>
                          <td>{b.tahun || '-'}</td>
                          <td style={{ fontSize: '0.78rem' }}>
                            <div>ISBN: {b.isbn}</div>
                            {b.nip && b.nip !== '-' && <div style={{ color: '#0284c7' }}>NIP: {b.nip}</div>}
                          </td>
                          <td style={{ fontWeight: 700, color: '#2563eb' }}>{b.unduhan.toLocaleString('id-ID')}</td>
                          <td style={{ fontWeight: 700, color: '#0284c7' }}>{b.pembaca.toLocaleString('id-ID')}</td>
                          <td><span className="badge badge-green">{b.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <AdminPagination
                  currentPage={pageBuku}
                  totalItems={filteredBukuList.length}
                  pageSize={pageSizeBuku}
                  onPageChange={setPageBuku}
                  onPageSizeChange={setPageSizeBuku}
                  itemName="buku"
                />
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              TAB 3: MANAJEMEN NASKAH
             ════════════════════════════════════════════════════════════════ */}
          {activeTab === 'naskah' && (
            <div>
              {/* Metrik Alur Naskah */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <StatCard icon={<Layers size={20} color="#0891b2" />} label="Total Proyek Naskah" value={report.manajemenNaskah.totalProyek} sub="Seluruh naskah editorial" color="#0891b2" />
                <StatCard icon={<Clock size={20} color="#2563eb" />} label="Naskah Dalam Proses" value={report.manajemenNaskah.proyekAktif} sub="Sedang dikerjakan tim" color="#2563eb" />
                <StatCard icon={<CheckCircle2 size={20} color="#16a34a" />} label="Naskah Selesai Terbit" value={report.manajemenNaskah.proyekSelesai} sub="Selesai seluruh tahapan" color="#16a34a" />
                <StatCard icon={<AlertTriangle size={20} color="#dc2626" />} label="Tahapan Terlambat" value={report.manajemenNaskah.proyekTerlambat} sub="Melewati batas deadline" color="#dc2626" />
                <StatCard icon={<FileText size={20} color="#ea580c" />} label="Pengajuan Penulis" value={report.manajemenNaskah.totalPengajuan} sub={`${report.manajemenNaskah.pengajuanPending} menunggu review`} color="#ea580c" />
              </div>

              {/* Tabel Switcher: Proyek vs Pengajuan Penulis */}
              <div className="admin-card">
                <div className="admin-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    <button
                      onClick={() => { setNaskahSubTab('proyek'); setPageNaskah(1); }}
                      className={`btn ${naskahSubTab === 'proyek' ? 'btn-primary' : 'btn-outline'}`}
                      style={{ fontSize: '0.8rem', padding: '0.35rem 0.85rem', borderRadius: '1.5rem' }}
                    >
                      Proyek Redaksi ({filteredProyekList.length})
                    </button>
                    <button
                      onClick={() => { setNaskahSubTab('pengajuan'); setPageNaskah(1); }}
                      className={`btn ${naskahSubTab === 'pengajuan' ? 'btn-primary' : 'btn-outline'}`}
                      style={{ fontSize: '0.8rem', padding: '0.35rem 0.85rem', borderRadius: '1.5rem' }}
                    >
                      Pengajuan Naskah Masuk ({filteredPengajuanList.length})
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <div style={{ position: 'relative' }}>
                      <Search size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                      <input
                        type="text"
                        placeholder="Cari naskah, penulis, PJ..."
                        value={searchNaskah}
                        onChange={e => { setSearchNaskah(e.target.value); setPageNaskah(1); }}
                        style={{ ...inputStyle, paddingLeft: '2rem', width: '220px' }}
                      />
                    </div>
                    <button
                      onClick={() => {
                        if (naskahSubTab === 'proyek') {
                          exportToExcel(`Laporan_Proyek_Naskah_${filterTahun}`, [{
                            name: 'Proyek Naskah',
                            data: filteredProyekList.map(p => ({
                              No: p.no,
                              'ID Proyek': p.id,
                              'Judul Naskah': p.judul,
                              Penulis: p.penulis,
                              Kategori: p.kategori,
                              Tipe: p.tipe,
                              'Progress (%)': p.progress,
                              'Tahap Terkini': p.tahapTerkini,
                              'PJ': p.pjNama,
                              Deadline: p.deadline ? new Date(p.deadline).toLocaleDateString('id-ID') : '-',
                              Status: p.status,
                            }))
                          }]);
                        } else {
                          exportToExcel(`Laporan_Pengajuan_Penulis_${filterTahun}`, [{
                            name: 'Pengajuan Naskah',
                            data: filteredPengajuanList.map(m => ({
                              No: m.no,
                              'Judul Naskah': m.judul,
                              Penulis: m.penulisNama,
                              Email: m.penulisEmail,
                              Kategori: m.kategori,
                              Status: m.status,
                              'Tanggal Masuk': new Date(m.createdAt).toLocaleDateString('id-ID'),
                            }))
                          }]);
                        }
                        showToast(`Data ${naskahSubTab === 'proyek' ? 'proyek naskah' : 'pengajuan naskah'} berhasil diekspor!`);
                      }}
                      className="btn btn-outline"
                      style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <Download size={13} /> Ekspor Excel
                    </button>
                  </div>
                </div>

                <div className="admin-table-wrap">
                  {naskahSubTab === 'proyek' ? (
                    <table className="admin-table">
                      <thead><tr><th>#</th><th>ID</th><th>Judul Naskah</th><th>Penulis</th><th>Kategori</th><th>Progress</th><th>Tahap Terkini</th><th>PJ</th><th>Deadline</th><th>Status</th></tr></thead>
                      <tbody>
                        {pagedNaskah.length === 0 ? (
                          <tr><td colSpan={10} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Tidak ada proyek naskah yang cocok.</td></tr>
                        ) : pagedNaskah.map((p) => (
                          <tr key={p.id}>
                            <td style={{ color: '#94a3b8' }}>{p.no}</td>
                            <td style={{ fontSize: '0.78rem', fontFamily: 'monospace', color: '#64748b' }}>{p.id}</td>
                            <td style={{ fontWeight: 600 }}>{p.judul}</td>
                            <td style={{ fontSize: '0.82rem' }}>{p.penulis}</td>
                            <td><span className="badge badge-gray">{p.kategori}</span></td>
                            <td style={{ minWidth: 100 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <div style={{ flex: 1, background: '#e2e8f0', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                                  <div style={{ width: `${p.progress}%`, background: p.progress === 100 ? '#10b981' : '#2563eb', height: '100%' }} />
                                </div>
                                <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{p.progress}%</span>
                              </div>
                            </td>
                            <td><span className="badge badge-blue">{p.tahapTerkini}</span></td>
                            <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{p.pjNama}</td>
                            <td style={{ fontSize: '0.82rem', color: p.isOverdue ? '#dc2626' : 'inherit', fontWeight: p.isOverdue ? 700 : 400 }}>
                              {p.deadline ? new Date(p.deadline).toLocaleDateString('id-ID') : '-'}
                              {p.isOverdue && <span style={{ display: 'block', fontSize: '0.7rem', color: '#dc2626' }}>⚠️ Terlambat</span>}
                            </td>
                            <td>
                              <span className={`badge ${p.status === 'selesai' ? 'badge-green' : p.isOverdue ? 'badge-red' : 'badge-blue'}`}>
                                {p.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <table className="admin-table">
                      <thead><tr><th>#</th><th>Judul Naskah</th><th>Pengirim Penulis</th><th>Email</th><th>Kategori</th><th>Tanggal Masuk</th><th>Status Review</th><th>Catatan</th></tr></thead>
                      <tbody>
                        {pagedNaskah.length === 0 ? (
                          <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Tidak ada pengajuan naskah luar.</td></tr>
                        ) : pagedNaskah.map((m) => (
                          <tr key={m.id}>
                            <td style={{ color: '#94a3b8' }}>{m.no}</td>
                            <td style={{ fontWeight: 600 }}>{m.judul}</td>
                            <td>{m.penulisNama}</td>
                            <td style={{ fontSize: '0.82rem', color: '#64748b' }}>{m.penulisEmail}</td>
                            <td><span className="badge badge-gray">{m.kategori}</span></td>
                            <td>{new Date(m.createdAt).toLocaleDateString('id-ID')}</td>
                            <td>
                              <span className={`badge ${m.status === 'approved' ? 'badge-green' : m.status === 'rejected' ? 'badge-red' : 'badge-amber'}`}>
                                {m.status === 'approved' ? 'Disetujui' : m.status === 'rejected' ? 'Ditolak' : 'Menunggu Review'}
                              </span>
                            </td>
                            <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', maxWidth: '200px' }}>{m.reviewerNotes || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <AdminPagination
                  currentPage={pageNaskah}
                  totalItems={currentNaskahList.length}
                  pageSize={pageSizeNaskah}
                  onPageChange={setPageNaskah}
                  onPageSizeChange={setPageSizeNaskah}
                  itemName="naskah"
                />
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              TAB 4: PENGGUNA SISTEM & PENULIS
             ════════════════════════════════════════════════════════════════ */}
          {activeTab === 'pengguna' && (
            <div>
              {/* Demografi Peran Pengguna */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                {report.pengguna.roleStats.map((r, i) => (
                  <div key={i} style={{ background: 'white', padding: '1rem 1.25rem', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{r.label}</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.2rem' }}>{r.count} Akun</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{r.percentage}% dari total pengguna</div>
                  </div>
                ))}
              </div>

              {/* Sub-tab Pengguna */}
              <div className="admin-card">
                <div className="admin-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    <button
                      onClick={() => { setPenggunaSubTab('aktif'); setPagePengguna(1); }}
                      className={`btn ${penggunaSubTab === 'aktif' ? 'btn-primary' : 'btn-outline'}`}
                      style={{ fontSize: '0.8rem', padding: '0.35rem 0.85rem', borderRadius: '1.5rem' }}
                    >
                      Pengguna Teraktif ({filteredActiveUsers.length})
                    </button>
                    <button
                      onClick={() => { setPenggunaSubTab('penulis'); setPagePengguna(1); }}
                      className={`btn ${penggunaSubTab === 'penulis' ? 'btn-primary' : 'btn-outline'}`}
                      style={{ fontSize: '0.8rem', padding: '0.35rem 0.85rem', borderRadius: '1.5rem' }}
                    >
                      Daftar Penulis Terdaftar ({filteredPenulis.length})
                    </button>
                    <button
                      onClick={() => { setPenggunaSubTab('semua'); setPagePengguna(1); }}
                      className={`btn ${penggunaSubTab === 'semua' ? 'btn-primary' : 'btn-outline'}`}
                      style={{ fontSize: '0.8rem', padding: '0.35rem 0.85rem', borderRadius: '1.5rem' }}
                    >
                      Pendaftar Terbaru ({filteredRecentUsers.length})
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <div style={{ position: 'relative' }}>
                      <Search size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                      <input
                        type="text"
                        placeholder="Cari pengguna, email, role..."
                        value={searchPengguna}
                        onChange={e => { setSearchPengguna(e.target.value); setPagePengguna(1); }}
                        style={{ ...inputStyle, paddingLeft: '2rem', width: '220px' }}
                      />
                    </div>
                    <button
                      onClick={() => {
                        exportToExcel(`Laporan_Pengguna_${filterTahun}`, [{
                          name: 'Data Pengguna',
                          data: currentPenggunaList.map((u, i) => ({
                            No: i + 1,
                            Nama: u.nama,
                            Email: u.email,
                            Peran: u.role || 'Penulis',
                            'Total Aktivitas': u.totalAktivitas ?? '-',
                            'Buku Dibaca': u.bukuDibaca ?? '-',
                            'Buku Diunduh': u.bukuDiunduh ?? '-',
                          }))
                        }]);
                        showToast('Data pengguna berhasil diekspor!');
                      }}
                      className="btn btn-outline"
                      style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <Download size={13} /> Ekspor Excel
                    </button>
                  </div>
                </div>

                <div className="admin-table-wrap">
                  {penggunaSubTab === 'aktif' ? (
                    <table className="admin-table">
                      <thead><tr><th>#</th><th>Pengguna</th><th>Peran</th><th>Buku Dibaca</th><th>Buku Diunduh</th><th>Kunjungan / Sesi</th><th>Skor Aktivitas</th><th>Terakhir Aktif</th></tr></thead>
                      <tbody>
                        {pagedPengguna.map((u, i) => (
                          <tr key={u.id || i}>
                            <td><strong>#{(pagePengguna - 1) * pageSizePengguna + i + 1}</strong></td>
                            <td>
                              <div style={{ fontWeight: 600 }}>{u.nama}</div>
                              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{u.email}</div>
                            </td>
                            <td><span className="badge badge-gray">{u.role}</span></td>
                            <td style={{ fontWeight: 700, color: '#0284c7' }}>{u.bukuDibaca}</td>
                            <td style={{ fontWeight: 700, color: '#2563eb' }}>{u.bukuDiunduh}</td>
                            <td>{u.loginCount} kali</td>
                            <td><span className="badge badge-blue">⚡ {u.totalAktivitas} poin</span></td>
                            <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                              {u.terakhirAktif ? new Date(u.terakhirAktif).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : penggunaSubTab === 'penulis' ? (
                    <table className="admin-table">
                      <thead><tr><th>#</th><th>Nama Penulis</th><th>Profesi / Tagline</th><th>Domisili</th><th>Total Buku Terbit</th><th>Status</th><th>Tanggal Gabung</th></tr></thead>
                      <tbody>
                        {pagedPengguna.map((p) => (
                          <tr key={p.id}>
                            <td style={{ color: '#94a3b8' }}>{p.no}</td>
                            <td>
                              <div style={{ fontWeight: 600 }}>{p.nama}</div>
                              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{p.email}</div>
                            </td>
                            <td style={{ fontSize: '0.82rem' }}>{p.profesi}</td>
                            <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{p.domisili}</td>
                            <td><strong style={{ color: 'var(--accent-color)' }}>{p.totalBukuTerbit}</strong> buku</td>
                            <td><span className="badge badge-green">{p.status}</span></td>
                            <td>{new Date(p.createdAt).toLocaleDateString('id-ID')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <table className="admin-table">
                      <thead><tr><th>#</th><th>Nama</th><th>Email</th><th>Peran Akun</th><th>Status</th><th>Tanggal Terdaftar</th></tr></thead>
                      <tbody>
                        {pagedPengguna.map((u, i) => (
                          <tr key={u.id || i}>
                            <td style={{ color: '#94a3b8' }}>{(pagePengguna - 1) * pageSizePengguna + i + 1}</td>
                            <td style={{ fontWeight: 600 }}>{u.nama}</td>
                            <td style={{ fontSize: '0.82rem', color: '#64748b' }}>{u.email}</td>
                            <td><span className="badge badge-blue">{u.role}</span></td>
                            <td><span className="badge badge-green">{u.status}</span></td>
                            <td>{new Date(u.createdAt).toLocaleDateString('id-ID')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <AdminPagination
                  currentPage={pagePengguna}
                  totalItems={currentPenggunaList.length}
                  pageSize={pageSizePengguna}
                  onPageChange={setPagePengguna}
                  onPageSizeChange={setPageSizePengguna}
                  itemName="pengguna"
                />
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              TAB 5: KEGIATAN & SERTIFIKAT
             ════════════════════════════════════════════════════════════════ */}
          {activeTab === 'kegiatan' && (
            <div>
              {/* Metrik Kegiatan */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <StatCard icon={<Calendar size={20} color="#f59e0b" />} label="Total Kegiatan Acara" value={report.kegiatan.totalKegiatan} sub="Webinar, workshop, bedah buku" color="#f59e0b" />
                <StatCard icon={<Users size={20} color="#2563eb" />} label="Peserta Terdaftar" value={report.kegiatan.totalPesertaTerdaftar} sub="Mendaftar sesi kegiatan" color="#2563eb" />
                <StatCard icon={<Award size={20} color="#16a34a" />} label="Sertifikat Resmi Diklaim" value={report.kegiatan.totalSertifikatKlaim} sub="Terhubung nomor seri SIPENA" color="#16a34a" />
                <StatCard icon={<Sparkles size={20} color="#8b5cf6" />} label="Rata-rata Partisipasi" value={`${report.kegiatan.rataRataKehadiran}%`} sub="Rasio klaim sertifikat" color="#8b5cf6" />
              </div>

              {/* Tabel Rekapitulasi Kegiatan */}
              <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
                <div className="admin-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <span className="admin-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Calendar size={16} /> Daftar Kegiatan &amp; Partisipasi Peserta
                  </span>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <div style={{ position: 'relative' }}>
                      <Search size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                      <input
                        type="text"
                        placeholder="Cari kegiatan, lokasi..."
                        value={searchKegiatan}
                        onChange={e => { setSearchKegiatan(e.target.value); setPageKegiatan(1); }}
                        style={{ ...inputStyle, paddingLeft: '2rem', width: '220px' }}
                      />
                    </div>
                    <button
                      onClick={() => {
                        exportToExcel(`Laporan_Kegiatan_${filterTahun}`, [{
                          name: 'Kegiatan Acara',
                          data: filteredKegiatan.map(k => ({
                            No: k.no,
                            'Judul Kegiatan': k.judul,
                            Tanggal: new Date(k.tanggal).toLocaleDateString('id-ID'),
                            Lokasi: k.lokasi,
                            Tipe: k.tipe,
                            'Peserta Terdaftar': k.totalPeserta,
                            'Sertifikat Diklaim': k.totalHadir,
                            'Kehadiran (%)': `${k.persentaseHadir}%`,
                            Token: k.token,
                            Status: k.status,
                          }))
                        }]);
                        showToast('Data kegiatan berhasil diekspor!');
                      }}
                      className="btn btn-outline"
                      style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <Download size={13} /> Ekspor Excel
                    </button>
                  </div>
                </div>

                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead><tr><th>#</th><th>Judul Acara</th><th>Tanggal Pelaksanaan</th><th>Lokasi / Mode</th><th>Token Sertifikat</th><th>Daftar</th><th>Klaim Sertifikat</th><th>Kehadiran</th><th>Status</th></tr></thead>
                    <tbody>
                      {pagedKegiatan.length === 0 ? (
                        <tr><td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Tidak ada kegiatan yang cocok.</td></tr>
                      ) : pagedKegiatan.map((k) => (
                        <tr key={k.id}>
                          <td style={{ color: '#94a3b8' }}>{k.no}</td>
                          <td style={{ fontWeight: 600 }}>{k.judul}</td>
                          <td>{new Date(k.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                          <td><span className="badge badge-gray">{k.tipe}</span></td>
                          <td><code style={{ background: '#f1f5f9', padding: '0.2rem 0.4rem', borderRadius: 4, fontSize: '0.75rem' }}>{k.token}</code></td>
                          <td style={{ textAlign: 'center', fontWeight: 700 }}>{k.totalPeserta}</td>
                          <td style={{ textAlign: 'center', fontWeight: 700, color: '#16a34a' }}>{k.totalHadir}</td>
                          <td style={{ minWidth: 110 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <div style={{ flex: 1, background: '#e2e8f0', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                                <div style={{ width: `${k.persentaseHadir}%`, background: '#16a34a', height: '100%' }} />
                              </div>
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, minWidth: 32 }}>{k.persentaseHadir}%</span>
                            </div>
                          </td>
                          <td>
                            <span className={`badge ${k.status === 'Akan Datang' ? 'badge-blue' : k.status === 'Segera' ? 'badge-amber' : 'badge-green'}`}>
                              {k.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <AdminPagination
                  currentPage={pageKegiatan}
                  totalItems={filteredKegiatan.length}
                  pageSize={pageSizeKegiatan}
                  onPageChange={setPageKegiatan}
                  onPageSizeChange={setPageSizeKegiatan}
                  itemName="kegiatan"
                />
              </div>

              {/* Log Klaim Sertifikat Terbaru */}
              <div className="admin-card">
                <div className="admin-card-header">
                  <span className="admin-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <ShieldCheck size={16} color="#16a34a" /> Log Penerbitan Nomor Sertifikat Terbaru
                  </span>
                </div>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead><tr><th>#</th><th>Nama Peserta</th><th>Instansi</th><th>Kegiatan</th><th>Nomor Sertifikat Resmi</th><th>Waktu Klaim</th></tr></thead>
                    <tbody>
                      {report.kegiatan.pesertaTerbaru.length === 0 ? (
                        <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Belum ada log klaim sertifikat.</td></tr>
                      ) : report.kegiatan.pesertaTerbaru.map((p, i) => (
                        <tr key={p.id || i}>
                          <td style={{ color: '#94a3b8' }}>{i + 1}</td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{p.namaPeserta}</div>
                            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{p.email}</div>
                          </td>
                          <td style={{ fontSize: '0.82rem' }}>{p.instansi}</td>
                          <td style={{ fontSize: '0.85rem' }}>{p.kegiatanJudul}</td>
                          <td><span className="badge badge-green" style={{ fontFamily: 'monospace' }}>{p.nomorSertifikat}</span></td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {new Date(p.waktuKlaim).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
