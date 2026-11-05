import axios from 'axios';
import { createAuthClient } from "better-auth/react";

// Tentukan URL backend berdasarkan environment
// Di browser, gunakan window.location.origin agar otomatis melewati proxy Vite (/api) ke port backend (5001)
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || (typeof window !== 'undefined' ? window.location.origin : "http://localhost:5001");

// Setup Better Auth Client untuk frontend SiPena
export const authClient = createAuthClient({
    baseURL: BACKEND_URL
});

// Setup Axios instance untuk endpoint khusus SiPena (/api/sipena/...)
export const api = axios.create({
    baseURL: `${BACKEND_URL}/api`,
    withCredentials: true, // WAJIB untuk mengirimkan/menerima session cookies (SSO)
});

// Helper functions untuk mempermudah pemanggilan
export const SipenaAPI = {
    // Books
    getBooks: (params) => api.get('/sipena/books', { params }).then(res => res.data),
    getBookById: (id) => api.get(`/sipena/books/${id}`).then(res => res.data),
    getRelatedBooks: (id) => api.get(`/sipena/books/${id}/related`).then(res => res.data),
    rateBook: (id, data) => api.post(`/sipena/books/${id}/rating`, data).then(res => res.data),
    downloadBook: (id) => api.post(`/sipena/books/${id}/download`).then(res => res.data),
    recordBookRead: (id) => api.post(`/sipena/books/${id}/read`).then(res => res.data),
    createBook: (data) => api.post('/sipena/books', data).then(res => res.data),
    updateBook: (id, data) => api.patch(`/sipena/books/${id}`, data).then(res => res.data),
    deleteBook: (id) => api.delete(`/sipena/books/${id}`).then(res => res.data),
    getDashboardStats: (params) => api.get('/sipena/stats', { params }).then(res => res.data),
    getComprehensiveReports: (params) => api.get('/sipena/reports/overview', { params }).then(res => res.data),

    // Uploads
    uploadCover: (file) => {
        const fd = new FormData();
        fd.append('cover', file);
        return api.post('/upload/cover', fd, {
            headers: { 'Content-Type': 'multipart/form-data' }
        }).then(res => res.data);
    },
    uploadDocument: (file) => {
        const fd = new FormData();
        fd.append('document', file);
        return api.post('/upload/document', fd, {
            headers: { 'Content-Type': 'multipart/form-data' }
        }).then(res => res.data);
    },
    uploadCertificateTemplate: (file) => {
        const fd = new FormData();
        fd.append('certificate', file);
        return api.post('/upload/certificate', fd, {
            headers: { 'Content-Type': 'multipart/form-data' }
        }).then(res => res.data);
    },
    uploadAvatar: (file) => {
        const fd = new FormData();
        fd.append('avatar', file);
        return api.post('/upload/avatar', fd, {
            headers: { 'Content-Type': 'multipart/form-data' }
        }).then(res => res.data);
    },

    // Events
    getEvents: () => api.get('/sipena/events').then(res => res.data),
    getEventById: (id) => api.get(`/sipena/events/${id}`).then(res => res.data),
    createEvent: (data) => api.post('/sipena/events', data).then(res => res.data),
    updateEvent: (id, data) => api.patch(`/sipena/events/${id}`, data).then(res => res.data),
    deleteEvent: (id) => api.delete(`/sipena/events/${id}`).then(res => res.data),
    claimEventCertificate: (id, data) => api.post(`/sipena/events/${id}/claim-certificate`, data).then(res => res.data),
    getMyCertificates: () => api.get('/sipena/events/my-certificates').then(res => res.data),
    getEventParticipants: (id) => api.get(`/sipena/events/${id}/participants`).then(res => res.data),
    toggleEventClaim: (id, data) => api.patch(`/sipena/events/${id}/toggle-claim`, data).then(res => res.data),

    // Manuscripts
    getManuscripts: () => api.get('/sipena/manuscripts').then(res => res.data),
    createManuscript: (data) => api.post('/sipena/manuscripts', data).then(res => res.data),
    updateManuscriptStatus: (id, data) => api.patch(`/sipena/manuscripts/${id}/status`, data).then(res => res.data),

    // Web Content (Settings)
    getContent: (key) => api.get(`/sipena/content/${key}`).then(res => res.data?.data),
    saveContent: (key, value) => api.put(`/sipena/content/${key}`, { value }).then(res => res.data),

    // Authors
    getAuthors: (params) => api.get('/sipena/authors', { params }).then(res => res.data),
    getAuthorById: (id) => api.get(`/sipena/authors/${id}`).then(res => res.data),
    submitAuthorRequest: (data) => api.post('/sipena/author-request', data).then(res => res.data),
    updateAuthorProfile: (data) => api.patch('/sipena/author-profile', data).then(res => res.data),
};
