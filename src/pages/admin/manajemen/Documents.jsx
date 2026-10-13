import { useState, useMemo } from 'react'
import { useApp } from '../../../context/AppContext'
import Toast from '../../../components/Toast'

const PAGE_SIZE = 7 // 7 doc cards + 1 upload card = 8 grid items

// Determine icon and color from doc type/name
const getDocMeta = (doc) => {
    const name = (doc.name || '').toLowerCase()
    const type = (doc.type || '').toLowerCase()
    
    let meta = { icon: 'draft', iconColor: 'text-slate-600', bgColor: 'bg-slate-100', formatLabel: 'FILE', actionText: 'Buka' }
    
    if (name.endsWith('.pdf') || type === 'pdf') {
        meta = { icon: 'picture_as_pdf', iconColor: 'text-rose-600', bgColor: 'bg-rose-50', formatLabel: 'PDF', actionText: 'Pratinjau' }
    } else if (name.endsWith('.zip') || name.endsWith('.rar') || type === 'zip') {
        meta = { icon: 'folder_zip', iconColor: 'text-slate-600', bgColor: 'bg-slate-100', formatLabel: 'ZIP', actionText: 'Lihat Isi' }
    } else if (name.endsWith('.docx') || name.endsWith('.doc') || type === 'docx') {
        meta = { icon: 'description', iconColor: 'text-[#0b5cd5]', bgColor: 'bg-[#eef4fc]', formatLabel: 'DOCX', actionText: 'Sunting' }
    } else if (name.endsWith('.xlsx') || name.endsWith('.xls') || type === 'xlsx') {
        meta = { icon: 'table_chart', iconColor: 'text-emerald-600', bgColor: 'bg-emerald-50', formatLabel: 'XLSX', actionText: 'Buka' }
    }
    
    // Pseudo-random size based on id/name for mockup realism
    const hash = doc.id?.charCodeAt(0) || name.charCodeAt(0) || 10
    meta.size = `${(hash * 0.15).toFixed(1)} MB`
    
    return meta
}

