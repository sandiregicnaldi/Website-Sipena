# Dokumentasi Pengembangan SiPena & Manajemen Penerbitan

Dokumentasi lengkap dan kronologi pengembangan sistem SiPena serta integrasi Manajemen Penerbitan tersedia pada file utama:
👉 **[DOKUMENTASI_PENGEMBANGAN.md](./DOKUMENTASI_PENGEMBANGAN.md)**

---

## Ringkasan Bab Dokumentasi

1. **Bab 1 - 7**: Arsitektur Awal, Setup Lingkungan, & Skema Basis Data PostgreSQL.
2. **Bab 8 - 14**: Integrasi Ruang Kerja Manajemen Penerbitan (`/admin/manajemen/*`) ke dalam SiPena.
3. **Bab 15**: Strategi Isolasi Penuh (*Total Decoupling*) Backend (`port 5001`) dan Database (`sipena_dev`).
4. **Bab 16**: Penyempurnaan Proxy Vite & Penanganan Koneksi API Dinamis.
5. **Bab 17**: Penyelarasan Hak Akses Reviewer / QC & Perlindungan Rute Super Admin.
6. **Bab 18**: Riwayat Commit & Push Git ke Repositori Mandiri.
7. **Bab 19**: Daftar Kredensial Akun Dummy Seluruh Peran (Super Admin, Reviewer QC, Personil Redaksi, Penulis, Pengunjung).
8. **Bab 20**: Audit & Standarisasi Menyeluruh Pop-up Notifikasi & Dialog Konfirmasi Kustom:
   - Pengajuan Pengunjung Menjadi Penulis (`/profil-saya` -> tab "Verifikasi Penulis").
   - Pengajuan Naskah oleh Penulis (`/profil-saya` -> tab "Pengajuan Naskah").
   - Penyediaan Global `DialogContext` (`showAlert`, `showConfirm`, `showToast`).
   - Pembersihan 100% dialog bawaan browser (`window.alert`, `window.confirm`) di seluruh kode sumber.
9. **Bab 21**: Alur Peningkatan Peran Penulis Terkurasi (Curated Author Upgrade) & Paritas Halaman Penulis Publik:
   - Pengunjung menyiapkan draf portofolio lengkap sebelum mengajukan verifikasi.
   - Opsi token akselerasi instan (`PERPUSNAS-PENULIS-2026`) untuk persetujuan langsung tanpa antrean.
   - Peninjauan admin redaksi di Dasbor Admin Pengguna (`/admin/pengguna`) dengan modal pratinjau lengkap dan tombol aksi setujui/tolak.
   - Paritas 1:1 input data profil penulis dengan desain publik acuan resmi (`media_1792035011313.png`), termasuk platform/toko resmi penjualan karya eksternal (*Gramedia.com, Tokopedia, Shopee, dsb.*).
   - Penayangan dinamis halaman publik penulis (`/penulis/:id`) dan pemuatan otomatis penulis terverifikasi pada Direktori Penulis (`/penulis`).
10. **Bab 22**: Penyempurnaan Formulir Katalog Buku & Penyelarasan Halaman Publik Info Detail Buku:
   - Input dropdown **Kategori Buku** dengan 10 kategori resmi Perpusnas Press.
   - Input **NIP (Nomor Induk Perpusnas Press)** yang dihasilkan dari Dasbor Manajemen Penerbitan.
   - Penambahan kolom input kelengkapan tim produksi: **Editor**, **Desain Sampul**, dan **Penata Letak**.
   - Standardisasi istilah **"Sinopsis"** menjadi **"Abstrak"** pada modal formulir admin dan halaman publik.
   - Penyelarasan kartu metadata (`.metadata-grid`) dan info detail buku publik (`/buku/:id`) serta filter kategori (`/buku`).
   - Migrasi skema database PostgreSQL `books` (`nip`, `editor`, `cover_designer`, `layout_designer`).
