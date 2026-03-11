import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, ArrowLeft } from 'lucide-react';
import './Auth.css';

export default function Auth() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const { user, login, signup } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'staff') navigate('/staff');
      else navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
        // Redirect based on role
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user.role === 'admin') navigate('/admin');
        else if (user.role === 'staff') navigate('/staff');
        else if (user.role === 'owner') navigate('/dashboard');
        else if (user.role === 'verifiedOwner') navigate('/dashboard-verified');
        else navigate('/');
      } else {
        const msg = await signup(name, email, password);
        setSuccessMsg(msg || 'Verification email sent! Check your inbox.');
        setMode('login');
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // Explicitly navigate to the backend to start the OAuth sequence
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    window.location.href = `${API_URL}/api/auth/google`;
  };

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-bg-gradient" />
        <div className="auth-bg-pattern" />
      </div>

      <div className="auth-container">
        <button className="auth-back-btn" onClick={() => navigate('/')}>
          <ArrowLeft size={18} />
          <span>Back to Home</span>
        </button>
        <div className="auth-card animate-scale-in">
          {/* Header */}
          <div className="auth-header">
            <h1 className="auth-logo">Flexify</h1>
            <p className="auth-tagline">
              {mode === 'login' ? 'Welcome back! Sign in to continue.' : 'Create your account to get started.'}
            </p>
          </div>

          {/* Tab switcher */}
          <div className="auth-tabs">
            <button
              className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
              onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}
            >
              Sign In
            </button>
            <button
              className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
              onClick={() => { setMode('signup'); setError(''); setSuccessMsg(''); }}
            >
              Sign Up
            </button>
          </div>

          {/* Messages */}
          {error && <div className="auth-message error">{error}</div>}
          {successMsg && <div className="auth-message success">{successMsg}</div>}

          {/* Form */}
          <form onSubmit={handleSubmit} className="auth-form">
            {mode === 'signup' && (
              <div className="input-group">
                <label htmlFor="auth-name">Full Name</label>
                <div className="input-with-icon">
                  <User size={18} className="input-icon" />
                  <input
                    id="auth-name"
                    type="text"
                    className="input-field"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            <div className="input-group">
              <label htmlFor="auth-email">Email Address</label>
              <div className="input-with-icon">
                <Mail size={18} className="input-icon" />
                <input
                  id="auth-email"
                  type="email"
                  className="input-field"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="auth-password">Password</label>
              <div className="input-with-icon">
                <Lock size={18} className="input-icon" />
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  className="input-field"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {mode === 'login' && (
              <a href="/forgot-password" className="forgot-link">Forgot password?</a>
            )}

            <button type="submit" className="btn btn-primary btn-full btn-lg auth-submit" disabled={loading}>
              {loading ? (
                <span className="spinner" />
              ) : (
                <>
                  {mode === 'login' ? 'Sign In' : 'Create Account'}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="auth-divider">
            <span>or continue with</span>
          </div>

          {/* Google */}
          <button className="google-btn" onClick={handleGoogleLogin}>
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>
        </div>
      </div>
    </div>
  );
}
