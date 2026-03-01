import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { userApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Smartphone, User, MapPin, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import './Auth.css';

export default function VerifyUser() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [fullName, setFullName] = useState(user?.name || '');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState(user?.phone || '');
  
  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);
  const [userPhoto, setUserPhoto] = useState<File | null>(null);

  useEffect(() => {
    if (user?.verified) {
      navigate('/explore');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idFront || !idBack || !userPhoto) {
      setError('Please upload all required photos.');
      return;
    }

    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('fullName', fullName);
    formData.append('address', address);
    formData.append('phone', phone);
    formData.append('idFront', idFront);
    formData.append('idBack', idBack);
    formData.append('userPhoto', userPhoto);

    try {
      const resp = await userApi.submitVerification(formData);
      if (resp.message) {
        setSuccess(true);
        await refreshUser();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit verification request.');
    } finally {
      setLoading(false);
    }
  };

  if (user?.verificationRequest?.status === 'pending') {
    return (
      <div className="auth-page">
        <div className="auth-bg"><div className="auth-bg-gradient" /></div>
        <div className="auth-container">
          <div className="auth-card animate-scale-in" style={{ textAlign: 'center' }}>
            <div style={{ color: 'var(--primary-color)', marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
              <Smartphone size={64} />
            </div>
            <h2>Verification Pending</h2>
            <p className="auth-tagline" style={{ marginTop: '1rem' }}>
              Our staff is currently reviewing your documents. This usually takes 24-48 hours.
            </p>
            <button className="btn btn-primary btn-full btn-lg" style={{ marginTop: '2rem' }} onClick={() => navigate('/explore')}>
              Back to Explore
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (user?.verificationRequest?.status === 'rejected') {
    return (
      <div className="auth-page">
        <div className="auth-bg"><div className="auth-bg-gradient" /></div>
        <div className="auth-container">
          <div className="auth-card animate-scale-in" style={{ textAlign: 'center' }}>
            <div style={{ color: '#ef4444', marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
              <AlertCircle size={64} />
            </div>
            <h2>Verification Rejected</h2>
            <p className="auth-tagline" style={{ marginTop: '1rem' }}>
              Unfortunately, your verification request was rejected by our staff. 
              For any enquiries, please visit our customer services page.
            </p>
            <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Link to="/contact" className="btn btn-primary btn-full btn-lg">
                 Enquiry & Customer Services
              </Link>
              <button className="btn btn-ghost btn-full" onClick={() => navigate('/explore')}>
                Return to Explore
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-bg"><div className="auth-bg-gradient" /></div>
        <div className="auth-container">
          <div className="auth-card animate-scale-in" style={{ textAlign: 'center' }}>
            <div style={{ color: '#10b981', marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
              <CheckCircle size={64} />
            </div>
            <h2>Request Submitted!</h2>
            <p className="auth-tagline" style={{ marginTop: '1rem' }}>
              Your verification documents have been submitted to our staff for review.
            </p>
            <button className="btn btn-primary btn-full btn-lg" style={{ marginTop: '2rem' }} onClick={() => navigate('/explore')}>
              Continue Browsing
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-bg-gradient" />
        <div className="auth-bg-pattern" />
      </div>

      <div className="auth-container" style={{ padding: '2rem 1rem' }}>
        <Link to="/profile" className="premium-back-btn" style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}>
          <ArrowLeft size={18} />
          <span>Back to Profile</span>
        </Link>

        <div className="auth-card animate-scale-in" style={{ maxWidth: '600px' }}>
          <div className="auth-header">
            <div className="auth-logo-icon" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
               <ShieldCheck size={54} color="var(--primary-color)" />
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Account Verification</h2>
            <p className="auth-tagline">Please provide your details to verify your account and start booking vehicles.</p>
          </div>

          {error && <div className="auth-message error">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form" style={{ marginTop: '1.5rem' }}>
            <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>
              <div className="input-group">
                <label><User size={14} style={{ marginRight: 6 }} /> Full Name</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={fullName} 
                  onChange={(e) => setFullName(e.target.value)} 
                  required 
                  placeholder="As per NIC or Driving License"
                />
              </div>

              <div className="input-group">
                <label><MapPin size={14} style={{ marginRight: 6 }} /> Living Address</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={address} 
                  onChange={(e) => setAddress(e.target.value)} 
                  required 
                  placeholder="Current residential address"
                />
              </div>

              <div className="input-group">
                <label><Smartphone size={14} style={{ marginRight: 6 }} /> Phone Number</label>
                <input 
                  type="tel" 
                  className="input-field" 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                  required 
                  placeholder="+94 77 123 4567"
                />
              </div>

              <div className="verification-uploads" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                <div className="upload-box">
                  <span className="upload-label">NIC Front</span>
                  <div className="upload-input-wrap">
                    <input type="file" onChange={(e) => setIdFront(e.target.files?.[0] || null)} required accept="image/*" id="nic-front" />
                    <label htmlFor="nic-front" className={idFront ? 'active' : ''}>
                       {idFront ? idFront.name : 'Upload Front'}
                    </label>
                  </div>
                </div>

                <div className="upload-box">
                  <span className="upload-label">NIC Back</span>
                  <div className="upload-input-wrap">
                    <input type="file" onChange={(e) => setIdBack(e.target.files?.[0] || null)} required accept="image/*" id="nic-back" />
                    <label htmlFor="nic-back" className={idBack ? 'active' : ''}>
                       {idBack ? idBack.name : 'Upload Back'}
                    </label>
                  </div>
                </div>

                <div className="upload-box">
                  <span className="upload-label">Selfie Photo</span>
                  <div className="upload-input-wrap">
                    <input type="file" onChange={(e) => setUserPhoto(e.target.files?.[0] || null)} required accept="image/*" id="user-photo" />
                    <label htmlFor="user-photo" className={userPhoto ? 'active' : ''}>
                       {userPhoto ? userPhoto.name : 'Take Selfie'}
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-lg btn-full auth-submit" disabled={loading} style={{ marginTop: '2rem' }}>
              {loading ? <span className="spinner"></span> : 'Submit Verification Request'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
