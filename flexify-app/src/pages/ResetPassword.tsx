import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, ArrowRight } from 'lucide-react';
import { authApi } from '../api';
import RentifyLogo from '../components/RentifyLogo';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setLoading(true);
    setError('');
    try {
      const data = await authApi.resetPassword(token, password);
      setMessage(data.message);
      setTimeout(() => navigate('/auth'), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg"><div className="auth-bg-gradient" /><div className="auth-bg-pattern" /></div>
      <div className="auth-container">
        <div className="auth-card animate-scale-in">
          <div className="auth-header">
            <h1 className="auth-logo" style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}><RentifyLogo style={{ height: "38px" }} /> Rentify</h1>
            <p className="auth-tagline">Enter your new password</p>
          </div>
          {error && <div className="auth-message error">{error}</div>}
          {message && <div className="auth-message success">{message}</div>}
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="input-group">
              <label>New Password</label>
              <div className="input-with-icon">
                <Lock size={18} className="input-icon" />
                <input type="password" className="input-field" placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              </div>
            </div>
            <div className="input-group">
              <label>Confirm Password</label>
              <div className="input-with-icon">
                <Lock size={18} className="input-icon" />
                <input type="password" className="input-field" placeholder="Confirm password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={6} />
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
              {loading ? <span className="spinner" /> : <>Reset Password <ArrowRight size={18} /></>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
