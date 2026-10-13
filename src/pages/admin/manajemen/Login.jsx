import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../../context/AppContext'
import { api } from '../../../services/api'

export default function Login() {
    const [isRegister, setIsRegister] = useState(false)
    const [isForgotPass, setIsForgotPass] = useState(false)
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isGoogleLoading, setIsGoogleLoading] = useState(false)
    const { currentUser, login } = useApp()
    const navigate = useNavigate()

    useEffect(() => {
        if (currentUser) {
            navigate('/', { replace: true })
        }
    }, [currentUser, navigate])

    const handleLogin = async (e) => {
        e.preventDefault()
        setError('')
        const cleanEmail = email.trim().toLowerCase()
        if (!cleanEmail) {
            setError('Alamat email wajib diisi.')
            return
        }
        setIsSubmitting(true)
        const result = await login(cleanEmail, password)
        if (result === true) {
            navigate('/')
        } else if (result === 'pending') {
            setError('Akun Anda masih menunggu persetujuan admin.')
        } else if (result === 'disabled') {
            setError('Akun Anda telah dinonaktifkan. Hubungi admin.')
        } else {
            setError('Login gagal. Periksa email dan password Anda.')
        }
        setIsSubmitting(false)
    }

    const handleRegister = async (e) => {
        e.preventDefault()
        setError('')
        setSuccess('')

        const cleanEmail = email.trim().toLowerCase()
        const cleanName = name.trim()

        if (!cleanName) {
            setError('Nama lengkap wajib diisi.')
            return
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!cleanEmail || !emailRegex.test(cleanEmail)) {
            setError('Format email tidak valid. Pastikan alamat email diisi dengan benar (contoh: nama@domain.com).')
            return
        }

        if (!password || password.length < 8) {
            setError('Password minimal 8 karakter.')
            return
        }

        setIsSubmitting(true)
        try {
            await api.auth.signUp({ name: cleanName, email: cleanEmail, password })
            setSuccess('Pendaftaran berhasil! Akun Anda menunggu persetujuan admin.')
            setIsRegister(false)
            setName('')
            setPassword('')
        } catch (err) {
            let msg = err.message || 'Pendaftaran gagal. Coba lagi.'
            const lower = msg.toLowerCase()
            if (lower.includes('already exists') || lower.includes('already_exists') || lower.includes('already registered') || lower.includes('use another email')) {
                msg = 'Email sudah terdaftar. Silakan gunakan email lain atau langsung login.'
            } else if (lower.includes('invalid email address') || lower.includes('invalid email format')) {
                msg = 'Format email tidak valid. Pastikan penulisan alamat email benar.'
            }
            setError(msg)
        }
        setIsSubmitting(false)
    }

    const handleForgotPass = async (e) => {
        e.preventDefault()
        setError('')
        setSuccess('')
        const cleanEmail = email.trim().toLowerCase()
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!cleanEmail || !emailRegex.test(cleanEmail)) {
            setError('Format email tidak valid.')
            return
        }
        setIsSubmitting(true)
        try {
            await api.auth.forgotPassword(cleanEmail)
            setSuccess('Tautan reset password telah dikirim ke email Anda.')
        } catch (err) {
            setError(err.message || 'Gagal mengirim email reset password.')
        }
        setIsSubmitting(false)
    }

    const handleGoogleLogin = async () => {
        if (isGoogleLoading) return
        setIsGoogleLoading(true)
        setError('')
        try {
            const result = await api.auth.signInWithGoogle()
            // Jika sampai sini dan tidak ada url, berarti user mungkin sudah login atau respon tidak standar
            if (result && !result.url) {
                console.log("Google sign in merespon tanpa URL redirect:", result);
                window.location.replace('/');
            }
        } catch (err) {
            setError(err.message || 'Google sign-in gagal. Coba lagi.')
            setIsGoogleLoading(false)
        }
    }

    // Deteksi error dari Google OAuth callback saat Better Auth redirect kembali ke /login
    const urlParams = new URLSearchParams(window.location.search)
    const authError = urlParams.get('error')
    const authErrorDesc = urlParams.get('error_description') || urlParams.get('errorDescription')

    if (authError) {
        // Bersihkan URL agar tidak looping
        window.history.replaceState({}, '', '/login')
        
        if (authError === 'invalid_code') {
            // Double-hit callback — sesi mungkin sudah berhasil dibuat di hit pertama
            // Coba langsung ke dashboard
            window.location.replace('/')
            return null
        }
        // Error lain (code_verifier_missing, access_denied, dll) — tampilkan ke user
        // Setelah komponen render, set error state
        // Gunakan setTimeout agar React sudah selesai render
        setTimeout(() => {
            setError(`Google OAuth Error: ${authError}${authErrorDesc ? ` — ${authErrorDesc}` : ''}`)
        }, 100)
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[#f8f9ff] selection:bg-[#1c51a1] selection:text-white">
            <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px]" style={{ background: 'rgba(28,81,161,0.06)' }} />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[120px]" style={{ background: 'rgba(11,134,55,0.05)' }} />
            </div>

            <main className="w-full max-w-[440px]">
                <div className="text-center mb-10">
                    <div className="mb-6">
                        <img src="/logo.png" alt="Logo" className="w-36 h-36 object-contain mx-auto" />
                    </div>
                    <h1 className="text-2xl font-black tracking-tight text-[#0b1c30] mb-1">
                        Sistem Manajemen Penerbitan
                    </h1>
                    <p className="text-sm font-medium text-[#464555]/70 tracking-wide">
                        {isForgotPass ? 'Reset Password Anda' : (isRegister ? 'Buat akun baru' : 'Integrated Workflow Control')}
                    </p>
                </div>

                <div className="bg-white border border-[#c7c4d8]/15 rounded-xl p-8 shadow-[0_12px_32px_-4px_rgba(11,28,48,0.06)]">

                    {error && (
                        <div className="mb-5 flex items-start gap-2.5 px-4 py-3 rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm font-medium">
                            <span className="material-symbols-outlined text-[18px] mt-0.5 flex-shrink-0">error</span>
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="mb-5 flex items-start gap-2.5 px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm font-medium">
                            <span className="material-symbols-outlined text-[18px] mt-0.5 flex-shrink-0">check_circle</span>
                            {success}
                        </div>
                    )}

                    <form noValidate onSubmit={isForgotPass ? handleForgotPass : (isRegister ? handleRegister : handleLogin)} className="space-y-5">

                        {isRegister && !isForgotPass && (
                            <div className="space-y-2">
                                <label className="block text-xs font-bold uppercase tracking-wider text-[#464555]" htmlFor="name">
                                    Nama Lengkap
                                </label>
                                <input
                                    id="name"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    onBlur={() => setName(prev => prev.trim())}
                                    placeholder="Nama sesuai dokumen resmi"
                                    required
                                    className="w-full h-11 px-4 bg-white border border-[#c7c4d8]/40 rounded-lg text-sm text-[#0b1c30] placeholder:text-slate-400 focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[#1c51a1] focus:shadow-[0_0_4px_2px_rgba(28,81,161,0.15)] transition-all"
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="block text-xs font-bold uppercase tracking-wider text-[#464555]" htmlFor="email">
                                Alamat Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onBlur={() => setEmail(prev => prev.trim())}
                                placeholder="nama@penerbitan.go.id"
                                required
                                className="w-full h-11 px-4 bg-white border border-[#c7c4d8]/40 rounded-lg text-sm text-[#0b1c30] placeholder:text-slate-400 focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[#1c51a1] focus:shadow-[0_0_4px_2px_rgba(28,81,161,0.15)] transition-all"
                            />
                        </div>

                        {!isForgotPass && (
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-[#464555]" htmlFor="password">
                                        Password
                                    </label>
                                    {!isRegister && (
                                        <button
                                            type="button"
                                            onClick={() => { setIsForgotPass(true); setError(''); setSuccess('') }}
                                            className="text-xs font-semibold hover:opacity-80" style={{ color: '#1c51a1' }}
                                        >
                                            Lupa Password?
                                        </button>
                                    )}
                                </div>
                                <div className="relative">
                                    <input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required={!isForgotPass}
                                        minLength={isRegister ? 8 : undefined}
                                        className="w-full h-11 px-4 pr-11 bg-white border border-[#c7c4d8]/40 rounded-lg text-sm text-[#0b1c30] placeholder:text-slate-400 focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[#1c51a1] focus:shadow-[0_0_4px_2px_rgba(28,81,161,0.15)] transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors" style={{ ':hover': { color: '#1c51a1' } }}
                                        onMouseEnter={e => e.currentTarget.style.color = '#1c51a1'}
                                        onMouseLeave={e => e.currentTarget.style.color = ''}
                                    >
                                        <span className="material-symbols-outlined text-[20px]">
                                            {showPassword ? 'visibility_off' : 'visibility'}
                                        </span>
                                    </button>
                                </div>
                                {isRegister && (
                                    <p className="text-xs text-[#464555]/60">Minimal 8 karakter</p>
                                )}
                            </div>
                        )}

                        <div className="pt-1">
                            <button
                                type="submit"
                                disabled={isSubmitting || !email.trim() || (!isForgotPass && !password) || (isRegister && !name.trim())}
                                style={{ background: 'linear-gradient(135deg, #1c51a1 0%, #2563c0 100%)' }}
                                className="w-full h-11 text-white font-semibold text-sm rounded-lg shadow-lg shadow-[#1c51a1]/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                            >
                                {isSubmitting ? (
                                    <>
                                        <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                                        {isForgotPass ? 'Mengirim...' : (isRegister ? 'Mendaftar...' : 'Memuat...')}
                                    </>
                                ) : (
                                    <>
                                        {isForgotPass ? 'Kirim Link Reset' : (isRegister ? 'Buat Akun' : 'Masuk')}
                                        <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
                                            arrow_forward
                                        </span>
                                    </>
                                )}
                            </button>
                        </div>

                        {!isForgotPass && !isRegister && (
                            <>
                                <div className="relative flex items-center py-2">
                                    <div className="flex-grow border-t border-[#c7c4d8]/40"></div>
                                    <span className="flex-shrink-0 mx-4 text-[#464555]/40 text-xs font-bold uppercase tracking-wider">ATAU</span>
                                    <div className="flex-grow border-t border-[#c7c4d8]/40"></div>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleGoogleLogin}
                                    disabled={isGoogleLoading}
                                    className="w-full h-11 bg-white border border-[#c7c4d8]/60 text-[#464555] font-semibold text-sm rounded-lg hover:bg-slate-50 border-b-[3px] border-[#c7c4d8]/80 hover:border-b-[#c7c4d8]/60 active:border-b transition-all flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {isGoogleLoading ? (
                                        <>
                                            <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                                            Menghubungkan ke Google...
                                        </>
                                    ) : (
                                        <>
                                            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-[18px] h-[18px]" />
                                            Lanjutkan dengan Google
                                        </>
                                    )}
                                </button>

                                {(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
                                    <div className="mt-4 p-3 bg-amber-50/70 border border-amber-100/70 rounded-lg text-center">
                                        <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-2 flex items-center justify-center gap-1">
                                            <span className="material-symbols-outlined text-[12px]">terminal</span>
                                            Developer Bypass Mode
                                        </p>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                disabled={isSubmitting}
                                                onClick={async () => {
                                                    setError('');
                                                    setIsSubmitting(true);
                                                    const res = await login('admin@dev.local', 'developer123');
                                                    if (res === true) {
                                                        navigate('/');
                                                    } else {
                                                        setError('Gagal bypass login Admin. Pastikan backend sudah menyala dan database local ter-seed.');
                                                    }
                                                    setIsSubmitting(false);
                                                }}
                                                className="flex-1 h-9 bg-[#1c51a1] hover:bg-[#1c51a1]/90 text-white text-xs font-bold rounded shadow transition-all active:scale-[0.98] disabled:opacity-50"
                                            >
                                                Masuk Admin
                                            </button>
                                            <button
                                                type="button"
                                                disabled={isSubmitting}
                                                onClick={async () => {
                                                    setError('');
                                                    setIsSubmitting(true);
                                                    const res = await login('personil@dev.local', 'developer123');
                                                    if (res === true) {
                                                        navigate('/');
                                                    } else {
                                                        setError('Gagal bypass login Personil. Pastikan backend sudah menyala.');
                                                    }
                                                    setIsSubmitting(false);
                                                }}
                                                className="flex-1 h-9 bg-[#0b8637] hover:bg-[#0b8637]/90 text-white text-xs font-bold rounded shadow transition-all active:scale-[0.98] disabled:opacity-50"
                                            >
                                                Masuk Staff/PJ
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        <div className="pt-2 text-center">
                            <button
                                type="button"
                                onClick={() => {
                                    if (isForgotPass) {
                                        setIsForgotPass(false)
                                    } else {
                                        setIsRegister(!isRegister)
                                    }
                                    setError(''); setSuccess('')
                                }}
                                className="text-sm font-semibold hover:opacity-80 transition-colors" style={{ color: '#1c51a1' }}
                            >
                                {isForgotPass ? '← Kembali ke Login' : (isRegister ? '← Kembali ke Login' : 'Belum punya akun? Daftar di sini')}
                            </button>
                        </div>
                    </form>
                </div>

                <div className="mt-8 flex items-center justify-center gap-2.5 text-[#464555]/60">
                    <span className="material-symbols-outlined text-sm">verified_user</span>
                    <p className="text-xs font-medium leading-relaxed">
                        Akun baru akan dikonfirmasi oleh administrator
                    </p>
                </div>

                <div className="mt-8 text-center">
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#464555]/40">
                        System Version 2.5.0-Auth
                    </span>
                </div>
            </main>
        </div>
    )
}
