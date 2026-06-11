import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { saleListingApi, getImageUrl, type VehicleSaleListing, type User } from '../api';
import { Phone, MapPin, Gauge, Fuel, Settings, Car, ChevronLeft, ChevronRight, MessageSquare, Tag, Share2 } from 'lucide-react';
import { Spin, message } from 'antd';
import SEO from '../components/SEO';
import './SaleVehicleDetail.css';

export default function SaleVehicleDetail() {
  const { id: rawId } = useParams<{ id: string }>();
  // Extract real ID from slug (format: slug--id)
  const id = rawId?.includes('--') ? rawId.split('--').pop()! : rawId!;

  const [listing, setListing] = useState<VehicleSaleListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPhoto, setCurrentPhoto] = useState(0);

  useEffect(() => {
    const fetchListing = async () => {
      try {
        const data = await saleListingApi.getById(id);
        setListing(data);
      } catch (err) {
        console.error('Failed to fetch listing', err);
      } finally {
        setLoading(false);
      }
    };
    fetchListing();
  }, [id]);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: listing?.title, url });
      } catch {}
    } else {
      navigator.clipboard.writeText(url);
      message.success('Link copied to clipboard!');
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
      <Spin size="large" />
    </div>
  );

  if (!listing) return (
    <div className="container" style={{ padding: '6rem 2rem', textAlign: 'center' }}>
      <h2>Listing not found</h2>
      <p>This vehicle may have been sold or removed.</p>
    </div>
  );

  const seller = typeof listing.seller === 'object' ? listing.seller as User : null;
  const photos = listing.photos || [];
  const hasPhotos = photos.length > 0;

  const nextPhoto = () => setCurrentPhoto(prev => (prev + 1) % photos.length);
  const prevPhoto = () => setCurrentPhoto(prev => (prev - 1 + photos.length) % photos.length);

  const conditionColor = (c: string) => {
    switch (c) {
      case 'Brand New': return '#10b981';
      case 'Excellent': return '#3b82f6';
      case 'Good': return '#f59e0b';
      case 'Used': return '#94a3b8';
      default: return '#64748b';
    }
  };

  return (
    <div className="sale-detail-page">
      <SEO
        title={`${listing.title} — For Sale | Rentify.lk`}
        description={`${listing.title} for sale at LKR ${listing.price.toLocaleString()} in ${listing.city}. ${listing.condition} condition, ${listing.mileage.toLocaleString()} km driven.`}
      />

      <div className="sale-detail-container">
        {/* ── 1. Image Carousel ── */}
        <div className="sale-carousel">
          {hasPhotos ? (
            <>
              <img src={getImageUrl(photos[currentPhoto])} alt={listing.title} className="carousel-main-img" />
              {photos.length > 1 && (
                <>
                  <button className="carousel-nav carousel-prev" onClick={prevPhoto}><ChevronLeft size={24} /></button>
                  <button className="carousel-nav carousel-next" onClick={nextPhoto}><ChevronRight size={24} /></button>
                  <div className="carousel-dots">
                    {photos.map((_, i) => (
                      <button key={i} className={`carousel-dot ${i === currentPhoto ? 'active' : ''}`} onClick={() => setCurrentPhoto(i)} />
                    ))}
                  </div>
                </>
              )}
              <div className="carousel-counter">{currentPhoto + 1} / {photos.length}</div>
            </>
          ) : (
            <div className="carousel-placeholder">
              <Car size={64} strokeWidth={1} />
              <span>No photos available</span>
            </div>
          )}
          <div className="sale-badge-detail">FOR SALE</div>
        </div>

        {/* ── 2. Title & Price Block ── */}
        <div className="sale-detail-section sale-title-block">
          <div className="sale-title-row">
            <h1>{listing.title}</h1>
            <button className="share-btn" onClick={handleShare} title="Share">
              <Share2 size={18} />
            </button>
          </div>
          <div className="sale-price-row">
            <span className="sale-price">LKR {listing.price.toLocaleString()}</span>
            <span className="condition-tag" style={{ background: conditionColor(listing.condition) }}>
              {listing.condition}
            </span>
          </div>
          <div className="sale-location-line">
            <MapPin size={14} /> {listing.city}
            {listing.createdAt && (
              <span className="sale-date"> · Listed {new Date(listing.createdAt).toLocaleDateString()}</span>
            )}
          </div>
        </div>

        {/* ── 3. Call Seller CTA ── */}
        <div className="sale-detail-section sale-cta-block">
          <a href={`tel:${listing.contactPhone}`} className="call-seller-btn">
            <Phone size={20} />
            <div>
              <span className="cta-label">Call Seller</span>
              <span className="cta-phone">{listing.contactPhone}</span>
            </div>
          </a>
          <a
            href={`https://wa.me/${listing.contactPhone.replace(/[^0-9]/g, '').replace(/^0/, '94')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="whatsapp-seller-btn"
          >
            <MessageSquare size={20} />
            <span>WhatsApp</span>
          </a>
        </div>

        {/* ── 4. Specifications Stack ── */}
        <div className="sale-detail-section">
          <h2 className="section-heading"><Tag size={18} /> Specifications</h2>
          <div className="specs-grid">
            <div className="spec-item">
              <Gauge size={18} />
              <div>
                <span className="spec-label">Mileage</span>
                <span className="spec-value">{listing.mileage.toLocaleString()} km</span>
              </div>
            </div>
            <div className="spec-item">
              <Car size={18} />
              <div>
                <span className="spec-label">Condition</span>
                <span className="spec-value">{listing.condition}</span>
              </div>
            </div>
            {listing.fuelType && (
              <div className="spec-item">
                <Fuel size={18} />
                <div>
                  <span className="spec-label">Fuel Type</span>
                  <span className="spec-value">{listing.fuelType}</span>
                </div>
              </div>
            )}
            {listing.transmission && (
              <div className="spec-item">
                <Settings size={18} />
                <div>
                  <span className="spec-label">Transmission</span>
                  <span className="spec-value">{listing.transmission}</span>
                </div>
              </div>
            )}
            {listing.engineCapacity && (
              <div className="spec-item">
                <Settings size={18} />
                <div>
                  <span className="spec-label">Engine</span>
                  <span className="spec-value">{listing.engineCapacity}</span>
                </div>
              </div>
            )}
            <div className="spec-item">
              <MapPin size={18} />
              <div>
                <span className="spec-label">Location</span>
                <span className="spec-value">{listing.city}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── 5. Description Block ── */}
        {listing.description && (
          <div className="sale-detail-section">
            <h2 className="section-heading">Description</h2>
            <p className="sale-description">{listing.description}</p>
          </div>
        )}

        {/* ── Seller Card ── */}
        {seller && (
          <div className="sale-detail-section seller-card">
            <div className="seller-info">
              <img
                src={seller.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(seller.name)}&background=10b981&color=fff`}
                alt={seller.name}
                className="seller-avatar"
              />
              <div>
                <div className="seller-name">{seller.name}</div>
                <div className="seller-label">Seller on Rentify</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Sticky Mobile CTA ── */}
      <div className="sale-sticky-cta">
        <div className="sticky-price">LKR {listing.price.toLocaleString()}</div>
        <a href={`tel:${listing.contactPhone}`} className="sticky-call-btn">
          <Phone size={18} /> Call Seller
        </a>
      </div>
    </div>
  );
}
