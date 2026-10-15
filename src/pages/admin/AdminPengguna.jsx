import React, { useState, useEffect } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import './AdminLayout.css';
import { Eye, Check, X, Trash2, Power, Pencil, CheckCircle, AlertTriangle, FileText, PenTool, Users, ArrowUpCircle, ArrowDownCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../context/DialogContext';
import { api } from '../../services/api';

const STATUS_BADGE = { 'Aktif': 'badge-green', 'Menunggu': 'badge-amber', 'Nonaktif': 'badge-red' };

const getRoleBadge = (u) => {
  if (u.role === 'admin') {
    return <span className="badge badge-blue">Super Admin</span>;
  }
  if (u.isReviewer || u.role === 'reviewer') {
    return <span className="badge badge-purple">Reviewer / QC</span>;
  }
  return <span className="badge badge-gray">Personil Redaksi</span>;
};


const Toast = ({ msg, type = 'success', onClose }) => (
  <div style={{
    position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999,
    background: type === 'success' ? '#0f172a' : '#7f1d1d', color: 'white', padding: '1rem 1.5rem',
    borderRadius: '0.75rem', boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
    display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '280px'
  }}>
    <span style={{ display: 'flex', alignItems: 'center' }}>
      {type === 'success' ? <CheckCircle size={18} color="#10b981" /> : <AlertTriangle size={18} color="#f59e0b" />}
    </span>
    <span style={{ flex: 1, fontSize: '0.9rem' }}>{msg}</span>
    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.1rem' }}>×</button>
  </div>
);

const UserDetailModal = ({ user, onClose, onApprove, onReject }) => {
  if (!user) return null;
  const isApplicant = user.pengajuanPenulis || user.role === 'calon_penulis';
  const hasAuthorData = user.isVerifiedAuthor || isApplicant || user.bio || user.profesi || user.karyaEksternal?.length > 0;

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
    }}>
      <div style={{
        background: 'white', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '650px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.25)', overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column'
      }}>
        <div style={{ background: 'linear-gradient(135deg,#1e3a8a,#2563eb)', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ color: 'white', margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={16} /> Detail Data {isApplicant ? 'Pengajuan Verifikasi Penulis' : 'Pengguna'}
          </h3>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: '1rem' }}>×</button>
        </div>
        <div style={{ overflowY: 'auto', padding: '1.5rem' }}>
          {isApplicant && (
            <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <AlertTriangle size={18} color="#d97706" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.875rem', color: '#92400e' }}>
                Pengguna ini sedang mengajukan verifikasi sebagai <strong>Penulis Resmi</strong>. Tinjau draf portofolio di bawah.
              </span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: '0.2rem' }}>Nama Lengkap (KTP)</p>
              <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user.nama}</p>
            </div>
            <div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: '0.2rem' }}>Email</p>
              <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user.email}</p>
            </div>
            <div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: '0.2rem' }}>Tempat, Tanggal Lahir</p>
              <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user.tempatLahir}, {user.tanggalLahir}</p>
            </div>
            <div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: '0.2rem' }}>Pekerjaan / Instansi</p>
              <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user.pekerjaan} - {user.instansi}</p>
            </div>
          </div>

          {/* Portofolio & Draf Penulis */}
          {hasAuthorData && (
            <div style={{ marginBottom: '1.5rem', background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <h4 style={{ fontSize: '0.92rem', color: 'var(--text-primary)', margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <PenTool size={16} color="var(--accent-color)" /> Data Profil Kepenulisan Publik
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', margin: '0 0 0.2rem' }}>Profesi / Tagline Kepenulisan</p>
                  <p style={{ fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{user.profesi || '-'}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', margin: '0 0 0.2rem' }}>Domisili Publik</p>
                  <p style={{ fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{user.domisili || '-'}</p>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', margin: '0 0 0.2rem' }}>Website / Media Sosial</p>
                  <p style={{ fontWeight: 600, color: 'var(--accent-color)', margin: 0 }}>{user.website || '-'}</p>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', margin: '0 0 0.2rem' }}>Biografi Singkat</p>
                  <p style={{ color: 'var(--text-secondary)', margin: 0, fontStyle: 'italic', fontSize: '0.875rem', lineHeight: '1.6' }}>{user.bio || '-'}</p>
                </div>
              </div>

              {user.karyaEksternal && user.karyaEksternal.length > 0 && (
                <div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', margin: '0 0 0.5rem' }}>Buku yang Pernah Diterbitkan ({user.karyaEksternal.length}):</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {user.karyaEksternal.map((k, idx) => (
                      <div key={idx} style={{ background: 'white', padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                        <div>
                          <strong>{k.judul}</strong> · <span style={{ color: 'var(--text-secondary)' }}>{k.penerbit} ({k.tahun})</span>
                        </div>
                        {k.url && (
                          <a href={k.url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none', fontSize: '0.8rem' }}>
                            Beli di {k.storeName || 'Toko'} ↗
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Data Alamat</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: '0.2rem' }}>Alamat Lengkap</p>
              <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user.alamat}</p>
            </div>
            <div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: '0.2rem' }}>Provinsi</p>
              <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user.provinsi}</p>
            </div>
            <div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: '0.2rem' }}>Kota / Kabupaten</p>
              <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user.kota}</p>
            </div>
          </div>
        </div>
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            {isApplicant && onReject && (
              <button 
                className="btn btn-outline" 
                onClick={() => { onClose(); onReject(user); }}
                style={{ color: '#dc2626', borderColor: '#fca5a5' }}
              >
                <X size={14} /> Tolak Pengajuan
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-outline" onClick={onClose}>Tutup</button>
            {isApplicant && onApprove && (
              <button 
                className="btn btn-primary" 
                onClick={() => { onClose(); onApprove(user); }}
                style={{ background: '#059669', borderColor: '#059669' }}
              >
                <Check size={14} /> Setujui Sebagai Penulis
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const EditAuthorModal = ({ user, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    bio: user.bio || '',
    website: user.website || '',
    profesi: user.profesi || '',
    domisili: user.domisili || '',
    karyaEksternal: user.karyaEksternal || []
  });
  
  const [newKarya, setNewKarya] = useState({ judul: '', penerbit: '', tahun: '', url: '', storeName: '' });

  const handleAddKarya = () => {
    if (!newKarya.judul) return;
    setFormData(prev => ({
      ...prev,
      karyaEksternal: [...prev.karyaEksternal, { 
        ...newKarya, 
        storeName: newKarya.storeName.trim() || 'Toko Buku',
        id: Date.now() 
      }]
    }));
    setNewKarya({ judul: '', penerbit: '', tahun: '', url: '', storeName: '' });
  };

  const handleRemoveKarya = (id) => {
    setFormData(prev => ({
      ...prev,
      karyaEksternal: prev.karyaEksternal.filter(k => k.id !== id)
    }));
  };

  if (!user) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
    }}>
      <div style={{
        background: 'white', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '540px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.25)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh'
      }}>
        <div style={{ background: 'linear-gradient(135deg,#1e3a8a,#2563eb)', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ color: 'white', margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PenTool size={16} /> Edit Profil Penulis Publik
          </h3>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: '1rem' }}>×</button>
        </div>
        <div style={{ padding: '1.5rem', overflowY: 'auto' }}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: 600 }}>Nama Penulis</label>
            <input type="text" value={user.nama} disabled style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-tertiary)', boxSizing: 'border-box' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: 600 }}>Profesi / Tagline</label>
              <input type="text" value={formData.profesi} onChange={e => setFormData({ ...formData, profesi: e.target.value })} placeholder="e.g. Penulis & Peneliti Sastra" style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: 600 }}>Domisili Publik</label>
              <input type="text" value={formData.domisili} onChange={e => setFormData({ ...formData, domisili: e.target.value })} placeholder="e.g. Yogyakarta, Indonesia" style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', boxSizing: 'border-box' }} />
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: 600 }}>Website / Portofolio</label>
            <input type="text" value={formData.website} onChange={e => setFormData({ ...formData, website: e.target.value })} style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', boxSizing: 'border-box' }} />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: 600 }}>Biografi Singkat</label>
            <textarea rows="4" value={formData.bio} onChange={e => setFormData({ ...formData, bio: e.target.value })} style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', boxSizing: 'border-box' }}></textarea>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: 600 }}>Karya di Penerbit Lain</label>
            {formData.karyaEksternal.map(k => (
              <div key={k.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '0.5rem 0.8rem', borderRadius: 'var(--radius-md)', marginBottom: '0.5rem', border: '1px solid var(--border-color)' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{k.judul}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                    {k.penerbit} ({k.tahun}) · <span style={{ color: '#2563eb' }}>Beli di {k.storeName || 'Toko'}</span>
                  </div>
                </div>
                <button onClick={() => handleRemoveKarya(k.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }} title="Hapus"><Trash2 size={14}/></button>
              </div>
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.5rem', marginTop: '0.5rem' }}>
              <input type="text" placeholder="Judul Buku" value={newKarya.judul} onChange={e => setNewKarya({...newKarya, judul: e.target.value})} style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }} />
              <input type="text" placeholder="Penerbit" value={newKarya.penerbit} onChange={e => setNewKarya({...newKarya, penerbit: e.target.value})} style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }} />
              <input type="text" placeholder="Tahun" value={newKarya.tahun} onChange={e => setNewKarya({...newKarya, tahun: e.target.value})} style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }} />
              <input type="text" placeholder="Nama Toko" value={newKarya.storeName} onChange={e => setNewKarya({...newKarya, storeName: e.target.value})} style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }} />
              <input type="text" placeholder="Link URL" value={newKarya.url} onChange={e => setNewKarya({...newKarya, url: e.target.value})} style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', gridColumn: '1 / -1' }} />
            </div>
            <button onClick={handleAddKarya} className="btn btn-outline" style={{ marginTop: '0.5rem', padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}>+ Tambah Karya</button>
          </div>
        </div>
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button className="btn btn-outline" onClick={onClose}>Batal</button>
          <button className="btn btn-primary" onClick={() => onSave(formData)}>Simpan Perubahan</button>
        </div>
      </div>
    </div>
  );
};

