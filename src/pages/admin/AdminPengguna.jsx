import React, { useState } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import './AdminLayout.css';
import { Eye, Check, X, Trash2, Power, Pencil } from 'lucide-react';

const INITIAL_USERS = {
  pengunjung: [
    { 
      id: 1, 
      nama: 'Sari Indah', 
      email: 'sari@email.com', 
      tempatLahir: 'Jakarta', 
      tanggalLahir: '15/04/1992', 
      pekerjaan: 'Pegawai Swasta', 
      instansi: 'PT Mencari Cinta Sejati', 
      alamat: 'Jl. Melati No 12, RT 01/RW 02', 
      provinsi: 'DKI Jakarta', 
      kota: 'Jakarta Selatan', 
      kecamatan: 'Tebet', 
      kelurahan: 'Tebet Barat', 
      bergabung: '2026-07-14', 
      statusAkun: 'Aktif', 
      isVerifiedAuthor: false,
      pengajuanPenulis: true
    },
    { 
      id: 2, 
      nama: 'Dr. Ahmad Fauzi', 
      email: 'ahmad@email.com', 
      tempatLahir: 'Bandung', 
      tanggalLahir: '10/08/1985', 
      pekerjaan: 'Dosen', 
      instansi: 'Universitas Indonesia', 
      alamat: 'Perumahan Dosen UI No 5', 
      provinsi: 'Jawa Barat', 
      kota: 'Depok', 
      kecamatan: 'Beji', 
      kelurahan: 'Pondok Cina', 
      bergabung: '2024-03-10', 
      statusAkun: 'Aktif', 
      isVerifiedAuthor: true,
      bio: 'Pengajar, peneliti, dan penulis aktif yang fokus pada sejarah Nusantara.',
      website: 'https://ahmadfauzi.id',
      karyaEksternal: [
        { id: 1, judul: 'Sejarah Maritim Nusantara', penerbit: 'Pustaka Jaya', tahun: '2021', url: 'https://tokopedia.com' }
      ]
    },
  ],
  pegawai: [
    { id: 1, nama: 'Hendra Wijaya', email: 'hendra@perpusnas.id', instansi: 'Perpusnas', bergabung: '2023-09-01', statusAkun: 'Aktif' },
  ],
};

const STATUS_BADGE = { 'Aktif': 'badge-green', 'Menunggu': 'badge-amber', 'Nonaktif': 'badge-red' };

const Toast = ({ msg, type = 'success', onClose }) => (
  <div style={{
    position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999,
    background: type === 'success' ? '#0f172a' : '#7f1d1d', color: 'white', padding: '1rem 1.5rem',
    borderRadius: '0.75rem', boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
    display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '280px'
  }}>
    <span style={{ fontSize: '1.2rem' }}>{type === 'success' ? '✅' : '⚠️'}</span>
    <span style={{ flex: 1, fontSize: '0.9rem' }}>{msg}</span>
    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.1rem' }}>×</button>
  </div>
);

const UserDetailModal = ({ user, onClose }) => {
  if (!user) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
    }}>
      <div style={{
        background: 'white', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '600px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.25)', overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column'
      }}>
        <div style={{ background: 'linear-gradient(135deg,#1e3a8a,#2563eb)', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ color: 'white', margin: 0, fontSize: '1rem' }}>📄 Detail Data Pengunjung</h3>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: '1rem' }}>×</button>
        </div>
        <div style={{ overflowY: 'auto', padding: '1.5rem' }}>
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
            <div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: '0.2rem' }}>Kecamatan</p>
              <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user.kecamatan}</p>
            </div>
            <div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: '0.2rem' }}>Kelurahan</p>
              <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user.kelurahan}</p>
            </div>
          </div>
        </div>
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-outline" onClick={onClose}>Tutup</button>
        </div>
      </div>
    </div>
  );
};

