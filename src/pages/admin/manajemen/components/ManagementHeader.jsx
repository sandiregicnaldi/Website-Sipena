import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { useApp } from '../../../../context/AppContext'
import { useAuth } from '../../../../context/AuthContext'

const PAGE_TITLES = {
    '/admin/manajemen': 'Beranda Produksi',
    '/admin/manajemen/proyek': 'Alur Kerja Proyek',
    '/admin/manajemen/proyek/baru': 'Proyek Baru',
    '/admin/manajemen/arsip': 'Arsip Naskah',
    '/admin/manajemen/nip': 'Generator NIP',
    '/admin/manajemen/dokumen': 'Dokumen SOP',
    '/admin/manajemen/laporan': 'Laporan Analitik',
    '/admin/manajemen/trash': 'Tong Sampah',
    '/admin/manajemen/users': 'Manajemen Pengguna',
    '/admin/manajemen/chat': 'Ruang Obrolan Tim',
    '/admin/manajemen/pengaturan': 'Pengaturan Sistem',
    '/admin/manajemen/bantuan': 'Pusat Bantuan & SOP',
}

const NOTIF_ICON = {
    revision: { icon: 'sync', bg: 'bg-rose-50', color: 'text-rose-500' },
    review: { icon: 'rate_review', bg: 'bg-amber-50', color: 'text-amber-500' },
    approved: { icon: 'check_circle', bg: 'bg-emerald-50', color: 'text-emerald-500' },
    default: { icon: 'notifications', bg: 'bg-[#eef4fc]', color: 'text-[#1c51a1]' },
}

