import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { vehicleApi, bookingApi, type Vehicle, type Booking } from '../api';
import { Car, Calendar, DollarSign, CheckCircle, XCircle, Clock, Eye, EyeOff, Trash2, Phone, Shield, AlertTriangle, X } from 'lucide-react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import './Dashboard.css';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'vehicles' | 'bookings'>(user?.role === 'user' ? 'bookings' : 'vehicles');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  // Booking Modal State
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      vehicleApi.getMy().catch(() => []),
      bookingApi.getMy().catch(() => []),
    ]).then(([v, b]) => {
      setVehicles(v);
      setBookings(b);
    }).finally(() => setLoading(false));
  }, []);

  const handleToggleStatus = async (id: string) => {
    try {
      await vehicleApi.toggleStatus(id);
      setVehicles(prev => prev.map(v => v._id === id ? { ...v, isActive: !v.isActive } : v));
    } catch (err) { console.error(err); }
  };

  const handleDeleteVehicle = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this vehicle?")) return;
    try {
      await vehicleApi.delete(id);
      setVehicles(prev => prev.filter(v => v._id !== id));
    } catch (err) { console.error(err); alert("Failed to delete vehicle"); }
  };

  const handleAcceptBooking = async (id: string) => {
    try {
      await bookingApi.accept(id);
      setBookings(prev => prev.map(bk => bk._id === id ? { ...bk, status: 'CONFIRMED' } : bk));
    } catch (err: any) { alert(err.message); }
  };

  const handleRejectBooking = async (id: string) => {
    try {
      await bookingApi.reject(id);
      setBookings(prev => prev.map(bk => bk._id === id ? { ...bk, status: 'REJECTED' } : bk));
    } catch (err: any) { alert(err.message); }
  };

  const handleCancelBooking = async (id: string) => {
    try {
      await bookingApi.cancel(id);
      setBookings(prev => prev.map(bk => bk._id === id ? { ...bk, status: 'CANCELLED' } : bk));
    } catch (err: any) { alert(err.message); }
  };

  const handleOpenBooking = (v: Vehicle) => {
    if (!user?.isKycVerified) {
      alert("Please verify your account first");
      return;
    }
    setSelectedVehicle(v);
    setShowBookingModal(true);
  };

  const submitBooking = async () => {
    if (!selectedVehicle || !startDate || !endDate) return;
    setBookingLoading(true);
    try {
      const resp = await bookingApi.create(selectedVehicle._id, startDate.toISOString(), endDate.toISOString());
      setBookings(prev => [resp, ...prev]);
      setShowBookingModal(false);
      setStartDate(null);
      setEndDate(null);
      alert("Booking request submitted!");
    } catch (err: any) {
      alert(err.message || "Failed to book");
    } finally {
      setBookingLoading(false);
    }
  };

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
      {/* Removed custom back button for mobile swipe support */}

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
              <div className="stat-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}><Calendar size={24} /></div>
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
            <Calendar size={16} /> {user.role === 'user' ? 'My Rentals' : 'Bookings'}
          </button>
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
        ) : (
          <div className="dashboard-table-wrap card">
            {bookings.length === 0 ? (
              <div className="dashboard-empty">
                <Calendar size={40} strokeWidth={1} />
                <p>No bookings yet</p>
                {user.role === 'user' && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => { 
                      vehicleApi.getAll({ status: 'active' }).then(v => {
                        if (v.length > 0) handleOpenBooking(v[0]); // Demo: book first one for quick test
                        else navigate('/explore');
                      });
                    }} className="btn btn-primary btn-sm">Quick Book Now</button>
                    <Link to="/explore" className="btn btn-secondary btn-sm">Explore All</Link>
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
        )}
      </div>

      {/* Booking Modal */}
      {showBookingModal && selectedVehicle && (
        <div className="modal-overlay" onClick={() => setShowBookingModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <button className="modal-close" onClick={() => setShowBookingModal(false)}><X size={20} /></button>
            <h2 style={{ marginBottom: '0.5rem' }}>Book {selectedVehicle.title}</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>LKR {selectedVehicle.pricePerDay.toLocaleString()} / day</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="input-group">
                <label>Pickup Date</label>
                <DatePicker
                  selected={startDate}
                  onChange={(date: Date | null) => setStartDate(date)}
                  selectsStart
                  startDate={startDate}
                  endDate={endDate}
                  minDate={new Date()}
                  className="input-field"
                  placeholderText="Select date"
                />
              </div>
              <div className="input-group">
                <label>Return Date</label>
                <DatePicker
                  selected={endDate}
                  onChange={(date: Date | null) => setEndDate(date)}
                  selectsEnd
                  startDate={startDate}
                  endDate={endDate}
                  minDate={startDate || new Date()}
                  className="input-field"
                  placeholderText="Select date"
                />
              </div>

              {startDate && endDate && (
                <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px', marginTop: '0.5rem' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                     <span>Total Amount</span>
                     <span>LKR {(selectedVehicle.pricePerDay * Math.ceil((endDate.getTime() - startDate.getTime()) / (1000*60*60*24))).toLocaleString()}</span>
                   </div>
                </div>
              )}

              <button 
                className="btn btn-primary btn-full" 
                onClick={submitBooking}
                disabled={bookingLoading || !startDate || !endDate}
                style={{ marginTop: '1rem' }}
              >
                {bookingLoading ? 'Processing...' : 'Confirm Booking Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
