import React, { useState } from 'react';
import './AdminLayout.css';

const STATUS_LIST = ['Akan Datang', 'Segera', 'Selesai'];
const STATUS_BADGE = { 'Akan Datang': 'badge-blue', 'Segera': 'badge-amber', 'Selesai': 'badge-green' };

const INITIAL_EVENTS = [
  { id: 1, judul: 'Seminar Literasi Digital 2026',         tanggal: '2026-08-10', lokasi: 'Aula Perpusnas, Jakarta', status: 'Akan Datang', peserta: 120 },
  { id: 2, judul: 'Workshop Penulisan Ilmiah',              tanggal: '2026-07-20', lokasi: 'Online (Zoom)',           status: 'Segera',      peserta: 85 },
  { id: 3, judul: 'Peluncuran Buku Koleksi Nusantara',      tanggal: '2026-06-15', lokasi: 'Auditorium Lt.2',         status: 'Selesai',     peserta: 200 },
  { id: 4, judul: 'Pelatihan Katalogisasi untuk Pustakawan', tanggal: '2026-05-28', lokasi: 'Ruang Pelatihan B',      status: 'Selesai',     peserta: 40 },
];

const EMPTY_FORM = { judul: '', tanggal: '', lokasi: '', status: 'Akan Datang', peserta: 0 };

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

const ModalKegiatan = ({ data, onSave, onClose }) => {
  const [form, setForm] = useState(data || EMPTY_FORM);
  const isEdit = !!data?.id;

  const inputStyle = {
    width: '100%', padding: '0.55rem 0.75rem', border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-md)', fontSize: '0.875rem',
    background: 'var(--bg-primary)', color: 'var(--text-primary)', boxSizing: 'border-box'
  };
  const labelStyle = { display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' };

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
    }}>
      <div style={{
        background: 'white', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '520px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.25)', overflow: 'hidden'
      }}>
        <div style={{ background: 'linear-gradient(135deg,#1e3a8a,#2563eb)', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ color: 'white', margin: 0, fontSize: '1rem' }}>{isEdit ? '✏️ Edit Kegiatan' : '➕ Tambah Kegiatan Baru'}</h3>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: '1rem' }}>×</button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onSave(form); }} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Judul Kegiatan *</label>
            <input style={inputStyle} required value={form.judul} onChange={e => setForm(p => ({ ...p, judul: e.target.value }))} placeholder="Nama kegiatan/event" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Tanggal *</label>
              <input style={inputStyle} type="date" required value={form.tanggal} onChange={e => setForm(p => ({ ...p, tanggal: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Estimasi Peserta</label>
              <input style={inputStyle} type="number" min="0" value={form.peserta} onChange={e => setForm(p => ({ ...p, peserta: Number(e.target.value) }))} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Lokasi *</label>
            <input style={inputStyle} required value={form.lokasi} onChange={e => setForm(p => ({ ...p, lokasi: e.target.value }))} placeholder="Contoh: Aula Perpusnas / Online (Zoom)" />
          </div>
          <div>
            <label style={labelStyle}>Status *</label>
            <select style={{ ...inputStyle }} required value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
              {STATUS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button type="button" onClick={onClose} className="btn btn-outline">Batal</button>
            <button type="submit" className="btn btn-primary">{isEdit ? '💾 Simpan Perubahan' : '➕ Tambah Kegiatan'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AdminKegiatan = () => {
  const [events, setEvents] = useState(INITIAL_EVENTS);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState('');
  const [nextId, setNextId] = useState(INITIAL_EVENTS.length + 1);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const filtered = events.filter(e => e.judul.toLowerCase().includes(search.toLowerCase()));

  const handleSave = (formData) => {
    if (modal.mode === 'edit') {
      setEvents(prev => prev.map(e => e.id === formData.id ? { ...formData } : e));
      showToast(`Kegiatan "${formData.judul}" berhasil diperbarui.`);
    } else {
      setEvents(prev => [...prev, { ...formData, id: nextId }]);
      setNextId(n => n + 1);
      showToast(`Kegiatan "${formData.judul}" berhasil ditambahkan.`);
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

  return (
    <div>
      <div className="admin-page-header">
        <h1>📅 Kegiatan</h1>
        <p>Kelola seminar, workshop, dan peluncuran buku Perpusnas Press yang tampil di halaman publik.</p>
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
            <button className="btn btn-primary" style={{ padding: '0.45rem 1rem', fontSize: '0.875rem' }} onClick={() => setModal({ mode: 'tambah', data: null })}>
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
                      <button onClick={() => setModal({ mode: 'edit', data: { ...e } })} style={{ background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', fontSize: '0.8rem', marginRight: '0.5rem', fontWeight: 600 }}>✏️ Edit</button>
                      <button onClick={() => handleHapus(e.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>🗑️ Hapus</button>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>
      {modal && <ModalKegiatan data={modal.data} onSave={handleSave} onClose={() => setModal(null)} />}
      {toast && <Toast msg={toast} onClose={() => setToast('')} />}
    </div>
  );
};

export default AdminKegiatan;
