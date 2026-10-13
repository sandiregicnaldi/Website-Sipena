import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../../../services/api'

export default function ResetPassword() {
    const [searchParams] = useSearchParams()
    const token = searchParams.get('token')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [status, setStatus] = useState('idle') // idle, loading, success, error
    const [message, setMessage] = useState('')
    const navigate = useNavigate()

    useEffect(() => {
        if (!token) {
            setStatus('error')
            setMessage('Token otentikasi tidak ditemukan di URL. Pastikan Anda membuka link langsung dari email.')
        }
    }, [token])

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!token) return

        if (password !== confirmPassword) {
            setStatus('error')
            setMessage('Konfirmasi password tidak cocok dengan password baru.')
            return
        }
        if (password.length < 8) {
            setStatus('error')
            setMessage('Password minimal 8 karakter.')
            return
        }

        setStatus('loading')
        try {
            await api.auth.resetPassword(password, token)
            setStatus('success')
            setMessage('Password berhasil direset! Silakan login menggunakan password baru Anda.')
        } catch (err) {
            setStatus('error')
            setMessage(err.message || 'Gagal mereset password.')
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[#f8f9ff] selection:bg-[#1c51a1] selection:text-white">
            <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#1c51a1]/5 blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-[#1c51a1]/5 blur-[120px]" />
            </div>

            <main className="w-full max-w-[440px]">
                <div className="text-center mb-10">
                    <div className="mb-6">
                        <img src="/logo.png" alt="Logo" className="w-36 h-36 object-contain mx-auto" />
                    </div>
                    <h1 className="text-2xl font-black tracking-tight text-[#0b1c30] mb-1">
                        Buat Password Baru
                    </h1>
                </div>

                <div className="bg-white border border-[#c7c4d8]/15 rounded-xl p-8 shadow-[0_12px_32px_-4px_rgba(11,28,48,0.06)]">
                    {status === 'error' && (
                        <div className="mb-5 flex items-start gap-2.5 px-4 py-3 rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm font-medium">
                            <span className="material-symbols-outlined text-[18px] mt-0.5 flex-shrink-0">error</span>
                            {message}
                        </div>
                    )}
                    {status === 'success' && (
                        <div className="mb-5 flex items-start gap-2.5 px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm font-medium">
                            <span className="material-symbols-outlined text-[18px] mt-0.5 flex-shrink-0">check_circle</span>
                            {message}
                        </div>
                    )}

                    {status !== 'success' && token ? (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <label className="block text-xs font-bold uppercase tracking-wider text-[#464555]" htmlFor="password">
                                    Password Baru
                                </label>
                                <div className="relative">
                                    <input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                        minLength={8}
                                        className="w-full h-11 px-4 pr-11 bg-white border border-[#c7c4d8]/40 rounded-lg text-sm text-[#0b1c30] placeholder:text-slate-400 focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[#1c51a1] focus:shadow-[0_0_4px_2px_rgba(28,81,161,0.15)] transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#1c51a1] transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">
                                            {showPassword ? 'visibility_off' : 'visibility'}
                                        </span>
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-xs font-bold uppercase tracking-wider text-[#464555]" htmlFor="confirm">
                                    Konfirmasi Password
                                </label>
                                <div className="relative">
                                    <input
                                        id="confirm"
                                        type={showPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                        minLength={8}
                                        className="w-full h-11 px-4 pr-11 bg-white border border-[#c7c4d8]/40 rounded-lg text-sm text-[#0b1c30] placeholder:text-slate-400 focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[#1c51a1] focus:shadow-[0_0_4px_2px_rgba(28,81,161,0.15)] transition-all"
                                    />
                                </div>
                            </div>

                            <div className="pt-1">
                                <button
                                    type="submit"
                                    disabled={status === 'loading' || !password || !confirmPassword || !token}
                                    className="w-full h-11 text-white font-semibold text-sm rounded-lg shadow-lg shadow-[#1c51a1]/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                    style={{ background: 'linear-gradient(135deg, #1c51a1 0%, #2563c0 100%)' }}
                                >
                                    {status === 'loading' ? (
                                        <>
                                            <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                                            Menyimpan...
                                        </>
                                    ) : (
                                        'Simpan Password'
                                    )}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="pt-2">
                            <button
                                onClick={() => navigate('/login')}
                                className="w-full h-11 text-[#1c51a1] font-semibold text-sm rounded-lg border border-[#c7c4d8]/40 hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                            >
                                Kembali ke Halaman Login
                            </button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
