import { useState } from 'react';
import { ChevronDown, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import './StaticPages.css';

const faqs = [
  { q: 'How do I rent a vehicle?', a: 'Browse our explore page, select a vehicle, choose your dates, and submit a booking request. Once the owner approves, you will be connected directly with them to finalize the rental and pickup details.' },
  { q: 'How do I list my vehicle?', a: 'Sign up for a free account, go to "List your Vehicle", and submit your vehicle details along with clear photos. Our team will quickly review the listing to ensure quality before it goes live.' },
  { q: 'Is Rentify free to use?', a: 'Yes! Rentify is a completely free platform. We do not charge commissions on your rentals, and we do not process rental payments. You keep 100% of what you earn.' },
  { q: 'How are payments handled?', a: 'Payments are handled directly between the renter and the vehicle owner. Rentify connects you, but you arrange the payment method (cash, bank transfer) directly when you meet or agree on the terms.' },
  { q: 'Can I cancel a booking request?', a: 'Yes, you can cancel a booking request through your dashboard. We recommend communicating directly with the owner or renter if you need to cancel a confirmed arrangement.' },
  { q: 'What if I have issues with a vehicle?', a: 'You should inspect the vehicle thoroughly before accepting it. If you have any major disputes, please try to resolve them with the owner directly. For platform issues, contact our support team.' },
  { q: 'Do I need insurance?', a: 'Yes, it is highly recommended. Rentify does not provide insurance. Vehicle owners should ensure their vehicle has the appropriate commercial or rental insurance coverage before handing over the keys.' },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="static-page">
      <SEO 
        title="FAQ — Vehicle Rental Questions | Rentify Sri Lanka"
        description="Got questions about renting vehicles in Sri Lanka? Find answers about booking, payments, cancellation, vehicle listings & more on Rentify. Start renting today!"
        keywords="Rentify FAQ, vehicle rental questions, how to rent car Sri Lanka, Rentify cancellation policy, car rental payment Sri Lanka, list vehicle Rentify"
        canonical="/faq"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": faqs.map(faq => ({
            "@type": "Question",
            "name": faq.q,
            "acceptedAnswer": {
              "@type": "Answer",
              "text": faq.a
            }
          }))
        }}
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