const EditAuthorModal = ({ user, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    bio: user.bio || '',
    website: user.website || '',
    karyaEksternal: user.karyaEksternal || []
  });
  
  const [newKarya, setNewKarya] = useState({ judul: '', penerbit: '', tahun: '', url: '' });

  const handleAddKarya = () => {
    if (!newKarya.judul) return;
    setFormData(prev => ({
      ...prev,
      karyaEksternal: [...prev.karyaEksternal, { ...newKarya, id: Date.now() }]
    }));
    setNewKarya({ judul: '', penerbit: '', tahun: '', url: '' });
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
        background: 'white', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '500px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.25)', overflow: 'hidden', display: 'flex', flexDirection: 'column'
      }}>
        <div style={{ background: 'linear-gradient(135deg,#1e3a8a,#2563eb)', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ color: 'white', margin: 0, fontSize: '1rem' }}>✍️ Edit Profil Penulis Publik</h3>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: '1rem' }}>×</button>
        </div>
        <div style={{ padding: '1.5rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: 600 }}>Nama Penulis</label>
            <input type="text" value={user.nama} disabled style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-tertiary)', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: 600 }}>Biografi Singkat</label>
            <textarea rows="4" value={formData.bio} onChange={e => setFormData({ ...formData, bio: e.target.value })} style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', boxSizing: 'border-box' }}></textarea>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: 600 }}>Website / Portofolio</label>
            <input type="text" value={formData.website} onChange={e => setFormData({ ...formData, website: e.target.value })} style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: 600 }}>Karya di Penerbit Lain</label>
            {formData.karyaEksternal.map(k => (
              <div key={k.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '0.5rem 0.8rem', borderRadius: 'var(--radius-md)', marginBottom: '0.5rem', border: '1px solid var(--border-color)' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{k.judul}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{k.penerbit} ({k.tahun})</div>
                </div>
                <button onClick={() => handleRemoveKarya(k.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }} title="Hapus"><Trash2 size={14}/></button>
              </div>
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
              <input type="text" placeholder="Judul Buku" value={newKarya.judul} onChange={e => setNewKarya({...newKarya, judul: e.target.value})} style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }} />
              <input type="text" placeholder="Penerbit" value={newKarya.penerbit} onChange={e => setNewKarya({...newKarya, penerbit: e.target.value})} style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }} />
              <input type="text" placeholder="Tahun" value={newKarya.tahun} onChange={e => setNewKarya({...newKarya, tahun: e.target.value})} style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }} />
              <input type="text" placeholder="Link URL" value={newKarya.url} onChange={e => setNewKarya({...newKarya, url: e.target.value})} style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }} />
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

