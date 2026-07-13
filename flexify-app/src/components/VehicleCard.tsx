import { Link } from 'react-router-dom';
import { type Vehicle, getOptimizedImageUrl, getVehicleSlug, userApi } from '../api';
import { Users, Star, Zap, Gauge, MapPin, Verified, Share2, Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { message } from 'antd';
import { useState, useEffect } from 'react';
import './VehicleCard.css';

export default function VehicleCard({ vehicle }: { vehicle: Vehicle }) {
  const ownerData = typeof vehicle.owner === 'object' ? vehicle.owner : null;
  const isBike = vehicle.serviceType?.[0]?.toLowerCase() === 'bike' || vehicle.serviceType?.[0]?.toLowerCase() === 'scooter';
  const { user, setUser } = useAuth();

  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const saved = user?.rentWishlist?.some((item: any) => 
      (typeof item === 'string' ? item : item._id) === vehicle._id
    ) || false;
    setIsSaved(saved);
  }, [user?.rentWishlist, vehicle._id]);

  const handleToggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) {
      message.info('Please log in to save this rental.');
      return;
    }
    try {
      setIsSaved(!isSaved); // Optimistic update
      const res = await userApi.toggleWishlistRent(vehicle._id);
      // @ts-ignore
      setUser({ ...user, rentWishlist: res.rentWishlist });
      message.success(res.message);
    } catch (err: any) {
      message.error(err.message || 'Failed to update wishlist');
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigating to the vehicle link
    e.stopPropagation();

    const shareText = `Check out this ${vehicle.year || ''} ${vehicle.make} ${vehicle.model} on Rentify!`;
    const shareUrl = `${window.location.origin}/vehicles/${getVehicleSlug(vehicle)}`;

    try {
      if (vehicle.photos?.[0]) {
        // 1. Fetch the image and convert to a File object
        const imageUrl = getOptimizedImageUrl(vehicle.photos[0], 400, 300);
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const file = new File([blob], 'vehicle-image.jpg', { type: blob.type });

        // 2. Check if the device supports sharing files
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: vehicle.title,
            text: shareText,
            url: shareUrl,
          });
          return;
        }
      }
      
      // Fallback for devices that support share but not files, or if no image
      if (navigator.share) {
        await navigator.share({
          title: vehicle.title,
          text: shareText,
          url: shareUrl,
        });
      } else {
        // Fallback for desktop
        navigator.clipboard.writeText(shareUrl);
        message.success('Link copied to clipboard!');
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  return (
    <Link to={`/vehicles/${getVehicleSlug(vehicle)}`} className="shared-vehicle-card-link">
      <div className="shared-vehicle-card card rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1.5 relative">
        <div className="shared-vehicle-img-wrap">
          <img
            src={getOptimizedImageUrl(vehicle.photos?.[0], 400, 300)}
            alt={vehicle.title}
            loading="lazy"
            className="shared-vehicle-img"
            onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542367597-87b9a3b9d8a6?auto=format&fit=crop&w=800&q=80'; }}
          />
          
          {/* Heart Button Overlay */}
          <button 
            onClick={handleToggleWishlist}
            style={{
              position: 'absolute', top: '12px', right: '12px',
              width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.9)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', 
              cursor: 'pointer', zIndex: 10, boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
            }}
          >
            {isSaved ? (
              <Heart size={16} color="#ef4444" fill="#ef4444" />
            ) : (
              <Heart size={16} color="#475569" />
            )}
          </button>
        </div>
        <div className="shared-vehicle-body">
          {/* Tags row below image */}
          <div className="shared-vehicle-tags-row">
            {vehicle.transmission && <span className="v-card-tag">{vehicle.transmission}</span>}
            {ownerData?.ownerType === 'VERIFIED' && <span className="v-card-tag v-verified"><Verified size={10} style={{ marginRight: '2px' }} /> Verified</span>}
            {vehicle.weddingHiresSpecial && <span className="v-card-tag v-wedding">💍 Wedding Hire</span>}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
            <h3 className="shared-vehicle-title" title={vehicle.title}>{vehicle.title}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '12px', fontWeight: 700, color: '#f59e0b', flexShrink: 0 }}>
              <Star size={12} fill="currentColor" /> {vehicle.averageRating ? vehicle.averageRating.toFixed(1) : 'New'}
            </div>
          </div>

          <p className="shared-vehicle-model">{vehicle.make} {vehicle.model} {vehicle.year && `· ${vehicle.year}`}</p>

          <div className="shared-vehicle-specs">
            {!isBike && (
              <span><Users size={12} /> {vehicle.seats} Seats</span>
            )}
            <span>
              <Gauge size={12} /> {vehicle.kmLimitPerDay ? `${vehicle.kmLimitPerDay} km/day` : 'Unlimited km'}
            </span>
            {!isBike && (
              <span>
                {vehicle.driverOption === 'with-driver' ? 'With Driver' : vehicle.driverOption === 'both' ? 'Self/Driver' : 'Self Drive'}
              </span>
            )}
          </div>

          <div className="shared-vehicle-location" title={vehicle.city ? `${vehicle.city}, ${vehicle.district}` : vehicle.district}>
            <MapPin size={12} />
            <span>{vehicle.city ? `${vehicle.city}, ${vehicle.district}` : vehicle.district}</span>
          </div>

          <div className="shared-vehicle-footer">
            <div className="shared-vehicle-price">
              <span className="price-amount">LKR {vehicle.pricePerDay.toLocaleString()}</span>
              <span className="price-unit">/day</span>
            </div>
            <button className="share-btn" onClick={handleShare} aria-label="Share">
              <Share2 size={16} />
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
