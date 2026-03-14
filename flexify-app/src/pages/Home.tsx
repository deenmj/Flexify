import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight, Shield, Clock, Users, MapPin, Star, ArrowRight, Verified } from 'lucide-react';
import { vehicleApi, type Vehicle, type User } from '../api';
import { useIsMobile } from '../hooks/useIsMobile';
import './Home.css';

export default function Home() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [owners] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const vehicleScrollRef = useRef<HTMLDivElement>(null);
  const ownerScrollRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    vehicleApi.getAll().then(setVehicles).catch(console.error);
  }, []);
  
  const scroll = (ref: React.RefObject<HTMLDivElement | null>, dir: 'left' | 'right') => {
    if (ref.current) {
      const amount = 340;
      ref.current.scrollBy({ left: dir === 'right' ? amount : -amount, behavior: 'smooth' });
    }
  };

  const categories = [
    { name: 'Cars', img: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=60', link: '/explore?type=Car' },
    { name: 'SUVs', img: 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=800&q=60', link: '/explore?type=SUV' },
    { name: 'Vans', img: 'https://images.unsplash.com/photo-1518600506278-4e8ef466b810?auto=format&fit=crop&w=800&q=60', link: '/explore?type=Van' },
    { name: 'Trucks', img: 'https://images.unsplash.com/photo-1544829099-b9a0c07fad1a?auto=format&fit=crop&w=800&q=60', link: '/explore?type=Truck' },
    { name: 'Bikes', img: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=60', link: '/explore?type=Bike' },
  ];

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-bg">
          <img src="https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=2069&q=80" alt="" className="hero-bg-img" />
          <div className="hero-overlay" />
        </div>
        <div className="hero-content container">
          <div className="hero-badge animate-fade-in">
            <Star size={14} /> Trusted by 10,000+ renters
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
              <span className="hero-stat-number">150+</span>
              <span className="hero-stat-label">Vehicles</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat">
              <span className="hero-stat-number">50+</span>
              <span className="hero-stat-label">Verified Owners</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat">
              <span className="hero-stat-number">25+</span>
              <span className="hero-stat-label">Districts</span>
            </div>
          </div>
        </div>
      </section>

      {/* Verified Owners */}
      <section className="section owners-section">
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
      <section className="section vehicles-section">
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
                <>
                  <VehiclePlaceholder title="Family SUV — Toyota" specs="Seats 7 · Automatic" price={45} img="https://images.unsplash.com/photo-1542367597-87b9a3b9d8a6?auto=format&fit=crop&w=800&q=60" />
                  <VehiclePlaceholder title="Compact Sedan — Honda" specs="Seats 4 · Manual" price={28} img="https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=60" />
                  <VehiclePlaceholder title="Luxury Sedan — BMW" specs="Seats 5 · Automatic" price={95} img="https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=800&q=60" />
                  <VehiclePlaceholder title="Electric — Tesla Model 3" specs="Seats 5 · Auto" price={75} img="https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=800&q=60" />
                </>
              )}
            </div>
          ) : (
            <div className="mobile-grid">
              {vehicles.slice(0, 6).map((vehicle) => (
                <VehicleCard key={vehicle._id} vehicle={vehicle} />
              ))}
              {vehicles.length === 0 && (
                <>
                  <VehiclePlaceholder title="Family SUV — Toyota" specs="Seats 7 · Automatic" price={45} img="https://images.unsplash.com/photo-1542367597-87b9a3b9d8a6?auto=format&fit=crop&w=800&q=60" />
                  <VehiclePlaceholder title="Compact Sedan — Honda" specs="Seats 4 · Manual" price={28} img="https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=60" />
                  <VehiclePlaceholder title="Luxury Sedan — BMW" specs="Seats 5 · Automatic" price={95} img="https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=800&q=60" />
                  <VehiclePlaceholder title="Electric — Tesla Model 3" specs="Seats 5 · Auto" price={75} img="https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=800&q=60" />
                </>
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
      <section className="section categories-section">
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
      <section className="section features-section">
        <div className="container">
          <h2 className="section-title text-center">Your Journey, Your Way</h2>
          <p className="section-subtitle text-center">We make vehicle renting seamless and personalized</p>
          <div className="features-grid stagger-children">
            <div className="feature-card animate-fade-in-up">
              <div className="feature-icon-wrap">
                <Shield size={28} />
              </div>
              <h3>Trusted Hosts</h3>
              <p>Rent from verified hosts with a proven track record and quality vehicles.</p>
            </div>
            <div className="feature-card animate-fade-in-up">
              <div className="feature-icon-wrap">
                <Clock size={28} />
              </div>
              <h3>Flexible Rentals</h3>
              <p>Daily, weekly, or monthly — choose the rental period that fits your schedule.</p>
            </div>
            <div className="feature-card animate-fade-in-up">
              <div className="feature-icon-wrap">
                <Users size={28} />
              </div>
              <h3>Community Driven</h3>
              <p>Join a community of car enthusiasts and travelers worldwide.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
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

function VehicleCard({ vehicle }: { vehicle: Vehicle }) {
  const ownerData = typeof vehicle.owner === 'object' ? vehicle.owner : null;
  return (
    <div className="vehicle-card card">
      <div className="vehicle-img-wrap">
        <img
          src={vehicle.photos?.[0] || 'https://images.unsplash.com/photo-1542367597-87b9a3b9d8a6?auto=format&fit=crop&w=800&q=60'}
          alt={vehicle.title}
          className="vehicle-img"
          onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542367597-87b9a3b9d8a6?auto=format&fit=crop&w=800&q=60'; }}
        />
        {vehicle.transmission && (
          <span className="vehicle-badge">{vehicle.transmission}</span>
        )}
      </div>
      <div className="vehicle-info">
        <h3 className="vehicle-title">{vehicle.title}</h3>
        <p className="vehicle-model">{vehicle.make} {vehicle.model}</p>
        <div className="vehicle-specs">
          {vehicle.seats && <span>Seats {vehicle.seats}</span>}
          {vehicle.location?.address && <span><MapPin size={12} /> {vehicle.location.address}</span>}
        </div>
        <div className="vehicle-footer">
          <div className="vehicle-price">
            <span className="price-amount">LKR {vehicle.pricePerDay.toLocaleString()}</span>
            <span className="price-unit">/day</span>
          </div>
          {ownerData && (
            <span className="vehicle-owner-badge">
              {ownerData.ownerType === 'VERIFIED' && <Verified size={12} />}
              {ownerData.name?.split(' ')[0]}
            </span>
          )}
        </div>
        <Link to={`/vehicles/${vehicle._id}`} className="btn btn-primary btn-sm btn-full">
          View Now
        </Link>
      </div>
    </div>
  );
}

function VehiclePlaceholder({ title, specs, price, img }: { title: string; specs: string; price: number; img: string }) {
  return (
    <div className="vehicle-card card">
      <div className="vehicle-img-wrap">
        <img src={img} alt={title} className="vehicle-img" />
      </div>
      <div className="vehicle-info">
        <h3 className="vehicle-title">{title}</h3>
        <div className="vehicle-specs"><span>{specs}</span></div>
        <div className="vehicle-footer">
          <div className="vehicle-price">
            <span className="price-amount">LKR {price.toLocaleString()}</span>
            <span className="price-unit">/day</span>
          </div>
        </div>
        <Link to="/explore" className="btn btn-secondary btn-sm btn-full">
          View Now
        </Link>
      </div>
    </div>
  );
}
