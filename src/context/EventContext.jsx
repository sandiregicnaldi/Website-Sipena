import React, { createContext, useContext, useState, useEffect } from 'react';
import { SipenaAPI } from '../lib/api';

const mapToFrontend = (b) => ({
  id: b.id,
  judul: b.title,
  tanggal: b.date,
  jamKegiatan: b.time,
  batasDaftar: b.registrationDeadline,
  lokasi: b.location,
  urlZoom: b.zoomUrl,
  narasumber: b.speakers || [],
  penjelasan: b.description,
  status: b.status || 'Akan Datang',
  peserta: b.maxParticipants || 0,
  waktuBuka: b.presenceOpenTime,
  waktuTutup: b.presenceCloseTime,
  kode: b.presencePin
});

const mapToBackend = (f) => ({
  title: f.judul,
  date: f.tanggal,
  time: f.jamKegiatan,
  registrationDeadline: f.batasDaftar,
  location: f.lokasi,
  zoomUrl: f.urlZoom,
  speakers: f.narasumber,
  description: f.penjelasan,
  status: f.status,
  maxParticipants: parseInt(f.peserta) || 0,
  presenceOpenTime: f.waktuBuka,
  presenceCloseTime: f.waktuTutup,
  presencePin: f.kode
});

const EventContext = createContext(null);

export const EventProvider = ({ children }) => {
  const [events, setEvents] = useState([]);
  const [peserta, setPeserta] = useState({}); // Masih dummy peserta di lokal krn API blm spesifik utk peserta event
  const [loading, setLoading] = useState(true);

  const fetchEvents = async () => {
    try {
      const data = await SipenaAPI.getEvents();
      setEvents(data.map(mapToFrontend));
    } catch (err) {
      console.error("Gagal mengambil events", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const addEvent = async (form) => {
    try {
      await SipenaAPI.createEvent(mapToBackend(form));
      await fetchEvents();
    } catch (err) {
      console.error("Gagal tambah event", err);
    }
  };

  const updateEvent = async (form) => {
    try {
      await SipenaAPI.updateEvent(form.id, mapToBackend(form));
      await fetchEvents();
    } catch (err) {
      console.error("Gagal update event", err);
    }
  };

  const deleteEvent = async (id) => {
    try {
      await SipenaAPI.deleteEvent(id);
      await fetchEvents();
    } catch (err) {
      console.error("Gagal hapus event", err);
    }
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

  // ── Helper: cek apakah pendaftaran masih dibuka ─────────────────────────
  const isRegistrationOpen = (event) => {
    if (!event) return { open: false, msg: 'Kegiatan tidak ditemukan.' };
    if (!event.batasDaftar) return { open: true, msg: '' }; // jika tidak diset, selalu buka

    const [bH, bM] = event.batasDaftar.split(':').map(Number);
    const eventDate = new Date(event.tanggal);
    const deadlineTime = new Date(
      eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate(), bH, bM, 0
    );
    const now = new Date();

    if (now > deadlineTime) {
      const fmt = `${String(bH).padStart(2,'0')}:${String(bM).padStart(2,'0')}`;
      return { open: false, msg: `Pendaftaran telah ditutup sejak pukul ${fmt} WIB.` };
    }
    const selisihMs = deadlineTime - now;
    const selisihMnt = Math.ceil(selisihMs / 60000);
    const msg = selisihMnt <= 60
      ? `Pendaftaran tutup dalam ${selisihMnt} menit (pukul ${event.batasDaftar} WIB).`
      : `Batas pendaftaran: ${event.batasDaftar} WIB.`;
    return { open: true, msg };
  };

  // ── Pengunjung: daftar kegiatan (otomatis masuk list peserta admin) ─────
  const daftarKegiatan = (eventId, userData) => {
    const ev = events.find(e => e.id === eventId);
    const regStatus = isRegistrationOpen(ev);
    if (!regStatus.open) return { success: false, msg: regStatus.msg };

    const pesertaEventIni = peserta[eventId] || [];
    // Cegah duplikat (email sama)
    if (pesertaEventIni.some(p => p.email === userData.email)) return { success: false, msg: 'Anda sudah terdaftar.' };

    const newPeserta = {
      id: Math.random().toString(36).substr(2, 9),
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
    return { success: true, msg: '' };
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

  const isUserRegistered = (eventId, userEmail) =>
    (peserta[eventId] || []).some(p => p.email === userEmail);

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
      isRegistrationOpen,
      loading
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
