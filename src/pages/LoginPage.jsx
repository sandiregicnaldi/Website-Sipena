import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';
import { Mail, Lock, ArrowRight, User, MapPin, Calendar, Briefcase, Building2, ChevronDown, ShieldAlert } from 'lucide-react';
import CaptchaChallenge from '../components/CaptchaChallenge';
import './LoginPage.css';

// ── Shared form components ──────────────────────────────────────────────────

const InputField = ({ icon: Icon, label, type = 'text', name, placeholder, value, onChange, required }) => (
  <div className="form-group">
    <label>{label}</label>
    <div className="input-with-icon">
      <Icon size={18} className="input-icon" />
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
      />
    </div>
  </div>
);

const SelectField = ({ icon: Icon, label, name, value, onChange, options, required, disabled }) => (
  <div className="form-group">
    <label>{label}</label>
    <div className="input-with-icon select-wrapper">
      <Icon size={18} className="input-icon" />
      <select name={name} value={value} onChange={onChange} required={required} disabled={disabled}>
        <option value="">-- Pilih --</option>
        {options.map(opt => {
          const isObj = typeof opt === 'object' && opt !== null;
          return (
            <option key={isObj ? opt.id : opt} value={isObj ? opt.id : opt}>
              {isObj ? opt.name : opt}
            </option>
          );
        })}
      </select>
      <ChevronDown size={16} className="select-arrow" />
    </div>
  </div>
);

// ── Common registration fields (shared by visitor & author) ─────────────────

const CommonRegisterFields = ({ form, onChange, setForm, showAddress }) => {
  const [provinces, setProvinces] = useState([]);
  const [regencies, setRegencies] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [villages, setVillages] = useState([]);

  const BASE_URL = 'https://sandiregicnaldi.github.io/api-wilayah-indonesia/api';

  useEffect(() => {
    if (showAddress) {
      fetch(`${BASE_URL}/provinces.json`)
        .then(res => res.json())
        .then(data => setProvinces(data))
        .catch(err => console.error(err));
    }
  }, [showAddress]);

  useEffect(() => {
    if (form.provinsi) {
      fetch(`${BASE_URL}/regencies/${form.provinsi}.json`)
        .then(res => res.json())
        .then(data => setRegencies(data))
        .catch(err => console.error(err));
    } else {
      setRegencies([]);
    }
  }, [form.provinsi]);

  useEffect(() => {
    if (form.kota) {
      fetch(`${BASE_URL}/districts/${form.kota}.json`)
        .then(res => res.json())
        .then(data => setDistricts(data))
        .catch(err => console.error(err));
    } else {
      setDistricts([]);
    }
  }, [form.kota]);

  useEffect(() => {
    if (form.kecamatan) {
      fetch(`${BASE_URL}/villages/${form.kecamatan}.json`)
        .then(res => res.json())
        .then(data => setVillages(data))
        .catch(err => console.error(err));
    } else {
      setVillages([]);
    }
  }, [form.kecamatan]);

  const handleProvinceChange = (e) => {
    onChange(e);
    if (setForm) setForm(prev => ({ ...prev, kota: '', kecamatan: '', kelurahan: '' }));
  };

  const handleCityChange = (e) => {
    onChange(e);
    if (setForm) setForm(prev => ({ ...prev, kecamatan: '', kelurahan: '' }));
  };

  const handleDistrictChange = (e) => {
    onChange(e);
    if (setForm) setForm(prev => ({ ...prev, kelurahan: '' }));
  };

  return (
    <>
      <InputField icon={User} label="Nama Lengkap" name="namaLengkap" placeholder="Nama lengkap sesuai KTP" value={form.namaLengkap} onChange={onChange} required />
      <InputField icon={MapPin} label="Tempat Lahir" name="tempatLahir" placeholder="Kota tempat lahir" value={form.tempatLahir} onChange={onChange} required />
      <div className="form-group">
        <label>Tanggal Lahir</label>
        <div className="input-with-icon">
          <Calendar size={18} className="input-icon" />
          <input type="date" name="tanggalLahir" value={form.tanggalLahir} onChange={onChange} required />
        </div>
      </div>
      <SelectField
        icon={Briefcase} label="Status" name="status"
        value={form.status} onChange={onChange} required
        options={['Pelajar / Mahasiswa', 'Pegawai', 'Wiraswasta', 'Umum']}
      />
      <InputField icon={Building2} label="Instansi / Lembaga" name="instansi" placeholder="Nama instansi atau lembaga Anda" value={form.instansi} onChange={onChange} required />
      
      {showAddress && (
        <>
          <div className="register-section-label" style={{marginTop: '0.5rem'}}>Data Alamat</div>
          <InputField icon={MapPin} label="Alamat" name="alamat" placeholder="Jalan, RT/RW, Nomor Rumah" value={form.alamat} onChange={onChange} required />
          <SelectField
            icon={MapPin} label="Provinsi" name="provinsi"
            value={form.provinsi} onChange={handleProvinceChange} required
            options={provinces}
          />
          <SelectField
            icon={MapPin} label="Kota/Kabupaten" name="kota"
            value={form.kota} onChange={handleCityChange} required disabled={!form.provinsi}
            options={regencies}
          />
          <SelectField
            icon={MapPin} label="Kecamatan" name="kecamatan"
            value={form.kecamatan} onChange={handleDistrictChange} required disabled={!form.kota}
            options={districts}
          />
          <SelectField
            icon={MapPin} label="Kelurahan" name="kelurahan"
            value={form.kelurahan} onChange={onChange} required disabled={!form.kecamatan}
            options={villages}
          />
          <div className="register-section-label" style={{marginTop: '0.5rem'}}>Data Akun</div>
        </>
      )}

      <InputField icon={Mail} label="Email" type="email" name="email" placeholder="contoh@email.com" value={form.email} onChange={onChange} required />
      <InputField icon={Lock} label="Kata Sandi" type="password" name="password" placeholder="Minimal 8 karakter" value={form.password} onChange={onChange} required />
    </>
  );
};

