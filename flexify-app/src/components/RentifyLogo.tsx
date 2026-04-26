import React from 'react';

interface RentifyLogoProps {
  className?: string;
  isDarkTheme?: boolean;
  style?: React.CSSProperties;
}

const RentifyLogo: React.FC<RentifyLogoProps> = ({ className = "", isDarkTheme = false, style }) => {
  const textColor = isDarkTheme ? "#FFFFFF" : "#0f172a"; // White for dark theme, Slate-900 for light theme

  return (
    <svg 
      viewBox="0 0 160 40" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ height: '36px', width: 'auto', ...style }}
    >
      <defs>
        {/* Vibrant modern gradient */}
        <linearGradient id="rentify-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0ea5e9" /> {/* Sky blue */}
          <stop offset="100%" stopColor="#2563eb" /> {/* Deep blue */}
        </linearGradient>
        
        {/* Mask to cut out the wheel from the map pin */}
        <mask id="pin-hole">
          <rect width="30" height="35" fill="white" />
          <circle cx="15" cy="13" r="6" fill="black" />
        </mask>
      </defs>

      {/* Icon Group */}
      <g transform="translate(2, 4)">
        {/* The Map Pin Shape */}
        <path 
          d="M15 0C6.716 0 0 6.716 0 15C0 25.5 15 32 15 32C15 32 30 25.5 30 15C30 6.716 23.284 0 15 0Z" 
          fill="url(#rentify-gradient)"
          mask="url(#pin-hole)"
        />
        {/* Inner steering wheel dot */}
        <circle cx="15" cy="13" r="2" fill="url(#rentify-gradient)" />
      </g>

      {/* Typography */}
      <text 
        x="42" 
        y="28" 
        fontFamily="'Inter', system-ui, -apple-system, sans-serif" 
        fontWeight="800" 
        fontSize="24" 
        fill={textColor} 
        letterSpacing="-0.5"
      >
        Rentify
      </text>
      
      {/* Small modern dot at the end */}
      <circle cx="140" cy="28" r="3" fill="#0ea5e9" />
    </svg>
  );
};

export default RentifyLogo;
