import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Menu, X, ChevronDown, Bell, User, LogOut, LayoutDashboard, Car, Search, Shield } from 'lucide-react';
import './Navbar.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

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
    if (user.role === 'admin') return '/admin';
    if (user.role === 'staff') return '/staff';
    return '/dashboard'; 
  };

  const handleLogout = () => {
    logout();
    setProfileOpen(false);
    navigate('/auth');
  };

  return (
    <>
      <nav className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}>
        <div className="navbar-inner container">
          {/* Logo */}
          <Link to="/" className="navbar-logo">
            <div className="logo-icon">
              <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M24 18.4228L42 11.475V34.3663C42 34.7796 41.7457 35.1504 41.3601 35.2992L24 42V18.4228Z" fill="currentColor" opacity="0.5"/>
                <path d="M24 8.18819L33.4123 11.574L24 15.2071L14.5877 11.574L24 8.18819ZM9 15.8487L21 20.4805V37.6263L9 32.9945V15.8487ZM27 37.6263V20.4805L39 15.8487V32.9945L27 37.6263Z" fill="currentColor"/>
              </svg>
            </div>
            <span className="logo-text">Flexify</span>
          </Link>

          {/* Desktop Nav */}
          {user?.role !== 'staff' && (
            <div className="navbar-links">
              <NavDropdown
                label="Vehicle Collection"
                items={[
                  { label: 'Luxury Sedans', href: '/explore?type=luxury' },
                  { label: 'Compact Cars', href: '/explore?type=compact' },
                  { label: 'SUVs & Family', href: '/explore?type=suv' },
                  { label: 'Vans & Minivans', href: '/explore?type=van' },
                  { label: 'Electric & Hybrid', href: '/explore?type=electric' },
                ]}
              />
              <NavDropdown
                label="Services"
                items={[
                  { label: 'Self Drive Rental', href: '/explore?service=self-drive' },
                  { label: 'Tours / Chauffeur', href: '/explore?service=chauffeur' },
                  { label: 'Airport Transfers', href: '/explore?service=transfer' },
                  { label: 'Weddings & Events', href: '/explore?service=events' },
                ]}
              />
              <Link to="/list-vehicle" className="nav-link">List your Vehicle</Link>
              <Link to="/about" className="nav-link">About</Link>
            </div>
          )}

          {/* Right side */}
          <div className="navbar-actions">
            {user?.role !== 'staff' && (
              <>
                <Link to="/explore" className="nav-action-btn" title="Search">
                  <Search size={20} />
                </Link>

                <button className="nav-action-btn notification-btn" title="Notifications">
                  <Bell size={20} />
                  <span className="notification-dot" />
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
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.name) + '&background=2563eb&color=fff'; }}
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
                      onError={(e) => { (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.name) + '&background=2563eb&color=fff'; }}
                    />
                    <div>
                      <p className="dropdown-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {user.name} 
                        {user.verified && <span style={{ background: 'var(--color-primary)', color: 'white', fontSize: '8px', padding: '1px 4px', borderRadius: '4px', fontWeight: 900 }}>PRO</span>}
                      </p>
                      <p className="dropdown-email">{user.email}</p>
                    </div>
                  </div>
                  <div className="profile-dropdown-divider" />
                  {user.role !== 'staff' && (
                    <>
                      <Link to="/profile" className="dropdown-item" onClick={() => setProfileOpen(false)}>
                        <User size={16} /> My Profile
                      </Link>
                      {getDashboardLink() && (
                        <Link to={getDashboardLink()!} className="dropdown-item" onClick={() => setProfileOpen(false)}>
                          <LayoutDashboard size={16} /> Dashboard
                        </Link>
                      )}
                      <Link to="/list-vehicle" className="dropdown-item" onClick={() => setProfileOpen(false)}>
                        <Car size={16} /> List Vehicle
                      </Link>
                    </>
                  )}
                  {user && !user.verified && user.role !== 'staff' && (
                    <Link to="/verify" className="dropdown-item" onClick={() => setProfileOpen(false)} style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                      <Shield size={16} /> Verify Identity
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

            {/* Mobile menu button */}
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
              <span className="logo-text">Flexify</span>
              <button onClick={() => setMobileOpen(false)}><X size={24} /></button>
            </div>
            <div className="mobile-menu-body">
              {user && (
                <div className="mobile-user-info">
                  <img
                    src={user.profilePic || '/default-avatar.png'}
                    alt={user.name}
                    className="mobile-avatar"
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.name) + '&background=2563eb&color=fff'; }}
                  />
                  <div>
                    <p className="mobile-user-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {user.name}
                      {user.verified && <span style={{ background: 'var(--color-primary)', color: 'white', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 900 }}>PRO</span>}
                    </p>
                    <p className="mobile-user-role">{user.role}</p>
                  </div>
                </div>
              )}
              {user?.role !== 'staff' ? (
                <>
                  <Link to="/" className="mobile-link" onClick={() => setMobileOpen(false)}>Home</Link>
                  <Link to="/explore" className="mobile-link" onClick={() => setMobileOpen(false)}>Explore Vehicles</Link>
                  <Link to="/list-vehicle" className="mobile-link" onClick={() => setMobileOpen(false)}>List your Vehicle</Link>
                  <Link to="/about" className="mobile-link" onClick={() => setMobileOpen(false)}>About Us</Link>
                  <Link to="/faq" className="mobile-link" onClick={() => setMobileOpen(false)}>FAQ</Link>
                  <Link to="/contact" className="mobile-link" onClick={() => setMobileOpen(false)}>Contact</Link>
                  {user && getDashboardLink() && (
                    <Link to={getDashboardLink()!} className="mobile-link" onClick={() => setMobileOpen(false)}>Dashboard</Link>
                  )}
                  {user && !user.verified && (
                    <Link to="/verify" className="mobile-link" onClick={() => setMobileOpen(false)} style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                      <Shield size={18} /> Verify Identity
                    </Link>
                  )}
                </>
              ) : (
                <>
                  <Link to="/staff" className="mobile-link" onClick={() => setMobileOpen(false)}>Identity Verification Portal</Link>
                </>
              )}
              {user ? (
                <button className="mobile-link mobile-logout" onClick={() => { handleLogout(); setMobileOpen(false); }}>
                  Logout
                </button>
              ) : (
                <Link to="/auth" className="btn btn-primary btn-full" onClick={() => setMobileOpen(false)}>Sign In</Link>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function NavDropdown({ label, items }: { label: string; items: { label: string; href: string }[] }) {
  return (
    <div className="nav-dropdown">
      <button className="nav-link nav-dropdown-trigger">
        {label} <ChevronDown size={14} />
      </button>
      <div className="nav-dropdown-menu">
        {items.map((item) => (
          <Link key={item.href} to={item.href} className="nav-dropdown-item">
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