11. **Bab 23 - 24**: Fitur Drag & Drop Urutan Tahapan, Scroll Mandiri Timeline, dan Penyelarasan Alur Terbitan (Tahap 11 selesai langsung buka Tahap 13).
12. **Bab 25**: Fitur Pelacakan Pembaca & Pengunduh Buku (Tracking Dwell Time 15s, Anti-Spam Sesi, dan Agregasi Real-Time).
13. **Bab 26**: Kolom Khusus Aset Proyek Terbitan & Integrasi Otomatis SiPena (*Zero Double Work*).
14. **Bab 27**: Pembatasan Hak Akses Khusus Penanggung Jawab (PJ) pada Proyek Penerbitan (NIP, ISBN, Upload Sampul PNG, Dummy Final PDF, dan Progress Kerja).
15. **Bab 28**: Otomasi Siklus Hidup Naskah Masuk (*Sedang Diproses* -> *Sudah Terbit*), Pembuatan Proyek, dan Upgrade Penulis Terverifikasi Otomatis.
16. **Bab 29**: Deduplikasi Komprehensif Interaksi Pembaca (Ulasan Rating, Baca, & Unduh) Antar Sesi Relogin dengan Tabel `book_reads`.
17. **Bab 30**: Dasbor Admin Live Action (`GET /api/sipena/stats`) & Dropdown Kategori Terbitan Khusus (Pedoman/Standar, Prosiding, Laporan, Majalah/Jurnal).
18. **Bab 31**: Standarisasi Fitur Pagination & Pemilihan Jumlah Baris (10, 25, 50, 100) di 5 Menu Admin SiPena (`AdminPagination.jsx`).
19. **Bab 32 - 35**: Alur Baru Kegiatan & Klaim Sertifikat Berbasis Token, Upload Banner 16:9, Integrasi Konten Web, dan Template Sertifikat Koordinat Dinamis.
20. **Bab 36 - 39**: Persistensi Sampul Buku, Unggah Template Sertifikat Kustom, Live Interactive Canvas Preview, dan Kustomisasi Ukuran & Jenis Font Sertifikat PDF.
21. **Bab 40**: Sistem Pertahanan Anti-Brute Force (Rate Limiting 5x/15m, Visual Math CAPTCHA, scrypt Hashing, Response Uniformity, Security Audit Log), Smart Role-Based Auth & Session Switcher, serta Registrasi Tertutup Pegawai (*Closed Provisioning Model*).
22. **Bab 41**: Penyempurnaan Sistem Keamanan Otentikasi, CAPTCHA Selalu Aktif (*Always-On*), Desain CAPTCHA Ringkas (*Single Inline Row*), Otomasi Kredensial Peramban & 'Ingat Saya', Fitur Aktivasi Instan Akun Pengujian (*Dev Direct Verification*), Fitur Auto-Solve Kredensial Testing, dan Perbaikan *Rules of Hooks* pada Dasbor Penulis (`AuthorDashboard.jsx`).
23. **Bab 42**: Perbaikan Visibilitas Statistik Buku Beranda (Jumlah Baca & Unduh Kontras pada Kartu Putih), Konfigurasi Batas Waktu Sesi 4 Jam & Sliding Refresh 1 Jam (`auth.ts`), Sistem Pengawal Inaktivitas Sisi Klien (*Client-Side Inactivity Guard* `AuthContext.jsx`), dan Pembersihan Berkala Sesi Kedaluwarsa di Basis Data (`index.ts`).
24. **Bab 43**: Persistensi Foto Profil Penulis & Sinkronisasi Komprehensif Seluruh Kolom Biodata ke PostgreSQL (`uploadController.ts` & `sipenaController.ts`), Dukungan Konversi Otomatis Base64 ke File Fisik Server, serta Penyelarasan Pasca-Login Beranda (`/`).
25. **Bab 44**: Pembersihan Data Dummy Kegiatan di Basis Data PostgreSQL (`events` & `event_participants`), serta Perancangan Antarmuka *Empty State* ("Belum Ada Kegiatan") yang Elegan, Modern, dan Clean pada Menu Beranda, Halaman Katalog `/event`, Dasbor Admin, dan Tab Profil Saya.
26. **Bab 45**: Pembersihan Menyeluruh Seluruh Data Dummy Dokumen, Naskah, Sesi, dan Injeksi Statistik Angka Pembaca Fiktif di Basis Data PostgreSQL, Verifikasi Integritas Data Riil SiPena (1.527 Buku, 1.442 Penulis, 1.276 Unduhan, 25.450 Pembaca Riil), serta Penyelarasan Dasbor Admin & Laporan Terpadu.
27. **Bab 46**: Penyeragaman Kerapian Kartu Buku: Multi-line Clamping Maksimal 2 Baris Nama Penulis, Tinggi Kartu Rata Sempurna 100%, serta Fitur Modal Interaktif Daftar Lengkap Penulis ("Selengkapnya" / `BookAuthorsModal.jsx`).
28. **Bab 47**: Rekayasa Ulang Algoritma Rekomendasi "Buku Terkait" Multi-Kriteria: Penulis Sama (Exact & Partial Word Match), Kemiripan Judul / Multi-Jilid via Ekstensi PostgreSQL `pg_trgm` & Indeks GIN, serta Kesesuaian Kategori Buku.

---
*Silakan buka [DOKUMENTASI_PENGEMBANGAN.md](./DOKUMENTASI_PENGEMBANGAN.md) untuk detail teknis, tabel skema, dan panduan pengujian alur kerja.*
