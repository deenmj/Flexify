import { ArrowLeft, Shield, Lock, FileText, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';
import './StaticPages.css';

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="static-page">
      <SEO 
        title="Privacy Policy & Terms of Service | Rentify Sri Lanka"
        description="Read the privacy policy, terms of service, and cookie policy for Rentify. Learn how we protect your data and secure vehicle rentals in Sri Lanka."
        keywords="Rentify privacy policy, terms of service Sri Lanka, Rentify terms, data protection vehicle rental, cookie policy"
        canonical="/privacy"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": "Privacy Policy & Terms of Service",
          "description": "Privacy policy and terms of service for Rentify Sri Lanka"
        }}
      />
      <div className="container" style={{ maxWidth: '900px', padding: '4rem 1rem' }}>
        <button className="back-link" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} /> Back
        </button>

        <header className="static-header">
          <div className="icon-wrapper">
            <Shield size={32} />
          </div>
          <h1>Privacy Policy</h1>
          <p>Last Updated: August 17, 2026</p>
        </header>

        <div className="static-content card" style={{ padding: '3rem' }}>
          <section>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Lock size={24} style={{ color: 'var(--color-primary)' }}/> Privacy Policy</h2>
            <p>
              At Rentify, we are committed to protecting your privacy and ensuring the security of your personal data. This Privacy Policy outlines how we collect, use, and safeguard your information when you use our platform in Sri Lanka.
            </p>
            
            <h3 style={{ marginTop: '2rem' }}>1. Information We Collect</h3>
            <ul style={{ paddingLeft: '1.5rem', lineHeight: '1.8' }}>
              <li><strong>Account Information:</strong> When you register on Rentify, we collect your name, email address, phone number, and password.</li>
              <li><strong>Profile Data:</strong> If you choose to provide it, we store your profile picture and address.</li>
              <li><strong>Vehicle Information:</strong> If you list a vehicle, we collect details about your vehicle including make, model, registration number, location, and photos.</li>
              <li><strong>Usage Data:</strong> We automatically collect information about how you interact with our platform, such as IP addresses, browser types, search queries, and pages visited.</li>
            </ul>

            <h3 style={{ marginTop: '2rem' }}>2. How We Use Your Data</h3>
            <p>We use the collected information for the following purposes:</p>
            <ul style={{ paddingLeft: '1.5rem', lineHeight: '1.8' }}>
              <li>To provide, maintain, and improve our vehicle rental marketplace.</li>
              <li>To facilitate communication between vehicle owners and renters.</li>
              <li>To send you important notifications regarding your account, bookings, and platform updates.</li>
              <li>To detect and prevent fraudulent activities, unauthorized access, and policy violations.</li>
            </ul>

            <h3 style={{ marginTop: '2rem' }}>3. Data Sharing and Disclosure</h3>
            <p>
              Rentify acts as a connector between vehicle owners and renters. When a booking is requested and approved, necessary contact information (such as phone numbers and names) is shared between the involved parties to facilitate the rental. We do not sell your personal data to third-party advertisers. We may share information with law enforcement agencies if required by Sri Lankan law.
            </p>

            <h3 style={{ marginTop: '2rem' }}>4. Data Security</h3>
            <p>
              We implement industry-standard security measures to protect your personal data from unauthorized access, alteration, disclosure, or destruction. However, no internet transmission is entirely secure, and we cannot guarantee absolute security.
            </p>

            <h3 style={{ marginTop: '2rem' }}>5. Third-Party Services</h3>
            <p>
              We use third-party services such as Google (for OAuth authentication) and Cloudinary (for image hosting). These services have their own privacy policies regarding the data they collect and process.
            </p>

            <h3 style={{ marginTop: '2rem' }}>6. Your Rights</h3>
            <p>
              You have the right to access, update, or delete your personal information stored on our platform. You can manage your profile through your account dashboard or contact our support team for assistance.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
