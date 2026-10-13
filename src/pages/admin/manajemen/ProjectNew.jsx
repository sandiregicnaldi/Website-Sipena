import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../../context/AppContext'
import { api } from '../../../services/api'

export default function ProjectNew() {
    const { addProject, categoriesMap, currentUser } = useApp()
    const navigate = useNavigate()

    const [title, setTitle] = useState('')
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [category, setCategory] = useState('')
    const [projectType, setProjectType] = useState('')
    const [gdriveLink, setGdriveLink] = useState('')
    const [pageCount, setPageCount] = useState('')
    const [projectScore, setProjectScore] = useState(0)
    const [startFromStage, setStartFromStage] = useState(0)
    const [showKbPopup, setShowKbPopup] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [toast, setToast] = useState(null) // { type: 'success'|'error', message: string }

    const showToast = (type, message) => {
        setToast({ type, message })
        if (type === 'success') setTimeout(() => setToast(null), 3500)
    }

    // For Lainnya: custom type and stages
    const [customType, setCustomType] = useState('')
    const [customStages, setCustomStages] = useState([{ id: 'custom-1', label: '', score: 0 }])

    // Stage assignments (PJ, deadline)
    const [stageAssignments, setStageAssignments] = useState({})
    const [deadlineErrors, setDeadlineErrors] = useState({})

    // Mode penginputan: 'manual' (default) | 'auto' (sistem tentukan PJ & deadline)
    const [assignMode, setAssignMode] = useState('manual')
    // Hasil preview auto-assign: array of { label, order, pjId, pjName, deadline, hk, reason, noEligiblePJ }
    const [autoPreview, setAutoPreview] = useState(null)
    const [loadingPreview, setLoadingPreview] = useState(false)

    // API Candidates storage
    const [candidatesMap, setCandidatesMap] = useState({})
    const [loadingCandidates, setLoadingCandidates] = useState(false)


    const selectedCategory = category ? categoriesMap[category] : null
    const isTerbitan = category === 'terbitan'
    const isSequentialWithAllPJ = ['terbitan', 'medsos', 'keuangan'].includes(category)
    const types = selectedCategory?.types || []
    const hasPredefinedTypes = types.length > 0;
    // Categories that use free-form parallel workflow (same as lainnya)
    // Built-in flexible ones + any custom categories that have parallel workflow or no stages defined
    const isFlexibleCategory = selectedCategory
        ? (selectedCategory.workflow === 'parallel' || (selectedCategory.workflow === 'sequential' && (!selectedCategory.stages || selectedCategory.stages.length === 0)))
        && !['terbitan', 'medsos', 'keuangan'].includes(category)
        : false
    const isAdmin = currentUser?.role === 'admin'

    const stages = (selectedCategory?.typeStages && projectType && selectedCategory.typeStages[projectType]) 
        ? selectedCategory.typeStages[projectType] 
        : (selectedCategory?.stages || [])

    // Fetch candidates for current stages
    useEffect(() => {
        const fetchAllCandidates = async () => {
            if (!category) return;

            setLoadingCandidates(true);
            const newMap = { ...candidatesMap };
            let hasNew = false;

            const stagesToFetch = isFlexibleCategory ? customStages : stages;

            for (const stage of stagesToFetch) {
                const labelToFetch = isFlexibleCategory ? '__ALL__' : stage.label;
                if (labelToFetch && !newMap[labelToFetch]) {
                    try {
                        const result = await api.stages.getCandidatesByLabel(labelToFetch);
                        newMap[labelToFetch] = result.candidates;
                        hasNew = true;
                    } catch (err) {
                        console.error(`Failed to fetch candidates for ${labelToFetch}:`, err);
                    }
                }
            }

            if (hasNew) setCandidatesMap(newMap);
            setLoadingCandidates(false);
        };

        fetchAllCandidates();
    }, [category, projectType, customStages]);

    const handleCategoryChange = (e) => {
        const cat = e.target.value
        setCategory(cat)
        setProjectType('')
        setStartFromStage(0)
        setStageAssignments({})
    }

    const updateStageAssignment = (stageIdx, field, value) => {
        setStageAssignments(prev => ({
            ...prev,
            [stageIdx]: { ...prev[stageIdx], [field]: value }
        }))
    }

    const handleDeadlineChange = (idx, value) => {
        updateStageAssignment(idx, 'deadline', value)
        if (!isSequentialWithAllPJ) return
        const newAssign = { ...stageAssignments, [idx]: { ...stageAssignments[idx], deadline: value } }
        const deadlines = stages.map((_, i) => newAssign[i]?.deadline || '')
        const errors = {}
        for (let i = 0; i < deadlines.length; i++) {
            if (!deadlines[i]) continue
            for (let j = i - 1; j >= 0; j--) {
                if (deadlines[j]) { if (deadlines[i] < deadlines[j]) errors[i] = `Tidak boleh lebih awal dari Tahap ${j + 1}`; break }
            }
            if (!errors[i]) {
                for (let j = i + 1; j < deadlines.length; j++) {
                    if (deadlines[j]) { if (deadlines[i] > deadlines[j]) errors[i] = `Tidak boleh lebih akhir dari Tahap ${j + 1}`; break }
                }
            }
        }
        setDeadlineErrors(errors)
    }

    const addCustomStage = () => {
        setCustomStages(prev => [...prev, { id: `custom-${prev.length + 1}`, label: '', score: 0 }])
    }

    const updateCustomStageScore = (idx, score) => {
        setCustomStages(prev => prev.map((s, i) => i === idx ? { ...s, score: Math.max(0, parseInt(score) || 0) } : s))
    }

    // Level kesibukan — sama persis dengan widget Dashboard
    const BUSY_LEVELS = [
        { min: 0, max: 0, label: 'Nyantai',                 emoji: '😴', warnColor: '#16a34a' },
        { min: 1, max: 1, label: 'Mode Hemat Energi',       emoji: '🧘', warnColor: '#2563eb' },
        { min: 2, max: 2, label: 'Sibuk',                   emoji: '💼', warnColor: '#d97706' },
        { min: 3, max: 3, label: 'Sibuk Banget',            emoji: '🏃', warnColor: '#ea580c' },
        { min: 4, max: 4, label: 'Vertigo',                 emoji: '😵‍💫', warnColor: '#db2777' },
        { min: 5, max: 5, label: 'Asam lambung mulai naik', emoji: '🤢', warnColor: '#dc2626' },
        { min: 6, max: Infinity, label: 'Bentar lagi tipes',emoji: '🤒', warnColor: '#9f1239' },
    ]
    const getWorkloadLevel = (activeStages) => {
        if (activeStages === undefined || activeStages === null) return null
        const lvl = BUSY_LEVELS.find(l => activeStages >= l.min && activeStages <= l.max)
        return lvl ? { ...lvl, count: activeStages } : null
    }

    const removeCustomStage = (idx) => {
        setCustomStages(prev => prev.filter((_, i) => i !== idx))
    }

    const updateCustomStage = (idx, label) => {
        setCustomStages(prev => prev.map((s, i) => i === idx ? { ...s, label } : s))
    }

    const isValidUrl = (str) => {
        try {
            new URL(str)
            return true
        } catch {
            return false
        }
    }

    const handleKnowledgeBase = () => {
        if (!selectedCategory) return
        if (selectedCategory.knowledgeBase) {
            window.open(selectedCategory.knowledgeBase, '_blank')
        } else {
            setShowKbPopup(true)
        }
    }

    // Ambil prakiraan penugasan otomatis dari backend
    const handleAutoPreview = async () => {
        if (!category || !stages.length) {
            showToast('error', 'Pilih kategori dan jenis proyek terlebih dahulu.')
            return
        }
        setLoadingPreview(true)
        setAutoPreview(null)
        try {
            const stageList = stages.map((s, idx) => ({ label: s.label, order: s.order || idx + 1 }))
            const result = await api.stages.autoAssignPreview({
                category,
                workflow: selectedCategory?.workflow || 'sequential',
                stages: stageList,
                startDate: new Date().toISOString(),
            })

            setAutoPreview(result.assignments || [])
        } catch (err) {
            showToast('error', 'Gagal memuat prakiraan penugasan: ' + (err.message || 'Error tidak diketahui'))
        } finally {
            setLoadingPreview(false)
        }
    }

    const updateAutoPreviewItem = (index, field, value) => {
        setAutoPreview(prev => {
            if (!prev) return prev;
            const updated = [...prev];
            const current = { ...updated[index] };
            if (field === 'pjId') {
                current.pjId = value || null;
                const stageCandidates = candidatesMap[current.label] || [];
                const found = stageCandidates.find(c => c.id === value);
                current.pjName = found ? found.name : (value ? 'PJ Terpilih' : null);
                current.noEligiblePJ = !value;
            } else if (field === 'deadline') {
                current.deadline = value || null;
            }
            updated[index] = current;
            return updated;
        });
    }

    const handleSubmit = async (e) => {
        e.preventDefault()


        // Must be declared FIRST — used inside stages.map below
        const catObj = categoriesMap[category]
        const typeObj = hasPredefinedTypes ? types.find(t => t.id === projectType) : null

        let projectStages
        if (isFlexibleCategory) {
            projectStages = customStages.filter(s => s.label.trim()).map((s, idx) => ({
                id: s.id,
                label: s.label,
                order: idx + 1,
                status: 'active', // Tahapan pengerjaan bersamaan berstatus 'active' (Sedang Berjalan)
                pjId: stageAssignments[idx]?.pjId || '',
                deadline: stageAssignments[idx]?.deadline || '',
                progress: 0,
                resultLink: '',
                score: Number(s.score) || 0,
                notes: []
            }))
        } else {
            projectStages = stages.map((stage, idx) => {
                const isSkipped = idx < startFromStage
                const isFirst = idx === startFromStage
                const assignment = stageAssignments[idx] || {}
                const singlePjId = stageAssignments[startFromStage]?.pjId || ''
                const isSinglePJ = catObj?.singlePJ
                // Hitung skor per-halaman jika stage mendukungnya (perPageScore > 0) dan pageCount tersedia
                const pc = isTerbitan ? (Number(pageCount) || 0) : 0
                const scoreVal = (stage.perPageScore && Number(stage.perPageScore) > 0 && pc > 0)
                    ? Math.round((pc / (Number(stage.pageMultiplier) || 10)) * Number(stage.perPageScore) * 100) / 100
                    : (Number(stage.score) || 0)

                if (idx < startFromStage) {
                    return {
                        ...stage,
                        status: 'done',
                        pjId: '',
                        deadline: '',
                        progress: 100,
                        resultLink: '',
                        score: scoreVal,
                        notes: []
                    }
                }

                const initialStatus = catObj?.workflow === 'parallel' ? 'active' : (isFirst ? 'active' : 'draft')

                let stagePjId = isSinglePJ ? singlePjId : (assignment.pjId || '')
                let stageDeadline = assignment.deadline || ''

                // Jika mode auto dan preview sudah dimuat/diedit oleh user, gunakan data dari preview
                if (assignMode === 'auto' && autoPreview) {
                    const ap = autoPreview.find(p => p.label?.trim().toLowerCase() === stage.label?.trim().toLowerCase()) || autoPreview[idx]
                    if (ap) {
                        stagePjId = ap.pjId || ''
                        stageDeadline = ap.deadline ? (ap.deadline.includes('T') ? ap.deadline.split('T')[0] : ap.deadline) : ''
                    }
                }

                return {
                    ...stage,
                    status: initialStatus,
                    pjId: stagePjId,
                    deadline: stageDeadline,
                    progress: 0,
                    resultLink: '',
                    score: scoreVal,
                    notes: []
                }
            })
        }

        // Jika user memakai mode auto DAN sudah menghasilkan/mengedit preview,
        // kirim sebagai 'manual' agar backend tidak menimpa penugasan yang sudah disetujui/diedit user
        const hasCustomizedAutoPreview = assignMode === 'auto' && autoPreview !== null
        const finalAssignMode = hasCustomizedAutoPreview ? 'manual' : (isSequentialWithAllPJ ? assignMode : 'manual')

        const newProject = {
            title,
            date,
            category,
            categoryLabel: catObj?.label || category,
            categoryIcon: catObj?.icon || '📋',
            type: hasPredefinedTypes ? projectType : customType,
            typeLabel: hasPredefinedTypes ? (typeObj?.label || projectType) : customType,
            workflow: catObj?.workflow || 'parallel',
            singlePJ: catObj?.singlePJ || false,
            gdriveLink,
            pageCount: isTerbitan ? Number(pageCount) || 0 : 0,
            score: isFlexibleCategory ? projectStages.reduce((sum, s) => sum + (Number(s.score) || 0), 0) : 0,
            createdBy: currentUser?.id || null,
            assignMode: finalAssignMode,
            stages: projectStages
        }


        // ── Client-side validation ─────────────────────────────
        if (!title.trim()) { showToast('error', 'Judul proyek wajib diisi.'); return }
        if (title.trim().length < 3) { showToast('error', 'Judul proyek minimal 3 karakter (saat ini hanya ' + title.trim().length + ' karakter).'); return }
        if (!category) { showToast('error', 'Pilih kategori proyek terlebih dahulu.'); return }
        if (hasPredefinedTypes && !projectType) { showToast('error', 'Pilih tipe proyek terlebih dahulu.'); return }
        if (!hasPredefinedTypes && !customType.trim()) { showToast('error', 'Ketik tipe proyek untuk kategori ini.'); return }
        if (isAdmin && isFlexibleCategory) {
            const hasEmptyScore = customStages.some(s => s.label.trim() && (!s.score || Number(s.score) <= 0))
            if (hasEmptyScore) {
                showToast('error', 'Skor untuk setiap tahapan wajib diisi dengan nilai lebih dari 0.');
                return
            }
        }
        if (isSequentialWithAllPJ && !isFlexibleCategory) {
            if (Object.values(deadlineErrors).some(Boolean)) { showToast('error', 'Terdapat urutan deadline yang tidak valid. Periksa kembali.'); return }
        }

        // ── Submit to API ──────────────────────────────────────
        setSubmitting(true)
        try {
            await addProject(newProject)
            showToast('success', 'Proyek berhasil dibuat! Mengalihkan...')
            setTimeout(() => navigate('/admin/manajemen/proyek'), 1500)
        } catch (err) {
            // Parse server Zod errors
            let msg = 'Gagal membuat proyek. Silakan coba lagi.'
            const errData = err?.data || err?.response?.data || err
            if (Array.isArray(errData?.error)) {
                const fieldMap = { title: 'Judul', category: 'Kategori', type: 'Tipe Proyek' }
                msg = errData.error.map(e => {
                    const field = fieldMap[e.path?.[0]] || e.path?.[0] || 'Field'
                    if (e.code === 'too_small') return `${field} minimal ${e.minimum} karakter.`
                    if (e.code === 'invalid_enum_value') return `${field} tidak valid.`
                    return `${field}: ${e.message}`
                }).join(' ')
            } else if (typeof errData?.error === 'string') {
                msg = errData.error
            }
            showToast('error', msg)
        }
        setSubmitting(false)
    }

    const firstStageIdx = startFromStage

    return (
        <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
            {/* ── Toast Notification ── */}
            {toast && (
                <div
                    className="fixed top-6 right-6 z-50 flex items-start gap-3 px-5 py-4 rounded-2xl shadow-2xl max-w-sm animate-[slideIn_.25s_ease]"
                    style={{
                        background: toast.type === 'success'
                            ? 'linear-gradient(135deg,#0b8637,#059669)'
                            : 'linear-gradient(135deg,#c0152f,#e02442)',
                        boxShadow: toast.type === 'success'
                            ? '0 8px 32px rgba(11,134,55,.35)'
                            : '0 8px 32px rgba(192,21,47,.35)',
                        color: '#fff',
                    }}
                >
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                            {toast.type === 'success' ? 'check_circle' : 'cancel'}
                        </span>
                    </div>
                    <div className="flex-1">
                        <p className="font-bold text-sm">{toast.type === 'success' ? 'Berhasil!' : 'Gagal!'}</p>
                        <p className="text-white/90 text-xs mt-0.5 leading-relaxed">{toast.message}</p>
                    </div>
                    {toast.type === 'error' && (
                        <button onClick={() => setToast(null)} className="text-white/70 hover:text-white ml-1">
                            <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                    )}
                </div>
            )}
            <div className="mb-6">
                <div className="flex items-center text-sm font-medium text-slate-500 mb-2">
                    <span className="hover:text-slate-700 cursor-pointer" onClick={() => navigate('/admin/manajemen/proyek')}>Proyek</span>
                    <span className="material-symbols-outlined text-[16px] mx-1">chevron_right</span>
                    <span className="text-[#1c51a1] font-bold">Buat Proyek Baru</span>
                </div>
                <h1 className="text-[22px] font-extrabold text-slate-900 tracking-tight">Buat Proyek Baru</h1>
                <p className="text-[13px] text-slate-500 mt-1">Isi detail proyek dan penugasan tahapan di bawah ini.</p>
            </div>

            <form onSubmit={handleSubmit}>
                {/* Informasi Proyek */}
                <div className="bg-white border border-slate-200/60 rounded-xl mb-6 shadow-sm">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#1c51a1]">info</span>
                        <h2 className="text-[15px] font-bold text-slate-900">Informasi Proyek</h2>
                    </div>
                    <div className="p-6 space-y-5">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 mb-1.5">Judul Proyek *</label>
                            <input
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="Contoh: Kampanye Buku Tahunan 2024"
                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-[#1c51a1] focus:ring-1 focus:ring-[#1c51a1] transition-all"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 mb-1.5">Tanggal Mulai *</label>
                                <input 
                                    type="date" 
                                    value={date} 
                                    onChange={e => setDate(e.target.value)} 
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-[#1c51a1] focus:ring-1 focus:ring-[#1c51a1] transition-all"
                                    required 
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 mb-1.5">Kategori *</label>
                                <select 
                                    value={category} 
                                    onChange={handleCategoryChange}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-[#1c51a1] focus:ring-1 focus:ring-[#1c51a1] transition-all cursor-pointer"
                                    required
                                >
                                    <option value="">Pilih Kategori</option>
                                    {Object.values(categoriesMap).filter(cat => cat.active !== false).map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {isTerbitan && (
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 mb-1.5">Jumlah Halaman Buku (Naskah) *</label>
                                <input
                                    type="number"
                                    value={pageCount}
                                    onChange={e => setPageCount(e.target.value)}
                                    placeholder="Contoh: 150"
                                    min="1"
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-[#1c51a1] focus:ring-1 focus:ring-[#1c51a1] transition-all"
                                    required
                                />
                                <p className="text-[10px] text-slate-400 mt-1">Digunakan untuk menghitung poin produktivitas tahapan (Penyuntingan & Tata Letak).</p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 mb-1.5">Tipe Proyek *</label>
                                {!hasPredefinedTypes ? (
                                    <input
                                        type="text"
                                        value={customType}
                                        onChange={e => setCustomType(e.target.value)}
                                        placeholder="Ketik tipe proyek..."
                                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-[#1c51a1] focus:ring-1 focus:ring-[#1c51a1] transition-all"
                                        required
                                    />
                                ) : (
                                    <select
                                        value={projectType}
                                        onChange={e => {
                                            setProjectType(e.target.value)
                                            setStageAssignments({})
                                            setStartFromStage(0)
                                        }}
                                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-[#1c51a1] focus:ring-1 focus:ring-[#1c51a1] transition-all cursor-pointer disabled:bg-slate-50 disabled:text-slate-400"
                                        required
                                        disabled={!category}
                                    >
                                        <option value="">Pilih Tipe</option>
                                        {types.map(t => (
                                            <option key={t.id} value={t.id}>{t.label}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 mb-1.5">Link Folder GDrive</label>
                                <div className="relative">
                                    <input
                                        type="url"
                                        value={gdriveLink}
                                        onChange={e => setGdriveLink(e.target.value)}
                                        placeholder="https://drive.google.com/..."
                                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-[#1c51a1] focus:ring-1 focus:ring-[#1c51a1] transition-all pr-10"
                                    />
                                    {gdriveLink && (
                                        <span className={`absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[18px] ${isValidUrl(gdriveLink) ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            {isValidUrl(gdriveLink) ? 'check_circle' : 'cancel'}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Knowledge Base Banner */}
                        <div 
                            onClick={handleKnowledgeBase}
                            className={`flex items-start gap-3 p-4 rounded-lg mt-4 cursor-pointer transition-colors ${selectedCategory?.knowledgeBase ? 'bg-[#eef4fc] hover:bg-[#e4ecf7]' : 'bg-slate-50 hover:bg-slate-100'}`}
                        >
                            <span className={`material-symbols-outlined ${selectedCategory?.knowledgeBase ? 'text-[#1c51a1]' : 'text-slate-400'}`}>tips_and_updates</span>
                            <div>
                                <h4 className="text-[12px] font-bold text-slate-800">Informasi Tambahan</h4>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                    {selectedCategory?.knowledgeBase 
                                        ? `Pedoman kerja ${selectedCategory.label} tersedia. Klik untuk membuka.` 
                                        : 'Pedoman kerja akan muncul secara otomatis setelah Anda memilih kategori yang sesuai.'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tahapan & Penugasan */}
                {category && (
                    <div className="bg-white border border-slate-200/60 rounded-xl shadow-sm mb-6 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-[#1c51a1]">assignment</span>
                                <h2 className="text-[15px] font-bold text-slate-900">Tahapan & Penugasan</h2>
                            </div>
                            {isFlexibleCategory && (
                                <button type="button" onClick={addCustomStage} className="text-[#1c51a1] hover:text-[#0b5cd5] text-xs font-bold flex items-center gap-1 bg-[#eef4fc] px-3 py-1.5 rounded-md">
                                    <span className="material-symbols-outlined text-[16px]">add</span> Tambah Tahapan
                                </button>
                            )}
                        </div>
                        
                        <div className="p-6">
                            {/* ── Toggle Mode Penugasan (hanya untuk terbitan/medsos/keuangan) ── */}
                            {isSequentialWithAllPJ && (
                                <div className="mb-5 p-4 bg-slate-50 rounded-xl border border-slate-200">
                                    <p className="text-[11px] font-bold text-slate-500 mb-2">MODE PENUGASAN</p>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => { setAssignMode('manual'); setAutoPreview(null) }}
                                            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold border transition-all flex items-center justify-center gap-2 ${assignMode === 'manual' ? 'bg-[#1c51a1] text-white border-[#1c51a1] shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
                                        >
                                            <span className="material-symbols-outlined text-[17px]">edit</span>
                                            Manual
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setAssignMode('auto'); setAutoPreview(null) }}
                                            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold border transition-all flex items-center justify-center gap-2 ${assignMode === 'auto' ? 'bg-[#1c51a1] text-white border-[#1c51a1] shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
                                        >
                                            <span className="material-symbols-outlined text-[17px]">auto_awesome</span>
                                            Otomatis
                                        </button>
                                    </div>
                                    {assignMode === 'auto' && (
                                        <p className="text-[11px] text-slate-500 mt-2">
                                            Sistem akan menentukan PJ dan deadline secara otomatis berdasarkan beban kerja per tahapan.
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* ── Panel Preview Auto-Assign ── */}
                            {assignMode === 'auto' && isSequentialWithAllPJ && (
                                <div className="mb-5">
                                    <button
                                        type="button"
                                        onClick={handleAutoPreview}
                                        disabled={loadingPreview || !category || !stages.length}
                                        className="w-full py-2.5 px-4 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg text-sm font-semibold hover:bg-amber-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {loadingPreview
                                            ? <><span className="material-symbols-outlined text-[17px] animate-spin">progress_activity</span> Memuat prakiraan…</>
                                            : <><span className="material-symbols-outlined text-[17px]">preview</span> Lihat Prakiraan Penugasan</>
                                        }
                                    </button>

                                    {autoPreview && (
                                        <div className="mt-3 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-[17px] text-[#1c51a1]">assignment_ind</span>
                                                    <span className="text-[13px] font-bold text-slate-800">Prakiraan Penugasan Otomatis</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-[13px]">edit</span>
                                                        Dapat diedit manual per baris
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={handleAutoPreview}
                                                        disabled={loadingPreview}
                                                        className="text-[11px] text-[#1c51a1] hover:text-[#0b5cd5] font-semibold flex items-center gap-1 hover:underline"
                                                    >
                                                        <span className="material-symbols-outlined text-[13px]">refresh</span>
                                                        Reset Rekomendasi
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-[12px]">
                                                    <thead>
                                                        <tr className="bg-slate-50/80">
                                                            <th className="text-left px-4 py-2.5 font-semibold text-slate-500 border-b border-slate-100">Tahapan</th>
                                                            <th className="text-left px-4 py-2.5 font-semibold text-slate-500 border-b border-slate-100 min-w-[200px]">Penanggung Jawab (PJ)</th>
                                                            <th className="text-left px-4 py-2.5 font-semibold text-slate-500 border-b border-slate-100 min-w-[170px]">Deadline</th>
                                                            <th className="text-right px-4 py-2.5 font-semibold text-slate-500 border-b border-slate-100 w-20">HK</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {autoPreview.map((a, i) => {
                                                            const stageObj = stages.find(s => s.label?.trim().toLowerCase() === a.label?.trim().toLowerCase())
                                                            const rawCandidates = candidatesMap[a.label] || []
                                                            const stageReqSkills = stageObj?.requiredSkills || []
                                                            const eligiblePJ = stageReqSkills.length > 0
                                                                ? rawCandidates.filter(c => stageReqSkills.some(s => c.skills?.includes(s)))
                                                                : rawCandidates

                                                            return (
                                                                <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                                                                    <td className="px-4 py-2.5 font-medium text-slate-800">
                                                                        <div>{a.label}</div>
                                                                        {a.reason && (
                                                                            <p className="text-[10px] text-slate-400 font-normal mt-0.5 leading-tight">{a.reason}</p>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-4 py-2.5">
                                                                        <select
                                                                            value={a.pjId || ''}
                                                                            onChange={e => updateAutoPreviewItem(i, 'pjId', e.target.value)}
                                                                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[12px] text-slate-800 focus:outline-none focus:border-[#1c51a1] focus:ring-1 focus:ring-[#1c51a1] cursor-pointer"
                                                                        >
                                                                            <option value="">-- Masuk Bursa Tugas --</option>
                                                                            {eligiblePJ.map(m => {
                                                                                const wl = getWorkloadLevel(m.activeStages)
                                                                                const suffix = wl ? ` (${wl.count} aktif)` : ''
                                                                                return (
                                                                                    <option key={m.id} value={m.id}>
                                                                                        {m.name}{suffix}
                                                                                    </option>
                                                                                )
                                                                            })}
                                                                        </select>
                                                                    </td>
                                                                    <td className="px-4 py-2.5">
                                                                        <input
                                                                            type="date"
                                                                            value={a.deadline ? (a.deadline.includes('T') ? a.deadline.split('T')[0] : a.deadline) : ''}
                                                                            onChange={e => updateAutoPreviewItem(i, 'deadline', e.target.value)}
                                                                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[12px] text-slate-800 focus:outline-none focus:border-[#1c51a1] focus:ring-1 focus:ring-[#1c51a1]"
                                                                        />
                                                                    </td>
                                                                    <td className="px-4 py-2.5 text-right text-slate-500 font-medium whitespace-nowrap">{a.hk} HK</td>
                                                                </tr>
                                                            )
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                            <div className="px-4 py-2 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                                                <p className="text-[10px] text-slate-400">
                                                    Penugasan dan deadline di atas akan langsung disimpan saat Anda menekan tombol Buat Proyek.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {!isFlexibleCategory && stages.length > 0 && (
                                <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-100">
                                    <label className="block text-[11px] font-bold text-slate-500 mb-1.5">Mulai dari Tahap</label>
                                    <select 
                                        value={startFromStage} 
                                        onChange={e => setStartFromStage(parseInt(e.target.value))}
                                        className="w-full md:w-1/2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-[#1c51a1] focus:ring-1 focus:ring-[#1c51a1] transition-all cursor-pointer"
                                    >
                                        {stages.map((stage, idx) => (
                                            <option key={stage.id} value={idx}>
                                                {idx + 1}. {stage.label}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-[11px] text-slate-400 mt-1.5">Tahapan sebelumnya akan otomatis ditandai sebagai selesai.</p>
                                </div>
                            )}

                            {/* Sequential stages — sembunyikan assignment jika mode auto */}
                            {!isFlexibleCategory && (

                                <div className="space-y-4">
                                    {stages.map((stage, idx) => {
                                        const isSkipped = idx < startFromStage
                                        const isFirst = idx === startFromStage
                                        const isSinglePJ = selectedCategory?.singlePJ
                                        const showAssignment = isSequentialWithAllPJ ? !isSkipped : (isFirst || (isSinglePJ && idx === startFromStage))
                                        const rawCandidates = candidatesMap[stage.label] || []
                                        const stageReqSkills = stage.requiredSkills || []
                                        const eligiblePJ = stageReqSkills.length > 0
                                            ? rawCandidates.filter(c => stageReqSkills.some(s => c.skills?.includes(s)))
                                            : rawCandidates

                                        return (
                                            <div key={stage.id} className={`flex gap-4 ${isSkipped ? 'opacity-40' : 'opacity-100'}`}>
                                                <div className="flex flex-col items-center">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-sm ${isSkipped ? 'bg-emerald-100 text-emerald-600 border border-emerald-200' : isFirst ? 'bg-[#1c51a1] text-white' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
                                                        {isSkipped ? <span className="material-symbols-outlined text-[16px]">check</span> : idx + 1}
                                                    </div>
                                                    {idx < stages.length - 1 && <div className="w-px h-full bg-slate-200 my-2"></div>}
                                                </div>
                                                
                                                <div className={`flex-1 border rounded-xl p-5 mb-2 ${isFirst ? 'border-[#1c51a1]/30 bg-white shadow-sm' : 'border-slate-200 bg-white'}`}>
                                                    <h3 className="text-[15px] font-bold text-slate-900">{stage.label}</h3>
                                                    {isSkipped && <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded mt-1 inline-block">Selesai dilewati</span>}

                                                    {/* Mode auto: tampilkan info dari preview jika ada */}
                                                    {assignMode === 'auto' && !isSkipped && autoPreview && (() => {
                                                        const ap = autoPreview.find(a => a.label?.trim().toLowerCase() === stage.label?.trim().toLowerCase())
                                                        if (!ap) return null
                                                        return (
                                                            <div className="mt-3 flex flex-wrap gap-2">
                                                                <span className="inline-flex items-center gap-1 text-[11px] bg-blue-50 text-blue-700 border border-blue-100 px-2 py-1 rounded-md font-medium">
                                                                    <span className="material-symbols-outlined text-[13px]">person</span>
                                                                    {ap.noEligiblePJ ? 'Bursa Tugas' : ap.pjName}
                                                                </span>
                                                                {ap.deadline && (
                                                                    <span className="inline-flex items-center gap-1 text-[11px] bg-slate-50 text-slate-600 border border-slate-200 px-2 py-1 rounded-md">
                                                                        <span className="material-symbols-outlined text-[13px]">calendar_today</span>
                                                                        {new Date(ap.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )
                                                    })()}

                                                    {showAssignment && assignMode === 'manual' && (
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                                            <div>
                                                                <label className="block text-[11px] font-bold text-slate-500 mb-1.5">
                                                                    Penanggung Jawab (PJ) {isSinglePJ && idx === startFromStage ? '(Semua Tahap)' : ''}
                                                                </label>
                                                                <select
                                                                    value={stageAssignments[idx]?.pjId || ''}
                                                                    onChange={e => updateStageAssignment(idx, 'pjId', e.target.value)}
                                                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-[#1c51a1] focus:ring-1 focus:ring-[#1c51a1] transition-all cursor-pointer"
                                                                >
                                                                    <option value="">Pilih PJ</option>
                                                                    {eligiblePJ.map(m => {
                                                                        const wl = getWorkloadLevel(m.activeStages)
                                                                        const suffix = wl ? ` (${wl.count} aktif)` : ''
                                                                        return (
                                                                            <option key={m.id} value={m.id}>
                                                                                {m.name}{suffix}
                                                                            </option>
                                                                        )
                                                                    })}
                                                                </select>
                                                                {/* Workload Warning */}
                                                                {(() => {
                                                                    const sel = eligiblePJ.find(p => p.id === stageAssignments[idx]?.pjId)
                                                                    const wl = sel ? getWorkloadLevel(sel.activeStages) : null
                                                                    if (!wl || wl.count === 0) return null
                                                                    return (
                                                                        <div className="mt-2 p-2 rounded-md border flex items-start gap-1.5" style={{ backgroundColor: `${wl.warnColor}10`, borderColor: `${wl.warnColor}30`, color: wl.warnColor }}>
                                                                            <span className="text-sm">{wl.emoji}</span>
                                                                            <span className="text-[11px] leading-tight font-medium">
                                                                                Sedang menangani <strong>{wl.count}</strong> tahapan aktif. Level: <strong>{wl.label}</strong>
                                                                            </span>
                                                                        </div>
                                                                    )
                                                                })()}
                                                            </div>
                                                            
                                                            <div>
                                                                <label className="block text-[11px] font-bold text-slate-500 mb-1.5">
                                                                    Deadline {isTerbitan && <span className="font-normal text-slate-400 normal-case">(Opsional)</span>}
                                                                </label>
                                                                <input
                                                                    type="date"
                                                                    value={stageAssignments[idx]?.deadline || ''}
                                                                    onChange={e => handleDeadlineChange(idx, e.target.value)}
                                                                    className={`w-full px-4 py-2.5 bg-white border rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-1 transition-all ${deadlineErrors[idx] ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500' : 'border-slate-200 focus:border-[#1c51a1] focus:ring-[#1c51a1]'}`}
                                                                />
                                                                {deadlineErrors[idx] && (
                                                                    <p className="text-[11px] font-medium text-rose-500 mt-1 flex items-center gap-1">
                                                                        <span className="material-symbols-outlined text-[13px]">error</span>
                                                                        {deadlineErrors[idx]}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {!isFirst && !isSkipped && !isSinglePJ && !isSequentialWithAllPJ && (
                                                        <div className="mt-3 flex items-center justify-center p-3 border border-dashed border-slate-200 rounded-lg bg-slate-50 text-slate-400">
                                                            <span className="material-symbols-outlined mr-1.5 text-[18px]">lock</span>
                                                            <span className="text-[11px] font-medium uppercase tracking-wider">Akan diisi saat estafet</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}

                            {/* Flexible parallel stages */}
                            {isFlexibleCategory && (
                                <div className="space-y-4">
                                    {customStages.map((stage, idx) => {
                                        const eligiblePJ = candidatesMap['__ALL__'] || []
                                        return (
                                            <div key={stage.id} className="p-5 border border-slate-200 rounded-xl bg-white shadow-sm flex flex-wrap gap-4 items-start">
                                                <div className="flex-1 min-w-[200px]">
                                                    <label className="block text-[11px] font-bold text-slate-500 mb-1.5">Nama Tahapan</label>
                                                    <input
                                                        type="text"
                                                        value={stage.label}
                                                        onChange={e => updateCustomStage(idx, e.target.value)}
                                                        placeholder={`Contoh: Tahap ${idx + 1}`}
                                                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#1c51a1] transition-all"
                                                    />
                                                </div>
                                                <div className="w-full md:w-48">
                                                    <label className="block text-[11px] font-bold text-slate-500 mb-1.5">Penanggung Jawab</label>
                                                    <select
                                                        value={stageAssignments[idx]?.pjId || ''}
                                                        onChange={e => updateStageAssignment(idx, 'pjId', e.target.value)}
                                                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#1c51a1] transition-all"
                                                    >
                                                        <option value="">Pilih PJ</option>
                                                        {eligiblePJ.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                                    </select>
                                                </div>
                                                <div className="w-full md:w-40">
                                                    <label className="block text-[11px] font-bold text-slate-500 mb-1.5">Deadline</label>
                                                    <input
                                                        type="date"
                                                        value={stageAssignments[idx]?.deadline || ''}
                                                        onChange={e => updateStageAssignment(idx, 'deadline', e.target.value)}
                                                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#1c51a1] transition-all"
                                                    />
                                                </div>
                                                {isAdmin && (
                                                    <div className="w-24">
                                                        <label className="block text-[11px] font-bold text-slate-500 mb-1.5">Skor</label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={stage.score || 0}
                                                            onChange={e => updateCustomStageScore(idx, e.target.value)}
                                                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-center focus:outline-none focus:border-[#1c51a1] transition-all"
                                                        />
                                                    </div>
                                                )}
                                                {customStages.length > 1 && (
                                                    <button type="button" onClick={() => removeCustomStage(idx)} className="mt-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-2 rounded-lg transition-colors">
                                                        <span className="material-symbols-outlined text-[20px]">delete</span>
                                                    </button>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 mt-8">
                    <button 
                        type="button" 
                        onClick={() => navigate('/admin/manajemen/proyek')} 
                        disabled={submitting}
                        className="px-6 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                        Batal
                    </button>
                    <button
                        type="submit"
                        disabled={submitting || !title.trim() || !category || (hasPredefinedTypes && !projectType) || (!hasPredefinedTypes && !customType.trim())}
                        className="px-6 py-2.5 text-sm font-bold text-white bg-[#0b5cd5] hover:bg-[#094caf] rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[140px]"
                    >
                        {submitting
                            ? <><span className="material-symbols-outlined text-[18px] animate-spin mr-2">progress_activity</span> Menyimpan...</>
                            : 'Simpan Proyek'
                        }
                    </button>
                </div>
            </form>

            {/* KB Popup */}
            {showKbPopup && (
                <div className="modal-overlay" onClick={() => setShowKbPopup(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Informasi</h2>
                            <button className="modal-close" onClick={() => setShowKbPopup(false)}>✕</button>
                        </div>
                        <div className="modal-body" style={{ textAlign: 'center', padding: '2rem' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
                            <p style={{ color: 'var(--text-secondary)' }}>Belum ada pedoman kerja untuk kategori ini.</p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-primary" onClick={() => setShowKbPopup(false)}>Tutup</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
