import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';

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

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Auth pages (no navbar/footer) */}
          <Route path="/auth" element={<AuthLayout><Auth /></AuthLayout>} />
          <Route path="/google-success" element={<AuthLayout><GoogleSuccess /></AuthLayout>} />
          <Route path="/forgot-password" element={<AuthLayout><ForgotPassword /></AuthLayout>} />
          <Route path="/reset-password" element={<AuthLayout><ResetPassword /></AuthLayout>} />

          {/* Public pages */}
          <Route path="/" element={<AppLayout><ProtectedRoute excludeRoles={['subadmin']}><Home /></ProtectedRoute></AppLayout>} />
          <Route path="/explore" element={<AppLayout><ProtectedRoute excludeRoles={['subadmin']}><Explore /></ProtectedRoute></AppLayout>} />
          <Route path="/vehicles/:id" element={<AppLayout><ProtectedRoute excludeRoles={['subadmin']}><VehicleDetail /></ProtectedRoute></AppLayout>} />
          <Route path="/about" element={<AppLayout><ProtectedRoute excludeRoles={['subadmin']}><About /></ProtectedRoute></AppLayout>} />
          <Route path="/faq" element={<AppLayout><ProtectedRoute excludeRoles={['subadmin']}><FAQ /></ProtectedRoute></AppLayout>} />
          <Route path="/contact" element={<AppLayout><ProtectedRoute excludeRoles={['subadmin']}><Contact /></ProtectedRoute></AppLayout>} />
          <Route path="/help" element={<AppLayout><ProtectedRoute excludeRoles={['subadmin']}><Help /></ProtectedRoute></AppLayout>} />

          {/* Protected pages */}
          <Route path="/profile" element={<AppLayout><ProtectedRoute excludeRoles={['subadmin']}><Profile /></ProtectedRoute></AppLayout>} />
          <Route path="/verify" element={<AppLayout><ProtectedRoute excludeRoles={['subadmin']}><VerifyUser /></ProtectedRoute></AppLayout>} />
          <Route path="/list-vehicle" element={<AppLayout><ProtectedRoute excludeRoles={['subadmin']}><ListVehicle /></ProtectedRoute></AppLayout>} />
          <Route path="/dashboard" element={<AppLayout><ProtectedRoute excludeRoles={['subadmin']}><Dashboard /></ProtectedRoute></AppLayout>} />

          {/* Admin dashboards */}
          <Route path="/admin" element={<AppLayout><ProtectedRoute roles={['superadmin']}><AdminDashboard /></ProtectedRoute></AppLayout>} />
          <Route path="/subadmin" element={<AppLayout><ProtectedRoute roles={['subadmin', 'superadmin']}><SubAdminDashboard /></ProtectedRoute></AppLayout>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
