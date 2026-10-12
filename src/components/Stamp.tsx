import React, { useEffect, useRef, useState } from 'react';

interface StampProps {
  label: string;
  show: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: 'text-[9px] px-1.5 py-1',
  md: 'text-[11px] px-2 py-1.5',
  lg: 'text-[14px] px-3 py-2 border-[3px]',
};

// The booklet's rubber stamp. It presses only when `show` turns on after mount,
// so lists that re-render with stamped items don't replay the animation.
export const Stamp: React.FC<StampProps> = ({ label, show, className = '', size = 'md' }) => {
  const mounted = useRef(false);
  const [press, setPress] = useState(false);

  useEffect(() => {
    if (mounted.current && show) setPress(true);
    mounted.current = true;
  }, [show]);

  if (!show) return null;
  return (
    <span
      aria-hidden="true"
      onAnimationEnd={() => setPress(false)}
      className={`gb-stamp ${press ? 'gb-stamp--press' : ''} ${sizes[size]} ${className}`}
    >
      {label}
    </span>
  );
};
