import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Row, Col, Button, Spin, Result, Tag, Card, Modal, message, Typography, Badge, Avatar } from 'antd';
import { MessageCircle, Settings, Activity, FileText, Phone, Heart, Share2, MapPin, Gauge, Zap, CheckCircle, Flag } from 'lucide-react';
import { salesApi, userApi, getImageUrl } from '../api';
import { useAuth } from '../context/AuthContext';
import { useIsMobile } from '../hooks/useIsMobile';
import SEO from '../components/SEO';
import './VehicleDetail.css';

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
  const isMobile = useIsMobile();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [barVisible, setBarVisible] = useState(true);
  
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    if (!isMobile) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setBarVisible(!entry.isIntersecting);
      },
      { threshold: 0.1 }
    );
    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }
    return () => observer.disconnect();
  }, [isMobile]);

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
      navigate('/auth');
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
        const imageUrl = getImageUrl(vehicle.images[0]);
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const file = new File([blob], 'vehicle-image.jpg', { type: blob.type });

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
      
      if (navigator.share) {
        await navigator.share({
          title: `${vehicle?.make} ${vehicle?.model}`,
          text: shareText,
          url: shareUrl,
        });
      } else {
        navigator.clipboard.writeText(shareUrl);
        message.success("Link copied to clipboard!");
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  if (loading) {
    return (
      <div className="vehicle-detail-page">
        <div className="container" style={{ position: 'relative', paddingTop: isMobile ? '0.75rem' : '1.5rem', paddingBottom: isMobile ? '0.5rem' : '3rem' }}>
          <Row gutter={[24, 24]}>
            <Col xs={24} lg={16}>
              <div className="detail-loading-skeleton-img skeleton" />
              <div className="detail-loading-thumbs">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="detail-loading-thumb skeleton" />
                ))}
              </div>
              <div className="card detail-loading-card">
                <div className="detail-loading-title skeleton" />
                <div className="detail-loading-subtitle skeleton" />
                <div className="detail-loading-location skeleton" />
                <div className="detail-loading-specs-grid">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="detail-loading-spec skeleton" />
                  ))}
                </div>
              </div>
            </Col>
            <Col xs={24} lg={8}>
              <div className="card detail-loading-card">
                <div className="detail-loading-price skeleton" />
                <div className="detail-loading-btn skeleton" />
              </div>
            </Col>
          </Row>
        </div>
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="container" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
        <h2>Vehicle not found</h2>
        <p>{error || 'This vehicle might have been removed or sold.'}</p>
        <button className="btn btn-primary" onClick={() => navigate('/buy')} style={{ marginTop: '1rem' }}>
          Back to Marketplace
        </button>
      </div>
    );
  }

  const displayImages = (vehicle.images && vehicle.images.length > 0) ? vehicle.images : [null];

  return (
    <div className="vehicle-detail-page">
      <SEO
        title={`${vehicle.year} ${vehicle.make} ${vehicle.model} for Sale | Rentify`}
        description={`Buy ${vehicle.make} ${vehicle.model} (${vehicle.year}). ${vehicle.condition} condition, ${vehicle.transmission}. Price: Rs. ${vehicle.askingPrice?.toLocaleString()}. Find your next vehicle on Rentify.`}
        canonical={`/buy/${vehicle._id}`}
      />
      
      <div className="container" style={{ position: 'relative', paddingTop: isMobile ? '0.75rem' : '1.5rem', paddingBottom: '3rem' }}>
        
        {/* Back Button */}
        <div style={{ marginBottom: '1rem' }}>
           <Button
             type="link"
             onClick={() => navigate('/buy')}
             style={{ color: 'var(--text-secondary)', fontWeight: 700, padding: 0, display: 'flex', alignItems: 'center' }}
           >
             ← Back to Marketplace
           </Button>
        </div>

        <Row gutter={[24, 24]}>
          {/* LEFT COLUMN: Main Content */}
          <Col xs={24} lg={16}>
            <div className="detail-carousel-container">
              <div
                className="detail-main-gallery"
                ref={scrollContainerRef}
                onScroll={(e) => {
                  const scrollLeft = e.currentTarget.scrollLeft;
                  const width = e.currentTarget.clientWidth;
                  const newIndex = Math.round(scrollLeft / width);
                  if (newIndex !== activeImage && newIndex >= 0 && newIndex < displayImages.length) {
                    setActiveImage(newIndex);
                  }
                }}
              >
                {displayImages.map((img: string, idx: number) => (
                  <img
                    key={idx}
                    src={getImageUrl(img)}
                    alt={`${vehicle.make} ${vehicle.model} - Image ${idx + 1}`}
                    loading={idx === 0 ? "eager" : "lazy"}
                    className="detail-main-img-item"
                    onClick={() => setActiveImage(idx)}
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542367597-87b9a3b9d8a6?auto=format&fit=crop&w=1200&q=80'; }}
                  />
                ))}
              </div>

              {/* Dots for Mobile */}
              {displayImages.length > 1 && (
                <div className="detail-gallery-dots mobile-only">
                  {displayImages.map((_: any, idx: number) => (
                    <div key={idx} className={`gallery-dot ${activeImage === idx ? 'active' : ''}`} />
                  ))}
                </div>
              )}

              {/* Thumbnails for Desktop */}
              {displayImages.length > 1 && (
                <div className="detail-thumbnails desktop-only">
                  {displayImages.map((img: string, idx: number) => (
                    <img
                      key={idx}
                      src={getImageUrl(img)}
                      alt={`Thumbnail ${idx}`}
                      className={`detail-thumb ${activeImage === idx ? 'active' : ''}`}
                      onClick={() => {
                        setActiveImage(idx);
                        if (scrollContainerRef.current) {
                          scrollContainerRef.current.scrollTo({ left: scrollContainerRef.current.clientWidth * idx, behavior: 'smooth' });
                        }
                      }}
                      onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542367597-87b9a3b9d8a6?auto=format&fit=crop&w=200&q=60'; }}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="detail-overview card" style={{ marginTop: '1.5rem', padding: isMobile ? '1.25rem' : '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <h1 className="detail-title" style={{ fontSize: isMobile ? '1.4rem' : '2.5rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1.1, margin: 0 }}>
                      {vehicle.make} {vehicle.model}
                    </h1>
                    {/* Share Button inline with title */}
                    <button
                      onClick={handleShare}
                      title="Share this listing"
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        background: 'var(--bg-secondary, #f8fafc)', border: '1px solid var(--border-color-light, #e2e8f0)',
                        borderRadius: '10px', padding: '6px 12px', cursor: 'pointer',
                        fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)',
                        transition: 'all 0.2s', flexShrink: 0,
                      }}
                    >
                      <Share2 size={14} />
                      <span className="d-none-mobile">Share</span>
                    </button>
                    {/* Save Button */}
                    <button
                      onClick={handleToggleWishlist}
                      title="Save this listing"
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        background: 'var(--bg-secondary, #f8fafc)', border: '1px solid var(--border-color-light, #e2e8f0)',
                        borderRadius: '10px', padding: '6px 12px', cursor: 'pointer',
                        fontSize: '0.8rem', fontWeight: 600, color: isSaved ? '#ef4444' : 'var(--text-secondary)',
                        transition: 'all 0.2s', flexShrink: 0,
                      }}
                    >
                      <Heart size={14} fill={isSaved ? '#ef4444' : 'transparent'} />
                      <span className="d-none-mobile">{isSaved ? 'Saved' : 'Save'}</span>
                    </button>
                  </div>
                  <p className="detail-subtitle" style={{ fontSize: isMobile ? '0.85rem' : '1rem', color: 'var(--text-secondary)', marginTop: '0.5rem', fontWeight: 500 }}>
                    {vehicle.year} · {vehicle.condition}
                  </p>
                </div>
              </div>

              {isMobile && (
                <div className="mobile-inline-price">
                  <div className="mobile-inline-price-main">
                    <span className="mobile-inline-currency">LKR</span>
                    <span className="mobile-inline-amount">{vehicle.askingPrice?.toLocaleString()}</span>
                  </div>
                  <div className="mobile-inline-price-tiers">
                    <span className="mobile-inline-tier">{vehicle.isNegotiable ? 'Negotiable' : 'Fixed Price'}</span>
                  </div>
                </div>
              )}

              {vehicle.status === 'Sold Out' && (
                <div style={{ marginTop: '1rem' }}>
                  <Tag color="#ef4444" style={{ padding: '4px 12px', fontWeight: 'bold', borderRadius: '6px' }}>SOLD OUT</Tag>
                </div>
              )}
              {vehicle.status === 'New' && (
                <div style={{ marginTop: '1rem' }}>
                  <Tag color="#10b981" style={{ padding: '4px 12px', fontWeight: 'bold', borderRadius: '6px' }}>NEW ARRIVAL</Tag>
                </div>
              )}

              {vehicle.description && (
                <>
                  <h3 className="section-title-minor" style={{ marginTop: '2rem' }}>Vehicle Description</h3>
                  <p className="detail-desc" style={{ marginTop: '0.75rem', fontSize: '1rem', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
                    {vehicle.description}
                  </p>
                </>
              )}

              <h3 className="section-title-minor" style={{ marginTop: '2.5rem', fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)', borderLeft: '4px solid var(--primary-color)', paddingLeft: '12px' }}>
                Technical Specifications
              </h3>
              
              <div className="detail-specs-grid" style={{ marginTop: '1.25rem' }}>
                <div className="spec-item">
                  <span className="spec-label">Transmission</span>
                  <span className="spec-value">
                    <Settings size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                    {vehicle.transmission}
                  </span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Fuel Type</span>
                  <span className="spec-value">{vehicle.fuelType}</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Mileage</span>
                  <span className="spec-value">
                    <Activity size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                    {vehicle.mileage?.toLocaleString()} km
                  </span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Registration</span>
                  <span className="spec-value">
                    {vehicle.registrationNumber ? vehicle.registrationNumber : <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic', fontWeight: 600, fontSize: '0.9rem' }}>Unregistered</span>}
                  </span>
                </div>
              </div>
            </div>
          </Col>

          {/* RIGHT COLUMN: Sidebar (Booking & Owner) */}
          <Col xs={24} lg={8}>
            <div className="detail-sidebar">
              <div className="booking-panel card">
                <div className="pricing-card">
                  <div className="pricing-card-main" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>
                    <div className="pricing-main-amount">
                      <span className="pricing-currency">LKR</span>
                      <span className="pricing-value">{vehicle.askingPrice?.toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <div className="pricing-tiers" style={{ marginTop: '1rem' }}>
                    <div className="pricing-tier-item">
                      <div className="pricing-tier-icon" style={{ background: vehicle.isNegotiable ? '#f0fdf4' : '#f8fafc', color: vehicle.isNegotiable ? '#16a34a' : '#64748b' }}>
                         <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                      </div>
                      <div className="pricing-tier-info">
                        <span className="pricing-tier-amount">{vehicle.isNegotiable ? 'Negotiable' : 'Fixed Price'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem' }}>
                  <button
                    className="btn btn-full"
                    onClick={handleContactStaff}
                    disabled={vehicle.status === 'Sold Out'}
                    style={{ 
                      height: '54px', fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', 
                      background: vehicle.status === 'Sold Out' ? 'var(--text-tertiary)' : 'linear-gradient(135deg, #10b981, #059669)', 
                      color: 'white', border: 'none', borderRadius: '12px', 
                      boxShadow: vehicle.status === 'Sold Out' ? 'none' : '0 4px 14px rgba(16,185,129,0.35)', 
                      transition: 'all 0.2s' 
                    }}
                  >
                    <MessageCircle size={20} /> {vehicle.status === 'Sold Out' ? 'Vehicle Unavailable' : 'Contact Sales Team'}
                  </button>
                </div>
              </div>

              <Card className="owner-panel" bordered={false} bodyStyle={{ padding: '1.25rem' }} style={{ marginTop: '1rem', borderRadius: '12px', border: '1px solid var(--border-color-light)' }}>
                <h3 style={{ marginBottom: '1.25rem', fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Listed By</h3>
                <div className="owner-profile-preview">
                  <Badge
                    count={<CheckCircle size={14} style={{ color: '#10b981', background: '#fff', borderRadius: '50%' }} />}
                    offset={[-4, 44]}
                  >
                    <Avatar
                      src={'https://ui-avatars.com/api/?name=Rentify+Sales&background=e2e8f0'}
                      size={54}
                      style={{ border: '2px solid var(--primary-color)' }}
                    />
                  </Badge>
                  <div className="owner-info-text">
                    <strong style={{ fontSize: '1rem' }}>Rentify Verified Sales</strong>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>Direct from Platform</span>
                  </div>
                </div>
              </Card>
            </div>
          </Col>
        </Row>

        {/* Sentinel for hiding floating bar */}
        <div ref={sentinelRef} style={{ height: '1px', marginTop: isMobile ? '0.5rem' : '2rem' }}></div>
      </div>

      {/* MOBILE STICKY CONTACT BAR */}
      {isMobile && (
        <div className={`mobile-booking-bar animate-slide-up ${!barVisible ? 'mobile-booking-bar-hidden' : ''}`} style={{ padding: '0.75rem 1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div className="mobile-bar-price" style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column' }}>
            <span className="bar-amount" style={{ fontSize: '1.1rem' }}>LKR {vehicle.askingPrice?.toLocaleString()}</span>
          </div>
          <div style={{ flex: 1, display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button
              className="btn btn-full"
              onClick={handleContactStaff}
              disabled={vehicle.status === 'Sold Out'}
              style={{ height: '44px', padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: vehicle.status === 'Sold Out' ? 'var(--text-tertiary)' : 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 700 }}
            >
              <MessageCircle size={18} />
              <span>Contact</span>
            </button>
            <button
              onClick={handleShare}
              style={{ height: '44px', width: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', color: '#334155', border: '2px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer', flexShrink: 0 }}
            >
              <Share2 size={18} />
            </button>
          </div>
        </div>
      )}

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
          <Typography.Title level={4} style={{ marginBottom: '8px', fontWeight: 900 }}>Interested in this {vehicle.make}?</Typography.Title>
          <Typography.Text type="secondary" style={{ display: 'block', marginBottom: '32px' }}>
            Get in touch with our sales representative to learn more or schedule a viewing.
          </Typography.Text>

          <div style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '16px', marginBottom: '32px', border: '1px solid var(--border-color-light)' }}>
            <Typography.Text type="secondary" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Direct Sales Line</Typography.Text>
            <Typography.Text style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '0.5px' }}>
              {vehicle.contactNumber || '+94 112 345 678'}
            </Typography.Text>
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
