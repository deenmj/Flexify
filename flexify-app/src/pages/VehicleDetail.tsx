import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Row, Col, Modal, message, Avatar, Card, Badge, Tag, Input, Button } from 'antd';
import { vehicleApi, feedbackApi, type Vehicle, getImageUrl, getVehicleSlug } from '../api';
import { Users, CheckCircle, Phone, Shield, Gauge, MapPin, Flag, ChevronLeft, ChevronRight, Share2, X, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useIsMobile } from '../hooks/useIsMobile';
import SEO from '../components/SEO';
import './VehicleDetail.css';

// WhatsApp SVG logo component
const WhatsAppIcon = ({ size = 20 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="white">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);


export default function VehicleDetail() {
  const { id: slugOrId } = useParams<{ id: string }>();
  const id = slugOrId?.includes('--') ? slugOrId.split('--').pop() : slugOrId;
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [barVisible, setBarVisible] = useState(true);

  // Intersection Observer for sticky bar
  useEffect(() => {
    if (!isMobile) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // If sentinel is visible, it means we reached the bottom (footer area)
        setBarVisible(!entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => observer.disconnect();
  }, [isMobile]);

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // active carousel image
  const [activeImage, setActiveImage] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);

  // Reporting
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchVehicle = async () => {
      try {
        const data = await vehicleApi.getById(id);
        setVehicle(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load vehicle');
      } finally {
        setLoading(false);
      }
    };
    fetchVehicle();
  }, [id]);

  // Remove availability & reviews fetch

  // Auto-complete pending booking moved to Auth.tsx and VerifyUser.tsx

  const handleContactClick = async (type: 'call' | 'whatsapp') => {
    if (!user) {
      navigate('/auth', { state: { returnTo: `/vehicles/${id}` } });
      return;
    }
    
    // Track click asynchronously
    try {
      await vehicleApi.trackContactClick(id!, type);
    } catch (err) {
      console.error('Failed to track contact click', err);
    }
    
    // Proceed with action
    const ownerObj = typeof vehicle?.owner === 'object' ? vehicle?.owner as any : null;
    const phone = vehicle?.mobileNumber || ownerObj?.phone || '';
    if (!phone) {
      message.error('Contact number not available');
      return;
    }

    if (type === 'call') {
      window.location.href = `tel:${phone}`;
    } else {
      const cleanPhone = phone.replace(/[^0-9]/g, '').replace(/^0/, '94');
      const text = encodeURIComponent(`Hi, I'm interested in your ${vehicle?.make} ${vehicle?.model} listed on Rentify.`);
      window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
    }
  };

  const handleReportSubmit = async () => {
    if (!reportReason.trim()) {
      return message.error('Please provide a reason for reporting');
    }
    setReportLoading(true);
    try {
      await feedbackApi.submit({
        type: 'general',
        message: `[REPORT] User reported Vehicle ID: ${id}\nReason: ${reportReason}`
      });
      message.success('Listing reported. Our team will review it shortly.');
      setShowReportModal(false);
      setReportReason('');
    } catch (err: any) {
      message.error(err.message || 'Failed to submit report');
    } finally {
      setReportLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="vehicle-detail-page">
        <div className="container" style={{ position: 'relative', paddingTop: isMobile ? '0.75rem' : '1.5rem', paddingBottom: isMobile ? '0.5rem' : '3rem' }}>
          <Row gutter={[24, 24]}>
            <Col xs={24} lg={16}>
              {/* Image skeleton */}
              <div className="detail-loading-skeleton-img skeleton" />
              {/* Thumbnails skeleton */}
              <div className="detail-loading-thumbs">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="detail-loading-thumb skeleton" />
                ))}
              </div>
              {/* Overview card skeleton */}
              <div className="card detail-loading-card">
                <div className="detail-loading-title skeleton" />
                <div className="detail-loading-subtitle skeleton" />
                <div className="detail-loading-location skeleton" />
                {/* Specs grid skeleton */}
                <div className="detail-loading-specs-grid">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="detail-loading-spec skeleton" />
                  ))}
                </div>
                {/* Features skeleton */}
                <div className="detail-loading-features">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="detail-loading-feature-tag skeleton" />
                  ))}
                </div>
              </div>
            </Col>
            <Col xs={24} lg={8}>
              {/* Booking panel skeleton */}
              <div className="card detail-loading-card">
                <div className="detail-loading-price skeleton" />
                <div className="detail-loading-btn skeleton" />
                <div className="detail-loading-perks">
                  <div className="detail-loading-perk skeleton" />
                  <div className="detail-loading-perk skeleton" />
                </div>
              </div>
              {/* Owner panel skeleton */}
              <div className="card detail-loading-card" style={{ marginTop: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div className="detail-loading-avatar skeleton" />
                  <div style={{ flex: 1 }}>
                    <div className="detail-loading-owner-name skeleton" />
                    <div className="detail-loading-owner-sub skeleton" />
                  </div>
                </div>
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
        <p>{error}</p>
        <button className="btn btn-primary" onClick={() => navigate('/explore', { replace: true })} style={{ marginTop: '1rem' }}>
          Back to Explore
        </button>
      </div>
    );
  }

  const validPhotos = vehicle.photos?.filter((p: any) => {
    if (!p) return false;
    if (typeof p === 'object') return !!p.url;
    return typeof p === 'string' && p.trim() !== '';
  });
  const displayImages = (validPhotos && validPhotos.length > 0) ? validPhotos : [null];
  const owner = typeof vehicle.owner === 'object' ? vehicle.owner : null;
  const isBike = vehicle.serviceType?.[0]?.toLowerCase() === 'bike' || vehicle.serviceType?.[0]?.toLowerCase() === 'scooter';



  return (
    <div className="vehicle-detail-page">
      <SEO
        title={`${vehicle.title} for Rent in ${vehicle.city || vehicle.district} | Rentify`}
        description={`Rent ${vehicle.make} ${vehicle.model}${vehicle.year ? ` (${vehicle.year})` : ''} in ${vehicle.city || ''}, ${vehicle.district} from LKR ${vehicle.pricePerDay.toLocaleString()}/day. ${vehicle.transmission}, ${vehicle.seats} seats${vehicle.driverOption === 'both' ? ', self-drive or with driver' : ''}. Verified owner — book instantly on Rentify.lk!`}
        keywords={`rent ${vehicle.make} ${vehicle.model} Sri Lanka, ${vehicle.make} rental ${vehicle.district}, ${(vehicle as any).vehicleType || 'car'} hire ${vehicle.city || vehicle.district}, self drive ${vehicle.district}`}
        ogImage={getImageUrl(displayImages[0])}
        ogType="product"
        ogTitle={`Rent ${vehicle.make} ${vehicle.model} in ${vehicle.city || vehicle.district} — LKR ${vehicle.pricePerDay.toLocaleString()}/day`}
        ogDescription={`${vehicle.transmission} · ${vehicle.seats} seats · ${vehicle.driverOption === 'both' ? 'Self-drive & with driver' : vehicle.driverOption === 'with-driver' ? 'With driver' : 'Self drive'}. Verified owner on Rentify.lk`}
        canonical={`/vehicles/${getVehicleSlug(vehicle)}`}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Product",
          "name": vehicle.title,
          "description": vehicle.description || `Rent ${vehicle.make} ${vehicle.model} in ${vehicle.city || vehicle.district}, Sri Lanka. ${vehicle.transmission}, ${vehicle.seats} seats.`,
          "image": displayImages.map(img => getImageUrl(img)),
          "brand": {
            "@type": "Brand",
            "name": vehicle.make
          },
          "model": vehicle.model,
          "vehicleModelDate": vehicle.year?.toString(),
          "numberOfForwardGears": vehicle.transmission === 'Automatic' ? undefined : undefined,
          "vehicleTransmission": vehicle.transmission === 'Automatic' ? 'https://schema.org/AutomaticTransmission' : 'https://schema.org/ManualTransmission',
          "seatingCapacity": vehicle.seats,
          "fuelType": vehicle.fuelType,
          "offers": {
            "@type": "Offer",
            "priceCurrency": "LKR",
            "price": vehicle.pricePerDay,
            "priceValidUntil": new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            "itemCondition": "https://schema.org/UsedCondition",
            "availability": vehicle.isActive ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            "url": `https://rentify.lk/vehicles/${getVehicleSlug(vehicle)}`,
            "seller": owner ? {
              "@type": "Person",
              "name": owner.name
            } : undefined
          },
          ...(vehicle.reviewCount ? {
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": vehicle.averageRating,
              "reviewCount": vehicle.reviewCount,
              "bestRating": "5",
              "worstRating": "1"
            }
          } : {})
        }}
      />
      <div className="container" style={{ position: 'relative', paddingTop: isMobile ? '0.75rem' : '1.5rem', paddingBottom: '3rem' }}>

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
                {displayImages.map((img, idx) => (
                  <img
                    key={idx}
                    src={getImageUrl(img)}
                    alt={`${vehicle.title} - Image ${idx + 1}`}
                    loading={idx === 0 ? "eager" : "lazy"}
                    className="detail-main-img-item"
                    onClick={() => { setActiveImage(idx); setShowLightbox(true); }}
                    style={{ cursor: 'pointer' }}
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542367597-87b9a3b9d8a6?auto=format&fit=crop&w=1200&q=80'; }}
                  />
                ))}
              </div>

              {/* Dots for Mobile */}
              {displayImages.length > 1 && (
                <div className="detail-gallery-dots mobile-only">
                  {displayImages.map((_, idx) => (
                    <div key={idx} className={`gallery-dot ${activeImage === idx ? 'active' : ''}`} />
                  ))}
                </div>
              )}

              {/* Thumbnails for Desktop */}
              {displayImages.length > 1 && (
                <div className="detail-thumbnails desktop-only">
                  {displayImages.map((img, idx) => (
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
                      {vehicle.title}
                    </h1>

                  </div>
                  <p className="detail-subtitle" style={{ fontSize: isMobile ? '0.85rem' : '1rem', color: 'var(--text-secondary)', marginTop: '0.5rem', fontWeight: 500, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
                    <span>{vehicle.make} {vehicle.model} {vehicle.year && `· ${vehicle.year}`}</span>
                  </p>
                </div>
              </div>

              {isMobile && (
                <div className="mobile-inline-price">
                  <div className="mobile-inline-price-main">
                    <span className="mobile-inline-currency">LKR</span>
                    <span className="mobile-inline-amount">{vehicle.pricePerDay.toLocaleString()}</span>
                    <span className="mobile-inline-period">/day</span>
                  </div>
                  {(vehicle.pricePerWeek || vehicle.pricePerMonth) && (
                    <div className="mobile-inline-price-tiers">
                      {vehicle.pricePerWeek && (
                        <span className="mobile-inline-tier">LKR {vehicle.pricePerWeek.toLocaleString()}/week</span>
                      )}
                      {vehicle.pricePerMonth && (
                        <span className="mobile-inline-tier">LKR {vehicle.pricePerMonth.toLocaleString()}/month</span>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="location-context">
                <MapPin size={16} />
                <span>{vehicle.city}, {vehicle.district}, {vehicle.province}</span>
              </div>

              {vehicle.description && (
                <>
                  <h3 className="section-title-minor" style={{ marginTop: '2rem' }}>Description</h3>
                  <p className="detail-desc" style={{ marginTop: '0.75rem', fontSize: '1rem', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
                    {vehicle.description}
                  </p>
                </>
              )}

              <h3 className="section-title-minor" style={{ marginTop: '2.5rem', fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)', borderLeft: '4px solid var(--primary-color)', paddingLeft: '12px' }}>
                Technical Specifications
              </h3>
              
              {!isBike && (
                <div style={{ marginBottom: '1.25rem', padding: '1rem', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ fontWeight: 700, color: '#334155' }}>Driver Options:</div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {vehicle.driverOption === 'self-drive' && <span className="v-card-tag v-self-drive" style={{ fontSize: '0.85rem', padding: '4px 10px' }}>🚗 Self Drive</span>}
                    {vehicle.driverOption === 'with-driver' && <span className="v-card-tag v-with-driver" style={{ fontSize: '0.85rem', padding: '4px 10px' }}>👨‍✈️ With Driver Only</span>}
                    {vehicle.driverOption === 'both' && <span className="v-card-tag v-both-driver" style={{ fontSize: '0.85rem', padding: '4px 10px' }}>👨‍✈️ Driver Optional</span>}
                  </div>
                </div>
              )}
              
              <div className="detail-specs-grid" style={{ marginTop: '0' }}>
                {vehicle.driverOption !== 'with-driver' && (
                  <div className="spec-item">
                    <span className="spec-label">Transmission</span>
                    <span className="spec-value">{vehicle.transmission}</span>
                  </div>
                )}
                <div className="spec-item">
                  <span className="spec-label">Fuel Type</span>
                  <span className="spec-value">{vehicle.fuelType}</span>
                </div>
                {!isBike && (
                  <div className="spec-item">
                    <span className="spec-label">Seats</span>
                    <span className="spec-value">
                      <Users size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                      {vehicle.seats} Seats
                    </span>
                  </div>
                )}
                {vehicle.engineCapacity && (
                  <div className="spec-item">
                    <span className="spec-label">Engine</span>
                    <span className="spec-value">
                      <Zap size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                      {vehicle.engineCapacity}
                    </span>
                  </div>
                )}
                {vehicle.fuelConsumption && (
                  <div className="spec-item">
                    <span className="spec-label">Consumption</span>
                    <span className="spec-value">
                      <Gauge size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                      {vehicle.fuelConsumption} km/L
                    </span>
                  </div>
                )}
                <div className="spec-item">
                  <span className="spec-label">Km Limit / Day</span>
                  <span className="spec-value" style={{ color: vehicle.kmLimitPerDay ? '#ea580c' : '#10b981', fontWeight: 700 }}>
                    {vehicle.kmLimitPerDay ? `${vehicle.kmLimitPerDay} km` : '∞ Unlimited'}
                  </span>
                </div>
                {vehicle.kmLimitPerDay && vehicle.extraKmPrice && (
                  <div className="spec-item">
                    <span className="spec-label">Extra Km Price</span>
                    <span className="spec-value" style={{ color: '#c2410c', fontWeight: 700 }}>
                      LKR {vehicle.extraKmPrice} /km
                    </span>
                  </div>
                )}
                <div className="spec-item">
                  <span className="spec-label">Category</span>
                  <span className="spec-value">{vehicle.serviceType?.[0] || 'Standard'}</span>
                </div>
                {vehicle.weddingHiresSpecial && (
                  <div className="spec-item">
                    <span className="spec-label">Special</span>
                    <span className="spec-value">💍 Wedding Hire</span>
                  </div>
                )}
                </div>

              {(() => {
                const parseFeatures = (feat: any): string[] => {
                  if (!feat) return [];

                  // Helper to flatten and clean up nested strings
                  const flatten = (data: any): string[] => {
                    if (Array.isArray(data)) {
                      return data.flatMap(item => flatten(item));
                    }
                    if (typeof data === 'string') {
                      const trimmed = data.trim();
                      // If it's a JSON array string, parse it and recurse
                      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                        try {
                          const parsed = JSON.parse(trimmed);
                          return flatten(parsed);
                        } catch (_) {
                          // Fallback: split by comma if JSON parse fails
                          return trimmed.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
                        }
                      }
                      // Clean up individual strings (remove stray quotes)
                      return [trimmed.replace(/^["']|["']$/g, '').trim()];
                    }
                    return [];
                  };

                  const results = flatten(feat);

                  // Final unique filter and cleanup
                  return Array.from(new Set(results))
                    .filter(s => s && s.length > 1 && !s.includes('[') && !s.includes('"'));
                };
                const safeFeatures = parseFeatures(vehicle.features);

                if (safeFeatures.length === 0) return null;

                return (
                  <div className="detail-features-section" style={{ marginTop: '2.5rem' }}>
                    <h3 className="section-title-minor">Features & Amenities</h3>
                    <div className="detail-features-grid" style={{ marginTop: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '16px' }}>
                      {safeFeatures.map((f, idx) => {
                        const featureMap: Record<string, { label: string; icon: string }> = {
                          ac: { label: 'A/C', icon: '❄️' },
                          bluetooth: { label: 'Bluetooth', icon: '📶' },
                          gps: { label: 'GPS', icon: '📍' },
                          sparewheel: { label: 'Spare Wheel', icon: '🛞' },
                          sunroof: { label: 'Sunroof', icon: '☀️' }
                        };
                        const featLower = f.toLowerCase().replace(/[^a-z]/g, '');
                        const feat = featureMap[featLower] || { label: f.charAt(0).toUpperCase() + f.slice(1), icon: '✨' };
                        return (
                          <div
                            key={idx}
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              gap: '10px',
                              padding: '16px 20px', 
                              borderRadius: '12px', 
                              fontSize: '0.95rem', 
                              fontWeight: 700, 
                              border: '1px solid #e2e8f0', 
                              background: '#ffffff', 
                              color: '#0f172a',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                              transition: 'all 0.2s ease',
                              cursor: 'default'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)';
                              e.currentTarget.style.borderColor = '#cbd5e1';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.03)';
                              e.currentTarget.style.borderColor = '#e2e8f0';
                            }}
                          >
                            <span style={{ fontSize: '1.1rem' }}>{feat.icon}</span>
                            <span>{feat.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>


          </Col>

          {/* RIGHT COLUMN: Sidebar (Booking & Owner) */}
          <Col xs={24} lg={8}>
            <div className="detail-sidebar">
              <div className="booking-panel card">
                <div className="pricing-card">
                  <div className="pricing-card-main">
                    <div className="pricing-main-amount">
                      <span className="pricing-currency">LKR</span>
                      <span className="pricing-value">{vehicle.pricePerDay.toLocaleString()}</span>
                    </div>
                    <span className="pricing-period">per day</span>
                  </div>
                  
                  {(vehicle.pricePerWeek || vehicle.pricePerMonth) && (
                    <div className="pricing-tiers">
                      {vehicle.pricePerWeek && (
                        <div className="pricing-tier-item">
                          <div className="pricing-tier-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                          </div>
                          <div className="pricing-tier-info">
                            <span className="pricing-tier-label">Weekly Rate</span>
                            <span className="pricing-tier-amount">LKR {vehicle.pricePerWeek.toLocaleString()}</span>
                          </div>
                          <div className="pricing-tier-save">Save ~{Math.round((1 - (vehicle.pricePerWeek / (vehicle.pricePerDay * 7))) * 100)}%</div>
                        </div>
                      )}
                      {vehicle.pricePerMonth && (
                        <div className="pricing-tier-item">
                          <div className="pricing-tier-icon pricing-tier-icon-monthly">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                          </div>
                          <div className="pricing-tier-info">
                            <span className="pricing-tier-label">Monthly Rate</span>
                            <span className="pricing-tier-amount">LKR {vehicle.pricePerMonth.toLocaleString()}</span>
                          </div>
                          <div className="pricing-tier-save pricing-tier-save-best">Save ~{Math.round((1 - (vehicle.pricePerMonth / (vehicle.pricePerDay * 30))) * 100)}%</div>
                        </div>
                      )}
                    </div>
                  )}

                </div>

                <div className="km-limit-badge-detail" style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1rem', borderRadius: '10px', background: vehicle.kmLimitPerDay ? '#fff7ed' : '#f0fdf4', border: `1px solid ${vehicle.kmLimitPerDay ? '#fed7aa' : '#bbf7d0'}` }}>
                  <Gauge size={20} color={vehicle.kmLimitPerDay ? '#c2410c' : '#15803d'} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: vehicle.kmLimitPerDay ? '#c2410c' : '#15803d' }}>
                      {vehicle.kmLimitPerDay ? `${vehicle.kmLimitPerDay} km / day limit` : 'Unlimited Kilometers'}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                      {vehicle.kmLimitPerDay && vehicle.extraKmPrice
                        ? `LKR ${vehicle.extraKmPrice.toLocaleString()} per extra km`
                        : vehicle.kmLimitPerDay
                          ? 'Contact owner for extra km charges'
                          : 'Drive as much as you need'}
                    </div>
                  </div>
                  {vehicle.kmLimitPerDay && vehicle.extraKmPrice && (
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: '#c2410c' }}>LKR {vehicle.extraKmPrice}</div>
                      <div style={{ fontSize: '0.6rem', color: '#a16207' }}>per extra km</div>
                    </div>
                  )}
                </div>

                {!isBike && vehicle.driverOption !== 'self-drive' && (
                  <div className="km-limit-badge-detail" style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1rem', borderRadius: '10px', background: '#faf5ff', border: '1px solid #e9d5ff' }}>
                    <Users size={20} color="#6b21a8" />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#6b21a8' }}>
                        {vehicle.driverOption === 'both' ? 'Driver available as option' : 'Driver included / required'}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                        {vehicle.driverPricePerDay ? `LKR ${vehicle.driverPricePerDay.toLocaleString()} per day for driver` : 'Contact owner for driver pricing'}
                      </div>
                    </div>
                  </div>
                )}

                {user && user._id === (owner?._id || vehicle.owner) ? (
                  <div className="box-highlight" style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '1.25rem', borderRadius: '12px', marginTop: '1.5rem', textAlign: 'center' }}>
                    <p style={{ fontWeight: 600, color: '#0f172a', margin: 0, fontSize: '1rem' }}>You own this vehicle</p>
                    <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '4px', marginBottom: '12px' }}>This is how your vehicle appears to the public.</p>
                    <Link to={`/dashboard/vehicle/${id}`} className="btn btn-primary btn-sm btn-full" style={{ height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      Go to Manage Vehicle
                    </Link>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem' }}>
                    {/* Show Call button only if contactMethod is 'call' or 'both' */}
                    {(!vehicle.contactMethod || vehicle.contactMethod === 'call' || vehicle.contactMethod === 'both') && (
                      <button
                        className="btn btn-full"
                        onClick={() => handleContactClick('call')}
                        style={{ height: '54px', fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: 'linear-gradient(135deg, #1d4ed8, #2563eb)', color: 'white', border: 'none', borderRadius: '12px', boxShadow: '0 4px 14px rgba(37,99,235,0.35)', transition: 'all 0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(37,99,235,0.45)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 14px rgba(37,99,235,0.35)'; }}
                      >
                        <Phone size={20} /> Call Owner
                      </button>
                    )}
                    {/* Show WhatsApp button only if contactMethod is 'whatsapp' or 'both' */}
                    {(!vehicle.contactMethod || vehicle.contactMethod === 'whatsapp' || vehicle.contactMethod === 'both') && (
                      <button
                        className="btn btn-full"
                        onClick={() => handleContactClick('whatsapp')}
                        style={{ height: '54px', fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: 'linear-gradient(135deg, #128C7E, #25D366)', color: 'white', border: 'none', borderRadius: '12px', boxShadow: '0 4px 14px rgba(37,211,102,0.35)', transition: 'all 0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(37,211,102,0.45)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 14px rgba(37,211,102,0.35)'; }}
                      >
                        <WhatsAppIcon size={22} /> WhatsApp Owner
                      </button>
                    )}
                  </div>
                )}
              </div>

              <Card className="owner-panel" bordered={false} bodyStyle={{ padding: '1.25rem' }} style={{ marginTop: '1rem', borderRadius: '12px', border: '1px solid var(--border-color-light)' }}>
                <h3 style={{ marginBottom: '1.25rem', fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Hosted By</h3>
                {owner ? (
                  <>
                    <div className="owner-profile-preview">
                      <Badge
                        count={owner.ownerType === 'VERIFIED' ? <CheckCircle size={14} style={{ color: '#10b981', background: '#fff', borderRadius: '50%' }} /> : 0}
                        offset={[-4, 44]}
                      >
                        <Avatar
                          src={getImageUrl(owner.profilePic) || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(owner.name) + '&background=e2e8f0'}
                          alt={owner.name}
                          size={54}
                          style={{ border: '2px solid var(--primary-color)' }}
                        />
                      </Badge>
                      <div className="owner-info-text">
                        <strong style={{ fontSize: '1rem' }}>{owner.name}</strong>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>Member since 2026</span>
                      </div>
                    </div>

                  </>
                ) : (
                  <div style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>Verified Rentify Host</div>
                )}
                <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color-light)', paddingTop: '1rem', textAlign: 'center' }}>
                  <Button type="text" danger icon={<Flag size={14} />} onClick={() => setShowReportModal(true)}>
                    Report this Listing
                  </Button>
                </div>
              </Card>
            </div>
          </Col>
        </Row>

        {/* Sentinel for hiding floating bar */}
        <div ref={sentinelRef} style={{ height: '1px', marginTop: isMobile ? '0.5rem' : '2rem' }}></div>
      </div>

      {/* MOBILE STICKY CONTACT BAR */}
      {isMobile && (!user || user._id !== (owner?._id || vehicle.owner)) && (
        <div className={`mobile-booking-bar animate-slide-up ${!barVisible ? 'mobile-booking-bar-hidden' : ''}`} style={{ padding: '0.75rem 1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div className="mobile-bar-price" style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column' }}>
            <span className="bar-amount" style={{ fontSize: '1.1rem' }}>LKR {vehicle.pricePerDay.toLocaleString()}</span>
            <span className="bar-unit">/ Day</span>
          </div>
          <div style={{ flex: 1, display: 'flex', gap: '0.5rem' }}>
            {(!vehicle.contactMethod || vehicle.contactMethod === 'whatsapp' || vehicle.contactMethod === 'both') && (
              <button
                className="btn btn-full"
                onClick={() => handleContactClick('whatsapp')}
                style={{ flex: 1, height: '44px', padding: '0 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'linear-gradient(135deg, #128C7E, #25D366)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 700 }}
              >
                <WhatsAppIcon size={18} />
                {(!vehicle.contactMethod || vehicle.contactMethod === 'both') && <span>WhatsApp</span>}
                {vehicle.contactMethod === 'whatsapp' && <span>WhatsApp</span>}
              </button>
            )}
            {(!vehicle.contactMethod || vehicle.contactMethod === 'call' || vehicle.contactMethod === 'both') && (
              <button
                className="btn btn-full"
                onClick={() => handleContactClick('call')}
                style={{ flex: 1, height: '44px', padding: '0 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'linear-gradient(135deg, #1d4ed8, #2563eb)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 700 }}
              >
                <Phone size={18} />
                {(!vehicle.contactMethod || vehicle.contactMethod === 'both') && <span>Call</span>}
                {vehicle.contactMethod === 'call' && <span>Call Now</span>}
              </button>
            )}
          </div>
        </div>
      )}

      {/* REPORT MODAL */}
      <Modal
        title={<span><Flag size={18} style={{ color: '#ef4444', marginRight: 8, verticalAlign: 'middle' }} /> Report Listing</span>}
        open={showReportModal}
        onCancel={() => { setShowReportModal(false); setReportReason(''); }}
        footer={[
          <Button key="cancel" onClick={() => { setShowReportModal(false); setReportReason(''); }}>Cancel</Button>,
          <Button key="submit" type="primary" danger loading={reportLoading} onClick={handleReportSubmit}>Submit Report</Button>
        ]}
      >
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          If you noticed something wrong with this listing (e.g. fake details, scam, inappropriate images), please let us know.
        </p>
        <Input.TextArea
          rows={4}
          placeholder="Please describe why you are reporting this vehicle..."
          value={reportReason}
          onChange={e => setReportReason(e.target.value)}
        />
      </Modal>

      {/* LIGHTBOX OVERLAY */}
      {showLightbox && (
        <div className="detail-lightbox-overlay" onClick={() => setShowLightbox(false)}>
          <button className="detail-lightbox-close" onClick={() => setShowLightbox(false)} aria-label="Close">
            <X size={32} />
          </button>

          {displayImages.length > 1 && (
            <button
              className="detail-lightbox-nav prev"
              onClick={(e) => {
                e.stopPropagation();
                setActiveImage((prev) => prev === 0 ? displayImages.length - 1 : prev - 1);
              }}
              aria-label="Previous image"
            >
              <ChevronLeft size={36} />
            </button>
          )}

          <img
            src={getImageUrl(displayImages[activeImage])}
            alt={vehicle.title}
            className="detail-lightbox-img"
            onClick={(e) => e.stopPropagation()}
          />

          {displayImages.length > 1 && (
            <button
              className="detail-lightbox-nav next"
              onClick={(e) => {
                e.stopPropagation();
                setActiveImage((prev) => prev === displayImages.length - 1 ? 0 : prev + 1);
              }}
              aria-label="Next image"
            >
              <ChevronRight size={36} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
