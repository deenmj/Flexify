import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import dayjs, { type Dayjs } from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { Row, Col, Calendar, DatePicker, Tooltip, Modal, message, List, Rate, Avatar, Card, Badge, Tag, Input, Button, Select } from 'antd';
import { vehicleApi, bookingApi, reviewApi, feedbackApi, type Vehicle, type BookedRange, type BlackoutRange, type Review, getImageUrl } from '../api';
import { Users, CheckCircle, Star, Calendar as CalIcon, ArrowRight, Phone, Shield, MessageSquare, AlertTriangle, Zap, Gauge, MapPin, Eye, EyeOff, Trash2, Edit, Flag, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useIsMobile } from '../hooks/useIsMobile';
import './VehicleDetail.css';
import { useRef } from 'react';

dayjs.extend(isBetween);
const { RangePicker } = DatePicker;

export default function VehicleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const sentinelRef = useRef<HTMLDivElement>(null);
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
          <div className="avail-status-container">
            <div className="status-indicator confirmed">
              <span className="status-text">Booked</span>
            </div>
          </div>
        </Tooltip>
      );
    }
    if (pending) {
      return (
        <Tooltip title="Booking Pending">
          <div className="avail-status-container">
            <div className="status-indicator pending">
              <span className="status-text">Pending</span>
            </div>
          </div>
        </Tooltip>
      );
    }
    if (blackedOut) {
      return (
        <Tooltip title="Owner Unavailable / Blackout">
          <div className="avail-status-container">
            <div className="status-indicator blackout">
              <span className="status-text">Unavailable</span>
            </div>
          </div>
        </Tooltip>
      );
    }

    // NEW: Show 'Available' badge if the date is in the future and not blocked
    // only if it's not in the past (to keep it clean)
    if (date.isSame(dayjs(), 'day') || date.isAfter(dayjs(), 'day')) {
      return (
        <div className="avail-status-container">
          <div className="status-indicator available">
            <span className="status-text">Available</span>
          </div>
        </div>
      );
    }

    return null;
  }, [isDateBooked, isDateBlackedOut]);

  const handleBookNow = async () => {
    if (!user) {
      navigate('/auth', { state: { returnTo: `/vehicles/${id}` } });
      return;
    }

    // Only block booking if documents haven't been uploaded at all
    if (user.verificationStatus === 'not_submitted') {
      navigate(`/verify?returnTo=${encodeURIComponent(`/vehicles/${id}`)}`);
      return;
    }

    if (!dateRange || !dateRange[0] || !dateRange[1]) {
      message.error('Please select both pickup and return dates');
      return;
    }

    setBookingLoading(true);
    const startStr = dateRange[0].toISOString();
    const endStr = dateRange[1].toISOString();

    try {
      const resp = await bookingApi.create(id!, startStr, endStr);
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
    if (user.verificationStatus === 'not_submitted') return 'Verify & Continue Booking';
    return 'Book Now';
  };

  const handleBookingTrigger = () => {
    if (!user) {
      navigate('/auth', { state: { returnTo: `/vehicles/${id}` } });
      return;
    }
    if (user.verificationStatus === 'not_submitted') {
      navigate(`/verify?returnTo=${encodeURIComponent(`/vehicles/${id}`)}`);
      return;
    }
    setShowBookingModal(true);
  };

  const handleToggleStatus = async () => {
    if (!id || !vehicle) return;
    try {
      await vehicleApi.toggleStatus(id);
      setVehicle({ ...vehicle, isActive: !vehicle.isActive });
      message.success(vehicle.isActive ? 'Vehicle is now hidden' : 'Vehicle is now visible');
    } catch (err: any) {
      message.error(err.message || 'Failed to update status');
    }
  };

  const handleDeleteVehicle = () => {
    if (!id) return;
    Modal.confirm({
      title: 'Delete Vehicle',
      content: 'Are you sure you want to delete this vehicle? This action cannot be undone.',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await vehicleApi.delete(id);
          message.success('Vehicle deleted successfully');
          navigate('/dashboard');
        } catch (err: any) {
          message.error(err.message || 'Failed to delete vehicle');
        }
      }
    });
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
        <div className="container" style={{ paddingTop: isMobile ? '0.75rem' : '1.5rem', paddingBottom: '3rem' }}>
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

  const validPhotos = vehicle.photos?.filter(p => {
    if (!p) return false;
    if (typeof p === 'object') return !!p.url;
    return typeof p === 'string' && p.trim() !== '';
  });
  const displayImages = (validPhotos && validPhotos.length > 0) ? validPhotos : [null];
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
      <div className="container" style={{ position: 'relative', paddingTop: isMobile ? '0.75rem' : '1.5rem', paddingBottom: '3rem' }}>
        
        <Row gutter={[24, 24]}>
          {/* LEFT COLUMN: Main Content */}
          <Col xs={24} lg={16}>
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

            <div className="detail-overview card" style={{ marginTop: '1.5rem', padding: isMobile ? '1.25rem' : '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
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

              {vehicle.description && (
                <>
                  <h3 className="section-title-minor" style={{ marginTop: '2rem' }}>Description</h3>
                  <p className="detail-desc" style={{ marginTop: '0.75rem', fontSize: '1rem', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
                    {vehicle.description}
                  </p>
                </>
              )}

              <h3 className="section-title-minor" style={{ marginTop: '2.5rem' }}>Technical Specifications</h3>
              <div className="detail-specs-grid" style={{ marginTop: '1.25rem' }}>
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
                      {vehicle.fuelConsumption}
                    </span>
                  </div>
                )}
                <div className="spec-item">
                  <span className="spec-label">Km Limit / Day</span>
                  <span className="spec-value" style={{ color: vehicle.kmLimitPerDay ? '#ea580c' : '#10b981', fontWeight: 700 }}>
                    {vehicle.kmLimitPerDay ? `${vehicle.kmLimitPerDay} km` : '∞ Unlimited'}
                  </span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Category</span>
                  <span className="spec-value">{vehicle.serviceType?.[0] || 'Standard'}</span>
                </div>
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
                        } catch (e) {
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
                    cellRender={(date) => dateCellRender(date as Dayjs)} 
                    headerRender={({ value, type, onChange, onTypeChange }) => {
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
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
                      <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#f0fdf4', border: '1px solid #86efac' }}></span>
                      Available
                    </span>
                  </div>
                </Col>
              </Row>
            </div>

            {/* REVIEWS SECTION */}
            <div className="detail-reviews card" style={{ marginTop: '1.5rem', padding: '2rem' }}>
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
                {!isMobile && (
                  <div className="booking-price-header">
                    <h2>LKR {vehicle.pricePerDay.toLocaleString()}</h2>
                    <span>/ day</span>
                  </div>
                )}

                {(vehicle.pricePerWeek || vehicle.pricePerMonth) && (
                  <div className="bulk-pricing-options" style={{ marginTop: isMobile ? '0' : '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {vehicle.pricePerWeek && (
                      <div className="bulk-price-tag" style={{ fontSize: '0.9rem', color: '#10b981', fontWeight: 600 }}>
                        <Zap size={14} style={{ display: 'inline', marginRight: 6 }} />
                        LKR {vehicle.pricePerWeek.toLocaleString()} / week
                      </div>
                    )}
                    {vehicle.pricePerMonth && (
                      <div className="bulk-price-tag" style={{ fontSize: '0.9rem', color: '#10b981', fontWeight: 600 }}>
                        <Zap size={14} style={{ display: 'inline', marginRight: 6 }} />
                        LKR {vehicle.pricePerMonth.toLocaleString()} / month
                      </div>
                    )}
                  </div>
                )}

                <div className="km-limit-badge-detail" style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1rem', borderRadius: '10px', background: vehicle.kmLimitPerDay ? '#fff7ed' : '#f0fdf4', border: `1px solid ${vehicle.kmLimitPerDay ? '#fed7aa' : '#bbf7d0'}` }}>
                  <span style={{ fontSize: '1.2rem' }}>{vehicle.kmLimitPerDay ? '🛣️' : '∞'}</span>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: vehicle.kmLimitPerDay ? '#c2410c' : '#15803d' }}>
                      {vehicle.kmLimitPerDay ? `${vehicle.kmLimitPerDay} km / day limit` : 'Unlimited Kilometers'}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                      {vehicle.kmLimitPerDay ? 'Extra charges may apply beyond this limit' : 'Drive as much as you need'}
                    </div>
                  </div>
                </div>

                {(bookedRanges.length > 0 || blackoutRanges.length > 0) && (
                  <Tag 
                    color="orange" 
                    icon={<AlertTriangle size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />}
                    style={{ marginTop: '1rem', borderRadius: '4px', padding: '2px 8px', width: '100%', textAlign: 'center' }}
                  >
                    High Demand Listing
                  </Tag>
                )}

                {user && user.verificationStatus === 'not_submitted' && (
                  <div className="verification-alert box-highlight" style={{ background: '#fff7ed', border: '1px solid #fdba74', padding: '1rem', borderRadius: '12px', marginTop: '1.5rem', display: 'flex', gap: '10px' }}>
                    <Shield size={20} style={{ color: '#ea580c', flexShrink: 0 }} />
                    <div style={{ fontSize: '0.875rem' }}>
                      <p style={{ fontWeight: 600, color: '#9a3412', marginBottom: '4px' }}>One-Time Verification Required</p>
                      <p style={{ color: '#c2410c' }}>Verify your identity once to start booking vehicles.</p>
                      <Link to={`/verify?returnTo=${encodeURIComponent(`/vehicles/${id}`)}`} style={{ color: 'var(--primary-color)', fontWeight: 600, marginTop: '8px', display: 'inline-block' }}>Verify Now &rarr;</Link>
                    </div>
                  </div>
                )}

                {user && user._id === (owner?._id || vehicle.owner) ? (
                  <div className="box-highlight" style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', padding: '1.25rem', borderRadius: '12px', marginTop: '1.5rem', textAlign: 'center' }}>
                    <p style={{ fontWeight: 600, color: '#475569', marginBottom: '12px', fontSize: '1rem' }}>Vehicle Management</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <Link to={`/edit-vehicle/${id}`} className="btn btn-secondary btn-sm btn-full" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <Edit size={16} /> Edit Details
                      </Link>
                      <button className="btn btn-sm btn-full" onClick={handleToggleStatus} style={{ background: 'white', color: '#475569', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        {vehicle.isActive ? <><EyeOff size={16} /> Hide Listing</> : <><Eye size={16} /> Show Listing</>}
                      </button>
                      <button className="btn btn-sm btn-full" onClick={handleDeleteVehicle} style={{ background: '#fee2e2', color: '#ef4444', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <Trash2 size={16} /> Delete Vehicle
                      </button>
                      <div style={{ marginTop: '4px', borderTop: '1px solid #e2e8f0', paddingTop: '8px' }}>
                        <Link to="/dashboard" style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', textDecoration: 'underline' }}>Back to Dashboard</Link>
                      </div>
                    </div>
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
        <div ref={sentinelRef} style={{ height: '1px', marginTop: '2rem' }}></div>
      </div>

      {/* MOBILE STICKY BOOKING BAR */}
      {isMobile && !showBookingModal && !createdBooking && (!user || user._id !== (owner?._id || vehicle.owner)) && (
        <div className={`mobile-booking-bar animate-slide-up ${!barVisible ? 'mobile-booking-bar-hidden' : ''}`}>
          <div className="mobile-bar-price">
            <span className="bar-amount">LKR {vehicle.pricePerDay.toLocaleString()}</span>
            <span className="bar-unit">/day</span>
          </div>
          <button className="btn btn-primary btn-md" onClick={handleBookingTrigger} style={{ height: '44px', padding: '0 24px', fontWeight: 700, borderRadius: '10px' }}>
            {getBookingButtonText()}
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
    </div>
  );
}
