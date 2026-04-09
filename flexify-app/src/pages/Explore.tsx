import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Row, Col } from 'antd';
import { Search, MapPin, Verified, SlidersHorizontal, Star, Locate } from 'lucide-react';
import { vehicleApi, type Vehicle, getImageUrl } from '../api';
import { useAuth } from '../context/AuthContext';
import { useIsMobile } from '../hooks/useIsMobile';
import './Explore.css';

const SRI_LANKA_LOCATIONS: Record<string, string[]> = {
  'Western': ['Colombo', 'Gampaha', 'Kalutara'],
  'Central': ['Kandy', 'Matale', 'Nuwara Eliya'],
  'Southern': ['Galle', 'Matara', 'Hambantota'],
  'Northern': ['Jaffna', 'Kilinochchi', 'Mannar', 'Vavuniya', 'Mullaitivu'],
  'Eastern': ['Trincomalee', 'Batticaloa', 'Ampara'],
  'North Western': ['Kurunegala', 'Puttalam'],
  'North Central': ['Anuradhapura', 'Polonnaruwa'],
  'Uva': ['Badulla', 'Moneragala'],
  'Sabaragamuwa': ['Ratnapura', 'Kegalle']
};

interface Filters {
  transmission: string;
  minPrice: string;
  maxPrice: string;
  seats: string;
  vehicleType: string;
  lat: string;
  lng: string;
  radius: string;
  sort: string;
  province: string;
  district: string;
}

