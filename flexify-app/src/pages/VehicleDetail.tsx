import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import dayjs, { type Dayjs } from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { Row, Col, Calendar, DatePicker, Tooltip, Modal, message, List, Rate, Avatar, Card, Badge, Tag, Input, Button } from 'antd';
import { vehicleApi, bookingApi, reviewApi, feedbackApi, type Vehicle, type BookedRange, type BlackoutRange, type Review, getImageUrl, getVehicleSlug } from '../api';
import { Users, CheckCircle, Star, Calendar as CalIcon, ArrowRight, Phone, Shield, MessageSquare, MessageCircle, AlertTriangle, Zap, Gauge, MapPin, Flag, ChevronLeft, ChevronRight, Share2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useIsMobile } from '../hooks/useIsMobile';
import SEO from '../components/SEO';
import './VehicleDetail.css';


dayjs.extend(isBetween);
const { RangePicker } = DatePicker;

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

  // Availability & Blackouts
  const [bookedRanges, setBookedRanges] = useState<BookedRange[]>([]);
  const [blackoutRanges, setBlackoutRanges] = useState<BlackoutRange[]>([]);
  const [calendarDate, setCalendarDate] = useState<Dayjs>(() => dayjs());

  // Booking modal
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [createdBooking, setCreatedBooking] = useState<any>(null);
  const [withDriver, setWithDriver] = useState(false);

  // active carousel image
  const [activeImage, setActiveImage] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);

  // Reviews
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

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

  // Fetch availability & reviews
  useEffect(() => {
    if (!id) return;
    setReviewsLoading(true);

    Promise.all([
      vehicleApi.getAvailability(id),
      reviewApi.getForVehicle(id)
    ])
      .then(([availData, reviewData]) => {
        setBookedRanges(availData.bookedRanges);
        setBlackoutRanges(availData.blackoutRanges);
        setReviews(reviewData);
      })
      .catch(() => { /* silently fail */ })
      .finally(() => {
        setReviewsLoading(false);
      });
  }, [id]);

  // Auto-complete pending booking after KYC verification
  useEffect(() => {
    if (!user || !id) return;
    // Only proceed if user has completed KYC (status is no longer 'not_submitted')
    if (user.verificationStatus === 'not_submitted') return;

    try {
      const stored = localStorage.getItem('pendingBooking');
      if (!stored) return;

      const pending = JSON.parse(stored);
      // Only auto-book if the pending booking matches this vehicle
      if (pending.vehicleId !== id) return;

      // Clear immediately to prevent double-submission
      localStorage.removeItem('pendingBooking');

      // Auto-submit the booking
      setShowBookingModal(true);
      setBookingLoading(true);

      bookingApi.create(pending.vehicleId, pending.startDate, pending.endDate, pending.withDriver)
        .then((resp) => {
          setCreatedBooking(resp);
          message.success('KYC verified & booking submitted successfully!');
          // Refresh availability in background
          vehicleApi.getAvailability(id)
            .then((data) => {
              setBookedRanges(data.bookedRanges);
              setBlackoutRanges(data.blackoutRanges);
            })
            .catch(err => console.error('Silent refresh failed:', err));
        })
        .catch((err: any) => {
          console.error('Auto-booking failed:', err);
          message.error(err.message || 'Failed to create booking after verification');
          setShowBookingModal(false);
        })
        .finally(() => {
          setBookingLoading(false);
        });
    } catch (e) {
      localStorage.removeItem('pendingBooking');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.verificationStatus, id]);

  // Helper: is a date within a booked range?
  const isDateBooked = useCallback((date: Dayjs, statusFilter?: string) => {
    return bookedRanges.some((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      const start = dayjs(r.start).startOf('day');
      const end = dayjs(r.end).endOf('day');
      return date.isBetween(start, end, 'day', '[]');
    });
  }, [bookedRanges]);

  // Helper: is a date within a blackout range?
  const isDateBlackedOut = useCallback((date: Dayjs) => {
    return blackoutRanges.some((r) => {
      const start = dayjs(r.start).startOf('day');
      const end = dayjs(r.end).endOf('day');
      return date.isBetween(start, end, 'day', '[]');
    });
  }, [blackoutRanges]);

  // Disable dates in the RangePicker (past, confirmed ranges, and blackouts)
  const disabledDate = useCallback((current: Dayjs) => {
    if (current && current.isBefore(dayjs(), 'day')) return true;
    return isDateBooked(current, 'CONFIRMED') || isDateBlackedOut(current);
  }, [isDateBooked, isDateBlackedOut]);

  // Tooltip & Styling for RangePicker cells
  const pickerCellRender = useCallback((current: Dayjs | any) => {
    const date = dayjs(current);
    const confirmed = isDateBooked(date, 'CONFIRMED');
    const pending = isDateBooked(date, 'PENDING');
    const blackedOut = isDateBlackedOut(date);
    
    // Determine the status and label
    let statusClass = '';
    let label = '';
    let tooltip = '';

    if (confirmed) {
      statusClass = 'confirmed';
      label = 'Booked';
      tooltip = 'Already booked';
    } else if (pending) {
      statusClass = 'pending';
      label = 'Pending';
      tooltip = 'Booking Pending';
    } else if (blackedOut) {
      statusClass = 'blackout';
      label = 'Unavailable';
      tooltip = 'Owner unavailable (blackout)';
    } else if (date.isSame(dayjs(), 'day') || date.isAfter(dayjs(), 'day')) {
      statusClass = 'available';
      label = 'Available';
    }

    if (statusClass) {
      const content = (
        <div className="avail-status-container">
          <div className={`status-indicator ${statusClass}`}>
            <span className="status-text">{label}</span>
          </div>
        </div>
      );
      return tooltip ? (
        <Tooltip title={tooltip}>
          <div className="ant-picker-cell-inner">{date.date()}{content}</div>
        </Tooltip>
      ) : <div className="ant-picker-cell-inner">{date.date()}{content}</div>;
    }

    return <div className="ant-picker-cell-inner">{date.date()}</div>;
  }, [isDateBooked, isDateBlackedOut]);

  // Calendar cell renderer for the availability calendar
  const fullCellRender = useCallback((date: Dayjs) => {
    const isPast = date.isBefore(dayjs(), 'day');
    const confirmed = isDateBooked(date, 'CONFIRMED');
    const pending = isDateBooked(date, 'PENDING');
    const blackedOut = isDateBlackedOut(date);
    
    const isCurrentMonth = date.month() === calendarDate.month() && date.year() === calendarDate.year();

    if (!isCurrentMonth) {
      return (
        <div className="calendar-custom-cell cell-past" style={{ opacity: 0.3 }}>
          <span className="cell-date-num">{date.date()}</span>
        </div>
      );
    }

    let status = 'available';
    let tooltip = '';
    
    if (isPast) {
      status = 'past';
    } else if (confirmed) {
      status = 'confirmed';
      tooltip = 'Booked (Confirmed)';
    } else if (pending) {
      status = 'pending';
      tooltip = 'Booking Pending';
    } else if (blackedOut) {
      status = 'blackout';
      tooltip = 'Owner Unavailable';
    }

    const content = (
      <div className={`calendar-custom-cell cell-${status}`}>
        <span className="cell-date-num">{date.date()}</span>
      </div>
    );

    return tooltip ? <Tooltip title={tooltip}>{content}</Tooltip> : content;
  }, [isDateBooked, isDateBlackedOut, calendarDate]);

  const handleBookNow = async () => {
    if (!user) {
      navigate('/auth', { state: { returnTo: `/vehicles/${id}` } });
      return;
    }

    if (!dateRange || !dateRange[0] || !dateRange[1]) {
      message.error('Please select both pickup and return dates');
      return;
    }

    const startStr = dateRange[0].toISOString();
    const endStr = dateRange[1].toISOString();

    const hasKycFields = Boolean(user.documents?.idNumber?.trim() && user.documents?.address?.trim());

    // If user hasn't submitted KYC or missing mandatory fields, save pending booking and redirect to KYC
    if (!hasKycFields) {
      localStorage.setItem('pendingBooking', JSON.stringify({
        vehicleId: id,
        startDate: startStr,
        endDate: endStr,
        withDriver,
      }));
      message.info('Quick verification needed before booking — it only takes a minute!');
      navigate(`/verify?returnTo=${encodeURIComponent(`/vehicles/${id}`)}&pendingBooking=true`);
      return;
    }

    // User is verified (has fields filled) — proceed with booking
    setBookingLoading(true);
    try {
      const resp = await bookingApi.create(id!, startStr, endStr, withDriver);
      setCreatedBooking(resp);
      message.success('Booking request submitted!');
      
      // Background refresh
      vehicleApi.getAvailability(id!)
        .then((data) => {
          setBookedRanges(data.bookedRanges);
          setBlackoutRanges(data.blackoutRanges);
        })
        .catch(err => console.error('Silent refresh failed:', err));

    } catch (err: any) {
      console.error('Booking failed:', err);
      message.error(err.message || 'Failed to create booking');
    } finally {
      setBookingLoading(false);
    }
  };

  // Determine button text based on verification status
  const getBookingButtonText = () => {
    if (!user) return 'Sign In to Book';
    const hasKycFields = Boolean(user.documents?.idNumber?.trim() && user.documents?.address?.trim());
    return hasKycFields ? 'Book Now' : 'Verify and Book';
  };

  const handleBookingTrigger = () => {
    if (!user) {
      navigate('/auth', { state: { returnTo: `/vehicles/${id}` } });
      return;
    }
    // Allow all logged-in users to open the booking modal regardless of KYC status
    setShowBookingModal(true);
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

  // Calculate days & total from RangePicker
  const days = dateRange && dateRange[0] && dateRange[1]
    ? dateRange[1].diff(dateRange[0], 'day') || 1
    : 0;
    
  let totalAmount = 0;
  if (days > 0 && vehicle) {
    if (days >= 30 && vehicle.pricePerMonth) {
      // Calculate by months + remaining days
      const months = Math.floor(days / 30);
      const remainingDays = days % 30;
      totalAmount = (months * vehicle.pricePerMonth) + (remainingDays * vehicle.pricePerDay);
    } else if (days >= 7 && vehicle.pricePerWeek) {
      // Calculate by weeks + remaining days
      const weeks = Math.floor(days / 7);
      const remainingDays = days % 7;
      totalAmount = (weeks * vehicle.pricePerWeek) + (remainingDays * vehicle.pricePerDay);
    } else {
      totalAmount = days * vehicle.pricePerDay;
    }
    
    // Add driver cost if applicable
    if (vehicle.driverOption === 'with-driver' || (vehicle.driverOption === 'both' && withDriver)) {
      totalAmount += days * (vehicle.driverPricePerDay || 0);
    }
  }

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
                    <div 
                      className="detail-rating" 
                      onClick={() => document.getElementById('reviews-section')?.scrollIntoView({ behavior: 'smooth' })}
                      style={{ cursor: 'pointer', margin: 0 }}
                    >
                      <Star size={16} fill="#f59e0b" color="#f59e0b" />
                      <span className="rating-score">{vehicle.averageRating || 'New'}</span>
                      <span className="rating-count">({vehicle.reviewCount || 0})</span>
                    </div>
                  </div>
                  <p className="detail-subtitle" style={{ fontSize: isMobile ? '0.85rem' : '1rem', color: 'var(--text-secondary)', marginTop: '0.5rem', fontWeight: 500, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
                    <span>{vehicle.make} {vehicle.model} {vehicle.year && `· ${vehicle.year}`}</span>
                    {vehicle.weddingHiresSpecial && (
                      <Tag 
                        style={{ 
                          padding: '2px 10px', 
                          fontSize: '0.8rem', 
                          fontWeight: 800, 
                          borderRadius: '6px',
                          border: 'none',
                          background: 'linear-gradient(135deg, #f5d0fe 0%, #f472b6 100%)',
                          color: '#701a75',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          boxShadow: '0 4px 12px rgba(244, 114, 182, 0.2)'
                        }}
                      >
                        💍 Wedding Hire Special
                      </Tag>
                    )}
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
              <div className="detail-specs-grid" style={{ marginTop: '1.25rem' }}>
                <div className="spec-item">
                  <span className="spec-label">Transmission</span>
                  <span className="spec-value">{vehicle.transmission}</span>
                </div>
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
                {!isBike && (
                  <>
                    <div className="spec-item">
                      <span className="spec-label">Driver Option</span>
                      <span className="spec-value" style={{ fontWeight: 600, color: '#6b21a8' }}>
                        {vehicle.driverOption === 'both' ? 'Self / With Driver' : vehicle.driverOption === 'with-driver' ? 'With Driver' : 'Self Drive'}
                      </span>
                    </div>
                    {vehicle.driverOption !== 'self-drive' && vehicle.driverPricePerDay ? (
                      <div className="spec-item">
                        <span className="spec-label">Driver Price</span>
                        <span className="spec-value" style={{ fontWeight: 600, color: '#c2410c' }}>
                          LKR {vehicle.driverPricePerDay} /day
                        </span>
                      </div>
                    ) : null}
                  </>
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
                    <div className="detail-features-tags" style={{ marginTop: '1.25rem', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
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
                          <Tag 
                            key={idx} 
                            color="blue" 
                            icon={<span style={{ marginRight: 4 }}>{feat.icon}</span>}
                            style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, border: 'none', background: '#eff6ff', color: '#1e40af', margin: 0 }}
                          >
                            {feat.label}
                          </Tag>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* AVAILABILITY CALENDAR */}
            <div className="detail-availability card" style={{ marginTop: '1.5rem', padding: '1.5rem 2rem' }}>
              <h3 style={{ marginBottom: '0.5rem', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CalIcon size={20} /> Availability Calendar
              </h3>
              <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                View available dates for this vehicle. High demand usually affects pickup times.
              </p>
              
              <Row gutter={[16, 16]}>
                <Col xs={24} md={18}>
                  <Calendar 
                    fullscreen={false} 
                    value={calendarDate}
                    onChange={setCalendarDate}
                    fullCellRender={(date) => fullCellRender(date as Dayjs)} 
                    headerRender={({ value, onChange }) => {
                      return (
                        <div style={{ padding: '8px 0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>
                              {value.format('MMMM YYYY')}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <Button 
                              size="small" 
                              icon={<ChevronLeft size={16} />} 
                              onClick={() => {
                                const now = value.clone().subtract(1, 'month');
                                onChange(now);
                              }}
                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            />
                            <Button 
                              size="small"
                              onClick={() => {
                                onChange(dayjs());
                              }}
                              style={{ fontSize: '0.75rem', fontWeight: 600 }}
                            >
                              Today
                            </Button>
                            <Button 
                              size="small" 
                              icon={<ChevronRight size={16} />} 
                              onClick={() => {
                                const now = value.clone().add(1, 'month');
                                onChange(now);
                              }}
                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            />
                          </div>
                        </div>
                      );
                    }}
                  />
                </Col>
                <Col xs={24} md={6}>
                  <div className="avail-legend-vertical" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
                      <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#fee2e2', border: '1px solid #fca5a5' }}></span>
                      Booked
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
                      <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#fef3c7', border: '1px solid #fcd34d' }}></span>
                      Pending
                    </span>
                  </div>
                </Col>
              </Row>
            </div>

            {/* REVIEWS SECTION */}
            <div id="reviews-section" className="detail-reviews card" style={{ marginTop: '1.5rem', padding: '2rem' }}>
              <h3 style={{ marginBottom: '1.5rem', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageSquare size={20} /> Guest Reviews ({reviews.length})
              </h3>

              <List
                loading={reviewsLoading}
                itemLayout="horizontal"
                dataSource={reviews}
                renderItem={(review: Review) => (
                  <List.Item style={{ padding: '1.5rem 0' }}>
                    <List.Item.Meta
                      avatar={<Avatar src={getImageUrl(review.reviewer.profilePic)} alt={review.reviewer.name} size={48} />}
                      title={
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 600 }}>{review.reviewer.name}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{dayjs(review.createdAt).format('MMM D, YYYY')}</span>
                        </div>
                      }
                      description={
                        <div style={{ marginTop: '0.35rem' }}>
                          <Rate disabled defaultValue={review.rating} style={{ fontSize: '12px', marginBottom: '0.5rem' }} />
                          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', fontSize: '0.95rem' }}>{review.comment}</p>
                        </div>
                      }
                    />
                  </List.Item>
                )}
                locale={{ emptyText: <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>No reviews yet for this vehicle. Be the first to book!</div> }}
              />
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
                            <CalIcon size={14} />
                          </div>
                          <div className="pricing-tier-info">
                            <span className="pricing-tier-label">Weekly</span>
                            <span className="pricing-tier-amount">LKR {vehicle.pricePerWeek.toLocaleString()}</span>
                          </div>
                          {vehicle.pricePerDay > 0 && (
                            <span className="pricing-tier-save">
                              Save {Math.round(((vehicle.pricePerDay * 7 - vehicle.pricePerWeek) / (vehicle.pricePerDay * 7)) * 100)}%
                            </span>
                          )}
                        </div>
                      )}
                      {vehicle.pricePerMonth && (
                        <div className="pricing-tier-item">
                          <div className="pricing-tier-icon pricing-tier-icon-monthly">
                            <CalIcon size={14} />
                          </div>
                          <div className="pricing-tier-info">
                            <span className="pricing-tier-label">Monthly</span>
                            <span className="pricing-tier-amount">LKR {vehicle.pricePerMonth.toLocaleString()}</span>
                          </div>
                          {vehicle.pricePerDay > 0 && (
                            <span className="pricing-tier-save pricing-tier-save-best">
                              Save {Math.round(((vehicle.pricePerDay * 30 - vehicle.pricePerMonth) / (vehicle.pricePerDay * 30)) * 100)}%
                            </span>
                          )}
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

                {(bookedRanges.length > 0 || blackoutRanges.length > 0) && (
                  <Tag 
                    color="orange" 
                    icon={<AlertTriangle size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />}
                    style={{ marginTop: '1rem', borderRadius: '4px', padding: '2px 8px', width: '100%', textAlign: 'center' }}
                  >
                    High Demand Listing
                  </Tag>
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
                  <button
                    className="btn btn-primary btn-lg btn-full"
                    onClick={handleBookingTrigger}
                    style={{ marginTop: '1.5rem', height: '54px', fontSize: '1.1rem', fontWeight: 700 }}
                  >
                    {getBookingButtonText()}
                  </button>
                )}

                <div className="booking-perks">
                  <div className="perk">
                    <CheckCircle size={14} color="#10b981" />
                    <span>Free cancellation (up to 24h)</span>
                  </div>
                  <div className="perk">
                    <CheckCircle size={14} color="#10b981" />
                    <span>Instant support & Host approval</span>
                  </div>
                </div>
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

      {/* MOBILE STICKY BOOKING BAR */}
      {isMobile && !showBookingModal && !createdBooking && (!user || user._id !== (owner?._id || vehicle.owner)) && (
        <div className={`mobile-booking-bar animate-slide-up ${!barVisible ? 'mobile-booking-bar-hidden' : ''}`}>
          <div className="mobile-bar-price">
            <span className="bar-amount">LKR {vehicle.pricePerDay.toLocaleString()}</span>
            <span className="bar-unit">/ Day</span>
          </div>
          <button className="btn btn-primary" onClick={handleBookingTrigger} style={{ height: '44px', fontWeight: 700, borderRadius: '10px', fontSize: '0.85rem', padding: '0 16px', letterSpacing: '0.01em', flexShrink: 0 }}>
            {getBookingButtonText()}
          </button>
        </div>
      )}

      {/* BOOKING MODAL */}
      <Modal
        open={showBookingModal}
        onCancel={() => { setShowBookingModal(false); setCreatedBooking(null); setDateRange(null); setWithDriver(false); }}
        footer={null}
        centered
        width={isMobile ? '95%' : 520}
        destroyOnClose
        className="booking-modal"
      >
        {createdBooking ? (
          <div className="booking-success-view animate-fade-in" style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ background: '#f0fdf4', color: '#16a34a', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <CheckCircle size={32} />
            </div>
            <h2 style={{ marginBottom: '1rem' }}>Booking Requested!</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
              Your request has been sent to the owner. You can contact them directly to speed up the process.
            </p>

            <div className="owner-contact-card box-highlight" style={{ padding: '1.5rem', background: 'var(--bg-secondary)', borderRadius: '12px', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <img
                  src={typeof createdBooking.owner === 'object' ? getImageUrl(createdBooking.owner.profilePic) || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(createdBooking.owner.name) : ''}
                  alt=""
                  style={{ width: '50px', height: '50px', borderRadius: '50%' }}
                />
                <div>
                  <div style={{ fontWeight: '600' }}>{typeof createdBooking.owner === 'object' ? createdBooking.owner.name : 'Owner'}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '2px' }}>
                    {typeof createdBooking.owner === 'object' ? createdBooking.owner.phone || 'No phone provided' : ''}
                  </div>
                </div>
              </div>

              {typeof createdBooking.owner === 'object' && createdBooking.owner.phone && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <a 
                    href={`tel:${createdBooking.owner.phone}`} 
                    className="btn btn-outline" 
                    style={{ height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '0' }}
                  >
                    <Phone size={16} /> Call
                  </a>
                  <a 
                    href={`https://wa.me/${createdBooking.owner.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi ${createdBooking.owner.name},\n\nI just requested to book your ${vehicle?.title} on Rentify from ${dayjs(createdBooking.startDate).format('MMM D')} to ${dayjs(createdBooking.endDate).format('MMM D')}.\n\nPlease let me know if it's available!`)}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="btn" 
                    style={{ height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '0', background: '#25D366', color: 'white', border: 'none' }}
                  >
                    <MessageCircle size={16} /> WhatsApp
                  </a>
                </div>
              )}
            </div>

            <button className="btn btn-primary btn-full" onClick={() => navigate('/dashboard')}>
              Go to My Dashboard <ArrowRight size={18} style={{ marginLeft: '8px' }} />
            </button>
          </div>
        ) : (
          <>
            <h2 style={{ marginBottom: '0.5rem' }}>Complete Your Booking</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
              {vehicle.title} • LKR {vehicle.pricePerDay.toLocaleString()}/day
            </p>

            <div className="booking-form-content">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="input-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    <CalIcon size={16} /> Select Dates
                  </label>
                  {isMobile ? (
                    <div style={{ display: 'flex', gap: '0.75rem', flexDirection: 'column' }}>
                      <div className="input-group">
                        <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '4px' }}>Pickup Date</label>
                        <input
                          type="date"
                          className="input-field"
                          value={dateRange && dateRange[0] ? dateRange[0].format('YYYY-MM-DD') : ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDateRange([val ? dayjs(val) : null, dateRange?.[1] || null]);
                          }}
                          min={dayjs().format('YYYY-MM-DD')}
                          style={{ width: '100%', height: '44px' }}
                        />
                      </div>
                      <div className="input-group">
                        <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '4px' }}>Return Date</label>
                        <input
                          type="date"
                          className="input-field"
                          value={dateRange && dateRange[1] ? dateRange[1].format('YYYY-MM-DD') : ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDateRange([dateRange?.[0] || null, val ? dayjs(val) : null]);
                          }}
                          min={dateRange && dateRange[0] ? dateRange[0].format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD')}
                          style={{ width: '100%', height: '44px' }}
                        />
                      </div>
                    </div>
                  ) : (
                    <RangePicker
                      value={dateRange}
                      onChange={(dates) => setDateRange(dates)}
                      disabledDate={disabledDate}
                      cellRender={pickerCellRender}
                      format="YYYY-MM-DD"
                      style={{ width: '100%', height: '44px' }}
                      placeholder={['Pickup Date', 'Return Date']}
                      size="large"
                    />
                  )}
                </div>

                {vehicle.driverOption === 'both' && (
                  <div className="input-group" style={{ marginBottom: '0.5rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: '#faf5ff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e9d5ff' }}>
                      <input
                        type="checkbox"
                        checked={withDriver}
                        onChange={(e) => setWithDriver(e.target.checked)}
                        style={{ width: '18px', height: '18px', accentColor: '#8b5cf6' }}
                      />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600, color: '#6b21a8' }}>Add a Driver (Optional)</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>+ LKR {vehicle.driverPricePerDay?.toLocaleString() || 0} / day</span>
                      </div>
                    </label>
                  </div>
                )}

                <div className="avail-legend modal-legend" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '-0.5rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#f5f5f5', border: '1px solid #d9d9d9' }}></span>
                    Booked / Blackout
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'transparent', border: '1px solid var(--primary-color)' }}></span>
                    Your selection
                  </span>
                </div>

                {days > 0 && (
                  <div className="booking-summary box-highlight" style={{ padding: '1.5rem', background: 'var(--bg-secondary)', borderRadius: '12px', marginTop: '0.5rem' }}>
                    <div className="summary-details" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      {days >= 30 && vehicle.pricePerMonth ? (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Monthly Rate x {Math.floor(days / 30)}</span>
                            <span>LKR {(Math.floor(days / 30) * vehicle.pricePerMonth).toLocaleString()}</span>
                          </div>
                          {days % 30 > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>Daily Rate x {days % 30} days</span>
                              <span>LKR {( (days % 30) * vehicle.pricePerDay).toLocaleString()}</span>
                            </div>
                          )}
                        </>
                      ) : days >= 7 && vehicle.pricePerWeek ? (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Weekly Rate x {Math.floor(days / 7)}</span>
                            <span>LKR {(Math.floor(days / 7) * vehicle.pricePerWeek).toLocaleString()}</span>
                          </div>
                          {days % 7 > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>Daily Rate x {days % 7} days</span>
                              <span>LKR {( (days % 7) * vehicle.pricePerDay).toLocaleString()}</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>LKR {vehicle.pricePerDay.toLocaleString()} x {days} days</span>
                          <span>LKR {(vehicle.pricePerDay * days).toLocaleString()}</span>
                        </div>
                      )}

                      {(vehicle.driverOption === 'with-driver' || (vehicle.driverOption === 'both' && withDriver)) && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6b21a8', marginTop: '4px' }}>
                          <span>Driver fee ({vehicle.driverPricePerDay?.toLocaleString()} x {days} days)</span>
                          <span>LKR {((vehicle.driverPricePerDay || 0) * days).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                    <div className="summary-total" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 800, marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color-light)' }}>
                      <span>Total</span>
                      <span>LKR {totalAmount.toLocaleString()}</span>
                    </div>
                  </div>
                )}

                <button
                  className="btn btn-primary btn-lg btn-full"
                  onClick={handleBookNow}
                  disabled={bookingLoading}
                  style={{ marginTop: '0.5rem' }}
                >
                  {bookingLoading ? <span className="spinner"></span> : 'Submit Booking Request'}
                </button>
              </div>
            </div>
          </>
        )}
      </Modal>

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
