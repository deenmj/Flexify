import { useState } from 'react';
import { Mail, Phone, MapPin, Send, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import './StaticPages.css';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Message sent! We will get back to you soon.');
    setForm({ name: '', email: '', message: '' });
  };

  return (
    <div className="static-page">
      <section className="static-hero section-padding">
        <div className="container" style={{ textAlign: 'left' }}>
          <Link to="/profile" className="premium-back-btn" style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}>
            <ArrowLeft size={18} />
            <span>Back to Profile</span>
          </Link>
          <h1 style={{ marginTop: '1rem' }}>Contact & Support</h1>
          <p>We're here to help you with anything you need</p>
        </div>
      </section>
      <section className="static-content container section-padding">
        <div className="contact-grid">
          <div className="contact-info">
            <h2>Get in Touch</h2>
            <p>We'd love to hear from you. Send us a message and we'll respond as soon as possible.</p>
            <div className="contact-details">
              <div className="contact-detail-item">
                <Mail size={20} className="contact-detail-icon" />
                <div>
                  <h4>Email</h4>
                  <p>support@flexify.com</p>
                </div>
              </div>
              <div className="contact-detail-item">
                <Phone size={20} className="contact-detail-icon" />
                <div>
                  <h4>Phone</h4>
                  <p>+1 (555) 123-4567</p>
                </div>
              </div>
              <div className="contact-detail-item">
                <MapPin size={20} className="contact-detail-icon" />
                <div>
                  <h4>Location</h4>
                  <p>Colombo, Sri Lanka</p>
                </div>
              </div>
            </div>
          </div>
          <form className="contact-form card" onSubmit={handleSubmit}>
            <div className="input-group">
              <label>Your Name</label>
              <input type="text" className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="input-group">
              <label>Your Email</label>
              <input type="email" className="input-field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="input-group">
              <label>Message</label>
              <textarea className="input-field" rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required />
            </div>
            <button type="submit" className="btn btn-primary btn-full">
              <Send size={16} /> Send Message
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
