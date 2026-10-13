# Penguatan Arsitektur Skala Nasional (Single Domain `press.perpusnas.go.id`)

Dokumen ini menguraikan tahapan penguatan arsitektur sistem dari prototipe visual menjadi sistem production-grade skala nasional dengan database PostgreSQL dan API yang tangguh.

## Arsitektur Terpadu
- **Domain Utama:** `https://press.perpusnas.go.id`
- **Jalur Publik (`/`):** Portal SiPena untuk pengunjung & penulis.
- **Jalur Manajemen (`/manajemen` atau `/admin`):** Alur kerja produksi internal penerbitan + CMS admin website publik.
- **Jalur API (`/api`):** Backend Express + Better Auth + Drizzle ORM + PostgreSQL.

---

## Rencana Perubahan Teknis

### Fase 1: Penguatan Skema Database (`schema.ts`)
1. **Tabel `books`**: Tambah kolom agregat `rating_avg`, `rating_count`, `download_count`, dan `status`.
2. **[NEW] Tabel `book_ratings`**: Relasi buku dan pengguna, rating 1-5, ulasan teks, unique constraint `(book_id, user_id)`.
3. **[NEW] Tabel `book_downloads`**: Catatan analitik unduhan riil per buku (user_id, IP address, user_agent, timestamp).
4. **Relasi Drizzle**: Tambahkan relasi `bookRatingsRelations` dan `bookDownloadsRelations`.
5. **Eksekusi Migrasi**: Jalankan `npx drizzle-kit push` ke PostgreSQL.

### Fase 2: Backend API & Controller (`sipenaController.ts` & `routes.ts`)
1. **Endpoint `GET /api/sipena/books`**:
   - Dukungan Pagination: `page` & `limit` (default: 12).
   - Filter Kategori & Pencarian teks.
   - Perhitungan rekomendasi buku terkait berbasis database.
2. **Endpoint `POST /api/sipena/books/:id/rating`**:
   - Membutuhkan autentikasi (User Login).
   - Simpan/Update rating (upsert).
   - Hitung ulang `rating_avg` dan `rating_count` pada tabel `books`.
3. **Endpoint `POST /api/sipena/books/:id/download`**:
   - Catat riwayat unduhan ke tabel `book_downloads`.
   - Increment `download_count` pada tabel `books`.
4. **Whitelist Domain Resmi**:
   - Perbarui `auth.ts` dan `index.ts` agar menyertakan `https://press.perpusnas.go.id`.

### Fase 3: Integrasi Data Riil Frontend (`Website-Sipena`)
1. **Hapus data hardcode**: Cabut `src/data/books.js` sebagai data statis.
2. **Katalog & Hero**: Ambil data buku riil dari `GET /api/sipena/books`.
3. **Halaman Detail Buku (`BookDetail.jsx`)**:
   - Tampilkan detail buku dinamis dari database.
   - Kirim rating riil ke backend `POST /api/sipena/books/:id/rating`.
   - Catat unduhan riil via `POST /api/sipena/books/:id/download`.
   - Rekomendasi "Buku Terkait" berbasis database query.

---

## Verification Plan
1. **Database Migration:** Verifikasi tabel baru terbuat di PostgreSQL tanpa error.
2. **API Verification:** Uji endpoint via script / curl untuk memastikan rating tersimpan dan agregat terupdate.
3. **UI Integration:** Uji pemberian rating dan unduh buku di frontend, pastikan data tersimpan di PostgreSQL.
