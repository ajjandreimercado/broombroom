import React, { useRef, useState } from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
import type { ChatMessage } from '../types.ts';

// Chat photos and videos are deleted after 30 days (server: CHAT_MEDIA_DAYS) to keep storage small.
const KEEP_MS = 30 * 864e5;

export const ChatMediaView = ({ msg }: { msg: ChatMessage }) => {
  const m = msg.media;
  const [broken, setBroken] = useState(false);
  if (!m) return null;
  const label = m.kind === 'video' ? 'Video' : 'Photo';
  if (broken || Date.now() - new Date(msg.timestamp).getTime() > KEEP_MS)
    return <span className="block italic opacity-80 text-[12px]">{label} no longer available (chat photos and videos are kept 30 days)</span>;
  return m.kind === 'video' ? (
    <video src={m.url} controls playsInline preload="metadata" onError={() => setBroken(true)} className="block w-full max-w-[280px] max-h-72 rounded-[2px] bg-black" aria-label={`Video from ${msg.senderName}`} />
  ) : (
    <a href={m.url} target="_blank" rel="noopener noreferrer" className="block" aria-label={`Open photo from ${msg.senderName}`}>
      <img src={m.url} alt={`Photo from ${msg.senderName}`} loading="lazy" onError={() => setBroken(true)} className="block w-full max-w-[280px] max-h-72 object-cover rounded-[2px]" />
    </a>
  );
};

// Picks one photo or video and hands it to `send` (which compresses, uploads and sends it).
export const AttachButton = ({ send, className = '' }: { send: (file: File) => Promise<unknown>; className?: string }) => {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,video/mp4,video/quicktime,video/webm"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (!f) return;
          setBusy(true);
          try {
            await send(f);
          } finally {
            setBusy(false);
          }
        }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => input.current?.click()}
        aria-label={busy ? 'Sending photo or video' : 'Send a photo or video'}
        title="Send a photo or video"
        className={`shrink-0 grid place-items-center w-10 border border-[#C9D1D6] bg-white text-[#4E585E] hover:text-[#1D5FD1] hover:border-[#1D5FD1] rounded-[2px] cursor-pointer disabled:opacity-60 disabled:cursor-wait transition-colors ${className}`}
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <ImagePlus className="w-4 h-4" aria-hidden="true" />}
      </button>
    </>
  );
};
