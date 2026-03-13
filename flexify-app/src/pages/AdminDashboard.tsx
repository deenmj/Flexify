import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { adminApi, type AdminStats, type Vehicle, type User, type Booking, type AuditLog } from '../api';
import { Users, Car, Calendar, DollarSign, CheckCircle, Eye, LogOut, ArrowLeft, Edit2, Trash2, History, TrendingUp, MapPin } from 'lucide-react';
import { Table, Tag, Tooltip, Typography, Select, Card, Statistic, Spin, Layout, Menu, Button, Avatar, Space, Dropdown } from 'antd';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

const { Header, Sider, Content } = Layout;
const { Text, Title } = Typography;

const SRI_LANKA_DISTRICTS = [
  'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya', 'Galle', 'Matara', 'Hambantota', 
  'Jaffna', 'Kilinochchi', 'Mannar', 'Vavuniya', 'Mullaitivu', 'Batticaloa', 'Ampara', 'Trincomalee', 
  'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla', 'Moneragala', 'Ratnapura', 'Kegalle'
];

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(false);
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
      if (logs?.logs) setAuditLogs(logs.logs);
    }).finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (loading) return;
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
      <Space size={4}>
        <Tag color={colors[u.role] || 'blue'}>{u.role.toUpperCase()}</Tag>
        {u.ownerType && (
          <Tag color={u.ownerType === 'VERIFIED' ? 'success' : 'warning'}>
            {u.ownerType}
          </Tag>
        )}
      </Space>
    );
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <Sider 
        collapsible 
        collapsed={collapsed} 
        onCollapse={(value) => setCollapsed(value)}
        theme="dark"
        width={260}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 10,
          boxShadow: '2px 0 8px 0 rgba(29,35,41,.05)',
        }}
      >
        <div style={{ padding: '24px 16px', color: 'white', textAlign: 'center', fontSize: '1.25rem', fontWeight: 800, letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '16px' }}>
          {collapsed ? 'FX' : 'Flexify Admin'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[tab]}
          onClick={({ key }) => setTab(key as any)}
          items={[
            { key: 'overview', icon: <Eye size={18} />, label: 'Overview' },
            { key: 'users', icon: <Users size={18} />, label: `Users (${allUsers.length})` },
            { key: 'vehicles', icon: <Car size={18} />, label: `Vehicles (${allVehicles.length})` },
            { key: 'bookings', icon: <Calendar size={18} />, label: `Bookings (${allBookings.length})` },
          ]}
        />
      </Sider>

      <Layout style={{ marginLeft: collapsed ? 80 : 260, transition: 'all 0.2s', minHeight: '100vh' }}>
        <Header style={{ 
          padding: '0 24px', 
          background: '#fff', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          boxShadow: '0 1px 4px rgba(0,21,41,.08)', 
          zIndex: 1,
          position: 'sticky',
          top: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Title level={4} style={{ margin: 0, color: '#1e293b' }}>
              {tab === 'overview' && 'Dashboard Overview'}
              {tab === 'users' && 'User Management'}
              {tab === 'vehicles' && 'Vehicle Directory'}
              {tab === 'bookings' && 'Booking Records'}
            </Title>
          </div>
          <Space size="large">
            <Button type="text" onClick={() => navigate('/')} icon={<ArrowLeft size={16} />}>Back to Site</Button>
            <Dropdown menu={{
              items: [
                {
                  key: 'logout',
                  label: 'Log Out',
                  icon: <LogOut size={16} />,
                  danger: true,
                  onClick: handleLogout
                }
              ]
            }} placement="bottomRight">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '4px 8px', borderRadius: '8px' }}>
                <Avatar style={{ backgroundColor: '#7c3aed' }}>SA</Avatar>
                <Text strong style={{ color: '#334155' }}>Super Admin</Text>
              </div>
            </Dropdown>
          </Space>
        </Header>

        <Content style={{ margin: '24px 24px', padding: 32, background: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem' }}><Spin size="large" /></div>
          ) : (
            <>
              {tab === 'overview' && (
                <div className="animate-fade-in">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>Platform Performance</h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>Analyze trends by district and time range.</p>
                    </div>
                    <Space>
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
                    </Space>
                  </div>

                  {statsLoading ? (
                    <div style={{ textAlign: 'center', padding: '4rem' }}><Spin tip="Loading stats..." /></div>
                  ) : stats && (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                        <Card size="small" style={{ borderRadius: '12px', background: 'linear-gradient(to right, #f8fafc, #f1f5f9)' }} bordered={false}>
                          <Statistic 
                            title="Total Users" 
                            value={stats.totalUsers} 
                            prefix={<Users size={20} style={{ color: '#3b82f6', marginRight: 8 }} />}
                          />
                        </Card>
                        <Card size="small" style={{ borderRadius: '12px', background: 'linear-gradient(to right, #f8fafc, #f1f5f9)' }} bordered={false}>
                          <Statistic 
                            title={`Vehicles (${district})`} 
                            value={stats.totalVehicles} 
                            prefix={<Car size={20} style={{ color: '#10b981', marginRight: 8 }} />}
                          />
                        </Card>
                        <Card size="small" style={{ borderRadius: '12px', background: 'linear-gradient(to right, #f8fafc, #f1f5f9)' }} bordered={false}>
                          <Statistic 
                            title={`Bookings (${timeRange})`} 
                            value={stats.bookings.total} 
                            prefix={<Calendar size={20} style={{ color: '#f59e0b', marginRight: 8 }} />}
                          />
                        </Card>
                        <Card size="small" style={{ borderRadius: '12px', background: 'linear-gradient(to right, #f8fafc, #f1f5f9)' }} bordered={false}>
                          <Statistic 
                            title="Total Earnings" 
                            value={stats.totalEarnings} 
                            prefix={<span style={{ fontWeight: 'bold', color: '#8b5cf6', marginRight: 8 }}>LKR</span>}
                          />
                        </Card>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                        <Card size="small" bordered={false} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                          <Statistic title="Success Rate" value={stats.successRate} suffix="%" precision={1} valueStyle={{ color: stats.successRate > 80 ? '#16a34a' : '#d97706' }} />
                        </Card>
                        <Card size="small" bordered={false} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                          <Statistic title="Confirmed Bookings" value={stats.bookings.confirmed} />
                        </Card>
                        <Card size="small" bordered={false} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                          <Statistic title="Pending KYC" value={stats.pendingKyc} valueStyle={{ color: '#d97706' }} />
                        </Card>
                        <Card size="small" bordered={false} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                          <Statistic title="Active Vehicles" value={stats.activeVehicles} />
                        </Card>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                        <Card title={<Space><Car size={18} /> Popular Vehicles (by Make)</Space>} bordered={false} style={{ border: '1px solid #f1f5f9', borderRadius: '12px' }}>
                          {Object.entries(stats.popularTypes).length > 0 ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                              {Object.entries(stats.popularTypes).map(([make, count]) => (
                                <Tag key={make} color="blue" style={{ fontSize: '13px', padding: '4px 10px', borderRadius: '20px' }}>
                                  {make}: <strong>{count}</strong>
                                </Tag>
                              ))}
                            </div>
                          ) : <Text type="secondary">No data for this filter.</Text>}
                        </Card>
                        
                        <Card title={<Space><MapPin size={18} /> Booking Distribution</Space>} bordered={false} style={{ border: '1px solid #f1f5f9', borderRadius: '12px' }}>
                          <div style={{ maxHeight: '200px', overflowY: 'auto', paddingRight: '8px' }}>
                            {Object.entries(stats.bookings.byDistrict).length > 0 ? (
                              Object.entries(stats.bookings.byDistrict).sort((a,b) => b[1] - a[1]).map(([dist, count]) => (
                                <div key={dist} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f8fafc' }}>
                                  <Text>{dist}</Text>
                                  <Text strong>{count}</Text>
                                </div>
                              ))
                            ) : <Text type="secondary">No district data available.</Text>}
                          </div>
                        </Card>
                      </div>
                    </>
                  )}

                  <div style={{ marginTop: '3rem', textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
                      <div style={{ background: '#fee2e2', color: '#ef4444', padding: '8px', borderRadius: '8px' }}><History size={20} /></div>
                      <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Recent Admin Actions (Audit Log)</h3>
                    </div>
                    
                    <Table 
                      dataSource={auditLogs} 
                      rowKey="_id"
                      pagination={{ pageSize: 5 }}
                      size="middle"
                      style={{ border: '1px solid #f1f5f9', borderRadius: '8px' }}
                      columns={[
                        { title: 'Date & Time', dataIndex: 'timestamp', render: t => <Text type="secondary" style={{ fontSize: '13px' }}>{new Date(t).toLocaleString()}</Text> },
                        { title: 'Action', dataIndex: 'action', render: a => {
                          const colors: any = { role_change: 'purple', user_delete: 'red', user_promote: 'green' };
                          return <Tag color={colors[a] || 'blue'}>{a.replace('_', ' ').toUpperCase()}</Tag>
                        }},
                        { title: 'Performed By', dataIndex: 'performedBy', render: (p: any) => p ? <div style={{ fontSize: '13px' }}><strong>{p.name}</strong><br/><Text type="secondary" style={{ fontSize: '11px' }}>{p.email}</Text></div> : 'System' },
                        { title: 'Target User', dataIndex: 'targetUser', render: (tu: any) => tu ? <div style={{ fontSize: '13px' }}>{tu.name}<br/><Text type="secondary" style={{ fontSize: '11px' }}>{tu.email}</Text></div> : 'N/A' },
                        { title: 'Details', dataIndex: 'details', render: (d: any) => (
                          <Tooltip title={JSON.stringify(d, null, 2)}>
                            <span style={{ fontSize: '12px', color: '#64748b', cursor: 'help' }}>
                              {d.oldRole ? `Role: ${d.oldRole} → ${d.newRole}` : d.reason || 'View details'}
                            </span>
                          </Tooltip>
                        )}
                      ]}
                    />
                  </div>
                </div>
              )}

              {tab === 'users' && (
                <div className="animate-fade-in">
                  <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <input type="text" placeholder="Search users by name, email, or role..." className="input-field" style={{ borderRadius: '8px', maxWidth: '300px' }} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                  </div>
                  <Table 
                    dataSource={filteredUsers}
                    rowKey={u => (u.id || u._id || Math.random()).toString()}
                    pagination={{ pageSize: 15 }}
                    style={{ border: '1px solid #f1f5f9', borderRadius: '8px' }}
                    columns={[
                      { title: 'User', render: (_, u) => <div><strong>{u.name}</strong><br/><Text type="secondary" style={{ fontSize: '13px' }}>{u.email}</Text></div> },
                      { title: 'Role', render: (_, u) => roleBadge(u) },
                      { title: 'KYC', render: (_, u) => u.isKycVerified ? <Tag icon={<CheckCircle size={12}/>} color="success">Verified</Tag> : <Tag color="warning">{u.verificationStatus || 'Not submitted'}</Tag> },
                      { title: 'Status', render: (_, u) => <Tag color={u.status === 'active' ? 'blue' : 'default'}>{u.status || 'active'}</Tag> },
                      { title: 'Actions', render: (_, u) => {
                        const id = (u.id || u._id)!;
                        if (roleEditUser === id) {
                          return (
                            <Space>
                              <Select size="small" value={newRole} onChange={setNewRole} style={{ width: 110 }}>
                                <Select.Option value="user">User</Select.Option>
                                <Select.Option value="owner">Owner</Select.Option>
                                <Select.Option value="subadmin">Subadmin</Select.Option>
                                <Select.Option value="superadmin">Superadmin</Select.Option>
                              </Select>
                              {newRole === 'owner' && (
                                <Select size="small" value={newOwnerType} onChange={setNewOwnerType} style={{ width: 110 }}>
                                  <Select.Option value="UNVERIFIED">Unverified</Select.Option>
                                  <Select.Option value="VERIFIED">Verified</Select.Option>
                                </Select>
                              )}
                              <Button size="small" type="primary" onClick={() => handleUpdateRole(id)}>Save</Button>
                              <Button size="small" onClick={() => setRoleEditUser(null)}>Cancel</Button>
                            </Space>
                          );
                        }
                        return (
                          <Space>
                            <Button size="small" type="text" onClick={() => { setRoleEditUser(id); setNewRole(u.role); setNewOwnerType(u.ownerType || 'UNVERIFIED'); }} icon={<Edit2 size={14} />} />
                            <Button size="small" type="text" danger onClick={() => handleDeleteUser(id)} icon={<Trash2 size={14} />} />
                          </Space>
                        );
                      }}
                    ]}
                  />
                </div>
              )}

              {tab === 'vehicles' && (
                <div className="animate-fade-in">
                  <Table 
                    dataSource={allVehicles}
                    rowKey="_id"
                    pagination={{ pageSize: 15 }}
                    style={{ border: '1px solid #f1f5f9', borderRadius: '8px' }}
                    columns={[
                      { title: 'Vehicle', render: (_, v) => <div><strong>{v.title}</strong><br/><Text type="secondary" style={{ fontSize: '13px' }}>{v.make} {v.model}</Text></div> },
                      { title: 'Owner', render: (_, v) => {
                        const owner = typeof v.owner === 'object' ? v.owner : null;
                        return owner ? <div><strong>{owner.name}</strong><br/><Text type="secondary" style={{ fontSize: '13px' }}>{owner.email}</Text></div> : 'Unknown';
                      }},
                      { title: 'Price/day', dataIndex: 'pricePerDay', render: p => `LKR ${(p || 0).toLocaleString()}` },
                      { title: 'Status', dataIndex: 'status', render: s => <Tag color={s === 'active' ? 'green' : s === 'pending' ? 'orange' : 'red'}>{s}</Tag> }
                    ]}
                  />
                </div>
              )}

              {tab === 'bookings' && (
                <div className="animate-fade-in">
                  <Table 
                    dataSource={allBookings}
                    rowKey="_id"
                    pagination={{ pageSize: 15 }}
                    style={{ border: '1px solid #f1f5f9', borderRadius: '8px' }}
                    columns={[
                      { title: 'Renter', render: (_, b) => { const r = typeof b.user === 'object' ? b.user : null; return r ? (r as User).name : 'User'; }},
                      { title: 'Vehicle', render: (_, b) => { const v = typeof b.vehicle === 'object' ? b.vehicle : null; return v ? (v as Vehicle).title : 'Vehicle'; }},
                      { title: 'Dates', render: (_, b) => <Text style={{ fontSize: '13px' }}>{b.startDate ? new Date(b.startDate).toLocaleDateString() : 'N/A'} — {b.endDate ? new Date(b.endDate).toLocaleDateString() : 'N/A'}</Text> },
                      { title: 'Amount', dataIndex: 'totalAmount', render: a => `LKR ${(a || 0).toLocaleString()}` },
                      { title: 'Status', dataIndex: 'status', render: s => <Tag color={s === 'CONFIRMED' ? 'green' : s === 'CANCELLED' || s === 'REJECTED' ? 'red' : 'orange'}>{s}</Tag> }
                    ]}
                  />
                </div>
              )}
            </>
          )}
        </Content>
      </Layout>
    </Layout>
  );
}
