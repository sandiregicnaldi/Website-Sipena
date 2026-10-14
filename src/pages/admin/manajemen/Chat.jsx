import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useApp } from '../../../context/AppContext'
import { useDialog } from '../../../context/DialogContext'
import api from '../../../services/api'

// Helper nada ping untuk pesan/catatan baru
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
        gain.gain.setValueAtTime(0.2, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.4)
    } catch {
        // Browser tidak support atau autoplay diblokir
    }
}

// Kunci localStorage untuk waktu baca catatan tahapan
const LS_NOTE_KEY = 'note_last_seen'
function getLastSeenNotes() {
    try { return JSON.parse(localStorage.getItem(LS_NOTE_KEY) || '{}') } catch { return {} }
}
function saveLastSeenNotes(map) {
    localStorage.setItem(LS_NOTE_KEY, JSON.stringify(map))
}

function formatRelativeTime(iso) {
    if (!iso) return ''
    const diff = Math.floor((Date.now() - new Date(iso)) / 60000)
    if (diff < 1) return 'Baru saja'
    if (diff < 60) return `${diff} mnt lalu`
    if (diff < 1440) return `${Math.floor(diff / 60)} jam lalu`
    return `${Math.floor(diff / 1440)} hari lalu`
}

export default function Chat() {
    const { currentUser, isAdmin, projects, addStageNote } = useApp()
    const { showAlert, showConfirm, showToast } = useDialog()
    const [searchParams, setSearchParams] = useSearchParams()
    const navigate = useNavigate()
    
    // Tab aktif: 'all' | 'group' | 'direct' | 'notes'
    const [activeTab, setActiveTab] = useState('all')
    const [searchQuery, setSearchQuery] = useState('')
    
    // State percakapan
    const [conversations, setConversations] = useState([])
    const [selectedConv, setSelectedConv] = useState(null)
    const [messages, setMessages] = useState([])
    const [messageInput, setMessageInput] = useState('')
    const [chatAttachment, setChatAttachment] = useState(null)
    const [loadingConversations, setLoadingConversations] = useState(true)
    const [loadingMessages, setLoadingMessages] = useState(false)
    const [sending, setSending] = useState(false)
    
    const chatFileInputRef = useRef(null)

    // State Catatan Proyek
    const [selectedStageNote, setSelectedStageNote] = useState(null)
    const [stageNoteInput, setStageNoteInput] = useState('')
    const [stageNoteAttachment, setStageNoteAttachment] = useState(null)
    const [sendingStageNote, setSendingStageNote] = useState(false)
    const [lastSeenVersion, setLastSeenVersion] = useState(0)

    // Modal state
    const [showNewDirectModal, setShowNewDirectModal] = useState(false)
    const [showNewGroupModal, setShowNewGroupModal] = useState(false)
    const [usersList, setUsersList] = useState([])
    const [loadingUsers, setLoadingUsers] = useState(false)
    const [searchContact, setSearchContact] = useState('')

    // Group form
    const [groupTitle, setGroupTitle] = useState('')
    const [selectedGroupMembers, setSelectedGroupMembers] = useState([])
    const [creatingGroup, setCreatingGroup] = useState(false)

    // Delete confirmation
    const [convToDelete, setConvToDelete] = useState(null)
    const [deleting, setDeleting] = useState(false)

    const messagesEndRef = useRef(null)
    const prevTotalUnreadRef = useRef(0)
    const prevMsgCountRef = useRef(0)
    const selectedConvRef = useRef(selectedConv)
    useEffect(() => {
        selectedConvRef.current = selectedConv
    }, [selectedConv])

    // Unread count untuk kategori obrolan
    const unreadAll = useMemo(() => {
        return conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0)
    }, [conversations])

    const unreadGroup = useMemo(() => {
        return conversations.filter(c => c.type === 'group').reduce((acc, c) => acc + (c.unreadCount || 0), 0)
    }, [conversations])

    const unreadDirect = useMemo(() => {
        return conversations.filter(c => c.type === 'direct').reduce((acc, c) => acc + (c.unreadCount || 0), 0)
    }, [conversations])

    // ── Komputasi Catatan Tahapan Proyek ───────────────────────────────────
    const stageNotesThreads = useMemo(() => {
        if (!projects?.length) return []
        const lastSeen = getLastSeenNotes()
        const list = []

        for (const project of projects) {
            if (!project.stages?.length) continue
            for (const stage of project.stages) {
                if (!isAdmin && stage.pjId !== currentUser?.id) continue
                if (!stage.notes?.length) continue

                const seenTime = lastSeen[stage.id] ? new Date(lastSeen[stage.id]) : null
                const unreadCount = stage.notes.filter(n =>
                    n.from !== currentUser?.name && (!seenTime || new Date(n.time) > seenTime)
                ).length

                // Urutkan catatan lama ke baru
                const sortedNotes = [...stage.notes].sort((a, b) => new Date(a.time) - new Date(b.time))
                const latestNote = sortedNotes[sortedNotes.length - 1]

                list.push({
                    projectId: project.id,
                    projectTitle: project.title,
                    stageId: stage.id,
                    stageLabel: stage.label,
                    stagePjId: stage.pjId,
                    stageStatus: stage.status,
                    notes: sortedNotes,
                    latestNote,
                    unreadCount,
                    hasUnread: unreadCount > 0,
                })
            }
        }

        // Urutkan thread berdasarkan catatan terbaru (paling atas yang terupdate)
        return list.sort((a, b) => new Date(b.latestNote?.time || 0) - new Date(a.latestNote?.time || 0))
    }, [projects, currentUser, isAdmin, lastSeenVersion])

    const totalUnreadNotesCount = useMemo(() => {
        return stageNotesThreads.reduce((acc, curr) => acc + curr.unreadCount, 0)
    }, [stageNotesThreads])

    // 1. Fetch daftar percakapan
    const fetchConversations = useCallback(async () => {
        try {
            const data = await api.chat.getConversations()
            const rawConvs = data || []
            // Jika chat sedang aktif dibuka, unread-nya adalah 0
            const newConvs = rawConvs.map(c => {
                if (selectedConvRef.current && c.id === selectedConvRef.current.id) {
                    return { ...c, unreadCount: 0 }
                }
                return c
            })
            setConversations(prev => {
                if (prev.length === newConvs.length) {
                    let same = true
                    for (let i = 0; i < prev.length; i++) {
                        if (
                            prev[i].id !== newConvs[i].id ||
                            prev[i].unreadCount !== newConvs[i].unreadCount ||
                            prev[i].lastMessage?.id !== newConvs[i].lastMessage?.id ||
                            prev[i].lastMessage?.content !== newConvs[i].lastMessage?.content
                        ) {
                            same = false
                            break
                        }
                    }
                    if (same) return prev
                }
                return newConvs
            })
            return data
        } catch (err) {
            console.error('Failed to load conversations:', err)
            return []
        }
    }, [])

    useEffect(() => {
        fetchConversations().finally(() => setLoadingConversations(false))
        const interval = setInterval(fetchConversations, 5000)
        return () => clearInterval(interval)
    }, [fetchConversations])

    // 2. Baca URL param (?convId=... atau ?tab=notes&stageId=...) saat searchParams berubah
    useEffect(() => {
        const urlTab = searchParams.get('tab')
        const urlConvId = searchParams.get('convId')
        const urlStageId = searchParams.get('stageId')

        if (urlTab === 'notes') {
            setActiveTab('notes')
            setSelectedConv(null)
            if (urlStageId && stageNotesThreads.length > 0) {
                const found = stageNotesThreads.find(t => t.stageId === urlStageId)
                if (found) setSelectedStageNote(found)
            }
        } else if (urlConvId && conversations.length > 0) {
            const found = conversations.find(c => c.id === urlConvId)
            if (found) {
                setSelectedConv(found)
                setSelectedStageNote(null)
                if (found.type === 'group') setActiveTab('group')
                else if (found.type === 'direct') setActiveTab('direct')
                if (found.unreadCount > 0) {
                    setConversations(prev => prev.map(c => c.id === found.id ? { ...c, unreadCount: 0 } : c))
                }
            }
        }
    }, [searchParams, conversations, stageNotesThreads])

    // Ganti tab navigasi obrolan & catatan
    const handleTabChange = (newTab) => {
        setActiveTab(newTab)
        if (newTab === 'notes') {
            setSelectedConv(null)
            if (selectedStageNote) {
                setSearchParams({ tab: 'notes', stageId: selectedStageNote.stageId })
            } else {
                setSearchParams({ tab: 'notes' })
            }
        } else {
            setSelectedStageNote(null)
            if (selectedConv) {
                setSearchParams({ convId: selectedConv.id })
            } else {
                setSearchParams({})
            }
        }
    }

    // 3. Fetch pesan saat percakapan dipilih (dengan anti-flicker diffing)
    const fetchMessages = useCallback(async (convId, silent = false) => {
        if (!convId) return
        if (!silent) setLoadingMessages(true)
        try {
            const data = await api.chat.getMessages(convId)
            const newMsgs = data || []
            // Percakapan ini sudah dibaca di backend, pastikan unreadCount di frontend segera 0
            setConversations(prev => {
                const target = prev.find(c => c.id === convId)
                if (target && target.unreadCount > 0) {
                    return prev.map(c => c.id === convId ? { ...c, unreadCount: 0 } : c)
                }
                return prev
            })
            setMessages(prev => {
                if (prev.length === newMsgs.length) {
                    let identical = true
                    for (let i = 0; i < prev.length; i++) {
                        if (prev[i].id !== newMsgs[i].id || prev[i].content !== newMsgs[i].content) {
                            identical = false
                            break
                        }
                    }
                    if (identical) return prev // Pertahankan reference state yang sama agar tidak re-render berkedip!
                }
                return newMsgs
            })
        } catch (err) {
            console.error('Failed to load messages:', err)
        } finally {
            if (!silent) setLoadingMessages(false)
        }
    }, [])

    useEffect(() => {
        if (!selectedConv) return
        fetchMessages(selectedConv.id)
        const interval = setInterval(() => {
            fetchMessages(selectedConv.id, true)
        }, 3000)
        return () => clearInterval(interval)
    }, [selectedConv, fetchMessages])

    // Auto-scroll hanya saat ada pesan baru yang masuk
    useEffect(() => {
        if (messages.length > prevMsgCountRef.current) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }
        prevMsgCountRef.current = messages.length
    }, [messages.length])

    // Scroll instan saat ganti percakapan atau tahapan
    useEffect(() => {
        prevMsgCountRef.current = 0
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' })
    }, [selectedConv?.id, selectedStageNote?.stageId])


    // Mainkan notifikasi suara jika unread bertambah
    useEffect(() => {
        const totalUnread = totalUnreadNotesCount + conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0)
        if (totalUnread > prevTotalUnreadRef.current && prevTotalUnreadRef.current !== 0) {
            playPingSound()
        }
        prevTotalUnreadRef.current = totalUnread
    }, [totalUnreadNotesCount, conversations])

    // Pilih tahapan catatan proyek
    const handleSelectStageThread = (thread) => {
        setSelectedStageNote(thread)
        setSelectedConv(null)

        // Tandai sebagai dibaca di localStorage
        const lastSeen = getLastSeenNotes()
        lastSeen[thread.stageId] = new Date().toISOString()
        saveLastSeenNotes(lastSeen)
        setLastSeenVersion(v => v + 1)

        setSearchParams({ tab: 'notes', stageId: thread.stageId })
    }

    // Tandai semua catatan proyek dibaca
    const handleMarkAllNotesRead = () => {
        const now = new Date().toISOString()
        const lastSeen = getLastSeenNotes()
        for (const thread of stageNotesThreads) {
            lastSeen[thread.stageId] = now
        }
        saveLastSeenNotes(lastSeen)
        setLastSeenVersion(v => v + 1)
    }

    // Kirim balasan catatan tahapan proyek langsung dari Chat
    const handleSendStageNote = async (e) => {
        e?.preventDefault()
        if ((!stageNoteInput.trim() && !stageNoteAttachment) || !selectedStageNote || sendingStageNote) return

        const text = stageNoteInput.trim()
        setStageNoteInput('')
        setSendingStageNote(true)

        try {
            let attachmentUrl = null
            if (stageNoteAttachment) {
                attachmentUrl = await new Promise((resolve) => {
                    const reader = new FileReader()
                    reader.onload = () => resolve(reader.result)
                    reader.onerror = () => resolve(null)
                    reader.readAsDataURL(stageNoteAttachment)
                })
            }

            const newNote = {
                from: currentUser?.name || 'Personil',
                text: text || '(gambar terlampir)',
                time: new Date().toISOString(),
                ...(attachmentUrl ? { attachment: attachmentUrl } : {})
            }

            await addStageNote(selectedStageNote.stageId, newNote)
            setStageNoteAttachment(null)

            // Update thread lokal
            setSelectedStageNote(prev => prev ? {
                ...prev,
                notes: [...prev.notes, newNote],
                latestNote: newNote,
            } : null)

            // Pastikan stage ditandai terbaca oleh pengirim
            const lastSeen = getLastSeenNotes()
            lastSeen[selectedStageNote.stageId] = new Date().toISOString()
            saveLastSeenNotes(lastSeen)
            setLastSeenVersion(v => v + 1)
        } catch (err) {
            console.error('Failed to send stage note:', err)
            showAlert({ title: 'Gagal Mengirim Catatan', message: 'Gagal mengirim catatan tahapan: ' + (err.message || 'Error'), type: 'error' })
        } finally {
            setSendingStageNote(false)
        }
    }

    // Kirim pesan
    const handleSendMessage = async (e) => {
        e?.preventDefault()
        if ((!messageInput.trim() && !chatAttachment) || !selectedConv || sending) return

        const content = messageInput.trim() || (chatAttachment ? `[Mengirim ${chatAttachment.type.startsWith('image/') ? 'gambar' : 'file'}]` : '')
        setMessageInput('')
        setSending(true)

        try {
            let attachmentUrl = undefined
            let attachmentType = undefined
            let attachmentName = undefined

            if (chatAttachment) {
                const formData = new FormData()
                formData.append('attachment', chatAttachment)
                const uploadRes = await api.uploads.uploadFile(formData)
                attachmentUrl = uploadRes.url
                attachmentType = chatAttachment.type.startsWith('image/') ? 'image' : (chatAttachment.type === 'application/pdf' ? 'pdf' : 'file')
                attachmentName = chatAttachment.name || 'Pasted Image'
            }

            const newMsg = await api.chat.sendMessage(selectedConv.id, { 
                content, 
                attachmentUrl, 
                attachmentType, 
                attachmentName 
            })
            setMessages(prev => [...prev, newMsg])
            setChatAttachment(null)
            fetchConversations()
        } catch (err) {
            console.error('Failed to send message:', err)
            showAlert({ title: 'Gagal Mengirim Pesan', message: 'Gagal mengirim pesan atau lampiran. Silakan coba kembali.', type: 'error' })
        } finally {
            setSending(false)
        }
    }

    const handleChatPaste = (e) => {
        if (e.clipboardData.files && e.clipboardData.files.length > 0) {
            setChatAttachment(e.clipboardData.files[0])
        }
    }

    // Mulai chat 1-on-1
    const handleStartDirectChat = async (targetUser) => {
        try {
            const res = await api.chat.getOrCreateDirect(targetUser.id)
            setShowNewDirectModal(false)
            setSearchContact('')
            const latest = await fetchConversations()
            const found = latest.find(c => c.id === res.id)
            if (found) {
                setSelectedConv(found)
            } else {
                setSelectedConv({
                    id: res.id,
                    type: 'direct',
                    title: targetUser.name,
                    avatar: targetUser.image,
                    otherUser: targetUser,
                })
            }
            setSelectedStageNote(null)
            setActiveTab('direct')
            setSearchParams({ convId: res.id })
        } catch (err) {
            console.error('Failed to start direct chat:', err)
        }
    }

    // Buat grup baru
    const handleCreateGroup = async () => {
        if (!groupTitle.trim() || creatingGroup) return
        setCreatingGroup(true)
        try {
            const newGrp = await api.chat.createGroup({
                title: groupTitle.trim(),
                participantIds: selectedGroupMembers,
            })
            setShowNewGroupModal(false)
            setGroupTitle('')
            setSelectedGroupMembers([])
            const latest = await fetchConversations()
            const found = latest.find(c => c.id === newGrp.id)
            setSelectedConv(found || {
                id: newGrp.id,
                type: 'group',
                title: newGrp.title,
            })
            setSelectedStageNote(null)
            setActiveTab('group')
            setSearchParams({ convId: newGrp.id })
        } catch (err) {
            console.error('Failed to create group:', err)
        } finally {
            setCreatingGroup(false)
        }
    }

    // Hapus obrolan
    const handleDeleteConversation = async () => {
        if (!convToDelete || deleting) return
        setDeleting(true)
        try {
            await api.chat.deleteConversation(convToDelete.id)
            if (selectedConv?.id === convToDelete.id) {
                setSelectedConv(null)
                setSearchParams({})
            }
            setConvToDelete(null)
            await fetchConversations()
        } catch (err) {
            console.error('Failed to delete conversation:', err)
            showAlert({ title: 'Gagal Menghapus Obrolan', message: err.message || 'Terjadi kesalahan saat menghapus percakapan.', type: 'error' })
        } finally {
            setDeleting(false)
        }
    }

    // Buka modal kontak
    const openDirectUserPicker = async () => {
        setShowNewDirectModal(true)
        setLoadingUsers(true)
        try {
            const list = await api.chat.getUsersForChat()
            setUsersList(list || [])
        } catch (err) {
            console.error(err)
        } finally {
            setLoadingUsers(false)
        }
    }

    // Buka modal grup
    const openGroupCreator = async () => {
        setShowNewGroupModal(true)
        setLoadingUsers(true)
        try {
            const list = await api.chat.getUsersForChat()
            setUsersList(list || [])
        } catch (err) {
            console.error(err)
        } finally {
            setLoadingUsers(false)
        }
    }

    // Filter daftar percakapan
    const filteredConversations = conversations.filter(c => {
        const matchesTab = activeTab === 'all' ? true : c.type === activeTab
        const matchesQuery = searchQuery.trim() === '' ? true : (
            c.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.lastMessage?.content?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        return matchesTab && matchesQuery
    })

    // Filter daftar catatan proyek
    const filteredStageNotes = stageNotesThreads.filter(thread => {
        if (!searchQuery.trim()) return true
        const q = searchQuery.toLowerCase()
        return (
            thread.projectTitle?.toLowerCase().includes(q) ||
            thread.stageLabel?.toLowerCase().includes(q) ||
            thread.notes?.some(n => n.from?.toLowerCase().includes(q) || n.text?.toLowerCase().includes(q))
        )
    })

    const isShowingNotes = activeTab === 'notes'
    const isMobileDetailOpen = Boolean(selectedConv || (isShowingNotes && selectedStageNote))

    return (
        <div className="h-[calc(100vh-64px)] flex bg-slate-100 overflow-hidden font-sans">
            {/* ── PANEL KIRI: DAFTAR OBROLAN & CATATAN PROYEK ── */}
            <div className={`w-full md:w-[380px] lg:w-[420px] bg-white border-r border-slate-200 flex flex-col flex-shrink-0 z-10 ${isMobileDetailOpen ? 'hidden md:flex' : 'flex'}`}>
                {/* Header Kiri */}
                <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between">
                    <div>
                        <h2 className="font-black text-[16px] tracking-tight text-slate-900 leading-tight">Ruang Obrolan</h2>
                        <p className="font-bold text-[11px] text-slate-600 mt-0.5">Komunikasi Tim Penerbitan</p>
                    </div>

                    <div className="flex items-center gap-1">
                        <button
                            onClick={openGroupCreator}
                            className="p-2 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition-colors"
                            title="Buat Grup Baru"
                        >
                            <span className="material-symbols-outlined text-[20px]">group_add</span>
                        </button>
                        <button
                            onClick={openDirectUserPicker}
                            className="p-2 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition-colors"
                            title="Mulai Chat Personal Baru"
                        >
                            <span className="material-symbols-outlined text-[20px]">edit_square</span>
                        </button>
                    </div>
                </div>

                {/* Pencarian */}
                <div className="p-3 border-b border-slate-100 bg-slate-50/70">
                    <div className="flex items-center bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 focus-within:border-[#0b5cd5] focus-within:ring-2 focus-within:ring-[#0b5cd5]/15 transition-all shadow-xs gap-2 group">
                        <svg className="text-slate-400 group-focus-within:text-[#0b5cd5] shrink-0 transition-colors pointer-events-none" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder={isShowingNotes ? "Cari proyek, tahapan, atau isi catatan..." : "Cari obrolan atau pesan..."}
                            className="w-full bg-transparent border-none outline-none p-0 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-0 leading-normal"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
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
                </div>

                {/* Tab Filter: Semua, Grup, Personal, Catatan Proyek */}
                <div className="flex px-3 pt-2 border-b border-slate-100 gap-1 bg-white overflow-x-auto scrollbar-none">
                    <button
                        onClick={() => handleTabChange('all')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'all' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        <span>Semua</span>
                        {unreadAll > 0 && (
                            <span className="bg-red-500 text-white text-[10px] font-black rounded-full px-1.5 py-0.2 min-w-[16px] text-center leading-tight">
                                {unreadAll}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => handleTabChange('group')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'group' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        <span>Grup</span>
                        {unreadGroup > 0 && (
                            <span className="bg-red-500 text-white text-[10px] font-black rounded-full px-1.5 py-0.2 min-w-[16px] text-center leading-tight">
                                {unreadGroup}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => handleTabChange('direct')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'direct' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        <span>Personal</span>
                        {unreadDirect > 0 && (
                            <span className="bg-red-500 text-white text-[10px] font-black rounded-full px-1.5 py-0.2 min-w-[16px] text-center leading-tight">
                                {unreadDirect}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => handleTabChange('notes')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'notes' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        <span>Catatan Proyek</span>
                        {totalUnreadNotesCount > 0 && (
                            <span className="bg-red-500 text-white text-[10px] font-black rounded-full px-1.5 py-0.2 min-w-[16px] text-center leading-tight">
                                {totalUnreadNotesCount}
                            </span>
                        )}
                    </button>
                </div>

                {/* ── KONTEN LIST: TAB CATATAN PROYEK ── */}
                {isShowingNotes ? (
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Subheader info unread & tombol mark all read */}
                        {totalUnreadNotesCount > 0 && (
                            <div className="p-2.5 px-3.5 bg-amber-50/80 border-b border-amber-200/60 flex items-center justify-between text-xs">
                                <span className="font-semibold text-amber-800 flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[16px] text-amber-600">notifications_active</span>
                                    {totalUnreadNotesCount} catatan belum dibaca
                                </span>
                                <button
                                    onClick={handleMarkAllNotesRead}
                                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline"
                                >
                                    Tandai dibaca
                                </button>
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                            {filteredStageNotes.length === 0 ? (
                                <div className="p-8 text-center text-slate-400">
                                    <span className="material-symbols-outlined text-[36px] text-slate-300 mb-2">assignment_turned_in</span>
                                    <p className="font-semibold text-xs text-slate-600">Tidak ada catatan tahapan</p>
                                    <p className="text-[11px] text-slate-400 mt-1">Catatan dan diskusi dari tahapan kerja proyek akan muncul di sini.</p>
                                </div>
                            ) : (
                                filteredStageNotes.map(thread => {
                                    const isSelected = selectedStageNote?.stageId === thread.stageId
                                    const lastTime = formatRelativeTime(thread.latestNote?.time)

                                    return (
                                        <div
                                            key={thread.stageId}
                                            onClick={() => handleSelectStageThread(thread)}
                                            className={`p-3.5 flex items-start gap-3 cursor-pointer transition-all hover:bg-slate-50 group relative ${isSelected ? 'bg-blue-50/70 border-l-4 border-blue-600 !pl-[10px]' : ''}`}
                                        >
                                            {/* Icon / Avatar Tahapan */}
                                            <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center font-bold text-sm shadow-sm ${thread.hasUnread ? 'bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-amber-500/20' : 'bg-slate-100 text-slate-600'}`}>
                                                <span className="material-symbols-outlined text-[20px]">assignment</span>
                                            </div>

                                            {/* Info Card */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-1 mb-0.5">
                                                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded truncate max-w-[170px] border border-blue-200/50">
                                                        📄 {thread.projectTitle}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 flex-shrink-0 font-medium">
                                                        {lastTime}
                                                    </span>
                                                </div>

                                                <h4 className="font-bold text-[13px] text-slate-800 truncate mb-1">
                                                    {thread.stageLabel}
                                                </h4>

                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-[12px] text-slate-500 truncate">
                                                        <span className="font-semibold text-slate-600">{thread.latestNote?.from}: </span>
                                                        {thread.latestNote?.attachment ? '📎 ' : ''}{thread.latestNote?.text || '(lampiran)'}
                                                    </p>

                                                    {thread.unreadCount > 0 && (
                                                        <span className="bg-red-500 text-white text-[10px] font-black rounded-full px-1.5 py-0.5 min-w-[18px] text-center shadow-sm flex-shrink-0">
                                                            {thread.unreadCount}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>
                ) : (
                    /* ── KONTEN LIST: TAB OBROLAN (SEMUA / GRUP / PERSONAL) ── */
                    <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                        {loadingConversations ? (
                            <div className="p-8 text-center text-slate-400 text-xs">Memuat obrolan...</div>
                        ) : filteredConversations.length === 0 ? (
                            <div className="p-8 text-center text-slate-400">
                                <span className="material-symbols-outlined text-[36px] text-slate-300 mb-2">chat_bubble_outline</span>
                                <p className="font-semibold text-xs text-slate-600">Tidak ada percakapan ditemukan</p>
                                <p className="text-[11px] text-slate-400 mt-1">Klik ikon di kanan atas untuk memulai obrolan baru</p>
                            </div>
                        ) : (
                            filteredConversations.map(conv => {
                                const isSelected = selectedConv?.id === conv.id
                                const lastTime = conv.lastMessage
                                    ? new Date(conv.lastMessage.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                                    : ''

                                return (
                                    <div
                                        key={conv.id}
                                        onClick={() => {
                                            setSelectedConv(conv)
                                            setSelectedStageNote(null)
                                            setSearchParams({ convId: conv.id })
                                            setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unreadCount: 0 } : c))
                                        }}
                                        className={`p-3.5 flex items-center gap-3 cursor-pointer transition-all hover:bg-slate-50 group relative ${isSelected ? 'bg-blue-50/70 border-l-4 border-blue-600 !pl-[10px]' : ''}`}
                                    >
                                        {/* Avatar */}
                                        <div className={`w-11 h-11 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-sm shadow-sm ${conv.type === 'group' ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                                            {conv.avatar ? (
                                                <img src={conv.avatar} alt={conv.title} className="w-full h-full rounded-full object-cover" />
                                            ) : conv.type === 'group' ? (
                                                <span className="material-symbols-outlined text-[20px]">groups</span>
                                            ) : (
                                                conv.otherUser?.avatarInitials || conv.title?.slice(0, 2).toUpperCase() || '👤'
                                            )}
                                        </div>

                                        {/* Content Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-0.5">
                                                <h4 className="font-bold text-[13px] text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                                                    {conv.title}
                                                </h4>
                                                <span className="text-[10px] text-slate-400 flex-shrink-0 ml-2 font-medium">
                                                    {lastTime}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-[12px] text-slate-500 truncate">
                                                    {conv.lastMessage ? (
                                                        <>
                                                            {conv.type === 'group' && conv.lastMessage.senderName && (
                                                                <span className="font-semibold text-slate-600">{conv.lastMessage.senderName}: </span>
                                                            )}
                                                            {conv.lastMessage.content}
                                                        </>
                                                    ) : (
                                                        <span className="italic text-slate-400">Belum ada pesan</span>
                                                    )}
                                                </p>

                                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                                    {conv.unreadCount > 0 && (
                                                        <span className="bg-red-500 text-white text-[10px] font-black rounded-full px-1.5 py-0.5 min-w-[18px] text-center shadow-sm">
                                                            {conv.unreadCount}
                                                        </span>
                                                    )}
                                                    {/* Tombol Hapus Obrolan */}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setConvToDelete(conv)
                                                        }}
                                                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-all"
                                                        title="Hapus Obrolan"
                                                    >
                                                        <span className="material-symbols-outlined text-[16px]">delete</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                )}
            </div>

            {/* ── PANEL KANAN: JENDELA DETAIL CATATAN PROYEK / OBROLAN AKTIF ── */}
            {isShowingNotes ? (
                /* Mode Detail Catatan Tahapan Proyek */
                selectedStageNote ? (
                    <div className="flex-1 flex flex-col bg-[#f8fafc] h-full relative">
                        {/* Top Bar Detail Catatan Proyek */}
                        <div className="p-3.5 px-4 bg-white border-b border-slate-200 flex items-center justify-between shadow-sm z-10">
                            <div className="flex items-center gap-3 min-w-0">
                                <button
                                    onClick={() => {
                                        setSelectedStageNote(null)
                                        setSearchParams({ tab: 'notes' })
                                    }}
                                    className="md:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
                                >
                                    <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                                </button>

                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-extrabold text-[15px] text-slate-900 truncate">
                                            {selectedStageNote.stageLabel}
                                        </h3>
                                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/60 truncate max-w-[240px]">
                                            📄 {selectedStageNote.projectTitle}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 truncate">
                                        {selectedStageNote.notes?.length || 0} Catatan / Diskusi Tahapan
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => navigate(`/admin/manajemen/proyek/${selectedStageNote.projectId}?stageId=${selectedStageNote.stageId}`)}
                                    className="btn btn-primary !text-xs !py-1.5 !px-3 shadow-xs flex items-center gap-1.5"
                                    title="Buka Tahapan di Halaman Proyek"
                                >
                                    <span className="hidden sm:inline">Buka di Proyek</span>
                                    <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                                </button>
                            </div>
                        </div>

                        {/* Stage Notes Thread Body */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3">
                            {selectedStageNote.notes.map((note, idx) => {
                                const isMe = note.from === currentUser?.name
                                const timeStr = new Date(note.time).toLocaleString('id-ID', {
                                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                })

                                return (
                                    <div
                                        key={idx}
                                        className={`flex flex-col group ${isMe ? 'items-end' : 'items-start'}`}
                                    >
                                        {!isMe && (
                                            <span className="text-[11px] font-bold text-slate-600 mb-1 ml-2 flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[14px] text-slate-400">person</span>
                                                {note.from}
                                            </span>
                                        )}
                                        <div className="flex items-end gap-1.5 max-w-[85%] md:max-w-[70%]">
                                            <div
                                                className={`p-3.5 rounded-2xl shadow-sm text-[13px] leading-relaxed break-words ${isMe
                                                    ? 'bg-blue-600 text-white rounded-br-none'
                                                    : 'bg-white text-slate-800 rounded-bl-none border border-slate-200/80'
                                                }`}
                                            >
                                                <p className="whitespace-pre-wrap">{note.text}</p>
                                                {note.attachment && (
                                                    <div className="mt-2.5 pt-2 border-t border-slate-200/40">
                                                        <a href={note.attachment} target="_blank" rel="noopener noreferrer">
                                                            <img
                                                                src={note.attachment}
                                                                alt="Lampiran"
                                                                className="max-w-full max-h-60 rounded-lg object-contain bg-black/5 hover:opacity-95 transition-opacity"
                                                            />
                                                        </a>
                                                    </div>
                                                )}
                                                <div className={`text-[10px] text-right mt-1.5 font-medium ${isMe ? 'text-blue-100' : 'text-slate-400'}`}>
                                                    {timeStr}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Quick Reply Bar for Stage Note */}
                        <div className="p-3 md:p-4 bg-white border-t border-slate-200">
                            <form onSubmit={handleSendStageNote} className="flex items-center gap-2 max-w-4xl mx-auto">
                                <label
                                    htmlFor="chatNoteFile"
                                    className={`w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-colors flex-shrink-0 ${stageNoteAttachment ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                    title={stageNoteAttachment ? stageNoteAttachment.name : "Lampirkan Gambar"}
                                >
                                    <span className="material-symbols-outlined text-[20px]">attach_file</span>
                                </label>
                                <input
                                    type="file"
                                    id="chatNoteFile"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={e => setStageNoteAttachment(e.target.files?.[0] || null)}
                                />

                                <input
                                    type="text"
                                    value={stageNoteInput}
                                    onChange={e => setStageNoteInput(e.target.value)}
                                    placeholder={`Balas catatan ${selectedStageNote.stageLabel}...`}
                                    className="!flex-1 !py-2.5 !px-4 !bg-slate-50 !border-slate-300 !rounded-full !text-sm focus:!bg-white focus:!border-blue-500"
                                />
                                <button
                                    type="submit"
                                    disabled={(!stageNoteInput.trim() && !stageNoteAttachment) || sendingStageNote}
                                    className={`w-10 h-10 rounded-full flex items-center justify-center text-white transition-all flex-shrink-0 ${(stageNoteInput.trim() || stageNoteAttachment) ? 'bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/30' : 'bg-slate-300 cursor-not-allowed'}`}
                                >
                                    <span className="material-symbols-outlined text-[20px]">send</span>
                                </button>
                            </form>
                            {stageNoteAttachment && (
                                <div className="mt-2 text-xs text-blue-600 flex items-center gap-1 max-w-4xl mx-auto px-2">
                                    <span>Lampiran: {stageNoteAttachment.name}</span>
                                    <button
                                        type="button"
                                        onClick={() => setStageNoteAttachment(null)}
                                        className="text-red-500 hover:underline ml-2 font-semibold"
                                    >
                                        Hapus
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    /* Empty state bila tab catatan dipilih tapi belum ada tahapan yang diklik */
                    <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-slate-50/50 p-8 text-center">
                        <div className="w-20 h-20 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 mb-4 shadow-sm">
                            <span className="material-symbols-outlined text-[40px]">assignment</span>
                        </div>
                        <h3 className="text-base font-extrabold text-slate-800">Catatan & Diskusi Tahapan Proyek</h3>
                        <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
                            Pilih salah satu tahapan kerja di bilah sebelah kiri untuk melihat instruksi, lampiran, dan riwayat diskusi catatan.
                        </p>
                        {stageNotesThreads.length === 0 && (
                            <p className="text-xs text-slate-400 italic">Belum ada catatan tahapan proyek aktif saat ini.</p>
                        )}
                    </div>
                )
            ) : (
                /* Mode Obrolan Chat Biasa */
                selectedConv ? (
                    <div className="flex-1 flex flex-col bg-[#efeae2]/30 h-full relative">
                        {/* Top Bar Obrolan */}
                        <div className="p-3.5 px-4 bg-white border-b border-slate-200 flex items-center justify-between shadow-sm z-10">
                            <div className="flex items-center gap-3 min-w-0">
                                {/* Mobile Back Button */}
                                <button
                                    onClick={() => {
                                        setSelectedConv(null)
                                        setSearchParams({})
                                    }}
                                    className="md:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
                                >
                                    <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                                </button>

                                <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-sm shadow-sm ${selectedConv.type === 'group' ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                                    {selectedConv.avatar ? (
                                        <img src={selectedConv.avatar} alt={selectedConv.title} className="w-full h-full rounded-full object-cover" />
                                    ) : selectedConv.type === 'group' ? (
                                        <span className="material-symbols-outlined text-[20px]">groups</span>
                                    ) : (
                                        selectedConv.otherUser?.avatarInitials || selectedConv.title?.slice(0, 2).toUpperCase() || '👤'
                                    )}
                                </div>

                                <div className="min-w-0">
                                    <h3 className="font-extrabold text-[14px] text-slate-900 truncate">
                                        {selectedConv.title}
                                    </h3>
                                    <p className="text-[11px] text-slate-500 truncate">
                                        {selectedConv.type === 'group'
                                            ? `${selectedConv.participantCount || 0} Anggota Tim`
                                            : (selectedConv.otherUser?.role || 'Personil')}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setConvToDelete(selectedConv)}
                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Hapus Percakapan Ini"
                                >
                                    <span className="material-symbols-outlined text-[20px]">delete</span>
                                </button>
                            </div>
                        </div>

                        {/* Chat Messages Body */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3">
                            {loadingMessages ? (
                                <div className="text-center py-10 text-slate-400 text-xs">Memuat riwayat obrolan...</div>
                            ) : messages.length === 0 ? (
                                <div className="text-center py-20 text-slate-400">
                                    <span className="material-symbols-outlined text-[48px] text-slate-300 mb-2">waving_hand</span>
                                    <h4 className="font-bold text-slate-700 text-sm">Mulai Percakapan</h4>
                                    <p className="text-xs text-slate-500 mt-1">Kirim pesan pertama ke {selectedConv.title}</p>
                                </div>
                            ) : (
                                messages.map((msg, idx) => {
                                    const isMe = msg.senderId === currentUser?.id
                                    const timeStr = new Date(msg.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })

                                    return (
                                        <div
                                            key={msg.id || idx}
                                            className={`flex flex-col group ${isMe ? 'items-end' : 'items-start'}`}
                                        >
                                            {!isMe && (
                                                <span className="text-[11px] font-bold text-slate-600 mb-1 ml-2">
                                                    {msg.sender?.name || 'Personil'}
                                                </span>
                                            )}
                                            <div className="flex items-end gap-1.5 max-w-[85%] md:max-w-[70%]">
                                                <div
                                                    className={`p-3 rounded-2xl shadow-sm text-[13px] leading-relaxed break-words ${isMe
                                                        ? 'bg-blue-600 text-white rounded-br-none'
                                                        : 'bg-white text-slate-800 rounded-bl-none border border-slate-200/80'
                                                    }`}
                                                >
                                                    {msg.attachmentUrl && (
                                                        <div className="mb-2">
                                                            {msg.attachmentType === 'image' ? (
                                                                <a href={msg.attachmentUrl} target="_blank" rel="noreferrer">
                                                                    <img src={msg.attachmentUrl} alt="attachment" className="max-w-full rounded-lg shadow-sm border border-black/10 max-h-[250px] object-cover" />
                                                                </a>
                                                            ) : (
                                                                <a href={msg.attachmentUrl} target="_blank" rel="noreferrer" className={`flex items-center gap-2 p-2 rounded border ${isMe ? 'bg-blue-700/50 border-blue-500 hover:bg-blue-700' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
                                                                    <span className="material-symbols-outlined text-[18px]">description</span>
                                                                    <span className="font-semibold truncate max-w-[200px] text-xs">{msg.attachmentName || 'Lampiran'}</span>
                                                                </a>
                                                            )}
                                                        </div>
                                                    )}
                                                    <p className="whitespace-pre-wrap">{msg.content}</p>
                                                    <div className={`text-[10px] text-right mt-1 font-medium ${isMe ? 'text-blue-100' : 'text-slate-400'}`}>
                                                        {timeStr}
                                                    </div>
                                                </div>

                                                {/* Delete single message */}
                                                {(isMe || isAdmin) && (
                                                    <button
                                                        onClick={async () => {
                                                            const ok = await showConfirm({
                                                                title: 'Hapus Pesan',
                                                                message: 'Hapus pesan ini dari ruang obrolan?',
                                                                type: 'danger',
                                                                confirmText: 'Ya, Hapus'
                                                            })
                                                            if (ok) {
                                                                await api.chat.deleteMessage(msg.id)
                                                                setMessages(prev => prev.filter(m => m.id !== msg.id))
                                                                showToast({ message: 'Pesan telah dihapus.', type: 'info' })
                                                            }
                                                        }}
                                                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 rounded transition-opacity"
                                                        title="Hapus pesan"
                                                    >
                                                        <span className="material-symbols-outlined text-[14px]">delete</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Chat Input Bar */}
                        <div className="p-3 md:p-4 bg-white border-t border-slate-200 relative">
                            {chatAttachment && (
                                <div className="absolute bottom-full left-0 mb-2 ml-4 p-2 bg-white rounded-lg shadow-lg border border-slate-200 flex items-center gap-3 max-w-sm animate-in fade-in slide-in-from-bottom-2">
                                    <div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center overflow-hidden">
                                        {chatAttachment.type?.startsWith('image/') ? (
                                            <span className="material-symbols-outlined text-blue-500">image</span>
                                        ) : (
                                            <span className="material-symbols-outlined text-red-500">description</span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-slate-700 truncate">{chatAttachment.name || 'Pasted File'}</p>
                                        <p className="text-[10px] text-slate-500">{(chatAttachment.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                    <button type="button" onClick={() => setChatAttachment(null)} className="p-1 text-slate-400 hover:text-red-500 bg-slate-100 hover:bg-red-50 rounded-full">
                                        <span className="material-symbols-outlined text-[16px]">close</span>
                                    </button>
                                </div>
                            )}
                            <form onSubmit={handleSendMessage} className="flex items-center gap-2 max-w-4xl mx-auto">
                                <input
                                    type="file"
                                    ref={chatFileInputRef}
                                    style={{ display: 'none' }}
                                    onChange={e => {
                                        if (e.target.files && e.target.files[0]) {
                                            setChatAttachment(e.target.files[0])
                                        }
                                        e.target.value = null
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => chatFileInputRef.current?.click()}
                                    className="w-10 h-10 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
                                    title="Lampirkan File"
                                >
                                    <span className="material-symbols-outlined text-[20px]">attach_file</span>
                                </button>
                                <input
                                    type="text"
                                    value={messageInput}
                                    onChange={e => setMessageInput(e.target.value)}
                                    onPaste={handleChatPaste}
                                    placeholder={`Ketik pesan ke ${selectedConv.title}...`}
                                    className="!flex-1 !py-2.5 !px-4 !bg-slate-50 !border-slate-300 !rounded-full !text-sm focus:!bg-white focus:!border-blue-500"
                                />
                                <button
                                    type="submit"
                                    disabled={(!messageInput.trim() && !chatAttachment) || sending}
                                    className={`w-10 h-10 rounded-full flex items-center justify-center text-white transition-all ${messageInput.trim() || chatAttachment ? 'bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/30' : 'bg-slate-300 cursor-not-allowed'}`}
                                >
                                    <span className="material-symbols-outlined text-[20px]">send</span>
                                </button>
                            </form>
                        </div>
                    </div>
                ) : (
                    /* Empty state bila belum pilih percakapan */
                    <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-slate-50/50 p-8 text-center">
                        <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mb-4 shadow-sm">
                            <span className="material-symbols-outlined text-[40px]">forum</span>
                        </div>
                        <h3 className="text-base font-extrabold text-slate-800">Ruang Obrolan Terpadu</h3>
                        <p className="text-xs text-slate-500 max-w-sm mt-1 mb-6">
                            Pilih percakapan di bilah kiri atau mulai obrolan baru untuk berdiskusi dengan rekan dan tim kerja.
                        </p>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={openDirectUserPicker}
                                className="btn btn-primary !text-xs !py-2 !px-4 shadow-sm"
                            >
                                <span className="material-symbols-outlined text-[16px]">chat</span>
                                Mulai Chat Personal
                            </button>
                            <button
                                onClick={openGroupCreator}
                                className="btn btn-outline !text-xs !py-2 !px-4 !bg-white"
                            >
                                <span className="material-symbols-outlined text-[16px]">group_add</span>
                                Buat Grup Baru
                            </button>
                        </div>
                    </div>
                )
            )}

            {/* ── MODAL KONTAK PERSONAL BARU ── */}
            {showNewDirectModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[540px] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white text-slate-900">
                            <h4 className="font-extrabold text-sm text-slate-900">Mulai Obrolan Personal</h4>
                            <button onClick={() => setShowNewDirectModal(false)} className="text-slate-400 hover:text-slate-700">✕</button>
                        </div>
                        <div className="p-3 border-b border-slate-100 bg-slate-50">
                            <div className="relative flex items-center group">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#0b5cd5] transition-colors pointer-events-none flex items-center">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="11" cy="11" r="8" />
                                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    value={searchContact}
                                    onChange={e => setSearchContact(e.target.value)}
                                    placeholder="Cari nama rekan kerja..."
                                    className="w-full pl-8 pr-7 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl placeholder:text-slate-400 focus:outline-none focus:border-[#0b5cd5] focus:ring-2 focus:ring-[#0b5cd5]/15 transition-all shadow-xs"
                                />
                                {searchContact && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchContact('')}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100 transition-colors"
                                        title="Hapus pencarian"
                                    >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="18" y1="6" x2="6" y2="18" />
                                            <line x1="6" y1="6" x2="18" y2="18" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                            {loadingUsers ? (
                                <div className="p-6 text-center text-xs text-slate-400">Memuat kontak...</div>
                            ) : (
                                usersList
                                    .filter(u => u.name?.toLowerCase().includes(searchContact.toLowerCase()))
                                    .map(u => (
                                        <div
                                            key={u.id}
                                            onClick={() => handleStartDirectChat(u)}
                                            className="p-3.5 flex items-center gap-3 hover:bg-slate-50 cursor-pointer transition-colors"
                                        >
                                            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                                                {u.avatarInitials || u.name?.slice(0, 2).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-xs text-slate-800 truncate">{u.name}</p>
                                                <p className="text-[11px] text-slate-400 capitalize">{u.role}</p>
                                            </div>
                                            <span className="material-symbols-outlined text-slate-400 text-[18px]">chat</span>
                                        </div>
                                    ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL BUAT GRUP BARU ── */}
            {showNewGroupModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[580px] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white text-slate-900">
                            <h4 className="font-extrabold text-sm text-slate-900">Buat Grup Chat Baru</h4>
                            <button onClick={() => setShowNewGroupModal(false)} className="text-slate-400 hover:text-slate-700">✕</button>
                        </div>
                        <div className="p-4 border-b border-slate-100 space-y-2">
                            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">Nama Grup</label>
                            <input
                                type="text"
                                value={groupTitle}
                                onChange={e => setGroupTitle(e.target.value)}
                                placeholder="Misal: Tim Tata Letak & Desain"
                                className="!w-full !py-2 !px-3 !text-xs !bg-white !border-slate-200 !rounded-xl"
                            />
                        </div>
                        <div className="px-4 py-2 text-[11px] font-bold text-slate-500 bg-slate-50 border-b border-slate-100">
                            PILIH ANGGOTA TIM
                        </div>
                        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 px-2">
                            {usersList.map(u => {
                                const isChecked = selectedGroupMembers.includes(u.id)
                                return (
                                    <label
                                        key={u.id}
                                        className="p-3 flex items-center gap-3 hover:bg-slate-50 cursor-pointer rounded-xl transition-colors"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => {
                                                if (isChecked) {
                                                    setSelectedGroupMembers(prev => prev.filter(id => id !== u.id))
                                                } else {
                                                    setSelectedGroupMembers(prev => [...prev, u.id])
                                                }
                                            }}
                                            className="!w-4 !h-4 !rounded !border-slate-300 !text-blue-600 !p-0 !m-0"
                                            style={{ width: '16px', height: '16px', flexShrink: 0 }}
                                        />
                                        <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[11px]">
                                            {u.avatarInitials || u.name?.slice(0, 2).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-xs text-slate-800 truncate">{u.name}</p>
                                            <p className="text-[10px] text-slate-400 capitalize">{u.role}</p>
                                        </div>
                                    </label>
                                )
                            })}
                        </div>
                        <div className="p-3.5 border-t border-slate-200 flex justify-end gap-2 bg-slate-50">
                            <button
                                onClick={() => setShowNewGroupModal(false)}
                                className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleCreateGroup}
                                disabled={!groupTitle.trim() || creatingGroup}
                                className={`px-4 py-2 text-xs font-bold text-white rounded-lg transition-all ${groupTitle.trim() ? 'bg-blue-600 hover:bg-blue-700 shadow-sm' : 'bg-slate-300 cursor-not-allowed'}`}
                            >
                                {creatingGroup ? 'Membuat...' : 'Buat Grup'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL KONFIRMASI HAPUS OBROLAN ── */}
            {convToDelete && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center animate-in fade-in zoom-in-95 duration-150">
                        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
                            <span className="material-symbols-outlined text-[24px]">delete_forever</span>
                        </div>
                        <h4 className="font-extrabold text-slate-900 text-sm mb-1">Hapus Obrolan?</h4>
                        <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                            Apakah Anda yakin ingin menghapus obrolan <strong>"{convToDelete.title}"</strong>? Semua riwayat pesan di dalamnya akan terhapus.
                        </p>
                        <div className="flex items-center justify-center gap-2">
                            <button
                                onClick={() => setConvToDelete(null)}
                                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleDeleteConversation}
                                disabled={deleting}
                                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm transition-all"
                            >
                                {deleting ? 'Menghapus...' : 'Ya, Hapus'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
