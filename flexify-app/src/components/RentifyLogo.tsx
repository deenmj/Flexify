import React from 'react';
import logoImage from '../assets/logo.png';

interface RentifyLogoProps {
  className?: string;
  style?: React.CSSProperties;
  isDarkTheme?: boolean;
}

const RentifyLogo: React.FC<RentifyLogoProps> = ({ className = "", style }) => {
  return (
    <img 
      src={logoImage} 
      alt="Rentify Logo" 
      className={className} 
      style={{ 
        height: '70px', 
        width: 'auto', 
        objectFit: 'contain', 
        transform: 'scale(1.4)',
        transformOrigin: 'left center',
        ...style 
      }} 
    />
  );
};

export default RentifyLogo;
