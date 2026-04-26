import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { notification, Modal, Form, Select, Input, message, Rate, Layout, Menu, Button, Avatar, Space, Typography, Card, Statistic, Tag, Dropdown, Spin, Switch, Drawer, Grid, Image } from 'antd';
import Table from '../components/ResponsiveTable';
import { useNavigate } from 'react-router-dom';
import {
  Car, Shield, CheckCircle, XCircle, Search,
  AlertTriangle, FileText, Clock, MessageSquare,
  LogOut, ArrowLeft, Mail, Settings, Menu as MenuIcon,
  Eye, EyeOff
} from 'lucide-react';
import { subadminApi, adminApi, userApi, feedbackApi, getImageUrl, type User, type Vehicle, type SubadminStats, type Review, type VehicleMake, type VehicleModel } from '../api';
import { DollarSign } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import './Dashboard.css';

const { Header, Sider, Content } = Layout;
const { Text, Title } = Typography;

export default function SubAdminDashboard() {
  const { user, logout, refreshUser } = useAuth();
  const { socket, connected: socketConnected } = useSocket();
  const navigate = useNavigate();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [stats, setStats] = useState<SubadminStats | null>(null);
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [pendingVehicles, setPendingVehicles] = useState<Vehicle[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [pendingMakes, setPendingMakes] = useState<VehicleMake[]>([]);
  const [pendingModels, setPendingModels] = useState<VehicleModel[]>([]);
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'users' | 'vehicles' | 'reviews' | 'moderation' | 'payments' | 'settings' | 'feedback'>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [reviewSearchQuery, setReviewSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [feedbacksLoading, setFeedbacksLoading] = useState(false);
  const [checkedItems, setCheckedItems] = useState<boolean[]>([false, false, false, false]);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const [rejectionModal, setRejectionModal] = useState<{
    visible: boolean;
    type: 'KYC' | 'Vehicle' | 'Review';
    id: string;
    targetName: string;
  }>({ visible: false, type: 'KYC', id: '', targetName: '' });
  const [form] = Form.useForm();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setCheckedItems([false, false, false, false]);
  }, [selectedUser]);

  useEffect(() => {
    if (socket) {
      socket.on('pendingUpdate', (data: any) => {

        fetchData(); // Refresh all data when something changes
        notification.info({
          message: 'Real-time Update',
          description: `New ${data.type} update detected. Dashboard refreshed.`,
          placement: 'bottomRight',
          duration: 3
        });
      });

      return () => {
        socket.off('pendingUpdate');
      };
    }
  }, [socket]);

  useEffect(() => {
    if (stats && (stats.pendingUsers > 0 || stats.pendingVehicles > 0)) {
      notification.info({
        message: 'Items Need Review',
        description: `You have ${stats.pendingUsers} KYC submissions and ${stats.pendingVehicles} vehicles to review.`,
        placement: 'topRight',
        duration: 5,
      });
    }
  }, [stats]);

  useEffect(() => {
    if (tab === 'feedback') {
      setFeedbacksLoading(true);
      feedbackApi.getAll()
        .then(setFeedbacks)
        .catch(() => message.error('Failed to load feedback'))
        .finally(() => setFeedbacksLoading(false));
    }
  }, [tab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [s, u, v, r, m, mo, p] = await Promise.all([
        subadminApi.getStats().catch(() => null),
        subadminApi.getPendingUsers().catch(() => []),
        subadminApi.getPendingVehicles().catch(() => []),
        subadminApi.getAllReviews().catch(() => []),
        subadminApi.getPendingMakes().catch(() => []),
        subadminApi.getPendingModels().catch(() => []),
        adminApi.getPendingPayments().catch(() => []),
      ]);
      if (s) setStats(s);
      setPendingUsers(u);
      setPendingVehicles(v);
      setReviews(r);
      setPendingMakes(m);
      setPendingModels(mo);
      setPendingPayments(p || []);
    } catch (err: any) {
      message.error(err.message || 'Error fetching data');
    } finally {
      setLoading(false);
    }
  };

  const handleCheck = (idx: number) => {
    const updated = [...checkedItems];
    updated[idx] = !updated[idx];
    setCheckedItems(updated);
  };

  const allChecked = checkedItems.every(Boolean);

  const handleApproveUser = async (userId: string) => {
    if (!allChecked) return;
    setActionLoading(userId);
    try {
      await subadminApi.approveUser(userId);
      setPendingUsers(prev => prev.filter(u => (u.id || u._id) !== userId));
      setShowModal(false);
      message.success('User approved successfully');
    } catch (err: any) {
      message.error(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectUser = (userId: string) => {
    const user = pendingUsers.find(u => (u.id || u._id) === userId);
    setRejectionModal({
      visible: true,
      type: 'KYC',
      id: userId,
      targetName: user?.name || 'User'
    });
  };

  const submitRejection = async (values: { reason: string; comment?: string }) => {
    const { type, id } = rejectionModal;
    setActionLoading(id);
    try {
      if (type === 'KYC') {
        await subadminApi.rejectUser(id, values.reason, values.comment);
        setPendingUsers(prev => prev.filter(u => (u.id || u._id) !== id));
        setShowModal(false);
      } else if (type === 'Vehicle') {
        await subadminApi.rejectVehicle(id, values.reason, values.comment);
        setPendingVehicles(prev => prev.filter(v => v._id !== id));
      } else if (type === 'Review') {
        await subadminApi.updateReviewStatus(id, 'rejected', values.reason, values.comment);
        setReviews(prev => prev.map(r => r._id === id ? { ...r, status: 'rejected' as any } : r));
      }
      message.success(`${type} rejected successfully`);
      setRejectionModal(prev => ({ ...prev, visible: false }));
      form.resetFields();
    } catch (err: any) {
      message.error(err.message || "Failed to reject");
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveVehicle = async (vehicleId: string) => {
    setActionLoading(vehicleId);
    try {
      await subadminApi.approveVehicle(vehicleId);
      setPendingVehicles(prev => prev.filter(v => v._id !== vehicleId));
      message.success('Vehicle approved');
    } catch (err: any) {
      message.error(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectVehicle = (vehicleId: string) => {
    const vehicle = pendingVehicles.find(v => v._id === vehicleId);
    setRejectionModal({
      visible: true,
      type: 'Vehicle',
      id: vehicleId,
      targetName: vehicle?.title || 'Vehicle'
    });
  };

  const handleToggleReviewStatus = async (reviewId: string, currentStatus: string) => {
    if (currentStatus === 'visible') {
      const review = reviews.find(r => r._id === reviewId);
      setRejectionModal({
        visible: true,
        type: 'Review',
        id: reviewId,
        targetName: `Review by ${review?.reviewer.name}`
      });
      return;
    }

    const newStatus = 'visible';
    setActionLoading(reviewId);
    try {
      await subadminApi.updateReviewStatus(reviewId, newStatus);
      setReviews(prev => prev.map(r => r._id === reviewId ? { ...r, status: newStatus as any } : r));
      message.success('Review is now visible');
    } catch (err: any) {
      message.error(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveMake = async (id: string) => {
    setActionLoading(id);
    try {
      await subadminApi.approveMake(id);
      setPendingMakes(prev => prev.filter(m => m._id !== id));
      message.success('Vehicle make approved');
    } catch (err: any) {
      message.error(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveModel = async (id: string) => {
    setActionLoading(id);
    try {
      await subadminApi.approveModel(id);
      setPendingModels(prev => prev.filter(mod => mod._id !== id));
      message.success('Vehicle model approved');
    } catch (err: any) {
      message.error(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteMake = async (id: string) => {
    if (!window.confirm("Delete this make suggestion?")) return;
    setActionLoading(id);
    try {
      await subadminApi.deleteMake(id);
      setPendingMakes(prev => prev.filter(m => m._id !== id));
      message.success('Suggestion deleted');
    } catch (err: any) {
      message.error(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteModel = async (id: string) => {
    if (!window.confirm("Delete this model suggestion?")) return;
    setActionLoading(id);
    try {
      await subadminApi.deleteModel(id);
      setPendingModels(prev => prev.filter(mod => mod._id !== id));
      message.success('Suggestion deleted');
    } catch (err: any) {
      message.error(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleVerifyPayment = async (paymentId: string, status: 'approved' | 'rejected') => {
    let reason = '';
    if (status === 'rejected') {
      reason = window.prompt('Enter rejection reason:') || 'Payment details incorrect';
    }

    setActionLoading(paymentId);
    try {
      const res = await adminApi.verifyPayment(paymentId, status, reason);
      setPendingPayments(prev => prev.filter(p => p._id !== paymentId));
      message.success(res.message);
    } catch (err: any) {
      message.error(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateSettings = async (values: any) => {
    setActionLoading('settings');
    try {
      await userApi.updateNotificationSettings(values);
      await refreshUser();
      message.success('Work notification settings updated');
    } catch (err: any) {
      message.error(err.message || 'Failed to update settings');
    } finally {
      setActionLoading(null);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleDeleteFeedback = async (id: string) => {
    if (!window.confirm("Delete this feedback?")) return;
    setActionLoading(id);
    try {
      await feedbackApi.delete(id);
      setFeedbacks(prev => prev.filter(f => f._id !== id));
      message.success('Feedback deleted');
    } catch (err: any) {
      message.error(err.message || 'Failed to delete');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredUsers = pendingUsers.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredReviews = reviews.filter(r => 
    r.reviewer.name.toLowerCase().includes(reviewSearchQuery.toLowerCase()) ||
    r.reviewer.email.toLowerCase().includes(reviewSearchQuery.toLowerCase()) ||
    r.vehicle?.title?.toLowerCase().includes(reviewSearchQuery.toLowerCase()) ||
    r.comment.toLowerCase().includes(reviewSearchQuery.toLowerCase())
  );

  if (!user || (user.role !== 'subadmin' && user.role !== 'superadmin')) {
    return (
      <div className="container" style={{ padding: '6rem 2rem', textAlign: 'center' }}>
        <Shield size={48} color="#ef4444" style={{ marginBottom: '1rem' }} />
        <h2>Sub-Admin Access Required</h2>
        <p>You do not have permission to access this page.</p>
        <Button onClick={() => navigate('/')}>Back to Home</Button>
      </div>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {!isMobile ? (
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={(value) => setCollapsed(value)}
          theme="dark"
          width={280}
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
            {collapsed ? 'RN' : 'Rentify Staff'}
          </div>
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[tab]}
            onClick={({ key }) => setTab(key as any)}
            items={[
              { key: 'users', icon: <Shield size={18} />, label: `KYC Reviews (${pendingUsers.length})` },
              { key: 'vehicles', icon: <Car size={18} />, label: `Vehicle Approvals (${pendingVehicles.length})` },
              { key: 'reviews', icon: <MessageSquare size={18} />, label: `Reviews (${reviews.length})` },
              { key: 'moderation', icon: <Clock size={18} />, label: `Suggestions (${pendingMakes.length + pendingModels.length})` },
              { key: 'payments', icon: <DollarSign size={18} />, label: `Payments (${pendingPayments.length})` },
              { key: 'settings', icon: <Settings size={18} />, label: 'My Settings' },
              { key: 'feedback', icon: <MessageSquare size={18} />, label: `User Feedback` },
            ]}
          />
        </Sider>
      ) : (
        <Drawer
          placement="left"
          onClose={() => setMobileMenuOpen(false)}
          open={mobileMenuOpen}
          styles={{ body: { padding: 0 } }}
          width={280}
          closable={false}
          bodyStyle={{ background: '#001529' }}
        >
          <div style={{ padding: '24px 16px', color: 'white', textAlign: 'center', fontSize: '1.25rem', fontWeight: 800, borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '16px' }}>
            Rentify Staff
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
              { key: 'users', icon: <Shield size={18} />, label: `KYC (${pendingUsers.length})` },
              { key: 'vehicles', icon: <Car size={18} />, label: `Vehicles (${pendingVehicles.length})` },
              { key: 'reviews', icon: <MessageSquare size={18} />, label: `Reviews (${reviews.length})` },
              { key: 'moderation', icon: <Clock size={18} />, label: `Suggestions` },
              { key: 'payments', icon: <DollarSign size={18} />, label: `Payments` },
              { key: 'settings', icon: <Settings size={18} />, label: 'Settings' },
              { key: 'feedback', icon: <MessageSquare size={18} />, label: `Feedback` },
            ]}
          />
        </Drawer>
      )}

      <Layout style={{ marginLeft: isMobile ? 0 : (collapsed ? 80 : 280), transition: 'all 0.2s', minHeight: '100vh' }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isMobile && (
              <Button 
                type="text" 
                icon={<MenuIcon size={20} />} 
                onClick={() => setMobileMenuOpen(true)} 
              />
            )}
            <Title level={isMobile ? 5 : 4} style={{ margin: 0, color: '#1e293b' }}>
              {tab === 'users' && 'KYC Document Reviews'}
              {tab === 'vehicles' && 'Vehicle Approvals'}
              {tab === 'reviews' && 'Review Moderation'}
              {tab === 'moderation' && 'Platform Content Suggestions'}
              {tab === 'payments' && 'Subscription Payments'}
              {tab === 'settings' && 'Account Settings'}
              {tab === 'feedback' && 'Member Feedback'}
            </Title>
          </div>
          <Space size={isMobile ? "small" : "large"}>
            <Button 
              type="text" 
              onClick={() => navigate('/explore')} 
              icon={<ArrowLeft size={16} />}
              style={{ display: 'flex', alignItems: 'center' }}
            >
              {!isMobile && "Back to Site"}
            </Button>
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
                <Avatar style={{ backgroundColor: '#0d9488' }}>{user?.name.charAt(0)}</Avatar>
                {!isMobile && <Text strong style={{ color: '#334155' }}>Staff</Text>}
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
              {/* Quick Stats Header */}
              {stats && tab === 'users' && (
                <div style={{ 
                  display: 'flex', 
                  flexDirection: isMobile ? 'row' : 'row', 
                  flexWrap: isMobile ? 'nowrap' : 'wrap', 
                  overflowX: isMobile ? 'auto' : 'visible', 
                  gap: isMobile ? '0.75rem' : '1.5rem', 
                  marginBottom: '2.5rem',
                  paddingBottom: isMobile ? '0.5rem' : '0' 
                }} className="hide-scroll">
                  <Card size="small" style={{ borderRadius: '12px', background: '#fff7ed', border: '1px solid #ffedd5', flex: isMobile ? '0 0 auto' : '1 1 200px', minWidth: isMobile ? '135px' : '200px' }} bordered={false}>
                    <Statistic title="Action Required" value={pendingUsers.length + pendingVehicles.length} valueStyle={{ fontSize: isMobile ? '1.25rem' : '1.5rem' }} prefix={<AlertTriangle size={isMobile ? 16 : 20} style={{ color: '#ea580c', marginRight: 8 }} />} />
                  </Card>
                  <Card size="small" style={{ borderRadius: '12px', background: '#f0fdf4', border: '1px solid #dcfce7', flex: isMobile ? '0 0 auto' : '1 1 200px', minWidth: isMobile ? '135px' : '200px' }} bordered={false}>
                    <Statistic title="Approved Today" value={stats.approvedToday} valueStyle={{ fontSize: isMobile ? '1.25rem' : '1.5rem' }} prefix={<CheckCircle size={isMobile ? 16 : 20} style={{ color: '#16a34a', marginRight: 8 }} />} />
                  </Card>
                  <Card size="small" style={{ borderRadius: '12px', background: '#eff6ff', border: '1px solid #dbeafe', flex: isMobile ? '0 0 auto' : '1 1 200px', minWidth: isMobile ? '135px' : '200px' }} bordered={false}>
                    <Statistic title="Total Vehicles" value={stats.totalVehicles} valueStyle={{ fontSize: isMobile ? '1.25rem' : '1.5rem' }} prefix={<Car size={isMobile ? 16 : 20} style={{ color: '#2563eb', marginRight: 8 }} />} />
                  </Card>
                </div>
              )}

              {tab === 'users' && (
                <div className="animate-fade-in">
                  <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '1rem', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center' }}>
                    <Title level={5} style={{ margin: 0, whiteSpace: 'nowrap', flexShrink: 0 }}>KYC Document Reviews</Title>
                    <div style={{ display: 'flex', width: isMobile ? '100%' : 'auto', gap: '8px' }}>
                      <Input
                        prefix={<Search size={16} />}
                        placeholder="Search name or email..."
                        style={{ flex: 1, minWidth: isMobile ? 0 : 300, borderRadius: '8px' }}
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                      />
                      <Button type="primary" onClick={fetchData}>Refresh</Button>
                    </div>
                  </div>

                  <Table
                    scroll={{ x: true }}
                    dataSource={filteredUsers}
                    rowKey={u => (u.id || u._id || Math.random()).toString()}
                    pagination={{ pageSize: 12 }}
                    style={{ border: '1px solid #f1f5f9', borderRadius: '8px' }}
                    columns={[
                      {
                        title: 'User Profile',
                        render: (_, u) => (
                          <Space size="middle">
                            <Avatar style={{ background: 'linear-gradient(45deg, #0d9488, #2dd4bf)' }}>{u.name.charAt(0)}</Avatar>
                            <div>
                              <Text strong>{u.name}</Text><br />
                              <Text type="secondary" style={{ fontSize: '13px' }}>{u.email}</Text>
                            </div>
                          </Space>
                        )
                      },
                      { title: 'Phone Number', dataIndex: 'phone', render: p => p || <Text type="danger">Not provided</Text> },
                      { title: 'Submission Date', dataIndex: 'updatedAt', render: d => d ? new Date(d).toLocaleDateString() : 'Recent' },
                      { title: 'Status', render: (_, u) => u.isKycVerified ? <Tag color="success">VERIFIED</Tag> : <Tag color="warning">NEEDS REVIEW</Tag> },
                      {
                        title: 'Action',
                        render: (_, u) => (
                          <Button
                            type="primary"
                            style={{ background: '#1e293b' }}
                            icon={<Shield size={14} />}
                            onClick={() => { setSelectedUser(u); setShowModal(true); }}
                          >
                            Review KYC
                          </Button>
                        )
                      }
                    ]}
                  />
                </div>
              )}

              {tab === 'vehicles' && (
                <div className="animate-fade-in">
                  <Title level={5} style={{ marginBottom: '1.5rem' }}>Vehicle Listing Approvals</Title>
                  <Table
                    scroll={{ x: true }}
                    dataSource={pendingVehicles}
                    rowKey="_id"
                    pagination={{ pageSize: 12 }}
                    style={{ border: '1px solid #f1f5f9', borderRadius: '8px' }}
                    columns={[
                      {
                        title: 'Vehicle',
                        render: (_, v) => (
                          <div>
                            <Text strong>{v.title}</Text><br />
                            <Text type="secondary" style={{ fontSize: '13px' }}>{v.make} {v.model} ({v.year})</Text>
                          </div>
                        )
                      },
                      {
                        title: 'Owner',
                        render: (_, v) => {
                          const owner = typeof v.owner === 'object' ? v.owner : null;
                          return owner ? <div><Text strong>{owner.name}</Text><br /><Text type="secondary" style={{ fontSize: '12px' }}>{owner.email}</Text></div> : 'Unknown';
                        }
                      },
                      { title: 'Price/Day', dataIndex: 'pricePerDay', render: p => `LKR ${p.toLocaleString()}` },
                      {
                        title: 'Actions',
                        render: (_, v) => (
                          <Space>
                            <Button type="primary" icon={<CheckCircle size={14} />} onClick={() => handleApproveVehicle(v._id)} loading={actionLoading === v._id}>Approve</Button>
                            <Button danger icon={<XCircle size={14} />} onClick={() => handleRejectVehicle(v._id)} loading={actionLoading === v._id}>Reject</Button>
                          </Space>
                        )
                      }
                    ]}
                  />
                </div>
              )}

              {tab === 'reviews' && (
                <div className="animate-fade-in">
                  <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '1rem', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center' }}>
                    <Title level={5} style={{ margin: 0, whiteSpace: 'nowrap', flexShrink: 0 }}>Review Moderation</Title>
                    <div style={{ display: 'flex', width: isMobile ? '100%' : 'auto', gap: '8px' }}>
                      <Input
                        prefix={<Search size={16} />}
                        placeholder="Search by user, email, vehicle, or comment..."
                        style={{ flex: 1, minWidth: isMobile ? 0 : 350, borderRadius: '8px' }}
                        value={reviewSearchQuery}
                        onChange={e => setReviewSearchQuery(e.target.value)}
                        allowClear
                      />
                      <Button type="primary" onClick={fetchData}>Refresh</Button>
                    </div>
                  </div>
                  <Table
                    scroll={{ x: true }}
                    dataSource={filteredReviews}
                    rowKey="_id"
                    pagination={{ pageSize: 12 }}
                    style={{ border: '1px solid #f1f5f9', borderRadius: '8px' }}
                    columns={[
                      {
                        title: 'Reviewer',
                        render: (_, r) => (
                          <Space>
                            <Avatar size="small" src={getImageUrl(r.reviewer.profilePic)}>{r.reviewer.name.charAt(0)}</Avatar>
                            <div>
                              <Text strong>{r.reviewer.name}</Text><br />
                              <Text type="secondary" style={{ fontSize: '11px' }}>{r.reviewer.email}</Text>
                            </div>
                          </Space>
                        )
                      },
                      {
                        title: 'Vehicle',
                        render: (_, r) => (
                          <div>
                            <Text strong>{r.vehicle?.title || 'Unknown Vehicle'}</Text><br />
                            <Text type="secondary" style={{ fontSize: '11px' }}>{r.vehicle?.make} {r.vehicle?.model}</Text>
                          </div>
                        )
                      },
                      { title: 'Rating', dataIndex: 'rating', render: r => <Rate disabled defaultValue={r} style={{ fontSize: 14 }} /> },
                      { title: 'Comment', dataIndex: 'comment', width: '30%', render: c => <Text type="secondary" style={{ fontSize: '13px' }}>{c}</Text> },
                      { title: 'Status', render: (_, r) => <Tag color={r.status === 'visible' ? 'success' : 'red'}>{r.status.toUpperCase()}</Tag> },
                      { title: 'Date', dataIndex: 'createdAt', render: d => new Date(d).toLocaleDateString() },
                      {
                        title: 'Actions',
                        render: (_, r) => (
                          <Button
                            danger={r.status === 'visible'}
                            type={r.status === 'visible' ? 'primary' : 'default'}
                            size="small"
                            icon={r.status === 'visible' ? <EyeOff size={14} /> : <Eye size={14} />}
                            onClick={() => handleToggleReviewStatus(r._id, r.status)}
                            className="review-action-btn"
                          >
                            {r.status === 'visible' ? 'Hide Review' : 'Restore'}
                          </Button>
                        )
                      }
                    ]}
                  />
                </div>
              )}

              {tab === 'moderation' && (
                <div className="animate-fade-in">
                  <Title level={5} style={{ marginBottom: '1.5rem' }}>Vehicle Content Suggestions</Title>
                  <Space direction="vertical" style={{ width: '100%' }} size="large">
                    <Card title="New Brand Suggestions" size="small">
                      <Table
                    scroll={{ x: true }}
                        dataSource={pendingMakes}
                        rowKey="_id"
                        pagination={false}
                        size="small"
                        columns={[
                          { title: 'Brand', dataIndex: 'name', render: n => <Text strong>{n}</Text> },
                          { title: 'Suggested By', dataIndex: 'createdBy', render: (u: any) => u?.name || 'Owner' },
                          {
                            title: 'Action',
                            render: (_, m) => (
                              <Space>
                                <Button size="small" type="primary" onClick={() => handleApproveMake(m._id)}>Approve</Button>
                                <Button size="small" danger onClick={() => handleDeleteMake(m._id)}>Delete</Button>
                              </Space>
                            )
                          }
                        ]}
                      />
                    </Card>

                    <Card title="New Model Suggestions" size="small">
                      <Table
                    scroll={{ x: true }}
                        dataSource={pendingModels}
                        rowKey="_id"
                        pagination={false}
                        size="small"
                        columns={[
                          { title: 'Model', dataIndex: 'name', render: n => <Text strong>{n}</Text> },
                          { title: 'Brand', dataIndex: 'make', render: (m: any) => <Tag color="blue">{m?.name}</Tag> },
                          { title: 'Suggested By', dataIndex: 'createdBy', render: (u: any) => u?.name || 'Owner' },
                          {
                            title: 'Action',
                            render: (_, mo) => (
                              <Space>
                                <Button size="small" type="primary" onClick={() => handleApproveModel(mo._id)}>Approve</Button>
                                <Button size="small" danger onClick={() => handleDeleteModel(mo._id)}>Delete</Button>
                              </Space>
                            )
                          }
                        ]}
                      />
                    </Card>
                  </Space>
                </div>
              )}

              {tab === 'payments' && (
                <div className="animate-fade-in">
                  <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '1rem', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center' }}>
                    <Title level={5} style={{ margin: 0, whiteSpace: 'nowrap', flexShrink: 0 }}>Pending Subscription Payments</Title>
                    <Button type="primary" onClick={fetchData}>Refresh</Button>
                  </div>
                  <Table
                    scroll={{ x: true }}
                    dataSource={pendingPayments}
                    rowKey="_id"
                    pagination={{ pageSize: 12 }}
                    style={{ border: '1px solid #f1f5f9', borderRadius: '8px' }}
                    columns={[
                      { title: 'Owner', render: (_, p: any) => <div><strong>{p.user?.name}</strong><br /><Text type="secondary" style={{ fontSize: '13px' }}>{p.user?.email}</Text></div> },
                      { title: 'Tier', dataIndex: 'tier', render: (t: string) => <Tag color="blue">{t}</Tag> },
                      { title: 'Method', dataIndex: 'method', render: (m: string) => <Tag color={m === 'PAYHERE' ? 'green' : 'orange'}>{m || 'MANUAL'}</Tag> },
                      { title: 'Amount', dataIndex: 'amount', render: (a: number) => <Text strong>LKR {a?.toLocaleString()}</Text> },
                      {
                        title: 'Transaction/Ref', render: (_, p: any) => (
                          <div>
                            <Text copyable style={{ fontSize: '12px' }}>{p.transactionId || p.reference}</Text>
                            {p.paidAt && <div style={{ fontSize: '11px', color: '#94a3b8' }}>Paid: {new Date(p.paidAt).toLocaleString()}</div>}
                          </div>
                        )
                      },
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
                      {
                        title: 'Action', render: (_, p: any) => (
                          <Space>
                            {p.status === 'approved' ? (
                              <Tag color="success">Verified</Tag>
                            ) : (
                              <>
                                <Button size="small" type="primary" onClick={() => handleVerifyPayment(p._id, 'approved')} loading={actionLoading === p._id}>Approve</Button>
                                <Button size="small" danger onClick={() => handleVerifyPayment(p._id, 'rejected')} loading={actionLoading === p._id}>Reject</Button>
                              </>
                            )}
                          </Space>
                        )
                      }
                    ]}
                  />
                </div>
              )}

              {tab === 'settings' && (
                <div className="animate-fade-in" style={{ maxWidth: 600 }}>
                  <Card 
                    title={<Space><Settings size={18} /> Notification Preferences</Space>} 
                    bordered={false} 
                    style={{ borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
                  >
                    <p style={{ color: '#64748b', marginBottom: '2rem' }}>
                      Configure where you'd like to receive work-related alerts (KYC requests, vehicle approvals, etc.)
                    </p>
                    
                    <Form 
                      layout="vertical" 
                      initialValues={{ 
                        notificationEmail: user?.notificationEmail || user?.email, 
                        isNotificationEmailActive: user?.isNotificationEmailActive || false 
                      }}
                      onFinish={handleUpdateSettings}
                    >
                      <Form.Item 
                        name="notificationEmail" 
                        label="Work Notification Email" 
                        help="This is where we'll send alerts when new work is assigned or pending."
                        rules={[{ type: 'email', message: 'Please enter a valid email' }]}
                      >
                        <Input prefix={<Mail size={16} style={{ color: '#94a3b8' }} />} placeholder="e.g. staff.work@flexify.com" size="large" />
                      </Form.Item>

                      <Form.Item 
                        name="isNotificationEmailActive" 
                        label="Enable Email Notifications" 
                        valuePropName="checked"
                      >
                        <Space>
                          <Switch />
                          <Text type="secondary">Receive real-time alerts for new pending items</Text>
                        </Space>
                      </Form.Item>

                      <Form.Item style={{ marginTop: '2rem' }}>
                        <Button type="primary" htmlType="submit" size="large" loading={actionLoading === 'settings'} block>
                          Save Preferences
                        </Button>
                      </Form.Item>
                    </Form>
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
                        title: 'Guest Email', 
                        dataIndex: 'contactEmail', 
                        render: (e, record) => e || record.user?.email || 'N/A' 
                      },
                      { 
                        title: 'Date', 
                        dataIndex: 'createdAt', 
                        render: d => new Date(d).toLocaleString() 
                      },
                      {
                        title: 'Action',
                        render: (_, record) => (
                          <Button size="small" danger onClick={() => handleDeleteFeedback(record._id)} loading={actionLoading === record._id}>Delete</Button>
                        )
                      }
                    ]}
                  />
                </div>
              )}
            </>
          )}
        </Content>
      </Layout>

      {/* KYC Detailed Review Modal */}
      <Modal
        open={showModal}
        onCancel={() => setShowModal(false)}
        width={1100}
        footer={null}
        title={null}
        style={{ top: 40 }}
        bodyStyle={{ padding: 0 }}
      >
        {selectedUser && (
          <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr' }}>
            {/* Sidebar with user info and checklist */}
            <div style={{ padding: '32px', background: '#f8fafc', borderRight: '1px solid #e2e8f0' }}>
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <div>
                  <Avatar 
                    size={64} 
                    src={getImageUrl(selectedUser.profilePic)}
                    style={{ background: '#0d9488', marginBottom: 16 }}
                  >
                    {selectedUser.name?.charAt(0)}
                  </Avatar>
                  <Title level={4} style={{ margin: 0 }}>{selectedUser.name}</Title>
                  <Text type="secondary">{selectedUser.email}</Text>
                </div>

                <div>
                  <Title level={5} style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b' }}>Contact Info</Title>
                  <Text strong>{selectedUser.phone || 'Phone not provided'}</Text><br />
                  <Text type="secondary" style={{ fontSize: '13px' }}>{selectedUser.documents?.address || 'Address not listed'}</Text>
                </div>

                <div style={{ padding: '20px', background: '#fff1f2', borderRadius: '12px', border: '1px solid #ffe4e6' }}>
                  <Text type="danger" strong style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <AlertTriangle size={14} /> Verification Checklist
                  </Text>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {["Cross-check ID numbers", "Photo matches ID", "Check for edits", "Verify name matches"].map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleCheck(idx)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          cursor: 'pointer',
                          padding: '6px',
                          borderRadius: '6px',
                          background: checkedItems[idx] ? '#ecfdf5' : 'transparent',
                          color: checkedItems[idx] ? '#059669' : '#1f2937',
                          fontSize: '13px'
                        }}
                      >
                        <div style={{
                          width: 18,
                          height: 18,
                          border: `2px solid ${checkedItems[idx] ? '#10b981' : '#fda4af'}`,
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: checkedItems[idx] ? '#10b981' : 'white'
                        }}>
                          {checkedItems[idx] && <CheckCircle size={12} color="white" />}
                        </div>
                        {item}
                      </div>
                    ))}
                  </Space>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: 12 }}>
                  <Button
                    danger
                    ghost
                    onClick={() => handleRejectUser((selectedUser.id || selectedUser._id)!)}
                  >
                    Revoke & Flag
                  </Button>
                  <Button
                    type="primary"
                    disabled={!allChecked}
                    onClick={() => handleApproveUser((selectedUser.id || selectedUser._id)!)}
                    style={{ background: allChecked ? '#10b981' : '#e2e8f0', borderColor: allChecked ? '#10b981' : '#e2e8f0' }}
                  >
                    Mark Reviewed
                  </Button>
                </div>
              </Space>
            </div>

            {/* Document display area */}
            <div style={{ padding: '32px', background: '#ffffff', overflowY: 'auto', maxHeight: '85vh' }}>
              <Title level={5} style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={18} /> Documentation Verification
              </Title>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {[
                  { label: 'NIC Front View', field: 'nicFront' },
                  { label: 'NIC Back View', field: 'nicBack' },
                  { label: 'Driver License', field: 'license' },
                  { label: 'Live Selfie', field: 'selfie' },
                ].map((doc, idx) => {
                  const url = selectedUser.documents?.[doc.field as keyof typeof selectedUser.documents];
                  const fullUrl = getImageUrl(url);
                  return (
                    <Card key={idx} size="small" title={doc.label} style={{ borderRadius: '12px' }}>
                      {url ? (
                        <Image
                          src={fullUrl}
                          alt={doc.label}
                          style={{ width: '100%', height: '220px', objectFit: 'contain' }}
                        />
                      ) : (
                        <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', color: '#cbd5e1' }}>
                          <Text disabled>Not Uploaded</Text>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Full Resolution Image Viewer */}
      <Modal
        open={!!fullScreenImage}
        onCancel={() => setFullScreenImage(null)}
        footer={null}
        width="auto"
        centered
        bodyStyle={{ padding: 4 }}
      >
        <img src={fullScreenImage || ''} style={{ maxWidth: '100vw', maxHeight: '90vh', objectFit: 'contain' }} alt="Fullscreen Preview" />
      </Modal>

      {/* Rejection Reasons Modal (Universal) */}
      <Modal
        title={`Reject ${rejectionModal.type}: ${rejectionModal.targetName}`}
        open={rejectionModal.visible}
        onCancel={() => setRejectionModal(prev => ({ ...prev, visible: false }))}
        onOk={() => form.submit()}
        confirmLoading={!!actionLoading}
        okText="Confirm Rejection"
        okButtonProps={{ danger: true }}
      >
        <Form form={form} layout="vertical" onFinish={submitRejection}>
          <Form.Item
            name="reason"
            label="Select Primary Reason"
            rules={[{ required: true, message: 'Please select a reason' }]}
          >
            <Select placeholder="Why is this being rejected?">
              {rejectionModal.type === 'KYC' && [
                "Blurry or unclear document photos",
                "Document type not supported",
                "Expired identification",
                "Selfie does not match ID document",
                "Information mismatch",
                "Other"
              ].map(r => <Select.Option key={r} value={r}>{r}</Select.Option>)}

              {rejectionModal.type === 'Vehicle' && [
                "Listing photos are too low quality",
                "Invalid document proof for ownership",
                "Year/Make/Model mismatch in description",
                "Restricted vehicle category",
                "Other"
              ].map(r => <Select.Option key={r} value={r}>{r}</Select.Option>)}

              {rejectionModal.type === 'Review' && [
                "Contains offensive language",
                "Spam or irrelevant content",
                "Revealing PII / Contact info",
                "Other"
              ].map(r => <Select.Option key={r} value={r}>{r}</Select.Option>)}
            </Select>
          </Form.Item>

          <Form.Item
            name="comment"
            label="Internal / User Notes"
            help="This will be sent to the user to help them fix the issue."
          >
            <Input.TextArea rows={4} placeholder="Detailed explanation..." />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}
