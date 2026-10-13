import { useState, useEffect, useMemo } from 'react'
import { api } from '../../../services/api'
import { useApp } from '../../../context/AppContext'
import { useAuth } from '../../../context/AuthContext'

const SKILL_OPTIONS = [
    'administrasi', 'editor', 'isbn', 'penerjemah', 'distribusi',
    'konten', 'keuangan', 'layout', 'desain', 'proofreading', 'qc', 'promosi'
]

const SKILL_LABELS = {
    administrasi: 'Administrasi', editor: 'Editor Naskah', isbn: 'Manajemen ISBN',
    penerjemah: 'Penerjemah', distribusi: 'Distribusi', konten: 'Konten Digital',
    keuangan: 'Keuangan', layout: 'Tata Letak', desain: 'Desain Grafis',
    proofreading: 'Pemeriksaan Naskah', qc: 'Kendali Kualitas', promosi: 'Promosi & Pemasaran'
}

const AVATAR_COLORS = [
    'bg-[#dce8f8] text-[#163d7a]',
    'bg-emerald-100 text-emerald-700',
    'bg-amber-100 text-amber-700',
    'bg-rose-100 text-rose-700',
    'bg-cyan-100 text-cyan-700',
    'bg-violet-100 text-violet-700',
]

const initials = (name) => {
    if (!name) return '?'
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

const StatusDot = ({ status }) => {
    const map = {
        active: { dotColor: 'bg-emerald-500', textColor: 'text-emerald-700', label: 'Aktif' },
        pending: { dotColor: 'bg-amber-500', textColor: 'text-amber-700', label: 'Menunggu' },
        disabled: { dotColor: 'bg-rose-500', textColor: 'text-rose-600', label: 'Nonaktif' },
    }
    const s = map[status] || map.pending
    return (
        <span className={`flex items-center gap-1 text-[10px] font-bold uppercase ${s.textColor}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${s.dotColor}`} />
            {s.label}
        </span>
    )
}

export default function UserManagement() {
    const { isAdmin } = useApp()
    const { isSuperAdmin } = useAuth()
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedUser, setSelectedUser] = useState(null)
    const [search, setSearch] = useState('')
    const [saving, setSaving] = useState(false)
    const [showSkillPicker, setShowSkillPicker] = useState(false)
    const [deleteModal, setDeleteModal] = useState(null) // null | user object
    const [deleteConfirmText, setDeleteConfirmText] = useState('')
    const [deleting, setDeleting] = useState(false)
    const [passwordModal, setPasswordModal] = useState(null) // null | user object
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [settingPassword, setSettingPassword] = useState(false)
    const [passwordSuccess, setPasswordSuccess] = useState('')
    const [showNewPw, setShowNewPw] = useState(false)
    const [showConfirmPw, setShowConfirmPw] = useState(false)

    // Editable state for the selected user's panel
    const [editRole, setEditRole] = useState('personil')
    const [editStatus, setEditStatus] = useState('pending')
    const [editSkills, setEditSkills] = useState([])
    const [editIsReviewer, setEditIsReviewer] = useState(false)

    const fetchUsers = async () => {
        try {
            const data = await api.admin.getUsers()
            setUsers(data)
        } catch (e) {
            console.error('Failed to load users:', e)
        }
        setLoading(false)
    }

    useEffect(() => { fetchUsers() }, [])

    const selectUser = (user) => {
        setSelectedUser(user)
        setEditRole(user.role || 'personil')
        setEditStatus(user.status || 'pending')
        setEditSkills(user.skills || [])
        setEditIsReviewer(user.isReviewer === true || user.role === 'admin' || user.role === 'reviewer')
        setShowSkillPicker(false)
    }

    const handleSave = async () => {
        if (!selectedUser) return
        setSaving(true)
        try {
            await api.admin.updateUser(selectedUser.id, {
                role: editRole,
                status: editStatus,
                skills: editSkills,
                isReviewer: editRole === 'admin' ? true : editIsReviewer,
            })
            await fetchUsers()
            // Update local selected state to reflect saved changes
            setSelectedUser(prev => ({
                ...prev,
                role: editRole,
                status: editStatus,
                skills: editSkills,
                isReviewer: editRole === 'admin' ? true : editIsReviewer
            }))
        } catch (e) {
            alert('Gagal menyimpan: ' + e.message)
        }
        setSaving(false)
    }

    const handleQuickStatus = async (userId, newStatus) => {
        try {
            await api.admin.updateUser(userId, { status: newStatus })
            await fetchUsers()
            if (selectedUser?.id === userId) {
                setSelectedUser(prev => ({ ...prev, status: newStatus }))
                setEditStatus(newStatus)
            }
        } catch (e) {
            alert('Gagal update status: ' + e.message)
        }
    }

    const handleSetPassword = async () => {
        if (!passwordModal || newPassword.length < 8) return
        if (newPassword !== confirmPassword) return
        setSettingPassword(true)
        try {
            const result = await api.admin.setPassword(passwordModal.id, newPassword)
            setPasswordSuccess(result.message || 'Password berhasil diatur!')
            setTimeout(() => {
                setPasswordModal(null)
                setNewPassword('')
                setConfirmPassword('')
                setPasswordSuccess('')
                setShowNewPw(false)
                setShowConfirmPw(false)
            }, 2000)
        } catch (e) {
            alert('Gagal mengatur password: ' + e.message)
        }
        setSettingPassword(false)
    }

    const handleDeleteUser = async () => {
        if (!deleteModal) return
        setDeleting(true)
        try {
            await api.admin.deleteUser(deleteModal.id)
            await fetchUsers()
            if (selectedUser?.id === deleteModal.id) setSelectedUser(null)
            setDeleteModal(null)
        } catch (e) {
            alert('Gagal menghapus: ' + e.message)
        }
        setDeleting(false)
    }

    const removeSkill = (skill) => {
        setEditSkills(prev => prev.filter(s => s !== skill))
    }

    const toggleSkill = (skill) => {
        setEditSkills(prev =>
            prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
        )
    }

    const filteredUsers = useMemo(() => {
        if (!search.trim()) return users
        const term = search.toLowerCase()
        return users.filter(u =>
            u.name?.toLowerCase().includes(term) || u.email?.toLowerCase().includes(term)
        )
    }, [users, search])

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
                <span className="material-symbols-outlined text-4xl text-[#6a9dd4] animate-pulse">people</span>
                <p className="text-sm text-slate-400 font-medium">Memuat data pengguna...</p>
            </div>
        </div>
    )

    if (!isSuperAdmin) {
        return (
            <div className="p-8 max-w-xl mx-auto my-12 text-center bg-white rounded-2xl border border-slate-200/80 shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
                    <span className="material-symbols-outlined text-3xl">lock</span>
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">Akses Terbatas</h2>
                <p className="text-sm text-slate-500 mb-6">
                    Menu Manajemen Pengguna dan pengaturan hak akses tim hanya dapat diakses oleh <strong>Super Administrator</strong>.
                </p>
                <div className="inline-block px-4 py-2 bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg">
                    Peran Anda saat ini tidak memiliki hak konfigurasi akun.
                </div>
            </div>
        )
    }

    return (
        <div className="p-6 grid grid-cols-12 gap-6 items-start max-w-7xl mx-auto">

            {/* ===== LEFT: User List ===== */}
            <section className="col-span-12 lg:col-span-5 space-y-5">
                <div>
                    <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-1">Manajemen Pengguna</h2>
                    <p className="text-sm text-slate-500 font-medium">Kelola akun, role, dan persetujuan pengguna</p>
                </div>

                {/* Search */}
                <div className="w-full flex items-center bg-white hover:bg-slate-50/50 focus-within:bg-white border border-slate-200 hover:border-slate-300 focus-within:border-[#0b5cd5] rounded-xl px-4 py-2 focus-within:ring-3 focus-within:ring-[#0b5cd5]/15 transition-all shadow-xs gap-3 group">
                    <svg className="text-slate-400 group-focus-within:text-[#0b5cd5] shrink-0 transition-colors pointer-events-none" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Cari nama atau email..."
                        className="w-full bg-transparent border-none outline-none p-0 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-0 leading-normal"
                    />
                    {search && (
                        <button
                            type="button"
                            onClick={() => setSearch('')}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
                            title="Hapus pencarian"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* User list */}
                <div className="space-y-3">
                    {filteredUsers.length === 0 ? (
                        <div className="text-center py-10">
                            <span className="material-symbols-outlined text-4xl text-slate-300">person_search</span>
                            <p className="text-sm text-slate-400 mt-2">Tidak ada pengguna ditemukan</p>
                        </div>
                    ) : filteredUsers.map((user, idx) => {
                        const isSelected = selectedUser?.id === user.id
                        const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length]
                        return (
                            <div
                                key={user.id}
                                onClick={() => selectUser(user)}
                                className={`p-4 bg-white rounded-xl flex items-center justify-between cursor-pointer transition-all duration-200 ${isSelected
                                    ? 'border-l-4 border-[#1c51a1] shadow-md'
                                    : 'border border-slate-200/60 hover:border-slate-300'
                                    } ${user.status === 'disabled' ? 'opacity-70' : ''}`}
                                style={{ boxShadow: isSelected ? '0 4px 16px rgba(53,37,205,0.10)' : '0 1px 3px rgba(0,0,0,0.05)' }}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-11 h-11 rounded-xl ${avatarColor} flex items-center justify-center font-bold text-sm flex-shrink-0`}>
                                        {initials(user.name)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 text-sm">{user.name}</h3>
                                        <p className="text-[11px] text-slate-400 font-mono">{user.email}</p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1.5">
                                    <div className="flex gap-1 flex-wrap justify-end">
                                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${user.role === 'admin'
                                            ? 'bg-[#dce8f8] text-[#163d7a]'
                                            : 'bg-slate-100 text-slate-600'
                                            }`}>
                                            {user.role === 'admin' ? 'Super Admin' : 'Pegawai'}
                                        </span>
                                        {(user.isReviewer || user.role === 'admin' || user.role === 'reviewer') && (
                                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider bg-indigo-100 text-indigo-700">
                                                Reviewer
                                            </span>
                                        )}
                                    </div>
                                    <StatusDot status={user.status || 'pending'} />
                                </div>
                            </div>
                        )
                    })}
                </div>
            </section>

            {/* ===== RIGHT: Detail Panel ===== */}
            <section className="col-span-12 lg:col-span-7 lg:sticky lg:top-20">
                {!selectedUser ? (
                    <div
                        className="bg-white rounded-2xl p-12 text-center border border-dashed border-slate-200"
                        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
                    >
                        <span className="material-symbols-outlined text-5xl text-slate-300">manage_accounts</span>
                        <h3 className="mt-3 font-bold text-slate-500">Pilih pengguna</h3>
                        <p className="text-sm text-slate-400 mt-1">Klik salah satu user di sebelah kiri untuk melihat dan mengelola detail akunnya</p>
                    </div>
                ) : (
                    <div>
                        {/* Main detail card */}
                        <div
                            className="bg-white/80 backdrop-blur-md rounded-2xl p-7 border border-white/60"
                            style={{ boxShadow: '0 8px 32px rgba(11,28,48,0.10)' }}
                        >
                            {/* User header */}
                            <div className="flex items-start justify-between mb-7">
                                <div className="flex items-center gap-5">
                                    <div className={`w-16 h-16 rounded-2xl ${AVATAR_COLORS[users.findIndex(u => u.id === selectedUser.id) % AVATAR_COLORS.length]} flex items-center justify-center font-black text-2xl flex-shrink-0`}>
                                        {initials(selectedUser.name)}
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-slate-900 tracking-tight">{selectedUser.name}</h2>
                                        <p className="text-slate-500 font-mono text-sm">{selectedUser.email}</p>
                                        <div className="flex gap-2 mt-2 flex-wrap">
                                            <span className={`px-2.5 py-1 text-[10px] font-bold rounded-md uppercase ${editRole === 'admin' ? 'bg-[#dce8f8] text-[#163d7a]' : 'bg-slate-100 text-slate-600'}`}>
                                                {editRole === 'admin' ? 'Super Administrator' : 'Pegawai / Personil'}
                                            </span>
                                            {(editIsReviewer || editRole === 'admin') && (
                                                <span className="px-2.5 py-1 text-[10px] font-bold rounded-md uppercase bg-indigo-100 text-indigo-700">
                                                    Admin Reviewer
                                                </span>
                                            )}
                                            <StatusDot status={editStatus} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-5 mb-5">
                                {/* Role */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Level Akun Sistem</label>
                                    <select
                                        value={editRole}
                                        onChange={e => {
                                            const nextRole = e.target.value
                                            setEditRole(nextRole)
                                            if (nextRole === 'admin') setEditIsReviewer(true)
                                        }}
                                        disabled={!isSuperAdmin}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-semibold focus:outline-none focus:border-[#1c51a1] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        <option value="personil">Pegawai (Personil Redaksi)</option>
                                        <option value="admin">Super Administrator</option>
                                    </select>
                                </div>

                                {/* Status toggle */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Status Akun</label>
                                    <div className="flex bg-slate-100 p-1 rounded-lg gap-1">
                                        {['active', 'disabled'].map(s => (
                                            <button
                                                key={s}
                                                onClick={() => isSuperAdmin && setEditStatus(s)}
                                                disabled={!isSuperAdmin}
                                                className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${editStatus === s
                                                    ? s === 'active'
                                                        ? 'bg-white text-emerald-600 shadow-sm'
                                                        : 'bg-white text-rose-600 shadow-sm'
                                                    : 'text-slate-500 hover:text-slate-700'
                                                    } ${!isSuperAdmin && 'cursor-not-allowed opacity-70'}`}
                                            >
                                                {s === 'active' ? 'Aktif' : 'Nonaktif'}
                                            </button>
                                        ))}
                                    </div>
                                    {isSuperAdmin && selectedUser.status === 'pending' && (
                                        <button
                                            onClick={() => { handleQuickStatus(selectedUser.id, 'active'); setEditStatus('active') }}
                                            className="w-full py-2 text-xs font-bold rounded-lg bg-emerald-600 text-white flex items-center justify-center gap-1.5 hover:bg-emerald-700 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                            Setujui & Aktifkan
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Reviewer Permission Card */}
                            <div className="mb-6 p-4 rounded-xl border border-indigo-100 bg-indigo-50/60 space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="pr-3">
                                        <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                            <span className="material-symbols-outlined text-[16px] text-indigo-600">verified</span>
                                            Hak Admin Reviewer (Penerbitan)
                                        </div>
                                        <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                                            Memberikan hak untuk mereview, menyetujui, meminta revisi, dan mengklaim seluruh tahapan di Kanban alur kerja tanpa memberikan kekuatan Super Admin.
                                        </p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                                        <input
                                            type="checkbox"
                                            checked={editRole === 'admin' || editIsReviewer}
                                            disabled={editRole === 'admin' || !isSuperAdmin}
                                            onChange={e => setEditIsReviewer(e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 peer-disabled:opacity-60"></div>
                                    </label>
                                </div>
                                {editRole === 'admin' && (
                                    <p className="text-[10px] text-indigo-700 font-medium italic">
                                        * Super Administrator secara otomatis memiliki seluruh hak reviewer.
                                    </p>
                                )}
                            </div>

                            {/* Skills */}
                            <div className="mb-6 space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Keahlian & Spesialisasi</label>
                                    <button
                                        onClick={() => setShowSkillPicker(p => !p)}
                                        className="text-xs text-[#1c51a1] font-bold hover:underline flex items-center gap-1"
                                    >
                                        <span className="material-symbols-outlined text-[14px]">{showSkillPicker ? 'expand_less' : 'add'}</span>
                                        {showSkillPicker ? 'Tutup' : 'Tambah'}
                                    </button>
                                </div>

                                {/* Active skill chips */}
                                <div className="flex flex-wrap gap-2 min-h-[32px]">
                                    {editSkills.length === 0 ? (
                                        <span className="text-xs text-slate-400 italic">Belum ada keahlian</span>
                                    ) : editSkills.map(skill => (
                                        <div key={skill} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#eef4fc] text-[#163d7a] rounded-full text-xs font-semibold">
                                            <span>{SKILL_LABELS[skill] || skill}</span>
                                            <button
                                                onClick={() => removeSkill(skill)}
                                                className="text-[#6a9dd4] hover:text-[#1c51a1] transition-colors leading-none"
                                            >
                                                <span className="material-symbols-outlined text-[14px]">close</span>
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                {/* Skill picker */}
                                {showSkillPicker && (
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-2">Pilih skill</p>
                                        <div className="flex flex-wrap gap-2">
                                            {SKILL_OPTIONS.map(skill => (
                                                <button
                                                    key={skill}
                                                    onClick={() => toggleSkill(skill)}
                                                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${editSkills.includes(skill)
                                                        ? 'bg-[#1c51a1] text-white border-[#1c51a1]'
                                                        : 'bg-white text-slate-600 border-slate-200 hover:border-[#6a9dd4] hover:text-[#1c51a1]'
                                                        }`}
                                                >
                                                    {SKILL_LABELS[skill] || skill}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Metadata */}
                            <div className="grid grid-cols-2 gap-4 pt-5 mb-6 border-t border-slate-100">
                                <div>
                                    <p className="text-[10px] text-slate-400 uppercase font-mono mb-1">ID Pengguna</p>
                                    <p className="text-sm font-bold text-slate-700 font-mono">{selectedUser.id?.slice?.(0, 12) || '—'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-400 uppercase font-mono mb-1">Jumlah Skill</p>
                                    <p className="text-sm font-bold text-slate-700">{editSkills.length} keahlian terdaftar</p>
                                </div>
                            </div>

                            {/* Action buttons */}
                            <div className="flex gap-3">
                                {isSuperAdmin && (
                                    <>
                                        <button
                                            onClick={handleSave}
                                            disabled={saving}
                                            className="flex-1 py-3.5 px-6 text-white font-bold rounded-xl shadow-xl shadow-[#1c51a1]/20 hover:shadow-[#1c51a1]/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60"
                                            style={{ background: 'linear-gradient(135deg, #1c51a1 0%, #2563c0 100%)' }}
                                        >
                                            {saving ? (
                                                <><span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span> Menyimpan...</>
                                            ) : (
                                                <><span className="material-symbols-outlined text-[18px]">save</span> Simpan Perubahan</>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => { setEditRole(selectedUser.role || 'personil'); setEditStatus(selectedUser.status || 'pending'); setEditSkills(selectedUser.skills || []); setShowSkillPicker(false) }}
                                            className="px-5 py-3.5 bg-white text-slate-600 font-bold rounded-xl border border-slate-200 hover:bg-slate-50 transition-all"
                                        >
                                            Atur Ulang
                                        </button>
                                    </>
                                )}
                                {isSuperAdmin && (
                                    <button
                                        onClick={() => { setDeleteModal(selectedUser); setDeleteConfirmText('') }}
                                        className="px-5 py-3.5 bg-rose-50 text-rose-600 font-bold rounded-xl border border-rose-100 hover:bg-rose-100 transition-all flex items-center gap-1.5"
                                        title="Hapus permanen pengguna ini"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">delete_forever</span>
                                        Hapus Akun
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Security card */}
                        <div className="mt-5 p-6 bg-slate-900 rounded-2xl flex items-center justify-between text-white overflow-hidden relative group">
                            <div className="z-10">
                                <h4 className="text-sm font-bold opacity-75 mb-1">Akses Keamanan</h4>
                                <p className="text-xs text-[#6a9dd4] mb-4">Reset password atau kelola akses untuk pengguna ini.</p>
                                <div className="flex gap-2 flex-wrap">
                                    <button
                                        onClick={() => { setPasswordModal(selectedUser); setNewPassword(''); setConfirmPassword(''); setPasswordSuccess('') }}
                                        className="px-4 py-2 bg-[#1c51a1]/80 hover:bg-[#1c51a1] rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-[14px]">lock_reset</span>
                                        Ubah Password
                                    </button>
                                    {isSuperAdmin && selectedUser.status === 'active' && (
                                        <button
                                            onClick={() => handleQuickStatus(selectedUser.id, 'disabled')}
                                            className="px-4 py-2 bg-rose-600/80 hover:bg-rose-600 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-[14px]">block</span>
                                            Nonaktifkan
                                        </button>
                                    )}
                                    {isSuperAdmin && selectedUser.status === 'disabled' && (
                                        <button
                                            onClick={() => handleQuickStatus(selectedUser.id, 'active')}
                                            className="px-4 py-2 bg-emerald-600/80 hover:bg-emerald-600 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                            Aktifkan Kembali
                                        </button>
                                    )}
                                    {isSuperAdmin && selectedUser.status === 'pending' && (
                                        <button
                                            onClick={() => handleQuickStatus(selectedUser.id, 'active')}
                                            className="px-4 py-2 bg-[#1c51a1] hover:bg-[#1c51a1] rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-[14px]">verified_user</span>
                                            Setujui Pengguna
                                        </button>
                                    )}
                                </div>
                            </div>

                            <span
                                className="material-symbols-outlined text-8xl absolute -right-4 -bottom-4 opacity-10 group-hover:rotate-12 transition-transform duration-500"
                                style={{ fontVariationSettings: "'FILL' 1" }}
                            >shield_lock</span>
                        </div>
                    </div>
                )}
            </section>

            {/* ===== SET PASSWORD MODAL ===== */}
            {passwordModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(6px)' }}
                    onClick={() => { setPasswordModal(null); setNewPassword(''); setConfirmPassword('') }}
                >
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8" onClick={e => e.stopPropagation()}>
                        <div className="w-16 h-16 rounded-2xl bg-[#dce8f8] flex items-center justify-center mx-auto mb-5">
                            <span className="material-symbols-outlined text-3xl text-[#1c51a1]" style={{ fontVariationSettings: "'FILL' 1" }}>lock_reset</span>
                        </div>

                        {passwordSuccess ? (
                            <div className="text-center py-4">
                                <span className="material-symbols-outlined text-5xl text-emerald-500 mb-3 block" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                <p className="font-bold text-slate-800">{passwordSuccess}</p>
                                <p className="text-xs text-slate-500 mt-1">User dapat login dengan email + password baru ini.</p>
                            </div>
                        ) : (
                            <>
                                <h3 className="text-xl font-black text-slate-900 text-center mb-1">Set Password</h3>
                                <p className="text-sm text-slate-500 text-center mb-6">
                                    Atur password baru untuk <strong className="text-[#1c51a1]">{passwordModal.name}</strong>
                                    <br /><span className="font-mono text-xs">{passwordModal.email}</span>
                                </p>

                                <div className="space-y-4 mb-6">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Password Baru</label>
                                        <div className="relative">
                                            <input
                                                type={showNewPw ? 'text' : 'password'}
                                                value={newPassword}
                                                onChange={e => setNewPassword(e.target.value)}
                                                placeholder="Minimal 8 karakter"
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 pr-11 text-sm focus:outline-none focus:border-[#1c51a1] focus:ring-2 focus:ring-[#1c51a1]/20 transition-all"
                                                autoFocus
                                            />
                                            <button onClick={() => setShowNewPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                                <span className="material-symbols-outlined text-[18px]">{showNewPw ? 'visibility_off' : 'visibility'}</span>
                                            </button>
                                        </div>
                                        {newPassword.length > 0 && newPassword.length < 8 && (
                                            <p className="text-xs text-rose-500 font-semibold flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[13px]">error</span> Minimal 8 karakter
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Konfirmasi Password</label>
                                        <div className="relative">
                                            <input
                                                type={showConfirmPw ? 'text' : 'password'}
                                                value={confirmPassword}
                                                onChange={e => setConfirmPassword(e.target.value)}
                                                placeholder="Ulangi password baru"
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 pr-11 text-sm focus:outline-none focus:border-[#1c51a1] focus:ring-2 focus:ring-[#1c51a1]/20 transition-all"
                                            />
                                            <button onClick={() => setShowConfirmPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                                <span className="material-symbols-outlined text-[18px]">{showConfirmPw ? 'visibility_off' : 'visibility'}</span>
                                            </button>
                                        </div>
                                        {confirmPassword.length > 0 && confirmPassword !== newPassword && (
                                            <p className="text-xs text-rose-500 font-semibold flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[13px]">error</span> Password tidak cocok
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => { setPasswordModal(null); setNewPassword(''); setConfirmPassword('') }}
                                        className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-all"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        onClick={handleSetPassword}
                                        disabled={newPassword.length < 8 || newPassword !== confirmPassword || settingPassword}
                                        className="flex-1 py-3 font-bold rounded-xl text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        style={{ background: 'linear-gradient(135deg, #1c51a1 0%, #2563c0 100%)' }}
                                    >
                                        {settingPassword
                                            ? <><span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span> Menyimpan...</>
                                            : <><span className="material-symbols-outlined text-[16px]">lock_reset</span> Set Password</>
                                        }
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ===== DELETE CONFIRMATION MODAL ===== */}
            {deleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(6px)' }}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-7" onClick={e => e.stopPropagation()}>
                        {/* Icon */}
                        <div className="w-14 h-14 rounded-2xl bg-rose-100 flex items-center justify-center mx-auto mb-4">
                            <span className="material-symbols-outlined text-3xl text-rose-600"
                                style={{ fontVariationSettings: "'FILL' 1" }}>delete_forever</span>
                        </div>

                        <h3 className="text-xl font-black text-slate-900 text-center mb-2">Yakin Hapus Pengguna?</h3>
                        <p className="text-sm text-slate-500 text-center mb-6 leading-relaxed">
                            Akun <strong className="text-rose-600">{deleteModal.name}</strong> beserta semua sesi, akun tertaut, dan notifikasi terkait akan dihapus secara permanen.
                            Data ini <strong>tidak dapat dipulihkan kembali</strong>.
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => { setDeleteModal(null) }}
                                className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-all"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleDeleteUser}
                                disabled={deleting}
                                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {deleting
                                    ? <><span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span> Menghapus...</>
                                    : 'Ya, Hapus'
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    )
}
