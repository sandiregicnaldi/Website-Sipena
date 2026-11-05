import React from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import BooksPage from './pages/BooksPage';
import BookDetail from './pages/BookDetail';
import AuthorsPage from './pages/AuthorsPage';
import AuthorProfile from './pages/AuthorProfile';
import EventsPage from './pages/EventsPage';
import LoginPage from './pages/LoginPage';
import EventDetail from './pages/EventDetail';
import AuthorDashboard from './pages/AuthorDashboard';
import TentangKami from './pages/TentangKami';
import FAQPage from './pages/FAQPage';
import PanduanPenerbitan from './pages/PanduanPenerbitan';
import VerifyEmailPage from './pages/VerifyEmailPage';
import AdminLayout from './pages/admin/AdminLayout';
import ManagementLayout from './pages/admin/manajemen/ManagementLayout';
import ScrollToTop from './components/ScrollToTop';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { EventProvider } from './context/EventContext';
import { TentangProvider } from './context/TentangContext';
import { PanduanProvider } from './context/PanduanContext';
import { FAQProvider } from './context/FAQContext';
import { DialogProvider } from './context/DialogContext';

// Wrapper: public pages use Header + Footer
const PublicLayout = () => (
  <div className="app-container">
    <Header />
    <ErrorBoundary>
      <Outlet />
    </ErrorBoundary>
    <Footer />
  </div>
);

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <EventProvider>
          <TentangProvider>
            <PanduanProvider>
              <FAQProvider>
                <DialogProvider>
                  <Router>
                  <ScrollToTop />
                  <Routes>
                    {/* ── Dedicated Workspace: Manajemen Penerbitan ── */}
                    <Route path="/admin/manajemen/*" element={<ManagementLayout />} />
                    <Route path="/manajemen/*" element={<Navigate to="/admin/manajemen" replace />} />

                    {/* ── Admin SiPena Portal ── */}
                    <Route path="/admin/*" element={<AdminLayout />} />

                    {/* ── Public routes (Header + Footer via PublicLayout) ── */}
                    <Route element={<PublicLayout />}>
                      <Route path="/"            element={<Home />} />
                      <Route path="/login"       element={<LoginPage />} />
                      <Route path="/verify-email" element={<VerifyEmailPage />} />
                      <Route path="/buku"        element={<BooksPage />} />
                      <Route path="/buku/:id"    element={<BookDetail />} />
                      <Route path="/penulis"     element={<AuthorsPage />} />
                      <Route path="/penulis/:id" element={<AuthorProfile />} />
                      <Route path="/event"       element={<EventsPage />} />
                      <Route path="/event/:id"   element={<EventDetail />} />
                      <Route path="/kegiatan"    element={<Navigate to="/event" replace />} />
                      <Route path="/kegiatan/:id" element={<EventDetail />} />
                      <Route path="/profil-saya" element={<AuthorDashboard />} />
                      <Route path="/dasbor-penulis" element={<Navigate to="/profil-saya" replace />} />
                      <Route path="/dashboard"   element={<Navigate to="/profil-saya" replace />} />
                      <Route path="/penulis/dashboard" element={<Navigate to="/profil-saya" replace />} />
                      <Route path="/tentang"            element={<TentangKami />} />
                      <Route path="/faq"                element={<FAQPage />} />
                      <Route path="/panduan-penerbitan" element={<PanduanPenerbitan />} />
                    </Route>
                  </Routes>
                </Router>
              </DialogProvider>
            </FAQProvider>
          </PanduanProvider>
        </TentangProvider>
      </EventProvider>
    </AppProvider>
  </AuthProvider>
  );
}

export default App;
