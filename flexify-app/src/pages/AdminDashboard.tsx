import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { adminApi, vehicleApi, bankDetailsApi, feedbackApi, settingsApi, getImageUrl, subadminApi, type AdminStats, type InquiryStats, type Vehicle, type User, type Booking, type AuditLog, type BankDetailsData, type Founder, type VehicleMake, type VehicleModel } from '../api';
import { Users, Car, Calendar, DollarSign, CheckCircle, Eye, LogOut, ArrowLeft, Edit2, Trash2, History, TrendingUp, MapPin, Landmark, ShieldAlert, Ban, FileText, MessageSquare, Menu as MenuIcon, Star, XCircle, Plus, Upload as UploadIcon, Phone } from 'lucide-react';
import { Tag, Tooltip, Typography, Select, Card, Statistic, Spin, Layout, Menu, Button, Avatar, Space, Dropdown, Form, Input, message, Modal, Row, Col, Divider, Drawer, Grid, Image, Alert, Switch } from 'antd';
import Table from '../components/ResponsiveTable';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as any) || 'overview';
  const [tab, setTab] = useState<'overview' | 'users' | 'vehicles' | 'bookings' | 'bank-settings' | 'site-settings' | 'feedback'>(initialTab);

  useEffect(() => {
    setSearchParams({ tab });
  }, [tab, setSearchParams]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [bankDetails, setBankDetails] = useState<BankDetailsData | null>(null);
  const [bankDetailsLoading, setBankDetailsLoading] = useState(false);
  const [siteSettings, setSiteSettings] = useState<any>(null);
  const [siteSettingsLoading, setSiteSettingsLoading] = useState(false);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
  const [district, setDistrict] = useState<string>('All Sri Lanka');
  const [timeRange, setTimeRange] = useState<string>('30d');
  const [inquiryStats, setInquiryStats] = useState<InquiryStats | null>(null);
  const [inquiryLoading, setInquiryLoading] = useState(false);

  // Modals for admin viewing
  const [selectedAdminVehicle, setSelectedAdminVehicle] = useState<Vehicle | null>(null);
  const [adminVehicleModalOpen, setAdminVehicleModalOpen] = useState(false);
  const [selectedAdminBooking, setSelectedAdminBooking] = useState<Booking | null>(null);
  const [adminBookingModalOpen, setAdminBookingModalOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [feedbacksLoading, setFeedbacksLoading] = useState(false);

  // Founders state
  const [founders, setFounders] = useState<Founder[]>([]);
  const [foundersLoading, setFoundersLoading] = useState(false);
  const [founderModalOpen, setFounderModalOpen] = useState(false);
  const [editingFounderIndex, setEditingFounderIndex] = useState<number | null>(null);
  const [founderForm] = Form.useForm();
  const [founderImageFile, setFounderImageFile] = useState<File | null>(null);
  const [founderImagePreview, setFounderImagePreview] = useState<string>('');

  // Modals
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  
  
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [editForm] = Form.useForm();
  const [roleForm] = Form.useForm();
  const [maintenanceForm] = Form.useForm();

  // User Vehicles Modal state
  const [userVehiclesModalOpen, setUserVehiclesModalOpen] = useState(false);
  const [userVehiclesUser, setUserVehiclesUser] = useState<User | null>(null);
  const [userVehicles, setUserVehicles] = useState<Vehicle[]>([]);
  const [userVehiclesLoading, setUserVehiclesLoading] = useState(false);

  // Vehicle count lookup: userId -> count
  const vehicleCountByUser = useMemo(() => {
    return allVehicles.reduce((acc: Record<string, number>, v) => {
      const ownerId = typeof v.owner === 'object' ? (v.owner as any)._id || (v.owner as any).id : v.owner;
      if (ownerId) {
        const strId = ownerId.toString();
        acc[strId] = (acc[strId] || 0) + 1;
      }
      return acc;
    }, {});
  }, [allVehicles]);



  const handleOpenUserVehicles = async (u: User) => {
    setUserVehiclesUser(u);
    setUserVehiclesModalOpen(true);
    setUserVehiclesLoading(true);
    try {
      const userId = u._id || u.id!;
      const vehicles = await adminApi.getUserVehicles(userId);
      setUserVehicles(vehicles);
    } catch (err: any) {
      message.error(err.message || 'Failed to load vehicles');
    } finally {
      setUserVehiclesLoading(false);
    }
  };


  const SRI_LANKA_LOCATIONS: Record<string, string[]> = {
    'Western': ['Colombo', 'Gampaha', 'Kalutara'],
    'Central': ['Kandy', 'Matale', 'Nuwara Eliya'],
    'Southern': ['Galle', 'Matara', 'Hambantota'],
    'Northern': ['Jaffna', 'Kilinochchi', 'Mannar', 'Vavuniya', 'Mullaitivu'],
    'Eastern': ['Trincomalee', 'Batticaloa', 'Ampara'],
    'North Western': ['Kurunegala', 'Puttalam'],
    'North Central': ['Anuradhapura', 'Polonnaruwa'],
    'Uva': ['Badulla', 'Moneragala'],
    'Sabaragamuwa': ['Ratnapura', 'Kegalle']
  };

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
    if (user?.role !== 'admin') return;

    // Initial full load
    setLoading(true);
    Promise.all([
      adminApi.getStats({ district, timeRange }).catch(() => null),
      adminApi.getAllUsers().catch(() => []),
      adminApi.getAllVehicles().catch(() => []),
      adminApi.getAuditLogs(1, 15).catch(() => ({ logs: [] })),
      adminApi.getPendingPayments().catch(() => []),
    ]).then(([s, u, v, logs, p]) => {
      if (s) setStats(s);
      setAllUsers(u);
      setAllVehicles(v);
      if (logs?.logs) setAuditLogs(logs.logs);
      setPendingPayments(p);
    }).finally(() => setLoading(false));

    // Load inquiry stats separately (non-blocking)
    setInquiryLoading(true);
    adminApi.getInquiryStats()
      .then(setInquiryStats)
      .catch((err) => console.error('Failed to load inquiry stats', err))
      .finally(() => setInquiryLoading(false));
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


  const handleDeleteVehicle = async (vehicle: Vehicle) => {
    const id = vehicle._id!;
    Modal.confirm({
      title: 'Delete Vehicle',
      content: `Are you sure you want to delete "${vehicle.title}"? All related pending/confirmed bookings will be cancelled.`,
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await adminApi.deleteVehicle(id);
          setAllVehicles(prev => prev.filter(v => v._id !== id));
          message.success('Vehicle deleted successfully');
        } catch (err: any) {
          message.error(err.message || 'Failed to delete vehicle');
        }
      }
    });
  };

  const handleCancelBooking = async (booking: Booking) => {
    const id = booking._id!;
    let reason = '';
    Modal.confirm({
      title: 'Force Cancel Booking',
      content: (
        <div style={{ marginTop: '16px' }}>
          <p style={{ marginBottom: '12px' }}>Are you sure you want to force cancel this booking?</p>
          <Input.TextArea 
            placeholder="Reason for cancellation (Optional)"
            onChange={(e) => { reason = e.target.value; }}
            rows={3}
          />
        </div>
      ),
      okText: 'Force Cancel',
      okType: 'danger',
      onOk: async () => {
        try {
          await adminApi.cancelBooking(id, reason);
          setAllBookings(prev => prev.map(b => b._id === id ? { ...b, status: 'CANCELLED' } : b));
          message.success('Booking cancelled successfully');
        } catch (err: any) {
          message.error(err.message || 'Failed to cancel booking');
        }
      }
    });
  };

  const handleSiteSettingsUpdate = async (values: any) => {
    try {
      setSiteSettingsLoading(true);
      const { settingsApi } = await import('../api');
      const updated = await settingsApi.updateContactDetails(values);
      setSiteSettings(updated);
      message.success('Site settings updated successfully!');
    } catch (err: any) {
      message.error(err.message || 'Failed to update site settings');
    } finally {
      setSiteSettingsLoading(false);
    }
  };

  const handleToggleMaintenance = async () => {
    try {
      setMaintenanceLoading(true);
      const { settingsApi } = await import('../api');
      let payload = { isMaintenanceMode: !isMaintenanceMode };
      
      if (!isMaintenanceMode) {
        // Turning ON: include form values
        const formValues = await maintenanceForm.validateFields();
        payload = { ...payload, ...formValues };
      }

      const updated = await settingsApi.toggleMaintenanceMode(payload as any);
      setIsMaintenanceMode(updated.isMaintenanceMode);
      maintenanceForm.setFieldsValue(updated);
      message.success(`Maintenance mode ${updated.isMaintenanceMode ? 'enabled' : 'disabled'}!`);
    } catch (err: any) {
      if (err.errorFields) return; // Validation error
      message.error(err.message || 'Failed to toggle maintenance mode');
    } finally {
      setMaintenanceLoading(false);
    }
  };

  // Load Site Settings when tab opens
  useEffect(() => {
    if (tab === 'site-settings' && !siteSettings) {
      setSiteSettingsLoading(true);
      import('../api').then(m => m.settingsApi.getContactDetails())
        .then(setSiteSettings)
        .catch(() => message.error('Failed to load site settings'))
        .finally(() => setSiteSettingsLoading(false));

      settingsApi.getMaintenanceMode()
        .then(res => {
          setIsMaintenanceMode(res.isMaintenanceMode);
          maintenanceForm.setFieldsValue(res);
        })
        .catch(err => console.error(err));
    }
  }, [tab, siteSettings]);

  // Load Founders when site-settings tab opens
  useEffect(() => {
    if (tab === 'site-settings') {
      setFoundersLoading(true);
      settingsApi.getFounders()
        .then(setFounders)
        .catch(() => message.error('Failed to load founders'))
        .finally(() => setFoundersLoading(false));
    }
  }, [tab]);

  const handleOpenFounderModal = (index?: number) => {
    if (index !== undefined && founders[index]) {
      const f = founders[index];
      founderForm.setFieldsValue({ name: f.name, role: f.role, description: f.description });
      setFounderImagePreview(getImageUrl(f.image));
      setEditingFounderIndex(index);
    } else {
      founderForm.resetFields();
      setFounderImagePreview('');
      setEditingFounderIndex(null);
    }
    setFounderImageFile(null);
    setFounderModalOpen(true);
  };

  const handleSaveFounder = async (values: any) => {
    try {
      setFoundersLoading(true);
      const updatedFounders = [...founders];
      const newEntry = { name: values.name, role: values.role, description: values.description, image: '' };

      if (editingFounderIndex !== null) {
        newEntry.image = updatedFounders[editingFounderIndex].image;
        updatedFounders[editingFounderIndex] = newEntry;
      } else {
        updatedFounders.push(newEntry);
      }

      const formData = new FormData();
      formData.append('founders', JSON.stringify(updatedFounders));

      // Attach the new image file if one was selected
      if (founderImageFile) {
        const targetIndex = editingFounderIndex !== null ? editingFounderIndex : updatedFounders.length - 1;
        formData.append(`image_${targetIndex}`, founderImageFile);
      }

      const result = await settingsApi.updateFounders(formData);
      setFounders(result);
      setFounderModalOpen(false);
      message.success(editingFounderIndex !== null ? 'Founder updated!' : 'Founder added!');
    } catch (err: any) {
      message.error(err.message || 'Failed to save founder');
    } finally {
      setFoundersLoading(false);
    }
  };

  const handleDeleteFounder = async (index: number) => {
    Modal.confirm({
      title: 'Delete Founder',
      content: `Are you sure you want to remove "${founders[index]?.name}"?`,
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          setFoundersLoading(true);
          const result = await settingsApi.deleteFounder(index);
          setFounders(result);
          message.success('Founder removed');
        } catch (err: any) {
          message.error(err.message || 'Failed to delete founder');
        } finally {
          setFoundersLoading(false);
        }
      },
    });
  };
  const filteredUsers = allUsers.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    return <div className="container" style={{ padding: '6rem 2rem', textAlign: 'center' }}><h2>Admin access required</h2></div>;
  }

  const roleBadge = (u: User) => {
    const colors: Record<string, string> = { admin: '#7c3aed', staff: '#0d9488', owner: '#1890ff', user: '#64748b' };
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
            {collapsed ? 'RN' : 'Rentify Admin'}
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
              { key: 'bank-settings', icon: <Landmark size={18} />, label: `Bank Settings` },
              { key: 'site-settings', icon: <Edit2 size={18} />, label: `Site Settings` },
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
            Rentify Admin
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
              { key: 'bank-settings', icon: <Landmark size={18} />, label: 'Bank Settings' },
              { key: 'site-settings', icon: <Edit2 size={18} />, label: 'Site Settings' },
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
              {tab === 'bookings' && 'Booking Management'}
              {tab === 'bank-settings' && 'Bank Settings Configuration'}
              {tab === 'site-settings' && 'Platform Site Settings'}
              {tab === 'feedback' && 'User Feedback & Bug Reports'}
            </Title>
          </div>
          <Space size={isMobile ? "small" : "large"}>
            <Button 
              type="primary" 
              onClick={() => navigate('/staff')} 
              icon={<ShieldAlert size={16} />}
              style={{ display: 'flex', alignItems: 'center', background: '#0d9488' }}
            >
              {!isMobile && "Staff Dashboard"}
            </Button>
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
                <Avatar style={{ backgroundColor: '#7c3aed' }}>AD</Avatar>
                {!isMobile && <Text strong style={{ color: '#334155' }}>Admin</Text>}
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
                            title="Booking Volume"
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

                  {/* ─────────── Calls & WhatsApp Inquiry Analytics ─────────── */}
                  <div style={{ marginTop: '3rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)', color: '#16a34a', padding: '10px', borderRadius: '10px', display: 'flex' }}>
                          <Phone size={20} />
                        </div>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>Calls &amp; WhatsApp Inquiry Analytics</h3>
                          <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Monitor how many calls and WhatsApp messages your vehicles receive from potential renters.</p>
                        </div>
                      </div>
                      <Space>
                        <Tag color="green" style={{ borderRadius: '20px', padding: '2px 10px', fontSize: '12px' }}>All Contacts (Platform-Wide)</Tag>
                        {inquiryStats && <Tag color="blue" style={{ borderRadius: '20px', padding: '2px 10px', fontSize: '12px' }}>Today: {inquiryStats.today.total}</Tag>}
                        {inquiryStats && <Tag style={{ borderRadius: '20px', padding: '2px 10px', fontSize: '12px' }}>Last 30 Days</Tag>}
                        {inquiryStats && <Tag style={{ borderRadius: '20px', padding: '2px 10px', fontSize: '12px' }}>All Time</Tag>}
                        <Button size="small" icon={<TrendingUp size={14} />} onClick={() => { setInquiryLoading(true); adminApi.getInquiryStats().then(setInquiryStats).catch(() => {}).finally(() => setInquiryLoading(false)); }} loading={inquiryLoading}>Refresh</Button>
                      </Space>
                    </div>

                    {inquiryLoading && !inquiryStats ? (
                      <div style={{ textAlign: 'center', padding: '3rem' }}><Spin tip="Loading inquiry stats..." /></div>
                    ) : (
                      <>
                        {/* Stat Cards Row */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                          <Card size="small" bordered={false} style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ background: '#16a34a', color: '#fff', borderRadius: '8px', padding: '8px', display: 'flex' }}><Phone size={16} /></div>
                              <div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#14532d', lineHeight: 1 }}>{inquiryStats?.today.calls ?? 0}</div>
                                <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600, textTransform: 'uppercase' }}>Phone Calls Today</div>
                              </div>
                            </div>
                            <div style={{ marginTop: '8px', fontSize: '12px', color: '#15803d' }}>All time: <strong>{inquiryStats?.allTime.calls ?? 0}</strong></div>
                          </Card>

                          <Card size="small" bordered={false} style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ background: '#25D366', color: '#fff', borderRadius: '8px', padding: '8px', display: 'flex' }}><MessageSquare size={16} /></div>
                              <div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#14532d', lineHeight: 1 }}>{inquiryStats?.today.whatsapp ?? 0}</div>
                                <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600, textTransform: 'uppercase' }}>WhatsApp Messages Today</div>
                              </div>
                            </div>
                            <div style={{ marginTop: '8px', fontSize: '12px', color: '#15803d' }}>All time: <strong>{inquiryStats?.allTime.whatsapp ?? 0}</strong></div>
                          </Card>

                          <Card size="small" bordered={false} style={{ background: 'linear-gradient(135deg, #fefce8, #fef9c3)', borderRadius: '12px', border: '1px solid #fde68a' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ background: '#ca8a04', color: '#fff', borderRadius: '8px', padding: '8px', display: 'flex' }}><TrendingUp size={16} /></div>
                              <div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#713f12', lineHeight: 1 }}>{inquiryStats?.today.total ?? 0}</div>
                                <div style={{ fontSize: '11px', color: '#a16207', fontWeight: 600, textTransform: 'uppercase' }}>New Inquiries Today</div>
                              </div>
                            </div>
                            <div style={{ marginTop: '8px', fontSize: '12px', color: '#a16207' }}>All time: <strong>{inquiryStats?.allTime.total ?? 0}</strong></div>
                          </Card>

                          <Card size="small" bordered={false} style={{ background: 'linear-gradient(135deg, #fdf4ff, #fae8ff)', borderRadius: '12px', border: '1px solid #e9d5ff' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ background: '#9333ea', color: '#fff', borderRadius: '8px', padding: '8px', display: 'flex' }}><Star size={16} /></div>
                              <div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#3b0764', lineHeight: 1 }}>
                                  {inquiryStats?.vehicleBreakdown.length ?? 0}
                                </div>
                                <div style={{ fontSize: '11px', color: '#9333ea', fontWeight: 600, textTransform: 'uppercase' }}>Run Activity Tips</div>
                              </div>
                            </div>
                            <div style={{ marginTop: '8px', fontSize: '12px', color: '#7c3aed' }}>
                              {(inquiryStats?.vehicleBreakdown.length ?? 0) === 0
                                ? 'No inquiries yet, tap any listing.'
                                : `Top: ${inquiryStats!.vehicleBreakdown[0]?.title ?? '—'}`}
                            </div>
                          </Card>
                        </div>

                        {/* 30-Day Sparkline Chart */}
                        {inquiryStats && inquiryStats.chartData.length > 0 && (() => {
                          const maxVal = Math.max(...inquiryStats.chartData.map(d => d.calls + d.whatsapp), 1);
                          const totalEvents = inquiryStats.chartData.reduce((s, d) => s + d.calls + d.whatsapp, 0);
                          return (
                            <Card
                              bordered={false}
                              style={{ border: '1px solid #f1f5f9', borderRadius: '12px', marginBottom: '2rem' }}
                              title={
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                                  <span style={{ fontWeight: 700, fontSize: '14px' }}>Inquiry Activity Over Past 30 Days</span>
                                  <Space size={4}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#16a34a' }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} /> By Calls</span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#25D366', marginLeft: '8px' }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: '#25D366', display: 'inline-block' }} /> WhatsApp</span>
                                    <Tag style={{ marginLeft: '8px', fontSize: '11px' }}>1d</Tag>
                                    <Tag style={{ fontSize: '11px' }}>7d</Tag>
                                  </Space>
                                </div>
                              }
                            >
                              {totalEvents === 0 ? (
                                <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                                  <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📊</div>
                                  <div style={{ fontWeight: 600, color: '#374151', marginBottom: '6px' }}>0 Inquiries Recorded in this timeframe</div>
                                  <div style={{ fontSize: '13px', color: '#64748b' }}>Start using the call &amp; WhatsApp buttons on listings to record or<br />manage actions in the future.</div>
                                </div>
                              ) : (
                                <div style={{ overflowX: 'auto' }}>
                                  <svg width="100%" viewBox={`0 0 ${inquiryStats.chartData.length * 28} 120`} style={{ minWidth: '600px', display: 'block' }} preserveAspectRatio="none">
                                    {/* Grid lines */}
                                    {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
                                      <line key={pct} x1="0" y1={100 - pct * 90} x2={inquiryStats.chartData.length * 28} y2={100 - pct * 90} stroke="#f1f5f9" strokeWidth="1" />
                                    ))}
                                    {/* Filled area — calls */}
                                    <polyline
                                      fill="rgba(22,163,74,0.12)"
                                      stroke="none"
                                      points={[
                                        ...inquiryStats.chartData.map((d, i) => `${i * 28 + 14},${100 - (d.calls / maxVal) * 90}`),
                                        `${(inquiryStats.chartData.length - 1) * 28 + 14},100`,
                                        `14,100`
                                      ].join(' ')}
                                    />
                                    {/* Calls line */}
                                    <polyline
                                      fill="none"
                                      stroke="#16a34a"
                                      strokeWidth="2"
                                      strokeLinejoin="round"
                                      points={inquiryStats.chartData.map((d, i) => `${i * 28 + 14},${100 - (d.calls / maxVal) * 90}`).join(' ')}
                                    />
                                    {/* WhatsApp line */}
                                    <polyline
                                      fill="none"
                                      stroke="#25D366"
                                      strokeWidth="2"
                                      strokeDasharray="4 2"
                                      strokeLinejoin="round"
                                      points={inquiryStats.chartData.map((d, i) => `${i * 28 + 14},${100 - (d.whatsapp / maxVal) * 90}`).join(' ')}
                                    />
                                    {/* Date labels every 5 days */}
                                    {inquiryStats.chartData.map((d, i) => (
                                      i % 5 === 0 ? (
                                        <text key={i} x={i * 28 + 14} y="115" textAnchor="middle" fontSize="8" fill="#94a3b8">
                                          {new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </text>
                                      ) : null
                                    ))}
                                  </svg>
                                </div>
                              )}
                            </Card>
                          );
                        })()}

                        {/* Per-Vehicle Breakdown Table */}
                        <Card
                          title={
                            <Space><Car size={16} /> Rental Vehicle Inquiry Breakdown: Calls &amp; WhatsApp</Space>
                          }
                          bordered={false}
                          style={{ border: '1px solid #f1f5f9', borderRadius: '12px' }}
                          extra={<Text type="secondary" style={{ fontSize: '12px' }}>Top 50 vehicles by total inquiries. Click to view listing.</Text>}
                        >
                          {!inquiryStats || inquiryStats.vehicleBreakdown.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                              <Car size={32} style={{ marginBottom: 8, opacity: 0.3 }} />
                              <div>No inquiry data yet. Clicks will appear here once renters start contacting owners.</div>
                            </div>
                          ) : (
                            <Table
                              scroll={{ x: true }}
                              dataSource={inquiryStats.vehicleBreakdown}
                              rowKey="_id"
                              size="small"
                              pagination={{ pageSize: 10, size: 'small' }}
                              columns={[
                                {
                                  title: 'Vehicle',
                                  dataIndex: 'title',
                                  render: (title: string, row: any) => (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                      {row.photos?.[0]?.url && (
                                        <img src={getImageUrl(row.photos[0])} alt={title} style={{ width: 48, height: 36, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
                                      )}
                                      <div>
                                        <div style={{ fontWeight: 600, fontSize: '13px' }}>{title}</div>
                                        <div style={{ fontSize: '11px', color: '#64748b' }}>{row.make} {row.model}</div>
                                      </div>
                                    </div>
                                  )
                                },
                                { title: 'Owner', dataIndex: 'ownerDoc', render: (o: any) => o ? <div style={{ fontSize: '12px' }}><strong>{o.name}</strong><br /><Text type="secondary" style={{ fontSize: '11px' }}>{o.role}</Text></div> : '—' },
                                {
                                  title: 'Calls Today',
                                  dataIndex: 'callsToday',
                                  sorter: (a: any, b: any) => a.callsToday - b.callsToday,
                                  render: (v: number) => <Tag color="green" icon={<Phone size={11} style={{ marginRight: 3 }} />}>{v}</Tag>
                                },
                                {
                                  title: 'WhatsApp Today',
                                  dataIndex: 'whatsappToday',
                                  sorter: (a: any, b: any) => a.whatsappToday - b.whatsappToday,
                                  render: (v: number) => <Tag color="green" icon={<MessageSquare size={11} style={{ marginRight: 3 }} />}>{v}</Tag>
                                },
                                {
                                  title: 'Total Today',
                                  dataIndex: 'inquiriesToday',
                                  sorter: (a: any, b: any) => a.inquiriesToday - b.inquiriesToday,
                                  render: (v: number) => <Tag color={v > 0 ? 'gold' : 'default'}>{v} Total</Tag>
                                },
                                {
                                  title: 'All Time (Public Explore)',
                                  dataIndex: 'totalInquiries',
                                  defaultSortOrder: 'descend' as const,
                                  sorter: (a: any, b: any) => a.totalInquiries - b.totalInquiries,
                                  render: (_: any, row: any) => (
                                    <Space size={4}>
                                      <Tag color="green" icon={<Phone size={11} />}>{row.callClicks} Total</Tag>
                                      <Tag color="green" icon={<MessageSquare size={11} />}>{row.whatsappClicks} Total</Tag>
                                    </Space>
                                  )
                                },
                                {
                                  title: 'Action',
                                  render: (_: any, row: any) => (
                                    <Space size={4}>
                                      <Button size="small" onClick={() => window.open(`/vehicles/${row._id}`, '_blank')}>View Graph</Button>
                                      <Button size="small" onClick={() => window.open(`/vehicles/${row._id}`, '_blank')}>View Dash</Button>
                                    </Space>
                                  )
                                },
                              ]}
                            />
                          )}
                        </Card>
                      </>
                    )}
                  </div>

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
                                {d.oldRole ? `Role: ${d.oldRole} â†’ ${d.newRole}` : d.reason || 'View details'}
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
                        title: 'Sales Access',
                        render: (_, u) => (
                          <Switch 
                            checked={u.hasSalesAccess} 
                            onChange={async (checked) => {
                              try {
                                const res = await subadminApi.toggleSalesAccess(u.id || u._id);
                                setAllUsers(prev => prev.map(user => (user.id || user._id) === (u.id || u._id) ? { ...user, hasSalesAccess: checked } : user));
                                message.success(res.message);
                              } catch (err: any) {
                                message.error(err.message || 'Failed to toggle sales access');
                              }
                            }}
                          />
                        )
                      },
                      { title: 'Vehicles', render: (_, u) => {
                          const uid = (u._id || u.id)?.toString();
                          const count = uid ? (vehicleCountByUser[uid] || 0) : 0;
                          return (
                            <Button
                              size="small"
                              type="link"
                              icon={<Car size={13} />}
                              onClick={() => handleOpenUserVehicles(u)}
                              style={{ padding: '0 4px', fontSize: '13px' }}
                            >
                              {count} {count === 1 ? 'vehicle' : 'vehicles'}
                            </Button>
                          );
                        }},
                      {
                        title: 'Actions', 
                        render: (_, u) => {
                          const id = (u.id || u._id)!;
                          const isSuper = user.role === 'admin' || user.role === 'superadmin';
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
                                  <Tooltip title="View Vehicles">
                                    <Button size="small" type="text" style={{ color: '#0ea5e9' }} onClick={() => handleOpenUserVehicles(u)} icon={<Car size={14} />} />
                                  </Tooltip>
                                  <Tooltip title="List Vehicle for User">
                                    <Button size="small" type="text" style={{ color: '#7c3aed' }} onClick={() => navigate(`/list-vehicle?forUser=${uid}`)} icon={<Plus size={14} />} />
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
                      { title: 'Performance', render: (_, v) => {
                          const bCount = allBookings.filter((b: any) => (b.vehicle?._id || b.vehicle) === v._id).length;
                          return <div><Tag color="blue">{bCount} Bookings</Tag><br /><Tag icon={<Star size={12} />} color="gold" style={{ marginTop: '4px' }}>{v.averageRating ? `${v.averageRating} / 5` : 'No rating'}</Tag></div>
                      } },
                      { title: 'Status', dataIndex: 'status', render: s => <Tag color={s === 'active' ? 'green' : s === 'pending' ? 'orange' : 'red'}>{s}</Tag> },
                      {
                        title: 'Actions', render: (_, v) => (
                          <Space>
                            <Button size="small" type="default" style={{ fontSize: '12px', padding: '0 10px', height: '26px', lineHeight: '24px' }} onClick={() => navigate(`/vehicles/edit/${v._id}`)}>Edit</Button>
                            <Button size="small" type="default" style={{ fontSize: '12px', padding: '0 10px', height: '26px', lineHeight: '24px' }} onClick={() => { setSelectedAdminVehicle(v); setAdminVehicleModalOpen(true); }}>View</Button>
                          </Space>
                        )
                      }
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
                      { title: 'Dates', render: (_, b) => <Text style={{ fontSize: '13px' }}>{b.startDate ? new Date(b.startDate).toLocaleDateString() : 'N/A'} â€” {b.endDate ? new Date(b.endDate).toLocaleDateString() : 'N/A'}</Text> },
                      { title: 'Amount', dataIndex: 'totalAmount', render: a => `LKR ${(a || 0).toLocaleString()}` },
                      { title: 'Status', dataIndex: 'status', render: s => <Tag color={s === 'CONFIRMED' ? 'green' : s === 'CANCELLED' || s === 'REJECTED' ? 'red' : 'orange'}>{s}</Tag> },
                      {
                        title: 'Actions', render: (_, b) => (
                          <Button size="small" type="default" style={{ fontSize: '12px', padding: '0 10px', height: '26px', lineHeight: '24px' }} icon={<Eye size={14} />} onClick={() => { setSelectedAdminBooking(b); setAdminBookingModalOpen(true); }}>View Details</Button>
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
                          <Input size="large" placeholder="Rentify Pvt Ltd" />
                        </Form.Item>
                        <Form.Item name="accountNumber" label="Account Number" rules={[{ required: true }]}>
                          <Input size="large" placeholder="8010045622" />
                        </Form.Item>
                        <Form.Item name="referenceEmail" label="Reference Email (for clarifications)" rules={[{ required: true, type: 'email' }]}>
                          <Input size="large" placeholder="luxury@rentify.lk" />
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

              {tab === 'site-settings' && (
                <div className="animate-fade-in" style={{ maxWidth: '800px' }}>
                  <Card title="Platform Contact Settings" bordered={false} style={{ borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '2rem' }}>
                    <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '14px' }}>
                      Update the official platform contact details. These are displayed publicly on the Contact Us page and footer.
                    </p>
                    {siteSettingsLoading && !siteSettings ? (
                      <div style={{ textAlign: 'center', padding: '2rem' }}><Spin size="large" /></div>
                    ) : (
                      <Form
                        layout="vertical"
                        initialValues={siteSettings || {}}
                        onFinish={handleSiteSettingsUpdate}
                      >
                        <Form.Item name="email" label="Support Email" rules={[{ required: true, type: 'email' }]}>
                          <Input size="large" placeholder="support@rentify.lk" prefix={<MessageSquare size={16} style={{ color: '#94a3b8' }} />} />
                        </Form.Item>
                        <Form.Item name="phone" label="Support Phone Number" rules={[{ required: true }]}>
                          <Input size="large" placeholder="+94 11 234 5678" />
                        </Form.Item>
                        <Form.Item name="address" label="Office Address" rules={[{ required: true }]}>
                          <Input size="large" placeholder="Colombo 03, Sri Lanka" prefix={<MapPin size={16} style={{ color: '#94a3b8' }} />} />
                        </Form.Item>
                        <Form.Item name="workingHours" label="Working Hours" rules={[{ required: true }]}>
                          <Input size="large" placeholder="Mon-Sat: 9:00 AM - 6:00 PM" />
                        </Form.Item>
                        <Button type="primary" htmlType="submit" size="large" loading={siteSettingsLoading} block>
                          Save Site Settings
                        </Button>
                      </Form>
                    )}
                  </Card>

                  {/* ========== MAINTENANCE MODE ========== */}
                  <Card title={<Space><ShieldAlert size={18} /> Global Maintenance Mode</Space>} bordered={false} style={{ borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '2rem' }}>
                    <div style={{ marginBottom: '1.5rem' }}>
                      <Text type="secondary">Configure the maintenance screen details before enabling. Staff can bypass this via /auth.</Text>
                    </div>
                    
                    <Form form={maintenanceForm} layout="vertical" disabled={isMaintenanceMode}>
                      <Row gutter={16}>
                        <Col span={12}>
                          <Form.Item name="maintenanceTitle" label="Title" initialValue="System Upgrade">
                            <Input placeholder="e.g. System Upgrade" />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item name="estimatedTime" label="Estimated Time" initialValue="~ 15 Minutes">
                            <Input placeholder="e.g. ~ 15 Minutes or 2:00 PM" />
                          </Form.Item>
                        </Col>
                      </Row>
                      <Form.Item name="maintenanceMessage" label="Message" initialValue="We are performing scheduled maintenance to bring you an even better, faster, and more secure Rentify experience. We'll be back shortly!">
                        <Input.TextArea rows={2} placeholder="Message displayed to users" />
                      </Form.Item>
                      <Form.Item name="progressStatus" label="Progress Status" initialValue="Upgrading Database...">
                        <Input placeholder="e.g. Upgrading Database..." />
                      </Form.Item>
                    </Form>
                    
                    <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                      <Button 
                        type={isMaintenanceMode ? "primary" : "default"} 
                        danger={!isMaintenanceMode} 
                        loading={maintenanceLoading}
                        onClick={handleToggleMaintenance}
                        size="large"
                      >
                        {isMaintenanceMode ? 'Disable Maintenance Mode' : 'Activate Maintenance Mode'}
                      </Button>
                    </div>
                  </Card>

                  {/* ========== FOUNDERS MANAGEMENT ========== */}
                  <Card 
                    title={<Space><Users size={18} /> Founders Management</Space>}
                    bordered={false} 
                    style={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                    extra={
                      <Button type="primary" icon={<Plus size={14} />} onClick={() => handleOpenFounderModal()} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Add Founder
                      </Button>
                    }
                  >
                    <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '14px' }}>
                      Manage the founders displayed on the About Us page. Add photos, names, roles, and descriptions.
                    </p>

                    {foundersLoading && founders.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '2rem' }}><Spin size="large" /></div>
                    ) : founders.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '3rem', background: '#f8fafc', borderRadius: '12px', border: '2px dashed #e2e8f0' }}>
                        <Users size={40} style={{ color: '#cbd5e1', marginBottom: '12px' }} />
                        <p style={{ color: '#94a3b8', margin: 0 }}>No founders added yet. Click "Add Founder" to get started.</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {founders.map((founder, idx) => (
                          <div key={idx} style={{ 
                            display: 'flex', 
                            gap: '16px', 
                            alignItems: 'center', 
                            padding: '16px', 
                            background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)', 
                            borderRadius: '12px', 
                            border: '1px solid #e2e8f0',
                            transition: 'box-shadow 0.2s',
                          }}>
                            <Avatar 
                              src={getImageUrl(founder.image)} 
                              size={72} 
                              style={{ 
                                flexShrink: 0, 
                                border: '3px solid #e2e8f0',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                              }} 
                            />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 700, fontSize: '16px', color: '#0f172a' }}>{founder.name || 'Untitled'}</div>
                              <div style={{ color: '#6366f1', fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>{founder.role || 'No role set'}</div>
                              <div style={{ color: '#64748b', fontSize: '13px', lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
                                {founder.description || 'No description'}
                              </div>
                            </div>
                            <Space direction="vertical" size={4} style={{ flexShrink: 0 }}>
                              <Button size="small" type="default" icon={<Edit2 size={13} />} onClick={() => handleOpenFounderModal(idx)}>Edit</Button>
                              <Button size="small" danger icon={<Trash2 size={13} />} onClick={() => handleDeleteFounder(idx)}>Delete</Button>
                            </Space>
                          </div>
                        ))}
                      </div>
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
              <Select.Option value="staff">STAFF</Select.Option>
              {user.role === 'superadmin' && <Select.Option value="admin">ADMIN</Select.Option>}
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

      

      {/* ADMIN VEHICLE DETAIL MODAL */}
      <Modal
        title="Vehicle Administrative View"
        open={adminVehicleModalOpen}
        onCancel={() => setAdminVehicleModalOpen(false)}
        footer={selectedAdminVehicle ? [
          <Button key="close" onClick={() => setAdminVehicleModalOpen(false)}>Close</Button>,
          ...((user?.role === 'superadmin' || user?.role === 'admin') ? [
            <Button key="delete" danger icon={<Trash2 size={14} />} onClick={() => {
              handleDeleteVehicle(selectedAdminVehicle);
              setAdminVehicleModalOpen(false);
            }}>Delete Vehicle</Button>
          ] : [])
        ] : null}
        width={700}
        destroyOnClose
      >
        {selectedAdminVehicle && (() => {
          const v = selectedAdminVehicle;
          const owner = typeof v.owner === 'object' ? v.owner : allUsers.find(u => (u._id || u.id) === v.owner);
          const vehicleBookings = allBookings.filter(b => typeof b.vehicle === 'object' ? b.vehicle._id === v._id : b.vehicle === v._id);
          
          return (
            <div style={{ padding: '10px 0' }}>
              <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                <Image src={getImageUrl(v.photos?.[0])} width={120} height={120} style={{ borderRadius: '8px', objectFit: 'cover' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Title level={4} style={{ margin: 0 }}>{v.title}</Title>
                    <Button type="primary" size="small" onClick={() => window.open(`/vehicles/${v._id}`, '_blank')}>
                      View Public Page
                    </Button>
                  </div>
                  <Text type="secondary">{v.make} {v.model} ({v.year}) - {v.district}</Text>
                  <div style={{ marginTop: '8px' }}>
                    <Tag color={v.status === 'active' ? 'green' : 'red'}>{v.status.toUpperCase()}</Tag>
                    <Tag color="blue">LKR {v.pricePerDay?.toLocaleString()}/day</Tag>
                  </div>
                </div>
              </div>

              <Divider orientation="left">Owner Information</Divider>
              {owner ? (
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', display: 'flex', gap: '16px' }}>
                  <Avatar src={getImageUrl((owner as any).profilePic)} size={50}>{(owner as any).name?.charAt(0)}</Avatar>
                  <div>
                    <Text strong>{(owner as any).name}</Text> <br/>
                    <Text type="secondary" style={{ fontSize: '13px' }}>{(owner as any).email} | {(owner as any).phone}</Text>
                    <div style={{ marginTop: '8px' }}>
                      <Tag color={(owner as any).isKycVerified ? 'success' : 'warning'}>KYC: {(owner as any).isKycVerified ? 'Verified' : 'Unverified'}</Tag>
                    </div>
                  </div>
                </div>
              ) : <Text type="secondary">Owner info not found</Text>}

              <Divider orientation="left">Booking History ({vehicleBookings.length})</Divider>
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {vehicleBookings.length > 0 ? (
                  <Table 
                    size="small"
                    pagination={false}
                    dataSource={vehicleBookings}
                    rowKey="_id"
                    columns={[
                      { title: 'Dates', render: (_, b) => <Text style={{fontSize: '12px'}}>{new Date(b.startDate).toLocaleDateString()} - {new Date(b.endDate).toLocaleDateString()}</Text> },
                      { title: 'Amount', render: (_, b) => <Text style={{fontSize: '12px'}}>LKR {b.totalAmount.toLocaleString()}</Text> },
                      { title: 'Status', render: (_, b) => <Tag style={{fontSize: '10px'}} color={b.status === 'CONFIRMED' ? 'green' : b.status === 'CANCELLED' ? 'red' : 'default'}>{b.status}</Tag> }
                    ]}
                  />
                ) : <Text type="secondary">No bookings for this vehicle yet.</Text>}
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ADMIN BOOKING DETAIL MODAL */}
      <Modal
        title="Booking Administrative View"
        open={adminBookingModalOpen}
        onCancel={() => setAdminBookingModalOpen(false)}
        footer={selectedAdminBooking ? [
          <Button key="close" onClick={() => setAdminBookingModalOpen(false)}>Close</Button>,
          ...(user?.role === 'superadmin' && (selectedAdminBooking.status === 'CONFIRMED' || selectedAdminBooking.status === 'PENDING') ? [
            <Button key="cancel" danger onClick={() => {
              handleCancelBooking(selectedAdminBooking);
              setAdminBookingModalOpen(false);
            }}>Force Cancel Booking</Button>
          ] : [])
        ] : null}
        width={600}
        destroyOnClose
      >
        {selectedAdminBooking && (() => {
          const b = selectedAdminBooking;
          const renter = typeof b.user === 'object' ? b.user as User : null;
          const owner = typeof b.owner === 'object' ? b.owner as User : null;
          const vehicle = typeof b.vehicle === 'object' ? b.vehicle as Vehicle : null;

          return (
            <div style={{ padding: '10px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <Text strong style={{ fontSize: '16px' }}>Reference: #{b._id}</Text>
                <Tag color={b.status === 'CONFIRMED' ? 'green' : b.status === 'CANCELLED' ? 'red' : 'orange'}>{b.status}</Tag>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <Card size="small" title="Renter Info" style={{ background: '#f8fafc' }}>
                  {renter ? (
                    <>
                      <Text strong>{renter.name}</Text><br/>
                      <Text type="secondary" style={{fontSize: '12px'}}>{renter.email}</Text><br/>
                      <Text type="secondary" style={{fontSize: '12px'}}>{renter.phone}</Text>
                    </>
                  ) : 'Unknown'}
                </Card>
                <Card size="small" title="Owner Info" style={{ background: '#f8fafc' }}>
                  {owner ? (
                    <>
                      <Text strong>{owner.name}</Text><br/>
                      <Text type="secondary" style={{fontSize: '12px'}}>{owner.email}</Text><br/>
                      <Text type="secondary" style={{fontSize: '12px'}}>{owner.phone}</Text>
                    </>
                  ) : 'Unknown'}
                </Card>
              </div>

              <Card size="small" title="Vehicle & Trip Details" style={{ marginBottom: '24px' }}>
                {vehicle && (
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
                    <Avatar src={getImageUrl(vehicle.photos?.[0])} shape="square" size={50} />
                    <div>
                      <Text strong>{vehicle.title}</Text><br/>
                      <Text type="secondary" style={{fontSize: '12px'}}>{vehicle.district}</Text>
                    </div>
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', background: '#f1f5f9', padding: '12px', borderRadius: '8px' }}>
                  <div>
                    <Text type="secondary" style={{fontSize: '10px'}}>START</Text><br/>
                    <Text strong style={{fontSize: '13px'}}>{new Date(b.startDate).toLocaleDateString()}</Text>
                  </div>
                  <div>
                    <Text type="secondary" style={{fontSize: '10px'}}>END</Text><br/>
                    <Text strong style={{fontSize: '13px'}}>{new Date(b.endDate).toLocaleDateString()}</Text>
                  </div>
                  <div>
                    <Text type="secondary" style={{fontSize: '10px'}}>PAYOUT</Text><br/>
                    <Text strong style={{color: '#16a34a'}}>LKR {b.totalAmount.toLocaleString()}</Text>
                  </div>
                </div>
              </Card>

              {b.cancellationReason && (
                <Alert type="error" message="Cancellation Reason" description={b.cancellationReason} showIcon />
              )}
            </div>
          );
        })()}
      </Modal>

      {/* ADD / EDIT FOUNDER MODAL */}
      <Modal
        title={editingFounderIndex !== null ? 'Edit Founder' : 'Add New Founder'}
        open={founderModalOpen}
        onCancel={() => setFounderModalOpen(false)}
        onOk={() => founderForm.submit()}
        confirmLoading={foundersLoading}
        okText={editingFounderIndex !== null ? 'Save Changes' : 'Add Founder'}
        destroyOnClose
      >
        <Form form={founderForm} layout="vertical" onFinish={handleSaveFounder}>
          <Form.Item name="name" label="Founder Name" rules={[{ required: true, message: 'Please enter founder name' }]}>
            <Input size="large" placeholder="e.g. John Doe" />
          </Form.Item>
          <Form.Item name="role" label="Role / Title" rules={[{ required: true, message: 'Please enter role' }]}>
            <Input size="large" placeholder="e.g. CEO & Co-Founder" />
          </Form.Item>
          <Form.Item name="description" label="Description / Bio" rules={[{ required: true, message: 'Please enter description' }]}>
            <Input.TextArea rows={4} placeholder="Brief description about this founder..." />
          </Form.Item>
          <Form.Item label="Profile Photo">
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {(founderImagePreview || founderImageFile) && (
                <Avatar 
                  src={founderImageFile ? URL.createObjectURL(founderImageFile) : founderImagePreview} 
                  size={80} 
                  style={{ border: '3px solid #e2e8f0' }} 
                />
              )}
              <div>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setFounderImageFile(file);
                      setFounderImagePreview('');
                    }
                  }}
                  style={{ fontSize: '13px' }}
                />
                <p style={{ color: '#94a3b8', fontSize: '12px', margin: '4px 0 0' }}>
                  JPEG, PNG, or WebP. Max 5MB.
                </p>
              </div>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* USER VEHICLES MODAL */}
      <Modal
        title={`Vehicles for ${userVehiclesUser?.name}`}
        open={userVehiclesModalOpen}
        onCancel={() => setUserVehiclesModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setUserVehiclesModalOpen(false)}>Close</Button>,
          <Button key="list-new" type="primary" icon={<Plus size={14} />} onClick={() => {
            setUserVehiclesModalOpen(false);
            if (userVehiclesUser) navigate(`/list-vehicle?forUser=${userVehiclesUser._id || userVehiclesUser.id}`);
          }}>
            List New Vehicle
          </Button>
        ]}
        width={700}
        destroyOnClose
      >
        <div style={{ padding: '10px 0' }}>
          {userVehiclesLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}><Spin size="large" /></div>
          ) : userVehicles.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <Text type="secondary">This user has no vehicles listed.</Text>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {userVehicles.map(v => (
                <div key={v._id} style={{ display: 'flex', gap: '16px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <Image src={getImageUrl(v.photos?.[0])} width={80} height={80} style={{ borderRadius: '6px', objectFit: 'cover' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text strong>{v.title}</Text>
                      <Tag color={v.status === 'active' ? 'green' : v.status === 'pending' ? 'orange' : 'red'}>{v.status.toUpperCase()}</Tag>
                    </div>
                    <Text type="secondary" style={{ fontSize: '13px' }}>{v.make} {v.model} ({v.year})</Text>
                    <div style={{ marginTop: '4px', display: 'flex', gap: '8px' }}>
                      <Tag color="green" icon={<Phone size={12} style={{marginRight: 4}} />}>{v.callClicks || 0} Calls</Tag>
                      <Tag color="green" icon={<MessageSquare size={12} style={{marginRight: 4}} />}>{v.whatsappClicks || 0} WhatsApp</Tag>
                    </div>
                    <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text strong style={{ color: '#1890ff' }}>LKR {v.pricePerDay?.toLocaleString()}/day</Text>
                      <Space>
                        <Button size="small" onClick={() => window.open(`/vehicles/${v._id}`, '_blank')}>View Public</Button>
                      </Space>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

    </Layout>
  );
}

