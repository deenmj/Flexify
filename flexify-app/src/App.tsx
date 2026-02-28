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
import ListVehicle from './pages/ListVehicle';
import Profile from './pages/Profile';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import About from './pages/About';
import FAQ from './pages/FAQ';
import Contact from './pages/Contact';
import Help from './pages/Help';

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
          <Route path="/" element={<AppLayout><Home /></AppLayout>} />
          <Route path="/explore" element={<AppLayout><Explore /></AppLayout>} />
          <Route path="/about" element={<AppLayout><About /></AppLayout>} />
          <Route path="/faq" element={<AppLayout><FAQ /></AppLayout>} />
          <Route path="/contact" element={<AppLayout><Contact /></AppLayout>} />
          <Route path="/help" element={<AppLayout><Help /></AppLayout>} />

          {/* Protected pages */}
          <Route path="/profile" element={<AppLayout><ProtectedRoute><Profile /></ProtectedRoute></AppLayout>} />
          <Route path="/list-vehicle" element={<AppLayout><ProtectedRoute><ListVehicle /></ProtectedRoute></AppLayout>} />
          <Route path="/dashboard" element={<AppLayout><ProtectedRoute roles={['owner', 'verifiedOwner']}><Dashboard /></ProtectedRoute></AppLayout>} />
          <Route path="/dashboard-verified" element={<AppLayout><ProtectedRoute roles={['verifiedOwner']}><Dashboard /></ProtectedRoute></AppLayout>} />
          <Route path="/admin" element={<AppLayout><ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute></AppLayout>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
