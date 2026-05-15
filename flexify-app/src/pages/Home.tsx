import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight, Shield, Clock, Users, MapPin, Star, ArrowRight, Verified, Car } from 'lucide-react';
import { Row, Col } from 'antd';
import { vehicleApi, type Vehicle, type User, type PublicStats } from '../api';
import { useAuth } from '../context/AuthContext';
import { useIsMobile } from '../hooks/useIsMobile';
import SEO from '../components/SEO';
import VehicleCard from '../components/VehicleCard';
import './Home.css';

export default function Home() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [owners] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState<PublicStats | null>(null);
  
  const vehicleScrollRef = useRef<HTMLDivElement>(null);
  const ownerScrollRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    vehicleApi.getAll({ limit: '12', sort: 'popular' }).then((response) => {
      const data = response.vehicles || [];
      const filteredVehicles = user 
        ? data.filter(v => {
            const ownerId = typeof v.owner === 'object' ? (v.owner as any)._id : v.owner;
            return ownerId !== user._id;
          })
        : data;
      setVehicles(filteredVehicles);
    }).catch(console.error);

    vehicleApi.getPublicStats().then(setStats).catch(console.error);
  }, [user]);
  
  const scroll = (ref: React.RefObject<HTMLDivElement | null>, dir: 'left' | 'right') => {
    if (ref.current) {
      const amount = 340;
      ref.current.scrollBy({ left: dir === 'right' ? amount : -amount, behavior: 'smooth' });
    }
  };

  const categories = [
    { name: 'Cars', img: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=60', link: '/explore?type=Car' },
    { name: 'SUVs', img: 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=800&q=60', link: '/explore?type=SUV' },
    { name: 'Vans', img: 'https://images.unsplash.com/photo-1650807486050-a142ea418b19?auto=format&fit=crop&q=80', link: '/explore?type=Van' },
    { name: 'Trucks', img: 'https://images.unsplash.com/photo-1631377875413-b1e3e660bfa2?auto=format&fit=crop&q=80', link: '/explore?type=Truck' },
    { name: 'Bikes', img: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=60', link: '/explore?type=Bike' },
  ];

  return (
    <div className="home-page">
      <SEO 
        title="Rent Cars, Bikes & Vans in Sri Lanka | Rentify"
        description="Sri Lanka's trusted vehicle rental marketplace. Rent cars, SUVs, bikes & vans from verified owners in Colombo, Kandy, Galle & 25 districts. Self-drive or with driver — book now!"
        keywords="rent a car Sri Lanka, car rental Colombo, bike rental Sri Lanka, self drive vehicles Sri Lanka, rent van Kandy, vehicle hire Galle, SUV rental island wide, Rentify Sri Lanka, peer to peer car rental, cheap car rent Colombo"
        canonical="/"
        ogTitle="Rent Cars, Bikes & Vans in Sri Lanka — Rentify.lk"
        ogDescription="Find & book verified rental vehicles across Sri Lanka. Cars, bikes, SUVs & vans from LKR 3,000/day. Island-wide self-drive & with-driver options."
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "Rentify",
            "alternateName": "Rentify Sri Lanka",
            "url": "https://rentify.lk",
            "description": "Sri Lanka's #1 peer-to-peer vehicle rental marketplace",
            "potentialAction": {
              "@type": "SearchAction",
              "target": {
                "@type": "EntryPoint",
                "urlTemplate": "https://rentify.lk/explore?q={search_term_string}"
              },
              "query-input": "required name=search_term_string"
            }
          },
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "Rentify",
            "url": "https://rentify.lk",
            "logo": "https://rentify.lk/logo.png",
            "description": "Peer-to-peer vehicle rental marketplace in Sri Lanka with verified owners and island-wide coverage.",
            "foundingDate": "2025",
            "areaServed": {
              "@type": "Country",
              "name": "Sri Lanka"
            },
            "sameAs": [],
            "contactPoint": {
              "@type": "ContactPoint",
              "contactType": "customer support",
              "url": "https://rentify.lk/contact",
              "availableLanguage": ["English", "Sinhala", "Tamil"]
            }
          }
        ]}
      />
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-bg">
          <img src="https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=2069&q=80" alt="" className="hero-bg-img" />
          <div className="hero-overlay" />
        </div>
        <div className="hero-content container">
          <div className="hero-badge animate-fade-in">
            <Star size={14} /> Trusted Peer-to-Peer Rental
          </div>
          <h1 className="hero-title animate-fade-in-up">
            Rent Your Perfect <br />
            <span className="hero-highlight">Ride in Sri Lanka</span>
          </h1>
          <p className="hero-subtitle animate-fade-in-up">
            Explore premium vehicles across the island — self-drive, chauffeur, or city tours.
          </p>
          <div className="hero-search animate-fade-in-up">
            <div className="hero-search-inner">
              <Search size={20} className="hero-search-icon" />
              <input
                type="text"
                placeholder={isMobile ? "Vehicles, brands, places…" : "Search vehicles, brands, locations..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="hero-search-input"
              />
              <Link to={`/explore${searchQuery ? `?q=${searchQuery}` : ''}`} className="btn btn-primary hero-search-btn">
                Search
              </Link>
            </div>
          </div>
          <div className="hero-stats animate-fade-in-up">
            <div className="hero-stat">
              <span className="hero-stat-number">{stats?.totalActiveVehicles || 0}</span>
              <span className="hero-stat-label">Vehicles</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat">
              <span className="hero-stat-number">{stats?.totalVerifiedOwners || 0}</span>
              <span className="hero-stat-label">Verified Owners</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat">
              <span className="hero-stat-number">{stats?.totalDistricts || 0}</span>
              <span className="hero-stat-label">Districts</span>
            </div>
          </div>
        </div>
      </section>

      {/* Verified Owners */}
      <section className="owners-section section-padding">
        <div className="container">
          <div className="section-header">
            <div>
              <h2 className="section-title">Top Verified Owners</h2>
              <p className="section-subtitle">Rent from trusted, verified vehicle providers</p>
            </div>
            {!isMobile && (
              <div className="scroll-controls">
                <button className="scroll-btn" onClick={() => scroll(ownerScrollRef, 'left')}><ChevronLeft size={20} /></button>
                <button className="scroll-btn" onClick={() => scroll(ownerScrollRef, 'right')}><ChevronRight size={20} /></button>
              </div>
            )}
          </div>
          {!isMobile ? (
            <div className="scroll-container" ref={ownerScrollRef}>
              {owners.map((owner) => (
                <div key={owner.id || owner._id} className="owner-card card">
                  <img
                    src={owner.profilePic ? (owner.profilePic.startsWith('/') ? owner.profilePic : owner.profilePic) : 'https://ui-avatars.com/api/?name=' + encodeURIComponent(owner.name) + '&background=2563eb&color=fff&size=200'}
                    alt={owner.name}
                    className="owner-avatar"
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(owner.name) + '&background=2563eb&color=fff&size=200'; }}
                  />
                  <h3 className="owner-name">
                    {owner.name}
                    <Verified size={16} className="verified-icon" />
                  </h3>
                  <p className="owner-location">
                    <MapPin size={14} />
                    {(owner as any).address || 'Sri Lanka'}
                  </p>
                  <Link to={`/explore?owner=${owner.id || owner._id}`} className="btn btn-secondary btn-sm btn-full">
                    View Vehicles
                  </Link>
                </div>
              ))}
              {owners.length === 0 && (
                <div className="empty-state-inline">
                  <p>Verified owners will appear here</p>
                </div>
              )}
            </div>
          ) : (
            <div className="mobile-grid">
              {owners.map((owner) => (
                <div key={owner.id || owner._id} className="owner-card card">
                  <img
                    src={owner.profilePic ? (owner.profilePic.startsWith('/') ? owner.profilePic : owner.profilePic) : 'https://ui-avatars.com/api/?name=' + encodeURIComponent(owner.name) + '&background=2563eb&color=fff&size=200'}
                    alt={owner.name}
                    className="owner-avatar"
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(owner.name) + '&background=2563eb&color=fff&size=200'; }}
                  />
                  <h3 className="owner-name">
                    {owner.name}
                    <Verified size={16} className="verified-icon" />
                  </h3>
                  <p className="owner-location">
                    <MapPin size={14} />
                    {(owner as any).address || 'Sri Lanka'}
                  </p>
                  <Link to={`/explore?owner=${owner.id || owner._id}`} className="btn btn-secondary btn-sm btn-full">
                    View Vehicles
                  </Link>
                </div>
              ))}
              {owners.length === 0 && (
                <div className="empty-state-inline">
                  <p>Verified owners will appear here</p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Featured Vehicles */}
      <section className="vehicles-section section-padding">
        <div className="container">
          <div className="section-header">
            <div>
              <h2 className="section-title">Featured Vehicles</h2>
              <p className="section-subtitle">Handpicked rides for every journey</p>
            </div>
            {!isMobile && (
              <div className="scroll-controls">
                <button className="scroll-btn" onClick={() => scroll(vehicleScrollRef, 'left')}><ChevronLeft size={20} /></button>
                <button className="scroll-btn" onClick={() => scroll(vehicleScrollRef, 'right')}><ChevronRight size={20} /></button>
              </div>
            )}
          </div>
          {!isMobile ? (
            <div className="scroll-container" ref={vehicleScrollRef}>
              {vehicles.slice(0, 12).map((vehicle) => (
                <VehicleCard key={vehicle._id} vehicle={vehicle} />
              ))}
              {vehicles.length === 0 && (
                <div className="empty-state-card" style={{ width: '100%', textAlign: 'center', padding: '3rem', background: 'rgba(255,255,255,0.05)', borderRadius: '1rem', border: '1px dashed var(--border-color)' }}>
                  <Car size={40} style={{ color: 'var(--text-tertiary)', marginBottom: '1rem' }} />
                  <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No featured vehicles available yet.</p>
                  <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>List your vehicle to see it here!</p>
                </div>
              )}
            </div>
          ) : (
            <div className="mobile-grid">
              {vehicles.slice(0, 6).map((vehicle) => (
                <VehicleCard key={vehicle._id} vehicle={vehicle} />
              ))}
              {vehicles.length === 0 && (
                <div className="empty-state-card" style={{ width: '100%', textAlign: 'center', padding: '2rem', background: 'rgba(255,255,255,0.05)', borderRadius: '1rem', border: '1px dashed var(--border-color)' }}>
                  <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No featured vehicles available yet.</p>
                </div>
              )}
            </div>
          )}
          <div className="section-footer">
            <Link to="/explore" className="btn btn-secondary">
              View All Vehicles <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="categories-section section-padding">
        <div className="container">
          <h2 className="section-title text-center">Browse by Category</h2>
          <p className="section-subtitle text-center">Find the perfect vehicle type for your needs</p>
          <div className="categories-grid">
            {categories.map((cat) => (
              <Link to={cat.link} key={cat.name} className="category-card">
                <img src={cat.img} alt={cat.name} className="category-img" />
                <div className="category-overlay" />
                <h3 className="category-name">{cat.name}</h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features-section section-padding">
        <div className="container">
          <div className="section-header text-center block">
            <h2 className="section-title">Your Journey, Your Way</h2>
            <p className="section-subtitle">We make vehicle renting seamless and personalized</p>
          </div>
          <Row gutter={[32, 32]} className="features-row stagger-children">
            <Col xs={24} md={8} lg={8}>
              <div className="feature-card animate-fade-in-up">
                <div className="feature-icon-wrap">
                  <Shield size={40} strokeWidth={1.5} />
                </div>
                <h3>Trusted Hosts</h3>
                <p>Rent from verified hosts with a proven track record and quality vehicles.</p>
              </div>
            </Col>
            <Col xs={24} md={8} lg={8}>
              <div className="feature-card animate-fade-in-up">
                <div className="feature-icon-wrap">
                  <Clock size={40} strokeWidth={1.5} />
                </div>
                <h3>Flexible Rentals</h3>
                <p>Daily, weekly, or monthly — choose the rental period that fits your schedule.</p>
              </div>
            </Col>
            <Col xs={24} md={8} lg={8}>
              <div className="feature-card animate-fade-in-up">
                <div className="feature-icon-wrap">
                  <Users size={40} strokeWidth={1.5} />
                </div>
                <h3>Community Driven</h3>
                <p>Join a community of car enthusiasts and travelers worldwide.</p>
              </div>
            </Col>
          </Row>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section section-padding">
        <div className="container">
          <div className="cta-card">
            <h2>Ready to List Your Vehicle?</h2>
            <p>Earn money by renting out your car. Quick setup, full control.</p>
            <Link to="/list-vehicle" className="btn btn-primary btn-lg">
              Get Started <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}




