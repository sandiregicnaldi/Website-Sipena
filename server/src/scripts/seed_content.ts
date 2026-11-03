import { db } from '../db';
import { appSettings } from '../db/schema';

// Import from frontend defaults
const TENTANG_DEFAULT = {
  heroJudul: 'Perpusnas Press —',
  heroSubjudul: 'Penerbit Resmi Perpustakaan Nasional RI',
  heroDeskripsi: 'Kami hadir untuk menerbitkan, mendistribusikan, dan melestarikan karya-karya ilmiah, budaya, dan literasi terbaik bangsa Indonesia demi mencerdaskan kehidupan masyarakat.',
  visi: 'Menjadi lembaga penerbitan terdepan dan terpercaya yang berkontribusi nyata bagi kemajuan literasi dan kebudayaan bangsa Indonesia.',
  misi: [
    'Menerbitkan karya ilmiah, budaya, dan literasi berkualitas tinggi.',
    'Memperluas akses masyarakat terhadap koleksi penerbitan nasional.',
    'Mendukung pengembangan ekosistem penulis dan peneliti Indonesia.',
    'Memanfaatkan teknologi untuk distribusi konten yang efisien dan inklusif.',
  ],
  statistik: [
    { label: 'Judul Buku Diterbitkan', value: '1.290+' },
    { label: 'Penulis Aktif',          value: '187'    },
    { label: 'Laporan & Dokumen',      value: '54'     },
    { label: 'Unduhan Tahun Ini',      value: '14.8k'  },
  ],
  timeline: [
    { tahun: '1980', judul: 'Pendirian Perpusnas Press',   deskripsi: 'Lembaga penerbitan resmi didirikan sebagai bagian dari Perpustakaan Nasional RI untuk menerbitkan karya-karya ilmiah dan literasi kebangsaan.' },
    { tahun: '1995', judul: 'Ekspansi Koleksi Digital',    deskripsi: 'Mulai mengembangkan koleksi digital dan perpustakaan elektronik untuk menjangkau pembaca yang lebih luas di seluruh nusantara.' },
    { tahun: '2010', judul: 'Peluncuran Platform Online',  deskripsi: 'Meluncurkan portal digital pertama yang memungkinkan unduhan dokumen secara online bagi masyarakat Indonesia.' },
    { tahun: '2020', judul: 'Transformasi Digital SiPena', deskripsi: 'Memperkenalkan Sistem Informasi Penerbitan (SiPena) sebagai platform terintegrasi untuk pengelolaan buku, penulis, dan distribusi konten.' },
    { tahun: '2026', judul: 'Ekosistem Penulis & Pembaca', deskripsi: 'SiPena kini menjadi ekosistem lengkap yang menghubungkan penulis, editor, dan pembaca dalam satu platform yang modern dan inklusif.' },
  ],
  tim: [
    { nama: 'Dr. Hendra Kurniawan',       jabatan: 'Kepala Perpusnas Press',    inisial: 'HK' },
    { nama: 'Dra. Siti Rahayuningsih',    jabatan: 'Kepala Bidang Penerbitan',  inisial: 'SR' },
    { nama: 'Ahmad Fauzan, M.Kom',        jabatan: 'Kepala Bidang Teknologi',   inisial: 'AF' },
    { nama: 'Rina Dewi Kartika, S.Sos',   jabatan: 'Kepala Bidang Distribusi',  inisial: 'RD' },
  ],
  alamat:     'Perpusnas Press, Perpustakaan Nasional RI\nJl. Salemba Raya No. 28A, Jakarta Pusat 10430',
  telepon:    '(021) 3922749, 3154864',
  fax:        '(021) 3101472',
  email:      'press@perpusnas.go.id',
  emailSipena:'sipena@perpusnas.go.id',
  jamLayanan: 'Senin – Jumat: 08.00 – 16.00 WIB\nSabtu – Minggu: Tutup',
};

