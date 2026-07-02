import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Typography, Row, Col, Button, Spin, Divider, Result, Carousel, Tag, Card } from 'antd';
import { ArrowLeft, MessageCircle, Calendar, Settings, Activity, Info } from 'lucide-react';
import { salesApi, getImageUrl } from '../api';

const { Title, Text, Paragraph } = Typography;

export default function VehicleSaleDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchVehicleDetails = async () => {
      try {
        if (!id) return;
        const data = await salesApi.getSaleById(id);
        setVehicle(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load vehicle details');
      } finally {
        setLoading(false);
      }
    };
    fetchVehicleDetails();
  }, [id]);

  const handleContactStaff = () => {
    if (!vehicle || !vehicle.assignedStaff) return;
    
    const staffPhone = vehicle.assignedStaff.phone || '+94000000000';
    // Format phone number to international format without + or leading zeros if necessary
    const formattedPhone = staffPhone.replace(/[^0-9]/g, '');
    
    const message = `Hi ${vehicle.assignedStaff.name}, I'm interested in purchasing the ${vehicle.year} ${vehicle.make} ${vehicle.model} (Reg: ${vehicle.registrationNumber}) listed on the Rentify Marketplace.`;
    
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Spin size="large" tip="Loading vehicle details..." />
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div style={{ minHeight: '60vh', padding: '60px 20px' }}>
        <Result
          status="404"
          title="Vehicle Not Found"
          subTitle={error || 'This vehicle might have been removed or sold.'}
          extra={<Button type="primary" onClick={() => navigate('/buy')}>Back to Marketplace</Button>}
        />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '100px 20px 60px' }}>
      <Button 
        type="link" 
        icon={<ArrowLeft size={16} />} 
        onClick={() => navigate('/buy')}
        style={{ paddingLeft: 0, marginBottom: '20px', color: '#64748b' }}
      >
        Back to Marketplace
      </Button>

      <Row gutter={[32, 32]}>
        {/* Left Column - Images & Details */}
        <Col xs={24} lg={16}>
          {/* Image Carousel */}
          <div style={{ borderRadius: '12px', overflow: 'hidden', backgroundColor: '#f1f5f9', marginBottom: '32px' }}>
            {vehicle.images && vehicle.images.length > 0 ? (
              <Carousel autoplay effect="fade">
                {vehicle.images.map((img: string, index: number) => (
                  <div key={index}>
                    <img 
                      src={getImageUrl(img)} 
                      alt={`Vehicle view ${index + 1}`} 
                      style={{ width: '100%', height: '500px', objectFit: 'cover' }} 
                    />
                  </div>
                ))}
              </Carousel>
            ) : (
              <div style={{ width: '100%', height: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}>
                <Info size={48} />
              </div>
            )}
          </div>

          <Title level={3} style={{ marginBottom: '16px' }}>Vehicle Description</Title>
          <Card bordered={false} style={{ borderRadius: '12px', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Paragraph style={{ whiteSpace: 'pre-wrap', fontSize: '1.05rem', lineHeight: '1.8' }}>
              {vehicle.description}
            </Paragraph>
          </Card>
        </Col>

        {/* Right Column - Pricing & Specs */}
        <Col xs={24} lg={8}>
          <div style={{ position: 'sticky', top: '100px' }}>
            <Card bordered={false} style={{ borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
              
              {vehicle.status === 'Sold Out' && (
                <Tag color="red" style={{ padding: '4px 12px', fontSize: '1rem', marginBottom: '16px', fontWeight: 600 }}>SOLD OUT</Tag>
              )}
              {vehicle.status === 'New' && (
                <Tag color="green" style={{ padding: '4px 12px', fontSize: '1rem', marginBottom: '16px', fontWeight: 600 }}>NEW ARRIVAL</Tag>
              )}

              <Text type="secondary" style={{ fontSize: '1.1rem', fontWeight: 600 }}>{vehicle.year}</Text>
              <Title level={2} style={{ margin: '4px 0 16px' }}>{vehicle.make} {vehicle.model}</Title>
              
              <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '24px' }}>
                <Text style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a' }}>
                  Rs. {vehicle.askingPrice.toLocaleString()}
                </Text>
                {vehicle.isNegotiable && <Text type="secondary" style={{ marginLeft: '12px' }}>(Negotiable)</Text>}
              </div>

              <Button 
                type="primary" 
                size="large" 
                block 
                icon={<MessageCircle size={20} />} 
                onClick={handleContactStaff}
                style={{ 
                  height: '54px', 
                  fontSize: '1.1rem', 
                  fontWeight: 600, 
                  backgroundColor: '#25D366', // WhatsApp Green
                  borderColor: '#25D366',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '32px'
                }}
                disabled={vehicle.status === 'Sold Out'}
              >
                {vehicle.status === 'Sold Out' ? 'Vehicle Unavailable' : 'Contact to Buy'}
              </Button>

              <Divider orientation="left" style={{ margin: '16px 0' }}>Specifications</Divider>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <Activity size={20} color="#64748b" style={{ marginRight: '16px' }} />
                  <div>
                    <Text type="secondary" style={{ display: 'block', fontSize: '0.85rem' }}>Mileage</Text>
                    <Text style={{ fontWeight: 600 }}>{vehicle.mileage.toLocaleString()} km</Text>
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <Settings size={20} color="#64748b" style={{ marginRight: '16px' }} />
                  <div>
                    <Text type="secondary" style={{ display: 'block', fontSize: '0.85rem' }}>Transmission</Text>
                    <Text style={{ fontWeight: 600 }}>{vehicle.transmission}</Text>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ 
                    width: '20px', height: '20px', borderRadius: '50%', border: '2px solid #64748b', 
                    marginRight: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    fontSize: '10px', color: '#64748b', fontWeight: 'bold' 
                  }}>F</div>
                  <div>
                    <Text type="secondary" style={{ display: 'block', fontSize: '0.85rem' }}>Fuel Type</Text>
                    <Text style={{ fontWeight: 600 }}>{vehicle.fuelType}</Text>
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <Calendar size={20} color="#64748b" style={{ marginRight: '16px' }} />
                  <div>
                    <Text type="secondary" style={{ display: 'block', fontSize: '0.85rem' }}>Condition</Text>
                    <Text style={{ fontWeight: 600 }}>{vehicle.condition}</Text>
                  </div>
                </div>
              </div>

            </Card>
          </div>
        </Col>
      </Row>
    </div>
  );
}
