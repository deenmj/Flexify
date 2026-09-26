import React, { useEffect, useState } from 'react';
import { Row, Col, Typography, Spin, Result, Button, message, Input, Select, Drawer } from 'antd';
import { useNavigate } from 'react-router-dom';
import { salesApi, userApi, getImageUrl } from '../api';
import { useAuth } from '../context/AuthContext';
import { Heart, Share2, Activity, Settings, Calendar, Fuel, Filter, MapPin } from 'lucide-react';
import '../components/VehicleCard.css';
import './Explore.css';

const { Title, Text } = Typography;

export default function VehicleSalesGallery() {
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [filters, setFilters] = useState({
    minPrice: undefined as number | undefined,
    maxPrice: undefined as number | undefined,
    location: '',
    condition: '',
    transmission: '',
    datePublished: ''
  });
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const navigate = useNavigate();

  const { user, setUser } = useAuth();
  
  useEffect(() => {
    const fetchSales = async () => {
      setLoading(true);
      try {
        const data = await salesApi.getActiveSales({
          search: searchTerm,
          category: selectedCategory === 'All' ? undefined : selectedCategory,
          minPrice: filters.minPrice,
          maxPrice: filters.maxPrice,
          location: filters.location || undefined,
          condition: filters.condition || undefined,
          transmission: filters.transmission || undefined,
          datePublished: filters.datePublished || undefined
        });
        setSales(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load vehicle sales');
      } finally {
        setLoading(false);
      }
    };
    
    const timeoutId = setTimeout(() => {
      fetchSales();
    }, 500); // Debounce search
    
    return () => clearTimeout(timeoutId);
  }, [searchTerm, selectedCategory, filters]);

  const isVehicleSaved = (vehicleId: string) => {
    return user?.saleWishlist?.some((item: any) => 
      (typeof item === 'string' ? item : item._id) === vehicleId
    ) || false;
  };

  const handleToggleWishlist = async (e: React.MouseEvent, saleId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      message.info('Please log in to save vehicles to your wishlist.');
      navigate('/auth');
      return;
    }
    try {
      const currentlySaved = isVehicleSaved(saleId);
      const newWishlist = currentlySaved 
        ? (user.saleWishlist || []).filter((item: any) => (typeof item === 'string' ? item : item._id) !== saleId)
        : [...(user.saleWishlist || []), saleId];
      setUser({ ...user, saleWishlist: newWishlist });

      const res = await userApi.toggleWishlistSale(saleId);
      setUser({ ...user, saleWishlist: res.saleWishlist });
      message.success(res.message);
    } catch (err: any) {
      message.error(err.message || 'Failed to update wishlist');
    }
  };

  const handleShare = async (e: React.MouseEvent, saleId: string) => {
    e.preventDefault();
    e.stopPropagation();

    const vehicle = sales.find(v => v._id === saleId);
    if (!vehicle) return;

    const shareText = `Check out this ${vehicle.year} ${vehicle.make} ${vehicle.model} for Rs. ${vehicle.askingPrice?.toLocaleString()} on Rentify!`;
    const shareUrl = `${window.location.origin}/buy/${saleId}`;

    try {
      if (vehicle.images?.[0]) {
        const imageUrl = getImageUrl(vehicle.images[0]);
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const file = new File([blob], 'vehicle-image.jpg', { type: blob.type });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `${vehicle.make} ${vehicle.model}`,
            text: shareText,
            url: shareUrl,
          });
          return;
        }
      }
      
      if (navigator.share) {
        await navigator.share({
          title: `${vehicle.make} ${vehicle.model}`,
          text: shareText,
          url: shareUrl,
        });
      } else {
        navigator.clipboard.writeText(shareUrl);
        message.success('Link copied to clipboard!');
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Spin size="large" tip="Loading Marketplace..." />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '60vh', padding: '60px 20px' }}>
        <Result status="error" title="Failed to load marketplace" subTitle={error} />
      </div>
    );
  }

  return (
    <div className="explore-page">
      <section className="explore-header section-padding">
        <div className="container" style={{ position: 'relative' }}>
          <div className="explore-title-container">
            <h1 className="explore-title">Vehicle Sales Marketplace</h1>
          </div>
          <p className="explore-subtitle">Browse our exclusive selection of vehicles available for purchase.</p>

          <div className="explore-controls-container">
            <div className="explore-search-row">
              <div className="explore-search">
                <div className="explore-search-inner">
                  <Input 
                    variant="borderless"
                    placeholder="Search for a vehicle by make, model, or title..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ flex: 1, padding: 0 }}
                  />
                  <button type="button" className="filter-toggle-btn" onClick={() => setFilterDrawerOpen(true)}>
                    <Filter size={14} />
                    Filters
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Drawer
        title="Filter Vehicles"
        placement="right"
        onClose={() => setFilterDrawerOpen(false)}
        open={filterDrawerOpen}
        width={320}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <Text strong style={{ display: 'block', marginBottom: '8px' }}>Category</Text>
            <Select
              mode="multiple"
              size="large"
              placeholder="Select Categories"
              style={{ width: '100%' }}
              value={selectedCategory && selectedCategory !== 'All' ? selectedCategory.split(',') : []}
              onChange={(values: string[]) => setSelectedCategory(values.length > 0 ? values.join(',') : 'All')}
              options={[
                { value: 'Car', label: 'Car' },
                { value: 'Van', label: 'Van' },
                { value: 'Bus', label: 'Bus' },
                { value: 'Lorry', label: 'Lorry' },
                { value: 'SUV', label: 'SUV' },
                { value: 'Bike', label: 'Bike' },
                { value: 'Three Wheeler', label: 'Three Wheeler' },
                { value: 'Other', label: 'Other' },
              ]}
            />
          </div>

          <div>
            <Text strong style={{ display: 'block', marginBottom: '8px' }}>Price Range (Rs.)</Text>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Input 
                type="number" 
                placeholder="Min" 
                value={filters.minPrice || ''}
                onChange={(e) => setFilters(f => ({ ...f, minPrice: e.target.value ? Number(e.target.value) : undefined }))}
              />
              <Input 
                type="number" 
                placeholder="Max" 
                value={filters.maxPrice || ''}
                onChange={(e) => setFilters(f => ({ ...f, maxPrice: e.target.value ? Number(e.target.value) : undefined }))}
              />
            </div>
          </div>

          <div>
            <Text strong style={{ display: 'block', marginBottom: '8px' }}>Location</Text>
            <Input 
              placeholder="e.g. Colombo, Kandy" 
              value={filters.location}
              onChange={(e) => setFilters(f => ({ ...f, location: e.target.value }))}
            />
          </div>

          <div>
            <Text strong style={{ display: 'block', marginBottom: '8px' }}>Condition</Text>
            <Select
              size="large"
              placeholder="Any Condition"
              style={{ width: '100%' }}
              allowClear
              value={filters.condition || undefined}
              onChange={(val) => setFilters(f => ({ ...f, condition: val || '' }))}
              options={[
                { value: 'New', label: 'Brand New' },
                { value: 'Used', label: 'Used' },
                { value: 'Reconditioned', label: 'Reconditioned' },
              ]}
            />
          </div>

          <div>
            <Text strong style={{ display: 'block', marginBottom: '8px' }}>Transmission</Text>
            <Select
              size="large"
              placeholder="Any Transmission"
              style={{ width: '100%' }}
              allowClear
              value={filters.transmission || undefined}
              onChange={(val) => setFilters(f => ({ ...f, transmission: val || '' }))}
              options={[
                { value: 'Automatic', label: 'Automatic' },
                { value: 'Manual', label: 'Manual' },
                { value: 'Tiptronic', label: 'Tiptronic' },
              ]}
            />
          </div>

          <div>
            <Text strong style={{ display: 'block', marginBottom: '8px' }}>Date Published</Text>
            <Select
              size="large"
              placeholder="Any Time"
              style={{ width: '100%' }}
              allowClear
              value={filters.datePublished || undefined}
              onChange={(val) => setFilters(f => ({ ...f, datePublished: val || '' }))}
              options={[
                { value: '1', label: 'Last 24 Hours' },
                { value: '7', label: 'Last 7 Days' },
                { value: '30', label: 'Last 30 Days' },
              ]}
            />
          </div>

          <Button 
            type="default" 
            block 
            onClick={() => {
              setSelectedCategory('All');
              setFilters({
                minPrice: undefined,
                maxPrice: undefined,
                location: '',
                condition: '',
                transmission: '',
                datePublished: ''
              });
            }}
          >
            Clear All Filters
          </Button>
        </div>
      </Drawer>

      <section className="explore-results section-padding">
        <div className="container">
          {sales.length === 0 ? (
            <div className="explore-empty">
              <h3>No vehicles found</h3>
              <p>Try adjusting your filters</p>
            </div>
          ) : (
            <>
              <p className="results-count">{sales.length} vehicles found for sale</p>
              <Row gutter={[16, 16]}>
              {sales.map((vehicle) => {
                const primaryImage = vehicle.images && vehicle.images.length > 0 ? getImageUrl(vehicle.images[0]) : getImageUrl();
                
                let badgeText = null;
                let badgeColor = '';
                if (vehicle.status === 'Sold Out') {
                  badgeText = 'SOLD OUT';
                  badgeColor = '#ef4444';
                } else if (vehicle.status === 'New') {
                  badgeText = 'NEW ARRIVAL';
                  badgeColor = '#10b981';
                }

                return (
                  <Col xs={12} sm={12} md={8} lg={6} key={vehicle._id}>
                    <div className="shared-vehicle-card-link" onClick={() => navigate(`/buy/${vehicle._id}`)} style={{ cursor: 'pointer' }}>
                      <div className="shared-vehicle-card card rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1.5 relative">
                        <div className="shared-vehicle-img-wrap">
                          <img 
                            src={primaryImage} 
                            alt={`${vehicle.make} ${vehicle.model}`} 
                            loading="lazy"
                            className="shared-vehicle-img"
                          />
                          
                          <button 
                            onClick={(e) => handleToggleWishlist(e, vehicle._id)}
                            style={{
                              position: 'absolute', top: '12px', right: '12px',
                              width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.9)', 
                              display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', 
                              cursor: 'pointer', zIndex: 10, boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                            }}
                          >
                            {isVehicleSaved(vehicle._id) ? (
                              <Heart size={16} color="#ef4444" fill="#ef4444" />
                            ) : (
                              <Heart size={16} color="#475569" />
                            )}
                          </button>

                          {badgeText && (
                            <div 
                              style={{ 
                                position: 'absolute', top: '12px', left: '12px', color: '#fff', padding: '4px 10px', 
                                borderRadius: '8px', fontWeight: 'bold', fontSize: '10px', letterSpacing: '0.5px', 
                                boxShadow: '0 2px 5px rgba(0,0,0,0.2)', backgroundColor: badgeColor 
                              }}
                            >
                              {badgeText}
                            </div>
                          )}
                        </div>
                        
                        <div className="shared-vehicle-body">
                          <div className="shared-vehicle-tags-row">
                            {vehicle.condition && <span className="v-card-tag">{vehicle.condition}</span>}
                            {vehicle.transmission && <span className="v-card-tag">{vehicle.transmission}</span>}
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '4px' }}>
                            <h3 className="shared-vehicle-title" title={`${vehicle.make} ${vehicle.model}`}>
                              {vehicle.make} {vehicle.model}
                            </h3>
                          </div>

                          <p className="shared-vehicle-model">{vehicle.year} {vehicle.serviceType?.[0] ? `· ${vehicle.serviceType[0]}` : ''}</p>

                          <div className="shared-vehicle-specs">
                            <span><Activity size={12} /> {vehicle.mileage?.toLocaleString()} km</span>
                            <span><Fuel size={12} /> {vehicle.fuelType}</span>
                          </div>

                          {vehicle.location && (
                            <div className="shared-vehicle-location" title={vehicle.location}>
                              <MapPin size={12} />
                              <span>{vehicle.location}</span>
                            </div>
                          )}

                          <div className="shared-vehicle-footer">
                            <div className="shared-vehicle-price-block">
                              <div className="shared-vehicle-price">
                                <span className="price-amount">LKR {vehicle.askingPrice?.toLocaleString()}</span>
                              </div>
                              <div className="driver-price-note">
                                {vehicle.isNegotiable ? 'Negotiable' : 'Fixed Price'}
                              </div>
                            </div>
                            <button className="share-btn" onClick={(e) => handleShare(e, vehicle._id)} aria-label="Share">
                              <Share2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Col>
                );
              })}
              </Row>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
