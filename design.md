# Panduan Desain & Visual Identity SiPena (Sistem Informasi Penerbitan)

Dokumen ini merupakan acuan resmi (*Design Guidelines*) untuk antarmuka pengguna SiPena (Perpusnas Press). Setiap penambahan fitur, halaman, maupun perbaikan kode **wajib mematuhi aturan warna, tipografi, dan isolasi komponen** yang tercantum di bawah ini agar konsistensi visual tidak berubah-ubah.

---

## 1. Aturan Tone Warna (Color Palette)

### A. Palet Utama (Public & General UI)
| Token / Variabel | Nilai HEX / RGB | Kegunaan & Contoh Penerapan |
| :--- | :--- | :--- |
| `--accent-color` | `#2563eb` | Warna aksi utama: tombol primer (*Masuk*, *Daftar*, *Terbitkan Buku*), tab aktif, fokus input, link aktif. |
| `--accent-hover` | `#1d4ed8` | Efek *hover* & *active* untuk elemen `--accent-color`. |
| `--bg-primary` | `#f1f5f9` | Latar belakang seluruh halaman publik (Home, Daftar Buku, Halaman Login). Nuansa abu-abu slate lembut. |
| `--bg-secondary` | `#ffffff` | Latar belakang kartu (*card*), modal, kontainer form, dan dropdown. |
| `--text-primary` | `#0f172a` | Teks judul (*headings*), label penting, dan angka statistik. Deep slate navy. |
| `--text-secondary` | `#475569` | Teks paragraf, deskripsi buku, sub-judul, dan label form. |
| `--text-tertiary` | `#94a3b8` | Teks placeholder, ikon input pasif, dan garis pembatas sekunder. |
| `--border-color` | `#e2e8f0` | Border standar kartu, form input, dan garis pemisah (*divider*). |
| `--footer-bg` | `#0f172a` | Latar belakang Navbar publik, Footer publik, dan Sidebar Admin SiPena. |

### B. Warna Semantik & Status
| Status | HEX Teks & Ikon | HEX Latar (Badge/Alert) | Kegunaan |
| :--- | :--- | :--- | :--- |
| **Success / Terbit** | `#059669` / `#10b981` | `#ecfdf5` (border: `#a7f3d0`) | Status buku terbit, tahap selesai, notifikasi sukses. |
| **Warning / Review** | `#d97706` / `#f59e0b` | `#fffbeb` (border: `#fde68a`) | Menunggu konfirmasi, catatan revisi, peringatan. |
| **Danger / Ditolak** | `#ef4444` / `#dc2626` | `#fef2f2` (border: `#fecaca`) | Hapus proyek, naskah ditolak, pesan error login. |
| **Info / Catatan** | `#2563eb` / `#1d4ed8` | `#eff6ff` (border: `#bfdbfe`) | Kotak info kredensial login, catatan SOP, info akun. |

### C. Khusus Manajemen Penerbitan Internal (Admin Workflow Only)
- **Biru Instansi Terbitan**: `#1c51a1` (HANYA digunakan di dalam alur kerja produksi untuk badge kategori Terbitan dan pipeline tahapan).
- **Aturan**: Warna `#1c51a1` **DILARANG** menggantikan `--accent-color: #2563eb` di halaman publik (Login, Home, Katalog Buku).

---

## 2. Tipografi & Hierarki Huruf

| Peruntukan | Font Family | Bobot (*Weight*) | Karakteristik |
| :--- | :--- | :--- | :--- |
| **Judul & Headline** (`h1`, `h2`, `h3`, Judul Kartu) | `'Poppins', sans-serif` | `600` (Semi-bold), `700` (Bold) | Modern, ramah, tegas, dan mudah dikenali. |
| **Isi & Komponen** (Body, Form, Tombol, Tabel) | `'Inter', sans-serif` | `400` (Regular), `500` (Medium), `600` (Semi-bold) | Sangat terbaca di semua resolusi, *clean*, *neutral*. |
| **Kode & Penomoran** (NIP, ISBN, ID Proyek, Barcode) | `'Berkeley Mono', 'Fira Code', monospace` | `600` (Semi-bold) | Rapi untuk perataan data teknis dan kode numerik. |

---

## 3. Komponen Antarmuka Standar

### A. Kartu Login & Form (*Login Card*)
- **Container**: `max-width: 500px`, terpusat di layar.
- **Background**: `#ffffff`.
- **Border Radius**: `16px`.
- **Border**: `1px solid #e2e8f0`.
- **Shadow**: `0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)`.
- **Padding**: `2.25rem 2.25rem`.

### B. Mode Switch (Masuk / Daftar)
- **Container**: Background `#f1f5f9` (`var(--bg-primary)`), border `1px solid #e2e8f0`, border-radius `8px`, padding `0.25rem`.
- **Tab Aktif**: Background `#2563eb` (`var(--accent-color)`), teks `#ffffff`, border-radius `6px`, font-weight `600`.
- **Tab Pasif**: Background transparan, teks `#94a3b8`, font-weight `600`.

### C. Input Field
- **Tinggi / Padding**: `padding: 0.75rem 1rem 0.75rem 2.6rem` (tinggi ~44px).
- **Border**: `1px solid #e2e8f0`, border-radius `8px`.
- **Ikon Kiri**: Posisi `left: 1rem`, warna `#94a3b8`.
- **Efek Fokus**: `border-color: #2563eb`, `box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12)`, `outline: none`.

### D. Tombol Primer (*Primary Button*)
- **Background**: `#2563eb` (`var(--accent-color)`).
- **Teks**: `#ffffff`, font-weight `600`.
- **Border Radius**: `8px`.
- **Hover**: Background `#1d4ed8`, `box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25)`, sedikit terangkat `transform: translateY(-1px)`.

---

## 4. Aturan Isolasi CSS (CSS Isolation Rules)

Untuk mencegah kebocoran (*CSS leakage*) antar modul:

1. **Dilarang keras mendefinisikan CSS global pada modul manajemen**:
   Jangan pernah menulis aturan berikut di file CSS manajemen:
   ```css
   /* DILARANG */
   body { background: ...; }
   html { font-size: ...; }
   * { ... }
   :root { --primary: ...; }
   .btn-primary { ... }
   input { ... }
   ```
2. **Wajib scoping di bawah `.admin-shell`**:
   Semua styling khusus alur kerja penerbitan internal (pipeline, kartu alur, bursa tugas) harus dibungkus dengan selector induk `.admin-shell`:
   ```css
   /* BENAR */
   .admin-shell .pipeline { ... }
   .admin-shell .detail-grid { ... }
   .admin-shell .btn-sm { ... }
   ```
3. **Penyimpanan Style**:
   - Style global publik berada di `src/index.css` dan `src/App.css`.
   - Style halaman spesifik berada di file CSS masing-masing (contoh: `LoginPage.css`).
   - Style manajemen internal di-*load* khusus di `AdminLayout.jsx` via `src/styles/manajemen.css`.

---

## 5. Ringkasan Kredensial Pengujian Lokal
Untuk kemudahan pengujian internal:
- **Admin**: `admin@sipena.id` / `admin123` (Hak akses penuh: CMS Web publik + Dasbor Manajemen Penerbitan)
- **Pengunjung**: `pengunjung@sipena.id` / `pengunjung123` (Membaca, mengunduh buku, memberikan ulasan)
- **Penulis**: `penulis@sipena.id` / `penulis123` (Unggah naskah & pantau kurasi)
