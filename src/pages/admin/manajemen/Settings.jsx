import { useState, useEffect, useCallback } from 'react'
import { useApp } from '../../../context/AppContext'
import { api } from '../../../services/api'
import { DDC_CODES } from '../../../data/ddc'
import { CATEGORIES } from '../../../data/categories'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

// ─── Skill constants (shared with UserManagement) ────────────────────────────
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

// ─── Helper ──────────────────────────────────────────────────────────────────
const initials = (name) => {
    if (!name) return '?'
    const parts = name.trim().split(' ').filter(Boolean)
    return parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : parts[0]?.slice(0, 2).toUpperCase() || '?'
}

const AVATAR_PALETTES = [
    { bg: '#dce8f8', text: '#163d7a', label: 'Biru' },
    { bg: '#d1fae5', text: '#065f46', label: 'Hijau' },
    { bg: '#fef3c7', text: '#92400e', label: 'Kuning' },
    { bg: '#fee2e2', text: '#991b1b', label: 'Merah' },
    { bg: '#ede9fe', text: '#5b21b6', label: 'Ungu' },
    { bg: '#cffafe', text: '#155e75', label: 'Cyan' },
]

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, type = 'success', onClose }) {
    useEffect(() => {
        const t = setTimeout(onClose, 3500)
        return () => clearTimeout(t)
    }, [onClose])
    return (
        <div
            className="fixed top-6 right-6 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-semibold text-white animate-fade-in"
            style={{
                background: type === 'success' ? 'linear-gradient(135deg,#059669,#10b981)' : 'linear-gradient(135deg,#dc2626,#ef4444)',
                boxShadow: type === 'success' ? '0 8px 24px rgba(16,185,129,.35)' : '0 8px 24px rgba(239,68,68,.35)',
            }}
        >
            <span className="material-symbols-outlined text-[18px]"
                style={{ fontVariationSettings: "'FILL' 1" }}>
                {type === 'success' ? 'check_circle' : 'error'}
            </span>
            {message}
            <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100">
                <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
        </div>
    )
}

