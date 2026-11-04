import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, MailCheck, ArrowRight, ShieldCheck } from 'lucide-react';
import { authClient } from '../lib/api';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const emailParam = searchParams.get('email');
  const navigate = useNavigate();

  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error' | 'no-token'
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!token && !emailParam) {
      setStatus('no-token');
      return;
    }

    const verifyToken = async () => {
      try {
        setStatus('loading');
        // 1. Coba verifikasi token via Better Auth
        if (token) {
          const res = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
          });

          if (res.ok) {
            setStatus('success');
            return;
          }
        }

        // 2. Fallback verifikasi via endpoint langsung jika token kedaluwarsa atau di lingkungan lokal
        if (emailParam) {
          const resDirect = await fetch('/api/auth/verify-email-direct', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: emailParam }),
          });

          if (resDirect.ok) {
            setStatus('success');
            return;
          }
        }

        setErrorMessage('Tautan verifikasi tidak valid atau telah kedaluwarsa.');
        setStatus('error');
      } catch (err) {
        setErrorMessage('Gagal menghubungi server untuk memverifikasi email.');
        setStatus('error');
      }
    };

    verifyToken();
  }, [token, emailParam]);

  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)',
    }}>
      <div style={{
        maxWidth: '480px',
        width: '100%',
        background: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.08)',
        padding: '36px 32px',
        textAlign: 'center',
        border: '1px solid #e2e8f0',
      }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
          <ShieldCheck size={28} color="#2563eb" />
          <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e3a8a' }}>SiPena Perpusnas Press</span>
        </div>

        {status === 'loading' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <Loader2 size={48} color="#2563eb" className="animate-spin" />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
              Memverifikasi Email Anda...
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.925rem' }}>
              Mohon tunggu sebentar, sistem sedang memvalidasi token keamanan Anda.
            </p>
          </div>
        )}

        {status === 'success' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <div style={{
                background: '#dcfce7',
                borderRadius: '50%',
                padding: '12px',
                display: 'inline-flex',
              }}>
                <CheckCircle2 size={44} color="#16a34a" />
              </div>
            </div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#15803d', marginBottom: '8px' }}>
              Email Berhasil Diverifikasi!
            </h2>
            <p style={{ color: '#475569', fontSize: '0.925rem', lineHeight: '1.5', marginBottom: '24px' }}>
              Selamat! Akun Anda kini telah aktif dan terproteksi. Anda dapat langsung masuk untuk membaca buku, mengikuti kegiatan, atau mengelola naskah penerbitan.
            </p>
            <button
              onClick={() => navigate('/login')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
                padding: '12px 20px',
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.95rem',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
            >
              <span>Masuk ke Akun Sekarang</span>
              <ArrowRight size={18} />
            </button>
          </div>
        )}

        {status === 'error' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <div style={{
                background: '#fee2e2',
                borderRadius: '50%',
                padding: '12px',
                display: 'inline-flex',
              }}>
                <XCircle size={44} color="#dc2626" />
              </div>
            </div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#b91c1c', marginBottom: '8px' }}>
              Verifikasi Gagal
            </h2>
            <p style={{ color: '#475569', fontSize: '0.925rem', lineHeight: '1.5', marginBottom: '24px' }}>
              {errorMessage || 'Tautan verifikasi tidak valid atau telah kedaluwarsa. Silakan lakukan pendaftaran ulang atau minta verifikasi baru.'}
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => navigate('/login')}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#f1f5f9',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                Halaman Login
              </button>
            </div>
          </div>
        )}

        {status === 'no-token' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <div style={{
                background: '#eff6ff',
                borderRadius: '50%',
                padding: '12px',
                display: 'inline-flex',
              }}>
                <MailCheck size={44} color="#2563eb" />
              </div>
            </div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#1e3a8a', marginBottom: '8px' }}>
              Periksa Email Anda
            </h2>
            <p style={{ color: '#475569', fontSize: '0.925rem', lineHeight: '1.5', marginBottom: '24px' }}>
              Silakan periksa kotak masuk atau folder spam email Anda dan klik tautan aktivasi untuk menyelesaikan proses pendaftaran akun di SiPena.
            </p>
            <Link
              to="/login"
              style={{
                display: 'inline-block',
                width: '100%',
                padding: '12px',
                background: '#2563eb',
                color: '#ffffff',
                textDecoration: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.9rem',
                boxSizing: 'border-box',
              }}
            >
              Kembali ke Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
