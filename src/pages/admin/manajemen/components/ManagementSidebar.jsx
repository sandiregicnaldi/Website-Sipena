import { useState, useEffect } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { useApp } from '../../../../context/AppContext'
import { useAuth } from '../../../../context/AuthContext'
import api from '../../../../services/api'

const NAV_ITEMS = [
    { path: '/admin/manajemen', icon: 'dashboard', label: 'Beranda', end: true },
    { path: '/admin/manajemen/chat', icon: 'forum', label: 'Ruang Obrolan' },
    { path: '/admin/manajemen/proyek', icon: 'folder_open', label: 'Proyek' },
    { path: '/admin/manajemen/arsip', icon: 'archive', label: 'Arsip' },
    { path: '/admin/manajemen/nip', icon: 'receipt_long', label: 'Generator NIP' },
    { path: '/admin/manajemen/dokumen', icon: 'description', label: 'Dokumen' },
    { path: '/admin/manajemen/laporan', icon: 'analytics', label: 'Laporan' },
    { path: '/admin/manajemen/trash', icon: 'delete', label: 'Sampah' },
]

const ADMIN_ITEMS = [
    { path: '/admin/manajemen/users', icon: 'manage_accounts', label: 'Manajemen Pengguna' },
]

const sidebarScrollStyle = `
  .sidebar-scroll::-webkit-scrollbar { width: 3px; }
  .sidebar-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 10px; }
`

