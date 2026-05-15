import { useState } from 'react';
import { ChevronDown, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import './StaticPages.css';

const faqs = [
  { q: 'How do I rent a vehicle?', a: 'Simply browse our explore page, select a vehicle, choose your dates, and submit a booking request. The owner will approve your request, and you can proceed with payment.' },
  { q: 'How do I become a vehicle owner?', a: 'Sign up for an account, then submit a verification request through the "List your Vehicle" page. Our admin team will review your documents and approve your account.' },
  { q: 'Is it safe to rent through Rentify?', a: 'Absolutely! All vehicle owners go through a verification process. We also support verified business accounts for commercial rental providers.' },
  { q: 'What payment methods are supported?', a: 'We currently support online payment simulations. In the future, we plan to integrate Stripe and other payment gateways.' },
  { q: 'Can I cancel a booking?', a: 'Yes, both renters and owners can cancel bookings. Please check the cancellation policy for details on refunds.' },
  { q: 'How do owner commissions work?', a: 'Rentify takes a 5% commission on each completed booking. The remaining 95% goes directly to the vehicle owner.' },
  { q: 'What if I have issues with a vehicle?', a: 'Contact our support team immediately through the Help Center. We\'ll assist you in resolving any issues.' },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="static-page">
      <SEO 
        title="FAQ — Frequently Asked Questions | Rentify Sri Lanka"
        description="Find answers to common questions about renting vehicles, listing your car, payments, and more on Rentify.lk."
        canonical="/faq"
      />
      <section className="static-hero">
        <div className="container" style={{ textAlign: 'left' }}>
          <Link to="/" className="premium-back-btn" style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}>
            <ArrowLeft size={18} />
            <span>Back to Home</span>
          </Link>
          <h1 style={{ marginTop: '1rem' }}>Frequently Asked Questions</h1>
          <p>Find answers to common questions about Rentify</p>
        </div>
      </section>
      <section className="static-content container">
        <div className="faq-list">
          {faqs.map((faq, i) => (
            <div key={i} className={`faq-item card ${open === i ? 'faq-open' : ''}`}>
              <button className="faq-question" onClick={() => setOpen(open === i ? null : i)}>
                <span>{faq.q}</span>
                <ChevronDown size={20} className={`faq-arrow ${open === i ? 'faq-arrow-open' : ''}`} />
              </button>
              {open === i && (
                <div className="faq-answer animate-fade-in">
                  <p>{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
