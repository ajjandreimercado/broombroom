import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { backdropMotion, drawerMotion } from '../../motion.ts';

export const peso = (n: number) => `₱${Math.round(n).toLocaleString()}`;
export const shortDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

// Section title on its heavy rule, with an optional right-hand slot (counts, actions).
export const SectionHeader: React.FC<{ title: string; hint?: React.ReactNode; children?: React.ReactNode }> = ({ title, hint, children }) => (
  <div className="flex flex-wrap items-end justify-between gap-3 pb-3 border-b-2 border-[#141517]">
    <div>
      <h2 className="font-display text-[22px] leading-none text-[#141517]">{title}</h2>
      {hint && <p className="mt-2 text-[13px] text-[#4E585E] max-w-[60ch]">{hint}</p>}
    </div>
    {children}
  </div>
);

// Segmented filter with a sliding ink fill; counts ride along each option.
export function FilterTabs<T extends string>({
  id,
  value,
  onChange,
  options,
}: {
  id: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; count?: number }[];
}) {
  return (
    <div className="flex flex-wrap border border-[#8C989F] w-fit max-w-full" role="tablist">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={`relative px-3.5 py-2 text-[13px] cursor-pointer transition-colors duration-200 ${active ? 'text-white font-semibold' : 'text-[#141517] hover:bg-[#EEF1F2]'}`}
          >
            {active && <span className="absolute inset-0 bg-[#141517]" aria-hidden="true" />}
            <span className="relative">
              {o.label}
              {o.count !== undefined && <span className={`ml-1.5 tabular-nums ${active ? 'text-[#C9D1D6]' : 'text-[#6B767D]'}`}>{o.count}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export const EmptyState: React.FC<{ title: string; body: string }> = ({ title, body }) => (
  <div className="py-12">
    <p className="font-display text-[18px] text-[#141517]">{title}</p>
    <p className="mt-2 text-[14px] text-[#4E585E] max-w-[52ch]">{body}</p>
  </div>
);

export const btn = {
  primary: 'px-3.5 py-2 bg-[#1D5FD1] hover:bg-[#174CA8] text-white text-[13px] font-semibold cursor-pointer transition-colors disabled:bg-[#8C989F] disabled:cursor-not-allowed',
  ink: 'px-3.5 py-2 bg-[#141517] hover:bg-[#2A2E31] text-white text-[13px] font-semibold cursor-pointer transition-colors disabled:bg-[#8C989F] disabled:cursor-not-allowed',
  outline: 'px-3.5 py-2 border border-[#141517] text-[#141517] hover:bg-[#EEF1F2] text-[13px] font-semibold cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
  danger: 'px-3.5 py-2 border border-[#B42318] text-[#B42318] hover:bg-[#B42318] hover:text-white text-[13px] font-semibold cursor-pointer transition-colors',
};

// Reject/decline with a required reason: the button opens a one-line form in place.
export const ReasonAction: React.FC<{
  label: string;
  confirmLabel?: string;
  placeholder: string;
  onConfirm: (reason: string) => void;
}> = ({ label, confirmLabel = label, placeholder, onConfirm }) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  if (!open) {
    return (
      <button className={btn.danger} onClick={() => setOpen(true)}>
        {label}
      </button>
    );
  }
  return (
    <form
      className="flex flex-wrap items-center gap-2 w-full animate-fade-up"
      onSubmit={(e) => {
        e.preventDefault();
        if (!reason.trim()) return;
        onConfirm(reason.trim());
        setOpen(false);
        setReason('');
      }}
    >
      <input
        autoFocus
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="flex-1 min-w-[200px] px-3 py-2 text-[14px] bg-white border border-[#8C989F] text-[#141517]"
      />
      <button type="submit" disabled={!reason.trim()} className="px-3.5 py-2 bg-[#B42318] text-white text-[13px] font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
        {confirmLabel}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="px-3 py-2 text-[13px] text-[#4E585E] hover:text-[#141517] cursor-pointer">
        Cancel
      </button>
    </form>
  );
};

// Right-hand side panel for detail and actions on one record.
export const Drawer: React.FC<{ open: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ open, onClose, title, children }) => (
  <AnimatePresence>
    {open && (
      <motion.div key="drawer" {...backdropMotion} className="fixed inset-0 z-50 bg-[#141517]/50 flex justify-end" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <motion.aside
          {...drawerMotion}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="w-full max-w-md h-full bg-[#F7F8F8] border-l border-[#141517] overflow-y-auto"
        >
          <div className="sticky top-0 z-10 bg-[#F7F8F8] flex items-center justify-between gap-3 px-6 py-4 border-b border-[#C9D1D6]">
            <h3 className="font-display text-[18px] leading-tight text-[#141517]">{title}</h3>
            <button onClick={onClose} aria-label="Close panel" className="p-2 text-[#4E585E] hover:text-[#141517] hover:bg-[#EEF1F2] cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="px-6 py-6">{children}</div>
        </motion.aside>
      </motion.div>
    )}
  </AnimatePresence>
);

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const checkUpload = (file: File): string | null => {
  if (!/^(image\/|application\/pdf$)/.test(file.type)) return `${file.name} is not a photo or PDF. Use an image or a PDF.`;
  if (file.size > MAX_UPLOAD_BYTES) return `${file.name} is over 10 MB. Use a smaller file.`;
  return null;
};
