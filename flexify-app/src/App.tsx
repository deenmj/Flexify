import { Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingScreen from './components/LoadingScreen';

// Pages
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

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="page-wrapper">
      <Navbar />
      <main className="main-content">{children}</main>
      <Footer />
    </div>
  );
}

function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

import { SocketProvider } from './context/SocketContext';

import { Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

function RootRedirect() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen message="Preparing your dashboard..." />;

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
          <Suspense fallback={<LoadingScreen message="Loading page..." />}>
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
              <Route path="/explore" element={<AppLayout><Explore /></AppLayout>} />
              <Route path="/vehicles/:id" element={<AppLayout><VehicleDetail /></AppLayout>} />
              <Route path="/about" element={<AppLayout><About /></AppLayout>} />
              <Route path="/faq" element={<AppLayout><FAQ /></AppLayout>} />
              <Route path="/contact" element={<AppLayout><Contact /></AppLayout>} />
              <Route path="/help" element={<AppLayout><Help /></AppLayout>} />
              <Route path="/privacy" element={<AppLayout><PrivacyPolicy /></AppLayout>} />

              {/* Protected pages */}
              <Route path="/profile" element={<AppLayout><ProtectedRoute><Profile /></ProtectedRoute></AppLayout>} />
              <Route path="/verify" element={<AppLayout><ProtectedRoute><VerifyUser /></ProtectedRoute></AppLayout>} />
              <Route path="/list-vehicle" element={<AppLayout><ProtectedRoute><ListVehicle /></ProtectedRoute></AppLayout>} />
              <Route path="/dashboard" element={<AppLayout><ProtectedRoute><Dashboard /></ProtectedRoute></AppLayout>} />
              <Route path="/notifications" element={<AppLayout><ProtectedRoute><Notifications /></ProtectedRoute></AppLayout>} />
              <Route path="/subscription" element={<AppLayout><ProtectedRoute roles={['owner']}><SubscriptionManagement /></ProtectedRoute></AppLayout>} />

              {/* Admin dashboards */}
              <Route path="/admin" element={<AppLayout><ProtectedRoute roles={['superadmin']}><AdminDashboard /></ProtectedRoute></AppLayout>} />
              <Route path="/subadmin" element={<AppLayout><ProtectedRoute roles={['subadmin', 'superadmin']}><SubAdminDashboard /></ProtectedRoute></AppLayout>} />
            </Routes>
          </Suspense>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