// ── Main LoginPage ───────────────────────────────────────────────────────────

const INITIAL_FORM = {
  namaLengkap: '', tempatLahir: '', tanggalLahir: '',
  status: '', instansi: '', email: '', password: '',
  alamat: '', provinsi: '', kota: '', kecamatan: '', kelurahan: ''
};

const LoginPage = () => {
  const [mode, setMode] = useState('login');          // 'login' | 'register'
  const [form, setForm] = useState({ email: '', password: '', ...INITIAL_FORM });

  // ── Proteksi Brute Force & CAPTCHA ────────────────────────
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [captchaData, setCaptchaData] = useState({ token: '', answer: '', isComplete: false });
  const [captchaError, setCaptchaError] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user, login, register, logout, isPending } = useAuth();

  const { showAlert } = useDialog();
  const navigate = useNavigate();
  const location = useLocation();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const fillCredentials = (email, password) => {
    setForm(prev => ({ ...prev, email, password }));
    setLoginError('');
  };

  const getDestinationPath = (resolvedUser) => {
    const fromPath = typeof location.state?.from === 'string'
      ? location.state.from
      : location.state?.from?.pathname;

    // 1. Jika sedang membaca atau mengunduh buku tertentu (misal: /buku/12), kembalikan ke buku tersebut
    const isViewingBook = fromPath && (fromPath.startsWith('/buku/') || fromPath.startsWith('/book/'));
    if (isViewingBook) {
      return fromPath;
    }

    // 2. Cek apakah pengguna merupakan admin / personil / pegawai / reviewer
    const isStaff = resolvedUser && (
      resolvedUser.role === 'admin' ||
      resolvedUser.role === 'personil' ||
      resolvedUser.role === 'pegawai' ||
      resolvedUser.role === 'reviewer'
    );

    if (isStaff) {
      if (fromPath && (fromPath.startsWith('/admin') || fromPath.startsWith('/manajemen'))) {
        return fromPath;
      }
      return '/admin';
    }

    // 3. Jika pengguna adalah Penulis
    const isAuthor = resolvedUser && (
      resolvedUser.role === 'penulis' ||
      resolvedUser.isVerifiedAuthor === true
    );
    if (isAuthor) {
      if (fromPath && fromPath !== '/' && fromPath !== '/login' && !fromPath.startsWith('/admin') && !fromPath.startsWith('/manajemen')) {
        return fromPath;
      }
      return '/profil-saya';
    }

    // 4. Untuk pengguna umum / pengunjung publik
    if (fromPath && fromPath !== '/' && fromPath !== '/login' && !fromPath.startsWith('/admin') && !fromPath.startsWith('/manajemen')) {
      return fromPath;
    }
    return '/';
  };

  const redirectAfter = (resolvedUser) => {
    window.location.href = getDestinationPath(resolvedUser);
  };

  // ── Auto-Redirect jika Pengguna Sudah Login (Guest Protection) ──
  useEffect(() => {
    if (user && !isPending) {
      const dest = getDestinationPath(user);
      navigate(dest, { replace: true });
    }
  }, [user, isPending, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!form.email.trim() || !form.password.trim()) return;

    if (showCaptcha && (!captchaData.isComplete || !captchaData.answer)) {
      setCaptchaError('Silakan masukkan jawaban verifikasi keamanan (CAPTCHA).');
      return;
    }

    setIsSubmitting(true);
    setCaptchaError('');
    setLoginError('');

    try {
      const resolvedUser = await login({
        email: form.email,
        password: form.password,
        captchaToken: captchaData.token,
        captchaAnswer: captchaData.answer,
      });

      setConsecutiveFailures(0);
      setShowCaptcha(false);
      redirectAfter(resolvedUser);
    } catch (err) {
      const errMsg = err.message || 'Email atau kata sandi tidak sesuai.';
      setLoginError(errMsg);

      if (err.requiresVerification) {
        showAlert({
          title: 'Verifikasi Email Diperlukan',
          message: err.message || 'Akun Anda belum aktif. Silakan periksa email Anda dan klik tautan verifikasi sebelum masuk.',
          type: 'warning'
        });
        return;
      }

      if (err.status === 429) {
        showAlert({
          title: 'Akses Dibatasi Sementara',
          message: err.message || 'Terlalu banyak percobaan login gagal. Demi keamanan akun Anda, silakan coba lagi dalam 15 menit.',
          type: 'error'
        });
        return;
      }

      const newFailures = err.consecutiveFailures || (consecutiveFailures + 1);
      setConsecutiveFailures(newFailures);
      if (newFailures >= 3 || err.requiresCaptcha) {
        setShowCaptcha(true);
        setCaptchaError('Verifikasi CAPTCHA diperlukan setelah beberapa kali gagal.');
      }

      showAlert({
        title: 'Login Gagal',
        message: errMsg,
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const resolved = await register(form, 'pengunjung');
      if (resolved && resolved.requiresVerification) {
        showAlert({
          title: 'Pendaftaran Berhasil!',
          message: 'Tautan verifikasi telah dikirimkan ke email Anda. Silakan buka kotak masuk email Anda dan klik tautan aktivasi sebelum masuk.',
          type: 'success'
        });
        switchMode('login');
      } else {
        redirectAfter(resolved);
      }
    } catch (err) {
      showAlert({
        title: 'Pendaftaran Gagal',
        message: err.message || 'Terjadi kesalahan saat memproses pendaftaran. Silakan periksa kelengkapan data Anda.',
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setForm({ email: '', password: '', ...INITIAL_FORM });
    setCaptchaError('');
    setLoginError('');
  };

  if (user) {
    const dest = getDestinationPath(user);
    return (
      <main className="login-page">
        <div className="login-container">
          <div className="login-card" style={{ textAlign: 'center', padding: '2.5rem 1.75rem' }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%', background: '#eff6ff',
              color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.25rem', boxShadow: '0 4px 12px rgba(37,99,235,0.15)'
            }}>
              <User size={28} />
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
              Anda Sudah Masuk ke Sistem
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.92rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              Sesi aktif sebagai <strong>{user.name || user.email}</strong>{' '}
              <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: 999, fontSize: '0.78rem', fontWeight: 700 }}>
                {user.role}
              </span>
            </p>
            <p style={{ color: '#94a3b8', fontSize: '0.82rem', marginBottom: '1.5rem' }}>
              Mengalihkan Anda secara otomatis ke dasbor...
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => navigate(dest, { replace: true })}
                className="btn btn-primary"
                style={{ padding: '0.65rem 1.5rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
              >
                Lanjut ke Dasbor <ArrowRight size={16} />
              </button>
              <button
                type="button"
                onClick={async () => {
                  await logout('/login');
                }}
                className="btn btn-secondary"
                style={{ padding: '0.65rem 1.25rem', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca', fontWeight: 600 }}
              >
                Keluar / Ganti Akun
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="login-page">
      <div className="login-container">
        <div className="login-card">

          {/* Header */}
          <div className="login-header">
            <h2>{mode === 'login' ? 'Masuk ke Sistem' : 'Buat Akun Baru'}</h2>
            <p>
              {mode === 'login'
                ? 'Silakan masuk untuk dapat mengunduh buku dan memberikan ulasan.'
                : 'Lengkapi data berikut untuk mendaftar sebagai anggota SIPena.'}
            </p>
          </div>

          {/* Mode Switch (Login / Daftar) */}
          <div className="mode-toggle">
            <button className={`mode-btn ${mode === 'login' ? 'active' : ''}`} onClick={() => switchMode('login')}>
              Masuk
            </button>
            <button className={`mode-btn ${mode === 'register' ? 'active' : ''}`} onClick={() => switchMode('register')}>
              Daftar
            </button>
          </div>


          {/* ── LOGIN FORM ──────────────────────────────────── */}
          {mode === 'login' && (
            <form className="login-form" onSubmit={handleLogin}>

              {loginError && (
                <div style={{
                  background: '#fee2e2',
                  border: '1px solid #fca5a5',
                  color: '#991b1b',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '14px',
                  lineHeight: '1.4',
                }}>
                  <ShieldAlert size={18} color="#dc2626" style={{ flexShrink: 0 }} />
                  <span>{loginError}</span>
                </div>
              )}
              <InputField icon={Mail} label="Email" type="email" name="email" placeholder="contoh@email.com" value={form.email} onChange={handleChange} required />
              <InputField icon={Lock} label="Kata Sandi" type="password" name="password" placeholder="Masukkan kata sandi" value={form.password} onChange={handleChange} required />
              
              {showCaptcha && (
                <CaptchaChallenge
                  onVerifyChange={setCaptchaData}
                  isError={!!captchaError}
                  errorMessage={captchaError}
                />
              )}

              <button type="submit" className="btn btn-primary login-btn" disabled={isSubmitting}>
                {isSubmitting ? 'Memeriksa Keamanan...' : 'Masuk'} <ArrowRight size={18} />
              </button>
              <p className="switch-link">
                Belum punya akun?{' '}
                <button type="button" className="link-btn" onClick={() => switchMode('register')}>
                  Daftar di sini
                </button>
              </p>
              <div className="info-note" style={{marginTop:'0.75rem', flexDirection:'column', alignItems:'stretch'}}>
                <div style={{display:'flex', alignItems:'center', gap:'6px', marginBottom:'4px'}}>
                  <span>🔑</span>
                  <strong style={{fontSize:'0.8rem', color:'#1e40af'}}>Pilih Akun Testing (Klik untuk Isi Otomatis):</strong>
                </div>
                <div style={{display:'flex', flexDirection:'column', gap:'0.35rem'}}>
                  {[
                    { label: 'Super Admin', email: 'admin@perpusnas.go.id', pass: 'adminpassword123', role: 'admin' },
                    { label: 'Reviewer (QC)', email: 'personil@dev.local', pass: 'developer123', role: 'reviewer' },
                    { label: 'Personil Redaksi', email: 'editor@penerbitan.com', pass: 'password123', role: 'personil' },
                    { label: 'Penulis', email: 'penulis@sipena.id', pass: 'penulis123', role: 'penulis' },
                    { label: 'Pengunjung', email: 'pengunjung@sipena.id', pass: 'pengunjung123', role: 'pengunjung' },
                  ].map(acc => (
                    <button
                      key={acc.email}
                      type="button"
                      onClick={() => fillCredentials(acc.email, acc.pass)}
                      style={{
                        textAlign: 'left',
                        background: form.email === acc.email ? '#dbeafe' : 'transparent',
                        border: '1px solid #bfdbfe',
                        borderRadius: '4px',
                        padding: '5px 8px',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        color: '#1e3a8a',
                        transition: 'background 0.15s',
                      }}
                      title={`Klik untuk otomatis mengisi email & kata sandi ${acc.label}`}
                    >
                      <span><strong>{acc.label}:</strong> {acc.email}</span>
                      <span style={{color: '#64748b', fontFamily: 'monospace'}}>({acc.pass})</span>
                    </button>
                  ))}
                </div>
              </div>
            </form>
          )}

          {/* ── REGISTER FORM (PUBLIK / PENGUNJUNG / PENULIS) ── */}
          {mode === 'register' && (
            <form className="login-form" onSubmit={handleRegister}>
              <div className="register-section-label">Data Pendaftaran Anggota</div>
              <CommonRegisterFields form={form} onChange={handleChange} setForm={setForm} showAddress={true} />
              <button type="submit" className="btn btn-primary login-btn" disabled={isSubmitting}>
                {isSubmitting ? 'Memproses Pendaftaran...' : 'Daftar Sekarang'} <ArrowRight size={18} />
              </button>
              <p className="switch-link">
                Sudah punya akun?{' '}
                <button type="button" className="link-btn" onClick={() => switchMode('login')}>
                  Masuk di sini
                </button>
              </p>
            </form>
          )}

        </div>
      </div>
    </main>
  );
};

export default LoginPage;
