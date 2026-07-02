import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface Props {
  children: React.ReactNode;
  roles?: string[];
  excludeRoles?: string[];
  requireCeo?: boolean;
}

export default function ProtectedRoute({ children, roles, excludeRoles, requireCeo }: Props) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="spinner" style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTopColor: '#1890ff' }} />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  if (requireCeo) {
    if (user.role !== 'superadmin' || user.email?.toLowerCase() !== 'admin@rentify.lk') {
      return <Navigate to="/" replace />;
    }
  }

  if (roles && !roles.includes(user.role)) {
    if (user.role === 'staff') return <Navigate to="/staff" replace />;
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    if (user.role === 'superadmin') return <Navigate to="/ceo-master-portal" replace />;
    return <Navigate to="/" replace />;
  }

  if (excludeRoles && excludeRoles.includes(user.role)) {
    if (user.role === 'staff') return <Navigate to="/staff" replace />;
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    if (user.role === 'superadmin') return <Navigate to="/ceo-master-portal" replace />;
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
