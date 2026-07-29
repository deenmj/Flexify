import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { Modal, message, Tag, Button, Form, Input, Rate, Image, Avatar, Spin } from 'antd';
import { vehicleApi, bookingApi, userApi, reviewApi, salesApi, type Vehicle, type Booking, getImageUrl, getVehicleSlug } from '../api';
import {
  Car, Calendar as CalIcon, CheckCircle, XCircle,
  Clock, Eye, Phone, Shield, AlertTriangle,
  MessageSquare, Info, User, Users, FileText, Compass, Heart, Lock
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useIsMobile } from '../hooks/useIsMobile';
import SEO from '../components/SEO';
import AddVehicleSale from '../components/AddVehicleSale';
import { Tag as AntTag } from 'antd';
import './Dashboard.css';

dayjs.extend(isBetween);

export default function Dashboard() {
  const { user, setUser } = useAuth();
  const { socket } = useSocket();
  const isMobile = useIsMobile();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [wishlistSubTab, setWishlistSubTab] = useState<'rent' | 'buy'>('rent');
  const [searchParams] = useSearchParams();
  const [activeSales, setActiveSales] = useState<any[]>([]);
  const [isAddVehicleModalOpen, setIsAddVehicleModalOpen] = useState(false);
  const [editingVehicleSale, setEditingVehicleSale] = useState<any>(null);
  const [tab, setTab] = useState<'vehicles' | 'wishlist' | 'sales'>(() => {
    const urlTab = searchParams.get('tab');
    if (urlTab === 'wishlist') return 'wishlist';
    if (urlTab === 'sales') return 'sales';
    return user?.role === 'user' ? 'wishlist' : 'vehicles';
  });
  const selectedCategory = 'All';

  const navigate = useNavigate();

  const handleRequestSalesAccess = async () => {
    try {
      const res = await userApi.requestSalesAccess();
      message.success(res.message);
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      message.error(err.message || 'Failed to request access');
    }
  };

  const handleVehicleClick = (v: Vehicle) => {
    navigate(`/dashboard/vehicle/${v._id}`);
  };

  // Highlight logic from URL
  useEffect(() => {
    const targetTab = searchParams.get('tab');

    if (targetTab === 'wishlist') {
      setTab('wishlist');
    } else if (targetTab === 'vehicles' && (vehicles.length > 0 || user?.role === 'admin')) {
      setTab('vehicles');
    } else if (targetTab === 'sales') {
      setTab('sales');
      if (searchParams.get('openAdd') === 'true') {
        setIsAddVehicleModalOpen(true);
      }
    }
  }, [searchParams, user?.role]);

  const handleRefreshData = async () => {
    try {
      const v = await vehicleApi.getMy().catch(() => []);
      const s = user?.role === 'owner' ? await salesApi.getStaffActiveSales().catch(() => []) : [];
      setVehicles(v as Vehicle[]);
      setActiveSales(s);
    } catch (err) {
      console.error("Failed to refresh dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleRefreshData();
  }, [user]);




  if (!user) return <div className="container" style={{ padding: '6rem 2rem', textAlign: 'center' }}><h2>Please sign in</h2></div>;

  // Staff (subadmin) behaves like a verified owner in the dashboard
  const isStaff = user.role === 'subadmin';
  const isOwner = user.role === 'owner' || isStaff;

  const vehicleStatusBadge = (status: string, isActive: boolean) => {
    if (status === 'pending') return <Tag color="warning" icon={<Clock size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />}>Pending</Tag>;
    if (status === 'rejected') return <Tag color="error" icon={<XCircle size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />}>Rejected</Tag>;
    if (!isActive) return <Tag color="error">Hidden</Tag>;
    return <Tag color="success">Active</Tag>;
  };



  const handleRemoveRentWishlist = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      if (user) {
        setUser({ ...user, rentWishlist: (user.rentWishlist || []).filter((v: any) => v._id !== id) });
        await userApi.toggleWishlistRent(id);
        message.success('Removed from rental wishlist');
      }
    } catch (err) {
      console.error('Failed to remove from wishlist', err);
    }
  };

  const handleRemoveSaleWishlist = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      if (user) {
        setUser({ ...user, saleWishlist: (user.saleWishlist || []).filter((v: any) => v._id !== id) });
        await userApi.toggleWishlistSale(id);
        message.success('Removed from sales wishlist');
      }
    } catch (err) {
      console.error('Failed to remove from wishlist', err);
    }
  };

  console.log('Wishlist Data:', user?.rentWishlist, user?.saleWishlist);

  return (
    <div className="dashboard-page page-wrapper" style={{ minHeight: '100vh', background: 'var(--bg-secondary)' }}>
      <SEO
        title="My Dashboard — Manage Vehicles & Bookings | Rentify"
        description="Manage your vehicle listings, bookings, and earnings on Rentify.lk."
        noindex={true}
      />

      <div className="container" style={{ paddingTop: isMobile ? '1rem' : '2rem', marginBottom: isMobile ? '1.5rem' : '3rem' }}>



        {/* Verification reminder — only for renters who haven't uploaded docs. 
             This is just a HINT, NOT a blocker — dashboard is fully accessible without KYC */}
        {user.verificationStatus === 'not_submitted' && !isStaff && user.role === 'user' && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '0.75rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem', borderRadius: '12px' }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <Shield size={18} color="#d97706" />
              <p style={{ color: '#92400e', fontSize: '0.875rem', margin: 0 }}>
                <strong>Tip:</strong> Complete one-time verification to book vehicles. You can still browse and manage everything here.
              </p>
            </div>
            <Link to="/verify" className="btn btn-sm" style={{ background: '#f59e0b', color: 'white', border: 'none', padding: '6px 16px', borderRadius: '8px', fontWeight: 600, fontSize: '0.8rem', whiteSpace: 'nowrap' }}>Verify Now</Link>
          </div>
        )}

        {/* Tabs - Navigation */}
        <div className="dashboard-nav">
          {user.role === 'user' && vehicles.length === 0 ? (
            <>
              <button
                className={`nav-item ${tab === 'wishlist' ? 'active' : ''}`}
                onClick={() => setTab('wishlist')}
              >
                <Heart size={16} /> Wishlist
              </button>
            </>
          ) : (
            <>
              {(user?.role === 'owner' || isStaff) && (
                <>
                  <button
                    className={`nav-item ${tab === 'vehicles' ? 'active' : ''}`}
                    onClick={() => setTab('vehicles')}
                  >
                    <Car size={16} /> My Vehicles
                  </button>
                  <Link to="/staff?tab=manage-sales" className="nav-item" style={{ color: 'inherit', textDecoration: 'none' }}>
                    <Tag size={16} /> My Sales
                  </Link>
                </>
              )}
              <button
                className={`nav-item ${tab === 'wishlist' ? 'active' : ''}`}
                onClick={() => setTab('wishlist')}
              >
                <Heart size={16} /> Wishlist
              </button>
            </>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '5rem 0' }}>
            <Spin size="large" />
            <p style={{ marginTop: '1rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>Fetching details...</p>
          </div>
        ) : tab === 'vehicles' ? (
          <div className="dashboard-box">
            <div className="dashboard-box-header" style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <h3 className="dashboard-box-title" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>My Vehicles</h3>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                {/* Rent Section */}
                {(isStaff || user.role === 'admin' || user.role === 'superadmin' || (user?.rentVerificationStatus === 'approved' || user?.verificationStatus === 'approved')) ? (
                  <Link to="/list-vehicle" className="btn btn-primary" style={{ padding: '0.6rem 1.5rem', borderRadius: '12px', fontWeight: 700 }}>
                    <Car size={18} style={{ marginRight: '8px' }} /> List for Rent
                  </Link>
                ) : (
                  <Link to="/verify?type=rent" className="btn btn-secondary" style={{ padding: '0.6rem 1.5rem', borderRadius: '12px', fontWeight: 700, opacity: 0.7 }}>
                    <Lock size={18} style={{ marginRight: '8px' }} /> Rent KYC
                  </Link>
                )}

                {/* Sales Section */}
                {(isStaff || user.role === 'admin' || user.role === 'superadmin' || user?.hasSalesAccess === true) ? (
                  <button onClick={() => { setTab('sales'); setIsAddVehicleModalOpen(true); }} className="btn btn-primary" style={{ padding: '0.6rem 1.5rem', borderRadius: '12px', fontWeight: 700, background: '#10b981', borderColor: '#10b981' }}>
                    <Tag size={18} style={{ marginRight: '8px' }} /> List for Sale
                  </button>
                ) : (user?.salesRequestStatus === 'pending' ? (
                  <button disabled className="btn btn-secondary" style={{ padding: '0.6rem 1.5rem', borderRadius: '12px', fontWeight: 700, opacity: 0.7, cursor: 'not-allowed' }}>
                    <Lock size={18} style={{ marginRight: '8px' }} /> Request Pending
                  </button>
                ) : (
                  <button onClick={handleRequestSalesAccess} className="btn btn-secondary" style={{ padding: '0.6rem 1.5rem', borderRadius: '12px', fontWeight: 700 }}>
                    <Lock size={18} style={{ marginRight: '8px' }} /> Request Sales Access
                  </button>
                ))}
              </div>
            </div>

            {filteredVehicles.length === 0 ? (
              <div className="dashboard-empty" style={{ padding: '5rem 2rem', textAlign: 'center', background: '#fafafa', borderRadius: '0 0 20px 20px' }}>
                <div style={{ background: '#f8fafc', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', border: '1px solid #e2e8f0' }}>
                  <Car size={40} strokeWidth={1.5} color="#94a3b8" />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                  {vehicles.length === 0 ? "You haven't listed any vehicles yet" : `No ${selectedCategory}s found`}
                </h3>
                <p style={{ color: 'var(--text-tertiary)', marginBottom: '2rem', maxWidth: '300px', margin: '0 auto 2rem' }}>
                  Start earning today by sharing your vehicle with the Rentify community.
                </p>
                {vehicles.length === 0 && (
                  (isStaff || user.role === 'admin' || user.role === 'superadmin' || (user?.rentVerificationStatus === 'approved' || user?.verificationStatus === 'approved')) ? (
                    <Link to="/list-vehicle" className="btn btn-primary" style={{ padding: '12px 32px' }}>
                      <Car size={18} style={{ marginRight: '8px' }} /> List Your First Vehicle
                    </Link>
                  ) : (
                    <Link to="/verify?type=rent" className="btn btn-secondary" style={{ padding: '12px 32px', background: '#e2e8f0', color: '#475569', border: 'none' }}>
                      <Lock size={18} style={{ marginRight: '8px' }} /> Verify to List Vehicle
                    </Link>
                  )
                )}
              </div>
            ) : (
              <div className="dashboard-grid">
                {filteredVehicles.map(v => (
                  <div key={v._id} className="dash-vehicle-card" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column' }} onClick={() => handleVehicleClick(v)}>
                    <div className="dash-vehicle-card-img">
                      {v.photos?.[0] ? (
                        <img src={getImageUrl(v.photos[0])} alt={v.title} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9' }}>
                          <Car size={32} color="#cbd5e1" />
                        </div>
                      )}
                      <div className="dash-vehicle-card-status">
                        {vehicleStatusBadge(v.status, v.isActive)}
                      </div>
                    </div>
                    <div className="dash-vehicle-card-body">
                      <div style={{ textTransform: 'uppercase', fontSize: isMobile ? '0.575rem' : '0.7rem', fontWeight: 800, color: 'var(--color-primary)', marginBottom: '2px', letterSpacing: '0.04em' }}>
                        {v.serviceType?.[0] || 'Vehicle'}
                      </div>
                      <h4 className="dash-vehicle-card-title">{v.title}</h4>
                      <div className="dash-vehicle-card-meta">{v.make} {v.model}</div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                        <div className="dash-vehicle-card-price">LKR {v.pricePerDay.toLocaleString()}<span style={{ fontSize: isMobile ? '0.6rem' : '0.75rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>/day</span></div>
                      </div>
                      <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f0fdf4', color: '#166534', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>
                          <Phone size={12} /> {v.callClicks || 0} Calls
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f0fdf4', color: '#166534', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>
                          <MessageSquare size={12} /> {v.whatsappClicks || 0} WhatsApp
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : tab === 'sales' ? (
          <div className="dashboard-box">
            <div className="dashboard-box-header" style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <h3 className="dashboard-box-title" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>My Sales</h3>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                {(isStaff || user.role === 'admin' || user.role === 'superadmin' || user?.hasSalesAccess === true) ? (
                  <button onClick={() => setIsAddVehicleModalOpen(true)} className="btn btn-primary" style={{ padding: '0.6rem 1.5rem', borderRadius: '12px', fontWeight: 700, background: '#10b981', borderColor: '#10b981' }}>
                    <Tag size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> List for Sale
                  </button>
                ) : (
                  <Link to="/verify?type=sales" className="btn btn-secondary" style={{ padding: '0.6rem 1.5rem', borderRadius: '12px', fontWeight: 700, opacity: 0.7 }}>
                    <Lock size={18} style={{ marginRight: '8px' }} /> Sales KYC
                  </Link>
                )}
              </div>
            </div>

            {activeSales.length === 0 ? (
              <div className="dashboard-empty" style={{ padding: '5rem 2rem', textAlign: 'center', background: '#fafafa', borderRadius: '0 0 20px 20px' }}>
                <div style={{ background: '#f8fafc', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', border: '1px solid #e2e8f0' }}>
                  <Tag size={40} strokeWidth={1.5} color="#94a3b8" />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                  You haven't listed any vehicles for sale yet
                </h3>
                <p style={{ color: 'var(--text-tertiary)', marginBottom: '2rem', maxWidth: '300px', margin: '0 auto 2rem' }}>
                  Start earning today by selling your vehicle on the Rentify platform.
                </p>
                {activeSales.length === 0 && (
                  (isStaff || user.role === 'admin' || user.role === 'superadmin' || user?.hasSalesAccess === true) ? (
                    <button onClick={() => setIsAddVehicleModalOpen(true)} className="btn btn-primary" style={{ padding: '12px 32px', background: '#10b981', borderColor: '#10b981' }}>
                      <Tag size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> List Your First Vehicle for Sale
                    </button>
                  ) : (user?.salesRequestStatus === 'pending' ? (
                    <button disabled className="btn btn-secondary" style={{ padding: '12px 32px', background: '#e2e8f0', color: '#475569', border: 'none', opacity: 0.7, cursor: 'not-allowed' }}>
                      <Lock size={18} style={{ marginRight: '8px' }} /> Request Pending
                    </button>
                  ) : (
                    <button onClick={handleRequestSalesAccess} className="btn btn-secondary" style={{ padding: '12px 32px', background: '#e2e8f0', color: '#475569', border: 'none' }}>
                      <Lock size={18} style={{ marginRight: '8px' }} /> Request Sales Access
                    </button>
                  ))
                )}
              </div>
            ) : (
              <div className="dashboard-grid">
                {activeSales.map(v => (
                  <div key={v._id} className="dash-vehicle-card" style={{ display: 'flex', flexDirection: 'column' }}>
                    <div className="dash-vehicle-card-img">
                      {v.photos?.[0] ? (
                        <img src={getImageUrl(v.photos[0])} alt={v.title} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9' }}>
                          <Car size={32} color="#cbd5e1" />
                        </div>
                      )}
                      <div className="dash-vehicle-card-status">
                        <AntTag color={v.status === 'Available' ? 'green' : v.status === 'New' ? 'cyan' : 'red'}>{v.status}</AntTag>
                      </div>
                    </div>
                    <div className="dash-vehicle-card-body">
                      <div style={{ textTransform: 'uppercase', fontSize: isMobile ? '0.575rem' : '0.7rem', fontWeight: 800, color: '#10b981', marginBottom: '2px', letterSpacing: '0.04em' }}>
                        Vehicle Sale
                      </div>
                      <h4 className="dash-vehicle-card-title">{v.title}</h4>
                      <div className="dash-vehicle-card-meta">{v.make} {v.model} ({v.year})</div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                        <div className="dash-vehicle-card-price">LKR {v.askingPrice?.toLocaleString()}</div>
                      </div>
                      <div style={{ marginTop: '1rem', display: 'flex', gap: '8px' }}>
                        <Button onClick={() => { setEditingVehicleSale(v); setIsAddVehicleModalOpen(true); }} style={{ flex: 1, borderRadius: '8px' }}>
                          Edit Listing
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : tab === 'bookings' ? (
          <div className="dashboard-box">
            <div className="dashboard-box-header" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
              <h3 className="dashboard-box-title" style={{ marginBottom: '1rem' }}>
                {user.role === 'user' ? 'My Trip History' : bookingType === 'received' ? 'Manage Bookings' : 'My Trips'}
              </h3>

              {/* Booking Filters */}
              <div className="dashboard-nav" style={{ marginBottom: 0 }}>
                <button
                  className={`nav-item ${bookingFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setBookingFilter('all')}
                >
                  All
                </button>
                <button
                  className={`nav-item ${bookingFilter === 'pending' ? 'active' : ''}`}
                  onClick={() => setBookingFilter('pending')}
                >
                  Pending
                </button>
                <button
                  className={`nav-item ${bookingFilter === 'confirmed' ? 'active' : ''}`}
                  onClick={() => setBookingFilter('confirmed')}
                >
                  Confirmed
                </button>
                <button
                  className={`nav-item ${bookingFilter === 'past' ? 'active' : ''}`}
                  onClick={() => setBookingFilter('past')}
                >
                  Past
                </button>
              </div>
            </div>

            {filteredBookings.length === 0 ? (
              <div className="dashboard-empty" style={{ padding: '5rem 2rem', textAlign: 'center' }}>
                <div style={{ background: '#f8fafc', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', border: '1px solid #e2e8f0' }}>
                  <CalIcon size={40} strokeWidth={1.5} color="#94a3b8" />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                  No {bookingFilter !== 'all' ? bookingFilter : ''} bookings found
                </h3>
                <p style={{ color: 'var(--text-tertiary)', marginBottom: '2rem' }}>
                  When you have bookings, they will appear here.
                </p>
                {user.role === 'user' && (
                  <Link to="/explore" className="btn btn-primary" style={{ padding: '12px 32px' }}>
                    <Car size={18} style={{ marginRight: '8px' }} /> Explore Vehicles
                  </Link>
                )}
              </div>
            ) : (
              <div className="booking-cards-container">
                {filteredBookings.map(b => {
                  const vehicle = typeof b.vehicle === 'object' ? b.vehicle : null;
                  const bOwnerId = String(typeof b.owner === 'object' ? (b.owner as any)?._id || (b.owner as any)?.id : b.owner);
                  const bRenterId = String(typeof b.user === 'object' ? (b.user as any)?._id || (b.user as any)?.id : b.user);
                  const myId = String(user?._id || user?.id || '');

                  const isIamRenterOfThis = myId === bRenterId;
                  const isIamOwnerOfThis = myId === bOwnerId || isStaff;
                  const owner = typeof b.owner === 'object' ? b.owner : null;
                  const isPast = dayjs(b.endDate).isBefore(dayjs(), 'day');

                  return (
                    <div key={b._id} className="booking-card" id={`booking-${b._id}`} style={{ padding: '0', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                      <div className="booking-card-content" style={{ padding: isMobile ? '16px' : '24px' }}>
                        <div className="booking-card-info">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', gap: isMobile ? '12px' : '16px', alignItems: 'center' }}>
                              <div style={{ width: isMobile ? '52px' : '60px', height: isMobile ? '52px' : '60px', borderRadius: '12px', overflow: 'hidden', flexShrink: 0, border: '1px solid #e2e8f0' }}>
                                {vehicle && (vehicle as Vehicle).photos?.[0] ? (
                                  <img src={getImageUrl((vehicle as Vehicle).photos[0])} alt={(vehicle as Vehicle).title || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  <div style={{ width: '100%', height: '100%', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Car size={24} color="#cbd5e1" />
                                  </div>
                                )}
                              </div>
                              <div>
                                <h4 style={{ margin: 0, fontSize: isMobile ? '1rem' : '1.15rem', color: '#0f172a', lineHeight: 1.3 }}>{vehicle ? (vehicle as Vehicle).title : 'Vehicle Details'}</h4>
                                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                  Ref: #{b._id.slice(-6).toUpperCase()}
                                </div>
                              </div>
                            </div>
                            {bookingStatusBadge(b.status, b.startDate)}
                          </div>

                          <div className="booking-card-meta" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '10px' : '12px', background: '#f8fafc', padding: isMobile ? '12px' : '16px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                            <div>
                              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Trip Dates</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: '#334155', fontWeight: 600 }}>
                                <span>{new Date(b.startDate).toLocaleDateString()} — {new Date(b.endDate).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Total Payout</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, color: '#0f172a', fontSize: '1.05rem' }}>
                                LKR {b.totalAmount.toLocaleString()}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="booking-card-footer" style={{ borderTop: 'none', paddingTop: '16px', marginTop: 0, flexWrap: 'wrap', gap: '1rem' }}>
                          <div style={{ flex: 1, minWidth: 'fit-content' }}>
                            {b.status === 'CONFIRMED' && isIamRenterOfThis && owner && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '50%', overflow: 'hidden', border: '2px solid #bbf7d0', flexShrink: 0 }}>
                                  <img src={getImageUrl((owner as any).profilePic)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.03em' }}>HOST: {(owner as any).name}</div>
                                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#15803d', marginTop: '2px' }}>{(owner as any).phone || 'No phone'}</div>
                                </div>
                                {(owner as any).phone && (
                                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                                    <a
                                      href={`tel:${(owner as any).phone}`}
                                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '34px', height: '34px', borderRadius: '10px', background: '#16a34a', color: 'white', textDecoration: 'none', transition: 'transform 0.15s', boxShadow: '0 2px 6px rgba(22,163,74,0.3)' }}
                                      title="Call Host"
                                    >
                                      <Phone size={16} />
                                    </a>
                                    <a
                                      href={`https://wa.me/${(owner as any).phone.replace(/[^0-9]/g, '').replace(/^0/, '94')}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '34px', height: '34px', borderRadius: '10px', background: '#25D366', color: 'white', textDecoration: 'none', transition: 'transform 0.15s', boxShadow: '0 2px 6px rgba(37,211,102,0.3)' }}
                                      title="WhatsApp Host"
                                    >
                                      <MessageSquare size={16} />
                                    </a>
                                  </div>
                                )}
                              </div>
                            )}
                            <div style={{ display: 'flex', gap: '8px', flexDirection: isMobile ? 'column' : 'row', flexWrap: 'wrap', marginTop: b.status === 'CONFIRMED' && isIamRenterOfThis && owner ? '1rem' : '0' }}>
                              <button onClick={() => handleViewDetail(b)} className="btn btn-sm" style={{ flex: 1, minWidth: 'fit-content', background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#334155', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: isMobile ? '42px' : undefined, fontSize: isMobile ? '0.8125rem' : undefined }}>
                                <Info size={14} style={{ marginRight: '6px' }} /> Full Details
                              </button>
                              {vehicle && (
                                <Link to={`/vehicles/${getVehicleSlug(vehicle as Vehicle)}`} className="btn btn-sm" style={{ flex: 1, minWidth: 'fit-content', textAlign: 'center', background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#334155', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: isMobile ? '42px' : undefined, fontSize: isMobile ? '0.8125rem' : undefined }}>
                                  <Eye size={14} style={{ marginRight: '6px' }} /> View Page
                                </Link>
                              )}
                            </div>
                          </div>

                          <div className="booking-card-actions">
                            {b.status === 'PENDING' && isIamOwnerOfThis && bookingType === 'received' && (
                              <div style={{ display: 'flex', width: '100%' }}>
                                <button
                                  className="btn btn-sm btn-primary"
                                  disabled={dayjs(b.startDate).isBefore(dayjs(), 'day')}
                                  style={{
                                    flex: 1,
                                    background: dayjs(b.startDate).isBefore(dayjs(), 'day') ? '#cbd5e1' : '#1890ff',
                                    fontWeight: 600,
                                    height: '32px',
                                    cursor: dayjs(b.startDate).isBefore(dayjs(), 'day') ? 'not-allowed' : 'pointer'
                                  }}
                                  onClick={() => {
                                    const renter = typeof b.user === 'object' ? b.user : null;
                                    handleReviewRenter(b._id, renter);
                                  }}
                                >
                                  {dayjs(b.startDate).isBefore(dayjs(), 'day') ? 'Request Expired' : 'Review & Respond'}
                                </button>
                              </div>
                            )}

                            {b.status === 'PENDING' && !isPast && isIamRenterOfThis && (bookingType === 'trips' || user?.role === 'user') && (
                              <button className="btn btn-sm btn-danger" style={{ minWidth: '120px' }} onClick={() => handleCancelBooking(b._id)}>Cancel Trip</button>
                            )}

                            {b.status === 'CONFIRMED' && !isPast && (
                              ((isIamOwnerOfThis && bookingType === 'received') || (isIamRenterOfThis && (bookingType === 'trips' || user?.role === 'user')))
                            ) && (
                                <button className="btn btn-sm btn-cancel-booking" onClick={() => handleCancelBooking(b._id)}>Cancel Booking</button>
                              )}

                            {(b.status === 'COMPLETED' || (b.status === 'CONFIRMED' && isPast)) && isIamRenterOfThis && !b.isReviewed && (bookingType === 'trips' || user?.role === 'user') && (
                              <button className="btn btn-sm btn-primary" onClick={() => { setSelectedBookingId(b._id); setShowReviewModal(true); }}>Leave Review</button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : tab === 'wishlist' ? (
          <div className="dashboard-box">
            <div className="dashboard-box-header" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '1.25rem 1.5rem' }}>
              <h3 className="dashboard-box-title" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Saved Vehicles</h3>
              <div className="dashboard-nav" style={{ marginTop: '1rem', marginBottom: 0, width: '100%', borderBottom: 'none' }}>
                <button
                  className={`nav-item ${wishlistSubTab === 'rent' ? 'active' : ''}`}
                  onClick={() => setWishlistSubTab('rent')}
                >
                  Saved Rentals
                </button>
                <button
                  className={`nav-item ${wishlistSubTab === 'buy' ? 'active' : ''}`}
                  onClick={() => setWishlistSubTab('buy')}
                >
                  Saved to Buy
                </button>
              </div>
            </div>

            {wishlistSubTab === 'buy' ? (
              !user?.saleWishlist || user.saleWishlist.length === 0 ? (
                <p className="text-gray-500 text-center py-10">You haven't saved any vehicles to buy yet.</p>
              ) : (
                <div className="dashboard-grid">
                  {user.saleWishlist.filter((v: any) => v && v._id).map((v: any) => (
                    <div key={v._id} className="dash-vehicle-card" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column' }} onClick={() => navigate(`/buy/${v._id}`)}>
                      <div className="dash-vehicle-card-img">
                        {v.images?.[0] ? (
                          <img src={getImageUrl(v.images[0])} alt={v.make} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9' }}>
                            <Car size={32} color="#cbd5e1" />
                          </div>
                        )}
                        <button 
                          onClick={(e) => handleRemoveSaleWishlist(e, v._id)}
                          style={{ position: 'absolute', top: '12px', right: '12px', padding: '8px', background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(4px)', borderRadius: '50%', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}
                        >
                          <Heart size={18} fill="#ef4444" color="#ef4444" />
                        </button>
                      </div>
                      <div className="dash-vehicle-card-body">
                        <div style={{ textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 800, color: '#ef4444', marginBottom: '2px', letterSpacing: '0.04em' }}>
                          SAVED TO BUY
                        </div>
                        <h4 className="dash-vehicle-card-title">{v.make} {v.model}</h4>
                        <div className="dash-vehicle-card-meta">{v.year} • {v.mileage?.toLocaleString()} km</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                          <div className="dash-vehicle-card-price">LKR {v.askingPrice?.toLocaleString()}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              !user?.rentWishlist || user.rentWishlist.length === 0 ? (
                <p className="text-gray-500 text-center py-10">You haven't saved any rental vehicles yet.</p>
              ) : (
                <div className="dashboard-grid">
                  {user.rentWishlist.filter((v: any) => v && v._id).map((v: any) => (
                    <div key={v._id} className="dash-vehicle-card" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column' }} onClick={() => navigate(`/vehicles/${getVehicleSlug(v)}`)}>
                      <div className="dash-vehicle-card-img">
                        {v.photos?.[0] ? (
                          <img src={getImageUrl(v.photos[0])} alt={v.title} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9' }}>
                            <Car size={32} color="#cbd5e1" />
                          </div>
                        )}
                        <button 
                          onClick={(e) => handleRemoveRentWishlist(e, v._id)}
                          style={{ position: 'absolute', top: '12px', right: '12px', padding: '8px', background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(4px)', borderRadius: '50%', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}
                        >
                          <Heart size={18} fill="#ef4444" color="#ef4444" />
                        </button>
                      </div>
                      <div className="dash-vehicle-card-body">
                        <div style={{ textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 800, color: '#ef4444', marginBottom: '2px', letterSpacing: '0.04em' }}>
                          SAVED RENTAL
                        </div>
                        <h4 className="dash-vehicle-card-title">{v.make} {v.model}</h4>
                        <div className="dash-vehicle-card-meta">{v.year} • {v.transmission}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                          <div className="dash-vehicle-card-price">LKR {v.pricePerDay?.toLocaleString()}<span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>/day</span></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        ) : null}
      </div>

      {/* REVIEW MODAL */}
      <Modal
        title="Rate Your Experience"
        open={showReviewModal}
        onCancel={() => setShowReviewModal(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={reviewForm} layout="vertical" onFinish={handleReviewSubmit} style={{ marginTop: '1rem' }}>
          <Form.Item name="rating" label="Rating" rules={[{ required: true, message: 'Please select a rating' }]}>
            <Rate />
          </Form.Item>
          <Form.Item name="comment" label="Your Feedback" rules={[{ required: true, message: 'Please leave a comment' }]}>
            <Input.TextArea rows={4} placeholder="How was the vehicle and the service?" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={submittingReview} block style={{ height: '44px' }}>
            Submit Review
          </Button>
        </Form>
      </Modal>

      {/* RENTER REVIEW MODAL */}
      <Modal
        title="Renter Verification Details"
        open={showRenterModal}
        onCancel={() => setShowRenterModal(false)}
        footer={[
          <Button key="close" onClick={() => setShowRenterModal(false)}>Close</Button>,
          <Button
            key="reject"
            danger
            onClick={() => {
              if (activeBookingId) handleRejectBooking(activeBookingId);
              setShowRenterModal(false);
            }}
          >
            Reject
          </Button>,
          <Button
            key="approve"
            type="primary"
            style={{ background: '#16a34a', borderColor: '#16a34a' }}
            onClick={() => {
              if (activeBookingId) handleAcceptBooking(activeBookingId);
              setShowRenterModal(false);
            }}
          >
            Approve
          </Button>
        ]}
        width={700}
        styles={{ body: { padding: 0 } }}
        destroyOnClose
      >
        {selectedRenter ? (
          <div className="renter-review-content" style={{ display: 'flex', flexDirection: 'column', background: '#f8fafc', overflow: 'hidden' }}>
            {/* Top Bar with User Info */}
            <div style={{ padding: '16px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 250px' }}>
                <Avatar
                  size={56}
                  src={getImageUrl(selectedRenter.profilePic)}
                  style={{ background: '#1890ff', flexShrink: 0 }}
                >
                  {selectedRenter.name?.charAt(0)}
                </Avatar>
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedRenter.name}</h3>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedRenter.email}</p>
                </div>
              </div>

              <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '8px' }}>Contact Info</h4>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '4px' }}>{selectedRenter.documents?.phone || selectedRenter.phone || 'Phone not provided'}</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>ID/License:</strong> {(selectedRenter as any)?.documents?.idNumber || 'Not Provided'}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{selectedRenter.documents?.address || selectedRenter.address || 'Address not listed'}</div>
              </div>
            </div>

            {/* Document display area */}
            <div style={{ padding: '16px', background: '#f8fafc', overflowY: 'auto', maxHeight: '60vh' }}>
              <h4 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: 8, fontSize: '1rem', fontWeight: 700 }}>
                <FileText size={18} /> Documentation Verification
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
                {[
                  { label: 'Driver License', field: 'license' },
                  { label: 'Profile Photo', field: 'selfie' },
                ].map((doc, idx) => {
                  const renterData = selectedRenter as any;
                  const url = renterData.documents?.[doc.field] ||
                    renterData[doc.field] ||
                    null;

                  const fullUrl = getImageUrl(url);

                  return (
                    <div key={idx} style={{
                      background: '#fff',
                      padding: '12px',
                      borderRadius: '16px',
                      border: '1px solid #f1f5f9',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                    }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>{doc.label}</div>
                      {url ? (
                        <div className="doc-image-wrapper" style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', background: '#fff' }}>
                          <Image
                            src={fullUrl}
                            alt={doc.label}
                            style={{ width: '100%', height: '140px', objectFit: 'cover' }}
                            placeholder={<div style={{ height: '140px', background: '#f8fafc' }} />}
                          />
                        </div>
                      ) : (
                        <div style={{ height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', borderRadius: '8px', color: '#94a3b8', fontSize: '0.8rem' }}>
                          Not Uploaded
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <Spin tip="Loading renter details..." />
          </div>
        )}
      </Modal>

      {/* TRIP DETAIL MODAL FOR RENTERS/OWNERS */}
      <Modal
        title="Booking Details"
        open={showDetailModal}
        onCancel={() => setShowDetailModal(false)}
        footer={(() => {
          const isPending = selectedBooking?.status === 'PENDING';
          const isConfirmed = selectedBooking?.status === 'CONFIRMED';
          const bOwnerId = String(typeof selectedBooking?.owner === 'object' ? (selectedBooking?.owner as any)._id : selectedBooking?.owner);
          const bRenterId = String(typeof selectedBooking?.user === 'object' ? (selectedBooking?.user as any)._id : selectedBooking?.user);
          const myId = String(user?._id || user?.id || '');
          const isOwner = myId === bOwnerId;
          const isRenter = myId === bRenterId;

          const buttons = [
            <Button key="close" onClick={() => setShowDetailModal(false)}>Close</Button>
          ];

          const isDetailPast = selectedBooking ? dayjs(selectedBooking.endDate).isBefore(dayjs(), 'day') : false;

          if (isPending && isRenter && !isDetailPast) {
            buttons.push(
              <Button key="cancel-renter" danger onClick={() => { if (selectedBooking?._id) handleCancelBooking(selectedBooking._id); setShowDetailModal(false); }}>Cancel Trip</Button>
            );
          }

          if (isPending && isOwner && !isDetailPast) {
            buttons.push(
              <Button key="reject-owner" danger onClick={() => { if (selectedBooking?._id) handleRejectBooking(selectedBooking._id); setShowDetailModal(false); }}>Cancel Booking</Button>,
              <Button key="accept-owner" type="primary" style={{ background: '#16a34a', borderColor: '#16a34a' }} onClick={() => { if (selectedBooking?._id) handleAcceptBooking(selectedBooking._id); setShowDetailModal(false); }}>Accept Booking</Button>
            );
          }

          const isPast = selectedBooking ? dayjs(selectedBooking.endDate).isBefore(dayjs(), 'day') : false;

          if (isConfirmed && !isPast && (isRenter || isOwner)) {
            buttons.push(
              <Button key="cancel-confirmed" danger onClick={() => { if (selectedBooking?._id) handleCancelBooking(selectedBooking._id); setShowDetailModal(false); }}>Cancel Booking</Button>
            );
          }

          return buttons;
        })()}
        width={600}
        centered
        destroyOnClose
      >
        {selectedBooking ? (
          <div className="booking-detail-content" style={{ padding: '10px 0' }}>
            {(() => {
              const bOwnerId = String(typeof selectedBooking.owner === 'object' ? (selectedBooking.owner as any)._id : selectedBooking.owner);
              const bRenterId = String(typeof selectedBooking.user === 'object' ? (selectedBooking.user as any)._id : selectedBooking.user);
              const myId = String(user?._id || user?.id || '');
              const isOwner = myId === bOwnerId;
              const isRenter = myId === bRenterId;
              const renterObj = typeof selectedBooking.user === 'object' ? selectedBooking.user as any : null;

              return (
                <>
                  {/* Header info */}
                  <div style={{ display: 'flex', gap: '20px', marginBottom: '25px', alignItems: 'center' }}>
                    <div style={{ width: '100px', height: '100px', borderRadius: '16px', overflow: 'hidden', flexShrink: 0, border: '1px solid #e2e8f0' }}>
                      {typeof selectedBooking.vehicle === 'object' && (selectedBooking.vehicle as Vehicle).photos?.[0] ? (
                        <img src={getImageUrl((selectedBooking.vehicle as Vehicle).photos[0])} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : <div style={{ width: '100%', height: '100%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Car size={32} color="#94a3b8" /></div>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>{typeof selectedBooking.vehicle === 'object' ? (selectedBooking.vehicle as Vehicle).title : 'Vehicle Details'}</h3>
                      <div style={{ marginTop: '8px' }}>{bookingStatusBadge(selectedBooking.status, selectedBooking.startDate)}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginTop: '8px', fontWeight: 600 }}>REF ID: {selectedBooking._id}</div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem', marginBottom: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                    <div>
                      <div style={{ color: '#94a3b8', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}>Pickup Date</div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#334155', marginTop: '2px' }}>{dayjs(selectedBooking.startDate).format('MMM D, YYYY')}</div>
                    </div>
                    <div>
                      <div style={{ color: '#94a3b8', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}>Return Date</div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#334155', marginTop: '2px' }}>{dayjs(selectedBooking.endDate).format('MMM D, YYYY')}</div>
                    </div>
                    <div>
                      <div style={{ color: '#94a3b8', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}>Duration</div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#334155', marginTop: '2px' }}>{selectedBooking.days} Days</div>
                    </div>
                    <div>
                      <div style={{ color: '#94a3b8', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}>Total Price</div>
                      <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#16a34a', marginTop: '2px' }}>LKR {selectedBooking.totalAmount.toLocaleString()}</div>
                    </div>
                  </div>

                  {/* RENTER PERSPECTIVE: Show Host Contact or Pending Message */}
                  {isRenter && (
                    <>
                      {selectedBooking.status === 'CONFIRMED' && (
                        <div style={{ padding: '1.5rem', border: '1px solid #bbf7d0', borderRadius: '16px', background: '#f0fdf4' }}>
                          <h4 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '8px', color: '#166534' }}>
                            <User size={18} /> Host Contact Details
                          </h4>
                          {typeof selectedBooking.owner === 'object' ? (
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '16px' }}>
                                <img
                                  src={getImageUrl((selectedBooking.owner as any).profilePic)}
                                  style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #bbf7d0' }}
                                />
                                <div>
                                  <div style={{ fontWeight: 700, color: '#166534', fontSize: '1rem' }}>{(selectedBooking.owner as any).name}</div>
                                  <div style={{ color: '#15803d', fontWeight: 700, fontSize: '1.1rem', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Phone size={16} /> {(selectedBooking.owner as any).phone || (selectedBooking.owner as any).phoneNumber || 'No phone provided'}
                                  </div>
                                </div>
                              </div>
                              {((selectedBooking.owner as any).phone || (selectedBooking.owner as any).phoneNumber) && (
                                <div style={{ display: 'flex', gap: '10px' }}>
                                  <a
                                    href={`tel:${(selectedBooking.owner as any).phone || (selectedBooking.owner as any).phoneNumber}`}
                                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 16px', borderRadius: '12px', background: '#16a34a', color: 'white', textDecoration: 'none', fontWeight: 700, fontSize: '0.9rem', boxShadow: '0 2px 8px rgba(22,163,74,0.25)', transition: 'all 0.2s' }}
                                  >
                                    <Phone size={18} /> Call Host
                                  </a>
                                  <a
                                    href={`https://wa.me/${((selectedBooking.owner as any).phone || (selectedBooking.owner as any).phoneNumber || '').replace(/[^0-9]/g, '').replace(/^0/, '94')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 16px', borderRadius: '12px', background: '#25D366', color: 'white', textDecoration: 'none', fontWeight: 700, fontSize: '0.9rem', boxShadow: '0 2px 8px rgba(37,211,102,0.25)', transition: 'all 0.2s' }}
                                  >
                                    <MessageSquare size={18} /> WhatsApp
                                  </a>
                                </div>
                              )}
                            </div>
                          ) : <p style={{ margin: 0, fontSize: '0.9rem' }}>Contact info available upon refresh.</p>}
                        </div>
                      )}
                      {selectedBooking.status === 'PENDING' && (
                        <div style={{ display: 'flex', gap: '12px', padding: '1rem', background: '#fffbeb', borderRadius: '12px', border: '1px solid #fde68a' }}>
                          <Clock size={20} style={{ color: '#d97706', flexShrink: 0 }} />
                          <p style={{ margin: 0, fontSize: '0.85rem', color: '#92400e' }}>
                            Your request is waiting for the owner's response. You will receive a notification once it's confirmed or rejected.
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  {/* OWNER PERSPECTIVE: Show Renter Contact & Identity */}
                  {isOwner && renterObj && (
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden' }}>
                      <div style={{ background: '#f8fafc', padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0' }}>
                        <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', fontWeight: 800 }}>
                          <Users size={18} color="var(--color-primary)" /> Renter Details & Verification
                        </h4>
                      </div>

                      <div style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '1.5rem' }}>
                          <Avatar size={56} src={getImageUrl(renterObj.profilePic)} style={{ background: '#1890ff' }}>
                            {renterObj.name?.charAt(0)}
                          </Avatar>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0f172a' }}>{renterObj.name}</div>
                            <div style={{ color: '#475569', fontSize: '0.9rem', marginBottom: '4px' }}>{renterObj.email}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#16a34a', fontWeight: 700, marginBottom: '4px' }}>
                              <Phone size={14} /> {renterObj.documents?.phone || renterObj.phone || 'Phone not provided'}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#475569' }}>
                              <strong style={{ color: '#0f172a' }}>ID/License:</strong> {renterObj.documents?.idNumber || 'Not Provided'}
                            </div>
                          </div>
                        </div>

                        {/* Document display area directly integrated */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
                          {[
                            { label: 'Driver License', field: 'license' },
                            { label: 'Profile Photo', field: 'selfie' },
                          ].map((doc, idx) => {
                            const url = renterObj.documents?.[doc.field] ||
                              renterObj[doc.field] ||
                              null;
                            const fullUrl = getImageUrl(url);

                            return (
                              <div key={idx} style={{
                                background: '#f8fafc',
                                padding: '8px',
                                borderRadius: '8px',
                                border: '1px solid #e2e8f0'
                              }}>
                                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', marginBottom: '6px', textTransform: 'uppercase' }}>{doc.label}</div>
                                {url ? (
                                  <div style={{ borderRadius: '6px', overflow: 'hidden', border: '1px solid #e2e8f0', background: 'white' }}>
                                    <Image
                                      src={fullUrl}
                                      alt={doc.label}
                                      style={{ width: '100%', height: '90px', objectFit: 'cover' }}
                                    />
                                  </div>
                                ) : (
                                  <div style={{ height: '90px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e2e8f0', borderRadius: '6px', color: '#94a3b8', fontSize: '0.7rem', fontWeight: 600 }}>
                                    Not Uploaded
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedBooking.cancellationReason && (
                    <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#fff1f2', border: '1px solid #fecaca', borderRadius: '12px' }}>
                      <h4 style={{ color: '#991b1b', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 700 }}>
                        <AlertTriangle size={16} /> Cancellation Note
                      </h4>
                      <p style={{ color: '#7f1d1d', fontSize: '0.9rem', margin: 0 }}>
                        {selectedBooking.cancellationReason}
                      </p>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        ) : null}
      </Modal>

      {/* SUCCESS BOOKING CONTACT MODAL */}
      <Modal
        title={null}
        open={showSuccessModal}
        onCancel={() => setShowSuccessModal(false)}
        footer={null}
        centered
        width={480}
        bodyStyle={{ padding: '24px', textAlign: 'center', borderRadius: '16px' }}
      >
        <div style={{ background: '#f0fdf4', width: '72px', height: '72px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: '#16a34a' }}>
          <CheckCircle size={36} />
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem' }}>Your booking is secured!</h2>
        <p style={{ color: '#64748b', fontSize: '1rem', lineHeight: 1.5, marginBottom: '2rem' }}>
          Contact the owner immediately to coordinate pickup and finalize any remaining details.
        </p>

        {successContact && (
          <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '2rem' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', overflow: 'hidden', border: '2px solid #fff', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', margin: '0 auto 12px' }}>
              <img src={getImageUrl(successContact.profilePic)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={successContact.name} />
            </div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#1e293b', marginBottom: '4px' }}>{successContact.name}</div>
            <div style={{ color: '#64748b', fontSize: '0.9rem' }}>Vehicle Owner</div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {successContact?.phone && (
            <a
              href={`tel:${successContact.phone}`}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', borderRadius: '12px', fontSize: '1.05rem', fontWeight: 700, background: '#16a34a', border: 'none' }}
            >
              <Phone size={20} /> Call Now
            </a>
          )}
          {successContact?.email && (
            <a
              href={`mailto:${successContact.email}`}
              className="btn btn-outline"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', borderRadius: '12px', fontSize: '1.05rem', fontWeight: 600, color: '#334155', border: '1px solid #cbd5e1' }}
            >
              <MessageSquare size={20} /> Email Owner
            </a>
          )}
        </div>
      </Modal>

      <Modal
        title={editingVehicleSale ? "Edit Vehicle Listing" : "Add New Vehicle Listing"}
        open={isAddVehicleModalOpen}
        onCancel={() => { setIsAddVehicleModalOpen(false); setEditingVehicleSale(null); }}
        footer={null}
        width={768}
        destroyOnClose
      >
        <AddVehicleSale
          initialData={editingVehicleSale}
          onSuccess={() => {
            setIsAddVehicleModalOpen(false);
            setEditingVehicleSale(null);
            handleRefreshData();
          }}
        />
      </Modal>
    </div>
  );
}