export default function Documents() {
    const { documents, addDocument, deleteDocument, isAdmin } = useApp()
    const [showUpload, setShowUpload] = useState(false)
    const [docName, setDocName] = useState('')
    const [docUrl, setDocUrl] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)

    // Confirmation & toast
    const [deleteTarget, setDeleteTarget] = useState(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const [toast, setToast] = useState({ open: false, message: '', type: 'success' })
    const showToast = (message, type = 'success') => setToast({ open: true, message, type })
    const closeToast = () => setToast(t => ({ ...t, open: false }))

    const handleUpload = async (e) => {
        e.preventDefault()
        if (!docName.trim()) return
        setIsSubmitting(true)
        try {
            await addDocument({ name: docName, url: docUrl || '', type: 'pdf' })
            setDocName('')
            setDocUrl('')
            setShowUpload(false)
            showToast('Dokumen berhasil disimpan!', 'success')
        } catch (err) {
            showToast('Gagal menyimpan dokumen: ' + err.message, 'error')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDelete = async () => {
        if (!deleteTarget) return
        setIsDeleting(true)
        try {
            await deleteDocument(deleteTarget)
            showToast('Dokumen berhasil dihapus!', 'success')
        } catch (err) {
            showToast('Gagal menghapus: ' + err.message, 'error')
        } finally {
            setIsDeleting(false)
            setDeleteTarget(null)
        }
    }

    const formatDate = (iso) => {
        if (!iso) return '—'
        return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    }

    const filtered = useMemo(() => {
        if (!search.trim()) return documents
        const term = search.toLowerCase()
        return documents.filter(d => d.name?.toLowerCase().includes(term))
    }, [documents, search])

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

    return (
        <div className="p-6 lg:p-8 space-y-8 max-w-[1400px] mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
                <div className="max-w-2xl">
                    <h2 className="text-[28px] font-extrabold text-slate-900 tracking-tight mb-2">Repositori Dokumen</h2>
                    <p className="text-[15px] leading-relaxed text-slate-500">
                        Kelola berkas publikasi, naskah, dan sertifikat dalam satu tempat. Terorganisir, aman, dan mudah diakses.
                    </p>
                </div>
                {isAdmin && (
                    <button
                        onClick={() => setShowUpload(true)}
                        className="bg-[#0b5cd5] text-white px-5 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-[#094caf] transition-all active:scale-95 flex-shrink-0"
                    >
                        <span className="material-symbols-outlined text-[20px]">add</span>
                        Tambah Dokumen
                    </button>
                )}
            </div>

            {/* Search Bar */}
            <div className="w-full flex items-center bg-white hover:bg-slate-50/50 focus-within:bg-white border border-slate-200 hover:border-slate-300 focus-within:border-[#0b5cd5] rounded-xl px-4 py-2.5 focus-within:ring-3 focus-within:ring-[#0b5cd5]/15 transition-all shadow-xs gap-3 group">
                <svg className="text-slate-400 group-focus-within:text-[#0b5cd5] shrink-0 transition-colors pointer-events-none" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                    type="text"
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(1) }}
                    placeholder="Cari berdasarkan judul atau format berkas..."
                    className="w-full bg-transparent border-none outline-none p-0 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-0 leading-normal"
                />
                {search && (
                    <button
                        type="button"
                        onClick={() => { setSearch(''); setPage(1) }}
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

            {/* Document Grid */}
            {filtered.length === 0 && !isAdmin ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
                    <span className="material-symbols-outlined text-5xl text-slate-300">folder_open</span>
                    <h3 className="mt-3 font-bold text-slate-700">Belum ada dokumen</h3>
                    <p className="text-sm text-slate-400 mt-1">Dokumen penting akan ditampilkan di sini.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {/* Upload card (Admin only) - Always first */}
                    {isAdmin && (
                        <div
                            onClick={() => setShowUpload(true)}
                            className="border-[2px] border-dashed border-slate-300 rounded-2xl p-6 flex flex-col items-center justify-center text-center bg-slate-50/50 hover:bg-slate-100 hover:border-slate-400 transition-all cursor-pointer min-h-[220px]"
                        >
                            <div className="w-12 h-12 rounded-full bg-slate-200/60 flex items-center justify-center mb-4">
                                <span className="material-symbols-outlined text-slate-500 text-[24px]">upload_file</span>
                            </div>
                            <h4 className="text-slate-600 font-bold text-[15px] mb-1">Tambah Dokumen</h4>
                            <p className="text-xs text-slate-400">Klik atau tarik berkas untuk unggah</p>
                        </div>
                    )}

                    {/* Document Cards */}
                    {paginated.map(doc => {
                        const meta = getDocMeta(doc)
                        return (
                            <div
                                key={doc.id}
                                className="bg-white rounded-2xl p-6 flex flex-col border border-slate-200 shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-all hover:shadow-[0_8px_20px_rgba(0,0,0,0.05)] hover:-translate-y-0.5 min-h-[220px]"
                            >
                                {/* Top Row: Icon + Actions */}
                                <div className="flex justify-between items-start mb-5">
                                    <div className={`w-10 h-10 rounded-lg ${meta.bgColor} flex items-center justify-center`}>
                                        <span className={`material-symbols-outlined text-[22px] ${meta.iconColor}`}>{meta.icon}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-slate-400">
                                        {doc.url && (
                                            <a href={doc.url} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-slate-100 hover:text-slate-700 rounded-md transition-colors" title="Unduh">
                                                <span className="material-symbols-outlined text-[18px]">download</span>
                                            </a>
                                        )}
                                        {isAdmin && (
                                            <button onClick={() => setDeleteTarget(doc.id)} className="p-1.5 hover:bg-rose-50 hover:text-rose-500 rounded-md transition-colors" title="Hapus">
                                                <span className="material-symbols-outlined text-[18px]">delete</span>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Middle: Title & Meta */}
                                <div className="flex-1">
                                    <h4 className="text-slate-900 font-bold text-[15px] mb-3 line-clamp-2 leading-snug">{doc.name}</h4>
                                    <div className="flex items-center gap-2 text-[12px] font-medium text-slate-500">
                                        <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600">{meta.formatLabel}</span>
                                        <span className="text-slate-300">•</span>
                                        <span>{meta.size}</span>
                                    </div>
                                </div>

                                {/* Bottom Row: Date & Action Link */}
                                <div className="w-full pt-4 mt-5 border-t border-slate-100 flex items-center justify-between">
                                    <p className="text-[12px] font-medium text-slate-400">{formatDate(doc.createdAt)}</p>
                                    {doc.url ? (
                                        <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-[13px] font-bold text-[#0b5cd5] hover:text-[#094caf] transition-colors">
                                            {meta.actionText}
                                        </a>
                                    ) : (
                                        <span className="text-[13px] font-bold text-slate-400">Tak ada berkas</span>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Pagination */}
            {filtered.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between pt-8 mt-4 border-t border-slate-200/80 gap-4">
                    <p className="text-[13px] text-slate-500 font-medium">
                        Menampilkan <span className="text-slate-900 font-bold">{paginated.length}</span> dari <span className="text-slate-900 font-bold">{filtered.length}</span> dokumen
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="w-8 h-8 rounded border border-slate-200 bg-white flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                        </button>
                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                            <button
                                key={p}
                                onClick={() => setPage(p)}
                                className={`w-8 h-8 rounded text-[13px] font-bold flex items-center justify-center transition-colors ${page === p
                                    ? 'bg-[#0b5cd5] text-white border-transparent'
                                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                {p}
                            </button>
                        ))}
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="w-8 h-8 rounded border border-slate-200 bg-white flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Upload Modal */}
            {showUpload && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: 'rgba(11,28,48,0.4)', backdropFilter: 'blur(4px)' }}
                    onClick={() => setShowUpload(false)}
                >
                    <div
                        className="bg-white rounded-2xl w-full max-w-md shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="px-7 pt-7 pb-5 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-lg font-extrabold text-slate-900">Upload Dokumen</h3>
                            <button
                                onClick={() => setShowUpload(false)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleUpload} className="px-7 py-6 space-y-5">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-600 block">
                                    Nama Dokumen <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={docName}
                                    onChange={e => setDocName(e.target.value)}
                                    placeholder="Nama berkas lengkap..."
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[#0b5cd5]/20 focus:border-[#0b5cd5] transition-all placeholder:text-slate-400"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-600 block">
                                    Link Dokumen (GDrive / URL)
                                </label>
                                <input
                                    type="url"
                                    value={docUrl}
                                    onChange={e => setDocUrl(e.target.value)}
                                    placeholder="https://drive.google.com/..."
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[#0b5cd5]/20 focus:border-[#0b5cd5] transition-all placeholder:text-slate-400"
                                />
                                <p className="text-xs text-slate-400">Masukkan link ke file di Google Drive atau server lainnya</p>
                            </div>

                            {/* Modal Actions */}
                            <div className="flex gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowUpload(false)}
                                    className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={!docName.trim() || isSubmitting}
                                    className="flex-1 py-3 rounded-xl text-white bg-[#0b5cd5] hover:bg-[#094caf] text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                                            Menyimpan...
                                        </>
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined text-[16px]">cloud_upload</span>
                                            Upload
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirm Modal */}
            {deleteTarget && (
                <div
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
                    onClick={() => !isDeleting && setDeleteTarget(null)}
                >
                    <div
                        style={{ background: 'white', borderRadius: '1.25rem', maxWidth: '400px', width: '100%', padding: '2rem', textAlign: 'center', boxShadow: '0 32px 64px rgba(0,0,0,0.2)' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🗑️</div>
                        <h3 style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.5rem', color: '#0f172a' }}>Hapus dokumen ini?</h3>
                        <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '1.5rem' }}>Tindakan ini tidak dapat dibatalkan.</p>
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                            <button
                                onClick={() => setDeleteTarget(null)}
                                disabled={isDeleting}
                                className="px-5 py-2 rounded-lg border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="px-5 py-2 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm transition-colors"
                            >
                                {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Toast message={toast.message} type={toast.type} open={toast.open} onClose={closeToast} />
        </div>
    )
}
