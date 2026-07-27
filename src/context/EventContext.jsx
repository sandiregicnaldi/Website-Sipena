import React, { createContext, useContext, useState } from 'react';

// ─── Data awal kegiatan (sumber tunggal/single source of truth) ─────────────
const INITIAL_EVENTS = [
  {
    id: 1,
    judul: 'Seminar Literasi Digital 2026',
    tanggal: '2026-08-10',
    jamKegiatan: '09:00 - 12:00',
    lokasi: 'Aula Perpusnas, Jakarta',
    urlZoom: '',
    narasumber: ['Dr. Budi Santoso'],
    penjelasan: 'Seminar tentang literasi digital di era AI.',
    status: 'Akan Datang',
    peserta: 120,
    waktuBuka: '08:00',
    waktuTutup: '10:00',
    kode: 'LITDIG26',
  },
  {
    id: 2,
    judul: 'Workshop Penulisan Ilmiah',
    tanggal: '2026-07-20',
    jamKegiatan: '13:00 - 15:00',
    lokasi: 'Online (Zoom)',
    urlZoom: 'https://zoom.us/j/123456789',
    narasumber: ['Prof. Rina Wijaya', 'Dr. Andi Hermawan'],
    penjelasan: 'Teknik penulisan ilmiah standar nasional.',
    status: 'Segera',
    peserta: 85,
    waktuBuka: '12:30',
    waktuTutup: '13:30',
    kode: 'WRKILM',
  },
];

// ─── Data peserta awal ───────────────────────────────────────────────────────
const INITIAL_PESERTA = {
  1: [
    { id: 1, nama: 'Sari Indah',   email: 'sari@email.com',  instansi: 'Umum',       status: 'Hadir'       },
    { id: 2, nama: 'Rizki Fauzan', email: 'rizki@email.com', instansi: 'Mahasiswa',  status: 'Tidak Hadir' },
    { id: 3, nama: 'Budi Santoso', email: 'budi@email.com',  instansi: 'Guru',       status: 'Tidak Hadir' },
  ],
  2: [],
};

const EventContext = createContext(null);

export const EventProvider = ({ children }) => {
  const [events, setEvents]   = useState(INITIAL_EVENTS);
  const [peserta, setPeserta] = useState(INITIAL_PESERTA); // { [eventId]: [...] }
  const [nextEventId, setNextEventId] = useState(INITIAL_EVENTS.length + 1);
  const [nextPesertaId, setNextPesertaId] = useState(10);

  // ── Admin: tambah / edit / hapus kegiatan ───────────────────────────────
  const addEvent = (form) => {
    const id = nextEventId;
    setEvents(prev => [...prev, { ...form, id }]);
    setPeserta(prev => ({ ...prev, [id]: [] }));
    setNextEventId(n => n + 1);
  };

  const updateEvent = (form) => {
    setEvents(prev => prev.map(e => e.id === form.id ? form : e));
  };

  const deleteEvent = (id) => {
    setEvents(prev => prev.filter(e => e.id !== id));
    setPeserta(prev => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  // ── Admin: toggle status hadir peserta ──────────────────────────────────
  const toggleKehadiran = (eventId, pesertaId) => {
    setPeserta(prev => ({
      ...prev,
      [eventId]: (prev[eventId] || []).map(p =>
        p.id === pesertaId
          ? { ...p, status: p.status === 'Hadir' ? 'Tidak Hadir' : 'Hadir' }
          : p
      ),
    }));
  };

  // ── Pengunjung: daftar kegiatan (otomatis masuk list peserta admin) ─────
  const daftarKegiatan = (eventId, userData) => {
    const pesertaEventIni = peserta[eventId] || [];
    // Cegah duplikat (email sama)
    if (pesertaEventIni.some(p => p.email === userData.email)) return false;

    const newPeserta = {
      id: nextPesertaId,
      nama: userData.namaLengkap || userData.username || 'Pengunjung',
      email: userData.email,
      instansi: userData.instansi || 'Umum',
      status: 'Tidak Hadir',  // default; berubah jadi "Hadir" setelah isi PIN
      tanggalDaftar: new Date().toLocaleDateString('id-ID'),
    };
    setPeserta(prev => ({
      ...prev,
      [eventId]: [...(prev[eventId] || []), newPeserta],
    }));
    setNextPesertaId(n => n + 1);
    return true;
  };

  // ── Pengunjung: konfirmasi hadir dengan PIN ──────────────────────────────
  const konfirmasiHadir = (eventId, userEmail) => {
    setPeserta(prev => ({
      ...prev,
      [eventId]: (prev[eventId] || []).map(p =>
        p.email === userEmail ? { ...p, status: 'Hadir' } : p
      ),
    }));
  };

  // ── Helper: cek apakah presensi sedang dibuka berdasarkan waktu admin ───
  const getPresensiStatus = (event) => {
    if (!event) return { open: false, msg: 'Data kegiatan tidak ditemukan.' };

    const [bH, bM] = (event.waktuBuka || '00:00').split(':').map(Number);
    const [tH, tM] = (event.waktuTutup || '23:59').split(':').map(Number);

    // Ambil tanggal kegiatan
    const eventDate = new Date(event.tanggal);
    const openTime  = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate(), bH, bM, 0);
    const closeTime = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate(), tH, tM, 0);

    const now = new Date();

    if (now < openTime) {
      const bukaPad = `${String(bH).padStart(2,'0')}:${String(bM).padStart(2,'0')}`;
      return { open: false, msg: `Presensi dibuka mulai ${bukaPad} WIB sesuai jadwal.` };
    }
    if (now > closeTime) {
      return { open: false, msg: 'Waktu presensi telah berakhir.' };
    }
    return { open: true, msg: '' };
  };

  // ── Helper: cek apakah user sudah terdaftar di suatu event ──────────────
  const isUserRegistered = (eventId, userEmail) =>
    (peserta[eventId] || []).some(p => p.email === userEmail);

  // ── Helper: cek apakah user sudah hadir di suatu event ──────────────────
  const isUserHadir = (eventId, userEmail) =>
    (peserta[eventId] || []).some(p => p.email === userEmail && p.status === 'Hadir');

  return (
    <EventContext.Provider value={{
      events,
      peserta,
      addEvent,
      updateEvent,
      deleteEvent,
      toggleKehadiran,
      daftarKegiatan,
      konfirmasiHadir,
      getPresensiStatus,
      isUserRegistered,
      isUserHadir,
    }}>
      {children}
    </EventContext.Provider>
  );
};

export const useEvent = () => {
  const ctx = useContext(EventContext);
  if (!ctx) throw new Error('useEvent must be used within EventProvider');
  return ctx;
};
