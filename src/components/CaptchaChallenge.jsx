import React, { useState, useEffect } from 'react';
import { RotateCw, ShieldCheck, AlertCircle } from 'lucide-react';
import axios from 'axios';

/**
 * Komponen CAPTCHA Interaktif untuk Pengamanan Anti-Brute Force
 * Mendukung tantangan dari backend (/api/auth/captcha-new) dengan fallback dinamis mandiri.
 */
export default function CaptchaChallenge({ onVerifyChange, isError, errorMessage }) {
  const [challenge, setChallenge] = useState(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchChallenge = async () => {
    setLoading(true);
    setUserAnswer('');
    if (onVerifyChange) {
      onVerifyChange({ token: '', answer: '', isComplete: false });
    }

    try {
      // Panggil backend API captcha jika tersedia
      const res = await axios.get('/api/auth/captcha-new');
      if (res.data && res.data.token) {
        setChallenge(res.data);
      } else {
        throw new Error('Invalid format');
      }
    } catch {
      // Fallback lokal jika endpoint belum terjangkau
      const num1 = Math.floor(Math.random() * 9) + 1;
      const num2 = Math.floor(Math.random() * 9) + 1;
      setChallenge({
        token: `local-${Date.now()}`,
        question: `Berapa ${num1} + ${num2}?`,
        num1,
        num2,
        localAnswer: String(num1 + num2),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChallenge();
  }, []);

  const handleInputChange = (e) => {
    const val = e.target.value.trim();
    setUserAnswer(val);

    if (onVerifyChange && challenge) {
      onVerifyChange({
        token: challenge.token,
        answer: val,
        isComplete: val.length > 0,
        localAnswer: challenge.localAnswer,
      });
    }
  };

  return (
    <div style={{
      background: 'rgba(239, 246, 255, 0.7)',
      border: isError ? '1px solid #ef4444' : '1px solid #bfdbfe',
      borderRadius: '10px',
      padding: '14px',
      marginTop: '12px',
      marginBottom: '14px',
      boxShadow: '0 2px 6px rgba(37, 99, 235, 0.05)',
      fontFamily: 'inherit',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#1e40af', fontWeight: 600, fontSize: '0.875rem' }}>
          <ShieldCheck size={18} color="#2563eb" />
          <span>Verifikasi Keamanan (Anti-Bot & Brute Force)</span>
        </div>
        <button
          type="button"
          onClick={fetchChallenge}
          disabled={loading}
          title="Muat ulang pertanyaan"
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            color: '#3b82f6',
            display: 'flex',
            alignItems: 'center',
            borderRadius: '4px',
            transition: 'transform 0.2s',
          }}
        >
          <RotateCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap',
      }}>
        {/* Visual Box Tantangan dengan Efek Distorsi Garis */}
        <div style={{
          position: 'relative',
          background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
          color: '#ffffff',
          fontWeight: 700,
          fontSize: '1rem',
          letterSpacing: '1px',
          padding: '8px 16px',
          borderRadius: '6px',
          userSelect: 'none',
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: '130px',
          height: '42px',
          overflow: 'hidden',
        }}>
          {/* Garis derau pengaman visual (distorsi) */}
          <div style={{
            position: 'absolute',
            top: '30%',
            left: 0,
            right: 0,
            height: '1px',
            background: 'rgba(255,255,255,0.4)',
            transform: 'rotate(-5deg)',
          }} />
          <div style={{
            position: 'absolute',
            top: '65%',
            left: 0,
            right: 0,
            height: '1px',
            background: 'rgba(255,255,255,0.4)',
            transform: 'rotate(7deg)',
          }} />
          <span style={{ position: 'relative', zIndex: 1 }}>
            {loading ? '...' : (challenge ? `${challenge.num1} + ${challenge.num2} = ?` : 'Memuat...')}
          </span>
        </div>

        {/* Input Jawaban */}
        <div style={{ flex: 1, minWidth: '120px' }}>
          <input
            type="text"
            inputMode="numeric"
            placeholder="Ketik jawaban angka"
            value={userAnswer}
            onChange={handleInputChange}
            required
            style={{
              width: '100%',
              padding: '9px 12px',
              fontSize: '0.9rem',
              borderRadius: '6px',
              border: isError ? '1.5px solid #ef4444' : '1.5px solid #cbd5e1',
              outline: 'none',
              background: '#ffffff',
              boxSizing: 'border-box',
              fontWeight: 500,
            }}
          />
        </div>
      </div>

      {isError && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', color: '#dc2626', fontSize: '0.8rem' }}>
          <AlertCircle size={14} />
          <span>{errorMessage || 'Jawaban verifikasi keamanan belum tepat. Silakan coba lagi.'}</span>
        </div>
      )}
    </div>
  );
}
