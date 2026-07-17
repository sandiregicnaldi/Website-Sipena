import React, { useState } from 'react';
import './FAQPage.css';

const FAQ_DATA = [
  {
    kategori: 'Pendaftaran & Akun',
    icon: '👤',
    items: [
      {
        q: 'Bagaimana cara mendaftar sebagai penulis di SiPena?',
        a: 'Klik tombol "Masuk / Daftar" di pojok kanan atas, pilih tab "Daftar", lalu pilih peran "Penulis". Isi formulir dengan data diri yang lengkap dan valid. Setelah mendaftar, Anda dapat langsung mengakses halaman Profil Saya untuk melengkapi profil penulis.'
      },
      {
        q: 'Apa perbedaan antara Penulis dan Calon Penulis?',
        a: '"Calon Penulis" adalah akun untuk Anda yang sedang dalam proses pengajuan naskah atau verifikasi. Setelah naskah disetujui dan diverifikasi oleh editor, akun Anda akan ditingkatkan menjadi "Penulis" dengan akses penuh ke fitur profil penulis.'
      },
      {
        q: 'Lupa kata sandi, bagaimana cara meresetnya?',
        a: 'Pada halaman login, klik tautan "Lupa Kata Sandi". Masukkan email yang terdaftar, dan kami akan mengirimkan tautan reset ke email Anda dalam beberapa menit. Pastikan memeriksa folder spam jika email tidak ditemukan di kotak masuk.'
      },
    ]
  },
  {
    kategori: 'Penerbitan Buku',
    icon: '📚',
    items: [
      {
        q: 'Bagaimana prosedur pengajuan naskah ke Perpusnas Press?',
        a: 'Prosedur pengajuan naskah meliputi: (1) Login sebagai Calon Penulis, (2) Unggah naskah dalam format yang ditentukan (DOC/DOCX/PDF), (3) Tim editor akan melakukan telaah awal dalam 5-7 hari kerja, (4) Jika lolos seleksi awal, naskah akan masuk proses review lebih lanjut, (5) Keputusan akhir disampaikan melalui email.'
      },
      {
        q: 'Berapa lama proses penerbitan berlangsung?',
        a: 'Proses penerbitan secara keseluruhan berlangsung sekitar 3-6 bulan, tergantung kompleksitas naskah. Proses ini meliputi: seleksi naskah (1-2 minggu), review isi (4-8 minggu), editing & layout (4-6 minggu), serta proses cetak dan distribusi (2-4 minggu).'
      },
      {
        q: 'Apakah saya akan mendapatkan royalti dari buku yang diterbitkan?',
        a: 'Ketentuan royalti diatur dalam perjanjian penerbitan yang ditandatangani antara penulis dan Perpusnas Press. Besaran royalti dan mekanisme pembayaran akan dijelaskan secara rinci oleh tim editor setelah naskah diterima untuk diterbitkan.'
      },
      {
        q: 'Format naskah apa yang diterima oleh Perpusnas Press?',
        a: 'Perpusnas Press menerima naskah dalam format Microsoft Word (.doc/.docx) dengan ketentuan: ukuran kertas A4, font Times New Roman 12pt, spasi 1.5, margin 3cm di semua sisi. Detail panduan penulisan lengkap tersedia di bagian Layanan Penerbitan.'
      },
    ]
  },
  {
    kategori: 'Koleksi & Unduhan',
    icon: '📥',
    items: [
      {
        q: 'Apakah semua buku dapat diunduh secara gratis?',
        a: 'Sebagian besar koleksi Perpusnas Press dapat diunduh secara gratis oleh masyarakat umum. Beberapa publikasi khusus mungkin memerlukan login atau proses pendaftaran terlebih dahulu. Informasi ketersediaan unduhan tertera di halaman detail setiap buku.'
      },
      {
        q: 'Format apa saja yang tersedia untuk unduhan?',
        a: 'Koleksi tersedia dalam format PDF untuk dokumen lengkap. Beberapa publikasi juga tersedia dalam format ePub untuk kemudahan membaca di perangkat mobile. Format yang tersedia akan ditampilkan di halaman detail buku.'
      },
      {
        q: 'Bisakah saya menggunakan materi dari koleksi Perpusnas Press untuk keperluan penelitian?',
        a: 'Ya, koleksi Perpusnas Press dapat digunakan untuk keperluan pendidikan, penelitian, dan non-komersial dengan mencantumkan sumber yang benar. Penggunaan untuk keperluan komersial memerlukan izin tertulis dari Perpusnas Press.'
      },
    ]
  },
  {
    kategori: 'Teknis & Sistem',
    icon: '⚙️',
    items: [
      {
        q: 'Browser apa yang direkomendasikan untuk menggunakan SiPena?',
        a: 'SiPena dapat diakses melalui browser modern seperti Google Chrome (versi 90+), Mozilla Firefox (versi 88+), Microsoft Edge (versi 90+), dan Safari (versi 14+). Pastikan browser Anda selalu diperbarui untuk pengalaman terbaik.'
      },
      {
        q: 'Apa yang harus dilakukan jika mengalami masalah teknis?',
        a: 'Jika mengalami masalah teknis, coba langkah berikut: (1) Refresh halaman, (2) Bersihkan cache browser, (3) Coba browser lain. Jika masalah berlanjut, hubungi tim teknis kami melalui email sipena@perpusnas.go.id dengan menyertakan screenshot dan deskripsi masalah.'
      },
    ]
  },
];

