import React, { useState, useRef } from 'react';
import './AdminLayout.css';
import { Users, FileDown } from 'lucide-react';

const STATUS_LIST = ['Akan Datang', 'Segera', 'Selesai'];
const STATUS_BADGE = { 'Akan Datang': 'badge-blue', 'Segera': 'badge-amber', 'Selesai': 'badge-green' };

const INITIAL_EVENTS = [
  { id: 1, judul: 'Seminar Literasi Digital 2026', tanggal: '2026-08-10', jamKegiatan: '09:00 - 12:00', lokasi: 'Aula Perpusnas, Jakarta', urlZoom: '', narasumber: 'Dr. Budi Santoso', penjelasan: 'Seminar tentang literasi digital di era AI.', status: 'Akan Datang', peserta: 120, waktuBuka: '08:00', waktuTutup: '10:00', kode: 'LITDIG26' },
  { id: 2, judul: 'Workshop Penulisan Ilmiah', tanggal: '2026-07-20', jamKegiatan: '13:00 - 15:00', lokasi: 'Online (Zoom)', urlZoom: 'https://zoom.us/j/123456789', narasumber: 'Prof. Rina Wijaya', penjelasan: 'Teknik penulisan ilmiah standar nasional.', status: 'Segera', peserta: 85, waktuBuka: '12:30', waktuTutup: '13:30', kode: 'WRKILM' },
];

// Mock Peserta per Event
const MOCK_PESERTA = [
  { id: 1, nama: 'Sari Indah', email: 'sari@email.com', instansi: 'Umum', status: 'Hadir' },
  { id: 2, nama: 'Rizki Fauzan', email: 'rizki@email.com', instansi: 'Mahasiswa', status: 'Tidak Hadir' },
  { id: 3, nama: 'Budi Santoso', email: 'budi@email.com', instansi: 'Guru', status: 'Tidak Hadir' },
];

const EMPTY_FORM = { judul: '', tanggal: '', jamKegiatan: '', lokasi: '', urlZoom: '', narasumber: '', penjelasan: '', status: 'Akan Datang', peserta: 0, waktuBuka: '', waktuTutup: '', kode: '' };

const Toast = ({ msg, onClose }) => (
  <div style={{
    position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999,
    background: '#0f172a', color: 'white', padding: '1rem 1.5rem',
    borderRadius: '0.75rem', boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
    display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '280px'
  }}>
    <span style={{ fontSize: '1.2rem' }}>✅</span>
    <span style={{ flex: 1, fontSize: '0.9rem' }}>{msg}</span>
    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.1rem' }}>×</button>
  </div>
);

