import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface Props {
  children: React.ReactNode;
  roles?: string[];
}

export default function ProtectedRoute({ children, roles }: Props) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="spinner" style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTopColor: '#2563eb' }} />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
