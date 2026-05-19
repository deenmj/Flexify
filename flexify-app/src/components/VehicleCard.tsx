import { Link } from 'react-router-dom';
import { type Vehicle, getOptimizedImageUrl, getVehicleSlug } from '../api';
import { Users, Star, Zap, Gauge, MapPin, Verified } from 'lucide-react';
import './VehicleCard.css';

export default function VehicleCard({ vehicle }: { vehicle: Vehicle }) {
  const ownerData = typeof vehicle.owner === 'object' ? vehicle.owner : null;
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
          <div className="shared-vehicle-badges">
            {vehicle.transmission && <span className="badge badge-primary">{vehicle.transmission}</span>}
            {ownerData?.ownerType === 'VERIFIED' && <span className="badge badge-success"><Verified size={12} /> Verified</span>}
            {ownerData?.subscription?.tier === 'PRO' && <span className="badge badge-premium" style={{ background: '#6610f2', color: 'white' }}><Star size={12} fill="white" /> Pro</span>}
            {ownerData?.subscription?.tier === 'STANDARD' && <span className="badge" style={{ background: '#f59e0b', color: 'white' }}>Standard</span>}
            {vehicle.weddingHiresSpecial && <span className="badge" style={{ background: 'linear-gradient(135deg, #f5d0fe 0%, #f472b6 100%)', color: '#701a75', fontWeight: 800 }}>💍 Wedding Hire</span>}
          </div>
        </div>
        <div className="shared-vehicle-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <h3 className="shared-vehicle-title">{vehicle.title}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 600, color: '#f59e0b' }}>
              <Star size={14} fill="currentColor" /> {vehicle.averageRating || 'New'} <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>({vehicle.reviewCount || 0})</span>
            </div>
          </div>
          <p className="shared-vehicle-model">{vehicle.make} {vehicle.model} {vehicle.year && `· ${vehicle.year}`}</p>
          <div className="shared-vehicle-specs">
            {vehicle.serviceType !== 'Bike' && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Users size={12} /> {vehicle.seats} seats</span>
            )}
            {vehicle.engineCapacity && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Zap size={12} /> {vehicle.engineCapacity}</span>}
            {vehicle.kmLimitPerDay && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Gauge size={12} /> {vehicle.kmLimitPerDay}km/day</span>}
            {!vehicle.kmLimitPerDay && <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}><Gauge size={12} /> Unlimited km</span>}
            {vehicle.driverOption === 'both' && <span style={{ color: '#8b5cf6' }}>Self / With Driver</span>}
            {vehicle.driverOption === 'with-driver' && <span style={{ color: '#8b5cf6' }}>With Driver</span>}
            {(!vehicle.driverOption || vehicle.driverOption === 'self-drive') && <span>Self Drive</span>}
            {(vehicle.city || vehicle.district) && (
              <span><MapPin size={12} /> {vehicle.city ? `${vehicle.city}, ${vehicle.district}` : vehicle.district}</span>
            )}
          </div>
          <div className="shared-vehicle-footer">
            <div className="shared-vehicle-price">
              <span className="price-amount">LKR {vehicle.pricePerDay.toLocaleString()}</span>
              <span className="price-unit">/day</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