const initials = (name) => {
    if (!name) return '?'
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

export default function ManagementHeader({ onMenuClick }) {
    const {
        theme, toggleTheme,
        notifications, unreadCount,
        markNotificationRead, markAllNotificationsRead,
    } = useApp()
    const { user, isSuperAdmin, logout } = useAuth()

    const [showNotif, setShowNotif] = useState(false)
    const [showUser, setShowUser] = useState(false)
    const notifRef = useRef(null)
    const userRef = useRef(null)
    const navigate = useNavigate()
    const location = useLocation()

    // Close dropdowns on outside click
    useEffect(() => {
        function handleClick(e) {
            if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false)
            if (userRef.current && !userRef.current.contains(e.target)) setShowUser(false)
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [])

    const getTitle = () => {
        const path = location.pathname
        if (path.startsWith('/admin/manajemen/proyek/') && path !== '/admin/manajemen/proyek/baru') return 'Detail Proyek'
        return PAGE_TITLES[path] || 'Dasbor Manajemen'
    }

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    const formatTime = (iso) => {
        const diff = Math.floor((new Date() - new Date(iso)) / 60000)
        if (diff < 1) return 'Baru saja'
        if (diff < 60) return `${diff} menit lalu`
        if (diff < 1440) return `${Math.floor(diff / 60)} jam lalu`
        return `${Math.floor(diff / 1440)} hari lalu`
    }

    const recentNotifs = (notifications || []).slice(0, 10)
    const userName = user?.name || user?.username || 'Personil'
    const userRole = isSuperAdmin ? 'Super Admin' : (user?.isReviewer ? 'Reviewer' : 'Staf Redaksi')

    return (
        <header className="sticky top-0 z-40 h-[60px] bg-white/80 backdrop-blur-md px-4 md:px-8 flex items-center justify-between border-b border-slate-100"
            style={{ boxShadow: '0 1px 0 rgba(0,0,0,0.04)' }}>

            {/* Left: Hamburger (mobile) + Innovation Switcher Buttons + Page Title */}
            <div className="flex items-center gap-3">
                <button
                    className="md:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                    onClick={onMenuClick}
                    aria-label="Buka menu"
                >
                    <span className="material-symbols-outlined text-[22px]">menu</span>
                </button>

                {/* Innovation Switcher (Sesuai Screenshot media_1791867397666.png) */}
                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-[#1c51a1] font-bold text-xs shadow-xs">
                        <span className="material-symbols-outlined text-[16px]">menu_book</span>
                        Manajemen Penerbitan
                    </span>
                    <Link
                        to="/admin"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors shadow-xs"
                        title="Kembali ke Dasbor Admin SiPena"
                    >
                        <span className="material-symbols-outlined text-[15px]">arrow_back</span>
                        Kembali ke Admin SiPena
                    </Link>
                </div>

                <div className="hidden xl:flex items-center gap-2 ml-3 border-l border-slate-200 pl-3">
                    <h1 className="text-sm font-bold text-slate-700 tracking-tight">{getTitle()}</h1>
                </div>
            </div>

            {/* Right: Actions + Profile */}
            <div className="flex items-center gap-3 sm:gap-4">
                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    title={theme === 'light' ? 'Mode Gelap' : 'Mode Terang'}
                    className="p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-[#1c51a1] transition-colors"
                >
                    <span className="material-symbols-outlined text-[20px]">
                        {theme === 'light' ? 'dark_mode' : 'light_mode'}
                    </span>
                </button>

                {/* Notifications */}
                <div ref={notifRef} className="relative">
                    <button
                        onClick={() => { setShowNotif(p => !p); setShowUser(false) }}
                        className="p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-[#1c51a1] transition-colors relative"
                    >
                        <span className="material-symbols-outlined text-[22px]">notifications</span>
                        {unreadCount > 0 && (
                            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white" />
                        )}
                    </button>

                    {showNotif && (
                        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl border border-slate-200 overflow-hidden z-50 shadow-xl"
                            style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
                            {/* Notif header */}
                            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-900 text-sm">Notifikasi</span>
                                    {unreadCount > 0 && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 bg-[#dce8f8] text-[#1c51a1] rounded-full">
                                            {unreadCount} baru
                                        </span>
                                    )}
                                </div>
                                {unreadCount > 0 && (
                                    <button
                                        onClick={markAllNotificationsRead}
                                        className="text-xs text-[#1c51a1] font-semibold hover:underline"
                                    >
                                        Tandai semua
                                    </button>
                                )}
                            </div>

                            {/* Notif list */}
                            <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                                {recentNotifs.length === 0 ? (
                                    <div className="py-8 text-center">
                                        <span className="material-symbols-outlined text-3xl text-slate-300">notifications_off</span>
                                        <p className="text-xs text-slate-400 mt-2">Belum ada notifikasi</p>
                                    </div>
                                ) : recentNotifs.map(n => {
                                    const style = NOTIF_ICON[n.type] || NOTIF_ICON.default
                                    return (
                                        <div
                                            key={n.id}
                                            onClick={() => {
                                                markNotificationRead(n.id)
                                                if (n.projectId) navigate(`/admin/manajemen/proyek/${n.projectId}`)
                                                setShowNotif(false)
                                            }}
                                            className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors ${!n.read ? 'bg-[#eef4fc]/40' : ''}`}
                                        >
                                            <div className={`w-8 h-8 rounded-lg ${style.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                                                <span className={`material-symbols-outlined text-[16px] ${style.color}`}>{style.icon}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-slate-900 truncate">{n.title}</p>
                                                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                                                <p className="text-[10px] text-slate-400 mt-1">{formatTime(n.createdAt)}</p>
                                            </div>
                                            {!n.read && <div className="w-2 h-2 bg-[#1c51a1] rounded-full flex-shrink-0 mt-2" />}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Divider */}
                <div className="w-px h-7 bg-slate-200" />

                {/* User Profile */}
                <div ref={userRef} className="relative">
                    <div
                        onClick={() => { setShowUser(p => !p); setShowNotif(false) }}
                        className="flex items-center gap-2.5 cursor-pointer group"
                    >
                        <div className="text-right hidden sm:block">
                            <p className="text-xs font-bold text-slate-900 leading-none">{userName}</p>
                            <span className="inline-block text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded mt-0.5">
                                {userRole}
                            </span>
                        </div>
                        <div className="w-9 h-9 rounded-full border-2 border-slate-200 group-hover:border-[#1c51a1] transition-colors overflow-hidden bg-[#dce8f8] flex items-center justify-center shadow-xs">
                            {user?.avatar || user?.image ? (
                                <img src={user.avatar || user.image} alt={userName} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-[#163d7a] font-bold text-xs">{initials(userName)}</span>
                            )}
                        </div>
                    </div>

                    {showUser && (
                        <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl border border-slate-200 overflow-hidden z-50 shadow-xl"
                            style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
                            {/* User info */}
                            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                                <p className="text-sm font-bold text-slate-900 truncate">{userName}</p>
                                <p className="text-xs text-slate-400 font-mono truncate">{user?.email || ''}</p>
                                <div className="mt-1">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-full">
                                        {userRole}
                                    </span>
                                </div>
                            </div>
                            {/* Logout */}
                            <div className="p-2">
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[18px]">logout</span>
                                    Keluar dari Sistem
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    )
}