const FAQItem = ({ q, a }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className={`faq-item ${open ? 'open' : ''}`}>
      <button className="faq-question" onClick={() => setOpen(o => !o)}>
        <span>{q}</span>
        <svg className="faq-chevron" width="18" height="18" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="faq-answer">
          <p>{a}</p>
        </div>
      )}
    </div>
  );
};

const FAQPage = () => {
  const [activeKat, setActiveKat] = useState(null);
  const [search, setSearch] = useState('');

  const filtered = FAQ_DATA.map(kat => ({
    ...kat,
    items: kat.items.filter(item =>
      item.q.toLowerCase().includes(search.toLowerCase()) ||
      item.a.toLowerCase().includes(search.toLowerCase())
    )
  })).filter(kat => kat.items.length > 0);

  return (
    <main className="faq-page">
      {/* Hero */}
      <section className="faq-hero">
        <div className="container">
          <span className="faq-tag">Pusat Bantuan</span>
          <h1 className="faq-hero-title">Pertanyaan yang<br /><span>Sering Diajukan</span></h1>
          <p className="faq-hero-desc">Temukan jawaban atas pertanyaan Anda seputar layanan SiPena dan Perpusnas Press.</p>
          {/* Search */}
          <div className="faq-search-wrap">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              className="faq-search"
              placeholder="Cari pertanyaan..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Category tabs */}
      {!search && (
        <section className="faq-tabs-section">
          <div className="container">
            <div className="faq-tabs">
              <button
                className={`faq-tab ${activeKat === null ? 'active' : ''}`}
                onClick={() => setActiveKat(null)}
              >Semua</button>
              {FAQ_DATA.map(kat => (
                <button
                  key={kat.kategori}
                  className={`faq-tab ${activeKat === kat.kategori ? 'active' : ''}`}
                  onClick={() => setActiveKat(k => k === kat.kategori ? null : kat.kategori)}
                >
                  {kat.icon} {kat.kategori}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ content */}
      <section className="faq-content-section">
        <div className="container">
          {(search ? filtered : (activeKat ? filtered.filter(k => k.kategori === activeKat) : filtered))
            .map(kat => (
              <div key={kat.kategori} className="faq-group">
                <div className="faq-group-header">
                  <span className="faq-group-icon">{kat.icon}</span>
                  <h2 className="faq-group-title">{kat.kategori}</h2>
                  <span className="faq-group-count">{kat.items.length} pertanyaan</span>
                </div>
                <div className="faq-list">
                  {kat.items.map((item, i) => (
                    <FAQItem key={i} q={item.q} a={item.a} />
                  ))}
                </div>
              </div>
            ))
          }
          {filtered.length === 0 && (
            <div className="faq-empty">
              <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>🔍</div>
              <h3>Pertanyaan tidak ditemukan</h3>
              <p>Coba kata kunci lain atau hubungi kami langsung di <strong>sipena@perpusnas.go.id</strong></p>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="faq-cta-section">
        <div className="container">
          <div className="faq-cta-card">
            <div className="faq-cta-icon">💬</div>
            <h2>Masih punya pertanyaan?</h2>
            <p>Tim kami siap membantu Anda. Hubungi kami melalui email atau telepon pada jam kerja.</p>
            <div className="faq-cta-actions">
              <a href="mailto:sipena@perpusnas.go.id" className="btn btn-primary">
                📧 Kirim Email
              </a>
              <a href="tel:0213922749" className="btn btn-outline">
                📞 Hubungi Kami
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default FAQPage;
