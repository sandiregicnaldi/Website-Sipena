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
  narasumber: Array.isArray(b.speakers) ? b.speakers : (b.speakers ? [b.speakers] : []),
  penjelasan: b.description,
  status: b.status || 'Akan Datang',
  peserta: b.maxParticipants || 0,
  bannerUrl: b.imageUrl,
  certificateToken: b.certificateToken || '',
  certificateTemplateUrl: b.certificateTemplateUrl || '',
  certNamePosY: b.certNamePosY ? Number(b.certNamePosY) : 96,
  certFontSize: b.certFontSize ? Number(b.certFontSize) : 24,
  certFontFamily: b.certFontFamily || 'helvetica',
  isClaimOpen: b.isClaimOpen,
  claimOpensAt: b.claimOpensAt,
  isClaimActive: b.isClaimActive,
  claimReason: b.claimReason,
  hasCertificateToken: b.hasCertificateToken,
  participantCount: b.participantCount || 0,
  waktuBuka: b.presenceOpenTime,
  waktuTutup: b.presenceCloseTime,
  kode: b.certificateToken || b.presencePin || ''
});

const mapToBackend = (f) => ({
  title: f.judul,
  date: f.tanggal,
  time: f.jamKegiatan,
  registrationDeadline: f.batasDaftar,
  location: f.lokasi,
  zoomUrl: f.urlZoom,
  speakers: Array.isArray(f.narasumber) ? f.narasumber : [f.narasumber].filter(Boolean),
  description: f.penjelasan,
  status: f.status,
  maxParticipants: parseInt(f.peserta) || 0,
  imageUrl: f.bannerUrl,
  certificateToken: f.certificateToken ? String(f.certificateToken).trim().toUpperCase() : null,
  certificateTemplateUrl: f.certificateTemplateUrl || null,
  certNamePosY: f.certNamePosY ? parseInt(f.certNamePosY) : 96,
  certFontSize: f.certFontSize ? parseInt(f.certFontSize) : 24,
  certFontFamily: f.certFontFamily || 'helvetica',
  isClaimOpen: f.isClaimOpen,
  claimOpensAt: f.claimOpensAt,
  presenceOpenTime: f.waktuBuka,
  presenceCloseTime: f.waktuTutup,
  presencePin: f.kode
});

// Helper: cek status klaim sertifikat (otomatis H-15 menit atau sakelar admin)
export const checkIfClaimOpen = (event) => {
  if (!event) return { open: false, reason: 'not_found', msg: 'Data kegiatan tidak ditemukan.' };
  
  if (event.claimOpensAt === 'closed' || (event.isClaimOpen === false && event.claimOpensAt === 'closed')) {
    return { open: false, reason: 'manual_closed', msg: 'Klaim sertifikat telah ditutup oleh panitia.' };
  }
  if (event.isClaimOpen === true || event.claimOpensAt === 'open') {
    return { open: true, reason: 'manual_open', msg: 'Klaim sertifikat sedang dibuka.' };
  }
  
  if (!event.tanggal) return { open: false, reason: 'no_date', msg: 'Jadwal belum ditentukan.' };

  const d = new Date(event.tanggal);
  if (isNaN(d.getTime())) return { open: false, reason: 'invalid_date', msg: 'Format tanggal kegiatan tidak valid.' };

  let endHour = 12;
  let endMin = 0;
  if (event.jamKegiatan && typeof event.jamKegiatan === 'string') {
    const rangeMatch = event.jamKegiatan.match(/-\s*(\d{1,2})[:.](\d{2})/);
    if (rangeMatch) {
      endHour = parseInt(rangeMatch[1], 10);
      endMin = parseInt(rangeMatch[2], 10);
    } else {
      const singleMatch = event.jamKegiatan.match(/(\d{1,2})[:.](\d{2})/);
      if (singleMatch) {
        endHour = Math.min(23, parseInt(singleMatch[1], 10) + 2);
        endMin = parseInt(singleMatch[2], 10);
      }
    }
  }

  const eventEndTime = new Date(d);
  eventEndTime.setHours(endHour, endMin, 0, 0);
  const claimOpensAtTime = eventEndTime.getTime() - (15 * 60 * 1000);
  const now = Date.now();

  if (now >= claimOpensAtTime) {
    return { open: true, reason: 'auto_open', msg: 'Klaim sertifikat dibuka (15 menit sebelum acara berakhir).' };
  } else {
    const diffMs = claimOpensAtTime - now;
    const diffMins = Math.ceil(diffMs / 60000);
    const openTimeStr = `${String(eventEndTime.getHours()).padStart(2, '0')}:${String(Math.max(0, eventEndTime.getMinutes() - 15)).padStart(2, '0')}`;
    const msg = diffMins <= 60 
      ? `Klaim sertifikat akan dibuka dalam ${diffMins} menit (pukul ${openTimeStr} WIB).`
      : `Klaim sertifikat akan dibuka otomatis 15 menit sebelum acara Zoom berakhir.`;
    return { open: false, reason: 'auto_not_yet', msg, diffMins };
  }
};

