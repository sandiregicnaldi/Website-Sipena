import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../../context/AppContext'

// ── Category Colors ────────────────────────────────────────────────────────────
const CATEGORY_BORDER = {
    terbitan: '#1c51a1',
    medsos:   '#10b981',
    keuangan: '#f59e0b',
    lainnya:  '#94a3b8',
}

const CATEGORY_BADGE = {
    terbitan: 'bg-[#eef4fc] text-[#1c51a1]',
    medsos:   'bg-emerald-50 text-emerald-700',
    keuangan: 'bg-amber-50 text-amber-700',
    lainnya:  'bg-slate-100 text-slate-600',
}

const STAGE_TEXT_COLOR = {
    terbitan: 'text-[#1c51a1]',
    medsos:   'text-emerald-600',
    keuangan: 'text-amber-600',
    lainnya:  'text-slate-600',
}

const BAR_DONE_COLOR = {
    terbitan: 'bg-[#1c51a1]',
    medsos:   'bg-emerald-500',
    keuangan: 'bg-amber-500',
    lainnya:  'bg-slate-400',
}

// ── Helpers ────────────────────────────────────────────────────────────────────
export default function Projects() {
    const { projects, isAdmin } = useApp()
    const navigate = useNavigate()
    const [filterCat,    setFilterCat]    = useState('')
    const [filterStatus, setFilterStatus] = useState('')
    const [search,       setSearch]       = useState('')

    const activeProjects = projects.filter(p => p.status !== 'archived')

    const filteredProjects = activeProjects.filter(p => {
        if (filterCat && p.category !== filterCat) return false
        if (filterStatus) {
            if (!p.stages?.some(s => s.status === filterStatus)) return false
        }
        if (search) {
            const term = search.toLowerCase()
            return (
                p.title?.toLowerCase().includes(term) ||
                p.id?.toLowerCase().includes(term) ||
                p.categoryLabel?.toLowerCase().includes(term)
            )
        }
        return true
    })

    if (filterStatus === 'review') {
        filteredProjects.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    }

    const getCurrentStage = (project) => {
        if (!project.stages) return null
        return (
            project.stages.find(s => s.status === 'active' || s.status === 'review' || s.status === 'revision') ||
            project.stages.find(s => s.status === 'draft') ||
            project.stages[0]
        )
    }

    const isOverdue = (stage) => {
        if (!stage?.deadline || stage.status === 'done' || stage.status === 'archived') return false
        const today = new Date(); today.setHours(0, 0, 0, 0)
        let dl
        if (typeof stage.deadline === 'string' && stage.deadline.includes('-') && !stage.deadline.includes('T')) {
            const [y, m, d] = stage.deadline.split('-').map(Number)
            dl = new Date(y, m - 1, d)
        } else {
            dl = new Date(stage.deadline); dl.setHours(0, 0, 0, 0)
        }
        return today > dl
    }

    const formatDate = (iso) => {
        if (!iso) return '—'
        return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    }

    const avatarInitials = (name) => {
        if (!name) return '?'
        return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    }

    // Stats for summary banner
    const reviewCount   = activeProjects.filter(p => p.stages?.some(s => s.status === 'review')).length
    const overdueCount  = activeProjects.filter(p => isOverdue(getCurrentStage(p))).length
    const draftCount    = activeProjects.filter(p => getCurrentStage(p)?.status === 'draft').length
    const archivedTotal = projects.filter(p => p.status === 'archived').length

    return (
        <div className="p-6 space-y-6">

            {/* ── Page Header ─────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Daftar Proyek</h2>
                    <p className="text-sm text-slate-500 mt-0.5">Kelola dan pantau seluruh alur penerbitan aktif Anda.</p>
                </div>
                <button
                    onClick={() => navigate('/admin/manajemen/proyek/baru')}
                    className="flex-shrink-0 flex items-center gap-2 bg-[#0b5cd5] hover:bg-[#0845a5] active:scale-95 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md shadow-[#0b5cd5]/20"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Proyek Baru
                </button>
            </div>

            {/* ── Search & Filter Bar ──────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-3.5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shadow-xs">
                {/* Search */}
                <div className="flex-1 flex items-center bg-slate-50/60 hover:bg-slate-50 focus-within:bg-white border border-slate-200 hover:border-slate-300 focus-within:border-[#0b5cd5] rounded-xl px-3.5 py-2.5 focus-within:ring-3 focus-within:ring-[#0b5cd5]/15 transition-all shadow-xs gap-3 group">
                    <svg className="text-slate-400 group-focus-within:text-[#0b5cd5] shrink-0 transition-colors pointer-events-none" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Cari proyek berdasarkan judul atau ID..."
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
                {/* Category */}
                <div className="relative">
                    <select
                        value={filterCat}
                        onChange={e => setFilterCat(e.target.value)}
                        className="appearance-none w-full sm:w-auto bg-slate-50/60 hover:bg-slate-50 focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-[#0b5cd5] px-3.5 pr-8 py-2.5 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-3 focus:ring-[#0b5cd5]/15 cursor-pointer transition-all"
                    >
                        <option value="">Semua Kategori</option>
                        <option value="terbitan">Terbitan</option>
                        <option value="medsos">Media Sosial</option>
                        <option value="keuangan">Keuangan</option>
                        <option value="lainnya">Lainnya</option>
                    </select>
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none flex items-center">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="6 9 12 15 18 9" />
                        </svg>
                    </div>
                </div>
                {/* Status */}
                <div className="relative">
                    <select
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                        className="appearance-none w-full sm:w-auto bg-slate-50/60 hover:bg-slate-50 focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-[#0b5cd5] px-3.5 pr-8 py-2.5 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-3 focus:ring-[#0b5cd5]/15 cursor-pointer transition-all"
                    >
                        <option value="">Status: Semua</option>
                        <option value="draft">Draft</option>
                        <option value="active">Sedang Berjalan</option>
                        <option value="review">Menunggu Review</option>
                        <option value="revision">Direvisi</option>
                        <option value="done">Selesai</option>
                    </select>
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none flex items-center">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="6 9 12 15 18 9" />
                        </svg>
                    </div>
                </div>
                {(search || filterCat || filterStatus) && (
                    <button
                        type="button"
                        onClick={() => { setSearch(''); setFilterCat(''); setFilterStatus('') }}
                        className="px-3 py-2.5 text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors flex items-center justify-center gap-1"
                        title="Reset filter & pencarian"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                        <span>Reset</span>
                    </button>
                )}
            </div>

            {/* ── Project Grid / Empty State ───────────────────────────────── */}
            {filteredProjects.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-slate-100"
                    style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                    <span className="material-symbols-outlined text-5xl text-slate-300">folder_open</span>
                    <h3 className="mt-3 font-bold text-slate-700">Tidak ada proyek</h3>
                    <p className="text-sm text-slate-400 mt-1">
                        {search || filterCat || filterStatus
                            ? 'Coba ubah filter pencarian Anda.'
                            : 'Belum ada proyek yang dibuat.'}
                    </p>
                    {isAdmin && !search && !filterCat && !filterStatus && (
                        <button
                            onClick={() => navigate('/admin/manajemen/proyek/baru')}
                            className="mt-4 bg-[#0b5cd5] text-white px-5 py-2.5 rounded-xl font-bold text-sm inline-flex items-center gap-2 hover:bg-[#0845a5] transition-all"
                        >
                            <span className="material-symbols-outlined text-[18px]">add</span>
                            Buat Proyek Pertama
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredProjects.map(project => {
                        const currentStage = getCurrentStage(project)
                        const pj           = currentStage?.pj
                        const overdue      = isOverdue(currentStage)
                        const totalStages  = project.stages?.length || 1
                        const doneCount    = project.stages?.filter(s => s.status === 'done' || s.status === 'archived').length || 0
                        const catKey       = project.category?.toLowerCase() || 'lainnya'
                        const borderColor  = CATEGORY_BORDER[catKey] || '#94a3b8'
                        const badgeClass   = CATEGORY_BADGE[catKey]  || 'bg-slate-100 text-slate-600'
                        const stageColor   = STAGE_TEXT_COLOR[catKey] || 'text-slate-600'
                        const barColor     = BAR_DONE_COLOR[catKey]   || 'bg-slate-400'

                        // Progress bars (max 10 visual segments)
                        const totalBars = Math.min(totalStages, 10)
                        const doneBars  = Math.round((doneCount / Math.max(totalStages, 1)) * totalBars)

                        const stageLabel = project.status === 'archived'
                            ? 'DIARSIPKAN'
                            : (doneCount === totalStages && totalStages > 0)
                                ? 'SELESAI'
                                : (currentStage?.label || '—')

                        return (
                            <a
                                key={project.id}
                                href={`/admin/manajemen/proyek/${project.id}`}
                                className="group bg-white rounded-2xl border border-slate-100 flex flex-col cursor-pointer hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 block"
                                style={{
                                    boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
                                    borderLeft: `4px solid ${borderColor}`,
                                }}
                                onClick={(e) => { e.preventDefault(); navigate(`/admin/manajemen/proyek/${project.id}`); }}
                            >
                                <div className="p-5 flex flex-col flex-1">

                                    {/* Row 1: ID + Category Badge */}
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest">
                                            {project.id}
                                        </span>
                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide ${badgeClass}`}>
                                            {project.categoryLabel || project.category}
                                        </span>
                                    </div>

                                    {/* Row 2: Title */}
                                    <h3 className="text-[0.95rem] font-bold text-slate-900 leading-snug mb-0.5 group-hover:text-[#0b5cd5] transition-colors line-clamp-2">
                                        {project.title}
                                    </h3>

                                    {/* Row 3: Type label */}
                                    <p className="text-xs text-slate-400 font-medium mb-4 truncate">
                                        {project.typeLabel || '—'}
                                    </p>

                                    {/* Row 4: Stage progress */}
                                    <div className="mb-4">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Tahapan</span>
                                            <span className={`text-[11px] font-bold uppercase truncate max-w-[55%] text-right ${stageColor}`}>
                                                {stageLabel}
                                            </span>
                                        </div>
                                        {/* Segmented progress bar */}
                                        <div className="flex gap-0.5 h-1.5 w-full mb-1">
                                            {Array.from({ length: totalBars }).map((_, i) => (
                                                <div
                                                    key={i}
                                                    className={`flex-1 rounded-full transition-all ${
                                                        i < doneBars
                                                            ? barColor
                                                            : i === doneBars
                                                                ? `${barColor} opacity-35`
                                                                : 'bg-slate-100'
                                                    }`}
                                                />
                                            ))}
                                        </div>
                                        <p className="text-[10px] text-slate-400">{doneCount}/{totalStages} tahap selesai</p>
                                    </div>

                                    {/* Row 5: PJ + Deadline (side by side) */}
                                    <div className="flex items-center justify-between gap-3 mb-4">
                                        {/* PJ */}
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${pj ? 'bg-[#dce8f8] text-[#1c51a1]' : 'bg-slate-100 text-slate-400'}`}>
                                                {pj ? avatarInitials(pj.name) : <span className="material-symbols-outlined text-[14px]">person</span>}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-bold text-slate-400 leading-none mb-0.5">Penanggung Jawab</p>
                                                <p className="text-xs font-semibold text-slate-800 truncate">
                                                    {pj ? pj.name : <span className="italic text-slate-400">Belum ditugaskan</span>}
                                                </p>
                                            </div>
                                        </div>
                                        {/* Deadline */}
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-[10px] font-bold text-slate-400 leading-none mb-0.5">Deadline</p>
                                            <p className={`text-xs font-bold ${overdue ? 'text-rose-500' : 'text-slate-700'}`}>
                                                {currentStage?.deadline ? formatDate(currentStage.deadline) : '—'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Row 6: Lihat Detail footer */}
                                    <div className="mt-auto pt-3 border-t border-slate-50">
                                        <span className="text-[#0b5cd5] font-bold text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
                                            Lihat Detail
                                            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                                        </span>
                                    </div>

                                </div>
                            </a>
                        )
                    })}

                    {/* ── Summary Banner (shown when 3+ projects) ── */}
                    {filteredProjects.length >= 3 && (
                        <div
                            className="lg:col-span-3 md:col-span-2 rounded-2xl p-7 relative overflow-hidden flex flex-col justify-center"
                            style={{ background: 'linear-gradient(135deg, #1e1b5e 0%, #312e9e 100%)' }}
                        >
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
                            <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                                <div className="text-center md:text-left md:flex-shrink-0">
                                    <h4 className="text-[#b8d0ef] text-xs font-bold uppercase tracking-[0.2em] mb-3">Ikhtisar Produksi</h4>
                                    <div className="flex items-baseline gap-2 mb-2">
                                        <span className="text-4xl font-black text-white">{activeProjects.length}</span>
                                        <span className="text-[#6a9dd4] font-medium text-sm">Proyek Berjalan</span>
                                    </div>
                                    <p className="text-[#b8d0ef]/70 text-xs max-w-xs">
                                        {overdueCount > 0
                                            ? `${overdueCount} proyek melewati deadline. Pastikan review diselesaikan segera.`
                                            : 'Semua proyek berjalan sesuai jadwal.'}
                                    </p>
                                </div>
                                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3 w-full">
                                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10">
                                        <p className="text-[#6a9dd4] text-[10px] font-bold uppercase mb-1">Menunggu Review</p>
                                        <p className="text-2xl font-bold text-white">{String(reviewCount).padStart(2, '0')}</p>
                                    </div>
                                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10">
                                        <p className="text-rose-300 text-[10px] font-bold uppercase mb-1">Terlambat</p>
                                        <p className="text-2xl font-bold text-white">{String(overdueCount).padStart(2, '0')}</p>
                                    </div>
                                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10">
                                        <p className="text-[#6a9dd4] text-[10px] font-bold uppercase mb-1">Drafting</p>
                                        <p className="text-2xl font-bold text-white">{String(draftCount).padStart(2, '0')}</p>
                                    </div>
                                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10">
                                        <p className="text-emerald-300 text-[10px] font-bold uppercase mb-1">Arsip Selesai</p>
                                        <p className="text-2xl font-bold text-white">{String(archivedTotal).padStart(2, '00')}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
