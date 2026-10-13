import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { AppProvider } from '../../../context/AppContext';

// Manajemen Penerbitan Workflow Pages
import ManagementDashboard from './Dashboard';
import ManagementProjects from './Projects';
import ManagementProjectNew from './ProjectNew';
import ManagementProjectDetail from './ProjectDetail';
import ManagementNIPGenerator from './NIPGenerator';
import ManagementDocuments from './Documents';
import ManagementChat from './Chat';
import ManagementArchive from './Archive';
import ManagementTrash from './Trash';
import ManagementReports from './Reports';
import ManagementSettings from './Settings';
import UserManagement from './UserManagement';
import ManagementBantuan from './Bantuan';

// Authentic Components from dasbor-penerbitan2 + Innovation Switchers
import ManagementSidebar from './components/ManagementSidebar';
import ManagementHeader from './components/ManagementHeader';
import FloatingNoteAlert from '../../../components/FloatingNoteAlert';

// Full Scoped Stylesheet for Publishing Workflow
import '../../../styles/manajemen.css';

export default function ManagementLayout() {
  const { isAdmin, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Tutup sidebar otomatis saat navigasi di mobile
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Tutup sidebar saat layar diperbesar ke desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (isLoading) {
    return (
      <div className="admin-shell min-h-screen bg-[#F3F4F6] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold text-slate-600">Memuat Ruang Kerja Penerbitan...</span>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="admin-shell min-h-screen bg-[#F3F4F6] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center border border-slate-200">
          <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-3xl">lock</span>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Akses Terbatas</h2>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            Anda tidak memiliki izin untuk mengakses ruang kerja manajemen penerbitan. Halaman ini hanya untuk personil redaksi.
          </p>
          <button
            onClick={() => navigate('/login', { state: { from: location } })}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-md shadow-blue-600/20"
          >
            Kembali ke Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <AppProvider>
      <div className="manajemen-scope min-h-screen bg-surface flex">
        {/* Sidebar Asli dasbor-penerbitan2 + Tombol Inovasi */}
        <ManagementSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Overlay backdrop untuk mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content Area (Layout Asli C:\dev\dasbor-penerbitan2) */}
        <div className="flex-1 flex flex-col min-h-screen min-w-0 md:ml-[240px]">
          <ManagementHeader onMenuClick={() => setSidebarOpen(p => !p)} />
          <main className="flex-1 bg-surface overflow-y-auto">
            <Routes>
              <Route index element={<ManagementDashboard />} />
              <Route path="proyek" element={<ManagementProjects />} />
              <Route path="proyek/baru" element={<ManagementProjectNew />} />
              <Route path="proyek/:id" element={<ManagementProjectDetail />} />
              <Route path="nip" element={<ManagementNIPGenerator />} />
              <Route path="dokumen" element={<ManagementDocuments />} />
              <Route path="chat" element={<ManagementChat />} />
              <Route path="arsip" element={<ManagementArchive />} />
              <Route path="trash" element={<ManagementTrash />} />
              <Route path="laporan" element={<ManagementReports />} />
              <Route path="pengaturan" element={<ManagementSettings />} />
              <Route path="users" element={<UserManagement />} />
              <Route path="bantuan" element={<ManagementBantuan />} />
            </Routes>
          </main>
        </div>

        {/* Floating Note Alert for Publishing Team */}
        <FloatingNoteAlert />
      </div>
    </AppProvider>
  );
}
