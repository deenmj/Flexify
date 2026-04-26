import React from 'react';
import logoImage from '../assets/logo.png';

interface RentifyLogoProps {
  className?: string;
  style?: React.CSSProperties;
}

const RentifyLogo: React.FC<RentifyLogoProps> = ({ className = "", style }) => {
  return (
    <img 
      src={logoImage} 
      alt="Rentify Logo" 
      className={className} 
      style={{ 
        height: '45px', 
        width: 'auto', 
        objectFit: 'contain', 
        ...style 
      }} 
    />
  );
};

export default RentifyLogo;
