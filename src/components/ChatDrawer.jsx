import { useState, useEffect, useRef, useCallback } from 'react'
import { useApp } from '../context/AppContext'
import api from '../services/api'

export default function ChatDrawer({ isOpen, onClose, initialTab = 'group' }) {
    const { currentUser } = useApp()
    const [tab, setTab] = useState(initialTab) // 'group' | 'personal'
    const [conversations, setConversations] = useState([])
    const [selectedConv, setSelectedConv] = useState(null)
    const [messages, setMessages] = useState([])
    const [messageInput, setMessageInput] = useState('')
    const [loadingConversations, setLoadingConversations] = useState(false)
    const [loadingMessages, setLoadingMessages] = useState(false)
    const [sending, setSending] = useState(false)
    
    // Direct chat contact picker
    const [showNewDirectModal, setShowNewDirectModal] = useState(false)
    const [usersList, setUsersList] = useState([])
    const [loadingUsers, setLoadingUsers] = useState(false)
    const [searchUser, setSearchUser] = useState('')

    // Create Group Modal
    const [showNewGroupModal, setShowNewGroupModal] = useState(false)
    const [groupTitle, setGroupTitle] = useState('')
    const [selectedGroupMembers, setSelectedGroupMembers] = useState([])
    const [creatingGroup, setCreatingGroup] = useState(false)

    const messagesEndRef = useRef(null)
    const pollIntervalRef = useRef(null)

    // Sinkronkan tab saat dibuka
    useEffect(() => {
        if (isOpen) {
            setTab(initialTab)
            setSelectedConv(null)
        }
    }, [isOpen, initialTab])

    // Load percakapan
    const fetchConversations = useCallback(async () => {
        try {
            const data = await api.chat.getConversations()
            setConversations(data || [])
            return data
        } catch (err) {
            console.error('Failed to fetch chat conversations:', err)
            return []
        }
    }, [])

    useEffect(() => {
        if (!isOpen) return
        setLoadingConversations(true)
        fetchConversations().finally(() => setLoadingConversations(false))

        // Polling daftar percakapan setiap 6 detik
        const interval = setInterval(fetchConversations, 6000)
        return () => clearInterval(interval)
    }, [isOpen, fetchConversations])

    // Filter percakapan berdasarkan tab aktif
    const filteredConversations = conversations.filter(c => c.type === tab)

    // Load pesan percakapan yang dipilih
    const fetchMessages = useCallback(async (convId, silent = false) => {
        if (!convId) return
        if (!silent) setLoadingMessages(true)
        try {
            const data = await api.chat.getMessages(convId)
            setMessages(data || [])
        } catch (err) {
            console.error('Failed to fetch messages:', err)
        } finally {
            if (!silent) setLoadingMessages(false)
        }
    }, [])

    useEffect(() => {
        if (!selectedConv) return
        fetchMessages(selectedConv.id)

        // Polling pesan setiap 3 detik saat membuka chat aktif
        const interval = setInterval(() => {
            fetchMessages(selectedConv.id, true)
        }, 3000)
        return () => clearInterval(interval)
    }, [selectedConv, fetchMessages])

    // Scroll otomatis ke bawah saat pesan baru masuk
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    // Kirim pesan
    const handleSendMessage = async (e) => {
        e?.preventDefault()
        if (!messageInput.trim() || !selectedConv || sending) return

        const content = messageInput.trim()
        setMessageInput('')
        setSending(true)

        try {
            const newMsg = await api.chat.sendMessage(selectedConv.id, { content })
            setMessages(prev => [...prev, newMsg])
            fetchConversations() // update last message di list
        } catch (err) {
            console.error('Failed to send message:', err)
        } finally {
            setSending(false)
        }
    }

    // Buka obrolan personal dengan user
    const handleStartDirectChat = async (targetUser) => {
        try {
            const res = await api.chat.getOrCreateDirect(targetUser.id)
            setShowNewDirectModal(false)
            await fetchConversations()
            setSelectedConv({
                id: res.id,
                type: 'direct',
                title: targetUser.name,
                avatar: targetUser.image,
                otherUser: targetUser,
            })
        } catch (err) {
            console.error('Gagal memulai direct chat:', err)
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
            await fetchConversations()
            setSelectedConv({
                id: newGrp.id,
                type: 'group',
                title: newGrp.title,
            })
        } catch (err) {
            console.error('Gagal membuat grup:', err)
        } finally {
            setCreatingGroup(false)
        }
    }

    // Buka modal kontak baru
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

    // Buka modal buat grup
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

    if (!isOpen) return null

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            justifyContent: 'flex-end',
            background: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(3px)',
            transition: 'opacity 0.25s',
        }}>
            {/* Panel Drawer Kanan */}
            <div style={{
                width: 'min(460px, 100vw)',
                height: '100%',
                background: '#ffffff',
                boxShadow: '-8px 0 32px rgba(0,0,0,0.2)',
                display: 'flex',
                flexDirection: 'column',
                animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            }}>
                {/* ── HEADER DRAWER ── */}
                <div style={{
                    padding: '1rem 1.25rem',
                    borderBottom: '1px solid #e2e8f0',
                    background: '#0f172a',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {selectedConv && (
                            <button
                                onClick={() => setSelectedConv(null)}
                                style={{
                                    background: 'rgba(255,255,255,0.1)',
                                    border: 'none',
                                    color: '#fff',
                                    borderRadius: '8px',
                                    width: '32px',
                                    height: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                }}
                                title="Kembali ke daftar"
                            >
                                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                            </button>
                        )}
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#fff' }}>
                                {selectedConv ? selectedConv.title : 'Ruang Komunikasi'}
                            </h3>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>
                                {selectedConv 
                                    ? (selectedConv.type === 'group' ? `${selectedConv.participantCount || 0} Anggota` : 'Obrolan Personal')
                                    : 'Group & Personal Chat Tim Penerbitan'}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(255,255,255,0.1)',
                            border: 'none',
                            color: '#94a3b8',
                            borderRadius: '8px',
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                        }}
                    >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                </div>

                {/* ── JIKA DI DALAM PERCAKAPAN (CHAT ROOM) ── */}
                {selectedConv ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: 'calc(100% - 73px)' }}>
                        {/* Messages Area */}
                        <div style={{
                            flex: 1,
                            overflowY: 'auto',
                            padding: '1rem',
                            background: '#f8fafc',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.75rem',
                        }}>
                            {loadingMessages ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                                    Memuat pesan...
                                </div>
                            ) : messages.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8' }}>
                                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>👋</div>
                                    <p style={{ fontWeight: 600, fontSize: '0.9rem', color: '#475569' }}>Belum ada pesan</p>
                                    <p style={{ fontSize: '0.8rem' }}>Mulai percakapan sekarang!</p>
                                </div>
                            ) : (
                                messages.map((msg, idx) => {
                                    const isMe = msg.senderId === currentUser?.id
                                    const timeStr = new Date(msg.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })

                                    return (
                                        <div
                                            key={msg.id || idx}
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: isMe ? 'flex-end' : 'flex-start',
                                            }}
                                        >
                                            {!isMe && (
                                                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginBottom: '2px', marginLeft: '4px' }}>
                                                    {msg.sender?.name || 'Personil'}
                                                </span>
                                            )}
                                            <div style={{
                                                maxWidth: '82%',
                                                padding: '0.65rem 0.9rem',
                                                borderRadius: isMe ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                                                background: isMe ? '#2563eb' : '#ffffff',
                                                color: isMe ? '#ffffff' : '#0f172a',
                                                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                                                border: isMe ? 'none' : '1px solid #e2e8f0',
                                                fontSize: '0.875rem',
                                                lineHeight: 1.4,
                                                wordBreak: 'break-word',
                                            }}>
                                                {msg.content}
                                                <div style={{
                                                    fontSize: '0.65rem',
                                                    color: isMe ? 'rgba(255,255,255,0.7)' : '#94a3b8',
                                                    textAlign: 'right',
                                                    marginTop: '3px',
                                                }}>
                                                    {timeStr}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Message Input Box */}
                        <form
                            onSubmit={handleSendMessage}
                            style={{
                                padding: '0.75rem 1rem',
                                borderTop: '1px solid #e2e8f0',
                                background: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                            }}
                        >
                            <input
                                type="text"
                                value={messageInput}
                                onChange={e => setMessageInput(e.target.value)}
                                placeholder="Ketik pesan..."
                                style={{
                                    flex: 1,
                                    padding: '0.65rem 1rem',
                                    borderRadius: '999px',
                                    border: '1px solid #cbd5e1',
                                    outline: 'none',
                                    fontSize: '0.875rem',
                                }}
                            />
                            <button
                                type="submit"
                                disabled={!messageInput.trim() || sending}
                                style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    background: messageInput.trim() ? '#2563eb' : '#94a3b8',
                                    border: 'none',
                                    color: '#ffffff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: messageInput.trim() ? 'pointer' : 'default',
                                    boxShadow: messageInput.trim() ? '0 2px 8px rgba(37,99,235,0.35)' : 'none',
                                    transition: 'all 0.15s',
                                }}
                            >
                                <span className="material-symbols-outlined text-[20px]">send</span>
                            </button>
                        </form>
                    </div>
                ) : (
                    /* ── JIKA DI DAFTAR PERCAKAPAN (TAB SELECTOR) ── */
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: 'calc(100% - 73px)' }}>
                        {/* Tab Nav: Group vs Personal */}
                        <div style={{
                            display: 'flex',
                            borderBottom: '1px solid #e2e8f0',
                            background: '#f8fafc',
                        }}>
                            <button
                                onClick={() => setTab('group')}
                                style={{
                                    flex: 1,
                                    padding: '0.875rem 0',
                                    border: 'none',
                                    background: 'none',
                                    fontWeight: tab === 'group' ? 800 : 600,
                                    fontSize: '0.875rem',
                                    color: tab === 'group' ? '#2563eb' : '#64748b',
                                    borderBottom: tab === 'group' ? '2.5px solid #2563eb' : '2.5px solid transparent',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.4rem',
                                }}
                            >
                                <span>👥</span> Group Chat
                            </button>
                            <button
                                onClick={() => setTab('personal')}
                                style={{
                                    flex: 1,
                                    padding: '0.875rem 0',
                                    border: 'none',
                                    background: 'none',
                                    fontWeight: tab === 'personal' ? 800 : 600,
                                    fontSize: '0.875rem',
                                    color: tab === 'personal' ? '#2563eb' : '#64748b',
                                    borderBottom: tab === 'personal' ? '2.5px solid #2563eb' : '2.5px solid transparent',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.4rem',
                                }}
                            >
                                <span>👤</span> Personal Chat
                            </button>
                        </div>

                        {/* Tombol aksi (Buat Grup Baru / Obrolan Baru) */}
                        <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
                            {tab === 'group' ? (
                                <button
                                    onClick={openGroupCreator}
                                    style={{
                                        background: '#eff6ff',
                                        color: '#1d4ed8',
                                        border: '1px solid #bfdbfe',
                                        borderRadius: '8px',
                                        padding: '0.35rem 0.75rem',
                                        fontSize: '0.8rem',
                                        fontWeight: 700,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.3rem',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <span className="material-symbols-outlined text-[16px]">group_add</span>
                                    Buat Grup Baru
                                </button>
                            ) : (
                                <button
                                    onClick={openDirectUserPicker}
                                    style={{
                                        background: '#eff6ff',
                                        color: '#1d4ed8',
                                        border: '1px solid #bfdbfe',
                                        borderRadius: '8px',
                                        padding: '0.35rem 0.75rem',
                                        fontSize: '0.8rem',
                                        fontWeight: 700,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.3rem',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <span className="material-symbols-outlined text-[16px]">chat</span>
                                    Mulai Obrolan Baru
                                </button>
                            )}
                        </div>

                        {/* List Percakapan */}
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {loadingConversations ? (
                                <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                                    Memuat daftar obrolan...
                                </div>
                            ) : filteredConversations.length === 0 ? (
                                <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#94a3b8' }}>
                                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
                                        {tab === 'group' ? '👥' : '💬'}
                                    </div>
                                    <p style={{ fontWeight: 700, fontSize: '0.9rem', color: '#475569' }}>
                                        {tab === 'group' ? 'Belum ada grup chat' : 'Belum ada obrolan personal'}
                                    </p>
                                    <p style={{ fontSize: '0.8rem' }}>
                                        {tab === 'group' ? 'Buat grup baru untuk berdiskusi dengan tim' : 'Pilih personil untuk memulai chat'}
                                    </p>
                                </div>
                            ) : (
                                filteredConversations.map(conv => (
                                    <div
                                        key={conv.id}
                                        onClick={() => setSelectedConv(conv)}
                                        style={{
                                            padding: '0.875rem 1.25rem',
                                            borderBottom: '1px solid #f1f5f9',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.875rem',
                                            transition: 'background 0.15s',
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                        onMouseLeave={e => e.currentTarget.style.background = '#ffffff'}
                                    >
                                        {/* Avatar / Icon */}
                                        <div style={{
                                            width: '42px',
                                            height: '42px',
                                            borderRadius: '50%',
                                            background: conv.type === 'group' ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' : '#e2e8f0',
                                            color: conv.type === 'group' ? '#fff' : '#1e293b',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: conv.type === 'group' ? '1.2rem' : '0.85rem',
                                            fontWeight: 800,
                                            flexShrink: 0,
                                        }}>
                                            {conv.type === 'group' ? '👥' : (conv.otherUser?.avatarInitials || conv.title?.slice(0, 2).toUpperCase() || '👤')}
                                        </div>

                                        {/* Info */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                                                <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {conv.title}
                                                </h4>
                                                {conv.lastMessage && (
                                                    <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                                                        {new Date(conv.lastMessage.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {conv.lastMessage ? (
                                                        <>
                                                            {conv.type === 'group' && conv.lastMessage.senderName && (
                                                                <strong style={{ color: '#475569' }}>{conv.lastMessage.senderName}: </strong>
                                                            )}
                                                            {conv.lastMessage.content}
                                                        </>
                                                    ) : 'Belum ada pesan'}
                                                </p>
                                                {conv.unreadCount > 0 && (
                                                    <span style={{
                                                        background: '#ef4444',
                                                        color: '#fff',
                                                        fontSize: '0.65rem',
                                                        fontWeight: 800,
                                                        borderRadius: '999px',
                                                        padding: '2px 6px',
                                                        marginLeft: '6px',
                                                    }}>
                                                        {conv.unreadCount}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Modal: Mulai Obrolan Personal */}
            {showNewDirectModal && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 10001,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1rem',
                }} onClick={() => setShowNewDirectModal(false)}>
                    <div style={{
                        background: '#fff',
                        borderRadius: '16px',
                        width: '100%',
                        maxWidth: '400px',
                        maxHeight: '520px',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>Pilih Personil</h4>
                            <button onClick={() => setShowNewDirectModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>✕</button>
                        </div>
                        <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #f1f5f9' }}>
                            <input
                                type="text"
                                value={searchUser}
                                onChange={e => setSearchUser(e.target.value)}
                                placeholder="Cari nama personil..."
                                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                            />
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {loadingUsers ? (
                                <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Memuat personil...</div>
                            ) : (
                                usersList
                                    .filter(u => u.name?.toLowerCase().includes(searchUser.toLowerCase()))
                                    .map(u => (
                                        <div
                                            key={u.id}
                                            onClick={() => handleStartDirectChat(u)}
                                            style={{
                                                padding: '0.75rem 1.25rem',
                                                borderBottom: '1px solid #f8fafc',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.75rem',
                                                cursor: 'pointer',
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                                            onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                                        >
                                            <div style={{
                                                width: '36px',
                                                height: '36px',
                                                borderRadius: '50%',
                                                background: '#3b82f6',
                                                color: '#fff',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontWeight: 700,
                                                fontSize: '0.8rem',
                                            }}>
                                                {u.avatarInitials || u.name?.slice(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <p style={{ margin: 0, fontWeight: 700, fontSize: '0.875rem' }}>{u.name}</p>
                                                <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>{u.role}</p>
                                            </div>
                                        </div>
                                    ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Buat Grup Baru */}
            {showNewGroupModal && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 10001,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1rem',
                }} onClick={() => setShowNewGroupModal(false)}>
                    <div style={{
                        background: '#fff',
                        borderRadius: '16px',
                        width: '100%',
                        maxWidth: '440px',
                        maxHeight: '560px',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>Buat Grup Chat Baru</h4>
                            <button onClick={() => setShowNewGroupModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>✕</button>
                        </div>
                        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>
                                Nama Grup
                            </label>
                            <input
                                type="text"
                                value={groupTitle}
                                onChange={e => setGroupTitle(e.target.value)}
                                placeholder="Contoh: Tim Tata Letak Naskah"
                                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                            />
                        </div>
                        <div style={{ padding: '0.5rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
                            Pilih Anggota Tim:
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '0 1.25rem' }}>
                            {usersList.map(u => {
                                const isChecked = selectedGroupMembers.includes(u.id)
                                return (
                                    <label
                                        key={u.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.75rem',
                                            padding: '0.5rem 0',
                                            borderBottom: '1px solid #f8fafc',
                                            cursor: 'pointer',
                                        }}
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
                                        />
                                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>{u.name}</span>
                                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: 'auto' }}>{u.role}</span>
                                    </label>
                                )
                            })}
                        </div>
                        <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                            <button
                                onClick={() => setShowNewGroupModal(false)}
                                style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontSize: '0.875rem' }}
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleCreateGroup}
                                disabled={!groupTitle.trim() || creatingGroup}
                                style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: '#2563eb',
                                    color: '#fff',
                                    fontWeight: 700,
                                    cursor: groupTitle.trim() ? 'pointer' : 'default',
                                    fontSize: '0.875rem',
                                }}
                            >
                                {creatingGroup ? 'Membuat...' : 'Buat Grup'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes slideInRight {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }
            `}</style>
        </div>
    )
}
