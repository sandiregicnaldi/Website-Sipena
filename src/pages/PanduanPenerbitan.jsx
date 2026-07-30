import React from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, Upload, ClipboardCheck, MessageSquare, BookOpen, Package,
  Award, Globe, BarChart2, DollarSign, Users, Shield, ArrowRight, Phone
} from 'lucide-react';
import { usePanduan } from '../context/PanduanContext';
import './PanduanPenerbitan.css';

// Peta nama icon string → Lucide component
const ICON_MAP = {
  FileText, Upload, ClipboardCheck, MessageSquare, BookOpen, Package,
  Award, Globe, BarChart2, DollarSign, Users, Shield,
};

const getIcon = (name, size = 22, color = 'currentColor') => {
  const Comp = ICON_MAP[name] || FileText;
  return <Comp size={size} color={color} />;
};

const PanduanPenerbitan = () => {
  const { data } = usePanduan();

  return (
    <main className="panduan-page">

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="panduan-hero">
        <div className="container">
          <div className="panduan-hero-content">
            <span className="panduan-hero-tag">Panduan Penerbitan</span>
            <h1 className="panduan-hero-title">
              {data.heroJudul.split('Perpusnas Press').map((part, i, arr) =>
                i < arr.length - 1
                  ? <React.Fragment key={i}>{part}<span className="highlight">Perpusnas Press</span></React.Fragment>
                  : <React.Fragment key={i}>{part}</React.Fragment>
              )}
            </h1>
            <p className="panduan-hero-desc">{data.heroDeskripsi}</p>
            <Link to="/login" className="panduan-hero-cta">
              Mulai Daftar Sekarang <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── TATA CARA ─────────────────────────────────────────────────────── */}
      <section className="panduan-section">
        <div className="container">
          <div className="panduan-section-header">
            <span className="panduan-section-tag">Langkah demi Langkah</span>
            <h2 className="panduan-section-title">Tata Cara Menerbitkan Buku</h2>
            <p className="panduan-section-desc">
              Proses penerbitan di Perpusnas Press dirancang transparan dan terstruktur.
              Ikuti langkah-langkah berikut untuk mewujudkan karya Anda menjadi buku terbit.
            </p>
          </div>

          <div className="panduan-steps-grid">
            {data.langkah.map((step, i) => (
              <div className="panduan-step-card" key={step.id}>
                <div className="panduan-step-icon-wrap">
                  <div className="panduan-step-number">{i + 1}</div>
                  <div style={{ color: 'var(--accent-color)' }}>
                    {getIcon(step.icon, 22, '#2563eb')}
                  </div>
                </div>
                <h3 className="panduan-step-title">{step.judul}</h3>
                <p className="panduan-step-desc">{step.deskripsi}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── KEUNTUNGAN ────────────────────────────────────────────────────── */}
      <section className="panduan-section panduan-section--alt">
        <div className="container">
          <div className="panduan-section-header">
            <span className="panduan-section-tag">Kenapa Perpusnas Press?</span>
            <h2 className="panduan-section-title">Keuntungan Menerbitkan Bersama Kami</h2>
            <p className="panduan-section-desc">
              Bergabung bersama ratusan penulis yang telah mempercayakan karya terbaik
              mereka kepada Perpusnas Press untuk jangkauan dan dampak yang lebih luas.
            </p>
          </div>

          <div className="panduan-benefits-grid">
            {data.keuntungan.map((benefit) => (
              <div className="panduan-benefit-card" key={benefit.id}>
                <div
                  className="panduan-benefit-icon"
                  style={{ background: `${benefit.warna}18` }}
                >
                  {getIcon(benefit.icon, 24, benefit.warna)}
                </div>
                <h3 className="panduan-benefit-title">{benefit.judul}</h3>
                <p className="panduan-benefit-desc">{benefit.deskripsi}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="panduan-cta-section">
        <div className="container">
          <div className="panduan-cta-content">
            <h2 className="panduan-cta-title">Siap Menerbitkan Karya Anda?</h2>
            <p className="panduan-cta-desc">
              Daftarkan diri Anda sekarang dan mulai perjalanan menjadi penulis
              yang diakui secara nasional bersama Perpusnas Press.
            </p>
            <div className="panduan-cta-buttons">
              <Link to="/login" className="panduan-cta-btn-primary">
                <ArrowRight size={18} /> Ajukan Naskah
              </Link>
              <Link to="/faq" className="panduan-cta-btn-outline">
                <Phone size={16} /> Hubungi Kami
              </Link>
            </div>
          </div>
        </div>
      </section>

    </main>
  );
};

export default PanduanPenerbitan;
