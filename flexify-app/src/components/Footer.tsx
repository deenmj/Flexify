import { Link } from 'react-router-dom';
import { Facebook, Instagram, Youtube, Twitter } from 'lucide-react';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-main container">
        <div className="footer-grid">
          <div className="footer-brand">
            <h2 className="footer-logo">Flexify</h2>
            <p className="footer-desc">
              Your trusted platform for renting, selling, and discovering vehicles worldwide. Premium car rental experience.
            </p>
            <div className="footer-socials">
              <a href="#" aria-label="Facebook" className="social-icon"><Facebook size={18} /></a>
              <a href="#" aria-label="Instagram" className="social-icon"><Instagram size={18} /></a>
              <a href="#" aria-label="YouTube" className="social-icon"><Youtube size={18} /></a>
              <a href="#" aria-label="Twitter" className="social-icon"><Twitter size={18} /></a>
            </div>
          </div>

          <div className="footer-links-group">
            <h3 className="footer-heading">Quick Links</h3>
            <ul className="footer-links">
              <li><Link to="/">Home</Link></li>
              <li><Link to="/explore">Explore</Link></li>
              <li><Link to="/list-vehicle">List your Vehicle</Link></li>
              <li><Link to="/about">About Us</Link></li>
            </ul>
          </div>

          <div className="footer-links-group">
            <h3 className="footer-heading">Support</h3>
            <ul className="footer-links">
              <li><Link to="/help">Help Center</Link></li>
              <li><Link to="/faq">FAQ</Link></li>
              <li><Link to="/contact">Contact Us</Link></li>
            </ul>
          </div>

          <div className="footer-links-group">
            <h3 className="footer-heading">Legal</h3>
            <ul className="footer-links">
              <li><Link to="#">Privacy Policy</Link></li>
              <li><Link to="#">Terms of Service</Link></li>
              <li><Link to="#">Cookie Policy</Link></li>
            </ul>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} Flexify. All rights reserved.</p>
      </div>
    </footer>
  );
}
