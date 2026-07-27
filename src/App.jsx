import React from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
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
import AdminLayout from './pages/admin/AdminLayout';
import ScrollToTop from './components/ScrollToTop';
import { AuthProvider } from './context/AuthContext';
import { EventProvider } from './context/EventContext';

// Wrapper: public pages use Header + Footer
const PublicLayout = () => (
  <div className="app-container">
    <Header />
    <Outlet />
    <Footer />
  </div>
);

function App() {
  return (
    <AuthProvider>
      <EventProvider>
      <Router>
        <ScrollToTop />
        <Routes>
          {/* ── Admin routes (no Header/Footer) ── */}
          <Route path="/admin/*" element={<AdminLayout />} />

          {/* ── Public routes (Header + Footer via PublicLayout) ── */}
          <Route element={<PublicLayout />}>
            <Route path="/"            element={<Home />} />
            <Route path="/login"       element={<LoginPage />} />
            <Route path="/buku"        element={<BooksPage />} />
            <Route path="/buku/:id"    element={<BookDetail />} />
            <Route path="/penulis"     element={<AuthorsPage />} />
            <Route path="/penulis/:id" element={<AuthorProfile />} />
            <Route path="/event"       element={<EventsPage />} />
            <Route path="/event/:id"   element={<EventDetail />} />
            <Route path="/profil-saya" element={<AuthorDashboard />} />
            <Route path="/tentang"     element={<TentangKami />} />
            <Route path="/faq"         element={<FAQPage />} />
          </Route>
        </Routes>
      </Router>
      </EventProvider>
    </AuthProvider>
  );
}

export default App;
