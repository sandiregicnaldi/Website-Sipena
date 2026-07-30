import React, { useState } from 'react';
import './AdminLayout.css';
import { ExternalLink, Check, X, FileText } from 'lucide-react';

const INITIAL_NASKAH = [
  { id: 1, judul: 'Sejarah Kopi Nusantara', penulis: 'Sari Indah', tanggal: '2026-07-01', status: 'Menunggu', alasan: '', linkDrive: 'https://drive.google.com/...' },
  { id: 2, judul: 'Teknik Penulisan Fiksi', penulis: 'Budi (Pengunjung)', tanggal: '2026-07-05', status: 'Disetujui', alasan: '', linkDrive: 'https://drive.google.com/...' },
  { id: 3, judul: 'Misteri Gunung Merapi', penulis: 'Rizki Fauzan', tanggal: '2026-07-10', status: 'Ditolak', alasan: 'Tema tidak sesuai dengan fokus penerbitan Perpusnas Press tahun ini.', linkDrive: 'https://drive.google.com/...' },
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
      <div className="admin-page-header">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileText size={24} color="var(--accent-color)" /> Manajemen Naskah Masuk
        </h1>
        <p>Tinjau, setujui, atau tolak naskah yang diajukan oleh pengunjung/calon penulis.</p>
      </div>

      <div className="admin-card">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Judul Naskah</th>
                <th>Penulis</th>
                <th>Berkas Naskah</th>
                <th>Tanggal Masuk</th>
                <th>Status</th>
                <th>Alasan Ditolak</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {naskah.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 600 }}>{item.judul}</td>
                  <td>{item.penulis}</td>
                  <td>
                    <a href={item.linkDrive} target="_blank" rel="noopener noreferrer" className="badge badge-blue" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none' }}>
                      <ExternalLink size={12} /> Buka Drive
                    </a>
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>{item.tanggal}</td>
                  <td><span className={`badge ${getStatusBadge(item.status)}`}>{item.status}</span></td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--danger)', maxWidth: '200px' }}>
                    {item.status === 'Ditolak' ? item.alasan : '-'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {item.status === 'Menunggu' && (
                        <>
                          <button className="btn btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }} onClick={() => handleApprove(item.id)}>
                            <Check size={14} /> Setujui
                          </button>
                          <button className="btn btn-outline" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', color: 'var(--danger)', borderColor: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.2rem' }} onClick={() => handleOpenReject(item.id)}>
                            <X size={14} /> Tolak
                          </button>
                        </>
                      )}
                      {item.status === 'Disetujui' && (
                        <a 
                          href={`https://manajemen-penerbitan.perpusnas.go.id/projects/new?title=${encodeURIComponent(item.judul)}&author=${encodeURIComponent(item.penulis)}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="btn btn-outline"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', borderColor: 'var(--accent-color)', color: 'var(--accent-color)', display: 'flex', alignItems: 'center', gap: '0.2rem', textDecoration: 'none' }}
                        >
                          Buat Proyek <ExternalLink size={12} />
                        </a>
                      )}
                      {item.status === 'Ditolak' && (
                         <span style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>Selesai</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {naskah.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '2rem' }}>Belum ada naskah yang diajukan.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject Modal */}
      {rejectModal.isOpen && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, 
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div style={{
            background: 'white', padding: '2rem', borderRadius: 'var(--radius-lg)', 
            width: '100%', maxWidth: '500px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem', color: 'var(--text-primary)' }}>Tolak Naskah</h3>
            <p style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Berikan alasan singkat mengapa naskah ini ditolak:</p>
            <textarea 
              style={{
                width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', 
                border: '1px solid var(--border-color)', marginBottom: '1.5rem', minHeight: '100px',
                fontFamily: 'inherit', fontSize: '0.9rem'
              }}
              value={rejectModal.alasan}
              onChange={(e) => setRejectModal(prev => ({...prev, alasan: e.target.value}))}
              placeholder="Contoh: Tema tidak sesuai..."
            ></textarea>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setRejectModal({isOpen:false, id:null, alasan:''})}>Batal</button>
              <button className="btn btn-primary" style={{ backgroundColor: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={handleConfirmReject} disabled={!rejectModal.alasan.trim()}>
                Konfirmasi Penolakan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminNaskah;
