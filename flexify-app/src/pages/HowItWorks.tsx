import { ArrowLeft, UserPlus, Car, CalendarCheck, Key } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';
import './StaticPages.css';

export default function HowItWorks() {
  const navigate = useNavigate();

  return (
    <div className="static-page">
      <SEO 
        title="How It Works | Rentify Sri Lanka"
        description="Learn how to rent a vehicle or list your own car on Rentify. Simple, secure, and hassle-free peer-to-peer vehicle sharing in Sri Lanka."
        keywords="how to rent a car Sri Lanka, list vehicle Rentify, how Rentify works, peer to peer car rental"
        canonical="/how-it-works"
      />
      <div className="container" style={{ maxWidth: '1000px', padding: '4rem 1rem' }}>
        <button className="back-link" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} /> Back
        </button>

        <header className="static-header" style={{ marginBottom: '4rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '2.5rem', color: 'var(--color-primary)' }}>How Rentify Works</h1>
          <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>The easiest way to rent and share vehicles in Sri Lanka.</p>
        </header>

        <div className="how-it-works-grid">
          <div className="how-it-works-column">
            <h2 className="how-it-works-title">For Renters</h2>
            
            <div className="step-card">
              <div className="step-icon"><UserPlus size={28} /></div>
              <div className="step-content">
                <h3>1. Create an Account</h3>
                <p>Sign up for free. Browse our extensive catalog of vehicles available across all districts in Sri Lanka.</p>
              </div>
            </div>

            <div className="step-card">
              <div className="step-icon"><Car size={28} /></div>
              <div className="step-content">
                <h3>2. Find Your Perfect Ride</h3>
                <p>Filter by vehicle type, district, and price. View detailed photos and read the owner's terms.</p>
              </div>
            </div>

            <div className="step-card">
              <div className="step-icon"><CalendarCheck size={28} /></div>
              <div className="step-content">
                <h3>3. Send a Request</h3>
                <p>Select your dates and request to book. The vehicle owner will review and approve your request quickly.</p>
              </div>
            </div>

            <div className="step-card">
              <div className="step-icon"><Key size={28} /></div>
              <div className="step-content">
                <h3>4. Connect and Drive</h3>
                <p>Once approved, connect directly with the owner to arrange pickup and payment. Hit the road safely!</p>
              </div>
            </div>
          </div>

          <div className="how-it-works-column">
            <h2 className="how-it-works-title">For Vehicle Owners</h2>
            
            <div className="step-card">
              <div className="step-icon"><UserPlus size={28} /></div>
              <div className="step-content">
                <h3>1. Become an Owner</h3>
                <p>Register as an owner for free. You have full control over your vehicles and pricing.</p>
              </div>
            </div>

            <div className="step-card">
              <div className="step-icon"><Car size={28} /></div>
              <div className="step-content">
                <h3>2. List Your Vehicle</h3>
                <p>Add high-quality photos, set your daily rate, and describe your vehicle's features and your rental terms.</p>
              </div>
            </div>

            <div className="step-card">
              <div className="step-icon"><CalendarCheck size={28} /></div>
              <div className="step-content">
                <h3>3. Review Requests</h3>
                <p>Receive booking requests from renters. You decide who rents your vehicle by approving or declining requests.</p>
              </div>
            </div>

            <div className="step-card">
              <div className="step-icon"><Key size={28} /></div>
              <div className="step-content">
                <h3>4. Earn Money</h3>
                <p>Meet the renter, hand over the keys, and collect your payment directly. You keep 100% of the earnings.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
