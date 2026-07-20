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
4. **Pegawai / Staf Internal:** Staf internal Perpusnas Press yang dapat *login* ke sistem. Pegawai bertindak sebagai administrator (admin dan pengelola konten) dan memiliki akses penuh ke Panel Admin.
5. **Administrator (Admin & Pengelola Konten):** Pengelola sistem utama (termasuk peran *Pegawai*) yang memiliki akses penuh ke *Admin Dashboard* untuk mengelola pengguna, buku, kegiatan, laporan, konten web, dan manajemen penerbitan.

## 3. Fitur Utama & Alur Navigasi (Functional Requirements)

### 3.1. Halaman Publik (Front-End)
*Catatan: Navigasi utama tersedia di Header (Menu "Home", "Buku", "Penulis", "Kegiatan", "Tentang", "FAQ") dan akan berpindah ke halaman masing-masing jika diklik.*

- **Beranda (Home):** Menampilkan *hero banner*, slider buku terbaru, penulis unggulan, dan statistik singkat.
  - *Tombol "Jelajahi Koleksi":* Mengarah ke halaman Katalog Buku (`/buku`).
  - *Tombol "Lihat Semua Buku":* Mengarah ke halaman Katalog Buku (`/buku`).
  - *Tombol "Lihat Semua Penulis":* Mengarah ke halaman Katalog Penulis (`/penulis`).
- **Katalog Buku:** Menampilkan daftar buku yang dapat di-*filter* dan dicari.
  - *Klik pada Kartu Buku:* Mengarah ke halaman Detail Buku (`/buku/:id`).
- **Detail Buku:** Menampilkan sinopsis, detail teknis (ISBN, halaman, dll), status terbit, dan tombol aksi. Terdapat juga slider "Buku Terkait".
  - *Pemutar Video (Audiobook/Trailer):* Pemutar media terintegrasi bagi pembaca untuk menonton trailer buku atau memutar file audiobook.
  - *Tombol "Unduh E-Book" / "Baca Sekarang":* Memicu pengunduhan dokumen PDF/E-Pub.
- **Katalog Penulis:** Menampilkan daftar penulis terverifikasi yang bekerja sama dengan Perpusnas Press.
  - *Klik pada Profil Penulis:* Mengarah ke halaman Profil Penulis (`/penulis/:id`).
- **Profil Penulis:** Menampilkan biodata penulis dan daftar karya yang telah diterbitkan.
  - *Tombol "Akses Buku" / "Lihat Buku":* Tautan pada setiap karya yang mengarah ke halaman Detail Buku terkait (`/buku/:id`).
- **Kegiatan (Event):** Menampilkan daftar seminar, *workshop*, atau peluncuran buku.
  - *Tombol "Daftar Sekarang":* Memicu pendaftaran peserta kegiatan (mengarah ke detail kegiatan `/event/:id`).
- **Tentang Kami & FAQ:** Menampilkan informasi lembaga, sejarah, tim, serta pusat bantuan interaktif.
- **Autentikasi (Login & Register):**
  - *Tombol "Masuk":* Melakukan otentikasi. Jika berhasil, Pengunjung/Penulis diarahkan kembali ke beranda/sebelumnya, sedangkan Admin/Pegawai diarahkan ke Panel Admin (`/admin`).
  - *Tombol "Daftar":* Pendaftaran akun dengan peran Pengunjung, Penulis, Calon Penulis, atau Pegawai.

### 3.2. Dashboard Penulis & Calon Penulis (User Area)
- **Profil Saya:** Manajemen bio, daftar keahlian, dan portofolio web (Data statis dasar seperti Nama dan Lokasi otomatis tersinkronisasi dari registrasi). Tersedia untuk semua peran non-admin.
- **Naskah Saya:** Formulir untuk mengajukan draf naskah baru yang dilengkapi dengan unggahan tautan *Google Drive*, serta tabel pemantauan status naskah (Menunggu Review, Ditolak dengan alasan, Disetujui). Tersedia untuk semua peran non-admin.
- **Karya Eksternal:** Menampilkan rekapitulasi buku yang sudah terbit di penerbit lain. (Khusus untuk *role* Penulis yang telah diverifikasi).

### 3.3. Dashboard Admin (Back-End)
- **Beranda Admin:** Ringkasan statistik (total buku, unduhan, pengunjung), grafik tren SVG interaktif, dan tabel aktivitas terbaru.
- **Manajemen Katalog Buku:** Tambah, edit, dan hapus data buku serta kategorinya.
- **Manajemen Pengguna:** Pembagian tabel berdasarkan tab (*Penulis, Calon Penulis, Pengunjung, Pegawai*). Admin dapat menyetujui "Calon Penulis" menjadi "Penulis".
- **Manajemen Kegiatan:** Pengelolaan *event* yang tampil di halaman publik.
- **Manajemen Naskah:** Tabel pengajuan naskah dari calon penulis. Admin dapat meninjau, "Menolak" (dengan mencantumkan alasan), atau "Menyetujui" naskah. Naskah yang disetujui akan memunculkan tombol sekunder "Buat Proyek" yang mengarah ke form proyek di `https://manajemen-penerbitan.perpusnas.go.id/projects/new`.
- **Manajemen Konten Web:** Pengaturan dinamis untuk *Banner/Hero*, *Tentang Kami*, dan *FAQ*.
- **Laporan & Statistik:** Menampilkan *bar chart* performa unduhan dan kunjungan, serta *top-5* buku terpopuler.
- **Pengaturan:** Pengelolaan profil admin dan akun sistem lainnya.
- **Manajemen Penerbitan:** (Menu Sidebar Khusus) Tautan integrasi (*external link*) menuju ke aplikasi website monitoring proyek penerbitan: `https://manajemen-penerbitan.perpusnas.go.id/`.

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
4. Menyatukan arsitektur aplikasi (alamat IP dan domain) antara aplikasi website `SiPena` dan aplikasi `Manajemen Penerbitan` (sebagai arsitektur *micro-frontend* atau integrasi server/reverse-proxy).

---
*Catatan: PRD ini merupakan dokumen hidup (living document) yang dapat diperbarui seiring berjalannya proses pengembangan proyek.*
