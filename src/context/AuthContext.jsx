import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

const MOCK_ACCOUNTS = [
  { email: 'admin@sipena.id',     password: 'admin123',   username: 'Administrator',  role: 'admin' },
  { email: 'sari@email.com',      password: 'pengunjung123', username: 'Sari Indah', role: 'pengunjung', isVerifiedAuthor: false },
  { email: 'ahmad@email.com',     password: 'penulis123', username: 'Dr. Ahmad Fauzi', role: 'pengunjung', isVerifiedAuthor: true },
];

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('sipena_user');
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  // login: checks hardcoded accounts first, then regular users
  const login = (userData) => {
    // Check if it's a mock login attempt
    const mockMatch = MOCK_ACCOUNTS.find(
      a => a.email === userData.email && a.password === userData.password
    );
    const data = mockMatch
      ? { ...mockMatch, loggedInAt: new Date().toISOString() }
      : { ...userData, loggedInAt: new Date().toISOString() };
    setUser(data);
    localStorage.setItem('sipena_user', JSON.stringify(data));
    return data;
  };

  // register: store registration data then auto-login
  const register = (formData, role) => {
    const userData = {
      username:     formData.namaLengkap,
      email:        formData.email,
      role, // 'pengunjung' | 'penulis' | 'calon penulis' | 'pegawai'
      namaLengkap:  formData.namaLengkap,
      tempatLahir:  formData.tempatLahir,
      tanggalLahir: formData.tanggalLahir,
      status:       formData.status,
      instansi:     formData.instansi,
      // Author-specific profile fields (completed later)
      fotoProfil:      null,
      bio:             '',
      keahlian:        '',
      karyaEksternal:  [],
      isVerifiedAuthor: false, // will be true once admin verifies them
      loggedInAt:      new Date().toISOString(),
    };
    setUser(userData);
    localStorage.setItem('sipena_user', JSON.stringify(userData));
    return userData;
  };

  const updateProfile = (profileData) => {
    const updated = { ...user, ...profileData };
    setUser(updated);
    localStorage.setItem('sipena_user', JSON.stringify(updated));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('sipena_user');
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      register,
      logout,
      updateProfile,
      isLoggedIn:     !!user,
      isAuthor:       user?.isVerifiedAuthor === true,
      isAdmin:        user?.role === 'admin' || user?.role === 'pegawai',
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
