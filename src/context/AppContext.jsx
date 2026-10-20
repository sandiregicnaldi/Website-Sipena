import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api } from '../services/api'
import { CATEGORIES } from '../data/categories'
import { DDC_CODES } from '../data/ddc'
import { useAuth } from './AuthContext'
// import { TEAM } from '../data/team' // Might need this for team list if not from API

const AppContext = createContext(null)

export function AppProvider({ children }) {
    let authUser = null
    try {
        const auth = useAuth()
        authUser = auth?.user || null
    } catch {
        // Fallback if rendered outside AuthProvider
    }

    // User session
    const [currentUser, setCurrentUser] = useState(() => authUser)
    const [isLoading, setIsLoading] = useState(false)
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light')

    // Data State
    const [projects, setProjects] = useState([])
    const [archivedProjects, setArchivedProjects] = useState([])
    const [notifications, setNotifications] = useState([])
    const [nipHistory, setNipHistory] = useState([]) // Was nipCounters, now history list
    const [documents, setDocuments] = useState([])

    // Master Data — sekarang DISIMPAN DI DATABASE, bukan hanya localStorage
    // localStorage hanya dipakai sebagai cache awal (sebelum API selesai load)
    const [categoriesMap, setCategoriesMap] = useState(() => {
        try {
            // Coba muat dari cache localStorage terlebih dulu agar UI tidak kosong saat load awal
            const saved = localStorage.getItem('app_categories')
            if (!saved) return CATEGORIES
            const parsed = JSON.parse(saved)
            // Jika format lama (<=10 tahap terbitan tanpa ID 'nip'), kembalikan default hardcode
            // Data real akan segera diambil dari database setelah user login
            if (parsed.terbitan?.stages && parsed.terbitan.stages.length <= 10 &&
                !parsed.terbitan.stages.find(s => s.id === 'nip' || s.id === 'dummy' || s.id === 'dummy-final')) {
                return CATEGORIES
            }
            return parsed
        } catch { return CATEGORIES }
    })
    const [ddcList, setDdcList] = useState(() => {
        try {
            const saved = localStorage.getItem('app_ddc')
            return saved ? JSON.parse(saved) : DDC_CODES.map(d => ({ ...d, active: true }))
        } catch { return DDC_CODES.map(d => ({ ...d, active: true })) }
    })

    // Simpan ke localStorage sebagai cache (backup offline)
    useEffect(() => { localStorage.setItem('app_categories', JSON.stringify(categoriesMap)) }, [categoriesMap])
    useEffect(() => { localStorage.setItem('app_ddc', JSON.stringify(ddcList)) }, [ddcList])

    // Enrich project data with category labels
    const enrichProjects = (rawProjects) => {
        return rawProjects.map(p => {
            const catConfig = CATEGORIES[p.category] || {}
            const typeConfig = catConfig.types?.find(t => t.id === p.type)
            return {
                ...p,
                categoryLabel: catConfig.label || p.category || '—',
                categoryIcon: catConfig.icon || '📋',
                typeLabel: typeConfig?.label || p.type || '—',
                // Selalu baca singlePJ dari CATEGORIES terbaru (bukan dari DB)
                // agar proyek lama medsos/keuangan tidak terjebak di perilaku singlePJ lama
                singlePJ: catConfig.singlePJ === true, // hanya true jika eksplisit di CATEGORIES
            }
        })
    }

    // Load initial data
    const refreshData = useCallback(async () => {
        if (!currentUser) return;
        try {
            const [projRes, notifRes, nipRes, docRes, archRes] = await Promise.all([
                api.projects.getAll(),
                api.notifications.getAll(),
                api.nip.getHistory(),
                api.documents.getAll().catch(() => []),
                api.projects.getArchived().catch(() => [])
            ])
            setProjects(enrichProjects(projRes))
            setNotifications(notifRes)
            setNipHistory(nipRes)
            setDocuments(docRes)
            setArchivedProjects(enrichProjects(archRes))
        } catch (e) {
            console.error("Failed to fetch data", e)
        }
    }, [currentUser])

    useEffect(() => {
        if (authUser && (!currentUser || currentUser.id !== authUser.id)) {
            setCurrentUser(authUser)
        }
    }, [authUser, currentUser])

    useEffect(() => {
        // Fallback check session
        api.auth.getSession()
            .then(session => {
                if (session && session.user) {
                    setCurrentUser(prev => prev || session.user)
                }
            })
            .catch(() => { })
            .finally(() => setIsLoading(false))
    }, [])

    useEffect(() => {
        // Load categories dari DATABASE setelah user login
        if (currentUser) {
            api.settings.getCategories()
                .then(dbCategories => {
                    if (dbCategories && typeof dbCategories === 'object') {
                        setCategoriesMap(dbCategories)
                    }
                })
                .catch(e => console.warn('[settings] Gagal load categories dari DB, pakai cache lokal:', e.message))
        }
    }, [currentUser])

    useEffect(() => {
        if (currentUser) {
            refreshData()
            const interval = setInterval(refreshData, 10000)
            return () => clearInterval(interval)
        } else {
            setProjects([])
            setNotifications([])
        }
    }, [currentUser, refreshData])


    // Theme persistence
    useEffect(() => {
        localStorage.setItem('theme', theme)
    }, [theme])

    // Theme
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme)
    }, [theme])

    const toggleTheme = useCallback(() => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light')
    }, [])

    // Auth actions
    const login = useCallback(async (email, password) => {
        try {
            const cleanEmail = (email || '').trim().toLowerCase()
            const signInResult = await api.auth.signIn(cleanEmail, password)
            const session = await api.auth.getSession()
            if (session?.user) {
                const userStatus = session.user.status || 'pending'
                const userRole = session.user.role

                // Admin always gets in
                if (userRole === 'admin') {
                    setCurrentUser(session.user)
                    return true
                }

                // Non-admin: check status
                if (userStatus === 'pending') {
                    await api.auth.signOut() // Sign out pending users
                    return 'pending'
                }
                if (userStatus === 'disabled') {
                    await api.auth.signOut() // Sign out disabled users
                    return 'disabled'
                }

                setCurrentUser(session.user)
                return true
            }
            return false
        } catch (e) {
            console.error(e)
            return false
        }
    }, [])

    const logout = useCallback(async () => {
        try {
            setCurrentUser(null)
            setProjects([])
            setArchivedProjects([])
            setNotifications([])
        } catch (e) { console.error(e) }
    }, [])

    const isSuperAdmin = currentUser?.role === 'admin'
    const isReviewer = currentUser?.role === 'admin' || currentUser?.isReviewer === true || currentUser?.role === 'reviewer'
    const isAdmin = isReviewer


    // Project Actions
    const addProject = useCallback(async (projectData) => {
        try {
            const newProject = await api.projects.create(projectData)
            await refreshData()
            return newProject
        } catch (e) {
            console.error(e)
            throw e
        }
    }, [refreshData])

    const updateProject = useCallback(async (id, updates) => {
        try {
            await api.projects.update(id, updates)
            await refreshData()
        } catch (e) {
            console.error(e)
            throw e
        }
    }, [refreshData])

    const deleteProject = useCallback(async (id) => {
        try {
            await api.projects.delete(id)
            await refreshData()
        } catch (e) {
            console.error(e)
            throw e
        }
    }, [refreshData])

    const updateStage = useCallback(async (stageId, updates) => {
        try {
            await api.stages.update(stageId, updates)
            await refreshData()
        } catch (e) {
            console.error(e)
            throw e
        }
    }, [refreshData])

    const addStageNote = useCallback(async (stageId, note) => {
        try {
            await api.stages.addNote(stageId, note)
            await refreshData()
        } catch (e) {
            console.error(e)
            throw e
        }
    }, [refreshData])

    const createStage = useCallback(async (data) => {
        try {
            await api.stages.create(data)
            await refreshData()
        } catch (e) {
            console.error(e)
            throw e
        }
    }, [refreshData])

    const reorderStages = useCallback(async (projectId, stageIds) => {
        // Optimistic update
        setProjects(prevProjects => prevProjects.map(proj => {
            if (proj.id !== projectId || !proj.stages) return proj;
            const stageMap = new Map(proj.stages.map(s => [s.id, s]));
            const reorderedStages = stageIds
                .map((id, index) => {
                    const st = stageMap.get(id);
                    return st ? { ...st, order: index + 1 } : null;
                })
                .filter(Boolean);

            proj.stages.forEach(s => {
                if (!stageIds.includes(s.id)) {
                    reorderedStages.push(s);
                }
            });

            return {
                ...proj,
                stages: reorderedStages
            };
        }));

        try {
            await api.stages.reorder(projectId, stageIds);
            await refreshData();
        } catch (e) {
            console.error("Failed to reorder stages", e);
            await refreshData();
            throw e;
        }
    }, [refreshData]);

    // Notifications
    const markNotificationRead = useCallback(async (id) => {
        try {
            await api.notifications.markRead(id)
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
        } catch (e) { console.error(e) }
    }, [])

    const markAllNotificationsRead = useCallback(async () => {
        try {
            await api.notifications.markAllRead()
            setNotifications(prev => prev.map(n => ({ ...n, read: true })))
        } catch (e) { console.error(e) }
    }, [])

    // Add notification (Shim, empty as backend handles it)
    const addNotification = useCallback(() => { }, [])


    const unreadCount = notifications.filter(n => !n.read).length

    // NIP - Updated to use API
    const getNextNipNumber = useCallback(async (year) => {
        // Fallback or deprecated
        return 0;
    }, [])

    const saveNipHistory = useCallback(async (data) => {
        try {
            await api.nip.generate(data)
            await refreshData()
        } catch (e) {
            console.error(e)
            throw e
        }
    }, [refreshData])

    // Documents
    const addDocument = useCallback(async (data) => {
        try {
            await api.documents.create(data)
            await refreshData()
        } catch (e) {
            console.error('Failed to add document:', e)
            throw e
        }
    }, [refreshData])

    const deleteDocument = useCallback(async (id) => {
        try {
            await api.documents.delete(id)
            await refreshData()
        } catch (e) {
            console.error('Failed to delete document:', e)
            throw e
        }
    }, [refreshData])

    const value = {
        refreshData,
        currentUser,
        isAdmin,
        isSuperAdmin,
        isReviewer,
        setCurrentUser,
        login,
        logout,
        isLoading,
        theme,
        toggleTheme,
        projects,
        archivedProjects,
        addProject,
        updateProject,
        deleteProject,
        updateStage,
        addStageNote,
        createStage,
        reorderStages,
        notifications,
        unreadCount,
        markNotificationRead,
        markAllNotificationsRead,
        nipHistory,
        saveNipHistory,
        documents,
        // Master Data — shared across all pages
        categoriesMap,
        setCategoriesMap,
        ddcList,
        setDdcList,
        // Deprecated/Shimmed
        getNextNipNumber,
        addNotification,
        addDocument,
        deleteDocument,
        // Stats
        activeProjects: projects.filter(p => !['done', 'archived'].includes(p.status)),
        reviewPending: projects.filter(p => p.stages?.some(s => s.status === 'review')),
        overdueProjects: [],
        completedThisMonth: []
    }

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    )
}

export function useApp() {
    const context = useContext(AppContext)
    if (!context) throw new Error('useApp must be used within AppProvider')
    return context
}
