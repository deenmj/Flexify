import { useState } from 'react';
import { ArrowLeft, Clock, ChevronRight } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { guidesData } from '../data/guidesData';
import type { Guide } from '../data/guidesData';
import './StaticPages.css';

export default function Guides() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'All' | 'Renter' | 'Owner'>('All');

  const filteredGuides = guidesData.filter(g => filter === 'All' || g.category === filter);

  return (
    <div className="static-page">
      <SEO 
        title="Rentify Guides | Tips for Renters and Owners"
        description="Explore our comprehensive guides for Rentify users. Learn how to maximize your earnings as an owner or find the perfect vehicle as a renter."
        keywords="Rentify guides, car rental tips, how to rent a car, vehicle owner tips, maximize rental income"
        canonical="/guides"
      />
      
      <section className="static-hero section-padding">
        <div className="container" style={{ textAlign: 'left' }}>
          <Link to="/" className="premium-back-btn" style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}>
            <ArrowLeft size={18} />
            <span>Back to Home</span>
          </Link>
          <h1 style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            Rentify Guides
          </h1>
          <p>Tips, tricks, and best practices for our community.</p>
        </div>
      </section>

      <section className="static-content container section-padding">
        <div className="guides-filter" style={{ display: 'flex', gap: '1rem', marginBottom: '3rem' }}>
          {['All', 'Renter', 'Owner'].map(cat => (
            <button 
              key={cat}
              className={`btn ${filter === cat ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setFilter(cat as any)}
              style={{ borderRadius: '20px' }}
            >
              {cat} Guides
            </button>
          ))}
        </div>

        <div className="guides-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
          {filteredGuides.map((guide: Guide) => (
            <Link to={`/guides/${guide.slug}`} key={guide.id} className="guide-card card" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s', padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span className={`badge ${guide.category === 'Renter' ? 'badge-primary' : 'badge-success'}`}>
                  {guide.category}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <Clock size={14} /> {guide.readTime}
                </span>
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--color-primary)' }}>{guide.title}</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', flex: 1 }}>{guide.description}</p>
              <div style={{ display: 'flex', alignItems: 'center', color: 'var(--color-primary)', fontWeight: 600, fontSize: '0.9rem' }}>
                Read Guide <ChevronRight size={16} />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
