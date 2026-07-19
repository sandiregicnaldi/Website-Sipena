# Product Requirements Document (PRD): SiPena (Sistem Informasi Penerbitan)

## 1. Pendahuluan
**Nama Produk:** SiPena (Sistem Informasi Penerbitan)
**Klien/Pemilik:** Perpusnas Press - Perpustakaan Nasional RI
**Tujuan:** Membangun platform digital terpadu yang menghubungkan penulis, pembaca, dan pengelola penerbitan Perpusnas Press. Sistem ini bertujuan untuk mendigitalisasi proses pengajuan naskah, pengelolaan katalog buku, serta memfasilitasi akses bacaan bagi masyarakat luas.

## 2. Target Pengguna & Peran (Roles)
Sistem memiliki beberapa tingkat akses (Role) dengan hak dan fungsionalitas yang berbeda:

1. **Pengunjung (Pembaca):** Pengguna umum yang dapat mencari, melihat, dan mengunduh buku (publik) serta mendaftar ke sistem.
2. **Calon Penulis:** Pengguna yang sedang dalam tahap pengajuan karya atau pendaftaran awal sebelum diverifikasi oleh admin.
3. **Penulis:** Pengguna terverifikasi yang memiliki karya di Perpusnas Press. Memiliki akses ke *Dashboard Penulis* untuk mengelola profil dan melihat karyanya.
4. **Pegawai:** Staf internal Perpusnas Press dengan akses khusus (fungsionalitas akan disesuaikan lebih lanjut).
5. **Administrator (Admin & Pengelola Konten):** Pengelola sistem utama yang memiliki akses penuh ke *Admin Dashboard* untuk mengelola pengguna, buku, kegiatan, laporan, dan konten web.

## 3. Fitur Utama (Functional Requirements)

### 3.1. Halaman Publik (Front-End)
- **Beranda (Home):** Menampilkan *hero banner*, slider buku terbaru, penulis unggulan, dan statistik singkat.
- **Katalog Buku:** Menampilkan daftar buku yang dapat di-*filter* dan dicari.
- **Detail Buku:** Menampilkan sinopsis, detail teknis (ISBN, halaman, dll), status terbit, dan tombol unduh/baca. Terdapat juga slider "Buku Terkait".
- **Katalog Penulis:** Menampilkan daftar penulis terverifikasi yang bekerja sama dengan Perpusnas Press.
- **Profil Penulis:** Menampilkan biodata penulis dan daftar karya yang telah diterbitkan.
- **Kegiatan (Event):** Menampilkan daftar seminar, *workshop*, atau peluncuran buku.
- **Tentang Kami & FAQ:** Menampilkan informasi lembaga, sejarah, tim, serta pusat bantuan interaktif.
- **Autentikasi (Login & Register):**
  - Login terpusat berdasarkan email dan kata sandi.
  - Form registrasi dinamis dengan isian wilayah Indonesia (Provinsi, Kota, Kecamatan, Kelurahan) yang terintegrasi dengan API Wilayah.

### 3.2. Dashboard Penulis (Author Area)
- **Profil Saya:** Manajemen data diri penulis, bio, dan daftar keahlian.
- **Karya Saya:** Menampilkan rekapitulasi naskah yang diajukan dan buku yang sudah terbit.

### 3.3. Dashboard Admin (Back-End)
- **Beranda Admin:** Ringkasan statistik (total buku, unduhan, pengunjung), grafik tren SVG interaktif, dan tabel aktivitas terbaru.
- **Manajemen Katalog Buku:** Tambah, edit, dan hapus data buku serta kategorinya.
- **Manajemen Pengguna:** Pembagian tabel berdasarkan tab (*Penulis, Calon Penulis, Pengunjung, Pegawai*). Admin dapat menyetujui "Calon Penulis" menjadi "Penulis".
- **Manajemen Kegiatan:** Pengelolaan *event* yang tampil di halaman publik.
- **Manajemen Konten Web:** Pengaturan dinamis untuk *Banner/Hero*, *Tentang Kami*, dan *FAQ*.
- **Laporan & Statistik:** Menampilkan *bar chart* performa unduhan dan kunjungan, serta *top-5* buku terpopuler.
- **Pengaturan:** Pengelolaan profil admin dan akun sistem lainnya.

## 4. Kebutuhan Non-Fungsional (Non-Functional Requirements)
- **Tech Stack:** 
  - Frontend: React.js (Vite), React Router DOM, Vanilla CSS (tanpa framework eksternal untuk kontrol desain penuh).
  - Ikonografi: SVG murni dan *Lucide React*.
- **Desain & UI/UX:** 
  - Mengusung tema modern, *clean*, dengan skema warna kebiruan institusional yang dipadukan dengan aksen cerah.
  - Responsif di berbagai ukuran layar (*mobile*, *tablet*, desktop).
  - Terdapat mikro-animasi pada saat *hover* kartu, tombol, dan slider.
- **Kinerja (Performance):** Render cepat melalui navigasi berbasis *Single Page Application* (SPA).

## 5. Rencana Pengembangan Selanjutnya (Future Backlog)
1. Integrasi dengan sistem *Backend* (Node.js/PHP/Python) dan *Database* (MySQL/PostgreSQL) untuk menggantikan *mock-data*.
2. Fitur pengajuan naskah (*submission system*) dan *tracking* status naskah oleh calon penulis.
3. Notifikasi email otomatis saat pendaftaran atau perubahan status naskah.

---
*Catatan: PRD ini merupakan dokumen hidup (living document) yang dapat diperbarui seiring berjalannya proses pengembangan proyek.*
