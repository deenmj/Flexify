import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function GoogleSuccess() {
  const [searchParams] = useSearchParams();
  const { setUserFromToken } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      setUserFromToken(token).then(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user.role === 'admin') navigate('/admin');
        else if (user.role === 'staff') navigate('/staff');
        else if (user.role === 'owner') navigate('/dashboard');
        else if (user.role === 'verifiedOwner') navigate('/dashboard-verified');
        else navigate('/');
      });
    } else {
      navigate('/auth');
    }
  }, [searchParams, setUserFromToken, navigate]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTopColor: '#2563eb', margin: '0 auto 1rem' }} />
        <p style={{ color: '#64748b' }}>Completing Google sign-in...</p>
      </div>
    </div>
  );
}
