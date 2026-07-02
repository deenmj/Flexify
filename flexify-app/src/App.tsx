import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import { Spin } from 'antd';
import { useState, useEffect } from 'react';

import BottomNav from './components/BottomNav';
import ScrollRestoration from './components/ScrollRestoration';
import ScrollToTop from './components/ScrollToTop';
import MaintenanceScreen from './components/MaintenanceScreen';

// Eagerly loaded (critical path — needed immediately)
import NotFound from './pages/NotFound';
import Home from './pages/Home';
import Auth from './pages/Auth';
import GoogleSuccess from './pages/GoogleSuccess';
import Explore from './pages/Explore';

// Lazy loaded (deferred — loaded only when user navigates to them)
const VehicleDetail = lazy(() => import('./pages/VehicleDetail'));
const ListVehicle = lazy(() => import('./pages/ListVehicle'));
const Profile = lazy(() => import('./pages/Profile'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const VehicleSalesGallery = lazy(() => import('./pages/VehicleSalesGallery'));
const VehicleSaleDetails = lazy(() => import('./pages/VehicleSaleDetails'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const StaffDashboard = lazy(() => import('./pages/StaffDashboard'));
const SuperAdminDashboard = lazy(() => import('./pages/SuperAdminDashboard'));
const About = lazy(() => import('./pages/About'));
const FAQ = lazy(() => import('./pages/FAQ'));
const Contact = lazy(() => import('./pages/Contact'));
const Help = lazy(() => import('./pages/Help'));
const VerifyUser = lazy(() => import('./pages/VerifyUser'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const Notifications = lazy(() => import('./pages/Notifications'));
const EditVehicle = lazy(() => import('./pages/EditVehicle'));
const ManageVehicle = lazy(() => import('./pages/ManageVehicle'));

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="page-wrapper">
      <Navbar />
      <main className="main-content">{children}</main>
      <Footer />
      <BottomNav />

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

    </div>
  );
}

function NoFooterLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="page-wrapper">
      <Navbar />
      <main className="main-content">{children}</main>
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
  if (user.role === 'superadmin') return <Navigate to="/ceo-master-portal" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  if (user.role === 'staff') return <Navigate to="/staff" replace />;

  return <Navigate to="/explore" replace />;
}

import { settingsApi, type MaintenanceData } from './api';

function MaintenanceWrapper({ children, checking, maintenanceData }: { children: React.ReactNode, checking: boolean, maintenanceData: MaintenanceData | null }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  
  if (checking || loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}><Spin size="large" /></div>;
  }

  // Bypass logic:
  // - If the URL is exactly '/auth', let them through so they can log in.
  // - If the user is staff/admin/superadmin, let them through.
  const isAuthPage = location.pathname === '/auth';
  const isStaff = user && ['staff', 'admin', 'superadmin'].includes(user.role);

  if (maintenanceData?.isMaintenanceMode && !isStaff && !isAuthPage) {
    return <MaintenanceScreen data={maintenanceData} />;
  }

  return <>{children}</>;
}

export default function App() {
  const [maintenanceData, setMaintenanceData] = useState<MaintenanceData | null>(null);
  const [checkingMaintenance, setCheckingMaintenance] = useState(true);

  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        const data = await settingsApi.getMaintenanceMode();
        setMaintenanceData(data);
      } catch (error) {
        console.error("Failed to check maintenance mode:", error);
      } finally {
        setCheckingMaintenance(false);
      }
    };
    checkMaintenance();
  }, []);

  return (
    <BrowserRouter>
      <ScrollRestoration />
      <AuthProvider>
        <SocketProvider>
            <ScrollToTop />
            <MaintenanceWrapper checking={checkingMaintenance} maintenanceData={maintenanceData}>
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
              <Route path="/explore" element={<AppLayout><Explore /></AppLayout>} />
              <Route path="/buy" element={<AppLayout><VehicleSalesGallery /></AppLayout>} />
              <Route path="/buy/:id" element={<AppLayout><VehicleSaleDetails /></AppLayout>} />
              <Route path="/vehicles/:id" element={<AppLayout><VehicleDetail /></AppLayout>} />
              <Route path="/about" element={<AppLayout><About /></AppLayout>} />
              <Route path="/faq" element={<AppLayout><FAQ /></AppLayout>} />
              <Route path="/contact" element={<AppLayout><Contact /></AppLayout>} />
              <Route path="/help" element={<AppLayout><Help /></AppLayout>} />
              <Route path="/privacy" element={<AppLayout><PrivacyPolicy /></AppLayout>} />

              {/* Protected pages */}
              <Route path="/profile" element={<AppLayout><ProtectedRoute><Profile /></ProtectedRoute></AppLayout>} />
              <Route path="/verify" element={<AppLayout><ProtectedRoute><VerifyUser /></ProtectedRoute></AppLayout>} />
              <Route path="/list-vehicle" element={<AppLayout><ProtectedRoute roles={['owner', 'user', 'staff', 'admin']}><ListVehicle /></ProtectedRoute></AppLayout>} />
              <Route path="/dashboard" element={<AppLayout><ProtectedRoute roles={['owner', 'user', 'staff', 'admin']}><Dashboard /></ProtectedRoute></AppLayout>} />
              <Route path="/notifications" element={<AppLayout><ProtectedRoute><Notifications /></ProtectedRoute></AppLayout>} />
              <Route path="/dashboard/vehicle/:id" element={<AppLayout><ProtectedRoute roles={['owner', 'user', 'staff', 'admin']}><ManageVehicle /></ProtectedRoute></AppLayout>} />
              <Route path="/vehicles/edit/:id" element={<AppLayout><ProtectedRoute roles={['owner', 'user', 'staff', 'admin']}><EditVehicle /></ProtectedRoute></AppLayout>} />

              {/* Admin dashboards */}
              <Route path="/ceo-master-portal" element={<NoNavbarLayout><ProtectedRoute roles={['superadmin']} requireCeo={true}><SuperAdminDashboard /></ProtectedRoute></NoNavbarLayout>} />
              <Route path="/admin" element={<NoNavbarLayout><ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute></NoNavbarLayout>} />
              <Route path="/staff" element={<NoNavbarLayout><ProtectedRoute roles={['staff', 'admin', 'superadmin']}><StaffDashboard /></ProtectedRoute></NoNavbarLayout>} />
              
              {/* Catch-all 404 Route */}
              <Route path="*" element={<AppLayout><NotFound /></AppLayout>} />
            </Routes>
          </Suspense>
        </MaintenanceWrapper>
      </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