const UserTable = ({ type, title, users, reloadUsers, loading }) => {
  const { isSuperAdmin } = useAuth();
  const { showConfirm, showToast: triggerToast } = useDialog();
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);
  const [detailModal, setDetailModal] = useState(null);
  const [editAuthorModal, setEditAuthorModal] = useState(null);

  const showToast = (msg, t = 'success') => { 
    setToast({ msg, type: t }); 
    setTimeout(() => setToast(null), 3500); 
  };

  const data = users[type] || [];
  const filtered = data.filter(u =>
    u.nama.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleSetujuiPegawai = async (u) => {
    const ok = await showConfirm({
      title: 'Setujui Pendaftaran Pegawai',
      message: `Setujui pendaftaran akun pegawai "${u.nama}" (${u.email})?\nAkun ini akan langsung berstatus Aktif.`,
      type: 'info',
      confirmText: 'Setujui Pegawai'
    });
    if (ok) {
      try {
        await api.admin.updateUser(u.id, { status: 'active' });
        if (reloadUsers) await reloadUsers();
        showToast(`Akun pegawai ${u.nama} berhasil disetujui & diaktifkan.`);
      } catch (err) {
        showToast(`Gagal menyetujui akun: ${err.message}`, 'error');
      }
    }
  };

  const handleSetujuiPenulis = async (u) => {
    const ok = await showConfirm({
      title: 'Verifikasi Penulis Resmi',
      message: `Verifikasi ${u.nama} sebagai Penulis resmi Perpusnas Press?\nMereka akan dapat menampilkan karya di profil publik dan portal penerbitan.`,
      type: 'info',
      confirmText: 'Verifikasi Penulis'
    });
    if (ok) {
      try {
        await api.admin.updateUser(u.id, { role: 'penulis', status: 'active' });
        if (reloadUsers) await reloadUsers();
        showToast(`${u.nama} berhasil diverifikasi sebagai Penulis.`);
      } catch (err) {
        showToast(`Gagal verifikasi penulis: ${err.message}`, 'error');
      }
    }
  };

  const handleUpgradePenulis = async (u) => {
    const ok = await showConfirm({
      title: 'Upgrade Status Penulis',
      message: `Upgrade status ${u.nama} menjadi Penulis Terverifikasi?\nVerifikasi ini diberikan atas kelayakan naskah yang telah dipublikasikan.`,
      type: 'info',
      confirmText: 'Upgrade ke Penulis'
    });
    if (ok) {
      try {
        await api.admin.updateUser(u.id, { role: 'penulis', status: 'active' });
        if (reloadUsers) await reloadUsers();
        showToast(`${u.nama} berhasil di-upgrade menjadi Penulis (Terverifikasi).`);
      } catch (err) {
        showToast(`Gagal upgrade penulis: ${err.message}`, 'error');
      }
    }
  };

  const handleDowngradePengunjung = async (u) => {
    const ok = await showConfirm({
      title: 'Cabut Status Penulis',
      message: `Cabut status Penulis dari ${u.nama}?\nAkun akan dikembalikan ke status Pengunjung biasa.`,
      type: 'warning',
      confirmText: 'Cabut Status'
    });
    if (ok) {
      try {
        await api.admin.updateUser(u.id, { role: 'pengunjung' });
        if (reloadUsers) await reloadUsers();
        showToast(`Status penulis ${u.nama} berhasil dicabut.`);
      } catch (err) {
        showToast(`Gagal downgrade: ${err.message}`, 'error');
      }
    }
  };

  const handleNonaktifkan = async (u) => {
    const isNonaktif = u.statusAkun === 'Nonaktif';
    const label = isNonaktif ? 'Aktifkan' : 'Nonaktifkan';
    const ok = await showConfirm({
      title: `${label} Akun Pengguna`,
      message: `Apakah Anda yakin ingin me-${label.toLowerCase()} akun "${u.nama}"?`,
      type: isNonaktif ? 'info' : 'warning',
      confirmText: `Ya, ${label}`
    });
    if (ok) {
      try {
        const nextStatus = isNonaktif ? 'active' : 'disabled';
        await api.admin.updateUser(u.id, { status: nextStatus });
        if (reloadUsers) await reloadUsers();
        showToast(`Akun ${u.nama} berhasil ${isNonaktif ? 'diaktifkan' : 'dinonaktifkan'}.`);
      } catch (err) {
        showToast(`Gagal mengubah status: ${err.message}`, 'error');
      }
    }
  };

  const handleTolakPenulis = async (u) => {
    const ok = await showConfirm({
      title: 'Tolak Pengajuan Penulis',
      message: `Tolak pengajuan verifikasi penulis dari "${u.nama}"?\nAkun akan tetap sebagai Pengunjung biasa.`,
      type: 'warning',
      confirmText: 'Ya, Tolak'
    });
    if (ok) {
      try {
        await api.admin.updateUser(u.id, { role: 'pengunjung', status: 'active' });
        if (reloadUsers) await reloadUsers();
        showToast(`Pengajuan verifikasi ${u.nama} telah ditolak.`);
      } catch (err) {
        showToast(`Gagal menolak pengajuan: ${err.message}`, 'error');
      }
    }
  };

  const handleSaveAuthorProfile = async (data) => {
    try {
      await api.admin.updateUser(editAuthorModal.id, {
        bio: data.bio,
        website: data.website,
        profesi: data.profesi,
        domisili: data.domisili,
        karyaEksternal: data.karyaEksternal
      });
      if (reloadUsers) await reloadUsers();
      setEditAuthorModal(null);
      showToast(`Profil publik ${editAuthorModal.nama} berhasil diperbarui.`);
    } catch (err) {
      showToast(`Gagal memperbarui profil: ${err.message}`, 'error');
    }
  };

  const handleHapus = async (u) => {
    const ok = await showConfirm({
      title: 'Hapus Akun Pengguna',
      message: `Hapus akun "${u.nama}" (${u.email}) secara permanen?\n\nTindakan ini tidak dapat dibatalkan.`,
      type: 'danger',
      confirmText: 'Hapus Permanen'
    });
    if (ok) {
      try {
        await api.admin.deleteUser(u.id);
        if (reloadUsers) await reloadUsers();
        showToast(`Akun ${u.nama} berhasil dihapus.`);
      } catch (err) {
        showToast(`Gagal menghapus akun: ${err.message}`, 'error');
      }
    }
  };

  return (
    <div>
      <div className="admin-page-header">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Users size={24} color="var(--accent-color)" /> {title}
        </h1>
        <p>Kelola akun {title.toLowerCase()} yang terdaftar di SiPena.</p>
      </div>
      {type === 'pegawai' && !isSuperAdmin && (
        <div style={{
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: 'var(--radius-md)',
          padding: '0.75rem 1rem',
          marginBottom: '1rem',
          fontSize: '0.85rem',
          color: '#1e40af',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem'
        }}>
          <AlertTriangle size={18} color="#2563eb" style={{ flexShrink: 0 }} />
          <span>
            <strong>Informasi Otoritas:</strong> Persetujuan pendaftaran akun pegawai baru, pengaktifan, dan penghapusan personil hanya dapat dilakukan oleh <strong>Super Administrator</strong>. Anda hanya dapat melihat daftar pegawai.
          </span>
        </div>
      )}
      <div className="admin-card">
        <div className="admin-card-header">
          <input
            type="text" placeholder="Cari nama atau email..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: '0.45rem 0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', width: '260px', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
          />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total: <strong>{filtered.length}</strong> pengguna</span>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                {type === 'pengunjung' ? (
                  <>
                    <th>Kontak Pengguna</th>
                    <th>Instansi & Domisili</th>
                    <th>Role / Akun</th>
                    <th>Aksi</th>
                  </>
                ) : (
                  <>
                    <th>#</th>
                    <th>Nama</th>
                    <th>Email</th>
                    <th>Instansi</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0
                ? <tr><td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '2rem' }}>Tidak ada data.</td></tr>
                : filtered.map((u, i) => (
                  <tr key={`${u.id}-${u.email}`}>
                    {type === 'pengunjung' ? (
                      <>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>{u.nama}</div>
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{u.email}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>Lahir: {u.tempatLahir}, {u.tanggalLahir}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem' }}>{u.instansi || '-'}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{u.pekerjaan || '-'}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>{u.kota}, {u.provinsi}</div>
                        </td>
                        <td>
                          <div style={{ marginBottom: '0.3rem' }}>
                            <span className={`badge ${u.isVerifiedAuthor ? 'badge-blue' : 'badge-gray'}`}>
                              {u.isVerifiedAuthor ? 'Penulis' : 'Pengunjung'}
                            </span>
                            {u.pengajuanPenulis && !u.isVerifiedAuthor && (
                              <span className="badge badge-amber" style={{ marginLeft: '0.3rem' }}>Mengajukan Penulis</span>
                            )}
                          </div>
                          <div>
                            <span className={`badge ${STATUS_BADGE[u.statusAkun] || 'badge-gray'}`}>{u.statusAkun}</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <button
                              onClick={() => setDetailModal(u)}
                              className="btn btn-outline"
                              style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                            >
                              <Eye size={12}/> Detail
                            </button>
                            {u.isVerifiedAuthor ? (
                              <>
                                <button
                                  onClick={() => setEditAuthorModal(u)}
                                  className="btn btn-outline"
                                  style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                                >
                                  <Pencil size={12}/> Edit Profil
                                </button>
                                <button
                                  onClick={() => handleDowngradePengunjung(u)}
                                  className="btn btn-outline"
                                  style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem', color: '#d97706', borderColor: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                                  title="Downgrade ke Pengunjung Biasa"
                                >
                                  <ArrowDownCircle size={12}/> Downgrade
                                </button>
                              </>
                            ) : (
                              u.pengajuanPenulis ? (
                                <>
                                  <button
                                    onClick={() => handleUpgradePenulis(u)}
                                    className="btn btn-outline"
                                    style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem', color: '#059669', borderColor: '#10b981', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                                    title="Terima Pengajuan Penulis"
                                  >
                                    <Check size={12}/> Terima Pengajuan
                                  </button>
                                  <button
                                    onClick={() => handleTolakPenulis(u)}
                                    className="btn btn-outline"
                                    style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem', color: '#dc2626', borderColor: '#fca5a5', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                                    title="Tolak Pengajuan Penulis"
                                  >
                                    <X size={12}/> Tolak
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => handleUpgradePenulis(u)}
                                  className="btn btn-outline"
                                  style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem', color: '#2563eb', borderColor: '#3b82f6', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                                  title="Upgrade ke Penulis Resmi"
                                >
                                  <ArrowUpCircle size={12}/> Upgrade
                                </button>
                              )
                            )}
                            <button
                              onClick={() => handleNonaktifkan(u)}
                              className="btn btn-outline"
                              style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.2rem', color: u.statusAkun === 'Nonaktif' ? '#2563eb' : 'var(--danger)', borderColor: u.statusAkun === 'Nonaktif' ? '#2563eb' : 'var(--danger)' }}
                            >
                              <Power size={12}/> {u.statusAkun === 'Nonaktif' ? 'Aktifkan' : 'Nonaktifkan'}
                            </button>
                            <button
                              onClick={() => handleHapus(u)}
                              className="btn btn-outline"
                              style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem', color: '#64748b', borderColor: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                            >
                              <Trash2 size={12}/> Hapus
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{ color: 'var(--text-tertiary)' }}>{i + 1}</td>
                        <td style={{ fontWeight: 600 }}>{u.nama}</td>
                        <td style={{ fontSize: '0.82rem' }}>{u.email}</td>
                        <td>{u.instansi}</td>
                        <td>{getRoleBadge(u)}</td>
                        <td><span className={`badge ${STATUS_BADGE[u.statusAkun] || 'badge-gray'}`}>{u.statusAkun}</span></td>
                        <td>
                          {isSuperAdmin ? (
                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                              {u.statusAkun === 'Menunggu' && (
                                <button
                                  onClick={() => handleSetujuiPegawai(u)}
                                  className="btn btn-outline"
                                  style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem', color: '#059669', borderColor: '#10b981', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                                  title="Setujui Akun Pegawai"
                                >
                                  <Check size={12}/> Setujui
                                </button>
                              )}
                              <button
                                onClick={() => handleNonaktifkan(u)}
                                className="btn btn-outline"
                                style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.2rem', color: u.statusAkun === 'Nonaktif' ? '#2563eb' : 'var(--danger)', borderColor: u.statusAkun === 'Nonaktif' ? '#2563eb' : 'var(--danger)' }}
                              >
                                <Power size={12}/> {u.statusAkun === 'Nonaktif' ? 'Aktifkan' : 'Nonaktifkan'}
                              </button>
                              <button
                                onClick={() => handleHapus(u)}
                                className="btn btn-outline"
                                style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem', color: '#64748b', borderColor: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                              >
                                <Trash2 size={12}/> Hapus
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                              Khusus Super Admin
                            </span>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <UserDetailModal user={detailModal} onClose={() => setDetailModal(null)} onApprove={handleUpgradePenulis} onReject={handleTolakPenulis} />
      {editAuthorModal && <EditAuthorModal user={editAuthorModal} onClose={() => setEditAuthorModal(null)} onSave={handleSaveAuthorProfile} />}
    </div>
  );
};

const AdminPengguna = () => {
  const [users, setUsers] = useState({ pengunjung: [], pegawai: [] });
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const rawUsers = await api.admin.getUsers();
      const mapped = { pengunjung: [], pegawai: [] };

      (rawUsers || []).forEach(u => {
        const isPengunjungOrPenulis = u.role === 'pengunjung' || u.role === 'penulis' || u.role === 'calon_penulis';
        const formattedUser = {
          id: u.id,
          nama: u.name,
          email: u.email,
          role: u.role,
          tempatLahir: u.tempatLahir || '-',
          tanggalLahir: u.tanggalLahir || '-',
          pekerjaan: u.pekerjaan || '-',
          instansi: u.instansi || (u.role === 'admin' ? 'Perpusnas (Super Admin)' : (u.role === 'personil' ? 'Perpusnas Press' : '-')),
          alamat: u.alamatLengkap || '-',
          provinsi: u.provinsi || '-',
          kota: u.kota || '-',
          kecamatan: u.kecamatan || '-',
          kelurahan: u.kelurahan || '-',
          bergabung: u.createdAt ? new Date(u.createdAt).toISOString().split('T')[0] : '-',
          statusAkun: u.status === 'active' ? 'Aktif' : (u.status === 'disabled' ? 'Nonaktif' : 'Menunggu'),
          isVerifiedAuthor: u.role === 'penulis',
          pengajuanPenulis: u.role === 'calon_penulis',
          isReviewer: u.isReviewer,
          bio: u.bio || '',
          profesi: u.profesi || '',
          domisili: u.domisili || '',
          image: u.image || '',
          website: u.website || '',
          karyaEksternal: Array.isArray(u.karyaEksternal) ? u.karyaEksternal : []
        };

        if (isPengunjungOrPenulis) {
          mapped.pengunjung.push(formattedUser);
        } else {
          mapped.pegawai.push(formattedUser);
        }
      });

      setUsers(mapped);
    } catch (err) {
      console.error('Failed to load users in AdminPengguna:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const tabs = [
    { path: '/admin/pengguna/pengunjung',    label: 'Pengunjung & Penulis',    type: 'pengunjung' },
    { path: '/admin/pengguna/pegawai',       label: 'Pegawai & Redaksi',       type: 'pegawai' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '2px solid var(--border-color)' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {tabs.map(t => {
            const pendingAuthorsCount = (users.pengunjung || []).filter(u => u.pengajuanPenulis).length;
            return (
              <NavLink
                key={t.path} to={t.path}
                style={({ isActive }) => ({
                  padding: '0.5rem 1.1rem', fontSize: '0.875rem', fontWeight: 600,
                  borderBottom: isActive ? '2px solid var(--accent-color)' : '2px solid transparent',
                  color: isActive ? 'var(--accent-color)' : 'var(--text-secondary)',
                  marginBottom: '-2px', transition: 'all 0.15s', textDecoration: 'none',
                })}
              >
                {t.label}
                <span style={{ marginLeft: '0.4rem', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontSize: '0.72rem', padding: '0 0.4rem', borderRadius: '50px' }}>
                  {users[t.type]?.length || 0}
                </span>
                {t.type === 'pengunjung' && pendingAuthorsCount > 0 && (
                  <span style={{ marginLeft: '0.4rem', background: '#fef3c7', color: '#b45309', fontSize: '0.72rem', padding: '0.1rem 0.5rem', borderRadius: '50px', fontWeight: 600 }}>
                    {pendingAuthorsCount} pengajuan
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>
        <button
          onClick={fetchUsers}
          disabled={loading}
          className="btn btn-outline"
          style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          title="Segarkan data pengguna dari database"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Memuat...' : 'Segarkan Data'}
        </button>
      </div>
      <Routes>
        <Route path="pengunjung"    element={<UserTable type="pengunjung"    title="Pengunjung & Penulis"    users={users} reloadUsers={fetchUsers} loading={loading} />} />
        <Route path="pegawai"       element={<UserTable type="pegawai"       title="Pegawai & Redaksi"       users={users} reloadUsers={fetchUsers} loading={loading} />} />
        <Route index                element={<UserTable type="pengunjung"    title="Pengunjung & Penulis"    users={users} reloadUsers={fetchUsers} loading={loading} />} />
      </Routes>
    </div>
  );
};

export default AdminPengguna;
