import { useState, useEffect, useRef } from 'react'
import { useApp } from '../../../context/AppContext'
import { useDialog } from '../../../context/DialogContext'
import { api } from '../../../services/api'
import { SOURCE_KEGIATAN, FORMAT_BUKU } from '../../../data/ddc'
import { PROVINSI, KABUPATEN } from '../../../data/wilayah'
import { utils, writeFile } from 'xlsx'
import JsBarcode from 'jsbarcode'
import PopupModal from '../../../components/PopupModal'

export default function NIPGenerator() {
    const { ddcList } = useApp()
    const { showConfirm, showToast } = useDialog()
    // Only show active DDC codes in the generator dropdown
    const ACTIVE_DDC = ddcList.filter(d => d.active)
    const [ddcCode, setDdcCode] = useState('')
    const [ddcSearch, setDdcSearch] = useState('')
    const [showDdcDropdown, setShowDdcDropdown] = useState(false)
    const [selectedDate, setSelectedDate] = useState('')
    const [sumber, setSumber] = useState('')
    const [format, setFormat] = useState('')
    const [provinsi, setProvinsi] = useState('')
    const [kabupaten, setKabupaten] = useState('')
    const [title, setTitle] = useState('')
    const [generatedNip, setGeneratedNip] = useState(null)
    const [nipHistory, setNipHistory] = useState([])
    const [isGenerating, setIsGenerating] = useState(false)
    const [copied, setCopied] = useState(false)
    const [showSuccess, setShowSuccess] = useState(false)
    const [showAllHistory, setShowAllHistory] = useState(false)
    const [popupMessage, setPopupMessage] = useState(null)
    const [historySearch, setHistorySearch] = useState('')

    const barcodeRef = useRef(null)
    const ddcRef = useRef(null)
    const provinsiRef = useRef(null)
    const kabupatenRef = useRef(null)

    // Searchable wilayah state
    const [provinsiSearch, setProvinsiSearch] = useState('')
    const [showProvinsiDropdown, setShowProvinsiDropdown] = useState(false)
    const [kabupatenSearch, setKabupatenSearch] = useState('')
    const [showKabupatenDropdown, setShowKabupatenDropdown] = useState(false)

    const selectedProvinsi = PROVINSI.find(p => p.code === provinsi)
    const selectedKabupaten = (KABUPATEN[provinsi] || []).find(k => k.code === kabupaten)

    const filteredProvinsi = PROVINSI.filter(p => {
        const term = provinsiSearch.toLowerCase()
        return p.code.includes(term) || p.label.toLowerCase().includes(term)
    })

    const filteredKabupaten = (KABUPATEN[provinsi] || []).filter(k => {
        const term = kabupatenSearch.toLowerCase()
        return k.code.includes(term) || k.label.toLowerCase().includes(term)
    })

    // Load history
    useEffect(() => {
        api.nip.getHistory()
            .then(data => setNipHistory(data.map(item => ({
                ...item,
                // Enrich ddcLabel dari local list jika API tidak mengembalikannya
                ddcLabel: item.ddcLabel || ddcList.find(d => d.code === item.ddcCode)?.label || ''
            }))))
            .catch(err => console.error('Failed to load history', err))
    }, [ddcList])

    // Close dropdowns on outside click
    useEffect(() => {
        function handleClick(e) {
            if (ddcRef.current && !ddcRef.current.contains(e.target)) setShowDdcDropdown(false)
            if (provinsiRef.current && !provinsiRef.current.contains(e.target)) setShowProvinsiDropdown(false)
            if (kabupatenRef.current && !kabupatenRef.current.contains(e.target)) setShowKabupatenDropdown(false)
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [])

    // Generate barcode when NIP changes
    useEffect(() => {
        if (generatedNip && barcodeRef.current) {
            try {
                JsBarcode(barcodeRef.current, generatedNip.barcode, {
                    format: 'CODE128',
                    width: 2,
                    height: 56,
                    displayValue: false,
                    margin: 0,
                    background: '#ffffff',
                    lineColor: '#000000',
                })
            } catch (e) {
                console.log('Barcode error:', e)
            }
        }
    }, [generatedNip])

    const filteredDDC = ACTIVE_DDC.filter(d => {
        const term = ddcSearch.toLowerCase()
        return d.code.includes(term) || d.label.toLowerCase().includes(term)
    })

    const selectedDDC = ACTIVE_DDC.find(d => d.code === ddcCode)

    const filteredHistory = historySearch.trim()
        ? nipHistory.filter(nip => {
            const term = historySearch.toLowerCase()
            return (
                (nip.title || '').toLowerCase().includes(term) ||
                (nip.visualFormat || nip.visual || '').toLowerCase().includes(term) ||
                (nip.ddcCode || '').toLowerCase().includes(term) ||
                (nip.ddcLabel || '').toLowerCase().includes(term)
            )
        })
        : nipHistory

    const handleGenerate = async (e) => {
        e.preventDefault()
        if (!ddcCode || !selectedDate || !sumber || !format || !provinsi || !kabupaten || !title) {
            setPopupMessage({ type: 'error', text: 'Mohon lengkapi semua field termasuk Asal Provinsi dan Kota/Kabupaten!' })
            return
        }
        const wilayahCode = `${provinsi}${kabupaten}`
        setIsGenerating(true)
        try {
            const record = await api.nip.generate({ ddcCode, date: selectedDate, sourceCode: sumber, formatCode: format, wilayahCode, title })
            const result = {
                id: record.id,
                visual: record.visualFormat,
                barcode: record.barcode,
                title: record.title,
                ddcCode: record.ddcCode,
                ddcLabel: record.ddcLabel || selectedDDC?.label || '',
                yearMonth: record.yearMonth,
                formattedDate: record.formattedDate,
                sumber: record.sourceCode,
                nomorUrut: record.serialNumber?.toString().padStart(3, '0'),
                format: record.formatCode,
                wilayahCode: record.wilayahCode || wilayahCode,
                provinsiLabel: PROVINSI.find(p => p.code === provinsi)?.label || provinsi,
                kabupatenLabel: (KABUPATEN[provinsi] || []).find(k => k.code === kabupaten)?.label || kabupaten,
                createdAt: record.createdAt || new Date().toISOString(),
            }
            setGeneratedNip(result)
            setNipHistory(prev => [result, ...prev])
            // Reset semua isian form
            setTitle('')
            setDdcCode('')
            setDdcSearch('')
            setSelectedDate('')
            setSumber('')
            setFormat('')
            setProvinsi('')
            setKabupaten('')
            setProvinsiSearch('')
            setKabupatenSearch('')
            // Tampilkan popup sukses
            setShowSuccess(true)
            setTimeout(() => setShowSuccess(false), 4000)
        } catch (e) {
            console.error('NIP generate error:', e)
            setPopupMessage({ type: 'error', text: 'Gagal generate NIP: ' + (e.message || 'Unknown error') })
        }
        setIsGenerating(false)
    }

    const handleExport = () => {
        if (nipHistory.length === 0) {
            setPopupMessage({ type: 'error', text: 'Tidak ada data untuk diekspor' })
            return
        }
        const SUMBER_MAP = { '0': 'Umum', '1': 'Inkubator', '2': 'DAK' }
        const FORMAT_MAP = { '1': 'Cetak', '2': 'Digital', '3': 'Keduanya' }
        const data = nipHistory.map((item, idx) => {
            const provCode = item.wilayahCode?.slice(0, 2) || ''
            const kabCode = item.wilayahCode?.slice(2, 4) || ''
            const provLabel = PROVINSI.find(p => p.code === provCode)?.label || provCode || '-'
            const kabLabel = (KABUPATEN[provCode] || []).find(k => k.code === kabCode)?.label || kabCode || '-'
            // handle both API field names (sourceCode/formatCode) and in-session names (sumber/format)
            const sumberCode = item.sourceCode ?? item.sumber ?? ''
            const formatCode = item.formatCode ?? item.format ?? ''
            const sumberLabel = SUMBER_MAP[String(sumberCode)] || sumberCode || '-'
            const formatLabel = FORMAT_MAP[String(formatCode)] || formatCode || '-'
            return {
                No: idx + 1,
                'Judul Buku': item.title || '-',
                'NIP (Visual)': item.visualFormat || item.visual,
                'NIP (Barcode)': item.barcode,
                'Kode DDC': item.ddcCode,
                'Label DDC': item.ddcLabel || '-',
                'Tanggal Terbit': item.formattedDate || item.yearMonth,
                'Sumber Kegiatan': `${sumberCode} - ${sumberLabel}`,
                'Format Buku': `${formatCode} - ${formatLabel}`,
                'Kode Wilayah': item.wilayahCode || '-',
                'Provinsi': provLabel,
                'Kota/Kabupaten': kabLabel,
                'Nomor Urut': item.serialNumber?.toString().padStart(3, '0') || item.nomorUrut || '-',
                'Dibuat Pada': item.createdAt ? new Date(item.createdAt).toLocaleString('id-ID') : '-',
            }
        })
        const ws = utils.json_to_sheet(data)
        const wb = utils.book_new()
        utils.book_append_sheet(wb, ws, 'Riwayat NIP')
        writeFile(wb, `Riwayat_NIP_${new Date().toISOString().split('T')[0]}.xlsx`)
    }

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text)
            .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
            .catch(() => {
                const el = document.createElement('textarea')
                el.value = text
                document.body.appendChild(el)
                el.select()
                document.execCommand('copy')
                document.body.removeChild(el)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
            })
    }

    const handleDownloadBarcode = () => {
        const svg = barcodeRef.current
        if (!svg || !generatedNip) return
        const svgData = new XMLSerializer().serializeToString(svg)
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
        const url = URL.createObjectURL(svgBlob)
        const img = new Image()
        img.onload = () => {
            const scale = 3
            const barcodeW = img.width * scale
            const barcodeH = img.height * scale
            const padX = 24 * scale
            const padTop = 14 * scale
            const padBottom = 14 * scale
            const labelH = 12 * scale
            const visualH = 12 * scale
            const gapAfterLabel = 1.5 * scale // mepet di atas barcode
            const gapAfterBarcode = 3.5 * scale // mepet di bawah barcode

            const canvasW = barcodeW + padX * 2
            const canvasH = padTop + labelH + gapAfterLabel + barcodeH + gapAfterBarcode + visualH + padBottom

            const canvas = document.createElement('canvas')
            canvas.width = canvasW
            canvas.height = canvasH
            const ctx = canvas.getContext('2d')

            // White background
            ctx.fillStyle = '#ffffff'
            ctx.fillRect(0, 0, canvasW, canvasH)

            // DDC Label (above barcode - mepet)
            const ddcText = `${generatedNip.ddcCode}${generatedNip.ddcLabel ? ' — ' + generatedNip.ddcLabel : ''}`
            ctx.fillStyle = '#111111'
            ctx.font = `bold ${11.5 * scale}px Arial, sans-serif`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'top'
            ctx.fillText(ddcText, canvasW / 2, padTop)

            // Barcode image
            const barcodeY = padTop + labelH + gapAfterLabel
            ctx.drawImage(img, padX, barcodeY, barcodeW, barcodeH)

            // Visual NIP (below barcode - rata kiri & rata kanan presisi selebar batang barcode)
            ctx.fillStyle = '#111111'
            ctx.font = `bold ${10.5 * scale}px 'Courier New', monospace`
            ctx.textBaseline = 'top'

            const visualText = generatedNip.visual
            const chars = visualText.split('')
            const totalChars = chars.length
            const visualY = barcodeY + barcodeH + gapAfterBarcode

            if (totalChars > 1) {
                const charWidths = chars.map(c => ctx.measureText(c).width)
                const sumCharW = charWidths.reduce((a, b) => a + b, 0)
                const totalGapSpace = barcodeW - sumCharW
                const extraSpacingPerChar = totalGapSpace / (totalChars - 1)

                let currentX = padX
                ctx.textAlign = 'left'
                chars.forEach((c, idx) => {
                    ctx.fillText(c, currentX, visualY)
                    currentX += charWidths[idx] + extraSpacingPerChar
                })
            } else {
                ctx.textAlign = 'center'
                ctx.fillText(visualText, canvasW / 2, visualY)
            }

            URL.revokeObjectURL(url)
            const a = document.createElement('a')
            a.href = canvas.toDataURL('image/png')
            a.download = `barcode-NIP-${generatedNip.barcode}.png`
            a.click()
        }
        img.src = url
    }

    const handleDeleteNip = async (id, idx) => {
        const ok = await showConfirm({
            title: 'Hapus NIP',
            message: 'Hapus NIP ini dari riwayat? Nomor urut tidak akan terpengaruh.',
            type: 'danger',
            confirmText: 'Ya, Hapus'
        })
        if (!ok) return
        try {
            await api.nip.deleteOne(id)
            setNipHistory(prev => prev.filter((_, i) => i !== idx))
            showToast({ message: 'NIP berhasil dihapus dari riwayat.', type: 'info' })
        } catch (e) {
            setPopupMessage({ type: 'error', text: 'Gagal menghapus NIP: ' + e.message })
        }
    }

    const handleResetNip = async () => {
        const ok = await showConfirm({
            title: 'Reset Nomor Urut NIP',
            message: 'Reset nomor urut NIP? Seluruh riwayat akan dihapus dan nomor urut berikutnya akan dimulai dari 001.',
            type: 'danger',
            confirmText: 'Ya, Reset Nomor Urut'
        })
        if (!ok) return
        try {
            await api.nip.reset()
            setNipHistory([])
            setGeneratedNip(null)
            showToast({ message: 'Nomor urut NIP berhasil di-reset.', type: 'success' })
        } catch (e) {
            setPopupMessage({ type: 'error', text: 'Gagal reset NIP: ' + e.message })
        }
    }

    const handleSelectFromHistory = (nip) => {
        const provCode = nip.wilayahCode?.slice(0, 2) || ''
        const kabCode = nip.wilayahCode?.slice(2, 4) || ''
        // Fallback: lookup label DDC dari list lokal jika tidak ada di data history
        const resolvedDdcLabel = nip.ddcLabel || ddcList.find(d => d.code === nip.ddcCode)?.label || ''
        setGeneratedNip({
            visual: nip.visualFormat || nip.visual,
            barcode: nip.barcode,
            title: nip.title,
            ddcCode: nip.ddcCode,
            ddcLabel: resolvedDdcLabel,
            yearMonth: nip.yearMonth,
            formattedDate: nip.formattedDate,
            sumber: nip.sourceCode ?? nip.sumber,
            nomorUrut: nip.serialNumber?.toString().padStart(3, '0') || nip.nomorUrut,
            format: nip.formatCode ?? nip.format,
            wilayahCode: nip.wilayahCode,
            provinsiLabel: PROVINSI.find(p => p.code === provCode)?.label || provCode,
            kabupatenLabel: (KABUPATEN[provCode] || []).find(k => k.code === kabCode)?.label || kabCode,
            createdAt: nip.createdAt,
        })
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const handleEditFromHistory = (nip) => {
        // Ambil kode dari wilayah
        const provCode = nip.wilayahCode?.slice(0, 2) || ''
        const kabCode = nip.wilayahCode?.slice(2, 4) || ''
        // Ubah yearMonth (YYYYMM) atau formattedDate (DD/MM/YYYY) ke YYYY-MM-DD untuk input date
        let dateVal = ''
        if (nip.formattedDate) {
            const [d, m, y] = nip.formattedDate.split('/')
            if (y && m && d) dateVal = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
        } else if (nip.yearMonth && nip.yearMonth.length >= 6) {
            dateVal = `${nip.yearMonth.slice(0, 4)}-${nip.yearMonth.slice(4, 6)}-01`
        }
        // Prefill semua field form
        setTitle(nip.title || '')
        setDdcCode(nip.ddcCode || '')
        setDdcSearch('')
        setSelectedDate(dateVal)
        setSumber(String(nip.sourceCode ?? nip.sumber ?? ''))
        setFormat(String(nip.formatCode ?? nip.format ?? ''))
        setProvinsi(provCode)
        setKabupaten(kabCode)
        setProvinsiSearch('')
        setKabupatenSearch('')
        // Scroll ke form
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    // NIP structure breakdown segments
    const nipParts = generatedNip ? [
        { code: generatedNip.ddcCode, desc: 'Kode DDC (3 digit)' },
        { code: generatedNip.yearMonth, desc: 'Tahun & Bulan Terbit (YYYYMM)' },
        { code: generatedNip.sumber || '—', desc: 'Sumber Kegiatan (1 digit)' },
        { code: generatedNip.format || '—', desc: 'Format Buku (1 digit)' },
        { code: generatedNip.wilayahCode || '——', desc: `Kode Wilayah - ${generatedNip.provinsiLabel || '?'} / ${generatedNip.kabupatenLabel || '?'}` },
        { code: generatedNip.nomorUrut, desc: 'Nomor Urut (3 digit)' },
    ] : []

    const formatDateTime = (iso) => {
        if (!iso) return '—'
        return new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    }



    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            {/* Page Header */}
            <div>
                <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 mb-1">Generator NIP</h2>
                <p className="text-sm font-medium text-slate-500">Standarisasi identitas buku — 18 digit Nomor Induk Penerbitan</p>
            </div>

            {/* Two Column: Form + Result */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* === Input Form === */}
                <div className="lg:col-span-3 bg-white rounded-xl p-7 border border-slate-200/60" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                    <div className="flex items-center gap-2.5 mb-7">
                        <div className="w-1 h-6 bg-[#1c51a1] rounded-full" />
                        <h3 className="text-base font-bold text-slate-900 tracking-tight">Formulir Data Buku</h3>
                    </div>

                    <form onSubmit={handleGenerate} className="space-y-5">
                        {/* Judul Buku */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Judul Buku <span className="text-rose-500">*</span></label>
                            <input
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="Masukkan judul buku..."
                                required
                                className="w-full bg-white border border-slate-200/60 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1c51a1]/20 focus:border-[#1c51a1] transition-all placeholder:text-slate-400"
                            />
                        </div>

                        {/* DDC Searchable Dropdown */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Kode DDC (3 digit) <span className="text-rose-500">*</span></label>
                            <div className="relative" ref={ddcRef}>
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
                                <input
                                    type="text"
                                    value={ddcSearch || (selectedDDC ? `${selectedDDC.code} — ${selectedDDC.label}` : '')}
                                    onChange={e => { setDdcSearch(e.target.value); setShowDdcDropdown(true); setDdcCode('') }}
                                    onFocus={() => setShowDdcDropdown(true)}
                                    placeholder="Cari kode DDC... (cth: 370 atau Pendidikan)"
                                    className="w-full bg-white border border-slate-200/60 rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1c51a1]/20 focus:border-[#1c51a1] transition-all placeholder:text-slate-400"
                                />
                                {showDdcDropdown && (
                                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                                        {filteredDDC.length === 0 ? (
                                            <div className="px-4 py-3 text-sm text-slate-400">Tidak ditemukan</div>
                                        ) : filteredDDC.map(d => (
                                            <div
                                                key={d.code}
                                                onClick={() => { setDdcCode(d.code); setDdcSearch(''); setShowDdcDropdown(false) }}
                                                className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-[#eef4fc] hover:text-[#163d7a] transition-colors flex gap-2 ${d.code === ddcCode ? 'bg-[#eef4fc] text-[#163d7a] font-semibold' : 'text-slate-700'}`}
                                            >
                                                <span className="font-mono font-bold text-[#1c51a1] w-9 flex-shrink-0">{d.code}</span>
                                                <span>{d.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {selectedDDC && (
                                <p className="text-xs text-[#1c51a1] font-medium flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                    {selectedDDC.code} — {selectedDDC.label}
                                </p>
                            )}
                        </div>

                        {/* Tanggal Terbit */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Tanggal Terbit <span className="text-rose-500">*</span></label>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={e => setSelectedDate(e.target.value)}
                                required
                                className="w-full bg-white border border-slate-200/60 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1c51a1]/20 focus:border-[#1c51a1] transition-all"
                            />
                        </div>

                        {/* Sumber + Format */}
                        <div className="grid grid-cols-2 gap-5">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Sumber Kegiatan <span className="text-rose-500">*</span></label>
                                <select
                                    value={sumber}
                                    onChange={e => setSumber(e.target.value)}
                                    required
                                    className="w-full bg-white border border-slate-200/60 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1c51a1]/20 focus:border-[#1c51a1] transition-all"
                                >
                                    <option value="">Pilih...</option>
                                    <option value="0">Umum (0)</option>
                                    <option value="1">Inkubator (1)</option>
                                    <option value="2">DAK (2)</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Format Buku <span className="text-rose-500">*</span></label>
                                <select
                                    value={format}
                                    onChange={e => setFormat(e.target.value)}
                                    required
                                    className="w-full bg-white border border-slate-200/60 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1c51a1]/20 focus:border-[#1c51a1] transition-all"
                                >
                                    <option value="">Pilih...</option>
                                    <option value="1">Cetak (1)</option>
                                    <option value="2">Digital (2)</option>
                                    <option value="3">Keduanya (3)</option>
                                </select>
                            </div>
                        </div>

                        {/* Kode Wilayah: Provinsi + Kabupaten */}
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                                Kode Wilayah (4 digit) <span className="text-rose-500">*</span>
                            </label>
                            <div className="grid grid-cols-2 gap-4">

                                {/* Asal Provinsi — searchable */}
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-semibold text-slate-400 block">Asal Provinsi</label>
                                    <div className="relative" ref={provinsiRef}>
                                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
                                        <input
                                            type="text"
                                            value={provinsiSearch || (selectedProvinsi ? `${selectedProvinsi.code} — ${selectedProvinsi.label}` : '')}
                                            onChange={e => { setProvinsiSearch(e.target.value); setShowProvinsiDropdown(true); setProvinsi(''); setKabupaten(''); setKabupatenSearch('') }}
                                            onFocus={() => setShowProvinsiDropdown(true)}
                                            placeholder="Cari kode / nama provinsi..."
                                            className="w-full bg-white border border-slate-200/60 rounded-lg pl-10 pr-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1c51a1]/20 focus:border-[#1c51a1] transition-all placeholder:text-slate-400"
                                        />
                                        {showProvinsiDropdown && (
                                            <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                                {filteredProvinsi.length === 0 ? (
                                                    <div className="px-4 py-3 text-sm text-slate-400">Tidak ditemukan</div>
                                                ) : filteredProvinsi.map(p => (
                                                    <div
                                                        key={p.code}
                                                        onClick={() => { setProvinsi(p.code); setProvinsiSearch(''); setShowProvinsiDropdown(false); setKabupaten(''); setKabupatenSearch('') }}
                                                        className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-[#eef4fc] hover:text-[#163d7a] transition-colors flex gap-2 ${p.code === provinsi ? 'bg-[#eef4fc] text-[#163d7a] font-semibold' : 'text-slate-700'}`}
                                                    >
                                                        <span className="font-mono font-bold text-[#1c51a1] w-7 flex-shrink-0">{p.code}</span>
                                                        <span>{p.label}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {selectedProvinsi && (
                                        <p className="text-xs text-[#1c51a1] font-medium flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                            {selectedProvinsi.code} — {selectedProvinsi.label}
                                        </p>
                                    )}
                                </div>

                                {/* Asal Kota/Kabupaten — searchable, dependent */}
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-semibold text-slate-400 block">Asal Kota/Kabupaten</label>
                                    <div className="relative" ref={kabupatenRef}>
                                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
                                        <input
                                            type="text"
                                            value={kabupatenSearch || (selectedKabupaten ? `${selectedKabupaten.code} — ${selectedKabupaten.label}` : '')}
                                            onChange={e => { setKabupatenSearch(e.target.value); setShowKabupatenDropdown(true); setKabupaten('') }}
                                            onFocus={() => { if (provinsi) setShowKabupatenDropdown(true) }}
                                            disabled={!provinsi}
                                            placeholder={provinsi ? 'Cari kode / nama kab...' : '— Pilih provinsi dulu —'}
                                            className="w-full bg-white border border-slate-200/60 rounded-lg pl-10 pr-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1c51a1]/20 focus:border-[#1c51a1] transition-all placeholder:text-slate-400 disabled:opacity-50"
                                        />
                                        {showKabupatenDropdown && provinsi && (
                                            <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                                {filteredKabupaten.length === 0 ? (
                                                    <div className="px-4 py-3 text-sm text-slate-400">Tidak ditemukan</div>
                                                ) : filteredKabupaten.map(k => (
                                                    <div
                                                        key={k.code}
                                                        onClick={() => { setKabupaten(k.code); setKabupatenSearch(''); setShowKabupatenDropdown(false) }}
                                                        className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-[#eef4fc] hover:text-[#163d7a] transition-colors flex gap-2 ${k.code === kabupaten ? 'bg-[#eef4fc] text-[#163d7a] font-semibold' : 'text-slate-700'}`}
                                                    >
                                                        <span className="font-mono font-bold text-[#1c51a1] w-7 flex-shrink-0">{k.code}</span>
                                                        <span>{k.label}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {selectedKabupaten && (
                                        <p className="text-xs text-[#1c51a1] font-medium flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                            {selectedKabupaten.code} — {selectedKabupaten.label}
                                        </p>
                                    )}
                                </div>

                            </div>
                            {provinsi && kabupaten && (
                                <p className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px]">location_on</span>
                                    Kode wilayah: <span className="font-mono">{provinsi}{kabupaten}</span>
                                </p>
                            )}
                        </div>

                        {/* Submit */}
                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={isGenerating}
                                className="w-full py-3.5 rounded-lg text-white font-bold text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-[#1c51a1]/20 hover:shadow-[#1c51a1]/30 active:scale-[0.98] transition-all disabled:opacity-60"
                                style={{ background: 'linear-gradient(135deg, #1c51a1 0%, #2563c0 100%)' }}
                            >
                                <span className={`material-symbols-outlined text-[20px] ${isGenerating ? 'animate-spin' : ''}`}>
                                    {isGenerating ? 'progress_activity' : 'sync'}
                                </span>
                                {isGenerating ? 'Memproses...' : 'Generate NIP'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* === Result Card === */}
                <div className="lg:col-span-2 bg-white rounded-xl p-7 border border-slate-200/60 flex flex-col" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                    <div className="flex items-center gap-2.5 mb-6">
                        <div className="w-1 h-6 bg-emerald-500 rounded-full" />
                        <h3 className="text-base font-bold text-slate-900 tracking-tight">Hasil Generasi</h3>
                    </div>

                    {generatedNip ? (
                        <div className="flex-1 flex flex-col">
                            {/* Title */}
                            <p className="text-xs font-semibold text-slate-500 truncate mb-1">{generatedNip.title}</p>

                            {/* Visual NIP */}
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3">Nomor Induk Penerbitan</p>
                            <div className="bg-[#eef4fc] border border-dashed border-[#b8d0ef] px-5 py-6 rounded-xl text-center">
                                <span className="font-mono text-2xl font-bold text-[#1c51a1] tracking-widest">
                                    {generatedNip.visual}
                                </span>
                            </div>

                            {/* Barcode */}
                            <div className="mt-4 bg-white border border-slate-200 rounded-xl p-4 flex flex-col items-center">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Barcode (Machine Readable)</p>
                                {/* DDC Label above barcode - mepet */}
                                <p className="text-xs font-bold text-slate-800 text-center mb-0.5">
                                    {generatedNip.ddcCode}{generatedNip.ddcLabel ? ` — ${generatedNip.ddcLabel}` : ''}
                                </p>
                                {/* Barcode SVG */}
                                <svg ref={barcodeRef} className="w-full max-h-16" />
                                {/* Visual NIP below barcode */}
                                <p className="font-mono text-xs font-extrabold text-slate-900 tracking-widest text-center mt-1 w-full" style={{ textAlignLast: 'justify', textAlign: 'justify' }}>
                                    {generatedNip.visual}
                                </p>
                            </div>

                            {/* Copy / Download buttons */}
                            <div className="flex gap-2 mt-4">
                                <button
                                    onClick={() => copyToClipboard(generatedNip.visual)}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[16px]">content_copy</span>
                                    Salin Visual
                                </button>
                                <button
                                    onClick={handleDownloadBarcode}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-[#eef4fc] hover:bg-[#dce8f8] text-[#163d7a] rounded-lg text-xs font-semibold transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[16px]">download</span>
                                    Unduh PNG
                                </button>
                            </div>

                            {/* Breakdown */}
                            <div className="mt-6 pt-5 border-t border-slate-100">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Struktur NIP</h4>
                                <div className="space-y-3">
                                    {nipParts.map((part, i) => (
                                        <div key={i} className="flex justify-between items-center">
                                            <span className="font-mono text-xs bg-[#eef4fc] text-[#1c51a1] px-2 py-1 rounded font-bold">{part.code}</span>
                                            <span className="text-xs text-slate-600">{part.desc}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col justify-center items-center text-center">
                            <div className="w-16 h-16 bg-[#eef4fc] rounded-2xl flex items-center justify-center mb-4">
                                <span className="material-symbols-outlined text-3xl text-[#6a9dd4]">pin</span>
                            </div>
                            <p className="text-sm font-semibold text-slate-500">Belum ada NIP</p>
                            <p className="text-xs text-slate-400 mt-1 max-w-[200px]">Isi data di sebelah kiri lalu klik Generate NIP</p>

                            {/* Placeholder breakdown */}
                            <div className="mt-8 w-full pt-6 border-t border-slate-100">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 text-left">Struktur NIP</h4>
                                <div className="space-y-3">
                                    {[
                                        ['---', 'Kode DDC (3 digit)'],
                                        ['------', 'Tahun & Bulan Terbit (YYYYMM)'],
                                        ['-', 'Sumber Kegiatan (0/1/2)'],
                                        ['-', 'Format Buku (1 digit)'],
                                        ['----', 'Kode Wilayah (Prov+Kab)'],
                                        ['---', 'Nomor Urut (3 digit)'],
                                    ].map(([code, desc], i) => (
                                        <div key={i} className="flex justify-between items-center">
                                            <span className="font-mono text-xs bg-slate-100 text-slate-400 px-2 py-1 rounded">{code}</span>
                                            <span className="text-xs text-slate-400">{desc}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* History Table */}
            <div className="bg-white rounded-xl border border-slate-200/60 overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <div className="px-7 py-5 border-b border-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-2.5">
                        <div className="w-1 h-6 bg-amber-500 rounded-full" />
                        <h3 className="text-base font-bold text-slate-900 tracking-tight flex-shrink-0">Riwayat NIP</h3>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                        {/* Search Bar */}
                        <div className="w-full sm:w-64 flex items-center bg-slate-50/60 hover:bg-slate-50 focus-within:bg-white border border-slate-200 hover:border-slate-300 focus-within:border-[#0b5cd5] rounded-lg px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-[#0b5cd5]/15 transition-all shadow-xs gap-2 group">
                            <svg className="text-slate-400 group-focus-within:text-[#0b5cd5] shrink-0 transition-colors pointer-events-none" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                            <input
                                type="text"
                                value={historySearch}
                                onChange={e => setHistorySearch(e.target.value)}
                                placeholder="Cari NIP, judul, DDC..."
                                className="w-full bg-transparent border-none outline-none p-0 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-0 leading-normal"
                            />
                            {historySearch && (
                                <button
                                    type="button"
                                    onClick={() => setHistorySearch('')}
                                    className="p-0.5 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100 transition-colors shrink-0"
                                    title="Hapus pencarian"
                                >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18" />
                                        <line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                </button>
                            )}
                        </div>
                        
                        <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

                        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                            <button
                                onClick={handleResetNip}
                                className="flex items-center gap-1.5 text-xs font-semibold text-rose-500 hover:text-rose-700 transition-colors"
                                title="Reset nomor urut ke 001 (hapus semua riwayat)"
                            >
                                <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                                Reset Urut
                            </button>
                            <button
                                onClick={handleExport}
                                disabled={nipHistory.length === 0}
                                className="flex items-center gap-1.5 text-xs font-semibold text-[#1c51a1] hover:text-[#163d7a] transition-colors disabled:opacity-40"
                            >
                                <span className="material-symbols-outlined text-[16px]">download</span>
                                Unduh Excel
                            </button>
                        </div>
                    </div>
                </div>

                {filteredHistory.length === 0 ? (
                    <div className="px-7 py-10 text-center text-sm text-slate-400">
                        {historySearch ? 'Tidak ada riwayat yang cocok dengan pencarian' : 'Belum ada riwayat NIP yang digenerate'}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-[11px] font-bold text-slate-500 uppercase tracking-widest bg-slate-50/50">
                                    <th className="px-7 py-4">Judul Buku</th>
                                    <th className="px-6 py-4">NIP</th>
                                    <th className="px-6 py-4">DDC</th>
                                    <th className="px-6 py-4">Tanggal</th>
                                    <th className="px-6 py-4 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {(showAllHistory ? filteredHistory : filteredHistory.slice(0, 10)).map((nip, idx) => (
                                    <tr
                                        key={idx}
                                        onClick={() => handleSelectFromHistory(nip)}
                                        className="hover:bg-[#eef4fc]/60 transition-colors cursor-pointer group"
                                        title="Klik untuk tampilkan kembali di panel hasil"
                                    >
                                        <td className="px-7 py-4">
                                            <span className="font-semibold text-slate-900 text-sm line-clamp-1 group-hover:text-[#163d7a] transition-colors">{nip.title || '—'}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-mono text-[#1c51a1] font-medium text-xs tracking-tight">
                                                {nip.visualFormat || nip.visual}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-mono text-[11px] bg-[#eef4fc] text-[#163d7a] px-2 py-1 rounded font-bold">{nip.ddcCode}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-mono text-[11px] text-slate-400">
                                                {nip.createdAt ? formatDateTime(nip.createdAt) : (nip.formattedDate || nip.yearMonth || '—')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center" onClick={e => e.stopPropagation()}>
                                            <div className="flex items-center justify-center gap-1">
                                                <button
                                                    onClick={() => handleEditFromHistory(nip)}
                                                    className="p-1.5 text-slate-400 hover:text-amber-600 transition-colors rounded-lg hover:bg-amber-50"
                                                    title="Edit & generate ulang"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">edit</span>
                                                </button>
                                                <button
                                                    onClick={() => copyToClipboard(nip.barcode)}
                                                    className="p-1.5 text-slate-400 hover:text-[#1c51a1] transition-colors rounded-lg hover:bg-[#eef4fc]"
                                                    title="Salin barcode"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">content_copy</span>
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteNip(nip.id, idx)}
                                                    className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors rounded-lg hover:bg-rose-50"
                                                    title="Hapus NIP ini"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {filteredHistory.length > 10 && (
                    <div className="px-7 py-4 border-t border-slate-100 flex justify-center bg-slate-50/30">
                        <button
                            onClick={() => setShowAllHistory(!showAllHistory)}
                            className="flex items-center gap-1.5 text-xs font-bold text-[#1c51a1] hover:text-[#163d7a] transition-all bg-white hover:bg-[#eef4fc] px-4.5 py-2 rounded-full border border-slate-200/80 shadow-sm"
                        >
                            <span className="material-symbols-outlined text-[18px]">
                                {showAllHistory ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
                            </span>
                            {showAllHistory ? 'Tampilkan Lebih Sedikit' : `Lihat Semua (${filteredHistory.length} Riwayat)`}
                        </button>
                    </div>
                )}
            </div>

            {/* Copy toast */}
            {copied && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-5 py-3 bg-slate-900 text-white text-sm font-medium rounded-full shadow-xl z-50 animate-pulse">
                    <span className="material-symbols-outlined text-[16px] text-emerald-400">check_circle</span>
                    Tersalin ke clipboard!
                </div>
            )}

            {/* NIP Success popup */}
            {showSuccess && generatedNip && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.25)' }}>
                    <div
                        className="bg-white rounded-2xl shadow-2xl border border-emerald-100 px-8 py-7 flex flex-col items-center gap-3 max-w-sm w-full mx-4"
                        style={{ animation: 'fadeInScale 0.3s ease-out' }}
                    >
                        <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-4xl text-emerald-500">task_alt</span>
                        </div>
                        <p className="text-base font-bold text-slate-800">NIP Berhasil Digenerate!</p>
                        <p className="text-xs text-slate-500 text-center font-medium">{generatedNip.title}</p>
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-3 text-center w-full">
                            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Nomor Induk Penerbitan</p>
                            <span className="font-mono text-sm font-bold text-emerald-700 tracking-wider break-all">
                                {generatedNip.visual}
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-400">Hasil tersimpan di Riwayat NIP</p>
                        <button
                            onClick={() => setShowSuccess(false)}
                            className="text-xs font-semibold text-slate-400 hover:text-slate-700 transition-colors"
                        >
                            Tutup
                        </button>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes fadeInScale {
                    from { opacity: 0; transform: scale(0.88); }
                    to   { opacity: 1; transform: scale(1); }
                }
            `}</style>
            
            <PopupModal
                isOpen={!!popupMessage}
                type={popupMessage?.type}
                message={popupMessage?.text}
                onClose={() => setPopupMessage(null)}
            />
        </div>
    )
}