const AdminKegiatan = () => {
  const [events, setEvents] = useState(INITIAL_EVENTS);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [pesertaModal, setPesertaModal] = useState(null);
  const [pesertaList, setPesertaList] = useState(MOCK_PESERTA);
  const [toast, setToast] = useState('');
  const [nextId, setNextId] = useState(INITIAL_EVENTS.length + 1);

  const fileRef = useRef(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const filtered = events.filter(e => e.judul.toLowerCase().includes(search.toLowerCase()));

  const handleSave = (form) => {
    if (modal.mode === 'edit') {
      setEvents(prev => prev.map(e => e.id === form.id ? { ...form } : e));
      showToast(`Kegiatan "${form.judul}" berhasil diperbarui.`);
    } else {
      setEvents(prev => [...prev, { ...form, id: nextId }]);
      setNextId(n => n + 1);
      showToast(`Kegiatan "${form.judul}" berhasil ditambahkan.`);
    }
    setModal(null);
  };

  const handleHapus = (id) => {
    const ev = events.find(e => e.id === id);
    if (window.confirm(`Hapus kegiatan "${ev.judul}"?\n\nTindakan ini tidak dapat dibatalkan.`)) {
      setEvents(prev => prev.filter(e => e.id !== id));
      showToast(`Kegiatan "${ev.judul}" berhasil dihapus.`);
    }
  };

  const exportCSV = () => {
    const header = ['Nama', 'Email', 'Instansi', 'Status'];
    const rows = pesertaList.map(p => [p.nama, p.email, p.instansi, p.status]);
    const csvContent = [header, ...rows].map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Daftar_Hadir_${pesertaModal.judul.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleKehadiran = (id) => {
    setPesertaList(prev => prev.map(p => p.id === id ? { ...p, status: p.status === 'Hadir' ? 'Tidak Hadir' : 'Hadir' } : p));
  };

  const inputStyle = {
    width: '100%', padding: '0.55rem 0.75rem', border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-md)', fontSize: '0.875rem',
    background: 'var(--bg-primary)', color: 'var(--text-primary)', boxSizing: 'border-box'
  };
  const labelStyle = { display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' };

  return (
    <div>
      <div className="admin-page-header">
        <h1>📅 Kegiatan</h1>
        <p>Kelola seminar, workshop, pendaftaran, dan daftar hadir acara.</p>
      </div>
      <div className="admin-card">
        <div className="admin-card-header">
          <input
            type="text" placeholder="Cari kegiatan..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: '0.45rem 0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', width: '260px', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
          />
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total: <strong>{filtered.length}</strong> kegiatan</span>
            <button className="btn btn-primary" style={{ padding: '0.45rem 1rem', fontSize: '0.875rem' }} onClick={() => setModal({ mode: 'tambah', data: EMPTY_FORM })}>
              + Tambah Kegiatan
            </button>
          </div>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>#</th><th>Judul Kegiatan</th><th>Tanggal</th><th>Lokasi</th><th>Peserta</th><th>Status</th><th>Aksi</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0
                ? <tr><td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '2rem' }}>Tidak ada kegiatan ditemukan.</td></tr>
                : filtered.map((e, i) => (
                  <tr key={e.id}>
                    <td style={{ color: 'var(--text-tertiary)' }}>{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{e.judul}</td>
                    <td style={{ fontSize: '0.82rem' }}>{new Date(e.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{e.lokasi}</td>
                    <td style={{ textAlign: 'center' }}>{e.peserta}</td>
                    <td><span className={`badge ${STATUS_BADGE[e.status]}`}>{e.status}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <button onClick={() => { setPesertaModal(e); setPesertaList(MOCK_PESERTA); }} style={{ background: 'none', border: 'none', color: '#059669', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Users size={14} /> Peserta
                        </button>
                        <button onClick={() => setModal({ mode: 'edit', data: { ...e } })} style={{ background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>✏️ Edit</button>
                        <button onClick={() => handleHapus(e.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL KEGIATAN */}
      {modal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', overflowY: 'auto'
        }}>
          <div style={{
            background: 'white', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '600px',
            boxShadow: '0 25px 60px rgba(0,0,0,0.25)', overflow: 'hidden', margin: 'auto'
          }}>
            <div style={{ background: 'linear-gradient(135deg,#1e3a8a,#2563eb)', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ color: 'white', margin: 0, fontSize: '1rem' }}>{modal.mode === 'edit' ? '✏️ Edit Kegiatan' : '➕ Tambah Kegiatan Baru'}</h3>
              <button onClick={() => setModal(null)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: '1rem' }}>×</button>
            </div>
            <form onSubmit={e => { e.preventDefault(); handleSave(modal.data); }} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Judul Kegiatan *</label>
                <input style={inputStyle} required value={modal.data.judul} onChange={e => setModal(p => ({ ...p, data: { ...p.data, judul: e.target.value } }))} placeholder="Nama kegiatan/event" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Tanggal *</label>
                  <input style={inputStyle} type="date" required value={modal.data.tanggal} onChange={e => setModal(p => ({ ...p, data: { ...p.data, tanggal: e.target.value } }))} />
                </div>
                <div>
                  <label style={labelStyle}>Jam Kegiatan *</label>
                  <input style={inputStyle} type="text" required value={modal.data.jamKegiatan || ''} onChange={e => setModal(p => ({ ...p, data: { ...p.data, jamKegiatan: e.target.value } }))} placeholder="09:00 - 12:00 WIB" />
                </div>
                <div>
                  <label style={labelStyle}>Estimasi Peserta</label>
                  <input style={inputStyle} type="number" min="0" value={modal.data.peserta} onChange={e => setModal(p => ({ ...p, data: { ...p.data, peserta: Number(e.target.value) } }))} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Lokasi Fisik *</label>
                  <input style={inputStyle} required value={modal.data.lokasi} onChange={e => setModal(p => ({ ...p, data: { ...p.data, lokasi: e.target.value } }))} placeholder="Contoh: Aula Perpusnas" />
                </div>
                <div>
                  <label style={labelStyle}>URL Link Zoom (Opsional)</label>
                  <input style={inputStyle} type="url" value={modal.data.urlZoom || ''} onChange={e => setModal(p => ({ ...p, data: { ...p.data, urlZoom: e.target.value } }))} placeholder="https://zoom.us/..." />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Narasumber *</label>
                <input style={inputStyle} required value={modal.data.narasumber || ''} onChange={e => setModal(p => ({ ...p, data: { ...p.data, narasumber: e.target.value } }))} placeholder="Nama narasumber beserta gelar" />
              </div>
              <div>
                <label style={labelStyle}>Penjelasan Singkat Kegiatan *</label>
                <textarea style={{ ...inputStyle, resize: 'vertical' }} rows="3" required value={modal.data.penjelasan || ''} onChange={e => setModal(p => ({ ...p, data: { ...p.data, penjelasan: e.target.value } }))} placeholder="Deskripsi mengenai kegiatan ini..."></textarea>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Buka Presensi</label>
                  <input style={inputStyle} type="time" value={modal.data.waktuBuka} onChange={e => setModal(p => ({ ...p, data: { ...p.data, waktuBuka: e.target.value } }))} />
                </div>
                <div>
                  <label style={labelStyle}>Tutup Presensi</label>
                  <input style={inputStyle} type="time" value={modal.data.waktuTutup} onChange={e => setModal(p => ({ ...p, data: { ...p.data, waktuTutup: e.target.value } }))} />
                </div>
                <div>
                  <label style={labelStyle}>Kode / PIN Presensi</label>
                  <input style={inputStyle} type="text" value={modal.data.kode} onChange={e => setModal(p => ({ ...p, data: { ...p.data, kode: e.target.value } }))} placeholder="Mis: 123456" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Upload Banner Kegiatan</label>
                  <input type="file" accept="image/*" style={inputStyle} />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Desain menarik dengan rasio 16:9, Ukuran Max: 2MB.</span>
                </div>
                <div>
                  <label style={labelStyle}>Templat Sertifikat (Opsional)</label>
                  <input type="file" ref={fileRef} accept="image/*" style={inputStyle} />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Unggah desain kosong untuk cetak PDF otomatis.</span>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Status *</label>
                <select style={{ ...inputStyle }} required value={modal.data.status} onChange={e => setModal(p => ({ ...p, data: { ...p.data, status: e.target.value } }))}>
                  {STATUS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setModal(null)} className="btn btn-outline">Batal</button>
                <button type="submit" className="btn btn-primary">{modal.mode === 'edit' ? '💾 Simpan Perubahan' : '➕ Tambah Kegiatan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PESERTA */}
      {pesertaModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div style={{
            background: 'white', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '700px',
            boxShadow: '0 25px 60px rgba(0,0,0,0.25)', overflow: 'hidden'
          }}>
            <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>👥 Peserta: {pesertaModal.judul}</h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Manajemen daftar hadir dan data peserta acara.</p>
              </div>
              <button onClick={() => setPesertaModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total: {pesertaList.length} pendaftar</span>
                <button onClick={exportCSV} className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <FileDown size={16} /> Ekspor CSV
                </button>
              </div>
              <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                <table className="admin-table" style={{ width: '100%' }}>
                  <thead>
                    <tr><th>Nama</th><th>Email</th><th>Instansi</th><th>Status</th><th>Aksi</th></tr>
                  </thead>
                  <tbody>
                    {pesertaList.map(p => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 600 }}>{p.nama}</td>
                        <td style={{ fontSize: '0.82rem' }}>{p.email}</td>
                        <td style={{ fontSize: '0.82rem' }}>{p.instansi}</td>
                        <td>
                          <span className={`badge ${p.status === 'Hadir' ? 'badge-green' : 'badge-amber'}`}>{p.status}</span>
                        </td>
                        <td>
                          <button
                            onClick={() => toggleKehadiran(p.id)}
                            style={{ background: 'none', border: 'none', color: p.status === 'Hadir' ? 'var(--danger)' : '#059669', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                          >
                            {p.status === 'Hadir' ? 'Batalkan' : 'Tandai Hadir'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast} onClose={() => setToast('')} />}
    </div>
  );
};

export default AdminKegiatan;
