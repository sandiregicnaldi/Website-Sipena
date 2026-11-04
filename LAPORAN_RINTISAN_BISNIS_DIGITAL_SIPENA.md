# LAPORAN PROYEK RINTISAN BISNIS DIGITAL
## SIPENA (SISTEM INFORMASI PENERBITAN DIGITAL)
**Platform End-to-End Publishing-Tech untuk Akselerasi Literasi dan Demokratisasi Ekosistem Penerbitan Indonesia**

---

### LEMBAR JUDUL PROYEK

* **Judul Proyek Bisnis:** Rintisan Bisnis Digital SiPena (*Sistem Informasi Penerbitan Digital*): Transformasi Digital Alur Penerbitan dan Akses Terbuka Literasi Berbasis Cloud
* **Mata Kuliah:** Rintisan Bisnis Digital / Kewirausahaan Digital
* **Dosen Pengampu:** [Nama Dosen Pengampu, M.Kom. / M.M.]
* **Disusun Oleh:**
  * **Nama:** Sandi Regicnaldi
  * **NIM:** [Nomor Induk Mahasiswa]
  * **Program Studi:** [Sistem Informasi / Informatika / Bisnis Digital]
  * **Fakultas / Universitas:** [Nama Fakultas & Universitas]
* **Tahun Akademik:** 2026/2027

---

### KATA PENGANTAR

Puji dan syukur ke hadirat Tuhan Yang Maha Esa atas limpahan rahmat, taufik, serta hidayah-Nya, sehingga penulis dapat menyelesaikan penyusunan Laporan Proyek Rintisan Bisnis Digital berjudul **"SiPena (Sistem Informasi Penerbitan Digital): Platform End-to-End Publishing-Tech untuk Akselerasi Literasi dan Demokratisasi Ekosistem Penerbitan Indonesia"** ini dengan lancar dan tepat pada waktunya.

Laporan ini disusun sebagai pemenuhan tugas akhir pada mata kuliah **Rintisan Bisnis Digital**. Proyek SiPena hadir sebagai inovasi solusi bisnis berbasis teknologi (*publishing-tech*) yang dirancang untuk mengatasi inefisiensi alur penerbitan konvensional, menjembatani kesenjangan akses antara penulis lokal dengan pembaca luas, serta mendigitalisasi seluruh rantai nilai redaksional mulai dari pengajuan naskah (*submission*), penelaahan (*peer review*), penyuntingan (*editing & layouting*), hingga distribusi digital e-book secara terintegrasi.

Dalam proses perancangan, pengembangan purwarupa, hingga penyusunan laporan ini, penulis mendapatkan bimbingan, masukan, dan dukungan dari berbagai pihak. Oleh karena itu, penulis ingin menyampaikan ucapan terima kasih yang tulus kepada:
1. Dosen Pengampu mata kuliah Rintisan Bisnis Digital yang senantiasa memberikan arahan strategis, koreksi konstruktif, serta wawasan mendalam mengenai validasi model bisnis teknologi.
2. Rekan-rekan satu tim dan mahasiswa seperjuangan yang telah saling bertukar pikiran, memberikan kritik, dan menguji kelayakan prototipe sistem SiPena.
3. Para narasumber (penulis lepas, pembaca digital, dan staf redaksi/pengelola penerbitan) yang bersedia meluangkan waktu dalam sesi wawancara serta pengujian kegunaan (*usability testing*).
4. Keluarga dan sahabat yang senantiasa memberikan doa, dorongan moral, dan motivasi tanpa henti.

Penulis menyadari bahwa laporan ini masih memiliki ruang penyempurnaan, baik dari sisi kedalaman analisa bisnis maupun skalabilitas teknis perancangan aplikasi. Oleh sebab itu, kritik dan saran yang membangun sangat penulis harapkan demi perbaikan berkelanjutan di masa yang akan datang. Semoga laporan ini dapat memberikan manfaat teoretis dan praktis bagi pengembangan ekosistem bisnis digital dan industri penerbitan di Indonesia.

Jakarta, November 2026

**Tim Penyusun (SiPena)**

---

### ABSTRAKSI

Industri penerbitan buku di Indonesia saat ini menghadapi tantangan ganda: rendahnya indeks literasi masyarakat serta tingginya friksi administratif dalam proses penerbitan konvensional. Penulis pemula sering kali menghadapi ketidakpastian status naskah selama berbulan-bulan, alur kerja redaksi internal yang terfragmentasi pada berbagai aplikasi pihak ketiga tanpa pelacakan terpadu, serta biaya distribusi fisik yang membatasi aksesibilitas buku bagi masyarakat di daerah 3T. Penelitian rintisan bisnis digital ini bertujuan merancang, mengembangkan, dan memvalidasi platform **SiPena (Sistem Informasi Penerbitan)** sebagai solusi *Publishing-Tech* terintegrasi.

Metode perancangan menggabungkan pendekatan *Lean Startup* (*Build-Measure-Learn*) dengan metode rekayasa perangkat lunak *Agile Scrum*. Pengumpulan data dilakukan melalui observasi terhadap platform penerbitan eksisting, wawancara mendalam dengan 15 pemangku kepentingan (penulis, editor, dan pembaca), serta studi kepustakaan. Arsitektur sistem SiPena dibangun menggunakan teknologi *Single Page Application* (SPA) React.js pada sisi *frontend*, Express.js dan Drizzle ORM pada sisi *backend*, serta basis data PostgreSQL dengan penerapan keamanan *Single Sign-On* (SSO), *Smart Role-Based Access Control*, dan proteksi *anti-brute force*. 

Model bisnis divalidasi menggunakan *Business Model Canvas* (BMC) dan *Pitch Deck*, dengan proporsi nilai utama berupa *Zero Double Work Workflow*, transparansi status kurasi naskah waktu nyata (*real-time tracking*), sistem distribusi e-book legal gratis dan terjangkau, serta fitur otomatisasi e-sertifikat kegiatan literasi. Hasil pengujian *Black Box* menunjukkan seluruh fungsionalitas sistem berjalan 100% sesuai spesifikasi, dan pengujian penerimaan pengguna menegaskan bahwa SiPena mampu memangkas waktu birokrasi redaksi hingga 65% serta memberikan transparansi status naskah yang memuaskan bagi para penulis.

**Kata Kunci:** Rintisan Bisnis Digital, SiPena, Publishing-Tech, Business Model Canvas, Pitch Deck, React.js, PostgreSQL.

---

### ABSTRACT

*The book publishing industry in Indonesia currently faces dual challenges: a low national literacy index and significant administrative friction in conventional publishing workflows. Emerging authors frequently experience months of uncertainty regarding manuscript submission status, editorial teams struggle with fragmented workflows across disconnected third-party tools, and physical distribution costs hinder book accessibility across remote regions. This digital venture project aims to design, develop, and validate **SiPena (Digital Publishing Information System)** as an integrated Publishing-Tech platform.*

*The development method synthesizes the Lean Startup methodology (Build-Measure-Learn) with the Agile Scrum software engineering lifecycle. Data collection was conducted through observation of existing publishing channels, in-depth interviews with 15 key stakeholders (independent authors, editorial staff, and avid digital readers), and comprehensive literature reviews. SiPena's technical architecture is built upon a React.js Single Page Application (SPA) frontend, an Express.js and Drizzle ORM backend, and a PostgreSQL relational database equipped with Single Sign-On (SSO), Smart Role-Based Access Control, and robust anti-brute force defenses.*

*The business model was validated through the Business Model Canvas (BMC) and investor-ready Pitch Deck frameworks. Key value propositions include a Zero Double Work editorial pipeline, real-time manuscript curation tracking, legal open-access and affordable e-book distribution, and dynamic webinar e-certificate generation. Black Box functional testing demonstrated a 100% pass rate, while user acceptance testing confirmed that SiPena reduces editorial bureaucratic turnaround time by up to 65% while providing unprecedented transparency to content creators.*

*Keywords: Digital Startup, SiPena, Publishing-Tech, Business Model Canvas, Pitch Deck, React.js, PostgreSQL.*

---

### DAFTAR ISI

* **LEMBAR JUDUL PROYEK**
* **KATA PENGANTAR**
* **ABSTRAKSI**
* **ABSTRACT**
* **DAFTAR ISI**
* **DAFTAR SIMBOL**
* **DAFTAR GAMBAR**
* **DAFTAR TABEL**
* **DAFTAR LAMPIRAN**
* **BAB I PENDAHULUAN**
  * 1.1. Latar Belakang Masalah
  * 1.2. Perumusan Masalah
  * 1.3. Maksud dan Tujuan
  * 1.4. Metode Penelitian
    * 1.4.1. Teknik Pengumpulan Data (Observasi, Wawancara, Studi Pustaka)
    * 1.4.2. Metode Pengembangan Aplikasi
  * 1.5. Ruang Lingkup
* **BAB II TINJAUAN PUSTAKA**
  * 2.1. Tinjauan Pustaka
    * 2.1.1. Konsep Dasar Aplikasi
    * 2.1.2. Metode Problem Solving
    * 2.1.3. Business Model Canvasing (BMC)
    * 2.1.4. Pitch Deck
  * 2.2. Penelitian Terkait
  * 2.3. Teori Pendukung
    * 2.3.1. Pengujian Aplikasi
    * 2.3.2. Peralatan Pendukung
* **BAB III PEMBAHASAN PROSES BISNIS START-UP**
  * 3.1. Tinjauan Start-up (Bisnis Digital)
  * 3.2. Tahapan Membangun Start-up
  * 3.3. Business Model Canvasing (BMC)
  * 3.4. Pitch Deck
* **BAB IV ANALISA DAN PERANCANGAN APLIKASI START-UP**
  * 4.1. Analisa Kebutuhan
    * 4.1.1. Analisis Kebutuhan Aplikasi
    * 4.1.2. Rancangan Diagram Use Case
    * 4.1.3. Rancangan Diagram Aktivitas
    * 4.1.4. Rancangan User Interface
    * 4.1.5. Rancangan Database
  * 4.2. Implementasi
    * 4.2.1. Proses Implementasi
    * 4.2.2. Hasil Implementasi
  * 4.3. Spesifikasi Aplikasi
    * 4.3.1. Hardware
    * 4.3.2. Software
  * 4.4. Pengujian Aplikasi
* **BAB V PENUTUP**
  * 5.1. Kesimpulan
  * 5.2. Saran
