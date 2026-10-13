import { useEffect } from 'react'

/**
 * Toast – animated success / info / warning notification popup.
 * Usage: <Toast message="..." type="success" open={bool} onClose={fn} />
 */
export default function Toast({ message, type = 'success', open, onClose, duration = 3000 }) {
    useEffect(() => {
        if (!open) return
        const t = setTimeout(onClose, duration)
        return () => clearTimeout(t)
    }, [open, duration, onClose])

    if (!open) return null

    const config = {
        success: {
            bg: 'bg-white border-emerald-200',
            icon: 'check_circle',
            iconColor: 'text-emerald-500',
            titleColor: 'text-emerald-700',
        },
        error: {
            bg: 'bg-white border-rose-200',
            icon: 'error',
            iconColor: 'text-rose-500',
            titleColor: 'text-rose-700',
        },
        info: {
            bg: 'bg-white border-[#b8d0ef]',
            icon: 'info',
            iconColor: 'text-[#1c51a1]',
            titleColor: 'text-[#163d7a]',
        },
    }[type] || {}

    return (
        <div
            className={`fixed bottom-6 right-6 z-[9999] flex items-center gap-3 px-5 py-4 rounded-2xl border shadow-xl ${config.bg}`}
            style={{ animation: 'toastSlideIn 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards', minWidth: '280px' }}
        >
            <span className={`material-symbols-outlined text-[28px] ${config.iconColor}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                {config.icon}
            </span>
            <span className={`font-semibold text-sm ${config.titleColor} flex-1`}>{message}</span>
            <button
                onClick={onClose}
                className="ml-1 text-slate-400 hover:text-slate-600 transition-colors"
            >
                <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
            <style>{`
                @keyframes toastSlideIn {
                    from { opacity: 0; transform: translateY(20px) scale(0.95); }
                    to   { opacity: 1; transform: translateY(0)   scale(1); }
                }
            `}</style>
        </div>
    )
}
