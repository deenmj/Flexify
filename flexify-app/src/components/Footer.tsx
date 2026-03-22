import { Facebook, Instagram, Youtube, Twitter } from 'lucide-react';
import { useIsMobile } from '../hooks/useIsMobile';
import { Collapse } from 'antd';
import { Link } from 'react-router-dom'; // Assuming Link is from react-router-dom
import './Footer.css';

export default function Footer() {
  const isMobile = useIsMobile();

  const sections = [
    {
      title: "Quick Links",
      content: (
        <ul className="footer-links">
          <li><Link to="/">Home</Link></li>
          <li><Link to="/explore">Explore</Link></li>
          <li><Link to="/list-vehicle">List your Vehicle</Link></li>
          <li><Link to="/about">About Us</Link></li>
        </ul>
      )
    },
    {
      title: "Support",
      content: (
        <ul className="footer-links">
          <li><Link to="/help">Help Center</Link></li>
          <li><Link to="/faq">FAQ</Link></li>
          <li><Link to="/contact">Contact Us</Link></li>
        </ul>
      )
    },
    {
      title: "Legal",
      content: (
        <ul className="footer-links">
          <li><Link to="/privacy">Privacy Policy</Link></li>
          <li><Link to="#">Terms of Service</Link></li>
          <li><Link to="#">Cookie Policy</Link></li>
        </ul>
      )
    }
  ];

  return (
    <footer className="footer">
      <div className="footer-main container section-padding">
        <div className="footer-grid">
          <div className="footer-brand">
            <h2 className="footer-logo">Flexify</h2>
            <p className="footer-desc">
              Your trusted platform for renting, selling, and discovering vehicles worldwide. Premium car rental experience.
            </p>
            <div className="footer-socials">
              <a href="#" aria-label="Facebook" className="social-icon"><Facebook size={24} /></a>
              <a href="#" aria-label="Instagram" className="social-icon"><Instagram size={24} /></a>
              <a href="#" aria-label="YouTube" className="social-icon"><Youtube size={24} /></a>
              <a href="#" aria-label="Twitter" className="social-icon"><Twitter size={24} /></a>
            </div>
          </div>

          {!isMobile ? (
            <>
              {sections.map((section) => (
                <div key={section.title} className="footer-links-group">
                  <h3 className="footer-heading">{section.title}</h3>
                  {section.content}
                </div>
              ))}
            </>
          ) : (
            <div className="footer-mobile-collapse">
              <Collapse ghost expandIconPosition="end">
                {sections.map((section) => (
                  <Collapse.Panel header={section.title} key={section.title}>
                    {section.content}
                  </Collapse.Panel>
                ))}
              </Collapse>
            </div>
          )}
        </div>
      </div>
      <div className="footer-bottom">
        <div className="container" style={{ display: 'flex', justifyContent: 'center' }}>
          <p>© {new Date().getFullYear()} Flexify. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
