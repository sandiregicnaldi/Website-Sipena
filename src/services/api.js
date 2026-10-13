
// In production (Vercel), VITE_BACKEND_URL should be set to your Railway backend URL.
// In local development, it is empty so requests fall back to the Vite proxy via '/api'.
const API_URL = (import.meta.env.VITE_BACKEND_URL || '') + '/api';

async function fetchAPI(endpoint, options = {}) {
    const headers = {
        ...options.headers,
    };
    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
        credentials: 'include', // Important for Better Auth cookie-based auth
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const msg = errorData.message || (typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) || errorData.body?.message || `API Error: ${response.statusText}`;
        throw new Error(msg);
    }

    // Handle empty responses (e.g. 204 No Content)
    const text = await response.text();
    return text ? JSON.parse(text) : {};
}

export const api = {
    // Auth - Better Auth uses specific endpoint names
    auth: {
        signIn: (email, password) => fetchAPI('/auth/sign-in/email', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        }),
        signUp: (data) => fetchAPI('/auth/sign-up/email', {
            method: 'POST',
            body: JSON.stringify(data)
        }),
        signOut: () => fetchAPI('/auth/sign-out', { method: 'POST' }),
        getSession: () => fetchAPI('/auth/get-session'),

        signInWithGoogle: async () => {
            const backendBase = import.meta.env.VITE_BACKEND_URL || '';
            const callbackURL = window.location.origin + '/';
            // Jika callback gagal (misal double-hit), redirect ke home bukan ke login.
            // React di '/' akan mengecek sesi — jika sudah login otomatis tampil Dashboard.
            const errorCallbackURL = window.location.origin + '/';

            console.log('[GoogleLogin] Memulai request ke /api/auth/sign-in/social...');

            let response;
            try {
                response = await fetch(`${backendBase}/api/auth/sign-in/social`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ 
                        provider: 'google', 
                        callbackURL,
                        errorCallbackURL,
                    }),
                });
            } catch (networkErr) {
                console.error('[GoogleLogin] Network error:', networkErr);
                throw new Error('Gagal terhubung ke server autentikasi. Cek koneksi internet.');
            }

            console.log('[GoogleLogin] Response status:', response.status, response.statusText);
            console.log('[GoogleLogin] Response URL (setelah redirect):', response.url);
            console.log('[GoogleLogin] Content-Type:', response.headers.get('content-type'));

            // Jika server me-redirect langsung (bukan JSON), ikuti redirect tersebut
            if (response.redirected) {
                console.log('[GoogleLogin] Server melakukan redirect ke:', response.url);
                window.location.href = response.url;
                return;
            }

            if (!response.ok) {
                const rawText = await response.text().catch(() => '');
                console.error('[GoogleLogin] Response error body:', rawText);
                let errMsg = 'Google sign-in gagal';
                try { errMsg = JSON.parse(rawText).message || errMsg; } catch {}
                throw new Error(errMsg);
            }

            const rawText = await response.text();
            console.log('[GoogleLogin] Response body (raw):', rawText);

            let data = {};
            try { data = JSON.parse(rawText); } catch (e) {
                console.warn('[GoogleLogin] Respons bukan JSON:', rawText);
            }

            // better-auth responds with { url: 'https://accounts.google.com/...' }
            if (data.url) {
                // Paksa Google tampilkan halaman pilih akun (cegah auto-consent silent failure)
                const googleUrl = new URL(data.url);
                googleUrl.searchParams.set('prompt', 'select_account');
                const finalUrl = googleUrl.toString();
                console.log('[GoogleLogin] Redirect ke Google URL (dengan prompt=select_account):', finalUrl.substring(0, 80) + '...');
                window.location.href = finalUrl;
            } else {
                // Tidak ada URL redirect - kemungkinan sesi sudah ada atau respons tidak standar
                console.warn('[GoogleLogin] Tidak ada URL redirect dalam respons:', JSON.stringify(data));
                // Cek apakah user sudah terautentikasi (ada session)
                if (data.user || data.session) {
                    console.log('[GoogleLogin] Sudah terautentikasi, redirect ke home');
                    window.location.replace('/');
                } else {
                    throw new Error(`Server tidak mengembalikan URL Google. Respons: ${rawText.substring(0, 100)}`);
                }
            }
            return data;
        },

        forgotPassword: (email) => fetchAPI('/auth/forget-password', {
            method: 'POST',
            body: JSON.stringify({ email, redirectTo: `${window.location.origin}/reset-password` })
        }),
        resetPassword: (newPassword, token) => fetchAPI('/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify({ newPassword, token })
        }),
    },

    // Projects
    projects: {
        getAll: () => fetchAPI('/projects'),
        getOne: (id) => fetchAPI(`/projects/${id}`),
        create: (data) => fetchAPI('/projects', {
            method: 'POST',
            body: JSON.stringify(data)
        }),
        update: (id, data) => fetchAPI(`/projects/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data)
        }),
        delete: (id) => fetchAPI(`/projects/${id}`, { method: 'DELETE' }),
        getArchived: () => fetchAPI('/projects/archived'),
        getTrash: () => fetchAPI('/projects/trash'),
        restore: (id) => fetchAPI(`/projects/${id}/restore`, { method: 'PATCH' }),
        hardDelete: (id) => fetchAPI(`/projects/${id}/hard-delete`, { method: 'DELETE' }),
        duplicate: (id, title) => fetchAPI(`/projects/${id}/duplicate`, {
            method: 'POST',
            body: JSON.stringify({ title })
        }),
    },

    // Stages
    stages: {
        claim: (id, deadline) => fetchAPI(`/stages/${id}/claim`, {
            method: 'POST',
            body: JSON.stringify({ deadline })
        }),
        create: (data) => fetchAPI('/stages', {
            method: 'POST',
            body: JSON.stringify(data)
        }),
        update: (id, data) => fetchAPI(`/stages/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data)
        }),
        delete: (id) => fetchAPI(`/stages/${id}`, {
            method: 'DELETE'
        }),
        addNote: (id, note) => fetchAPI(`/stages/${id}/notes`, {
            method: 'PATCH',
            body: JSON.stringify(note)
        }),
        requestRevision: (id, reason) => fetchAPI(`/stages/${id}/request-revision`, {
            method: 'PATCH',
            body: JSON.stringify({ reason })
        }),
        updateResultLink: (id, url) => fetchAPI(`/stages/${id}/result-link`, {
            method: 'PATCH',
            body: JSON.stringify({ url })
        }),
        getCandidates: (id) => fetchAPI(`/stages/${id}/candidates`),
        getCandidatesByLabel: (label) => fetchAPI(`/stages/candidates-by-label?label=${encodeURIComponent(label)}`),
        autoAssignPreview: (data) => fetchAPI('/stages/auto-assign-preview', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    },


    // Notifications
    notifications: {
        getAll: () => fetchAPI('/notifications'),
        markRead: (id) => fetchAPI(`/notifications/${id}/read`, { method: 'PATCH' }),
        markAllRead: () => fetchAPI('/notifications/read-all', { method: 'PATCH' }),
    },

    // NIP
    nip: {
        getHistory: () => fetchAPI('/nip/history'),
        generate: (data) => fetchAPI('/nip/generate', {
            method: 'POST',
            body: JSON.stringify(data)
        }),
        deleteOne: (id) => fetchAPI(`/nip/${id}`, { method: 'DELETE' }),
        reset: () => fetchAPI('/nip/reset', { method: 'POST' }),
    },

    // Admin - User Management
    admin: {
        getUsers: () => fetchAPI('/admin/users'),
        updateUser: (id, data) => fetchAPI(`/admin/users/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data)
        }),
        setPassword: (id, password) => fetchAPI(`/admin/users/${id}/set-password`, {
            method: 'POST',
            body: JSON.stringify({ password })
        }),
        deleteUser: (id) => fetchAPI(`/admin/users/${id}`, { method: 'DELETE' }),
        getLogs: ({ type, dateFrom, dateTo } = {}) => {
            const params = new URLSearchParams();
            if (type)     params.set('type',     type);
            if (dateFrom) params.set('dateFrom', dateFrom);
            if (dateTo)   params.set('dateTo',   dateTo);
            return fetchAPI(`/admin/logs?${params.toString()}`);
        },
    },

    // Documents
    documents: {
        getAll: () => fetchAPI('/documents'),
        create: (data) => fetchAPI('/documents', {
            method: 'POST',
            body: JSON.stringify(data)
        }),
        delete: (id) => fetchAPI(`/documents/${id}`, { method: 'DELETE' }),
        getTrash: () => fetchAPI('/documents/trash/all'),
        restore: (id) => fetchAPI(`/documents/${id}/restore`, { method: 'PATCH' }),
        hardDelete: (id) => fetchAPI(`/documents/${id}/hard-delete`, { method: 'DELETE' }),
    },

    // Profile
    profile: {
        get: () => fetchAPI('/profile'),
        update: (data) => fetchAPI('/profile', {
            method: 'PATCH',
            body: JSON.stringify(data),
        }),
        updateSkills: (skills) => fetchAPI('/profile/skills', {
            method: 'PATCH',
            body: JSON.stringify({ skills }),
        }),
        changePassword: (data) => fetchAPI('/profile/change-password', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    },
    telegram: {
        getStatus: () => fetchAPI('/telegram/status'),
        getLinkToken: () => fetchAPI('/telegram/link-token'),
        unlink: () => fetchAPI('/telegram/unlink', { method: 'DELETE' }),
    },
    // Uploads
    uploads: {
        uploadFile: (formData) => fetchAPI('/upload', {
            method: 'POST',
            body: formData
        })
    },

    // Settings (Categories, dll) — DISIMPAN DI DATABASE
    settings: {
        getCategories: () => fetchAPI('/settings/categories'),
        saveCategories: (categories) => fetchAPI('/settings/categories', {
            method: 'PUT',
            body: JSON.stringify(categories),
        }),
        getStageDeadlines: () => fetchAPI('/settings/stage-deadlines'),
        saveStageDeadlines: (data) => fetchAPI('/settings/stage-deadlines', {
            method: 'PUT',
            body: JSON.stringify(data),
        }),
    },


    // Rankings — data produktivitas global dengan filter periode
    rankings: {
        // month=null berarti "Semua Bulan" (dikirim sebagai -1 ke backend)
        getProductivity: (month, year) => {
            const now = new Date()
            const m = (month === null || month === undefined) ? now.getMonth() : month
            const y = year !== undefined && year !== null ? year : now.getFullYear()
            return fetchAPI(`/rankings/productivity?month=${m}&year=${y}`)
        },
        getWorkload: () => fetchAPI('/rankings/workload'),
    },

    // Chat & Messaging
    chat: {
        getConversations: () => fetchAPI('/chat/conversations'),
        getOrCreateDirect: (targetUserId) => fetchAPI('/chat/direct', {
            method: 'POST',
            body: JSON.stringify({ targetUserId })
        }),
        createGroup: (data) => fetchAPI('/chat/groups', {
            method: 'POST',
            body: JSON.stringify(data)
        }),
        getMessages: (conversationId) => fetchAPI(`/chat/conversations/${conversationId}/messages`),
        sendMessage: (conversationId, data) => fetchAPI(`/chat/conversations/${conversationId}/messages`, {
            method: 'POST',
            body: JSON.stringify(data)
        }),
        getUnreadSummary: () => fetchAPI('/chat/unread-summary'),
        getUsersForChat: () => fetchAPI('/chat/users'),
        deleteConversation: (id) => fetchAPI(`/chat/conversations/${id}`, { method: 'DELETE' }),
        deleteMessage: (id) => fetchAPI(`/chat/messages/${id}`, { method: 'DELETE' }),
    },
};

export default api;
