import React, { createContext, useContext, useState, useEffect } from 'react';
import { SipenaAPI } from '../lib/api';

const FAQContext = createContext(null);

export const FAQ_KATEGORI = [
  'Pendaftaran & Akun',
  'Penerbitan Buku',
  'Koleksi & Unduhan',
  'Teknis & Sistem'
];

export const DEFAULT_FAQS = [
  {
    id: 1,
    kategori: 'Pendaftaran & Akun',
    pertanyaan: 'Bagaimana cara mendaftar sebagai penulis di SiPena?',
    jawaban: 'Klik tombol "Masuk / Daftar" di pojok kanan atas, pilih tab "Daftar", lalu pilih peran "Penulis". Isi formulir dengan data diri yang lengkap dan valid. Setelah mendaftar, Anda dapat langsung mengakses halaman Profil Saya untuk melengkapi profil penulis.'
  },
  {
    id: 2,
    kategori: 'Pendaftaran & Akun',
    pertanyaan: 'Apa perbedaan antara Penulis dan Calon Penulis?',
    jawaban: '"Calon Penulis" adalah akun untuk Anda yang sedang dalam proses pengajuan naskah atau verifikasi. Setelah naskah disetujui dan diverifikasi oleh editor, akun Anda akan ditingkatkan menjadi "Penulis" dengan akses penuh ke fitur profil penulis.'
  },
  {
    id: 3,
    kategori: 'Pendaftaran & Akun',
    pertanyaan: 'Lupa kata sandi, bagaimana cara meresetnya?',
    jawaban: 'Pada halaman login, klik tautan "Lupa Kata Sandi". Masukkan email yang terdaftar, dan kami akan mengirimkan tautan reset ke email Anda dalam beberapa menit. Pastikan memeriksa folder spam jika email tidak ditemukan di kotak masuk.'
  },
  {
    id: 4,
    kategori: 'Penerbitan Buku',
    pertanyaan: 'Bagaimana prosedur pengajuan naskah ke Perpusnas Press?',
    jawaban: 'Prosedur pengajuan naskah meliputi: (1) Login sebagai Calon Penulis, (2) Unggah naskah dalam format yang ditentukan (DOC/DOCX/PDF), (3) Tim editor akan melakukan telaah awal dalam 5-7 hari kerja, (4) Jika lolos seleksi awal, naskah akan masuk proses review lebih lanjut, (5) Keputusan akhir disampaikan melalui email.'
  },
  {
    id: 5,
    kategori: 'Penerbitan Buku',
    pertanyaan: 'Berapa lama proses penerbitan berlangsung?',
    jawaban: 'Proses penerbitan secara keseluruhan berlangsung sekitar 3-6 bulan, tergantung kompleksitas naskah. Proses ini meliputi: seleksi naskah (1-2 minggu), review isi (4-8 minggu), editing & layout (4-6 minggu), serta proses cetak dan distribusi (2-4 minggu).'
  },
  {
    id: 6,
    kategori: 'Penerbitan Buku',
    pertanyaan: 'Apakah saya akan mendapatkan royalti dari buku yang diterbitkan?',
    jawaban: 'Ketentuan royalti diatur dalam perjanjian penerbitan yang ditandatangani antara penulis dan Perpusnas Press. Besaran royalti dan mekanisme pembayaran akan dijelaskan secara rinci oleh tim editor setelah naskah diterima untuk diterbitkan.'
  },
  {
    id: 7,
    kategori: 'Penerbitan Buku',
    pertanyaan: 'Format naskah apa yang diterima oleh Perpusnas Press?',
    jawaban: 'Perpusnas Press menerima naskah dalam format Microsoft Word (.doc/.docx) dengan ketentuan: ukuran kertas A4, font Times New Roman 12pt, spasi 1.5, margin 3cm di semua sisi. Detail panduan penulisan lengkap tersedia di bagian Layanan Penerbitan.'
  },
  {
    id: 8,
    kategori: 'Koleksi & Unduhan',
    pertanyaan: 'Apakah semua buku dapat diunduh secara gratis?',
    jawaban: 'Sebagian besar koleksi Perpusnas Press dapat diunduh secara gratis oleh masyarakat umum. Beberapa publikasi khusus mungkin memerlukan login atau proses pendaftaran terlebih dahulu. Informasi ketersediaan unduhan tertera di halaman detail setiap buku.'
  },
  {
    id: 9,
    kategori: 'Koleksi & Unduhan',
    pertanyaan: 'Format apa saja yang tersedia untuk unduhan?',
    jawaban: 'Koleksi tersedia dalam format PDF untuk dokumen lengkap. Beberapa publikasi juga tersedia dalam format ePub untuk kemudahan membaca di perangkat mobile. Format yang tersedia akan ditampilkan di halaman detail buku.'
  },
  {
    id: 10,
    kategori: 'Koleksi & Unduhan',
    pertanyaan: 'Bisakah saya menggunakan materi dari koleksi Perpusnas Press untuk keperluan penelitian?',
    jawaban: 'Ya, koleksi Perpusnas Press dapat digunakan untuk keperluan pendidikan, penelitian, dan non-komersial dengan mencantumkan sumber yang benar. Penggunaan untuk keperluan komersial memerlukan izin tertulis dari Perpusnas Press.'
  },
  {
    id: 11,
    kategori: 'Teknis & Sistem',
    pertanyaan: 'Browser apa yang direkomendasikan untuk menggunakan SiPena?',
    jawaban: 'SiPena dapat diakses melalui browser modern seperti Google Chrome (versi 90+), Mozilla Firefox (versi 88+), Microsoft Edge (versi 90+), dan Safari (versi 14+). Pastikan browser Anda selalu diperbarui untuk pengalaman terbaik.'
  },
  {
    id: 12,
    kategori: 'Teknis & Sistem',
    pertanyaan: 'Apa yang harus dilakukan jika mengalami masalah teknis?',
    jawaban: 'Jika mengalami masalah teknis, coba langkah berikut: (1) Refresh halaman, (2) Bersihkan cache browser, (3) Coba browser lain. Jika masalah berlanjut, hubungi tim teknis kami melalui email sipena@perpusnas.go.id dengan menyertakan screenshot dan deskripsi masalah.'
  }
];

