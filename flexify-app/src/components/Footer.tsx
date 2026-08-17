import { Facebook, Instagram, Youtube, Twitter, Linkedin } from 'lucide-react';
import { useIsMobile } from '../hooks/useIsMobile';
import { Collapse } from 'antd';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import RentifyLogo from './RentifyLogo';
import { settingsApi } from '../api';
import './Footer.css';

export default function Footer() {
  const isMobile = useIsMobile();
  const [socialLinks, setSocialLinks] = useState({
    facebook: '#',
    instagram: '#',
    twitter: '#',
    linkedin: '#'
  });

  useEffect(() => {
    settingsApi.getSocialLinks().then(data => {
      if (data) setSocialLinks(data);
    }).catch(console.error);
  }, []);

  const sections = [
    {
      title: "Information",
      content: (
        <ul className="footer-links">
          <li><Link to="/about">About Rentify</Link></li>
          <li><Link to="/how-it-works">How It Works</Link></li>
          <li><Link to="/guides">Rentify Guides</Link></li>
          <li><Link to="/contact">Contact Us</Link></li>
          <li><Link to="/privacy">Privacy Policy</Link></li>
          <li><Link to="/terms-and-conditions">Terms & Conditions</Link></li>
        </ul>
      )
    }
  ];

  return (
    <footer className="footer">
      <div className="footer-main container section-padding">
        <div className="footer-grid">
          <div className="footer-brand">
            <h2 className="footer-logo" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><RentifyLogo style={{ height: "48px" }} /> Rentify</h2>
            <p className="footer-desc">
              Your trusted platform for renting, selling, and discovering vehicles worldwide. Premium car rental experience.
            </p>
            <div className="footer-socials">
              <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="social-icon"><Facebook size={16} /></a>
              <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="social-icon"><Instagram size={16} /></a>
              <a href={socialLinks.twitter} target="_blank" rel="noopener noreferrer" aria-label="Twitter" className="social-icon"><Twitter size={16} /></a>
              <a href={socialLinks.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="social-icon"><Linkedin size={16} /></a>
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
          <p>© {new Date().getFullYear()} Rentify. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
