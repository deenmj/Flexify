import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { vehicleApi, bookingApi, type Vehicle, type Booking } from '../api';
import { Car, Calendar, DollarSign, CheckCircle, XCircle, Clock, Eye, EyeOff, Trash2, ArrowLeft } from 'lucide-react';
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
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteVehicle = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this vehicle?")) return;
    try {
      await vehicleApi.delete(id);
      setVehicles(prev => prev.filter(v => v._id !== id));
    } catch (err) {
      console.error(err);
      alert("Failed to delete vehicle");
    }
  };

  const handleApproveBooking = async (id: string) => {
    try {
      await bookingApi.approve(id);
      setBookings(prev => prev.map(bk => bk._id === id ? { ...bk, status: 'APPROVED' } : bk));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCancelBooking = async (id: string) => {
    try {
      await bookingApi.cancel(id);
      setBookings(prev => prev.map(bk => bk._id === id ? { ...bk, status: 'CANCELLED' } : bk));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handlePayBooking = async (id: string) => {
    try {
      await bookingApi.pay(id);
      setBookings(prev => prev.map(bk => bk._id === id ? { ...bk, status: 'CONFIRMED' } : bk));
      alert("Payment successful! Booking confirmed.");
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (!user) return <div className="container" style={{ padding: '6rem 2rem', textAlign: 'center' }}><h2>Please sign in</h2></div>;

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div className="container" style={{ position: 'relative' }}>
          <button 
            onClick={() => window.history.back()} 
            className="btn btn-ghost" 
            style={{ position: 'absolute', left: '0', top: '-1rem', padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <ArrowLeft size={18} /> Back
          </button>
          <h1>My Dashboard</h1>
          <p>Welcome, {user.name}! Manage your {user.role === 'user' ? 'rentals' : 'vehicles and bookings'}.</p>
        </div>
      </div>

      <div className="container dashboard-content">
        {/* Stats */}
        {user?.role !== 'user' && (
          <div className="dashboard-stats">
            <div className="stat-card card">
            <div className="stat-icon" style={{ background: '#eff6ff', color: '#2563eb' }}><Car size={24} /></div>
            <div className="stat-info">
              <span className="stat-number">{vehicles.length}</span>
              <span className="stat-label">My Vehicles</span>
            </div>
          </div>
          <div className="stat-card card">
            <div className="stat-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}><Calendar size={24} /></div>
            <div className="stat-info">
              <span className="stat-number">{bookings.length}</span>
              <span className="stat-label">Total Bookings</span>
            </div>
          </div>
          <div className="stat-card card">
            <div className="stat-icon" style={{ background: '#fefce8', color: '#ca8a04' }}><DollarSign size={24} /></div>
            <div className="stat-info">
              <span className="stat-number">{bookings.filter(b => b.status === 'CONFIRMED').length}</span>
              <span className="stat-label">Confirmed</span>
            </div>
          </div>
          <div className="stat-card card">
            <div className="stat-icon" style={{ background: '#fef2f2', color: '#dc2626' }}><Clock size={24} /></div>
            <div className="stat-info">
              <span className="stat-number">{bookings.filter(b => b.status === 'PENDING').length}</span>
              <span className="stat-label">Pending</span>
            </div>
          </div>
        </div>
        )}

        {/* Tabs */}
        <div className="dashboard-tabs">
          {(user.role === 'owner' || user.role === 'verifiedOwner' || user.role === 'admin') && (
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
                <a href="/list-vehicle" className="btn btn-primary btn-sm">List a Vehicle</a>
              </div>
            ) : (
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Vehicle</th>
                    <th>Price/day</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map(v => (
                    <tr key={v._id}>
                      <td>
                        <div className="table-vehicle">
                          <strong>{v.title}</strong>
                          <span>{v.make} {v.model}</span>
                        </div>
                      </td>
                      <td>${v.pricePerDay}</td>
                      <td>
                        {v.approved ? <span className="badge badge-success">Approved</span> : <span className="badge badge-warning">Pending</span>}
                        {v.isActive ? <span className="badge badge-primary" style={{ marginLeft: 4 }}>Active</span> : <span className="badge badge-error" style={{ marginLeft: 4 }}>Hidden</span>}
                      </td>
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleToggleStatus(v._id)} title={v.isActive ? 'Hide' : 'Show'}>
                          {v.isActive ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        <button className="btn btn-ghost btn-sm text-error" onClick={() => handleDeleteVehicle(v._id)} title="Delete Vehicle">
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
              </div>
            ) : (
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Vehicle</th>
                    <th>Dates</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map(b => {
                    const vehicle = typeof b.vehicle === 'object' ? b.vehicle : null;
                    return (
                      <tr key={b._id}>
                        <td>{vehicle ? (vehicle as Vehicle).title : 'Vehicle'}</td>
                        <td className="table-dates">
                          {new Date(b.startDate).toLocaleDateString()} — {new Date(b.endDate).toLocaleDateString()}
                        </td>
                        <td>${b.totalAmount}</td>
                        <td>
                          <span className={`badge ${b.status === 'CONFIRMED' ? 'badge-success' : b.status === 'CANCELLED' ? 'badge-error' : b.status === 'APPROVED' ? 'badge-primary' : 'badge-warning'}`}>
                            {b.status}
                          </span>
                        </td>
                        <td className="table-actions">
                          {b.status === 'PENDING' && user?.role === 'owner' && (
                            <>
                              <button className="btn btn-sm btn-primary" onClick={() => handleApproveBooking(b._id)}>
                                <CheckCircle size={14} /> Approve
                              </button>
                              <button className="btn btn-sm btn-danger" onClick={() => handleCancelBooking(b._id)}>
                                <XCircle size={14} /> Cancel
                              </button>
                            </>
                          )}
                          {b.status === 'APPROVED' && user?.role !== 'owner' && (
                            <button className="btn btn-sm btn-success" onClick={() => handlePayBooking(b._id)}>
                              <DollarSign size={14} /> Pay Now
                            </button>
                          )}
                          {(b.status === 'PENDING' || b.status === 'APPROVED') && user?.role !== 'owner' && (
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
