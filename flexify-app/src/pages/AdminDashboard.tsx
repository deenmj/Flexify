import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { adminApi, bankDetailsApi, feedbackApi, getImageUrl, type AdminStats, type Vehicle, type User, type Booking, type AuditLog, type BankDetailsData } from '../api';
import { Users, Car, Calendar, DollarSign, CheckCircle, Eye, LogOut, ArrowLeft, Edit2, Trash2, History, TrendingUp, MapPin, Landmark, ShieldAlert, Ban, FileText, MessageSquare, Menu as MenuIcon } from 'lucide-react';
import { Tag, Tooltip, Typography, Select, Card, Statistic, Spin, Layout, Menu, Button, Avatar, Space, Dropdown, Form, Input, message, Modal, Row, Col, Divider, Drawer, Grid } from 'antd';
import Table from '../components/ResponsiveTable';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
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
  const { connected: socketConnected } = useSocket();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(false);
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [tab, setTab] = useState<'overview' | 'users' | 'vehicles' | 'bookings' | 'payments' | 'bank-settings' | 'feedback'>('overview');
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [bankDetails, setBankDetails] = useState<BankDetailsData | null>(null);
  const [bankDetailsLoading, setBankDetailsLoading] = useState(false);
  const [district, setDistrict] = useState<string>('All Sri Lanka');
  const [timeRange, setTimeRange] = useState<string>('30d');

  const [searchQuery, setSearchQuery] = useState('');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [feedbacksLoading, setFeedbacksLoading] = useState(false);

  // Modals
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [kycUser, setKycUser] = useState<User | null>(null);
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [editForm] = Form.useForm();
  const [roleForm] = Form.useForm();

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
      adminApi.getPendingPayments().catch(() => []),
    ]).then(([s, u, v, b, logs, p]) => {
      if (s) setStats(s);
      setAllUsers(u);
      setAllVehicles(v);
      setAllBookings(b);
      if (logs?.logs) setAuditLogs(logs.logs);
      setPendingPayments(p);
    }).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (loading) return;
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [district, timeRange, fetchStats]);

  useEffect(() => {
    if (tab === 'bank-settings' && !bankDetails) {
      setBankDetailsLoading(true);
      bankDetailsApi.get()
        .then(setBankDetails)
        .catch(err => {
          console.error('Failed to load bank details', err);
          message.error('Could not load bank details');
        })
        .finally(() => setBankDetailsLoading(false));
    }
  }, [tab, bankDetails]);

  useEffect(() => {
    if (tab === 'feedback') {
      setFeedbacksLoading(true);
      feedbackApi.getAll()
        .then(setFeedbacks)
        .catch(() => message.error('Failed to load feedback'))
        .finally(() => setFeedbacksLoading(false));
    }
  }, [tab]);

  const handleBankDetailsUpdate = async (values: Partial<BankDetailsData>) => {
    try {
      setBankDetailsLoading(true);
      const updated = await bankDetailsApi.update(values);
      setBankDetails(updated);
      message.success('Bank details updated successfully!');
    } catch (err: any) {
      message.error(err.message || 'Failed to update bank details');
    } finally {
      setBankDetailsLoading(false);
    }
  };

  const handleEditUser = async (values: any) => {
    if (!editingUser) return;
    setActionLoadingId(editingUser._id || editingUser.id!);
    try {
      const result = await adminApi.updateUser(editingUser._id || editingUser.id!, values);
      setAllUsers((prev) => prev.map((u) => (u.id || u._id) === result.user.id || (u.id || u._id) === result.user._id ? { ...u, ...result.user } : u));
      message.success('User updated successfully');
      setIsEditModalOpen(false);
    } catch (err: any) {
      message.error(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUpdateRole = async (values: any) => {
    if (!editingUser) return;
    const userId = editingUser._id || editingUser.id!;
    setActionLoadingId(userId);
    try {
      const result = await adminApi.updateUserRole(userId, values.role, values.ownerType);
      setAllUsers((prev: User[]) => prev.map((u: User) => (u.id || u._id) === userId ? { ...u, ...result.user } : u));
      message.success('Role updated successfully');
      setIsRoleModalOpen(false);
    } catch (err: any) {
      message.error(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleStatus = async (user: User) => {
    const id = (user.id || user._id)!;
    const newStatus = user.status === 'blocked' ? 'active' : 'blocked';
    
    Modal.confirm({
      title: `${newStatus === 'blocked' ? 'Ban' : 'Restore'} User`,
      content: `Are you sure you want to ${newStatus === 'blocked' ? 'ban' : 'restore'} ${user.name}?`,
      okText: 'Yes',
      okType: newStatus === 'blocked' ? 'danger' : 'primary',
      onOk: async () => {
        try {
          setActionLoadingId(id);
          const result = await adminApi.updateUserStatus(id, newStatus);
          setAllUsers(prev => prev.map(u => (u.id || u._id) === id ? { ...u, status: result.user.status } : u));
          message.success(`User ${newStatus === 'blocked' ? 'banned' : 'restored'}`);
        } catch (err: any) {
          message.error(err.message);
        } finally {
          setActionLoadingId(null);
        }
      }
    });
  };

  const handleDeleteUser = async (user: User) => {
    const id = (user.id || user._id)!;
    Modal.confirm({
      title: 'Delete User Permanently',
      content: `Are you sure you want to delete ${user.name}? This action cannot be undone.`,
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          setActionLoadingId(id);
          await adminApi.deleteUser(id);
          setAllUsers((prev: User[]) => prev.filter((u: User) => (u.id || u._id) !== id));
          message.success('User deleted permanently');
        } catch (err: any) {
          message.error(err.message);
        } finally {
          setActionLoadingId(null);
        }
      }
    });
  };

  const handleViewKyc = async (user: User) => {
    const id = (user.id || user._id)!;
    try {
      setActionLoadingId(id);
      const data = await adminApi.getUserKyc(id);
      setKycUser(data);
      setIsKycModalOpen(true);
    } catch (err: any) {
      message.error(err.message || 'Failed to fetch KYC data');
    } finally {
      setActionLoadingId(null);
    }
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

  const handleVerifyPayment = async (paymentId: string, status: 'approved' | 'rejected') => {
    let reason = '';
    if (status === 'rejected') {
      reason = window.prompt('Enter rejection reason:') || 'Payment details incorrect';
    }

    try {
      const res = await adminApi.verifyPayment(paymentId, status, reason);
      setPendingPayments(prev => prev.filter(p => p._id !== paymentId));
      alert(res.message);
      // Refresh users since subscription might have updated
      const u = await adminApi.getAllUsers();
      setAllUsers(u);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {!isMobile ? (
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
              { key: 'payments', icon: <DollarSign size={18} />, label: `Payments (${pendingPayments.length})` },
              { key: 'bank-settings', icon: <Landmark size={18} />, label: `Bank Settings` },
              { key: 'feedback', icon: <MessageSquare size={18} />, label: `Feedback` },
            ]}
          />
        </Sider>
      ) : (
        <Drawer
          placement="left"
          onClose={() => setMobileMenuOpen(false)}
          open={mobileMenuOpen}
          styles={{ body: { padding: 0 } }}
          width={260}
          closable={false}
          bodyStyle={{ background: '#001529' }}
        >
          <div style={{ padding: '24px 16px', color: 'white', textAlign: 'center', fontSize: '1.25rem', fontWeight: 800, borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '16px' }}>
            Flexify Admin
          </div>
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[tab]}
            onClick={({ key }) => {
              setTab(key as any);
              setMobileMenuOpen(false);
            }}
            items={[
              { key: 'overview', icon: <Eye size={18} />, label: 'Overview' },
              { key: 'users', icon: <Users size={18} />, label: 'Users' },
              { key: 'vehicles', icon: <Car size={18} />, label: 'Vehicles' },
              { key: 'bookings', icon: <Calendar size={18} />, label: 'Bookings' },
              { key: 'payments', icon: <DollarSign size={18} />, label: 'Payments' },
              { key: 'bank-settings', icon: <Landmark size={18} />, label: 'Settings' },
              { key: 'feedback', icon: <MessageSquare size={18} />, label: 'Feedback' },
            ]}
          />
        </Drawer>
      )}

      <Layout style={{ marginLeft: isMobile ? 0 : (collapsed ? 80 : 260), transition: 'all 0.2s', minHeight: '100vh' }}>
        <Header style={{
          padding: isMobile ? '0 16px' : '0 24px',
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
            {isMobile && (
              <Button 
                type="text" 
                icon={<MenuIcon size={20} />} 
                onClick={() => setMobileMenuOpen(true)} 
              />
            )}
            <Title level={isMobile ? 5 : 4} style={{ margin: 0, color: '#1e293b' }}>
              {tab === 'overview' && 'Dashboard Overview'}
              {tab === 'users' && 'User Management'}
              {tab === 'vehicles' && 'Vehicle Directory'}
              {tab === 'payments' && 'Subscription Payments'}
              {tab === 'bank-settings' && 'Bank Settings Configuration'}
              {tab === 'feedback' && 'User Feedback & Bug Reports'}
            </Title>
          </div>
          <Space size={isMobile ? "small" : "large"}>
            {!isMobile && (
              <Button type="text" onClick={() => navigate('/')} icon={<ArrowLeft size={16} />}>Back to Site</Button>
            )}
            <Dropdown menu={{
              items: [
                {
                  key: 'socket-status',
                  label: `Backend: ${socketConnected ? 'Live' : 'Offline'}`,
                  disabled: true,
                  icon: <div style={{ width: 8, height: 8, borderRadius: '50%', background: socketConnected ? '#10b981' : '#ef4444' }}></div>
                },
                { type: 'divider' },
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
                {!isMobile && <Text strong style={{ color: '#334155' }}>Super Admin</Text>}
              </div>
            </Dropdown>
          </Space>
        </Header>

        <Content style={{ 
          margin: isMobile ? '12px 12px' : '24px 24px', 
          padding: isMobile ? 12 : 32, 
          background: '#fff', 
          borderRadius: '12px', 
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
          overflowX: 'auto'
        }}>
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
                              Object.entries(stats.bookings.byDistrict).sort((a, b) => b[1] - a[1]).map(([dist, count]) => (
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
                    scroll={{ x: true }}
                      dataSource={auditLogs}
                      rowKey="_id"
                      pagination={{ pageSize: 5 }}
                      size="middle"
                      style={{ border: '1px solid #f1f5f9', borderRadius: '8px' }}
                      columns={[
                        { title: 'Date & Time', dataIndex: 'timestamp', render: t => <Text type="secondary" style={{ fontSize: '13px' }}>{new Date(t).toLocaleString()}</Text> },
                        {
                          title: 'Action', dataIndex: 'action', render: a => {
                            const colors: any = { role_change: 'purple', user_delete: 'red', user_promote: 'green' };
                            return <Tag color={colors[a] || 'blue'}>{a.replace('_', ' ').toUpperCase()}</Tag>
                          }
                        },
                        { title: 'Performed By', dataIndex: 'performedBy', render: (p: any) => p ? <div style={{ fontSize: '13px' }}><strong>{p.name}</strong><br /><Text type="secondary" style={{ fontSize: '11px' }}>{p.email}</Text></div> : 'System' },
                        { title: 'Target User', dataIndex: 'targetUser', render: (tu: any) => tu ? <div style={{ fontSize: '13px' }}>{tu.name}<br /><Text type="secondary" style={{ fontSize: '11px' }}>{tu.email}</Text></div> : 'N/A' },
                        {
                          title: 'Details', dataIndex: 'details', render: (d: any) => (
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
              )}

              {tab === 'users' && (
                <div className="animate-fade-in">
                  <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <input type="text" placeholder="Search users by name, email, or role..." className="input-field" style={{ borderRadius: '8px', maxWidth: '300px' }} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                  </div>
                  <Table
                    scroll={{ x: true }}
                    dataSource={filteredUsers}
                    rowKey={u => (u.id || u._id || Math.random()).toString()}
                    pagination={{ pageSize: 15 }}
                    style={{ border: '1px solid #f1f5f9', borderRadius: '8px' }}
                    columns={[
                      { title: 'User', render: (_, u) => <Space><Avatar size="small" src={getImageUrl(u.profilePic)} style={{ backgroundColor: '#7c3aed' }}>{u.name.charAt(0)}</Avatar><div><strong>{u.name}</strong><br /><Text type="secondary" style={{ fontSize: '13px' }}>{u.email}</Text></div></Space> },
                      { title: 'Role', render: (_, u) => roleBadge(u) },
                      { title: 'KYC', render: (_, u) => u.isKycVerified ? <Tag icon={<CheckCircle size={12} />} color="success">Verified</Tag> : <Tag color={u.verificationStatus === 'pending' ? 'processing' : 'warning'}>{u.verificationStatus || 'Not submitted'}</Tag> },
                      { 
                        title: 'Status', 
                        render: (_, u) => (
                          <Tag 
                            color={u.status === 'active' ? 'blue' : u.status === 'blocked' ? 'red' : 'default'}
                            icon={u.status === 'blocked' ? <Ban size={12} /> : null}
                          >
                            {(u.status || 'active').toUpperCase()}
                          </Tag>
                        ) 
                      },
                      {
                        title: 'Actions', 
                        render: (_, u) => {
                          const id = (u.id || u._id)!;
                          const isSuper = user.role === 'superadmin';
                          return (
                            <Space>
                              {isSuper ? (
                                <>
                                  <Tooltip title="Edit Profile">
                                    <Button size="small" type="text" onClick={() => { setEditingUser(u); editForm.setFieldsValue(u); setIsEditModalOpen(true); }} icon={<Edit2 size={14} />} />
                                  </Tooltip>
                                  <Tooltip title="Change Role">
                                    <Button size="small" type="text" onClick={() => { setEditingUser(u); roleForm.setFieldsValue({ role: u.role, ownerType: u.ownerType || 'UNVERIFIED' }); setIsRoleModalOpen(true); }} icon={<ShieldAlert size={14} />} />
                                  </Tooltip>
                                  <Tooltip title={u.status === 'blocked' ? "Restore User" : "Ban User"}>
                                    <Button size="small" type="text" danger={u.status !== 'blocked'} onClick={() => handleToggleStatus(u)} icon={<Ban size={14} />} />
                                  </Tooltip>
                                  <Tooltip title="View KYC Documents">
                                    <Button size="small" type="text" onClick={() => handleViewKyc(u)} loading={actionLoadingId === id} icon={<FileText size={14} />} />
                                  </Tooltip>
                                  <Tooltip title="Delete Permanently">
                                    <Button size="small" type="text" danger onClick={() => handleDeleteUser(u)} icon={<Trash2 size={14} />} />
                                  </Tooltip>
                                </>
                              ) : (
                                <Text type="secondary" style={{ fontSize: '12px' }}>Read Only</Text>
                              )}
                            </Space>
                          );
                        }
                      }
                    ]}
                  />
                </div>
              )}

              {tab === 'vehicles' && (
                <div className="animate-fade-in">
                  <Table
                    scroll={{ x: true }}
                    dataSource={allVehicles}
                    rowKey="_id"
                    pagination={{ pageSize: 15 }}
                    style={{ border: '1px solid #f1f5f9', borderRadius: '8px' }}
                    columns={[
                      { title: 'Vehicle', render: (_, v) => <div><strong>{v.title}</strong><br /><Text type="secondary" style={{ fontSize: '13px' }}>{v.make} {v.model}</Text></div> },
                      {
                        title: 'Owner', render: (_, v) => {
                          const owner = typeof v.owner === 'object' ? v.owner : null;
                          return owner ? <div><strong>{owner.name}</strong><br /><Text type="secondary" style={{ fontSize: '13px' }}>{owner.email}</Text></div> : 'Unknown';
                        }
                      },
                      { title: 'Price/day', dataIndex: 'pricePerDay', render: p => `LKR ${(p || 0).toLocaleString()}` },
                      { title: 'Status', dataIndex: 'status', render: s => <Tag color={s === 'active' ? 'green' : s === 'pending' ? 'orange' : 'red'}>{s}</Tag> }
                    ]}
                  />
                </div>
              )}

              {tab === 'bookings' && (
                <div className="animate-fade-in">
                  <Table
                    scroll={{ x: true }}
                    dataSource={allBookings}
                    rowKey="_id"
                    pagination={{ pageSize: 15 }}
                    style={{ border: '1px solid #f1f5f9', borderRadius: '8px' }}
                    columns={[
                      { title: 'Renter', render: (_, b) => { const r = typeof b.user === 'object' ? b.user : null; return r ? (r as User).name : 'User'; } },
                      { title: 'Vehicle', render: (_, b) => { const v = typeof b.vehicle === 'object' ? b.vehicle : null; return v ? (v as Vehicle).title : 'Vehicle'; } },
                      { title: 'Dates', render: (_, b) => <Text style={{ fontSize: '13px' }}>{b.startDate ? new Date(b.startDate).toLocaleDateString() : 'N/A'} — {b.endDate ? new Date(b.endDate).toLocaleDateString() : 'N/A'}</Text> },
                      { title: 'Amount', dataIndex: 'totalAmount', render: a => `LKR ${(a || 0).toLocaleString()}` },
                      { title: 'Status', dataIndex: 'status', render: s => <Tag color={s === 'CONFIRMED' ? 'green' : s === 'CANCELLED' || s === 'REJECTED' ? 'red' : 'orange'}>{s}</Tag> }
                    ]}
                  />
                </div>
              )}

              {tab === 'payments' && (
                <div className="animate-fade-in">
                  <Table
                    scroll={{ x: true }}
                    dataSource={pendingPayments}
                    rowKey="_id"
                    pagination={{ pageSize: 15 }}
                    style={{ border: '1px solid #f1f5f9', borderRadius: '8px' }}
                    columns={[
                      { title: 'Owner', render: (_, p: any) => <div><strong>{p.user?.name}</strong><br /><Text type="secondary" style={{ fontSize: '13px' }}>{p.user?.email}</Text></div> },
                      { title: 'Tier', dataIndex: 'tier', render: (t: string) => <Tag color="blue">{t}</Tag> },
                      { title: 'Duration', dataIndex: 'duration' },
                      { title: 'Amount', dataIndex: 'amount', render: (a: number) => `LKR ${a?.toLocaleString()}` },
                      { title: 'Reference', dataIndex: 'reference' },
                      { 
                        title: 'Receipt', 
                        render: (_, p: any) => p.receiptImage ? (
                          <Button 
                            size="small" 
                            icon={<FileText size={14} />} 
                            onClick={() => window.open(`${import.meta.env.VITE_API_URL || 'https://flexify-production.up.railway.app'}${p.receiptImage}`, '_blank')}
                          >
                            View
                          </Button>
                        ) : <Text type="secondary">N/A</Text>
                      },
                      { title: 'Date', dataIndex: 'createdAt', render: (d: string) => new Date(d).toLocaleString() },
                      {
                        title: 'Actions', render: (_, p: any) => (
                          <Space>
                            <Button size="small" type="primary" onClick={() => handleVerifyPayment(p._id, 'approved')}>Approve</Button>
                            <Button size="small" danger onClick={() => handleVerifyPayment(p._id, 'rejected')}>Reject</Button>
                          </Space>
                        )
                      }
                    ]}
                  />
                </div>
              )}


              {tab === 'bank-settings' && (
                <div className="animate-fade-in" style={{ maxWidth: '600px' }}>
                  <Card title="Bank Details Configuration" bordered={false} style={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    {bankDetailsLoading && !bankDetails ? (
                      <div style={{ textAlign: 'center', padding: '2rem' }}><Spin size="large" /></div>
                    ) : (
                      <Form
                        layout="vertical"
                        initialValues={bankDetails || {}}
                        onFinish={handleBankDetailsUpdate}
                      >
                        <Form.Item name="bankName" label="Bank Name" rules={[{ required: true }]}>
                          <Input size="large" placeholder="Commercial Bank" />
                        </Form.Item>
                        <Form.Item name="accountName" label="Account Name" rules={[{ required: true }]}>
                          <Input size="large" placeholder="Flexify Pvt Ltd" />
                        </Form.Item>
                        <Form.Item name="accountNumber" label="Account Number" rules={[{ required: true }]}>
                          <Input size="large" placeholder="8010045622" />
                        </Form.Item>
                        <Form.Item name="referenceEmail" label="Reference Email (for clarifications)" rules={[{ required: true, type: 'email' }]}>
                          <Input size="large" placeholder="luxury@flexify.com" />
                        </Form.Item>
                        <Form.Item name="notes" label="Additional Notes (e.g., branch name, message to users)">
                          <Input.TextArea rows={3} placeholder="Any specific instructions for manual transfers..." />
                        </Form.Item>
                        <Button type="primary" htmlType="submit" size="large" loading={bankDetailsLoading} block>
                          Save Changes
                        </Button>
                      </Form>
                    )}
                  </Card>
                </div>
              )}

              {tab === 'feedback' && (
                <div className="animate-fade-in">
                  <Table
                    scroll={{ x: true }}
                    dataSource={feedbacks}
                    loading={feedbacksLoading}
                    rowKey="_id"
                    pagination={{ pageSize: 15 }}
                    style={{ border: '1px solid #f1f5f9', borderRadius: '8px' }}
                    columns={[
                      { 
                        title: 'Type', 
                        dataIndex: 'type', 
                        render: t => (
                          <Tag color={t === 'bug' ? 'red' : t === 'suggestion' ? 'blue' : 'default'}>
                            {t?.toUpperCase()}
                          </Tag>
                        ) 
                      },
                      { 
                        title: 'Message', 
                        dataIndex: 'message', 
                        width: '40%',
                        render: m => <Text style={{ fontSize: '13px' }}>{m}</Text> 
                      },
                      { 
                        title: 'User / Contact', 
                        render: (_, record) => (
                          <div style={{ fontSize: '13px' }}>
                            {record.user ? record.user.name : record.contactEmail || 'Guest'}
                            <br />
                            <Text type="secondary" style={{ fontSize: '11px' }}>
                              {record.user ? record.user.email : 'No email provided'}
                            </Text>
                          </div>
                        )
                      },
                      { 
                        title: 'Device Info', 
                        dataIndex: 'deviceInfo', 
                        render: d => d ? (
                          <Tooltip title={JSON.stringify(d, null, 2)}>
                            <Text type="secondary" style={{ fontSize: '11px', cursor: 'help' }}>
                              {d.screenSize} | {d.userAgent.substring(0, 20)}...
                            </Text>
                          </Tooltip>
                        ) : 'N/A'
                      },
                      { 
                        title: 'Date', 
                        dataIndex: 'createdAt', 
                        render: d => new Date(d).toLocaleString() 
                      }
                    ]}
                  />
                </div>
              )}
            </>
          )}
        </Content>
      </Layout>
      {/* MODALS */}
      
      {/* Edit User Modal */}
      <Modal
        title="Edit User Profile"
        open={isEditModalOpen}
        onCancel={() => setIsEditModalOpen(false)}
        onOk={() => editForm.submit()}
        confirmLoading={!!actionLoadingId}
      >
        <Form form={editForm} layout="vertical" onFinish={handleEditUser}>
          <Form.Item name="name" label="Full Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email Address" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Phone Number">
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      {/* Role Change Modal */}
      <Modal
        title="Change User Role & Permissions"
        open={isRoleModalOpen}
        onCancel={() => setIsRoleModalOpen(false)}
        onOk={() => roleForm.submit()}
        confirmLoading={!!actionLoadingId}
      >
        <Form form={roleForm} layout="vertical" onFinish={handleUpdateRole}>
          <Form.Item name="role" label="Account Role" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="user">USER</Select.Option>
              <Select.Option value="owner">OWNER</Select.Option>
              <Select.Option value="subadmin">SUB-ADMIN</Select.Option>
              <Select.Option value="superadmin">SUPER-ADMIN</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.role !== currentValues.role}
          >
            {({ getFieldValue }) =>
              getFieldValue('role') === 'owner' ? (
                <Form.Item name="ownerType" label="Verification Type" rules={[{ required: true }]}>
                  <Select>
                    <Select.Option value="UNVERIFIED">Unverified Only</Select.Option>
                    <Select.Option value="VERIFIED">Verified Owner</Select.Option>
                  </Select>
                </Form.Item>
              ) : null
            }
          </Form.Item>
        </Form>
      </Modal>

      {/* View KYC Modal */}
      <Modal
        title={kycUser ? `KYC Documents: ${kycUser.name || 'User'}` : "KYC Verification Documents"}
        open={isKycModalOpen}
        onCancel={() => setIsKycModalOpen(false)}
        width={900}
        footer={[
          <Button key="close" onClick={() => setIsKycModalOpen(false)}>Close</Button>
        ]}
      >
        {kycUser ? (
          <div style={{ padding: '1rem' }}>
            <Row gutter={[16, 24]}>
              <Col span={12}>
                <Card size="small" title="NIC Front">
                  {kycUser.documents?.nicFront ? <Image src={getImageUrl(kycUser.documents.nicFront)} style={{ width: '100%', height: '200px', objectFit: 'contain' }} /> : <Spin tip="No document" />}
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" title="NIC Back">
                  {kycUser.documents?.nicBack ? <Image src={getImageUrl(kycUser.documents.nicBack)} style={{ width: '100%', height: '200px', objectFit: 'contain' }} /> : <Spin tip="No document" />}
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" title="Driving License">
                  {kycUser.documents?.license ? <Image src={getImageUrl(kycUser.documents.license)} style={{ width: '100%', height: '200px', objectFit: 'contain' }} /> : <Spin tip="No document" />}
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" title="Live Selfie">
                  {kycUser.documents?.selfie ? <Image src={getImageUrl(kycUser.documents.selfie)} style={{ width: '100%', height: '200px', objectFit: 'contain' }} /> : <Spin tip="No document" />}
                </Card>
              </Col>
            </Row>
            <Divider />
            <div>
              <Text strong>Verification Status: </Text>
              <Tag color={kycUser.isKycVerified ? 'success' : 'warning'}>{kycUser.verificationStatus?.toUpperCase()}</Tag>
            </div>
            <div style={{ marginTop: '0.5rem' }}>
              <Text strong>Residential Address: </Text>
              <Text>{kycUser.documents?.address || 'Not provided'}</Text>
            </div>
          </div>
        ) : <Spin />}
      </Modal>

    </Layout>
  );
}
