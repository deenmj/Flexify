import { Link, useLocation } from 'react-router-dom';
import { Home, Compass, Plus, Calendar, User } from 'lucide-react';
import './BottomNav.css';

export default function BottomNav() {
  const location = useLocation();

  // Hide Bottom Navigation only on auth screens
  const hideOnPaths = [
    '/auth'
  ];

  const shouldHide = hideOnPaths.some(path => location.pathname.startsWith(path));
  if (shouldHide) return null;

  // Highlight active routes
  const isActive = (path: string) => {
    if (path === '/explore' && (location.pathname === '/explore' || location.pathname === '/')) return true;
    return location.pathname.startsWith(path);
  };

  return (
    <div className="bottom-nav">
      <Link to="/home" className={`bottom-nav-item ${isActive('/home') ? 'active' : ''}`}>
        <Home size={22} strokeWidth={isActive('/home') ? 2.5 : 2} />
        <span>Home</span>
      </Link>
      
      <Link to="/explore" className={`bottom-nav-item ${isActive('/explore') ? 'active' : ''}`}>
        <Compass size={22} strokeWidth={isActive('/explore') ? 2.5 : 2} />
        <span>Explore</span>
      </Link>
      
      <div className="bottom-nav-item bottom-nav-fab-container">
        <Link to="/list-vehicle" className="bottom-nav-fab">
          <Plus size={28} strokeWidth={2.5} />
        </Link>
      </div>
      
      <Link to="/dashboard" className={`bottom-nav-item ${isActive('/dashboard') ? 'active' : ''}`}>
        <Calendar size={22} strokeWidth={isActive('/dashboard') ? 2.5 : 2} />
        <span>Bookings</span>
      </Link>
      
      <Link to="/profile" className={`bottom-nav-item ${isActive('/profile') ? 'active' : ''}`}>
        <User size={22} strokeWidth={isActive('/profile') ? 2.5 : 2} />
        <span>Profile</span>
      </Link>
    </div>
  );
}
