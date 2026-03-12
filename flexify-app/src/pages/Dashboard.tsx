import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import dayjs, { type Dayjs } from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { Calendar, Modal, message, Select, Tag, Badge, DatePicker, Button, Form, Input } from 'antd';
import { vehicleApi, bookingApi, blackoutApi, type Vehicle, type Booking, type BookedRange, type Blackout, type BlackoutRange } from '../api';
import { Car, Calendar as CalIcon, DollarSign, CheckCircle, XCircle, Clock, Eye, EyeOff, Trash2, Phone, Shield, AlertTriangle, CalendarOff } from 'lucide-react';

const { RangePicker } = DatePicker;
import './Dashboard.css';

dayjs.extend(isBetween);

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'vehicles' | 'bookings' | 'calendar'>(user?.role === 'user' ? 'bookings' : 'vehicles');
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

  useEffect(() => {
    Promise.all([
      vehicleApi.getMy().catch(() => []),
      bookingApi.getMy().catch(() => []),
    ]).then(([v, b]) => {
      setVehicles(v);
      setBookings(b);
      // Set default calendar vehicle
      if (v.length > 0) setCalendarVehicleId(v[0]._id);
    }).finally(() => setLoading(false));
  }, []);

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
    try {
      await bookingApi.accept(id);
      setBookings(prev => prev.map(bk => bk._id === id ? { ...bk, status: 'CONFIRMED' } : bk));
      message.success('Booking confirmed! Email notifications sent.');
    } catch (err: any) { message.error(err.message || 'Failed to accept booking'); }
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

  const isOwner = user.role === 'owner';
  const isVerifiedOwner = isOwner && user.ownerType === 'VERIFIED';
  const isUnverifiedOwner = isOwner && user.ownerType === 'UNVERIFIED';

  const statusBadge = (status: string) => {
    const map: Record<string, { cls: string; icon: any }> = {
      'active': { cls: 'badge-success', icon: CheckCircle },
      'pending': { cls: 'badge-warning', icon: Clock },
      'rejected': { cls: 'badge-error', icon: XCircle },
      'CONFIRMED': { cls: 'badge-success', icon: CheckCircle },
      'PENDING': { cls: 'badge-warning', icon: Clock },
      'REJECTED': { cls: 'badge-error', icon: XCircle },
      'CANCELLED': { cls: 'badge-error', icon: XCircle },
      'COMPLETED': { cls: 'badge-primary', icon: CheckCircle },
    };
    const s = map[status] || { cls: 'badge-warning', icon: Clock };
    return <span className={`badge ${s.cls}`}>{status}</span>;
  };

  const filteredVehicles = selectedCategory === 'All' 
    ? vehicles 
    : vehicles.filter(v => v.serviceType && v.serviceType.includes(selectedCategory));

  return (
    <div className="dashboard-page page-wrapper bg-secondary">

      <div className="dashboard-header">
        <div className="container" style={{ position: 'relative' }}>
          <h1>My Dashboard</h1>
          <p>Welcome, {user.name}! Manage your {user.role === 'user' ? 'rentals' : 'vehicles and bookings'}.</p>
        </div>
      </div>

      <div className="container" style={{ marginTop: '2rem' }}>
        {/* KYC verification banner */}
        {!user.isKycVerified && (
          <div className="card" style={{ background: 'linear-gradient(135deg, #fff7ed, #ffedd5)', border: '1px solid #fed7aa', padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ background: '#ff7e33', color: 'white', padding: '10px', borderRadius: '12px' }}><Shield size={24} /></div>
              <div>
                <h3 style={{ color: '#9a3412', marginBottom: '4px' }}>
                  {user.verificationStatus === 'pending' ? 'Verification Pending' : 'Verify Your Account'}
                </h3>
                <p style={{ color: '#c2410c' }}>
                  {user.verificationStatus === 'pending'
                    ? 'Your KYC documents are under review. You\'ll be notified once approved.'
                    : 'Complete KYC verification to book vehicles and access all features.'}
                </p>
              </div>
            </div>
            {user.verificationStatus !== 'pending' && (
              <Link to="/verify" className="btn btn-primary">Verify Now</Link>
            )}
          </div>
        )}

        {/* Unverified owner banner */}
        {isUnverifiedOwner && (
          <div className="card" style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)', border: '1px solid #fbbf24', padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div style={{ background: '#d97706', color: 'white', padding: '10px', borderRadius: '12px' }}><AlertTriangle size={24} /></div>
            <div>
              <h3 style={{ color: '#92400e', marginBottom: '4px' }}>Unverified Owner</h3>
              <p style={{ color: '#a16207' }}>Your vehicle listings require admin approval. Complete KYC verification to list vehicles instantly.</p>
            </div>
          </div>
        )}
      </div>

      <div className="container dashboard-content">
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
            ) : (
              <table className="dashboard-table" style={{ borderTop: '1px solid var(--border-color)' }}>
                <thead><tr><th>Vehicle</th><th>Category</th><th>Price/day</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {filteredVehicles.map(v => (
                    <tr key={v._id}>
                      <td><div className="table-vehicle"><strong>{v.title}</strong><span>{v.make} {v.model}</span></div></td>
                      <td>{v.serviceType && v.serviceType.length > 0 ? <span className="badge" style={{ background: 'var(--bg-secondary)' }}>{v.serviceType[0]}</span> : '-'}</td>
                      <td>LKR {v.pricePerDay.toLocaleString()}</td>
                      <td>
                        {statusBadge(v.status)}
                        {v.isActive ? <span className="badge badge-primary" style={{ marginLeft: 4 }}>Active</span> : <span className="badge badge-error" style={{ marginLeft: 4 }}>Hidden</span>}
                      </td>
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleToggleStatus(v._id)} title={v.isActive ? 'Hide' : 'Show'}>
                          {v.isActive ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        <button className="btn btn-ghost btn-sm text-error" onClick={() => handleDeleteVehicle(v._id)} title="Delete">
                          <Trash2 size={14} />
                        </button>
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
                <thead><tr><th>Vehicle</th><th>Dates</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {bookings.map(b => {
                    const vehicle = typeof b.vehicle === 'object' ? b.vehicle : null;
                    const owner = typeof b.owner === 'object' ? b.owner : null;
                    return (
                      <tr key={b._id}>
                        <td>{vehicle ? (vehicle as Vehicle).title : 'Vehicle'}</td>
                        <td className="table-dates">{new Date(b.startDate).toLocaleDateString()} — {new Date(b.endDate).toLocaleDateString()}</td>
                        <td>LKR {b.totalAmount.toLocaleString()}</td>
                        <td>
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
                        <td className="table-actions">
                          {/* Owner accept/reject — only for verified owners */}
                          {b.status === 'PENDING' && isVerifiedOwner && (
                            <>
                              <button className="btn btn-sm btn-primary" onClick={() => handleAcceptBooking(b._id)}>
                                <CheckCircle size={14} /> Accept
                              </button>
                              <button className="btn btn-sm btn-danger" onClick={() => handleRejectBooking(b._id)}>
                                <XCircle size={14} /> Reject
                              </button>
                            </>
                          )}
                          {/* Unverified owner sees read-only */}
                          {b.status === 'PENDING' && isUnverifiedOwner && (
                            <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>Awaiting admin action</span>
                          )}
                          {/* Renter can cancel pending bookings */}
                          {(b.status === 'PENDING') && user?.role === 'user' && (
                            <button className="btn btn-sm btn-danger" onClick={() => handleCancelBooking(b._id)}>
                              <XCircle size={14} /> Cancel
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
        ) : (
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
        )}
      </div>
    </div>
  );
}
