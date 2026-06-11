import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Compass, Plus, Calendar, User, Car, Tag, X } from 'lucide-react';
import './BottomNav.css';

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [fabOpen, setFabOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/explore' && (location.pathname === '/explore' || location.pathname === '/')) return true;
    return location.pathname.startsWith(path);
  };

  const handleFabAction = (path: string) => {
    setFabOpen(false);
    navigate(path);
  };

  return (
    <>
      {/* Speed dial overlay */}
      {fabOpen && (
        <div className="fab-overlay" onClick={() => setFabOpen(false)} />
      )}

      <div className="bottom-nav">
        <Link to="/home" className={`bottom-nav-item ${isActive('/home') ? 'active' : ''}`}>
          <Home size={22} strokeWidth={isActive('/home') ? 2.5 : 2} />
          <span>Home</span>
        </Link>
        
        <Link to="/explore" className={`bottom-nav-item ${isActive('/explore') ? 'active' : ''}`}>
          <Compass size={22} strokeWidth={isActive('/explore') ? 2.5 : 2} />
          <span>Explore</span>
        </Link>
        
        {/* FAB Speed Dial */}
        <div className="bottom-nav-item bottom-nav-fab-container">
          <button
            className={`bottom-nav-fab ${fabOpen ? 'fab-active' : ''}`}
            onClick={() => setFabOpen(!fabOpen)}
            aria-label="Create listing"
          >
            {fabOpen ? <X size={26} strokeWidth={2.5} /> : <Plus size={28} strokeWidth={2.5} />}
          </button>

          {/* Speed Dial Sub-buttons */}
          <div className={`fab-speed-dial ${fabOpen ? 'fab-speed-dial-open' : ''}`}>
            <button className="fab-speed-item fab-item-rent" onClick={() => handleFabAction('/list-vehicle')}>
              <Car size={20} />
              <span>List for Rent</span>
            </button>
            <button className="fab-speed-item fab-item-sale" onClick={() => handleFabAction('/list-sale')}>
              <Tag size={20} />
              <span>List for Sale</span>
            </button>
          </div>
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
    </>
  );
}
