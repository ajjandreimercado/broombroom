import React from 'react';

const DONE = ['approved', 'completed', 'available', 'resolved', 'completed & transferred', 'payment cleared', 'verified', 'paid', 'released'];
const VOID = ['declined', 'withdrawn', 'unpublished', 'rejected', 'suspended', 'disapproved'];

// Record status in the booklet's language: finished states are stamped in green ink,
// voided ones in red, open ones in plain carbon ink.
export const StatusMark: React.FC<{ status: string; className?: string }> = ({ status, className = '' }) => {
  const key = status.toLowerCase();
  const tone = DONE.includes(key)
    ? 'border-[#1B7F35] text-[#1B7F35] -rotate-3'
    : VOID.includes(key)
    ? 'border-[#B42318] text-[#B42318]'
    : 'border-[#141517] text-[#141517]';
  return (
    <span
      className={`inline-block border-[1.5px] px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] leading-none whitespace-nowrap ${tone} ${className}`}
      style={{ fontStretch: '112%' }}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
};
