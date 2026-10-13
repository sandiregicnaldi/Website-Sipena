import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../../context/AppContext'
import { useAuth } from '../../../context/AuthContext'
import { api } from '../../../services/api'
import Toast from '../../../components/Toast'
import { utils, writeFile } from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

// ─── Helpers ────────────────────────────────────────────────────────────────
const ACTION_META = {
    login:           { label: 'Login',           color: '#2563eb', bg: '#dbeafe', icon: '🔐' },
    create_project:  { label: 'Buat Proyek',      color: '#16a34a', bg: '#dcfce7', icon: '➕' },
    update_project:  { label: 'Edit Proyek',      color: '#0891b2', bg: '#cffafe', icon: '✏️' },
    delete_project:  { label: 'Hapus Proyek',     color: '#dc2626', bg: '#fee2e2', icon: '🗑️' },
    approve_stage:   { label: 'Setujui Tahap',    color: '#16a34a', bg: '#dcfce7', icon: '✅' },
    revise_stage:    { label: 'Revisi Tahap',     color: '#d97706', bg: '#fef3c7', icon: '🔄' },
    update_user:     { label: 'Edit Pengguna',    color: '#7c3aed', bg: '#ede9fe', icon: '👤' },
    delete_user:     { label: 'Hapus Pengguna',   color: '#dc2626', bg: '#fee2e2', icon: '🗑️' },
    update_profile:  { label: 'Edit Profil',      color: '#0891b2', bg: '#cffafe', icon: '✏️' },
    change_password: { label: 'Ganti Password',   color: '#7c3aed', bg: '#ede9fe', icon: '🔑' },
    upload_document: { label: 'Upload Dokumen',   color: '#16a34a', bg: '#dcfce7', icon: '📎' },
    delete_document: { label: 'Hapus Dokumen',    color: '#dc2626', bg: '#fee2e2', icon: '🗑️' },
}

function ActionBadge({ action }) {
    const m = ACTION_META[action] || { label: action, color: '#64748b', bg: '#f1f5f9', icon: '⚙️' }
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
            padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 600,
            color: m.color, background: m.bg,
        }}>
            {m.icon} {m.label}
        </span>
    )
}

function formatDateTime(iso) {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('id-ID', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    })
}

function EmptyState({ message }) {
    return (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📭</div>
            <div style={{ fontSize: '0.9rem' }}>{message}</div>
        </div>
    )
}

function LoadingRow() {
    return (
        <tr>
            <td colSpan={99} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.85rem' }}>
                ⏳ Memuat data...
            </td>
        </tr>
    )
}

function ExportLogButtons({ onExcel, onPdf, disabled }) {
    return (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', justifyContent: 'flex-end' }}>
            <button
                onClick={onExcel}
                disabled={disabled}
                className="btn btn-outline btn-sm"
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: '#16a34a',
                    borderColor: '#16a34a',
                    padding: '0.35rem 0.6rem',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    background: 'transparent',
                    opacity: disabled ? 0.5 : 1,
                    transition: 'all 0.2s'
                }}
            >
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>download</span>
                Ekspor Excel
            </button>
            <button
                onClick={onPdf}
                disabled={disabled}
                className="btn btn-outline btn-sm"
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: '#dc2626',
                    borderColor: '#dc2626',
                    padding: '0.35rem 0.6rem',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    background: 'transparent',
                    opacity: disabled ? 0.5 : 1,
                    transition: 'all 0.2s'
                }}
            >
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>picture_as_pdf</span>
                Ekspor PDF
            </button>
        </div>
    )
}

