import React from 'react';
import logoImage from '../assets/logo.png';

interface RentifyLogoProps {
  className?: string;
  style?: React.CSSProperties;
}

const RentifyLogo: React.FC<RentifyLogoProps> = ({ className = "", style }) => {
  return (
    <svg 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ height: '45px', width: 'auto', ...style }}
    >
      <defs>
        <linearGradient id="blueGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
      
      {/* Dark Navy Stem & Loop */}
      <path d="M30 85 L30 30 C30 5 75 5 75 35 C75 55 50 60 30 60" 
            stroke="#0f172a" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" />
      
      {/* 3 Blue Ribbons */}
      <path d="M38 60 C55 60 70 70 85 90" 
            stroke="url(#blueGradient)" strokeWidth="12" strokeLinecap="round" />
      <path d="M28 72 C45 72 60 80 75 95" 
            stroke="#60a5fa" strokeWidth="8" strokeLinecap="round" />
      <path d="M20 82 C35 82 50 90 65 100" 
            stroke="#93c5fd" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
};

export default RentifyLogo;
