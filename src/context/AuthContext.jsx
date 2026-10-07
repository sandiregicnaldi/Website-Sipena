import React, { createContext, useContext } from 'react';
import { authClient } from '../lib/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // Gunakan session dari Better Auth (akan otomatis membaca cookie SSO)
  const { data: session, isPending } = authClient.useSession();

  // Mapping user dari session backend (Dasbor Penerbitan)
  const user = session?.user ? {
    id: session.user.id,
    email: session.user.email,
    username: session.user.name,
    role: session.user.role, // 'admin', 'personil' (pegawai), atau 'pengunjung'
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
    website: session.user.website || '',
    karyaEksternal: session.user.karyaEksternal || [],
  } : null;

  const login = async (userData) => {
    try {
      const { data, error } = await authClient.signIn.email({
        email: userData.email,
        password: userData.password
      });
      if (error) throw error;
      return data.user;
    } catch (err) {
      console.error(err);
      throw new Error("Gagal login: Periksa email dan password");
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
      return data.user;
    } catch (err) {
      console.error(err);
      throw new Error("Gagal mendaftar");
    }
  };

  const updateProfile = async (profileData) => {
    try {
      await authClient.updateUser({
        name: profileData.namaLengkap,
        tempatLahir: profileData.tempatLahir,
        tanggalLahir: profileData.tanggalLahir,
        pekerjaan: profileData.status,
        instansi: profileData.instansi,
        alamatLengkap: profileData.alamat,
        provinsi: profileData.provinsi,
        kota: profileData.kota,
        kecamatan: profileData.kecamatan,
        kelurahan: profileData.kelurahan,
        bio: profileData.bio,
        website: profileData.website,
        karyaEksternal: profileData.karyaEksternal,
      });
      // Tidak perlu set state manual, useSession() dari better-auth akan auto-refresh
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
      isAdmin: user?.role === 'admin' || user?.role === 'personil' || user?.role === 'pegawai',
      isPending, // Bisa dipakai untuk loading state
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