// ─── Shared Table Wrapper ────────────────────────────────────────────────────
function LogTable({ headers, children, isEmpty, emptyMsg, loading }) {
    return (
        <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden mt-6">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                            {headers.map(h => (
                                <th key={h} className="text-left px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading ? (
                            <tr>
                                <td colSpan={99} className="text-center py-12 text-slate-400">
                                    <span className="material-symbols-outlined animate-spin text-2xl mb-2">progress_activity</span>
                                    <p>Memuat data...</p>
                                </td>
                            </tr>
                        ) : isEmpty ? (
                            <tr>
                                <td colSpan={99} className="text-center py-12 text-slate-400">
                                    <span className="material-symbols-outlined text-4xl block mb-2 text-slate-200">history_toggle_off</span>
                                    <p>{emptyMsg}</p>
                                </td>
                            </tr>
                        ) : children}
                    </tbody>
                </table>
            </div>
            {/* Dummy pagination matching mockup */}
            {!isEmpty && !loading && (
                <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50">
                    <span className="text-[11px] text-slate-500 font-medium">Menampilkan 1–10 dari 636 data</span>
                </div>
            )}
        </div>
    )
}

// ─── Tab 1: Log User (login) ─────────────────────────────────────────────────
function TabLogin({ dateFrom, dateTo }) {
    const [logins, setLogins] = useState(null)
    const [loading, setLoading] = useState(false)
    const [fetched, setFetched] = useState(false)

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const data = await api.admin.getLogs({ type: 'login', dateFrom, dateTo })
            setLogins(data)
            setFetched(true)
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }, [dateFrom, dateTo])

    // Auto-load once on mount
    useState(() => { load() }, [])
    // Re-load when dates change externally
    const [lastKey, setLastKey] = useState('')
    const key = `${dateFrom}|${dateTo}`
    if (key !== lastKey) { setLastKey(key); load() }

    const handleExcel = () => {
        if (!logins || logins.length === 0) return
        const data = logins.map(s => ({
            'Waktu Login': formatDateTime(s.time),
            'Nama': s.userName || '—',
            'Email': s.userEmail || '—',
            'Role': s.role === 'admin' ? 'Admin' : 'Personil',
            'IP Address': s.ipAddress || '—',
            'Browser / Device': s.userAgent || '—',
            'Sesi Berakhir': formatDateTime(s.expiresAt)
        }))
        const ws = utils.json_to_sheet(data)
        const wb = utils.book_new()
        utils.book_append_sheet(wb, ws, 'Log Login')
        writeFile(wb, `log_login_${dateFrom}_to_${dateTo}.xlsx`)
    }

    const handlePdf = () => {
        if (!logins || logins.length === 0) return
        const doc = new jsPDF({ orientation: 'landscape' })
        doc.text('Laporan Log Login Sistem', 14, 15)
        doc.setFontSize(8)
        doc.text(`Periode: ${dateFrom} s/d ${dateTo}`, 14, 22)
        autoTable(doc, {
            startY: 25,
            head: [['Waktu Login', 'Nama', 'Email', 'Role', 'IP Address', 'Browser / Device', 'Sesi Berakhir']],
            body: logins.map(s => [
                formatDateTime(s.time),
                s.userName || '—',
                s.userEmail || '—',
                s.role === 'admin' ? 'Admin' : 'Personil',
                s.ipAddress || '—',
                s.userAgent || '—',
                formatDateTime(s.expiresAt)
            ]),
            theme: 'striped',
            styles: { fontSize: 8, cellPadding: 3 },
            headStyles: { fillColor: [28, 81, 161] }
        })
        doc.save(`log_login_${dateFrom}_to_${dateTo}.pdf`)
    }

    return (
        <div>
            <ExportLogButtons
                onExcel={handleExcel}
                onPdf={handlePdf}
                disabled={!logins || logins.length === 0}
            />
            <LogTable
                headers={['Waktu Login', 'Nama', 'Email', 'Role', 'IP Address', 'Browser / Device']}
                loading={loading}
                isEmpty={fetched && (!logins || logins.length === 0)}
                emptyMsg="Tidak ada data login dalam rentang tanggal ini"
            >
                {(logins || []).map((s, i) => (
                    <tr key={s.id || i} className={`transition-colors hover:bg-slate-50 ${i % 2 !== 0 ? 'bg-slate-50/30' : ''}`}>
                        <td className="px-6 py-4 text-[13px] text-slate-600 whitespace-nowrap">{formatDateTime(s.time)}</td>
                        <td className="px-6 py-4 text-[13px] font-bold text-slate-900">{s.userName}</td>
                        <td className="px-6 py-4 text-[13px] text-slate-500">{s.userEmail}</td>
                        <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase ${s.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                {s.role === 'admin' ? 'Admin' : 'Personil'}
                            </span>
                        </td>
                        <td className="px-6 py-4 text-[13px] text-slate-500 font-mono">{s.ipAddress || '—'}</td>
                        <td className="px-6 py-4 text-[13px] text-slate-500 truncate max-w-[200px]" title={s.userAgent}>{s.userAgent || '—'}</td>
                    </tr>
                ))}
            </LogTable>
        </div>
    )
}

