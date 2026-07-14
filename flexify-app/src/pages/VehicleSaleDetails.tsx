import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Typography, Row, Col, Button, Spin, Divider, Result, Carousel, Tag, Card, Modal, message } from 'antd';
import { ArrowLeft, MessageCircle, Calendar, Settings, Activity, Info, FileText, Phone, Heart, Share2 } from 'lucide-react';
import { salesApi, userApi, getImageUrl } from '../api';
import { useAuth } from '../context/AuthContext';

const { Title, Text, Paragraph } = Typography;

export default function VehicleSaleDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const { user, setUser } = useAuth();
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (vehicle) {
      const saved = user?.saleWishlist?.some((item: any) =>
        (typeof item === 'string' ? item : item._id) === vehicle._id
      ) || false;
      setIsSaved(saved);
    }
  }, [user?.saleWishlist, vehicle]);

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
    setIsContactModalOpen(true);
  };

  const handleToggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      message.info('Please log in to save this vehicle.');
      navigate('/login');
      return;
    }
    try {
      setIsSaved(!isSaved); // Optimistic UI update
      const res = await userApi.toggleWishlistSale(id as string);
      setUser({ ...user, saleWishlist: res.saleWishlist });
      message.success(res.message);
    } catch (err: any) {
      message.error(err.message || 'Failed to update wishlist');
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const shareText = `Check out this ${vehicle?.year} ${vehicle?.make} ${vehicle?.model} for Rs. ${vehicle?.askingPrice?.toLocaleString()} on Rentify!`;
    const shareUrl = window.location.href;

    try {
      if (vehicle?.images?.[0]) {
        // 1. Fetch the image and convert to a File object
        const imageUrl = getImageUrl(vehicle.images[0]);
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const file = new File([blob], 'vehicle-image.jpg', { type: blob.type });

        // 2. Check if the device supports sharing files
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `${vehicle?.make} ${vehicle?.model}`,
            text: shareText,
            url: shareUrl,
          });
          return;
        }
      }
      
      // Fallback for devices that support share but not files, or if no image
      if (navigator.share) {
        await navigator.share({
          title: `${vehicle?.make} ${vehicle?.model}`,
          text: shareText,
          url: shareUrl,
        });
      } else {
        // Fallback for desktop
        navigator.clipboard.writeText(shareUrl);
        message.success("Link copied to clipboard!");
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
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
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '40px 20px', backgroundColor: 'var(--bg-secondary)', minHeight: '100vh' }}>
      
      <style>{`
        .details-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 32px;
          margin-top: 24px;
        }
        .details-image { order: 1; }
        .details-sidebar { order: 2; position: relative; }
        .details-description { order: 3; }
        
        @media (min-width: 1024px) {
          .details-grid {
            grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
            align-items: start;
          }
          .details-image { grid-column: 1 / 2; grid-row: 1 / 2; order: unset; }
          .details-sidebar { 
            grid-column: 2 / 3; 
            grid-row: 1 / 3; 
            position: sticky; 
            top: 100px; 
            order: unset; 
          }
          .details-description { grid-column: 1 / 2; grid-row: 2 / 3; order: unset; }
        }

        .luxury-box {
          background-color: var(--bg-card);
          border-radius: var(--radius-2xl, 24px);
          box-shadow: var(--shadow-md, 0 4px 6px -1px rgba(0, 0, 0, 0.1));
          border: 1px solid var(--border-color-light, #f1f5f9);
          padding: 32px;
          transition: box-shadow var(--transition-base, 0.3s ease);
        }
        .luxury-box:hover {
          box-shadow: var(--shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.1));
        }
        
        .luxury-btn {
          height: 56px;
          border-radius: var(--radius-xl, 16px);
          font-weight: 700;
          font-size: 1.1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }
        
        .luxury-title {
          margin: 8px 0 0 !important;
          font-weight: 900 !important;
          color: var(--text-primary) !important;
          line-height: 1.1 !important;
          font-size: 2rem !important; /* Mobile default */
        }
        
        .luxury-price {
          font-weight: 900;
          color: var(--text-primary);
          letter-spacing: -1px;
          font-size: 1.75rem; /* Mobile default */
        }
        
        @media (min-width: 768px) {
          .luxury-title {
            font-size: 2.5rem !important;
          }
          .luxury-price {
            font-size: 2.5rem;
          }
        }
      `}</style>

      <Button
        type="link"
        icon={<ArrowLeft size={16} />}
        onClick={() => navigate('/buy')}
        style={{ color: 'var(--text-secondary)', fontWeight: 700, padding: 0, display: 'flex', alignItems: 'center' }}
      >
        Back to Marketplace
      </Button>

      <div className="details-grid">
        
        {/* 1. IMAGE GALLERY */}
        <div className="details-image luxury-box" style={{ padding: '8px', overflow: 'hidden' }}>
          <div style={{ backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-xl, 16px)', overflow: 'hidden' }}>
            {vehicle.images && vehicle.images.length > 0 ? (
              <Carousel autoplay effect="fade">
                {vehicle.images.map((img: string, index: number) => (
                  <div key={index}>
                    <img
                      src={getImageUrl(img)}
                      alt={`Vehicle view ${index + 1}`}
                      style={{ width: '100%', height: '400px', objectFit: 'cover', borderRadius: 'var(--radius-xl, 16px)' }}
                    />
                  </div>
                ))}
              </Carousel>
            ) : (
              <div style={{ width: '100%', height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
                <Info size={48} />
              </div>
            )}
          </div>
        </div>

        {/* 2. STICKY SIDEBAR */}
        <div className="details-sidebar luxury-box" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div>
            {vehicle.status === 'Sold Out' && (
              <Tag color="#ef4444" style={{ padding: '4px 12px', fontWeight: 'bold', borderRadius: '6px', marginBottom: '16px' }}>SOLD OUT</Tag>
            )}
            {vehicle.status === 'New' && (
              <Tag color="#10b981" style={{ padding: '4px 12px', fontWeight: 'bold', borderRadius: '6px', marginBottom: '16px' }}>NEW ARRIVAL</Tag>
            )}
          </div>

          <div>
             <Text type="secondary" style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
               {vehicle.year} • {vehicle.condition}
             </Text>
             <Title level={1} className="luxury-title text-2xl md:text-3xl font-bold">
               {vehicle.make} {vehicle.model}
             </Title>
             <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginTop: '16px' }}>
               <Text className="luxury-price text-2xl md:text-3xl font-bold">
                 Rs. {vehicle.askingPrice.toLocaleString()}
               </Text>
               {vehicle.isNegotiable && <Text type="secondary" style={{ fontWeight: 700 }}>(Negotiable)</Text>}
             </div>
          </div>

          {/* Action Buttons: Share & Wishlist */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '8px' }}>
             <Button
               size="large"
               icon={<Share2 size={18} />}
               onClick={handleShare}
               style={{ height: '48px', borderRadius: '12px', fontWeight: 700, color: 'var(--text-secondary)', borderColor: 'var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
             >
               Share
             </Button>
             <Button
               size="large"
               icon={<Heart size={18} fill={isSaved ? '#ef4444' : 'transparent'} color={isSaved ? '#ef4444' : 'var(--text-secondary)'} />}
               onClick={handleToggleWishlist}
               style={{ height: '48px', borderRadius: '12px', fontWeight: 700, color: 'var(--text-secondary)', borderColor: 'var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
             >
               {isSaved ? 'Saved' : 'Save'}
             </Button>
          </div>

          <Button
            type="primary"
            onClick={handleContactStaff}
            disabled={vehicle.status === 'Sold Out'}
            className="luxury-btn"
            icon={<MessageCircle size={20} />}
            style={{ 
              backgroundColor: vehicle.status === 'Sold Out' ? 'var(--text-tertiary)' : '#10b981', 
              boxShadow: 'var(--shadow-md)',
              border: 'none',
              marginTop: '8px'
            }}
          >
            {vehicle.status === 'Sold Out' ? 'Vehicle Unavailable' : 'Contact to Buy'}
          </Button>

          <div style={{ borderTop: '1px solid var(--border-color-light)', paddingTop: '24px', marginTop: '8px' }}>
             <Title level={4} style={{ fontWeight: 900, marginBottom: '20px' }}>Specifications</Title>
             
             <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
               <div style={{ display: 'flex', alignItems: 'center' }}>
                 <FileText size={20} color="var(--text-tertiary)" style={{ marginRight: '16px', flexShrink: 0 }} />
                 <div>
                   <Text style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Registration</Text>
                   <Text style={{ fontWeight: 900, color: 'var(--text-primary)', fontSize: '14px' }}>
                     {vehicle.registrationNumber ? vehicle.registrationNumber : <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic', fontWeight: 600 }}>Unregistered</span>}
                   </Text>
                 </div>
               </div>

               <div style={{ display: 'flex', alignItems: 'center' }}>
                 <Activity size={20} color="var(--text-tertiary)" style={{ marginRight: '16px', flexShrink: 0 }} />
                 <div>
                   <Text style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Mileage</Text>
                   <Text style={{ fontWeight: 900, color: 'var(--text-primary)', fontSize: '14px' }}>{vehicle.mileage.toLocaleString()} km</Text>
                 </div>
               </div>

               <div style={{ display: 'flex', alignItems: 'center' }}>
                 <Settings size={20} color="var(--text-tertiary)" style={{ marginRight: '16px', flexShrink: 0 }} />
                 <div>
                   <Text style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Transmission</Text>
                   <Text style={{ fontWeight: 900, color: 'var(--text-primary)', fontSize: '14px' }}>{vehicle.transmission}</Text>
                 </div>
               </div>

               <div style={{ display: 'flex', alignItems: 'center' }}>
                 <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid var(--text-tertiary)', marginRight: '16px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 900, color: 'var(--text-tertiary)' }}>F</div>
                 <div>
                   <Text style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Fuel Type</Text>
                   <Text style={{ fontWeight: 900, color: 'var(--text-primary)', fontSize: '14px' }}>{vehicle.fuelType}</Text>
                 </div>
               </div>
             </div>
          </div>
        </div>

        {/* 3. BOTTOM DESCRIPTION */}
        <div className="details-description luxury-box">
           <Title level={3} style={{ fontWeight: 900, marginBottom: '24px' }}>Vehicle Description</Title>
           <Paragraph style={{ whiteSpace: 'pre-wrap', fontSize: '1.05rem', lineHeight: 1.8, color: 'var(--text-secondary)', margin: 0 }}>
             {vehicle.description}
           </Paragraph>
        </div>

      </div>

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageCircle size={20} color="#10b981" />
            <span style={{ fontWeight: 'bold' }}>Contact Sales Team</span>
          </div>
        }
        open={isContactModalOpen}
        onCancel={() => setIsContactModalOpen(false)}
        footer={null}
        centered
        bodyStyle={{ padding: '32px 24px' }}
      >
        <div style={{ textAlign: 'center' }}>
          <Title level={4} style={{ marginBottom: '8px', fontWeight: 900 }}>Interested in this {vehicle.make}?</Title>
          <Text type="secondary" style={{ display: 'block', marginBottom: '32px' }}>
            Get in touch with our sales representative to learn more or schedule a viewing.
          </Text>

          <div style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '16px', marginBottom: '32px', border: '1px solid var(--border-color-light)' }}>
            <Text type="secondary" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Direct Sales Line</Text>
            <Text style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '0.5px' }}>
              {vehicle.contactNumber || '+94 112 345 678'}
            </Text>
          </div>

          <a href={`tel:${vehicle.contactNumber || '+94112345678'}`} style={{ textDecoration: 'none' }}>
            <Button
              type="primary"
              size="large"
              block
              icon={<Phone size={18} />}
              style={{ height: '56px', fontSize: '1.1rem', fontWeight: 700, backgroundColor: 'var(--bg-dark)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              Call Now
            </Button>
          </a>
        </div>
      </Modal>
    </div>
  );
}
