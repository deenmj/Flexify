import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { vehicleApi, bookingApi, type Vehicle } from '../api';
import { ArrowLeft, Users, CheckCircle, Star, ShieldCheck, DollarSign, Calendar, ArrowRight, Phone, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './VehicleDetail.css';

export default function VehicleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [createdBooking, setCreatedBooking] = useState<any>(null);

  // active carousel image
  const [activeImage, setActiveImage] = useState(0);

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

  const handleBookNow = async () => {
    if (!user) {
      navigate('/auth', { state: { returnTo: `/vehicles/${id}` } });
      return;
    }

    if (!user.verified) {
      navigate('/verify');
      return;
    }
    
    if (!startDate || !endDate) {
      setBookingError('Please select pickup and return dates');
      return;
    }

    setBookingLoading(true);
    setBookingError('');

    try {
      const resp = await bookingApi.create(id!, startDate.toISOString(), endDate.toISOString());
      setCreatedBooking(resp);
      // Removed automatic alert and navigate to show success state in modal
    } catch (err: any) {
      setBookingError(err.message || 'Failed to submit booking');
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return <div className="detail-loading">Loading vehicle details...</div>;
  }

  if (error || !vehicle) {
    return (
      <div className="container" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
        <h2>Vehicle not found</h2>
        <p>{error}</p>
        <button className="btn btn-primary" onClick={() => navigate('/explore')} style={{ marginTop: '1rem' }}>
          Back to Explore
        </button>
      </div>
    );
  }

  const images = (vehicle.photos && vehicle.photos.length > 0) ? vehicle.photos : (vehicle.images || []);
  const displayImages = images.length > 0 ? images : ['https://images.unsplash.com/photo-1542367597-87b9a3b9d8a6?auto=format&fit=crop&w=1200&q=80'];
  const owner = typeof vehicle.owner === 'object' ? vehicle.owner : null;

  return (
    <div className="vehicle-detail-page">
      <div className="container" style={{ position: 'relative', paddingTop: '1.5rem', paddingBottom: '3rem' }}>
        <button 
          onClick={() => navigate('/explore')} 
          className="btn btn-ghost"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem', color: 'var(--text-secondary)' }}
        >
          <ArrowLeft size={18} /> Back to Search
        </button>

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
                  <Star size={20} fill="#f59e0b" color="#f59e0b" />
                  <span className="rating-score">4.8</span>
                  <span className="rating-count">(24 reviews)</span>
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
                    {vehicle.location?.address || vehicle.location?.text || 'Not specified'}
                  </span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Category</span>
                  <span className="spec-value">{vehicle.serviceType?.[0] || 'Standard Rental'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Booking Panel & Owner Info */}
          <div className="detail-sidebar">
            <div className="booking-panel card">
              <div className="booking-price-header">
                <h2><DollarSign size={24} style={{ verticalAlign: 'text-bottom' }}/>{vehicle.pricePerDay}</h2>
                <span>/ day</span>
              </div>
              
              {!user?.verified && (
                <div className="verification-alert box-highlight" style={{ background: '#fff7ed', border: '1px solid #fdba74', padding: '1rem', borderRadius: '12px', marginTop: '1.5rem', display: 'flex', gap: '10px' }}>
                   <Shield size={20} style={{ color: '#ea580c', flexShrink: 0 }} />
                   <div style={{ fontSize: '0.875rem' }}>
                      <p style={{ fontWeight: 600, color: '#9a3412', marginBottom: '4px' }}>Verification Required</p>
                      <p style={{ color: '#c2410c' }}>You must verify your identity before you can book this vehicle.</p>
                      <Link to="/verify" style={{ color: 'var(--primary-color)', fontWeight: 600, marginTop: '8px', display: 'inline-block' }}>Verify Now &rarr;</Link>
                   </div>
                </div>
              )}
              
              <button 
                className="btn btn-primary btn-lg btn-full"
                onClick={() => {
                  if (!user) {
                    navigate('/auth', { state: { returnTo: `/vehicles/${id}` } });
                    return;
                  }
                  if (!user.verified) {
                    navigate('/verify');
                    return;
                  }
                  setShowBookingModal(true);
                }}
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
                      {owner.verified && <ShieldCheck size={16} className="text-success" />}
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

      {/* BOOKING MODAL */}
      {showBookingModal && (
        <div className="modal-overlay" onClick={() => setShowBookingModal(false)}>
          <div className="modal-content booking-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => { setShowBookingModal(false); setCreatedBooking(null); }}>&times;</button>
            
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
                  {vehicle.title} • ${vehicle.pricePerDay}/day
                </p>
                
                {bookingError && <div className="auth-message error" style={{ marginBottom: '1rem' }}>{bookingError}</div>}

                <div className="booking-form-content">
                  <div className="booking-date-pickers" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="input-group">
                      <label><Calendar size={16} style={{ verticalAlign: 'text-bottom', marginRight: '6px' }}/> Pickup Date</label>
                      <DatePicker 
                        selected={startDate} 
                        onChange={(date: Date | null) => setStartDate(date)} 
                        selectsStart 
                        startDate={startDate} 
                        endDate={endDate} 
                        minDate={new Date()}
                        className="input-field"
                        placeholderText="Select pickup date"
                        wrapperClassName="datepicker-wrapper"
                      />
                    </div>
                    <div className="input-group">
                      <label><Calendar size={16} style={{ verticalAlign: 'text-bottom', marginRight: '6px' }}/> Return Date</label>
                      <DatePicker 
                        selected={endDate} 
                        onChange={(date: Date | null) => setEndDate(date)} 
                        selectsEnd 
                        startDate={startDate} 
                        endDate={endDate} 
                        minDate={startDate || new Date()}
                        className="input-field"
                        placeholderText="Select return date"
                        wrapperClassName="datepicker-wrapper"
                      />
                    </div>
                    
                    {startDate && endDate && (
                      <div className="booking-summary box-highlight" style={{ padding: '1.5rem', background: 'var(--bg-secondary)', borderRadius: '12px', marginTop: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                          <span>${vehicle.pricePerDay} x {Math.ceil((endDate.getTime() - startDate.getTime()) / (1000*60*60*24)) || 1} days</span>
                          <span>${vehicle.pricePerDay * (Math.ceil((endDate.getTime() - startDate.getTime()) / (1000*60*60*24)) || 1)}</span>
                        </div>
                        <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '1rem 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700', fontSize: '1.1rem' }}>
                          <span>Total Amount</span>
                          <span>${vehicle.pricePerDay * (Math.ceil((endDate.getTime() - startDate.getTime()) / (1000*60*60*24)) || 1)}</span>
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
          </div>
        </div>
      )}
    </div>
  );
}