// ─── Tab 2: Log Revisi ───────────────────────────────────────────────────────
function TabRevisi({ dateFrom, dateTo }) {
    const [logs, setLogs] = useState(null)
    const [loading, setLoading] = useState(false)
    const [lastKey, setLastKey] = useState('')

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const data = await api.admin.getLogs({ type: 'revision', dateFrom, dateTo })
            setLogs(data)
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }, [dateFrom, dateTo])

    // Re-load when dates change externally
    const key = `${dateFrom}|${dateTo}`
    if (key !== lastKey) { setLastKey(key); load() }

    const handleExcel = () => {
        if (!logs || logs.length === 0) return
        const data = logs.map(l => ({
            'Waktu': formatDateTime(l.createdAt),
            'Proyek → Tahapan': l.target || '—',
            'Alasan Revisi': l.meta?.reason || '—',
            'Diminta Oleh': l.user?.name || '—',
            'Ke-': l.meta?.revisionCount ? `ke-${l.meta.revisionCount}` : '—'
        }))
        const ws = utils.json_to_sheet(data)
        const wb = utils.book_new()
        utils.book_append_sheet(wb, ws, 'Log Revisi')
        writeFile(wb, `log_revisi_${dateFrom}_to_${dateTo}.xlsx`)
    }

    const handlePdf = () => {
        if (!logs || logs.length === 0) return
        const doc = new jsPDF({ orientation: 'landscape' })
        doc.text('Laporan Log Revisi Tahapan', 14, 15)
        doc.setFontSize(8)
        doc.text(`Periode: ${dateFrom} s/d ${dateTo}`, 14, 22)
        autoTable(doc, {
            startY: 25,
            head: [['Waktu', 'Proyek → Tahapan', 'Alasan Revisi', 'Diminta Oleh', 'Ke-']],
            body: logs.map(l => [
                formatDateTime(l.createdAt),
                l.target || '—',
                l.meta?.reason || '—',
                l.user?.name || '—',
                l.meta?.revisionCount ? `ke-${l.meta.revisionCount}` : '—'
            ]),
            theme: 'striped',
            styles: { fontSize: 8, cellPadding: 3 },
            headStyles: { fillColor: [28, 81, 161] }
        })
        doc.save(`log_revisi_${dateFrom}_to_${dateTo}.pdf`)
    }

    return (
        <div>
            <ExportLogButtons
                onExcel={handleExcel}
                onPdf={handlePdf}
                disabled={!logs || logs.length === 0}
            />
            <LogTable
                headers={['Waktu', 'Proyek → Tahapan', 'Alasan Revisi', 'Diminta Oleh', 'Ke-']}
                loading={loading}
                isEmpty={logs !== null && logs.length === 0}
                emptyMsg="Tidak ada data revisi dalam rentang tanggal ini"
            >
                {(logs || []).map((l, i) => (
                    <tr key={l.id || i} className={`transition-colors hover:bg-slate-50 ${i % 2 !== 0 ? 'bg-slate-50/30' : ''}`}>
                        <td className="px-6 py-4 text-[13px] text-slate-600 whitespace-nowrap">{formatDateTime(l.createdAt)}</td>
                        <td className="px-6 py-4 text-[13px] font-bold text-slate-900">{l.target || '—'}</td>
                        <td className="px-6 py-4 text-[13px] text-[#92400e] max-w-[260px] truncate" title={l.meta?.reason || ''}>
                            <span className={l.meta?.reason ? 'italic' : ''}>{l.meta?.reason || '—'}</span>
                        </td>
                        <td className="px-6 py-4 text-[13px] text-slate-700">{l.user?.name || '—'}</td>
                        <td className="px-6 py-4 text-[13px] text-center font-bold text-[#d97706]">
                            {l.meta?.revisionCount ? `ke-${l.meta.revisionCount}` : '—'}
                        </td>
                    </tr>
                ))}
            </LogTable>
        </div>
    )
}

