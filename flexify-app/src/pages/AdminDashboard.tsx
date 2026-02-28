import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { adminApi, vehicleApi, type AdminStats, type Vehicle, type User } from '../api';
import { Users, Car, Calendar, DollarSign, CheckCircle, XCircle, Shield, Eye } from 'lucide-react';
import './Dashboard.css';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [pendingVehicles, setPendingVehicles] = useState<Vehicle[]>([]);
  const [pendingVerifications, setPendingVerifications] = useState<User[]>([]);
  const [tab, setTab] = useState<'overview' | 'vehicles' | 'verifications'>('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== 'admin') return;
    Promise.all([
      adminApi.getStats().catch(() => null),
      adminApi.getPendingVehicles().catch(() => []),
      adminApi.getPendingVerifications().catch(() => []),
    ]).then(([s, v, ver]) => {
      if (s) setStats(s);
      setPendingVehicles(v);
      setPendingVerifications(ver);
    }).finally(() => setLoading(false));
  }, [user]);

  const handleApproveVehicle = async (id: string) => {
    try {
      await vehicleApi.approve(id);
      setPendingVehicles(prev => prev.filter(v => v._id !== id));
      if (stats) setStats({ ...stats, pendingVehicles: stats.pendingVehicles - 1 });
    } catch (err: any) { alert(err.message); }
  };

  const handleRejectVehicle = async (id: string) => {
    try {
      await vehicleApi.reject(id);
      setPendingVehicles(prev => prev.filter(v => v._id !== id));
    } catch (err: any) { alert(err.message); }
  };

  const handleApproveOwner = async (userId: string) => {
    try {
      await adminApi.approveOwner(userId);
      setPendingVerifications(prev => prev.filter(u => (u.id || u._id) !== userId));
    } catch (err: any) { alert(err.message); }
  };

  const handleRejectOwner = async (userId: string) => {
    try {
      await adminApi.rejectOwner(userId);
      setPendingVerifications(prev => prev.filter(u => (u.id || u._id) !== userId));
    } catch (err: any) { alert(err.message); }
  };

  if (!user || user.role !== 'admin') {
    return <div className="container" style={{ padding: '6rem 2rem', textAlign: 'center' }}><h2>Admin access required</h2></div>;
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-header" style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
        <div className="container">
          <h1>Admin Dashboard</h1>
          <p>Manage the platform, users, vehicles, and verifications.</p>
        </div>
      </div>

      <div className="container dashboard-content">
        {/* Stats */}
        {stats && (
          <div className="dashboard-stats">
            <div className="stat-card card">
              <div className="stat-icon" style={{ background: '#f5f3ff', color: '#7c3aed' }}><Users size={24} /></div>
              <div className="stat-info">
                <span className="stat-number">{stats.totalUsers}</span>
                <span className="stat-label">Total Users</span>
              </div>
            </div>
            <div className="stat-card card">
              <div className="stat-icon" style={{ background: '#eff6ff', color: '#2563eb' }}><Car size={24} /></div>
              <div className="stat-info">
                <span className="stat-number">{stats.totalVehicles}</span>
                <span className="stat-label">Vehicles</span>
              </div>
            </div>
            <div className="stat-card card">
              <div className="stat-icon" style={{ background: '#fef3c7', color: '#d97706' }}><Calendar size={24} /></div>
              <div className="stat-info">
                <span className="stat-number">{stats.pendingVehicles}</span>
                <span className="stat-label">Pending Vehicles</span>
              </div>
            </div>
            <div className="stat-card card">
              <div className="stat-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}><DollarSign size={24} /></div>
              <div className="stat-info">
                <span className="stat-number">{stats.totalBookings}</span>
                <span className="stat-label">Confirmed Bookings</span>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="dashboard-tabs">
          <button className={`dashboard-tab ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')}>
            <Eye size={16} /> Overview
          </button>
          <button className={`dashboard-tab ${tab === 'vehicles' ? 'active' : ''}`} onClick={() => setTab('vehicles')}>
            <Car size={16} /> Pending Vehicles ({pendingVehicles.length})
          </button>
          <button className={`dashboard-tab ${tab === 'verifications' ? 'active' : ''}`} onClick={() => setTab('verifications')}>
            <Shield size={16} /> Verifications ({pendingVerifications.length})
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}>Loading...</div>
        ) : tab === 'overview' ? (
          <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
            <h3 style={{ marginBottom: '0.5rem' }}>Platform Overview</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Select a tab above to manage pending vehicles or owner verifications.</p>
          </div>
        ) : tab === 'vehicles' ? (
          <div className="dashboard-table-wrap card">
            {pendingVehicles.length === 0 ? (
              <div className="dashboard-empty"><Car size={40} strokeWidth={1} /><p>No pending vehicles</p></div>
            ) : (
              <table className="dashboard-table">
                <thead>
                  <tr><th>Vehicle</th><th>Owner</th><th>Price/day</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {pendingVehicles.map(v => {
                    const owner = typeof v.owner === 'object' ? v.owner : null;
                    return (
                      <tr key={v._id}>
                        <td><div className="table-vehicle"><strong>{v.title}</strong><span>{v.make} {v.model}</span></div></td>
                        <td>{owner ? owner.name : 'Unknown'}<br /><span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>{owner?.email}</span></td>
                        <td>${v.pricePerDay}</td>
                        <td className="table-actions">
                          <button className="btn btn-sm btn-primary" onClick={() => handleApproveVehicle(v._id)}>
                            <CheckCircle size={14} /> Approve
                          </button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleRejectVehicle(v._id)}>
                            <XCircle size={14} /> Reject
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <div className="dashboard-table-wrap card">
            {pendingVerifications.length === 0 ? (
              <div className="dashboard-empty"><Shield size={40} strokeWidth={1} /><p>No pending verifications</p></div>
            ) : (
              <table className="dashboard-table">
                <thead>
                  <tr><th>User</th><th>Request Type</th><th>Submitted</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {pendingVerifications.map(u => (
                    <tr key={u.id || u._id}>
                      <td><div className="table-vehicle"><strong>{u.name}</strong><span>{u.email}</span></div></td>
                      <td><span className="badge badge-primary">{u.verificationRequest?.type || 'Normal'}</span></td>
                      <td className="table-dates">{u.verificationRequest?.submittedAt ? new Date(u.verificationRequest.submittedAt).toLocaleDateString() : '-'}</td>
                      <td className="table-actions">
                        <button className="btn btn-sm btn-primary" onClick={() => handleApproveOwner((u.id || u._id)!)}>
                          <CheckCircle size={14} /> Approve
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleRejectOwner((u.id || u._id)!)}>
                          <XCircle size={14} /> Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