export default function ManagementSidebar({ open, onClose }) {
    const { currentUser, projects } = useApp()
    const { isSuperAdmin } = useAuth()
    const allItems = [...NAV_ITEMS, ...(isSuperAdmin ? ADMIN_ITEMS : [])]
    const [totalChatUnread, setTotalChatUnread] = useState(0)

    // Polling unread chat + notes count
    useEffect(() => {
        if (!currentUser) return

        const checkUnread = async () => {
            try {
                // 1. Unread chat messages
                const summary = await api.chat.getUnreadSummary()
                const chatCount = summary?.total || 0

                // 2. Unread project stage notes
                let notesCount = 0
                try {
                    const lastSeen = JSON.parse(localStorage.getItem('note_last_seen') || '{}')
                    if (projects?.length) {
                        for (const p of projects) {
                            if (!p.stages) continue
                            for (const s of p.stages) {
                                if (!isSuperAdmin && s.pjId !== currentUser.id) continue
                                if (!s.notes?.length) continue
                                const seenTime = lastSeen[s.id] ? new Date(lastSeen[s.id]) : null
                                for (const n of s.notes) {
                                    if (n.from === (currentUser.name || currentUser.username)) continue
                                    if (seenTime && new Date(n.time) <= seenTime) continue
                                    notesCount++
                                }
                            }
                        }
                    }
                } catch {
                    // silent
                }

                setTotalChatUnread(chatCount + notesCount)
            } catch {
                // silent
            }
        }

        checkUnread()
        const interval = setInterval(checkUnread, 8000)
        return () => clearInterval(interval)
    }, [currentUser, projects, isSuperAdmin])

    return (
        <>
            <style>{sidebarScrollStyle}</style>
            <aside
                className="fixed left-0 top-0 h-full w-[240px] z-50 flex flex-col transition-transform duration-300"
                style={{
                    background: '#0f172a',
                    boxShadow: '4px 0 20px rgba(0,0,0,0.25)',
                    transform: open ? 'translateX(0)' : undefined,
                }}
            >
                {/* Mobile: tombol tutup */}
                <button
                    className="absolute top-4 right-4 md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                    onClick={onClose}
                    aria-label="Tutup menu"
                >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                </button>

                {/* Sidebar Header: Logo Penerbitan PERPUSNAS PRESS */}
                <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <div
                        className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/25"
                        style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' }}
                    >
                        <span className="material-symbols-outlined text-white text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                            menu_book
                        </span>
                    </div>
                    <div className="flex flex-col leading-tight min-w-0">
                        <span className="font-extrabold text-white text-[14px] tracking-tight">Penerbitan</span>
                        <span className="font-semibold text-slate-400 text-[10px] tracking-wider uppercase">PERPUSNAS PRESS</span>
                    </div>
                </div>

                {/* Innovation Switcher Block (Sesuai Screenshot media_1791867397666.png) */}
                <div className="px-3.5 pt-3 pb-3 flex flex-col gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-blue-500/15 text-blue-400 border border-blue-500/30">
                            RUANG KERJA REDAKSI
                        </span>
                    </div>
                    <Link
                        to="/admin"
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-200 bg-white/5 hover:bg-blue-600/20 hover:text-white border border-white/10 hover:border-blue-400/30 transition-all duration-150"
                        title="Beralih ke Dasbor Admin SiPena"
                    >
                        <span className="material-symbols-outlined text-[15px]">arrow_back</span>
                        <span>Dasbor Admin SiPena</span>
                    </Link>
                    <a
                        href="/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium text-slate-400 hover:text-slate-200 transition-colors"
                        title="Buka Website Publik di Tab Baru"
                    >
                        <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                        <span>Ke Web Publik</span>
                    </a>
                </div>

                {/* Navigation Items */}
                <nav className="flex-1 px-3 py-3 space-y-0.5 sidebar-scroll overflow-y-auto">
                    {allItems.map(item => {
                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                end={item.end}
                                onClick={onClose}
                                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 group relative"
                                style={({ isActive }) => ({
                                    background: isActive ? 'rgba(59,130,246,0.18)' : 'transparent',
                                    color: isActive ? '#93c5fd' : 'rgba(255,255,255,0.65)',
                                    fontWeight: isActive ? 700 : 500,
                                })}
                            >
                                {({ isActive }) => (
                                    <>
                                        {isActive && (
                                            <div
                                                className="absolute left-0 top-1 bottom-1 w-0.5 rounded-r"
                                                style={{ background: '#3b82f6' }}
                                            />
                                        )}
                                        <span
                                            className="material-symbols-outlined text-[20px] transition-all duration-200 group-hover:scale-110 shrink-0"
                                            style={{
                                                color: isActive ? '#60a5fa' : 'rgba(255,255,255,0.45)',
                                                fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0",
                                            }}
                                        >
                                            {item.icon}
                                        </span>
                                        <span className="truncate" style={{ color: isActive ? '#e0f2fe' : 'rgba(255,255,255,0.7)' }}>
                                            {item.label}
                                        </span>
                                        {item.path === '/admin/manajemen/chat' && totalChatUnread > 0 && (
                                            <span
                                                className="ml-auto flex items-center justify-center px-1.5 py-0.2 text-[10px] font-black rounded-full shadow-sm"
                                                style={{ background: '#ef4444', color: '#ffffff' }}
                                            >
                                                {totalChatUnread > 99 ? '99+' : totalChatUnread}
                                            </span>
                                        )}
                                    </>
                                )}
                            </NavLink>
                        );
                    })}
                </nav>

                {/* Sidebar Footer: Pengaturan & Bantuan */}
                <div className="px-3 pb-4 pt-2 space-y-0.5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <NavLink
                        to="/admin/manajemen/pengaturan"
                        onClick={onClose}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 group relative"
                        style={({ isActive }) => ({
                            background: isActive ? 'rgba(59,130,246,0.18)' : 'transparent',
                            color: isActive ? '#93c5fd' : 'rgba(255,255,255,0.65)',
                            fontWeight: isActive ? 700 : 500,
                        })}
                    >
                        {({ isActive }) => (
                            <>
                                {isActive && (
                                    <div
                                        className="absolute left-0 top-1 bottom-1 w-0.5 rounded-r"
                                        style={{ background: '#3b82f6' }}
                                    />
                                )}
                                <span
                                    className="material-symbols-outlined text-[20px] transition-all duration-200 group-hover:scale-110 shrink-0"
                                    style={{
                                        color: isActive ? '#60a5fa' : 'rgba(255,255,255,0.45)',
                                        fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0",
                                    }}
                                >
                                    settings
                                </span>
                                <span className="truncate" style={{ color: isActive ? '#e0f2fe' : 'rgba(255,255,255,0.7)' }}>
                                    Pengaturan
                                </span>
                            </>
                        )}
                    </NavLink>
                    {isSuperAdmin && (
                        <NavLink
                            to="/admin/manajemen/bantuan"
                            onClick={onClose}
                            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 group relative"
                            style={({ isActive }) => ({
                                background: isActive ? 'rgba(59,130,246,0.18)' : 'transparent',
                                color: isActive ? '#93c5fd' : 'rgba(255,255,255,0.65)',
                                fontWeight: isActive ? 700 : 500,
                            })}
                        >
                            {({ isActive }) => (
                                <>
                                    {isActive && (
                                        <div
                                            className="absolute left-0 top-1 bottom-1 w-0.5 rounded-r"
                                            style={{ background: '#3b82f6' }}
                                        />
                                    )}
                                    <span
                                        className="material-symbols-outlined text-[20px] transition-all duration-200 group-hover:scale-110 shrink-0"
                                        style={{
                                            color: isActive ? '#60a5fa' : 'rgba(255,255,255,0.45)',
                                            fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0",
                                        }}
                                    >
                                        help
                                    </span>
                                    <span className="truncate" style={{ color: isActive ? '#e0f2fe' : 'rgba(255,255,255,0.7)' }}>
                                        Bantuan
                                    </span>
                                </>
                            )}
                        </NavLink>
                    )}
                </div>
            </aside>

            {/* CSS override untuk desktop: sidebar selalu tampil */}
            <style>{`
                @media (min-width: 768px) {
                    aside.fixed.left-0.w-\\[240px\\] {
                        transform: translateX(0) !important;
                    }
                }
                @media (max-width: 767px) {
                    aside.fixed.left-0.w-\\[240px\\] {
                        transform: translateX(-100%);
                    }
                }
            `}</style>
        </>
    )
}
