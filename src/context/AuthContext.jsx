import React, { createContext, useContext } from 'react';
import { authClient, SipenaAPI } from '../lib/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // Gunakan session dari Better Auth (akan otomatis membaca cookie SSO)
  const { data: session, isPending } = authClient.useSession();

  // Mapping user dari session backend (Dasbor Penerbitan)
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
    karyaEksternal: session.user.karyaEksternal || [],
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
        err.requiresCaptcha = data.requiresCaptcha === true;
        err.consecutiveFailures = data.consecutiveFailures || 0;
        err.code = data.code;
        err.requiresVerification = data.requiresVerification === true;
        throw err;
      }

      await authClient.getSession();
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
      await authClient.updateUser({
        name: profileData.namaLengkap || profileData.name,
        tempatLahir: profileData.tempatLahir,
        tanggalLahir: profileData.tanggalLahir,
        pekerjaan: profileData.pekerjaan || profileData.status,
        instansi: profileData.instansi,
        alamatLengkap: profileData.alamat || profileData.alamatLengkap,
        provinsi: profileData.provinsi,
        kota: profileData.kota,
        kecamatan: profileData.kecamatan,
        kelurahan: profileData.kelurahan,
        bio: profileData.bio,
        profesi: profileData.profesi,
        domisili: profileData.domisili,
        image: profileData.fotoProfil || profileData.image,
        website: profileData.website,
        karyaEksternal: profileData.karyaEksternal,
      });

      // Juga sinkronkan ke endpoint author-profile jika ada data profil kepenulisan
      if (profileData.bio !== undefined || profileData.profesi !== undefined || profileData.domisili !== undefined || profileData.karyaEksternal !== undefined || profileData.fotoProfil !== undefined) {
        await SipenaAPI.updateAuthorProfile({
          name: profileData.namaLengkap || profileData.name,
          bio: profileData.bio,
          profesi: profileData.profesi,
          domisili: profileData.domisili,
          website: profileData.website,
          image: profileData.fotoProfil || profileData.image,
          karyaEksternal: profileData.karyaEksternal,
        }).catch(err => console.warn('Sync to author profile endpoint:', err));
      }
    } catch (err) {
      console.error("Gagal memperbarui profil", err);
      throw err;
    }
  };

  const logout = async () => {
    await authClient.signOut();
    window.location.href = '/'; // Refresh state
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
      isAdmin: user?.role === 'admin' || user?.role === 'personil' || user?.role === 'pegawai' || user?.role === 'reviewer',
      isSuperAdmin: user?.role === 'admin',
      isReviewer: user?.isReviewer === true,
      isStaff: user?.role === 'admin' || user?.role === 'personil' || user?.role === 'pegawai' || user?.role === 'reviewer',
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
