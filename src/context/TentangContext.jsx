import React, { createContext, useContext, useState } from 'react';

const TentangContext = createContext(null);

const DEFAULT_DATA = {
  // ── Hero ──────────────────────────────────────────────────────────────────
  heroJudul: 'Perpusnas Press —',
  heroSubjudul: 'Penerbit Resmi Perpustakaan Nasional RI',
  heroDeskripsi: 'Kami hadir untuk menerbitkan, mendistribusikan, dan melestarikan karya-karya ilmiah, budaya, dan literasi terbaik bangsa Indonesia demi mencerdaskan kehidupan masyarakat.',

  // ── Visi & Misi ───────────────────────────────────────────────────────────
  visi: 'Menjadi lembaga penerbitan terdepan dan terpercaya yang berkontribusi nyata bagi kemajuan literasi dan kebudayaan bangsa Indonesia.',
  misi: [
    'Menerbitkan karya ilmiah, budaya, dan literasi berkualitas tinggi.',
    'Memperluas akses masyarakat terhadap koleksi penerbitan nasional.',
    'Mendukung pengembangan ekosistem penulis dan peneliti Indonesia.',
    'Memanfaatkan teknologi untuk distribusi konten yang efisien dan inklusif.',
  ],

  // ── Statistik ─────────────────────────────────────────────────────────────
  statistik: [
    { label: 'Judul Buku Diterbitkan', value: '1.290+' },
    { label: 'Penulis Aktif',          value: '187'    },
    { label: 'Laporan & Dokumen',      value: '54'     },
    { label: 'Unduhan Tahun Ini',      value: '14.8k'  },
  ],

  // ── Timeline Sejarah ──────────────────────────────────────────────────────
  timeline: [
    { tahun: '1980', judul: 'Pendirian Perpusnas Press',   deskripsi: 'Lembaga penerbitan resmi didirikan sebagai bagian dari Perpustakaan Nasional RI untuk menerbitkan karya-karya ilmiah dan literasi kebangsaan.' },
    { tahun: '1995', judul: 'Ekspansi Koleksi Digital',    deskripsi: 'Mulai mengembangkan koleksi digital dan perpustakaan elektronik untuk menjangkau pembaca yang lebih luas di seluruh nusantara.' },
    { tahun: '2010', judul: 'Peluncuran Platform Online',  deskripsi: 'Meluncurkan portal digital pertama yang memungkinkan unduhan dokumen secara online bagi masyarakat Indonesia.' },
    { tahun: '2020', judul: 'Transformasi Digital SiPena', deskripsi: 'Memperkenalkan Sistem Informasi Penerbitan (SiPena) sebagai platform terintegrasi untuk pengelolaan buku, penulis, dan distribusi konten.' },
    { tahun: '2026', judul: 'Ekosistem Penulis & Pembaca', deskripsi: 'SiPena kini menjadi ekosistem lengkap yang menghubungkan penulis, editor, dan pembaca dalam satu platform yang modern dan inklusif.' },
  ],

  // ── Tim ───────────────────────────────────────────────────────────────────
  tim: [
    { nama: 'Dr. Hendra Kurniawan',       jabatan: 'Kepala Perpusnas Press',    inisial: 'HK' },
    { nama: 'Dra. Siti Rahayuningsih',    jabatan: 'Kepala Bidang Penerbitan',  inisial: 'SR' },
    { nama: 'Ahmad Fauzan, M.Kom',        jabatan: 'Kepala Bidang Teknologi',   inisial: 'AF' },
    { nama: 'Rina Dewi Kartika, S.Sos',   jabatan: 'Kepala Bidang Distribusi',  inisial: 'RD' },
  ],

  // ── Kontak ────────────────────────────────────────────────────────────────
  alamat:     'Perpusnas Press, Perpustakaan Nasional RI\nJl. Salemba Raya No. 28A, Jakarta Pusat 10430',
  telepon:    '(021) 3922749, 3154864',
  fax:        '(021) 3101472',
  email:      'press@perpusnas.go.id',
  emailSipena:'sipena@perpusnas.go.id',
  jamLayanan: 'Senin – Jumat: 08.00 – 16.00 WIB\nSabtu – Minggu: Tutup',
};

export const TentangProvider = ({ children }) => {
  const [data, setData] = useState(DEFAULT_DATA);

  const updateData = (partial) => setData(prev => ({ ...prev, ...partial }));

  // Helper update list-based fields
  const updateListItem  = (key, index, newItem) =>
    setData(prev => ({ ...prev, [key]: prev[key].map((it, i) => i === index ? { ...it, ...newItem } : it) }));
  const addListItem     = (key, newItem) =>
    setData(prev => ({ ...prev, [key]: [...prev[key], newItem] }));
  const removeListItem  = (key, index) =>
    setData(prev => ({ ...prev, [key]: prev[key].filter((_, i) => i !== index) }));

  return (
    <TentangContext.Provider value={{ data, updateData, updateListItem, addListItem, removeListItem }}>
      {children}
    </TentangContext.Provider>
  );
};

export const useTentang = () => {
  const ctx = useContext(TentangContext);
  if (!ctx) throw new Error('useTentang must be used within TentangProvider');
  return ctx;
};
