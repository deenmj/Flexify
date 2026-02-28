import { Search, BookOpen, MessageCircle, Shield, CreditCard, Car } from 'lucide-react';
import { Link } from 'react-router-dom';
import './StaticPages.css';

const topics = [
  { icon: <Search size={24} />, title: 'Finding a Vehicle', desc: 'Learn how to search and filter vehicles', link: '/explore' },
  { icon: <BookOpen size={24} />, title: 'Booking Process', desc: 'Step-by-step booking guide', link: '/faq' },
  { icon: <Shield size={24} />, title: 'Safety & Trust', desc: 'How we keep you safe', link: '/about' },
  { icon: <CreditCard size={24} />, title: 'Payments', desc: 'Payment methods and refunds', link: '/faq' },
  { icon: <Car size={24} />, title: 'Listing a Vehicle', desc: 'How to become an owner', link: '/list-vehicle' },
  { icon: <MessageCircle size={24} />, title: 'Contact Support', desc: 'Get help from our team', link: '/contact' },
];

export default function Help() {
  return (
    <div className="static-page">
      <section className="static-hero">
        <div className="container">
          <h1>Help Center</h1>
          <p>How can we help you today?</p>
        </div>
      </section>
      <section className="static-content container">
        <div className="help-grid">
          {topics.map((topic, i) => (
            <Link to={topic.link} key={i} className="help-card card">
              <div className="help-card-icon">{topic.icon}</div>
              <h3>{topic.title}</h3>
              <p>{topic.desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