const PANDUAN_DEFAULT = {
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

const FAQ_DEFAULT = [
  {
    id: 1,
    kategori: 'Pendaftaran & Akun',
    pertanyaan: 'Bagaimana cara mendaftar sebagai penulis di SiPena?',
    jawaban: 'Klik tombol "Masuk / Daftar" di pojok kanan atas, pilih tab "Daftar", lalu pilih peran "Penulis". Isi formulir dengan data diri yang lengkap dan valid. Setelah mendaftar, Anda dapat langsung mengakses halaman Profil Saya untuk melengkapi profil penulis.'
  },
  {
    id: 2,
    kategori: 'Pendaftaran & Akun',
    pertanyaan: 'Apa perbedaan antara Penulis dan Calon Penulis?',
    jawaban: '"Calon Penulis" adalah akun untuk Anda yang sedang dalam proses pengajuan naskah atau verifikasi. Setelah naskah disetujui dan diverifikasi oleh editor, akun Anda akan ditingkatkan menjadi "Penulis" dengan akses penuh ke fitur profil penulis.'
  },
  {
    id: 3,
    kategori: 'Pendaftaran & Akun',
    pertanyaan: 'Lupa kata sandi, bagaimana cara meresetnya?',
    jawaban: 'Pada halaman login, klik tautan "Lupa Kata Sandi". Masukkan email yang terdaftar, dan kami akan mengirimkan tautan reset ke email Anda dalam beberapa menit. Pastikan memeriksa folder spam jika email tidak ditemukan di kotak masuk.'
  },
  {
    id: 4,
    kategori: 'Penerbitan Buku',
    pertanyaan: 'Bagaimana prosedur pengajuan naskah ke Perpusnas Press?',
    jawaban: 'Prosedur pengajuan naskah meliputi: (1) Login sebagai Calon Penulis, (2) Unggah naskah dalam format yang ditentukan (DOC/DOCX/PDF), (3) Tim editor akan melakukan telaah awal dalam 5-7 hari kerja, (4) Jika lolos seleksi awal, naskah akan masuk proses review lebih lanjut, (5) Keputusan akhir disampaikan melalui email.'
  },
  {
    id: 5,
    kategori: 'Penerbitan Buku',
    pertanyaan: 'Berapa lama proses penerbitan berlangsung?',
    jawaban: 'Proses penerbitan secara keseluruhan berlangsung sekitar 3-6 bulan, tergantung kompleksitas naskah. Proses ini meliputi: seleksi naskah (1-2 minggu), review isi (4-8 minggu), editing & layout (4-6 minggu), serta proses cetak dan distribusi (2-4 minggu).'
  },
  {
    id: 6,
    kategori: 'Penerbitan Buku',
    pertanyaan: 'Apakah saya akan mendapatkan royalti dari buku yang diterbitkan?',
    jawaban: 'Ketentuan royalti diatur dalam perjanjian penerbitan yang ditandatangani antara penulis dan Perpusnas Press. Besaran royalti dan mekanisme pembayaran akan dijelaskan secara rinci oleh tim editor setelah naskah diterima untuk diterbitkan.'
  },
  {
    id: 7,
    kategori: 'Penerbitan Buku',
    pertanyaan: 'Format naskah apa yang diterima oleh Perpusnas Press?',
    jawaban: 'Perpusnas Press menerima naskah dalam format Microsoft Word (.doc/.docx) dengan ketentuan: ukuran kertas A4, font Times New Roman 12pt, spasi 1.5, margin 3cm di semua sisi. Detail panduan penulisan lengkap tersedia di bagian Layanan Penerbitan.'
  },
  {
    id: 8,
    kategori: 'Koleksi & Unduhan',
    pertanyaan: 'Apakah semua buku dapat diunduh secara gratis?',
    jawaban: 'Sebagian besar koleksi Perpusnas Press dapat diunduh secara gratis oleh masyarakat umum. Beberapa publikasi khusus mungkin memerlukan login atau proses pendaftaran terlebih dahulu. Informasi ketersediaan unduhan tertera di halaman detail setiap buku.'
  },
  {
    id: 9,
    kategori: 'Koleksi & Unduhan',
    pertanyaan: 'Format apa saja yang tersedia untuk unduhan?',
    jawaban: 'Koleksi tersedia dalam format PDF untuk dokumen lengkap. Beberapa publikasi juga tersedia dalam format ePub untuk kemudahan membaca di perangkat mobile. Format yang tersedia akan ditampilkan di halaman detail buku.'
  },
  {
    id: 10,
    kategori: 'Koleksi & Unduhan',
    pertanyaan: 'Bisakah saya menggunakan materi dari koleksi Perpusnas Press untuk keperluan penelitian?',
    jawaban: 'Ya, koleksi Perpusnas Press dapat digunakan untuk keperluan pendidikan, penelitian, dan non-komersial dengan mencantumkan sumber yang benar. Penggunaan untuk keperluan komersial memerlukan izin tertulis dari Perpusnas Press.'
  },
  {
    id: 11,
    kategori: 'Teknis & Sistem',
    pertanyaan: 'Browser apa yang direkomendasikan untuk menggunakan SiPena?',
    jawaban: 'SiPena dapat diakses melalui browser modern seperti Google Chrome (versi 90+), Mozilla Firefox (versi 88+), Microsoft Edge (versi 90+), dan Safari (versi 14+). Pastikan browser Anda selalu diperbarui untuk pengalaman terbaik.'
  },
  {
    id: 12,
    kategori: 'Teknis & Sistem',
    pertanyaan: 'Apa yang harus dilakukan jika mengalami masalah teknis?',
    jawaban: 'Jika mengalami masalah teknis, coba langkah berikut: (1) Refresh halaman, (2) Bersihkan cache browser, (3) Coba browser lain. Jika masalah berlanjut, hubungi tim teknis kami melalui email sipena@perpusnas.go.id dengan menyertakan screenshot dan deskripsi masalah.'
  }
];

async function seed() {
  console.log("Seeding default settings into app_settings...");
  await db.insert(appSettings).values({
    key: 'tentang_kami',
    value: TENTANG_DEFAULT
  }).onConflictDoUpdate({
    target: appSettings.key,
    set: { value: TENTANG_DEFAULT, updatedAt: new Date() }
  });

  await db.insert(appSettings).values({
    key: 'panduan_penerbitan',
    value: PANDUAN_DEFAULT
  }).onConflictDoUpdate({
    target: appSettings.key,
    set: { value: PANDUAN_DEFAULT, updatedAt: new Date() }
  });

  await db.insert(appSettings).values({
    key: 'faq_data',
    value: FAQ_DEFAULT
  }).onConflictDoUpdate({
    target: appSettings.key,
    set: { value: FAQ_DEFAULT, updatedAt: new Date() }
  });

  console.log("Seeding completed successfully!");
}

seed().catch(console.error);