export const FAQProvider = ({ children }) => {
  const [faqs, setFaqs] = useState(DEFAULT_FAQS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    SipenaAPI.getContent('faq_data')
      .then((remoteData) => {
        if (isMounted && Array.isArray(remoteData) && remoteData.length > 0) {
          setFaqs(remoteData);
        }
      })
      .catch((err) => {
        console.warn('Gagal memuat konten FAQ dari server:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => { isMounted = false; };
  }, []);

  const saveFaqs = async (newFaqs) => {
    setSaving(true);
    try {
      await SipenaAPI.saveContent('faq_data', newFaqs);
      setFaqs(newFaqs);
      return { success: true };
    } catch (err) {
      console.error('Gagal menyimpan FAQ ke server:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const addFaq = async (newFaq) => {
    const id = Date.now();
    const updated = [...faqs, { ...newFaq, id }];
    await saveFaqs(updated);
    return id;
  };

  const updateFaq = async (id, patch) => {
    const updated = faqs.map(f => f.id === id ? { ...f, ...patch } : f);
    await saveFaqs(updated);
  };

  const deleteFaq = async (id) => {
    const updated = faqs.filter(f => f.id !== id);
    await saveFaqs(updated);
  };

  return (
    <FAQContext.Provider value={{
      faqs,
      setFaqs,
      loading,
      saving,
      saveFaqs,
      addFaq,
      updateFaq,
      deleteFaq,
      FAQ_KATEGORI,
      DEFAULT_FAQS,
    }}>
      {children}
    </FAQContext.Provider>
  );
};

export const useFAQ = () => {
  const ctx = useContext(FAQContext);
  if (!ctx) throw new Error('useFAQ must be used inside FAQProvider');
  return ctx;
};
