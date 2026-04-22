import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Menu, X, ChevronDown, Bell, User, LogOut, LayoutDashboard, Car, Search, Shield, Info, HelpCircle, Phone, Zap, Users, Globe, DollarSign, Compass, Home } from 'lucide-react';
import { Badge } from 'antd';
import { useSocket } from '../context/SocketContext';
import { notificationApi } from '../api';
import './Navbar.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      notificationApi.getUnreadCount()
        .then(res => setUnreadCount(res.unreadCount))
        .catch(console.error);
    }
  }, [user]);

  useEffect(() => {
    if (!socket) return;
    const handleNewNotification = () => {
      setUnreadCount(prev => prev + 1);
    };
    socket.on('newNotification', handleNewNotification);
    return () => {
      socket.off('newNotification', handleNewNotification);
    };
  }, [socket]);

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
    if (user.role === 'superadmin') return '/admin';
    if (user.role === 'subadmin') return '/subadmin';
    return '/dashboard';
  };

  const getRoleBadge = () => {
    if (!user) return null;
    if (user.role === 'superadmin') return { text: 'ADMIN', color: '#7c3aed' };
    if (user.role === 'subadmin') return { text: 'STAFF', color: '#0d9488' };
    if (user.role === 'owner' && user.ownerType === 'VERIFIED') return { text: 'PRO', color: '#1890ff' };
    if (user.isKycVerified) return { text: '✓', color: '#16a34a' };
    return null;
  };

  const handleLogout = () => {
    logout();
    setProfileOpen(false);
    navigate('/auth');
  };

  const badge = getRoleBadge();
  const isSuperAdmin = user?.role === 'superadmin';
  const isStaff = user?.role === 'subadmin';
  const isAdminRole = isSuperAdmin || isStaff;

  return (
    <>
      <nav className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}>
        <div className="navbar-inner container">
          <Link to={isAdminRole ? getDashboardLink()! : '/home'} className="navbar-logo">
            <div className="logo-icon">
              <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M24 18.4228L42 11.475V34.3663C42 34.7796 41.7457 35.1504 41.3601 35.2992L24 42V18.4228Z" fill="currentColor" opacity="0.5" />
                <path d="M24 8.18819L33.4123 11.574L24 15.2071L14.5877 11.574L24 8.18819ZM9 15.8487L21 20.4805V37.6263L9 32.9945V15.8487ZM27 37.6263V20.4805L39 15.8487V32.9945L27 37.6263Z" fill="currentColor" />
              </svg>
            </div>
            <span className="logo-text">Rentify</span>
          </Link>

          {/* Desktop Nav — All roles see full nav now */}
          <div>
            <div className="navbar-links">
              <Link to="/home" className="nav-link nav-link-highlight">
                <Home size={18} /> Home
              </Link>
              <NavDropdown
                label="Fleet & Brands"
                items={[
                  { label: 'Premium Cars', href: '/explore?type=Car', icon: Car, desc: 'Standard & luxury sedans' },
                  { label: 'Family SUVs', href: '/explore?type=SUV', icon: Users, desc: 'Spacious 7-seater vehicles' },
                  { label: 'Vans & Minivans', href: '/explore?type=Van', icon: Globe, desc: 'Group transportation' },
                  { label: 'Heavy Trucks', href: '/explore?type=Truck', icon: Zap, desc: 'For heavy cargo needs' },
                  { label: 'Motorbikes', href: '/explore?type=Bike', icon: Zap, desc: 'Quick city travel' },
                ]}
              />
              <NavDropdown
                label="Host"
                items={[
                  { label: 'List your Vehicle', href: '/list-vehicle', icon: Car, desc: 'Start earning today' },
                  { label: 'Pricing & Tiers', href: '/subscription', icon: DollarSign, desc: 'Subscription plans' },
                  { label: 'Listing Guide', href: '/help', icon: HelpCircle, desc: 'How to get started' },
                ]}
              />
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
            {!isSuperAdmin && (
              <>
                <Link to="/explore" className="nav-action-btn" title="Search">
                  <Search size={20} />
                </Link>
                <button className="nav-action-btn notification-btn" title="Notifications" onClick={() => navigate('/notifications')}>
                  <Badge count={unreadCount} size="small" offset={[-2, 2]}>
                    <Bell size={20} style={{ color: 'inherit' }} />
                  </Badge>
                </button>
              </>
            )}

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
                      <LayoutDashboard size={16} /> {isStaff ? 'Staff Dashboard' : isSuperAdmin ? 'Admin Dashboard' : 'Dashboard'}
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
                  {user.role === 'owner' && (
                    <Link to="/subscription" className="dropdown-item" onClick={() => setProfileOpen(false)}>
                      <Shield size={16} /> My Subscription
                    </Link>
                  )}
                  {user && user.verificationStatus === 'not_submitted' && !isAdminRole && (
                    <Link to="/verify" className="dropdown-item" onClick={() => setProfileOpen(false)} style={{ color: '#1890ff', fontWeight: 600 }}>
                      <Shield size={16} /> One-Time Verification
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

            {/* Hamburger menu — always rightmost */}
            <button className="mobile-menu-btn" onClick={() => setMobileOpen(true)}>
              <Menu size={24} />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="mobile-overlay" onClick={() => setMobileOpen(false)}>
          <div className="mobile-menu animate-slide-in" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-menu-header">
              <span className="logo-text">Rentify</span>
              <button onClick={() => setMobileOpen(false)}><X size={24} /></button>
            </div>
            <div className="mobile-menu-body">
              {user && (
                <div className="mobile-user-info">
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
              <Link to="/explore" className="mobile-link" onClick={() => setMobileOpen(false)}><Compass size={18} /> Explore Vehicles</Link>
              {!isSuperAdmin && (
                 <Link to="/list-vehicle" className="mobile-link" onClick={() => setMobileOpen(false)}><Car size={18} /> List your Vehicle</Link>
              )}

              {user && (
                <>
                  <div className="mobile-section-title">My Account</div>
                  <Link to={getDashboardLink()!} className="mobile-link" onClick={() => setMobileOpen(false)}>
                    <LayoutDashboard size={18} /> {isSuperAdmin ? 'Admin Dashboard' : isStaff ? 'Staff Dashboard' : 'Dashboard'}
                  </Link>
                  {isAdminRole && (
                    <Link to="/dashboard" className="mobile-link" onClick={() => setMobileOpen(false)}><Car size={18} /> My Vehicles & Bookings</Link>
                  )}
                  {user?.role === 'owner' && (
                    <Link to="/subscription" className="mobile-link" onClick={() => setMobileOpen(false)}><DollarSign size={18} /> My Subscription</Link>
                  )}
                  {user.verificationStatus === 'not_submitted' && !isAdminRole && (
                    <Link to="/verify" className="mobile-link" onClick={() => setMobileOpen(false)} style={{ color: '#1890ff', fontWeight: 600 }}>
                      <Shield size={18} /> One-Time Verification
                    </Link>
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

function NavDropdown({ label, items }: { label: string; items: { label: string; href: string; icon?: any; desc?: string }[] }) {
  return (
    <div className="nav-dropdown">
      <button className="nav-link nav-dropdown-trigger">
        {label} <ChevronDown size={14} />
      </button>
      <div className="nav-dropdown-menu">
        <div className="nav-dropdown-grid">
          {items.map((item) => (
            <Link key={item.href} to={item.href} className="nav-dropdown-item">
              {item.icon && <div className="item-icon"><item.icon size={16} /></div>}
              <div className="item-content">
                <span className="item-label">{item.label}</span>
                {item.desc && <span className="item-desc">{item.desc}</span>}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
