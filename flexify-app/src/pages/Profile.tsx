import { useAuth } from '../context/AuthContext';
import { User, Mail, Shield, Calendar, ArrowLeft } from 'lucide-react';
import './Profile.css';

export default function Profile() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="profile-page">
        <div className="container" style={{ textAlign: 'center', padding: '6rem 2rem' }}>
          <h2>Please sign in to view your profile</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-hero">
        <div className="container" style={{ position: 'relative' }}>
          <button 
            onClick={() => window.history.back()} 
            className="btn btn-ghost" 
            style={{ position: 'absolute', left: '0', top: '-1rem', padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px', color: 'white' }}
          >
            <ArrowLeft size={18} /> Back
          </button>
          <div className="profile-hero-content">
            <img
              src={user.profilePic || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.name) + '&background=2563eb&color=fff&size=200'}
              alt={user.name}
              className="profile-hero-avatar"
              onError={(e) => { (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.name) + '&background=2563eb&color=fff&size=200'; }}
            />
            <div>
              <h1 className="profile-hero-name">{user.name}</h1>
              <p className="profile-hero-email">{user.email}</p>
              <div className="profile-badges">
                <span className={`badge ${user.role === 'admin' ? 'badge-error' : user.role === 'verifiedOwner' ? 'badge-success' : 'badge-primary'}`}>
                  {user.role === 'verifiedOwner' ? 'Verified Owner' : user.role}
                </span>
                {user.verified && <span className="badge badge-success">✓ Verified</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container profile-content">
        <div className="profile-grid">
          <div className="card profile-card">
            <h3 className="profile-card-title">Account Information</h3>
            <div className="profile-info-list">
              <div className="profile-info-item">
                <User size={18} className="profile-info-icon" />
                <div>
                  <span className="profile-info-label">Full Name</span>
                  <span className="profile-info-value">{user.name}</span>
                </div>
              </div>
              <div className="profile-info-item">
                <Mail size={18} className="profile-info-icon" />
                <div>
                  <span className="profile-info-label">Email</span>
                  <span className="profile-info-value">{user.email}</span>
                </div>
              </div>
              <div className="profile-info-item">
                <Shield size={18} className="profile-info-icon" />
                <div>
                  <span className="profile-info-label">Role</span>
                  <span className="profile-info-value" style={{ textTransform: 'capitalize' }}>{user.role}</span>
                </div>
              </div>
              <div className="profile-info-item">
                <Calendar size={18} className="profile-info-icon" />
                <div>
                  <span className="profile-info-label">Provider</span>
                  <span className="profile-info-value" style={{ textTransform: 'capitalize' }}>{user.provider || 'Local'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card profile-card">
            <h3 className="profile-card-title">Quick Actions</h3>
            <div className="profile-actions-list">
              <a href="/list-vehicle" className="profile-action-item">
                <span>🚗</span> List a Vehicle
              </a>
              <a href="/explore" className="profile-action-item">
                <span>🔍</span> Explore Vehicles
              </a>
              <a href="/faq" className="profile-action-item">
                <span>❓</span> FAQ
              </a>
              <a href="/contact" className="profile-action-item">
                <span>📞</span> Contact Support
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
