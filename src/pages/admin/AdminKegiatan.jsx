import React, { useState, useRef } from 'react';
import './AdminLayout.css';
import { Users, FileDown } from 'lucide-react';
import { useEvent } from '../../context/EventContext';

const STATUS_LIST  = ['Akan Datang', 'Segera', 'Selesai'];
const STATUS_BADGE = { 'Akan Datang': 'badge-blue', 'Segera': 'badge-amber', 'Selesai': 'badge-green' };

const EMPTY_FORM = {
  judul: '', tanggal: '', jamKegiatan: '', lokasi: '', urlZoom: '',
  narasumber: [''], penjelasan: '', status: 'Akan Datang',
  peserta: 0, waktuBuka: '', waktuTutup: '', kode: ''
};

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
  const { events, peserta, addEvent, updateEvent, deleteEvent, toggleKehadiran } = useEvent();

  const [search, setSearch]         = useState('');
  const [modal, setModal]           = useState(null);
  const [pesertaModal, setPesertaModal] = useState(null);
  const [toast, setToast]           = useState('');

  const fileRef = useRef(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const filtered = events.filter(e => e.judul.toLowerCase().includes(search.toLowerCase()));

  const handleSave = (form) => {
    if (modal.mode === 'edit') {
      updateEvent(form);
      showToast(`Kegiatan "${form.judul}" berhasil diperbarui.`);
    } else {
      addEvent(form);
      showToast(`Kegiatan "${form.judul}" berhasil ditambahkan.`);
    }
    setModal(null);
  };

  const handleHapus = (id) => {
    const ev = events.find(e => e.id === id);
    if (window.confirm(`Hapus kegiatan "${ev.judul}"?\n\nTindakan ini tidak dapat dibatalkan.`)) {
      deleteEvent(id);
      showToast(`Kegiatan "${ev.judul}" berhasil dihapus.`);
    }
  };

  // Peserta list untuk event yang sedang dibuka
  const pesertaList = pesertaModal ? (peserta[pesertaModal.id] || []) : [];

  const exportCSV = () => {
    const header = ['Nama', 'Email', 'Instansi', 'Status', 'Tanggal Daftar'];
    const rows   = pesertaList.map(p => [p.nama, p.email, p.instansi, p.status, p.tanggalDaftar || '-']);
    const csvContent = [header, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM untuk Excel
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Daftar_Hadir_${pesertaModal.judul.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
              <tr><th>#</th><th>Detail Kegiatan</th><th>Pelaksanaan</th><th>Narasumber</th><th>Peserta</th><th>Status</th><th>Aksi</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0
                ? <tr><td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '2rem' }}>Tidak ada kegiatan ditemukan.</td></tr>
                : filtered.map((e, i) => (
                  <tr key={e.id}>
                    <td style={{ color: 'var(--text-tertiary)' }}>{i + 1}</td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>{e.judul}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>PIN: <strong>{e.kode || '-'}</strong> &bull; Presensi: {e.waktuBuka}–{e.waktuTutup} WIB</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>{new Date(e.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} • {e.jamKegiatan}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{e.lokasi}</div>
                      {e.urlZoom && <div style={{ fontSize: '0.75rem', color: '#2563eb', marginTop: '0.1rem' }}>🌐 Online (Zoom)</div>}
                    </td>
                    <td>
                      <ul style={{ margin: 0, paddingLeft: '1rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        {(Array.isArray(e.narasumber) ? e.narasumber : [e.narasumber]).map((n, idx) => <li key={idx}>{n}</li>)}
                      </ul>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 700 }}>{(peserta[e.id] || []).length}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                        {(peserta[e.id] || []).filter(p => p.status === 'Hadir').length} hadir
                      </div>
                    </td>
                    <td><span className={`badge ${STATUS_BADGE[e.status]}`}>{e.status}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <button onClick={() => setPesertaModal(e)} style={{ background: 'none', border: 'none', color: '#059669', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Users size={14} /> Peserta ({(peserta[e.id] || []).length})
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

      {/* MODAL TAMBAH/EDIT KEGIATAN */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', overflowY: 'auto' }}>
          <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '600px', boxShadow: '0 25px 60px rgba(0,0,0,0.25)', overflow: 'hidden', margin: 'auto' }}>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {(Array.isArray(modal.data.narasumber) ? modal.data.narasumber : ['']).map((n, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '0.5rem' }}>
                      <input style={inputStyle} required value={n} onChange={e => {
                        const newArr = [...modal.data.narasumber];
                        newArr[idx] = e.target.value;
                        setModal(p => ({ ...p, data: { ...p.data, narasumber: newArr } }));
                      }} placeholder="Nama narasumber beserta gelar" />
                      {idx > 0 && (
                        <button type="button" onClick={() => {
                          const newArr = modal.data.narasumber.filter((_, i) => i !== idx);
                          setModal(p => ({ ...p, data: { ...p.data, narasumber: newArr } }));
                        }} className="btn btn-outline" style={{ padding: '0 0.75rem', color: 'var(--danger)', borderColor: 'var(--danger)' }}>X</button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={() => {
                    const current = Array.isArray(modal.data.narasumber) ? modal.data.narasumber : [];
                    setModal(p => ({ ...p, data: { ...p.data, narasumber: [...current, ''] } }));
                  }} className="btn btn-outline" style={{ alignSelf: 'flex-start', padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>+ Tambah Narasumber</button>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Penjelasan Singkat Kegiatan *</label>
                <textarea style={{ ...inputStyle, resize: 'vertical' }} rows="3" required value={modal.data.penjelasan || ''} onChange={e => setModal(p => ({ ...p, data: { ...p.data, penjelasan: e.target.value } }))} placeholder="Deskripsi mengenai kegiatan ini..."></textarea>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Buka Presensi (Waktu)</label>
                  <input style={inputStyle} type="time" value={modal.data.waktuBuka} onChange={e => setModal(p => ({ ...p, data: { ...p.data, waktuBuka: e.target.value } }))} />
                </div>
                <div>
                  <label style={labelStyle}>Tutup Presensi (Waktu)</label>
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
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Rasio 16:9, Max 2MB.</span>
                </div>
                <div>
                  <label style={labelStyle}>Templat Sertifikat (Opsional)</label>
                  <input type="file" ref={fileRef} accept="image/*" style={inputStyle} />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Unggah desain kosong untuk cetak PDF.</span>
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
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '700px', boxShadow: '0 25px 60px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>👥 Peserta: {pesertaModal.judul}</h3>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {pesertaList.length} mendaftar &bull; {pesertaList.filter(p => p.status === 'Hadir').length} hadir
                </p>
              </div>
              <button onClick={() => setPesertaModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>PIN Presensi: <strong>{pesertaModal.kode}</strong> &bull; Jam: {pesertaModal.waktuBuka}–{pesertaModal.waktuTutup} WIB</span>
                <button onClick={exportCSV} className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <FileDown size={16} /> Ekspor CSV (Excel)
                </button>
              </div>
              <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                <table className="admin-table" style={{ width: '100%' }}>
                  <thead>
                    <tr><th>Nama</th><th>Email</th><th>Instansi</th><th>Tgl. Daftar</th><th>Status</th><th>Aksi</th></tr>
                  </thead>
                  <tbody>
                    {pesertaList.length === 0
                      ? <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '2rem' }}>Belum ada peserta yang mendaftar.</td></tr>
                      : pesertaList.map(p => (
                        <tr key={p.id}>
                          <td style={{ fontWeight: 600 }}>{p.nama}</td>
                          <td style={{ fontSize: '0.82rem' }}>{p.email}</td>
                          <td style={{ fontSize: '0.82rem' }}>{p.instansi}</td>
                          <td style={{ fontSize: '0.82rem' }}>{p.tanggalDaftar || '-'}</td>
                          <td>
                            <span className={`badge ${p.status === 'Hadir' ? 'badge-green' : 'badge-amber'}`}>{p.status}</span>
                          </td>
                          <td>
                            <button
                              onClick={() => toggleKehadiran(pesertaModal.id, p.id)}
                              style={{ background: 'none', border: 'none', color: p.status === 'Hadir' ? 'var(--danger)' : '#059669', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                            >
                              {p.status === 'Hadir' ? 'Batalkan' : 'Tandai Hadir'}
                            </button>
                          </td>
                        </tr>
                      ))
                    }
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
