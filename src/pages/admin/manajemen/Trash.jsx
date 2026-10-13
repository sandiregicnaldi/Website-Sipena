import { useState, useEffect } from 'react'
import { api } from '../../../services/api'
import { useApp } from '../../../context/AppContext'
import { CATEGORIES } from '../../../data/categories'

export default function Trash() {
    const { isAdmin } = useApp()
    const [activeTab, setActiveTab] = useState('projects')
    const [projects, setProjects] = useState([])
    const [documents, setDocuments] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [confirmModal, setConfirmModal] = useState({ open: false, type: '', item: null })

    useEffect(() => {
        fetchTrash()
    }, [activeTab])

    const fetchTrash = async () => {
        setLoading(true)
        try {
            if (activeTab === 'projects') {
                const data = await api.projects.getTrash()
                setProjects(data || [])
            } else {
                const data = await api.documents.getTrash()
                setDocuments(data || [])
            }
        } catch (error) {
            console.error('Failed to fetch trash:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleRestoreProject = async (id) => {
        try {
            await api.projects.restore(id)
            fetchTrash()
            setConfirmModal({ open: false, type: '', item: null })
        } catch (error) {
            alert('Gagal memulihkan proyek.')
        }
    }

    const handleHardDeleteProject = async (id) => {
        try {
            await api.projects.hardDelete(id)
            fetchTrash()
            setConfirmModal({ open: false, type: '', item: null })
        } catch (error) {
            alert('Gagal menghapus proyek permanen.')
        }
    }

    const handleRestoreDocument = async (id) => {
        try {
            await api.documents.restore(id)
            fetchTrash()
            setConfirmModal({ open: false, type: '', item: null })
        } catch (error) {
            alert('Gagal memulihkan dokumen.')
        }
    }

    const handleHardDeleteDocument = async (id) => {
        try {
            await api.documents.hardDelete(id)
            fetchTrash()
            setConfirmModal({ open: false, type: '', item: null })
        } catch (error) {
            alert('Gagal menghapus dokumen permanen.')
        }
    }

    const handleConfirm = () => {
        const { type, item } = confirmModal
        if (!item) return
        if (type === 'restoreProject') handleRestoreProject(item.id)
        if (type === 'deleteProject') handleHardDeleteProject(item.id)
        if (type === 'restoreDocument') handleRestoreDocument(item.id)
        if (type === 'deleteDocument') handleHardDeleteDocument(item.id)
    }

    const filteredProjects = projects.filter(p => {
        if (!search) return true
        return (p.title || '').toLowerCase().includes(search.toLowerCase()) || (p.id || '').toLowerCase().includes(search.toLowerCase())
    })

    const filteredDocuments = documents.filter(d => {
        if (!search) return true
        return (d.name || '').toLowerCase().includes(search.toLowerCase())
    })

    const TABS = [
        { id: 'projects', label: 'Proyek', icon: 'folder' },
        { id: 'documents', label: 'Dokumen', icon: 'description' },
    ]

    return (
        <div className="p-6 lg:p-8 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Sampah</h1>
                <p className="text-sm text-slate-500 mt-1">
                    File yang berada di menu sampah akan dihapus secara permanen setelah 30 hari.
                </p>
            </div>

            {/* Search Bar */}
            <div className="w-full max-w-md flex items-center bg-white hover:bg-slate-50/50 focus-within:bg-white border border-slate-200 hover:border-slate-300 focus-within:border-[#0b5cd5] rounded-xl px-4 py-2 focus-within:ring-3 focus-within:ring-[#0b5cd5]/15 transition-all shadow-xs gap-3 group">
                <svg className="text-slate-400 group-focus-within:text-[#0b5cd5] shrink-0 transition-colors pointer-events-none" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Cari di sampah berdasarkan judul atau ID..."
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

            {/* Tabs */}
            <div className="flex border-b border-slate-200">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === tab.id
                                ? 'border-[#1c51a1] text-[#1c51a1]'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                            }`}
                    >
                        <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            {loading ? (
                <div className="text-center py-12 text-slate-500">Memuat data...</div>
            ) : activeTab === 'projects' ? (
                projects.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 bg-white rounded-xl border border-slate-200">
                        Tidak ada proyek di keranjang sampah.
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {filteredProjects.map(p => (
                            <div key={p.id} className="card p-5 group flex flex-col hover:border-slate-300 hover:shadow-md transition-all">
                                <div className="flex justify-between items-start mb-3">
                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide border
                                        ${p.category === 'terbitan' ? 'bg-[#eef4fc] text-[#1c51a1] border-[#1c51a1]/20' :
                                            p.category === 'medsos' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                p.category === 'keuangan' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                    'bg-slate-100 text-slate-700 border-slate-200'}`}
                                    >
                                        {CATEGORIES[p.category]?.label || p.category}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400">
                                        Dihapus: {new Date(p.deletedAt).toLocaleDateString('id-ID')}
                                    </span>
                                </div>
                                <h3 className="font-semibold text-slate-900 mb-1 line-clamp-2" title={p.title}>{p.title}</h3>
                                <p className="text-xs text-slate-400 font-mono mb-4">{p.id}</p>
                                
                                <div className="mt-auto pt-4 border-t border-slate-100 flex gap-2">
                                    <button
                                        onClick={() => setConfirmModal({ open: true, type: 'restoreProject', item: p })}
                                        className="flex-1 px-3 py-2 text-xs font-bold text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 hover:text-emerald-700 transition-colors flex items-center justify-center gap-1.5"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">restore</span>
                                        Pulihkan
                                    </button>
                                    {isAdmin && (
                                        <button
                                            onClick={() => setConfirmModal({ open: true, type: 'deleteProject', item: p })}
                                            className="flex-1 px-3 py-2 text-xs font-bold text-rose-600 bg-rose-50 rounded-lg hover:bg-rose-100 hover:text-rose-700 transition-colors flex items-center justify-center gap-1.5"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">delete_forever</span>
                                            Hapus Permanen
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )
            ) : (
                documents.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 bg-white rounded-xl border border-slate-200">
                        Tidak ada dokumen di keranjang sampah.
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                                <tr>
                                    <th className="px-6 py-3 font-medium">Nama Dokumen</th>
                                    <th className="px-6 py-3 font-medium">Tanggal Dihapus</th>
                                    <th className="px-6 py-3 font-medium text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredDocuments.map(doc => (
                                    <tr key={doc.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-900">{doc.name}</div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 text-xs">
                                            {new Date(doc.deletedAt).toLocaleDateString('id-ID')}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => setConfirmModal({ open: true, type: 'restoreDocument', item: doc })}
                                                    className="px-3 py-1.5 text-[11px] font-bold text-emerald-600 bg-emerald-50 rounded-md hover:bg-emerald-100 transition-colors flex items-center gap-1"
                                                >
                                                    <span className="material-symbols-outlined text-[14px]">restore</span>
                                                    Pulihkan
                                                </button>
                                                {isAdmin && (
                                                    <button
                                                        onClick={() => setConfirmModal({ open: true, type: 'deleteDocument', item: doc })}
                                                        className="px-3 py-1.5 text-[11px] font-bold text-rose-600 bg-rose-50 rounded-md hover:bg-rose-100 transition-colors flex items-center gap-1"
                                                    >
                                                        <span className="material-symbols-outlined text-[14px]">delete_forever</span>
                                                        Hapus Permanen
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            )}

            {/* Custom Modal */}
            {confirmModal.open && (
                <div
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={() => setConfirmModal({ open: false, type: '', item: null })}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                                confirmModal.type.includes('restore') ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                            }`}>
                                <span className="material-symbols-outlined text-[20px]">
                                    {confirmModal.type.includes('restore') ? 'restore' : 'delete_forever'}
                                </span>
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900">
                                    {confirmModal.type.includes('restore') ? 'Pulihkan Item' : 'Hapus Permanen'}
                                </h3>
                                <p className="text-xs text-slate-500">
                                    {confirmModal.type.includes('restore') ? 'Kembalikan item ke daftar aktif' : 'Tindakan ini tidak dapat dibatalkan'}
                                </p>
                            </div>
                        </div>
                        <p className="text-sm text-slate-700 mb-6">
                            Anda yakin ingin {confirmModal.type.includes('restore') ? 'memulihkan' : 'menghapus permanen'}{' '}
                            <strong>"{confirmModal.item.title || confirmModal.item.name}"</strong>?
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setConfirmModal({ open: false, type: '', item: null })}
                                className="px-5 py-2 rounded-lg text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleConfirm}
                                className={`px-5 py-2 rounded-lg text-sm font-bold text-white transition-colors flex items-center gap-2 ${
                                    confirmModal.type.includes('restore') ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                                }`}
                            >
                                {confirmModal.type.includes('restore') ? 'Pulihkan' : 'Hapus Permanen'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