const UserTable = ({ type, title, onUsersChange, users }) => {
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);
  const [detailModal, setDetailModal] = useState(null);
  const [editAuthorModal, setEditAuthorModal] = useState(null);

  const showToast = (msg, t = 'success') => { setToast({ msg, type: t }); setTimeout(() => setToast(null), 3500); };

  const data = users[type] || [];
  const filtered = data.filter(u =>
    u.nama.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleSetujuiPenulis = (u) => {
    if (window.confirm(`Verifikasi ${u.nama} sebagai Penulis resmi?\n\nMereka akan dapat menampilkan karya eksternal di halaman beranda.`)) {
      const updated = {
        ...users,
        pengunjung: users.pengunjung.map(x => 
          x.id === u.id ? { ...x, statusAkun: 'Aktif', isVerifiedAuthor: true } : x
        )
      };
      onUsersChange(updated);
      showToast(`${u.nama} berhasil diverifikasi sebagai Penulis.`);
    }
  };

  const handleNonaktifkan = (u) => {
    const isNonaktif = u.statusAkun === 'Nonaktif';
    const label = isNonaktif ? 'Aktifkan' : 'Nonaktifkan';
    if (window.confirm(`${label} akun ${u.nama}?`)) {
      const updated = {
        ...users,
        [type]: users[type].map(x =>
          (x.id === u.id && x.email === u.email)
            ? { ...x, statusAkun: isNonaktif ? 'Aktif' : 'Nonaktif' }
            : x
        )
      };
      onUsersChange(updated);
      showToast(`Akun ${u.nama} berhasil ${isNonaktif ? 'diaktifkan' : 'dinonaktifkan'}.`);
    }
  };

  const handleSaveAuthorProfile = (data) => {
    const updated = {
      ...users,
      pengunjung: users.pengunjung.map(x => 
        x.id === editAuthorModal.id ? { ...x, bio: data.bio, website: data.website, karyaEksternal: data.karyaEksternal } : x
      )
    };
    onUsersChange(updated);
    setEditAuthorModal(null);
    showToast(`Profil publik ${editAuthorModal.nama} berhasil diperbarui.`);
  };

  const handleHapus = (u) => {
    if (window.confirm(`Hapus akun "${u.nama}" (${u.email}) secara permanen?\n\nTindakan ini tidak dapat dibatalkan.`)) {
      const updated = {
        ...users,
        [type]: users[type].filter(x => !(x.id === u.id && x.email === u.email))
      };
      onUsersChange(updated);
      showToast(`Akun ${u.nama} berhasil dihapus.`);
    }
  };

  return (
    <div>
      <div className="admin-page-header">
        <h1>👥 {title}</h1>
        <p>Kelola akun {title.toLowerCase()} yang terdaftar di SiPena.</p>
      </div>
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
                            {u.isVerifiedAuthor && (
                              <button
                                onClick={() => setEditAuthorModal(u)}
                                className="btn btn-outline"
                                style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                              >
                                <Pencil size={12}/> Edit Profil
                              </button>
                            )}
                            {!u.isVerifiedAuthor && u.pengajuanPenulis && (
                              <button
                                onClick={() => handleSetujuiPenulis(u)}
                                className="btn btn-outline"
                                style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem', color: '#059669', borderColor: '#059669', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                                title="Verifikasi sebagai Penulis"
                              >
                                <Check size={12}/> Terima Pengajuan
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
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{ color: 'var(--text-tertiary)' }}>{i + 1}</td>
                        <td style={{ fontWeight: 600 }}>{u.nama}</td>
                        <td style={{ fontSize: '0.82rem' }}>{u.email}</td>
                        <td>{u.instansi}</td>
                        <td><span className="badge badge-gray">Pegawai</span></td>
                        <td><span className={`badge ${STATUS_BADGE[u.statusAkun] || 'badge-gray'}`}>{u.statusAkun}</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
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
                    )}
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <UserDetailModal user={detailModal} onClose={() => setDetailModal(null)} />
      {editAuthorModal && <EditAuthorModal user={editAuthorModal} onClose={() => setEditAuthorModal(null)} onSave={handleSaveAuthorProfile} />}
    </div>
  );
};

const AdminPengguna = () => {
  const [users, setUsers] = useState(INITIAL_USERS);

  const tabs = [
    { path: '/admin/pengguna/pengunjung',    label: 'Pengunjung',    type: 'pengunjung' },
    { path: '/admin/pengguna/pegawai',       label: 'Pegawai',       type: 'pegawai' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '2px solid var(--border-color)' }}>
        {tabs.map(t => (
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
          </NavLink>
        ))}
      </div>
      <Routes>
        <Route path="pengunjung"    element={<UserTable type="pengunjung"    title="Pengunjung & Penulis"    users={users} onUsersChange={setUsers} />} />
        <Route path="pegawai"       element={<UserTable type="pegawai"       title="Pegawai"       users={users} onUsersChange={setUsers} />} />
        <Route index                element={<UserTable type="pengunjung"    title="Pengunjung & Penulis"       users={users} onUsersChange={setUsers} />} />
      </Routes>
    </div>
  );
};

export default AdminPengguna;
