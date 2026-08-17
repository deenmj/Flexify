import { useState, useEffect } from 'react';
import { Shield, Award, TrendingUp, Target, Zap, Clock } from 'lucide-react';
import { vehicleApi, settingsApi, getImageUrl, type PublicStats, type Founder } from '../api';
import SEO from '../components/SEO';
import './StaticPages.css';

export default function About() {
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [founders, setFounders] = useState<Founder[]>([]);

  useEffect(() => {
    vehicleApi.getPublicStats().then(setStats).catch(console.error);
    settingsApi.getFounders().then(setFounders).catch(console.error);
  }, []);

  return (
    <div className="static-page">
      <SEO 
        title="About Rentify — Sri Lanka's Vehicle Rental Marketplace"
        description="Rentify connects vehicle owners with renters across Sri Lanka. Browse vehicles island-wide, list your own for free, and experience hassle-free peer-to-peer rentals."
        keywords="about Rentify, vehicle rental Sri Lanka, peer to peer car rental, trusted vehicle platform, Rentify Sri Lanka"
        canonical="/about"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "AboutPage",
          "name": "About Rentify",
          "description": "Learn about Rentify, a Sri Lankan peer-to-peer vehicle rental marketplace",
          "url": "https://rentify.lk/about",
          "mainEntity": {
            "@type": "Organization",
            "name": "Rentify",
            "url": "https://rentify.lk",
            "description": "Sri Lanka's free peer-to-peer vehicle rental marketplace",
            "foundingDate": "2025",
            "areaServed": "Sri Lanka"
          }
        }}
      />
      {/* Hero Section */}
      <section className="about-hero-section">
        
        {/* Background Video */}
        <video 
          autoPlay 
          loop 
          muted 
          playsInline 
          className="about-hero-video"
        >
          <source src="/give_then_updated.mp4" type="video/mp4" />
        </video>

        {/* Darkening Overlay */}
        <div className="about-hero-overlay"></div>

        {/* Text Container */}
        <div className="about-hero-content container">
          <h1 className="about-hero-title">
            Redefining Mobility
          </h1>
          <p className="about-hero-subtitle">
            Rentify is Sri Lanka's leading free peer-to-peer vehicle sharing marketplace. 
            We empower individuals to monetize their vehicles directly, while providing renters 
            with island-wide access to a diverse fleet of cars, vans, and specialty vehicles.
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
          <div className="card" style={{ padding: '2rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color-light)', borderRadius: '16px', position: 'relative' }}>
            <h2 style={{ fontSize: '2rem', color: 'var(--text-tertiary)', fontWeight: 800, marginBottom: '0.5rem' }}>⭐</h2>
            <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>User Reviews</p>
            <span style={{ fontSize: '0.7rem', background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '20px', fontWeight: 700, marginTop: '0.5rem', display: 'inline-block' }}>Coming Soon</span>
          </div>
        </div>

        <div className="about-grid" style={{ gap: '4rem', marginBottom: '5rem' }}>
          <div className="about-text">
            <h2 style={{ fontSize: '2rem', color: '#0f172a' }}>Our Mission & Vision</h2>
            <p style={{ fontSize: '1.1rem', color: '#475569', marginBottom: '1.5rem' }}>
              At Rentify, our mission is to put the world's vehicles to better use. We envision a future where 
              car ownership is shared, efficient, and sustainable. By connecting vehicle owners directly with 
              renters, we're building a community that reduces waste, empowers local economies, and makes travel more accessible.
            </p>
            <p style={{ fontSize: '1.1rem', color: '#475569' }}>
              Whether you need an SUV for a weekend family trip, an exotic car for a special event, or a commercial 
              truck for heavy lifting, Rentify provides the trusted platform to connect you with the right vehicle owners seamlessly.
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

        {/* ========== FOUNDERS SECTION ========== */}
        {founders.length > 0 && (
          <div style={{ marginBottom: '5rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <h2 style={{ fontSize: '2rem', color: '#0f172a', marginBottom: '0.75rem', justifyContent: 'center' }}>Meet Our Founders</h2>
              <p style={{ color: '#64748b', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>
                The visionary leaders behind Rentify, driving innovation in vehicle sharing across Sri Lanka.
              </p>
            </div>
            <div className="founders-container">
              {founders.map((founder, idx) => (
                <div key={idx} className="founder-card">
                  <div className="card-bg">
                    <img
                      src={getImageUrl(founder.image)}
                      alt={founder.name}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(founder.name) + '&size=200&background=6366f1&color=fff';
                      }}
                    />
                  </div>
                  <div className="card-overlay">
                    <h3 className="founder-name">{founder.name}</h3>
                    <p className="founder-title">{founder.role}</p>
                    <div className="founder-description-wrapper">
                      <p className="founder-description">{founder.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Platform Standards */}
        <h2 style={{ fontSize: '2rem', color: '#0f172a', textAlign: 'center', marginBottom: '3rem', justifyContent: 'center' }}>Platform Standards</h2>
        <div className="about-values" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
          <div className="about-value-card">
            <Shield size={32} className="about-value-icon" style={{ color: '#6366f1' }} />
            <h3 style={{ fontSize: '1.25rem', marginTop: '1rem' }}>Secure Platform</h3>
            <p>We prioritize the security of our platform to ensure a safe environment for connecting owners and renters.</p>
          </div>
          <div className="about-value-card">
            <Award size={32} className="about-value-icon" style={{ color: '#eab308' }} />
            <h3 style={{ fontSize: '1.25rem', marginTop: '1rem' }}>Verified Quality</h3>
            <p>Our team manually reviews vehicle listings to ensure high standards and accurate representations.</p>
          </div>
          <div className="about-value-card">
            <Zap size={32} className="about-value-icon" style={{ color: '#f97316' }} />
            <h3 style={{ fontSize: '1.25rem', marginTop: '1rem' }}>Direct Connection</h3>
            <p>Skip the middlemen. We connect you directly with vehicle owners for faster and more transparent rentals.</p>
          </div>
          <div className="about-value-card">
            <Clock size={32} className="about-value-icon" style={{ color: '#06b6d4' }} />
            <h3 style={{ fontSize: '1.25rem', marginTop: '1rem' }}>Dedicated Support</h3>
            <p>Our support team is available during business hours to assist you with any platform-related inquiries.</p>
          </div>
        </div>

      </section>
    </div>
  );
}
