import { ArrowLeft, Shield, Lock, FileText, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';
import './StaticPages.css';

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="static-page">
      <SEO 
        title="Privacy Policy & Terms of Service — Rentify Sri Lanka"
        description="Read the privacy policy and terms of service for Rentify, Sri Lanka's leading vehicle rental platform."
        canonical="/privacy"
      />
      <div className="container" style={{ maxWidth: '900px', padding: '4rem 1rem' }}>
        <button className="back-link" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} /> Back
        </button>

        <header className="static-header">
          <div className="icon-wrapper">
            <Shield size={32} />
          </div>
          <h1>Legal Center</h1>
          <p>Last Updated: March 2026</p>
        </header>

        <div className="static-content card">
          <section>
            <h2><Lock size={20} /> Privacy Policy</h2>
            <p>
              At Rentify, we take your privacy seriously. This Privacy Policy explains how we collect, use, and protect your personal information.
            </p>
            <h3>1. Information We Collect</h3>
            <ul>
              <li><strong>Account Data:</strong> Name, email, phone number, and password when you register.</li>
              <li><strong>Verification Data:</strong> NIC, driving license, and selfies for identity verification (KYC).</li>
              <li><strong>Usage Data:</strong> Information about how you interact with our platform, including search queries and bookings.</li>
            </ul>
            <h3>2. How We Use Data</h3>
            <p>
              We use your data to provide vehicle rental services, process payments via PayHere, and maintain platform security. For KYC verification, we strictly follow the Sri Lanka Personal Data Protection Act.
            </p>
          </section>

          <hr />

          <section>
            <h2><FileText size={20} /> Terms of Service</h2>
            <p>
              By using Rentify, you agree to comply with our platform rules and local laws of Sri Lanka.
            </p>
            <h3>1. User Eligibility</h3>
            <p>
              You must be at least 18 years old and possess a valid driving license to rent vehicles on Rentify. Owners must provide accurate vehicle descriptions and maintain insurance.
            </p>
            <h3>2. Bookings & Payments</h3>
            <p>
              All payments are processed securely. Owners are responsible for maintaining accurate blackout dates for their vehicles.
            </p>
          </section>

          <hr />

          <section>
            <h2><Info size={20} /> Cookie Policy</h2>
            <p>
              We use essential cookies to keep you logged in and functional cookies to improve your experience. We do not use intrusive tracking cookies.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
