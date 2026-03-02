import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { vehicleApi, bookingApi, type Vehicle, type Booking } from '../api';
import { Car, Calendar, DollarSign, CheckCircle, XCircle, Clock, Eye, EyeOff, Trash2, ArrowLeft, Phone, Shield, AlertTriangle } from 'lucide-react';
import './Dashboard.css';

export default function Dashboard() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'vehicles' | 'bookings'>(user?.role === 'user' ? 'bookings' : 'vehicles');

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

  return (
    <div className="dashboard-page page-wrapper bg-secondary">
      <div className="container" style={{ paddingTop: '2rem' }}>
        <Link to="/explore" className="premium-back-btn">
          <ArrowLeft size={18} /><span>Back to Explore</span>
        </Link>
      </div>

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
            {vehicles.length === 0 ? (
              <div className="dashboard-empty">
                <Car size={40} strokeWidth={1} />
                <p>No vehicles listed yet</p>
                <Link to="/list-vehicle" className="btn btn-primary btn-sm">List a Vehicle</Link>
              </div>
            ) : (
              <table className="dashboard-table">
                <thead><tr><th>Vehicle</th><th>Price/day</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {vehicles.map(v => (
                    <tr key={v._id}>
                      <td><div className="table-vehicle"><strong>{v.title}</strong><span>{v.make} {v.model}</span></div></td>
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
                {user.role === 'user' && <Link to="/explore" className="btn btn-primary btn-sm">Browse Vehicles</Link>}
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
    </div>
  );
}
