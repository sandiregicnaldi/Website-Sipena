import React, { createContext, useContext, useState } from 'react';

const PanduanContext = createContext(null);

const DEFAULT_DATA = {
  heroJudul: 'Terbitkan Karya Anda Bersama Perpusnas Press',
  heroDeskripsi:
    'Perpusnas Press adalah penerbit resmi di bawah Perpustakaan Nasional RI yang telah menerbitkan ribuan judul buku berkualitas. Kami membuka kesempatan bagi penulis terbaik Indonesia untuk menerbitkan karyanya secara profesional dan terpercaya.',

  langkah: [
    {
      id: 1,
      icon: 'FileText',
      judul: 'Persiapkan Naskah',
      deskripsi:
        'Siapkan naskah lengkap yang sudah diedit dan diproofread. Pastikan naskah memenuhi ketentuan: minimal 80 halaman A5, format .docx atau .pdf, dan disertai sinopsis singkat (max. 300 kata).',
    },
    {
      id: 2,
      icon: 'Upload',
      judul: 'Ajukan Naskah Online',
      deskripsi:
        'Login ke sistem SiPena dan unggah naskah Anda melalui menu "Terbitkan Buku". Lengkapi formulir pengajuan meliputi data penulis, kategori buku, dan kata kunci.',
    },
    {
      id: 3,
      icon: 'ClipboardCheck',
      judul: 'Seleksi & Review Editorial',
      deskripsi:
        'Tim editorial Perpusnas Press akan meninjau naskah Anda dalam waktu 30–60 hari kerja. Anda akan dihubungi jika naskah lolos seleksi awal untuk proses review lebih lanjut.',
    },
    {
      id: 4,
      icon: 'MessageSquare',
      judul: 'Revisi & Penyempurnaan',
      deskripsi:
        'Jika diperlukan, editor kami akan memberikan catatan revisi. Proses ini bisa berlangsung 1–3 putaran untuk memastikan kualitas naskah memenuhi standar penerbitan.',
    },
    {
      id: 5,
      icon: 'BookOpen',
      judul: 'Proses Produksi Buku',
      deskripsi:
        'Setelah naskah disetujui, tim desain kami akan mengerjakan tata letak, desain sampul, dan proofreading akhir. Anda akan mendapat preview sebelum cetak final.',
    },
    {
      id: 6,
      icon: 'Package',
      judul: 'Penerbitan & Distribusi',
      deskripsi:
        'Buku diterbitkan dengan ISBN resmi dari Perpusnas RI dan didistribusikan ke perpustakaan-perpustakaan di seluruh Indonesia serta tersedia dalam versi digital di platform SiPena.',
    },
  ],

  keuntungan: [
    {
      id: 1,
      icon: 'Award',
      warna: '#2563eb',
      judul: 'Legalitas & Kredibilitas Tinggi',
      deskripsi:
        'Buku Anda mendapat ISBN resmi dari Perpustakaan Nasional RI dan dicatat dalam katalog nasional, meningkatkan kredibilitas karya di mata pembaca dan institusi.',
    },
    {
      id: 2,
      icon: 'Globe',
      warna: '#059669',
      judul: 'Distribusi Nasional',
      deskripsi:
        'Karya Anda didistribusikan ke lebih dari 500 perpustakaan daerah dan instansi pemerintah di seluruh Indonesia, menjangkau jutaan pembaca potensial.',
    },
    {
      id: 3,
      icon: 'BarChart2',
      warna: '#d97706',
      judul: 'Dukungan Promosi & Marketing',
      deskripsi:
        'Tim promosi kami aktif mempublikasikan buku Anda melalui website resmi, media sosial, pameran buku nasional, dan acara-acara literasi terkemuka.',
    },
    {
      id: 4,
      icon: 'DollarSign',
      warna: '#7c3aed',
      judul: 'Royalti Kompetitif',
      deskripsi:
        'Penulis mendapatkan royalti yang kompetitif sesuai kontrak. Laporan penjualan dan royalti dapat diakses secara transparan melalui dashboard penulis di SiPena.',
    },
    {
      id: 5,
      icon: 'Users',
      warna: '#db2777',
      judul: 'Jaringan Komunitas Penulis',
      deskripsi:
        'Bergabunglah dengan komunitas penulis Perpusnas Press dan dapatkan akses ke seminar, workshop kepenulisan, dan program pengembangan kompetensi penulis.',
    },
    {
      id: 6,
      icon: 'Shield',
      warna: '#0891b2',
      judul: 'Perlindungan Hak Cipta',
      deskripsi:
        'Perpusnas Press membantu proses pencatatan hak cipta karya Anda ke Ditjen Kekayaan Intelektual, memberikan perlindungan hukum atas karya intelektual Anda.',
    },
  ],
};

export const PanduanProvider = ({ children }) => {
  const [data, setData] = useState(DEFAULT_DATA);
  const updateData = (partial) => setData((prev) => ({ ...prev, ...partial }));
  return (
    <PanduanContext.Provider value={{ data, setData, updateData }}>
      {children}
    </PanduanContext.Provider>
  );
};

export const usePanduan = () => {
  const ctx = useContext(PanduanContext);
  if (!ctx) throw new Error('usePanduan must be used inside PanduanProvider');
  return ctx;
};
