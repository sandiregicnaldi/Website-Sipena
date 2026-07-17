import React from 'react';
import './TentangKami.css';

const TIMELINE = [
  { year: '1980', title: 'Pendirian Perpusnas Press', desc: 'Lembaga penerbitan resmi didirikan sebagai bagian dari Perpustakaan Nasional RI untuk menerbitkan karya-karya ilmiah dan literasi kebangsaan.' },
  { year: '1995', title: 'Ekspansi Koleksi Digital', desc: 'Mulai mengembangkan koleksi digital dan perpustakaan elektronik untuk menjangkau pembaca yang lebih luas di seluruh nusantara.' },
  { year: '2010', title: 'Peluncuran Platform Online', desc: 'Meluncurkan portal digital pertama yang memungkinkan unduhan dokumen secara online bagi masyarakat Indonesia.' },
  { year: '2020', title: 'Transformasi Digital SiPena', desc: 'Memperkenalkan Sistem Informasi Penerbitan (SiPena) sebagai platform terintegrasi untuk pengelolaan buku, penulis, dan distribusi konten.' },
  { year: '2026', title: 'Ekosistem Penulis & Pembaca', desc: 'SiPena kini menjadi ekosistem lengkap yang menghubungkan penulis, editor, dan pembaca dalam satu platform yang modern dan inklusif.' },
];

const TEAM = [
  { nama: 'Dr. Hendra Kurniawan', jabatan: 'Kepala Perpusnas Press', inisial: 'HK' },
  { nama: 'Dra. Siti Rahayuningsih', jabatan: 'Kepala Bidang Penerbitan', inisial: 'SR' },
  { nama: 'Ahmad Fauzan, M.Kom', jabatan: 'Kepala Bidang Teknologi', inisial: 'AF' },
  { nama: 'Rina Dewi Kartika, S.Sos', jabatan: 'Kepala Bidang Distribusi', inisial: 'RD' },
];

const TentangKami = () => (
  <main className="tentang-page">
    {/* Hero */}
    <section className="tentang-hero">
      <div className="container">
        <div className="tentang-hero-content">
          <span className="tentang-tag">Tentang Kami</span>
          <h1 className="tentang-hero-title">
            Perpusnas Press —<br />
            <span className="highlight">Penerbit Resmi</span> Perpustakaan Nasional RI
          </h1>
          <p className="tentang-hero-desc">
            Kami hadir untuk menerbitkan, mendistribusikan, dan melestarikan karya-karya ilmiah,
            budaya, dan literasi terbaik bangsa Indonesia demi mencerdaskan kehidupan masyarakat.
          </p>
        </div>
      </div>
    </section>

    {/* Visi Misi */}
    <section className="tentang-visi-section">
      <div className="container">
        <div className="visi-grid">
          <div className="visi-card visi-card--blue">
            <div className="visi-icon">🎯</div>
            <h2>Visi</h2>
            <p>Menjadi lembaga penerbitan terdepan dan terpercaya yang berkontribusi nyata bagi kemajuan literasi dan kebudayaan bangsa Indonesia.</p>
          </div>
          <div className="visi-card visi-card--green">
            <div className="visi-icon">🚀</div>
            <h2>Misi</h2>
            <ul>
              <li>Menerbitkan karya ilmiah, budaya, dan literasi berkualitas tinggi.</li>
              <li>Memperluas akses masyarakat terhadap koleksi penerbitan nasional.</li>
              <li>Mendukung pengembangan ekosistem penulis dan peneliti Indonesia.</li>
              <li>Memanfaatkan teknologi untuk distribusi konten yang efisien dan inklusif.</li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    {/* Stats */}
    <section className="tentang-stats-section">
      <div className="container">
        <div className="tentang-stats-grid">
          {[
            { value: '1.290+', label: 'Judul Buku Diterbitkan' },
            { value: '187',    label: 'Penulis Aktif' },
            { value: '54',     label: 'Laporan & Dokumen' },
            { value: '14.8k',  label: 'Unduhan Tahun Ini' },
          ].map(s => (
            <div key={s.label} className="tentang-stat-item">
              <div className="tentang-stat-value">{s.value}</div>
              <div className="tentang-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Sejarah / Timeline */}
    <section className="tentang-timeline-section">
      <div className="container">
        <h2 className="section-title" id="sejarah">Sejarah Kami</h2>
        <div className="timeline">
          {TIMELINE.map((item, i) => (
            <div key={i} className={`timeline-item ${i % 2 === 0 ? 'left' : 'right'}`}>
              <div className="timeline-dot" />
              <div className="timeline-card">
                <span className="timeline-year">{item.year}</span>
                <h3 className="timeline-title">{item.title}</h3>
                <p className="timeline-desc">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Tim */}
    <section className="tentang-team-section">
      <div className="container">
        <h2 className="section-title" id="tim">Tim Kami</h2>
        <div className="team-grid">
          {TEAM.map((t, i) => (
            <div key={i} className="team-card">
              <div className="team-avatar">{t.inisial}</div>
              <div className="team-name">{t.nama}</div>
              <div className="team-role">{t.jabatan}</div>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Kontak */}
    <section className="tentang-kontak-section">
      <div className="container">
        <div className="kontak-card">
          <h2>📍 Hubungi Kami</h2>
          <div className="kontak-grid">
            <div>
              <strong>Alamat</strong>
              <p>Perpusnas Press, Perpustakaan Nasional RI<br />Jl. Salemba Raya No. 28A, Jakarta Pusat 10430</p>
            </div>
            <div>
              <strong>Telepon & Fax</strong>
              <p>Telp: (021) 3922749, 3154864<br />Fax: (021) 3101472</p>
            </div>
            <div>
              <strong>Email</strong>
              <p>press@perpusnas.go.id<br />sipena@perpusnas.go.id</p>
            </div>
            <div>
              <strong>Jam Layanan</strong>
              <p>Senin – Jumat: 08.00 – 16.00 WIB<br />Sabtu – Minggu: Tutup</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  </main>
);

export default TentangKami;
