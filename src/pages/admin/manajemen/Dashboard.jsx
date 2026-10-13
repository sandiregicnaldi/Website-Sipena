import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../../context/AppContext'
import { STATUS_LABELS } from '../../../data/categories'
import { api } from '../../../services/api'
import PjBusynessWidget from '../../../components/PjBusynessWidget'
import PopupModal from '../../../components/PopupModal'

const NOTIF_COLOR = {
    approved: 'bg-[#1c51a1] ring-[#eef4fc]',
    review: 'bg-amber-600 ring-amber-50',
    revision: 'bg-rose-600 ring-rose-50',
    project_created: 'bg-emerald-600 ring-emerald-50',
}

const CATEGORY_BADGE = {
    terbitan: 'bg-[#eef4fc] text-[#1c51a1]',
    medsos: 'bg-emerald-50 text-emerald-600',
    keuangan: 'bg-amber-50 text-amber-600',
    lainnya: 'bg-slate-100 text-slate-600',
}

const STATUS_PILL = {
    draft: 'bg-slate-100 text-slate-600',
    active: 'bg-emerald-50 text-emerald-700',
    review: 'bg-[#eef4fc] text-[#163d7a]',
    revision: 'bg-amber-50 text-amber-700',
    done: 'bg-emerald-50 text-emerald-700',
    archived: 'bg-slate-100 text-slate-600',
}

const STATUS_DOT = {
    draft: 'bg-slate-400',
    active: 'bg-emerald-500',
    review: 'bg-[#1c51a1]',
    revision: 'bg-amber-500',
    done: 'bg-emerald-500',
    archived: 'bg-slate-400',
}

