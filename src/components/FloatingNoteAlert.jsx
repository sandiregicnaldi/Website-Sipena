import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import ChatDrawer from './ChatDrawer'
import api from '../services/api'

// ── Buat nada ping menggunakan Web Audio API (tanpa file eksternal) ──────────
function playPingSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.setValueAtTime(880, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3)
        gain.gain.setValueAtTime(0.25, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.4)
    } catch (e) {
        // Browser tidak support atau autoplay diblokir
    }
}

// ── Kunci localStorage untuk tracking waktu terakhir baca per tahap ──────────
const LS_KEY = 'note_last_seen'

function getLastSeen() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}') } catch { return {} }
}

function saveLastSeen(map) {
    localStorage.setItem(LS_KEY, JSON.stringify(map))
}

// ── Format waktu relatif ──────────────────────────────────────────────────────
function formatRelativeTime(iso) {
    const diff = Math.floor((Date.now() - new Date(iso)) / 60000)
    if (diff < 1) return 'Baru saja'
    if (diff < 60) return `${diff} mnt lalu`
    if (diff < 1440) return `${Math.floor(diff / 60)} jam lalu`
    return `${Math.floor(diff / 1440)} hari lalu`
}

export default function FloatingNoteAlert() {
    const { projects, currentUser, isAdmin } = useApp()
    const navigate = useNavigate()

    // Mode tampilan pop-up: null (tutup) | 'menu' (3 pilihan) | 'notes' (catatan proyek)
    const [viewMode, setViewMode] = useState(null)
    const [unreadNotes, setUnreadNotes] = useState([])
    const [chatUnread, setChatUnread] = useState({ direct: 0, group: 0, total: 0 })

    // Chat Drawer State
    const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false)
    const [chatDrawerInitialTab, setChatDrawerInitialTab] = useState('group') // 'group' | 'personal'

    const prevCountRef = useRef(0)
    const panelRef = useRef(null)
    const btnRef = useRef(null)

    // ── Hitung catatan yang belum dibaca dari proyek ─────────────────────────────
    const computeUnread = useCallback(() => {
        if (!currentUser || !projects?.length) return []
        const lastSeen = getLastSeen()
        const result = []

        for (const project of projects) {
            if (!project.stages) continue
            for (const stage of project.stages) {
                if (!isAdmin && stage.pjId !== currentUser.id) continue
                if (!stage.notes?.length) continue

                const seenTime = lastSeen[stage.id]
                    ? new Date(lastSeen[stage.id])
                    : null

                for (const note of stage.notes) {
                    if (note.from === currentUser.name) continue
                    if (seenTime && new Date(note.time) <= seenTime) continue

                    result.push({
                        id: `${stage.id}-${note.time}`,
                        projectId: project.id,
                        projectTitle: project.title,
                        stageId: stage.id,
                        stageLabel: stage.label,
                        from: note.from,
                        text: note.text,
                        time: note.time,
                        attachment: note.attachment,
                    })
                }
            }
        }

        return result.sort((a, b) => new Date(b.time) - new Date(a.time))
    }, [projects, currentUser, isAdmin])

    // Update unread & mainkan suara
    useEffect(() => {
        const fresh = computeUnread()
        setUnreadNotes(fresh)

        if (fresh.length > prevCountRef.current && prevCountRef.current !== 0) {
            playPingSound()
        }
        prevCountRef.current = fresh.length
    }, [computeUnread])

    // Ambil rekap unread pesan chat secara berkala
    const fetchChatUnread = useCallback(async () => {
        if (!currentUser) return
        try {
            const summary = await api.chat.getUnreadSummary()
            if (summary) setChatUnread(summary)
        } catch (err) {
            // silent fail
        }
    }, [currentUser])

    useEffect(() => {
        fetchChatUnread()
        const interval = setInterval(fetchChatUnread, 10000)
        return () => clearInterval(interval)
    }, [fetchChatUnread])

    // Tutup saat klik di luar
    useEffect(() => {
        function handleClickOutside(e) {
            if (
                panelRef.current && !panelRef.current.contains(e.target) &&
                btnRef.current && !btnRef.current.contains(e.target)
            ) {
                setViewMode(null)
            }
        }
        if (viewMode) {
            document.addEventListener('mousedown', handleClickOutside)
        }
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [viewMode])

    // Tandai semua catatan proyek dibaca
    const markAllRead = () => {
        const now = new Date().toISOString()
        const map = getLastSeen()
        for (const note of unreadNotes) {
            map[note.stageId] = now
        }
        saveLastSeen(map)
        setUnreadNotes([])
        setViewMode(null)
    }

    // Klik catatan spesifik
    const goToProject = (note) => {
        const map = getLastSeen()
        map[note.stageId] = new Date().toISOString()
        saveLastSeen(map)
        setUnreadNotes(prev => prev.filter(n => n.id !== note.id))
        setViewMode(null)
        navigate(`/admin/manajemen/proyek/${note.projectId}?stage=${note.stageId}`)
    }

    // Buka obrolan dari menu 3 pilihan
    const handleSelectOption = (opt) => {
        setViewMode(null)
        if (opt === 'group') {
            navigate('/admin/manajemen/chat')
        } else if (opt === 'personal') {
            navigate('/admin/manajemen/chat')
        } else if (opt === 'notes') {
            setViewMode('notes')
        }
    }

    const totalUnreadCount = unreadNotes.length + (chatUnread.total || 0)
    const hasUnread = totalUnreadCount > 0

    return (
        <>
            {/* ── POPUP MENU UTAMA: 3 PILIHAN (Group Chat, Personal Chat, Catatan & Diskusi) ── */}
            {viewMode === 'menu' && (
                <div
                    ref={panelRef}
                    style={{
                        position: 'fixed',
                        bottom: '5.5rem',
                        right: '1.25rem',
                        width: 'min(330px, calc(100vw - 2rem))',
                        zIndex: 9998,
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '20px',
                        boxShadow: '0 12px 40px rgba(0,0,0,0.16)',
                        overflow: 'hidden',
                        animation: 'fadeSlideUp 0.2s cubic-bezier(0.34,1.56,0.64,1)',
                    }}
                >
                    {/* Header menu */}
                    <div style={{
                        padding: '1rem 1.25rem',
                        background: '#0f172a',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '1.2rem' }}>💬</span>
                            <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#fff' }}>
                                Pusat Komunikasi
                            </span>
                        </div>
                        {hasUnread && (
                            <span style={{
                                background: '#ef4444',
                                color: '#fff',
                                fontSize: '0.65rem',
                                fontWeight: 800,
                                padding: '2px 8px',
                                borderRadius: '999px',
                            }}>
                                {totalUnreadCount} baru
                            </span>
                        )}
                    </div>

                    {/* 3 Opsi Utama */}
                    <div style={{ padding: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {/* 1. Group Chat */}
                        <div
                            onClick={() => handleSelectOption('group')}
                            style={{
                                padding: '0.85rem 1rem',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.85rem',
                                transition: 'all 0.15s',
                                border: '1px solid #f1f5f9',
                                background: '#ffffff',
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = '#f8fafc'
                                e.currentTarget.style.borderColor = '#cbd5e1'
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = '#ffffff'
                                e.currentTarget.style.borderColor = '#f1f5f9'
                            }}
                        >
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '10px',
                                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.2rem',
                                flexShrink: 0,
                            }}>
                                👥
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
                                        Group Chat
                                    </h4>
                                    {chatUnread.group > 0 && (
                                        <span style={{
                                            background: '#ef4444',
                                            color: '#fff',
                                            fontSize: '0.65rem',
                                            fontWeight: 800,
                                            padding: '2px 7px',
                                            borderRadius: '999px',
                                        }}>
                                            {chatUnread.group}
                                        </span>
                                    )}
                                </div>
                                <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                                    Ruang obrolan tim & grup divisi
                                </p>
                            </div>
                            <span className="material-symbols-outlined text-slate-400 text-[18px]">chevron_right</span>
                        </div>

                        {/* 2. Personal Chat */}
                        <div
                            onClick={() => handleSelectOption('personal')}
                            style={{
                                padding: '0.85rem 1rem',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.85rem',
                                transition: 'all 0.15s',
                                border: '1px solid #f1f5f9',
                                background: '#ffffff',
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = '#f8fafc'
                                e.currentTarget.style.borderColor = '#cbd5e1'
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = '#ffffff'
                                e.currentTarget.style.borderColor = '#f1f5f9'
                            }}
                        >
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '10px',
                                background: 'linear-gradient(135deg, #059669, #047857)',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.2rem',
                                flexShrink: 0,
                            }}>
                                👤
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
                                        Personal Chat
                                    </h4>
                                    {chatUnread.direct > 0 && (
                                        <span style={{
                                            background: '#ef4444',
                                            color: '#fff',
                                            fontSize: '0.65rem',
                                            fontWeight: 800,
                                            padding: '2px 7px',
                                            borderRadius: '999px',
                                        }}>
                                            {chatUnread.direct}
                                        </span>
                                    )}
                                </div>
                                <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                                    Pesan langsung 1-on-1 antar rekan
                                </p>
                            </div>
                            <span className="material-symbols-outlined text-slate-400 text-[18px]">chevron_right</span>
                        </div>

                        {/* 3. Catatan & Diskusi Proyek */}
                        <div
                            onClick={() => handleSelectOption('notes')}
                            style={{
                                padding: '0.85rem 1rem',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.85rem',
                                transition: 'all 0.15s',
                                border: '1px solid #f1f5f9',
                                background: unreadNotes.length > 0 ? '#fef2f2' : '#ffffff',
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = unreadNotes.length > 0 ? '#fee2e2' : '#f8fafc'
                                e.currentTarget.style.borderColor = '#cbd5e1'
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = unreadNotes.length > 0 ? '#fef2f2' : '#ffffff'
                                e.currentTarget.style.borderColor = '#f1f5f9'
                            }}
                        >
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '10px',
                                background: unreadNotes.length > 0 ? 'linear-gradient(135deg, #ef4444, #dc2626)' : '#e2e8f0',
                                color: unreadNotes.length > 0 ? '#fff' : '#475569',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.2rem',
                                flexShrink: 0,
                            }}>
                                💬
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
                                        Catatan & Diskusi
                                    </h4>
                                    {unreadNotes.length > 0 && (
                                        <span style={{
                                            background: '#ef4444',
                                            color: '#fff',
                                            fontSize: '0.65rem',
                                            fontWeight: 800,
                                            padding: '2px 7px',
                                            borderRadius: '999px',
                                        }}>
                                            {unreadNotes.length}
                                        </span>
                                    )}
                                </div>
                                <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                                    {unreadNotes.length > 0 ? `${unreadNotes.length} catatan tugas baru` : 'Diskusi tahapan proyek kerja'}
                                </p>
                            </div>
                            <span className="material-symbols-outlined text-slate-400 text-[18px]">chevron_right</span>
                        </div>
                    </div>
                </div>
            )}

            {/* ── SUB-PANEL: DAFTAR CATATAN & DISKUSI PROYEK ── */}
            {viewMode === 'notes' && (
                <div
                    ref={panelRef}
                    style={{
                        position: 'fixed',
                        bottom: '5.5rem',
                        right: '1.25rem',
                        width: 'min(360px, calc(100vw - 2rem))',
                        maxHeight: '440px',
                        zIndex: 9998,
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '20px',
                        boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        animation: 'fadeSlideUp 0.2s cubic-bezier(0.34,1.56,0.64,1)',
                    }}
                >
                    {/* Header Catatan */}
                    <div style={{
                        padding: '0.875rem 1rem',
                        borderBottom: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: unreadNotes.length > 0 ? '#fef2f2' : '#f8fafc',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <button
                                onClick={() => setViewMode('menu')}
                                style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                                title="Kembali ke menu"
                            >
                                <span className="material-symbols-outlined text-[18px] text-slate-600">arrow_back</span>
                            </button>
                            <span style={{ fontWeight: 800, fontSize: '0.875rem', color: '#0f172a' }}>
                                Catatan & Diskusi
                            </span>
                            {unreadNotes.length > 0 && (
                                <span style={{
                                    background: '#dc2626', color: '#fff',
                                    fontSize: '0.65rem', fontWeight: 700,
                                    padding: '0.1rem 0.45rem',
                                    borderRadius: '999px',
                                }}>
                                    {unreadNotes.length} baru
                                </span>
                            )}
                        </div>
                        {unreadNotes.length > 0 && (
                            <button
                                onClick={markAllRead}
                                style={{
                                    fontSize: '0.7rem', color: '#2563eb',
                                    fontWeight: 700, background: 'none',
                                    border: 'none', cursor: 'pointer',
                                    textDecoration: 'underline',
                                }}
                            >
                                Tandai dibaca
                            </button>
                        )}
                    </div>

                    {/* List Catatan */}
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {unreadNotes.length === 0 ? (
                            <div style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>
                                <div style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>✅</div>
                                <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b', margin: 0 }}>
                                    Semua catatan sudah dibaca
                                </p>
                            </div>
                        ) : (
                            unreadNotes.map((note, idx) => (
                                <div
                                    key={note.id}
                                    onClick={() => goToProject(note)}
                                    style={{
                                        padding: '0.75rem 1rem',
                                        borderBottom: idx < unreadNotes.length - 1 ? '1px solid #f1f5f9' : 'none',
                                        cursor: 'pointer',
                                        transition: 'background 0.15s',
                                        background: 'rgba(220,38,38,0.03)',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(220,38,38,0.03)'}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.25rem' }}>
                                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#2563eb', background: '#eff6ff', padding: '0.1rem 0.45rem', borderRadius: '4px' }}>
                                            📄 {note.projectTitle}
                                        </span>
                                        <span style={{ fontSize: '0.6rem', color: '#94a3b8' }}>›</span>
                                        <span style={{ fontSize: '0.65rem', color: '#475569', fontWeight: 600 }}>
                                            {note.stageLabel}
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                                        <div style={{
                                            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                                            background: 'linear-gradient(135deg, #1c51a1, #0b8637)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '0.65rem', fontWeight: 700, color: '#fff',
                                        }}>
                                            {note.from?.charAt(0)?.toUpperCase() || '?'}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.375rem' }}>
                                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a' }}>
                                                    {note.from}
                                                </span>
                                                <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                                                    {formatRelativeTime(note.time)}
                                                </span>
                                            </div>
                                            <p style={{
                                                fontSize: '0.75rem', color: '#475569',
                                                margin: '0.125rem 0 0', lineHeight: 1.4,
                                                display: '-webkit-box', WebkitLineClamp: 2,
                                                WebkitBoxOrient: 'vertical', overflow: 'hidden',
                                            }}>
                                                {note.attachment ? '📎 ' : ''}{note.text || '(gambar terlampir)'}
                                            </p>
                                        </div>
                                        <div style={{
                                            width: 8, height: 8, borderRadius: '50%',
                                            background: '#dc2626', flexShrink: 0, marginTop: '0.375rem',
                                        }} />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* ── TOMBOL FLOATING CHAT ── */}
            <button
                ref={btnRef}
                onClick={() => setViewMode(prev => (prev ? null : 'menu'))}
                title="Pusat Komunikasi & Diskusi"
                style={{
                    position: 'fixed',
                    bottom: '1.25rem',
                    right: '1.25rem',
                    zIndex: 9999,
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    background: hasUnread
                        ? 'linear-gradient(135deg, #dc2626, #b91c1c)'
                        : 'linear-gradient(135deg, #1c51a1, #163d7a)',
                    boxShadow: hasUnread
                        ? '0 4px 20px rgba(220,38,38,0.45)'
                        : '0 4px 20px rgba(28,81,161,0.35)',
                    transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
                    animation: hasUnread ? 'chatPulse 2s ease-in-out infinite' : 'none',
                    transform: viewMode ? 'scale(0.93)' : 'scale(1)',
                }}
                onMouseEnter={e => { if (!viewMode) e.currentTarget.style.transform = 'scale(1.08)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = viewMode ? 'scale(0.93)' : 'scale(1)' }}
            >
                <span style={{ fontSize: '1.4rem', color: '#ffffff' }}>
                    {viewMode ? '✕' : '💬'}
                </span>

                {/* Badge jumlah notif gabungan */}
                {hasUnread && !viewMode && (
                    <span style={{
                        position: 'absolute',
                        top: -4, right: -4,
                        minWidth: 22, height: 22,
                        borderRadius: '999px',
                        background: '#fff',
                        color: '#dc2626',
                        fontSize: '0.65rem',
                        fontWeight: 800,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '2px solid #dc2626',
                        lineHeight: 1,
                        padding: '0 4px',
                    }}>
                        {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                    </span>
                )}
            </button>

            {/* ── JENDELA OBROLAN REAL-TIME (DRAWER SAMPING) ── */}
            <ChatDrawer
                isOpen={isChatDrawerOpen}
                onClose={() => {
                    setIsChatDrawerOpen(false)
                    fetchChatUnread()
                }}
                initialTab={chatDrawerInitialTab}
            />

            {/* ── Keyframes animasi ── */}
            <style>{`
                @keyframes chatPulse {
                    0%, 100% { box-shadow: 0 4px 20px rgba(220,38,38,0.45); }
                    50% { box-shadow: 0 4px 30px rgba(220,38,38,0.7), 0 0 0 8px rgba(220,38,38,0.12); }
                }
                @keyframes fadeSlideUp {
                    from { opacity: 0; transform: translateY(14px) scale(0.96); }
                    to   { opacity: 1; transform: translateY(0)    scale(1); }
                }
            `}</style>
        </>
    )
}
