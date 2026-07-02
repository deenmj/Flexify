import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { adminApi, bankDetailsApi, feedbackApi, settingsApi, getImageUrl, type AdminStats, type Vehicle, type User, type Booking, type AuditLog, type BankDetailsData, type Founder } from '../api';
import { Users, Car, Calendar, DollarSign, CheckCircle, Eye, LogOut, ArrowLeft, Edit2, Trash2, History, TrendingUp, MapPin, Landmark, ShieldAlert, Ban, FileText, MessageSquare, Menu as MenuIcon, Star, XCircle, Plus, Upload as UploadIcon } from 'lucide-react';
import { Tag, Tooltip, Typography, Select, Card, Statistic, Spin, Layout, Menu, Button, Avatar, Space, Dropdown, Form, Input, message, Modal, Row, Col, Divider, Drawer, Grid, Image, Alert } from 'antd';
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

export default function SuperAdminDashboard() {
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
  const [kycUser, setKycUser] = useState<User | null>(null);
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [editForm] = Form.useForm();
  const [roleForm] = Form.useForm();
  const [maintenanceForm] = Form.useForm();

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

  const handleDeleteKyc = async (u: User) => {
    const id = (u.id || u._id)!;
    let reason = '';
    Modal.confirm({
      title: 'Delete User KYC Data',
      content: (
        <div style={{ marginTop: '16px' }}>
          <p style={{ marginBottom: '12px' }}>Are you sure you want to permanently delete KYC documents for {u.name}? This will reset their verification status.</p>
          <Input.TextArea 
            placeholder="Reason for deletion (e.g., Fraudulent documents, expired ID)"
            onChange={(e) => { reason = e.target.value; }}
            rows={3}
          />
        </div>
      ),
      okText: 'Delete KYC',
      okType: 'danger',
      onOk: async () => {
        try {
          setActionLoadingId(id);
          await adminApi.deleteUserKyc(id, reason);
          setAllUsers((prev: User[]) => prev.map(usr => (usr.id || usr._id) === id ? { ...usr, verificationStatus: 'not_submitted', isKycVerified: false, documents: undefined } : usr));
          setKycUser(null);
          setIsKycModalOpen(false);
          message.success('User KYC data deleted successfully');
        } catch (err: any) {
          message.error(err.message || 'Failed to delete KYC data');
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
    if (tab === 'platform-settings') {
      settingsApi.getMaintenanceMode()
        .then(res => {
          setIsMaintenanceMode(res.isMaintenanceMode);
          maintenanceForm.setFieldsValue(res);
        })
        .catch(err => console.error(err));
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

  if (!user || user.role !== 'superadmin' || user.email?.toLowerCase() !== 'admin@rentify.lk') {
    return <div className="container" style={{ padding: '6rem 2rem', textAlign: 'center' }}><h2>CEO Master access required</h2></div>;
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
            backgroundColor: '#1e3a8a'
          }}
        >
          <div style={{ padding: '24px 16px', color: 'white', textAlign: 'center', fontSize: '1.25rem', fontWeight: 800, letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '16px' }}>
            {collapsed ? 'CEO' : 'Rentify CEO Master'}
          </div>
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[tab]}
            onClick={({ key }) => setTab(key as any)}
            items={[
              { key: 'overview', icon: <Eye size={18} />, label: 'Overview' },
              { key: 'financials', icon: <DollarSign size={18} />, label: 'Revenue & Commission', style: { color: '#b8860b' } },
              { key: 'staff-management', icon: <Users size={18} />, label: 'Staff Management', style: { color: '#b8860b' } },
              { key: 'users', icon: <Users size={18} />, label: `Users (${allUsers.length})` },
              { key: 'vehicles', icon: <Car size={18} />, label: `Vehicles (${allVehicles.length})` },
              { key: 'bookings', icon: <Calendar size={18} />, label: `Bookings (${allBookings.length})` },
              { key: 'bank-settings', icon: <Landmark size={18} />, label: `Bank Settings` },
              { key: 'site-settings', icon: <Edit2 size={18} />, label: `Site Settings` },
              { key: 'platform-settings', icon: <Edit2 size={18} />, label: 'Platform Settings', style: { color: '#b8860b' } },
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
            Rentify CEO Master
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
              { key: 'financials', icon: <DollarSign size={18} />, label: 'Revenue & Commission', style: { color: '#b8860b' } },
              { key: 'staff-management', icon: <Users size={18} />, label: 'Staff Management', style: { color: '#b8860b' } },
              { key: 'users', icon: <Users size={18} />, label: 'Users' },
              { key: 'vehicles', icon: <Car size={18} />, label: 'Vehicles' },
              { key: 'bookings', icon: <Calendar size={18} />, label: 'Bookings' },
              { key: 'bank-settings', icon: <Landmark size={18} />, label: 'Bank Settings' },
              { key: 'site-settings', icon: <Edit2 size={18} />, label: 'Site Settings' },
              { key: 'platform-settings', icon: <Edit2 size={18} />, label: 'Platform Settings', style: { color: '#b8860b' } },
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
                <Avatar style={{ backgroundColor: '#b8860b' }}>CEO</Avatar>
                {!isMobile && <Text strong style={{ color: '#334155' }}>Master CEO</Text>}
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

              {tab === 'financials' && (
                <div className="animate-fade-in">
                  <Title level={5} style={{ marginBottom: '1.5rem', color: '#b8860b' }}>Global Revenue & Commission</Title>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                    <Card size="small" style={{ borderRadius: '12px', background: 'linear-gradient(to right, #fef3c7, #fffbeb)' }} bordered={false}>
                      <Statistic
                        title="Commissions Invoiced"
                        value={1200000}
                        prefix={<span style={{ fontWeight: 'bold', color: '#d97706', marginRight: 8 }}>LKR</span>}
                      />
                    </Card>
                    <Card size="small" style={{ borderRadius: '12px', background: 'linear-gradient(to right, #dcfce7, #f0fdf4)' }} bordered={false}>
                      <Statistic
                        title="Commissions Paid"
                        value={1100000}
                        prefix={<span style={{ fontWeight: 'bold', color: '#16a34a', marginRight: 8 }}>LKR</span>}
                      />
                    </Card>
                    <Card size="small" style={{ borderRadius: '12px', background: 'linear-gradient(to right, #e0e7ff, #eef2ff)' }} bordered={false}>
                      <Statistic
                        title="Rental Fees"
                        value={3800000}
                        prefix={<span style={{ fontWeight: 'bold', color: '#4f46e5', marginRight: 8 }}>LKR</span>}
                      />
                    </Card>
                    <Card size="small" style={{ borderRadius: '12px', background: 'linear-gradient(to right, #fce7f3, #fdf2f8)' }} bordered={false}>
                      <Statistic
                        title="Global Profit"
                        value={5000000}
                        prefix={<span style={{ fontWeight: 'bold', color: '#db2777', marginRight: 8 }}>LKR</span>}
                      />
                    </Card>
                  </div>
                </div>
              )}

              {tab === 'staff-management' && (
                <div className="animate-fade-in">
                  <Title level={5} style={{ marginBottom: '1.5rem', color: '#b8860b' }}>Internal Staff Management</Title>
                  <Card bordered={false} style={{ borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                    <Text type="secondary">This section allows the CEO to view and manage internal staff members (managers, supervisors, staff).</Text>
                    {/* Placeholder for staff table */}
                    <div style={{ marginTop: '2rem', padding: '2rem', textAlign: 'center', background: '#f8fafc', borderRadius: '8px' }}>
                      <Users size={48} color="#94a3b8" style={{ marginBottom: '1rem' }} />
                      <p>Staff data will be loaded here...</p>
                    </div>
                  </Card>
                </div>
              )}

              {tab === 'platform-settings' && (
                <div className="animate-fade-in">
                  <Title level={5} style={{ marginBottom: '1.5rem', color: '#b8860b' }}>Master Configuration</Title>
                  <Card bordered={false} style={{ borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                    <div style={{ marginBottom: '1.5rem', paddingBottom: '16px', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ marginBottom: '1rem' }}>
                        <h4 style={{ margin: 0 }}>Maintenance Mode</h4>
                        <Text type="secondary">Toggle platform access for all public users.</Text>
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

                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                        <Button 
                          type={isMaintenanceMode ? "primary" : "default"} 
                          danger={!isMaintenanceMode} 
                          loading={maintenanceLoading}
                          onClick={handleToggleMaintenance}
                        >
                          {isMaintenanceMode ? 'Disable Maintenance Mode' : 'Activate Maintenance Mode'}
                        </Button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <div>
                        <h4 style={{ margin: 0 }}>Global Sales Commission</h4>
                        <Text type="secondary">Set the base commission % for all rentals.</Text>
                      </div>
                      <Button type="primary" style={{ background: '#b8860b' }}>Configure (15%)</Button>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0' }}>
                      <div>
                        <h4 style={{ margin: 0 }}>Corporate Partners</h4>
                        <Text type="secondary">Manage enterprise rental partnerships.</Text>
                      </div>
                      <Button type="primary" style={{ background: '#b8860b' }}>Manage Partners</Button>
                    </div>
                  </Card>
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
                          const isSuper = user.role === 'admin';
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
                      { title: 'Dates', render: (_, b) => <Text style={{ fontSize: '13px' }}>{b.startDate ? new Date(b.startDate).toLocaleDateString() : 'N/A'} — {b.endDate ? new Date(b.endDate).toLocaleDateString() : 'N/A'}</Text> },
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
          kycUser && (
            <Button key="delete" danger onClick={() => handleDeleteKyc(kycUser)} style={{ float: 'left' }}>
              Delete Entire KYC Data
            </Button>
          ),
          <Button key="close" onClick={() => setIsKycModalOpen(false)}>Close</Button>
        ]}
      >
        {kycUser ? (
          <div style={{ padding: '1rem' }}>
            <Row gutter={[16, 24]}>
              <Col span={12}>
                <Card size="small" title="Driving License">
                  {kycUser.documents?.license ? <Image src={getImageUrl(kycUser.documents.license)} style={{ width: '100%', height: '200px', objectFit: 'contain' }} /> : <div style={{ width: '100%', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', color: '#94a3b8', fontSize: '0.9rem' }}>No document provided</div>}
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" title="Profile Photo">
                  {kycUser.documents?.selfie ? <Image src={getImageUrl(kycUser.documents.selfie)} style={{ width: '100%', height: '200px', objectFit: 'contain' }} /> : <div style={{ width: '100%', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', color: '#94a3b8', fontSize: '0.9rem' }}>No document provided</div>}
                </Card>
              </Col>
            </Row>
            <Divider />
            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
              <div style={{ marginBottom: '1rem' }}>
                <Text strong style={{ display: 'block', marginBottom: '0.5rem', color: '#334155' }}>ID / License Number</Text>
                <Text style={{ color: '#64748b' }}>{(kycUser.documents as any)?.idNumber || 'Not provided'}</Text>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <Text strong style={{ display: 'block', marginBottom: '0.5rem', color: '#334155' }}>Phone Number</Text>
                <Text style={{ color: '#64748b' }}>{(kycUser.documents as any)?.phone || kycUser.phone || 'Not provided'}</Text>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <Text strong style={{ display: 'block', marginBottom: '0.5rem', color: '#334155' }}>Residential Address</Text>
                <Text style={{ color: '#64748b' }}>{kycUser.documents?.address || 'Not provided'}</Text>
              </div>
              <div>
                <Text strong style={{ display: 'block', marginBottom: '0.5rem', color: '#334155' }}>Verification Status</Text>
                <Tag color={kycUser.isKycVerified ? 'success' : 'warning'}>{kycUser.verificationStatus?.toUpperCase()}</Tag>
              </div>
            </div>
          </div>
        ) : <Spin />}
      </Modal>

      {/* ADMIN VEHICLE DETAIL MODAL */}
      <Modal
        title="Vehicle Administrative View"
        open={adminVehicleModalOpen}
        onCancel={() => setAdminVehicleModalOpen(false)}
        footer={selectedAdminVehicle ? [
          <Button key="close" onClick={() => setAdminVehicleModalOpen(false)}>Close</Button>,
          ...(user?.role === 'superadmin' ? [
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

    </Layout>
  );
}
