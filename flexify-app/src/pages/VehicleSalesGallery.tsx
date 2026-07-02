import React, { useEffect, useState } from 'react';
import { Row, Col, Typography, Badge, Spin, Result } from 'antd';
import { useNavigate } from 'react-router-dom';
import { salesApi, getImageUrl } from '../api';

const { Title, Text } = Typography;

export default function VehicleSalesGallery() {
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

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
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '120px 20px 60px' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <Title level={2} style={{ color: '#0f172a', fontWeight: 700, margin: 0 }}>Vehicle Sales Marketplace</Title>
        <Text type="secondary" style={{ fontSize: '1.1rem' }}>Browse our exclusive selection of vehicles available for purchase.</Text>
      </div>

      {sales.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Text type="secondary">No vehicles are currently listed for sale. Check back soon!</Text>
        </div>
      ) : (
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
                  className="vehicle-sale-card"
                  style={{
                    backgroundColor: '#fff',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                    cursor: 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    position: 'relative'
                  }}
                  onClick={() => navigate(`/buy/${vehicle._id}`)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
                  }}
                >
                  <div style={{ position: 'relative', paddingTop: '66.66%' }}>
                    <img 
                      src={primaryImage} 
                      alt={`${vehicle.make} ${vehicle.model}`} 
                      style={{ 
                        position: 'absolute', 
                        top: 0, 
                        left: 0, 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover' 
                      }} 
                    />
                    {badgeText && (
                      <div style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        backgroundColor: badgeColor,
                        color: 'white',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        letterSpacing: '0.05em',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }}>
                        {badgeText}
                      </div>
                    )}
                  </div>
                  
                  <div style={{ padding: '20px' }}>
                    <Text type="secondary" style={{ fontSize: '0.85rem', fontWeight: 600 }}>{vehicle.year}</Text>
                    <Title level={4} style={{ margin: '4px 0 12px', fontSize: '1.25rem' }}>
                      {vehicle.make} {vehicle.model}
                    </Title>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                      <Text type="secondary">{vehicle.mileage.toLocaleString()} km</Text>
                      <Text type="secondary">{vehicle.transmission}</Text>
                    </div>
                    
                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
                        Rs. {vehicle.askingPrice.toLocaleString()}
                      </Text>
                      <Text type="secondary" style={{ fontSize: '0.8rem' }}>
                        {vehicle.isNegotiable ? 'Negotiable' : 'Fixed'}
                      </Text>
                    </div>
                  </div>
                </div>
              </Col>
            );
          })}
        </Row>
      )}
    </div>
  );
}
