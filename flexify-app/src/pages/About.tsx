import { useState, useEffect } from 'react';
import { Shield, Award, TrendingUp, Target, Zap, Clock } from 'lucide-react';
import { vehicleApi, type PublicStats } from '../api';
import './StaticPages.css';

export default function About() {
  const [stats, setStats] = useState<PublicStats | null>(null);

  useEffect(() => {
    vehicleApi.getPublicStats().then(setStats).catch(console.error);
  }, []);

  return (
    <div className="static-page">
      {/* Hero Section */}
      <section className="static-hero" style={{ padding: '6rem 2rem 4rem' }}>
        <div className="container" style={{ textAlign: 'center', maxWidth: '800px' }}>
          <h1 style={{ fontSize: '3rem', marginBottom: '1.5rem', fontWeight: 900, background: 'linear-gradient(135deg, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Redefining Mobility
          </h1>
          <p style={{ fontSize: '1.25rem', lineHeight: 1.8, opacity: 0.9, marginBottom: '2rem' }}>
            Flexify is the world’s premier peer-to-peer vehicle sharing marketplace. 
            We empower individuals to monetize their vehicles while providing renters 
            with unprecedented access to a diverse fleet of cars, trucks, and specialty vehicles.
          </p>
        </div>
      </section>

      <section className="static-content container" style={{ padding: '4rem 1.5rem' }}>
        {/* Key Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem', marginBottom: '5rem', textAlign: 'center' }}>
          <div className="card" style={{ padding: '2rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color-light)', borderRadius: '16px' }}>
            <h2 style={{ fontSize: '2.5rem', color: 'var(--color-primary)', fontWeight: 800, marginBottom: '0.5rem' }}>{stats?.totalActiveVehicles || 0}</h2>
            <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Active Vehicles</p>
          </div>
          <div className="card" style={{ padding: '2rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color-light)', borderRadius: '16px' }}>
            <h2 style={{ fontSize: '2.5rem', color: 'var(--color-primary)', fontWeight: 800, marginBottom: '0.5rem' }}>{stats?.totalVerifiedUsers || 0}</h2>
            <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Verified Users</p>
          </div>
          <div className="card" style={{ padding: '2rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color-light)', borderRadius: '16px' }}>
            <h2 style={{ fontSize: '2.5rem', color: 'var(--color-primary)', fontWeight: 800, marginBottom: '0.5rem' }}>{stats?.totalDistricts || 0}</h2>
            <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Districts in Sri Lanka</p>
          </div>
          <div className="card" style={{ padding: '2rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color-light)', borderRadius: '16px' }}>
            <h2 style={{ fontSize: '2.5rem', color: 'var(--color-primary)', fontWeight: 800, marginBottom: '0.5rem' }}>{stats?.averageRating ? stats.averageRating + '/5' : 'New'}</h2>
            <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Average Rating</p>
          </div>
        </div>

        <div className="about-grid" style={{ gap: '4rem', marginBottom: '5rem' }}>
          <div className="about-text">
            <h2 style={{ fontSize: '2rem', color: '#0f172a' }}>Our Mission & Vision</h2>
            <p style={{ fontSize: '1.1rem', color: '#475569', marginBottom: '1.5rem' }}>
              At Flexify, our mission is to put the world's vehicles to better use. We envision a future where 
              car ownership is shared, efficient, and sustainable. By connecting vehicle owners directly with 
              renters, we're building a community that reduces waste, empowers local economies, and makes travel more accessible.
            </p>
            <p style={{ fontSize: '1.1rem', color: '#475569' }}>
              Whether you need an SUV for a weekend family trip, an exotic car for a special event, or a commercial 
              truck for heavy lifting, Flexify provides the platform, the trust, and the insurance infrastructure 
              to make it happen seamlessly.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
               <div style={{ background: '#eff6ff', padding: '1rem', borderRadius: '12px', color: '#1890ff' }}><Target size={28} /></div>
               <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Strategic Expansion</h3>
                  <p style={{ color: '#64748b', lineHeight: 1.6 }}>Continuously expanding our footprint across emerging markets while maintaining rigorous quality controls.</p>
               </div>
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
               <div style={{ background: '#f0fdf4', padding: '1rem', borderRadius: '12px', color: '#16a34a' }}><TrendingUp size={28} /></div>
               <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Sustainable Growth</h3>
                  <p style={{ color: '#64748b', lineHeight: 1.6 }}>By prioritizing shared usage, we actively contribute to reducing carbon footprints and parking congestions.</p>
               </div>
            </div>
          </div>
        </div>

        {/* Global Standards */}
        <h2 style={{ fontSize: '2rem', color: '#0f172a', textAlign: 'center', marginBottom: '3rem' }}>Enterprise Standards</h2>
        <div className="about-values" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
          <div className="about-value-card">
            <Shield size={32} className="about-value-icon" style={{ color: '#6366f1' }} />
            <h3 style={{ fontSize: '1.25rem', marginTop: '1rem' }}>Bank-Grade Security</h3>
            <p>Every digital transaction and personal record is encrypted using AES-256 standards, ensuring total privacy.</p>
          </div>
          <div className="about-value-card">
            <Award size={32} className="about-value-icon" style={{ color: '#eab308' }} />
            <h3 style={{ fontSize: '1.25rem', marginTop: '1rem' }}>Strict KYC Verification</h3>
            <p>Multi-layered identity verification algorithms prevent fraud and keep the community secure.</p>
          </div>
          <div className="about-value-card">
            <Zap size={32} className="about-value-icon" style={{ color: '#f97316' }} />
            <h3 style={{ fontSize: '1.25rem', marginTop: '1rem' }}>Instant Bookings</h3>
            <p>Skip the rental counter. Approved renters can book and unlock vehicles instantly on-demand.</p>
          </div>
          <div className="about-value-card">
            <Clock size={32} className="about-value-icon" style={{ color: '#06b6d4' }} />
            <h3 style={{ fontSize: '1.25rem', marginTop: '1rem' }}>24/7 Support Operations</h3>
            <p>Our dedicated command center monitors activity and assists users worldwide around the clock.</p>
          </div>
        </div>

      </section>
    </div>
  );
}
