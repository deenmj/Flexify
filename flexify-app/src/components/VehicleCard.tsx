import { Link } from 'react-router-dom';
import { type Vehicle, getOptimizedImageUrl, getVehicleSlug } from '../api';
import { Users, Star, Zap, Gauge, MapPin, Verified, Share2 } from 'lucide-react';
import './VehicleCard.css';

export default function VehicleCard({ vehicle }: { vehicle: Vehicle }) {
  const ownerData = typeof vehicle.owner === 'object' ? vehicle.owner : null;
  const isBike = vehicle.serviceType?.[0]?.toLowerCase() === 'bike' || vehicle.serviceType?.[0]?.toLowerCase() === 'scooter';

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigating to the vehicle link
    if (navigator.share) {
      try {
        await navigator.share({
          title: vehicle.title,
          text: `Check out this ${vehicle.make} ${vehicle.model} on Rentify!`,
          url: `${window.location.origin}/vehicles/${getVehicleSlug(vehicle)}`,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      navigator.clipboard.writeText(`${window.location.origin}/vehicles/${getVehicleSlug(vehicle)}`);
    }
  };

  return (
    <Link to={`/vehicles/${getVehicleSlug(vehicle)}`} className="shared-vehicle-card-link">
      <div className="shared-vehicle-card card">
        <div className="shared-vehicle-img-wrap">
          <img
            src={getOptimizedImageUrl(vehicle.photos?.[0], 400, 300)}
            alt={vehicle.title}
            loading="lazy"
            className="shared-vehicle-img"
            onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542367597-87b9a3b9d8a6?auto=format&fit=crop&w=800&q=80'; }}
          />
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