// ─── Section Header ────────────────────────────────────────────────────────────
function SectionHeader({ icon, title, desc }) {
    return (
        <div className="flex items-start gap-4 mb-6">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#eef4fc]">
                <span className="material-symbols-outlined text-[20px] text-[#0b5cd5] font-bold">
                    {icon}
                </span>
            </div>
            <div>
                <h2 className="text-[17px] font-extrabold text-slate-900 tracking-tight">{title}</h2>
                <p className="text-[13px] text-slate-500 mt-1 leading-relaxed">{desc}</p>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 1: MASTER DATA
// ─────────────────────────────────────────────────────────────────────────────

// ── 1a. DDC Management ────────────────────────────────────────────────────────
function DDCManager() {
    const { ddcList, setDdcList } = useApp()
    const [search, setSearch] = useState('')
    const [modal, setModal] = useState(null) // null | 'add' | {edit: item}
    const [form, setForm] = useState({ code: '', label: '' })
    const [formError, setFormError] = useState('')

    const filtered = ddcList.filter(d =>
        d.code.includes(search) || d.label.toLowerCase().includes(search.toLowerCase())
    )

    const openAdd = () => {
        setForm({ code: '', label: '' })
        setFormError('')
        setModal('add')
    }

    const openEdit = (item) => {
        setForm({ code: item.code, label: item.label })
        setFormError('')
        setModal({ edit: item })
    }

    const handleSave = () => {
        if (!form.code.trim() || !form.label.trim()) {
            setFormError('Kode dan label wajib diisi')
            return
        }
        if (modal === 'add') {
            if (ddcList.find(d => d.code === form.code.trim())) {
                setFormError('Kode DDC sudah ada')
                return
            }
            setDdcList(prev => [...prev, { code: form.code.trim(), label: form.label.trim(), active: true }])
        } else {
            setDdcList(prev => prev.map(d => d.code === modal.edit.code
                ? { ...d, label: form.label.trim() }
                : d
            ))
        }
        setModal(null)
    }

    const toggleActive = (code) => {
        setDdcList(prev => prev.map(d => d.code === code ? { ...d, active: !d.active } : d))
    }

    return (
        <div>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                <SectionHeader icon="tag" title="Manajemen Kode DDC"
                    desc="Tambah, edit, atau nonaktifkan kode DDC yang digunakan pada Generator NIP." />
                
                {/* Search + Add */}
                <div className="flex items-center gap-3">
                    <div className="w-full md:w-64 flex items-center bg-white hover:bg-slate-50/50 focus-within:bg-white border border-slate-200 hover:border-slate-300 focus-within:border-[#0b5cd5] rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-[#0b5cd5]/15 transition-all shadow-xs gap-2.5 group">
                        <svg className="text-slate-400 group-focus-within:text-[#0b5cd5] shrink-0 transition-colors pointer-events-none" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Cari kode atau label..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full bg-transparent border-none outline-none p-0 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-0 leading-normal"
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => setSearch('')}
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
                    <button
                        onClick={openAdd}
                        className="flex items-center gap-1.5 px-4 py-2 text-white text-sm font-semibold rounded-xl transition-all hover:bg-[#094caf] shadow-xs whitespace-nowrap"
                        style={{ backgroundColor: '#0b5cd5' }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Tambah Kode
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                {[
                    { label: 'TOTAL KODE', value: ddcList.length, color: '#1e293b', icon: 'list_alt', iconColor: '#64748b', bg: '#f1f5f9' },
                    { label: 'AKTIF', value: ddcList.filter(d => d.active).length, color: '#059669', icon: 'check_circle', iconColor: '#10b981', bg: '#ecfdf5' },
                    { label: 'NONAKTIF', value: ddcList.filter(d => !d.active).length, color: '#dc2626', icon: 'cancel', iconColor: '#ef4444', bg: '#fef2f2' },
                ].map(s => (
                    <div key={s.label} className="bg-white rounded-xl p-5 border border-slate-200/60 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: s.bg, color: s.iconColor }}>
                            <span className="material-symbols-outlined text-[22px]">{s.icon}</span>
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{s.label}</p>
                            <p className="text-[28px] font-black mt-0.5 leading-none" style={{ color: s.color }}>{s.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="text-left px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 w-24">Kode</th>
                                <th className="text-left px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">Label Kategori</th>
                                <th className="text-left px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 w-32">Status</th>
                                <th className="text-right px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 w-28">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="text-center py-12 text-slate-400">
                                        <span className="material-symbols-outlined text-4xl text-slate-200 block mb-2">search_off</span>
                                        Tidak ada kode ditemukan
                                    </td>
                                </tr>
                            ) : filtered.map(item => (
                                <tr key={item.code} className={`transition-colors hover:bg-slate-50 ${!item.active ? 'opacity-60 grayscale-[50%]' : ''}`}>
                                    <td className="px-6 py-4 font-mono font-bold text-slate-800 text-[13px]">{item.code}</td>
                                    <td className="px-6 py-4">
                                        <div className="font-semibold text-slate-800 text-[13px]" style={{ textDecoration: item.active ? 'none' : 'line-through' }}>{item.label}</div>
                                        {/* Jika ada sub-deskripsi bisa ditambahkan di sini, mockup menunjukkan 2 baris teks, kita bisa simulasi dengan teks kecil */}
                                        <div className="text-[11px] text-slate-400 mt-0.5 font-medium">{item.label} & Terkait</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${item.active
                                            ? 'bg-emerald-50 text-emerald-600'
                                            : 'bg-slate-100 text-slate-500'}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${item.active ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                                            {item.active ? 'Aktif' : 'Nonaktif'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3 justify-end">
                                            <button onClick={() => openEdit(item)} className="p-1.5 border border-slate-200 rounded-lg text-slate-400 hover:text-[#0b5cd5] hover:border-[#0b5cd5] hover:bg-blue-50 transition-all shadow-sm bg-white" title="Edit">
                                                <span className="material-symbols-outlined text-[16px]">edit</span>
                                            </button>
                                            <button onClick={() => toggleActive(item.code)} className={`w-9 h-5 rounded-full relative transition-colors ${item.active ? 'bg-emerald-500' : 'bg-slate-300'}`} title={item.active ? "Nonaktifkan" : "Aktifkan"}>
                                                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${item.active ? 'left-4.5' : 'left-0.5'}`} style={{ left: item.active ? '1.125rem' : '0.125rem' }}></span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    
                    {/* Pagination Dummy (seperti di mockup) */}
                    <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <span className="text-[11px] text-slate-500 font-medium">Menampilkan 1–{Math.min(filtered.length, 10)} dari {filtered.length} data</span>
                        <div className="flex items-center gap-1">
                            <button className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:bg-slate-200 transition-colors disabled:opacity-50"><span className="material-symbols-outlined text-[16px]">chevron_left</span></button>
                            <button className="w-7 h-7 flex items-center justify-center rounded bg-[#0b5cd5] text-white font-bold text-xs shadow-sm">1</button>
                            <button className="w-7 h-7 flex items-center justify-center rounded text-slate-600 hover:bg-slate-200 transition-colors font-bold text-xs">2</button>
                            <button className="w-7 h-7 flex items-center justify-center rounded text-slate-600 hover:bg-slate-200 transition-colors font-bold text-xs">3</button>
                            <span className="w-5 text-center text-slate-400 text-xs">...</span>
                            <button className="w-7 h-7 flex items-center justify-center rounded text-slate-600 hover:bg-slate-200 transition-colors font-bold text-xs">64</button>
                            <button className="w-7 h-7 flex items-center justify-center rounded text-slate-600 hover:bg-slate-200 transition-colors"><span className="material-symbols-outlined text-[16px]">chevron_right</span></button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {modal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: 'rgba(15,23,42,.6)', backdropFilter: 'blur(4px)' }}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-7" onClick={e => e.stopPropagation()}>
                        <h3 className="text-[18px] font-extrabold text-slate-900 mb-5 tracking-tight">
                            {modal === 'add' ? 'Tambah Kode DDC Baru' : 'Edit Kode DDC'}
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Kode DDC</label>
                                <input
                                    type="text"
                                    value={form.code}
                                    onChange={e => setForm(p => ({ ...p, code: e.target.value }))}
                                    disabled={modal !== 'add'}
                                    placeholder="cth: 370"
                                    className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#0b5cd5] focus:border-[#0b5cd5] transition-all disabled:bg-slate-50 disabled:text-slate-400"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Label / Keterangan</label>
                                <input
                                    type="text"
                                    value={form.label}
                                    onChange={e => setForm(p => ({ ...p, label: e.target.value }))}
                                    placeholder="cth: Pendidikan"
                                    className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#0b5cd5] focus:border-[#0b5cd5] transition-all"
                                />
                            </div>
                            {formError && (
                                <p className="text-[12px] text-rose-500 font-semibold flex items-center gap-1 bg-rose-50 p-2 rounded-md">
                                    <span className="material-symbols-outlined text-[16px]">error</span>
                                    {formError}
                                </p>
                            )}
                        </div>
                        <div className="flex justify-end gap-3 mt-8">
                            <button onClick={() => setModal(null)}
                                className="px-5 py-2.5 bg-slate-100 text-slate-600 font-bold text-sm rounded-lg hover:bg-slate-200 transition-all">
                                Batal
                            </button>
                            <button onClick={handleSave}
                                className="px-6 py-2.5 text-white font-bold text-sm rounded-lg transition-all hover:bg-[#094caf] shadow-sm"
                                style={{ backgroundColor: '#0b5cd5' }}>
                                Simpan
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

const BUILTIN_CATS = ['terbitan', 'medsos', 'keuangan', 'promosi', 'bimtek', 'lainnya']
const ICONS = ['📖', '📱', '💰', '📣', '🎓', '📋', '🗂️', '📝', '📊', '🔧', '🌐', '📦']
const WORKFLOWS = [
    { id: 'sequential', label: 'Berurutan (Estafet)' },
    { id: 'parallel', label: 'Paralel (Bersamaan)' },
]

// ── Skill Chip Picker (shared in add/edit stage modals) ───────────────────────
function SkillChipPicker({ selected = [], onChange }) {
    const toggle = (skill) => onChange(
        selected.includes(skill) ? selected.filter(s => s !== skill) : [...selected, skill]
    )
    return (
        <div className="flex flex-wrap gap-2 mt-1">
            {SKILL_OPTIONS.map(skill => {
                const active = selected.includes(skill)
                return (
                    <button key={skill} type="button" onClick={() => toggle(skill)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all ${
                            active
                                ? 'bg-[#1c51a1] text-white border-[#1c51a1] shadow-sm'
                                : 'bg-white text-slate-500 border-slate-200 hover:border-[#1c51a1] hover:text-[#1c51a1]'
                        }`}>
                        {SKILL_LABELS[skill]}
                    </button>
                )
            })}
        </div>
    )
}

function CategoryManager({ onToast }) {
    const { categoriesMap, setCategoriesMap, isAdmin } = useApp()

    // Simpan ke database setiap kali kategoriesMap berubah
    const saveToDb = useCallback((nextMap) => {
        api.settings.saveCategories(nextMap)
            .catch(e => console.warn('[settings] Gagal simpan ke DB:', e.message))
    }, [])

    // Derive list from shared context
    const catList = Object.values(categoriesMap)
    const setCatList = (updater) => {
        setCategoriesMap(prev => {
            const nextList = typeof updater === 'function'
                ? updater(Object.values(prev))
                : updater
            const nextMap = {}
            nextList.forEach(c => { nextMap[c.id] = c })
            saveToDb(nextMap) // Simpan ke DB
            return nextMap
        })
    }

    // Wrapper setCategoriesMap yang juga simpan ke DB
    const setCategoriesMapWithDb = useCallback((updater) => {
        setCategoriesMap(prev => {
            const nextMap = typeof updater === 'function' ? updater(prev) : updater
            saveToDb(nextMap) // Simpan ke DB
            return nextMap
        })
    }, [setCategoriesMap, saveToDb])

    const [selectedCat, setSelectedCat] = useState(() => Object.keys(categoriesMap)[0] || 'terbitan')
    const [modal, setModal] = useState(null) // null | 'addType'|'editType' | 'addCat'|'editCat' | 'deleteCat' | 'addStage'|'editStage'|'deleteStage'
    const [newLabel, setNewLabel] = useState('')
    const [newCat, setNewCat] = useState({ label: '', icon: '📋', workflow: 'sequential' })
    const [newStageLabel, setNewStageLabel] = useState('')
    const [newStagePosition, setNewStagePosition] = useState(1)
    const [newStageSkills, setNewStageSkills] = useState([]) // requiredSkills for new stage
    const [newStageScore, setNewStageScore] = useState(0)
    const [newStagePerPageScore, setNewStagePerPageScore] = useState(0)
    const [newStagePageMultiplier, setNewStagePageMultiplier] = useState(10)
    const [formError, setFormError] = useState('')
    const [editingType, setEditingType] = useState(null)   // { id, label }
    const [editingStage, setEditingStage] = useState(null) // { id, label, order, requiredSkills }
    const [editCatForm, setEditCatForm] = useState({ label: '', icon: '📋', workflow: 'sequential' })
    const [deleteStageTarget, setDeleteStageTarget] = useState(null) // { id, label }
    const [selectedTypeStage, setSelectedTypeStage] = useState('umum') // 'umum' atau 'terjemahan'
    const [savedSnapshot, setSavedSnapshot] = useState('')
    const [isDirty, setIsDirty] = useState(false)

    // Fallback: Jika DB app_settings lama belum memuat typeStages, kita inject agar UI tetap muncul
    const currentCat = categoriesMap[selectedCat] ? JSON.parse(JSON.stringify(categoriesMap[selectedCat])) : {}
    if (selectedCat === 'terbitan' && !currentCat.typeStages) {
        currentCat.typeStages = {
            terjemahan: [
                { id: 'terjemahkan', label: 'Terjemahkan', order: 1, score: 0, perPageScore: 1, pageMultiplier: 10 },
                { id: 'penyuntingan-terjemahan', label: 'Penyuntingan Naskah Terjemahan', order: 2, score: 0, perPageScore: 1, pageMultiplier: 10 }
            ]
        }
    }
    
    const currentTypes = currentCat?.types || []
    const isTerjemahanSelected = selectedTypeStage === 'terjemahan'
    const currentStages = isTerjemahanSelected 
        ? (currentCat?.typeStages?.['terjemahan'] || []) 
        : (currentCat?.stages || [])

    // Saat ganti kategori atau ganti tab typeStage, update snapshot
    useEffect(() => {
        setSavedSnapshot(JSON.stringify(currentStages))
        setIsDirty(false)
    }, [selectedCat, selectedTypeStage])
    const isBuiltin = BUILTIN_CATS.includes(selectedCat)
    const isSequential = currentCat?.workflow === 'sequential'

    // ── Add Type ──────────────────────────────────────────────────────────────
    const openAddType = () => { setNewLabel(''); setFormError(''); setModal('addType') }

    const handleAddType = () => {
        if (!newLabel.trim()) { setFormError('Nama jenis proyek wajib diisi'); return }
        if (currentTypes.find(t => t.label.toLowerCase() === newLabel.trim().toLowerCase())) {
            setFormError('Jenis proyek sudah ada'); return
        }
        const id = newLabel.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
        setCategoriesMapWithDb(prev => ({
            ...prev,
            [selectedCat]: { ...prev[selectedCat], types: [...(prev[selectedCat]?.types || []), { id, label: newLabel.trim() }] }
        }))
        setModal(null)
    }

    const removeType = (typeId) => {
        setCategoriesMapWithDb(prev => ({
            ...prev,
            [selectedCat]: { ...prev[selectedCat], types: (prev[selectedCat]?.types || []).filter(t => t.id !== typeId) }
        }))
    }

    // ── Add Category ──────────────────────────────────────────────────────────
    const openAddCat = () => { setNewCat({ label: '', icon: '📋', workflow: 'sequential' }); setFormError(''); setModal('addCat') }

    const handleAddCat = () => {
        if (!newCat.label.trim()) { setFormError('Nama kategori wajib diisi'); return }
        const id = newCat.label.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
        if (categoriesMap[id]) { setFormError('Kategori dengan nama ini sudah ada'); return }
        const newEntry = { id, label: newCat.label.trim(), icon: newCat.icon, workflow: newCat.workflow, types: [], stages: [], custom: true }
        setCategoriesMapWithDb(prev => ({ ...prev, [id]: newEntry }))
        setSelectedCat(id)
        setModal(null)
    }

    // ── Delete Category ───────────────────────────────────────────────────────
    const openDeleteCat = () => { setFormError(''); setModal('deleteCat') }

    const handleDeleteCat = () => {
        setCategoriesMapWithDb(prev => {
            const next = { ...prev }
            delete next[selectedCat]
            return next
        })
        const remaining = catList.find(c => c.id !== selectedCat)
        setSelectedCat(remaining?.id || 'terbitan')
        setModal(null)
    }

    // ── Toggle Category Active ───────────────────────────────────────────────
    const toggleCatActive = (catId) => {
        setCategoriesMapWithDb(prev => ({
            ...prev,
            [catId]: { ...prev[catId], active: prev[catId]?.active === false ? true : false }
        }))
    }

    // ── Stage Management ──────────────────────────────────────────────────────────
    const openAddStage = () => {
        setNewStageLabel('')
        setNewStagePosition(currentStages.length + 1)
        setNewStageSkills([])
        setNewStageScore(0)
        setNewStagePerPageScore(0)
        setNewStagePageMultiplier(10)
        setFormError('')
        setModal('addStage')
    }

    const parseScoreInput = (val) => {
        if (val === undefined || val === null || val === '') return 0
        if (typeof val === 'number') return Math.max(0, val)
        const normalized = String(val).replace(',', '.')
        const parsed = parseFloat(normalized)
        return isNaN(parsed) ? 0 : Math.max(0, parsed)
    }

    const handleAddStage = () => {
        if (!newStageLabel.trim()) { setFormError('Nama tahapan wajib diisi'); return }
        if (currentStages.find(s => s.label.toLowerCase() === newStageLabel.trim().toLowerCase())) {
            setFormError('Tahapan sudah ada'); return
        }
        const id = newStageLabel.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
        const insertAt = Math.max(1, Math.min(newStagePosition, currentStages.length + 1)) - 1
        const newStage = { id, label: newStageLabel.trim(), order: insertAt + 1, requiredSkills: newStageSkills, score: parseScoreInput(newStageScore), perPageScore: parseScoreInput(newStagePerPageScore), pageMultiplier: parseScoreInput(newStagePageMultiplier) || 10 }
        const updated = [
            ...currentStages.slice(0, insertAt),
            newStage,
            ...currentStages.slice(insertAt),
        ].map((s, i) => ({ ...s, order: i + 1 }))
        setCategoriesMapWithDb(prev => {
            const cat = prev[selectedCat]
            if (isTerjemahanSelected) {
                return { ...prev, [selectedCat]: { ...cat, typeStages: { ...(cat.typeStages || {}), terjemahan: updated } } }
            }
            return { ...prev, [selectedCat]: { ...cat, stages: updated } }
        })
        setIsDirty(true)
        setModal(null)
    }

    const openDeleteStage = (stage) => {
        setDeleteStageTarget(stage)
        setModal('deleteStage')
    }

    const confirmDeleteStage = () => {
        if (!deleteStageTarget) return
        setCategoriesMapWithDb(prev => {
            const cat = prev[selectedCat]
            const sourceArray = isTerjemahanSelected ? (cat.typeStages?.['terjemahan'] || []) : (cat.stages || [])
            const updated = sourceArray
                .filter(s => s.id !== deleteStageTarget.id)
                .map((s, i) => ({ ...s, order: i + 1 }))
            
            if (isTerjemahanSelected) {
                return { ...prev, [selectedCat]: { ...cat, typeStages: { ...(cat.typeStages || {}), terjemahan: updated } } }
            }
            return { ...prev, [selectedCat]: { ...cat, stages: updated } }
        })
        setDeleteStageTarget(null)
        setModal(null)
        setIsDirty(true)
    }

    const handleSaveStages = () => {
        // Simpan ulang ke DB secara eksplisit untuk memastikan semua perubahan tersinkron
        saveToDb(categoriesMap)
        setSavedSnapshot(JSON.stringify(currentStages))
        setIsDirty(false)
        onToast?.('Perubahan tahapan berhasil disimpan ke database!', 'success')
    }

    // ── Edit Category ──────────────────────────────────────────────────────────
    const openEditCat = () => {
        setEditCatForm({ label: currentCat?.label || '', icon: currentCat?.icon || '📋', workflow: currentCat?.workflow || 'sequential' })
        setFormError('')
        setModal('editCat')
    }
    const handleEditCat = () => {
        if (!editCatForm.label.trim()) { setFormError('Nama kategori wajib diisi'); return }
        setCategoriesMapWithDb(prev => ({
            ...prev,
            [selectedCat]: { ...prev[selectedCat], label: editCatForm.label.trim(), icon: editCatForm.icon, workflow: editCatForm.workflow }
        }))
        setModal(null)
    }

    // ── Edit Type ──────────────────────────────────────────────────────────────
    const openEditType = (type) => { setEditingType({ ...type }); setFormError(''); setModal('editType') }
    const handleEditType = () => {
        if (!editingType?.label?.trim()) { setFormError('Nama jenis proyek wajib diisi'); return }
        setCategoriesMapWithDb(prev => ({
            ...prev,
            [selectedCat]: { ...prev[selectedCat], types: prev[selectedCat].types.map(t => t.id === editingType.id ? { ...t, label: editingType.label.trim() } : t) }
        }))
        setModal(null)
    }

    // ── Edit Stage ─────────────────────────────────────────────────────────────
    const openEditStage = (stage) => {
        setEditingStage({ ...stage, requiredSkills: stage.requiredSkills || [], score: stage.score || 0, perPageScore: stage.perPageScore || 0, pageMultiplier: stage.pageMultiplier || 10 })
        setFormError('')
        setModal('editStage')
    }
    const handleEditStage = () => {
        if (!editingStage?.label?.trim()) { setFormError('Nama tahapan wajib diisi'); return }
        setCategoriesMapWithDb(prev => {
            const cat = prev[selectedCat]
            const sourceArray = isTerjemahanSelected ? (cat.typeStages?.['terjemahan'] || []) : (cat.stages || [])
            const updated = sourceArray.map(s => 
                s.id === editingStage.id 
                    ? { ...s, label: editingStage.label.trim(), requiredSkills: editingStage.requiredSkills || [], score: parseScoreInput(editingStage.score), perPageScore: parseScoreInput(editingStage.perPageScore), pageMultiplier: parseScoreInput(editingStage.pageMultiplier) || 10 } 
                    : s
            )
            
            if (isTerjemahanSelected) {
                return { ...prev, [selectedCat]: { ...cat, typeStages: { ...(cat.typeStages || {}), terjemahan: updated } } }
            }
            return { ...prev, [selectedCat]: { ...cat, stages: updated } }
        })
        setIsDirty(true)
        setModal(null)
    }

    // ── Export Data ────────────────────────────────────────────────────────────
    const handleExport = () => {
        try {
            const doc = new jsPDF();
            doc.text("Pengaturan Master Data: Kategori & Jenis Proyek", 14, 15);
            doc.setFontSize(10);
            doc.text(`Dicetak pada: ${new Date().toLocaleDateString('id-ID')}`, 14, 22);

            let startY = 30;

            Object.entries(categoriesMap).forEach(([catKey, catData], index) => {
                const label = `${catData.label} ${catData.custom ? '(Kustom)' : ''}`;
                
                doc.setFontSize(12);
                doc.setFont(undefined, 'bold');
                doc.text(`${index + 1}. Kategori: ${label}`, 14, startY);
                startY += 6;

                // Types
                const types = (catData.types || []).map(t => [t.label]);
                if (types.length > 0) {
                    autoTable(doc, {
                        startY: startY,
                        head: [['Jenis Proyek']],
                        body: types,
                        theme: 'grid',
                        headStyles: { fillColor: [28, 81, 161] },
                        margin: { left: 14, right: 14 }
                    });
                    startY = doc.lastAutoTable.finalY + 10;
                } else {
                    doc.setFontSize(10);
                    doc.setFont(undefined, 'normal');
                    doc.text("Tidak ada jenis proyek", 14, startY);
                    startY += 10;
                }

                // Stages
                const stages = (catData.stages || []).map(s => [
                    s.label,
                    (s.requiredSkills || []).map(sk => SKILL_LABELS[sk] || sk).join(', ') || '-',
                    s.score || '0'
                ]);
                
                if (stages.length > 0) {
                    autoTable(doc, {
                        startY: startY,
                        head: [['Tahapan Kerja', 'Keahlian Dibutuhkan', 'Poin/Skor']],
                        body: stages,
                        theme: 'grid',
                        headStyles: { fillColor: [11, 134, 55] },
                        margin: { left: 14, right: 14 }
                    });
                    startY = doc.lastAutoTable.finalY + 15;
                } else {
                    doc.setFontSize(10);
                    doc.setFont(undefined, 'normal');
                    doc.text("Tidak ada tahapan kerja", 14, startY);
                    startY += 15;
                }

                if (startY > 270) {
                    doc.addPage();
                    startY = 20;
                }
            });

            doc.save(`Pengaturan-Kategori-${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (e) {
            console.error("Gagal mengekspor data PDF:", e);
        }
    }

    const handleExportExcel = () => {
        try {
            const wb = XLSX.utils.book_new();
            
            Object.entries(categoriesMap).forEach(([catKey, catData], index) => {
                const sheetData = [];
                const label = `${catData.label} ${catData.custom ? '(Kustom)' : ''}`;
                
                sheetData.push(["Kategori:", label]);
                sheetData.push([]);
                
                // Jenis Proyek
                sheetData.push(["JENIS PROYEK"]);
                if (catData.types && catData.types.length > 0) {
                    catData.types.forEach(t => sheetData.push([t.label]));
                } else {
                    sheetData.push(["(Tidak ada jenis proyek)"]);
                }
                sheetData.push([]);
                
                // Tahapan
                sheetData.push(["TAHAPAN KERJA", "KEAHLIAN DIBUTUHKAN", "POIN/SKOR"]);
                if (catData.stages && catData.stages.length > 0) {
                    catData.stages.forEach(s => {
                        sheetData.push([
                            s.label,
                            (s.requiredSkills || []).map(sk => SKILL_LABELS[sk] || sk).join(', ') || '-',
                            s.score || 0
                        ]);
                    });
                } else {
                    sheetData.push(["(Tidak ada tahapan kerja)", "", ""]);
                }
                
                // Buat worksheet dan auto-width (sederhana)
                const ws = XLSX.utils.aoa_to_sheet(sheetData);
                ws['!cols'] = [{ wch: 45 }, { wch: 30 }, { wch: 15 }];
                
                // Potong nama sheet maksimal 31 karakter
                let sheetName = catData.label.replace(/[^a-zA-Z0-9 ]/g, "").substring(0, 31);
                XLSX.utils.book_append_sheet(wb, ws, sheetName);
            });
            
            XLSX.writeFile(wb, `Pengaturan-Kategori-${new Date().toISOString().split('T')[0]}.xlsx`);
        } catch (e) {
            console.error("Gagal mengekspor data Excel:", e);
        }
    }

    return (
        <div>
            <SectionHeader icon="category" title="Kategori & Jenis Proyek"
                desc="Tambah/hapus kategori proyek, serta kelola jenis proyek di dalamnya" />

            {/* ── Category Tab bar + Add Category button ── */}
            <div className="flex flex-wrap items-center gap-2 mb-6">
                {catList.map(cat => {
                    const inactive = cat.active === false
                    return (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCat(cat.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${selectedCat === cat.id
                                    ? 'text-white shadow-lg'
                                    : inactive
                                        ? 'bg-slate-100 text-slate-400 border border-slate-200 line-through'
                                        : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                                }`}
                            style={selectedCat === cat.id
                                ? { background: inactive ? 'linear-gradient(135deg,#94a3b8,#64748b)' : 'linear-gradient(135deg,#1c51a1,#2563c0)' }
                                : {}}
                            title={inactive ? 'Kategori dinonaktifkan' : ''}
                        >
                            <span>{cat.icon}</span>
                            {cat.label}
                            {cat.custom && (
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" title="Kategori kustom" />
                            )}
                            {inactive && (
                                <span className="material-symbols-outlined text-[13px] opacity-70">block</span>
                            )}
                        </button>
                    )
                })}

                {/* Add Category button */}
                {isAdmin && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={openAddCat}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold border border-dashed border-slate-300 text-slate-500 hover:border-[#1c51a1] hover:text-[#1c51a1] hover:bg-[#f0f5fc] transition-all"
                        >
                            <span className="material-symbols-outlined text-[16px]">add</span>
                            Tambah Kategori
                        </button>
                        <div className="flex bg-emerald-50 rounded-xl border border-emerald-200 overflow-hidden ml-auto">
                            <button
                                onClick={handleExport}
                                className="flex items-center gap-1.5 px-3 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-600 hover:text-white transition-all border-r border-emerald-200"
                                title="Ekspor seluruh pengaturan ke format PDF"
                            >
                                <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                                PDF
                            </button>
                            <button
                                onClick={handleExportExcel}
                                className="flex items-center gap-1.5 px-3 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-600 hover:text-white transition-all"
                                title="Ekspor seluruh pengaturan ke format Excel"
                            >
                                <span className="material-symbols-outlined text-[16px]">table</span>
                                Excel
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Types panel for selected category ── */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6"
                style={{ boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>

                {/* Panel header */}
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                            <span>{currentCat?.icon}</span>
                            {currentCat?.label}
                            {currentCat?.custom && (
                                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-50 text-amber-700 uppercase">
                                    Kustom
                                </span>
                            )}
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                            {currentTypes.length} jenis proyek · Alur kerja: <span className="font-semibold">{currentCat?.workflow === 'sequential' ? 'Berurutan' : 'Paralel'}</span>
                        </p>
                    </div>

                    {isAdmin && (
                        <div className="flex items-center gap-2">
                            {/* Edit category button (all categories) */}
                            <button
                                onClick={openEditCat}
                                className="flex items-center gap-1.5 px-3 py-2 text-amber-700 bg-amber-50 text-xs font-bold rounded-xl hover:bg-amber-100 transition-all"
                                title="Edit nama, ikon, dan alur kerja kategori"
                            >
                                <span className="material-symbols-outlined text-[15px]">edit</span>
                                Edit Kategori
                            </button>

                            {/* Built-in: toggle | Custom: delete */}
                            {isBuiltin ? (
                                <button
                                    onClick={() => toggleCatActive(selectedCat)}
                                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl transition-all ${currentCat?.active === false
                                            ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                                            : 'text-slate-500 bg-slate-100 hover:bg-slate-200'
                                        }`}
                                >
                                    <span className="material-symbols-outlined text-[15px]">
                                        {currentCat?.active === false ? 'toggle_off' : 'toggle_on'}
                                    </span>
                                    {currentCat?.active === false ? 'Nonaktif — Aktifkan' : 'Nonaktifkan'}
                                </button>
                            ) : (
                                <button
                                    onClick={openDeleteCat}
                                    className="flex items-center gap-1.5 px-3 py-2 text-rose-500 bg-rose-50 text-xs font-bold rounded-xl hover:bg-rose-100 transition-all"
                                >
                                    <span className="material-symbols-outlined text-[15px]">delete</span>
                                    Hapus Kategori
                                </button>
                            )}

                            {/* Add type button */}
                            <button
                                onClick={openAddType}
                                className="flex items-center gap-1.5 px-4 py-2 text-[#1c51a1] bg-[#dce8f8] text-sm font-bold rounded-xl hover:bg-[#c8ddf5] transition-all"
                            >
                                <span className="material-symbols-outlined text-[16px]">add</span>
                                Tambah Jenis
                            </button>
                        </div>
                    )}
                </div>

                {/* Types list */}
                {currentTypes.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                        <span className="material-symbols-outlined text-4xl text-slate-200 block mb-2">category</span>
                        <p className="text-sm">Belum ada jenis proyek</p>
                        <p className="text-xs mt-1">Klik "Tambah Jenis" untuk membuat jenis proyek baru</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {currentTypes.map(type => (
                            <div key={type.id}
                                className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-xl group">
                                <div className="flex items-center gap-3">
                                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#1c51a1' }} />
                                    <span className="text-sm font-semibold text-slate-700">{type.label}</span>
                                    <span className="text-[10px] font-mono text-slate-400">#{type.id}</span>
                                </div>
                                {isAdmin && (
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                        <button
                                            onClick={() => openEditType(type)}
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-all"
                                            title="Edit nama jenis proyek">
                                            <span className="material-symbols-outlined text-[15px]">edit</span>
                                        </button>
                                        <button
                                            onClick={() => removeType(type.id)}
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all"
                                            title="Hapus jenis proyek">
                                            <span className="material-symbols-outlined text-[16px]">delete</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* ── Stages panel (sequential only) ── */}
                {(!['lainnya', 'promosi', 'bimtek', 'pelatihan'].includes(selectedCat) || isSequential) && (
                    <div className="mt-6 pt-6 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[16px] text-[#1c51a1]">linear_scale</span>
                                    {isSequential ? 'Tahapan Kerja Estafet' : 'Tahapan Kerja Bebas'}
                                </h4>
                                <p className="text-[11px] text-slate-400 mt-0.5">{currentStages.length} tahap · {isSequential ? 'berurutan' : 'paralel'}</p>
                            </div>
                        </div>
                        
                        {/* Switcher untuk tahapan khusus jika kategori memiliki typeStages */}
                        {currentCat?.typeStages && Object.keys(currentCat.typeStages).length > 0 && (
                            <div className="flex bg-slate-100 p-1.5 rounded-lg mb-4 w-max">
                                <button 
                                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${selectedTypeStage === 'umum' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                                    onClick={() => setSelectedTypeStage('umum')}
                                >
                                    Tahapan Umum
                                </button>
                                {Object.keys(currentCat.typeStages).map(typeId => (
                                    <button 
                                        key={typeId}
                                        className={`px-3 py-1 text-xs font-semibold rounded-md transition-all capitalize ${selectedTypeStage === typeId ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                                        onClick={() => setSelectedTypeStage(typeId)}
                                    >
                                        Tahapan Khusus: {typeId}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="flex items-center justify-between mb-3">
                            <div />
                            {/* Tambah tahapan tersedia untuk SEMUA kategori (termasuk bawaan) */}
                            {isAdmin && (
                                <button
                                    onClick={openAddStage}
                                    className="flex items-center gap-1.5 px-3 py-2 text-[#0b8637] bg-emerald-50 text-xs font-bold rounded-xl hover:bg-emerald-100 transition-all"
                                >
                                    <span className="material-symbols-outlined text-[15px]">add</span>
                                    Tambah Tahapan
                                </button>
                            )}
                        </div>

                        {currentStages.length === 0 ? (
                            <div className="text-center py-6 text-slate-400">
                                <span className="material-symbols-outlined text-3xl text-slate-200 block mb-1">linear_scale</span>
                                <p className="text-xs">Belum ada tahapan. Klik "Tambah Tahapan" untuk menambah.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {currentStages.map((stage) => (
                                    <div key={stage.id}
                                        className="flex items-center gap-3 px-4 py-3 bg-emerald-50/50 border border-emerald-100 rounded-xl group">
                                        <span className="w-6 h-6 rounded-full bg-[#0b8637] text-white text-[10px] font-black flex items-center justify-center flex-shrink-0">
                                            {stage.order}
                                        </span>
                                        <div className="flex flex-col flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-semibold text-slate-700">{stage.label}</span>
                                                <div className="flex flex-col gap-1">
                                                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-extrabold self-start">
                                                        ⭐ {stage.score || 0} Poin (Tetap)
                                                    </span>
                                                    {stage.perPageScore > 0 && (
                                                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-extrabold self-start border border-emerald-100">
                                                            📄 {stage.perPageScore} Poin / {stage.pageMultiplier || 10} Halaman
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {(stage.requiredSkills?.length > 0) && (
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {stage.requiredSkills.map(sk => (
                                                        <span key={sk} className="px-1.5 py-0.5 bg-[#dce8f8] text-[#1c51a1] rounded text-[9px] font-bold uppercase">
                                                            {SKILL_LABELS[sk] || sk}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        {isAdmin && (
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                <button
                                                    onClick={() => openEditStage(stage)}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-all"
                                                    title="Edit nama tahapan">
                                                    <span className="material-symbols-outlined text-[15px]">edit</span>
                                                </button>
                                                <button
                                                    onClick={() => openDeleteStage(stage)}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all"
                                                    title="Hapus tahapan ini">
                                                    <span className="material-symbols-outlined text-[15px]">delete</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* ── Simpan Perubahan ── */}
                        {currentStages.length > 0 && isAdmin && (
                            <div className="mt-4 flex items-center justify-between">
                                {isDirty && (
                                    <p className="text-xs text-amber-600 font-semibold flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[14px]">warning</span>
                                        Ada perubahan yang belum disimpan
                                    </p>
                                )}
                                <div className="ml-auto">
                                    <button
                                        onClick={handleSaveStages}
                                        className="flex items-center gap-2 px-5 py-2.5 text-white text-sm font-bold rounded-xl transition-all hover:opacity-90 active:scale-[.98]"
                                        style={{ background: 'linear-gradient(135deg,#0b8637,#059669)', boxShadow: '0 4px 12px rgba(11,134,55,.25)' }}
                                    >
                                        <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>save</span>
                                        Simpan Perubahan Tahapan
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── Modal: Add Type ── */}
            {modal === 'addType' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(4px)' }}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-7">
                        <h3 className="text-lg font-extrabold text-slate-900 mb-1">Tambah Jenis Proyek</h3>
                        <p className="text-sm text-slate-500 mb-5">
                            Untuk kategori <strong>{currentCat?.label}</strong>
                        </p>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nama Jenis Proyek</label>
                            <input
                                type="text"
                                value={newLabel}
                                onChange={e => setNewLabel(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAddType()}
                                placeholder="cth: Buku Panduan"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#1c51a1] transition-all"
                                autoFocus
                            />
                            {formError && (
                                <p className="text-xs text-rose-500 font-semibold mt-2 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px]">error</span>
                                    {formError}
                                </p>
                            )}
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={handleAddType}
                                className="flex-1 py-3 text-white font-bold rounded-xl hover:opacity-90 transition-all"
                                style={{ background: 'linear-gradient(135deg,#1c51a1,#2563c0)' }}>
                                Tambah
                            </button>
                            <button onClick={() => setModal(null)}
                                className="px-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all">
                                Batal
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal: Add Stage ── */}
            {modal === 'addStage' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(4px)' }}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-7">
                        <h3 className="text-lg font-extrabold text-slate-900 mb-1">Tambah Tahapan Kerja</h3>
                        <p className="text-sm text-slate-500 mb-5">
                            Kategori <strong>{currentCat?.label}</strong> · saat ini ada <strong>{currentStages.length}</strong> tahap
                        </p>
                        <div className="space-y-4">
                            {/* Nama tahapan */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nama Tahapan</label>
                                <input
                                    type="text"
                                    value={newStageLabel}
                                    onChange={e => setNewStageLabel(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAddStage()}
                                    placeholder="cth: Penyuntingan Naskah"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#0b8637] transition-all"
                                    autoFocus
                                />
                            </div>

                            {/* Posisi tahapan */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                    Posisi Tahapan
                                </label>
                                <select
                                    value={newStagePosition}
                                    onChange={e => setNewStagePosition(Number(e.target.value))}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#0b8637] transition-all"
                                >
                                    {/* options: 1 .. currentStages.length+1 */}
                                    {Array.from({ length: currentStages.length + 1 }, (_, i) => i + 1).map(pos => (
                                        <option key={pos} value={pos}>
                                            {pos === currentStages.length + 1
                                                ? `Tahap ke-${pos} (paling akhir)`
                                                : `Tahap ke-${pos} — sebelum "${currentStages[pos - 1]?.label}"`}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-[11px] text-slate-400 mt-1">
                                    Tahapan di bawahnya akan otomatis bergeser dan diurut ulang.
                                </p>
                            </div>

                            {/* Required Skills */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                    Keahlian PJ yang Dibutuhkan
                                    <span className="ml-1 text-slate-400 font-normal normal-case">(opsional)</span>
                                </label>
                                <SkillChipPicker selected={newStageSkills} onChange={setNewStageSkills} />
                                <p className="text-[11px] text-slate-400 mt-1.5">
                                    Hanya PJ dengan keahlian yang dipilih yang akan muncul saat input proyek.
                                </p>
                            </div>

                            {/* Skor / Poin tahapan */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                    Skor / Poin Tetap
                                </label>
                                <input
                                    type="number"
                                    step="any"
                                    min="0"
                                    value={newStageScore}
                                    onChange={e => setNewStageScore(e.target.value)}
                                    placeholder="0"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#0b8637] transition-all mb-4"
                                />

                                {selectedCat === 'terbitan' && (
                                    <>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                            Skor Berdasarkan Kelipatan Halaman
                                        </label>
                                        <div className="flex items-center gap-2 mb-1">
                                            <input
                                                type="number"
                                                step="any"
                                                min="0"
                                                value={newStagePerPageScore}
                                                onChange={e => setNewStagePerPageScore(e.target.value)}
                                                placeholder="Poin (cth: 1.7)"
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#0b8637] transition-all"
                                            />
                                            <span className="text-sm font-bold text-slate-500">per</span>
                                            <input
                                                type="number"
                                                min="1"
                                                value={newStagePageMultiplier}
                                                onChange={e => setNewStagePageMultiplier(e.target.value)}
                                                placeholder="Halaman (cth: 10)"
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#0b8637] transition-all"
                                            />
                                            <span className="text-sm text-slate-500">Halaman</span>
                                        </div>
                                        <p className="text-[11px] text-slate-400">
                                            Contoh: Mendapat 1.7 poin untuk setiap 10 halaman buku.
                                        </p>
                                    </>
                                )}
                            </div>

                            {formError && (
                                <p className="text-xs text-rose-500 font-semibold flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px]">error</span>
                                    {formError}
                                </p>
                            )}
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={handleAddStage}
                                className="flex-1 py-3 text-white font-bold rounded-xl hover:opacity-90 transition-all"
                                style={{ background: 'linear-gradient(135deg,#0b8637,#059669)' }}>
                                Tambah Tahapan
                            </button>
                            <button onClick={() => setModal(null)}
                                className="px-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all">
                                Batal
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal: Add Category ── */}
            {modal === 'addCat' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(4px)' }}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-7">
                        <h3 className="text-lg font-extrabold text-slate-900 mb-5">Tambah Kategori Baru</h3>
                        <div className="space-y-4">
                            {/* Label */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nama Kategori <span className="text-rose-400">*</span></label>
                                <input
                                    type="text"
                                    value={newCat.label}
                                    onChange={e => setNewCat(p => ({ ...p, label: e.target.value }))}
                                    placeholder="cth: Riset & Pengembangan"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#1c51a1] transition-all"
                                    autoFocus
                                />
                            </div>

                            {/* Icon */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Ikon</label>
                                <div className="flex flex-wrap gap-2">
                                    {ICONS.map(ic => (
                                        <button key={ic}
                                            onClick={() => setNewCat(p => ({ ...p, icon: ic }))}
                                            className={`w-10 h-10 rounded-xl text-xl transition-all ${newCat.icon === ic
                                                ? 'ring-2 ring-[#1c51a1] bg-[#dce8f8]'
                                                : 'bg-slate-50 hover:bg-slate-100'}`}>
                                            {ic}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Workflow */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Jenis Alur Kerja</label>
                                <div className="flex gap-3">
                                    {WORKFLOWS.map(w => (
                                        <button key={w.id}
                                            onClick={() => setNewCat(p => ({ ...p, workflow: w.id }))}
                                            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${newCat.workflow === w.id
                                                ? 'border-[#1c51a1] bg-[#dce8f8] text-[#1c51a1]'
                                                : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                                            {w.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {formError && (
                                <p className="text-xs text-rose-500 font-semibold flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px]">error</span>
                                    {formError}
                                </p>
                            )}
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={handleAddCat}
                                className="flex-1 py-3 text-white font-bold rounded-xl hover:opacity-90 transition-all"
                                style={{ background: 'linear-gradient(135deg,#1c51a1,#2563c0)' }}>
                                Buat Kategori
                            </button>
                            <button onClick={() => setModal(null)}
                                className="px-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all">
                                Batal
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal: Confirm Delete Category ── */}
            {modal === 'deleteCat' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(4px)' }}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-7 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto mb-4">
                            <span className="material-symbols-outlined text-3xl text-rose-500"
                                style={{ fontVariationSettings: "'FILL' 1" }}>delete_forever</span>
                        </div>
                        <h3 className="text-lg font-extrabold text-slate-900">Hapus Kategori?</h3>
                        <p className="text-sm text-slate-500 mt-2">
                            Kategori <strong>{currentCat?.icon} {currentCat?.label}</strong> dan semua jenis proyeknya akan dihapus dari daftar.
                        </p>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setModal(null)}
                                className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all">
                                Batal
                            </button>
                            <button onClick={handleDeleteCat}
                                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-all">
                                Ya, Hapus
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal: Confirm Delete Stage ── */}
            {modal === 'deleteStage' && deleteStageTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(4px)' }}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-7 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto mb-4">
                            <span className="material-symbols-outlined text-3xl text-rose-500"
                                style={{ fontVariationSettings: "'FILL' 1" }}>delete_forever</span>
                        </div>
                        <h3 className="text-lg font-extrabold text-slate-900">Hapus Tahapan?</h3>
                        <p className="text-sm text-slate-500 mt-2">
                            Tahapan <strong>"{deleteStageTarget.label}"</strong> akan dihapus dari kategori <strong>{currentCat?.label}</strong>.
                        </p>
                        <p className="text-xs text-amber-600 bg-amber-50 rounded-xl px-4 py-2 mt-3 font-semibold">
                            ⚠ Tahapan yang sudah dihapus tidak dapat dikembalikan
                        </p>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => { setModal(null); setDeleteStageTarget(null) }}
                                className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all">
                                Batal
                            </button>
                            <button onClick={confirmDeleteStage}
                                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-all">
                                Ya, Hapus
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal: Edit Category ── */}
            {modal === 'editCat' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(4px)' }}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-7">
                        <h3 className="text-lg font-extrabold text-slate-900 mb-5">Edit Kategori</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nama Kategori <span className="text-rose-400">*</span></label>
                                <input type="text" value={editCatForm.label}
                                    onChange={e => setEditCatForm(p => ({ ...p, label: e.target.value }))}
                                    onKeyDown={e => e.key === 'Enter' && handleEditCat()}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-all"
                                    autoFocus />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Ikon</label>
                                <div className="flex flex-wrap gap-2">
                                    {ICONS.map(ic => (
                                        <button key={ic} type="button"
                                            onClick={() => setEditCatForm(p => ({ ...p, icon: ic }))}
                                            className={`w-10 h-10 rounded-xl text-xl transition-all ${editCatForm.icon === ic ? 'ring-2 ring-amber-400 bg-amber-50' : 'bg-slate-50 hover:bg-slate-100'}`}>
                                            {ic}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Alur Kerja</label>
                                <div className="flex gap-3">
                                    {WORKFLOWS.map(w => (
                                        <button key={w.id} type="button"
                                            onClick={() => setEditCatForm(p => ({ ...p, workflow: w.id }))}
                                            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${editCatForm.workflow === w.id ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                                            {w.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {formError && <p className="text-xs text-rose-500 font-semibold flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">error</span>{formError}</p>}
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={handleEditCat}
                                className="flex-1 py-3 text-white font-bold rounded-xl hover:opacity-90 transition-all"
                                style={{ background: 'linear-gradient(135deg,#d97706,#f59e0b)' }}>Simpan Perubahan</button>
                            <button onClick={() => setModal(null)}
                                className="px-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all">Batal</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal: Edit Type ── */}
            {modal === 'editType' && editingType && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(4px)' }}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-7">
                        <h3 className="text-lg font-extrabold text-slate-900 mb-1">Edit Jenis Proyek</h3>
                        <p className="text-sm text-slate-500 mb-5">Kategori <strong>{currentCat?.label}</strong></p>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nama Jenis Proyek</label>
                            <input type="text" value={editingType.label}
                                onChange={e => setEditingType(p => ({ ...p, label: e.target.value }))}
                                onKeyDown={e => e.key === 'Enter' && handleEditType()}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-all"
                                autoFocus />
                            {formError && <p className="text-xs text-rose-500 font-semibold mt-2 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">error</span>{formError}</p>}
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={handleEditType}
                                className="flex-1 py-3 text-white font-bold rounded-xl hover:opacity-90 transition-all"
                                style={{ background: 'linear-gradient(135deg,#d97706,#f59e0b)' }}>Simpan</button>
                            <button onClick={() => setModal(null)}
                                className="px-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all">Batal</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal: Edit Stage ── */}
            {modal === 'editStage' && editingStage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(4px)' }}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-7">
                        <h3 className="text-lg font-extrabold text-slate-900 mb-1">Edit Tahapan Kerja</h3>
                        <p className="text-sm text-slate-500 mb-5">Tahap ke-<strong>{editingStage.order}</strong> · Kategori <strong>{currentCat?.label}</strong></p>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nama Tahapan</label>
                                <input type="text" value={editingStage.label}
                                    onChange={e => setEditingStage(p => ({ ...p, label: e.target.value }))}
                                    onKeyDown={e => e.key === 'Enter' && handleEditStage()}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-all"
                                    autoFocus />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                    Keahlian PJ yang Dibutuhkan
                                    <span className="ml-1 text-slate-400 font-normal normal-case">(opsional)</span>
                                </label>
                                <SkillChipPicker
                                    selected={editingStage.requiredSkills || []}
                                    onChange={v => setEditingStage(p => ({ ...p, requiredSkills: v }))}
                                />
                                <p className="text-[11px] text-slate-400 mt-1.5">
                                    Hanya PJ dengan keahlian ini yang muncul saat input proyek.
                                </p>
                            </div>

                            {/* Skor / Poin tahapan */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                    Skor / Poin Tetap
                                </label>
                                <input
                                    type="number"
                                    step="any"
                                    min="0"
                                    value={editingStage.score ?? 0}
                                    onChange={e => setEditingStage(p => ({ ...p, score: e.target.value }))}
                                    placeholder="0"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-all mb-4"
                                />

                                {selectedCat === 'terbitan' && (
                                    <>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                            Skor Berdasarkan Kelipatan Halaman
                                        </label>
                                        <div className="flex items-center gap-2 mb-1">
                                            <input
                                                type="number"
                                                step="any"
                                                min="0"
                                                value={editingStage.perPageScore ?? 0}
                                                onChange={e => setEditingStage(p => ({ ...p, perPageScore: e.target.value }))}
                                                placeholder="Poin (cth: 1.7)"
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-all"
                                            />
                                            <span className="text-sm font-bold text-slate-500">per</span>
                                            <input
                                                type="number"
                                                min="1"
                                                value={editingStage.pageMultiplier ?? 10}
                                                onChange={e => setEditingStage(p => ({ ...p, pageMultiplier: e.target.value }))}
                                                placeholder="Halaman (cth: 10)"
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-all"
                                            />
                                            <span className="text-sm text-slate-500">Halaman</span>
                                        </div>
                                        <p className="text-[11px] text-slate-400">
                                            Contoh: Mendapat 1.7 poin untuk setiap 10 halaman buku.
                                        </p>
                                    </>
                                )}
                            </div>
                            {formError && <p className="text-xs text-rose-500 font-semibold flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">error</span>{formError}</p>}
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={handleEditStage}
                                className="flex-1 py-3 text-white font-bold rounded-xl hover:opacity-90 transition-all"
                                style={{ background: 'linear-gradient(135deg,#0b8637,#059669)' }}>Simpan</button>
                            <button onClick={() => setModal(null)}
                                className="px-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all">Batal</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}


// ─────────────────────────────────────────────────────────────────────────────
// TAB 2: PROFIL AKUN PRIBADI
// ─────────────────────────────────────────────────────────────────────────────

// ── 2a. Edit Profile ──────────────────────────────────────────────────────────
function ProfileEditor({ onToast }) {
    const { currentUser, setCurrentUser } = useApp()
    const [profile, setProfile] = useState({
        name: currentUser?.name || '',
        email: currentUser?.email || '',
        phone: '',
        avatarInitials: '',
        paletteIdx: 0,
    })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    // Skills state
    const [skills, setSkills] = useState([])
    const [savingSkills, setSavingSkills] = useState(false)
    const [showSkillPicker, setShowSkillPicker] = useState(false)

    // Load full profile from server
    useEffect(() => {
        api.profile.get().then(data => {
            setProfile({
                name: data.name || '',
                email: data.email || '',
                phone: data.phone || '',
                avatarInitials: data.avatarInitials || initials(data.name),
                paletteIdx: 0,
            })
            setSkills(data.skills || [])
        }).catch(() => { }).finally(() => setLoading(false))
    }, [])

    const toggleSkill = (skill) => {
        setSkills(prev => prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill])
    }

    const handleSaveSkills = async () => {
        setSavingSkills(true)
        try {
            await api.profile.updateSkills(skills)
            onToast('Keahlian berhasil disimpan!')
            setShowSkillPicker(false)
        } catch (e) {
            onToast(e.message || 'Gagal menyimpan keahlian', 'error')
        }
        setSavingSkills(false)
    }

    const handleSave = async () => {
        if (!profile.name.trim()) { onToast('Nama tidak boleh kosong', 'error'); return }
        setSaving(true)
        try {
            await api.profile.update({
                name: profile.name.trim(),
                phone: profile.phone || null,
                avatarInitials: profile.avatarInitials || initials(profile.name),
            })
            // Update local context
            setCurrentUser(prev => ({ ...prev, name: profile.name.trim() }))
            onToast('Profil berhasil disimpan!')
        } catch (e) {
            onToast(e.message || 'Gagal menyimpan profil', 'error')
        }
        setSaving(false)
    }

    const selectedPalette = AVATAR_PALETTES[profile.paletteIdx]

    if (loading) return (
        <div className="flex items-center justify-center h-48">
            <span className="material-symbols-outlined text-4xl animate-pulse text-[#6a9dd4]">person</span>
        </div>
    )

    return (
        <div>
            <SectionHeader icon="person" title="Profil Saya"
                desc="Ubah informasi profil akun Anda" />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Avatar card */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col items-center gap-4"
                    style={{ boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
                    {/* Avatar preview */}
                    <div
                        className="w-24 h-24 rounded-3xl flex items-center justify-center text-3xl font-black transition-all duration-300"
                        style={{ background: selectedPalette.bg, color: selectedPalette.text }}
                    >
                        {profile.avatarInitials || initials(profile.name)}
                    </div>

                    {/* Palette picker */}
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center mb-2">Warna Avatar</p>
                        <div className="flex gap-2 flex-wrap justify-center">
                            {AVATAR_PALETTES.map((p, i) => (
                                <button
                                    key={i}
                                    onClick={() => setProfile(prev => ({ ...prev, paletteIdx: i }))}
                                    className="w-7 h-7 rounded-full border-2 transition-all"
                                    style={{
                                        background: p.bg,
                                        borderColor: profile.paletteIdx === i ? p.text : 'transparent',
                                        boxShadow: profile.paletteIdx === i ? `0 0 0 2px ${p.text}` : 'none',
                                    }}
                                    title={p.label}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Initials input */}
                    <div className="w-full">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 text-center">
                            Inisial (maks. 2 huruf)
                        </label>
                        <input
                            type="text"
                            maxLength={2}
                            value={profile.avatarInitials}
                            onChange={e => setProfile(p => ({ ...p, avatarInitials: e.target.value.toUpperCase() }))}
                            className="w-full text-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:outline-none focus:border-[#1c51a1] transition-all"
                        />
                    </div>
                </div>

                {/* Form card */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-6 space-y-5"
                    style={{ boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
                    {/* Name */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                            Nama Lengkap <span className="text-rose-400">*</span>
                        </label>
                        <input
                            type="text"
                            value={profile.name}
                            onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1c51a1]/20 focus:border-[#1c51a1] transition-all"
                        />
                    </div>

                    {/* Email (read-only) */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                            Email
                            <span className="ml-2 px-2 py-0.5 bg-slate-100 text-slate-400 text-[9px] rounded-full normal-case">Tidak dapat diubah</span>
                        </label>
                        <input
                            type="email"
                            value={profile.email}
                            disabled
                            className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-400 cursor-not-allowed"
                        />
                    </div>

                    {/* Phone */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nomor Telepon</label>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">phone</span>
                            <input
                                type="tel"
                                value={profile.phone}
                                onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                                placeholder="cth: 0812-3456-7890"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#1c51a1]/20 focus:border-[#1c51a1] transition-all placeholder:text-slate-300"
                            />
                        </div>
                    </div>

                    {/* Role & Status (read-only) */}
                    <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Peran</p>
                            <span className={`inline-flex px-3 py-1.5 rounded-lg text-xs font-bold uppercase ${currentUser?.role === 'admin'
                                ? 'bg-[#dce8f8] text-[#1c51a1]'
                                : 'bg-slate-100 text-slate-600'}`}>
                                {currentUser?.role === 'admin' ? 'Administrator' : 'Personil'}
                            </span>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status Akun</p>
                            <span className="inline-flex px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold uppercase">
                                ✓ Aktif
                            </span>
                        </div>
                    </div>

                    {/* Save */}
                    <div className="pt-2">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="w-full py-3 text-white font-bold rounded-xl shadow-lg transition-all hover:opacity-90 active:scale-[.98] disabled:opacity-60 flex items-center justify-center gap-2"
                            style={{ background: 'linear-gradient(135deg,#1c51a1,#2563c0)', boxShadow: '0 4px 16px rgba(28,81,161,.3)' }}
                        >
                            {saving
                                ? <><span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span> Menyimpan...</>
                                : <><span className="material-symbols-outlined text-[18px]">save</span> Simpan Perubahan</>
                            }
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Skills Section ── */}
            <div className="mt-6 bg-white rounded-2xl border border-slate-100 p-6"
                style={{ boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px]" style={{ color: '#1c51a1', fontVariationSettings: "'FILL' 1" }}>psychology</span>
                            Keahlian Saya
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">Pilih bidang keahlian yang Anda miliki · {skills.length} dipilih</p>
                    </div>
                    <button
                        onClick={() => setShowSkillPicker(p => !p)}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl transition-all text-[#1c51a1] bg-[#dce8f8] hover:bg-[#c8ddf5]"
                    >
                        <span className="material-symbols-outlined text-[15px]">{showSkillPicker ? 'expand_less' : 'edit'}</span>
                        {showSkillPicker ? 'Tutup' : 'Ubah'}
                    </button>
                </div>

                {/* Active skill chips */}
                <div className="flex flex-wrap gap-2 min-h-[36px] mb-4">
                    {skills.length === 0 ? (
                        <span className="text-xs text-slate-400 italic self-center">Belum ada keahlian dipilih. Klik "Ubah" untuk menambahkan.</span>
                    ) : skills.map(skill => (
                        <div key={skill} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                            style={{ background: '#eef4fc', color: '#163d7a' }}>
                            <span className="material-symbols-outlined text-[13px]" style={{ color: '#6a9dd4' }}>check_circle</span>
                            {SKILL_LABELS[skill] || skill}
                            {showSkillPicker && (
                                <button onClick={() => toggleSkill(skill)}
                                    className="text-[#6a9dd4] hover:text-rose-500 transition-colors leading-none ml-1">
                                    <span className="material-symbols-outlined text-[13px]">close</span>
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                {/* Skill picker grid */}
                {showSkillPicker && (
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 mb-4">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Pilih keahlian (klik untuk toggle)</p>
                        <div className="flex flex-wrap gap-2">
                            {SKILL_OPTIONS.map(skill => (
                                <button
                                    key={skill}
                                    onClick={() => toggleSkill(skill)}
                                    className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${
                                        skills.includes(skill)
                                            ? 'bg-[#1c51a1] text-white border-[#1c51a1] shadow-sm'
                                            : 'bg-white text-slate-600 border-slate-200 hover:border-[#6a9dd4] hover:text-[#1c51a1]'
                                    }`}
                                >
                                    {skills.includes(skill) && (
                                        <span className="material-symbols-outlined text-[12px] mr-1" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                                    )}
                                    {SKILL_LABELS[skill] || skill}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <button
                    onClick={handleSaveSkills}
                    disabled={savingSkills}
                    className="w-full py-3 font-bold rounded-xl transition-all hover:opacity-90 active:scale-[.98] disabled:opacity-60 flex items-center justify-center gap-2 text-sm"
                    style={{ background: 'linear-gradient(135deg,#0b8637,#059669)', color: '#fff', boxShadow: '0 4px 16px rgba(11,134,55,.25)' }}
                >
                    {savingSkills
                        ? <><span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span> Menyimpan...</>
                        : <><span className="material-symbols-outlined text-[18px]">save</span> Simpan Keahlian</>
                    }
                </button>
            </div>
        </div>
    )
}

// ── 2b. Change Password ───────────────────────────────────────────────────────
function PasswordChanger({ onToast }) {
    const [form, setForm] = useState({ current: '', next: '', confirm: '' })
    const [errors, setErrors] = useState({})
    const [saving, setSaving] = useState(false)
    const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false })

    const validate = () => {
        const e = {}
        if (!form.current) e.current = 'Password lama wajib diisi'
        if (!form.next) e.next = 'Password baru wajib diisi'
        else if (form.next.length < 8) e.next = 'Password baru minimal 8 karakter'
        if (form.next !== form.confirm) e.confirm = 'Konfirmasi password tidak cocok'
        return e
    }

    const handleSubmit = async () => {
        const e = validate()
        if (Object.keys(e).length) { setErrors(e); return }
        setErrors({})
        setSaving(true)
        try {
            await api.profile.changePassword({ currentPassword: form.current, newPassword: form.next })
            setForm({ current: '', next: '', confirm: '' })
            onToast('Password berhasil diubah!')
        } catch (err) {
            onToast(err.message || 'Gagal mengubah password', 'error')
        }
        setSaving(false)
    }

    const PwInput = ({ fieldKey, label, placeholder }) => (
        <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>
            <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">lock</span>
                <input
                    type={showPw[fieldKey] ? 'text' : 'password'}
                    value={form[fieldKey]}
                    onChange={e => setForm(p => ({ ...p, [fieldKey]: e.target.value }))}
                    placeholder={placeholder}
                    className={`w-full bg-slate-50 border rounded-xl px-4 py-2.5 pl-10 pr-10 text-sm focus:outline-none focus:ring-2 transition-all placeholder:text-slate-300 ${errors[fieldKey]
                        ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100'
                        : 'border-slate-200 focus:border-[#1c51a1] focus:ring-[#1c51a1]/20'}`}
                />
                <button
                    type="button"
                    onClick={() => setShowPw(p => ({ ...p, [fieldKey]: !p[fieldKey] }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <span className="material-symbols-outlined text-[18px]">{showPw[fieldKey] ? 'visibility_off' : 'visibility'}</span>
                </button>
            </div>
            {errors[fieldKey] && (
                <p className="text-xs text-rose-500 font-semibold mt-1.5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">error</span>
                    {errors[fieldKey]}
                </p>
            )}
        </div>
    )

    return (
        <div>
            <SectionHeader icon="lock" title="Keamanan Akun"
                desc="Ganti password masuk akun Anda" />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Change password form */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-5"
                    style={{ boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
                    <PwInput fieldKey="current" label="Password Lama" placeholder="Masukkan password saat ini" />
                    <PwInput fieldKey="next" label="Password Baru" placeholder="Minimal 8 karakter" />
                    <PwInput fieldKey="confirm" label="Konfirmasi Password Baru" placeholder="Ulangi password baru" />

                    <button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="w-full py-3 text-white font-bold rounded-xl shadow-lg transition-all hover:opacity-90 active:scale-[.98] disabled:opacity-60 flex items-center justify-center gap-2"
                        style={{ background: 'linear-gradient(135deg,#1c51a1,#2563c0)', boxShadow: '0 4px 16px rgba(28,81,161,.3)' }}
                    >
                        {saving
                            ? <><span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span> Memproses...</>
                            : <><span className="material-symbols-outlined text-[18px]">key</span> Ganti Password</>
                        }
                    </button>
                </div>

                {/* Tips card */}
                <div className="bg-slate-900 rounded-2xl p-6 text-white relative overflow-hidden">
                    <span className="material-symbols-outlined text-[120px] absolute -right-6 -bottom-6 opacity-5"
                        style={{ fontVariationSettings: "'FILL' 1" }}>shield_lock</span>
                    <h3 className="font-bold text-sm opacity-75 mb-3">💡 Tips Keamanan Password</h3>
                    <ul className="space-y-2.5 relative z-10">
                        {[
                            'Gunakan minimal 8 karakter',
                            'Kombinasikan huruf besar, kecil, angka, dan simbol',
                            'Hindari informasi pribadi (nama, tanggal lahir)',
                            'Jangan gunakan password yang sama di banyak situs',
                            'Ganti password secara berkala setiap 3 bulan',
                        ].map((tip, i) => (
                            <li key={i} className="flex items-start gap-2.5 text-xs text-slate-300">
                                <span className="material-symbols-outlined text-[14px] text-[#6a9dd4] flex-shrink-0 mt-0.5"
                                    style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                {tip}
                            </li>
                        ))}
                    </ul>
                    <div className="mt-5 pt-4 border-t border-white/10">
                        <p className="text-[11px] text-slate-500">
                            ⚠️ Fitur ini tidak tersedia untuk akun yang login menggunakan Google/OAuth.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// TELEGRAM SECTION
// ─────────────────────────────────────────────────────────────────────────────
function TelegramSection({ onToast }) {
    const [linked, setLinked] = useState(null)      // null = loading, true/false
    const [token, setToken] = useState(null)
    const [botLink, setBotLink] = useState(null)
    const [loadingToken, setLoadingToken] = useState(false)
    const [unlinking, setUnlinking] = useState(false)

    useEffect(() => {
        api.telegram.getStatus().then(d => setLinked(d.linked)).catch(() => setLinked(false))
    }, [])

    const handleGetToken = async () => {
        setLoadingToken(true)
        try {
            const d = await api.telegram.getLinkToken()
            setToken(d.token)
            setBotLink(d.botLink)
        } catch {
            onToast('Gagal membuat kode penghubung', 'error')
        }
        setLoadingToken(false)
    }

    const handleUnlink = async () => {
        setUnlinking(true)
        try {
            await api.telegram.unlink()
            setLinked(false)
            setToken(null)
            setBotLink(null)
            onToast('Akun Telegram berhasil diputuskan')
        } catch {
            onToast('Gagal memutuskan koneksi Telegram', 'error')
        }
        setUnlinking(false)
    }

    return (
        <div>
            <SectionHeader icon="send" title="Notifikasi Telegram"
                desc="Hubungkan akun Telegram Anda untuk menerima notifikasi proyek secara langsung" />

            <div className="bg-white rounded-2xl border border-slate-100 p-6"
                style={{ boxShadow: '0 2px 8px rgba(0,0,0,.06)', maxWidth: '560px' }}>

                {/* Status badge */}
                <div className="flex items-center gap-3 mb-6">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${linked ? 'bg-emerald-50' : 'bg-slate-100'}`}>
                        <span className="material-symbols-outlined text-[20px]"
                            style={{ color: linked ? '#10b981' : '#94a3b8', fontVariationSettings: "'FILL' 1" }}>
                            {linked ? 'check_circle' : 'notifications_off'}
                        </span>
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-800">
                            {linked === null ? 'Memeriksa status...' : linked ? 'Terhubung ke Telegram ✓' : 'Belum terhubung'}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                            {linked ? 'Notifikasi proyek akan dikirim ke Telegram Anda' : 'Hubungkan untuk menerima notifikasi penugasan dan update proyek'}
                        </p>
                    </div>
                </div>

                {/* Jika sudah terhubung */}
                {linked && (
                    <button
                        onClick={handleUnlink}
                        disabled={unlinking}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl hover:bg-rose-100 transition-colors disabled:opacity-60"
                    >
                        <span className="material-symbols-outlined text-[16px]">link_off</span>
                        {unlinking ? 'Memutuskan...' : 'Putuskan Koneksi Telegram'}
                    </button>
                )}

                {/* Jika belum terhubung */}
                {linked === false && (
                    <>
                        {!token ? (
                            <button
                                onClick={handleGetToken}
                                disabled={loadingToken}
                                className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white rounded-xl transition-all hover:opacity-90 disabled:opacity-60"
                                style={{ background: 'linear-gradient(135deg,#2AABEE,#229ED9)', boxShadow: '0 4px 16px rgba(42,171,238,.3)' }}
                            >
                                <span className="material-symbols-outlined text-[18px]">send</span>
                                {loadingToken ? 'Membuat kode...' : 'Hubungkan Telegram'}
                            </button>
                        ) : (
                            <div className="space-y-4">
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Langkah — Klik tombol di bawah, lalu kirim kode ini ke bot:</p>
                                    <div className="flex items-center gap-3">
                                        <code className="text-2xl font-mono font-bold tracking-[0.3em] text-[#1c51a1] bg-blue-50 px-4 py-2 rounded-lg">
                                            {token}
                                        </code>
                                        <button
                                            onClick={() => { navigator.clipboard.writeText(token); onToast('Kode disalin!') }}
                                            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
                                            title="Salin kode"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">content_copy</span>
                                        </button>
                                    </div>
                                </div>

                                <a
                                    href={botLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 w-full py-3 text-sm font-bold text-white rounded-xl transition-all hover:opacity-90"
                                    style={{ background: 'linear-gradient(135deg,#2AABEE,#229ED9)', boxShadow: '0 4px 16px rgba(42,171,238,.3)' }}
                                >
                                    <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                                    Buka Bot Telegram & Kirim Kode
                                </a>

                                <p className="text-xs text-slate-400 text-center">
                                    Setelah mengirim kode ke bot, refresh halaman ini untuk melihat status terbaru.
                                </p>

                                <button
                                    onClick={() => { setToken(null); setBotLink(null) }}
                                    className="text-xs text-slate-400 hover:text-slate-600 underline mx-auto block"
                                >
                                    Batal
                                </button>
                            </div>
                        )}
                    </>
                )}

                {/* Info notifikasi */}
                <div className="mt-6 pt-5 border-t border-slate-100">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Notifikasi yang akan dikirim:</p>
                    <ul className="space-y-2">
                        {[
                            { icon: '🚨', text: 'Penugasan baru di proyek' },
                            { icon: '❌', text: 'Hasil kerja perlu direvisi (lengkap dengan catatan)' },
                            { icon: '🟢', text: 'Giliran Anda dimulai (estafet dari tahap sebelumnya)' },
                            { icon: '🔍', text: 'Ada tahapan menunggu review/QC (khusus Admin)' },
                        ].map(({ icon, text }, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-slate-500">
                                <span className="flex-shrink-0">{icon}</span>
                                {text}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// STAGE DEADLINES PANEL — Ketentuan Deadline Otomatis
// ─────────────────────────────────────────────────────────────────────────────
function StageDeadlinesPanel({ onToast }) {
    const { currentUser } = useApp()
    const isAdmin = currentUser?.role === 'admin'
    const [deadlines, setDeadlines] = useState(null) // null = loading
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        api.settings.getStageDeadlines()
            .then(data => setDeadlines({ ...data }))
            .catch(() => onToast('Gagal memuat ketentuan deadline', 'error'))
    }, [])

    const handleChange = (label, value) => {
        const n = parseInt(value)
        if (isNaN(n) || n < 1) return
        setDeadlines(prev => ({ ...prev, [label]: n }))
    }

    const handleSave = async () => {
        if (!isAdmin) return
        setSaving(true)
        try {
            await api.settings.saveStageDeadlines(deadlines)
            onToast('Ketentuan deadline berhasil disimpan')
        } catch (e) {
            onToast('Gagal menyimpan: ' + (e.message || 'Error'), 'error')
        } finally {
            setSaving(false)
        }
    }

    if (!deadlines) return (
        <div className="flex items-center justify-center py-20">
            <span className="material-symbols-outlined animate-spin text-[#1c51a1] text-[32px]">progress_activity</span>
        </div>
    )

    // Kelompokkan label berdasarkan kategori untuk tampilan yang lebih rapi
    const CATEGORY_GROUPS = [
        {
            id: 'terbitan',
            label: '📖 Terbitan',
            workflow: 'sequential',
            desc: 'Deadline kumulatif — setiap tahap berakhir setelah tahap sebelumnya selesai.',
            labels: [
                'Kelengkapan Naskah', 'Pembuatan Surat Penerimaan Terbitan', 'Penyuntingan',
                'Tata Letak Naskah', 'Penginputan Nomor Induk Penerbitan', 'Desain Sampul',
                'Pembuatan Dummy', 'Kendali Kualitas', 'Penerbitan ISBN', 'Pembuatan Dummy Final',
                'Unggah ke Sipena dan Ipusnas', 'Pembuatan Surat Keterangan Terbit',
                'Serah Terima Karya Cetak dan Rekam',
                'Terjemahkan', 'Penyuntingan Naskah Terjemahan',
            ]
        },
        {
            id: 'medsos',
            label: '📱 Media Sosial',
            workflow: 'parallel',
            desc: 'Deadline serentak — semua tahap dikerjakan bersamaan, deadline dihitung dari tanggal mulai.',
            labels: ['Penyusunan Teks', 'Perancangan Desain', 'Tinjauan Konten', 'Pengunggahan']
        },
        {
            id: 'keuangan',
            label: '💰 Keuangan',
            workflow: 'sequential',
            desc: 'Deadline kumulatif — setiap tahap berakhir setelah tahap sebelumnya selesai.',
            labels: [
                'Verifikasi dan Validasi Hasil Kegiatan', 'Laporan Kinerja dan Evaluasi Kegiatan',
                'Dokumen rincian anggaran belanja APBN', 'Kerangka Acuan Kerja (KAK) Penerbitan',
                'Implementasi Kegiatan Penerbitan', 'Pertanggungjawaban dan Administrasi Keuangan',
            ]
        },
    ]

    // Label yang tidak masuk ke grup manapun → tampilkan di group "Lainnya"
    const allGroupedLabels = CATEGORY_GROUPS.flatMap(g => g.labels)
    const otherEntries = Object.entries(deadlines).filter(([lbl]) => !allGroupedLabels.includes(lbl))

    return (
        <div>
            <div className="mb-6">
                <h2 className="text-[20px] font-extrabold text-slate-900">Ketentuan Deadline Otomatis</h2>
                <p className="text-[13px] text-slate-500 mt-1">
                    Jumlah Hari Kerja (HK) per tahapan yang digunakan saat mode penugasan otomatis dipilih. Skip Sabtu & Minggu.
                </p>
            </div>

            {!isAdmin && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-[12px] text-amber-700 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">lock</span>
                    Hanya admin yang dapat mengubah ketentuan ini.
                </div>
            )}

            <div className="space-y-6">
                {CATEGORY_GROUPS.map(group => {
                    const groupEntries = group.labels
                        .filter(lbl => deadlines[lbl] !== undefined)
                        .map(lbl => [lbl, deadlines[lbl]])

                    if (groupEntries.length === 0) return null

                    return (
                        <div key={group.id} className="bg-white border border-slate-200/60 rounded-xl shadow-sm overflow-hidden">
                            {/* Header grup */}
                            <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-start gap-3">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[14px] font-bold text-slate-800">{group.label}</span>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${group.workflow === 'parallel' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {group.workflow === 'parallel' ? 'Paralel' : 'Sequential'}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-0.5">{group.desc}</p>
                                </div>
                            </div>
                            <table className="w-full text-[13px]">
                                <thead>
                                    <tr className="border-b border-slate-100">
                                        <th className="text-left px-5 py-2 font-semibold text-slate-500 text-[11px]">Nama Tahapan</th>
                                        <th className="text-center px-5 py-2 font-semibold text-slate-500 text-[11px] w-36">HK</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {groupEntries.map(([label, hk], idx) => (
                                        <tr key={label} className={`border-b border-slate-100 last:border-0 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                                            <td className="px-5 py-2.5 text-slate-800 font-medium">{label}</td>
                                            <td className="px-5 py-2.5 text-center">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="90"
                                                    value={hk}
                                                    disabled={!isAdmin}
                                                    onChange={e => handleChange(label, e.target.value)}
                                                    className="w-20 text-center px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#1c51a1] focus:ring-1 focus:ring-[#1c51a1] disabled:bg-slate-50 disabled:text-slate-400"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                })}

                {/* Label lainnya yang tidak masuk kategori preset */}
                {otherEntries.length > 0 && (
                    <div className="bg-white border border-slate-200/60 rounded-xl shadow-sm overflow-hidden">
                        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
                            <span className="text-[14px] font-bold text-slate-800">📋 Lainnya</span>
                        </div>
                        <table className="w-full text-[13px]">
                            <tbody>
                                {otherEntries.map(([label, hk], idx) => (
                                    <tr key={label} className={`border-b border-slate-100 last:border-0 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                                        <td className="px-5 py-2.5 text-slate-800 font-medium">{label}</td>
                                        <td className="px-5 py-2.5 text-center">
                                            <input
                                                type="number" min="1" max="90" value={hk}
                                                disabled={!isAdmin}
                                                onChange={e => handleChange(label, e.target.value)}
                                                className="w-20 text-center px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#1c51a1] focus:ring-1 focus:ring-[#1c51a1] disabled:bg-slate-50 disabled:text-slate-400"
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {isAdmin && (
                <div className="mt-5 flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2.5 bg-[#1c51a1] hover:bg-[#0b5cd5] text-white text-sm font-semibold rounded-lg shadow-sm transition-all flex items-center gap-2 disabled:opacity-60"
                    >
                        {saving
                            ? <><span className="material-symbols-outlined text-[17px] animate-spin">progress_activity</span> Menyimpan…</>
                            : <><span className="material-symbols-outlined text-[17px]">save</span> Simpan Perubahan</>
                        }
                    </button>
                </div>
            )}
        </div>
    )
}


// ─────────────────────────────────────────────────────────────────────────────
// MAIN SETTINGS PAGE
// ─────────────────────────────────────────────────────────────────────────────
const MAIN_TABS = [

    {
        id: 'master', icon: 'database', label: 'Master Data',
        sub: [
            { id: 'ddc', icon: 'tag', label: 'Kode DDC' },
            { id: 'category', icon: 'category', label: 'Kategori & Jenis Proyek' },
            { id: 'deadline', icon: 'schedule', label: 'Ketentuan Deadline Otomatis' },
        ]
    },

    {
        id: 'profile', icon: 'manage_accounts', label: 'Profil Akun',
        sub: [
            { id: 'me', icon: 'person', label: 'Profil Saya' },
            { id: 'security', icon: 'lock', label: 'Keamanan' },
            { id: 'telegram', icon: 'send', label: 'Telegram' },
        ]
    },
]

export default function Settings() {
    const [activeMain, setActiveMain] = useState('master')
    const [activeSub, setActiveSub] = useState('ddc')
    const [toast, setToast] = useState(null)

    const onToast = (message, type = 'success') => {
        setToast({ message, type, key: Date.now() })
    }

    const handleMainTab = (tabId) => {
        setActiveMain(tabId)
        const tab = MAIN_TABS.find(t => t.id === tabId)
        if (tab?.sub?.length) setActiveSub(tab.sub[0].id)
    }

    const currentMain = MAIN_TABS.find(t => t.id === activeMain)
    const currentSubs = currentMain?.sub || []

    const renderContent = () => {
        switch (activeSub) {
            case 'ddc': return <DDCManager />
            case 'category': return <CategoryManager onToast={onToast} />
            case 'deadline': return <StageDeadlinesPanel onToast={onToast} />
            case 'me': return <ProfileEditor onToast={onToast} />
            case 'security': return <PasswordChanger onToast={onToast} />
            case 'telegram': return <TelegramSection onToast={onToast} />
            default: return null
        }
    }


    return (
        <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
            {/* Toast */}
            {toast && (
                <Toast
                    key={toast.key}
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            {/* Page Header */}
            <div className="mb-8">
                <div className="flex items-center text-sm font-medium text-slate-500 mb-2">
                    <span className="hover:text-slate-700 cursor-pointer">Beranda</span>
                    <span className="material-symbols-outlined text-[16px] mx-1">chevron_right</span>
                    <span className="text-slate-400">Pengaturan</span>
                </div>
                <h1 className="text-[28px] font-extrabold text-slate-900 tracking-tight">Pengaturan</h1>
                <p className="text-[13px] text-slate-500 mt-1">Kelola data referensi dan konfigurasi akun personal Anda secara terpusat.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                {/* ── Sidebar Nav ── */}
                <aside className="col-span-1 md:col-span-4 lg:col-span-3 bg-white border border-slate-200/60 rounded-2xl p-4 shadow-sm h-max">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">Navigasi Pengaturan</p>
                    <div className="space-y-1.5">
                        {MAIN_TABS.map(tab => (
                            <div key={tab.id} className="space-y-1.5">
                                {/* Parent Tab Menu (Optional: could be just a header if you want, but we make it clickable) */}
                                <button
                                    onClick={() => handleMainTab(tab.id)}
                                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all hover:bg-slate-50 text-slate-700`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="material-symbols-outlined text-[20px] text-slate-400">{tab.icon}</span>
                                        {tab.label}
                                    </div>
                                    <span className="material-symbols-outlined text-[18px] text-slate-400 transition-transform" style={{ transform: activeMain === tab.id ? 'rotate(90deg)' : 'none' }}>chevron_right</span>
                                </button>

                                {/* Sub-tabs when this main tab is active */}
                                {activeMain === tab.id && (
                                    <div className="pl-0 space-y-1.5">
                                        {tab.sub.map(sub => (
                                            <button
                                                key={sub.id}
                                                onClick={() => setActiveSub(sub.id)}
                                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all ${activeSub === sub.id
                                                    ? 'font-bold text-white bg-[#0b5cd5] shadow-md shadow-blue-500/20'
                                                    : 'text-slate-500 hover:bg-slate-50 font-medium'}`}
                                            >
                                                <span className="material-symbols-outlined text-[20px]"
                                                    style={activeSub === sub.id ? { fontVariationSettings: "'FILL' 1", color: '#fff' } : {}}>
                                                    {sub.id === 'ddc' ? 'tag' : sub.icon}
                                                </span>
                                                {sub.label}
                                                {activeSub !== sub.id && <span className="material-symbols-outlined text-[16px] ml-auto opacity-0 group-hover:opacity-100 transition-opacity">chevron_right</span>}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </aside>

                {/* ── Main Content ── */}
                <main className="col-span-1 md:col-span-8 lg:col-span-9">
                    {renderContent()}
                </main>
            </div>
        </div>
    )
}
