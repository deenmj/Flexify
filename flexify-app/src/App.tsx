import { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import { Spin } from 'antd';
import { ErrorBoundary } from './components/ErrorBoundary';
import GlobalFeedback from './components/GlobalFeedback';

// Pages
import NotFound from './pages/NotFound';
import Home from './pages/Home';
import Auth from './pages/Auth';
import GoogleSuccess from './pages/GoogleSuccess';
import Explore from './pages/Explore';
import VehicleDetail from './pages/VehicleDetail';
import ListVehicle from './pages/ListVehicle';
import Profile from './pages/Profile';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import SubAdminDashboard from './pages/SubAdminDashboard';
import About from './pages/About';
import FAQ from './pages/FAQ';
import Contact from './pages/Contact';
import Help from './pages/Help';
import VerifyUser from './pages/VerifyUser';
import SubscriptionManagement from './pages/SubscriptionManagement';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Notifications from './pages/Notifications';
import EditVehicle from './pages/EditVehicle';
import ManageVehicle from './pages/ManageVehicle';

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="page-wrapper">
      <Navbar />
      <main className="main-content">{children}</main>
      <Footer />
      <GlobalFeedback />
    </div>
  );
}

function NoFooterLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="page-wrapper">
      <Navbar />
      <main className="main-content">{children}</main>
      <GlobalFeedback />
    </div>
  );
}

function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function NoNavbarLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="page-wrapper">
      <main className="main-content">{children}</main>
      <GlobalFeedback />
    </div>
  );
}

function RootRedirect() {
  const { user, loading } = useAuth();

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <Spin size="large" />
    </div>
  );

  if (!user) return <Navigate to="/explore" replace />;
  if (user.role === 'superadmin') return <Navigate to="/admin" replace />;
  if (user.role === 'subadmin') return <Navigate to="/subadmin" replace />;

  return <Navigate to="/explore" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <ErrorBoundary>
            <Suspense fallback={<div className="page-loading-placeholder" />}>
              <Routes>
              {/* Landing / Redirection */}
              <Route path="/" element={<RootRedirect />} />

              {/* Auth pages (no navbar/footer) */}
              <Route path="/auth" element={<AuthLayout><Auth /></AuthLayout>} />
              <Route path="/google-success" element={<AuthLayout><GoogleSuccess /></AuthLayout>} />
              <Route path="/forgot-password" element={<AuthLayout><ForgotPassword /></AuthLayout>} />
              <Route path="/reset-password" element={<AuthLayout><ResetPassword /></AuthLayout>} />

              {/* Public pages */}
              <Route path="/home" element={<AppLayout><Home /></AppLayout>} />
              <Route path="/explore" element={<NoFooterLayout><Explore /></NoFooterLayout>} />
              <Route path="/vehicles/:id" element={<NoFooterLayout><VehicleDetail /></NoFooterLayout>} />
              <Route path="/about" element={<AppLayout><About /></AppLayout>} />
              <Route path="/faq" element={<AppLayout><FAQ /></AppLayout>} />
              <Route path="/contact" element={<AppLayout><Contact /></AppLayout>} />
              <Route path="/help" element={<AppLayout><Help /></AppLayout>} />
              <Route path="/privacy" element={<AppLayout><PrivacyPolicy /></AppLayout>} />
              <Route path="/subscription" element={<NoFooterLayout><SubscriptionManagement /></NoFooterLayout>} />

              {/* Protected pages */}
              <Route path="/profile" element={<NoFooterLayout><ProtectedRoute><Profile /></ProtectedRoute></NoFooterLayout>} />
              <Route path="/verify" element={<NoFooterLayout><ProtectedRoute><VerifyUser /></ProtectedRoute></NoFooterLayout>} />
              <Route path="/list-vehicle" element={<NoFooterLayout><ProtectedRoute roles={['owner', 'user', 'subadmin', 'superadmin']}><ListVehicle /></ProtectedRoute></NoFooterLayout>} />
              <Route path="/dashboard" element={<NoFooterLayout><ProtectedRoute roles={['owner', 'user', 'subadmin', 'superadmin']}><Dashboard /></ProtectedRoute></NoFooterLayout>} />
              <Route path="/notifications" element={<NoFooterLayout><ProtectedRoute><Notifications /></ProtectedRoute></NoFooterLayout>} />
              <Route path="/dashboard/vehicle/:id" element={<NoFooterLayout><ProtectedRoute roles={['owner', 'user', 'subadmin', 'superadmin']}><ManageVehicle /></ProtectedRoute></NoFooterLayout>} />
              <Route path="/vehicles/edit/:id" element={<NoFooterLayout><ProtectedRoute roles={['owner', 'user', 'subadmin', 'superadmin']}><EditVehicle /></ProtectedRoute></NoFooterLayout>} />

              {/* Admin dashboards */}
              <Route path="/admin" element={<NoNavbarLayout><ProtectedRoute roles={['superadmin']}><AdminDashboard /></ProtectedRoute></NoNavbarLayout>} />
              <Route path="/subadmin" element={<NoNavbarLayout><ProtectedRoute roles={['subadmin', 'superadmin']}><SubAdminDashboard /></ProtectedRoute></NoNavbarLayout>} />
              
              {/* Catch-all 404 Route */}
              <Route path="*" element={<AppLayout><NotFound /></AppLayout>} />
            </Routes>
          </Suspense>
          </ErrorBoundary>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
