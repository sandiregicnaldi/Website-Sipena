import React, { useState } from 'react';
import './AdminLayout.css';

const INITIAL_NASKAH = [
  { id: 1, judul: 'Sejarah Kopi Nusantara', penulis: 'Ahmad Faisal', tanggal: '2026-07-01', kategori: 'Sejarah', status: 'Menunggu' },
  { id: 2, judul: 'Teknik Penulisan Fiksi', penulis: 'Rina S.', tanggal: '2026-07-05', kategori: 'Sastra', status: 'Disetujui', alasan: '' },
  { id: 3, judul: 'Misteri Gunung Merapi', penulis: 'Budi Hartono', tanggal: '2026-07-10', kategori: 'Fiksi', status: 'Ditolak', alasan: 'Tema tidak sesuai dengan fokus penerbitan Perpusnas Press tahun ini.' },
];

const AdminNaskah = () => {
  const [naskah, setNaskah] = useState(INITIAL_NASKAH);
  const [rejectModal, setRejectModal] = useState({ isOpen: false, id: null, alasan: '' });

  const handleApprove = (id) => {
    if(window.confirm('Apakah Anda yakin ingin menyetujui naskah ini?')) {
      setNaskah(prev => prev.map(n => n.id === id ? { ...n, status: 'Disetujui' } : n));
    }
  };

  const handleOpenReject = (id) => {
    setRejectModal({ isOpen: true, id, alasan: '' });
  };

  const handleConfirmReject = () => {
    setNaskah(prev => prev.map(n => n.id === rejectModal.id ? { ...n, status: 'Ditolak', alasan: rejectModal.alasan } : n));
    setRejectModal({ isOpen: false, id: null, alasan: '' });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Disetujui': return 'badge-green';
      case 'Ditolak': return 'badge-red';
      default: return 'badge-amber'; // Menunggu
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1 className="admin-title">Manajemen Naskah Masuk</h1>
        <p className="admin-subtitle">Tinjau, setujui, atau tolak naskah yang diajukan oleh calon penulis.</p>
      </div>

      <div className="admin-card" style={{overflowX: 'auto'}}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Judul Naskah</th>
              <th>Penulis</th>
              <th>Kategori</th>
              <th>Tanggal Masuk</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {naskah.map((item) => (
              <tr key={item.id}>
                <td>#NSK-{item.id.toString().padStart(3, '0')}</td>
                <td>
                  <strong>{item.judul}</strong>
                  {item.status === 'Ditolak' && <div style={{fontSize:'0.75rem', color:'var(--red-600)', marginTop:'0.25rem'}}>Alasan: {item.alasan}</div>}
                </td>
                <td>{item.penulis}</td>
                <td>{item.kategori}</td>
                <td>{item.tanggal}</td>
                <td><span className={`admin-badge ${getStatusBadge(item.status)}`}>{item.status}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {item.status === 'Menunggu' && (
                      <>
                        <button className="btn btn-primary" style={{padding:'0.25rem 0.75rem', fontSize:'0.85rem'}} onClick={() => handleApprove(item.id)}>Setujui</button>
                        <button className="btn btn-outline" style={{padding:'0.25rem 0.75rem', fontSize:'0.85rem', color:'var(--red-600)', borderColor:'var(--red-600)'}} onClick={() => handleOpenReject(item.id)}>Tolak</button>
                      </>
                    )}
                    {item.status === 'Disetujui' && (
                      <a 
                        href={`https://manajemen-penerbitan.perpusnas.go.id/projects/new?title=${encodeURIComponent(item.judul)}&author=${encodeURIComponent(item.penulis)}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="btn btn-outline"
                        style={{padding:'0.25rem 0.75rem', fontSize:'0.85rem', borderColor:'var(--accent-color)', color:'var(--accent-color)'}}
                      >
                        Buat Proyek ↗
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {naskah.length === 0 && (
              <tr>
                <td colSpan="7" className="text-center" style={{padding:'2rem'}}>Belum ada naskah yang diajukan.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Reject Modal */}
      {rejectModal.isOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, 
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: 'white', padding: '2rem', borderRadius: 'var(--radius-lg)', 
            width: '90%', maxWidth: '500px', boxShadow: 'var(--shadow-xl)'
          }}>
            <h3 style={{marginBottom:'1rem'}}>Tolak Naskah</h3>
            <p style={{marginBottom:'0.5rem', fontSize:'0.9rem', color:'var(--text-secondary)'}}>Silakan berikan alasan mengapa naskah ini ditolak:</p>
            <textarea 
              style={{
                width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', 
                border: '1px solid var(--border-color)', marginBottom: '1.5rem', minHeight: '100px'
              }}
              value={rejectModal.alasan}
              onChange={(e) => setRejectModal(prev => ({...prev, alasan: e.target.value}))}
              placeholder="Contoh: Tema tidak sesuai dengan fokus penerbitan tahun ini..."
            ></textarea>
            <div style={{display:'flex', gap:'1rem', justifyContent:'flex-end'}}>
              <button className="btn btn-outline" onClick={() => setRejectModal({isOpen:false, id:null, alasan:''})}>Batal</button>
              <button className="btn btn-primary" style={{backgroundColor:'var(--red-600)', borderColor:'var(--red-600)'}} onClick={handleConfirmReject} disabled={!rejectModal.alasan.trim()}>Tolak Naskah</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminNaskah;
