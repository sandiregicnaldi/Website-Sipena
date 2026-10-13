import { useState, useEffect, useMemo } from 'react'
import { useApp } from '../../../context/AppContext'
import { api } from '../../../services/api'
import { CATEGORIES } from '../../../data/categories'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import Toast from '../../../components/Toast'

const MONTH_NAMES = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

const getBadgeStyle = (catKey, catLabel) => {
    const key = catKey?.toLowerCase() || 'lainnya'
    const labelStr = (catLabel || '').toLowerCase()

    if (key === 'terbitan') return { bg: '#eef4fc', text: '#1c51a1', border: '#1c51a1' }
    if (key === 'medsos' || labelStr.includes('sosial')) return { bg: '#ecfdf5', text: '#059669', border: '#10b981' }
    if (key === 'keuangan') return { bg: '#fffbeb', text: '#d97706', border: '#f59e0b' }
    if (labelStr.includes('deposit')) return { bg: '#eef2ff', text: '#4f46e5', border: '#6366f1' }
    if (labelStr.includes('usulan sbk')) return { bg: '#fff7ed', text: '#ea580c', border: '#f97316' }

    return { bg: '#f1f5f9', text: '#475569', border: '#94a3b8' } // lainnya
}

const PAGE_SIZE = 9

export default function Archive() {
    const { currentUser, isAdmin, updateProject, refreshData } = useApp()
    const [archivedProjects, setArchivedProjects] = useState([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [deleteTarget, setDeleteTarget] = useState(null)
    const [deleting, setDeleting] = useState(false)
    const [reactivateTarget, setReactivateTarget] = useState(null)
    const [reactivating, setReactivating] = useState(false)
    const [docModalProject, setDocModalProject] = useState(null)
    const [toast, setToast] = useState({ open: false, message: '', type: 'success' })
    const showToast = (message, type = 'success') => setToast({ open: true, message, type })
    const closeToast = () => setToast(t => ({ ...t, open: false }))

    const handleReactivate = async () => {
        if (!reactivateTarget) return
        setReactivating(true)
        try {
            await updateProject(reactivateTarget.id, { status: 'active' })
            showToast(`Proyek "${reactivateTarget.title}" berhasil diaktifkan kembali!`, 'success')
            setArchivedProjects(prev => prev.filter(p => p.id !== reactivateTarget.id))
            setReactivateTarget(null)
            if (refreshData) await refreshData()
        } catch (e) {
            console.error(e)
            showToast(e.message || 'Gagal mengaktifkan kembali proyek', 'error')
        } finally {
            setReactivating(false)
        }
    }

    // Ubah Link Dokumen state
    const [editLinkDoc, setEditLinkDoc] = useState(null) // { stageId, label, currentUrl }
    const [newLinkValue, setNewLinkValue] = useState('')
    const [savingLink, setSavingLink] = useState(false)

    // Filters
    const [filterCat, setFilterCat] = useState('')
    const [filterType, setFilterType] = useState('')
    const [filterYear, setFilterYear] = useState('')
    const [filterMonth, setFilterMonth] = useState('')
    const [searchInput, setSearchInput] = useState('')
    const [searchTerm, setSearchTerm] = useState('')

    // Fetch archived projects
    useEffect(() => {
        if (!currentUser) return
        setLoading(true)
        api.projects.getArchived()
            .then(archivedData => {
                const enriched = archivedData.map(p => {
                    const catConfig = CATEGORIES[p.category] || {}
                    const typeConfig = catConfig.types?.find(t => t.id === p.type)
                    return {
                        ...p,
                        categoryLabel: catConfig.label || p.category || '—',
                        typeLabel: typeConfig?.label || p.type || '—',
                    }
                })
                setArchivedProjects(enriched)
            })
            .catch(e => console.error('Failed to fetch archived projects:', e))
            .finally(() => setLoading(false))
    }, [currentUser])

    const handleDelete = async () => {
        if (!deleteTarget) return
        setDeleting(true)
        try {
            await api.projects.delete(deleteTarget.id)
            setArchivedProjects(prev => prev.filter(p => p.id !== deleteTarget.id))
            setDeleteTarget(null)
            showToast('Arsip berhasil dihapus permanen!', 'success')
        } catch (e) {
            console.error('Gagal menghapus proyek:', e)
            showToast('Gagal menghapus proyek.', 'error')
        } finally {
            setDeleting(false)
        }
    }

    const getProjectPJs = (project) => {
        if (!project.stages || project.stages.length === 0) return '—'
        const pjNames = [...new Set(project.stages.filter(s => s.pj?.name).map(s => s.pj.name))]
        return pjNames.length > 0 ? pjNames.join(', ') : '—'
    }

    const getDocumentLinks = (project) => {
        if (!project.stages) return []
        return project.stages
            .filter(s => s.resultLink)
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map(s => ({
                stageId: s.id,
                order: s.order,
                label: s.label,
                url: s.resultLink,
                pjName: s.pj?.name || '—',
            }))
    }

    const getCompletionDate = (project) => {
        if (!project.stages) return project.updatedAt
        const doneDates = project.stages
            .filter(s => s.status === 'done' || s.status === 'archived')
            .map(s => s.updatedAt)
            .filter(Boolean)
        if (doneDates.length === 0) return project.updatedAt
        return doneDates.sort().reverse()[0]
    }

    const avatarInitials = (name) => {
        if (!name || name === '—') return '?'
        return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    }

    const typeOptions = useMemo(() => {
        if (!filterCat) return Object.values(CATEGORIES).flatMap(c => (c.types || []).map(t => ({ id: t.id, label: t.label })))
        return CATEGORIES[filterCat]?.types || []
    }, [filterCat])

    const years = useMemo(() =>
        [...new Set(archivedProjects.map(p => new Date(p.createdAt).getFullYear()))].sort((a, b) => b - a),
        [archivedProjects]
    )

    const filtered = useMemo(() => {
        return archivedProjects.filter(p => {
            if (filterCat && p.category !== filterCat) return false
            if (filterType && p.type !== filterType) return false
            if (filterYear) {
                if (new Date(p.createdAt).getFullYear().toString() !== filterYear) return false
            }
            if (filterMonth) {
                if ((new Date(p.createdAt).getMonth() + 1).toString() !== filterMonth) return false
            }
            if (searchTerm) {
                const term = searchTerm.toLowerCase()
                return p.title?.toLowerCase().includes(term) || p.id?.toLowerCase().includes(term)
            }
            return true
        })
    }, [archivedProjects, filterCat, filterType, filterYear, filterMonth, searchTerm])

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

    const handleSearch = () => { setSearchTerm(searchInput); setPage(1) }
    const handleSearchKeyDown = (e) => { if (e.key === 'Enter') handleSearch() }
    const handleCategoryChange = (val) => { setFilterCat(val); setFilterType(''); setPage(1) }

    // Exports
    const getExportData = () => {
        const rows = []
        filtered.forEach(p => {
            const docLinks = getDocumentLinks(p)
            const pjs = getProjectPJs(p)
            if (docLinks.length === 0) {
                rows.push({
                    'Judul Proyek': p.title,
                    'Kategori': p.categoryLabel,
                    'Tipe Proyek': p.typeLabel,
                    'Penanggung Jawab': pjs,
                    'Dokumen Final': '—',
                })
            } else {
                docLinks.forEach((doc, idx) => {
                    rows.push({
                        'Judul Proyek': idx === 0 ? p.title : '',
                        'Kategori': idx === 0 ? p.categoryLabel : '',
                        'Tipe Proyek': idx === 0 ? p.typeLabel : '',
                        'Penanggung Jawab': doc.pjName,
                        'Dokumen Final': `Tahap ${doc.order} - ${doc.label}: ${doc.url}`,
                    })
                })
            }
        })
        return rows
    }

    const exportExcel = () => {
        const data = getExportData()
        const ws = XLSX.utils.json_to_sheet(data)
        ws['!cols'] = [{ wch: 40 }, { wch: 15 }, { wch: 20 }, { wch: 30 }, { wch: 80 }]
        // Enable wrapText for Dokumen Final column (E)
        const range = XLSX.utils.decode_range(ws['!ref'])
        for (let R = 1; R <= range.e.r; R++) {
            const cell = ws[XLSX.utils.encode_cell({ r: R, c: 4 })]
            if (cell) cell.s = { alignment: { wrapText: true, vertical: 'top' } }
        }
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Arsip Proyek')
        XLSX.writeFile(wb, `arsip_proyek_${new Date().toISOString().slice(0, 10)}.xlsx`)
    }

    const exportPDF = () => {
        const doc = new jsPDF({ orientation: 'landscape' })
        doc.setFontSize(16)
        doc.text('Arsip Proyek', 14, 20)
        doc.setFontSize(9)
        doc.setTextColor(100)
        doc.text(`Diekspor: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, 14, 27)
        const data = getExportData()
        autoTable(doc, {
            startY: 33,
            head: [['Judul Proyek', 'Kategori', 'Tipe Proyek', 'Penanggung Jawab', 'Dokumen Final']],
            body: data.map(d => [d['Judul Proyek'], d['Kategori'], d['Tipe Proyek'], d['Penanggung Jawab'], d['Dokumen Final']]),
            styles: { fontSize: 7.5, cellPadding: 3, overflow: 'linebreak' },
            headStyles: { fillColor: [28, 81, 161], textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [248, 249, 255] },
            columnStyles: {
                0: { cellWidth: 55 },
                1: { cellWidth: 22 },
                2: { cellWidth: 28 },
                3: { cellWidth: 35 },
                4: { cellWidth: 'auto', textColor: [28, 81, 161] }
            },
        })
        doc.save(`arsip_proyek_${new Date().toISOString().slice(0, 10)}.pdf`)
    }

    const formatDate = (iso) => {
        if (!iso) return '—'
        return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    }

    return (
        <>
            <div className="p-6 lg:p-8 space-y-6">
                
                {/* ── Page Header ─────────────────────────────────────────────── */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Arsip Proyek</h1>
                        <p className="text-sm font-medium text-slate-500 mt-1">
                            Mengelola {filtered.length} arsip proyek yang telah selesai dan didokumentasikan.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={exportExcel}
                            disabled={filtered.length === 0}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm disabled:opacity-40"
                        >
                            <span className="material-symbols-outlined text-[18px]">download</span>
                            Excel
                        </button>
                        <button
                            onClick={exportPDF}
                            disabled={filtered.length === 0}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm disabled:opacity-40"
                        >
                            <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                            PDF
                        </button>
                    </div>
                </div>

                {/* ── Filter Bar ─────────────────────────────────────────────── */}
                <section className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        {/* Search Input */}
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Cari Kata Kunci</label>
                            <div className="flex items-center bg-slate-50/60 hover:bg-slate-50 focus-within:bg-white border border-slate-200 hover:border-slate-300 focus-within:border-[#0b5cd5] rounded-xl px-3.5 py-2.5 focus-within:ring-3 focus-within:ring-[#0b5cd5]/15 transition-all shadow-xs gap-2.5 group">
                                <svg className="text-slate-400 group-focus-within:text-[#0b5cd5] shrink-0 transition-colors pointer-events-none" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="11" cy="11" r="8" />
                                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                </svg>
                                <input
                                    type="text"
                                    value={searchInput}
                                    onChange={e => {
                                        setSearchInput(e.target.value)
                                        // Auto-search if cleared
                                        if (e.target.value === '') {
                                            setSearchTerm('')
                                            setPage(1)
                                        }
                                    }}
                                    onKeyDown={handleSearchKeyDown}
                                    placeholder="ID Proyek atau Judul..."
                                    className="w-full bg-transparent border-none outline-none p-0 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-0 leading-normal"
                                />
                                {searchInput ? (
                                    <button 
                                        type="button"
                                        onClick={() => { setSearchInput(''); setSearchTerm(''); setPage(1) }}
                                        className="text-slate-400 hover:text-slate-600 rounded-lg p-0.5 hover:bg-slate-100 transition-colors shrink-0"
                                        title="Hapus pencarian"
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="18" y1="6" x2="6" y2="18" />
                                            <line x1="6" y1="6" x2="18" y2="18" />
                                        </svg>
                                    </button>
                                ) : (
                                    <button 
                                        type="button"
                                        onClick={handleSearch}
                                        className="text-slate-400 hover:text-[#0b5cd5] transition-colors p-0.5 shrink-0"
                                        title="Cari"
                                    >
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="9 18 15 12 9 6" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Category */}
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Kategori</label>
                            <div className="relative">
                                <select
                                    value={filterCat}
                                    onChange={e => handleCategoryChange(e.target.value)}
                                    className="appearance-none w-full bg-slate-50/60 hover:bg-slate-50 focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-[#0b5cd5] rounded-xl px-3.5 pr-8 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-3 focus:ring-[#0b5cd5]/15 cursor-pointer transition-all"
                                >
                                    <option value="">Semua Kategori</option>
                                    {Object.entries(CATEGORIES).map(([key, cat]) => (
                                        <option key={key} value={key}>{cat.label}</option>
                                    ))}
                                </select>
                                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none flex items-center">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="6 9 12 15 18 9" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Type */}
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Jenis</label>
                            <div className="relative">
                                <select
                                    value={filterType}
                                    onChange={e => { setFilterType(e.target.value); setPage(1) }}
                                    className="appearance-none w-full bg-slate-50/60 hover:bg-slate-50 focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-[#0b5cd5] rounded-xl px-3.5 pr-8 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-3 focus:ring-[#0b5cd5]/15 cursor-pointer transition-all"
                                >
                                    <option value="">Semua Jenis</option>
                                    {typeOptions.map(t => (
                                        <option key={t.id} value={t.id}>{t.label}</option>
                                    ))}
                                </select>
                                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none flex items-center">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="6 9 12 15 18 9" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Year */}
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Tahun</label>
                            <div className="relative">
                                <select
                                    value={filterYear}
                                    onChange={e => { setFilterYear(e.target.value); setPage(1) }}
                                    className="appearance-none w-full bg-slate-50/60 hover:bg-slate-50 focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-[#0b5cd5] rounded-xl px-3.5 pr-8 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-3 focus:ring-[#0b5cd5]/15 cursor-pointer transition-all"
                                >
                                    <option value="">Semua Tahun</option>
                                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none flex items-center">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="6 9 12 15 18 9" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Month */}
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Bulan</label>
                            <div className="relative">
                                <select
                                    value={filterMonth}
                                    onChange={e => { setFilterMonth(e.target.value); setPage(1) }}
                                    className="appearance-none w-full bg-slate-50/60 hover:bg-slate-50 focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-[#0b5cd5] rounded-xl px-3.5 pr-8 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-3 focus:ring-[#0b5cd5]/15 cursor-pointer transition-all"
                                >
                                    <option value="">Semua Bulan</option>
                                    {MONTH_NAMES.map((name, idx) => (
                                        <option key={idx + 1} value={idx + 1}>{name}</option>
                                    ))}
                                </select>
                                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none flex items-center">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="6 9 12 15 18 9" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── Results Grid ─────────────────────────────────────────────── */}
                {loading ? (
                    <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100">
                        <span className="material-symbols-outlined text-4xl text-[#1c51a1] animate-spin">progress_activity</span>
                        <p className="mt-3 text-sm font-medium text-slate-500">Memuat arsip...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100">
                        <span className="material-symbols-outlined text-5xl text-slate-300">inventory_2</span>
                        <h3 className="mt-3 font-bold text-slate-700">Belum ada arsip</h3>
                        <p className="text-sm text-slate-400 mt-1">Proyek yang sudah diarsipkan akan muncul di sini.</p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {paginated.map(project => {
                                const styleInfo = getBadgeStyle(project.category, project.categoryLabel)
                                const completionDate = getCompletionDate(project)
                                const doneCount = project.stages?.filter(s => s.status === 'done' || s.status === 'archived').length || 0
                                const totalStages = project.stages?.length || 0
                                const firstPjName = getProjectPJs(project).split(',')[0]

                                return (
                                    <div
                                        key={project.id}
                                        className="group relative bg-white rounded-2xl flex flex-col hover:-translate-y-0.5 hover:shadow-md transition-all duration-300"
                                        style={{ 
                                            boxShadow: '0 2px 10px rgba(0,0,0,0.03)', 
                                            border: '1px solid #f1f5f9',
                                            borderTop: `4px solid ${styleInfo.border}` 
                                        }}
                                    >
                                        {/* Admin delete button — visible on card hover */}
                                        {isAdmin && (
                                            <button
                                                onClick={() => setDeleteTarget({ id: project.id, title: project.title })}
                                                title="Hapus Arsip"
                                                className="absolute top-4 right-4 z-10 p-1.5 rounded-lg bg-rose-50 text-rose-400 opacity-0 group-hover:opacity-100 hover:bg-rose-100 hover:text-rose-600 transition-all"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">delete</span>
                                            </button>
                                        )}

                                        <div className="p-5 flex flex-col flex-1">
                                            {/* Row 1: Badge + ID */}
                                            <div className="flex justify-between items-center mb-4">
                                                <span 
                                                    className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase rounded-full tracking-wider"
                                                    style={{ backgroundColor: styleInfo.bg, color: styleInfo.text }}
                                                >
                                                    {project.categoryLabel}
                                                </span>
                                                <span className="font-mono text-[10px] font-bold text-slate-400">{project.id}</span>
                                            </div>

                                            {/* Row 2: Title */}
                                            <h3 className="text-[1rem] font-bold text-slate-900 mb-1 leading-snug group-hover:text-[#1c51a1] transition-colors line-clamp-3">
                                                {project.title}
                                            </h3>
                                            
                                            {/* Row 3: Description / Type */}
                                            <p className="text-[13px] font-medium text-slate-500 mb-5 line-clamp-2 leading-relaxed">
                                                {project.typeLabel !== '—' ? project.typeLabel : 'Proyek tanpa deskripsi khusus.'}
                                            </p>

                                            {/* Spacer to push footer down */}
                                            <div className="flex-1"></div>

                                            {/* Row 4: Completion info */}
                                            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-5">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                                                    <span>Selesai: {formatDate(completionDate)}</span>
                                                </div>
                                                <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                                    <span>{doneCount}/{totalStages} Tahap</span>
                                                </div>
                                            </div>

                                            {/* Row 5: Footer Actions */}
                                            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                                {/* Avatar & Name */}
                                                <div className="flex items-center gap-2 max-w-[50%]">
                                                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-bold text-slate-600 flex-shrink-0">
                                                        {avatarInitials(firstPjName)}
                                                    </div>
                                                </div>

                                                {/* Action Buttons: Aktifkan Kembali & Link Dokumen */}
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => setReactivateTarget({ id: project.id, title: project.title })}
                                                        className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-all"
                                                        title="Aktifkan Kembali Proyek ke Beranda/Proyek Aktif"
                                                    >
                                                        <span className="material-symbols-outlined text-[14px]">unarchive</span>
                                                        Aktifkan
                                                    </button>

                                                    {(() => {
                                                        const docLinks = getDocumentLinks(project)
                                                        if (docLinks.length === 0) {
                                                            return <span className="text-[11px] font-semibold text-slate-400 italic">Tanpa dokumen</span>
                                                        }
                                                        return (
                                                            <button
                                                                onClick={() => setDocModalProject(project)}
                                                                className="flex items-center gap-1 text-[#0b5cd5] text-xs font-bold hover:underline transition-all"
                                                            >
                                                                Dokumen
                                                                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                                                            </button>
                                                        )
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {/* ── Pagination ─────────────────────────────────────────────── */}
                        <footer className="flex items-center justify-between pt-2 text-sm text-slate-500 font-medium">
                            <p>Menampilkan {(page - 1) * PAGE_SIZE + 1} – {Math.min(page * PAGE_SIZE, filtered.length)} dari {filtered.length} proyek</p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg hover:border-[#1c51a1] hover:text-[#1c51a1] transition-all disabled:opacity-40"
                                >
                                    <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                                </button>
                                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                    const p = i + 1
                                    return (
                                        <button
                                            key={p}
                                            onClick={() => setPage(p)}
                                            className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${
                                                page === p
                                                ? 'bg-[#0b5cd5] text-white shadow-md shadow-[#0b5cd5]/20'
                                                : 'bg-white border border-slate-200 hover:border-[#0b5cd5] hover:text-[#0b5cd5] text-slate-600'
                                                }`}
                                        >
                                            {p}
                                        </button>
                                    )
                                })}
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg hover:border-[#1c51a1] hover:text-[#1c51a1] transition-all disabled:opacity-40"
                                >
                                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                                </button>
                            </div>
                        </footer>
                    </>
                )}
            </div>

            {/* Modal: Daftar Dokumen Final */}
            {docModalProject && (() => {
                const docLinks = getDocumentLinks(docModalProject)
                return (
                    <div
                        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setDocModalProject(null)}
                    >
                        <div
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="flex items-start justify-between p-6 border-b border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-[#eef4fc] flex items-center justify-center flex-shrink-0">
                                        <span className="material-symbols-outlined text-[#1c51a1] text-[20px]">folder_open</span>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 text-base">Dokumen Final Proyek</h3>
                                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{docModalProject.title}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setDocModalProject(null)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[18px]">close</span>
                                </button>
                            </div>

                            {/* Stage Document List */}
                            <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
                                {docLinks.map((doc, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center gap-4 p-4 rounded-xl bg-slate-100/80 hover:bg-slate-200/60 transition-colors"
                                    >
                                        {/* Left: Circle Number */}
                                        <div className="w-8 h-8 rounded-full bg-[#dce8f8] flex items-center justify-center flex-shrink-0">
                                            <span className="text-xs font-black text-[#1c51a1]">{doc.order}</span>
                                        </div>
                                        
                                        {/* Middle: Title & PJ */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-slate-800 mb-0.5 truncate">{doc.label}</p>
                                            <p className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5 truncate">
                                                <span className="material-symbols-outlined text-[13px]">person</span>
                                                PJ: {doc.pjName}
                                            </p>
                                        </div>
                                        
                                        {/* Right: Actions */}
                                        <div className="flex items-center gap-4 flex-shrink-0">
                                            <a
                                                href={doc.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0b5cd5] hover:text-[#1c51a1] hover:underline"
                                            >
                                                <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                                                Buka Dokumen
                                            </a>
                                            {isAdmin && (
                                                <button
                                                    onClick={() => {
                                                        setEditLinkDoc({ stageId: doc.stageId, label: doc.label, currentUrl: doc.url })
                                                        setNewLinkValue(doc.url)
                                                    }}
                                                    className="inline-flex items-center gap-1 text-xs font-bold text-[#b45309] hover:text-[#92400e] hover:underline"
                                                >
                                                    <span className="material-symbols-outlined text-[15px]">edit</span>
                                                    Ubah Link
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {/* GDrive link if exists */}
                                {docModalProject.gdriveLink && (
                                    <div className="pt-3 border-t border-slate-100">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Folder GDrive Proyek</p>
                                        <a
                                            href={docModalProject.gdriveLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-[#1c51a1] hover:underline"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">drive_folder_upload</span>
                                            Buka Folder GDrive ↗
                                        </a>
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-end">
                                <button
                                    onClick={() => setDocModalProject(null)}
                                    className="px-5 py-2 rounded-lg text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:border-slate-300 transition-colors"
                                >
                                    Tutup
                                </button>
                            </div>
                        </div>
                    </div>
                )
            })()}

            {/* Modal: Ubah Link Dokumen — Admin Only */}
            {editLinkDoc && (
                <div
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
                    onClick={() => !savingLink && setEditLinkDoc(null)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-5 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-amber-600 text-[18px]">edit</span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 text-sm">Ubah Link Dokumen</h3>
                                    <p className="text-xs text-slate-400 mt-0.5">{editLinkDoc.label}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setEditLinkDoc(null)}
                                disabled={savingLink}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
                            >
                                <span className="material-symbols-outlined text-[18px]">close</span>
                            </button>
                        </div>
                        <div className="p-5">
                            <p className="text-xs text-slate-500 mb-3">
                                Link saat ini:
                                <a href={editLinkDoc.currentUrl} target="_blank" rel="noopener noreferrer" className="ml-1 text-[#1c51a1] hover:underline break-all">
                                    {editLinkDoc.currentUrl}
                                </a>
                            </p>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Link Baru <span className="text-rose-500">*</span></label>
                            <input
                                type="url"
                                value={newLinkValue}
                                onChange={e => setNewLinkValue(e.target.value)}
                                placeholder="https://drive.google.com/..."
                                disabled={savingLink}
                                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#1c51a1] transition-colors disabled:opacity-50"
                            />
                            {newLinkValue && (() => {
                                try { new URL(newLinkValue); return null }
                                catch { return <p className="text-xs text-rose-500 mt-1">URL tidak valid</p> }
                            })()}
                        </div>
                        <div className="flex gap-3 justify-end px-5 pb-5">
                            <button
                                onClick={() => setEditLinkDoc(null)}
                                disabled={savingLink}
                                className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
                            >
                                Batal
                            </button>
                            <button
                                disabled={savingLink || !newLinkValue || newLinkValue === editLinkDoc.currentUrl || (() => { try { new URL(newLinkValue); return false } catch { return true } })()}
                                onClick={async () => {
                                    setSavingLink(true)
                                    try {
                                        await api.stages.updateResultLink(editLinkDoc.stageId, newLinkValue)
                                        // Update local state in docModalProject
                                        setDocModalProject(prev => ({
                                            ...prev,
                                            stages: prev.stages.map(s =>
                                                s.id === editLinkDoc.stageId ? { ...s, resultLink: newLinkValue } : s
                                            )
                                        }))
                                        setArchivedProjects(prev => prev.map(p =>
                                            p.id === docModalProject.id
                                                ? { ...p, stages: p.stages.map(s => s.id === editLinkDoc.stageId ? { ...s, resultLink: newLinkValue } : s) }
                                                : p
                                        ))
                                        setEditLinkDoc(null)
                                        showToast('Link dokumen berhasil diperbarui!', 'success')
                                    } catch (e) {
                                        showToast(e.message || 'Gagal memperbarui link', 'error')
                                    } finally {
                                        setSavingLink(false)
                                    }
                                }}
                                className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-[#1c51a1] hover:bg-[#163d7a] transition-colors disabled:opacity-40 flex items-center gap-2"
                            >
                                {savingLink && <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>}
                                Simpan Link
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Delete Modal — Admin Only */}
            {deleteTarget && (
                <div
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={() => !deleting && setDeleteTarget(null)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                                <span className="material-symbols-outlined text-rose-600 text-[20px]">delete_forever</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900">Pindahkan ke Sampah</h3>
                                <p className="text-xs text-slate-500">Dapat dipulihkan dalam 30 hari</p>
                            </div>
                        </div>
                        <p className="text-sm text-slate-700 mb-6">
                            Anda yakin ingin memindahkan arsip proyek <strong>"{deleteTarget.title}"</strong> ke tempat sampah?
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setDeleteTarget(null)}
                                disabled={deleting}
                                className="px-5 py-2 rounded-lg text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="px-5 py-2 rounded-lg text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {deleting && <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>}
                                Pindahkan ke Sampah
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Reactivate Modal */}
            {reactivateTarget && (
                <div
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={() => !reactivating && setReactivateTarget(null)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                <span className="material-symbols-outlined text-emerald-600 text-[20px]">unarchive</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900">Aktifkan Kembali Proyek</h3>
                                <p className="text-xs text-slate-500">Kembalikan proyek ke daftar proyek aktif</p>
                            </div>
                        </div>
                        <p className="text-sm text-slate-700 mb-6">
                            Apakah Anda yakin ingin mengaktifkan kembali proyek <strong>"{reactivateTarget.title}"</strong>? Proyek akan dipindahkan kembali ke halaman Beranda dan Proyek Aktif.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setReactivateTarget(null)}
                                disabled={reactivating}
                                className="px-5 py-2 rounded-lg text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleReactivate}
                                disabled={reactivating}
                                className="px-5 py-2 rounded-lg text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {reactivating && <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>}
                                Aktifkan Kembali
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Toast message={toast.message} type={toast.type} open={toast.open} onClose={closeToast} />
        </>
    )
}
