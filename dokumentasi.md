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

---
*Silakan buka [DOKUMENTASI_PENGEMBANGAN.md](./DOKUMENTASI_PENGEMBANGAN.md) untuk detail teknis, tabel skema, dan panduan pengujian alur kerja.*
