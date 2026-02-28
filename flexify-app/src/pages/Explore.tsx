import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, Filter, MapPin, Verified, X, SlidersHorizontal } from 'lucide-react';
import { vehicleApi, type Vehicle } from '../api';
import './Explore.css';

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
    sort: 'newest',
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
      if (filters.sort) params.sort = filters.sort === 'price_low' ? 'price_low' : filters.sort === 'price_high' ? 'price_high' : filters.sort === 'popular' ? 'popular' : '';

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
    setFilters({ transmission: '', minPrice: '', maxPrice: '', seats: '', sort: 'newest' });
    setQuery('');
  };

  return (
    <div className="explore-page">
      {/* Search Header */}
      <section className="explore-header">
        <div className="container">
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
                  <option value="Auto">Automatic</option>
                  <option value="Manual">Manual</option>
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
          src={vehicle.images?.[0] || 'https://images.unsplash.com/photo-1542367597-87b9a3b9d8a6?auto=format&fit=crop&w=800&q=60'}
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
        <h3 className="explore-vehicle-title">{vehicle.title}</h3>
        <p className="explore-vehicle-model">{vehicle.makeModel} {vehicle.year && `· ${vehicle.year}`}</p>
        <div className="explore-vehicle-specs">
          {vehicle.seats && <span>🪑 {vehicle.seats} seats</span>}
          {vehicle.location?.text && <span><MapPin size={12} /> {vehicle.location.text}</span>}
          {vehicle.serviceType?.[0] && <span>📋 {vehicle.serviceType[0]}</span>}
        </div>
        <div className="explore-vehicle-footer">
          <div className="explore-vehicle-price">
            <span className="price-amount">${vehicle.pricePerDay}</span>
            <span className="price-unit">/day</span>
          </div>
          <Link to={`/explore?vehicle=${vehicle._id}`} className="btn btn-primary btn-sm">
            Rent Now
          </Link>
        </div>
      </div>
    </div>
  );
}