export default function Explore() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [filters, setFilters] = useState<Filters>({
    transmission: '',
    minPrice: '',
    maxPrice: '',
    seats: '',
    vehicleType: searchParams.get('type') || searchParams.get('vehicleType') || '',
    lat: '',
    lng: '',
    radius: '10', // default radius 10km
    sort: searchParams.get('sort') || 'newest',
    province: searchParams.get('province') || '',
    district: searchParams.get('district') || '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const isMobile = useIsMobile();

  const fetchVehicles = async (overrideQuery?: string, overrideType?: string) => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      const activeQuery = overrideQuery !== undefined ? overrideQuery : query;
      const activeType = overrideType !== undefined ? overrideType : filters.vehicleType;

      if (activeQuery) params.q = activeQuery;
      if (filters.transmission) params.transmission = filters.transmission;
      if (filters.minPrice) params.minPrice = filters.minPrice;
      if (filters.maxPrice) params.maxPrice = filters.maxPrice;
      if (filters.seats) params.seats = filters.seats;
      if (activeType) params.vehicleType = activeType;
      if (filters.lat) params.lat = filters.lat;
      if (filters.lng) params.lng = filters.lng;
      if (filters.radius) params.radius = filters.radius;
      if (filters.province) params.province = filters.province;
      if (filters.district) params.district = filters.district;
      if (filters.sort) params.sort = filters.sort;

      const data = await vehicleApi.getAll(params);
      
      // Filter out user's own vehicles so they can't book their own listings
      const filteredData = user 
        ? data.filter((v: any) => v.owner?._id !== user._id && v.owner !== user._id)
        : data;
        
      setVehicles(filteredData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const urlType = searchParams.get('type') || searchParams.get('vehicleType') || '';
    const urlQuery = searchParams.get('q') || '';

    setQuery(urlQuery);
    setFilters((prev: Filters) => ({ ...prev, vehicleType: urlType }));

    fetchVehicles(urlQuery, urlType);
    // eslint-disable-next-line
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchVehicles();
  };

  const clearFilters = () => {
    setFilters({ transmission: '', minPrice: '', maxPrice: '', seats: '', vehicleType: '', lat: '', lng: '', radius: '10', sort: 'newest', province: '', district: '' });
    setQuery('');
  };

  const handleLocateMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setFilters({ ...filters, lat: pos.coords.latitude.toString(), lng: pos.coords.longitude.toString(), province: '', district: '' });
      }, () => {
        alert("Failed to get location. Please enable location permissions.");
      });
    }
  };

  return (
    <div className="explore-page">
      {/* Search Header */}
      <section className="explore-header section-padding">
        <div className="container" style={{ position: 'relative' }}>
          <h1 className="explore-title">Explore Vehicles</h1>
          <p className="explore-subtitle">Find the perfect vehicle for your journey</p>
          
          <div className="explore-controls-container">
            <div className="explore-search-row">
              <form onSubmit={handleSearch} className="explore-search">
                <div className="explore-search-inner">
                  <Search size={18} className="explore-search-icon" />
                  <input
                    type="text"
                    placeholder="Search by name, model, location..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="explore-search-input"
                  />
                  <button type="button" className="filter-toggle-btn" onClick={() => setShowFilters(!showFilters)}>
                    <SlidersHorizontal size={14} />
                    Filters
                  </button>
                  <button type="submit" className="btn btn-primary search-row-btn d-none-mobile">Search</button>
                </div>
              </form>

              <div className="explore-quick-filters">
                <button 
                  type="button" 
                  className="quick-locate-btn" 
                  onClick={handleLocateMe}
                  title="Locate Me"
                >
                  <Locate size={14} /> <span className="quick-locate-text">Locate Me</span>
                </button>
                <select 
                  className="quick-radius-select"
                  value={filters.radius}
                  onChange={(e) => {
                    setFilters({ ...filters, radius: e.target.value });
                  }}
                >
                  <option value="5">5km</option>
                  <option value="10">10km</option>
                  <option value="25">25km</option>
                  <option value="50">50km</option>
                  <option value="100">100km</option>
                </select>
                {(filters.lat || filters.lng) && (
                  <div className="location-active-badge">
                    <span className="pulse-dot"></span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Filters Panel - All other filters under one topic */}
      {showFilters && (
        <div className="filters-panel animate-fade-in-down">
          <div className="container">
            <div className="filters-section-title">
              <h4>Advanced Filters</h4>
            </div>
            <div className="filters-grid">
              <div className="input-group">
                <label>Transmission</label>
                <select
                  className="input-field"
                  value={filters.transmission}
                  onChange={(e) => setFilters({ ...filters, transmission: e.target.value })}
                >
                  <option value="">All</option>
                  <option value="Automatic">Automatic</option>
                  <option value="Manual">Manual</option>
                </select>
              </div>
              <div className="input-group">
                <label>Vehicle Type</label>
                <select
                  className="input-field"
                  value={filters.vehicleType}
                  onChange={(e) => setFilters({ ...filters, vehicleType: e.target.value })}
                >
                  <option value="">All Types</option>
                  <option value="Car">Car</option>
                  <option value="SUV">SUV</option>
                  <option value="Van">Van</option>
                  <option value="Bike">Bike</option>
                  <option value="Truck">Truck</option>
                </select>
              </div>
              <div className="input-group">
                <label>Province</label>
                <select
                  className="input-field"
                  value={filters.province}
                  onChange={(e) => {
                    setFilters({ ...filters, province: e.target.value, district: '', lat: '', lng: '' });
                  }}
                >
                  <option value="">Anywhere</option>
                  {Object.keys(SRI_LANKA_LOCATIONS).map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label>District</label>
                <select
                  className="input-field"
                  value={filters.district}
                  onChange={(e) => {
                    setFilters({ ...filters, district: e.target.value, lat: '', lng: '' });
                  }}
                  disabled={!filters.province}
                >
                  <option value="">Any District</option>
                  {filters.province && SRI_LANKA_LOCATIONS[filters.province as keyof typeof SRI_LANKA_LOCATIONS].map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label>Seats</label>
                <select
                  className="input-field"
                  value={filters.seats}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilters({ ...filters, seats: e.target.value })}
                >
                  <option value="">Any</option>
                  <option value="2">2</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                  <option value="7">7+</option>
                </select>
              </div>
              <div className="input-group">
                <label>Min Price (LKR/day)</label>
                <input
                  type="number"
                  className="input-field"
                  placeholder="0"
                  value={filters.minPrice}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilters({ ...filters, minPrice: e.target.value })}
                />
              </div>
              <div className="input-group">
                <label>Max Price (LKR/day)</label>
                <input
                  type="number"
                  className="input-field"
                  placeholder="Unlimited"
                  value={filters.maxPrice}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilters({ ...filters, maxPrice: e.target.value })}
                />
              </div>
              <div className="input-group">
                <label>Sort By</label>
                <select
                  className="input-field"
                  value={filters.sort}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilters({ ...filters, sort: e.target.value })}
                >
                  <option value="newest">Newest</option>
                  <option value="price_low">Price: Low → High</option>
                  <option value="price_high">Price: High → Low</option>
                  <option value="popular">Most Popular</option>
                </select>
              </div>
            </div>

            <div className="desktop-filters-actions">
              <button className="btn btn-secondary btn-sm" onClick={clearFilters}>Clear</button>
              <button className="btn btn-primary btn-sm" onClick={() => fetchVehicles()}>Apply Filters</button>
            </div>
          </div>

          {isMobile && (
            <div className="mobile-filters-actions-bar">
              <button className="btn btn-secondary btn-sm" onClick={clearFilters} style={{ flex: 1 }}>Clear</button>
              <button className="btn btn-primary btn-sm" onClick={() => { fetchVehicles(); setShowFilters(false); }} style={{ flex: 2 }}>Apply</button>
            </div>
          )}
        </div>
      )}

      {/* Results */}
      <section className="explore-results section-padding">
        <div className="container">
          {vehicles.length > 0 && !loading && (
            <p className="results-count">{vehicles.length} vehicles found</p>
          )}
          {loading ? (
            <Row gutter={[16, 16]}>
              {[...Array(6)].map((_, i) => (
                <Col xs={12} sm={12} md={8} lg={6} key={i}>
                  <div className="card vehicle-skeleton" style={{ height: '100%' }}>
                    <div className="skeleton" style={{ height: isMobile ? 120 : 200 }} />
                    <div style={{ padding: isMobile ? '0.75rem' : '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div className="skeleton" style={{ height: 16, width: '70%' }} />
                      <div className="skeleton" style={{ height: 12, width: '50%' }} />
                      <div className="skeleton" style={{ height: 20, width: '40%', marginTop: '0.5rem' }} />
                      <div className="skeleton" style={{ height: isMobile ? 32 : 38, borderRadius: 8 }} />
                    </div>
                  </div>
                </Col>
              ))}
            </Row>
          ) : vehicles.length > 0 ? (
            <Row gutter={[16, 16]}>
              {vehicles.map((vehicle) => (
                <Col xs={12} sm={12} md={8} lg={6} key={vehicle._id}>
                  <ExploreVehicleCard vehicle={vehicle} />
                </Col>
              ))}
            </Row>
          ) : (
            <div className="explore-empty">
              <Search size={48} strokeWidth={1} />
              <h3>No vehicles found</h3>
              <p>Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function ExploreVehicleCard({ vehicle }: { vehicle: Vehicle }) {
  const ownerData = typeof vehicle.owner === 'object' ? vehicle.owner : null;
  return (
    <div className="explore-vehicle-card card">
      <div className="explore-vehicle-img-wrap">
        <img
          src={getImageUrl(vehicle.photos?.[0])}
          alt={vehicle.title}
          loading="lazy"
          className="explore-vehicle-img"
          onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542367597-87b9a3b9d8a6?auto=format&fit=crop&w=800&q=80'; }}
        />
        <div className="explore-vehicle-badges">
          {vehicle.transmission && <span className="badge badge-primary">{vehicle.transmission}</span>}
          {ownerData?.ownerType === 'VERIFIED' && <span className="badge badge-success"><Verified size={12} /> Verified</span>}
          {ownerData?.subscription?.tier === 'ENTERPRISE' && <span className="badge badge-premium" style={{ background: '#6610f2', color: 'white' }}><Star size={12} fill="white" /> Priority</span>}
          {ownerData?.subscription?.tier === 'STANDARD' && <span className="badge" style={{ background: '#f59e0b', color: 'white' }}>Standard</span>}
        </div>
      </div>
      <div className="explore-vehicle-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <h3 className="explore-vehicle-title">{vehicle.title}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 600, color: '#f59e0b' }}>
            <Star size={14} fill="currentColor" /> {vehicle.averageRating || 'New'} <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>({vehicle.reviewCount || 0})</span>
          </div>
        </div>
        <p className="explore-vehicle-model">{vehicle.make} {vehicle.model} {vehicle.year && `· ${vehicle.year}`}</p>
        <div className="explore-vehicle-specs">
          <span>🪑 {vehicle.seats} seats</span>
          {vehicle.engineCapacity && <span>⚡ {vehicle.engineCapacity}</span>}
          {(vehicle.city || vehicle.district) && (
            <span><MapPin size={12} /> {vehicle.city ? `${vehicle.city}, ${vehicle.district}` : vehicle.district}</span>
          )}
        </div>
        <div className="explore-vehicle-footer">
          <div className="explore-vehicle-price">
            <span className="price-amount">LKR {vehicle.pricePerDay.toLocaleString()}</span>
            <span className="price-unit">/day</span>
          </div>
          <Link to={`/vehicles/${vehicle._id}`} className="btn btn-primary btn-sm">
            View Now
          </Link>
        </div>
      </div>
    </div>
  );
}