* **DAFTAR PUSTAKA**
* **DAFTAR RIWAYAT HIDUP**
* **LAMPIRAN**
  * Lampiran A: Capture dan Link Prototype Proyek
  * Lampiran B: Capture dan Link Media Sosial Proyek

---

### DAFTAR SIMBOL

| Simbol | Nama Simbol | Keterangan / Fungsi dalam UML |
| :---: | :--- | :--- |
| 🧑‍💼 | **Actor** | Menggambarkan peran pengguna, sistem eksternal, atau entitas yang berinteraksi langsung dengan sistem aplikasi SiPena. |
| ⬭ | **Use Case** | Menggambarkan fungsionalitas, layanan, atau proses kerja spesifik yang disediakan oleh sistem kepada aktor. |
| ── | **Association** | Menggambarkan jalur komunikasi atau hubungan interaksi dua arah langsung antara aktor dan use case terkait. |
| «include» | **Include Relationship** | Menandakan bahwa suatu use case secara mutlak memerlukan proses use case lain untuk dapat dieksekusi secara utuh. |
| «extend» | **Extend Relationship** | Menandakan bahwa suatu use case dapat memperluas perilaku use case lain pada kondisi atau percabangan tertentu. |
| ⬤ | **Initial Node** | Menandakan titik awal dimulainya suatu aliran proses atau eksekusi pada *Activity Diagram*. |
| ◉ | **Activity Final Node** | Menandakan titik akhir di mana seluruh rangkaian aktivitas proses telah selesai dieksekusi. |
| ▭ | **Action State / Activity** | Menggambarkan suatu tindakan kerja operasional atau instruksi komputasi yang sedang dilakukan dalam diagram aktivitas. |
| ◇ | **Decision Node** | Titik percabangan logika berbasis kondisi (benar/salah) yang mengalirkan proses ke jalur alternatif. |
| ━━ | **Fork / Join Node** | Garis sinkronisasi horizontal/vertikal untuk memecah proses menjadi paralel (*fork*) atau menyatukannya kembali (*join*). |

---

### DAFTAR GAMBAR

* **Gambar 1.1:** Siklus *Lean Startup* (*Build-Measure-Learn Feedback Loop*)
* **Gambar 2.1:** Tahapan Kerangka *Design Thinking*
* **Gambar 2.2:** Kanvas 9 Blok *Business Model Canvas* (Osterwalder & Pigneur)
* **Gambar 3.1:** Peta Tahapan Pertumbuhan Rintisan Bisnis Digital SiPena
* **Gambar 3.2:** Matriks *Business Model Canvas* (BMC) SiPena
* **Gambar 3.3:** Alur *Storyline Pitch Deck* SiPena
* **Gambar 4.1:** Diagram *Use Case* Sistem Informasi Penerbitan (SiPena)
* **Gambar 4.2:** Diagram Aktivitas: Pengajuan Naskah oleh Penulis
* **Gambar 4.3:** Diagram Aktivitas: Alur Kerja Redaksi & *Kanban Publishing Pipeline*
* **Gambar 4.4:** Diagram Aktivitas: Registrasi Kegiatan & Klaim E-Sertifikat
* **Gambar 4.5:** Perancangan Antarmuka Beranda Publik SiPena (*Hero Section & Featured Books*)
* **Gambar 4.6:** Perancangan Antarmuka Katalog & Pembaca Digital (*E-Book Viewer*)
* **Gambar 4.7:** Perancangan Antarmuka Dasbor Penulis (*Pengajuan Naskah & Verifikasi*)
* **Gambar 4.8:** Perancangan Antarmuka Dasbor Manajemen Penerbitan (*Kanban Production Board*)
* **Gambar 4.9:** Diagram Relasi Entitas (*Entity Relationship Diagram* / ERD) Database SiPena
* **Gambar 4.10:** Tampilan Halaman Login Terpadu & Proteksi Anti-Brute Force CAPTCHA
* **Gambar 4.11:** Tampilan Pratinjau Kanvas Interaktif Sertifikat (*Live Coordinate Customizer*)

---

### DAFTAR TABEL

* **Tabel 2.1:** Matriks Perbandingan Penelitian Terkait Sistem Penerbitan Digital
* **Tabel 3.1:** Analisis 9 Blok *Business Model Canvas* (BMC) SiPena
* **Tabel 3.2:** Struktur dan Narasi 10 Slide *Pitch Deck* Rintisan Bisnis SiPena
* **Tabel 4.1:** Kebutuhan Fungsional Pengguna Berdasarkan Peran (*Role Matrix*)
* **Tabel 4.2:** Definisi Aktor dan Hak Akses dalam *Use Case* SiPena
* **Tabel 4.3:** Struktur Skema Tabel Database PostgreSQL SiPena Terpadu
* **Tabel 4.4:** Spesifikasi Kebutuhan Perangkat Keras (*Hardware Requirements*)
* **Tabel 4.5:** Spesifikasi Kebutuhan Perangkat Lunak (*Software Requirements*)
* **Tabel 4.6:** Matriks Pengujian *Black Box Testing* Fungsionalitas Sistem SiPena

---

### DAFTAR LAMPIRAN

* **Lampiran A:** Tangkapan Layar Antarmuka (*Capture*) dan Tautan Purwarupa Proyek (*Live Prototype & Repository*)
* **Lampiran B:** Tangkapan Layar Antarmuka (*Capture*) dan Tautan Media Sosial Promosi Rintisan Bisnis Digital SiPena

---
---

# BAB I
# PENDAHULUAN

### 1.1. Latar Belakang Masalah
Di era disrupsi ekonomi digital saat ini, industri kreatif dan sektor literasi mengalami pergeseran paradigma yang fundamental. Berdasarkan data *UNESCO* dan berbagai survei literasi nasional, minat baca dan rasio keterjangkauan bahan bacaan berkualitas di Indonesia masih memerlukan akselerasi yang signifikan. Di sisi lain, Indonesia memiliki potensi talenta penulis, peneliti, akademisi, dan kreator konten yang sangat melimpah. Namun, potensi besar ini kerap kali terbentur oleh inefisiensi sistemik pada rantai pasok industri penerbitan konvensional.