// ─── Tab 3: Log Persetujuan ──────────────────────────────────────────────────
function TabPersetujuan({ dateFrom, dateTo }) {
    const { isAdmin, updateStage, refreshData } = useApp()
    const [logs, setLogs] = useState(null)
    const [loading, setLoading] = useState(false)
    const [lastKey, setLastKey] = useState('')

    // Modal Koreksi Poin
    const [editingLog, setEditingLog] = useState(null)
    const [newScore, setNewScore] = useState(0)
    const [submitting, setSubmitting] = useState(false)
    const [toast, setToast] = useState({ open: false, message: '', type: 'success' })

    const showToast = (message, type = 'success') => setToast({ open: true, message, type })
    const closeToast = () => setToast(t => ({ ...t, open: false }))

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const data = await api.admin.getLogs({ type: 'approval', dateFrom, dateTo })
            setLogs(data)
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }, [dateFrom, dateTo])

    // Re-load when dates change externally
    const key = `${dateFrom}|${dateTo}`
    if (key !== lastKey) { setLastKey(key); load() }

    const openKoreksiModal = (log) => {
        setEditingLog(log)
        setNewScore(log.meta?.score !== undefined ? log.meta.score : 0)
    }

    const handleSaveScore = async () => {
        if (!editingLog?.targetId) return
        setSubmitting(true)
        try {
            const cleanScore = typeof newScore === 'string' ? (parseFloat(newScore.replace(',', '.')) || 0) : (Number(newScore) || 0)
            await updateStage(editingLog.targetId, { score: cleanScore })
            showToast('Poin berhasil dikoreksi! Poin personil otomatis diperbarui di peringkat.', 'success')
            setEditingLog(null)
            if (refreshData) await refreshData()
            await load()
        } catch (e) {
            console.error('Gagal mengoreksi poin:', e)
            showToast('Gagal mengoreksi poin tahapan', 'error')
        } finally {
            setSubmitting(false)
        }
    }

    const handleExcel = () => {
        if (!logs || logs.length === 0) return
        const data = logs.map(l => ({
            'Waktu': formatDateTime(l.createdAt),
            'Proyek → Tahapan': l.target || '—',
            'PJ Tahapan': l.meta?.pjName || '—',
            'Poin': l.meta?.score !== undefined ? `${l.meta.score} Poin` : '—',
            'Disetujui Oleh': l.user?.name || 'Admin'
        }))
        const ws = utils.json_to_sheet(data)
        const wb = utils.book_new()
        utils.book_append_sheet(wb, ws, 'Log Persetujuan')
        writeFile(wb, `log_persetujuan_${dateFrom}_to_${dateTo}.xlsx`)
    }

    const handlePdf = () => {
        if (!logs || logs.length === 0) return
        const doc = new jsPDF({ orientation: 'landscape' })
        doc.text('Laporan Log Persetujuan Tahapan', 14, 15)
        doc.setFontSize(8)
        doc.text(`Periode: ${dateFrom} s/d ${dateTo}`, 14, 22)
        autoTable(doc, {
            startY: 25,
            head: [['Waktu', 'Proyek → Tahapan', 'PJ Tahapan', 'Poin', 'Disetujui Oleh']],
            body: logs.map(l => [
                formatDateTime(l.createdAt),
                l.target || '—',
                l.meta?.pjName || '—',
                l.meta?.score !== undefined ? `+${l.meta.score} Poin` : '—',
                l.user?.name || 'Admin'
            ]),
            theme: 'striped',
            styles: { fontSize: 8, cellPadding: 3 },
            headStyles: { fillColor: [28, 81, 161] }
        })
        doc.save(`log_persetujuan_${dateFrom}_to_${dateTo}.pdf`)
    }

    return (
        <div>
            <Toast message={toast.message} type={toast.type} open={toast.open} onClose={closeToast} />

            <ExportLogButtons
                onExcel={handleExcel}
                onPdf={handlePdf}
                disabled={!logs || logs.length === 0}
            />
            <LogTable
                headers={isAdmin ? ['Waktu', 'Proyek → Tahapan', 'PJ Tahapan', 'Poin Obrolan/Kinerja', 'Disetujui Oleh', 'Aksi'] : ['Waktu', 'Proyek → Tahapan', 'PJ Tahapan', 'Poin Obrolan/Kinerja', 'Disetujui Oleh']}
                loading={loading}
                isEmpty={logs !== null && logs.length === 0}
                emptyMsg="Tidak ada data persetujuan dalam rentang tanggal ini"
            >
                {(logs || []).map((l, i) => {
                    const approvedBy = l.user?.name || 'Admin'
                    const pjName = l.meta?.pjName || '—'
                    const score = l.meta?.score
                    return (
                        <tr key={l.id || i} className={`transition-colors hover:bg-slate-50 ${i % 2 !== 0 ? 'bg-slate-50/30' : ''}`}>
                            <td className="px-6 py-4 text-[13px] text-slate-600 whitespace-nowrap">{formatDateTime(l.createdAt)}</td>
                            <td className="px-6 py-4 text-[13px] font-bold text-slate-900">{l.target || '—'}</td>
                            <td className="px-6 py-4 text-[13px] text-slate-700">{pjName}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold text-[#1d4ed8] bg-[#eff6ff] border border-[#bfdbfe]">
                                    ⭐ +{score !== undefined ? score : 0} Poin
                                </span>
                            </td>
                            <td className="px-6 py-4">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold text-[#15803d] bg-[#dcfce7]">
                                    👑 {approvedBy}
                                </span>
                            </td>
                            {isAdmin && (
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            openKoreksiModal(l);
                                        }}
                                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-all cursor-pointer shadow-sm active:scale-95"
                                        title="Koreksi Poin Tahapan"
                                    >
                                        Koreksi Poin
                                    </button>
                                </td>
                            )}
                        </tr>
                    )
                })}
            </LogTable>

            {/* Modal Koreksi Poin (Khusus Admin) */}
            {editingLog && (
                <div 
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
                    onClick={() => setEditingLog(null)}
                >
                    <div 
                        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="text-base font-extrabold text-slate-900 m-0">Koreksi Poin Tahapan</h3>
                            <button 
                                type="button"
                                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors text-lg font-bold leading-none cursor-pointer"
                                onClick={() => setEditingLog(null)}
                            >
                                ✕
                            </button>
                        </div>
                        <div className="p-6 flex flex-col gap-5">
                            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-xs">
                                <p className="font-bold text-slate-900 m-0 text-sm">{editingLog.target || '—'}</p>
                                <p className="text-slate-500 mt-1 mb-0">Penanggung Jawab: <strong className="text-slate-700">{editingLog.meta?.pjName || '—'}</strong></p>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold text-slate-700">Poin Baru (Koreksi Skor)</label>
                                <input
                                    type="number"
                                    step="any"
                                    min="0"
                                    className="w-full px-4 py-2.5 text-center text-lg font-extrabold border-2 border-blue-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                                    value={newScore}
                                    onChange={e => setNewScore(e.target.value)}
                                    placeholder="Masukkan jumlah poin baru..."
                                    autoFocus
                                />
                                <p className="text-[11px] text-slate-500 m-0 leading-relaxed">
                                    💡 Skor yang baru disimpan akan <strong>langsung memperbarui total poin personil</strong> di peringkat produktivitas bulan persetujuan.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 px-6 py-4 bg-slate-50/50 border-t border-slate-100">
                            <button 
                                type="button"
                                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                                onClick={() => setEditingLog(null)}
                                disabled={submitting}
                            >
                                Batal
                            </button>
                            <button 
                                type="button"
                                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer shadow-sm"
                                onClick={handleSaveScore}
                                disabled={submitting}
                            >
                                {submitting ? 'Menyimpan...' : 'Simpan Koreksi Poin'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// ─── Tab 4: Semua Aktivitas ──────────────────────────────────────────────────
function TabAktivitas({ dateFrom, dateTo }) {
    const [logs, setLogs] = useState(null)
    const [loading, setLoading] = useState(false)
    const [lastKey, setLastKey] = useState('')
    const [filter, setFilter] = useState('')

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const data = await api.admin.getLogs({ type: 'activity', dateFrom, dateTo })
            setLogs(data)
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }, [dateFrom, dateTo])

    const key = `${dateFrom}|${dateTo}`
    if (key !== lastKey) { setLastKey(key); load() }

    const displayed = filter
        ? (logs || []).filter(l => l.action === filter)
        : (logs || [])

    const uniqueActions = [...new Set((logs || []).map(l => l.action))]

    const handleExcel = () => {
        if (!displayed || displayed.length === 0) return
        const data = displayed.map(l => ({
            'Waktu': formatDateTime(l.createdAt),
            'Aksi': ACTION_META[l.action]?.label || l.action,
            'Target': l.target || l.targetId || '—',
            'Oleh': l.user?.name || '—',
            'IP': l.ipAddress || '—'
        }))
        const ws = utils.json_to_sheet(data)
        const wb = utils.book_new()
        utils.book_append_sheet(wb, ws, 'Log Aktivitas')
        writeFile(wb, `log_aktivitas_${dateFrom}_to_${dateTo}.xlsx`)
    }

    const handlePdf = () => {
        if (!displayed || displayed.length === 0) return
        const doc = new jsPDF({ orientation: 'landscape' })
        doc.text('Laporan Log Aktivitas Sistem', 14, 15)
        doc.setFontSize(8)
        doc.text(`Periode: ${dateFrom} s/d ${dateTo}`, 14, 22)
        autoTable(doc, {
            startY: 25,
            head: [['Waktu', 'Aksi', 'Target', 'Oleh', 'IP']],
            body: displayed.map(l => [
                formatDateTime(l.createdAt),
                ACTION_META[l.action]?.label || l.action,
                l.target || l.targetId || '—',
                l.user?.name || '—',
                l.ipAddress || '—'
            ]),
            theme: 'striped',
            styles: { fontSize: 8, cellPadding: 3 },
            headStyles: { fillColor: [28, 81, 161] }
        })
        doc.save(`log_aktivitas_${dateFrom}_to_${dateTo}.pdf`)
    }

    return (
        <div>
            {/* Action type filter */}
            {logs && logs.length > 0 && (
                <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Filter aksi:</span>
                    <button
                        onClick={() => setFilter('')}
                        style={{
                            padding: '0.2rem 0.6rem', borderRadius: '999px', border: '1px solid',
                            fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                            background: !filter ? '#1c51a1' : '#fff',
                            color: !filter ? '#fff' : '#64748b',
                            borderColor: !filter ? '#1c51a1' : '#e2e8f0',
                        }}
                    >Semua ({logs.length})</button>
                    {uniqueActions.map(a => {
                        const m = ACTION_META[a] || { label: a, color: '#64748b', bg: '#f1f5f9' }
                        const count = logs.filter(l => l.action === a).length
                        return (
                            <button key={a} onClick={() => setFilter(a === filter ? '' : a)}
                                style={{
                                    padding: '0.2rem 0.6rem', borderRadius: '999px', border: '1px solid',
                                    fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                                    background: filter === a ? m.color : '#fff',
                                    color: filter === a ? '#fff' : m.color,
                                    borderColor: m.color,
                                }}
                            >{m.icon} {m.label} ({count})</button>
                        )
                    })}
                </div>
            )}

            <ExportLogButtons
                onExcel={handleExcel}
                onPdf={handlePdf}
                disabled={!displayed || displayed.length === 0}
            />

            <LogTable
                headers={['Waktu', 'Aksi', 'Target', 'Oleh', 'IP']}
                loading={loading}
                isEmpty={logs !== null && displayed.length === 0}
                emptyMsg="Tidak ada aktivitas dalam rentang tanggal ini"
            >
                {displayed.map((l, i) => (
                    <tr key={l.id || i} className={`transition-colors hover:bg-slate-50 ${i % 2 !== 0 ? 'bg-slate-50/30' : ''}`}>
                        <td className="px-6 py-4 text-[13px] text-slate-600 whitespace-nowrap">{formatDateTime(l.createdAt)}</td>
                        <td className="px-6 py-4"><ActionBadge action={l.action} /></td>
                        <td className="px-6 py-4 text-[13px] font-bold text-slate-900">{l.target || l.targetId || '—'}</td>
                        <td className="px-6 py-4 text-[13px] text-slate-700">{l.user?.name || '—'}</td>
                        <td className="px-6 py-4 text-[13px] text-slate-500 font-mono">{l.ipAddress || '—'}</td>
                    </tr>
                ))}
            </LogTable>
        </div>
    )
}

// ─── Main Page ───────────────────────────────────────────────────────────────
const TABS = [
    { id: 'login',    label: '🔐 Log Login',       desc: 'Riwayat sesi masuk pengguna' },
    { id: 'activity', label: '⚙️ Log Aktivitas',   desc: 'Semua aktivitas di sistem' },
    { id: 'revision', label: '🔄 Log Revisi',       desc: 'Tahapan yang dikembalikan' },
    { id: 'approval', label: '✅ Log Persetujuan',  desc: 'Tahapan yang disetujui' },
]

function getTodayStr() {
    return new Date().toISOString().split('T')[0]
}
function get30DaysAgoStr() {
    const d = new Date(); d.setDate(d.getDate() - 30)
    return d.toISOString().split('T')[0]
}

export default function Bantuan() {
    const { isSuperAdmin } = useAuth()
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState('login')
    const [dateFrom, setDateFrom] = useState(get30DaysAgoStr())
    const [dateTo,   setDateTo]   = useState(getTodayStr())
    const [appliedFrom, setAppliedFrom] = useState(get30DaysAgoStr())
    const [appliedTo,   setAppliedTo]   = useState(getTodayStr())

    // Guard: Super Admin only
    if (!isSuperAdmin) {
        return (
            <div className="p-8 max-w-xl mx-auto my-12 text-center bg-white rounded-2xl border border-slate-200/80 shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
                    <span className="material-symbols-outlined text-3xl">lock</span>
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">Akses Terbatas</h2>
                <p className="text-sm text-slate-500 mb-6">
                    Halaman Bantuan & Log Aktivitas Sistem hanya dapat diakses oleh <strong>Super Administrator</strong>.
                </p>
                <button
                    className="px-5 py-2.5 bg-[#0b5cd5] text-white text-sm font-semibold rounded-xl hover:bg-[#094caf] transition-all"
                    onClick={() => navigate('/admin/manajemen')}
                >
                    Kembali ke Dasbor
                </button>
            </div>
        )
    }

    const applyFilter = () => {
        setAppliedFrom(dateFrom)
        setAppliedTo(dateTo)
    }

    const resetFilter = () => {
        const f = get30DaysAgoStr(), t = getTodayStr()
        setDateFrom(f); setDateTo(t)
        setAppliedFrom(f); setAppliedTo(t)
    }

    return (
        <div className="p-6 lg:p-8 max-w-[1400px] mx-auto min-h-[calc(100vh-2rem)] relative">
            {/* Breadcrumb */}
            <div className="flex items-center text-sm font-medium text-slate-500 mb-6">
                <span className="hover:text-slate-700 cursor-pointer" onClick={() => navigate('/admin/manajemen')}>Dasbor Penerbitan</span>
                <span className="material-symbols-outlined text-[16px] mx-1">chevron_right</span>
                <span className="text-slate-400">Bantuan & Log Sistem</span>
            </div>

            {/* Header */}
            <div className="text-center mb-10 mt-4">
                <div className="flex items-center justify-center gap-3 mb-2">
                    <span className="text-4xl">📋</span>
                    <h1 className="text-[28px] font-extrabold text-slate-900 tracking-tight m-0">Log Aktivitas Sistem</h1>
                    <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-blue-100 text-blue-700 uppercase tracking-wider translate-y-[-2px]">
                        Admin Only
                    </span>
                </div>
                <p className="text-sm text-slate-500">
                    Pantau riwayat login, revisi, persetujuan, dan semua aktivitas pengguna di dalam sistem.
                </p>
            </div>

            {/* Date & Role Filter Card */}
            <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-5 mb-8">
                <div className="flex flex-col md:flex-row items-end gap-5">
                    <div className="w-full md:w-auto">
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Dari Tanggal</label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={e => setDateFrom(e.target.value)}
                            max={dateTo}
                            className="w-full md:w-48 px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#0b5cd5] focus:border-[#0b5cd5] transition-all"
                        />
                    </div>
                    <div className="w-full md:w-auto">
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Sampai Tanggal</label>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={e => setDateTo(e.target.value)}
                            min={dateFrom}
                            className="w-full md:w-48 px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#0b5cd5] focus:border-[#0b5cd5] transition-all"
                        />
                    </div>
                    <div className="w-full md:w-auto flex-1">
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Role</label>
                        <select className="w-full md:w-56 px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#0b5cd5] focus:border-[#0b5cd5] transition-all appearance-none cursor-pointer">
                            <option>Semua Role</option>
                            <option>Admin</option>
                            <option>Personil</option>
                        </select>
                    </div>
                    <div className="flex gap-4 w-full md:w-auto mt-4 md:mt-0">
                        <button
                            className="px-6 py-2.5 text-white text-sm font-bold rounded-lg shadow-sm hover:bg-[#094caf] transition-all flex-1 md:flex-none"
                            style={{ backgroundColor: '#0b5cd5' }}
                            onClick={applyFilter}
                        >
                            Terapkan
                        </button>
                        <button 
                            className="px-4 py-2.5 text-slate-400 hover:text-slate-600 text-sm font-bold transition-all" 
                            onClick={resetFilter}
                        >
                            Reset
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 border-b border-slate-200 mb-2">
                {TABS.map(tab => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-5 py-3 text-[13px] font-bold flex items-center gap-2 border-b-2 transition-all ${
                                isActive 
                                    ? 'text-[#0b5cd5] border-[#0b5cd5]' 
                                    : 'text-slate-400 border-transparent hover:text-slate-600 hover:border-slate-300'
                            }`}
                        >
                            <span className={isActive ? '' : 'grayscale opacity-60'}>{tab.label.split(' ')[0]}</span>
                            {tab.label.split(' ').slice(1).join(' ')}
                        </button>
                    )
                })}
            </div>

            {/* Tab subtitle */}
            <p className="text-[12px] font-medium text-slate-400 italic mb-4 ml-1">
                {TABS.find(t => t.id === activeTab)?.desc}
            </p>

            {/* Tab content */}
            {activeTab === 'login'    && <TabLogin key={`login-${appliedFrom}-${appliedTo}`}       dateFrom={appliedFrom} dateTo={appliedTo} />}
            {activeTab === 'activity' && <TabAktivitas key={`activity-${appliedFrom}-${appliedTo}`} dateFrom={appliedFrom} dateTo={appliedTo} />}
            {activeTab === 'revision' && <TabRevisi key={`revision-${appliedFrom}-${appliedTo}`}   dateFrom={appliedFrom} dateTo={appliedTo} />}
            {activeTab === 'approval' && <TabPersetujuan key={`approval-${appliedFrom}-${appliedTo}`} dateFrom={appliedFrom} dateTo={appliedTo} />}
        </div>
    )
}
