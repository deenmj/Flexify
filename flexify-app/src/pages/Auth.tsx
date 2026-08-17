import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, ArrowRight, ArrowLeft, Check, X, Mail } from 'lucide-react';
import { bookingApi } from '../api';
import './Auth.css';
import RentifyLogo from '../components/RentifyLogo';
import SEO from '../components/SEO';

export default function Auth() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [otpMode, setOtpMode] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');

  const { user, login, signup, verifyOtp, resendOtp } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      if (user.role === 'superadmin') navigate('/ceo-master-portal');
      else if (user.role === 'subadmin') navigate('/subadmin');
      else if (user.role === 'owner') navigate('/dashboard?tab=vehicles');
      else navigate('/explore');
    }
  }, [user, navigate]);

  // Real-time password validation
  const passwordChecks = useMemo(() => ({
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
  }), [password]);

  const allChecksPassed = Object.values(passwordChecks).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        
        const pendingBookingStr = localStorage.getItem('pendingBooking');
        if (pendingBookingStr) {
          const pending = JSON.parse(pendingBookingStr);
          const hasKycFields = Boolean(
            user.documents?.idNumber?.trim() && 
            user.documents?.address?.trim() && 
            (user.documents?.phone?.trim() || user.phone?.trim())
          );
          
          if (hasKycFields) {
            localStorage.removeItem('pendingBooking');
            try {
              const resp = await bookingApi.create(
                pending.vehicleId,
                pending.startDate,
                pending.endDate,
                pending.withDriver
              );
              navigate('/dashboard?tab=bookings&newBooking=1', { state: { bookingSuccessData: resp } });
              return;
            } catch (err: any) {
              console.error('Auto-booking failed post-login:', err);
              // Fallback to explore if auto-book fails, letting the user try manually again later
            }
          } else {
            navigate(`/verify?pendingBooking=true`);
            return;
          }
        }

        if (user.role === 'superadmin') navigate('/ceo-master-portal');
        else if (user.role === 'subadmin' || user.role === 'staff' || user.role === 'admin') navigate('/staff');
        else if (user.role === 'owner') navigate('/dashboard?tab=vehicles');
        else navigate('/explore');
      } else {
        if (!allChecksPassed) {
          setError('Please meet all password requirements.');
          setLoading(false);
          return;
        }
        const resp = await signup(name, email, password);
        if (resp.requireOtp) {
          setSignupEmail(resp.email || email);
          setOtpMode(true);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // We already have API_URL from api.ts, but let's import it safely or define it correctly.
    // If VITE_API_URL is already defined with /api, we should not append /api again.
    const BASE_URL = import.meta.env.VITE_API_URL || 'https://api.rentify.lk/api';
    window.location.href = `${BASE_URL}/auth/google`;
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await verifyOtp(signupEmail, otpCode);
      // AuthContext sets user and redirect triggers.
    } catch (err: any) {
      setError(err.message || 'Invalid OTP code');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError('');
    try {
      if (isEditingEmail) {
        if (!newEmail) return setError('Please enter a new email');
        const resp = await resendOtp(signupEmail, newEmail);
        setSignupEmail(resp.email);
        setIsEditingEmail(false);
      } else {
        await resendOtp(signupEmail);
      }
      alert('A new OTP has been sent to your email.');
    } catch (err: any) {
      setError(err.message || 'Failed to resend OTP');
    }
  };

  if (otpMode) {
    return (
      <div className="auth-page">
        <div className="auth-bg">
          <div className="auth-bg-gradient" />
          <div className="auth-bg-pattern" />
        </div>
        <div className="auth-container">
          <div className="auth-card animate-scale-in" style={{ textAlign: 'center' }}>
            <div style={{ 
              width: '70px', height: '70px', borderRadius: '50%', 
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              margin: '0 auto 1.5rem',
              boxShadow: '0 8px 24px rgba(59, 130, 246, 0.3)'
            }}>
              <Mail size={32} color="white" />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem' }}>
              Verify Your Email
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1rem' }}>
              Enter the 4-digit code we sent to:
            </p>

            {isEditingEmail ? (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem' }}>
                <input
                  type="email"
                  className="input-field"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="New email address"
                  style={{ flex: 1 }}
                />
                <button className="btn btn-primary" onClick={handleResendOtp}>Save</button>
                <button className="btn btn-outline" onClick={() => setIsEditingEmail(false)}><X size={16} /></button>
              </div>
            ) : (
              <div style={{ 
                color: '#0f172a', fontWeight: 700, fontSize: '1.05rem', 
                background: '#f1f5f9', padding: '0.75rem 1.25rem', borderRadius: '12px',
                marginBottom: '1.5rem', wordBreak: 'break-all', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
              }}>
                {signupEmail}
                <button 
                  onClick={() => { setNewEmail(signupEmail); setIsEditingEmail(true); }}
                  style={{ color: '#2563eb', fontSize: '0.8rem', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
                >
                  Edit
                </button>
              </div>
            )}

            {error && <div className="auth-message error" style={{ marginBottom: '1rem' }}>{error}</div>}

            <form onSubmit={handleVerifyOtp}>
              <input
                type="text"
                className="input-field"
                placeholder="4-digit code"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '8px', fontWeight: 700, marginBottom: '1.5rem' }}
                required
                maxLength={4}
              />
              <button 
                type="submit" 
                className="btn btn-primary btn-full btn-lg"
                disabled={loading || otpCode.length !== 4}
              >
                {loading ? <span className="spinner" /> : 'Verify Account'}
              </button>
            </form>
            
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '1.5rem' }}>
              Didn't receive it? <button onClick={handleResendOtp} style={{ color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Resend Code</button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <SEO 
        title="Sign In or Create Account — Rentify Sri Lanka"
        description="Join Rentify to rent vehicles or list your car for rent in Sri Lanka. Quick sign up with email or Google."
        canonical="/auth"
      />
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
            <h1 className="auth-logo" style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}><RentifyLogo style={{ height: "48px" }} /> Rentify</h1>
            <p className="auth-tagline">
              {mode === 'login' ? 'Welcome back! Sign in to continue.' : 'Create your account to get started.'}
            </p>
          </div>

          {/* Tab switcher */}
          <div className="auth-tabs">
            <button
              className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
              onClick={() => { setMode('login'); setError(''); }}
            >
              Sign In
            </button>
            <button
              className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
              onClick={() => { setMode('signup'); setError(''); }}
            >
              Sign Up
            </button>
          </div>

          {/* Messages */}
          {error && <div className="auth-message error">{error}</div>}

          {/* Form */}
          <form onSubmit={handleSubmit} className="auth-form">
            {mode === 'signup' && (
              <div className="input-group">
                <label htmlFor="auth-name">Full Name</label>
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
            )}

            <div className="input-group">
              <label htmlFor="auth-email">Email Address</label>
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

            <div className="input-group">
              <label htmlFor="auth-password">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  className="input-field"
                  placeholder={mode === 'signup' ? 'Create a strong password' : 'Enter your password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  style={{ paddingRight: '3rem' }}
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

            {/* Password strength indicator - only during signup */}
            {mode === 'signup' && password.length > 0 && (
              <div className="password-requirements" style={{
                background: '#f8fafc', borderRadius: '12px', padding: '0.875rem 1rem',
                border: '1px solid #e2e8f0', marginTop: '-0.5rem',
                animation: 'fadeIn 0.2s ease'
              }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem' }}>
                  Password Requirements
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.375rem' }}>
                  {[
                    { key: 'length', label: '8+ characters' },
                    { key: 'uppercase', label: 'Uppercase letter' },
                    { key: 'lowercase', label: 'Lowercase letter' },
                    { key: 'number', label: 'A number' },
                  ].map(({ key, label }) => (
                    <div key={key} style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      fontSize: '0.8rem', fontWeight: 500,
                      color: passwordChecks[key as keyof typeof passwordChecks] ? '#16a34a' : '#94a3b8',
                      transition: 'color 0.2s ease'
                    }}>
                      {passwordChecks[key as keyof typeof passwordChecks] 
                        ? <Check size={14} style={{ flexShrink: 0 }} /> 
                        : <X size={14} style={{ flexShrink: 0 }} />
                      }
                      {label}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {mode === 'login' && (
              <a href="/forgot-password" className="forgot-link">Forgot password?</a>
            )}

            <button 
              type="submit" 
              className="btn btn-primary btn-full btn-lg auth-submit" 
              disabled={loading || (mode === 'signup' && password.length > 0 && !allChecksPassed)}
            >
              {loading ? (
                <span className="spinner" />
              ) : (
                <>
                  {mode === 'login' ? 'Sign In' : 'Create Account'}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
            {mode === 'signup' && (
              <p className="auth-legal-notice">
                By creating an account, you agree to our <a href="/privacy">Privacy Policy</a> and <a href="/privacy">Terms of Service</a>.
              </p>
            )}
          </form>

          {/* Divider */}
          <div className="auth-divider">
            <span>or continue with</span>
          </div>

          {/* Google */}
          <button type="button" className="google-btn" onClick={handleGoogleLogin}>
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
