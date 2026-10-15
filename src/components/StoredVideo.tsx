import React from 'react';
import { useMediaUrl } from '../media.ts';

// A listing video kept in IndexedDB. Without controls it is a silent first-frame thumbnail.
export const StoredVideo: React.FC<{ id: string; className?: string; controls?: boolean; label?: string }> = ({ id, className = '', controls, label }) => {
  const url = useMediaUrl(id);
  if (url === '')
    return <div className={`grid place-items-center p-2 text-center text-[11.5px] text-[#4E585E] bg-[#EEF1F2] ${className}`}>Video not saved in this browser</div>;
  return (
    <video
      src={url ?? undefined}
      className={`bg-[#141517] ${className}`}
      controls={controls}
      muted={!controls}
      playsInline
      preload="metadata"
      aria-label={label}
    />
  );
};
