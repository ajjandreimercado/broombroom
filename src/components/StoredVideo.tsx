import React from 'react';
import { useMediaUrl } from '../media.ts';

type Props = { id: string; className?: string; controls?: boolean; label?: string };

const Player: React.FC<Omit<Props, 'id'> & { src?: string }> = ({ src, className = '', controls, label }) => (
  <video src={src} className={`bg-[#141517] ${className}`} controls={controls} muted={!controls} playsInline preload="metadata" aria-label={label} />
);

// Listing videos older than the server were kept in this browser's storage ("idb:" refs).
const BrowserVideo: React.FC<Props> = ({ id, className = '', ...rest }) => {
  const url = useMediaUrl(id);
  if (url === '')
    return <div className={`grid place-items-center p-2 text-center text-[11.5px] text-[#4E585E] bg-[#EEF1F2] ${className}`}>Video not saved in this browser</div>;
  return <Player src={url ?? undefined} className={className} {...rest} />;
};

// A listing video: an uploaded file on the server (a URL). Without controls it is a silent first-frame thumbnail.
export const StoredVideo: React.FC<Props> = (props) =>
  props.id.startsWith('idb:') ? <BrowserVideo {...props} /> : <Player src={props.id} className={props.className} controls={props.controls} label={props.label} />;
