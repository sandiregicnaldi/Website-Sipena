import React, { createContext, useContext, useEffect } from 'react';
import { authClient, SipenaAPI } from '../lib/api';

const SESSION_INACTIVITY_LIMIT_MS = 4 * 60 * 60 * 1000; // 4 jam batas inaktivitas
const LAST_ACTIVE_KEY = 'sipena_last_active_at';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // Gunakan session dari Better Auth (akan otomatis membaca cookie SSO)
  const { data: session, isPending } = authClient.useSession();

  // Pengamanan Inaktivitas Sesi: logout otomatis jika tidak aktif > 4 jam
  useEffect(() => {
    if (!session?.user) return;

    const checkInactivity = async () => {
      const lastActiveStr = localStorage.getItem(LAST_ACTIVE_KEY);
      const now = Date.now();
      if (lastActiveStr) {
        const lastActive = Number(lastActiveStr);
        if (now - lastActive > SESSION_INACTIVITY_LIMIT_MS) {
          console.warn('[AuthContext] Sesi kedaluwarsa karena tidak aktif > 4 jam. Melakukan logout otomatis.');
          localStorage.removeItem(LAST_ACTIVE_KEY);
          await authClient.signOut();
          window.location.reload();
          return;
        }
      }
      localStorage.setItem(LAST_ACTIVE_KEY, String(now));
    };

    checkInactivity();

    let lastRecord = Date.now();
    const handleActivity = () => {
      const now = Date.now();
      // Throttle update localStorage setiap 60 detik agar hemat IO
      if (now - lastRecord > 60 * 1000) {
        lastRecord = now;
        localStorage.setItem(LAST_ACTIVE_KEY, String(now));
      }
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, handleActivity, { passive: true }));

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkInactivity();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      events.forEach(e => window.removeEventListener(e, handleActivity));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [session?.user]);

  // Mapping user dari session backend (Dasbor Penerbitan)
  let parsedKarya = session?.user?.karyaEksternal || [];
  if (typeof parsedKarya === 'string') {
    try {
      parsedKarya = JSON.parse(parsedKarya);
    } catch (e) {
      parsedKarya = [];
    }
  }

  const user = session?.user ? {
    id: session.user.id,
    email: session.user.email,
    username: session.user.name,
    name: session.user.name,
    role: session.user.role, // 'admin', 'personil' (pegawai), atau 'pengunjung'
    isReviewer: session.user.isReviewer === true || session.user.role === 'admin' || session.user.role === 'reviewer',
    isSuperAdmin: session.user.role === 'admin',
    skills: session.user.skills || [],
    isVerifiedAuthor: session.user.role === 'penulis', // Asumsi jika ada role penulis
    
    // Data Profil (dari kolom database tambahan)
    namaLengkap: session.user.name,
    tempatLahir: session.user.tempatLahir || '',
    tanggalLahir: session.user.tanggalLahir || '',
    pekerjaan: session.user.pekerjaan || '', // Di AuthorDashboard pakai user.pekerjaan
    status: session.user.status || '',       // Di LoginPage pakai user.status
    instansi: session.user.instansi || '',
    alamat: session.user.alamatLengkap || '', // AuthorDashboard pakai user.alamat
    alamatLengkap: session.user.alamatLengkap || '',
    provinsi: session.user.provinsi || '',
    kota: session.user.kota || '',
    kecamatan: session.user.kecamatan || '',
    kelurahan: session.user.kelurahan || '',
    bio: session.user.bio || '',
    profesi: session.user.profesi || '',
    domisili: session.user.domisili || '',
    website: session.user.website || '',
    image: session.user.image || null,
    fotoProfil: session.user.image || null,
    karyaEksternal: Array.isArray(parsedKarya) ? parsedKarya : [],
    isApplicant: session.user.role === 'calon_penulis',
  } : null;

  const login = async (userData) => {
    try {
      const res = await fetch('/api/auth/sign-in/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: userData.email,
          password: userData.password,
          captchaToken: userData.captchaToken,
          captchaAnswer: userData.captchaAnswer,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const err = new Error(data.error || data.message || "Email atau kata sandi tidak sesuai.");
        err.status = res.status;
        err.isCaptchaError = data.isCaptchaError === true;
        err.requiresCaptcha = data.requiresCaptcha === true;
        err.consecutiveFailures = data.consecutiveFailures || 0;
        err.code = data.code;
        err.requiresVerification = data.requiresVerification === true;
        throw err;
      }

      await authClient.getSession();
      localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
      return data.user || data;
    } catch (err) {
      if (err.status !== 401 && err.status !== 400 && err.status !== 429) {
        console.error("[AuthContext.login]:", err);
      }
      throw err;
    }
  };

  const register = async (formData, role) => {
    try {
      const { data, error } = await authClient.signUp.email({
        email: formData.email,
        password: formData.password || "default123", // Butuh password untuk daftar asli
        name: formData.namaLengkap,
        role: role,
        status: role === 'pegawai' ? 'pending' : 'active',
        tempatLahir: formData.tempatLahir,
        tanggalLahir: formData.tanggalLahir,
        pekerjaan: formData.status, // Form pake name="status" untuk pekerjaan (pelajar/mahasiswa/dll)
        instansi: formData.instansi,
        alamatLengkap: formData.alamat, // Di form name="alamat"
        provinsi: formData.provinsi,
        kota: formData.kota,
        kecamatan: formData.kecamatan,
        kelurahan: formData.kelurahan,
      });
      if (error) throw error;
      return { ...data, requiresVerification: true };
    } catch (err) {
      console.error("[AuthContext.register]:", err);
      throw err;
    }
  };

  const updateProfile = async (profileData) => {
    try {
      let finalImageUrl = profileData.fotoProfil || profileData.image;

      // 1. Simpan ke database Sipena terlebih dahulu (termasuk konversi gambar ke server & semua biodata)
      const sipenaRes = await SipenaAPI.updateAuthorProfile({
        name: profileData.namaLengkap || profileData.name,
        namaLengkap: profileData.namaLengkap || profileData.name,
        bio: profileData.bio,
        profesi: profileData.profesi,
        domisili: profileData.domisili,
        website: profileData.website,
        image: finalImageUrl,
        fotoProfil: finalImageUrl,
        karyaEksternal: profileData.karyaEksternal,
        tempatLahir: profileData.tempatLahir,
        tanggalLahir: profileData.tanggalLahir,
        pekerjaan: profileData.pekerjaan || profileData.status,
        status: profileData.status,
        instansi: profileData.instansi,
        alamat: profileData.alamat || profileData.alamatLengkap,
        alamatLengkap: profileData.alamat || profileData.alamatLengkap,
        provinsi: profileData.provinsi,
        kota: profileData.kota,
        kecamatan: profileData.kecamatan,
        kelurahan: profileData.kelurahan,
        phone: profileData.phone,
      });

      // Gunakan URL gambar bersih yang dikembalikan server (misal /api/uploads/avatars/...)
      if (sipenaRes?.user?.image) {
        finalImageUrl = sipenaRes.user.image;
      }

      // 2. Sinkronkan dengan Better Auth (hanya kirim URL bersih, bukan base64 raksasa)
      await authClient.updateUser({
        name: profileData.namaLengkap || profileData.name,
        image: finalImageUrl,
        bio: profileData.bio,
        profesi: profileData.profesi,
        domisili: profileData.domisili,
        website: profileData.website,
        tempatLahir: profileData.tempatLahir,
        tanggalLahir: profileData.tanggalLahir,
        pekerjaan: profileData.pekerjaan || profileData.status,
        instansi: profileData.instansi,
        alamatLengkap: profileData.alamat || profileData.alamatLengkap,
        provinsi: profileData.provinsi,
        kota: profileData.kota,
        kecamatan: profileData.kecamatan,
        kelurahan: profileData.kelurahan,
      }).catch(err => console.warn('[BetterAuth] updateUser sync:', err));

      // 3. Segarkan sesi pengguna di Better Auth
      await authClient.getSession();
    } catch (err) {
      console.error("Gagal memperbarui profil", err);
      throw err;
    }
  };

  const logout = async (redirectPath = '/') => {
    localStorage.removeItem(LAST_ACTIVE_KEY);
    await authClient.signOut();
    window.location.href = redirectPath; // Refresh state
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      register,
      logout,
      updateProfile,
      isLoggedIn: !!user,
      isAuthor: user?.isVerifiedAuthor === true,
      isApplicant: user?.isApplicant === true,
      isAdmin: (user?.role === 'admin' || user?.role === 'personil' || user?.role === 'pegawai' || user?.role === 'reviewer') && user?.status === 'active',
      isSuperAdmin: user?.role === 'admin' && user?.status === 'active',
      isReviewer: user?.isReviewer === true && user?.status === 'active',
      isStaff: (user?.role === 'admin' || user?.role === 'personil' || user?.role === 'pegawai' || user?.role === 'reviewer') && user?.status === 'active',
      isPendingApproval: user?.status === 'pending',
      isPending, // Bisa dipakai untuk loading state
      isLoading: isPending,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
