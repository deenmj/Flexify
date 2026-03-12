import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { adminApi, type AdminStats, type Vehicle, type User, type Booking, type AuditLog } from '../api';
import { Users, Car, Calendar, DollarSign, CheckCircle, Eye, ArrowLeft, Edit2, Trash2, History, TrendingUp, MapPin } from 'lucide-react';
import { Table, Tag, Tooltip, Space, Typography, Select, Card, Statistic, Spin } from 'antd';
const { Text } = Typography;
import './Dashboard.css';

const SRI_LANKA_DISTRICTS = [
  'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya', 'Galle', 'Matara', 'Hambantota', 
  'Jaffna', 'Kilinochchi', 'Mannar', 'Vavuniya', 'Mullaitivu', 'Batticaloa', 'Ampara', 'Trincomalee', 
  'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla', 'Moneragala', 'Ratnapura', 'Kegalle'
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [tab, setTab] = useState<'overview' | 'users' | 'vehicles' | 'bookings'>('overview');
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [district, setDistrict] = useState<string>('All Sri Lanka');
  const [timeRange, setTimeRange] = useState<string>('30d');
  
  const [roleEditUser, setRoleEditUser] = useState<string | null>(null);
  const [newRole, setNewRole] = useState('');
  const [newOwnerType, setNewOwnerType] = useState('UNVERIFIED');
  const [searchQuery, setSearchQuery] = useState('');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const s = await adminApi.getStats({ district, timeRange });
      setStats(s);
    } catch (err) {
      console.error("Failed to fetch stats", err);
    } finally {
      setStatsLoading(false);
    }
  }, [district, timeRange]);

  useEffect(() => {
    if (user?.role !== 'superadmin') return;
    
    // Initial full load
    setLoading(true);
    Promise.all([
      adminApi.getStats({ district, timeRange }).catch(() => null),
      adminApi.getAllUsers().catch(() => []),
      adminApi.getAllVehicles().catch(() => []),
      adminApi.getAllBookings().catch(() => []),
      adminApi.getAuditLogs(1, 15).catch(() => ({ logs: [] })),
    ]).then(([s, u, v, b, logs]) => {
      if (s) setStats(s);
      setAllUsers(u);
      setAllVehicles(v);
      setAllBookings(b);
      setAuditLogs(logs.logs);
    }).finally(() => setLoading(false));
  }, [user]); // Only run on user change (load)

  // Refetch stats when filters change
  useEffect(() => {
    if (loading) return; // Wait for initial load
    fetchStats();
  }, [district, timeRange, fetchStats]);

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
              <div className="stat-info"><span className="stat-number">{stats.totalVehicles}</span><span className="stat-label">Vehicles ({district})</span></div>
            </div>
            <div className="stat-card card">
              <div className="stat-icon" style={{ background: '#fef3c7', color: '#d97706' }}><Calendar size={24} /></div>
              <div className="stat-info"><span className="stat-number">{stats.bookings.total}</span><span className="stat-label">Bookings ({timeRange})</span></div>
            </div>
            <div className="stat-card card">
              <div className="stat-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}><DollarSign size={24} /></div>
              <div className="stat-info"><span className="stat-number">LKR {stats.totalEarnings.toLocaleString()}</span><span className="stat-label">Earnings</span></div>
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
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}><Spin size="large" /></div>
        ) : tab === 'overview' ? (
          <div className="card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ margin: 0 }}>Platform Performance</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Analyze trends by district and time range.</p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <Select 
                  value={district} 
                  onChange={setDistrict} 
                  style={{ width: 180 }}
                  suffixIcon={<MapPin size={14} />}
                >
                  <Select.Option value="All Sri Lanka">All Sri Lanka</Select.Option>
                  {SRI_LANKA_DISTRICTS.map(d => <Select.Option key={d} value={d}>{d}</Select.Option>)}
                </Select>
                <Select 
                  value={timeRange} 
                  onChange={setTimeRange} 
                  style={{ width: 140 }}
                  suffixIcon={<TrendingUp size={14} />}
                >
                  <Select.Option value="7d">Last 7 Days</Select.Option>
                  <Select.Option value="30d">Last 30 Days</Select.Option>
                  <Select.Option value="90d">Last 90 Days</Select.Option>
                  <Select.Option value="all">All Time</Select.Option>
                </Select>
              </div>
            </div>

            {statsLoading ? (
              <div style={{ textAlign: 'center', padding: '4rem' }}><Spin tip="Loading stats..." /></div>
            ) : stats && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                  <Card size="small" style={{ background: '#f8fafc' }}>
                    <Statistic 
                      title="Success Rate" 
                      value={stats.successRate} 
                      suffix="%" 
                      precision={1}
                      valueStyle={{ color: stats.successRate > 80 ? '#16a34a' : '#d97706' }}
                    />
                  </Card>
                  <Card size="small" style={{ background: '#f8fafc' }}>
                    <Statistic title="Confirmed Bookings" value={stats.bookings.confirmed} />
                  </Card>
                  <Card size="small" style={{ background: '#f8fafc' }}>
                    <Statistic title="Pending KYC" value={stats.pendingKyc} valueStyle={{ color: '#d97706' }} />
                  </Card>
                  <Card size="small" style={{ background: '#f8fafc' }}>
                    <Statistic title="Active Vehicles" value={stats.activeVehicles} />
                  </Card>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                  <div className="card-sub" style={{ border: '1px solid #f1f5f9', padding: '1.5rem', borderRadius: '12px' }}>
                    <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}><Car size={18} /> Popular Vehicles (by Make)</h4>
                    {Object.entries(stats.popularTypes).length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {Object.entries(stats.popularTypes).map(([make, count]) => (
                          <Tag key={make} color="blue" style={{ fontSize: '13px', padding: '4px 10px', borderRadius: '20px' }}>
                            {make}: <strong>{count}</strong>
                          </Tag>
                        ))}
                      </div>
                    ) : <Text type="secondary">No data for this filter.</Text>}
                  </div>
                  
                  <div className="card-sub" style={{ border: '1px solid #f1f5f9', padding: '1.5rem', borderRadius: '12px' }}>
                    <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}><MapPin size={18} /> Booking Distribution</h4>
                    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                      {Object.entries(stats.bookings.byDistrict).length > 0 ? (
                        Object.entries(stats.bookings.byDistrict).sort((a,b) => b[1] - a[1]).map(([dist, count]) => (
                          <div key={dist} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f8fafc' }}>
                            <Text>{dist}</Text>
                            <Text strong>{count}</Text>
                          </div>
                        ))
                      ) : <Text type="secondary">No district data available.</Text>}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Audit Log Table */}
            <div style={{ marginTop: '3rem', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
                <div style={{ background: '#fecaca', color: '#dc2626', padding: '8px', borderRadius: '8px' }}><History size={20} /></div>
                <h3 style={{ margin: 0 }}>Recent Admin Actions (Audit Log)</h3>
              </div>
              
              <Table 
                dataSource={auditLogs} 
                rowKey="_id"
                pagination={{ pageSize: 5 }}
                size="middle"
                className="audit-table"
                columns={[
                  {
                    title: 'Date & Time',
                    dataIndex: 'timestamp',
                    render: (t) => <span style={{ color: '#64748b', fontSize: '13px' }}>{new Date(t).toLocaleString()}</span>
                  },
                  {
                    title: 'Action',
                    dataIndex: 'action',
                    render: (a) => {
                      const colors: any = { role_change: 'purple', user_delete: 'red', user_promote: 'green' };
                      return <Tag color={colors[a] || 'blue'}>{a.replace('_', ' ').toUpperCase()}</Tag>
                    }
                  },
                  {
                    title: 'Performed By',
                    dataIndex: 'performedBy',
                    render: (p: any) => <div style={{ fontSize: '13px' }}><strong>{p?.name}</strong><br/><Text type="secondary" style={{ fontSize: '11px' }}>{p?.email}</Text></div>
                  },
                  {
                    title: 'Target User',
                    dataIndex: 'targetUser',
                    render: (tu: any) => <div style={{ fontSize: '13px' }}>{tu?.name || 'N/A'}<br/><Text type="secondary" style={{ fontSize: '11px' }}>{tu?.email || 'N/A'}</Text></div>
                  },
                  {
                    title: 'Details',
                    dataIndex: 'details',
                    render: (d: any) => (
                      <Tooltip title={JSON.stringify(d, null, 2)}>
                        <span style={{ fontSize: '12px', color: '#64748b', cursor: 'help' }}>
                          {d.oldRole ? `Role: ${d.oldRole} → ${d.newRole}` : d.reason || 'View details'}
                        </span>
                      </Tooltip>
                    )
                  }
                ]}
              />
            </div>
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
