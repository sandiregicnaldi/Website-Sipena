import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../../context/AppContext'
import { CATEGORIES, STATUS_LABELS } from '../../../data/categories'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const MONTH_NAMES = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

const TABS = [
    { key: 'rekap', label: 'Rekap Proyek' },
    { key: 'terlambat', label: 'Proyek Terlambat' },
    { key: 'produktivitas', label: 'Produktivitas Personil' },
    { key: 'tahapan', label: 'Tahapan Proyek' },
    { key: 'selesai', label: 'Proyek Selesai' },
]

const STATUS_STYLE = {
    active: { dot: 'bg-emerald-500', label: 'On Track', text: 'text-slate-700' },
    review: { dot: 'bg-amber-500', label: 'Pending Review', text: 'text-amber-700' },
    revision: { dot: 'bg-orange-400', label: 'Direvisi', text: 'text-orange-700' },
    done: { dot: 'bg-emerald-600', label: 'Selesai', text: 'text-emerald-700' },
    draft: { dot: 'bg-slate-400', label: 'Draft', text: 'text-slate-600' },
    archived: { dot: 'bg-slate-300', label: 'Arsip', text: 'text-slate-500' },
}

const initials = (name) => {
    if (!name || name === 'â€”') return '?'
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

const AVATAR_COLORS = ['bg-[#dce8f8] text-[#163d7a]', 'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700', 'bg-rose-100 text-rose-700', 'bg-cyan-100 text-cyan-700']

export default function Reports() {
    const { projects, archivedProjects, isAdmin, currentUser, categoriesMap, users } = useApp()
    const navigate = useNavigate()

    const userMap = useMemo(() => {
        const map = {}
        ;(users || []).forEach(u => {
            if (u.id) map[u.id] = u.name
        })
        return map
    }, [users])

    // Merge projects and archivedProjects to get all unique projects
    const allProjects = useMemo(() => {
        const map = new Map()
        projects.forEach(p => map.set(p.id, p))
        if (archivedProjects) {
            archivedProjects.forEach(p => map.set(p.id, p))
        }
        return Array.from(map.values())
    }, [projects, archivedProjects])

    // Non-admin: filter to only projects the user is involved in
    // Termasuk proyek di mana user adalah PJ utama MAUPUN kolaborator (coPjId / coPjIds)
    const userProjects = useMemo(() => {
        if (isAdmin) return allProjects
        return allProjects.filter(p => {
            if (p.createdBy === currentUser?.id) return true
            if (p.stages?.some(s => {
                if (!currentUser?.id) return false
                if (s.pjId === currentUser.id || s.pj?.id === currentUser.id) return true
                if (s.coPjId === currentUser.id || s.coPj?.id === currentUser.id) return true
                if (Array.isArray(s.coPjIds) && s.coPjIds.includes(currentUser.id)) return true
                if (Array.isArray(s.coPjs) && s.coPjs.some(c => c.id === currentUser.id)) return true
                return false
            })) return true
            return false
        })
    }, [allProjects, isAdmin, currentUser])

    const [activeTab, setActiveTab] = useState('rekap')
    const [filterCat, setFilterCat] = useState('')
    const [filterType, setFilterType] = useState('')
    const [filterYear, setFilterYear] = useState('')
    const [filterMonth, setFilterMonth] = useState('')
    const [searchTitle, setSearchTitle] = useState('')
    const [filterStatus, setFilterStatus] = useState('semua')

    const [expandedPersonil, setExpandedPersonil] = useState(null)
    const [expandedTahapan, setExpandedTahapan] = useState(null)

    // Filter periode untuk tab Produktivitas (default: bulan berjalan)
    // -1 = Semua Bulan dalam tahun yang dipilih
    const todayDate = new Date()
    const [filterProdMonth, setFilterProdMonth] = useState(todayDate.getMonth())
    const [filterProdYear,  setFilterProdYear]  = useState(todayDate.getFullYear())

    const [limits, setLimits] = useState({
        rekap: 5,
        terlambat: 5,
        produktivitas: 5,
        tahapan: 5,
        selesai: 5,
    })

    const handleLoadMore = (tab) => {
        setLimits(prev => ({
            ...prev,
            [tab]: prev[tab] + 5
        }))
    }

    const togglePersonilExpand = (id) => {
        setExpandedPersonil(prev => prev === id ? null : id)
    }

    const toggleTahapanExpand = (name) => {
        setExpandedTahapan(prev => prev === name ? null : name)
    }

    const handleCatChange = (val) => { setFilterCat(val); setFilterType('') }

    const typeOptions = useMemo(() => {
        if (!filterCat) return Object.values(CATEGORIES).flatMap(c => (c.types || []))
        return CATEGORIES[filterCat]?.types || []
    }, [filterCat])

    const years = useMemo(() =>
        [...new Set(userProjects.map(p => new Date(p.createdAt).getFullYear()))].sort((a, b) => b - a),
        [userProjects]
    )

    const getCurrentStage = (project) => {
        if (!project.stages || project.stages.length === 0) return null
        return project.stages.find(s =>
            s.status === 'active' || s.status === 'review' || s.status === 'revision'
        ) || project.stages.find(s => s.status === 'draft') || project.stages[project.stages.length - 1]
    }

    const formatDate = (iso) => {
        if (!iso) return 'â€”'
        return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    }

    const daysLate = (deadline) => {
        if (!deadline) return 0
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        let dl
        if (typeof deadline === 'string' && deadline.includes('-') && !deadline.includes('T')) {
            const [year, month, day] = deadline.split('-').map(Number)
            dl = new Date(year, month - 1, day)
        } else {
            dl = new Date(deadline)
            dl.setHours(0, 0, 0, 0)
        }
        return Math.max(0, Math.floor((today - dl) / 86400000))
    }

    const getAllPJs = (project) => {
        if (!project.stages) return 'â€”'
        const names = [...new Set(project.stages.filter(s => s.pj?.name).map(s => s.pj.name))]
        return names.length > 0 ? names.join(', ') : 'â€”'
    }

    const baseFilter = (p) => {
        if (filterCat && p.category !== filterCat) return false
        if (filterType && p.type !== filterType) return false
        if (filterYear && new Date(p.createdAt).getFullYear().toString() !== filterYear) return false
        if (filterMonth && (new Date(p.createdAt).getMonth() + 1).toString() !== filterMonth) return false
        if (searchTitle && !p.title?.toLowerCase().includes(searchTitle.toLowerCase())) return false
        return true
    }

    // ============ 1. REKAP PROYEK ============
    const rekapData = useMemo(() => {
        return userProjects.filter(baseFilter).map(p => {
            const stage = getCurrentStage(p)
            const catConfig = CATEGORIES[p.category] || {}
            const typeConfig = catConfig.types?.find(t => t.id === p.type)
            return {
                id: p.id,
                title: p.title,
                category: catConfig.label || p.category || 'â€”',
                type: typeConfig?.label || p.type || 'â€”',
                currentStage: stage?.label || 'â€”',
                pj: stage?.pj?.name || 'â€”',
                status: STATUS_LABELS[stage?.status] || 'Draft',
                statusRaw: stage?.status || 'draft',
                deadline: stage?.deadline ? formatDate(stage.deadline) : 'â€”',
                isOverdue: stage?.deadline && daysLate(stage.deadline) > 0 && stage.status !== 'done' && stage.status !== 'archived',
            }
        })
    }, [userProjects, filterCat, filterType, filterYear, filterMonth, searchTitle])

    const terlambatData = useMemo(() => {
        const result = []
        userProjects.filter(baseFilter).forEach(p => {
            const catConfig = CATEGORIES[p.category] || {}
            p.stages?.forEach(stage => {
                if (stage.deadline && daysLate(stage.deadline) > 0 &&
                    stage.status !== 'done' && stage.status !== 'archived') {
                    result.push({
                        projectId: p.id, title: p.title,
                        category: catConfig.label || p.category || 'â€”',
                        stage: stage.label, pj: stage.pj?.name || 'â€”',
                        deadline: formatDate(stage.deadline),
                        late: daysLate(stage.deadline),
                    })
                }
            })
        })
        return result.sort((a, b) => b.late - a.late)
    }, [userProjects, filterCat, filterType, filterYear, filterMonth])

    const produktivitasData = useMemo(() => {
        // -1 = semua bulan dalam tahun; angka 0-11 = bulan spesifik
        const allMonths = filterProdMonth === -1
        const periodStart = allMonths ? new Date(filterProdYear, 0, 1) : new Date(filterProdYear, filterProdMonth, 1)
        const periodEnd   = allMonths ? new Date(filterProdYear, 11, 31, 23, 59, 59, 999) : new Date(filterProdYear, filterProdMonth + 1, 0, 23, 59, 59, 999)

        const personilMap = {}
        userProjects.forEach(project => {
            project.stages?.forEach(stage => {
                if (!stage.pjId) return
                
                // Prioritas: coPjIds (array baru) bila berisi data, lalu fallback ke coPjId (field lama)
                const coPjIdsArr = (stage.coPjIds && Array.isArray(stage.coPjIds) && stage.coPjIds.length > 0)
                    ? stage.coPjIds.filter(id => id && id !== stage.pjId)
                    : (stage.coPjId && stage.coPjId !== stage.pjId ? [stage.coPjId] : []);
                const collaboratorIds = Array.from(new Set(coPjIdsArr)).slice(0, 2);
                const numCollaborators = collaboratorIds.length;

                let pjPct = 1.0;
                let coPjPcts = [];
                if (numCollaborators > 0) {
                    const totalParticipants = 1 + numCollaborators;
                    pjPct = 1 / totalParticipants;
                    coPjPcts = collaboratorIds.map(() => 1 / totalParticipants);
                }

                const participants = [
                    { id: stage.pjId, name: stage.pj?.name || stage.pjId, isCoPj: false, pct: pjPct }
                ];
                collaboratorIds.forEach((coId, cIdx) => {
                    const coName = stage.coPjs?.find(c => c.id === coId)?.name || (stage.coPj?.id === coId ? (stage.coPj?.name || coId) : (userMap?.[coId] || coId));
                    participants.push({ id: coId, name: coName, isCoPj: true, pct: coPjPcts[cIdx] ?? pjPct });
                });

                participants.forEach(p => {
                    if (!personilMap[p.id]) {
                        personilMap[p.id] = {
                            id: p.id,
                            name: p.name,
                            activeProjectsList: [],
                            doneProjectsList: [],
                            totalStagesCount: 0,
                            doneStagesCount: 0,
                            totalScore: 0,
                        }
                    }
                    const entry = personilMap[p.id]
                    entry.totalStagesCount++

                    if (stage.status === 'active' || stage.status === 'review' || stage.status === 'revision') {
                        entry.activeProjectsList.push({
                            projectId: project.id,
                            projectTitle: project.title,
                            stageLabel: p.isCoPj ? `${stage.label} (Kolaborasi)` : stage.label,
                            status: stage.status
                        })
                    }

                    if (stage.status === 'done' || stage.status === 'archived') {
                        const completionDate = stage.approvedAt
                            ? new Date(stage.approvedAt)
                            : (project.updatedAt ? new Date(project.updatedAt) : new Date())

                        if (completionDate < periodStart || completionDate > periodEnd) return

                        entry.doneStagesCount++
                        const catKey = project.category?.toLowerCase() || 'lainnya'

                        const catObj = categoriesMap?.[catKey];
                        const isFlexibleCategory = ['lainnya', 'promosi', 'bimtek', 'pelatihan'].includes(catKey) || catObj?.custom === true;
                        
                        let baseScore = 0
                        if (isFlexibleCategory) {
                            baseScore = project.status === 'archived' ? (Number(stage.score) || 1) : (Number(stage.score) || 0)
                        } else {
                            // Untuk tahap yang sudah done: gunakan stage.score dari DB (nilai dikunci admin, termasuk 0)
                            // Ini memastikan override skor dari modal QC benar-benar tersimpan dan terbaca di sini
                            if (stage.score !== undefined && stage.score !== null) {
                                baseScore = Number(stage.score)
                            } else {
                                const masterStages = categoriesMap?.[catKey]?.stages || []
                                const masterStage = masterStages.find(s => s.label?.trim().toLowerCase() === stage.label?.trim().toLowerCase())
                                if (masterStage) {
                                    if (masterStage.perPageScore && masterStage.perPageScore > 0 && project.pageCount && project.pageCount > 0) {
                                        const multiplier = Number(masterStage.pageMultiplier) || 1
                                        baseScore = Math.round(((project.pageCount / multiplier) * Number(masterStage.perPageScore)) * 100) / 100
                                    } else {
                                        baseScore = Number(masterStage.score) || 0
                                    }
                                } else {
                                    baseScore = 0
                                }
                            }
                        }

                        const finalScore = Math.round(baseScore * p.pct * 100) / 100
                        entry.totalScore += finalScore
                        entry.doneProjectsList.push({
                            projectId: project.id,
                            projectTitle: project.title,
                            stageLabel: p.isCoPj ? `${stage.label} (Kolaborasi)` : stage.label
                        })
                    }
                })

                if (stage.status === 'done' || stage.status === 'archived') {
                    const reviewerId = stage.reviewerId
                    if (reviewerId) {
                        const reviewerName = users?.find(u => u.id === reviewerId)?.name || 'Admin Reviewer'
                        if (!personilMap[reviewerId]) {
                            personilMap[reviewerId] = {
                                id: reviewerId,
                                name: reviewerName,
                                activeProjectsList: [],
                                doneProjectsList: [],
                                totalStagesCount: 0,
                                doneStagesCount: 0,
                                totalScore: 0,
                            }
                        }
                        
                        let reviewerBonus = 1
                        if (stage.label?.trim().toLowerCase() === 'tata letak naskah' && !users?.find(u => u.id === reviewerId)?.role?.includes('admin')) {
                            reviewerBonus = 3
                        }

                        personilMap[reviewerId].totalScore += reviewerBonus
                        personilMap[reviewerId].doneProjectsList.push({
                            projectId: project.id,
                            projectTitle: project.title,
                            stageLabel: `${stage.label} (Review)`
                        })
                    }
                }
            })
        })
        return Object.values(personilMap)
            .map((entry, i) => {
                const uniqueActiveProjects = [...new Set(entry.activeProjectsList)]
                const uniqueDoneProjects = [...new Set(entry.doneProjectsList.map(p => p.projectId))]
                    .map(id => entry.doneProjectsList.find(p => p.projectId === id))
                const activeStagesText = entry.activeProjectsList.length > 0
                    ? `${entry.activeProjectsList.length} tahapan`
                    : '—'
                return {
                    id: entry.id,
                    name: entry.name,
                    avatarColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
                    activeProjectsCount: uniqueActiveProjects.length,
                    activeProjectsList: entry.activeProjectsList,
                    doneProjectsCount: uniqueDoneProjects.length,
                    doneProjectsList: uniqueDoneProjects,
                    activeStages: activeStagesText,
                    doneStages: entry.doneStagesCount,
                    totalScore: Math.round(entry.totalScore * 100) / 100,
                    completionRate: entry.totalStagesCount > 0
                        ? Math.round((entry.doneStagesCount / entry.totalStagesCount) * 100) : 0,
                }
            })
            .sort((a, b) => b.totalScore !== a.totalScore
                ? b.totalScore - a.totalScore
                : b.doneStages - a.doneStages
            )
    }, [userProjects, filterProdMonth, filterProdYear, categoriesMap, users, userMap])

    const tahapanData = useMemo(() => {
        const stageProjects = {}
        userProjects.filter(baseFilter).forEach(p => {
            const catConfig = CATEGORIES[p.category] || {}
            p.stages?.forEach(stage => {
                if (stage.status !== 'done' && stage.status !== 'archived') {
                    const label = stage.label || 'Unknown'
                    if (!stageProjects[label]) {
                        stageProjects[label] = []
                    }
                    stageProjects[label].push({
                        projectId: p.id,
                        projectTitle: p.title,
                        category: catConfig.label || p.category || '—',
                        pjName: stage.pj?.name || 'Tunggu Penugasan...',
                        deadline: stage.deadline ? formatDate(stage.deadline) : '—',
                        status: stage.status,
                        isOverdue: stage.deadline && daysLate(stage.deadline) > 0,
                    })
                }
            })
        })
        return Object.entries(stageProjects)
            .map(([name, projectsList]) => ({
                name,
                count: projectsList.length,
                projects: projectsList
            }))
            .sort((a, b) => b.count - a.count)
    }, [userProjects, filterCat, filterType, filterYear, filterMonth])

    const maxTahapanCount = Math.max(...tahapanData.map(d => d.count), 1)
    const INDIGO_SHADES = ['bg-[#6a9dd4]', 'bg-[#3a70bf]', 'bg-[#1c51a1]', 'bg-[#1c51a1]', 'bg-[#163d7a]', 'bg-[#0f2b57]']

    // ============ 5. PROYEK SELESAI ============
    const selesaiData = useMemo(() => {
        return userProjects.filter(p => {
            if (!baseFilter(p)) return false
            return p.stages?.length > 0 && p.stages.every(s => s.status === 'done' || s.status === 'archived')
        }).map(p => {
            const catConfig = CATEGORIES[p.category] || {}
            const typeConfig = catConfig.types?.find(t => t.id === p.type)
            // Find last done stage's update as completion date
            const lastDoneStage = [...(p.stages || [])].reverse().find(s => s.status === 'done' || s.status === 'archived')
            return {
                id: p.id,
                title: p.title,
                type: typeConfig?.label || p.type || 'â€”',
                category: catConfig.label || p.category || 'â€”',
                pj: getAllPJs(p),
                completedAt: formatDate(lastDoneStage?.updatedAt || p.updatedAt),
            }
        })
    }, [userProjects, filterCat, filterType, filterYear, filterMonth])


    const filteredRekapData = useMemo(() => {
        if (filterStatus === 'semua') return rekapData
        return rekapData.filter(r => r.statusRaw === filterStatus)
    }, [rekapData, filterStatus])

    const resetFilters = () => { 
        setFilterCat('')
        setFilterType('')
        setFilterYear('')
        setFilterMonth('')
        setSearchTitle('')
        setFilterStatus('semua')
    }
    const hasFilters = filterCat || filterType || filterYear || filterMonth || searchTitle || filterStatus !== 'semua'

    // KPI counts (always from all projects, no tab-level filter for overview)
    const allActive = allProjects.filter(p => p.stages?.some(s => s.status === 'active' || s.status === 'review' || s.status === 'revision' || s.status === 'draft') && !p.stages?.every(s => s.status === 'done' || s.status === 'archived'))
    const kpiReview = allProjects.filter(p => p.stages?.some(s => s.status === 'review')).length
    const kpiDone = allProjects.filter(p => p.stages?.every(s => s.status === 'done' || s.status === 'archived') && p.stages?.length > 0).length
    const kpiDelay = allProjects.filter(p => {
        const s = getCurrentStage(p)
        return s?.deadline && new Date(s.deadline) < new Date() && s.status !== 'done' && s.status !== 'archived'
    }).length

    const currentCount = {
        rekap: filteredRekapData.length,
        terlambat: terlambatData.length,
        produktivitas: produktivitasData.length,
        tahapan: tahapanData.length,
        selesai: selesaiData.length,
    }

    const showCatFilter = ['rekap', 'terlambat', 'selesai'].includes(activeTab)
    const showTypeFilter = ['rekap'].includes(activeTab)
    const showSearch = ['rekap'].includes(activeTab)

    // ====== EXPORT ======
    const exportExcel = () => {
        const wb = XLSX.utils.book_new()
        let headers, data, sheetName, filename
        switch (activeTab) {
            case 'rekap':
                headers = ['Judul Proyek', 'Kategori', 'Tipe Proyek', 'Tahap Saat Ini', 'PJ', 'Status', 'Deadline']
                data = rekapData.map(r => [r.title, r.category, r.type, r.currentStage, r.pj, r.status, r.deadline])
                sheetName = 'Rekap Proyek'; filename = 'Rekap_Proyek'; break
            case 'terlambat':
                headers = ['Judul Proyek', 'Tahap', 'PJ', 'Deadline', 'Keterlambatan (hari)']
                data = terlambatData.map(r => [r.title, r.stage, r.pj, r.deadline, r.late])
                sheetName = 'Proyek Terlambat'; filename = 'Proyek_Terlambat'; break
            case 'produktivitas':
                headers = ['Nama Personil', 'Proyek Aktif', 'Tahap yang Dikerjakan', 'Tahap Selesai', 'Total Skor / Poin', 'Completion Rate']
                data = produktivitasData.map(r => [r.name, r.activeProjectsCount, r.activeStages, r.doneStages, r.totalScore, `${r.completionRate}%`])
                sheetName = 'Produktivitas Personil'; filename = 'Produktivitas_Personil'; break
            case 'tahapan':
                headers = ['Nama Tahap', 'Jumlah Proyek']
                data = tahapanData.map(r => [r.name, r.count])
                sheetName = 'Tahapan Proyek'; filename = 'Tahapan_Proyek'; break
            case 'selesai':
                headers = ['Judul Proyek', 'Jenis Proyek', 'PJ', 'Tanggal Selesai']
                data = selesaiData.map(r => [r.title, r.type, r.pj, r.completedAt])
                sheetName = 'Proyek Selesai'; filename = 'Proyek_Selesai'; break
        }
        const ws = XLSX.utils.aoa_to_sheet([headers, ...data])
        ws['!cols'] = headers.map(() => ({ wch: 30 }))
        XLSX.utils.book_append_sheet(wb, ws, sheetName)
        XLSX.writeFile(wb, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`)
    }

    const exportPDF = () => {
        const doc = new jsPDF({ orientation: 'landscape' })
        const tabConfig = TABS.find(t => t.key === activeTab)
        doc.setFontSize(16)
        doc.text(`Laporan: ${tabConfig?.label || 'Laporan'}`, 14, 18)
        doc.setFontSize(9); doc.setTextColor(100)
        const filterParts = []
        if (filterCat) filterParts.push(`Kategori: ${CATEGORIES[filterCat]?.label || filterCat}`)
        if (filterYear) filterParts.push(`Tahun: ${filterYear}`)
        if (filterMonth) filterParts.push(`Bulan: ${MONTH_NAMES[parseInt(filterMonth) - 1]}`)
        doc.text(filterParts.length > 0 ? filterParts.join(' | ') : 'Semua data', 14, 24)
        doc.text(`Digenerate: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, 14, 29)
        doc.setTextColor(0)
        let head, body
        switch (activeTab) {
            case 'rekap': head = [['Judul Proyek', 'Kategori', 'Tipe Proyek', 'Tahap Saat Ini', 'PJ', 'Status', 'Deadline']]; body = rekapData.map(r => [r.title, r.category, r.type, r.currentStage, r.pj, r.status, r.deadline]); break
            case 'terlambat': head = [['Judul Proyek', 'Tahap', 'PJ', 'Deadline', 'Keterlambatan (hari)']]; body = terlambatData.map(r => [r.title, r.stage, r.pj, r.deadline, `${r.late} hari`]); break
            case 'produktivitas': head = [['Nama Personil', 'Proyek Aktif', 'Tahap yang Dikerjakan', 'Tahap Selesai', 'Total Skor / Poin', 'Completion Rate']]; body = produktivitasData.map(r => [r.name, r.activeProjectsCount, r.activeStages, r.doneStages, r.totalScore, `${r.completionRate}%`]); break
            case 'tahapan': head = [['Nama Tahap', 'Jumlah Proyek']]; body = tahapanData.map(r => [r.name, r.count]); break
            case 'selesai': head = [['Judul Proyek', 'Jenis Proyek', 'PJ', 'Tanggal Selesai']]; body = selesaiData.map(r => [r.title, r.type, r.pj, r.completedAt]); break
        }
        autoTable(doc, {
            startY: 34, head, body,
            styles: { fontSize: 8, cellPadding: 3 },
            headStyles: { fillColor: [53, 37, 205], textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [248, 249, 255] },
        })
        const pageCount = doc.getNumberOfPages()
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i); doc.setFontSize(7); doc.setTextColor(150)
            doc.text(`Sistem Manajemen Penerbitan â€” Halaman ${i}/${pageCount}`, 14, doc.internal.pageSize.height - 8)
        }
        doc.save(`${tabConfig?.label?.replace(/\s/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`)
    }

    // ====== TABLE UI helper ======
    const TableHeader = ({ cols }) => (
        <thead>
            <tr className="bg-slate-50/60">
                {cols.map((col, i) => (
                    <th key={i} className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest text-left">{col}</th>
                ))}
            </tr>
        </thead>
    )

    const EmptyState = ({ icon, text, sub }) => (
        <div className="py-16 text-center">
            <span className="material-symbols-outlined text-5xl text-slate-300">{icon}</span>
            <h3 className="mt-3 font-bold text-slate-600">{text}</h3>
            {sub && <p className="text-sm text-slate-400 mt-1">{sub}</p>}
        </div>
    )

    return (
        <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'TOTAL AKTIF', value: allActive.length, icon: 'rocket_launch', iconBg: 'bg-slate-100', iconColor: 'text-slate-600', sub: 'Proyek Aktif', subIcon: 'trending_up', subColor: 'text-slate-500' },
                    { label: 'REVIEW', value: kpiReview, icon: 'rate_review', iconBg: 'bg-rose-50', iconColor: 'text-rose-500', sub: 'Membutuhkan Perhatian', subIcon: 'priority_high', subColor: 'text-rose-500' },
                    { label: 'SELESAI', value: kpiDone, icon: 'check_circle', iconBg: 'bg-emerald-50', iconColor: 'text-emerald-500', sub: 'Sepanjang Waktu', subIcon: 'schedule', subColor: 'text-emerald-600' },
                    { label: 'TERLAMBAT', value: kpiDelay, icon: 'warning', iconBg: 'bg-rose-50', iconColor: 'text-rose-500', sub: 'Action Required', subIcon: 'warning', subColor: 'text-rose-500', urgent: true },
                ].map((kpi, i) => (
                    <div key={i} className="bg-white rounded-xl p-5 border border-slate-100" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                        <div className="flex justify-between items-start mb-3">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{kpi.label}</p>
                            <div className={`w-8 h-8 ${kpi.iconBg} rounded-lg flex items-center justify-center`}>
                                <span className={`material-symbols-outlined text-[18px] ${kpi.iconColor}`}>{kpi.icon}</span>
                            </div>
                        </div>
                        <h3 className={`text-[2rem] font-black leading-none mb-3 ${kpi.urgent && kpi.value > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                            {String(kpi.value).padStart(2, '0')}
                        </h3>
                        <div className={`flex items-center gap-1 text-[11px] font-semibold ${kpi.subColor}`}>
                            <span className="material-symbols-outlined text-[14px]">{kpi.subIcon}</span>
                            {kpi.sub}
                        </div>
                    </div>
                ))}
            </div>

            {/* Filter Bar — single compact row */}
            <div className="bg-white rounded-xl px-4 py-3 border border-slate-200/80 flex flex-wrap gap-3 items-center shadow-xs">
                {/* Search */}
                {showSearch && (
                    <div className="flex-1 min-w-[200px] flex items-center bg-slate-50/60 hover:bg-slate-50 focus-within:bg-white border border-slate-200 hover:border-slate-300 focus-within:border-[#0b5cd5] rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-[#0b5cd5]/15 transition-all shadow-xs gap-2.5 group">
                        <svg className="text-slate-400 group-focus-within:text-[#0b5cd5] shrink-0 transition-colors pointer-events-none" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Cari judul proyek..."
                            value={searchTitle}
                            onChange={e => setSearchTitle(e.target.value)}
                            className="w-full bg-transparent border-none outline-none p-0 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-0 leading-normal"
                        />
                        {searchTitle && (
                            <button
                                type="button"
                                onClick={() => setSearchTitle('')}
                                className="p-0.5 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100 transition-colors shrink-0"
                                title="Hapus pencarian"
                            >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        )}
                    </div>
                )}
                {showCatFilter && (
                    <select
                        value={filterCat}
                        onChange={e => handleCatChange(e.target.value)}
                        className="bg-white hover:bg-slate-50/60 border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:border-[#0b5cd5] focus:ring-2 focus:ring-[#0b5cd5]/15 min-w-[130px] cursor-pointer transition-all"
                    >
                        <option value="">Semua Kategori</option>
                        {Object.entries(CATEGORIES).map(([key, cat]) => (
                            <option key={key} value={key}>{cat.label}</option>
                        ))}
                    </select>
                )}
                {showTypeFilter && (
                    <select
                        value={filterType}
                        onChange={e => setFilterType(e.target.value)}
                        className="bg-white hover:bg-slate-50/60 border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:border-[#0b5cd5] focus:ring-2 focus:ring-[#0b5cd5]/15 min-w-[130px] cursor-pointer transition-all"
                    >
                        <option value="">Jenis Proyek</option>
                        {typeOptions.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                    </select>
                )}
                <select
                    value={filterYear}
                    onChange={e => setFilterYear(e.target.value)}
                    className="bg-white hover:bg-slate-50/60 border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:border-[#0b5cd5] focus:ring-2 focus:ring-[#0b5cd5]/15 cursor-pointer transition-all"
                >
                    <option value="">{filterYear || new Date().getFullYear()}</option>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <select
                    value={filterMonth}
                    onChange={e => setFilterMonth(e.target.value)}
                    className="bg-white hover:bg-slate-50/60 border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:border-[#0b5cd5] focus:ring-2 focus:ring-[#0b5cd5]/15 cursor-pointer transition-all"
                >
                    <option value="">Semua Bulan</option>
                    {MONTH_NAMES.map((name, idx) => <option key={idx + 1} value={idx + 1}>{name}</option>)}
                </select>
                {hasFilters && (
                    <button onClick={resetFilters} className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors">
                        <span className="material-symbols-outlined text-[16px]">close</span>
                        Reset
                    </button>
                )}
                <div className="ml-auto flex items-center gap-2">
                    <button onClick={exportExcel} disabled={currentCount[activeTab] === 0}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white text-slate-700 font-semibold text-sm rounded-lg border border-slate-200 hover:bg-slate-50 transition-all disabled:opacity-40">
                        <span className="material-symbols-outlined text-[18px]">download</span>
                        Excel
                    </button>
                    <button onClick={exportPDF} disabled={currentCount[activeTab] === 0}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#0b5cd5] text-white font-bold text-sm rounded-lg hover:bg-[#094caf] transition-all disabled:opacity-40 shadow-sm">
                        <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                        PDF Report
                    </button>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-slate-100 flex items-center gap-6 overflow-x-auto">
                {TABS.map(tab => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                        className={`pb-3 text-[14px] whitespace-nowrap transition-colors ${activeTab === tab.key
                            ? 'font-bold text-[#0b5cd5] border-b-2 border-[#0b5cd5]'
                            : 'font-medium text-slate-500 hover:text-slate-800'}`}
                    >
                        {tab.label}
                        <span className={`ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === tab.key ? 'bg-[#dce8f8] text-[#0b5cd5]' : 'bg-slate-100 text-slate-500'}`}>
                            {currentCount[tab.key]}
                        </span>
                    </button>
                ))}
            </div>

            {/* ===== TAB 1: REKAP ===== */}
            {activeTab === 'rekap' && (
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl overflow-hidden border border-slate-100" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-4">
                            <div>
                                <h4 className="text-[17px] font-bold text-slate-900">Daftar Rekapitulasi Proyek</h4>
                                <p className="text-xs text-slate-400 mt-0.5">Menampilkan {filteredRekapData.length} proyek</p>
                            </div>
                            {/* Filter Chips Status Proyek */}
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { key: 'semua', label: 'Semua', count: rekapData.length, activeColor: 'bg-slate-800 text-white', inactiveColor: 'bg-slate-100 text-slate-600 hover:bg-slate-200' },
                                    { key: 'active', label: 'On Track', count: rekapData.filter(r => r.statusRaw === 'active').length, activeColor: 'bg-[#0b5cd5] text-white', inactiveColor: 'text-slate-600 hover:bg-slate-100' },
                                    { key: 'revision', label: 'Direvisi', count: rekapData.filter(r => r.statusRaw === 'revision').length, activeColor: 'bg-orange-500 text-white', inactiveColor: 'text-slate-600 hover:bg-slate-100' },
                                    { key: 'review', label: 'Pending Review', count: rekapData.filter(r => r.statusRaw === 'review').length, activeColor: 'bg-amber-500 text-white', inactiveColor: 'text-slate-600 hover:bg-slate-100' },
                                    { key: 'archived', label: 'Arsip', count: rekapData.filter(r => r.statusRaw === 'archived').length, activeColor: 'bg-slate-500 text-white', inactiveColor: 'text-slate-600 hover:bg-slate-100' },
                                ].map(chip => {
                                    const isSelected = filterStatus === chip.key
                                    return (
                                        <button key={chip.key}
                                            onClick={() => { setFilterStatus(chip.key); setLimits(prev => ({ ...prev, rekap: 5 })) }}
                                            className={`px-3 py-1.5 rounded-lg text-[12px] font-bold flex items-center gap-1 transition-all ${isSelected ? chip.activeColor : chip.inactiveColor}`}
                                        >
                                            {chip.label}
                                            <span className={`text-[10px] px-1.5 rounded font-bold ${isSelected ? 'bg-white/20' : 'bg-slate-200/70 text-slate-600'}`}>
                                                {chip.count}
                                            </span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {filteredRekapData.length === 0 ? <EmptyState icon="folder_open" text="Tidak ada data" sub="Tidak ada proyek dengan status atau filter ini." /> : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <TableHeader cols={['Kategori', 'Tipe', 'Judul & PJ', 'Tahapan', 'Status', 'Deadline']} />
                                    <tbody className="divide-y divide-slate-50">
                                        {filteredRekapData.slice(0, limits.rekap).map((row, idx) => {
                                            const st = STATUS_STYLE[row.statusRaw] || STATUS_STYLE.draft
                                            return (
                                                <tr 
                                                    key={idx} 
                                                    onClick={() => navigate(`/admin/manajemen/proyek/${row.id}`)}
                                                    className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
                                                >
                                                    <td className="px-6 py-4 text-sm font-semibold text-slate-900 group-hover:text-[#1c51a1] transition-colors">{row.category}</td>
                                                    <td className="px-6 py-4 text-sm text-slate-600">{row.type}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-sm font-bold text-slate-900 group-hover:text-[#1c51a1] transition-colors">{row.title}</div>
                                                        <div className="text-[11px] text-[#1c51a1] font-medium mt-0.5">PJ: {row.pj}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium">{row.currentStage}</span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className={`w-2 h-2 rounded-full ${st.dot}`} />
                                                            <span className={`text-xs font-semibold uppercase ${st.text}`}>{st.label}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`font-mono text-sm ${row.isOverdue ? 'text-rose-600 font-bold' : 'text-slate-600'}`}>{row.deadline}</span>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {filteredRekapData.length > limits.rekap && (
                            <div className="px-6 py-4 text-center border-t border-slate-50">
                                <button
                                    onClick={() => handleLoadMore('rekap')}
                                    className="px-4 py-2 text-xs font-bold text-[#1c51a1] hover:text-[#163d7a] bg-slate-50 hover:bg-slate-100 rounded-lg transition-all inline-flex items-center gap-1.5 shadow-sm border border-slate-200/60"
                                >
                                    <span className="material-symbols-outlined text-[16px]">expand_more</span>
                                    Tampilkan lebih banyak proyek
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Secondary analysis (matching Stitch layout) */}
                    {rekapData.length > 0 && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Top Productivity */}
                            <div className="bg-white rounded-xl p-6 border border-slate-200/60" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                                <div className="mb-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-bold text-slate-900">Top Produktivitas (Personil)</h4>
                                        <span className="material-symbols-outlined text-[15px] cursor-help text-[#1c51a1]" title="Skor dihitung dari tahapan yang diselesaikan (approvedAt) dalam periode yang dipilih.">info</span>
                                    </div>
                                    {/* Period selector inline */}
                                    <div className="flex gap-2">
                                        <select
                                            value={filterProdMonth === -1 ? '' : filterProdMonth}
                                            onChange={e => setFilterProdMonth(e.target.value === '' ? -1 : Number(e.target.value))}
                                            className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 focus:outline-none focus:border-[#1c51a1]"
                                        >
                                            <option value="">— Semua Bulan —</option>
                                            {MONTH_NAMES.map((name, idx) => (
                                                <option key={idx} value={idx}>{name}</option>
                                            ))}
                                        </select>
                                        <select
                                            value={filterProdYear}
                                            onChange={e => setFilterProdYear(Number(e.target.value))}
                                            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 focus:outline-none focus:border-[#1c51a1]"
                                        >
                                            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
                                                <option key={y} value={y}>{y}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                {produktivitasData.length === 0 ? (
                                    <p className="text-sm text-slate-400 text-center py-4">
                                        Belum ada data untuk {filterProdMonth === -1 ? `tahun ${filterProdYear}` : `${MONTH_NAMES[filterProdMonth]} ${filterProdYear}`}
                                    </p>
                                ) : (
                                    <div className="space-y-5">
                                        {produktivitasData.slice(0, 5).map((p, i) => (
                                            <div key={i}>
                                                <div className="flex justify-between items-end mb-2">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-lg ${p.avatarColor} flex items-center justify-center font-bold text-[10px] flex-shrink-0`}>
                                                            {initials(p.name)}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-900 leading-none">{p.name}</p>
                                                            <p className="text-[10px] text-slate-400 mt-0.5">{p.doneStages} tahap selesai</p>
                                                        </div>
                                                    </div>
                                                    <span className="text-[11px] font-bold text-[#1c51a1]">{p.totalScore} Poin</span>
                                                </div>
                                                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                                    <div className="bg-[#1c51a1] h-full rounded-full transition-all duration-500" style={{ width: `${p.completionRate}%` }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Stage Distribution */}
                            <div className="bg-white rounded-xl p-6 border border-slate-200/60" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                                <div className="flex items-center justify-between mb-5">
                                    <h4 className="font-bold text-slate-900">Distribusi Tahapan Proyek</h4>
                                    <span className="text-[11px] bg-slate-100 px-2 py-0.5 rounded uppercase font-bold text-slate-500">Global View</span>
                                </div>
                                {tahapanData.length === 0 ? (
                                    <p className="text-sm text-slate-400 text-center py-4">Belum ada data tahapan</p>
                                ) : (
                                    <div className="space-y-4">
                                        {tahapanData.slice(0, 6).map((row, i) => (
                                            <div key={i} className="space-y-1.5">
                                                <div className="flex justify-between text-xs font-medium text-slate-600">
                                                    <span>{row.name}</span>
                                                    <span>{row.count} Proyek</span>
                                                </div>
                                                <div className="w-full bg-slate-50 h-3 rounded-sm overflow-hidden">
                                                    <div
                                                        className={`${INDIGO_SHADES[Math.min(i, INDIGO_SHADES.length - 1)]} h-full transition-all duration-500`}
                                                        style={{ width: `${(row.count / maxTahapanCount) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ===== TAB 2: TERLAMBAT ===== */}
            {activeTab === 'terlambat' && (
                <div className="bg-white rounded-xl overflow-hidden border border-slate-200/60" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                    {terlambatData.length === 0 ? (
                        <EmptyState icon="check_circle" text="Tidak ada proyek terlambat" sub="Semua tahapan berjalan sesuai jadwal." />
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <TableHeader cols={['Judul Proyek', 'Tahap', 'PJ', 'Deadline', 'Keterlambatan']} />
                                    <tbody className="divide-y divide-slate-50">
                                        {terlambatData.slice(0, limits.terlambat).map((row, idx) => (
                                            <tr 
                                                key={idx} 
                                                onClick={() => navigate(`/admin/manajemen/proyek/${row.projectId}`)}
                                                className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="text-sm font-bold text-slate-900 group-hover:text-[#1c51a1] transition-colors">{row.title}</div>
                                                    <div className="text-[11px] text-slate-400 font-mono">{row.category}</div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-600">{row.stage}</td>
                                                <td className="px-6 py-4 text-sm text-[#1c51a1] font-medium">{row.pj}</td>
                                                <td className="px-6 py-4">
                                                    <span className="font-mono text-sm text-rose-600 font-bold">{row.deadline}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold text-white ${row.late > 7 ? 'bg-rose-500' : 'bg-amber-500'}`}>
                                                        {row.late} hari
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            
                            {terlambatData.length > limits.terlambat && (
                                <div className="px-6 py-4 text-center border-t border-slate-50">
                                    <button
                                        onClick={() => handleLoadMore('terlambat')}
                                        className="px-4 py-2 text-xs font-bold text-[#1c51a1] hover:text-[#163d7a] bg-slate-50 hover:bg-slate-100 rounded-lg transition-all inline-flex items-center gap-1.5 shadow-sm border border-slate-200/60"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">expand_more</span>
                                        Tampilkan lebih banyak proyek
                                    </button>
                                </div>
                            )}

                            <div className="px-6 py-3 bg-rose-50/50 border-t border-rose-100 flex gap-6 text-xs font-semibold text-rose-700">
                                <span>Total terlambat: {terlambatData.length}</span>
                                <span>Rata-rata: {Math.round(terlambatData.reduce((s, r) => s + r.late, 0) / terlambatData.length)} hari</span>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ===== TAB 3: PRODUKTIVITAS ===== */}
            {activeTab === 'produktivitas' && (
                <div className="bg-white rounded-xl overflow-hidden border border-slate-200/60" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                    {/* Header dengan period selector */}
                    <div className="px-6 py-4 border-b border-slate-50 flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h4 className="font-bold text-slate-900">Produktivitas Personil</h4>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Tahapan selesai pada <span className="font-semibold text-[#1c51a1]">
                                    {filterProdMonth === -1 ? `Semua Bulan ${filterProdYear}` : `${MONTH_NAMES[filterProdMonth]} ${filterProdYear}`}
                                </span>
                            </p>
                        </div>
                        <div className="flex gap-2 items-center">
                            <span className="text-xs text-slate-500 font-medium">Periode:</span>
                            <select
                                value={filterProdMonth === -1 ? '' : filterProdMonth}
                                onChange={e => setFilterProdMonth(e.target.value === '' ? -1 : Number(e.target.value))}
                                className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5 font-medium text-slate-700 focus:outline-none focus:border-[#1c51a1]"
                            >
                                <option value="">— Semua Bulan —</option>
                                {MONTH_NAMES.map((name, idx) => (
                                    <option key={idx} value={idx}>{name}</option>
                                ))}
                            </select>
                            <select
                                value={filterProdYear}
                                onChange={e => setFilterProdYear(Number(e.target.value))}
                                className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5 font-medium text-slate-700 focus:outline-none focus:border-[#1c51a1]"
                            >
                                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    {produktivitasData.length === 0 ? (
                        <EmptyState icon="person"
                            text={filterProdMonth === -1
                                ? `Tidak ada data untuk tahun ${filterProdYear}`
                                : `Tidak ada data untuk ${MONTH_NAMES[filterProdMonth]} ${filterProdYear}`}
                            sub="Belum ada tahapan yang diselesaikan pada periode ini." />
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <TableHeader cols={['Nama Personil (Klik untuk Detail)', 'Proyek Aktif', 'Tahap yang Dikerjakan', 'Tahap Selesai', 'Total Skor / Poin', 'Completion Rate']} />
                                    <tbody className="divide-y divide-slate-50">
                                        {produktivitasData.slice(0, limits.produktivitas).map((row, idx) => {
                                            const isExpanded = expandedPersonil === row.id
                                            return (
                                                <React.Fragment key={idx}>
                                                    <tr 
                                                        onClick={() => togglePersonilExpand(row.id)}
                                                        className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                                                    >
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-8 h-8 rounded-lg ${row.avatarColor} flex items-center justify-center font-bold text-[10px]`}>
                                                                    {initials(row.name)}
                                                                </div>
                                                                <div>
                                                                    <span className="text-sm font-bold text-slate-900 group-hover:text-[#1c51a1] transition-colors">{row.name}</span>
                                                                    <span className="material-symbols-outlined text-[16px] text-slate-400 align-middle ml-1.5 transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>keyboard_arrow_down</span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className={`text-sm font-bold ${row.activeProjectsCount > 0 ? 'text-[#1c51a1]' : 'text-slate-400'}`}>{row.activeProjectsCount}</span>
                                                        </td>
                                                        <td className="px-6 py-4 text-xs text-slate-500 max-w-[260px] truncate">{row.activeStages}</td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className="text-sm font-bold text-slate-700">{row.doneStages}</span>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className="text-sm font-bold text-emerald-600">{row.totalScore} Poin</span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-2">
                                                                <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                                                    <div
                                                                        className={`h-full rounded-full ${row.completionRate >= 70 ? 'bg-emerald-500' : row.completionRate >= 40 ? 'bg-amber-400' : 'bg-rose-500'}`}
                                                                        style={{ width: `${row.completionRate}%` }}
                                                                    />
                                                                </div>
                                                                <span className="text-xs font-bold text-[#1c51a1] w-8 text-right">{row.completionRate}%</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                    {isExpanded && (
                                                        <tr className="bg-slate-50/40">
                                                            <td colSpan={6} className="px-8 py-4 border-y border-slate-100">
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                                    {/* Proyek Aktif */}
                                                                    <div>
                                                                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                                                                            <span className="material-symbols-outlined text-[16px] text-[#1c51a1]">run_circle</span>
                                                                            Proyek Aktif & Tahap Pekerjaan ({row.activeProjectsCount})
                                                                        </div>
                                                                        {row.activeProjectsList.length === 0 ? (
                                                                            <div className="text-xs text-slate-400 italic py-2 bg-white rounded border border-slate-100 text-center">Tidak ada proyek aktif yang ditugaskan</div>
                                                                        ) : (
                                                                            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                                                                                {row.activeProjectsList.map((p, pIdx) => {
                                                                                    const st = STATUS_STYLE[p.status] || STATUS_STYLE.draft
                                                                                    return (
                                                                                        <div 
                                                                                            key={pIdx} 
                                                                                            onClick={() => navigate(`/admin/manajemen/proyek/${p.projectId}`)}
                                                                                            className="flex items-center justify-between p-2.5 bg-white rounded border border-slate-100 hover:border-slate-200 hover:shadow-sm cursor-pointer transition-all"
                                                                                        >
                                                                                            <div>
                                                                                                <div className="text-xs font-bold text-slate-800 hover:text-[#1c51a1]">{p.projectTitle}</div>
                                                                                                <div className="text-[10px] text-slate-500 mt-0.5">Tahap: <span className="font-semibold text-slate-700">{p.stageLabel}</span></div>
                                                                                            </div>
                                                                                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${st.text} bg-slate-50`}>
                                                                                                {st.label}
                                                                                            </span>
                                                                                        </div>
                                                                                    )
                                                                                })}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    {/* Proyek Selesai */}
                                                                    <div>
                                                                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                                                                            <span className="material-symbols-outlined text-[16px] text-emerald-600">check_circle</span>
                                                                            Keterlibatan Proyek Selesai ({row.doneProjectsCount})
                                                                        </div>
                                                                        {row.doneProjectsList.length === 0 ? (
                                                                            <div className="text-xs text-slate-400 italic py-2 bg-white rounded border border-slate-100 text-center">Belum ada proyek selesai yang diselesaikan</div>
                                                                        ) : (
                                                                            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                                                                                {row.doneProjectsList.map((p, pIdx) => (
                                                                                    <div 
                                                                                        key={pIdx} 
                                                                                        onClick={() => navigate(`/admin/manajemen/proyek/${p.projectId}`)}
                                                                                        className="flex items-center justify-between p-2.5 bg-white rounded border border-slate-100 hover:border-slate-200 hover:shadow-sm cursor-pointer transition-all"
                                                                                    >
                                                                                        <div>
                                                                                            <div className="text-xs font-bold text-slate-800 hover:text-[#1c51a1]">{p.projectTitle}</div>
                                                                                            <div className="text-[10px] text-slate-400 mt-0.5">Terlibat pada tahap: <span className="font-medium">{p.stageLabel}</span></div>
                                                                                        </div>
                                                                                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase">Selesai</span>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            
                            {produktivitasData.length > limits.produktivitas && (
                                <div className="px-6 py-4 text-center border-t border-slate-50">
                                    <button
                                        onClick={() => handleLoadMore('produktivitas')}
                                        className="px-4 py-2 text-xs font-bold text-[#1c51a1] hover:text-[#163d7a] bg-slate-50 hover:bg-slate-100 rounded-lg transition-all inline-flex items-center gap-1.5 shadow-sm border border-slate-200/60"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">expand_more</span>
                                        Tampilkan lebih banyak personil
                                    </button>
                                </div>
                            )}

                            <div className="px-6 py-3 bg-slate-50/30 border-t border-slate-50 flex gap-6 text-xs font-semibold text-slate-600">
                                <span>Total Personil: {produktivitasData.length}</span>
                                <span className="text-emerald-600">Total Proyek Selesai: {produktivitasData.reduce((s, r) => s + r.doneProjectsCount, 0)}</span>
                                <span className="text-[#1c51a1]">Total Skor Kumulatif: {produktivitasData.reduce((s, r) => s + r.totalScore, 0)} Poin</span>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ===== TAB 4: TAHAPAN ===== */}
            {activeTab === 'tahapan' && (
                <div className="space-y-6">
                    <div className="bg-white rounded-xl overflow-hidden border border-slate-200/60" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                        {tahapanData.length === 0 ? <EmptyState icon="schema" text="Tidak ada data tahapan" sub="Semua proyek sudah selesai atau belum ada proyek aktif." /> : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <TableHeader cols={['Nama Tahap (Klik untuk Detail Proyek)', 'Jumlah Proyek Aktif']} />
                                        <tbody className="divide-y divide-slate-50">
                                            {tahapanData.slice(0, limits.tahapan).map((row, idx) => {
                                                const isExpanded = expandedTahapan === row.name
                                                return (
                                                    <React.Fragment key={idx}>
                                                        <tr 
                                                            onClick={() => toggleTahapanExpand(row.name)}
                                                            className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                                                        >
                                                            <td className="px-6 py-4">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-sm font-bold text-slate-900">{row.name}</span>
                                                                    <span className="material-symbols-outlined text-[16px] text-slate-400 align-middle transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>keyboard_arrow_down</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <span className="px-3 py-1 rounded-full text-xs font-bold text-white bg-[#1c51a1]">{row.count}</span>
                                                            </td>
                                                        </tr>
                                                        {isExpanded && (
                                                            <tr className="bg-slate-50/40">
                                                                <td colSpan={2} className="px-8 py-4 border-y border-slate-100">
                                                                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                                                        <span className="material-symbols-outlined text-[16px] text-[#1c51a1]">layers</span>
                                                                        Daftar Proyek Aktif di Tahap "{row.name}" ({row.count})
                                                                    </div>
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                        {row.projects.map((proj, pIdx) => {
                                                                            const st = STATUS_STYLE[proj.status] || STATUS_STYLE.draft
                                                                            return (
                                                                                <div 
                                                                                    key={pIdx}
                                                                                    onClick={() => navigate(`/admin/manajemen/proyek/${proj.projectId}`)}
                                                                                    className="p-3.5 bg-white rounded-lg border border-slate-100 hover:border-slate-200 hover:shadow-sm cursor-pointer transition-all flex flex-col justify-between"
                                                                                >
                                                                                    <div>
                                                                                        <div className="flex justify-between items-start gap-2 mb-1.5">
                                                                                            <h5 className="text-xs font-bold text-slate-800 hover:text-[#1c51a1] leading-tight line-clamp-2">{proj.projectTitle}</h5>
                                                                                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase whitespace-nowrap ${st.text} bg-slate-50`}>
                                                                                                {st.label}
                                                                                            </span>
                                                                                        </div>
                                                                                        <span className="text-[9px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-medium">{proj.category}</span>
                                                                                    </div>
                                                                                    <div className="mt-3 pt-2.5 border-t border-slate-50 flex justify-between items-center text-[10px] text-slate-400">
                                                                                        <span>PJ: <strong className="text-slate-700 font-semibold">{proj.pjName}</strong></span>
                                                                                        <span className={proj.isOverdue ? 'text-rose-600 font-bold' : 'text-slate-500'}>
                                                                                            Tenggat: {proj.deadline}
                                                                                        </span>
                                                                                    </div>
                                                                                </div>
                                                                            )
                                                                        })}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </React.Fragment>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {tahapanData.length > limits.tahapan && (
                                    <div className="px-6 py-4 text-center border-t border-slate-50">
                                        <button
                                            onClick={() => handleLoadMore('tahapan')}
                                            className="px-4 py-2 text-xs font-bold text-[#1c51a1] hover:text-[#163d7a] bg-slate-50 hover:bg-slate-100 rounded-lg transition-all inline-flex items-center gap-1.5 shadow-sm border border-slate-200/60"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">expand_more</span>
                                            Tampilkan lebih banyak tahapan
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ===== TAB 5: SELESAI ===== */}
            {activeTab === 'selesai' && (
                <div className="bg-white rounded-xl overflow-hidden border border-slate-200/60" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                    {selesaiData.length === 0 ? <EmptyState icon="check_circle" text="Belum ada proyek selesai" sub="Proyek yang semua tahapannya telah diselesaikan akan muncul di sini." /> : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <TableHeader cols={['Judul Proyek', 'Jenis Proyek', 'PJ', 'Tanggal Selesai']} />
                                    <tbody className="divide-y divide-slate-50">
                                        {selesaiData.slice(0, limits.selesai).map((row, idx) => (
                                            <tr 
                                                key={idx} 
                                                onClick={() => navigate(`/admin/manajemen/proyek/${row.id}`)}
                                                className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="text-sm font-bold text-slate-900 group-hover:text-[#1c51a1] transition-colors">{row.title}</div>
                                                    <div className="text-[11px] text-slate-400">{row.category}</div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-600">{row.type}</td>
                                                <td className="px-6 py-4 text-sm text-[#1c51a1] font-medium">{row.pj}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="material-symbols-outlined text-[14px] text-emerald-500">event_available</span>
                                                        <span className="text-sm text-slate-600">{row.completedAt}</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {selesaiData.length > limits.selesai && (
                                <div className="px-6 py-4 text-center border-t border-slate-50">
                                    <button
                                        onClick={() => handleLoadMore('selesai')}
                                        className="px-4 py-2 text-xs font-bold text-[#1c51a1] hover:text-[#163d7a] bg-slate-50 hover:bg-slate-100 rounded-lg transition-all inline-flex items-center gap-1.5 shadow-sm border border-slate-200/60"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">expand_more</span>
                                        Tampilkan lebih banyak proyek
                                    </button>
                                </div>
                            )}

                            <div className="px-6 py-3 bg-emerald-50/50 border-t border-emerald-100">
                                <span className="text-xs font-bold text-emerald-700">Total Selesai: {selesaiData.length}</span>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}
