import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../../../context/AppContext'
import { CATEGORIES, STATUS_LABELS } from '../../../data/categories'
import { api } from '../../../services/api'
import { useDialog } from '../../../context/DialogContext'
import Toast from '../../../components/Toast'

export default function ProjectDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()
    const { projects, updateProject, deleteProject, updateStage, addStageNote, createStage, reorderStages, addNotification, isAdmin, isReviewer, currentUser, categoriesMap, refreshData } = useApp()
    const { showAlert, showConfirm } = useDialog()
    const discussionRef = useRef(null)
    const isDraggingRef = useRef(false)
    const activeStageItemRef = useRef(null)
    const [draggedStageIdx, setDraggedStageIdx] = useState(null)
    const [dragOverStageIdx, setDragOverStageIdx] = useState(null)
    const [isReordering, setIsReordering] = useState(false)

    const getStageDynamicScore = (proj, stg, catsMap = categoriesMap) => {
        if (!proj || !stg) return 0
        const catKey = proj.category?.toLowerCase() || 'lainnya'

        // 1. Jika stg.score sudah terdefinisi di database (termasuk 0 atau 5),
        // gunakan stg.score tersebut terlepas dari statusnya (done/active/revision/review)
        // agar skor yang sudah dikoreksi Admin tidak pernah reset kembali ke master data!
        if (stg.score !== undefined && stg.score !== null) {
            return Number(stg.score)
        }

        if (['lainnya', 'promosi', 'bimtek'].includes(catKey)) {
            return Number(stg.score) || 0
        } else {
            const masterStages = catsMap?.[catKey]?.stages || []
            const masterStage = masterStages.find(s => s.label?.trim().toLowerCase() === stg.label?.trim().toLowerCase())
            
            if (masterStage && masterStage.score !== undefined) {
                if (masterStage.perPageScore && masterStage.perPageScore > 0 && proj.pageCount && proj.pageCount > 0) {
                    const multiplier = Number(masterStage.pageMultiplier) || 1
                    return Math.round(((proj.pageCount / multiplier) * Number(masterStage.perPageScore)) * 100) / 100
                }
                
                return Number(masterStage.score) || 0
            }

            return Number(stg.score) || 0
        }
    }

    const project = projects.find(p => p.id === id)
    const [selectedStageIdx, setSelectedStageIdx] = useState(null)
    const [noteText, setNoteText] = useState('')
    const [noteAttachment, setNoteAttachment] = useState(null)
    const [isUploadingNote, setIsUploadingNote] = useState(false)
    const [resultLink, setResultLink] = useState(null)
    const [localProgress, setLocalProgress] = useState(null)
    const [showReviewConfirm, setShowReviewConfirm] = useState(false)
    const [showUsulanModal, setShowUsulanModal] = useState(false)
    const [usulanAction, setUsulanAction] = useState('')
    const [usulanConfirmed, setUsulanConfirmed] = useState(false)
    const [editingStageId, setEditingStageId] = useState(null)
    const [editingStageLabel, setEditingStageLabel] = useState('')
    const [usulanNote, setUsulanNote] = useState('')
    const [usulanScore, setUsulanScore] = useState(0)

    const stages = project?.stages || []
    const getCurrentStageIdx = (proj) => {
        if (!proj?.stages || proj.stages.length === 0) return 0
        const idx = proj.stages.findIndex(s =>
            s.status !== 'done' && s.status !== 'archived'
        )
        return idx >= 0 ? idx : proj.stages.length - 1
    }
    const activeStageIdx = selectedStageIdx !== null ? selectedStageIdx : getCurrentStageIdx(project)
    const activeStage = stages[activeStageIdx]

    // Reset local input states when active stage changes to prevent state leakage/autofill carryover
    useEffect(() => {
        setResultLink(null)
        setLocalProgress(null)
        setIsEditingDescription(false)
        setEditingDescriptionValue('')
        
        // Tandai catatan tahapan ini sebagai telah dibaca
        if (activeStage?.id) {
            try {
                const LS_KEY = 'note_last_seen'
                const lastSeen = JSON.parse(localStorage.getItem(LS_KEY) || '{}')
                lastSeen[activeStage.id] = new Date().toISOString()
                localStorage.setItem(LS_KEY, JSON.stringify(lastSeen))
            } catch (e) {}
        }
    }, [activeStageIdx, activeStage?.id, activeStage?.notes?.length])

    // Auto-scroll timeline stage list so the active stage is visible
    useEffect(() => {
        if (activeStageItemRef.current) {
            activeStageItemRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
            })
        }
    }, [activeStageIdx])

    // Auto-select stage dari query param ?stageId=xxx (navigasi dari FloatingNoteAlert)
    useEffect(() => {
        const targetStageId = searchParams.get('stageId')
        if (!targetStageId || !stages.length) return
        const idx = stages.findIndex(s => s.id === targetStageId)
        if (idx >= 0) {
            setSelectedStageIdx(idx)
            // Hapus query param dari URL agar tidak tertinggal saat user navigasi manual
            setSearchParams({}, { replace: true })
            // Scroll ke section catatan & diskusi setelah render
            setTimeout(() => {
                discussionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }, 400)
        }
    }, [searchParams, stages])

    // QC modal states
    const [showQcModal, setShowQcModal] = useState(false)
    const [qcAction, setQcAction] = useState('') // 'approve' or 'revise'
    const [qcConfirmed, setQcConfirmed] = useState(false)
    const [qcScore, setQcScore] = useState(0)
    const [revisionNote, setRevisionNote] = useState('')
    const [isApprovingQc, setIsApprovingQc] = useState(false)

    // Next stage assignment
    const [nextStageIdx, setNextStageIdx] = useState('')
    const [nextPjId, setNextPjId] = useState('')
    const [nextDeadline, setNextDeadline] = useState('')
    // Add stage for lainnya
    const [newStageName, setNewStageName] = useState('')
    const [newStageDescription, setNewStageDescription] = useState('')
    const [showAddStage, setShowAddStage] = useState(false)
    const [isEditingDescription, setIsEditingDescription] = useState(false)
    const [editingDescriptionValue, setEditingDescriptionValue] = useState('')

    // Duplikat proyek
    const [showDuplicateModal, setShowDuplicateModal] = useState(false)
    const [duplicateTitle, setDuplicateTitle] = useState('')
    const [isDuplicating, setIsDuplicating] = useState(false)

    // Assign pending stage modal
    const [showAssignModal, setShowAssignModal] = useState(false)
    const [assignStageIdx, setAssignStageIdx] = useState(null)
    const [assignPjId, setAssignPjId] = useState('')
    const [assignCoPjId, setAssignCoPjId] = useState('')
    const [assignCoPjIds, setAssignCoPjIds] = useState([])
    const [assignDeadline, setAssignDeadline] = useState('')
    const [assignScore, setAssignScore] = useState(0)

    // Per-stage inline deadline input (Terbitan)
    const [stageDeadlineInput, setStageDeadlineInput] = useState({})
    const [stageDeadlineErrors, setStageDeadlineErrors] = useState({})

    // API-driven PJ candidates
    const [candidates, setCandidates] = useState([])
    const [candidatesLoading, setCandidatesLoading] = useState(false)
    const [selectedWorkload, setSelectedWorkload] = useState(null)
    // For QC next stage candidates
    const [nextCandidates, setNextCandidates] = useState([])
    const [nextCandidatesLoading, setNextCandidatesLoading] = useState(false)
    const [nextSelectedWorkload, setNextSelectedWorkload] = useState(null)

    // Auto-update selected workload warning when candidates list or assigned PJ changes
    useEffect(() => {
        if (assignPjId && candidates.length > 0) {
            const candidate = candidates.find(c => c.id === assignPjId)
            setSelectedWorkload(candidate?.activeStages > 0 ? candidate : null)
        } else {
            setSelectedWorkload(null)
        }
    }, [assignPjId, candidates])

    // Workload level helper
    const getWorkloadLevel = (activeStages) => {
        if (!activeStages || activeStages === 0) return null
        if (activeStages === 1) return { label: 'Sibuk', count: 1 }
        if (activeStages === 2) return { label: 'Puyeng', count: 2 }
        if (activeStages === 3) return { label: 'Vertigo', count: 3 }
        return { label: 'Bentar lagi tipes', count: activeStages }
    }

    // Archive confirm
    const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)
    const [showArchiveProjectConfirm, setShowArchiveProjectConfirm] = useState(false)

    // Delete project confirm
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [archiveStageIdx, setArchiveStageIdx] = useState(null)

    // Revision modal state
    const [showRevisionModal, setShowRevisionModal] = useState(false)
    const [revisionReason, setRevisionReason] = useState('')
    const [isSubmittingRevision, setIsSubmittingRevision] = useState(false)

    // Edit project modal
    const [showEditProjectModal, setShowEditProjectModal] = useState(false)
    const [editProjectFields, setEditProjectFields] = useState({})

    // Toast notifications
    const [toast, setToast] = useState({ open: false, message: '', type: 'success' })
    const showToast = (message, type = 'success') => setToast({ open: true, message, type })
    const closeToast = () => setToast(t => ({ ...t, open: false }))

    // Use a ref so the !project guard can read deletion status synchronously (before React re-renders)
    const isDeletingRef = useRef(false)

    // Fetch candidates from API for a stage — declared here (before early return) to satisfy Rules of Hooks
    const fetchCandidates = useCallback(async (stageId, setter, loadingSetter) => {
        loadingSetter(true)
        try {
            const data = await api.stages.getCandidates(stageId)
            setter(data.candidates || [])
        } catch (e) {
            console.error('Failed to fetch candidates:', e)
            setter([])
        } finally {
            loadingSetter(false)
        }
    }, [])

    if (!project) {
        if (isDeletingRef.current) {
            return (
                <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'white', zIndex: 999 }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🗑️</div>
                    <h3 style={{ fontWeight: 700, fontSize: '1.1rem', color: '#0f172a' }}>Menghapus proyek...</h3>
                    <Toast message={toast.message} type={toast.type} open={toast.open} onClose={closeToast} />
                </div>
            )
        }
        return (
            <div className="card" style={{ maxWidth: '600px', margin: '2rem auto' }}>
                <div className="empty-state" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                    <div className="empty-icon" style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>Proyek tidak ditemukan / telah dihapus</h3>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Proyek dengan ID "{id}" tidak ada.</p>
                    <button className="btn btn-primary" onClick={() => navigate('/admin/manajemen/proyek')}>Kembali ke Daftar Proyek</button>
                </div>
                <Toast message={toast.message} type={toast.type} open={toast.open} onClose={closeToast} />
            </div>
        )
    }


    // PJ lookup: use enriched pj relation from API, with fallback
    const pj = activeStage?.pjId ? (activeStage.pj ? { id: activeStage.pj.id, name: activeStage.pj.name, avatar: activeStage.pj.avatarInitials || activeStage.pj.name?.substring(0, 2).toUpperCase() } : { id: activeStage.pjId, name: activeStage.pj?.name || 'Tunggu Penugasan...', avatar: '??' }) : null
    
    // Collaborator / Co-PJ list lookup (maksimal 2 orang)
    const activeCoPjIds = (activeStage?.coPjIds && Array.isArray(activeStage.coPjIds) && activeStage.coPjIds.length > 0)
        ? activeStage.coPjIds.filter(id => id && id !== activeStage?.pjId).slice(0, 2)
        : (activeStage?.coPjId && activeStage.coPjId !== activeStage?.pjId ? [activeStage.coPjId] : [])
    
    const coPjList = activeCoPjIds.map((id, idx) => {
        if (activeStage?.coPjs && Array.isArray(activeStage.coPjs)) {
            const foundCo = activeStage.coPjs.find(u => u.id === id)
            if (foundCo) {
                return {
                    id: foundCo.id,
                    name: foundCo.name,
                    avatar: foundCo.avatarInitials || (foundCo.name ? foundCo.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '??')
                }
            }
        }
        if (activeStage?.coPj && activeStage.coPj.id === id) {
            return {
                id: activeStage.coPj.id,
                name: activeStage.coPj.name,
                avatar: activeStage.coPj.avatarInitials || (activeStage.coPj.name ? activeStage.coPj.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '??')
            }
        }
        const found = candidates.find(c => c.id === id)
        if (found) {
            return {
                id: found.id,
                name: found.name,
                avatar: found.avatarInitials || (found.name ? found.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '??')
            }
        }
        return {
            id,
            name: `Kolaborator ${idx + 1}`,
            avatar: '??'
        }
    })
    const coPj = coPjList[0] || null

    // isMyStage: true for the assigned PJ or any collaborator of the active stage (admin or user)
    const isMyStage = currentUser?.id === activeStage?.pjId || activeCoPjIds.includes(currentUser?.id)
    // Any user assigned to at least one stage of this project can edit/delete the project
    const isProjectPJ = stages.some(s => {
        const sCoPjIds = (s.coPjIds && Array.isArray(s.coPjIds)) ? s.coPjIds : (s.coPjId ? [s.coPjId] : [])
        return s.pjId === currentUser?.id || sCoPjIds.includes(currentUser?.id)
    })
    const isProjectCreator = currentUser?.id === project.createdBy;
    const canEditProject = isAdmin || isProjectCreator || isProjectPJ

    // --- Custom Role: PJ Sunting sebagai Reviewer Tata Letak Naskah ---
    const isTataLetakTerbitan = project.category === 'terbitan' && activeStage?.label === 'Tata Letak Naskah';
    const isTataLetakReviewer = isTataLetakTerbitan && stages.find(s => s.label === 'Penyuntingan')?.pjId === currentUser?.id;
    const canReviewStage = isAdmin;

    const catObj = categoriesMap?.[project.category] || CATEGORIES[project.category]
    const isFlexibleCategory = !['terbitan', 'medsos', 'keuangan'].includes(project.category) || catObj?.custom === true
    const isLainnya = isFlexibleCategory
    const isTerbitan = project.category === 'terbitan'
    const isUserReviewer = isReviewer || currentUser?.isReviewer === true || currentUser?.is_reviewer === true || currentUser?.role === 'reviewer'
    const canReorderStages = isFlexibleCategory && stages.length > 1 && (isAdmin || isUserReviewer || isProjectCreator || isProjectPJ) && project.status !== 'archived'
    // Kategori sequential dengan PJ berbeda per tahap (seperti Terbitan)
    const isSequentialPerPJ = ['terbitan'].includes(project.category)

    // Sequential workflow check: can only edit stage if all previous stages are done
    const isSequential = catObj?.workflow === 'sequential'
    
    // Check if previous stages are done based on special Terbitan rules
    const checkPrevStagesDone = (idx) => {
        if (idx === 0) return true
        const stage = stages[idx]
        if (isTerbitan) {
            const getStage = (keyword) => stages.find(s => s.label?.trim().toLowerCase().includes(keyword.toLowerCase()))
            const isDone = (keyword) => {
                const found = getStage(keyword)
                if (!found) return true
                return found.status === 'done' || found.status === 'archived'
            }

            const normLabel = stage.label?.trim().toLowerCase() || ''

            if (normLabel.includes('kelengkapan naskah')) return true
            if (normLabel.includes('surat penerimaan terbitan')) return isDone('kelengkapan naskah')
            if (normLabel.includes('penyuntingan')) return isDone('kelengkapan naskah')
            if (normLabel.includes('tata letak naskah')) return isDone('penyuntingan')
            if (normLabel.includes('penginputan nomor induk') || normLabel.includes('nip')) return isDone('kelengkapan naskah')
            if (normLabel.includes('desain sampul')) return isDone('kelengkapan naskah')

            if (normLabel.includes('pembuatan dummy') && !normLabel.includes('final')) {
                return isDone('tata letak naskah') && isDone('desain sampul') && isDone('penyuntingan') && isDone('penginputan nomor induk')
            }
            if (normLabel.includes('kendali kualitas')) {
                return isDone('pembuatan dummy') && isDone('tata letak naskah') && isDone('desain sampul') && isDone('penyuntingan') && isDone('penginputan nomor induk') && isDone('surat penerimaan terbitan')
            }
            if (normLabel.includes('penerbitan isbn') || normLabel.includes('isbn')) {
                return isDone('kendali kualitas')
            }
            if (normLabel.includes('dummy final')) {
                return isDone('penerbitan isbn')
            }
            if (normLabel.includes('unggah ke sipena') || normLabel.includes('sipena')) {
                return isDone('penerbitan isbn') && isDone('kendali kualitas')
            }
            if (normLabel.includes('surat keterangan terbit')) {
                return isDone('unggah ke sipena')
            }
            if (normLabel.includes('serah terima karya')) {
                return isDone('unggah ke sipena')
            }

            return false
        }
        return stages.slice(0, idx).every(s => s.status === 'done' || s.status === 'archived')
    }
    const allPrevDone = checkPrevStagesDone(activeStageIdx)

    // isStageEditable: Terbitan juga mensyaratkan deadline sudah diisi
    // Untuk isSequentialPerPJ: PJ bisa edit jika statusnya active/revision dan tahapan sebelumnya done
    // (gerbang sekuensial dijaga admin via QC Approve yang mengaktifkan tahap berikutnya)
    const isRequiredDeadline = ['terbitan', 'medsos', 'keuangan'].includes(project.category)
    const deadlineMet = !isRequiredDeadline || !!activeStage?.deadline
    const isStageEditable = isMyStage && deadlineMet && activeStage?.status !== 'done' && activeStage?.status !== 'archived' && (
        isLainnya ||
        (isSequentialPerPJ
            ? ((activeStage?.status === 'active' || activeStage?.status === 'revision') && allPrevDone)
            : (activeStage?.status === 'active' || activeStage?.status === 'revision' || activeStage?.status === 'draft') && (!isSequential || allPrevDone)
        )
    )

    const isOverdue = (stage) => {
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
        return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    }

    const getDeadlineCountdown = (deadline) => {
        if (!deadline) return null
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
        const diffMs = dl - today
        const diff = Math.round(diffMs / 86400000)
        if (diff < 0) return { text: `${Math.abs(diff)} hari terlambat`, overdue: true }
        if (diff === 0) return { text: 'Hari ini', overdue: false }
        return { text: `${diff} hari lagi`, overdue: false }
    }

    const getStatusBadge = (status) => {
        const map = {
            draft: 'badge-draft', active: 'badge-active', review: 'badge-review',
            revision: 'badge-revision', done: 'badge-done', archived: 'badge-archived'
        }
        return map[status] || 'badge-draft'
    }

    // PJ: Update progress (local state only — requires save)
    const handleProgress = (progress) => {
        if (!isStageEditable) return // only PJ can change on editable stage
        if (activeStage.status === 'review' || activeStage.status === 'done' || activeStage.status === 'archived' || activeStage.proposalStatus === 'pending') return // locked
        setLocalProgress(progress)
    }

    // PJ: Save progress to backend
    const handleSaveProgress = () => {
        if (localProgress === null) return
        if (activeStage.status === 'review' || activeStage.status === 'done' || activeStage.status === 'archived' || activeStage.proposalStatus === 'pending') {
            showToast('Progress terkunci — usulan sedang dalam proses review', 'warning')
            return
        }
        const newStatus = (localProgress > 0 || !isSequential) ? 'active' : 'draft'
        updateStage(activeStage.id, { progress: localProgress, status: newStatus })
        setLocalProgress(null)
    }

    // PJ: Submit for review (with confirmation)
    const handleSubmitReview = () => {
        if (!isStageEditable) return
        if (!resultLink && !activeStage.resultLink) {
            showAlert({
                title: 'Tautan Wajib Diisi',
                message: 'Wajib mengisi Link Hasil Kerja sebelum mengajukan review!',
                type: 'warning'
            })
            return
        }
        updateStage(activeStage.id, {
            status: 'review',
            progress: 100,
            resultLink: resultLink || activeStage.resultLink
        })
        addNotification({
            type: 'review',
            title: 'Ajukan Review',
            message: `${currentUser.name} mengajukan review untuk tahap "${activeStage.label}" di proyek "${project.title}".`,
            projectId: project.id
        })
        setShowReviewConfirm(false)
        setLocalProgress(null)
    }

    // Admin: QC Approve
    const handleAjukanUsulan = async () => {
        try {
            await updateStage(activeStage.id, { proposalStatus: 'pending', progress: 100 })
            setLocalProgress(100)
            showToast('Usulan berhasil diajukan ke PJ Penyuntingan!', 'success')
        } catch(e) {
            showToast('Gagal mengajukan usulan', 'error')
        }
    }

    const handleUsulanSubmit = async () => {
        try {
            if (usulanAction === 'accept') {
                if (!usulanConfirmed) {
                    showToast('Harap konfirmasi poin terlebih dahulu', 'error')
                    return
                }
                await updateStage(activeStage.id, { proposalStatus: 'accepted', score: Number(usulanScore) })
                showToast('Usulan diterima! Penata Letak kini dapat mengajukan review.', 'success')
            } else if (usulanAction === 'revise') {
                if (!usulanNote.trim()) {
                    showToast('Catatan revisi tidak boleh kosong', 'error')
                    return
                }
                const existingNotes = Array.isArray(activeStage.notes) ? activeStage.notes : []
                await updateStage(activeStage.id, { 
                    proposalStatus: 'rejected',
                    notes: [
                        ...existingNotes,
                        { from: currentUser?.name || 'Reviewer', text: `[Revisi Usulan] ${usulanNote.trim()}`, time: new Date().toISOString() }
                    ]
                })
                showToast('Usulan dikembalikan untuk direvisi', 'success')
            }
            setShowUsulanModal(false)
            setUsulanNote('')
        } catch (e) {
            console.error('Failed to submit usulan:', e)
            showToast('Gagal memproses usulan', 'error')
        }
    }

    const handleApprove = async () => {
        if (isApprovingQc) return
        setIsApprovingQc(true)
        try {
            // 1. Mark current stage as done & simpan skor akhir secara permanen agar tidak berubah di masa depan
            console.log(`[handleApprove] activeStage.id=${activeStage.id}, qcScore=${qcScore}, typeof=${typeof qcScore}`)
            const cleanQcScore = typeof qcScore === 'string' ? (parseFloat(qcScore.replace(',', '.')) || 0) : (Number(qcScore) || 0)
            await updateStage(activeStage.id, { status: 'done', score: cleanQcScore })

            // 2. Activate next stage (only for sequential workflow)
            if (isSequential && nextStageIdx !== '' && stages[parseInt(nextStageIdx)]) {
                const targetIdx = parseInt(nextStageIdx)
                // Mark all intermediate stages as done (skipped)
                for (let i = activeStageIdx + 1; i < targetIdx; i++) {
                    if (stages[i] && stages[i].status !== 'done' && stages[i].status !== 'archived') {
                        await updateStage(stages[i].id, { status: 'done', progress: 100 })
                    }
                }
                // Activate the selected stage (hanya jika belum done/archived)
                const nextStage = stages[targetIdx]
                if (nextStage.status !== 'done' && nextStage.status !== 'archived') {
                    // Gunakan PJ baru jika dipilih, jika tidak pertahankan PJ lama dari database/state
                    // (project.singlePJ akan mem-propagate PJ dari tahap sebelumnya)
                    const pjId = nextPjId || (project.singlePJ ? activeStage.pjId : nextStage.pjId)
                    // Gunakan Deadline baru jika diisi, jika tidak pertahankan Deadline lama
                    const deadline = nextDeadline || nextStage.deadline
                    await updateStage(nextStage.id, {
                        status: 'active',
                        ...(pjId ? { pjId } : {}),
                        ...(deadline ? { deadline } : {})
                    })
                }
            } else if (isSequential) {
                // --- CUSTOM HYBRID WORKFLOW UNTUK TERBITAN ---
                if (project.category === 'terbitan') {
                    let tempStages = stages.map(s => s.id === activeStage.id ? { ...s, status: 'done' } : s);
                    
                    const isStageDone = (exactLabel) => {
                        const found = tempStages.find(s => s.label?.trim().toLowerCase() === exactLabel.toLowerCase());
                        if (!found) return true;
                        return found.status === 'done' || found.status === 'archived';
                    };

                    const shouldStageBeActive = (label) => {
                        const norm = label.trim().toLowerCase();
                        if (norm === 'kelengkapan naskah') return true;
                        if (norm === 'pembuatan surat penerimaan terbitan') return isStageDone('kelengkapan naskah');
                        if (norm === 'penyuntingan') return isStageDone('kelengkapan naskah');
                        if (norm === 'tata letak naskah') return isStageDone('penyuntingan');
                        if (norm === 'penginputan nomor induk penerbitan') return isStageDone('kelengkapan naskah');
                        if (norm === 'desain sampul') return isStageDone('kelengkapan naskah');
                        if (norm === 'pembuatan dummy') {
                            return isStageDone('tata letak naskah') && isStageDone('desain sampul') && isStageDone('penginputan nomor induk penerbitan');
                        }
                        if (norm === 'kendali kualitas') {
                            return isStageDone('pembuatan dummy') && isStageDone('pembuatan surat penerimaan terbitan');
                        }
                        if (norm === 'penerbitan isbn') {
                            return isStageDone('kendali kualitas');
                        }
                        if (norm === 'pembuatan dummy final') {
                            return isStageDone('penerbitan isbn');
                        }
                        if (norm === 'unggah ke sipena dan ipusnas') {
                            return isStageDone('pembuatan dummy final');
                        }
                        if (norm === 'pembuatan surat keterangan terbit') {
                            return isStageDone('unggah ke sipena dan ipusnas');
                        }
                        if (norm === 'serah terima karya cetak dan rekam') {
                            return isStageDone('unggah ke sipena dan ipusnas');
                        }
                        // Type terjemahan
                        if (norm === 'terjemahkan') return true;
                        if (norm === 'penyuntingan naskah terjemahan') return isStageDone('terjemahkan');
                        return false;
                    };

                    for (const stg of tempStages) {
                        if (stg.status === 'draft' && shouldStageBeActive(stg.label)) {
                            await updateStage(stg.id, { status: 'active' });
                            tempStages = tempStages.map(s => s.id === stg.id ? { ...s, status: 'active' } : s);
                        }
                    }
                } else {
                    const nextDraft = stages.find((s, idx) => idx > activeStageIdx && s.status === 'draft')
                    if (nextDraft) {
                        const pjOverride = (!isSequentialPerPJ && project.singlePJ) ? activeStage.pjId : null
                        await updateStage(nextDraft.id, { status: 'active', ...(pjOverride ? { pjId: pjOverride } : {}) })
                    }
                }
            }

            addNotification({
                type: 'approved',
                title: 'Tahap Disetujui',
                message: `Tantawi menyetujui tahap "${activeStage.label}" di proyek "${project.title}".`,
                projectId: project.id
            })

            setShowQcModal(false)
            setNextStageIdx('')
            setNextPjId('')
            setNextDeadline('')
            
            // Pengecekan Tahapan Terakhir: Jika tidak ada lagi tahapan yang belum selesai, arsipkan proyek (hanya untuk kategori terstruktur seperti Terbitan/Medsos/Keuangan)
            // Kategori fleksibel (Lainnya, Promosi, Bimtek, Deposit, dll) proses pengarsipannya MANUAL oleh user/admin
            const allOthersDone = stages.filter(s => s.id !== activeStage.id && s.status !== 'done' && s.status !== 'archived').length === 0;
            if (allOthersDone && !isFlexibleCategory) {
                try {
                    await api.projects.update(project.id, { status: 'archived' });
                    showToast('Tahapan disetujui. Proyek telah selesai dan otomatis diarsipkan!', 'success');
                } catch (err) {
                    console.error("Gagal mengarsipkan proyek otomatis", err);
                    showToast('Tahapan disetujui, namun gagal mengarsipkan proyek.', 'warning');
                }
            } else {
                showToast('Tahapan berhasil disetujui!', 'success')
            }
        } catch (e) {
            console.error(e)
            showToast(e.message || 'Gagal menyetujui tahapan.', 'error')
        } finally {
            setIsApprovingQc(false)
        }
    }

    // Admin: QC Revise
    const handleRevise = async () => {
        if (isApprovingQc) return
        if (!revisionNote.trim()) {
            showAlert({
                title: 'Catatan Revisi Wajib Diisi',
                message: 'Wajib mengisi catatan revisi sebelum mengirimkan permintaan perbaikan!',
                type: 'warning'
            })
            return
        }
        setIsApprovingQc(true)
        try {
            // First add the revision note via addNote API
            await addStageNote(activeStage.id, {
                from: currentUser.name,
                text: `[REVISI] ${revisionNote}`,
                time: new Date().toISOString()
            })
            // Then update status
            await updateStage(activeStage.id, {
                status: 'revision',
                progress: 25
            })
            addNotification({
                type: 'revision',
                title: 'Direvisi',
                message: `Tantawi meminta revisi pada tahap "${activeStage.label}": ${revisionNote}`,
                projectId: project.id
            })
            setShowQcModal(false)
            setRevisionNote('')
            showToast('Permintaan revisi berhasil dikirim!', 'warning')
        } catch (e) {
            console.error(e)
            showToast(e.message || 'Gagal mengirim permintaan revisi.', 'error')
        } finally {
            setIsApprovingQc(false)
        }
    }

    // Save result link independently
    const handleSaveResultLink = async () => {
        if (!resultLink || !isStageEditable) return
        const updates = { resultLink }
        if (activeStage.status === 'draft') updates.status = 'active'
        await updateStage(activeStage.id, updates)
        setResultLink(null)
    }

    // Save stage deadline (Terbitan) — PJ sets once, admin can update
    const handleSaveStageDeadline = async (stageId, stageIdx) => {
        const val = stageDeadlineInput[stageId]
        if (!val) return
        const errors = { ...stageDeadlineErrors }
        let hasError = false
        if (isTerbitan) {
            for (let j = stageIdx - 1; j >= 0; j--) {
                if (stages[j]?.deadline) {
                    const prev = stages[j].deadline.split('T')[0]
                    if (val < prev) { errors[stageId] = `Tidak boleh lebih awal dari Tahap ${j + 1} (${formatDate(stages[j].deadline)})`; hasError = true }
                    break
                }
            }
            if (!hasError) {
                for (let j = stageIdx + 1; j < stages.length; j++) {
                    if (stages[j]?.deadline) {
                        const next = stages[j].deadline.split('T')[0]
                        if (val > next) { errors[stageId] = `Tidak boleh lebih akhir dari Tahap ${j + 1} (${formatDate(stages[j].deadline)})`; hasError = true }
                        break
                    }
                }
            }
        }
        if (hasError) { setStageDeadlineErrors(errors); return }
        delete errors[stageId]
        setStageDeadlineErrors(errors)
        try {
            await updateStage(stageId, { deadline: val })
            setStageDeadlineInput(prev => { const c = { ...prev }; delete c[stageId]; return c })
            showToast('Deadline berhasil disimpan!', 'success')
        } catch { showToast('Gagal menyimpan deadline.', 'error') }
    }

    // Send note via dedicated addNote API
    const handleSendNote = async () => {
        if (!noteText.trim() && !noteAttachment) return
        try {
            setIsUploadingNote(true)
            let attachmentUrl = undefined
            
            if (noteAttachment) {
                const formData = new FormData()
                formData.append('attachment', noteAttachment)
                const uploadRes = await api.uploads.uploadFile(formData)
                attachmentUrl = uploadRes.url
            }

            await addStageNote(activeStage.id, {
                from: currentUser.name,
                text: noteText,
                time: new Date().toISOString(),
                ...(attachmentUrl ? { attachment: attachmentUrl } : {})
            })
            setNoteText('')
            setNoteAttachment(null)
        } catch (e) {
            console.error('Failed to send note:', e)
            showAlert({
                title: 'Gagal Mengirim Catatan',
                message: 'Gagal mengirim catatan atau mengunggah file. Silakan coba kembali.',
                type: 'error'
            })
        } finally {
            setIsUploadingNote(false)
        }
    }

    const handleAttachmentChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setNoteAttachment(e.target.files[0])
        }
    }

    // Capture pasted images from clipboard
    const handlePasteImage = (e) => {
        const items = e.clipboardData?.items
        if (!items) return

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile()
                if (file) {
                    const renamedFile = new File([file], `screenshot_${Date.now()}.png`, { type: file.type })
                    setNoteAttachment(renamedFile)
                    showToast('Gambar dari clipboard berhasil dilampirkan!', 'success')
                    e.preventDefault()
                    break
                }
            }
        }
    }

    // Safely parse and render numbering, bulleting, and paragraphs
    const renderFormattedText = (text) => {
        if (!text) return null
        const lines = text.split('\n')
        const elements = []
        let currentList = null

        const pushCurrentList = () => {
            if (currentList) {
                const ListTag = currentList.type
                const style = {
                    listStyleType: currentList.type === 'ul' ? 'disc' : 'decimal',
                    margin: '0.25rem 0 0.25rem 1.25rem',
                    paddingLeft: '1rem',
                }
                elements.push(
                    <ListTag key={`list-${elements.length}`} style={style}>
                        {currentList.items.map((item, i) => (
                            <li key={i} style={{ marginBottom: '0.125rem' }}>{item}</li>
                        ))}
                    </ListTag>
                )
                currentList = null
            }
        }

        lines.forEach((line, idx) => {
            const trimmed = line.trim()
            if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                const content = line.substring(line.indexOf(trimmed.charAt(0)) + 2)
                if (currentList && currentList.type !== 'ul') {
                    pushCurrentList()
                }
                if (!currentList) {
                    currentList = { type: 'ul', items: [] }
                }
                currentList.items.push(content)
            } else if (/^\d+\.\s/.test(trimmed)) {
                const content = line.substring(line.indexOf('.') + 2)
                if (currentList && currentList.type !== 'ol') {
                    pushCurrentList()
                }
                if (!currentList) {
                    currentList = { type: 'ol', items: [] }
                }
                currentList.items.push(content)
            } else {
                pushCurrentList()
                elements.push(
                    <div key={idx} style={{ minHeight: '1.2em', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {line}
                    </div>
                )
            }
        })

        pushCurrentList()
        return elements
    }



    // Open assign modal → fetch candidates
    const openAssignModal = (idx) => {
        const stage = stages[idx]
        setAssignStageIdx(idx)
        setAssignPjId(stage?.pjId || '')
        const initCoPjIds = (stage?.coPjIds && Array.isArray(stage.coPjIds) && stage.coPjIds.length > 0)
            ? stage.coPjIds.filter(id => id && id !== stage?.pjId).slice(0, 2)
            : (stage?.coPjId && stage.coPjId !== stage?.pjId ? [stage.coPjId] : [])
        setAssignCoPjIds(initCoPjIds)
        setAssignCoPjId(initCoPjIds[0] || '')
        const dlVal = stage?.deadline ? (stage.deadline.includes('T') ? stage.deadline.split('T')[0] : stage.deadline) : ''
        setAssignDeadline(dlVal)
        setSelectedWorkload(null)
        setCandidates([])
        setShowAssignModal(true)
        setAssignScore(stage?.score || 0)
        if (stage?.id) {
            fetchCandidates(stage.id, setCandidates, setCandidatesLoading)
        }
    }

    // Handle PJ selection in assign modal → show workload if any
    const handleAssignPjSelect = (pjId) => {
        setAssignPjId(pjId)
        // Automatically remove new PJ from collaborators list if already selected
        setAssignCoPjIds(prev => prev.filter(id => id !== pjId))
        const candidate = candidates.find(c => c.id === pjId)
        setSelectedWorkload(candidate?.activeStages > 0 ? candidate : null)
    }

    // Handle PJ selection in QC next stage → show workload if any
    const handleNextPjSelect = (pjId) => {
        setNextPjId(pjId)
        const candidate = nextCandidates.find(c => c.id === pjId)
        setNextSelectedWorkload(candidate?.activeStages > 0 ? candidate : null)
    }

    // Admin: assign pending stage
    const handleAssignStage = () => {
        if (!assignPjId) return
        const stage = stages[assignStageIdx]
        const isFlexible = !['terbitan', 'medsos', 'keuangan'].includes(project.category)
        const cleanCoPjIds = Array.from(new Set(assignCoPjIds.filter(id => id && id !== assignPjId))).slice(0, 2)
        const parseDecimalScore = (val) => {
            if (val === undefined || val === null || val === '') return 0
            if (typeof val === 'number') return Math.max(0, val)
            const parsed = parseFloat(String(val).replace(',', '.'))
            return isNaN(parsed) ? 0 : Math.max(0, parsed)
        }
        updateStage(stage.id, {
            pjId: assignPjId,
            coPjIds: cleanCoPjIds,
            coPjId: cleanCoPjIds[0] || null,
            deadline: assignDeadline,
            ...(isFlexible ? { score: parseDecimalScore(assignScore) } : {})
        })
        setShowAssignModal(false)
        setAssignPjId('')
        setAssignCoPjIds([])
        setAssignCoPjId('')
        setAssignDeadline('')
        setAssignScore(0)
        setSelectedWorkload(null)
    }

    // Archive stage
    const handleArchive = () => {
        const stage = stages[archiveStageIdx]
        updateStage(stage.id, { status: 'archived' })
        setShowArchiveConfirm(false)
    }

    // Archive entire project
    const handleArchiveProject = async () => {
        try {
            // The backend updateProject will now automatically cascade the 'archived' status to all stages
            await updateProject(project.id, { status: 'archived' })

            setShowArchiveProjectConfirm(false)
            showToast('Proyek berhasil diarsipkan!', 'success')
        } catch (e) {
            console.error(e)
            showToast('Gagal mengarsipkan proyek', 'error')
        }
    }

    // Delete project handler
    const handleDeleteProject = async () => {
        // Set ref SYNCHRONOUSLY before any async — this ensures the !project guard
        // sees isDeletingRef.current === true in the very next re-render
        isDeletingRef.current = true
        setIsDeleting(true)
        setShowDeleteConfirm(false)
        try {
            await deleteProject(project.id)
            showToast('Proyek berhasil dihapus!', 'success')
            setTimeout(() => navigate('/admin/manajemen/proyek'), 1500)
        } catch (e) {
            showToast('Gagal menghapus proyek. Coba lagi.', 'error')
            isDeletingRef.current = false
            setIsDeleting(false)
        }
    }

    const handleDuplicateProject = async () => {
        if (!duplicateTitle.trim() || duplicateTitle.trim().length < 3) {
            showToast('Nama proyek minimal 3 karakter', 'error')
            return
        }
        setIsDuplicating(true)
        try {
            const newProject = await api.projects.duplicate(project.id, duplicateTitle.trim())
            showToast('Proyek berhasil disalin!', 'success')
            setShowDuplicateModal(false)
            refreshData().catch(() => {}) // Refresh daftar proyek di background
            setTimeout(() => navigate(`/admin/manajemen/proyek/${newProject.id}`), 800)
        } catch (e) {
            showToast('Gagal menyalin proyek. Coba lagi.', 'error')
        } finally {
            setIsDuplicating(false)
        }
    }

    const handleDeleteStage = async (stageId, e) => {
        e.stopPropagation()
        const ok = await showConfirm({
            title: 'Hapus Tahapan',
            message: 'Yakin ingin menghapus tahapan ini? Tindakan ini tidak dapat dibatalkan.',
            type: 'danger',
            confirmText: 'Ya, Hapus Tahapan'
        })
        if (!ok) return
        
        try {
            await api.stages.delete(stageId)
            await refreshData() // Refresh to reflect deletion
            if (selectedStageIdx !== null) setSelectedStageIdx(null)
            showToast('Tahapan berhasil dihapus.', 'success')
        } catch (error) {
            console.error('Failed to delete stage:', error)
            showAlert({ title: 'Gagal Menghapus', message: 'Gagal menghapus tahapan: ' + (error.message || 'Terjadi kesalahan'), type: 'error' })
        }
    }

    const handleSaveEditStage = async (stageId, e) => {
        e.stopPropagation()
        if (!editingStageLabel.trim()) return

        try {
            await updateStage(stageId, { label: editingStageLabel.trim() })
            setEditingStageId(null)
            setEditingStageLabel('')
            showToast('Nama tahapan berhasil diperbarui.', 'success')
        } catch (error) {
            console.error('Failed to update stage label:', error)
            showAlert({ title: 'Gagal Mengubah', message: 'Gagal mengubah nama tahapan: ' + (error.message || 'Terjadi kesalahan'), type: 'error' })
        }
    }

        const handleDragStart = (e, index) => {
        if (!canReorderStages || isReordering) return
        isDraggingRef.current = true
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', String(index))
        setDraggedStageIdx(index)
    }

    const handleDragOver = (e, index) => {
        if (!canReorderStages || isReordering) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        if (dragOverStageIdx !== index) {
            setDragOverStageIdx(index)
        }
    }

    const handleDragLeave = (e, index) => {
        // No-op
    }

    const handleDragEnd = () => {
        setTimeout(() => {
            isDraggingRef.current = false
        }, 100)
        setDraggedStageIdx(null)
        setDragOverStageIdx(null)
    }

    const handleDrop = async (e, targetIdx) => {
        if (!canReorderStages || isReordering) return
        e.preventDefault()
        const sourceIdx = draggedStageIdx
        setTimeout(() => {
            isDraggingRef.current = false
        }, 100)
        setDraggedStageIdx(null)
        setDragOverStageIdx(null)

        if (sourceIdx === null || sourceIdx === undefined || sourceIdx === targetIdx) {
            return
        }

        const currentActiveId = stages[activeStageIdx]?.id

        const newStages = [...stages]
        const [movedStage] = newStages.splice(sourceIdx, 1)
        newStages.splice(targetIdx, 0, movedStage)

        const newStageIds = newStages.map(s => s.id)

        // Keep active stage selection consistent
        if (currentActiveId) {
            const nextIdx = newStageIds.indexOf(currentActiveId)
            if (nextIdx !== -1) {
                setSelectedStageIdx(nextIdx)
            }
        }

        setIsReordering(true)
        try {
            await reorderStages(project.id, newStageIds)
            showToast('Urutan tahapan berhasil diperbarui', 'success')
        } catch (err) {
            console.error('Failed to reorder stages:', err)
            showToast(err.message || 'Gagal mengubah urutan tahapan', 'error')
        } finally {
            setIsReordering(false)
        }
    }

    // Pending stages for next selection
    const pendingStages = stages
        .map((s, idx) => ({ ...s, idx }))
        .filter(s => s.status === 'draft' && s.idx !== activeStageIdx)

    return (
        <div className="px-6 pt-5 pb-8 space-y-6">
            {/* ── Breadcrumb ───────────────────────────────────────────────────── */}
            <div>
            <nav className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-5">
                <button onClick={() => navigate('/admin/manajemen/proyek')} className="hover:text-[#1c51a1] transition-colors">Proyek</button>
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                <span className="text-slate-600">Detail Proyek</span>
            </nav>

            {/* ── Banner Alert jika Proyek Berstatus Terarsip ───────────────────── */}
            {project.status === 'archived' && (
                <div className="mb-5 p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-4 flex-wrap shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 text-amber-700">
                            <span className="material-symbols-outlined text-[22px]">inventory_2</span>
                        </div>
                        <div>
                            <h4 className="font-bold text-amber-900 text-sm">📦 Proyek ini Berstatus Terarsip</h4>
                            <p className="text-xs text-amber-700 mt-0.5">Proyek ini sedang berada dalam arsip. Anda dapat mengaktifkannya kembali untuk melanjutkan pekerjaan atau menambah tahapan kerja baru.</p>
                        </div>
                    </div>
                    {canEditProject && (
                        <button
                            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-all flex items-center gap-1.5 shadow-sm"
                            onClick={async () => {
                                const ok = await showConfirm({
                                    title: 'Aktifkan Kembali Proyek',
                                    message: `Aktifkan kembali proyek "${project.title}" ke daftar proyek aktif?`,
                                    type: 'info',
                                    confirmText: 'Ya, Aktifkan'
                                })
                                if (ok) {
                                    try {
                                        await updateProject(project.id, { status: 'active' });
                                        showToast('Proyek berhasil diaktifkan kembali!', 'success');
                                        if (refreshData) await refreshData();
                                    } catch (err) {
                                        showToast('Gagal mengaktifkan kembali proyek', 'error');
                                    }
                                }
                            }}
                        >
                            <span className="material-symbols-outlined text-[16px]">unarchive</span>
                            🔄 Aktifkan Kembali Proyek
                        </button>
                    )}
                </div>
            )}

            {/* ── Row 1: Badge + ID + Action buttons ────────────────────────── */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                {/* Left: category badge + project ID */}
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-3 py-0.5 rounded-full text-[11px] font-black uppercase tracking-widest"
                        style={{
                            background: project.category === 'terbitan' ? '#eef4fc' : project.category === 'keuangan' ? '#fffbeb' : project.category === 'medsos' ? '#ecfdf5' : '#f1f5f9',
                            color: project.category === 'terbitan' ? '#1c51a1' : project.category === 'keuangan' ? '#b45309' : project.category === 'medsos' ? '#059669' : '#64748b',
                        }}>
                        {project.categoryLabel || project.category}
                    </span>
                    <span className="text-xs font-bold font-mono text-slate-400 uppercase tracking-widest">{project.id}</span>
                </div>

                {/* Right: action buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                    {project.gdriveLink && (
                        <a
                            href={project.gdriveLink} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all"
                        >
                            <span className="material-symbols-outlined text-[15px] text-slate-400">folder</span>
                            GDrive
                        </a>
                    )}
                    {catObj?.knowledgeBase && (
                        <a
                            href={catObj.knowledgeBase} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all"
                        >
                            <span className="material-symbols-outlined text-[15px] text-slate-400">menu_book</span>
                            Pedoman
                        </a>
                    )}
                    {canEditProject && (
                        <button
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all"
                            onClick={() => {
                                setEditProjectFields({
                                    title: project.title || '',
                                    type: project.type || '',
                                    description: project.description || '',
                                    gdriveLink: project.gdriveLink || '',
                                    score: project.score || 0,
                                    pageCount: project.pageCount || 0,
                                })
                                setShowEditProjectModal(true)
                            }}
                        >
                            <span className="material-symbols-outlined text-[15px] text-slate-400">edit</span>
                            Edit
                        </button>
                    )}
                    {canEditProject && (
                        <button
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all"
                            onClick={() => {
                                setDuplicateTitle(`${project.title} — Salinan`)
                                setShowDuplicateModal(true)
                            }}
                            title="Salin proyek ini"
                        >
                            <span className="material-symbols-outlined text-[15px] text-slate-400">content_copy</span>
                            Salin
                        </button>
                    )}
                    {canEditProject && project.status !== 'archived' && (
                        <button
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all"
                            onClick={() => setShowArchiveProjectConfirm(true)}
                            title="Arsipkan proyek ini secara manual"
                        >
                            <span className="material-symbols-outlined text-[15px] text-slate-400">archive</span>
                            Arsipkan
                        </button>
                    )}
                    {canEditProject && (
                        <button
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 active:scale-95 transition-all"
                            onClick={() => setShowDeleteConfirm(true)}
                        >
                            Hapus Proyek
                        </button>
                    )}
                </div>
            </div>

            {/* ── Row 2: Title + Meta ─────────────────────────────────────────── */}
            <h1 className="text-2xl font-extrabold text-slate-900 leading-tight mb-2">
                {project.title}
            </h1>
            <div className="flex items-center gap-4 flex-wrap text-xs text-slate-400 font-medium mb-6">
                <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                    Dibuat: {project.createdAt ? new Date(project.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                </span>
                {project.typeLabel && (
                    <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">label</span>
                        {project.typeLabel}
                    </span>
                )}
            </div>
        </div>

            {/* Main Grid: Pipeline + Active Stage */}
            <div className="detail-grid">
                {/* Left: Pipeline */}
                <div className="card timeline-card">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexShrink: 0 }}>
                        <div className="card-title" style={{ margin: 0 }}>Timeline Tahapan</div>
                        {canReorderStages && (
                            <span 
                                style={{ 
                                    fontSize: '0.7rem', 
                                    color: 'var(--text-muted)', 
                                    display: 'inline-flex', 
                                    alignItems: 'center', 
                                    gap: '3px',
                                    background: 'var(--surface-hover)',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    fontWeight: 500,
                                    userSelect: 'none'
                                }}
                                title="Anda dapat menahan dan menggeser tahapan untuk mengubah urutannya"
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>drag_indicator</span>
                                Geser Urutan
                            </span>
                        )}
                    </div>
                    <div className="timeline-pipeline-scroll custom-scrollbar">
                        <div className="pipeline">
                            {stages.map((stage, idx) => {
                            const stagePJ = stage.pj || null
                            const overdue = isOverdue(stage)
                            const isDragging = draggedStageIdx === idx
                            const isOver = dragOverStageIdx === idx && draggedStageIdx !== null && draggedStageIdx !== idx
                            const isOverBelow = isOver && draggedStageIdx < idx
                            const isOverAbove = isOver && draggedStageIdx > idx

                            return (
                                <div
                                    key={stage.id}
                                    ref={idx === activeStageIdx ? activeStageItemRef : null}
                                    className={`pipeline-stage ${isDragging ? 'dragging' : ''}`}
                                    draggable={canReorderStages && editingStageId !== stage.id}
                                    onDragStart={(e) => handleDragStart(e, idx)}
                                    onDragOver={(e) => handleDragOver(e, idx)}
                                    onDragLeave={(e) => handleDragLeave(e, idx)}
                                    onDrop={(e) => handleDrop(e, idx)}
                                    onDragEnd={handleDragEnd}
                                    onClick={() => {
                                        if (!isDraggingRef.current) {
                                            setSelectedStageIdx(idx)
                                        }
                                    }}
                                    style={{
                                        background: isOver 
                                            ? 'rgba(59, 130, 246, 0.08)' 
                                            : idx === (selectedStageIdx !== null ? selectedStageIdx : activeStageIdx) 
                                                ? 'var(--surface-hover)' 
                                                : undefined,
                                        borderRadius: 'var(--radius)',
                                        paddingLeft: '0.5rem',
                                        paddingRight: '0.5rem',
                                        opacity: isDragging ? 0.35 : 1,
                                        borderTop: isOverAbove ? '2px solid var(--primary)' : undefined,
                                        borderBottom: isOverBelow ? '2px solid var(--primary)' : undefined,
                                        boxShadow: isOverAbove 
                                            ? '0 -3px 6px -2px rgba(59, 130, 246, 0.4)' 
                                            : isOverBelow 
                                                ? '0 3px 6px -2px rgba(59, 130, 246, 0.4)' 
                                                : undefined,
                                        transition: 'background 0.15s ease, opacity 0.15s ease, border 0.15s ease',
                                        cursor: canReorderStages ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
                                    }}
                                >
                                    <div className={`stage-dot ${stage.status === 'archived' ? 'done' : stage.status}`}>
                                        {stage.status === 'done' || stage.status === 'archived' ? '✓' : idx + 1}
                                    </div>
                                    <div className="stage-info">
                                        <div className="stage-name" style={{ color: overdue ? 'var(--danger)' : undefined, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                                            {editingStageId === stage.id ? (
                                                <div style={{ display: 'flex', gap: '0.25rem', width: '100%', alignItems: 'center' }} onClick={e => e.stopPropagation()} onDragStart={e => e.stopPropagation()}>
                                                    <input 
                                                        type="text" 
                                                        value={editingStageLabel} 
                                                        onChange={e => setEditingStageLabel(e.target.value)} 
                                                        style={{ flex: 1, fontSize: '0.8rem', padding: '0.15rem 0.25rem', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                                                        autoFocus
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') handleSaveEditStage(stage.id, e)
                                                            if (e.key === 'Escape') setEditingStageId(null)
                                                        }}
                                                    />
                                                    <button className="btn btn-sm" style={{ padding: '0.15rem 0.35rem', background: 'var(--primary)', color: 'white' }} onClick={(e) => handleSaveEditStage(stage.id, e)}>✓</button>
                                                    <button className="btn btn-ghost btn-sm" style={{ padding: '0.15rem 0.35rem' }} onClick={() => setEditingStageId(null)}>✕</button>
                                                </div>
                                            ) : (
                                                <>
                                                    <span style={{ flex: 1, wordBreak: 'break-word' }}>
                                                        {overdue && '! '}{stage.label}
                                                    </span>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                                                        {isFlexibleCategory && (isAdmin || isProjectCreator || (stage.pjId === currentUser?.id)) && stage.status !== 'archived' && (
                                                            <>
                                                                <button 
                                                                    className="btn btn-ghost btn-sm" 
                                                                    style={{ padding: '0.15rem', color: 'var(--primary)', fontSize: '0.7rem' }}
                                                                    title="Ubah Nama"
                                                                    draggable={false}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        setEditingStageId(stage.id)
                                                                        setEditingStageLabel(stage.label)
                                                                    }}
                                                                >
                                                                    ✎
                                                                </button>
                                                                <button 
                                                                    className="btn btn-ghost btn-sm" 
                                                                    style={{ padding: '0.15rem', color: 'var(--danger)', fontSize: '0.7rem' }}
                                                                    title="Hapus Tahapan"
                                                                    draggable={false}
                                                                    onClick={(e) => handleDeleteStage(stage.id, e)}
                                                                >
                                                                    🗑️
                                                                </button>
                                                            </>
                                                        )}
                                                        {canReorderStages && (
                                                            <span 
                                                                className="material-symbols-outlined" 
                                                                title="Tahan dan geser untuk ubah urutan"
                                                                style={{ 
                                                                    fontSize: '18px', 
                                                                    color: 'var(--text-muted)', 
                                                                    cursor: 'grab', 
                                                                    userSelect: 'none',
                                                                    opacity: 0.6,
                                                                    padding: '0.15rem 0.25rem',
                                                                    borderRadius: '4px',
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center'
                                                                }}
                                                                onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = 'var(--primary)'; }}
                                                                onMouseLeave={e => { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                                                            >
                                                                drag_indicator
                                                            </span>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                        <div className="stage-meta">
                                            {stage.pj ? `PJ: ${stage.pj.name}` : (stage.pjId ? 'PJ: Personil Terpilih' : 'Belum ditugaskan')}
                                            {(() => {
                                                const cIds = (stage.coPjIds && Array.isArray(stage.coPjIds) && stage.coPjIds.length > 0)
                                                    ? stage.coPjIds.filter(id => id && id !== stage.pjId)
                                                    : (stage.coPjId && stage.coPjId !== stage.pjId ? [stage.coPjId] : []);
                                                if (cIds.length === 1) return ` + 1 Kolaborator`;
                                                if (cIds.length > 1) return ` + ${cIds.length} Kolaborator`;
                                                return '';
                                            })()}
                                            {stage.deadline ? ` • ${formatDate(stage.deadline)}` : ''}
                                            {` • ${getStageDynamicScore(project, stage, categoriesMap)} Poin`}
                                        </div>
                                        {/* Inline deadline warning for PJ or admin */}
                                        {isRequiredDeadline && !stage.deadline && stage.status !== 'done' && stage.status !== 'archived' && (stage.pjId === currentUser?.id || isAdmin) && (
                                            <div style={{ marginTop: '0.35rem' }} onClick={e => e.stopPropagation()}>
                                                <div style={{ color: '#c0152f', fontSize: '0.7rem', fontWeight: 700, marginBottom: '0.2rem' }}>⚠ Deadline belum diisi</div>
                                                <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                                    <input type="date" style={{ fontSize: '0.7rem', padding: '0.15rem 0.35rem', border: '1.5px solid #e02442', borderRadius: '4px' }}
                                                        value={stageDeadlineInput[stage.id] || ''}
                                                        onChange={e => setStageDeadlineInput(p => ({ ...p, [stage.id]: e.target.value }))}
                                                    />
                                                    <button className="btn btn-sm" style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem', background: '#c0152f', color: '#fff', border: 'none', borderRadius: '4px' }}
                                                        disabled={!stageDeadlineInput[stage.id]}
                                                        onClick={e => { e.stopPropagation(); handleSaveStageDeadline(stage.id, idx) }}
                                                    >Simpan</button>
                                                </div>
                                                {stageDeadlineErrors[stage.id] && <div style={{ fontSize: '0.65rem', color: '#c0152f', marginTop: '0.15rem' }}>{stageDeadlineErrors[stage.id]}</div>}
                                            </div>
                                        )}
                                        {/* Deadline Input / Edit */}
                                        {stage.deadline && (
                                            <div style={{ fontSize: '0.7rem', color: isOverdue(stage) ? '#c0152f' : 'var(--text-body)', marginTop: '0.125rem', display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                                                <span>Deadline: {formatDate(stage.deadline)} {isOverdue(stage) && `(${getDeadlineCountdown(stage.deadline)?.text})`}</span>
                                            </div>
                                        )}
                                        {/* Clickable result link */}
                                        {stage.resultLink && (
                                            <a
                                                href={stage.resultLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                style={{ fontSize: '0.7rem', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.125rem' }}
                                            >
                                                Hasil Kerja ↗
                                            </a>
                                        )}
                                        {/* Assign PJ — Admin, Project Creator, or PJ of this stage */}
                                        {(isAdmin || isProjectCreator || isLainnya || (isProjectPJ && stage.pjId === currentUser?.id)) && !stage.pjId && stage.status !== 'done' && stage.status !== 'archived' && (
                                            <button
                                                className="btn btn-primary btn-sm"
                                                style={{ marginTop: '0.25rem', fontSize: '0.7rem' }}
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    openAssignModal(idx)
                                                }}
                                            >
                                                + Assign PJ & Deadline
                                            </button>
                                        )}
                                        {/* Reassign PJ — Admin, Project Creator, or PJ of this stage */}
                                        {(isAdmin || isProjectCreator || isLainnya || (isProjectPJ && stage.pjId === currentUser?.id)) && stage.pjId && stage.status !== 'done' && stage.status !== 'archived' && (
                                                <button
                                                    className="btn btn-ghost btn-sm"
                                                    style={{ marginTop: '0.25rem', fontSize: '0.7rem', color: 'var(--primary)' }}
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        openAssignModal(idx)
                                                    }}
                                                >
                                                    Ubah PJ / Deadline
                                                </button>
                                            )}
                                        {/* Archive button — on LAST stage when ALL stages are done, NOT yet archived, visible to admin + user */}
                                        {idx === stages.length - 1 && stage.status === 'done' && stages.every(s => s.status === 'done' || s.status === 'archived') && project.status !== 'archived' && (
                                            <button
                                                className="btn btn-ghost btn-sm"
                                                style={{ marginTop: '0.25rem', fontSize: '0.7rem', color: 'var(--success)' }}
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setShowArchiveProjectConfirm(true)
                                                }}
                                            >
                                                📦 Arsipkan Proyek
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Add stage button for lainnya — accessible to both admin and user */}
                    {isFlexibleCategory && project.status !== 'archived' && (
                        <div style={{ marginTop: '0.75rem' }}>
                            {showAddStage ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                                    <div>
                                        <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>Nama Tahapan *</label>
                                        <input
                                            type="text"
                                            value={newStageName}
                                            onChange={e => setNewStageName(e.target.value)}
                                            placeholder="Contoh: Desain Banner..."
                                            style={{ width: '100%', fontSize: '0.8rem', padding: '0.4rem 0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff' }}
                                            autoFocus
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>
                                            Deskripsi Pekerjaan <span style={{ fontWeight: 400, color: '#94a3b8' }}>(Opsional)</span>
                                        </label>
                                        <textarea
                                            rows={2}
                                            value={newStageDescription}
                                            onChange={e => setNewStageDescription(e.target.value)}
                                            placeholder="Rincian instruksi atau tugas..."
                                            style={{ width: '100%', fontSize: '0.8rem', padding: '0.4rem 0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', resize: 'vertical' }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.35rem', marginTop: '0.25rem' }}>
                                        <button 
                                            type="button" 
                                            className="btn btn-ghost btn-sm" 
                                            onClick={() => { setShowAddStage(false); setNewStageName(''); setNewStageDescription('') }}
                                            style={{ fontSize: '0.75rem' }}
                                        >
                                            Batal
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-primary btn-sm"
                                            disabled={!newStageName.trim()}
                                            onClick={async () => {
                                                await createStage({
                                                    projectId: project.id,
                                                    label: newStageName.trim(),
                                                    description: newStageDescription.trim() || null,
                                                    order: stages.length + 1
                                                })
                                                setNewStageName('')
                                                setNewStageDescription('')
                                                setShowAddStage(false)
                                            }}
                                            style={{ fontSize: '0.75rem' }}
                                        >
                                            Simpan Tahapan
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    className="btn btn-outline btn-sm"
                                    style={{ width: '100%', gap: '0.4rem' }}
                                    onClick={() => setShowAddStage(true)}
                                >
                                    <span className="material-symbols-outlined text-[16px]">add</span>
                                    Tambah Tahapan
                                </button>
                            )}
                        </div>
                    )}

                    {/* Semua Tahapan Selesai — summary action area */}
                    {project.status !== 'archived' && stages.length > 0 && (() => {
                        const totalStages = stages.length
                        const doneStages = stages.filter(s => s.status === 'done' || s.status === 'archived').length
                        const pendingStages = stages.filter(s => s.status !== 'done' && s.status !== 'archived')
                        const allDone = doneStages === totalStages

                        if (allDone) {
                            return (
                                <div style={{ marginTop: '1rem', padding: '1.25rem 1rem', borderRadius: '16px', background: '#ecfdf5', border: '1.5px solid #a7f3d0', textAlign: 'center', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.08)' }}>
                                    <div style={{ width: '40px', height: '40px', margin: '0 auto 0.75rem', borderRadius: '50%', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
                                        <span className="material-symbols-outlined text-[24px]">check_circle</span>
                                    </div>
                                    <p style={{ fontWeight: 800, fontSize: '0.95rem', color: '#065f46', marginBottom: '0.35rem' }}>Semua Tahapan Terbuka Sudah Disetujui</p>
                                    <p style={{ fontSize: '0.78rem', color: '#047857', marginBottom: '1.25rem', lineHeight: 1.45 }}>
                                        {isFlexibleCategory
                                            ? 'Apakah seluruh pekerjaan proyek ini sudah selesai dan siap diarsipkan, atau masih ada tahapan kerja yang ingin ditambahkan?'
                                            : 'Seluruh tahapan kerja pada proyek ini telah selesai. Proyek siap untuk diarsipkan.'}
                                    </p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <button
                                            className="btn btn-success btn-sm"
                                            onClick={() => setShowArchiveProjectConfirm(true)}
                                            style={{ fontWeight: 700, padding: '0.55rem 1.1rem', fontSize: '0.82rem', width: '100%', justifyContent: 'center', gap: '0.4rem' }}
                                        >
                                            <span className="material-symbols-outlined text-[16px]">archive</span>
                                            Arsipkan Proyek
                                        </button>
                                        {isFlexibleCategory && (
                                            <button
                                                className="btn btn-outline btn-sm"
                                                onClick={() => setShowAddStage(true)}
                                                style={{ fontWeight: 700, background: '#ffffff', borderColor: '#10b981', color: '#047857', padding: '0.55rem 1.1rem', fontSize: '0.82rem', width: '100%', justifyContent: 'center', gap: '0.4rem' }}
                                            >
                                                <span className="material-symbols-outlined text-[16px]">add</span>
                                                Tambah Tahapan Kerja
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )
                        } else {
                            return (
                                <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', borderRadius: '12px', background: '#fffbeb', border: '1px solid #fcd34d' }}>
                                    <p style={{ fontWeight: 700, fontSize: '0.8rem', color: '#92400e', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                        <span className="material-symbols-outlined text-[16px] text-amber-600">warning</span>
                                        Ada Tahapan yang Belum Selesai
                                    </p>
                                    <p style={{ fontSize: '0.75rem', color: '#78350f' }}>
                                        {pendingStages.length} tahapan masih berstatus <strong>{pendingStages.map(s => s.label).join(', ')}</strong>. Selesaikan semua tahapan terlebih dahulu.
                                    </p>
                                    <p style={{ fontSize: '0.7rem', color: '#b45309', marginTop: '0.35rem' }}>{doneStages}/{totalStages} tahap selesai</p>
                                </div>
                            )
                        }
                    })()}
                    </div>{/* end: timeline-pipeline-scroll */}
                </div>{/* end: left column stage list */}

                {/* Right: Active Stage Detail */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: 0 }}>
                    {activeStage && (
                        <div className="card">
                            {/* lock banner ketika PJ belum isi deadline */}
                            {isRequiredDeadline && isMyStage && !activeStage.deadline && activeStage.status !== 'done' && activeStage.status !== 'archived' && (
                                <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius)', background: 'linear-gradient(135deg,#fff1f2,#ffe4e6)', border: '1.5px solid #fca5a5', marginBottom: '1rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                                    <span style={{ fontSize: '1.1rem' }}>🔒</span>
                                    <div>
                                        <p style={{ fontWeight: 700, fontSize: '0.85rem', color: '#991b1b', marginBottom: '0.1rem' }}>Deadline Belum Diisi</p>
                                        <p style={{ fontSize: '0.75rem', color: '#b91c1c' }}>Isi deadline terlebih dahulu pada timeline tahapan (kiri) untuk mulai mengerjakan.</p>
                                    </div>
                                </div>
                            )}

                            {/* Sequential: lock banner ketika tahapan sebelumnya belum selesai */}
                            {isSequential && isMyStage && !allPrevDone && activeStage.status !== 'done' && activeStage.status !== 'archived' && (
                                <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius)', background: 'linear-gradient(135deg,#fffbeb,#fef3c7)', border: '1.5px solid #fcd34d', marginBottom: '1rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                                    <span style={{ fontSize: '1.1rem' }}>⏳</span>
                                    <div>
                                        <p style={{ fontWeight: 700, fontSize: '0.85rem', color: '#b45309', marginBottom: '0.1rem' }}>Menunggu Tahap Sebelumnya</p>
                                        <p style={{ fontSize: '0.75rem', color: '#92400e' }}>Anda belum bisa mengubah progres pada tahap ini karena tahapan sebelumnya belum selesai dikerjakan.</p>
                                    </div>
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                <div>
                                    <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        <span>{activeStage.label}</span>
                                        <span className="badge badge-outline" style={{ fontSize: '0.65rem', border: '1px solid var(--primary)', color: 'var(--primary)', fontWeight: 800 }}>
                                            ⭐ {getStageDynamicScore(project, activeStage, categoriesMap)} Poin
                                        </span>
                                    </div>
                                    <div className="card-subtitle">Tahap {(selectedStageIdx !== null ? selectedStageIdx : activeStageIdx) + 1} dari {stages.length}</div>
                                </div>
                                <span className={`badge ${isSequential && !allPrevDone && activeStage.status === 'active' ? 'badge-warning' : getStatusBadge(activeStage.status)}`}>
                                    {isSequential && !allPrevDone && activeStage.status === 'active'
                                        ? '🔒 Terkunci'
                                        : (STATUS_LABELS[activeStage.status] || 'Draft')}
                                </span>
                            </div>

                            {/* PJ Info */}
                            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1rem', fontSize: '0.8125rem' }}>
                                <div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600 }}>PENANGGUNG JAWAB & KOLABORATOR</div>
                                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.125rem' }}>
                                        {pj ? (
                                            <>
                                                <div style={{ display: 'flex' }}>
                                                    <div className="user-avatar" style={{ width: '24px', height: '24px', fontSize: '0.6rem', border: '2px solid var(--surface)' }} title={`PJ Utama: ${pj.name}`}>{pj.avatar}</div>
                                                    {coPjList.map((cp, cIdx) => (
                                                        <div key={cp.id || cIdx} className="user-avatar" style={{ width: '24px', height: '24px', fontSize: '0.6rem', marginLeft: '-8px', border: '2px solid var(--surface)' }} title={`Kolaborator ${cIdx + 1}: ${cp.name}`}>{cp.avatar}</div>
                                                    ))}
                                                </div>
                                                <span>
                                                    {pj.name}
                                                    {coPjList.length > 0 && ` (Kolaborasi: ${coPjList.map(c => c.name).join(', ')})`}
                                                </span>
                                            </>
                                        ) : '—'}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600 }}>DEADLINE</div>
                                    <div style={{
                                        fontWeight: 600, marginTop: '0.125rem',
                                        color: isOverdue(activeStage) ? 'var(--danger)' : 'var(--text)'
                                    }}>
                                        {formatDate(activeStage.deadline)}
                                        {activeStage.deadline && (() => {
                                            const cd = getDeadlineCountdown(activeStage.deadline)
                                            if (!cd) return null
                                            return <span style={{ fontSize: '0.7rem', marginLeft: '0.375rem', color: cd.overdue ? 'var(--danger)' : 'var(--text-muted)' }}>
                                                ({cd.text})
                                            </span>
                                        })()}
                                    </div>
                                </div>
                            </div>

                            {/* Deskripsi Pekerjaan */}
                            {(activeStage.description || isFlexibleCategory) && (
                                <div style={{ marginBottom: '1.25rem', padding: '0.85rem 1rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.025em' }}>
                                            DESKRIPSI PEKERJAAN
                                        </span>
                                        {(isAdmin || isProjectCreator || isMyStage) && !isEditingDescription && activeStage.status !== 'archived' && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsEditingDescription(true)
                                                    setEditingDescriptionValue(activeStage.description || '')
                                                }}
                                                style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.2rem', padding: 0 }}
                                            >
                                                ✎ {activeStage.description ? 'Ubah Deskripsi' : 'Tambah Deskripsi'}
                                            </button>
                                        )}
                                    </div>
                                    {isEditingDescription ? (
                                        <div style={{ marginTop: '0.5rem' }}>
                                            <textarea
                                                rows={3}
                                                value={editingDescriptionValue}
                                                onChange={e => setEditingDescriptionValue(e.target.value)}
                                                placeholder="Tuliskan rincian atau instruksi tugas untuk tahapan ini..."
                                                style={{ width: '100%', fontSize: '0.8rem', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--primary)', outline: 'none', resize: 'vertical', background: '#fff' }}
                                                autoFocus
                                            />
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.35rem', marginTop: '0.35rem' }}>
                                                <button
                                                    type="button"
                                                    className="btn btn-ghost btn-sm"
                                                    style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem' }}
                                                    onClick={() => setIsEditingDescription(false)}
                                                >
                                                    Batal
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn-primary btn-sm"
                                                    style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem' }}
                                                    onClick={async () => {
                                                        await updateStage(activeStage.id, { description: editingDescriptionValue.trim() || null })
                                                        setIsEditingDescription(false)
                                                        showToast('Deskripsi tahapan berhasil diperbarui!', 'success')
                                                    }}
                                                >
                                                    Simpan
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ fontSize: '0.8125rem', color: activeStage.description ? 'var(--text)' : 'var(--text-muted)', fontStyle: activeStage.description ? 'normal' : 'italic', whiteSpace: 'pre-wrap', lineHeight: '1.45' }}>
                                            {activeStage.description || 'Belum ada deskripsi pekerjaan untuk tahapan ini.'}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Progress */}
                            {activeStage.status !== 'done' && activeStage.status !== 'archived' && (
                                <div style={{ marginBottom: '1rem' }}>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600, marginBottom: '0.375rem' }}>PROGRES</div>
                                    {(isAdmin && !isMyStage) || !isStageEditable ? (
                                        /* Admin: read-only progress display */
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <div style={{ flex: 1, height: '8px', background: 'var(--surface-hover)', borderRadius: '4px', overflow: 'hidden' }}>
                                                    <div style={{ width: `${activeStage.progress || 0}%`, height: '100%', background: 'var(--primary)', borderRadius: '4px', transition: 'width 0.3s' }} />
                                                </div>
                                                <span style={{ fontSize: '0.8rem', fontWeight: 600, minWidth: '40px' }}>{activeStage.progress || 0}%</span>
                                            </div>
                                            {activeStage.status === 'review' && (
                                                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--warning)', fontWeight: 600 }}>
                                                    🔒 Menunggu review admin
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        /* PJ: interactive progress buttons */
                                        <>
                                            <div className="progress-steps">
                                                {[0, 25, 50, 75, 100].map(val => {
                                                    const isProposalLocked = activeStage.proposalStatus === 'pending' || activeStage.proposalStatus === 'accepted'
                                                    const displayProgress = isProposalLocked 
                                                        ? 100 
                                                        : (localProgress !== null ? localProgress : activeStage.progress)
                                                    const isLocked = activeStage.status === 'review' || activeStage.status === 'done' || activeStage.status === 'archived' || isProposalLocked
                                                    return (
                                                        <button
                                                            key={val}
                                                            className={`progress-step ${displayProgress >= val ? 'filled' : ''} ${displayProgress === val ? 'current' : ''}`}
                                                            onClick={() => handleProgress(val)}
                                                            disabled={!isMyStage || isLocked}
                                                        >
                                                            {val}%
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                            {/* Save Progress Button — only when changed AND not at 100% */}
                                            {localProgress !== null && localProgress !== activeStage.progress && localProgress !== 100 && (
                                                <button
                                                    className="btn btn-primary btn-sm"
                                                    style={{ marginTop: '0.5rem' }}
                                                    onClick={handleSaveProgress}
                                                    disabled={activeStage.proposalStatus === 'pending' || activeStage.proposalStatus === 'accepted' || activeStage.status === 'review'}
                                                >
                                                    Simpan Progress
                                                </button>
                                            )}
                                            {/* Tombol Aksi Tata Letak Prelim Saja (Khusus Terbitan -> Tata Letak Naskah) */}
                                            {isTataLetakTerbitan && activeStage.status !== 'done' && isMyStage && (
                                                <div style={{ marginTop: '0.85rem', marginBottom: '0.75rem' }}>
                                                    <button
                                                        type="button"
                                                        onClick={async () => {
                                                            if (activeStage.proposalStatus === 'pending' || activeStage.proposalStatus === 'accepted' || activeStage.status === 'review') {
                                                                showToast('Status terkunci — usulan sedang dalam proses review', 'warning')
                                                                return
                                                            }
                                                            const isCurrentPrelim = activeStage.score === 5;
                                                            const nextScore = isCurrentPrelim ? 0 : 5;
                                                            try {
                                                                await updateStage(activeStage.id, { 
                                                                    isPrelimOnly: !isCurrentPrelim,
                                                                    score: nextScore
                                                                })
                                                                showToast(!isCurrentPrelim ? 'Status diubah ke Tata Letak Prelim Saja (5 Poin)' : 'Status dikembalikan ke Tata Letak Standar', 'info')
                                                            } catch (e) {
                                                                console.error(e)
                                                                showToast('Gagal mengubah status prelim', 'error')
                                                            }
                                                        }}
                                                        disabled={activeStage.proposalStatus === 'pending' || activeStage.proposalStatus === 'accepted' || activeStage.status === 'review'}
                                                        className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 border-2 cursor-pointer shadow-sm active:scale-[0.98] ${
                                                            activeStage.proposalStatus === 'pending' || activeStage.proposalStatus === 'accepted' || activeStage.status === 'review'
                                                                ? 'opacity-60 cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200'
                                                                : activeStage.score === 5 
                                                                    ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-500/30' 
                                                                    : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100 hover:border-slate-400'
                                                        }`}
                                                    >
                                                        <span className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-black border ${
                                                            activeStage.score === 5 ? 'bg-white text-blue-600 border-white' : 'bg-white text-transparent border-slate-400'
                                                        }`}>
                                                            ✓
                                                        </span>
                                                        <span>
                                                            Tata Letak Prelim Saja{' '}
                                                            <span className={`font-normal text-[11px] ${activeStage.score === 5 ? 'text-blue-100' : 'text-slate-500'}`}>
                                                                (Klik jika pengerjaan hanya prelim — poin yang diperoleh 5 Poin)
                                                            </span>
                                                        </span>
                                                    </button>
                                                </div>
                                            )}
                                            {/* Submit Proposal / Review Button — only at 100%, replaces Simpan Progress */}
                                            {(localProgress === 100 || activeStage.progress === 100 || activeStage.proposalStatus === 'pending' || activeStage.proposalStatus === 'accepted') && activeStage.status !== 'review' && isMyStage && (
                                                isTataLetakTerbitan && activeStage.proposalStatus !== 'accepted' ? (
                                                    <button
                                                        className="btn btn-warning btn-sm"
                                                        style={{ marginTop: '0.5rem' }}
                                                        onClick={() => {
                                                            if (resultLink !== null && resultLink !== activeStage.resultLink && resultLink !== '') {
                                                                showToast('Silakan klik "Simpan Progress" terlebih dahulu agar link hasil kerja tersimpan sebelum mengajukan usulan!', 'warning')
                                                                return
                                                            }
                                                            if (!activeStage.resultLink && !resultLink) {
                                                                showToast('Wajib mengisi dan menyimpan Link Hasil Kerja sebelum mengajukan usulan!', 'error')
                                                                return
                                                            }
                                                            handleAjukanUsulan()
                                                        }}
                                                        disabled={activeStage.proposalStatus === 'pending'}
                                                    >
                                                        {activeStage.proposalStatus === 'pending' ? 'Usulan Sedang Diproses...' : 'Ajukan Usulan'}
                                                    </button>
                                                ) : (
                                                    <button
                                                        className="btn btn-warning btn-sm"
                                                        style={{ marginTop: '0.5rem' }}
                                                        onClick={() => {
                                                            if (resultLink !== null && resultLink !== activeStage.resultLink && resultLink !== '') {
                                                                showToast('Silakan klik "Simpan Progress" terlebih dahulu agar link hasil kerja tersimpan sebelum mengajukan review!', 'warning')
                                                                return
                                                            }
                                                            setShowReviewConfirm(true)
                                                        }}
                                                    >
                                                        Ajukan Review
                                                    </button>
                                                )
                                            )}
                                            {(activeStage.status === 'review' || activeStage.proposalStatus === 'pending' || activeStage.proposalStatus === 'accepted') && (
                                                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: activeStage.proposalStatus === 'accepted' ? '#15803d' : 'var(--warning)', fontWeight: 600 }}>
                                                    {activeStage.proposalStatus === 'accepted'
                                                        ? '✓ Usulan telah diterima! Silakan klik "Ajukan Review" di atas untuk mengirimkan hasil kerja ke Admin.'
                                                        : (activeStage.proposalStatus === 'pending'
                                                            ? '🔒 Progress terkunci di 100% — usulan sedang diproses oleh Reviewer (PJ Penyuntingan)'
                                                            : '🔒 Progress terkunci — sedang menunggu review admin')}
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {/* --- TOMBOL INTEGRASI SIPENA --- */}
                                    {activeStage.label?.toLowerCase().includes('sipena') && (
                                        <div style={{ marginTop: '1rem', padding: '1rem', background: '#eff6ff', borderRadius: '0.75rem', border: '1px solid #bfdbfe' }}>
                                            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e3a8a', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                🚀 Integrasi SiPena
                                            </h4>
                                            <p style={{ fontSize: '0.75rem', color: '#3b82f6', marginBottom: '0.75rem', lineHeight: '1.4' }}>
                                                Naskah ini sudah mencapai tahap unggah. Klik tombol di bawah untuk membuka tab baru Dasbor SiPena dan mengisi form katalog secara otomatis berdasarkan data proyek ini.
                                            </p>
                                            <a 
                                                href={`https://admin.sipena.perpusnas.go.id/katalog?action=add&judul=${encodeURIComponent(project.title)}`}
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="btn btn-primary btn-sm"
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#2563eb', border: 'none' }}
                                            >
                                                Input ke SiPena
                                            </a>
                                        </div>
                                    )}

                                </div>
                            )}

                            {/* Folder Pekerjaan: from nearest previous stage with resultLink or project-level GDrive */}
                            {(() => {
                                const previousStagesWithLinks = stages
                                    .filter(s => s.order < activeStage.order && s.resultLink)
                                    .sort((a, b) => b.order - a.order)
                                const folderLink = previousStagesWithLinks[0]?.resultLink || project.gdriveLink
                                return (
                                    <div style={{ marginBottom: '1rem' }}>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600 }}>LINK MODAL KERJA</div>
                                        {folderLink ? (
                                            <a href={folderLink} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                                                Folder GDrive ↗
                                            </a>
                                        ) : (
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                                Belum tersedia
                                            </span>
                                        )}
                                    </div>
                                )
                            })()}

                            {/* Link Hasil Kerja */}
                            {activeStage.status !== 'done' && activeStage.status !== 'archived' && (
                                <div className="form-group">
                                    <label className="form-label">Link Hasil Kerja</label>
                                    {isStageEditable ? (
                                        /* PJ: editable input */
                                        <>
                                            <div className="input-with-icon">
                                                <input
                                                    type="url"
                                                    value={resultLink !== null ? resultLink : (activeStage.resultLink || '')}
                                                    onChange={e => setResultLink(e.target.value)}
                                                    placeholder="https://docs.google.com/..." autoComplete="off"
                                                />
                                                {(resultLink || activeStage.resultLink) && (
                                                    <span className={`input-icon ${(() => {
                                                        const val = resultLink !== null ? resultLink : activeStage.resultLink
                                                        try { new URL(val); return 'valid' } catch { return 'invalid' }
                                                    })()}`}>
                                                        {(() => { const val = resultLink !== null ? resultLink : activeStage.resultLink; try { new URL(val); return '✓' } catch { return '✗' } })()}
                                                    </span>
                                                )}
                                            </div>
                                            {/* Save result link button */}
                                            {resultLink !== null && resultLink !== (activeStage.resultLink || '') && resultLink !== '' && (
                                                <button
                                                    className="btn btn-primary btn-sm"
                                                    style={{ marginTop: '0.5rem' }}
                                                    onClick={handleSaveResultLink}
                                                >
                                                    💾 Simpan Link
                                                </button>
                                            )}
                                            {/* Show saved link as clickable */}
                                            {activeStage.resultLink && (resultLink === null || resultLink === '' || resultLink === activeStage.resultLink) && (
                                                <a
                                                    href={activeStage.resultLink}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--primary)' }}
                                                >
                                                    🔗 Buka Hasil Kerja ↗
                                                </a>
                                            )}
                                        </>
                                    ) : (
                                        /* Admin: read-only clickable link */
                                        activeStage.resultLink ? (
                                            <a
                                                href={activeStage.resultLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', color: 'var(--primary)' }}
                                            >
                                                🔗 {activeStage.resultLink} ↗
                                            </a>
                                        ) : (
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Belum ada link hasil kerja</div>
                                        )
                                    )}
                                </div>
                            )}

                            {/* Display result link for completed/archived stages (read-only) */}
                            {(activeStage.status === 'done' || activeStage.status === 'archived') && activeStage.resultLink && (
                                <div style={{ marginBottom: '1rem' }}>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600 }}>HASIL KERJA</div>
                                    <a href={activeStage.resultLink} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem' }}>
                                        {activeStage.resultLink} ↗
                                    </a>
                                </div>
                            )}

                            {/* Review Confirmation Modal */}
                            {showReviewConfirm && (
                                <div className="modal-overlay" onClick={() => setShowReviewConfirm(false)}>
                                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                                        <div className="modal-header">
                                            <div className="card-title">Konfirmasi Review</div>
                                        </div>
                                        <div style={{ padding: '1rem', fontSize: '0.85rem' }}>
                                            <p>Apakah Anda yakin mengajukan review untuk tahap <strong>"{activeStage.label}"</strong>?</p>
                                            <p style={{ color: 'var(--warning)', fontWeight: 600, fontSize: '0.8rem' }}>Progress tidak bisa diubah setelah review diajukan.</p>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', padding: '0 1rem 1rem' }}>
                                            <button className="btn btn-ghost" onClick={() => setShowReviewConfirm(false)}>Batal</button>
                                            <button className="btn btn-warning" onClick={handleSubmitReview}>Ya, Ajukan Review</button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Panel Usulan Tata Letak - Hanya untuk PJ Penyuntingan */}
                    {isTataLetakReviewer && activeStage && ['active', 'revision'].includes(activeStage.status) && activeStage.proposalStatus === 'pending' && (
                        <div className="card" style={{ borderColor: 'var(--primary)' }}>
                            <div className="card-title" style={{ marginBottom: '0.75rem' }}>Panel Usulan Tata Letak</div>
                            <p style={{ fontSize: '0.85rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                                Penata letak mengusulkan hasil kerja tata letak naskah dengan perolehan poin <strong>{getStageDynamicScore(project, activeStage, categoriesMap)}</strong> poin.
                            </p>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <button className="btn btn-success" onClick={() => {
                                    setUsulanAction('accept')
                                    setUsulanConfirmed(false)
                                    setUsulanScore(getStageDynamicScore(project, activeStage, categoriesMap))
                                    setShowUsulanModal(true)
                                }}>
                                    Terima Usulan
                                </button>
                                <button className="btn btn-danger" onClick={() => { 
                                    setUsulanAction('revise')
                                    setShowUsulanModal(true) 
                                }}>
                                    Revisi Usulan
                                </button>
                            </div>
                        </div>
                    )}

                    {/* QC Panel - Admin & Reviewer Only */}
                    {canReviewStage && activeStage && (activeStage.status === 'review' || activeStage.status === 'done') && (
                        <div className="card" style={{ borderColor: 'var(--primary)' }}>
                            <div className="card-title" style={{ marginBottom: '0.75rem' }}>Panel QC</div>

                            {activeStage.status === 'review' && (
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <button className="btn btn-success" onClick={() => {
                                        setQcAction('approve')
                                        setQcConfirmed(false)
                                        setQcScore(getStageDynamicScore(project, activeStage, categoriesMap))
                                        // Non-aktifkan auto-select next stage untuk kategori terbitan (hybrid workflow)
                                        if (isSequential && project.category !== 'terbitan') {
                                            const nextPendingIdx = stages.findIndex((s, idx) => idx > activeStageIdx && s.status !== 'done' && s.status !== 'archived')
                                            if (nextPendingIdx !== -1) {
                                                setNextStageIdx(nextPendingIdx.toString())
                                                fetchCandidates(stages[nextPendingIdx].id, setNextCandidates, setNextCandidatesLoading)
                                            } else {
                                                setNextStageIdx('')
                                            }
                                        } else {
                                            setNextStageIdx('')
                                        }
                                        setShowQcModal(true)
                                    }}>
                                        Setuju
                                    </button>
                                    <button className="btn btn-danger" onClick={() => { setQcAction('revise'); setShowQcModal(true) }}>
                                        Revisi
                                    </button>
                                </div>
                            )}

                            {activeStage.status === 'done' && (
                                <div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 600, marginBottom: '0.5rem' }}>
                                        ✅ Tahap ini telah disetujui
                                    </div>
                                    <button
                                        className="btn btn-outline btn-sm"
                                        style={{ fontSize: '0.75rem' }}
                                        onClick={() => { setRevisionReason(''); setShowRevisionModal(true) }}
                                    >
                                        🔄 Ajukan Revisi
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Admin Override Panel — untuk memulihkan tahapan stuck di status active (akibat bug atau kesalahan alur) */}
                    {isAdmin && activeStage && activeStage.status === 'active' && (() => {
                        // Cek apakah semua tahap sebelumnya sudah done/archived
                        const prevIdx = stages.findIndex(s => s.id === activeStage.id)
                        const prevAllDone = prevIdx <= 0 || stages.slice(0, prevIdx).every(s => s.status === 'done' || s.status === 'archived')
                        if (!prevAllDone) return null
                        return (
                            <div className="card" style={{ borderColor: '#f59e0b', background: 'rgba(245,158,11,0.05)' }}>
                                <div className="card-title" style={{ marginBottom: '0.5rem', color: '#b45309', fontSize: '0.85rem' }}>
                                    ⚠ Admin: Pemulihan Tahapan
                                </div>
                                <p style={{ fontSize: '0.75rem', color: '#92400e', marginBottom: '0.75rem' }}>
                                    Tahapan ini sedang berjalan namun semua tahap sebelumnya sudah selesai. Jika tahapan ini terkena bug status (sebelumnya sudah selesai lalu kembali aktif), admin dapat langsung menandainya sebagai selesai.
                                </p>
                                <button
                                    className="btn btn-sm"
                                    style={{ background: '#b45309', color: '#fff', border: 'none', fontSize: '0.75rem' }}
                                    onClick={async () => {
                                        const ok = await showConfirm({
                                            title: 'Paksa Tandai Selesai',
                                            message: `Paksa tandai tahap "${activeStage.label}" sebagai SELESAI? Lakukan ini hanya jika tahap ini terkena bug status.`,
                                            type: 'warning',
                                            confirmText: 'Paksa Selesai'
                                        })
                                        if (!ok) return
                                        try {
                                            await updateStage(activeStage.id, { status: 'done', progress: 100 })
                                            showToast(`Tahap "${activeStage.label}" berhasil ditandai selesai.`, 'success')
                                        } catch (e) {
                                            showToast('Gagal memperbarui status tahap.', 'error')
                                        }
                                    }}
                                >
                                    ✅ Paksa Tandai Selesai
                                </button>
                            </div>
                        )
                    })()}

                    {/* PJ Revision Card — visible to PJ when their stage is done */}
                    {!isAdmin && isMyStage && activeStage && activeStage.status === 'done' && (
                        <div className="card" style={{ borderColor: 'var(--success)', background: 'var(--success-bg, #f0fdf4)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <span style={{ fontSize: '1.1rem' }}>✅</span>
                                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--success)' }}>Tahapan Anda sudah disetujui</div>
                            </div>
                            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                                Jika masih ada yang perlu diperbaiki, Anda dapat mengajukan revisi.
                            </p>
                            {activeStage.revisionReason && (
                                <div style={{ fontSize: '0.75rem', color: '#b45309', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 'var(--radius)', padding: '0.5rem 0.75rem', marginBottom: '0.75rem' }}>
                                    <strong>⚠ Catatan revisi sebelumnya:</strong> {activeStage.revisionReason}
                                </div>
                            )}
                            <button
                                className="btn btn-outline btn-sm"
                                onClick={() => { setRevisionReason(''); setShowRevisionModal(true) }}
                            >
                                🔄 Ajukan Revisi
                            </button>
                        </div>
                    )}

                    {/* Notes / Discussion */}
                    <div className="card" ref={discussionRef}>
                        <div className="card-title" style={{ marginBottom: '0.75rem' }}>💬 Catatan & Diskusi</div>

                        <div className="chat-messages">
                            {(!activeStage?.notes || activeStage.notes.length === 0) ? (
                                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', padding: '1rem' }}>
                                    Belum ada catatan
                                </div>
                            ) : (
                                activeStage.notes.map((note, idx) => (
                                    <div key={idx} className={`chat-bubble ${note.from === currentUser.name ? 'sent' : 'received'}`}>
                                        <div className="chat-sender">{note.from}</div>
                                        <div className="chat-text-content" style={{ fontSize: '0.85rem', lineHeight: '1.4' }}>
                                            {renderFormattedText(note.text)}
                                        </div>
                                        {note.attachment && (
                                            <div style={{ marginTop: '0.5rem' }}>
                                                <a href={note.attachment} target="_blank" rel="noopener noreferrer">
                                                    <img src={note.attachment} alt="Attachment" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '4px' }} />
                                                </a>
                                            </div>
                                        )}
                                        <div className="chat-time">
                                            {new Date(note.time).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="chat-input" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <input
                                type="file"
                                id="noteFile"
                                style={{ display: 'none' }}
                                accept="image/*"
                                onChange={handleAttachmentChange}
                            />
                            <label
                                htmlFor="noteFile"
                                style={{
                                    cursor: 'pointer', padding: '0.5rem', borderRadius: '4px',
                                    background: noteAttachment ? 'var(--primary)' : 'var(--surface-hover)',
                                    color: noteAttachment ? '#fff' : 'inherit',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}
                                title={noteAttachment ? noteAttachment.name : "Lampirkan Gambar"}
                            >
                                📎
                            </label>
                            <textarea
                                value={noteText}
                                onChange={e => setNoteText(e.target.value)}
                                onPaste={handlePasteImage}
                                placeholder="Tulis catatan..."
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault()
                                        handleSendNote()
                                    }
                                }}
                                style={{
                                    flex: 1,
                                    resize: 'vertical',
                                    minHeight: '38px',
                                    maxHeight: '120px',
                                    padding: '0.55rem 0.75rem',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border-color, #e2e8f0)',
                                    fontSize: '0.85rem',
                                    fontFamily: 'inherit',
                                    lineHeight: '1.4',
                                }}
                                rows={1}
                            />
                            <button className="btn btn-primary btn-sm" onClick={handleSendNote} disabled={isUploadingNote || (!noteText.trim() && !noteAttachment)}>
                                {isUploadingNote ? 'Mengirim...' : 'Kirim'}
                            </button>
                        </div>
                        {noteAttachment && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                File terlampir: {noteAttachment.name} <span style={{ cursor: 'pointer', color: 'var(--danger)' }} onClick={() => setNoteAttachment(null)}>✕</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Edit Project Modal */}
            {showEditProjectModal && (
                <div className="modal-overlay" onClick={() => setShowEditProjectModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                            <h2>✏️ Edit Proyek</h2>
                            <button className="modal-close" onClick={() => setShowEditProjectModal(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Judul Proyek *</label>
                                <input
                                    type="text"
                                    value={editProjectFields.title || ''}
                                    onChange={e => setEditProjectFields(f => ({ ...f, title: e.target.value }))}
                                    placeholder="Judul proyek..."
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Jenis / Tipe</label>
                                {CATEGORIES[project.category]?.types?.length > 0 ? (
                                    <select
                                        value={editProjectFields.type || ''}
                                        onChange={e => setEditProjectFields(f => ({ ...f, type: e.target.value }))}
                                    >
                                        <option value="">Pilih Jenis...</option>
                                        {CATEGORIES[project.category].types.map(t => (
                                            <option key={t.id} value={t.id}>{t.label}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type="text"
                                        value={editProjectFields.type || ''}
                                        onChange={e => setEditProjectFields(f => ({ ...f, type: e.target.value }))}
                                        placeholder="Jenis proyek..."
                                    />
                                )}
                            </div>
                            {isTerbitan && (
                                <div className="form-group">
                                    <label className="form-label">Jumlah Halaman Buku (Naskah)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={editProjectFields.pageCount || 0}
                                        onChange={e => setEditProjectFields(f => ({ ...f, pageCount: parseInt(e.target.value) || 0 }))}
                                        placeholder="Contoh: 150"
                                    />
                                    <div className="form-hint" style={{ marginTop: '0.25rem', fontSize: '0.75rem' }}>Digunakan untuk menentukan raihan skor secara otomatis.</div>
                                </div>
                            )}
                            <div className="form-group">
                                <label className="form-label">Deskripsi</label>
                                <textarea
                                    rows={3}
                                    value={editProjectFields.description || ''}
                                    onChange={e => setEditProjectFields(f => ({ ...f, description: e.target.value }))}
                                    placeholder="Deskripsi singkat proyek..."
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Link Google Drive</label>
                                <input
                                    type="url"
                                    value={editProjectFields.gdriveLink || ''}
                                    onChange={e => setEditProjectFields(f => ({ ...f, gdriveLink: e.target.value }))}
                                    placeholder="https://drive.google.com/..."
                                />
                            </div>

                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-outline" onClick={() => setShowEditProjectModal(false)}>Batal</button>
                            <button
                                className="btn btn-primary"
                                disabled={!editProjectFields.title?.trim()}
                                onClick={async () => {
                                    await updateProject(project.id, editProjectFields)
                                    setShowEditProjectModal(false)
                                    showToast('Proyek berhasil diperbarui!', 'success')
                                }}
                            >Simpan Perubahan</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Revision Request Modal */}
            {showRevisionModal && activeStage && (
                <div className="modal-overlay" onClick={() => !isSubmittingRevision && setShowRevisionModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
                        <div className="modal-header">
                            <h2>🔄 Ajukan Revisi</h2>
                            <button className="modal-close" onClick={() => setShowRevisionModal(false)} disabled={isSubmittingRevision}>✕</button>
                        </div>
                        <div className="modal-body">
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                                Tahap yang akan direvisi: <strong>"{activeStage.label}"</strong>
                            </p>
                            <div className="form-group">
                                <label className="form-label">Alasan Revisi <span style={{ color: 'var(--danger)' }}>*</span></label>
                                <textarea
                                    rows={4}
                                    value={revisionReason}
                                    onChange={e => setRevisionReason(e.target.value)}
                                    placeholder="Jelaskan dengan jelas apa yang perlu direvisi..."
                                    style={{ width: '100%', resize: 'vertical' }}
                                    disabled={isSubmittingRevision}
                                />
                                <div style={{ fontSize: '0.72rem', color: revisionReason.trim().length < 5 ? 'var(--danger)' : 'var(--text-muted)', marginTop: '0.25rem' }}>
                                    {revisionReason.trim().length}/5 karakter minimum
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-outline" onClick={() => setShowRevisionModal(false)} disabled={isSubmittingRevision}>Batal</button>
                            <button
                                className="btn btn-warning"
                                disabled={revisionReason.trim().length < 5 || isSubmittingRevision}
                                onClick={async () => {
                                    setIsSubmittingRevision(true)
                                    try {
                                        const updated = await api.stages.requestRevision(activeStage.id, revisionReason.trim())
                                        await updateStage(activeStage.id, { status: 'active', revisionReason: revisionReason.trim() })
                                        setShowRevisionModal(false)
                                        setRevisionReason('')
                                        showToast('Revisi berhasil diajukan. Tahapan dibuka kembali.', 'success')
                                    } catch (e) {
                                        showToast(e.message || 'Gagal mengajukan revisi', 'error')
                                    } finally {
                                        setIsSubmittingRevision(false)
                                    }
                                }}
                            >
                                {isSubmittingRevision ? 'Memproses...' : '🔄 Kirim Permintaan Revisi'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Usulan Modal */}
            {showUsulanModal && (
                <div className="modal-overlay" onClick={() => setShowUsulanModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{usulanAction === 'accept' ? 'Terima Usulan' : 'Revisi Usulan'}</h2>
                            <button className="modal-close" onClick={() => setShowUsulanModal(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            {usulanAction === 'accept' ? (
                                <>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                                        Usulan tata letak akan <strong>diterima</strong>. Penata Letak dapat mengajukan Review setelah ini.
                                        <div style={{ marginTop: '0.75rem', background: 'var(--surface-hover)', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                                            <div style={{ marginBottom: '0.25rem' }}>
                                                <label className="form-label" style={{ marginBottom: '0.25rem' }}>Revisi Poin Tahapan</label>
                                                <input
                                                    type="number"
                                                    className="form-control"
                                                    style={{ maxWidth: '200px', opacity: usulanConfirmed ? 0.5 : 1 }}
                                                    value={usulanScore}
                                                    onChange={e => setUsulanScore(Number(e.target.value))}
                                                    min="0"
                                                    disabled={usulanConfirmed}
                                                />
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                {usulanConfirmed ? '🔒 Skor dikunci. Uncheck konfirmasi untuk merubah.' : 'Anda berhak merubah besaran skor/poin sebelum dikonfirmasi.'}
                                            </div>
                                        </div>
                                        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginTop: '1rem', cursor: 'pointer', background: 'rgba(11, 134, 55, 0.05)', padding: '0.75rem', borderRadius: 'var(--radius)' }}>
                                            <input
                                                type="checkbox"
                                                checked={usulanConfirmed}
                                                onChange={e => setUsulanConfirmed(e.target.checked)}
                                                style={{ marginTop: '0.2rem' }}
                                            />
                                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-body)' }}>Saya mengonfirmasi skor poin dan menerima usulan tata letak ini.</span>
                                        </label>
                                    </div>
                                </>
                            ) : (
                                <div className="form-group">
                                    <label className="form-label">Catatan Revisi Usulan</label>
                                    <textarea
                                        className="form-control"
                                        value={usulanNote}
                                        onChange={e => setUsulanNote(e.target.value)}
                                        placeholder="Jelaskan bagian mana yang perlu diperbaiki..."
                                        rows="4"
                                    />
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-outline" onClick={() => setShowUsulanModal(false)}>Batal</button>
                            <button 
                                className={`btn ${usulanAction === 'accept' ? 'btn-success' : 'btn-danger'}`} 
                                onClick={handleUsulanSubmit}
                                disabled={usulanAction === 'accept' && !usulanConfirmed}
                            >
                                {usulanAction === 'accept' ? 'Terima Usulan' : 'Kirim Revisi'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* QC Modal */}
            {showQcModal && (
                <div className="modal-overlay" onClick={() => setShowQcModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{qcAction === 'approve' ? '✅ Setuju & Lanjut' : '🔄 Permintaan Revisi'}</h2>
                            <button className="modal-close" onClick={() => setShowQcModal(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            {qcAction === 'approve' && (
                                <>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                                        Tahapan <strong>"{activeStage.label}"</strong> akan ditandai selesai.
                                        <div style={{ marginTop: '0.5rem', background: 'var(--surface-hover)', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                                            <div style={{ marginBottom: '0.25rem' }}>
                                                <label className="form-label" style={{ marginBottom: '0.25rem' }}>Revisi Poin Tahapan</label>
                                                <input type="number" step="any" className="form-control" style={{ maxWidth: '200px', opacity: qcConfirmed ? 0.5 : 1 }} value={qcScore} onChange={e => setQcScore(e.target.value)} min="0" disabled={qcConfirmed} />
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{qcConfirmed ? '🔒 Skor dikunci. Uncheck konfirmasi untuk merubah.' : 'Anda berhak merubah besaran skor/poin untuk tahap ini sebelum dikonfirmasi.'}</div>
                                        </div>
                                        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginTop: '1rem', cursor: 'pointer', background: 'rgba(28, 81, 161, 0.05)', padding: '0.75rem', borderRadius: 'var(--radius)' }}>
                                            <input type="checkbox" checked={qcConfirmed} onChange={(e) => setQcConfirmed(e.target.checked)} style={{ marginTop: '0.2rem' }} />
                                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-body)' }}>Saya mengonfirmasi bahwa skor poin dan tautan hasil kerja sudah sesuai, tidak ada perubahan lagi.</span>
                                        </label>
                                    </div>

                                    {nextStageIdx !== '' && stages[parseInt(nextStageIdx)] ? (
                                        <div style={{ background: 'var(--surface-hover)', padding: '1rem', borderRadius: 'var(--radius)', border: '1px dashed var(--border)', marginBottom: '1.25rem' }}>
                                            <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-body)', marginBottom: '0.5rem' }}>
                                                Apakah ingin mengganti PJ dan deadline untuk tahap berikutnya: <strong>"{stages[parseInt(nextStageIdx)].label}"</strong>?
                                            </p>
                                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                                                Jika tidak, biarkan kosong untuk menggunakan PJ dan deadline yang sudah ditentukan sebelumnya.
                                            </p>

                                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                                <label className="form-label">PJ Tahap Berikutnya (Opsional)</label>
                                                {nextCandidatesLoading ? (
                                                    <div style={{ padding: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Memuat kandidat...</div>
                                                ) : (
                                                    <select value={nextPjId} onChange={e => handleNextPjSelect(e.target.value)}>
                                                        <option value="">Gunakan PJ saat ini ({stages[parseInt(nextStageIdx)].pj?.name || 'Belum ditugaskan'})</option>
                                                        {nextCandidates.map(c => {
                                                            const wl = getWorkloadLevel(c.activeStages)
                                                            return (
                                                                <option key={c.id} value={c.id}>
                                                                    {c.name}{wl ? ` ⚠ (${wl.label})` : ''}
                                                                </option>
                                                            )
                                                        })}
                                                    </select>
                                                )}
                                            </div>

                                            {nextSelectedWorkload && (() => {
                                                const wl = getWorkloadLevel(nextSelectedWorkload.activeStages)
                                                if (!wl) return null
                                                return (
                                                    <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 'var(--radius)', fontSize: '0.78rem', color: '#b45309', marginTop: '-0.5rem', marginBottom: '1rem' }}>
                                                        <strong>⚠ Peringatan Beban Kerja:</strong> <strong>{nextSelectedWorkload.name}</strong> sedang menangani <strong>{wl.count} tahapan aktif lain ({wl.label})</strong>.
                                                    </div>
                                                )
                                            })()}

                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label className="form-label">Deadline Baru (Opsional)</label>
                                                <input type="date" value={nextDeadline} onChange={e => setNextDeadline(e.target.value)} />
                                                {stages[parseInt(nextStageIdx)].deadline && (
                                                    <div className="form-hint" style={{ marginTop: '0.25rem' }}>
                                                        Deadline saat ini: {formatDate(stages[parseInt(nextStageIdx)].deadline)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        (stages.filter(s => s.id !== activeStage.id && s.status !== 'done' && s.status !== 'archived').length === 0) ? (
                                            <div style={{ padding: '1rem', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 'var(--radius)', fontSize: '0.82rem', color: '#065f46' }}>
                                                🎉 Ini adalah tahapan terakhir! Proyek akan selesai sepenuhnya setelah tahapan ini disetujui.
                                            </div>
                                        ) : null
                                    )}
                                </>
                            )}
                            {qcAction === 'revise' && (
                                <div className="form-group">
                                    <label className="form-label">Catatan Revisi *</label>
                                    <textarea
                                        rows={4}
                                        value={revisionNote}
                                        onChange={e => setRevisionNote(e.target.value)}
                                        placeholder="Jelaskan apa yang harus direvisi..."
                                        required
                                        style={{ width: '100%' }}
                                    />
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-outline" onClick={() => setShowQcModal(false)} disabled={isApprovingQc}>Batal</button>
                            {qcAction === 'approve' ? (
                                <button className="btn btn-success" onClick={handleApprove} disabled={isApprovingQc || !qcConfirmed}>
                                    {isApprovingQc ? 'Memproses...' : 'Setujui'}
                                </button>
                            ) : (
                                <button className="btn btn-danger" onClick={handleRevise} disabled={isApprovingQc}>
                                    {isApprovingQc ? 'Memproses...' : 'Kirim Revisi'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Assign Stage Modal */}
            {showAssignModal && (() => {
                const canEditMainPj = isAdmin || currentUser?.id === project.createdBy || isFlexibleCategory;
                return (
                <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Assign PJ & Deadline</h2>
                            <button className="modal-close" onClick={() => setShowAssignModal(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                                Tahap: <strong>{stages[assignStageIdx]?.label}</strong>
                            </p>
                            <div className="form-group">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                                    <label className="form-label" style={{ margin: 0 }}>Penanggung Jawab Utama</label>
                                    {currentUser?.id && canEditMainPj && assignPjId !== currentUser.id && (
                                        <button
                                            type="button"
                                            className="btn btn-ghost btn-sm"
                                            style={{ fontSize: '0.7rem', color: 'var(--primary)', padding: '0 0.25rem' }}
                                            onClick={() => handleAssignPjSelect(currentUser.id)}
                                        >
                                            + Pilih Saya Sebagai PJ
                                        </button>
                                    )}
                                </div>
                                {candidatesLoading ? (
                                    <div style={{ padding: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Memuat kandidat berdasarkan skill...</div>
                                ) : candidates.length === 0 ? (
                                    <div style={{ padding: '0.5rem', color: 'var(--danger)', fontSize: '0.8rem' }}>Tidak ada kandidat dengan skill yang sesuai.</div>
                                ) : (
                                    <select value={assignPjId} onChange={e => handleAssignPjSelect(e.target.value)} disabled={!canEditMainPj}>
                                        <option value="">Pilih PJ ({candidates.length} kandidat)</option>
                                        {candidates.map(c => {
                                                const wl = getWorkloadLevel(c.activeStages)
                                                return (
                                                    <option key={c.id} value={c.id}>
                                                        {c.name}{wl ? ` ⚠ (${wl.label})` : ''}
                                                    </option>
                                                )
                                            })}
                                    </select>
                                )}
                            </div>
                            {selectedWorkload && (() => {
                                const wl = getWorkloadLevel(selectedWorkload.activeStages)
                                if (!wl) return null
                                return (
                                    <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 'var(--radius)', fontSize: '0.78rem', color: '#b45309', marginBottom: '0.75rem' }}>
                                        <strong>⚠ Peringatan Beban Kerja:</strong> <strong>{selectedWorkload.name}</strong> sedang menangani <strong>{wl.count} tahapan aktif lain ({wl.label})</strong>.
                                        <div style={{ marginTop: '0.35rem', fontStyle: 'italic', fontSize: '0.72rem' }}>Anda tetap bisa meng-assign (override). Klik "Simpan" untuk melanjutkan.</div>
                                    </div>
                                )
                            })()}
                            {/* Multi-Select Kolaborator / Co-PJ (Maksimal 2 Orang) */}
                            <div className="form-group" style={{ marginTop: '0.75rem', marginBottom: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                                    <label className="form-label" style={{ margin: 0, fontWeight: 700 }}>
                                        Kolaborator / Co-PJ (Maksimal 2 Orang)
                                    </label>
                                    <span style={{ fontSize: '0.75rem', color: assignCoPjIds.length >= 2 ? '#b45309' : 'var(--text-muted)' }}>
                                        {assignCoPjIds.length}/2 Terpilih
                                    </span>
                                </div>

                                {/* List badge kolaborator yang sudah dipilih */}
                                {assignCoPjIds.length > 0 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.6rem' }}>
                                        {assignCoPjIds.map((coId, idx) => {
                                            const candidate = candidates.find(c => c.id === coId)
                                            const stageObj = stages[assignStageIdx]
                                            const stageCoPj = stageObj?.coPjs?.find(c => c.id === coId) || activeStage?.coPjs?.find(c => c.id === coId)
                                            const coName = candidate?.name || stageCoPj?.name || (activeStage?.coPj?.id === coId ? activeStage.coPj.name : 'Kolaborator ' + (idx + 1))
                                            return (
                                                <span
                                                    key={coId}
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '0.35rem',
                                                        padding: '0.25rem 0.6rem',
                                                        borderRadius: '20px',
                                                        background: '#eff6ff',
                                                        color: '#1d4ed8',
                                                        fontSize: '0.78rem',
                                                        fontWeight: 600,
                                                        border: '1px solid #bfdbfe'
                                                    }}
                                                >
                                                    <span className="material-symbols-outlined text-[14px]">group</span>
                                                    {coName}
                                                    <button
                                                        type="button"
                                                        onClick={() => setAssignCoPjIds(prev => prev.filter(id => id !== coId))}
                                                        style={{
                                                            background: 'transparent',
                                                            border: 'none',
                                                            color: '#1d4ed8',
                                                            cursor: 'pointer',
                                                            padding: '0 2px',
                                                            fontSize: '0.85rem',
                                                            display: 'flex',
                                                            alignItems: 'center'
                                                        }}
                                                        title="Hapus Kolaborator"
                                                    >
                                                        ✕
                                                    </button>
                                                </span>
                                            )
                                        })}
                                    </div>
                                )}

                                {/* Dropdown penambahan kolaborator (jika masih kurang dari 2) */}
                                {assignCoPjIds.length < 2 ? (
                                    candidatesLoading ? (
                                        <div style={{ padding: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Memuat kandidat...</div>
                                    ) : (
                                        <select
                                            value=""
                                            onChange={e => {
                                                const val = e.target.value
                                                if (val && !assignCoPjIds.includes(val) && val !== assignPjId) {
                                                    setAssignCoPjIds(prev => [...prev, val].slice(0, 2))
                                                }
                                            }}
                                        >
                                            <option value="">+ Tambah Kolaborator ({candidates.filter(c => c.id !== assignPjId && !assignCoPjIds.includes(c.id)).length} kandidat)...</option>
                                            {candidates
                                                .filter(c => c.id !== assignPjId && !assignCoPjIds.includes(c.id))
                                                .map(c => {
                                                    const wl = getWorkloadLevel(c.activeStages)
                                                    return (
                                                        <option key={c.id} value={c.id}>
                                                            {c.name}{wl ? ` ⚠ (${wl.label})` : ''}
                                                        </option>
                                                    )
                                                })}
                                        </select>
                                    )
                                ) : (
                                    <div style={{ fontSize: '0.72rem', color: '#059669', fontStyle: 'italic', background: '#ecfdf5', padding: '0.35rem 0.6rem', borderRadius: '6px' }}>
                                        ✓ Batas maksimal 2 kolaborator telah tercapai.
                                    </div>
                                )}
                            </div>
                            <div className="form-group">
                                <label className="form-label">Deadline</label>
                                <input type="date" value={assignDeadline} onChange={e => setAssignDeadline(e.target.value)} disabled={!canEditMainPj} />
                            </div>
                            {isAdmin && !['terbitan', 'medsos', 'keuangan'].includes(project.category) && (
                                <div className="form-group">
                                    <label className="form-label">Skor / Poin Tahapan</label>
                                    <input
                                        type="number"
                                        step="any"
                                        min="0"
                                        value={assignScore}
                                        onChange={e => setAssignScore(e.target.value)}
                                        placeholder="0"
                                    />
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-outline" onClick={() => setShowAssignModal(false)}>Batal</button>
                            <button className="btn btn-primary" onClick={handleAssignStage} disabled={!assignPjId}>
                                {selectedWorkload ? '⚠ Override & Simpan' : 'Simpan'}
                            </button>
                        </div>
                    </div>
                </div>
                );
            })()}

            {/* Archive Confirm Modal */}
            {showArchiveConfirm && (
                <div className="modal-overlay" onClick={() => setShowArchiveConfirm(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>📦 Arsipkan Tahap</h2>
                            <button className="modal-close" onClick={() => setShowArchiveConfirm(false)}>✕</button>
                        </div>
                        <div className="modal-body" style={{ textAlign: 'center' }}>
                            <p>Apakah Anda yakin ingin mengarsipkan tahap <strong>"{stages[archiveStageIdx]?.label}"</strong>?</p>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Tahap yang diarsipkan akan masuk ke halaman Arsip.</p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-outline" onClick={() => setShowArchiveConfirm(false)}>Tidak</button>
                            <button className="btn btn-success" onClick={handleArchive}>Ya, Arsipkan</button>
                        </div>
                    </div>
                </div>
            )}
            {/* Duplicate Project Modal */}
            {showDuplicateModal && (
                <div className="modal-overlay" onClick={() => !isDuplicating && setShowDuplicateModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>⎘ Salin Proyek</h2>
                            <button className="modal-close" onClick={() => setShowDuplicateModal(false)} disabled={isDuplicating}>✕</button>
                        </div>
                        <div className="modal-body">
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                                Proyek baru akan dibuat dengan tahapan yang sama beserta penugasan PJ.
                                Deadline, progress, dan catatan tidak akan disalin.
                            </p>
                            <div className="form-group">
                                <label className="form-label">Nama Proyek Baru</label>
                                <input
                                    type="text"
                                    value={duplicateTitle}
                                    onChange={e => setDuplicateTitle(e.target.value)}
                                    placeholder="Nama proyek salinan..."
                                    autoFocus
                                    onKeyDown={e => e.key === 'Enter' && handleDuplicateProject()}
                                />
                            </div>
                            <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'var(--primary-subtle)', borderRadius: 'var(--radius)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                <strong>Yang akan disalin:</strong>
                                <ul style={{ marginTop: '0.375rem', paddingLeft: '1.25rem' }}>
                                    <li>✅ Nama, kategori, dan jenis proyek</li>
                                    <li>✅ {stages.length} tahapan beserta penugasan PJ</li>
                                    <li>❌ Deadline, progress, catatan, dan link hasil</li>
                                </ul>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-outline" onClick={() => setShowDuplicateModal(false)} disabled={isDuplicating}>
                                Batal
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleDuplicateProject}
                                disabled={isDuplicating || duplicateTitle.trim().length < 3}
                                style={{ background: 'linear-gradient(135deg,#1c51a1,#2563c0)' }}
                            >
                                {isDuplicating ? 'Menyalin...' : '⎘ Salin Sekarang'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Project Confirm Modal */}
            {showDeleteConfirm && (
                <div className="modal-overlay" onClick={() => !isDeleting && setShowDeleteConfirm(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>🗑️ Hapus Proyek</h2>
                            <button className="modal-close" onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting}>✕</button>
                        </div>
                        <div className="modal-body" style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>⚠️</div>
                            <p style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.5rem' }}>
                                Hapus proyek <strong>"{project.title}"</strong>?
                            </p>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                                ID: <code style={{ fontFamily: 'monospace' }}>{project.id}</code>
                            </p>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.75rem', padding: '0.5rem', background: 'var(--bg-slate-50)', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)' }}>
                                ℹ️ Proyek akan dipindahkan ke <strong>Tempat Sampah</strong> dan dapat dipulihkan dalam 30 hari sebelum dihapus permanen.
                            </p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-outline" onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting}>
                                Batal
                            </button>
                            <button className="btn btn-danger" onClick={handleDeleteProject} disabled={isDeleting}>
                                {isDeleting ? 'Memindahkan...' : '🗑️ Pindahkan ke Sampah'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Archive Project Confirm Modal */}
            {showArchiveProjectConfirm && (
                <div className="modal-overlay" onClick={() => setShowArchiveProjectConfirm(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
                        <div className="modal-header">
                            <h2>📦 Arsipkan Proyek</h2>
                            <button className="modal-close" onClick={() => setShowArchiveProjectConfirm(false)}>✕</button>
                        </div>
                        <div className="modal-body" style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📦</div>
                            <p style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.5rem' }}>
                                Arsipkan proyek <strong>"{project.title}"</strong>?
                            </p>
                            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                Proyek ini akan muncul di menu Arsip. Proyek juga masih akan terlihat di Dashboard dan Daftar Proyek selama 2 bulan.
                            </p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-outline" onClick={() => setShowArchiveProjectConfirm(false)}>Tidak</button>
                            <button className="btn btn-success" onClick={handleArchiveProject}>Ya, Arsipkan</button>
                        </div>
                    </div>
                </div>
            )}

            <Toast message={toast.message} type={toast.type} open={toast.open} onClose={closeToast} />
        </div>
    )
}
