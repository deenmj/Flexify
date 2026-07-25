import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { Row, Col, DatePicker, Dropdown, Select } from 'antd';
const { RangePicker } = DatePicker;
import { Search, SlidersHorizontal, Locate, ChevronDown, X, Plus, Car, Tag, Lock } from 'lucide-react';
import { vehicleApi, type Vehicle } from '../api';
import { useAuth } from '../context/AuthContext';
import { useIsMobile } from '../hooks/useIsMobile';
import SEO from '../components/SEO';
import VehicleCard from '../components/VehicleCard';
import LocationModal from '../components/LocationModal';
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
  startDate: string;
  endDate: string;
  driverOption: string;
  weddingHiresSpecial?: string;
  page?: string;
  locationName?: string;
}

const RADIUS_OPTIONS = [
  { value: '5', label: '5 km', desc: 'Nearby' },
  { value: '10', label: '10 km', desc: 'Local area' },
  { value: '25', label: '25 km', desc: 'Extended area' },
  { value: '50', label: '50 km', desc: 'Wide search' },
  { value: '100', label: '100 km', desc: 'Maximum range' },
];

function RadiusPicker({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const [open, setOpen] = useState(false);
  const selected = RADIUS_OPTIONS.find(o => o.value === value);

  return (
    <>
      <button
        type="button"
        className="radius-picker-trigger"
        onClick={() => setOpen(true)}
      >
        <span>{selected?.label || '10km'}</span>
        <ChevronDown size={14} />
      </button>

      {open && (
        <>
          <div className="radius-sheet-overlay" onClick={() => setOpen(false)} />
          <div className="radius-sheet">
            <div className="radius-sheet-header">
              <h3>Search Radius</h3>
              <button className="radius-sheet-close" onClick={() => setOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="radius-sheet-options">
              {RADIUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={`radius-sheet-option ${value === opt.value ? 'active' : ''}`}
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                >
                  <div className="radius-option-content">
                    <span className="radius-option-label">{opt.label}</span>
                    <span className="radius-option-desc">{opt.desc}</span>
                  </div>
                  <div className={`radius-option-radio ${value === opt.value ? 'checked' : ''}`}>
                    {value === opt.value && <div className="radius-option-radio-dot" />}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default function Explore() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const isAdminRole = user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'staff';

  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
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
    startDate: searchParams.get('startDate') || '',
    endDate: searchParams.get('endDate') || '',
    driverOption: searchParams.get('driverOption') || '',
    weddingHiresSpecial: searchParams.get('weddingHiresSpecial') || '',
  });
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 12, totalPages: 1 });
  const [isAppending, setIsAppending] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const fetchVehicles = async (overrideQuery?: string, overrideType?: string, overrideFilters?: Partial<Filters>) => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      const activeQuery = overrideQuery !== undefined ? overrideQuery : query;
      const activeType = overrideType !== undefined ? overrideType : (overrideFilters?.vehicleType ?? filters.vehicleType);
      const activeFilters = overrideFilters ? { ...filters, ...overrideFilters } : filters;

      if (activeQuery) params.q = activeQuery;
      if (activeFilters.transmission) params.transmission = activeFilters.transmission;
      if (activeFilters.minPrice) params.minPrice = activeFilters.minPrice;
      if (activeFilters.maxPrice) params.maxPrice = activeFilters.maxPrice;
      if (activeFilters.seats) params.seats = activeFilters.seats;
      if (activeType) params.vehicleType = activeType;
      if (activeFilters.lat) params.lat = activeFilters.lat;
      if (activeFilters.lng) params.lng = activeFilters.lng;
      if (activeFilters.radius) params.radius = activeFilters.radius;
      if (activeFilters.province) params.province = activeFilters.province;
      if (activeFilters.district) params.district = activeFilters.district;
      if (activeFilters.sort) params.sort = activeFilters.sort;
      if (activeFilters.startDate) params.startDate = activeFilters.startDate;
      if (activeFilters.endDate) params.endDate = activeFilters.endDate;
      if (activeFilters.driverOption) params.driverOption = activeFilters.driverOption;
      if (activeFilters.weddingHiresSpecial) params.weddingHiresSpecial = activeFilters.weddingHiresSpecial;

      const response = await vehicleApi.getAll(params);
      const vehiclesList = response.vehicles || [];
      const paginationData = response.pagination || { total: 0, page: 1, limit: 12, totalPages: 1 };

      const filteredVehicles = vehiclesList;

      if (overrideFilters?.page && parseInt(overrideFilters.page as string) > 1) {
        setVehicles(prev => [...prev, ...filteredVehicles]);
      } else {
        setVehicles(filteredVehicles);
      }
      setPagination(paginationData);
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

  const prevRadiusRef = React.useRef(filters.radius);
  useEffect(() => {
    if (filters.lat && filters.lng && prevRadiusRef.current !== filters.radius) {
      prevRadiusRef.current = filters.radius;
      fetchVehicles();
    }
    // eslint-disable-next-line
  }, [filters.radius]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchVehicles();
  };

  const clearFilters = () => {
    setFilters({
      transmission: '', minPrice: '', maxPrice: '', seats: '', vehicleType: '',
      lat: '', lng: '', radius: '10', sort: 'newest', province: '', district: '',
      startDate: '', endDate: '', driverOption: '', weddingHiresSpecial: '', locationName: ''
    });
    setQuery('');
  };

  const handleLocationSelect = (lat: string, lng: string, locationName: string) => {
    const updatedFilters = {
      ...filters,
      lat,
      lng,
      locationName,
      province: '',
      district: ''
    };
    setFilters(updatedFilters);
    setIsLocationModalOpen(false);
    fetchVehicles(undefined, undefined, updatedFilters);
  };

  const handleLoadMore = () => {
    if (pagination.page < pagination.totalPages) {
      const nextPage = pagination.page + 1;
      setIsAppending(true);
      fetchVehicles(undefined, undefined, { page: nextPage.toString() as any });
      setIsAppending(false);
    }
  };

  return (
    <div className="explore-page">
      <SEO
        title={
          filters.vehicleType && filters.district
            ? `Rent ${filters.vehicleType}s in ${filters.district} | Rentify`
            : filters.vehicleType
              ? `Rent ${filters.vehicleType}s in Sri Lanka — Self Drive & With Driver`
              : filters.district
                ? `Vehicle Rental in ${filters.district}, Sri Lanka | Rentify`
                : filters.province
                  ? `Rent Vehicles in ${filters.province} Province | Rentify`
                  : "Rent Cars, Bikes & Vans in Sri Lanka | Best Rates"
        }
        description={
          filters.vehicleType
            ? `Browse ${filters.vehicleType}s for rent across Sri Lanka. Verified owners, self-drive & with-driver options${filters.district ? ` in ${filters.district}` : ''}. Compare prices & book instantly on Rentify.lk!`
            : "Explore 100+ vehicles for rent across Sri Lanka — cars, SUVs, bikes & vans. Filter by location, price & type. Verified owners in Colombo, Kandy, Galle & more. Book today!"
        }
        keywords={`rent ${filters.vehicleType || 'vehicle'} Sri Lanka, car rental Colombo, bike rental Sri Lanka, ${filters.district ? `vehicle hire ${filters.district}, ` : ''}self drive Sri Lanka, rent van Kandy, vehicle rental near me, cheap car rental Sri Lanka`}
        canonical="/explore"
        ogTitle={
          filters.vehicleType
            ? `Rent ${filters.vehicleType}s in Sri Lanka — Rentify.lk`
            : "Explore Vehicles for Rent in Sri Lanka — Rentify.lk"
        }
        ogDescription="Browse & compare rental vehicles from verified owners across Sri Lanka. Cars, bikes, vans from LKR 3,000/day. Book instantly!"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "name": filters.vehicleType ? `${filters.vehicleType} Rentals in Sri Lanka` : "Vehicle Rentals in Sri Lanka",
          "description": "Browse and rent vehicles from verified owners across Sri Lanka",
          "url": "https://rentify.lk/explore",
          "isPartOf": {
            "@type": "WebSite",
            "name": "Rentify",
            "url": "https://rentify.lk"
          }
        }}
      />
      <section className="explore-header section-padding">
        <div className="container" style={{ position: 'relative' }}>
          <div className="explore-title-container">
            <h1 className="explore-title">Explore Vehicles for Rent in Sri Lanka</h1>
            {!user ? (
              <button onClick={() => navigate('/auth')} className="explore-list-btn d-none-mobile" style={{ border: 'none', cursor: 'pointer' }}>
                <Plus size={18} /> <span>List Vehicle</span>
              </button>
            ) : (
              <Dropdown menu={{ items: [
                { key: 'rent', label: (
                  <Link to={(user?.rentVerificationStatus === 'approved' || user?.verificationStatus === 'approved') || isAdminRole ? "/list-vehicle" : "/verify?type=rent"} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '6px 4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', background: '#f0fdf4', color: '#16a34a', borderRadius: '10px' }}>
                      {(user?.rentVerificationStatus === 'approved' || user?.verificationStatus === 'approved') || isAdminRole ? <Car size={18} /> : <Lock size={18} />}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 600, fontSize: '15px', color: '#1e293b', lineHeight: 1.2 }}>List for Rent</span>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>Earn money by renting</span>
                    </div>
                  </Link>
                ) },
                { type: 'divider' },
                { key: 'sale', label: (
                  <Link to={(user?.salesVerificationStatus === 'approved' || user?.verificationStatus === 'approved') || isAdminRole ? "/staff?tab=manage-sales&openAdd=true" : "/verify?type=sales"} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '6px 4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', background: '#eff6ff', color: '#2563eb', borderRadius: '10px' }}>
                      {(user?.salesVerificationStatus === 'approved' || user?.verificationStatus === 'approved') || isAdminRole ? <Tag size={18} /> : <Lock size={18} />}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 600, fontSize: '15px', color: '#1e293b', lineHeight: 1.2 }}>List for Sale</span>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>Sell on the marketplace</span>
                    </div>
                  </Link>
                ) }
              ] }} trigger={['click']} placement="bottomRight" overlayStyle={{ minWidth: '220px', padding: '4px' }}>
                <button className="explore-list-btn d-none-mobile" style={{ border: 'none', cursor: 'pointer' }}>
                  <Plus size={18} /> <span>List Vehicle</span>
                </button>
              </Dropdown>
            )}
          </div>
          <p className="explore-subtitle">Find the perfect vehicle for your journey</p>

          <div className="explore-controls-container">
            <div className="explore-search-row">
              <form onSubmit={handleSearch} className="explore-search">
                <div className="explore-search-inner">
                  <Search size={18} className="explore-search-icon" />
                  <input
                    type="text"
                    placeholder="Search by name, model..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="explore-search-input"
                  />
                  <div className="search-date-picker d-none-mobile">
                    <RangePicker
                      variant="borderless"
                      placeholder={['Start Date', 'End Date']}
                      style={{ width: '230px' }}
                      onChange={(dates) => {
                        if (dates) {
                          setFilters({
                            ...filters,
                            startDate: dates[0]?.toISOString() || '',
                            endDate: dates[1]?.toISOString() || ''
                          });
                        } else {
                          setFilters({ ...filters, startDate: '', endDate: '' });
                        }
                      }}
                      disabledDate={(current) => current && current < dayjs().startOf('day')}
                    />
                  </div>
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
                  onClick={() => setIsLocationModalOpen(true)}
                  title="Set Location"
                >
                  <Locate size={14} />
                  <span className="quick-locate-text">
                    {filters.locationName || 'Set Location'}
                  </span>
                </button>
                {isMobile ? (
                  <RadiusPicker
                    value={filters.radius}
                    onChange={(val) => setFilters({ ...filters, radius: val })}
                  />
                ) : (
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
                )}
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
                <label>Vehicle Type(s)</label>
                <Select
                  mode="multiple"
                  allowClear
                  placeholder="Select Types"
                  style={{ width: '100%' }}
                  value={filters.vehicleType ? filters.vehicleType.split(',').filter(Boolean) : []}
                  onChange={(values: string[]) => setFilters({ ...filters, vehicleType: values.join(',') })}
                  options={[
                    { value: 'Car', label: 'Car' },
                    { value: 'SUV', label: 'SUV' },
                    { value: 'Van', label: 'Van' },
                    { value: 'Bike', label: 'Bike' },
                    { value: 'Truck', label: 'Truck' },
                  ]}
                />
              </div>
              <div className="input-group">
                <label>Driver Option</label>
                <select
                  className="input-field"
                  value={filters.driverOption}
                  onChange={(e) => setFilters({ ...filters, driverOption: e.target.value })}
                >
                  <option value="">Any</option>
                  <option value="self-drive">Self Drive</option>
                  <option value="with-driver">With Driver</option>
                </select>
              </div>
              <div className="input-group">
                <label>Wedding Special</label>
                <select
                  className="input-field"
                  value={filters.weddingHiresSpecial}
                  onChange={(e) => setFilters({ ...filters, weddingHiresSpecial: e.target.value })}
                >
                  <option value="">Any</option>
                  <option value="true">💍 Wedding Special Only</option>
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
              {isMobile ? (
                <>
                  <div className="input-group">
                    <label>Start Date</label>
                    <input
                      type="date"
                      className="input-field"
                      value={filters.startDate ? dayjs(filters.startDate).format('YYYY-MM-DD') : ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFilters({ ...filters, startDate: val ? new Date(val).toISOString() : '' });
                      }}
                      min={dayjs().format('YYYY-MM-DD')}
                    />
                  </div>
                  <div className="input-group">
                    <label>End Date</label>
                    <input
                      type="date"
                      className="input-field"
                      value={filters.endDate ? dayjs(filters.endDate).format('YYYY-MM-DD') : ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFilters({ ...filters, endDate: val ? new Date(val).toISOString() : '' });
                      }}
                      min={filters.startDate ? dayjs(filters.startDate).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD')}
                    />
                  </div>
                </>
              ) : (
                <div className="input-group">
                  <label>Travel Dates</label>
                  <RangePicker
                    style={{ width: '100%', height: '42px', borderRadius: '8px' }}
                    value={filters.startDate && filters.endDate ? [dayjs(filters.startDate), dayjs(filters.endDate)] : null}
                    onChange={(dates) => {
                      if (dates) {
                        setFilters({
                          ...filters,
                          startDate: dates[0]?.toISOString() || '',
                          endDate: dates[1]?.toISOString() || ''
                        });
                      } else {
                        setFilters({ ...filters, startDate: '', endDate: '' });
                      }
                    }}
                    disabledDate={(current) => current && current < dayjs().startOf('day')}
                  />
                </div>
              )}
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
                  <VehicleCard vehicle={vehicle} />
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

          {pagination.page < pagination.totalPages && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '3rem' }}>
              <button
                onClick={handleLoadMore}
                className="btn btn-secondary"
                disabled={loading}
                style={{ minWidth: '160px' }}
              >
                {loading ? <span className="spinner" /> : 'Load More Vehicles'}
              </button>
            </div>
          )}
        </div>
      </section>

      <LocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        onSelect={handleLocationSelect}
      />
    </div>
  );
}
