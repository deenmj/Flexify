import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Menu, X, ChevronDown, Bell, User, LogOut, LayoutDashboard, Car, Search, Shield, Info, HelpCircle, Phone, Compass, Home, CalendarCheck, Tag, Plus, Lock } from 'lucide-react';
import { Badge, Tooltip, Modal, Dropdown } from 'antd';
import { useSocket } from '../context/SocketContext';
import { notificationApi, bookingApi, userApi } from '../api';
import './Navbar.css';
import RentifyLogo from './RentifyLogo';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeBookingCount, setActiveBookingCount] = useState(0);

  useEffect(() => {
    if (user) {
      notificationApi.getUnreadCount()
        .then(res => setUnreadCount(res.unreadCount))
        .catch(console.error);

      // Fetch active bookings count (CONFIRMED bookings for this user)
      bookingApi.getMy()
        .then(bookings => {
          const active = bookings.filter(b => b.status === 'CONFIRMED' || b.status === 'PENDING').length;
          setActiveBookingCount(active);
        })
        .catch(console.error);
    }
  }, [user]);

  useEffect(() => {
    if (!socket) return;
    const handleNewNotification = () => {
      setUnreadCount(prev => prev + 1);
    };
    const handleBookingUpdate = () => {
      // Re-fetch active booking count when a booking status changes
      if (user) {
        bookingApi.getMy()
          .then(bookings => {
            const active = bookings.filter(b => b.status === 'CONFIRMED' || b.status === 'PENDING').length;
            setActiveBookingCount(active);
          })
          .catch(console.error);
      }
    };
    socket.on('newNotification', handleNewNotification);
    socket.on('bookingStatusUpdate', handleBookingUpdate);
    socket.on('newBookingRequest', handleBookingUpdate);
    return () => {
      socket.off('newNotification', handleNewNotification);
      socket.off('bookingStatusUpdate', handleBookingUpdate);
      socket.off('newBookingRequest', handleBookingUpdate);
    };
  }, [socket, user]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const getDashboardLink = () => {
    if (!user) return null;
    if (user.role === 'superadmin') return '/ceo-master-portal';
    if (user.role === 'admin') return '/admin';
    if (user.role === 'staff' || user.role === 'subadmin') return '/staff';
    return '/dashboard';
  };

  const getRoleBadge = () => {
    if (!user) return null;
    if (user.role === 'superadmin') return { text: 'CEO', color: '#b8860b' };
    if (user.role === 'admin') return { text: 'ADMIN', color: '#7c3aed' };
    if (user.role === 'staff' || user.role === 'subadmin') return { text: 'STAFF', color: '#0d9488' };
    if (user.role === 'owner' && user.ownerType === 'VERIFIED') return { text: 'PRO', color: '#1890ff' };
    if (user.isKycVerified) return { text: '✓', color: '#16a34a' };
    return null;
  };

  const handleLogout = () => {
    Modal.confirm({
      title: 'Confirm Logout',
      content: 'Are you sure you want to log out of your account?',
      okText: 'Logout',
      okType: 'danger',
      cancelText: 'Cancel',
      centered: true,
      onOk: () => {
        logout();
        setProfileOpen(false);
        navigate('/auth');
      }
    });
  };

  const handleRequestSalesAccess = async () => {
    try {
      const res = await userApi.requestSalesAccess();
      Modal.success({
        title: 'Request Sent',
        content: res.message,
        onOk: () => window.location.reload()
      });
    } catch (err: any) {
      Modal.error({ title: 'Error', content: err.message || 'Failed to request access' });
    }
  };

  const badge = getRoleBadge();
  const isSuperAdmin = user?.role === 'superadmin';
  const isAdmin = user?.role === 'admin';
  const isStaff = user?.role === 'staff' || user?.role === 'subadmin';
  const isAdminRole = isSuperAdmin || isAdmin || isStaff;

  return (
    <>
      <nav className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}>
        <div className="navbar-inner container">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Hamburger menu — moved to left for mobile */}
            <button className="mobile-menu-btn menu-btn-left" onClick={() => setMobileOpen(true)}>
              <Menu size={24} strokeWidth={2.5} />
            </button>

            <Link to={isAdminRole ? getDashboardLink()! : '/home'} className="navbar-logo" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', height: '100%', gap: '8px' }}>
              <RentifyLogo className="logo-img" />
              <span className="logo-text">Rentify</span>
            </Link>
          </div>

          {/* Desktop Nav — All roles see full nav now */}
          <div>
            <div className="navbar-links">
              <Link to="/home" className={`nav-link ${location.pathname === '/home' ? 'nav-link-highlight' : ''}`}>
                <Home size={18} /> Home
              </Link>
              <Link to="/explore" className={`nav-link ${location.pathname === '/explore' ? 'nav-link-highlight' : ''}`}>
                <Compass size={18} /> Rent a Vehicle
              </Link>
              <Link to="/buy" className={`nav-link ${location.pathname === '/buy' ? 'nav-link-highlight' : ''}`}>
                <Tag size={18} /> Buy Vehicles
              </Link>

              {!user ? (
                <Link to="/auth" className="nav-link">
                  <Car size={18} /> List Vehicle
                </Link>
              ) : (
                <NavDropdown
                  label="List Vehicle"
                  icon={Car}
                  items={[
                    { 
                      label: 'List for Rent', 
                      href: '/list-vehicle', 
                      icon: Car, 
                      desc: 'Earn money by renting your vehicle' 
                    },
                    { 
                      label: 'List for Sale', 
                      href: '/dashboard?tab=sales&openAdd=true', 
                      icon: Tag, 
                      desc: 'Sell your vehicle on Rentify' 
                    }
                  ]}
                />
              )}
              <NavDropdown
                label="Company"
                items={[
                  { label: 'About Rentify', href: '/about', icon: Info, desc: 'Our mission and vision' },
                  { label: 'Help & Support', href: '/help', icon: HelpCircle, desc: 'Need any assistance?' },
                  { label: 'Contact Us', href: '/contact', icon: Phone, desc: 'Get in touch with us' },
                  { label: 'Trust & Safety', href: '/faq', icon: Shield, desc: 'How we keep you safe' },
                ]}
              />
            </div>
          </div>

          {/* Right side */}
          <div className="navbar-actions">
              {!user ? (
                <button className="mobile-plus-btn" title="List Vehicle" onClick={() => navigate('/auth')} style={{ border: 'none', cursor: 'pointer' }}>
                  <Plus size={18} strokeWidth={2.5} />
                </button>
              ) : (
                <Dropdown menu={{
                  items: [
                    {
                      key: 'rent', label: (
                        <Link to="/list-vehicle" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '6px 4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', background: '#f0fdf4', color: '#16a34a', borderRadius: '10px' }}>
                            <Car size={18} />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 600, fontSize: '15px', color: '#1e293b', lineHeight: 1.2 }}>List for Rent</span>
                            <span style={{ fontSize: '12px', color: '#64748b' }}>Earn money by renting</span>
                          </div>
                        </Link>
                      )
                    },
                    { type: 'divider' },
                    {
                      key: 'sale', label: (
                        <Link to="/dashboard?tab=sales&openAdd=true" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '6px 4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', background: '#eff6ff', color: '#2563eb', borderRadius: '10px' }}>
                            <Tag size={18} />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 600, fontSize: '15px', color: '#1e293b', lineHeight: 1.2 }}>List for Sale</span>
                            <span style={{ fontSize: '12px', color: '#64748b' }}>Sell on the marketplace</span>
                          </div>
                        </Link>
                      )
                    }
                  ]
                }} trigger={['click']} placement="bottomRight" overlayStyle={{ minWidth: '220px', padding: '4px' }}>
                  <button className="mobile-plus-btn" title="List Vehicle" style={{ border: 'none', cursor: 'pointer' }}>
                    <Plus size={18} strokeWidth={2.5} />
                  </button>
                </Dropdown>
              )}
            <Link to="/explore" className="nav-action-btn" title="Search">
              <Search size={20} />
            </Link>
            {user && activeBookingCount > 0 && (
              <Tooltip title={`${activeBookingCount} active booking${activeBookingCount > 1 ? 's' : ''}`}>
                <button className="nav-action-btn active-booking-btn" title="Active Bookings" onClick={() => navigate('/dashboard?tab=bookings')}>
                  <Badge count={activeBookingCount} size="small" offset={[-2, 2]} color="#16a34a">
                    <CalendarCheck size={20} style={{ color: 'inherit' }} />
                  </Badge>
                </button>
              </Tooltip>
            )}
            <button className="nav-action-btn notification-btn" title="Notifications" onClick={() => navigate('/notifications')}>
              <Badge count={unreadCount} size="small" offset={[-2, 2]}>
                <Bell size={20} style={{ color: 'inherit' }} />
              </Badge>
            </button>


            {/* Profile */}
            <div className="profile-wrapper" ref={profileRef}>
              <button
                className="profile-trigger"
                onClick={() => user ? setProfileOpen(!profileOpen) : navigate('/auth')}
              >
                {user ? (
                  <img
                    src={user.profilePic || '/default-avatar.png'}
                    alt={user.name}
                    className="profile-avatar"
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.name) + '&background=1890ff&color=fff'; }}
                  />
                ) : (
                  <div className="profile-avatar-placeholder">
                    <User size={18} />
                  </div>
                )}
              </button>

              {profileOpen && user && (
                <div className="profile-dropdown animate-scale-in">
                  <div className="profile-dropdown-header">
                    <img
                      src={user.profilePic || '/default-avatar.png'}
                      alt={user.name}
                      className="dropdown-avatar"
                      onError={(e) => { (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.name) + '&background=1890ff&color=fff'; }}
                    />
                    <div>
                      <p className="dropdown-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {user.name}
                        {badge && <span style={{ background: badge.color, color: 'white', fontSize: '8px', padding: '1px 4px', borderRadius: '4px', fontWeight: 900 }}>{badge.text}</span>}
                      </p>
                      <p className="dropdown-email">{user.email}</p>
                    </div>
                  </div>
                  <div className="profile-dropdown-divider" />
                  <Link to="/profile" className="dropdown-item" onClick={() => setProfileOpen(false)}>
                    <User size={16} /> My Profile
                  </Link>
                  {getDashboardLink() && (
                    <Link to={getDashboardLink()!} className="dropdown-item" onClick={() => setProfileOpen(false)}>
                      <LayoutDashboard size={16} /> {isSuperAdmin ? 'CEO Portal' : isAdmin ? 'Admin Dashboard' : isStaff ? 'Staff Dashboard' : 'Dashboard'}
                    </Link>
                  )}

                  {isAdminRole && (
                    <Link to="/dashboard" className="dropdown-item" onClick={() => setProfileOpen(false)}>
                      <Car size={16} /> My Vehicles & Bookings
                    </Link>
                  )}
                  {!isSuperAdmin && (
                    <Link to="/list-vehicle" className="dropdown-item" onClick={() => setProfileOpen(false)}>
                      <Car size={16} /> List Vehicle
                    </Link>
                  )}


                  <button className="dropdown-item dropdown-item-danger" onClick={handleLogout}>
                    <LogOut size={16} /> Logout
                  </button>
                </div>
              )}
            </div>

            {!user && (
              <Link to="/auth" className="btn btn-primary btn-sm navbar-auth-btn">
                Sign In
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="mobile-overlay" onClick={() => setMobileOpen(false)}>
          <div className="mobile-menu animate-slide-in-left" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-menu-header">
              <span className="logo-text">Menu</span>
              <button onClick={() => setMobileOpen(false)}><X size={24} /></button>
            </div>
            <div className="mobile-menu-body">
              {user && (
                <div
                  className="mobile-user-info"
                  onClick={() => { setMobileOpen(false); navigate('/profile'); }}
                  style={{ cursor: 'pointer' }}
                >
                  <img
                    src={user.profilePic || '/default-avatar.png'}
                    alt={user.name}
                    className="mobile-avatar"
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.name) + '&background=1890ff&color=fff'; }}
                  />
                  <div>
                    <p className="mobile-user-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {user.name}
                      {badge && <span style={{ background: badge.color, color: 'white', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 900 }}>{badge.text}</span>}
                    </p>
                    <p className="mobile-user-role">{user.role}{user.ownerType ? ` (${user.ownerType})` : ''}</p>
                  </div>
                </div>
              )}
              <div className="mobile-section-title">Main Menu</div>
              <Link to="/home" className="mobile-link" onClick={() => setMobileOpen(false)}><Home size={18} /> Home</Link>
              <Link to="/explore" className="mobile-link" onClick={() => setMobileOpen(false)}><Compass size={18} /> Rent a Vehicle</Link>
              <Link to="/buy" className="mobile-link" onClick={() => setMobileOpen(false)}><Tag size={18} /> Buy a Vehicle</Link>

              {!user ? (
                <Link to="/auth" className="mobile-link" onClick={() => setMobileOpen(false)}><Car size={18} /> List Vehicle</Link>
              ) : (
                <>
                  <Link to="/list-vehicle" className="mobile-link" onClick={() => setMobileOpen(false)}><Car size={18} /> List for Rent</Link>
                  <Link to="/dashboard?tab=sales&openAdd=true" className="mobile-link" onClick={() => setMobileOpen(false)} style={{ color: '#10b981' }}><Tag size={18} /> List for Sale</Link>
                </>
              )}

              {user && (
                <>
                  <div className="mobile-section-title">My Account</div>
                  <Link to={getDashboardLink()!} className="mobile-link" onClick={() => setMobileOpen(false)}>
                    <LayoutDashboard size={18} /> {isSuperAdmin ? 'CEO Portal' : isAdmin ? 'Admin Dashboard' : isStaff ? 'Staff Dashboard' : 'Dashboard'}
                  </Link>
                  {isAdminRole && (
                    <Link to="/dashboard" className="mobile-link" onClick={() => setMobileOpen(false)}><Car size={18} /> My Vehicles & Bookings</Link>
                  )}


                </>
              )}

              <div className="mobile-section-title">General</div>
              <Link to="/about" className="mobile-link" onClick={() => setMobileOpen(false)}><Info size={18} /> About Us</Link>
              <Link to="/faq" className="mobile-link" onClick={() => setMobileOpen(false)}><HelpCircle size={18} /> FAQ</Link>
              <Link to="/contact" className="mobile-link" onClick={() => setMobileOpen(false)}><Phone size={18} /> Contact</Link>

              <div style={{ marginTop: '1rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color-light)' }}>
                {user ? (
                  <button className="mobile-link mobile-logout" onClick={() => { handleLogout(); setMobileOpen(false); }}>
                    <LogOut size={18} /> Logout
                  </button>
                ) : (
                  <Link to="/auth" className="btn btn-primary btn-full" onClick={() => setMobileOpen(false)}>Sign In</Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function NavDropdown({ label, items, icon: Icon }: { label: string; items: { label: string; href?: string; icon?: any; desc?: string; onClick?: (e: React.MouseEvent) => void }[], icon?: any }) {
  return (
    <div className="nav-dropdown">
      <button className="nav-link nav-dropdown-trigger">
        {Icon && <Icon size={18} />} {label} <ChevronDown size={14} />
      </button>
      <div className="nav-dropdown-menu">
        <div className="nav-dropdown-grid">
          {items.map((item) => {
            const content = (
              <>
                {item.icon && <div className="item-icon"><item.icon size={16} /></div>}
                <div className="item-content">
                  <span className="item-label">{item.label}</span>
                  {item.desc && <span className="item-desc">{item.desc}</span>}
                </div>
              </>
            );
            if (item.href) {
              return (
                <Link key={item.label} to={item.href} className="nav-dropdown-item" onClick={item.onClick}>
                  {content}
                </Link>
              );
            }
            return (
              <button key={item.label} className="nav-dropdown-item" onClick={item.onClick} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', outline: 'none' }}>
                {content}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
