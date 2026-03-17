import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import dayjs, { type Dayjs } from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { Calendar, DatePicker, Tooltip, Modal, message, List, Rate, Avatar } from 'antd';
import { vehicleApi, bookingApi, reviewApi, type Vehicle, type BookedRange, type BlackoutRange, type Review } from '../api';
import { Users, CheckCircle, Star, ShieldCheck, Calendar as CalIcon, ArrowRight, Phone, Shield, MessageSquare } from 'lucide-react';
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
    if (current.isBefore(dayjs(), 'day')) return true;
    return isDateBooked(current, 'CONFIRMED') || isDateBlackedOut(current);
  }, [isDateBooked, isDateBlackedOut]);

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

  const displayImages = (vehicle.photos && vehicle.photos.length > 0) ? vehicle.photos : ['https://images.unsplash.com/photo-1542367597-87b9a3b9d8a6?auto=format&fit=crop&w=1200&q=80'];
  const owner = typeof vehicle.owner === 'object' ? vehicle.owner : null;

  // Calculate days & total from RangePicker
  const days = dateRange && dateRange[0] && dateRange[1]
    ? dateRange[1].diff(dateRange[0], 'day') || 1
    : 0;
  const totalAmount = days * vehicle.pricePerDay;

  return (
    <div className="vehicle-detail-page">
      <div className="container" style={{ position: 'relative', paddingTop: '1.5rem', paddingBottom: '3rem' }}>

        <div className="detail-grid">
          {/* LEFT: Image Carousel & Overview */}
          <div className="detail-main">
            <div className="detail-carousel-container">
              <img
                src={displayImages[activeImage]}
                alt={vehicle.title}
                className="detail-main-img animate-fade-in"
                onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542367597-87b9a3b9d8a6?auto=format&fit=crop&w=1200&q=80'; }}
              />
              {displayImages.length > 1 && (
                <div className="detail-thumbnails">
                  {displayImages.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
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

              <p className="detail-desc" style={{ marginTop: '1.5rem', fontSize: '1.05rem', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
                {vehicle.description || "No description provided for this vehicle. Enjoy a premium, comfortable ride perfect for your specified needs."}
              </p>

              <h3 style={{ marginTop: '2rem', marginBottom: '1rem', fontSize: '1.25rem' }}>Full Specifications</h3>
              <div className="detail-specs-grid">
                <div className="spec-item">
                  <span className="spec-label">Transmission</span>
                  <span className="spec-value">{vehicle.transmission || 'Automatic'}</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Fuel Type</span>
                  <span className="spec-value">{vehicle.fuelType || 'Petrol'}</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Seats</span>
                  <span className="spec-value">
                    <Users size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                    {vehicle.seats || 4}
                  </span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Location Area</span>
                  <span className="spec-value">
                    {vehicle.location?.address || 'Not specified'}
                  </span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Category</span>
                  <span className="spec-value">{vehicle.serviceType?.[0] || 'Standard Rental'}</span>
                </div>
              </div>
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
                      avatar={<Avatar src={review.reviewer.profilePic} alt={review.reviewer.name} />}
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

              <button
                className="btn btn-primary btn-lg btn-full"
                onClick={handleBookingTrigger}
                style={{ marginTop: '1.5rem', height: '54px', fontSize: '1.1rem' }}
              >
                Book Now
              </button>

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

            <div className="owner-panel card" style={{ marginTop: '1.5rem' }}>
              <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Hosted By</h3>
              {owner ? (
                <div className="owner-profile-preview">
                  <img
                    src={owner.profilePic || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(owner.name) + '&background=e2e8f0'}
                    alt={owner.name}
                    className="owner-avatar"
                  />
                  <div className="owner-info-text">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <strong>{owner.name}</strong>
                      {owner.ownerType === 'VERIFIED' && <ShieldCheck size={16} className="text-success" />}
                    </div>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>Joined {new Date().getFullYear()}</span>
                  </div>
                </div>
              ) : (
                <div style={{ color: 'var(--text-tertiary)' }}>Unknown Owner</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE STICKY BOOKING BAR */}
      {isMobile && !showBookingModal && !createdBooking && (
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
                src={typeof createdBooking.owner === 'object' ? createdBooking.owner.profilePic || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(createdBooking.owner.name) : ''}
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
                  <RangePicker
                    value={dateRange}
                    onChange={(dates) => setDateRange(dates)}
                    disabledDate={disabledDate}
                    format="YYYY-MM-DD"
                    style={{ width: '100%', height: '44px' }}
                    placeholder={['Pickup Date', 'Return Date']}
                    size="large"
                  />
                </div>

                {days > 0 && (
                  <div className="booking-summary box-highlight" style={{ padding: '1.5rem', background: 'var(--bg-secondary)', borderRadius: '12px', marginTop: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                      <span>LKR {vehicle.pricePerDay.toLocaleString()} x {days} day{days > 1 ? 's' : ''}</span>
                      <span>LKR {totalAmount.toLocaleString()}</span>
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
