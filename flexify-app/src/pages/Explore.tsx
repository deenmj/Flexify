import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, Filter, MapPin, Verified, X, SlidersHorizontal, ArrowLeft, Star, Locate } from 'lucide-react';
import { vehicleApi, type Vehicle } from '../api';
import './Explore.css';

const SRI_LANKA_DISTRICTS = [
  'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Galle', 'Matara', 'Kurunegala', 'Jaffna', 'Other'
];

export default function Explore() {
  const [searchParams] = useSearchParams();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [filters, setFilters] = useState({
    transmission: '',
    minPrice: '',
    maxPrice: '',
    seats: '',
    vehicleType: '',
    lat: '',
    lng: '',
    radius: '10', // default radius 10km
    sort: 'newest',
    district: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (query) params.q = query;
      if (filters.transmission) params.transmission = filters.transmission;
      if (filters.minPrice) params.minPrice = filters.minPrice;
      if (filters.maxPrice) params.maxPrice = filters.maxPrice;
      if (filters.seats) params.seats = filters.seats;
      if (filters.vehicleType) params.vehicleType = filters.vehicleType;
      if (filters.lat) params.lat = filters.lat;
      if (filters.lng) params.lng = filters.lng;
      if (filters.radius) params.radius = filters.radius;
      if (filters.sort) params.sort = filters.sort;

      const data = await vehicleApi.getAll(params);
      setVehicles(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
    // eslint-disable-next-line
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchVehicles();
  };

  const clearFilters = () => {
    setFilters({ transmission: '', minPrice: '', maxPrice: '', seats: '', vehicleType: '', lat: '', lng: '', radius: '10', sort: 'newest', district: '' });
    setQuery('');
  };

  const handleLocateMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setFilters({ ...filters, lat: pos.coords.latitude.toString(), lng: pos.coords.longitude.toString(), district: '' });
      }, () => {
        alert("Failed to get location. Please enable location permissions.");
      });
    }
  };

  return (
    <div className="explore-page">
      {/* Search Header */}
      <section className="explore-header">
        <div className="container" style={{ position: 'relative' }}>
          <button 
            onClick={() => window.history.back()} 
            className="btn btn-ghost" 
            style={{ position: 'absolute', left: '0', top: '-1rem', padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <ArrowLeft size={18} /> Back
          </button>
          <h1 className="explore-title">Explore Vehicles</h1>
          <p className="explore-subtitle">Find the perfect vehicle for your journey</p>
          <form onSubmit={handleSearch} className="explore-search">
            <div className="explore-search-inner">
              <Search size={20} className="explore-search-icon" />
              <input
                type="text"
                placeholder="Search by name, model, location..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="explore-search-input"
              />
              <button type="button" className="filter-toggle-btn" onClick={() => setShowFilters(!showFilters)}>
                <SlidersHorizontal size={18} />
                Filters
              </button>
              <button type="submit" className="btn btn-primary">Search</button>
            </div>
          </form>
        </div>
      </section>

      {/* Filters Panel */}
      {showFilters && (
        <div className="filters-panel animate-fade-in-down">
          <div className="container">
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
                <label>Distance Search</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={handleLocateMe} style={{ flex: '1 0 auto' }}>
                    <Locate size={14} /> My Location
                  </button>
                  <input type="number" className="input-field" placeholder="Radius(km)" value={filters.radius} onChange={(e) => setFilters({ ...filters, radius: e.target.value })} style={{ width: '100px' }} />
                  {(filters.lat || filters.lng) && <span style={{fontSize: '10px', color: 'var(--text-tertiary)'}}>📌 {parseFloat(filters.lat).toFixed(2)}, {parseFloat(filters.lng).toFixed(2)}</span>}
                </div>
              </div>
              <div className="input-group">
                <label>District</label>
                <select
                  className="input-field"
                  value={filters.district}
                  onChange={(e) => {
                    setFilters({ ...filters, district: e.target.value, lat: '', lng: '' });
                    if (e.target.value) setQuery(e.target.value); // Use query for district if lat/lng not used
                  }}
                >
                  <option value="">Anywhere</option>
                  {SRI_LANKA_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label>Min Price ($/day)</label>
                <input
                  type="number"
                  className="input-field"
                  placeholder="0"
                  value={filters.minPrice}
                  onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                />
              </div>
              <div className="input-group">
                <label>Max Price ($/day)</label>
                <input
                  type="number"
                  className="input-field"
                  placeholder="500"
                  value={filters.maxPrice}
                  onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                />
              </div>
              <div className="input-group">
                <label>Seats</label>
                <select
                  className="input-field"
                  value={filters.seats}
                  onChange={(e) => setFilters({ ...filters, seats: e.target.value })}
                >
                  <option value="">Any</option>
                  <option value="2">2</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                  <option value="7">7+</option>
                </select>
              </div>
              <div className="input-group">
                <label>Sort By</label>
                <select
                  className="input-field"
                  value={filters.sort}
                  onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
                >
                  <option value="newest">Newest</option>
                  <option value="price_low">Price: Low → High</option>
                  <option value="price_high">Price: High → Low</option>
                  <option value="popular">Most Popular</option>
                </select>
              </div>
            </div>
            <div className="filters-actions">
              <button className="btn btn-ghost btn-sm" onClick={clearFilters}><X size={14} /> Clear All</button>
              <button className="btn btn-primary btn-sm" onClick={fetchVehicles}><Filter size={14} /> Apply Filters</button>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      <section className="explore-results">
        <div className="container">
          <p className="results-count">{vehicles.length} vehicles found</p>
          {loading ? (
            <div className="explore-grid">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="card vehicle-skeleton">
                  <div className="skeleton" style={{ height: 200 }} />
                  <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div className="skeleton" style={{ height: 20, width: '70%' }} />
                    <div className="skeleton" style={{ height: 16, width: '50%' }} />
                    <div className="skeleton" style={{ height: 24, width: '40%', marginTop: '0.5rem' }} />
                    <div className="skeleton" style={{ height: 38, borderRadius: 8 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : vehicles.length > 0 ? (
            <div className="explore-grid">
              {vehicles.map((vehicle) => (
                <ExploreVehicleCard key={vehicle._id} vehicle={vehicle} />
              ))}
            </div>
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
          src={vehicle.photos?.[0] || vehicle.images?.[0] || 'https://images.unsplash.com/photo-1542367597-87b9a3b9d8a6?auto=format&fit=crop&w=800&q=60'}
          alt={vehicle.title}
          className="explore-vehicle-img"
          onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542367597-87b9a3b9d8a6?auto=format&fit=crop&w=800&q=60'; }}
        />
        <div className="explore-vehicle-badges">
          {vehicle.transmission && <span className="badge badge-primary">{vehicle.transmission}</span>}
          {ownerData?.verified && <span className="badge badge-success"><Verified size={12} /> Verified</span>}
        </div>
      </div>
      <div className="explore-vehicle-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <h3 className="explore-vehicle-title">{vehicle.title}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 600, color: '#f59e0b' }}>
            <Star size={14} fill="currentColor" /> 4.8 <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>(24)</span>
          </div>
        </div>
        <p className="explore-vehicle-model">{vehicle.make} {vehicle.model} {vehicle.year && `· ${vehicle.year}`}</p>
        <div className="explore-vehicle-specs">
          {vehicle.seats && <span>🪑 {vehicle.seats} seats</span>}
          {vehicle.location?.address ? (
            <span><MapPin size={12} /> {vehicle.location.address}</span>
          ) : vehicle.location?.text ? (
            <span><MapPin size={12} /> {vehicle.location.text}</span>
          ) : null}
          {vehicle.transmission && <span>🕹️ {vehicle.transmission}</span>}
        </div>
        <div className="explore-vehicle-footer">
          <div className="explore-vehicle-price">
            <span className="price-amount">${vehicle.pricePerDay}</span>
            <span className="price-unit">/day</span>
          </div>
          <Link to={`/vehicles/${vehicle._id}`} className="btn btn-primary btn-sm">
            Rent Now
          </Link>
        </div>
      </div>
    </div>
  );
}
