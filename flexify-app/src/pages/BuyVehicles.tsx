import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { saleListingApi, getImageUrl, getSaleListingSlug, type VehicleSaleListing } from '../api';
import { Search, MapPin, Tag, SlidersHorizontal, ChevronDown, Car } from 'lucide-react';
import { Spin } from 'antd';
import SEO from '../components/SEO';
import './BuyVehicles.css';

const SRI_LANKA_DISTRICTS = [
  'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya', 'Galle', 'Matara', 'Hambantota',
  'Jaffna', 'Kilinochchi', 'Mannar', 'Vavuniya', 'Mullaitivu', 'Batticaloa', 'Ampara', 'Trincomalee',
  'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla', 'Moneragala', 'Ratnapura', 'Kegalle'
];

const CONDITIONS = ['Brand New', 'Excellent', 'Good', 'Used'];

export default function BuyVehicles() {
  const navigate = useNavigate();
  const [listings, setListings] = useState<VehicleSaleListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [filters, setFilters] = useState({
    q: '',
    condition: '',
    city: '',
    minPrice: '',
    maxPrice: '',
    sort: 'newest',
  });

  const fetchListings = async (pageNum = 1, append = false) => {
    if (append) setLoadingMore(true); else setLoading(true);
    try {
      const params: Record<string, string> = { page: String(pageNum), limit: '20' };
      if (filters.q) params.q = filters.q;
      if (filters.condition) params.condition = filters.condition;
      if (filters.city) params.city = filters.city;
      if (filters.minPrice) params.minPrice = filters.minPrice;
      if (filters.maxPrice) params.maxPrice = filters.maxPrice;
      if (filters.sort) params.sort = filters.sort;

      const res = await saleListingApi.getAll(params);
      if (append) {
        setListings(prev => [...prev, ...res.listings]);
      } else {
        setListings(res.listings);
      }
      setTotalPages(res.pagination.totalPages);
      setPage(pageNum);
    } catch (err) {
      console.error('Failed to fetch sale listings', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchListings(1);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchListings(1);
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    setFiltersOpen(false);
    fetchListings(1);
  };

  const loadMore = () => {
    if (page < totalPages) fetchListings(page + 1, true);
  };

  const conditionColor = (c: string) => {
    switch (c) {
      case 'Brand New': return '#10b981';
      case 'Excellent': return '#3b82f6';
      case 'Good': return '#f59e0b';
      case 'Used': return '#94a3b8';
      default: return '#64748b';
    }
  };

  return (
    <div className="buy-page">
      <SEO
        title="Buy a Vehicle — Rentify.lk Marketplace"
        description="Browse thousands of vehicles for sale across Sri Lanka. Find cars, vans, bikes and more at the best prices on Rentify.lk."
      />

      {/* Header */}
      <div className="buy-header">
        <div className="buy-header-inner container">
          <h1>Buy a Vehicle</h1>
          <p>Browse vehicles for sale across Sri Lanka</p>

          <form onSubmit={handleSearch} className="buy-search-bar">
            <Search size={20} className="search-icon" />
            <input
              type="text"
              placeholder="Search by title, brand, or model..."
              value={filters.q}
              onChange={(e) => handleFilterChange('q', e.target.value)}
            />
            <button type="submit" className="search-btn">Search</button>
          </form>

          <div className="buy-filter-row">
            <select value={filters.sort} onChange={(e) => { handleFilterChange('sort', e.target.value); setTimeout(() => fetchListings(1), 0); }}>
              <option value="newest">Newest First</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
              <option value="oldest">Oldest First</option>
            </select>
            <button className="filter-toggle" onClick={() => setFiltersOpen(!filtersOpen)}>
              <SlidersHorizontal size={16} /> Filters <ChevronDown size={14} />
            </button>
          </div>

          {filtersOpen && (
            <div className="buy-filters-panel">
              <div className="filter-grid">
                <div className="filter-item">
                  <label>Condition</label>
                  <select value={filters.condition} onChange={(e) => handleFilterChange('condition', e.target.value)}>
                    <option value="">All Conditions</option>
                    {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="filter-item">
                  <label>Location</label>
                  <select value={filters.city} onChange={(e) => handleFilterChange('city', e.target.value)}>
                    <option value="">All Locations</option>
                    {SRI_LANKA_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="filter-item">
                  <label>Min Price (LKR)</label>
                  <input type="number" placeholder="0" value={filters.minPrice} onChange={(e) => handleFilterChange('minPrice', e.target.value)} />
                </div>
                <div className="filter-item">
                  <label>Max Price (LKR)</label>
                  <input type="number" placeholder="Any" value={filters.maxPrice} onChange={(e) => handleFilterChange('maxPrice', e.target.value)} />
                </div>
              </div>
              <button className="apply-filters-btn" onClick={applyFilters}>Apply Filters</button>
            </div>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="buy-body container">
        {loading ? (
          <div className="buy-loading"><Spin size="large" /></div>
        ) : listings.length === 0 ? (
          <div className="buy-empty">
            <Car size={48} strokeWidth={1.5} />
            <h3>No vehicles found</h3>
            <p>Try adjusting your filters or check back later.</p>
          </div>
        ) : (
          <>
            <div className="buy-grid">
              {listings.map(listing => (
                <Link
                  key={listing._id}
                  to={`/buy/${getSaleListingSlug(listing)}`}
                  className="sale-card"
                >
                  <div className="sale-card-img">
                    {listing.photos?.[0] ? (
                      <img src={getImageUrl(listing.photos[0])} alt={listing.title} loading="lazy" />
                    ) : (
                      <div className="sale-card-no-img"><Car size={36} /></div>
                    )}
                    <div className="sale-badge">FOR SALE</div>
                    <div className="condition-badge" style={{ background: conditionColor(listing.condition) }}>
                      {listing.condition}
                    </div>
                  </div>
                  <div className="sale-card-body">
                    <div className="sale-card-price">LKR {listing.price.toLocaleString()}</div>
                    <h3 className="sale-card-title">{listing.title}</h3>
                    <div className="sale-card-location">
                      <MapPin size={13} /> {listing.city}
                    </div>
                    {listing.mileage > 0 && (
                      <div className="sale-card-meta">{listing.mileage.toLocaleString()} km</div>
                    )}
                  </div>
                </Link>
              ))}
            </div>

            {page < totalPages && (
              <div className="load-more-container">
                <button className="load-more-btn" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? 'Loading...' : 'Load More Vehicles'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
