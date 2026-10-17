import React, { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { Vehicle } from '../types.ts';
import { QUOTE_TERMS, isExpired } from './quote.ts';
import { FileText } from 'lucide-react';

// On a listing: ask the admin team for a priced quotation before applying. No documents needed.
export const QuoteRequest: React.FC<{ vehicle: Vehicle }> = ({ vehicle }) => {
  const { isAuthenticated, setAuthModalOpen, currentUser, quotations, requestQuotation, navigateTo } = useApp();
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<'cash' | 'financing'>('financing');
  const [down, setDown] = useState(String(Math.round(vehicle.price * 0.25)));
  const [term, setTerm] = useState(36);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const existing = quotations.find(
    (q) => q.vehicleId === vehicle.id && q.clientId === currentUser?.id && (q.status === 'requested' || (q.status === 'sent' && !isExpired(q)))
  );
  const goToQuotes = () => navigateTo('account', { accountTab: 'quotations' });

  if (existing) {
    return (
      <p className="text-[13px] text-[#2A2E31] border border-[#C9D1D6] bg-white px-4 py-3 flex flex-wrap items-center justify-between gap-2">
        {existing.status === 'requested' ? 'Your quotation request is with the admin team.' : `Your quotation ${existing.quoteNo} is ready.`}
        <button onClick={goToQuotes} className="font-semibold text-[#1D5FD1] underline underline-offset-4 cursor-pointer">
          {existing.status === 'requested' ? 'My quotations' : 'View quotation'}
        </button>
      </p>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const dp = Number(down);
    if (method === 'financing' && !(dp > 0 && dp < vehicle.price)) return setError('Enter a down payment above zero and below the price.');
    setError('');
    setBusy(true);
    const q = await requestQuotation(vehicle.id, { method, downPayment: dp, termMonths: term, note });
    setBusy(false);
    if (q) setOpen(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => (isAuthenticated ? setOpen(true) : setAuthModalOpen(true))}
        className="w-full py-3 px-5 border border-[#141517] text-[#141517] hover:bg-[#EEF1F2] font-semibold text-[14px] flex items-center justify-center gap-2 cursor-pointer transition-colors"
      >
        <FileText className="w-4 h-4" aria-hidden="true" />
        Request a quotation
      </button>
    );
  }

  const input = 'w-full px-3 py-2 text-[14px] bg-white border border-[#8C989F] text-[#141517]';
  return (
    <form onSubmit={submit} className="border border-[#141517] bg-white p-4 space-y-3.5 animate-fade-up" aria-label="Request a quotation">
      <div>
        <p className="font-semibold text-[14px] text-[#141517]">Request a quotation</p>
        <p className="text-[12.5px] text-[#4E585E]">The admin team prepares the price, terms and unit details and sends it to your account. Free, no documents needed.</p>
      </div>
      <div className="grid grid-cols-2 border border-[#8C989F] divide-x divide-[#8C989F]" role="radiogroup" aria-label="How you plan to pay">
        {(['financing', 'cash'] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={method === m}
            onClick={() => setMethod(m)}
            className={`py-2 text-[13px] cursor-pointer transition-colors duration-150 ${method === m ? 'bg-[#141517] text-white font-semibold' : 'text-[#141517] hover:bg-[#EEF1F2]'}`}
          >
            {m === 'cash' ? 'Cash' : 'Financing'}
          </button>
        ))}
      </div>
      {method === 'financing' && (
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="gb-label block mb-1.5">Down payment (₱)</span>
            <input type="number" min="0" inputMode="numeric" className={input} value={down} onChange={(e) => { setDown(e.target.value); setError(''); }} />
          </label>
          <label className="block">
            <span className="gb-label block mb-1.5">Term</span>
            <select className={`${input} cursor-pointer`} value={term} onChange={(e) => setTerm(Number(e.target.value))}>
              {QUOTE_TERMS.map((m) => <option key={m} value={m}>{m} months</option>)}
            </select>
          </label>
        </div>
      )}
      <label className="block">
        <span className="gb-label block mb-1.5">Note (optional)</span>
        <textarea rows={2} className={input} value={note} placeholder="e.g. preferred color, trade-in, questions" onChange={(e) => setNote(e.target.value)} />
      </label>
      {error && <p role="alert" className="text-[12.5px] text-[#B42318]">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="px-4 py-2.5 bg-[#141517] hover:bg-[#2A2E31] disabled:opacity-60 text-white text-[13px] font-semibold cursor-pointer transition-colors">
          {busy ? 'Sending…' : 'Send request'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="px-3 py-2.5 text-[13px] text-[#4E585E] hover:text-[#141517] cursor-pointer">
          Cancel
        </button>
      </div>
    </form>
  );
};
