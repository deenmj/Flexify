import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { userApi } from '../api';
import { Link } from 'react-router-dom';
import { User, Mail, Shield, Calendar, ArrowLeft, Edit2, CheckCircle, Camera, MapPin, Phone, Save, X, FileText, Eye, Upload, RefreshCw, LogOut } from 'lucide-react';
import { getImageUrl } from '../api';
import imageCompression from 'browser-image-compression';
import './Profile.css';

export default function Profile() {
  const { user, refreshUser, logout } = useAuth();
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

  // Document editing state
  const [editingDocs, setEditingDocs] = useState(false);
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState('');
  const [docMessage, setDocMessage] = useState('');
  const [docFiles, setDocFiles] = useState<{ license?: File; selfie?: File }>({});
  const [docPreviews, setDocPreviews] = useState<{ license?: string; selfie?: string }>({});
  const [docAddress, setDocAddress] = useState(user?.documents?.address || '');

  const [docType, setDocType] = useState<'rent' | 'sales'>('rent');

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

  // ---- Document editing handlers ----
  const handleDocEditClick = () => {
    setDocAddress(user.documents?.address || '');
    setDocFiles({});
    setDocPreviews({});
    setDocError('');
    setDocMessage('');
    setEditingDocs(true);
  };

  const handleDocCancel = () => {
    // Clean up preview URLs
    Object.values(docPreviews).forEach(url => { if (url) URL.revokeObjectURL(url); });
    setDocFiles({});
    setDocPreviews({});
    setEditingDocs(false);
    setDocError('');
  };

  const handleDocFileChange = async (field: 'license' | 'selfie', file: File | null) => {
    if (!file) return;
    try {
      const options = { maxSizeMB: 0.5, maxWidthOrHeight: 1200, useWebWorker: true };
      const compressed = await imageCompression(file, options);
      setDocFiles(prev => ({ ...prev, [field]: compressed }));
      if (docPreviews[field]) URL.revokeObjectURL(docPreviews[field]!);
      setDocPreviews(prev => ({ ...prev, [field]: URL.createObjectURL(compressed) }));
    } catch {
      setDocFiles(prev => ({ ...prev, [field]: file }));
      setDocPreviews(prev => ({ ...prev, [field]: URL.createObjectURL(file) }));
    }
  };

  const handleDocSave = async () => {
    // Check at least one file or address change
    const hasFileChanges = Object.keys(docFiles).length > 0;
    const hasAddressChange = docAddress.trim() !== (user.documents?.address || '').trim();

    if (!hasFileChanges && !hasAddressChange) {
      setDocError('Please upload at least one document or update the address.');
      return;
    }

    setDocLoading(true);
    setDocError('');
    setDocMessage('');

    const formData = new FormData();
    if (docFiles.license) formData.append('license', docFiles.license);
    if (docFiles.selfie) formData.append('selfie', docFiles.selfie);
    if (hasAddressChange) formData.append('address', docAddress.trim());
    formData.append('type', docType);

    try {
      await userApi.updateDocuments(formData);
      await refreshUser();
      setEditingDocs(false);
      setDocFiles({});
      setDocPreviews({});
      setDocMessage('Documents updated successfully! Our team will review the changes.');
    } catch (err: any) {
      setDocError(err.message || 'Failed to update documents');
    } finally {
      setDocLoading(false);
    }
  };

  const docFields: { key: 'license' | 'selfie'; label: string; icon: string }[] = [
    { key: 'license', label: 'Driving License', icon: '🚗' },
    { key: 'selfie', label: 'Profile Photo', icon: '📸' },
  ];

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
              </h1>
              <p className="profile-hero-email">{user.email}</p>
              <div className="profile-badges">
                <span className={`badge ${user.role === 'superadmin' ? 'badge-error' : user.role === 'owner' && user.ownerType === 'VERIFIED' ? 'badge-success' : 'badge-primary'}`}>
                  {user.role === 'owner' ? (user.ownerType === 'VERIFIED' ? 'Verified Owner' : 'Owner') : user.role === 'subadmin' ? 'Sub Admin' : user.role === 'superadmin' ? 'Super Admin' : 'User'}
                </span>
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
                  {editing ? (
                    <input className="input-field" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                  ) : (
                    <span className="profile-info-value">{user.name}</span>
                  )}
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
                    <input className="input-field" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
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
                    <input className="input-field" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
                  ) : (
                    <span className="profile-info-value">{user.address || 'Address not listed'}</span>
                  )}
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
              <Link to="/dashboard" className="profile-action-item">
                <Shield size={16} /> Go to Dashboard
              </Link>
              <Link to="/list-vehicle" className="profile-action-item">
                <span>🚗</span> List a Vehicle
              </Link>


              <Link to="/about" className="profile-action-item">
                <span>ℹ️</span> About Rentify
              </Link>
              {user.role !== 'superadmin' && (
                <Link to="/contact" className="profile-action-item">
                  <span>📞</span> Contact Support
                </Link>
              )}
              <button
                onClick={() => { if (window.confirm('Are you sure you want to logout?')) { logout(); } }}
                className="profile-action-item logout-action"
                style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)', cursor: 'pointer', width: '100%', textAlign: 'left', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}
              >
                <LogOut size={16} color="#ef4444" /> Logout from Account
              </button>
            </div>
          </div>


        </div>
      </div>
    </div>
  );
}