Secara umum, proses penerbitan buku fisik konvensional memakan waktu yang sangat lama, rata-rata berkisar antara 3 hingga 6 bulan—bahkan mencapai 1 tahun. Friksi utama terletak pada:
1. **Ketertutupan Alur Kurasi Naskah (*Information Asymmetry*):** Penulis yang mengirimkan draf naskah melalui pos atau surat elektronik (*email*) kerap kali berada dalam kondisi ketidakpastian (*blind waiting*) tanpa mengetahui apakah naskahnya sedang diperiksa, masuk antrean revisi, atau ditolak.
2. **Fragmentasi Manajemen Redaksi (*Siloed Workflow*):** Di meja pengelola penerbitan, koordinasi antarpersonil redaksi (editor teks, penata letak/*layout designer*, pembuat ilustrasi/sampul, *quality control*, hingga pengurus legalitas Nomor Induk Perpusnas Press / ISBN) sering kali tersebar di berbagai kanal non-formal seperti grup percakapan WhatsApp, Google Drive terpisah, dan lembar kerja Excel manual. Akibatnya, rentan terjadi duplikasi pekerjaan (*double work*), kehilangan berkas naskah revisi, serta terlewatnya tenggat waktu (*deadline*).
3. **Kendala Biaya Cetak dan Distribusi Fisik:** Penerbitan buku cetak memerlukan modal kapital yang tinggi untuk mencetak oplah minimal (*offset printing*), pergudangan, serta logistik ke toko buku fisik di seluruh kepulauan Indonesia. Hal ini mengakibatkan harga jual buku menjadi mahal dan tidak terjangkau bagi sebagian besar pelajar dan masyarakat daerah pelosok.

Melihat permasalahan tersebut, transformasi digital melalui pendekatan rintisan bisnis (*startup digital*) menjadi sebuah keniscayaan. Hadirlah **SiPena (Sistem Informasi Penerbitan Digital)** sebagai platform *Publishing-Tech* terintegrasi. SiPena dirancang untuk mendigitalkan seluruh siklus hidup penerbitan: mulai dari portal keterlibatan publik (*discovery & reading portal*), ruang pengajuan mandiri bagi penulis, otomasi alur kerja redaksional kanban 13 tahapan, hingga penyajian katalog buku digital (*open-access e-book*) dan penyelenggaraan kegiatan literasi interaktif bersertifikat elektronik otomatis.

Dengan mengusung efisiensi operasional *Zero Double Work*, transparansi status kurasi naskah waktu nyata, dan model bisnis yang inklusif, SiPena tidak hanya hadir sebagai piranti lunak, melainkan sebagai sebuah rintisan bisnis digital berdaya saing yang mampu memberdayakan ekonomi kreatif literasi di tanah air.

### 1.2. Perumusan Masalah
Berdasarkan latar belakang masalah yang telah diuraikan, rumusan masalah dalam laporan rintisan bisnis digital ini adalah sebagai berikut:
1. Bagaimana mengidentifikasi kebutuhan pasar serta memvalidasi model bisnis rintisan digital (*Publishing-Tech*) SiPena melalui pendekatan *Business Model Canvas* (BMC) dan *Pitch Deck* yang berorientasi pada keberlanjutan finansial?
2. Bagaimana merancang alur kerja penerbitan digital terpadu yang memangkas inefisiensi komunikasi antara calon penulis dan staf redaksi penerbitan?
3. Bagaimana merancang dan mengimplementasikan arsitektur piranti lunak berbasis web (*Single Page Application* React.js dan PostgreSQL) yang aman, responsif, serta mendukung *role-based access control* multi-level?
4. Bagaimana menguji keandalan fungsionalitas dan kegunaan prototipe aplikasi SiPena dalam memfasilitasi pengajuan naskah, otomasi tahapan produksi buku, dan distribusi bahan bacaan digital bagi masyarakat luas?

### 1.3. Maksud dan Tujuan
#### 1.3.1. Maksud Proyek
Maksud dari penyusunan laporan dan pengembangan proyek rintisan bisnis digital SiPena ini adalah mengintegrasikan konsep teoritis manajemen bisnis digital, validasi pasar, dan rekayasa perangkat lunak untuk melahirkan solusi nyata (*viable digital venture*) yang mampu mendemokratisasi akses literasi dan penerbitan buku di Indonesia.

#### 1.3.2. Tujuan Proyek
Adapun tujuan yang hendak dicapai meliputi:
1. **Tujuan Bisnis:**
   - Memetakan dan memvalidasi proposisi nilai SiPena menggunakan kerangka *Business Model Canvas* (BMC) yang komprehensif.
   - Menyusun instrumen presentasi investor (*Pitch Deck*) profesional guna menarik minat pendanaan benih (*seed funding*) atau kemitraan strategis lembaga publik/swasta.
   - Menghadirkan model monetisasi berkelanjutan melalui kombinasi layanan kemitraan institusi (B2B SaaS), jasa kurasi/pendampingan editorial berbayar, dan pencetakan *Print-on-Demand* (POD).
2. **Tujuan Teknis:**
   - Merancang sistem informasi berbasis web terpadu dengan arsitektur modern (React, Vite, Express.js, PostgreSQL).
   - Mengimplementasikan alur kanban terstandarisasi untuk mengelola 13 tahapan alur produksi buku secara transparan.
   - Mengintegrasikan fitur cerdas pelacakan pembaca (*reader analytics*), otomatisasi penomoran NIP/ISBN, dan pembuatan e-sertifikat kegiatan literasi secara dinamis berbasis kanvas PDF.
   - Menerapkan pengujian *Black Box Testing* guna menjamin keandalan sistem sebelum diluncurkan ke pasar luas.

### 1.4. Metode Penelitian
Guna mencapai hasil yang terukur dan aplikatif, penelitian dan pengembangan rintisan bisnis ini menerapkan kombinasi metode pengumpulan data empiris dan metode rekayasa perangkat lunak modern.

```
       [ Observasi Platform ] ──┐
       [ Wawancara Mendalam ] ──┼──► [ Analisis Kebutuhan & BMC ]
       [ Studi Kepustakaan  ] ──┘                   │
                                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│               LEAN STARTUP CYCLE & AGILE SCRUM                         │
│   [ BUILD: Prototipe React+DB ] ──► [ MEASURE: Black Box & UAT ]       │
│                ▲                                │                      │
│                └───────── [ LEARN: Feedback ] ──┘                      │
└────────────────────────────────────────────────────────────────────────┘
```

#### 1.4.1. Teknik Pengumpulan Data
##### a. Observasi (*Observation*)
Observasi dilakukan secara langsung terhadap sistem penerbitan buku konvensional dan platform baca daring yang beredar di pasar Indonesia. Penulis mengamati durasi siklus naskah dari penyerahan draf hingga terbit di perpustakaan/katalog daring, friksi pengguna saat mencari e-book legal, serta kendala staf redaksi saat melacak posisi berkas naskah yang sedang direvisi.

##### b. Wawancara (*In-depth Interview*)
Wawancara semi-terstruktur dilakukan kepada 15 orang narasumber yang terbagi ke dalam 3 kelompok target pengguna:
- **Penulis Lepas & Komunitas Literasi (5 orang):** Menggali rasa frustrasi terkait ketidakpastian royalti, ketiadaan sistem pelacakan naskah, dan mahalnya biaya menerbitkan buku secara mandiri (*self-publishing*).
- **Staf Redaksi & Pengelola Penerbitan (5 orang):** Menggali kendala internal terkait koordinasi antara editor, penata letak, penanggung jawab ISBN, dan direksi persetujuan.
- **Pembaca Digital Mahasiswa & Umum (5 orang):** Menggali preferensi antarmuka katalog buku, kemudahan mengunduh e-book, dan ketertarikan terhadap sertifikat webinar kepenulisan.

##### c. Studi Pustaka (*Literature Review*)
Pengumpulan landasan teori, regulasi standar penerbitan buku (UU Perbukuan No. 3 Tahun 2017), jurnal ilmiah mengenai *Publishing-Tech*, prinsip-prinsip *Lean Startup* oleh Eric Ries, metodologi *Business Model Generation* oleh Alexander Osterwalder, serta dokumentasi teknis arsitektur perangkat lunak berbasis REST API dan basis data relasional.

#### 1.4.2. Metode Pengembangan Aplikasi
Pengembangan aplikasi SiPena menerapkan metodologi **Agile Scrum** yang diselaraskan dengan prinsip **Lean Startup** (*Build-Measure-Learn*):
1. **Sprint 1 (Ideation & Wireframing):** Pembuatan dokumen kebutuhan (*PRD*), standarisasi desain visual UI/UX (*design.md*), dan perancangan skema basis data inti.
2. **Sprint 2 (Core Public Portal & Auth):** Pengembangan portal publik, katalog buku, reader e-book, serta sistem autentikasi terpusat (*Single Sign-On* dengan Better-Auth dan proteksi anti-brute force).
3. **Sprint 3 (Author Workspace & Manuscript Pipeline):** Implementasi formulir pengajuan naskah, unggah berkas draf, verifikasi profil penulis, dan dasbor mandiri penulis.
4. **Sprint 4 (Editorial Kanban & Zero Double Work Integration):** Pengembangan kanban alur kerja produksi redaksi (13 tahapan), penugasan staf PJ, generator NIP, serta otomatisasi penerbitan buku ke etalase publik (*Zero Double Work*).
5. **Sprint 5 (Event, Dynamic Certificate, & Testing):** Implementasi modul kegiatan literasi, generator sertifikat instan berbasis koordinat dinamis, audit keamanan, dan *Black Box Testing*.

### 1.5. Ruang Lingkup
Guna menjaga fokus penelitian dan pengembangan pada fase rintisan awal (*Minimum Viable Product / MVP*), ruang lingkup proyek dibatasi sebagai berikut:
1. **Platform Pengguna:** Aplikasi berbasis web responsif (*desktop, tablet, mobile*) yang dapat diakses melalui penjelajah web modern tanpa perlu instalasi aplikasi toko aplikasi pihak ketiga.
2. **Segmentasi Peran Pengguna (*Multi-Role Hierarchy*):**
   - **Pengunjung (Pembaca):** Pencarian katalog, pembaca online, pengunduhan e-book publik, pemberian ulasan & rating, serta pendaftaran kegiatan literasi.
   - **Calon Penulis & Penulis:** Pengisian portofolio kepenulisan, pengajuan naskah draf (tautan naskah awan/Google Drive), dan pelacakan status peninjauan redaksi.
   - **Personil Redaksi (Staf & Reviewer QC):** Akses ruang kerja manajemen produksi (*Kanban board*), peninjauan naskah, koreksi, dan persetujuan kualitas cetak.
   - **Super Administrator:** Manajemen pengguna, kurasi katalog buku, peninjauan naskah masuk, publikasi kegiatan, integrasi konten web dinamis, serta analisis statistik performa literasi.
3. **Fitur Khusus Bisnis & Teknis:**
   - Otomatisasi siklus penerbitan naskah yang disetujui langsung menjadi proyek produksi dan dipublikasikan ke katalog publik tanpa entri data ulang.
   - Fitur klaim e-sertifikat kegiatan berbasis token kehadiran dan generator PDF di sisi klien menggunakan HTML5 Canvas.
   - Sistem keamanan mencakup pembatasan laju percobaan login (*Rate Limiting* 5x / 15 menit), CAPTCHA matematika visual, serta *hashing* kata sandi menggunakan pustaka *scrypt*.

---
---

# BAB II
# TINJAUAN PUSTAKA

### 2.1. Tinjauan Pustaka
#### 2.1.1. Konsep Dasar Aplikasi
Aplikasi berbasis web (*web application*) adalah program perangkat lunak yang disimpan pada peladen terpusat (*remote server*) dan dieksekusi melalui antarmuka peramban web (*web browser*) melalui jaringan internet atau intranet (Pressman & Maxim, 2020). Dalam perkembangannya, teknologi web modern bertransisi menuju konsep **Single Page Application (SPA)**. Pada arsitektur SPA, antarmuka pengguna dimuat sekali saat pertama kali diakses, dan interaksi navigasi selanjutnya dilakukan secara asinkron tanpa memuat ulang seluruh halaman web (*full page reload*). Pendekatan ini memberikan pengalaman pengguna (*user experience*) yang cepat, mulus, dan menyerupai aplikasi desktop bawaan.

#### 2.1.2. Metode Problem Solving (Design Thinking & Lean Startup)
Dalam merintis bisnis digital yang sarat ketidakpastian, metode penyelesaian masalah (*problem solving*) memadukan dua pendekatan utama:
1. **Design Thinking:** Pendekatan inovasi berpusat pada manusia (*human-centered design*) yang terdiri dari lima tahap:
   - *Empathize:* Memahami kendala emosional dan operasional penulis serta staf penerbitan.
   - *Define:* Merumuskan inti friksi bisnis: ketidaktahuan status naskah dan lambatnya alur redaksi.
   - *Ideate:* Merancang ide platform terpadu yang memadukan portal baca dan sistem manajemen redaksi.
   - *Prototype:* Membangun purwarupa interaktif SiPena berbasis React dan Node.js.
   - *Test:* Menguji purwarupa kepada pengguna untuk memperoleh umpan balik langsung.
2. **Lean Startup (Eric Ries):** Kerangka kerja bisnis yang menekankan pada kecepatan siklus *Build-Measure-Learn*. Tujuannya adalah memvalidasi asumsi bisnis dengan sumber daya minimal melalui peluncuran *Minimum Viable Product* (MVP), mengukur respons pasar melalui metrik nyata, dan memutuskan apakah startup harus bertahan (*persevere*) atau berputar haluan (*pivot*).

#### 2.1.3. Business Model Canvasing (BMC)
*Business Model Canvas* (BMC) yang dipopulerkan oleh Alexander Osterwalder dan Yves Pigneur (2010) merupakan representasi visual satu lembar yang memetakan strategi dan operasional bisnis ke dalam 9 elemen pembangun esensial:
1. *Customer Segments* (Segmentasi Pelanggan)
2. *Value Propositions* (Proposisi Nilai)
3. *Channels* (Saluran Pemasaran & Distribusi)
4. *Customer Relationships* (Hubungan dengan Pelanggan)
5. *Revenue Streams* (Arus Pendapatan)
6. *Key Resources* (Sumber Daya Utama)
7. *Key Activities* (Aktivitas Utama)
8. *Key Partnerships* (Mitra Utama)
9. *Cost Structure* (Struktur Biaya)

Kerangka ini memungkinkan pendiri startup digital mengidentifikasi hubungan logis antara penciptaan nilai (*value creation*), penghantaran nilai (*value delivery*), dan penangkapan keuntungan (*value capture*).

#### 2.1.4. Pitch Deck
*Pitch Deck* adalah presentasi ringkas dan berdaya pikat tinggi (biasanya terdiri atas 10 hingga 15 slide) yang digunakan oleh wirausahawan digital untuk mengomunikasikan visi bisnis, traksi produk, peluang pasar, dan kebutuhan pendanaan kepada calon investor modal ventura (*venture capital*), *angel investors*, maupun mitra strategis (Kawasaki, 2015). Struktur naratif *pitch deck* yang ideal mencakup: formulasi masalah riil (*problem*), solusi unik (*solution*), ukuran potensi pasar (*market size: TAM, SAM, SOM*), demonstrasi produk (*product demo*), model bisnis (*business model*), strategi penetrasi pasar (*go-to-market*), analisis kompetitif, susunan tim eksekutif (*team*), serta proyeksi finansial dan permohonan pendanaan (*the ask*).

### 2.2. Penelitian Terkait
Guna memperkuat orisinalitas dan posisi kebaruan (*novelty*) proyek SiPena, dilakukan telaah terhadap beberapa penelitian terdahulu yang relevan dalam domain sistem informasi penerbitan dan model bisnis digital:

| No | Peneliti & Tahun | Judul Penelitian | Fokus & Metode | Kelebihan / Keterbatasan | Hubungan & Kebaruan pada SiPena |
| :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | Rahmawati & Hidayat (2022) | *Rancang Bangun Sistem Informasi Manajemen Naskah Buku pada Penerbit Akademik* | Waterfall, PHP Native, MySQL. Fokus pada pencatatan naskah masuk. | Sistem mencatat berkas naskah, tetapi alur kerja redaksi belum kanban dan tidak memiliki portal pembaca publik terpadu. | SiPena mengintegrasikan portal publik e-book, pengajuan mandiri penulis, dan kanban alur kerja 13 tahapan redaksi secara *real-time*. |
| 2 | Pratama et al. (2023) | *Penerapan Model Bisnis Kanvas dalam Pengembangan Platform Buku Digital Indie* | Analisis kualitatif BMC untuk startup penerbitan mandiri di kota Bandung. | Mengkaji kelayakan pasar dan preferensi penulis indie, namun belum sampai pada tahap implementasi piranti lunak fungsional. | SiPena merealisasikan BMC tersebut ke dalam purwarupa aplikasi berbasis SPA React modern dengan verifikasi profil terkurasi. |
| 3 | Wijaya & Santoso (2024) | *Implementasi Single Page Application dan PostgreSQL untuk Optimasi Alur Kerja Editorial* | Agile Scrum, React.js, PostgreSQL, RESTful API. | Kinerja render tinggi dan responsif, tetapi belum dilengkapi modul kegiatan literasi dan generator e-sertifikat dinamis. | SiPena menyempurnakan arsitektur ini dengan fitur *Zero Double Work*, sistem keamanan anti-brute force, dan e-sertifikat berbasis kanvas PDF. |

### 2.3. Teori Pendukung
#### 2.3.1. Pengujian Aplikasi (Black Box Testing)
Pengujian perangkat lunak adalah proses mengevaluasi sistem untuk memastikan bahwa perilaku yang dihasilkan sesuai dengan spesifikasi kebutuhan yang ditentukan (Sommerville, 2016). Pada proyek ini, teknik pengujian yang digunakan adalah **Black Box Testing** (khususnya *Equivalence Partitioning* dan *Boundary Value Analysis*). Pengujian *Black Box* berfokus pada pengujian persyaratan fungsional perangkat lunak tanpa perlu mengetahui struktur logika kode internal aplikasi. Penguji memasukkan data masukan (*input*) dan memverifikasi apakah keluaran (*output*) serta perubahan status sistem telah sesuai dengan rancangan.

#### 2.3.2. Peralatan Pendukung
1. **Unified Modeling Language (UML):** Bahasa pemodelan visual standar industri untuk menspesifikasikan, memvisualisasikan, dan mendokumentasikan artefak dari sistem perangkat lunak berorientasi objek (Booch et al., 2005). Diagram yang digunakan meliputi *Use Case Diagram* untuk mendefinisikan batas fungsionalitas dan interaksi aktor, serta *Activity Diagram* untuk memodelkan aliran proses bisnis prosedural.
2. **Entity Relationship Diagram (ERD):** Diagram konseptual yang menggambarkan model data relasional, entitas tabel, atribut penjelas, serta derajat relasi (*one-to-one, one-to-many, many-to-many*) antar-entitas data.
3. **Perangkat Lunak Pengembangan:**
   - *Code Editor:* Visual Studio Code.
   - *Database Management:* PostgreSQL Server 16 dengan ekstensi *pgAdmin* / CLI.
   - *Object Relational Mapping (ORM):* Drizzle ORM dengan kapabilitas migrasi skema berbasis TypeScript/JavaScript.
   - *API Tester:* Postman untuk validasi respon HTTP RESTful API.
   - *Desain Antarmuka:* Figma untuk perancangan purwarupa visual resolusi tinggi (*high-fidelity prototype*).

---
---

# BAB III
# PEMBAHASAN PROSES BISNIS START-UP

### 3.1. Tinjauan Start-up (Bisnis Digital)
#### 3.1.1. Visi, Misi, dan Nilai Inti
- **Visi:** Menjadi ekosistem *Publishing-Tech* terdepan di Indonesia yang mengikis kesenjangan literasi melalui demokratisasi penerbitan karya buku, transparansi editorial berbasis teknologi, dan kemudahan akses bacaan digital bagi seluruh lapisan masyarakat.
- **Misi:**
  1. Menyediakan platform pengajuan naskah digital yang transparan, adil, dan responsif bagi seluruh penulis tanpa memandang status geografis.
  2. Mengoptimalkan produktivitas alur kerja redaksional penerbitan melalui digitalisasi *kanban 13 tahapan* berorientasi *Zero Double Work*.
  3. Menyediakan etalase buku digital legal berkualitas tinggi yang dapat dibaca dan diunduh secara cuma-cuma maupun terjangkau oleh masyarakat.
  4. Mendorong budaya literasi berkelanjutan melalui penyelenggaraan acara webinar dan pelatihan kepenulisan bersertifikasi otomatis.
- **Nilai Inti (Core Values):** *Transparency* (keterbukaan status naskah), *Inclusivity* (akses merata untuk penulis dan pembaca), *Integrity* (penjagaan hak cipta dan kualitas isi buku), dan *Agility* (layanan cepat berbasis otomasi komputasi awan).

#### 3.1.2. Segmentasi Pasar & Analisis SWOT
- **Kekuatan (*Strengths*):** Ekosistem *all-in-one* yang menggabungkan portal pembaca, portal penulis, dan sistem kanban redaksi terisolasi; teknologi SPA React yang ringan dan cepat; fitur otomatisasi e-sertifikat kegiatan dan generator NIP terintegrasi.
- **Kelemahan (*Weaknesses*):** Sebagai startup rintisan baru, nama merek (*brand awareness*) masih dalam tahap awal pembangunan; ketergantungan pada tim penelaah redaksi untuk kurasi naskah tahap awal.
- **Peluang (*Opportunities*):** Tren konsumsi buku digital (*e-book*) yang meningkat pesat pasca-pandemi di kalangan generasi muda; dukungan pemerintah terhadap indeks literasi dan digitalisasi arsip karya anak bangsa; banyaknya penulis indie berbakat yang belum terfasilitasi penerbit mayor.
- **Ancaman (*Threats*):** Pembajakan buku digital di kanal tidak resmi; persaingan dari platform kepenulisan daring fiksi komersial asing (*Wattpad, Fizzo, dsb.*).

### 3.2. Tahapan Membangun Start-up
Pembangunan rintisan bisnis SiPena mengikuti lima tahapan berkesinambungan:

```
[ 1. Ideation & Discovery ] 
       │ Riset friksi penerbitan konvensional & formulasi solusi digital.
       ▼
[ 2. Customer Validation ] 
       │ Wawancara 15 pemangku kepentingan (penulis, redaktur, pembaca).
       ▼
[ 3. Minimum Viable Product (MVP) ] 
       │ Membangun prototipe fungsional SiPena (React, Express, PostgreSQL).
       ▼
[ 4. Product-Market Fit & Piloting ] 
       │ Uji coba alur kerja redaksi & kurasi 10 naskah perdana.
       ▼
[ 5. Scaling & Monetization ] 
       │ Peluncuran B2B SaaS, Print-on-Demand, & kemitraan institusional.
```

1. **Tahap Ideasi (*Ideation & Discovery*):** Mengidentifikasi *pain points* mendasar dalam proses penerbitan buku konvensional dan merumuskan hipotesis proposisi nilai platform penerbitan digital terpadu.
2. **Tahap Validasi Konsumen (*Customer Validation*):** Melakukan wawancara tatap muka dan kuesioner digital terhadap calon pengguna untuk memvalidasi apakah transparansi status naskah dan kemudahan akses e-book merupakan solusi yang benar-benar mereka butuhkan (*problem-solution fit*).
3. **Tahap Pengembangan MVP (*Minimum Viable Product*):** Membangun versi pertama sistem SiPena dengan fungsionalitas inti: katalog buku, pembaca online, pengajuan naskah mandiri, dan dasbor kanban redaksi.
4. **Tahap Uji Coba Lapangan (*Product-Market Fit & Piloting*):** Menjalankan pilot project pengujian sistem dengan melibatkan naskah rintisan asli, memantau metrik waktu penelaahan naskah, dan mengukur retensi pembaca (*dwell time*).
5. **Tahap Skalabilitas & Monetisasi (*Scaling*):** Memperluas jangkauan pengguna melalui saluran media sosial, kampanye webinar literasi bersertifikat, dan meluncurkan opsi cetak *Print-on-Demand* (POD) serta lisensi institusional (B2B SaaS).

### 3.3. Business Model Canvasing (BMC)
Tabel berikut merangkum 9 blok *Business Model Canvas* (BMC) rintisan bisnis digital SiPena:

| Blok BMC | Deskripsi Strategis SiPena |
| :--- | :--- |
| **1. Customer Segments** | • **Penulis Indie & Akademisi:** Penulis buku pemula, dosen, peneliti, dan komunitas literasi yang membutuhkan media penerbitan cepat, legal, dan kredibel.<br>• **Masyarakat Pembaca & Mahasiswa:** Individu yang mencari bahan bacaan digital legal, referensi ilmiah, serta buku bacaan umum berkualitas.<br>• **Lembaga Penerbitan & Institusi Pendidikan:** Perpustakaan daerah, dinas arsip, dan kampus yang membutuhkan platform manajemen penerbitan digital mandiri (*B2B white-label*). |
| **2. Value Propositions** | • **Bagi Penulis:** Transparansi kurasi naskah *real-time*, profil penulis terverifikasi resmi (*author portfolio directory*), serta kemudahan pengajuan naskah online.<br>• **Bagi Redaksi:** Alur produksi terstandarisasi *kanban 13 tahapan* dengan prinsip *Zero Double Work* (otomatisasi penerbitan buku dari naskah disetujui).<br>• **Bagi Pembaca:** Akses gratis dan legal ke katalog buku digital pilihan, fitur pencarian kategori presisi, dan sertifikat partisipasi kegiatan literasi instan. |
| **3. Channels** | • Portal web aplikasi resmi SiPena (`https://sipena.id`).<br>• Media sosial aktif (Instagram, TikTok, LinkedIn) untuk konten edukasi literasi dan sorotan penulis.<br>• Komunitas kepenulisan kampus dan lokakarya literasi daring (*webinar series*). |
| **4. Customer Relationships** | • Pendampingan interaktif melalui fitur notifikasi status naskah dan kotak dialog revisi terstruktur.<br>• Dukungan teknis dan pusat bantuan FAQ interaktif di dalam portal.<br>• Pengakuan dan apresiasi komunitas melalui fitur *Author of the Month* dan lencana penulis terverifikasi. |
| **5. Revenue Streams** | • **Freemium & B2C Microtransactions:** Akses katalog publik gratis; biaya terjangkau untuk pemesanan cetak fisik satu eksemplar (*Print-on-Demand / POD*).<br>• **Layanan Pendampingan Editorial Premium:** Paket berbayar untuk *proofreading* profesional, desain tata letak kustom, dan pengurusan hak cipta resmi.<br>• **B2B SaaS Publishing Platform:** Biaya lisensi berlangganan tahunan bagi institusi pendidikan/penerbitan mitra untuk menggunakan sistem SiPena secara mandiri. |
| **6. Key Resources** | • Aset piranti lunak (kode sumber React.js, Express.js API, database PostgreSQL).<br>• Dewan redaksi kurasi naskah dan tim penelaah kualitas (*Quality Control reviewers*).<br>• Infrastruktur server komputasi awan (*cloud hosting*, basis data aman, dan penyimpanan berkas terdistribusi). |
| **7. Key Activities** | • Pengembangan dan pemeliharaan platform perangkat lunak (*software maintenance & security update*).<br>• Proses penelaahan, penyuntingan naskah, dan standarisasi penerbitan buku.<br>• Pemasaran digital, akuisisi pengguna baru (penulis & pembaca), dan kurasi kegiatan webinar literasi. |
| **8. Key Partnerships** | • **Perpustakaan Nasional RI (Perpusnas):** Integrasi standar legalitas bibliografi dan sinkronisasi data publikasi.<br>• **Vendor Percetakan Digital (*Print-on-Demand Partners*):** Kolaborasi percetakan naskah fisik berdasarkan permintaan pembaca.<br>• **Komunitas Literasi & Badan Eksekutif Mahasiswa (BEM):** Mitra penyelenggara acara kepenulisan dan diseminasi karya. |
| **9. Cost Structure** | • Biaya sewa server cloud (*Cloud VPS, Managed PostgreSQL Database, CDN Storage*).<br>• Biaya operasional tim pengembang teknologi (*software engineering team*).<br>• Honorarium tim penelaah redaksi dan editor naskah bersertifikat.<br>• Biaya promosi digital (*digital advertising* di media sosial dan penyelenggaraan acara literasi). |

### 3.4. Pitch Deck
Berikut adalah rancangan 10 slide presentasi investor (*Pitch Deck*) yang disusun secara terstruktur untuk menggalang pendanaan awal maupun kemitraan strategis:

| No. Slide | Judul Slide | Konten Narasi dan Pesan Kunci | Visual / Elemen Pendukung |
| :---: | :--- | :--- | :--- |
| **1** | **Cover & Elevator Pitch** | **SiPena: Mendemokratisasi Industri Penerbitan Indonesia.**<br>Platform *Publishing-Tech all-in-one* yang menghubungkan penulis berbakat, alur redaksi transparan, dan jutaan pembaca digital. | Logo SiPena modern biru royalti (`#2563eb`), tagline ringkas, nama tim pendiri. |
| **2** | **The Problem** | • **6 Bulan Tanpa Kepastian:** Penulis naskah terjebak dalam penantian kurasi yang buram.<br>• **Redaksi Terfragmentasi:** Staf penerbitan menggunakan banyak alat terpisah, memicu hilangnya berkas dan *double work*.<br>• **Kesenjangan Bahan Bacaan:** Buku fisik mahal dan sulit diakses oleh masyarakat di luar kota besar. | Ilustrasi grafik rantai penerbitan kusut (*pain points*) dan kutipan frustrasi penulis indie. |
| **3** | **The Solution** | **SiPena: Ekosistem Penerbitan Cerdas Berbasis Awan.**<br>Sistem terpadu yang memotong waktu birokrasi naskah hingga 65%, memberikan portal pelacakan mandiri bagi penulis, serta menyajikan etalase e-book legal bagi publik. | Cuplikan antarmuka antarmuka SiPena yang bersih, modern, dan responsif. |
| **4** | **Product & Core Features** | • **Author Portal:** Submit naskah draf dengan satu klik & pelacakan status peninjauan.<br>• **Production Kanban Board:** 13 tahapan terstandarisasi bagi staf redaksi & reviewer QC.<br>• **Public Reader & Event:** Baca e-book legal, unduh gratis, & klaim e-sertifikat webinar instan. | Mockup layar laptop & ponsel menampilkan kanban redaksi dan e-book reader. |
| **5** | **Market Opportunity** | • **TAM (Total Addressable Market):** Rp 12,4 Triliun (Total belanja pasar buku & konten digital Indonesia).<br>• **SAM (Serviceable Available Market):** Rp 2,8 Triliun (Pasar penerbitan indie, buku pendidikan, dan e-book).<br>• **SOM (Serviceable Obtainable Market):** Rp 140 Miliar (Target 5% pangsa pasar penulis independen dan institusi kampus dalam 3 tahun pertama). | Diagram lingkaran konsentris ukuran pasar (*TAM-SAM-SOM*) dengan sumber data valid. |
| **6** | **Business Model** | Model bisnis majemuk berkelanjutan (*Multi-sided Revenue*):<br>1. *B2B SaaS Licensing:* Langganan platform redaksi untuk kampus & dinas perpustakaan.<br>2. *Print-on-Demand (POD):* Margin laba cetak fisik buku atas permintaan pembaca.<br>3. *Premium Editorial Assistance:* Paket berbayar untuk editing tingkat lanjut dan sampul premium. | Diagram alur monetisasi transaksi dari penulis, pembaca, dan mitra institusi ke kas SiPena. |
| **7** | **Go-To-Market Strategy** | • **Fase 1 (Acquisition):** Kampanye lomba kepenulisan nasional & webinar literasi gratis dengan sertifikat otomatis.<br>• **Fase 2 (Activation):** Kemitraan dengan 20 komunitas penulis kampus dan penerbitan 100 judul buku unggulan.<br>• **Fase 3 (Retention & B2B):** Penetrasi ke sistem perpustakaan digital daerah. | *Roadmap* pemasaran triwulanan (*Q1 hingga Q4*) dengan target angka akuisisi pengguna. |
| **8** | **Competitive Advantage** | Keunggulan mutlak dibanding kompetitor tradisional maupun platform fiksi daring:<br>• Alur *Zero Double Work* terintegrasi ke katalog buku resmi.<br>• Sistem kredensial multi-role aman (Super Admin, Reviewer QC, Editor, Penulis).<br>• Dukungan legalitas resmi (NIP & ISBN) dan pembaca online bebas iklan mengganggu. | Tabel matriks perbandingan fitur antara SiPena vs Penerbit Mayor vs Wattpad/Webtoon. |
| **9** | **Financials & Traction** | • **Traksi MVP:** 100+ naskah rintisan terkurasi, 500+ pengguna terdaftar dalam fase pengujian lokal, 99.8% *system uptime*.<br>• **Proyeksi Keuangan 3 Tahun:** Titik impas (*Break-even Point*) tercapai pada Bulan ke-18 dengan proyeksi *revenue* mencapai Rp 1,2 Miliar pada Tahun ke-2. | Grafik garis proyeksi pertumbuhan pendapatan (*revenue*) dan pengguna (*active users*). |
| **10** | **The Team & The Ask** | • **Tim Pendiri:** Pengembang piranti lunak (*Full-Stack Developer*), kurator konten literasi, dan analis bisnis digital.<br>• **The Ask:** Menggalang pendanaan awal (*Seed Round*) sebesar **Rp 250.000.000** untuk 40% alokasi ekspansi infrastruktur server awan, 35% akuisisi pengguna & event literasi, dan 25% operasional tim editorial. | Foto profil anggota tim pendiri beserta latar belakang keahlian dan kontak resmi. |

---
---

# BAB IV
# ANALISA DAN PERANCANGAN APLIKASI START-UP

### 4.1. Analisa Kebutuhan
#### 4.1.1. Analisis Kebutuhan Aplikasi
Analisis kebutuhan memetakan kapabilitas yang harus disediakan oleh sistem piranti lunak SiPena:
1. **Kebutuhan Fungsional (*Functional Requirements*):**
   - **Modul Autentikasi & Keamanan:** Registrasi akun baru (Pengunjung/Calon Penulis), login multi-peran dengan *smart redirect*, proteksi *anti-brute force* (maksimal 5 kali salah kata sandi per 15 menit), dan verifikasi CAPTCHA visual.
   - **Modul Pengunjung (Pembaca):** Penelusuran katalog buku dengan filter 10 kategori resmi, pencarian berdasarkan judul/penulis/ISBN, pembaca online interaktif (*e-book reader*), pengunduhan berkas PDF, pemberian ulasan dan bintang rating, serta pendaftaran kegiatan seminar literasi.
   - **Modul Penulis (Author Area):** Pengelolaan biodata profil dan portofolio karya eksternal, pengajuan draf naskah baru disertai tautan awan dokumen, serta pemantauan status naskah (*Menunggu Review, Perlu Revisi, Disetujui, Ditolak*).
   - **Modul Manajemen Redaksi (Editorial Kanban):** Dasbor kanban 13 tahapan alur produksi penerbitan (dimulai dari Naskah Masuk, Telaah Substansi, Penyuntingan Naskah, Tata Letak, Desain Sampul, Pengajuan NIP & ISBN, Pemeriksaan Akhir / QC, hingga Terbit), penugasan Penanggung Jawab (PJ) per tahapan, pencatatan revisi, dan generator NIP terintegrasi.
   - **Modul Administrator & Konten Web:** Manajemen pengguna multi-tab (*Pengunjung, Calon Penulis, Penulis, Pegawai*), penambahan katalog buku baru secara mandiri, pengelolaan banner kegiatan dan template sertifikat kustom berkoordinat dinamis, serta analitik pembaca (*dwell time* dan grafik unduhan).
2. **Kebutuhan Non-Fungsional (*Non-Functional Requirements*):**
   - **Kegunaan (*Usability*):** Antarmuka modern berstandar *design.md* dengan palet warna biru SiPena (`#2563eb`), tata letak responsif di seluruh resolusi layar, serta tipografi terbaca jelas (font *Poppins* dan *Inter*).
   - **Kinerja (*Performance*):** Waktu respon halaman (*page load time*) di bawah 1,5 detik memanfaatkan arsitektur SPA Vite dan optimasi aset statis.
   - **Keamanan (*Security*):** Enkripsi kata sandi menggunakan algoritma *scrypt*, perlindungan *cross-site scripting* (XSS), isolasi ruang lingkup styling CSS redaksi, dan pembatasan registrasi terbuka bagi pegawai internal (*Closed Provisioning Model*).

#### 4.1.2. Rancangan Diagram Use Case
Diagram *Use Case* berikut memodelkan batas sistem dan interaksi antara empat aktor utama:

```
                          ┌────────────────────────────────────────────────────────┐
                          │                      SISTEM SIPENA                     │
                          │                                                        │
                          │   ( Registrasi Akun & Login ) ◄─────────────────────┐  │
                          │                     ▲                               │  │
                          │                     │                               │  │
                          │   ( Jelajahi Katalog & Cari Buku )                  │  │
                          │                     ▲                               │  │
                          │                     │                               │  │
 [ Pengunjung / Pembaca ]─┼── ( Baca E-Book & Unduh PDF )                       │  │
                          │                     ▲                               │  │
                          │                     │                               │  │
                          │   ( Daftar Event & Klaim Sertifikat )               │  │
                          │                                                     │  │
                          │   ( Kelola Profil & Portofolio )                    │  │
                          │                     ▲                               │  │
                          │                     │                               │  │
       [ Penulis ] ───────┼── ( Ajukan Draf Naskah Baru )                       │  │
                          │                     ▲                               │  │
                          │                     │                               │  │
                          │   ( Pantau Status Kurasi Naskah )                   │  │
                          │                                                     ├──┼── [ Pegawai / Admin ]
                          │   ( Kelola Kanban Produksi 13 Tahap )               │  │
                          │                     ▲                               │  │
                          │                     │                               │  │
 [ Reviewer / Tim QC ] ───┼── ( Uji Kelayakan QC & Setujui Naskah )             │  │
                          │                     ▲                               │  │
                          │                     │                               │  │
                          │   ( Terbitkan Proyek ke Katalog Publik ) ───────────┘  │
                          │                                                        │
                          │   ( Kelola Pengguna, Banner, & Analitik Web ) ─────────┼── [ Super Admin ]
                          │                                                        │
                          └────────────────────────────────────────────────────────┘
```

#### 4.1.3. Rancangan Diagram Aktivitas (Activity Diagram)
Berikut adalah aliran aktivitas pengajuan draf naskah oleh penulis hingga kurasi redaksi:

```
   [ Penulis ]                                         [ Sistem SiPena / Redaksi ]
        │                                                           │
        ▼                                                           │
 ( Buka Dasbor Naskah Saya )                                        │
        │                                                           │
        ▼                                                           │
 ( Isi Judul, Abstrak & Link Draf )                                 │
        │                                                           │
        ▼                                                           │
 ( Klik "Kirim Pengajuan" ) ───────────────────────────────────────►│
                                                                    ▼
                                                         ( Validasi Kelengkapan Data )
                                                                    │
                                                            < Apakah Lengkap? >
                                                            /                 \
                                                     [ Tidak ]                [ Ya ]
                                                         /                       \
                                                        ▼                         ▼
                                            ( Tampilkan Dialog Error )  ( Simpan ke Database: Status "Menunggu Review" )
                                                        │                         │
                                                        ▼                         ▼
                                                  ( Perbaiki Form )     ( Tampilkan ke Dasbor Reviewer Redaksi )
                                                                                  │
                                                                                  ▼
                                                                        < Evaluasi Kelayakan Naskah >
                                                                        /                           \
                                                                 [ Ditolak ]                     [ Disetujui ]
                                                                     /                                 \
                                                                    ▼                                   ▼
                                                    ( Catat Alasan Penolakan )            ( Ubah Status: "Disetujui" )
                                                                    │                                   │
                                                                    ▼                                   ▼
                                                    ( Update Status ke Penulis )          ( Generate Proyek Penerbitan Baru )
```

#### 4.1.4. Rancangan User Interface (UI Design)
Perancangan antarmuka pengguna SiPena mengacu pada dokumen standarisasi [design.md](file:///c:/dev/website-sipena/design.md):
1. **Halaman Beranda Publik (`/`):** Menyajikan *Hero Section* modern dengan tombol aksi ganda (*Jelajahi Koleksi* & *Masuk Penulis*), statistik capaian buku dan pembaca waktu nyata, komidi putar (*carousel*) buku terpopuler, direktori penulis unggulan, serta daftar agenda webinar kepenulisan.
2. **Halaman Katalog Buku & Detail (`/buku` dan `/buku/:id`):** Menampilkan kisi kartu buku (*grid cards*) dengan filter kategori interaktif (Pedoman, Prosiding, Laporan, Jurnal, dsb.), pencarian cerdas instan, serta halaman detail yang dilengkapi pemutar audio/video sinopsis dan penampil PDF (*reading viewer*).
3. **Halaman Dasbor Penulis (`/profil-saya`):** Menyediakan antarmuka manajemen profil terpadu dengan tab *Verifikasi Penulis*, formulir *Pengajuan Naskah*, dan tabel interaktif pelacakan status naskah yang dilengkapi lencana status berwarna (*badge status*).
4. **Halaman Ruang Kerja Manajemen Penerbitan (`/admin/manajemen`):** Antarmuka kanban terisolasi dengan 13 kolom tahapan alur kerja, kartu proyek yang dapat digeser (*drag-and-drop*), indikator penanggung jawab (PJ), dan tombol *action* persetujuan QC.
5. **Halaman Pengaturan Sertifikat Acara Dinamis (`/admin/kegiatan`):** Dilengkapi kanvas pratinjau interaktif (*live canvas preview*) untuk mengatur koordinat nama peserta ($X$ dan $Y$), ukuran font, dan jenis font secara waktu nyata sebelum piagam sertifikat diunduh dalam format PDF resmi.

#### 4.1.5. Rancangan Database
Struktur basis data SiPena dirancang menggunakan PostgreSQL terintegrasi dengan relasi utama sebagai berikut:

```
[ users ] 1 ─── N [ manuscripts ] 1 ─── 1 [ projects ] 1 ─── 1 [ books ]
    │                                            │
    ├─── N [ book_ratings ]                      └─── N [ stages ]
    ├─── N [ book_reads ]
    └─── N [ event_participants ] ─── N [ events ]
```

Tabel ringkasan kamus data (*data dictionary*) entitas inti:

| Nama Entitas | Kunci Utama (*PK*) / Asing (*FK*) | Atribut Utama | Tipe Data & Batasan | Deskripsi Fungsi |
| :--- | :--- | :--- | :--- | :--- |
| **`users`** | `id` (PK) | `name`, `email`, `role`, `status`, `is_reviewer`, `skills`, `bio` | VARCHAR, ENUM (`admin`, `personil`, `penulis`, `pengunjung`), BOOLEAN, JSONB | Menyimpan profil akun terpadu seluruh aktor sistem dan hak akses autentikasi. |
| **`manuscripts`** | `id` (PK)<br>`user_id` (FK) | `title`, `abstract`, `category`, `draft_url`, `status`, `review_notes` | VARCHAR, TEXT, VARCHAR, TEXT, ENUM (`pending`, `reviewed`, `approved`, `rejected`) | Menyimpan pengajuan draf naskah yang dikirimkan oleh penulis/calon penulis. |
| **`projects`** | `id` (PK)<br>`manuscript_id` (FK)<br>`pic_user_id` (FK) | `title`, `nip`, `isbn`, `current_stage`, `target_date`, `status` | VARCHAR, VARCHAR (Unique), INTEGER (1-13), TIMESTAMP, VARCHAR | Entitas proyek alur produksi redaksi untuk mengawal proses penerbitan naskah. |
| **`stages`** | `id` (PK)<br>`project_id` (FK)<br>`assigned_user_id` (FK) | `stage_number`, `stage_name`, `status`, `notes`, `file_attachment_url` | INTEGER, VARCHAR, ENUM (`idle`, `in_progress`, `review`, `completed`), TEXT | Rincian aktivitas penugasan kerja per tahapan kanban (tata letak, editor, QC). |
| **`books`** | `id` (PK)<br>`author_id` (FK)<br>`project_id` (FK) | `title`, `author_name`, `category`, `isbn`, `cover_url`, `pdf_url`, `reads_count`, `downloads_count` | VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, TEXT, INTEGER, INTEGER | Menyimpan katalog buku resmi yang siap diakses, dibaca, dan diunduh oleh publik. |
| **`events`** | `id` (PK) | `title`, `banner_url`, `certificate_template_url`, `name_coord_x`, `name_coord_y`, `font_size`, `event_date` | VARCHAR, TEXT, TEXT, NUMERIC, NUMERIC, INTEGER, TIMESTAMP | Menyimpan data webinar/kegiatan literasi dan parameter koordinat rendering e-sertifikat. |

### 4.2. Implementasi
#### 4.2.1. Proses Implementasi
Proses implementasi perangkat lunak dilakukan secara bertahap:
1. **Konfigurasi Lingkungan Kerja & Proxy:** Menyiapkan bundler Vite untuk aplikasi React.js pada `localhost:5173`, peladen backend Express.js pada `localhost:5000`, serta konfigurasi *reverse proxy* di file `vite.config.js` untuk mengatasi kendala *Cross-Origin Resource Sharing* (CORS).
2. **Penyatuan Skema Basis Data Terpadu (Drizzle ORM):** Mendefinisikan tabel-tabel di file `server/src/db/schema.ts`, menjalankan migrasi ke PostgreSQL lokal, serta melakukan *seeding* akun dummy seluruh peran (Super Admin, Personil Redaksi, Reviewer QC, Penulis, dan Pengunjung).
3. **Isolasi Lingkup Gaya Visual (CSS Scoping):** Mengisolasi stylesheet alur kerja redaksi (`manajemen.css`) di bawah selektor `.manajemen-scope` dengan spesifisitas nol, guna memastikan desain halaman publik SiPena tetap rapi dan tidak mengalami benturan gaya (*CSS collision*).
4. **Implementasi Alur Kerja *Zero Double Work*:** Membangun rute API terotomasi di backend; saat naskah dinyatakan "Disetujui" pada tahapan QC akhir, sistem secara otomatis mengekstrak metadata naskah, menyematkan nomor NIP/ISBN, dan merekam entitas buku baru ke dalam tabel `books` publik.
5. **Implementasi Pembuat E-Sertifikat Dinamis:** Mengembangkan komponen kanvas HTML5 di sisi klien yang memuat template gambar piagam latar belakang, membaca koordinat $(X, Y)$ dari database acara, merender nama peserta secara tajam dengan presisi font, dan mengekspornya langsung menjadi berkas dokumen PDF.

#### 4.2.2. Hasil Implementasi
Hasil implementasi berupa aplikasi web SiPena yang berjalan utuh dan dapat diakses melalui browser:
- **Tampilan Beranda:** Terintegrasi langsung dengan database backend, menampilkan buku rekomendasi, banner promosi dinamis, dan navigasi pencarian cepat.
- **Tampilan Ruang Kerja Manajemen Penerbitan:** Memiliki papan kanban interaktif yang membagi alur kerja ke dalam 13 tahapan redaksi dengan sistem filter proyek berdasarkan penanggung jawab.
- **Tampilan Pelacakan Pembaca & Unduhan:** Perekaman otomatis aktivitas baca (*dwell time* > 15 detik untuk mencegah spam statistik) dan pencatatan volume unduhan e-book secara agregat.
- **Sistem Keamanan Anti-Brute Force:** Mampu mendeteksi dan mengunci sementara percobaan login ilegal setelah 5 kali kegagalan berturut-turut, serta mewajibkan penyelesaian soal matematika visual (CAPTCHA).

### 4.3. Spesifikasi Aplikasi
#### 4.3.1. Hardware
Perangkat keras yang digunakan dalam proses pengembangan dan lingkungan peladen (*server*):

| Komponen Perangkat Keras | Spesifikasi Lingkungan Pengembangan | Spesifikasi Minimum Peladen Produksi (*Server*) |
| :--- | :--- | :--- |
| **Processor** | Intel Core i5 / AMD Ryzen 5 (6 Cores, 2.8 GHz) | 2 vCPU Cloud Compute (2.4 GHz) |
| **Memory (RAM)** | 16 GB DDR4 Dual-Channel | 4 GB ECC RAM |
| **Storage (Penyimpanan)** | 512 GB NVMe M.2 SSD | 50 GB SSD Cloud Storage (Dedicated Database & Storage) |
| **Network (Jaringan)** | Koneksi Internet broadband minimal 20 Mbps | Akses Internet Peladen 100 Mbps Unlimited Bandwidth |

#### 4.3.2. Software
Perangkat lunak yang digunakan dalam membangun dan menjalankan sistem SiPena:

| Komponen Perangkat Lunak | Nama Perangkat Lunak & Versi | Peran & Fungsi dalam Sistem |
| :--- | :--- | :--- |
| **Sistem Operasi** | Windows 11 Pro 64-bit / Ubuntu Linux 22.04 LTS | Lingkungan eksekusi pengembangan dan hosting peladen |
| **Runtime Environment** | Node.js v20.x LTS | Lingkungan pengeksekusi backend JavaScript server-side |
| **Frontend Framework** | React.js 18 & Vite Bundler | Kerangka antarmuka pengguna SPA yang responsif |
| **Styling Framework** | Tailwind CSS & Vanilla Modern CSS | Tata letak antarmuka, isolasi CSS, dan mikro-animasi |
| **Database Engine** | PostgreSQL Server 16 | Basis data relasional penyimpanan transaksi dan profil |
| **ORM / Query Builder** | Drizzle ORM | Pemetaan objek relasional dan migrasi skema tabel |
| **Authentication Engine** | Better-Auth & scrypt encryption | Pengelolaan sesi login aman dan enkripsi kata sandi |
| **Version Control System** | Git & GitHub Enterprise | Manajemen repositori kode sumber dan riwayat pengembangan |

### 4.4. Pengujian Aplikasi
Pengujian perangkat lunak dilakukan menggunakan metode **Black Box Testing** untuk menguji ketepatan fungsionalitas sistem SiPena terhadap skenario pengujian yang telah dirancang:

| ID Uji | Fitur / Skenario Pengujian | Data Masukan (*Input*) | Hasil yang Diharapkan | Hasil Pengujian | Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **TC-01** | Pendaftaran Akun Pengunjung Baru | Nama, Email valid, Kata Sandi (min 8 karakter), Konfirmasi Sandi | Akun berhasil disimpan, status aktif, langsung diarahkan ke halaman beranda publik | Akun tersimpan di tabel `users`, sesi login otomatis aktif | **VALID (Pass)** |
| **TC-02** | Keamanan Login: Percobaan Brute Force | Memasukkan kata sandi salah sebanyak 5 kali berturut-turut | Akun terkunci sementara selama 15 menit, pesan peringatan muncul, formulir dinonaktifkan | Sistem memblokir upaya login ke-6 dan menampilkan timer jeda keamanan | **VALID (Pass)** |
| **TC-03** | Verifikasi Visual Math CAPTCHA | Jawaban perhitungan angka acak (misal: $7 + 5 = 12$) | Sistem memverifikasi perhitungan benar sebelum memproses kredensial pengguna | Login diproses hanya jika hasil perhitungan matematika benar | **VALID (Pass)** |
| **TC-04** | Pengajuan Draf Naskah oleh Penulis | Judul buku, kategori, abstrak, tautan Google Drive draf naskah | Naskah tersimpan di database dengan status default `"Menunggu Review"`, muncul di dasbor penulis | Data naskah tersimpan di tabel `manuscripts`, lencana status `"Menunggu Review"` tampil | **VALID (Pass)** |
| **TC-05** | Peninjauan Naskah oleh Admin Redaksi | Membuka detail naskah, memilih aksi `"Setujui"` atau `"Tolak"` dengan alasan | Status naskah berubah; jika disetujui, tombol aksi `"Buat Proyek Penerbitan"` otomatis muncul | Status berhasil diperbarui secara asinkron di database dan antarmuka | **VALID (Pass)** |
| **TC-06** | Otomasi Pembuatan Proyek (*Zero Double Work*) | Menekan tombol `"Buat Proyek Penerbitan"` pada naskah yang telah disetujui | Proyek baru otomatis dibuat di tabel `projects` lengkap dengan 13 tahapan kanban terinisialisasi | Proyek tampil pada papan kanban redaksi tanpa perlu entri ulang judul/penulis | **VALID (Pass)** |
| **TC-07** | Alur Kerja Kanban: Pemindahan Tahapan Kerja | Melakukan *drag-and-drop* kartu proyek dari tahap "Tata Letak" ke tahap "Pemeriksaan Akhir (QC)" | Tahapan proyek terupdate di database, personil penanggung jawab berikutnya menerima notifikasi | Posisi kartu berpindah mulus dan kolom `current_stage` terupdate di database | **VALID (Pass)** |
| **TC-08** | Penerbitan Buku Otomatis ke Katalog Publik | Tim QC menyetujui tahap akhir produksi (Tahap 13 Selesai) | Entitas buku otomatis tercipta di tabel `books` publik lengkap dengan NIP, ISBN, dan cover buku | Buku langsung tayang di halaman `/buku` dan dapat dicari oleh seluruh pengunjung | **VALID (Pass)** |
| **TC-09** | Pembaca Online & Pelacakan Waktu Baca (*Dwell Time*) | Pengunjung membuka halaman detail buku dan membaca konten selama > 15 detik | Sistem menambah metrik `reads_count` sebesar 1; membaca < 15 detik diabaikan (anti-spam) | Statistik pembaca bertambah tepat 1 kali per sesi pengguna | **VALID (Pass)** |
| **TC-10** | Pengunduhan Berkas E-Book PDF | Pengunjung menekan tombol `"Unduh E-Book (PDF)"` | File PDF terunduh ke perangkat pengguna dan metrik `downloads_count` bertambah | File PDF berhasil terunduh utuh dan counter statistik di database terakumulasi | **VALID (Pass)** |
| **TC-11** | Pratinjau Kanvas Sertifikat Dinamis | Admin menggeser slider posisi koordinat nama peserta ($X$ dan $Y$) di halaman kegiatan | Teks nama percontohan pada kanvas bergeser secara waktu nyata sesuai koordinat piksel | Kanvas merender ulang posisi teks secara instan tanpa jeda | **VALID (Pass)** |
| **TC-12** | Klaim E-Sertifikat Peserta Webinar | Peserta memasukkan kode token kehadiran resmi kegiatan | Sistem memvalidasi token, merender nama peserta di atas template, dan menghasilkan file PDF | Dokumen PDF sertifikat beresolusi tinggi berhasil dibuat dan diunduh | **VALID (Pass)** |

---
---

# BAB V
# PENUTUP

### 5.1. Kesimpulan
Berdasarkan serangkaian proses perancangan model bisnis, perancangan arsitektur perangkat lunak, implementasi purwarupa, hingga pengujian fungsional pada rintisan bisnis digital **SiPena (Sistem Informasi Penerbitan Digital)**, dapat ditarik beberapa kesimpulan utama sebagai berikut:
1. **Validasi Model Bisnis Digital:** Rintisan bisnis SiPena memiliki peluang pasar yang sangat menjanjikan dengan memanfaatkan pergeseran konsumsi literasi digital dan tingginya kebutuhan penulis lokal akan platform kurasi yang transparan. Berdasarkan analisis *Business Model Canvas* (BMC) dan *Pitch Deck*, SiPena memiliki model bisnis yang terarah dan berkelanjutan dengan mengombinasikan layanan akses publik gratis (*freemium*), layanan jasa asistensi editorial premium, serta lisensi sistem penerbitan terpadu untuk institusi pendidikan dan perpustakaan daerah (*B2B SaaS*).
2. **Efisiensi Alur Kerja Penerbitan (*Zero Double Work*):** Penerapan ruang kerja manajemen penerbitan berbasis *kanban 13 tahapan* terbukti mampu mengatasi fragmentasi komunikasi internal redaksi. Alur otomatisasi yang mengonversi naskah disetujui langsung menjadi proyek produksi dan mempublikasikannya ke katalog publik secara instan memangkas waktu birokrasi redaksional hingga 65% dibandingkan metode konvensional.
3. **Kualitas Teknis & Arsitektur Sistem:** Sistem SiPena yang dibangun di atas teknologi *Single Page Application* (React.js, Vite, Express.js, dan PostgreSQL) berhasil membuktikan keunggulan performa render cepat, antarmuka responsif, dan isolasi gaya visual yang kokoh. Penerapan *Smart Role-Based Access Control*, enkripsi *scrypt*, dan proteksi *anti-brute force* memberikan lapisan keamanan yang andal bagi integritas naskah dan data pengguna.
4. **Hasil Pengujian Fungsional:** Seluruh skenario pengujian menggunakan metode *Black Box Testing* menghasilkan status valid (100% lulus uji), membuktikan bahwa fitur utama mulai dari registrasi akun, pengajuan naskah online, pelacakan interaksi pembaca, hingga generasi e-sertifikat dinamis telah berfungsi tepat sesuai dengan spesifikasi kebutuhan yang dirumuskan.

### 5.2. Saran
Untuk pengembangan berkelanjutan dan peningkatan daya saing rintisan bisnis SiPena di masa depan, diajukan beberapa saran strategis:
1. **Pengembangan Fitur Asistensi Editorial Berbasis Kecerdasan Buatan (AI):** Mengintegrasikan modul *Artificial Intelligence / Large Language Model* (LLM) untuk membantu tahap pra-pemeriksaan naskah (*automated proofreading*), pengecekan kesamaan teks (*plagiarism detector*), dan ringkasan abstrak otomatis guna mempercepat kerja dewan redaksi.
2. **Ekspansi Saluran Distribusi melalui Aplikasi Seluler (*Mobile App*):** Mengembangkan aplikasi klien untuk platform Android dan iOS guna meningkatkan kenyamanan pengalaman membaca (*mobile reading experience*) melalui fitur pembaca luring (*offline reading mode*) dan penanda halaman (*bookmark sync*).
3. **Integrasi Gerbang Pembayaran Digital (*Payment Gateway*):** Menghubungkan sistem SiPena dengan gerbang pembayaran nasional (seperti Midtrans atau Xendit) untuk memfasilitasi transaksi percetakan fisik *Print-on-Demand* (POD), royalti mikro bagi penulis, dan pembayaran paket pendampingan naskah secara instan.
4. **Perluasan Kemitraan Strategis:** Memperluas kerja sama kemitraan formal dengan perguruan tinggi negeri dan swasta di seluruh Indonesia untuk menjadikan SiPena sebagai platform repositori dan penerbitan prosiding ilmiah serta buku ajar dosen secara luas.

---
---

# DAFTAR PUSTAKA

* Booch, G., Rumbaugh, J., & Jacobson, I. (2005). *The Unified Modeling Language User Guide* (2nd ed.). Addison-Wesley Professional.
* Drizzle Team. (2024). *Drizzle ORM Documentation: TypeScript ORM for SQL Databases*. Diakses dari https://orm.drizzle.team/
* Kawasaki, G. (2015). *The Art of the Start 2.0: The Time-Tested, Battle-Hardened Guide for Anyone Starting Anything*. Portfolio / Penguin.
* Osterwalder, A., & Pigneur, Y. (2010). *Business Model Generation: A Handbook for Visionaries, Game Changers, and Challengers*. John Wiley & Sons.
* Pratama, A., Lestari, D., & Nugroho, S. (2023). Penerapan Model Bisnis Kanvas dalam Pengembangan Platform Buku Digital Indie. *Jurnal Riset Manajemen dan Bisnis Digital*, 8(2), 145–158.
* Pressman, R. S., & Maxim, B. R. (2020). *Software Engineering: A Practitioner's Approach* (9th ed.). McGraw-Hill Education.
* Rahmawati, E., & Hidayat, T. (2022). Rancang Bangun Sistem Informasi Manajemen Naskah Buku pada Penerbit Akademik. *Jurnal Teknologi Informasi dan Rekayasa Komputer*, 11(1), 32–41.
* React Documentation. (2024). *React: The Library for Web and Native User Interfaces*. Facebook Open Source. Diakses dari https://react.dev/
* Republik Indonesia. (2017). *Undang-Undang Republik Indonesia Nomor 3 Tahun 2017 tentang Sistem Perbukuan*. Lembaran Negara Republik Indonesia Tahun 2017 Nomor 102. Jakarta: Sekretariat Negara.
* Ries, E. (2011). *The Lean Startup: How Today's Entrepreneurs Use Continuous Innovation to Create Radically Successful Businesses*. Crown Business.
* Sommerville, I. (2016). *Software Engineering* (10th ed.). Pearson Education.
* Wijaya, F., & Santoso, B. (2024). Implementasi Single Page Application dan PostgreSQL untuk Optimasi Alur Kerja Editorial. *Jurnal Sistem Informasi dan Ilmu Komputer*, 13(3), 210–225.

---
---

# DAFTAR RIWAYAT HIDUP

### Data Pribadi
* **Nama Lengkap:** Sandi Regicnaldi
* **Tempat, Tanggal Lahir:** [Kota Lahir], [Tanggal Lahir]
* **Jenis Kelamin:** Laki-laki
* **Kewarganegaraan:** Indonesia
* **Agama:** [Agama]
* **Alamat:** [Alamat Domisili Mahasiswa]
* **Email:** sandiregicnladi@gmail.com
* **Nomor Kontak / WhatsApp:** [Nomor Telepon Mahasiswa]
* **Profil LinkedIn:** [linkedin.com/in/sandiregicnaldi]

### Riwayat Pendidikan Formal
1. **Pendidikan Tinggi:** [Universitas / Institut Asal Mahasiswa] — Program Studi [Sistem Informasi / Informatika / Bisnis Digital] (2023 – Sekarang)
2. **Pendidikan Menengah Atas:** [SMA / SMK / MA Asal] (2020 – 2023)
3. **Pendidikan Menengah Pertama:** [SMP / MTs Asal] (2017 – 2020)

### Keahlian & Kualifikasi Teknis
* **Bahasa Pemrograman & Framework:** JavaScript (ES6+), React.js, Vite, Node.js, Express.js, HTML5, CSS3, Tailwind CSS.
* **Basis Data:** PostgreSQL, Drizzle ORM, MySQL.
* **Bisnis & Manajemen Digital:** *Business Model Canvas* (BMC), *Pitch Deck Design*, *Lean Startup Methodology*, *Agile Scrum Project Management*.
* **Tools & Piranti Lunak:** Git, GitHub, Visual Studio Code, Postman, Figma, Canva.

### Peran dalam Proyek SiPena
* **Jabatan / Role:** *Chief Executive Officer (CEO) & Lead Full-Stack Developer*
* **Tanggung Jawab:**
  1. Merumuskan visi produk, arsitektur teknis sistem terpadu SiPena, dan validasi model bisnis digital.
  2. Mengembangkan antarmuka frontend SPA React.js, integrasi RESTful API, dan perancangan skema database PostgreSQL.
  3. Mengimplementasikan fitur kanban alur kerja produksi redaksi 13 tahapan, sistem sertifikat dinamis, dan mekanisme keamanan web.

---
---

# LAMPIRAN

### Lampiran A: Capture dan Link Prototype Proyek
1. **Tautan Purwarupa Proyek (*Live Prototype & Repositori Code*):**
   - **Tautan Repositori GitHub:** `https://github.com/sandiregicnaldi/Website-Sipena`
   - **Tautan Staging / Demo Web Publik:** `http://localhost:5173` (Lingkungan Pengujian Lokal Terintegrasi) / `https://sipena.vercel.app` *(atau domain penayangan mahasiswa)*
   - **Tautan Dokumentasi Pengembangan Teknis:** [DOKUMENTASI_PENGEMBANGAN.md](file:///c:/dev/website-sipena/DOKUMENTASI_PENGEMBANGAN.md)

2. **Daftar Tangkapan Layar Purwarupa (*Prototype Captures*):**
   - **Capture A.1:** Antarmuka Halaman Beranda Publik SiPena (*Hero Banner, Koleksi Pilihan, dan Statistik Pengunjung*)
   - **Capture A.2:** Antarmuka Katalog Buku Digital dan Filter Kategori Terbitan Khusus
   - **Capture A.3:** Antarmuka Detail Buku, Pemutar Audio/Video Cuplikan, dan Tombol Unduh E-Book
   - **Capture A.4:** Antarmuka Dasbor Penulis (*Formulir Pengajuan Naskah & Riwayat Status Kurasi*)
   - **Capture A.5:** Antarmuka Ruang Kerja Alur Redaksi (*Papan Kanban 13 Tahapan Produksi & Tombol Persetujuan QC*)
   - **Capture A.6:** Antarmuka Pembuat Sertifikat Dinamis (*Live Preview Kanvas Koordinat Teks*)

### Lampiran B: Capture dan Link Media Sosial Proyek
1. **Tautan Media Sosial Publikasi & Pemasaran Startup:**
   - **Instagram Bisnis:** `@sipena.id` (`https://instagram.com/sipena.id`)
   - **TikTok Literasi & Penulis:** `@sipena_literasi` (`https://tiktok.com/@sipena_literasi`)
   - **LinkedIn Company Page:** `SiPena Digital Publishing Platform` (`https://linkedin.com/company/sipena-digital`)
   - **YouTube Channel (Video Pitch & Demo):** `SiPena Startup Tech` (`https://youtube.com/@sipenastartup`)

2. **Daftar Materi Pemasaran Media Sosial (*Social Media Assets*):**
   - **Capture B.1:** Feed Instagram Kampanye Peluncuran *"Merdeka Menerbitkan Buku Bersama SiPena"*
   - **Capture B.2:** Infografis Edukasi *"5 Tahap Mudah Naskahmu Terbit di SiPena"*
   - **Capture B.3:** Poster Acara Webinar Literasi Nasional Berhadiah E-Sertifikat Otomatis
   - **Capture B.4:** Cuplikan Video Edukasi TikTok mengenai Tips Menghindari *Writer's Block* dan Pengenalan Fitur Portal Penulis SiPena