const EventContext = createContext(null);

export const EventProvider = ({ children }) => {
  const [events, setEvents] = useState([]);
  const [peserta, setPeserta] = useState({});
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
      const res = await SipenaAPI.createEvent(mapToBackend(form));
      await fetchEvents();
      return res;
    } catch (err) {
      console.error("Gagal tambah event", err);
      throw err;
    }
  };

  const updateEvent = async (form) => {
    try {
      const res = await SipenaAPI.updateEvent(form.id, mapToBackend(form));
      await fetchEvents();
      return res;
    } catch (err) {
      console.error("Gagal update event", err);
      throw err;
    }
  };

  const deleteEvent = async (id) => {
    try {
      const res = await SipenaAPI.deleteEvent(id);
      await fetchEvents();
      return res;
    } catch (err) {
      console.error("Gagal hapus event", err);
      throw err;
    }
  };

  const toggleClaimStatus = async (id, isClaimOpen, claimOpensAt) => {
    try {
      const res = await SipenaAPI.toggleEventClaim(id, { isClaimOpen, claimOpensAt });
      await fetchEvents();
      return res;
    } catch (err) {
      console.error("Gagal toggle status klaim", err);
      throw err;
    }
  };

  const claimCertificate = async (id, payload) => {
    try {
      const res = await SipenaAPI.claimEventCertificate(id, payload);
      await fetchEvents();
      return res;
    } catch (err) {
      console.error("Gagal klaim sertifikat", err);
      throw err;
    }
  };

  const getParticipants = async (id) => {
    try {
      return await SipenaAPI.getEventParticipants(id);
    } catch (err) {
      console.error("Gagal ambil peserta", err);
      return [];
    }
  };

  // ── Admin: toggle status hadir peserta (fallback lokal) ─────────────────
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
    if (!event.batasDaftar) return { open: true, msg: '' };

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

  // ── Pengunjung: daftar kegiatan (fallback lokal) ────────────────────────
  const daftarKegiatan = (eventId, userData) => {
    const ev = events.find(e => e.id === eventId);
    const regStatus = isRegistrationOpen(ev);
    if (!regStatus.open) return { success: false, msg: regStatus.msg };

    const pesertaEventIni = peserta[eventId] || [];
    if (pesertaEventIni.some(p => p.email === userData.email)) return { success: false, msg: 'Anda sudah terdaftar.' };

    const newPeserta = {
      id: Math.random().toString(36).substr(2, 9),
      nama: userData.namaLengkap || userData.username || 'Pengunjung',
      email: userData.email,
      instansi: userData.instansi || 'Umum',
      status: 'Tidak Hadir',
      tanggalDaftar: new Date().toLocaleDateString('id-ID'),
    };
    setPeserta(prev => ({
      ...prev,
      [eventId]: [...(prev[eventId] || []), newPeserta],
    }));
    return { success: true, msg: '' };
  };

  // ── Pengunjung: konfirmasi hadir dengan PIN (fallback lokal) ───────────
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
    return checkIfClaimOpen(event);
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
      toggleClaimStatus,
      claimCertificate,
      getParticipants,
      toggleKehadiran,
      daftarKegiatan,
      konfirmasiHadir,
      getPresensiStatus,
      checkIfClaimOpen,
      isUserRegistered,
      isUserHadir,
      isRegistrationOpen,
      refreshEvents: fetchEvents,
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
