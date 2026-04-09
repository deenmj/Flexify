import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import dayjs, { type Dayjs } from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { Calendar, DatePicker, Tooltip, Modal, message, List, Rate, Avatar, Card, Badge, Tag } from 'antd';
import { vehicleApi, bookingApi, reviewApi, type Vehicle, type BookedRange, type BlackoutRange, type Review, getImageUrl } from '../api';
import { Users, CheckCircle, Star, Calendar as CalIcon, ArrowRight, Phone, Shield, MessageSquare, AlertTriangle, Zap, Gauge, MapPin } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useIsMobile } from '../hooks/useIsMobile';
import './VehicleDetail.css';

dayjs.extend(isBetween);
const { RangePicker } = DatePicker;

export default function VehicleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Availability & Blackouts
  const [bookedRanges, setBookedRanges] = useState<BookedRange[]>([]);
  const [blackoutRanges, setBlackoutRanges] = useState<BlackoutRange[]>([]);
  const [availLoading, setAvailLoading] = useState(false);

  // Booking modal
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [createdBooking, setCreatedBooking] = useState<any>(null);

  // active carousel image
  const [activeImage, setActiveImage] = useState(0);

  // Reviews
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

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
    setAvailLoading(true);
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
        setAvailLoading(false);
        setReviewsLoading(false);
      });
  }, [id]);

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
    // antd 5 cellRender might pass string/number/Dayjs depending on view, 
    // but in DatePicker it should be Dayjs. We cast to satisfy TS.
    const date = dayjs(current);
    const isBooked = isDateBooked(date, 'CONFIRMED');
    const isBlackout = isDateBlackedOut(date);
    
    if (isBooked || isBlackout) {
      return (
        <Tooltip title={isBooked ? "Already booked" : "Owner unavailable (blackout)"}>
          <div className="ant-picker-cell-inner disabled-cell-inner">{date.date()}</div>
        </Tooltip>
      );
    }
    return <div className="ant-picker-cell-inner">{date.date()}</div>;
  }, [isDateBooked, isDateBlackedOut]);

  // Verify if the entire range is available
  const isRangeBlocked = (start: Dayjs, end: Dayjs) => {
    let curr = start;
    while (curr.isBefore(end) || curr.isSame(end, 'day')) {
      if (disabledDate(curr)) return true;
      curr = curr.add(1, 'day');
    }
    return false;
  };

  // Calendar cell renderer for the availability calendar
  const dateCellRender = useCallback((date: Dayjs) => {
    const confirmed = isDateBooked(date, 'CONFIRMED');
    const pending = isDateBooked(date, 'PENDING');
    const blackedOut = isDateBlackedOut(date);

    if (confirmed) {
      return (
        <Tooltip title="Booked (Confirmed)">
          <div className="avail-cell avail-confirmed">Booked</div>
        </Tooltip>
      );
    }
    if (pending) {
      return (
        <Tooltip title="Booking Pending">
          <div className="avail-cell avail-pending">Pending</div>
        </Tooltip>
      );
    }
    if (blackedOut) {
      return (
        <Tooltip title="Owner Unavailable / Blackout">
          <div className="avail-cell avail-blackout">Unavailable</div>
        </Tooltip>
      );
    }
    return null;
  }, [isDateBooked, isDateBlackedOut]);

  const handleBookNow = async () => {
    if (!user) {
      navigate('/auth', { state: { returnTo: `/vehicles/${id}` } });
      return;
    }

    if (!user.isKycVerified) {
      navigate('/verify');
      return;
    }

    if (!dateRange || !dateRange[0] || !dateRange[1]) {
      message.error('Please select pickup and return dates');
      return;
    }

    if (isRangeBlocked(dateRange[0], dateRange[1])) {
      message.error('Selected dates are already booked. Please choose different dates.');
      return;
    }

    setBookingLoading(true);

    try {
      const resp = await bookingApi.create(
        id!,
        dateRange[0].toISOString(),
        dateRange[1].toISOString()
      );
      setCreatedBooking(resp);
      message.success('Booking request submitted!');
      // Refresh availability
      vehicleApi.getAvailability(id!)
        .then((data) => {
          setBookedRanges(data.bookedRanges);
          setBlackoutRanges(data.blackoutRanges);
        })
        .catch(() => { });
    } catch (err: any) {
      message.error(err.message || 'Failed to submit booking');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleBookingTrigger = () => {
    if (!user) {
      navigate('/auth', { state: { returnTo: `/vehicles/${id}` } });
      return;
    }
    if (!user.isKycVerified) {
      navigate('/verify');
      return;
    }
    setShowBookingModal(true);
  };

  if (loading) {
    return <div className="detail-loading">Loading vehicle details...</div>;
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

  const validPhotos = vehicle.photos?.filter(p => p && p.trim() !== '');
  const displayImages = (validPhotos && validPhotos.length > 0) ? validPhotos : ['https://images.unsplash.com/photo-1542367597-87b9a3b9d8a6?auto=format&fit=crop&w=1200&q=80'];
  const owner = typeof vehicle.owner === 'object' ? vehicle.owner : null;

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
  }

  return (
    <div className="vehicle-detail-page">
      <div className="container" style={{ position: 'relative', paddingTop: '1.5rem', paddingBottom: '3rem' }}>

        <div className="detail-grid">
          {/* LEFT: Image Carousel & Overview */}
          <div className="detail-main">
            <div className="detail-carousel-container">
              <img
                src={getImageUrl(displayImages[activeImage])}
                alt={vehicle.title}
                loading="lazy"
                className="detail-main-img animate-fade-in"
                onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542367597-87b9a3b9d8a6?auto=format&fit=crop&w=1200&q=80'; }}
              />
              {displayImages.length > 1 && (
                <div className="detail-thumbnails">
                  {displayImages.map((img, idx) => (
                    <img
                      key={idx}
                      src={getImageUrl(img)}
                      alt={`Thumbnail ${idx}`}
                      className={`detail-thumb ${activeImage === idx ? 'active' : ''}`}
                      onClick={() => setActiveImage(idx)}
                      onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542367597-87b9a3b9d8a6?auto=format&fit=crop&w=200&q=60'; }}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="detail-overview card" style={{ marginTop: '2rem', padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h1 className="detail-title">{vehicle.title}</h1>
                  <p className="detail-subtitle">{vehicle.make} {vehicle.model} {vehicle.year && `· ${vehicle.year}`}</p>
                </div>
                <div className="detail-rating">
                  <Star size={16} fill="#f59e0b" color="#f59e0b" />
                  <span className="rating-score">{vehicle.averageRating || 'New'}</span>
                  <span className="rating-count">({vehicle.reviewCount || 0})</span>
                </div>
              </div>

              <div className="location-context">
                <MapPin size={16} /> 
                <span>{vehicle.city}, {vehicle.district}, {vehicle.province}</span>
              </div>

              <p className="detail-desc" style={{ marginTop: '1.5rem', fontSize: '1.05rem', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
                {vehicle.description || "No description provided for this vehicle. Enjoy a premium, comfortable ride perfect for your specified needs."}
              </p>

              <h3 style={{ marginTop: '2.5rem', marginBottom: '1.25rem', fontSize: '1.25rem' }}>Technical Specifications</h3>
              <div className="detail-specs-grid">
                <div className="spec-item">
                  <span className="spec-label">Transmission</span>
                  <span className="spec-value">{vehicle.transmission}</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Fuel Type</span>
                  <span className="spec-value">{vehicle.fuelType}</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Seats</span>
                  <span className="spec-value">
                    <Users size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                    {vehicle.seats} Seats
                  </span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Engine Capacity</span>
                  <span className="spec-value">
                    <Zap size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                    {vehicle.engineCapacity || 'N/A'}
                  </span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Consumption</span>
                  <span className="spec-value">
                    <Gauge size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                    {vehicle.fuelConsumption || 'N/A'}
                  </span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Category</span>
                  <span className="spec-value">{vehicle.serviceType?.[0] || 'Standard'}</span>
                </div>
              </div>

              {vehicle.features && vehicle.features.length > 0 && (
                <div className="detail-features-section">
                  <h3 style={{ marginTop: '2.5rem', marginBottom: '1.25rem', fontSize: '1.25rem' }}>Features & Amenities</h3>
                  <div className="detail-features-grid">
                    {vehicle.features.map(f => {
                      const featureMap: Record<string, string> = {
                        ac: '❄️ A/C',
                        bluetooth: '📶 Bluetooth',
                        gps: '📍 GPS',
                        sparewheel: '🛞 Spare Wheel',
                        sunroof: '☀️ Sunroof'
                      };
                      return (
                        <div key={f} className="detail-feature-tag">
                          {featureMap[f] || f}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* AVAILABILITY CALENDAR */}
            <div className="detail-availability card" style={{ marginTop: '2rem', padding: '2rem' }}>
              <h3 style={{ marginBottom: '0.5rem', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CalIcon size={20} /> Availability Calendar
              </h3>
              <p style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                View booked and available dates for this vehicle.
              </p>
              <div className="avail-legend" style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#fee2e2', border: '1px solid #fca5a5' }}></span>
                  Booked (Confirmed)
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#fef3c7', border: '1px solid #fcd34d' }}></span>
                  Pending
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#f0fdf4', border: '1px solid #86efac' }}></span>
                  Available
                </span>
              </div>
              {availLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>Loading availability...</div>
              ) : (
                <Calendar fullscreen={false} cellRender={(date) => dateCellRender(date as Dayjs)} />
              )}
            </div>

            {/* REVIEWS SECTION */}
            <div className="detail-reviews card" style={{ marginTop: '2rem', padding: '2rem' }}>
              <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageSquare size={20} /> Guest Reviews ({reviews.length})
              </h3>

              <List
                loading={reviewsLoading}
                itemLayout="horizontal"
                dataSource={reviews}
                renderItem={(review: Review) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<Avatar src={getImageUrl(review.reviewer.profilePic)} alt={review.reviewer.name} />}
                      title={
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 600 }}>{review.reviewer.name}</span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>{dayjs(review.createdAt).format('MMMM D, YYYY')}</span>
                        </div>
                      }
                      description={
                        <div style={{ marginTop: '0.5rem' }}>
                          <Rate disabled defaultValue={review.rating} style={{ fontSize: '14px', marginBottom: '0.5rem' }} />
                          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.5' }}>{review.comment}</p>
                        </div>
                      }
                    />
                  </List.Item>
                )}
                locale={{ emptyText: <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>No reviews yet for this vehicle.</div> }}
              />
            </div>
          </div>

          {/* RIGHT: Booking Panel & Owner Info */}
          <div className="detail-sidebar">
            <div className="booking-panel card">
              <div className="booking-price-header">
                <h2>LKR {vehicle.pricePerDay.toLocaleString()}</h2>
                <span>/ day</span>
              </div>

              {(vehicle.pricePerWeek || vehicle.pricePerMonth) && (
                <div className="bulk-pricing-options" style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {vehicle.pricePerWeek && (
                    <div className="bulk-price-tag" style={{ fontSize: '0.9rem', color: 'var(--color-success)', fontWeight: 600 }}>
                      LKR {vehicle.pricePerWeek.toLocaleString()} / week
                    </div>
                  )}
                  {vehicle.pricePerMonth && (
                    <div className="bulk-price-tag" style={{ fontSize: '0.9rem', color: 'var(--color-success)', fontWeight: 600 }}>
                      LKR {vehicle.pricePerMonth.toLocaleString()} / month
                    </div>
                  )}
                </div>
              )}

              {(bookedRanges.length > 0 || blackoutRanges.length > 0) && (
                <Tag 
                  color="orange" 
                  icon={<AlertTriangle size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />}
                  style={{ marginTop: '0.75rem', borderRadius: '4px', padding: '2px 8px' }}
                >
                  Partially booked – check availability
                </Tag>
              )}

              {user && !user.isKycVerified && (
                <div className="verification-alert box-highlight" style={{ background: '#fff7ed', border: '1px solid #fdba74', padding: '1rem', borderRadius: '12px', marginTop: '1.5rem', display: 'flex', gap: '10px' }}>
                  <Shield size={20} style={{ color: '#ea580c', flexShrink: 0 }} />
                  <div style={{ fontSize: '0.875rem' }}>
                    <p style={{ fontWeight: 600, color: '#9a3412', marginBottom: '4px' }}>KYC Verification Required</p>
                    <p style={{ color: '#c2410c' }}>Complete your identity verification to book vehicles.</p>
                    <Link to="/verify" style={{ color: 'var(--primary-color)', fontWeight: 600, marginTop: '8px', display: 'inline-block' }}>Verify Now &rarr;</Link>
                  </div>
                </div>
              )}

              {user && user._id === (owner?._id || vehicle.owner) ? (
                <div className="box-highlight" style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', padding: '1rem', borderRadius: '12px', marginTop: '1.5rem', textAlign: 'center' }}>
                  <p style={{ fontWeight: 600, color: '#475569', marginBottom: '4px' }}>This is your vehicle</p>
                  <p style={{ color: '#64748b', fontSize: '0.875rem' }}>You cannot book your own listing.</p>
                  <Link to="/dashboard" className="btn btn-secondary btn-sm" style={{ marginTop: '1rem' }}>Go to Dashboard</Link>
                </div>
              ) : (
                <button
                  className="btn btn-primary btn-lg btn-full"
                  onClick={handleBookingTrigger}
                  style={{ marginTop: '1.5rem', height: '54px', fontSize: '1.1rem' }}
                >
                  Book Now
                </button>
              )}

              <div className="booking-perks">
                <div className="perk">
                  <CheckCircle size={16} className="text-success" />
                  <span>Free cancellation up to 24 hours before</span>
                </div>
                <div className="perk">
                  <CheckCircle size={16} className="text-success" />
                  <span>Host approval required</span>
                </div>
                <div className="perk">
                  <CheckCircle size={16} className="text-success" />
                  <span>Distance limits may apply</span>
                </div>
              </div>
            </div>

            <Card className="owner-panel" bordered={false} bodyStyle={{ padding: '1.5rem' }} style={{ marginTop: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
              <h3 style={{ marginBottom: '1.25rem', fontSize: '1.1rem', color: 'var(--text-secondary)' }}>Hosted By</h3>
              {owner ? (
                <div className="owner-profile-preview">
                  <Badge
                    count={owner.ownerType === 'VERIFIED' ? <CheckCircle size={14} style={{ color: '#10b981', background: '#fff', borderRadius: '50%' }} /> : 0}
                    offset={[-4, 44]}
                  >
                    <Avatar
                      src={getImageUrl(owner.profilePic) || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(owner.name) + '&background=e2e8f0'}
                      alt={owner.name}
                      size={64}
                      style={{ border: '2px solid var(--primary-color)' }}
                    />
                  </Badge>
                  <div className="owner-info-text" style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <strong style={{ fontSize: '1.1rem' }}>{owner.name}</strong>
                    </div>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>Joined 2026</span>
                  </div>
                </div>
              ) : (
                <div style={{ color: 'var(--text-tertiary)' }}>Unknown Owner</div>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* MOBILE STICKY BOOKING BAR */}
      {isMobile && !showBookingModal && !createdBooking && (!user || user._id !== (owner?._id || vehicle.owner)) && (
        <div className="mobile-booking-bar animate-slide-up">
          <div className="mobile-bar-price">
            <span className="bar-amount">LKR {vehicle.pricePerDay.toLocaleString()}</span>
            <span className="bar-unit">/day</span>
          </div>
          <button className="btn btn-primary btn-md" onClick={handleBookingTrigger}>
            Book Now
          </button>
        </div>
      )}

      {/* BOOKING MODAL */}
      <Modal
        open={showBookingModal}
        onCancel={() => { setShowBookingModal(false); setCreatedBooking(null); setDateRange(null); }}
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

            <div className="owner-contact-card box-highlight" style={{ padding: '1.5rem', background: 'var(--bg-secondary)', borderRadius: '12px', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem', textAlign: 'left' }}>
              <img
                src={typeof createdBooking.owner === 'object' ? getImageUrl(createdBooking.owner.profilePic) || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(createdBooking.owner.name) : ''}
                alt=""
                style={{ width: '50px', height: '50px', borderRadius: '50%' }}
              />
              <div>
                <div style={{ fontWeight: '600' }}>{typeof createdBooking.owner === 'object' ? createdBooking.owner.name : 'Owner'}</div>
                <div style={{ color: 'var(--primary-color)', fontWeight: '700', fontSize: '1.25rem', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Phone size={18} /> {typeof createdBooking.owner === 'object' ? createdBooking.owner.phone || 'No phone provided' : ''}
                </div>
              </div>
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
                          <span>Daily Rate x {days} days</span>
                          <span>LKR {(days * vehicle.pricePerDay).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                    <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '1rem 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700', fontSize: '1.1rem' }}>
                      <span>Total Amount</span>
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
    </div>
  );
}
