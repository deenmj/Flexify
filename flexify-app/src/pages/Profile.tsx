import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { userApi } from '../api';
import { Link } from 'react-router-dom';
import { User, Mail, Shield, Calendar, ArrowLeft, Edit2, CheckCircle, Camera, MapPin, Phone, Save, X } from 'lucide-react';
import './Profile.css';

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    address: user?.address || '',
  });

  const [profilePic, setProfilePic] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!user) {
    return (
      <div className="profile-page">
        <div className="container" style={{ textAlign: 'center', padding: '6rem 2rem' }}>
          <h2>Please sign in to view your profile</h2>
        </div>
      </div>
    );
  }

  const handleEditClick = () => {
    setForm({
      name: user.name,
      phone: user.phone || '',
      address: user.address || '',
    });
    setEditing(true);
    setError('');
    setMessage('');
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfilePic(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    const formData = new FormData();
    formData.append('name', form.name);
    formData.append('phone', form.phone);
    formData.append('address', form.address);
    if (profilePic) formData.append('profilePic', profilePic);

    try {
      await userApi.updateProfile(formData);
      await refreshUser();
      setEditing(false);
      setMessage('Profile updated successfully!');
      setPreview(null);
      setProfilePic(null);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-page page-wrapper bg-secondary">
      <div className="container" style={{ paddingTop: '2rem' }}>
        <Link to="/explore" className="premium-back-btn">
          <ArrowLeft size={18} />
          <span>Back to Explore</span>
        </Link>
      </div>

      <div className="profile-hero-section">
        <div className="container" style={{ position: 'relative' }}>
          <button 
            onClick={() => window.history.back()} 
            className="btn btn-ghost" 
            style={{ position: 'absolute', left: '0', top: '-1rem', padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px', color: 'white' }}
          >
            <ArrowLeft size={18} /> Back
          </button>
          <div className="profile-hero-content">
            <div className="profile-photo-wrapper">
              <img
                src={preview || user.profilePic || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.name) + '&background=2563eb&color=fff&size=200'}
                alt={user.name}
                className="profile-hero-avatar"
                onError={(e) => { (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.name) + '&background=2563eb&color=fff&size=200'; }}
              />
              {editing && (
                <button className="photo-edit-overlay" onClick={() => fileRef.current?.click()}>
                   <Camera size={24} />
                   <input type="file" style={{ display: 'none' }} ref={fileRef} accept="image/*" onChange={handlePhotoSelect} />
                </button>
              )}
            </div>
            <div className="hero-text-content">
              <h1 className="profile-hero-name" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {user.name}
                {user.verified && (
                  <div className="pro-badge animate-pulse" title="Verified Professional User">
                    <CheckCircle size={20} fill="#7c3aed" color="white" />
                    <span>PRO</span>
                  </div>
                )}
              </h1>
              <p className="profile-hero-email">{user.email}</p>
              <div className="profile-badges">
                <span className={`badge ${user.role === 'admin' ? 'badge-error' : user.role === 'verifiedOwner' ? 'badge-success' : 'badge-primary'}`}>
                  {user.role === 'verifiedOwner' ? 'Verified Owner' : user.role === 'staff' ? 'Staff' : user.role}
                </span>
                {user.verified && <span className="badge badge-success" style={{ background: 'linear-gradient(45deg, #059669, #10b981)', color: 'white', border: 'none' }}>ID Verified ✓</span>}
              </div>
            </div>
            
            {!editing && (
              <button className="btn btn-primary edit-profile-btn" onClick={handleEditClick}>
                <Edit2 size={16} /> Edit Profile
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="container profile-content">
        {error && <div className="auth-message error" style={{ marginBottom: '2rem' }}>{error}</div>}
        {message && <div className="auth-message success" style={{ marginBottom: '2rem' }}>{message}</div>}

        {!user.verified && (
          <div className="card verify-alert-card animate-pulse" style={{ marginBottom: '2rem', border: '1px solid #7c3aed', background: 'rgba(124, 58, 237, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div className="alert-icon" style={{ background: '#7c3aed', color: 'white', padding: '12px', borderRadius: '12px' }}>
                <Shield size={32} />
              </div>
              <div>
                <h3 style={{ margin: 0, color: '#111827' }}>Identity Verification Required</h3>
                <p style={{ margin: '4px 0 0', color: '#4b5563', fontSize: '14px' }}>Verify your account to unlock booking and listing features.</p>
              </div>
            </div>
            <Link to="/verify" className="btn btn-primary btn-lg" style={{ background: 'var(--color-primary)', color: 'white' }}>
               Verify Now
            </Link>
          </div>
        )}

        <div className="profile-grid">
          <div className="card profile-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
               <h3 className="profile-card-title" style={{ margin: 0 }}>Basic Information</h3>
               {editing && (
                 <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(false); setPreview(null); }}>
                      <X size={14} /> Cancel
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={loading}>
                      {loading ? <span className="spinner"></span> : <><Save size={14} /> Save</>}
                    </button>
                 </div>
               )}
            </div>

            <form className="profile-info-list" onSubmit={handleSave}>
              <div className="profile-info-item">
                <User size={18} className="profile-info-icon" />
                <div style={{ flex: 1 }}>
                  <span className="profile-info-label">Full Name</span>
                  {editing && !user.verified ? (
                    <input className="input-field" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                  ) : (
                    <span className="profile-info-value">{user.name}</span>
                  )}
                  {editing && user.verified && <span style={{ fontSize: '10px', color: '#991b1b', marginTop: '2px', display: 'block' }}>Verified names cannot be changed</span>}
                </div>
              </div>

              <div className="profile-info-item">
                <Mail size={18} className="profile-info-icon" />
                <div>
                  <span className="profile-info-label">Email (Account)</span>
                  <span className="profile-info-value">{user.email}</span>
                </div>
              </div>

              <div className="profile-info-item">
                <Phone size={18} className="profile-info-icon" />
                <div style={{ flex: 1 }}>
                  <span className="profile-info-label">Contact Number</span>
                  {editing ? (
                    <input className="input-field" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                  ) : (
                    <span className="profile-info-value">{user.phone || 'Not provided'}</span>
                  )}
                </div>
              </div>

              <div className="profile-info-item">
                <MapPin size={18} className="profile-info-icon" />
                <div style={{ flex: 1 }}>
                  <span className="profile-info-label">Living Address</span>
                  {editing ? (
                    <input className="input-field" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
                  ) : (
                    <span className="profile-info-value">{user.address || 'Address not listed'}</span>
                  )}
                </div>
              </div>

              <div className="profile-info-item">
                <Shield size={18} className="profile-info-icon" />
                <div>
                  <span className="profile-info-label">Identity Status</span>
                  <span className={`profile-info-value ${user.verified ? 'text-success' : 'text-danger'}`} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {user.verified ? <><CheckCircle size={14} color="#10b981" /> Verified</> : 'Unverified'}
                  </span>
                </div>
              </div>

              <div className="profile-info-item">
                <Calendar size={18} className="profile-info-icon" />
                <div>
                  <span className="profile-info-label">Member Since</span>
                  <span className="profile-info-value">{user.createdAt ? new Date(user.createdAt).getFullYear() : '2024'}</span>
                </div>
              </div>
            </form>
          </div>

          <div className="card profile-card">
            <h3 className="profile-card-title">Quick Actions</h3>
            <div className="profile-actions-list">
              <a href="/dashboard" className="profile-action-item">
                <Shield size={16} /> Go to Dashboard
              </a>
              <a href="/list-vehicle" className="profile-action-item">
                <span>🚗</span> List a Vehicle
              </a>
              {!user.verified && (
                <Link to="/verify" className="profile-action-item" style={{ background: 'var(--color-primary)', color: 'white', borderRadius: '12px' }}>
                  <Shield size={16} color="white" /> 
                  <span style={{ color: 'white' }}>Verify Identity</span>
                </Link>
              )}
              {user.role !== 'admin' && (
                <a href="/contact" className="profile-action-item">
                  <span>📞</span> Contact Support
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
