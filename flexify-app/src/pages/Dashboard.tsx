import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Modal, message, Tag, Button, Image, Spin } from 'antd';
import { vehicleApi, userApi, salesApi, type Vehicle, getImageUrl, getVehicleSlug } from '../api';
import {
  Car, Clock, XCircle, Phone, Shield,
  MessageSquare, Tag as TagIcon, Heart, Lock
} from 'lucide-react';
import { useIsMobile } from '../hooks/useIsMobile';
import SEO from '../components/SEO';
import AddVehicleSale from '../components/AddVehicleSale';
import { Tag as AntTag } from 'antd';
import './Dashboard.css';


export default function Dashboard() {
  const { user, setUser } = useAuth();
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
  const filteredVehicles = vehicles; // All vehicles (no category filter)

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

  // Removed debug log

  return (
    <div className="dashboard-page page-wrapper" style={{ minHeight: '100vh', background: 'var(--bg-secondary)' }}>
      <SEO
        title="My Dashboard — My Vehicles & Wishlist | Rentify"
        description="Manage your vehicle listings and saved vehicles on Rentify.lk."
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
                <strong>Tip:</strong> Complete one-time verification to get verified status on your listings and build trust with vehicle owners.
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
                    <TagIcon size={16} /> My Sales
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
                    <TagIcon size={18} style={{ marginRight: '8px' }} /> List for Sale
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
                    <TagIcon size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> List for Sale
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
                      <TagIcon size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> List Your First Vehicle for Sale
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
