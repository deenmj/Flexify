import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useSearchParams } from 'react-router-dom';
import dayjs, { type Dayjs } from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { Calendar, Modal, message, Select, Tag, DatePicker, Button, Form, Input, Rate, Image, Row, Col } from 'antd';
import { vehicleApi, bookingApi, blackoutApi, reviewApi, type Vehicle, type Booking, type BookedRange, type Blackout, type BlackoutRange, type Review, getImageUrl } from '../api';
import {
  Car, Calendar as CalIcon, DollarSign, CheckCircle, XCircle,
  Clock, Eye, EyeOff, Trash2, Phone, Shield, AlertTriangle,
  CalendarOff, Star, MessageSquare, Zap, Edit
} from 'lucide-react';
import { notification } from 'antd';

const { RangePicker } = DatePicker;
import { useSocket } from '../context/SocketContext';
import { useIsMobile } from '../hooks/useIsMobile';
import './Dashboard.css';

dayjs.extend(isBetween);

export default function Dashboard() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const isMobile = useIsMobile();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'vehicles' | 'bookings' | 'calendar' | 'reviews' | 'subscription'>(user?.role === 'user' ? 'bookings' : 'vehicles');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Calendar tab state (owner only)
  const [calendarVehicleId, setCalendarVehicleId] = useState<string>('');
  const [calendarRanges, setCalendarRanges] = useState<BookedRange[]>([]);
  const [blackoutRanges, setBlackoutRanges] = useState<BlackoutRange[]>([]);
  const [blackouts, setBlackouts] = useState<Blackout[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [showBlackoutModal, setShowBlackoutModal] = useState(false);
  const [blackoutForm] = Form.useForm();
  const [blackoutSaving, setBlackoutSaving] = useState(false);

  // Review state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewForm] = Form.useForm();
  const [submittingReview, setSubmittingReview] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  // Review Renter Modal state
  const [showRenterModal, setShowRenterModal] = useState(false);
  const [selectedRenter, setSelectedRenter] = useState<any>(null);
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);
  const [searchParams] = useSearchParams();

  // Highlight logic from URL
  useEffect(() => {
    const highlightId = searchParams.get('highlight');
    const targetTab = searchParams.get('tab');
    
    if (targetTab === 'bookings') {
      setTab('bookings');
    }

    if (highlightId) {
      setTimeout(() => {
        const element = document.getElementById(`booking-${highlightId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('highlight-row');
          setTimeout(() => element.classList.remove('highlight-row'), 3000);
        }
      }, 500);
    }
  }, [searchParams, bookings.length]);

  useEffect(() => {
    const promises: Promise<any>[] = [
      vehicleApi.getMy().catch(() => []),
      bookingApi.getMy().catch(() => []),
    ];

    if (user?.role === 'owner') {
      promises.push(reviewApi.getMyReviews().catch(() => []));
    } else {
      promises.push(Promise.resolve([]));
    }

    Promise.all(promises).then(([v, b, r]) => {
      setVehicles(v as Vehicle[]);
      setBookings(b as Booking[]);
      setReviews(r as Review[]);
      // Set default calendar vehicle
      if ((v as Vehicle[]).length > 0) setCalendarVehicleId((v as Vehicle[])[0]._id);
    }).finally(() => setLoading(false));
  }, [user]);

  // Handle Real-time Sockets
  useEffect(() => {
    if (!socket) return;

    // Listen for new bookings (Owners only)
    if (user?.role === 'owner') {
      socket.on('newBookingRequest', (data: any) => {
        notification.success({
          message: '🔔 New Booking Request!',
          description: `${data.renterName} wants to rent your ${data.vehicleTitle}.`,
          duration: 10,
          placement: 'topRight',
          onClick: () => setTab('bookings')
        });
        // Add to local state
        bookingApi.getMy().then(setBookings);
      });
    }

    // Listen for status updates (Renters only)
    if (user?.role === 'user') {
      socket.on('bookingStatusUpdate', (data: any) => {
        notification.info({
          message: '📅 Booking Update',
          description: data.message,
          duration: 7,
          placement: 'topRight'
        });
        // Refresh local bookings
        bookingApi.getMy().then(setBookings);
      });
    }

    return () => {
      socket.off('newBookingRequest');
      socket.off('bookingStatusUpdate');
    };
  }, [socket, user]);

  // Fetch calendar availability & blackouts when vehicle changes
  useEffect(() => {
    if (!calendarVehicleId) return;
    setCalendarLoading(true);

    Promise.all([
      vehicleApi.getAvailability(calendarVehicleId),
      blackoutApi.getForVehicle(calendarVehicleId)
    ])
      .then(([availData, blackoutData]) => {
        setCalendarRanges(availData.bookedRanges);
        setBlackoutRanges(availData.blackoutRanges);
        setBlackouts(blackoutData);
      })
      .catch(() => {
        setCalendarRanges([]);
        setBlackoutRanges([]);
        setBlackouts([]);
      })
      .finally(() => setCalendarLoading(false));
  }, [calendarVehicleId]);

  const handleAddBlackout = async (values: any) => {
    if (!values.dates || !values.dates[0] || !values.dates[1]) return;
    if (!calendarVehicleId) return;

    setBlackoutSaving(true);
    try {
      const newBlackout = await blackoutApi.create(
        calendarVehicleId,
        values.dates[0].toISOString(),
        values.dates[1].toISOString(),
        values.reason
      );
      setBlackouts([...blackouts, newBlackout]);
      setBlackoutRanges([...blackoutRanges, { start: newBlackout.startDate, end: newBlackout.endDate }]);
      message.success('Blackout period added successfully');
      setShowBlackoutModal(false);
      blackoutForm.resetFields();
    } catch (err: any) {
      message.error(err.message || 'Failed to add blackout period');
    } finally {
      setBlackoutSaving(false);
    }
  };

  const handleDeleteBlackout = async (id: string, startDay: string, endDay: string) => {
    try {
      await blackoutApi.delete(id);
      setBlackouts(prev => prev.filter(b => b._id !== id));
      setBlackoutRanges(prev => prev.filter(br => br.start !== startDay || br.end !== endDay));
      message.success('Blackout period removed');
    } catch (err: any) {
      message.error(err.message || 'Failed to remove blackout');
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await vehicleApi.toggleStatus(id);
      setVehicles(prev => prev.map(v => v._id === id ? { ...v, isActive: !v.isActive } : v));
      message.success('Vehicle status updated');
    } catch (err: any) { message.error(err.message || 'Failed to update status'); }
  };

  const handleDeleteVehicle = async (id: string) => {
    Modal.confirm({
      title: 'Delete Vehicle',
      content: 'Are you sure you want to delete this vehicle? This action cannot be undone.',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await vehicleApi.delete(id);
          setVehicles(prev => prev.filter(v => v._id !== id));
          message.success('Vehicle deleted');
        } catch (err: any) { message.error(err.message || 'Failed to delete vehicle'); }
      },
    });
  };

  const handleAcceptBooking = async (id: string) => {
    const previousBookings = [...bookings];
    
    // 1. Instant Optimistic UI Update
    setBookings(prev => prev.map(bk => bk._id === id ? { ...bk, status: 'CONFIRMED' } : bk));
    message.success('Booking confirmed!');

    // 2. Short delay for "feel" then API call
    setTimeout(async () => {
      try {
        await bookingApi.accept(id);
        // Refresh to get full populated data (like owner phone etc)
        const updated = await bookingApi.getMy();
        setBookings(updated);
      } catch (err: any) {
        // Rollback on failure
        setBookings(previousBookings);
        message.error(err.message || 'Failed to confirm booking');
      }
    }, 300);
  };

  const handleRejectBooking = async (id: string) => {
    Modal.confirm({
      title: 'Reject Booking',
      content: 'Are you sure you want to reject this booking request?',
      okText: 'Reject',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await bookingApi.reject(id);
          setBookings(prev => prev.map(bk => bk._id === id ? { ...bk, status: 'REJECTED' } : bk));
          message.success('Booking rejected');
        } catch (err: any) { message.error(err.message || 'Failed to reject booking'); }
      },
    });
  };

  const handleCancelBooking = async (id: string) => {
    Modal.confirm({
      title: 'Cancel Booking',
      content: 'Are you sure you want to cancel this booking?',
      okText: 'Cancel Booking',
      okType: 'danger',
      cancelText: 'Go Back',
      onOk: async () => {
        try {
          await bookingApi.cancel(id);
          setBookings(prev => prev.map(bk => bk._id === id ? { ...bk, status: 'CANCELLED' } : bk));
          message.success('Booking cancelled');
        } catch (err: any) { message.error(err.message || 'Failed to cancel booking'); }
      },
    });
  };

  const handleReviewSubmit = async (values: any) => {
    if (!selectedBookingId) return;
    setSubmittingReview(true);
    try {
      await reviewApi.create(selectedBookingId, values.rating, values.comment);
      message.success('Review submitted successfully!');

      // Update local state to hide review button
      setBookings((prev: any[]) => prev.map(b => b._id === selectedBookingId ? { ...b, isReviewed: true } : b));

      setShowReviewModal(false);
      reviewForm.resetFields();
    } catch (err: any) {
      message.error(err.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleToggleReviewVisibility = async (reviewId: string) => {
    try {
      const res = await reviewApi.toggleVisibility(reviewId);
      setReviews((prev: Review[]) => prev.map((r: Review) => r._id === reviewId ? res.review : r));
      message.success(res.message);
    } catch (err: any) {
      message.error(err.message || 'Failed to update review visibility');
    }
  };

  // Calendar cell renderer for owner dashboard
  const calendarCellRender = useCallback((date: Dayjs) => {
    // 1. Regular Bookings
    const matchingBookings = bookings.filter((b) => {
      const veh = typeof b.vehicle === 'object' ? (b.vehicle as Vehicle)._id : b.vehicle;
      if (veh !== calendarVehicleId) return false;
      const start = dayjs(b.startDate).startOf('day');
      const end = dayjs(b.endDate).endOf('day');
      return date.isBetween(start, end, 'day', '[]');
    });

    // 2. Blackout Dates
    const matchingBlackouts = blackouts.filter((b) => {
      const start = dayjs(b.startDate).startOf('day');
      const end = dayjs(b.endDate).endOf('day');
      return date.isBetween(start, end, 'day', '[]');
    });

    if (matchingBookings.length === 0 && matchingBlackouts.length === 0) return null;

    return (
      <div className="dash-cal-events">
        {matchingBookings.map((b) => {
          const renter = typeof b.user === 'object' ? b.user : null;
          return (
            <div
              key={b._id}
              className={`dash-cal-event ${b.status === 'CONFIRMED' ? 'cal-confirmed' : b.status === 'PENDING' ? 'cal-pending' : 'cal-other'}`}
              title={`${renter?.name || 'Renter'} — ${b.status}`}
            >
              <span className="cal-event-name">{renter?.name?.split(' ')[0] || '...'}</span>
            </div>
          );
        })}
        {matchingBlackouts.map((b) => (
          <div
            key={b._id}
            className="dash-cal-event cal-blackout"
            title={`Blackout: ${b.reason || 'Unavailable'}`}
          >
            <span className="cal-event-name">Unavailable</span>
          </div>
        ))}
      </div>
    );
  }, [bookings, blackouts, calendarVehicleId]);

  if (!user) return <div className="container" style={{ padding: '6rem 2rem', textAlign: 'center' }}><h2>Please sign in</h2></div>;

  // Staff (subadmin) behaves like a verified owner in the dashboard
  const isStaff = user.role === 'subadmin';
  const isOwner = user.role === 'owner' || isStaff;
  // All owners can accept bookings (no KYC requirement)
  const isVerifiedOwner = isOwner;

  const vehicleStatusBadge = (status: string, isActive: boolean) => {
    if (status === 'pending') return <Tag color="warning" icon={<Clock size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />}>Pending</Tag>;
    if (status === 'rejected') return <Tag color="error" icon={<XCircle size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />}>Rejected</Tag>;
    if (!isActive) return <Tag color="error">Hidden</Tag>;
    return <Tag color="success">Active</Tag>;
  };

  const bookingStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING': return <Tag color="warning">Pending</Tag>;
      case 'CONFIRMED': return <Tag color="success">Confirmed</Tag>;
      case 'CANCELLED': return <Tag color="error">Cancelled</Tag>;
      case 'COMPLETED': return <Tag color="processing">Completed</Tag>;
      default: return <Tag>{status}</Tag>;
    }
  };

  const filteredVehicles = selectedCategory === 'All'
    ? vehicles
    : vehicles.filter(v => v.serviceType && v.serviceType.includes(selectedCategory));

  return (
    <div className="dashboard-page page-wrapper bg-secondary">

      <div className="dashboard-header section-padding">
        <div className="container" style={{ position: 'relative' }}>
          <h1>My Dashboard</h1>
          <p>Welcome, {user.name}! Manage your {user.role === 'user' ? 'rentals' : 'vehicles and bookings'}.</p>
        </div>
      </div>

      <div className="container" style={{ marginTop: '2rem' }}>
        {/* KYC document upload banner — only for users/renters who haven't uploaded docs */}
        {user.verificationStatus === 'not_submitted' && !isStaff && user.role === 'user' && (
          <div className="card" style={{ background: 'linear-gradient(135deg, #fff7ed, #ffedd5)', border: '1px solid #fed7aa', padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ background: '#ff7e33', color: 'white', padding: '10px', borderRadius: '12px' }}><Shield size={24} /></div>
              <div>
                <h3 style={{ color: '#9a3412', marginBottom: '4px' }}>
                  Upload Your Documents
                </h3>
                <p style={{ color: '#c2410c' }}>
                  Upload your KYC documents to book vehicles. It only takes a minute!
                </p>
              </div>
            </div>
            <Link to="/verify" className="btn btn-primary">Upload Now</Link>
          </div>
        )}
      </div>

      <div className="container dashboard-content section-padding" style={{ paddingTop: 0 }}>
        {/* Stats */}
        {isOwner && (
          <div className="dashboard-stats">
            <div className="stat-card card">
              <div className="stat-icon" style={{ background: '#eff6ff', color: '#1890ff' }}><Car size={24} /></div>
              <div className="stat-info"><span className="stat-number">{vehicles.length}</span><span className="stat-label">My Vehicles</span></div>
            </div>
            <div className="stat-card card">
              <div className="stat-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}><CalIcon size={24} /></div>
              <div className="stat-info"><span className="stat-number">{bookings.length}</span><span className="stat-label">Total Bookings</span></div>
            </div>
            <div className="stat-card card">
              <div className="stat-icon" style={{ background: '#fefce8', color: '#ca8a04' }}><DollarSign size={24} /></div>
              <div className="stat-info"><span className="stat-number">{bookings.filter(b => b.status === 'CONFIRMED').length}</span><span className="stat-label">Confirmed</span></div>
            </div>
            <div className="stat-card card">
              <div className="stat-icon" style={{ background: '#fef2f2', color: '#dc2626' }}><Clock size={24} /></div>
              <div className="stat-info"><span className="stat-number">{bookings.filter(b => b.status === 'PENDING').length}</span><span className="stat-label">Pending</span></div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="dashboard-tabs">
          {isOwner && (
            <button className={`dashboard-tab ${tab === 'vehicles' ? 'active' : ''}`} onClick={() => setTab('vehicles')}>
              <Car size={16} /> My Vehicles
            </button>
          )}
          <button className={`dashboard-tab ${tab === 'bookings' ? 'active' : ''}`} onClick={() => setTab('bookings')}>
            <CalIcon size={16} /> {user.role === 'user' ? 'My Rentals' : 'Bookings'}
          </button>
          {isOwner && (
            <button className={`dashboard-tab ${tab === 'calendar' ? 'active' : ''}`} onClick={() => setTab('calendar')}>
              <CalIcon size={16} /> Calendar
            </button>
          )}
          {isOwner && (
            <button className={`dashboard-tab ${tab === 'reviews' ? 'active' : ''}`} onClick={() => setTab('reviews')}>
              <Star size={16} /> Reviews
            </button>
          )}
          {isOwner && !isStaff && (
            <button className={`dashboard-tab ${tab === 'subscription' ? 'active' : ''}`} onClick={() => setTab('subscription')}>
              <Shield size={16} /> My Subscription
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}>Loading...</div>
        ) : tab === 'vehicles' ? (
          <div className="dashboard-table-wrap card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem', padding: '1.5rem 1.5rem 0' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>My Vehicles</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Category:</label>
                <select
                  className="input-field"
                  style={{ width: 'auto', padding: '0.4rem 0.75rem', fontSize: '0.875rem', height: 'auto' }}
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="All">All Categories</option>
                  <option value="Car">Car</option>
                  <option value="SUV">SUV</option>
                  <option value="Van">Van</option>
                  <option value="Bike">Bike</option>
                  <option value="Truck">Truck</option>
                </select>
              </div>
            </div>

            {filteredVehicles.length === 0 ? (
              <div className="dashboard-empty" style={{ paddingTop: '2rem' }}>
                <Car size={40} strokeWidth={1} />
                <p>{vehicles.length === 0 ? "No vehicles listed yet" : `No ${selectedCategory}s found`}</p>
                {vehicles.length === 0 && <Link to="/list-vehicle" className="btn btn-primary btn-sm">List a Vehicle</Link>}
              </div>
            ) : isMobile ? (
              <div style={{ padding: '0 1rem 1.5rem' }}>
                <Row gutter={[12, 12]}>
                  {filteredVehicles.map(v => (
                    <Col xs={12} key={v._id}>
                      <div className="dash-mobile-card">
                        <div className="dash-mobile-card-img">
                          {v.photos?.[0] ? (
                            <img src={getImageUrl(v.photos[0])} alt={v.title} />
                          ) : (
                            <div className="img-placeholder"><Car size={24} /></div>
                          )}
                          <div className="dash-mobile-card-status">
                            {vehicleStatusBadge(v.status, v.isActive)}
                          </div>
                        </div>
                        <div className="dash-mobile-card-info">
                          <h4 className="truncate">{v.title}</h4>
                          <div className="price">LKR {v.pricePerDay.toLocaleString()}<span>/d</span></div>
                        </div>
                        <div className="dash-mobile-card-actions">
                          <Link to={`/vehicles/edit/${v._id}`} className="mobile-action-btn edit">
                            <Edit size={16} />
                          </Link>
                          <button className="mobile-action-btn toggle" onClick={() => handleToggleStatus(v._id)}>
                            {v.isActive ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                          <button className="mobile-action-btn delete" onClick={() => handleDeleteVehicle(v._id)}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </Col>
                  ))}
                </Row>
              </div>
            ) : (
              <table className="dashboard-table" style={{ borderTop: '1px solid var(--border-color)' }}>
                <thead><tr><th>Photo</th><th>Vehicle</th><th>Category</th><th>Price/day</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {filteredVehicles.map(v => (
                    <tr key={v._id}>
                      <td style={{ width: '90px', paddingLeft: '1.5rem' }}>
                        {v.photos?.[0] ? (
                          <img src={getImageUrl(v.photos[0])} alt={v.title} style={{ width: '60px', height: '40px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border-color-light)' }} />
                        ) : (
                          <div style={{ width: '60px', height: '40px', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px' }}><Car size={16} color="var(--text-tertiary)" /></div>
                        )}
                      </td>
                      <td data-label="Vehicle"><div className="table-vehicle"><strong>{v.title}</strong><span>{v.make} {v.model}</span></div></td>
                      <td data-label="Category">{v.serviceType && v.serviceType.length > 0 ? <span className="badge" style={{ background: 'var(--bg-secondary)', fontWeight: 600 }}>{v.serviceType[0]}</span> : '-'}</td>
                      <td data-label="Price/day" style={{ fontWeight: 700 }}>LKR {v.pricePerDay.toLocaleString()}</td>
                      <td data-label="Status">
                        {vehicleStatusBadge(v.status, v.isActive)}
                      </td>
                      <td data-label="Actions">
                        <div className="table-actions">
                          <Link to={`/vehicles/edit/${v._id}`} className="btn btn-ghost btn-sm" title="Edit">
                            <Edit size={16} />
                          </Link>
                          <button className="btn btn-ghost btn-sm" onClick={() => handleToggleStatus(v._id)} title={v.isActive ? 'Hide' : 'Show'}>
                            {v.isActive ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                          <button className="btn btn-ghost btn-sm text-error" onClick={() => handleDeleteVehicle(v._id)} title="Delete">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : tab === 'bookings' ? (
          <div className="dashboard-table-wrap card">
            {bookings.length === 0 ? (
              <div className="dashboard-empty">
                <CalIcon size={40} strokeWidth={1} />
                <p>No bookings yet</p>
                {user.role === 'user' && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Link to="/explore" className="btn btn-primary btn-sm">Explore Vehicles</Link>
                  </div>
                )}
              </div>
            ) : (
              <table className="dashboard-table">
                <thead><tr><th>Vehicle</th><th>Dates</th><th>Amount</th><th>Status</th><th>Actions/Details</th></tr></thead>
                <tbody>
                  {bookings.map(b => {
                    const vehicle = typeof b.vehicle === 'object' ? b.vehicle : null;
                    const owner = typeof b.owner === 'object' ? b.owner : null;
                    return (
                      <tr key={b._id} id={`booking-${b._id}`}>
                        <td data-label="Vehicle">
                          <div style={{ fontWeight: 600 }}>{vehicle ? (vehicle as Vehicle).title : 'Vehicle'}</div>
                          {vehicle && (
                            <Link to={`/vehicles/${(vehicle as Vehicle)._id}`} className="text-secondary" style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                              <Eye size={12} /> View Details
                            </Link>
                          )}
                        </td>
                        <td data-label="Dates" className="table-dates">{new Date(b.startDate).toLocaleDateString()} — {new Date(b.endDate).toLocaleDateString()}</td>
                        <td data-label="Amount">LKR {b.totalAmount.toLocaleString()}</td>
                        <td data-label="Status">
                          {statusBadge(b.status)}
                          {/* Show owner phone ONLY when confirmed and user is the renter */}
                          {b.status === 'CONFIRMED' && user?.role === 'user' && owner && (
                            <div style={{ marginTop: '8px' }}>
                              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>{owner.name}</div>
                              {owner.phone && (
                                <div style={{ fontSize: '12px', color: '#1890ff', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Phone size={12} /> {owner.phone}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td data-label="Actions" className="table-actions">
                          {/* Review Renter Button (Owner Only) */}
                          {b.status === 'PENDING' && isOwner && (
                            <button 
                              className="btn btn-sm btn-ghost" 
                              style={{ color: '#1890ff', border: '1px solid #1890ff', width: '100%' }}
                              onClick={() => {
                                setSelectedRenter(typeof b.user === 'object' ? b.user : null);
                                setActiveBookingId(b._id);
                                setShowRenterModal(true);
                              }}
                            >
                              <Eye size={14} /> Review Renter
                            </button>
                          )}

                          {/* Owner accept/reject — all owners can accept bookings */}
                          {b.status === 'PENDING' && isVerifiedOwner && (
                            <div style={{ display: 'flex', gap: '4px', marginTop: '4px', width: '100%' }}>
                              <button className="btn btn-sm btn-primary" style={{ flex: 1 }} onClick={() => handleAcceptBooking(b._id)}>
                                <CheckCircle size={14} /> Accept
                              </button>
                              <button className="btn btn-sm btn-danger" style={{ flex: 1 }} onClick={() => handleRejectBooking(b._id)}>
                                <XCircle size={14} /> Reject
                              </button>
                            </div>
                          )}
                          {/* Renter can cancel pending bookings */}
                          {(b.status === 'PENDING') && user?.role === 'user' && (
                            <button className="btn btn-sm btn-danger" style={{ width: '100%' }} onClick={() => handleCancelBooking(b._id)}>
                              <XCircle size={14} /> Cancel
                            </button>
                          )}
                          {/* Renter can review completed bookings */}
                          {b.status === 'COMPLETED' && user?.role === 'user' && !b.isReviewed && (
                            <button className="btn btn-sm btn-primary" style={{ width: '100%' }} onClick={() => { setSelectedBookingId(b._id); setShowReviewModal(true); }}>
                              <Star size={14} /> Review
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        ) : tab === 'calendar' ? (
          /* ===== CALENDAR TAB (Owner Only) ===== */
          <div className="dashboard-calendar-wrap card">
            <div style={{ padding: '1.5rem 1.5rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CalIcon size={18} /> Booking Calendar
              </h3>
              <Select
                value={calendarVehicleId || undefined}
                onChange={(val) => setCalendarVehicleId(val)}
                style={{ minWidth: 220 }}
                placeholder="Select a vehicle"
                options={vehicles.map(v => ({ value: v._id, label: v.title }))}
              />
            </div>

            <div style={{ padding: '1rem 1.5rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#dcfce7', border: '1px solid #86efac' }}></span>
                Confirmed
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#fef3c7', border: '1px solid #fcd34d' }}></span>
                Pending
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#f3f4f6', border: '1px solid #9ca3af' }}></span>
                Blackout / Unavailable
              </span>
              <div style={{ marginLeft: 'auto' }}>
                <Button
                  type="primary"
                  ghost
                  icon={<CalendarOff size={16} />}
                  onClick={() => setShowBlackoutModal(true)}
                  disabled={!calendarVehicleId || calendarLoading}
                >
                  Block Dates
                </Button>
              </div>
            </div>

            {calendarLoading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}>Loading calendar...</div>
            ) : vehicles.length === 0 ? (
              <div className="dashboard-empty">
                <Car size={40} strokeWidth={1} />
                <p>List a vehicle to see its booking calendar</p>
                <Link to="/list-vehicle" className="btn btn-primary btn-sm">List a Vehicle</Link>
              </div>
            ) : (
              <div style={{ padding: '0 1rem 1.5rem' }}>
                <Calendar fullscreen={false} cellRender={(date) => calendarCellRender(date as Dayjs)} />

                {blackouts.length > 0 && (
                  <div style={{ marginTop: '2rem' }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Active Blackout Periods</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {blackouts.map(b => (
                        <div key={b._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <div>
                            <div style={{ fontWeight: 500 }}>
                              {new Date(b.startDate).toLocaleDateString()} — {new Date(b.endDate).toLocaleDateString()}
                            </div>
                            {b.reason && <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Reason: {b.reason}</div>}
                          </div>
                          <Button
                            danger
                            type="text"
                            icon={<Trash2 size={16} />}
                            onClick={() => handleDeleteBlackout(b._id, b.startDate, b.endDate)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* BLACKOUT MODAL */}
            <Modal
              title="Block Dates (Manual Blackout)"
              open={showBlackoutModal}
              onCancel={() => setShowBlackoutModal(false)}
              footer={null}
              destroyOnClose
            >
              <Form
                form={blackoutForm}
                layout="vertical"
                onFinish={handleAddBlackout}
                style={{ marginTop: '1.5rem' }}
              >
                <Form.Item
                  name="dates"
                  label="Select Dates to Block"
                  rules={[{ required: true, message: 'Please select dates' }]}
                >
                  <RangePicker
                    style={{ width: '100%' }}
                    disabledDate={(current) => {
                      if (current && current < dayjs().startOf('day')) return true;
                      // Disable dates that overlap with confirmed bookings so we don't double book a blackout
                      return calendarRanges.some(cr => {
                        if (cr.status !== 'CONFIRMED') return false;
                        const start = dayjs(cr.start).startOf('day');
                        const end = dayjs(cr.end).endOf('day');
                        return current.isBetween(start, end, 'day', '[]');
                      });
                    }}
                  />
                </Form.Item>
                <Form.Item name="reason" label="Reason (Optional)">
                  <Input.TextArea placeholder="e.g. Maintenance, Personal Use..." rows={3} />
                </Form.Item>
                <Button type="primary" htmlType="submit" loading={blackoutSaving} style={{ width: '100%' }}>
                  Save Blackout
                </Button>
              </Form>
            </Modal>
          </div>
        ) : tab === 'reviews' ? (
          /* ===== REVIEWS TAB (Owner Only) ===== */
          <div className="dashboard-table-wrap card">
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Star size={18} /> Customer Reviews
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.4rem' }}>
                Manage reviews for your vehicles. Verified owners can hide reviews temporarily.
              </p>
            </div>

            {reviews.length === 0 ? (
              <div className="dashboard-empty" style={{ padding: '4rem 1.5rem' }}>
                <MessageSquare size={40} strokeWidth={1} />
                <p>No reviews yet for your vehicles</p>
              </div>
            ) : (
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Vehicle</th>
                    <th>Reviewer</th>
                    <th>Rating</th>
                    <th>Comment</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {reviews.map((r: Review) => (
                    <tr key={r._id}>
                      <td>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{r.vehicle?.title || 'Vehicle'}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{r.vehicle?.make} {r.vehicle?.model}</div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.9rem' }}>{r.reviewer?.name || 'User'}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{new Date(r.createdAt).toLocaleDateString()}</div>
                      </td>
                      <td><Rate disabled defaultValue={r.rating} style={{ fontSize: '14px' }} /></td>
                      <td style={{ maxWidth: '250px' }}>
                        <div style={{ fontSize: '0.9rem', fontStyle: 'italic' }}>"{r.comment}"</div>
                      </td>
                      <td>
                        {r.status === 'visible' ? (
                          <Tag color="success">Visible</Tag>
                        ) : r.status === 'hidden' ? (
                          <Tag color="warning">
                            {r.hiddenBy === (user._id || user.id) ? 'Hidden by You' : 'Hidden by Admin'}
                          </Tag>
                        ) : (
                          <Tag color="error">Rejected</Tag>
                        )}
                      </td>
                      <td>
                        {isVerifiedOwner && r.status === 'visible' && (
                          <Button
                            danger
                            size="small"
                            type="text"
                            onClick={() => {
                              Modal.confirm({
                                title: 'Hide Review Temporarily?',
                                content: 'This review will be hidden from the public view until you decide to unhide it or an admin overrides this action.',
                                onOk: () => handleToggleReviewVisibility(r._id)
                              });
                            }}
                          >
                            Hide
                          </Button>
                        )}
                        {isVerifiedOwner && r.status === 'hidden' && r.hiddenBy === (user._id || user.id) && (
                          <Button
                            type="link"
                            size="small"
                            onClick={() => handleToggleReviewVisibility(r._id)}
                          >
                            Unhide
                          </Button>
                        )}
                        {r.status === 'hidden' && r.hiddenBy !== (user._id || user.id) && (
                          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>Admin Action</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : tab === 'subscription' ? (
          /* ===== SUBSCRIPTION TAB (Owner Only) ===== */
          <div className="animate-fade-in">
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '2rem', borderBottom: '1px solid var(--border-color)' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Shield size={24} style={{ color: '#1890ff' }} /> Manage My Subscription
                </h3>
                <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                  Monitor your plan status and vehicle listing limits.
                </p>
              </div>
              
              <div style={{ padding: '2rem' }}>
                {user.subscription?.status === 'trial' && (
                  <div className="trial-alert" style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '1.2rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '2rem' }}>
                    <Zap size={24} style={{ color: '#1890ff' }} />
                    <div>
                      <h4 style={{ margin: 0, color: '#1e40af', fontWeight: 600 }}>Trial Period Active</h4>
                      <p style={{ margin: 0, color: '#1e40af', fontSize: '0.9rem' }}>
                        Your free trial is active. 
                        <strong> {user.subscription.endDate ? Math.ceil((new Date(user.subscription.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : '?'} days remaining.</strong>
                      </p>
                    </div>
                  </div>
                )}

                <div className="subscription-tab-actions" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                  <div className="sub-current-plan" style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <p style={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '8px' }}>Current Tier</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
                      <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>{user.subscription?.tier || 'BASIC'}</span>
                      <Tag color="processing" style={{ borderRadius: '6px' }}>{user.subscription?.status?.toUpperCase() || 'TRIAL'}</Tag>
                    </div>
                    <Link to="/subscription" className="btn btn-primary btn-sm" style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                      Upgrade/Renew Plan
                    </Link>
                  </div>

                  <div className="sub-limits" style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <p style={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '8px' }}>Listing Capacity</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <span>Current Vehicles:</span>
                      <span style={{ fontWeight: 600 }}>{vehicles.length} Listings</span>
                    </div>
                    <div style={{ height: '8px', width: '100%', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
                      <div style={{ 
                        height: '100%', 
                        background: '#1890ff', 
                        width: `${Math.min((vehicles.length / (user.subscription?.tier === 'BASIC' ? 2 : user.subscription?.tier === 'STANDARD' ? 6 : 999)) * 100, 100)}%` 
                      }}></div>
                    </div>
                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                      Limit: {user.subscription?.tier === 'BASIC' ? '2' : user.subscription?.tier === 'STANDARD' ? '6' : 'Unlimited'} Vehicles
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* REVIEW MODAL */}
      <Modal
        title="Rate Your Experience"
        open={showReviewModal}
        onCancel={() => setShowReviewModal(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={reviewForm} layout="vertical" onFinish={handleReviewSubmit} style={{ marginTop: '1rem' }}>
          <Form.Item name="rating" label="Rating" rules={[{ required: true, message: 'Please select a rating' }]}>
            <Rate />
          </Form.Item>
          <Form.Item name="comment" label="Your Feedback" rules={[{ required: true, message: 'Please leave a comment' }]}>
            <Input.TextArea rows={4} placeholder="How was the vehicle and the service?" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={submittingReview} block style={{ height: '44px' }}>
            Submit Review
          </Button>
        </Form>
      </Modal>

      {/* RENTER REVIEW MODAL */}
      <Modal
        title="Renter Verification Details"
        open={showRenterModal}
        onCancel={() => setShowRenterModal(false)}
        footer={[
          <Button key="close" onClick={() => setShowRenterModal(false)}>Close</Button>,
          <Button 
            key="reject" 
            danger 
            onClick={() => {
              if (activeBookingId) handleRejectBooking(activeBookingId);
              setShowRenterModal(false);
            }}
          >
            Reject Booking
          </Button>,
          <Button 
            key="approve" 
            type="primary" 
            style={{ background: '#16a34a', borderColor: '#16a34a' }}
            onClick={() => {
              if (activeBookingId) handleAcceptBooking(activeBookingId);
              setShowRenterModal(false);
            }}
          >
            Approve Booking
          </Button>
        ]}
        width={700}
        destroyOnClose
      >
        {selectedRenter ? (
          <div className="renter-review-content" style={{ padding: '10px 0' }}>
            <div style={{ display: 'flex', gap: '20px', marginBottom: '25px', alignItems: 'center', background: '#f8fafc', padding: '15px', borderRadius: '12px' }}>
              <img 
                src={selectedRenter.profilePic || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(selectedRenter.name || 'User') + '&background=1890ff&color=fff'} 
                alt="Profile" 
                style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '1.2rem' }}>{selectedRenter.name}</h3>
                <p style={{ margin: '0', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={14} /> {selectedRenter.phone || 'No phone provided'}</p>
                <p style={{ margin: '0', color: 'var(--text-secondary)' }}>{selectedRenter.email}</p>
              </div>
            </div>

            <Row gutter={[20, 20]}>
              <Col span={24}>
                <div style={{ padding: '12px', background: '#eff6ff', borderRadius: '8px', borderLeft: '4px solid #1890ff' }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', color: '#1e40af' }}>Address</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.95rem' }}>{selectedRenter.documents?.address || selectedRenter.address || 'Not provided'}</p>
                </div>
              </Col>
              
              <Col xs={24} sm={12}>
                <p style={{ fontWeight: 600, marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>NIC Front</p>
                <Image 
                  src={selectedRenter.documents?.nicFront} 
                  fallback="https://via.placeholder.com/400x250?text=NIC+Front+Not+Available"
                  style={{ borderRadius: '8px', width: '100%', height: '180px', objectFit: 'cover', border: '1px solid #e2e8f0' }} 
                />
              </Col>
              <Col xs={24} sm={12}>
                <p style={{ fontWeight: 600, marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>NIC Back</p>
                <Image 
                  src={selectedRenter.documents?.nicBack} 
                  fallback="https://via.placeholder.com/400x250?text=NIC+Back+Not+Available"
                  style={{ borderRadius: '8px', width: '100%', height: '180px', objectFit: 'cover', border: '1px solid #e2e8f0' }} 
                />
              </Col>
              <Col xs={24} sm={12}>
                <p style={{ fontWeight: 600, marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Driving License</p>
                <Image 
                  src={selectedRenter.documents?.license} 
                  fallback="https://via.placeholder.com/400x250?text=License+Not+Available"
                  style={{ borderRadius: '8px', width: '100%', height: '180px', objectFit: 'cover', border: '1px solid #e2e8f0' }} 
                />
              </Col>
              <Col xs={24} sm={12}>
                <p style={{ fontWeight: 600, marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Selfie Verification</p>
                <Image 
                  src={selectedRenter.documents?.selfie} 
                  fallback="https://via.placeholder.com/400x250?text=Selfie+Not+Available"
                  style={{ borderRadius: '8px', width: '100%', height: '180px', objectFit: 'cover', border: '1px solid #e2e8f0' }} 
                />
              </Col>
            </Row>
          </div>
        ) : (
          <p>Loading renter details...</p>
        )}
      </Modal>
    </div>
  );
}
