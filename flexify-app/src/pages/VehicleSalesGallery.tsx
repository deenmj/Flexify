import React, { useEffect, useState } from 'react';
import { Row, Col, Typography, Badge, Spin, Result, Button, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { salesApi, userApi, getImageUrl } from '../api';
import { useAuth } from '../context/AuthContext';
import { Heart, Share2, Activity, Settings, Calendar, Fuel } from 'lucide-react';

const { Title, Text } = Typography;

export default function VehicleSalesGallery() {
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const { user, setUser } = useAuth();
  
  useEffect(() => {
    const fetchSales = async () => {
      try {
        const data = await salesApi.getActiveSales();
        setSales(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load vehicle sales');
      } finally {
        setLoading(false);
      }
    };
    fetchSales();
  }, []);

  const isVehicleSaved = (vehicleId: string) => {
    return user?.saleWishlist?.some((item: any) => 
      (typeof item === 'string' ? item : item._id) === vehicleId
    ) || false;
  };

  const handleToggleWishlist = async (e: React.MouseEvent, saleId: string) => {
    e.stopPropagation();
    if (!user) {
      message.info('Please log in to save vehicles to your wishlist.');
      navigate('/login');
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
    e.stopPropagation();
    const url = `${window.location.origin}/buy/${saleId}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Check out this vehicle on Rentify',
          url: url
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      navigator.clipboard.writeText(url);
      message.success('Link copied to clipboard!');
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
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px 60px' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <Title level={2} style={{ color: '#0f172a', fontWeight: 700, margin: 0 }}>Vehicle Sales Marketplace</Title>
        <Text type="secondary" style={{ fontSize: '1.1rem' }}>Browse our exclusive selection of vehicles available for purchase.</Text>
      </div>

      {sales.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Text type="secondary">No vehicles are currently listed for sale. Check back soon!</Text>
        </div>
      ) : (
        <>
          <style>{`
            .luxury-gallery-card {
              background-color: var(--bg-card);
              border-radius: var(--radius-2xl, 24px);
              border: 1px solid var(--border-color-light, #f1f5f9);
              overflow: hidden;
              box-shadow: var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.05));
              display: flex;
              flex-direction: column;
              height: 100%;
              position: relative;
              cursor: pointer;
              transition: all var(--transition-base, 0.3s ease-out);
            }
            .luxury-gallery-card:hover {
              box-shadow: var(--shadow-xl, 0 20px 25px -5px rgba(0,0,0,0.1));
              transform: translateY(-6px);
            }
          `}</style>
          <Row gutter={[24, 24]}>
          {sales.map((vehicle) => {
            const primaryImage = vehicle.images && vehicle.images.length > 0 ? getImageUrl(vehicle.images[0]) : getImageUrl();
            
            // Determine badge details
            let badgeText = null;
            let badgeColor = '';
            if (vehicle.status === 'Sold Out') {
              badgeText = 'SOLD OUT';
              badgeColor = '#ef4444'; // Red
            } else if (vehicle.status === 'New') {
              badgeText = 'NEW ARRIVAL';
              badgeColor = '#10b981'; // Green
            }

            return (
              <Col xs={24} sm={12} md={8} lg={8} key={vehicle._id}>
                <div 
                  className="luxury-gallery-card"
                  onClick={() => navigate(`/buy/${vehicle._id}`)}
                >
                  <div style={{ position: 'relative', width: '100%' }}>
                    <img 
                      src={primaryImage} 
                      alt={`${vehicle.make} ${vehicle.model}`} 
                      style={{ aspectRatio: '16/10', width: '100%', objectFit: 'cover', display: 'block' }}
                    />
                    
                    {/* Action Buttons Overlay */}
                    <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '8px', zIndex: 10 }}>
                      <button 
                        onClick={(e) => handleShare(e, vehicle._id)}
                        style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }}
                      >
                        <Share2 size={18} color="var(--text-secondary)" />
                      </button>
                      <button 
                        onClick={(e) => handleToggleWishlist(e, vehicle._id)}
                        style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }}
                      >
                        {isVehicleSaved(vehicle._id) ? (
                          <Heart size={18} color="#ef4444" fill="#ef4444" />
                        ) : (
                          <Heart size={18} color="var(--text-secondary)" />
                        )}
                      </button>
                    </div>

                    {badgeText && (
                      <div 
                        style={{ 
                          position: 'absolute', top: '12px', left: '12px', color: '#fff', padding: '4px 12px', 
                          borderRadius: '20px', fontWeight: 'bold', fontSize: '10px', letterSpacing: '1px', 
                          boxShadow: 'var(--shadow-sm)', backgroundColor: badgeColor 
                        }}
                      >
                        {badgeText}
                      </div>
                    )}
                  </div>
                  
                  <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                    <Text type="secondary" style={{ fontSize: '12px', fontWeight: 700, marginBottom: '4px', display: 'block' }}>
                      {vehicle.year}
                    </Text>
                    <Title level={4} style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {vehicle.make} {vehicle.model}
                    </Title>
                    
                    {/* Specs Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Activity size={14} color="var(--text-tertiary)" />
                        <Text type="secondary" style={{ fontSize: '12px', fontWeight: 500 }}>{vehicle.mileage.toLocaleString()} km</Text>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Settings size={14} color="var(--text-tertiary)" />
                        <Text type="secondary" style={{ fontSize: '12px', fontWeight: 500 }}>{vehicle.transmission}</Text>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Fuel size={14} color="var(--text-tertiary)" />
                        <Text type="secondary" style={{ fontSize: '12px', fontWeight: 500 }}>{vehicle.fuelType}</Text>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Calendar size={14} color="var(--text-tertiary)" />
                        <Text type="secondary" style={{ fontSize: '12px', fontWeight: 500 }}>{vehicle.condition}</Text>
                      </div>
                    </div>
                    
                    <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color-light)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: '18px', fontWeight: 900, color: 'var(--text-primary)' }}>
                        Rs. {vehicle.askingPrice.toLocaleString()}
                      </Text>
                      <Text type="secondary" style={{ fontSize: '11px', fontWeight: 600 }}>
                        {vehicle.isNegotiable ? 'Negotiable' : 'Fixed'}
                      </Text>
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
  );
}
