import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { ArrowLeft, Clock, Calendar } from 'lucide-react';
import SEO from '../components/SEO';
import { guidesData } from '../data/guidesData';
import './StaticPages.css';

export default function GuideArticle() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  
  const guide = guidesData.find(g => g.slug === slug);

  if (!guide) {
    return <Navigate to="/guides" replace />;
  }

  return (
    <div className="static-page">
      <SEO 
        title={`${guide.title} | Rentify Guides`}
        description={guide.description}
        canonical={`/guides/${guide.slug}`}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": guide.title,
          "description": guide.description,
          "datePublished": guide.date
        }}
      />
      <div className="container" style={{ maxWidth: '800px', padding: '4rem 1rem' }}>
        <button className="back-link" onClick={() => navigate('/guides')}>
          <ArrowLeft size={18} /> Back to Guides
        </button>

        <header style={{ marginBottom: '3rem', textAlign: 'center' }}>
          <span className={`badge ${guide.category === 'Renter' ? 'badge-primary' : 'badge-success'}`} style={{ marginBottom: '1rem', display: 'inline-block' }}>
            {guide.category} Guide
          </span>
          <h1 style={{ fontSize: '2.5rem', color: 'var(--color-primary)', marginBottom: '1rem', lineHeight: 1.3 }}>
            {guide.title}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', color: 'var(--text-secondary)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={16} /> {guide.date}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={16} /> {guide.readTime}</span>
          </div>
        </header>

        <div className="static-content card article-content" style={{ padding: '3rem' }}>
          <div dangerouslySetInnerHTML={{ __html: guide.content }} />
        </div>
      </div>
    </div>
  );
}
