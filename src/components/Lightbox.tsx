import React, { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { StoredVideo } from './StoredVideo.tsx';

export type LightboxItem = { kind: 'photo' | 'video'; src: string };

// Full-screen viewer: the whole photo, never cropped. Arrows (or ← →) move between photos; Esc or a click outside
// closes it, and focus returns to what opened it.
export const Lightbox: React.FC<{ items: LightboxItem[]; index: number; title: string; onIndex: (i: number) => void; onClose: () => void }> = ({
  items,
  index,
  title,
  onIndex,
  onClose,
}) => {
  const closeBtn = useRef<HTMLButtonElement>(null);
  const item = items[index];
  const many = items.length > 1;
  const step = (d: number) => onIndex((index + d + items.length) % items.length);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeBtn.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; // the page behind does not scroll
    return () => {
      document.body.style.overflow = overflow;
      opener?.focus?.();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (many && e.key === 'ArrowLeft') step(-1);
      else if (many && e.key === 'ArrowRight') step(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!item) return null;
  const control = 'p-3 bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${title}, ${item.kind} ${index + 1} of ${items.length}`}
      className="fixed inset-0 z-[60] bg-[#141517]/95 flex flex-col"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 text-white">
        <p className="text-[13px] tabular-nums truncate">
          {title}
          {many && <span className="text-[#C9D1D6]"> · {index + 1} / {items.length}</span>}
        </p>
        <button ref={closeBtn} onClick={onClose} aria-label="Close" className={control}>
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="relative flex-1 min-h-0 flex items-center justify-center px-2 sm:px-16 pb-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
        {item.kind === 'video' ? (
          <StoredVideo key={item.src} id={item.src} controls className="max-w-full max-h-full object-contain" label={`${title} video`} />
        ) : (
          <img key={item.src} src={item.src} alt={`${title}, photo ${index + 1}`} className="max-w-full max-h-full object-contain select-none" />
        )}
        {many && (
          <>
            <button onClick={() => step(-1)} aria-label="Previous" className={`${control} absolute left-2 sm:left-4 top-1/2 -translate-y-1/2`}>
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button onClick={() => step(1)} aria-label="Next" className={`${control} absolute right-2 sm:right-4 top-1/2 -translate-y-1/2`}>
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};
