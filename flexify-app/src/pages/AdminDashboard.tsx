import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { adminApi, type AdminStats, type Vehicle, type User, type Booking } from '../api';
import { Users, Car, Calendar, DollarSign, CheckCircle, Eye, ArrowLeft, Edit2, Trash2 } from 'lucide-react';
import './Dashboard.css';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [tab, setTab] = useState<'overview' | 'users' | 'vehicles' | 'bookings'>('overview');
  const [loading, setLoading] = useState(true);
  const [roleEditUser, setRoleEditUser] = useState<string | null>(null);
  const [newRole, setNewRole] = useState('');
  const [newOwnerType, setNewOwnerType] = useState('UNVERIFIED');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user?.role !== 'superadmin') return;
    Promise.all([
      adminApi.getStats().catch(() => null),
      adminApi.getAllUsers().catch(() => []),
      adminApi.getAllVehicles().catch(() => []),
      adminApi.getAllBookings().catch(() => []),
    ]).then(([s, u, v, b]) => {
      if (s) setStats(s);
      setAllUsers(u);
      setAllVehicles(v);
      setAllBookings(b);
    }).finally(() => setLoading(false));
  }, [user]);

  const handleUpdateRole = async (userId: string) => {
    try {
      const result = await adminApi.updateUserRole(userId, newRole, newRole === 'owner' ? newOwnerType : undefined);
      setAllUsers(prev => prev.map(u => (u.id || u._id) === userId ? { ...u, ...result.user } : u));
      setRoleEditUser(null);
      alert(result.message);
    } catch (err: any) { alert(err.message); }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user permanently?')) return;
    try {
      await adminApi.deleteUser(userId);
      setAllUsers(prev => prev.filter(u => (u.id || u._id) !== userId));
    } catch (err: any) { alert(err.message); }
  };

  const filteredUsers = allUsers.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user || user.role !== 'superadmin') {
    return <div className="container" style={{ padding: '6rem 2rem', textAlign: 'center' }}><h2>Super Admin access required</h2></div>;
  }

  const roleBadge = (u: User) => {
    const colors: Record<string, string> = { superadmin: '#7c3aed', subadmin: '#0d9488', owner: '#1890ff', user: '#64748b' };
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        <span className="badge" style={{ background: colors[u.role] + '15', color: colors[u.role], border: `1px solid ${colors[u.role]}30` }}>{u.role}</span>
        {u.ownerType && <span className="badge" style={{ background: u.ownerType === 'VERIFIED' ? '#ecfdf5' : '#fef3c7', color: u.ownerType === 'VERIFIED' ? '#059669' : '#d97706', fontSize: '10px' }}>{u.ownerType}</span>}
      </span>
    );
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-header" style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
        <div className="container" style={{ position: 'relative' }}>
          <button onClick={() => window.history.back()} className="btn btn-ghost" style={{ position: 'absolute', left: '0', top: '-1rem', padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px', color: 'white' }}>
            <ArrowLeft size={18} /> Back
          </button>
          <h1>Super Admin Dashboard</h1>
          <p>Full platform control — Users, Vehicles, Bookings, and Role Management.</p>
        </div>
      </div>

      <div className="container dashboard-content">
        {/* Stats */}
        {stats && (
          <div className="dashboard-stats">
            <div className="stat-card card">
              <div className="stat-icon" style={{ background: '#f5f3ff', color: '#7c3aed' }}><Users size={24} /></div>
              <div className="stat-info"><span className="stat-number">{stats.totalUsers}</span><span className="stat-label">Total Users</span></div>
            </div>
            <div className="stat-card card">
              <div className="stat-icon" style={{ background: '#eff6ff', color: '#2563eb' }}><Car size={24} /></div>
              <div className="stat-info"><span className="stat-number">{stats.totalVehicles}</span><span className="stat-label">Vehicles</span></div>
            </div>
            <div className="stat-card card">
              <div className="stat-icon" style={{ background: '#fef3c7', color: '#d97706' }}><Calendar size={24} /></div>
              <div className="stat-info"><span className="stat-number">{stats.pendingVehicles}</span><span className="stat-label">Pending Vehicles</span></div>
            </div>
            <div className="stat-card card">
              <div className="stat-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}><DollarSign size={24} /></div>
              <div className="stat-info"><span className="stat-number">{stats.totalBookings}</span><span className="stat-label">Total Bookings</span></div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="dashboard-tabs">
          <button className={`dashboard-tab ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')}><Eye size={16} /> Overview</button>
          <button className={`dashboard-tab ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}><Users size={16} /> Users ({allUsers.length})</button>
          <button className={`dashboard-tab ${tab === 'vehicles' ? 'active' : ''}`} onClick={() => setTab('vehicles')}><Car size={16} /> Vehicles ({allVehicles.length})</button>
          <button className={`dashboard-tab ${tab === 'bookings' ? 'active' : ''}`} onClick={() => setTab('bookings')}><Calendar size={16} /> Bookings ({allBookings.length})</button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}>Loading...</div>
        ) : tab === 'overview' ? (
          <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
            <h3 style={{ marginBottom: '0.5rem' }}>Platform Overview</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Select a tab above to manage users, vehicles, or bookings.</p>
            {stats && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '2rem' }}>
                <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px' }}>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: '#7c3aed' }}>{stats.totalOwners}</div>
                  <div style={{ fontSize: '13px', color: '#64748b' }}>Total Owners</div>
                </div>
                <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px' }}>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: '#0d9488' }}>{stats.pendingKyc}</div>
                  <div style={{ fontSize: '13px', color: '#64748b' }}>Pending KYC</div>
                </div>
                <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px' }}>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: '#16a34a' }}>{stats.confirmedBookings}</div>
                  <div style={{ fontSize: '13px', color: '#64748b' }}>Confirmed Bookings</div>
                </div>
                <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px' }}>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: '#1890ff' }}>{stats.activeVehicles}</div>
                  <div style={{ fontSize: '13px', color: '#64748b' }}>Active Vehicles</div>
                </div>
              </div>
            )}
          </div>

        ) : tab === 'users' ? (
          <div className="dashboard-table-wrap card">
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
              <input type="text" placeholder="Search users by name, email, or role..." className="input-field" style={{ borderRadius: '10px' }} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <table className="dashboard-table">
              <thead>
                <tr><th>User</th><th>Role</th><th>KYC</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => {
                  const id = (u.id || u._id)!;
                  return (
                    <tr key={id}>
                      <td><div className="table-vehicle"><strong>{u.name}</strong><span>{u.email}</span></div></td>
                      <td>{roleBadge(u)}</td>
                      <td>
                        {u.isKycVerified ? (
                          <span className="badge badge-success"><CheckCircle size={12} /> Verified</span>
                        ) : (
                          <span className="badge badge-warning">{u.verificationStatus || 'Not submitted'}</span>
                        )}
                      </td>
                      <td><span className="badge badge-primary">{u.status || 'active'}</span></td>
                      <td className="table-actions">
                        {roleEditUser === id ? (
                          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                            <select value={newRole} onChange={(e) => setNewRole(e.target.value)} style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                              <option value="user">user</option>
                              <option value="owner">owner</option>
                              <option value="subadmin">subadmin</option>
                              <option value="superadmin">superadmin</option>
                            </select>
                            {newRole === 'owner' && (
                              <select value={newOwnerType} onChange={(e) => setNewOwnerType(e.target.value)} style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                                <option value="UNVERIFIED">UNVERIFIED</option>
                                <option value="VERIFIED">VERIFIED</option>
                              </select>
                            )}
                            <button className="btn btn-sm btn-primary" onClick={() => handleUpdateRole(id)}>Save</button>
                            <button className="btn btn-sm btn-ghost" onClick={() => setRoleEditUser(null)}>✕</button>
                          </div>
                        ) : (
                          <>
                            <button className="btn btn-ghost btn-sm" onClick={() => { setRoleEditUser(id); setNewRole(u.role); setNewOwnerType(u.ownerType || 'UNVERIFIED'); }} title="Edit Role">
                              <Edit2 size={14} />
                            </button>
                            <button className="btn btn-ghost btn-sm text-error" onClick={() => handleDeleteUser(id)} title="Delete">
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        ) : tab === 'vehicles' ? (
          <div className="dashboard-table-wrap card">
            {allVehicles.length === 0 ? (
              <div className="dashboard-empty"><Car size={40} strokeWidth={1} /><p>No vehicles</p></div>
            ) : (
              <table className="dashboard-table">
                <thead><tr><th>Vehicle</th><th>Owner</th><th>Price/day</th><th>Status</th></tr></thead>
                <tbody>
                  {allVehicles.map(v => {
                    const owner = typeof v.owner === 'object' ? v.owner : null;
                    return (
                      <tr key={v._id}>
                        <td><div className="table-vehicle"><strong>{v.title}</strong><span>{v.make} {v.model}</span></div></td>
                        <td>{owner ? <div className="table-vehicle"><strong>{owner.name}</strong><span>{owner.email}</span></div> : 'Unknown'}</td>
                        <td>LKR {v.pricePerDay.toLocaleString()}</td>
                        <td>
                          <span className={`badge ${v.status === 'active' ? 'badge-success' : v.status === 'pending' ? 'badge-warning' : 'badge-error'}`}>
                            {v.status}
                          </span>
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
            {allBookings.length === 0 ? (
              <div className="dashboard-empty"><Calendar size={40} strokeWidth={1} /><p>No bookings</p></div>
            ) : (
              <table className="dashboard-table">
                <thead><tr><th>Renter</th><th>Vehicle</th><th>Dates</th><th>Amount</th><th>Status</th></tr></thead>
                <tbody>
                  {allBookings.map(b => {
                    const renter = typeof b.user === 'object' ? b.user : null;
                    const vehicle = typeof b.vehicle === 'object' ? b.vehicle : null;
                    return (
                      <tr key={b._id}>
                        <td>{renter ? renter.name : 'User'}</td>
                        <td>{vehicle ? (vehicle as Vehicle).title : 'Vehicle'}</td>
                        <td className="table-dates">{new Date(b.startDate).toLocaleDateString()} — {new Date(b.endDate).toLocaleDateString()}</td>
                        <td>LKR {b.totalAmount.toLocaleString()}</td>
                        <td>
                          <span className={`badge ${b.status === 'CONFIRMED' ? 'badge-success' : b.status === 'CANCELLED' || b.status === 'REJECTED' ? 'badge-error' : 'badge-warning'}`}>
                            {b.status}
                          </span>
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
