import { Settings, Wrench, Clock, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { MaintenanceData } from '../api';

export default function MaintenanceScreen({ data }: { data?: MaintenanceData }) {
  const title = data?.maintenanceTitle || 'System Upgrade';
  const message = data?.maintenanceMessage || 'We are performing scheduled maintenance to bring you an even better, faster, and more secure Rentify experience. We\'ll be back shortly!';
  const time = data?.estimatedTime || '~ 15 Minutes';
  const status = data?.progressStatus || 'Upgrading...';

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        overflowY: 'auto'
      }}
    >
      {/* Centered Modal Box */}
      <div 
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: '2rem 1.5rem',
          margin: 'auto', // helps with flex centering when taller than viewport
          maxWidth: '500px',
          width: '100%',
          borderRadius: '24px',
          background: 'linear-gradient(145deg, #1e293b, #0f172a)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)',
          color: '#f8fafc'
        }}
      >
        {/* Animated Icon Cluster */}
        <div style={{ position: 'relative', marginBottom: '1.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '72px', width: '72px' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(99, 102, 241, 0.2)', borderRadius: '50%', filter: 'blur(20px)', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
          <Settings 
            size={56} 
            color="#cbd5e1"
            style={{ position: 'relative', zIndex: 10, animation: 'spin 6s linear infinite' }}
          />
          <div style={{ position: 'absolute', top: '-4px', right: '-4px', backgroundColor: '#3b82f6', padding: '6px', borderRadius: '50%', boxShadow: '0 4px 14px 0 rgba(59, 130, 246, 0.39)' }}>
            <Wrench size={16} color="#ffffff" />
          </div>
        </div>

        {/* Messaging */}
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.75rem', letterSpacing: '-0.025em', background: 'linear-gradient(to right, #ffffff, #93c5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {title}
        </h1>
        <p style={{ fontSize: '1rem', color: '#94a3b8', marginBottom: '1.5rem', lineHeight: 1.5 }}>
          {message}
        </p>

        {/* Feature Highlights */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', width: '100%', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <Clock size={24} color="#60a5fa" style={{ marginBottom: '0.5rem' }} />
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500, marginBottom: '0.15rem' }}>Estimated time</span>
            <span style={{ fontSize: '1rem', fontWeight: 600, color: '#ffffff' }}>{time}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <ShieldCheck size={24} color="#818cf8" style={{ marginBottom: '0.5rem' }} />
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500, marginBottom: '0.15rem' }}>Status</span>
            <span style={{ fontSize: '1rem', fontWeight: 600, color: '#ffffff' }}>{status}</span>
          </div>
        </div>

        {/* Progress Bar (Decorative) */}
        <div style={{ width: '100%', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
            <span>Progress</span>
            <span style={{ color: '#60a5fa', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}>{status}</span>
          </div>
          <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '9999px', overflow: 'hidden' }}>
            <div 
              style={{
                height: '100%',
                borderRadius: '9999px',
                background: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #3b82f6)',
                backgroundSize: '200% 100%',
                width: '65%',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
              }}
            />
          </div>
        </div>

        {/* Staff Access Link (Hidden Door) */}
        <div style={{ marginTop: '1rem' }}>
          <Link 
            to="/auth" 
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', textDecoration: 'none', borderRadius: '9999px', transition: 'all 0.2s' }}
            onMouseOver={(e) => { e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'; }}
            onMouseOut={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <ShieldCheck size={14} />
            Staff Access
          </Link>
        </div>
      </div>
      {/* Custom Styles for inline animations */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .5; }
        }
      `}</style>
    </div>
  );
}
