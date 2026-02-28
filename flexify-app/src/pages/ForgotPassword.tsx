import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, ArrowRight } from 'lucide-react';
import { authApi } from '../api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const data = await authApi.forgotPassword(email);
      setMessage(data.message);
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
            <h1 className="auth-logo">Flexify</h1>
            <p className="auth-tagline">Enter your email to receive a password reset link</p>
          </div>
          {error && <div className="auth-message error">{error}</div>}
          {message && <div className="auth-message success">{message}</div>}
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="input-group">
              <label htmlFor="fp-email">Email Address</label>
              <div className="input-with-icon">
                <Mail size={18} className="input-icon" />
                <input id="fp-email" type="email" className="input-field" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
              {loading ? <span className="spinner" /> : <>Send Reset Link <ArrowRight size={18} /></>}
            </button>
          </form>
          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <Link to="/auth" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', color: 'var(--color-primary)', fontWeight: 500 }}>
              <ArrowLeft size={16} /> Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
