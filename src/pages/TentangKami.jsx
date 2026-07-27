import React from 'react';
import { useTentang } from '../context/TentangContext';
import './TentangKami.css';

const TentangKami = () => {
  const { data } = useTentang();

  return (
    <main className="tentang-page">
      {/* Hero */}
      <section className="tentang-hero">
        <div className="container">
          <div className="tentang-hero-content">
            <span className="tentang-tag">Tentang Kami</span>
            <h1 className="tentang-hero-title">
              {data.heroJudul}<br />
              <span className="highlight">{data.heroSubjudul}</span>
            </h1>
            <p className="tentang-hero-desc">{data.heroDeskripsi}</p>
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
              <p>{data.visi}</p>
            </div>
            <div className="visi-card visi-card--green">
              <div className="visi-icon">🚀</div>
              <h2>Misi</h2>
              <ul>
                {data.misi.map((m, i) => <li key={i}>{m}</li>)}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="tentang-stats-section">
        <div className="container">
          <div className="tentang-stats-grid">
            {data.statistik.map(s => (
              <div key={s.label} className="tentang-stat-item">
                <div className="tentang-stat-value">{s.value}</div>
                <div className="tentang-stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline Sejarah */}
      <section className="tentang-timeline-section">
        <div className="container">
          <h2 className="section-title" id="sejarah">Sejarah Kami</h2>
          <div className="timeline">
            {data.timeline.map((item, i) => (
              <div key={i} className={`timeline-item ${i % 2 === 0 ? 'left' : 'right'}`}>
                <div className="timeline-dot" />
                <div className="timeline-card">
                  <span className="timeline-year">{item.tahun}</span>
                  <h3 className="timeline-title">{item.judul}</h3>
                  <p className="timeline-desc">{item.deskripsi}</p>
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
            {data.tim.map((t, i) => (
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
                <p style={{ whiteSpace: 'pre-line' }}>{data.alamat}</p>
              </div>
              <div>
                <strong>Telepon &amp; Fax</strong>
                <p>Telp: {data.telepon}<br />Fax: {data.fax}</p>
              </div>
              <div>
                <strong>Email</strong>
                <p>{data.email}<br />{data.emailSipena}</p>
              </div>
              <div>
                <strong>Jam Layanan</strong>
                <p style={{ whiteSpace: 'pre-line' }}>{data.jamLayanan}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default TentangKami;
