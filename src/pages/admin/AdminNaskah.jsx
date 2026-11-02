import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './AdminLayout.css';
import { ExternalLink, Check, X, FileText } from 'lucide-react';
import { SipenaAPI } from '../../lib/api';
import { useDialog } from '../../context/DialogContext';
import AdminPagination from '../../components/AdminPagination';

const AdminNaskah = () => {
  const { showConfirm, showAlert, showToast } = useDialog();
  const [naskah, setNaskah] = useState([]);
  const [rejectModal, setRejectModal] = useState({ isOpen: false, id: null, alasan: '' });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  useEffect(() => {
    fetchNaskah();
  }, []);

  const fetchNaskah = async () => {
    try {
      setLoading(true);
      const data = await SipenaAPI.getManuscripts();
      const mapped = data.map(n => ({
        id: n.id,
        judul: n.title,
        penulis: n.author ? n.author.name : 'Anonim',
        tanggal: n.createdAt ? new Date(n.createdAt).toISOString().split('T')[0] : '-',
        status: n.status === 'pending' ? 'Menunggu' 
              : n.status === 'approved' ? 'Disetujui' 
              : n.status === 'in_progress' ? 'Sedang Diproses'
              : n.status === 'published' ? 'Sudah Terbit'
              : n.status === 'rejected' ? 'Ditolak' 
              : n.status,
        rawStatus: n.status,
        projectId: n.projectId,
        bookId: n.bookId,
        alasan: n.reviewerNotes || '',
        linkDrive: n.fileUrl
      }));
      setNaskah(mapped);
    } catch (err) {
      console.error("Gagal mengambil data naskah", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    const ok = await showConfirm({
      title: 'Setujui Naskah',
      message: 'Apakah Anda yakin ingin menyetujui naskah ini? Naskah yang disetujui akan diproses ke tahap penerbitan.',
      type: 'info',
      confirmText: 'Ya, Setujui'
    });
    if (ok) {
      try {
        await SipenaAPI.updateManuscriptStatus(id, { status: 'approved' });
        showToast({ message: 'Naskah berhasil disetujui.', type: 'success' });
        fetchNaskah();
      } catch (err) {
        showAlert({ title: 'Gagal Menyetujui', message: err.message || 'Terjadi kesalahan saat menyetujui naskah.', type: 'error' });
      }
    }
  };

  const handleOpenReject = (id) => {
    setRejectModal({ isOpen: true, id, alasan: '' });
  };

  const handleConfirmReject = async () => {
    try {
      await SipenaAPI.updateManuscriptStatus(rejectModal.id, { status: 'rejected', reviewerNotes: rejectModal.alasan });
      setRejectModal({ isOpen: false, id: null, alasan: '' });
      showToast({ message: 'Naskah telah ditolak dengan catatan evaluasi.', type: 'info' });
      fetchNaskah();
    } catch (err) {
      showAlert({ title: 'Gagal Menolak', message: err.message || 'Terjadi kesalahan saat menolak naskah.', type: 'error' });
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Disetujui': return 'badge-green';
      case 'Sedang Diproses': return 'badge-blue';
      case 'Sudah Terbit': return 'badge-green';
      case 'Ditolak': return 'badge-red';
      default: return 'badge-amber'; // Menunggu
    }
  };

  const filtered = naskah.filter(item => {
    const matchSearch =
      item.judul.toLowerCase().includes(search.toLowerCase()) ||
      item.penulis.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedNaskah = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileText size={24} color="var(--accent-color)" /> Manajemen Naskah Masuk
        </h1>
        <p>Tinjau, setujui, atau tolak naskah yang diajukan oleh pengunjung/calon penulis.</p>
      </div>

      <div className="admin-card">
        <div className="admin-card-header" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Cari judul atau penulis..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ padding: '0.45rem 0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', width: '250px' }}
            />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{ padding: '0.45rem 0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}
            >
              <option value="all">Semua Status</option>
              <option value="Menunggu">Menunggu</option>
              <option value="Disetujui">Disetujui</option>
              <option value="Sedang Diproses">Sedang Diproses</option>
              <option value="Sudah Terbit">Sudah Terbit</option>
              <option value="Ditolak">Ditolak</option>
            </select>
          </div>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Total: <strong>{filtered.length}</strong> naskah
          </span>
        </div>

        {loading ? (
           <p style={{ padding: '2rem', textAlign: 'center' }}>Memuat naskah...</p>
        ) : (
        <>
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
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '2rem' }}>
                      {naskah.length === 0 ? 'Belum ada naskah yang diajukan.' : 'Tidak ada naskah yang sesuai pencarian/filter.'}
                    </td>
                  </tr>
                ) : (
                  paginatedNaskah.map((item) => (
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
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
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
                            <Link 
                              to={`/admin/manajemen/proyek/baru?title=${encodeURIComponent(item.judul)}&author=${encodeURIComponent(item.penulis)}&drive=${encodeURIComponent(item.linkDrive || '')}&manuscriptId=${item.id}&category=terbitan&type=reguler`} 
                              className="btn btn-outline"
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', borderColor: 'var(--accent-color)', color: 'var(--accent-color)', display: 'flex', alignItems: 'center', gap: '0.2rem', textDecoration: 'none' }}
                            >
                              Buat Proyek <ExternalLink size={12} />
                            </Link>
                          )}
                          {item.status === 'Sedang Diproses' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1d4ed8' }}>Sedang Diproses</span>
                              {item.projectId && (
                                <Link 
                                  to={`/admin/manajemen/proyek/${item.projectId}`} 
                                  className="btn btn-outline"
                                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderColor: '#2563eb', color: '#2563eb', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', textDecoration: 'none' }}
                                >
                                  Lihat Proyek <ExternalLink size={11} />
                                </Link>
                              )}
                            </div>
                          )}
                          {item.status === 'Sudah Terbit' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#065f46' }}>Sudah Terbit</span>
                              {item.bookId && (
                                <Link 
                                  to={`/buku/${item.bookId}`} 
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-outline"
                                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderColor: '#059669', color: '#059669', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', textDecoration: 'none' }}
                                >
                                  Lihat Buku <ExternalLink size={11} />
                                </Link>
                              )}
                            </div>
                          )}
                          {item.status === 'Ditolak' && (
                             <span style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>Selesai</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <AdminPagination
            currentPage={safePage}
            totalItems={filtered.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            itemName="naskah"
          />
        </>
        )}
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
