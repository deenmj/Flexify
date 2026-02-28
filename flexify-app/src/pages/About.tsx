import { Shield, Users, Globe, Award } from 'lucide-react';
import './StaticPages.css';

export default function About() {
  return (
    <div className="static-page">
      <section className="static-hero">
        <div className="container">
          <h1>About Flexify</h1>
          <p>Connecting vehicle owners with renters worldwide since 2024</p>
        </div>
      </section>
      <section className="static-content container">
        <div className="about-grid">
          <div className="about-text">
            <h2>Our Mission</h2>
            <p>Flexify is a peer-to-peer vehicle rental platform that connects vehicle owners with people who need a ride. Whether you're looking for a luxury sedan for a business trip or a family SUV for a road trip, Flexify has you covered.</p>
            <p>We believe in creating a seamless, trustworthy, and affordable vehicle rental experience. Our platform features verified owners, secure payments, and a wide selection of vehicles.</p>
          </div>
          <div className="about-values">
            <div className="about-value-card">
              <Shield size={28} className="about-value-icon" />
              <h3>Trust & Safety</h3>
              <p>All owners are verified, and every vehicle is inspected for quality and safety.</p>
            </div>
            <div className="about-value-card">
              <Users size={28} className="about-value-icon" />
              <h3>Community First</h3>
              <p>Built by a community of car enthusiasts who love sharing great experiences.</p>
            </div>
            <div className="about-value-card">
              <Globe size={28} className="about-value-icon" />
              <h3>Global Reach</h3>
              <p>Available in 50+ cities with a growing network of owners and vehicles.</p>
            </div>
            <div className="about-value-card">
              <Award size={28} className="about-value-icon" />
              <h3>Quality Assured</h3>
              <p>Every listing goes through our admin approval process to ensure quality.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