export default function Dashboard() {
    const { projects, archivedProjects, isAdmin, notifications, currentUser, categoriesMap } = useApp()
    const navigate = useNavigate()
    const [expandedStat, setExpandedStat] = useState(null)
    const [expandedBursa, setExpandedBursa] = useState({})
    const [claimingTask, setClaimingTask] = useState(null)
    const [claimDeadline, setClaimDeadline] = useState('')
    const [popupMessage, setPopupMessage] = useState(null)
    const [globalRankings, setGlobalRankings] = useState([])
    const [rankingsLoading, setRankingsLoading] = useState(true)
    const [selectedRankDetail, setSelectedRankDetail] = useState(null)

    const now = new Date()
    // null = Semua Bulan; angka 0-11 = bulan spesifik (0-indexed)
    const [rankingMonth, setRankingMonth] = useState(now.getMonth())
    const [rankingYear,  setRankingYear]  = useState(now.getFullYear())

    // Re-fetch ranking global setiap kali periode berubah
    useEffect(() => {
        setRankingsLoading(true)
        api.rankings.getProductivity(rankingMonth, rankingYear)
            .then(data => setGlobalRankings(data?.rankings || []))
            .catch(() => setGlobalRankings([]))
            .finally(() => setRankingsLoading(false))
    }, [rankingMonth, rankingYear])

    // getCurrentStage: prioritise active/review/revision → draft → last stage
    const getCurrentStage = (project) => {
        if (!project.stages || project.stages.length === 0) return null
        return project.stages.find(s =>
            s.status === 'active' || s.status === 'review' || s.status === 'revision'
        ) || project.stages.find(s => s.status === 'draft')
            || project.stages[project.stages.length - 1]
    }

    const isOverdueHelper = (stage) => {
        if (!stage?.deadline || stage.status === 'done' || stage.status === 'archived') return false
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        let dl
        if (typeof stage.deadline === 'string' && stage.deadline.includes('-') && !stage.deadline.includes('T')) {
            const [year, month, day] = stage.deadline.split('-').map(Number)
            dl = new Date(year, month - 1, day)
        } else {
            dl = new Date(stage.deadline)
            dl.setHours(0, 0, 0, 0)
        }
        return today > dl
    }

    const formatDate = (iso) => {
        if (!iso) return '—'
        return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: '2-digit' })
    }

    const formatTime = (iso) => {
        if (!iso) return ''
        const d = new Date(iso)
        const now = new Date()
        const diff = Math.floor((now - d) / 60000)
        if (diff < 1) return 'Baru saja'
        if (diff < 60) return `${diff} menit lalu`
        if (diff < 1440) return `${Math.floor(diff / 60)} jam lalu`
        if (diff < 2880) return 'Kemarin'
        return `${Math.floor(diff / 1440)} hari lalu`
    }

    // KPI groups
    const visibleProjects = projects.filter(p => p.status !== 'archived')

    const activeProjects = visibleProjects.filter(p => {
        const s = getCurrentStage(p)
        return s && s.status !== 'done' && s.status !== 'archived'
    })
    // Flat list: tahapan berstatus review yang menunggu review/konfirmasi
    // Jika user ber-role Admin (isAdmin), tampilkan SEMUA tahapan berstatus 'review'
    // Jika user biasa, tampilkan tahapan berstatus 'review' di mana user adalah PJ / Co-PJ
    const reviewPending = visibleProjects.flatMap(p =>
        (p.stages || []).filter(s => {
            const isUserInvolved = s.pjId === currentUser?.id || 
                s.coPjId === currentUser?.id || 
                (s.coPjIds && Array.isArray(s.coPjIds) && s.coPjIds.includes(currentUser?.id));
            return s.status === 'review' && (isAdmin || isUserInvolved);
        }).map(s => ({ ...p, _reviewStage: s }))
    ).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    // Flat list: tahapan berstatus revision yang PJ/Kolaborator-nya adalah user saat ini
    const revisionForUser = visibleProjects.flatMap(p => {
        const stgs = p.stages || []
        const myUserId = currentUser?.id

        const isUserStage = (s) => s.pjId === myUserId || 
            s.coPjId === myUserId || 
            (s.coPjIds && Array.isArray(s.coPjIds) && s.coPjIds.includes(myUserId));

        // Kasus 1: Admin mengembalikan dari review → revision (status = 'revision')
        const fromReview = stgs
            .filter(s => s.status === 'revision' && isUserStage(s))
            .map(s => ({ ...p, _revisionStage: s, _revisionSource: 'review' }))

        // Kasus 2: Stage sudah done, lalu admin/PJ klik "Ajukan Revisi"
        // → status kembali ke 'active' tapi ada note [REVISI]
        const fromDone = stgs
            .filter(s =>
                s.status === 'active' &&
                isUserStage(s) &&
                (s.notes || []).some(n => n.text?.startsWith('[REVISI]'))
            )
            .map(s => ({ ...p, _revisionStage: s, _revisionSource: 'done' }))

        return [...fromReview, ...fromDone]
    })
    const overdueProjects = visibleProjects.filter(p => {
        const s = getCurrentStage(p)
        return isOverdueHelper(s)
    })
    // Notifikasi Usulan untuk PJ Penyuntingan (Terbitan)
    const pendingProposals = visibleProjects.flatMap(p => {
        if (p.category !== 'terbitan') return []
        const stgs = p.stages || []
        const suntingStage = stgs.find(s => s.label === 'Penyuntingan')
        const tataLetakStage = stgs.find(s => s.label === 'Tata Letak Naskah')
        
        // Cek jika user saat ini adalah PJ Penyuntingan dan Tata Letak memiliki proposal pending
        if (suntingStage?.pjId === currentUser?.id && tataLetakStage?.proposalStatus === 'pending') {
            return [{ ...p, _proposalStage: tataLetakStage }]
        }
        return []
    })

    // Skill mapping mirroring backend's getRequiredSkills
    const STAGE_SKILL_MAP = {
        "Kelengkapan Naskah": ["administrasi"],
        "Pembuatan Surat Penerimaan Terbitan": ["administrasi"],
        "Pembuatan Surat Keterangan Terbit": ["administrasi"],
        "Serah Terima Karya Cetak dan Rekam": ["administrasi"],
        "Penerbitan ISBN": ["isbn"],
        "Penerbitan Nomor Induk Penerbitan (NIP)": ["isbn"],
        "Penginputan Nomor Induk Penerbitan": ["isbn"],
        "Penyuntingan": ["editor"],
        "Terjemahkan": ["penerjemah"],
        "Penyuntingan Naskah Terjemahan": ["penerjemah"],
        "Unggah ke Sipena dan Ipusnas": ["distribusi"],
        "Penyusunan Teks": ["konten"],
        "Perancangan Desain": ["konten"],
        "Tinjauan Konten": ["konten"],
        "Pengunggahan": ["konten"],
        "Dokumen rincian anggaran belanja APBN": ["keuangan"],
        "Kerangka Acuan Kerja (KAK) Penerbitan": ["keuangan"],
        "Implementasi Kegiatan Penerbitan": ["keuangan"],
        "Pertanggungjawaban dan Administrasi Keuangan": ["keuangan"],
        "Verifikasi dan Validasi Hasil Kegiatan": ["keuangan"],
        "Laporan Kinerja dan Evaluasi Kegiatan": ["keuangan"],
        "Tata Letak Naskah": ["layout"],
        "Desain Sampul": ["desain"],
        "Pembuatan Dummy": ["layout", "desain"],
        "Pembuatan Dummy Final": ["layout", "desain"],
        "Kendali Kualitas": ["qc"],
    };

    // Bursa Tugas: Tahapan dari proyek aktif yang belum memiliki PJ
    const userSkills = (currentUser?.skills || []).map(s => s.toLowerCase())
    const isAdminUser = currentUser?.role === 'admin'
    
    const openTasks = visibleProjects.flatMap(p => {
        return (p.stages || []).filter(s => !s.pjId && s.status !== 'done' && s.status !== 'archived').map(s => {
            const reqSkills = STAGE_SKILL_MAP[s.label] || [];
            
            let isSkillMatched = false;
            if (reqSkills.length === 0) {
                isSkillMatched = true; // No specific skill required
            } else {
                isSkillMatched = reqSkills.some(skill => userSkills.includes(skill.toLowerCase()));
            }

            // Admin can bypass skill validation
            if (isAdminUser) {
                isSkillMatched = true;
            }

            return { project: p, stage: s, isSkillMatched }
        })
    })

    const bursaProjects = []
    openTasks.forEach(task => {
        let bp = bursaProjects.find(p => p.project.id === task.project.id)
        if (!bp) {
            bp = { project: task.project, tasks: [] }
            bursaProjects.push(bp)
        }
        bp.tasks.push(task)
    })

    const toggleBursa = (projectId) => {
        setExpandedBursa(prev => ({ ...prev, [projectId]: !prev[projectId] }))
    }

    const handleClaimTask = async (stageId) => {
        if (!claimDeadline) {
            setPopupMessage({ type: 'error', text: 'Silakan tentukan target selesai Anda terlebih dahulu' })
            return
        }
        try {
            await api.stages.claim(stageId, claimDeadline)
            setClaimingTask(null)
            setClaimDeadline('')
            setPopupMessage({ type: 'success', text: 'Berhasil mengambil tugas! Selamat bekerja.' })
        } catch (error) {
            setPopupMessage({ type: 'error', text: error.error || error.message || 'Gagal mengambil tugas' })
        }
    }

    const closePopup = () => {
        if (popupMessage?.type === 'success') {
            window.location.reload()
        } else {
            setPopupMessage(null)
        }
    }

    const statConfigs = [
        {
            key: 'active', label: 'Proyek Aktif', list: activeProjects,
            icon: 'folder_open', iconBg: 'bg-[#eef4fc]', iconText: 'text-[#1c51a1]',
            tag: 'AKTIF', tagText: 'text-[#5585c4]', ring: 'hover:ring-[#b8d0ef]',
        },
        {
            key: 'review', label: 'Menunggu Review', list: reviewPending,
            icon: 'schedule', iconBg: 'bg-amber-50', iconText: 'text-amber-600',
            tag: 'PENDING', tagText: 'text-amber-400', ring: 'hover:ring-amber-200',
        },
        {
            key: 'revision', label: 'Perlu Direvisi', list: revisionForUser,
            icon: 'rate_review', iconBg: 'bg-rose-50', iconText: 'text-rose-600',
            tag: 'REVISI', tagText: 'text-rose-400', ring: 'hover:ring-rose-200',
        },
        {
            key: 'overdue', label: 'Terlambat', list: overdueProjects,
            icon: 'warning', iconBg: 'bg-[#fffaeb]', iconText: 'text-amber-600',
            tag: 'DELAYED', tagText: 'text-amber-400', ring: 'hover:ring-amber-200',
        },
        {
            key: 'proposal', label: 'Usulan Tata Letak', list: pendingProposals,
            icon: 'notifications_active', iconBg: 'bg-[#f4ebff]', iconText: 'text-[#7e22ce]',
            tag: 'USULAN', tagText: 'text-[#a855f7]', ring: 'hover:ring-[#d8b4fe]',
        },
    ]

    const recentProjects = [...visibleProjects]
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        .slice(0, 8)

    const recentNotifs = notifications.slice(0, 5)
    
    const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ]
    const currentMonthName = rankingMonth === -1 ? 'Semua Bulan' : (monthNames[rankingMonth] || '')

    // Daftar tahun yang tersedia (5 tahun ke belakang)
    const availableYears = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i)

    const expandedConfig = statConfigs.find(s => s.key === expandedStat)

    const avatarInitials = (name) => {
        if (!name) return '??'
        return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    }

    return (
        <>
        <div className="p-6 space-y-6 bg-[#f8fafc] min-h-screen">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {statConfigs.map(stat => (
                    <div
                        key={stat.key}
                        className={`bg-white p-5 rounded-xl flex flex-col gap-4 cursor-pointer transition-all ${expandedStat === stat.key ? 'ring-1 ring-[#5585c4]' : 'hover:shadow-lg hover:-translate-y-0.5'}`}
                        style={{ 
                            boxShadow: '0 1px 4px rgba(0,0,0,0.07), 0 4px 16px rgba(0,0,0,0.04)',
                            borderLeft: `4px solid ${
                                stat.key === 'active' ? '#3b82f6' :
                                stat.key === 'review' ? '#f59e0b' :
                                stat.key === 'revision' ? '#ef4444' :
                                stat.key === 'overdue' ? '#f97316' :
                                stat.key === 'proposal' ? '#8b5cf6' : '#e2e8f0'
                            }`
                        }}
                        onClick={() => setExpandedStat(prev => prev === stat.key ? null : stat.key)}
                    >
                        <div className="flex justify-between items-start">
                            <div className={`p-2.5 rounded-lg ${stat.iconBg} ${stat.iconText}`}>
                                <span className="material-symbols-outlined text-[20px]">{stat.icon}</span>
                            </div>
                            <span className={`text-[10px] font-bold font-mono uppercase tracking-wider ${stat.tagText}`}>{stat.tag}</span>
                        </div>
                        <div>
                            <p className="text-4xl font-black text-slate-900">{String(stat.list.length).padStart(2, '0')}</p>
                            <p className="text-xs font-medium text-slate-500 mt-1">{stat.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Expanded KPI List */}
            {expandedConfig && (
                <div className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                    <div className="px-5 py-4 flex justify-between items-center border-b border-slate-50">
                        <h3 className="font-bold text-slate-900 tracking-tight">
                            {expandedConfig.label} <span className="text-slate-400 font-normal">({expandedConfig.list.length})</span>
                        </h3>
                        <button
                            className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                            onClick={() => setExpandedStat(null)}
                        >
                            Tutup ✕
                        </button>
                    </div>
                    {expandedConfig.list.length === 0 ? (
                        <div className="px-5 py-8 text-center text-sm text-slate-400">
                            {expandedStat === 'revision'
                                ? 'Tidak ada tahapan yang perlu direvisi saat ini. 🎉'
                                : 'Tidak ada proyek untuk kategori ini.'}
                        </div>
                    ) : expandedStat === 'revision' ? (
                        /* ── Tampilan khusus revisi untuk PJ ── */
                        <div className="divide-y divide-slate-50">
                            {expandedConfig.list.map((item, rowIdx) => {
                                const stage = item._revisionStage
                                const isOverdue = isOverdueHelper(stage)
                                // Cari alasan revisi terakhir dari notes
                                const revisionNote = (stage?.notes || [])
                                    .filter(n => n.text?.startsWith('[REVISI]'))
                                    .slice(-1)[0]
                                const reason = revisionNote
                                    ? revisionNote.text.replace('[REVISI]', '').trim()
                                    : (stage?.revisionReason || '—')
                                const revisionTime = revisionNote?.time
                                    ? new Date(revisionNote.time).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                                    : '—'
                                return (
                                    <div
                                        key={`${item.id}-${rowIdx}`}
                                        onClick={() => navigate(`/admin/manajemen/proyek/${item.id}`)}
                                        className="px-5 py-4 hover:bg-slate-50/60 cursor-pointer transition-colors group"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <a href={`/admin/manajemen/proyek/${item.id}`} onClick={e => { e.preventDefault(); e.stopPropagation(); navigate(`/admin/manajemen/proyek/${item.id}`); }} className="font-bold text-slate-900 text-sm hover:text-[#1c51a1] group-hover:text-[#1c51a1] transition-colors truncate">{item.title}</a>
                                                    <span className="text-[10px] font-mono text-slate-400 flex-shrink-0">{item.id}</span>
                                                </div>
                                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-600 uppercase">
                                                        <span className="material-symbols-outlined text-[11px]">rate_review</span>
                                                        {stage?.label || '—'}
                                                    </span>
                                                    {/* Badge sumber revisi */}
                                                    {item._revisionSource === 'done' ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                            <span className="material-symbols-outlined text-[10px]">undo</span>
                                                            Revisi Ulang
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                                            <span className="material-symbols-outlined text-[10px]">assignment_return</span>
                                                            Dikembalikan Admin
                                                        </span>
                                                    )}
                                                    {isOverdue && (
                                                        <span className="text-[10px] font-bold text-rose-500 font-mono">⚠ Deadline {formatDate(stage?.deadline)}</span>
                                                    )}
                                                    {!isOverdue && stage?.deadline && (
                                                        <span className="text-[10px] text-slate-400 font-mono">Deadline {formatDate(stage?.deadline)}</span>
                                                    )}
                                                </div>
                                            </div>
                                            <span className="material-symbols-outlined text-slate-300 group-hover:text-[#1c51a1] transition-colors text-[18px] flex-shrink-0 mt-1">chevron_right</span>
                                        </div>
                                        {reason && reason !== '—' && (
                                            <div className="mt-2.5 flex items-start gap-2">
                                                <span className="material-symbols-outlined text-amber-500 text-[15px] flex-shrink-0 mt-0.5">feedback</span>
                                                <div>
                                                    <p className="text-xs text-slate-700 leading-relaxed">{reason}</p>
                                                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">{revisionTime}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        /* ── Tampilan tabel standar (admin: review, overdue, dll) ── */
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-separate border-spacing-0">
                                <thead>
                                    <tr className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                        <th className="px-5 py-3">Judul Proyek</th>
                                        <th className="px-4 py-3">Tahap</th>
                                        <th className="px-4 py-3">PJ</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3">Deadline</th>
                                        <th className="px-4 py-3">Dibuat</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {expandedConfig.list.map((item, rowIdx) => {
                                        const stage = item._reviewStage || item._proposalStage || getCurrentStage(item)
                                        const project = item
                                        const pj = stage?.pj
                                        const isOverdue = isOverdueHelper(stage)
                                        const isProposal = expandedStat === 'proposal'
                                        const statusKey = stage?.status || 'draft'
                                        const totalStages = project.stages?.length || 0
                                        const doneCount = project.stages?.filter(s => s.status === 'done' || s.status === 'archived').length || 0
                                        return (
                                            <tr
                                                key={`${project.id}-${rowIdx}`}
                                                onClick={() => navigate(`/admin/manajemen/proyek/${project.id}`)}
                                                className={`border-t border-slate-50 transition-colors hover:bg-slate-50/60 cursor-pointer`}
                                            >
                                                <td className="px-5 py-3">
                                                    <a href={`/admin/manajemen/proyek/${project.id}`} onClick={e => { e.preventDefault(); e.stopPropagation(); navigate(`/admin/manajemen/proyek/${project.id}`); }} className={`font-bold text-slate-900 block hover:text-[#1c51a1] group-hover:text-[#1c51a1] transition-colors`}>{project.title}</a>
                                                    <div className="text-[10px] font-mono text-slate-400">{project.id}</div>
                                                </td>
                                                <td className="px-4 py-3 text-slate-600 text-xs">{(doneCount === totalStages && totalStages > 0) ? 'SELESAI' : (stage?.label || '—')}</td>
                                                <td className="px-4 py-3">
                                                    {pj ? (
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 h-6 rounded-full bg-[#dce8f8] flex items-center justify-center text-[10px] font-bold text-[#1c51a1]">
                                                                {avatarInitials(pj.name)}
                                                            </div>
                                                            <span className="text-xs text-slate-700">{pj.name}</span>
                                                        </div>
                                                    ) : <span className="text-xs text-slate-400">—</span>}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {isProposal ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-black uppercase bg-[#f4ebff] text-[#7e22ce]">
                                                            USULAN BARU
                                                        </span>
                                                    ) : (
                                                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-black uppercase ${STATUS_PILL[statusKey] || 'bg-slate-100 text-slate-600'}`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[statusKey] || 'bg-slate-400'}`} />
                                                            {STATUS_LABELS[statusKey] || statusKey}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className={`px-4 py-3 text-xs font-mono ${isOverdue ? 'text-rose-500 font-bold' : 'text-slate-500'}`}>
                                                    {formatDate(stage?.deadline)}
                                                </td>
                                                <td className="px-4 py-3 text-xs text-slate-400 font-mono">
                                                    {formatDate(project.createdAt)}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Status Kesibukan Tim */}
            <PjBusynessWidget />

            {/* Main Two–Column Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left: Bursa Tugas & Recent Projects Table */}
                <div className="lg:col-span-8 flex flex-col gap-6">
                    
                    {/* Bursa Tugas Section */}
                    {openTasks.length > 0 && (
                        <section className="bg-white rounded-xl overflow-hidden border border-[#b8d0ef]" style={{ boxShadow: '0 4px 6px -1px rgba(28, 81, 161, 0.1), 0 2px 4px -1px rgba(28, 81, 161, 0.06)' }}>
                            <div className="px-5 py-4 flex justify-between items-center bg-white border-b border-[#dce8f8]">
                                <div className="flex items-center gap-3">
                                    <div style={{ borderLeft: '3px solid #3b82f6', paddingLeft: '12px' }}>
                                        <h3 className="font-bold text-[#1c51a1] tracking-tight">Bursa Tugas Tersedia</h3>
                                        <p className="text-[11px] text-slate-500 mt-0.5">Ada {openTasks.length} tahapan yang belum memiliki penanggung jawab</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col">
                                {bursaProjects.map((bp, bpIdx) => {
                                    const isExpanded = expandedBursa[bp.project.id]
                                    return (
                                        <div key={bp.project.id} className={`${bpIdx > 0 ? 'border-t border-slate-100' : ''}`}>
                                            <div 
                                                className="px-5 py-3.5 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-colors"
                                                onClick={() => toggleBursa(bp.project.id)}
                                            >
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <a href={`/admin/manajemen/proyek/${bp.project.id}`} onClick={e => { e.stopPropagation(); }} className="font-bold text-slate-900 hover:text-[#1c51a1] transition-colors">{bp.project.title}</a>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-100 px-1.5 py-0.5 rounded">
                                                            {bp.project.categoryLabel || bp.project.category}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                                        {bp.tasks.length} tahapan tersedia
                                                    </p>
                                                </div>
                                                <button className="text-slate-400 hover:text-slate-600">
                                                    <span className={`material-symbols-outlined transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                                                        expand_more
                                                    </span>
                                                </button>
                                            </div>

                                            {isExpanded && (
                                                <div className="bg-[#f8fafc] border-t border-[#dce8f8] p-4">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        {bp.tasks.map((task, idx) => (
                                                            <div key={task.stage.id} className="bg-white rounded-lg border border-[#b8d0ef] p-4 flex flex-col justify-between shadow-sm">
                                                                <div className="mb-4">
                                                                    <div className="flex items-start justify-between gap-2">
                                                                        <h4 className="font-bold text-[#1c51a1] text-sm">{task.stage.label}</h4>
                                                                        {(task.stage.score > 0) && (
                                                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-700 uppercase flex-shrink-0">
                                                                                <span className="material-symbols-outlined text-[11px]">stars</span>
                                                                                {task.stage.score}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="mt-auto flex justify-end">
                                                                    {claimingTask === task.stage.id ? (
                                                                        <div className="flex flex-col items-end gap-2 w-full">
                                                                            <div className="flex flex-col text-left w-full">
                                                                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-0.5">Target Selesai</span>
                                                                                <input 
                                                                                    type="date" 
                                                                                    value={claimDeadline}
                                                                                    onChange={e => setClaimDeadline(e.target.value)}
                                                                                    className="w-full text-xs px-2 py-1.5 border border-slate-200 rounded focus:outline-none focus:border-[#1c51a1]"
                                                                                />
                                                                            </div>
                                                                            <div className="flex gap-1 w-full justify-end mt-1">
                                                                                <button 
                                                                                    onClick={() => { setClaimingTask(null); setClaimDeadline(''); }}
                                                                                    className="btn btn-ghost btn-sm text-[10px] px-3 py-1.5 text-slate-500 rounded"
                                                                                >
                                                                                    Batal
                                                                                </button>
                                                                                <button 
                                                                                    onClick={() => handleClaimTask(task.stage.id)}
                                                                                    className="btn btn-sm bg-[#1c51a1] text-white hover:bg-[#163d7a] text-[10px] px-3 py-1.5 font-bold rounded"
                                                                                >
                                                                                    Kirim
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <button
                                                                            onClick={() => {
                                                                                if (task.isSkillMatched) {
                                                                                    setClaimingTask(task.stage.id);
                                                                                    setClaimDeadline('');
                                                                                }
                                                                            }}
                                                                            disabled={!task.isSkillMatched}
                                                                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold w-full transition-all ${task.isSkillMatched ? 'bg-[#eef4fc] text-[#1c51a1] hover:bg-[#1c51a1] hover:text-white border border-[#b8d0ef]' : 'bg-slate-50 text-slate-400 cursor-not-allowed border border-slate-200'}`}
                                                                        >
                                                                            {task.isSkillMatched ? '+ Ambil Tugas' : 'Skill Tidak Sesuai'}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </section>
                    )}

                    <section className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                        <div className="px-5 py-4 flex justify-between items-center bg-white border-b border-slate-50">
                        <div style={{ borderLeft: '3px solid #3b82f6', paddingLeft: '12px' }}>
                            <h3 className="font-bold text-slate-900 tracking-tight">Proyek Terbaru</h3>
                            <p className="text-[11px] text-slate-500 mt-0.5">{projects.length} total proyek</p>
                        </div>
                        <button
                            className="text-xs font-bold text-[#1c51a1] hover:underline"
                            onClick={() => navigate('/admin/manajemen/proyek')}
                        >
                            Lihat Semua
                        </button>
                    </div>

                    {recentProjects.length === 0 ? (
                        <div className="px-5 py-12 text-center text-sm text-slate-400">
                            Belum ada proyek. Klik tombol + untuk membuat proyek baru.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-separate border-spacing-0">
                                <thead>
                                    <tr className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                        <th className="px-5 py-3">Judul Proyek</th>
                                        <th className="px-4 py-3">PJ</th>
                                        <th className="px-4 py-3">Deadline</th>
                                        <th className="px-5 py-3 text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {recentProjects.map(project => {
                                        const stage = getCurrentStage(project)
                                        const pj = stage?.pj
                                        const isOverdue = isOverdueHelper(stage)
                                        const catKey = project.category?.toLowerCase() || 'lainnya'
                                        const statusKey = stage?.status || 'draft'
                                        const doneCount = project.stages?.filter(s => s.status === 'done' || s.status === 'archived').length || 0
                                        const totalStages = project.stages?.length || 0

                                        return (
                                            <tr
                                                key={project.id}
                                                className="group hover:bg-slate-50/60 transition-colors cursor-pointer"
                                                onClick={() => navigate(`/admin/manajemen/proyek/${project.id}`)}
                                            >
                                                <td className="px-5 py-3.5 border-t border-slate-50">
                                                    <a href={`/admin/manajemen/proyek/${project.id}`} onClick={e => { e.preventDefault(); e.stopPropagation(); navigate(`/admin/manajemen/proyek/${project.id}`); }} className="font-bold text-slate-900 hover:text-[#1c51a1] group-hover:text-[#1c51a1] transition-colors line-clamp-2 block">{project.title}</a>
                                                    <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase">
                                                        {project.categoryLabel || project.category} 
                                                        <span className="mx-1">•</span> 
                                                        {(doneCount === totalStages && totalStages > 0) ? 'SELESAI' : (stage?.label || '—')} 
                                                        {totalStages > 0 && project.status !== 'archived' && ` (${doneCount}/${totalStages})`}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3.5 border-t border-slate-50">
                                                    {pj ? (
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-7 h-7 rounded-full bg-[#dce8f8] flex items-center justify-center text-[10px] font-bold text-[#1c51a1] flex-shrink-0">
                                                                {avatarInitials(pj.name)}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-xs text-slate-700 font-semibold">{pj.name}</span>
                                                            </div>
                                                        </div>
                                                    ) : <span className="text-xs text-slate-400">—</span>}
                                                </td>
                                                <td className={`px-4 py-3.5 border-t border-slate-50 text-xs font-bold ${isOverdue ? 'text-rose-500' : 'text-slate-600'}`}>
                                                    {formatDate(stage?.deadline)}
                                                </td>
                                                <td className="px-5 py-3.5 border-t border-slate-50 text-right">
                                                    {project.status === 'archived' ? (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase bg-slate-100 text-slate-500">
                                                            ARSIP
                                                        </span>
                                                    ) : (
                                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase ${STATUS_PILL[statusKey] || 'bg-slate-100 text-slate-600'}`}>
                                                            {STATUS_LABELS[statusKey] || statusKey}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
                </div>

                {/* Right: Sidebars */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                    {/* Big Button: Proyek Baru */}
                    <button
                        className="w-full text-white px-5 py-4 rounded-xl flex items-center justify-center gap-2.5 hover:shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all shadow-md"
                        style={{ background: 'linear-gradient(135deg, #1c51a1 0%, #2563eb 100%)' }}
                        onClick={() => navigate('/admin/manajemen/proyek/baru')}
                    >
                        <span className="material-symbols-outlined text-[24px]">add_circle</span>
                        <span className="text-base font-bold tracking-wide">Proyek Baru</span>
                    </button>

                    {/* Top Productivity Rankings */}
                    <section className="bg-white rounded-xl overflow-hidden flex flex-col" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                        <div className="px-5 py-4 border-b border-slate-50 bg-white">
                            <div className="flex justify-between items-center mb-3">
                                <div style={{ borderLeft: '3px solid #3b82f6', paddingLeft: '12px' }}>
                                    <h3 className="font-bold text-slate-900 tracking-tight flex items-center gap-2">
                                        🏆 Top Produktivitas Personil
                                        <span className="text-[10px] font-bold text-[#1c51a1] bg-[#eef4fc] px-2 py-0.5 rounded uppercase">Global</span>
                                    </h3>
                                </div>
                            </div>
                            {/* Period selector */}
                            <div className="flex gap-2">
                                <select
                                    value={rankingMonth}
                                    onChange={e => {
                                        const val = e.target.value
                                        setRankingMonth(val === '' ? -1 : Number(val))
                                    }}
                                    className="flex-1 text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-medium text-slate-700 focus:outline-none focus:border-[#1c51a1]"
                                >
                                    <option value="">— Semua Bulan —</option>
                                    {monthNames.map((name, idx) => (
                                        <option key={idx} value={idx}>{name}</option>
                                    ))}
                                </select>
                                <select
                                    value={rankingYear}
                                    onChange={e => setRankingYear(Number(e.target.value))}
                                    className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-medium text-slate-700 focus:outline-none focus:border-[#1c51a1]"
                                >
                                    {availableYears.map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="p-5 space-y-4">
                            {rankingsLoading ? (
                                <div className="py-8 text-center text-sm text-slate-400">Memuat data...</div>
                            ) : globalRankings.length === 0 ? (
                                <div className="py-8 text-center text-sm text-slate-400">
                                    {rankingMonth === -1
                                        ? `Belum ada data produktivitas di ${rankingYear}`
                                        : `Belum ada tahapan selesai di ${currentMonthName} ${rankingYear}`}
                                </div>
                            ) : (
                                globalRankings.map((person, idx) => {
                                    const avatar = person.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '??'
                                    const isMe = person.id === currentUser?.id
                                    return (
                                        <div 
                                            key={person.id} 
                                            onClick={() => setSelectedRankDetail(person)}
                                            className={`flex items-center justify-between border-b border-slate-50 pb-3 last:border-0 last:pb-0 cursor-pointer hover:bg-slate-50 p-2 -mx-2 rounded-lg transition-colors ${isMe ? 'bg-[#eef4fc]' : ''}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="relative">
                                                    <div className="w-8 h-8 rounded-full bg-[#dce8f8] flex items-center justify-center text-xs font-bold text-[#1c51a1]">
                                                        {avatar}
                                                    </div>
                                                    <span className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-slate-900 text-[9px] font-black text-white flex items-center justify-center">
                                                        {idx + 1}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-slate-800 leading-tight">
                                                        {person.name}{isMe && <span className="ml-1 text-[#1c51a1]">(Saya)</span>}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">{person.completedStages} tahapan selesai</p>
                                                </div>
                                            </div>
                                            <div className="text-right flex items-center gap-3">
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#eef4fc] text-[#1c51a1] text-xs font-black">
                                                    ⭐ {person.totalScore} Poin
                                                </span>
                                                <span className="material-symbols-outlined text-slate-300 text-[18px]">chevron_right</span>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </section>

                </div>
            </div>

        </div>

            {/* Modal Detail Poin */}
            {selectedRankDetail && (
                <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl w-full max-w-2xl shadow-xl flex flex-col max-h-[90vh]">
                        {/* Header Modal */}
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-xl">
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">Rincian Perolehan Poin</h2>
                                <p className="text-xs text-slate-500 mt-1">
                                    <span className="font-semibold text-slate-700">{selectedRankDetail.name}</span> &bull; {currentMonthName} {rankingYear}
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Skor</p>
                                    <p className="text-lg font-black text-[#1c51a1]">{selectedRankDetail.totalScore}</p>
                                </div>
                                <button
                                    onClick={() => setSelectedRankDetail(null)}
                                    className="p-2 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-full transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[20px]">close</span>
                                </button>
                            </div>
                        </div>

                        {/* Body Modal (List Riwayat) */}
                        <div className="p-6 overflow-y-auto">
                            {!selectedRankDetail.details || selectedRankDetail.details.length === 0 ? (
                                <div className="text-center py-10 text-slate-400">
                                    <span className="material-symbols-outlined text-[48px] opacity-50 mb-2">inbox</span>
                                    <p className="text-sm">Belum ada riwayat perolehan poin yang tercatat.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {selectedRankDetail.details
                                        .sort((a, b) => new Date(b.date) - new Date(a.date))
                                        .map((detail, idx) => (
                                            <div key={idx} className="flex items-start justify-between p-4 rounded-xl border border-slate-100 bg-white hover:border-[#b8d0ef] hover:shadow-sm transition-all group">
                                                <div className="flex gap-4">
                                                    <div className={`mt-1 p-2 rounded-lg ${CATEGORY_BADGE[detail.category] || CATEGORY_BADGE.lainnya} group-hover:bg-[#1c51a1] group-hover:text-white transition-colors`}>
                                                        <span className="material-symbols-outlined text-[18px]">
                                                            {detail.category === 'terbitan' ? 'menu_book' : detail.category === 'medsos' ? 'share' : detail.category === 'keuangan' ? 'payments' : 'folder'}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-800 group-hover:text-[#1c51a1] transition-colors">{detail.projectTitle}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                                                                {detail.stageLabel}
                                                            </span>
                                                            <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                                                <span className="material-symbols-outlined text-[12px]">event</span>
                                                                {formatDate(detail.date)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex-shrink-0">
                                                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 text-sm font-black border border-emerald-100">
                                                        +{detail.scoreEarned} Poin
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <PopupModal
                isOpen={!!popupMessage}
                type={popupMessage?.type}
                message={popupMessage?.text}
                onClose={closePopup}
            />
        </>
    )
}
