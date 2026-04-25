import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useSearchParams } from 'react-router-dom';
import dayjs, { type Dayjs } from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { Calendar, Modal, message, Select, Tag, DatePicker, Button, Form, Input, Rate, Image, Row, Col, Avatar, Spin } from 'antd';
import { vehicleApi, bookingApi, blackoutApi, reviewApi, type Vehicle, type Booking, type BookedRange, type Blackout, type BlackoutRange, type Review, getImageUrl } from '../api';
import {
  Car, Calendar as CalIcon, DollarSign, CheckCircle, XCircle,
  Clock, Eye, EyeOff, Trash2, Phone, Shield, AlertTriangle,
  CalendarOff, Star, MessageSquare, Zap, Edit, Info, User, Users, FileText
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
  const [bookingFilter, setBookingFilter] = useState<'all' | 'pending' | 'confirmed' | 'past'>('all');

  // Vehicle Detail Panel State
  const [showVehicleDetail, setShowVehicleDetail] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  // Calendar tab state (owner only)
  const [calendarVehicleId, setCalendarVehicleId] = useState<string>('');

  const handleVehicleClick = (v: Vehicle) => {
    setSelectedVehicle(v);
    setCalendarVehicleId(v._id);
    setShowVehicleDetail(true);
  };
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

  // Trip Detail Modal state
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Review Renter Modal state
  const [showRenterModal, setShowRenterModal] = useState(false);
  const [selectedRenter, setSelectedRenter] = useState<any>(null);
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);

  const [searchParams] = useSearchParams();

  const handleViewDetail = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowDetailModal(true);
  };

  const handleReviewRenter = async (bookingId: string, initialUser: any) => {
    // Show modal immediately with partial data (name/email)
    setSelectedRenter(initialUser);
    setActiveBookingId(bookingId);
    setShowRenterModal(true);
    
    // Explicitly fetch full user details directly from the User collection
    // This bypasses any population issues in the main booking list
    try {
      const fullUser = await bookingApi.getRenterDetails(bookingId);
      setSelectedRenter(fullUser);
    } catch (err: any) {
      console.error("Failed to fetch renter details:", err);
    }
  };

  // Highlight logic from URL
  useEffect(() => {
    const highlightId = searchParams.get('highlight');
    const targetTab = searchParams.get('tab');
    
    if (targetTab === 'bookings') {
      setTab('bookings');
    } else if (targetTab === 'vehicles' && (vehicles.length > 0 || user?.role === 'admin')) {
      setTab('vehicles');
    }

    if (highlightId && bookings.length > 0) {
      // Automatic Modal Opening for Notifications (Owner view of pending request)
      const targetBooking = bookings.find(b => b._id === highlightId);
      if (targetBooking && targetBooking.status === 'PENDING' && user?.role === 'owner' && !showRenterModal) {
        const renter = typeof targetBooking.user === 'object' ? targetBooking.user : null;
        handleReviewRenter(targetBooking._id, renter);
      }

      setTimeout(() => {
        const element = document.getElementById(`booking-${highlightId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('highlight-row');
          setTimeout(() => element.classList.remove('highlight-row'), 3000);
        }
      }, 500);
    }
  }, [searchParams, bookings.length, user?.role, showRenterModal]);

  const handleRefreshData = async () => {
    try {
      const v = await vehicleApi.getMy().catch(() => []);
      const b = await bookingApi.getMy().catch(() => []);
      setVehicles(v as Vehicle[]);
      setBookings(b as Booking[]);
      
      if (user?.role === 'owner') {
        const r = await reviewApi.getMyReviews().catch(() => []);
        setReviews(r as Review[]);
      }
      

    } catch (err) {
      console.error("Failed to refresh dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleRefreshData();
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
        handleRefreshData();
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
        handleRefreshData();
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
    let reason = '';
    Modal.confirm({
      title: 'Reject Booking',
      content: (
        <div style={{ marginTop: '16px' }}>
          <p style={{ marginBottom: '12px' }}>Are you sure you want to reject this booking request?</p>
          <Input.TextArea 
            placeholder="Tell the renter why you are rejecting (e.g., Vehicle needs maintenance)"
            onChange={(e) => { reason = e.target.value; }}
            rows={3}
          />
        </div>
      ),
      okText: 'Reject',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await bookingApi.reject(id, reason);
          setBookings(prev => prev.map(bk => bk._id === id ? { ...bk, status: 'REJECTED' } : bk));
          message.success('Booking rejected');
        } catch (err: any) { message.error(err.message || 'Failed to reject booking'); }
      },
    });
  };

  const handleCancelBooking = async (id: string) => {
    let reason = '';
    Modal.confirm({
      title: 'Cancel Booking',
      content: (
        <div style={{ marginTop: '16px' }}>
          <p style={{ marginBottom: '12px' }}>Are you sure you want to cancel this booking?</p>
          <Input.TextArea 
            placeholder="Reason for cancellation (e.g., Change of plans)"
            onChange={(e) => { reason = e.target.value; }}
            rows={3}
          />
        </div>
      ),
      okText: 'Cancel Booking',
      okType: 'danger',
      cancelText: 'Go Back',
      onOk: async () => {
        try {
          await bookingApi.cancel(id, reason);
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
  const isVerifiedOwner = (isOwner && user.isKycVerified) || isStaff;
  const isUnverifiedOwner = user.role === 'owner' && !user.isKycVerified && !isStaff;

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

  const filteredBookings = bookings.filter(b => {
    if (bookingFilter === 'all') return true;
    if (bookingFilter === 'pending') return b.status === 'PENDING';
    if (bookingFilter === 'confirmed') return b.status === 'CONFIRMED';
    if (bookingFilter === 'past') return b.status === 'COMPLETED' || b.status === 'CANCELLED' || b.status === 'REJECTED';
    return true;
  });

  return (
    <div className="dashboard-page page-wrapper" style={{ minHeight: '100vh', background: 'var(--bg-secondary)' }}>

      <header className="dashboard-header" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)', padding: '2rem 0 3.5rem', textAlign: 'center', color: 'white' }}>
        <div className="container">
          <div className="animate-fade-in">
            <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.25rem', color: 'white' }}>My Dashboard</h1>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', margin: 0 }}>
              Welcome back, {user.name.split(' ')[0]}! Manage your fleet and activities here.
            </p>
          </div>
        </div>
      </header>

      <div className="container" style={{ position: 'relative', marginTop: '-1.5rem', marginBottom: '3rem' }}>
        {/* Stats Section Removed to Simplify View */}
      </div>

      <div className="container" style={{ marginBottom: '4rem' }}>


        {/* One-Time Verification banner — only for users/renters who haven't uploaded docs */}
        {user.verificationStatus === 'not_submitted' && !isStaff && user.role === 'user' && (
          <div className="card" style={{ background: 'linear-gradient(135deg, #fff7ed, #ffedd5)', border: '1px solid #fed7aa', padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ background: '#ff7e33', color: 'white', padding: '10px', borderRadius: '12px' }}><Shield size={24} /></div>
              <div>
                <h3 style={{ color: '#9a3412', marginBottom: '4px' }}>
                  One-Time Verification
                </h3>
                <p style={{ color: '#c2410c' }}>
                  Verify your identity once to start booking vehicles. It only takes a minute!
                </p>
              </div>
            </div>
            <Link to="/verify" className="btn btn-primary">Verify Now</Link>
          </div>
        )}

        {/* Tabs - Navigation */}
        <div className="dashboard-nav">
          {user.role === 'user' && vehicles.length === 0 ? (
            <button 
              className={`nav-item active`} 
              onClick={() => setTab('bookings')}
            >
              <CalIcon size={16} /> My Trip History
            </button>
          ) : (
            <>
              <button 
                className={`nav-item ${tab === 'vehicles' ? 'active' : ''}`} 
                onClick={() => setTab('vehicles')}
              >
                <Car size={16} /> My Vehicles
              </button>
              <button 
                className={`nav-item ${tab === 'bookings' ? 'active' : ''}`} 
                onClick={() => setTab('bookings')}
              >
                <CalIcon size={16} /> {user.role === 'user' ? 'My Trip History' : 'Manage Bookings'}
              </button>
            </>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}>Loading...</div>
        ) : tab === 'vehicles' ? (
          <div className="dashboard-box">
            <div className="dashboard-box-header">
              <h3 className="dashboard-box-title">My Vehicles</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Link to="/list-vehicle" className="btn btn-primary btn-sm" style={{ padding: '0.4rem 0.75rem', fontSize: '0.875rem', height: 'auto', display: 'flex', alignItems: 'center', marginRight: '8px' }}>
                  <Car size={16} style={{ marginRight: '6px' }} /> List New
                </Link>
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
              <div className="dashboard-empty" style={{ padding: '5rem 2rem', textAlign: 'center', background: '#fafafa', borderRadius: '0 0 20px 20px' }}>
                <div style={{ background: '#f8fafc', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', border: '1px solid #e2e8f0' }}>
                  <Car size={40} strokeWidth={1.5} color="#94a3b8" />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                  {vehicles.length === 0 ? "You haven't listed any vehicles yet" : `No ${selectedCategory}s found`}
                </h3>
                <p style={{ color: 'var(--text-tertiary)', marginBottom: '2rem', maxWidth: '300px', margin: '0 auto 2rem' }}>
                  Start earning today by sharing your vehicle with the Rentify community.
                </p>
                {vehicles.length === 0 && (
                  <Link to="/list-vehicle" className="btn btn-primary" style={{ padding: '12px 32px' }}>
                    <Car size={18} style={{ marginRight: '8px' }} /> List Your First Vehicle
                  </Link>
                )}
              </div>
            ) : (
              <div className="dashboard-grid">
                {filteredVehicles.map(v => (
                  <div key={v._id} className="dash-vehicle-card" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column' }} onClick={() => handleVehicleClick(v)}>
                    <div className="dash-vehicle-card-img">
                      {v.photos?.[0] ? (
                        <img src={getImageUrl(v.photos[0])} alt={v.title} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9' }}>
                          <Car size={32} color="#cbd5e1" />
                        </div>
                      )}
                      <div className="dash-vehicle-card-status">
                        {vehicleStatusBadge(v.status, v.isActive)}
                      </div>
                    </div>
                    <div className="dash-vehicle-card-body">
                      <div style={{ textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-primary)', marginBottom: '4px' }}>
                        {v.serviceType?.[0] || 'Vehicle'}
                      </div>
                      <h4 className="dash-vehicle-card-title">{v.title}</h4>
                      <div className="dash-vehicle-card-meta">{v.make} {v.model}</div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                        <div className="dash-vehicle-card-price">LKR {v.pricePerDay.toLocaleString()}<span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>/day</span></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : tab === 'bookings' ? (
          <div className="dashboard-box">
            <div className="dashboard-box-header" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
              <h3 className="dashboard-box-title" style={{ marginBottom: '1rem' }}>
                {user.role === 'user' ? 'My Trip History' : 'Manage Bookings'}
              </h3>
              
              {/* Booking Filters */}
              <div className="dashboard-nav" style={{ marginBottom: 0 }}>
                <button 
                  className={`nav-item ${bookingFilter === 'all' ? 'active' : ''}`} 
                  onClick={() => setBookingFilter('all')}
                >
                  All
                </button>
                <button 
                  className={`nav-item ${bookingFilter === 'pending' ? 'active' : ''}`} 
                  onClick={() => setBookingFilter('pending')}
                >
                  Pending
                </button>
                <button 
                  className={`nav-item ${bookingFilter === 'confirmed' ? 'active' : ''}`} 
                  onClick={() => setBookingFilter('confirmed')}
                >
                  Confirmed
                </button>
                <button 
                  className={`nav-item ${bookingFilter === 'past' ? 'active' : ''}`} 
                  onClick={() => setBookingFilter('past')}
                >
                  Past
                </button>
              </div>
            </div>
            
            {filteredBookings.length === 0 ? (
              <div className="dashboard-empty" style={{ padding: '5rem 2rem', textAlign: 'center' }}>
                <div style={{ background: '#f8fafc', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', border: '1px solid #e2e8f0' }}>
                  <CalIcon size={40} strokeWidth={1.5} color="#94a3b8" />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                  No {bookingFilter !== 'all' ? bookingFilter : ''} bookings found
                </h3>
                <p style={{ color: 'var(--text-tertiary)', marginBottom: '2rem' }}>
                  When you have bookings, they will appear here.
                </p>
                {user.role === 'user' && (
                  <Link to="/explore" className="btn btn-primary" style={{ padding: '12px 32px' }}>
                    <Car size={18} style={{ marginRight: '8px' }} /> Explore Vehicles
                  </Link>
                )}
              </div>
            ) : (
              <div className="booking-cards-container">
                {filteredBookings.map(b => {
                  const vehicle = typeof b.vehicle === 'object' ? b.vehicle : null;
                  const bOwnerId = String(typeof b.owner === 'object' ? (b.owner as any)?._id || (b.owner as any)?.id : b.owner);
                  const bRenterId = String(typeof b.user === 'object' ? (b.user as any)?._id || (b.user as any)?.id : b.user);
                  const myId = String(user?._id || user?.id || '');
                  
                  const isIamRenterOfThis = myId === bRenterId;
                  const isIamOwnerOfThis = (myId === bOwnerId || isStaff) && !isIamRenterOfThis;
                  const owner = typeof b.owner === 'object' ? b.owner : null;

                  return (
                    <div key={b._id} className="booking-card" id={`booking-${b._id}`} style={{ padding: '0', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                      <div className="booking-card-content" style={{ padding: '24px' }}>
                        <div className="booking-card-info">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                              <div style={{ width: '60px', height: '60px', borderRadius: '12px', overflow: 'hidden', flexShrink: 0, border: '1px solid #e2e8f0' }}>
                                {vehicle && (vehicle as Vehicle).photos?.[0] ? (
                                  <img src={getImageUrl((vehicle as Vehicle).photos[0])} alt={(vehicle as Vehicle).title || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  <div style={{ width: '100%', height: '100%', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Car size={24} color="#cbd5e1" />
                                  </div>
                                )}
                              </div>
                              <div>
                                <h4 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a' }}>{vehicle ? (vehicle as Vehicle).title : 'Vehicle Details'}</h4>
                                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                  Ref: #{b._id.slice(-6).toUpperCase()}
                                </div>
                              </div>
                            </div>
                            {bookingStatusBadge(b.status)}
                          </div>
                          
                          <div className="booking-card-meta" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                            <div>
                              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Trip Dates</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: '#334155', fontWeight: 600 }}>
                                <CalIcon size={14} color="var(--color-primary)" />
                                <span>{new Date(b.startDate).toLocaleDateString()} — {new Date(b.endDate).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Total Payout</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, color: '#0f172a', fontSize: '1.05rem' }}>
                                LKR {b.totalAmount.toLocaleString()}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="booking-card-footer" style={{ borderTop: 'none', paddingTop: '16px', marginTop: 0, flexWrap: 'wrap', gap: '1rem' }}>
                          <div style={{ flex: 1, minWidth: 'fit-content' }}>
                            {b.status === 'CONFIRMED' && isIamRenterOfThis && owner && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                                  <img src={getImageUrl((owner as any).profilePic)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                                <div>
                                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#166534' }}>HOST: {(owner as any).name}</div>
                                  <a href={`tel:${(owner as any).phone}`} style={{ fontSize: '12px', fontWeight: 700, color: '#15803d' }}>
                                    {(owner as any).phone || 'Contact Host'}
                                  </a>
                                </div>
                              </div>
                            )}
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: b.status === 'CONFIRMED' && isIamRenterOfThis && owner ? '1rem' : '0' }}>
                              <button onClick={() => handleViewDetail(b)} className="btn btn-sm" style={{ flex: 1, minWidth: 'fit-content', background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#334155', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Info size={14} style={{ marginRight: '6px' }} /> Full Details
                              </button>
                              {vehicle && (
                                <Link to={`/vehicles/${(vehicle as Vehicle)._id}`} className="btn btn-sm" style={{ flex: 1, minWidth: 'fit-content', textAlign: 'center', background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#334155', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <Eye size={14} style={{ marginRight: '6px' }} /> View Page
                                </Link>
                              )}
                            </div>
                          </div>

                          <div className="booking-card-actions">
                            {b.status === 'PENDING' && isIamOwnerOfThis && (
                              <div style={{ display: 'flex', width: '100%' }}>
                                <button 
                                  className="btn btn-sm btn-primary" 
                                  style={{ flex: 1, background: '#1890ff', fontWeight: 600, height: '32px' }}
                                  onClick={() => { 
                                    const renter = typeof b.user === 'object' ? b.user : null;
                                    handleReviewRenter(b._id, renter);
                                  }}
                                >
                                  Review & Respond
                                </button>
                              </div>
                            )}

                            {b.status === 'PENDING' && isIamRenterOfThis && (
                              <button className="btn btn-sm btn-danger" style={{ minWidth: '120px' }} onClick={() => handleCancelBooking(b._id)}>Cancel Trip</button>
                            )}

                            {(b.status === 'COMPLETED' || b.status === 'CONFIRMED') && isIamRenterOfThis && !b.isReviewed && (
                              <button className="btn btn-sm btn-primary" onClick={() => { setSelectedBookingId(b._id); setShowReviewModal(true); }}>Leave Review</button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
          <div className="renter-review-content" style={{ display: 'flex', flexDirection: 'column', minHeight: '400px', background: '#f8fafc', borderRadius: '12px', overflow: 'hidden' }}>
            {/* Top Bar with User Info */}
            <div style={{ padding: '24px 32px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: '1 1 300px' }}>
                <Avatar 
                  size={64} 
                  src={getImageUrl(selectedRenter.profilePic)}
                  style={{ background: '#1890ff' }}
                >
                  {selectedRenter.name?.charAt(0)}
                </Avatar>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>{selectedRenter.name}</h3>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{selectedRenter.email}</p>
                </div>
              </div>

              <div style={{ flex: '1 1 250px' }}>
                <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '8px' }}>Contact Info</h4>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '4px' }}>{selectedRenter.phone || 'Phone not provided'}</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{selectedRenter.documents?.address || selectedRenter.address || 'Address not listed'}</div>
              </div>
            </div>

            {/* Document display area */}
            <div style={{ padding: '24px', background: '#ffffff', overflowY: 'auto', maxHeight: '60vh' }}>
              <h4 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.1rem', fontWeight: 600 }}>
                <FileText size={20} /> Documentation Verification
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {[
                  { label: 'NIC Front View', field: 'nicFront' },
                  { label: 'NIC Back View', field: 'nicBack' },
                  { label: 'Driver License', field: 'license' },
                  { label: 'Live Selfie', field: 'selfie' },
                ].map((doc, idx) => {
                  const renterData = selectedRenter as any;
                  // Extremely resilient path extraction to match all potential schema versions
                  const url = renterData.documents?.[doc.field] || 
                              renterData[doc.field] || 
                              (renterData.documents && renterData.documents[`${doc.field}Path`]) || 
                              (renterData.documents && renterData.documents[doc.field.toLowerCase()]) ||
                              null;
                                
                  const fullUrl = getImageUrl(url);
                  
                  return (
                    <div key={idx} style={{ 
                      background: '#fff', 
                      padding: '12px', 
                      borderRadius: '16px', 
                      border: '1px solid #f1f5f9',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                    }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', marginBottom: '12px', textTransform: 'uppercase' }}>{doc.label}</div>
                      {url ? (
                        <div className="doc-image-wrapper" style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #f1f5f9' }}>
                          <Image
                            src={fullUrl}
                            alt={doc.label}
                            style={{ width: '100%', height: '180px', objectFit: 'contain' }}
                            placeholder={<div style={{ height: '180px', background: '#f8fafc' }} />}
                          />
                        </div>
                      ) : (
                        <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', borderRadius: '12px', color: '#94a3b8', fontSize: '0.85rem' }}>
                          Not Uploaded
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <Spin tip="Loading renter details..." />
          </div>
        )}
      </Modal>

      {/* TRIP DETAIL MODAL FOR RENTERS/OWNERS */}
      <Modal
        title="Booking Details"
        open={showDetailModal}
        onCancel={() => setShowDetailModal(false)}
        footer={(() => {
          const isPending = selectedBooking?.status === 'PENDING';
          const bOwnerId = String(typeof selectedBooking?.owner === 'object' ? (selectedBooking?.owner as any)._id : selectedBooking?.owner);
          const bRenterId = String(typeof selectedBooking?.user === 'object' ? (selectedBooking?.user as any)._id : selectedBooking?.user);
          const myId = String(user?._id || user?.id || '');
          const isOwner = myId === bOwnerId;
          const isRenter = myId === bRenterId;

          const buttons = [
            <Button key="close" onClick={() => setShowDetailModal(false)}>Close</Button>
          ];

          if (isPending && isRenter) {
            buttons.push(
              <Button key="cancel-renter" danger onClick={() => { if (selectedBooking?._id) handleCancelBooking(selectedBooking._id); setShowDetailModal(false); }}>Cancel Trip</Button>
            );
          }

          if (isPending && isOwner) {
            buttons.push(
              <Button key="reject-owner" danger onClick={() => { if (selectedBooking?._id) handleRejectBooking(selectedBooking._id); setShowDetailModal(false); }}>Cancel Booking</Button>,
              <Button key="accept-owner" type="primary" style={{ background: '#16a34a', borderColor: '#16a34a' }} onClick={() => { if (selectedBooking?._id) handleAcceptBooking(selectedBooking._id); setShowDetailModal(false); }}>Accept Booking</Button>
            );
          }

          return buttons;
        })()}
        width={600}
        centered
        destroyOnClose
      >
        {selectedBooking ? (
          <div className="booking-detail-content" style={{ padding: '10px 0' }}>
            {(() => {
              const bOwnerId = String(typeof selectedBooking.owner === 'object' ? (selectedBooking.owner as any)._id : selectedBooking.owner);
              const bRenterId = String(typeof selectedBooking.user === 'object' ? (selectedBooking.user as any)._id : selectedBooking.user);
              const myId = String(user?._id || user?.id || '');
              const isOwner = myId === bOwnerId;
              const isRenter = myId === bRenterId;
              const renterObj = typeof selectedBooking.user === 'object' ? selectedBooking.user as any : null;

              return (
                <>
                  {/* Header info */}
                  <div style={{ display: 'flex', gap: '20px', marginBottom: '25px', alignItems: 'center' }}>
                    <div style={{ width: '100px', height: '100px', borderRadius: '16px', overflow: 'hidden', flexShrink: 0, border: '1px solid #e2e8f0' }}>
                      {typeof selectedBooking.vehicle === 'object' && (selectedBooking.vehicle as Vehicle).photos?.[0] ? (
                        <img src={getImageUrl((selectedBooking.vehicle as Vehicle).photos[0])} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : <div style={{ width: '100%', height: '100%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Car size={32} color="#94a3b8" /></div>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>{typeof selectedBooking.vehicle === 'object' ? (selectedBooking.vehicle as Vehicle).title : 'Vehicle Details'}</h3>
                      <div style={{ marginTop: '8px' }}>{bookingStatusBadge(selectedBooking.status)}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginTop: '8px', fontWeight: 600 }}>REF ID: {selectedBooking._id}</div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem', padding: '1.5rem', background: '#f8fafc', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                    <div>
                      <div style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}>Pickup Date</div>
                      <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#334155', marginTop: '4px' }}>{dayjs(selectedBooking.startDate).format('MMM D, YYYY')}</div>
                    </div>
                    <div>
                      <div style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}>Return Date</div>
                      <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#334155', marginTop: '4px' }}>{dayjs(selectedBooking.endDate).format('MMM D, YYYY')}</div>
                    </div>
                    <div>
                      <div style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}>Duration</div>
                      <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#334155', marginTop: '4px' }}>{selectedBooking.days} Days</div>
                    </div>
                    <div>
                      <div style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}>Total Price</div>
                      <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#16a34a', marginTop: '4px' }}>LKR {selectedBooking.totalAmount.toLocaleString()}</div>
                    </div>
                  </div>

                  {/* RENTER PERSPECTIVE: Show Host Contact or Pending Message */}
                  {isRenter && (
                    <>
                      {selectedBooking.status === 'CONFIRMED' && (
                        <div style={{ padding: '1.5rem', border: '1px solid #bbf7d0', borderRadius: '16px', background: '#f0fdf4' }}>
                          <h4 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '8px', color: '#166534' }}>
                            <User size={18} /> Host Contact Details
                          </h4>
                          {typeof selectedBooking.owner === 'object' ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                              <img 
                                src={getImageUrl((selectedBooking.owner as any).profilePic)} 
                                style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} 
                              />
                              <div>
                                <div style={{ fontWeight: 700, color: '#166534' }}>{(selectedBooking.owner as any).name}</div>
                                <div style={{ color: '#15803d', fontWeight: 700, fontSize: '1.1rem', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <Phone size={16} /> {(selectedBooking.owner as any).phone || (selectedBooking.owner as any).phoneNumber || 'No phone provided'}
                                </div>
                              </div>
                            </div>
                          ) : <p style={{ margin: 0, fontSize: '0.9rem' }}>Contact info available upon refresh.</p>}
                        </div>
                      )}
                      {selectedBooking.status === 'PENDING' && (
                        <div style={{ display: 'flex', gap: '12px', padding: '1rem', background: '#fffbeb', borderRadius: '12px', border: '1px solid #fde68a' }}>
                          <Clock size={20} style={{ color: '#d97706', flexShrink: 0 }} />
                          <p style={{ margin: 0, fontSize: '0.85rem', color: '#92400e' }}>
                            Your request is waiting for the owner's response. You will receive a notification once it's confirmed or rejected.
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  {/* OWNER PERSPECTIVE: Show Renter Contact & Identity */}
                  {isOwner && renterObj && (
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden' }}>
                      <div style={{ background: '#f8fafc', padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0' }}>
                        <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', fontWeight: 800 }}>
                          <Users size={18} color="var(--color-primary)" /> Renter Details & Verification
                        </h4>
                      </div>
                      
                      <div style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '1.5rem' }}>
                          <Avatar size={56} src={getImageUrl(renterObj.profilePic)} style={{ background: '#1890ff' }}>
                            {renterObj.name?.charAt(0)}
                          </Avatar>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0f172a' }}>{renterObj.name}</div>
                            <div style={{ color: '#475569', fontSize: '0.9rem', marginBottom: '4px' }}>{renterObj.email}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#16a34a', fontWeight: 700 }}>
                              <Phone size={14} /> {renterObj.phone || 'Phone not provided'}
                            </div>
                          </div>
                        </div>

                        {/* Document display area directly integrated */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          {[
                            { label: 'NIC Front View', field: 'nicFront' },
                            { label: 'NIC Back View', field: 'nicBack' },
                            { label: 'Driver License', field: 'license' },
                            { label: 'Selfie Verification', field: 'selfie' },
                          ].map((doc, idx) => {
                            const url = renterObj.documents?.[doc.field] || 
                                        renterObj[doc.field] || 
                                        (renterObj.documents && renterObj.documents[`${doc.field}Path`]) || 
                                        null;
                            const fullUrl = getImageUrl(url);
                            
                            return (
                              <div key={idx} style={{ 
                                background: '#f8fafc', 
                                padding: '10px', 
                                borderRadius: '12px', 
                                border: '1px solid #f1f5f9'
                              }}>
                                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>{doc.label}</div>
                                {url ? (
                                  <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', background: 'white' }}>
                                    <Image
                                      src={fullUrl}
                                      alt={doc.label}
                                      style={{ width: '100%', height: '100px', objectFit: 'contain' }}
                                    />
                                  </div>
                                ) : (
                                  <div style={{ height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e2e8f0', borderRadius: '8px', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600 }}>
                                    Not Uploaded
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedBooking.cancellationReason && (
                    <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#fff1f2', border: '1px solid #fecaca', borderRadius: '12px' }}>
                      <h4 style={{ color: '#991b1b', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 700 }}>
                        <AlertTriangle size={16} /> Cancellation Note
                      </h4>
                      <p style={{ color: '#7f1d1d', fontSize: '0.9rem', margin: 0 }}>
                        {selectedBooking.cancellationReason}
                      </p>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        ) : <Spin />}
      </Modal>

      {/* VEHICLE DETAIL PANEL MODAL */}
      <Modal
        title={null}
        open={showVehicleDetail}
        onCancel={() => {
          setShowVehicleDetail(false);
          setSelectedVehicle(null);
          setCalendarVehicleId('');
        }}
        footer={null}
        width={800}
        className="vehicle-detail-modal"
        destroyOnClose
      >
        {selectedVehicle ? (
          <div className="vehicle-detail-panel">
            <div className="vd-header">
              <div className="vd-image-container">
                {selectedVehicle.photos?.[0] ? (
                  <img src={getImageUrl(selectedVehicle.photos[0])} alt={selectedVehicle.title} className="vd-main-image" />
                ) : (
                  <div className="vd-image-placeholder"><Car size={64} /></div>
                )}
                <div className="vd-badges">
                  {vehicleStatusBadge(selectedVehicle.status, selectedVehicle.isActive)}
                </div>
              </div>
              <div className="vd-title-bar">
                <div>
                  <h2 className="vd-title">{selectedVehicle.title}</h2>
                  <p className="vd-subtitle">{selectedVehicle.make} {selectedVehicle.model} • {selectedVehicle.year}</p>
                </div>
                <div className="vd-price">
                  <span className="vd-price-amount">LKR {selectedVehicle.pricePerDay.toLocaleString()}</span>
                  <span className="vd-price-unit">/day</span>
                </div>
              </div>
            </div>

            <div className="vd-content">
              {/* Stats Bar */}
              <div className="vd-stats-bar">
                <div className="vd-stat-item">
                  <div className="stat-icon-wrap" style={{ background: '#fef3c7', color: '#d97706' }}><Star size={20} /></div>
                  <div className="vd-stat-info">
                    <span className="vd-stat-value">{selectedVehicle.averageRating > 0 ? selectedVehicle.averageRating.toFixed(1) : 'N/A'}</span>
                    <span className="vd-stat-label">Rating</span>
                  </div>
                </div>
                <div className="vd-stat-item">
                  <div className="stat-icon-wrap" style={{ background: '#e0e7ff', color: '#4f46e5' }}><CheckCircle size={20} /></div>
                  <div className="vd-stat-info">
                    <span className="vd-stat-value">{selectedVehicle.totalBookings || 0}</span>
                    <span className="vd-stat-label">Total Bookings</span>
                  </div>
                </div>
                <div className="vd-stat-item">
                  <div className="stat-icon-wrap" style={{ background: '#dcfce7', color: '#16a34a' }}><Zap size={20} /></div>
                  <div className="vd-stat-info">
                    <span className="vd-stat-value">{selectedVehicle.isBoosted ? 'Yes' : 'No'}</span>
                    <span className="vd-stat-label">Boosted</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div style={{ display: 'flex', gap: '1rem' }}>
                <Link to={`/vehicles/${selectedVehicle._id}`} className="btn" style={{ flex: 1, background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', justifyContent: 'center' }}>
                  <Eye size={18} style={{ marginRight: '8px' }} /> View Public Page
                </Link>
                <Link to={`/vehicles/edit/${selectedVehicle._id}`} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                  <Edit size={18} style={{ marginRight: '8px' }} /> Edit Vehicle Details
                </Link>
              </div>

              {/* Reviews Section */}
              <div className="vd-section">
                <div className="vd-section-header">
                  <h3><MessageSquare size={18} /> Reviews & Ratings</h3>
                  <span className="vd-review-count">
                    {reviews.filter(r => (typeof r.booking === 'object' && (r.booking as any)?.vehicle?._id === selectedVehicle._id) || (typeof r.booking === 'string' && r.booking === selectedVehicle._id) || r.vehicle === selectedVehicle._id).length} Reviews
                  </span>
                </div>
                <div className="vd-reviews-list">
                  {(() => {
                    const vehicleReviews = reviews.filter(r => {
                      const vId = typeof r.vehicle === 'object' ? (r.vehicle as any)._id : r.vehicle;
                      const bVId = typeof r.booking === 'object' ? ((r.booking as any).vehicle?._id || (r.booking as any).vehicle) : null;
                      return vId === selectedVehicle._id || bVId === selectedVehicle._id;
                    });
                    
                    if (vehicleReviews.length === 0) {
                      return (
                        <div className="vd-empty-state">
                          <MessageSquare size={32} color="#cbd5e1" />
                          <p>No reviews yet for this vehicle.</p>
                        </div>
                      );
                    }
                    return vehicleReviews.map(r => (
                      <div key={r._id} className="vd-review-item">
                        <div className="vd-review-header">
                          <div className="vd-reviewer">
                            <Avatar size={32} src={getImageUrl((r.user as any)?.profilePic)}>{(r.user as any)?.name?.charAt(0)}</Avatar>
                            <span className="vd-reviewer-name">{(r.user as any)?.name || 'User'}</span>
                          </div>
                          <span className="vd-review-date">{dayjs(r.createdAt).format('MMM D, YYYY')}</span>
                        </div>
                        <div className="vd-review-stars">
                          <Rate disabled defaultValue={r.rating} style={{ fontSize: '14px' }} />
                        </div>
                        <p className="vd-review-text">{r.comment}</p>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* Calendar & Blackout Section */}
              <div className="vd-section">
                <div className="vd-section-header">
                  <h3><CalIcon size={18} /> Availability & Blackouts</h3>
                  <Button type="primary" icon={<AlertTriangle size={14} />} onClick={() => setShowBlackoutModal(true)}>
                    Add Blackout
                  </Button>
                </div>
                <div className="vd-calendar-container">
                  <Spin spinning={calendarLoading}>
                    <Calendar 
                      className="vd-custom-calendar" 
                      fullscreen={false} 
                      fullCellRender={calendarCellRender}
                    />
                  </Spin>
                </div>
                
                {blackouts.length > 0 && (
                  <div className="vd-blackouts-list">
                    <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', color: '#64748b' }}>Active Blackouts</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {blackouts.map(b => (
                        <div key={b._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#fff1f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
                          <div>
                            <div style={{ fontWeight: 600, color: '#991b1b', fontSize: '0.9rem' }}>
                              {dayjs(b.startDate).format('MMM D, YYYY')} - {dayjs(b.endDate).format('MMM D, YYYY')}
                            </div>
                            <div style={{ color: '#b91c1c', fontSize: '0.8rem', marginTop: '4px' }}>{b.reason || 'No reason provided'}</div>
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
            </div>
          </div>
        ) : <Spin />}
      </Modal>

      {/* ADD BLACKOUT MODAL */}
      <Modal
        title="Add Blackout Period"
        open={showBlackoutModal}
        onCancel={() => {
          setShowBlackoutModal(false);
          blackoutForm.resetFields();
        }}
        footer={null}
        destroyOnClose
      >
        <Form form={blackoutForm} layout="vertical" onFinish={handleAddBlackout} style={{ marginTop: '1rem' }}>
          <Form.Item name="dates" label="Select Date Range" rules={[{ required: true, message: 'Please select dates' }]}>
            <RangePicker style={{ width: '100%' }} disabledDate={(current) => current && current < dayjs().startOf('day')} />
          </Form.Item>
          <Form.Item name="reason" label="Reason (Optional)">
            <Input.TextArea rows={3} placeholder="e.g. Vehicle maintenance, Personal use" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={blackoutSaving} block danger style={{ height: '44px' }}>
            Confirm Blackout
          </Button>
        </Form>
      </Modal>
    </div>
  );
}
