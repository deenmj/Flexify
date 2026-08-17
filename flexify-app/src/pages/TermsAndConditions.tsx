import { ArrowLeft, FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';
import './StaticPages.css';

export default function TermsAndConditions() {
  const navigate = useNavigate();

  return (
    <div className="static-page">
      <SEO 
        title="Terms & Conditions | Rentify Sri Lanka"
        description="Read the Terms and Conditions for using Rentify. Understand the rules, rights, and responsibilities for vehicle owners and renters."
        keywords="Rentify terms, terms and conditions, vehicle rental rules Sri Lanka, renter responsibilities, owner guidelines"
        canonical="/terms-and-conditions"
      />
      <div className="container" style={{ maxWidth: '900px', padding: '4rem 1rem' }}>
        <button className="back-link" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} /> Back
        </button>

        <header className="static-header">
          <div className="icon-wrapper">
            <FileText size={32} />
          </div>
          <h1>Terms & Conditions</h1>
          <p>Last Updated: August 17, 2026</p>
        </header>

        <div className="static-content card" style={{ padding: '3rem' }}>
          <section>
            <p>
              Welcome to Rentify. By accessing or using our platform, you agree to be bound by these Terms and Conditions. Please read them carefully.
            </p>
            
            <h3 style={{ marginTop: '2rem' }}><CheckCircle size={20} style={{ display: 'inline', marginRight: '8px', color: 'var(--color-primary)' }}/> 1. Platform Role</h3>
            <p>
              Rentify is a peer-to-peer vehicle sharing marketplace that connects vehicle owners with renters. Rentify does not own, manage, or operate any of the vehicles listed on the platform. We provide the technology to facilitate connections, but all rental agreements and financial transactions are solely between the owner and the renter.
            </p>

            <h3 style={{ marginTop: '2rem' }}><CheckCircle size={20} style={{ display: 'inline', marginRight: '8px', color: 'var(--color-primary)' }}/> 2. User Responsibilities</h3>
            <p><strong>For Renters:</strong></p>
            <ul style={{ paddingLeft: '1.5rem', lineHeight: '1.8', marginBottom: '1rem' }}>
              <li>You must hold a valid Sri Lankan driving license or a valid international driving permit.</li>
              <li>You agree to use the rented vehicle responsibly and adhere to all traffic laws in Sri Lanka.</li>
              <li>You must communicate openly with the owner and return the vehicle in the agreed-upon condition.</li>
            </ul>
            <p><strong>For Owners:</strong></p>
            <ul style={{ paddingLeft: '1.5rem', lineHeight: '1.8' }}>
              <li>You must accurately represent the condition, availability, and pricing of your vehicle.</li>
              <li>You are responsible for maintaining valid commercial or rental insurance coverage for your vehicle.</li>
              <li>You must ensure the vehicle is safe, roadworthy, and properly registered.</li>
            </ul>

            <h3 style={{ marginTop: '2rem' }}><AlertTriangle size={20} style={{ display: 'inline', marginRight: '8px', color: '#f59e0b' }}/> 3. Payments and Fees</h3>
            <p>
              Rentify is completely free to use. We do not charge commissions on bookings, nor do we process rental payments. All payments must be negotiated and settled directly between the renter and the owner (e.g., via cash or direct bank transfer) outside of the Rentify platform.
            </p>

            <h3 style={{ marginTop: '2rem' }}><AlertTriangle size={20} style={{ display: 'inline', marginRight: '8px', color: '#f59e0b' }}/> 4. Liability and Insurance</h3>
            <p>
              Rentify acts only as an introductory platform and accepts no liability for any accidents, damages, disputes, or losses that occur during a rental period. It is the strict responsibility of the vehicle owner to verify the renter's credentials and ensure adequate insurance coverage is in place before handing over the vehicle keys.
            </p>

            <h3 style={{ marginTop: '2rem' }}><CheckCircle size={20} style={{ display: 'inline', marginRight: '8px', color: 'var(--color-primary)' }}/> 5. Prohibited Activities</h3>
            <p>Users may not use Rentify to:</p>
            <ul style={{ paddingLeft: '1.5rem', lineHeight: '1.8' }}>
              <li>List vehicles they do not have the legal right to rent out.</li>
              <li>Engage in fraudulent activities or create fake listings.</li>
              <li>Use rented vehicles for illegal activities.</li>
            </ul>

            <h3 style={{ marginTop: '2rem' }}><CheckCircle size={20} style={{ display: 'inline', marginRight: '8px', color: 'var(--color-primary)' }}/> 6. Account Termination</h3>
            <p>
              We reserve the right to suspend or terminate any user account that violates these Terms and Conditions, engages in fraudulent activity, or repeatedly receives negative feedback from the community.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
