import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'light' | 'dark' | 'auto' | 'white' | 'solid';
  showTagline?: boolean;
}

const sizeClasses = {
  sm: 'h-7',
  md: 'h-6 sm:h-8 lg:h-9',
  lg: 'h-11 sm:h-12',
  xl: 'h-16 sm:h-20',
};

// One transparent artwork works on both paper and the carbon footer.
export const GroomBroomLogo: React.FC<LogoProps> = ({ className = '', size = 'md' }) => (
  <div className={`inline-flex items-center select-none ${className}`}>
    <img
      src={`${import.meta.env.BASE_URL}broom-broom-logo.png`}
      alt="Broom Broom"
      width={1368}
      height={274}
      className={`${sizeClasses[size]} w-auto object-contain`}
    />
  </div>
);
