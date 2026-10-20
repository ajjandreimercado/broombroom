import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { StatusMark } from '../StatusMark.tsx';
import { Quotation } from '../../types.ts';
import { downloadQuotationPdf, openQuotation, reserveWindow } from '../receipt.ts';
import { downloadQuotationXlsx } from '../quoteExcel.ts';
import { QUOTE_TERMS, daysFromToday, DEFAULT_VALID_DAYS, quoteFigures, quoteLabel, isExpired } from '../quote.ts';
import { money } from '../accounting/ledger.ts';
import { Drawer, EmptyState, FilterTabs, SectionHeader, btn, shortDate } from './ui.tsx';
import { Download, FileSpreadsheet, FileText, Send } from 'lucide-react';

type Filter = 'requested' | 'sent' | 'returned' | 'accepted' | 'all';

const input = 'w-full px-3 py-2 text-[14px] bg-white border border-[#8C989F] text-[#141517]';
const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode; className?: string }> = ({ label, hint, children, className = '' }) => (
  <label className={`block ${className}`}>
    <span className="gb-label block mb-1.5">{label}</span>
    {children}
    {hint && <span className="block mt-1 text-[11.5px] text-[#4E585E]">{hint}</span>}
  </label>
);
const num = (v: string) => (v === '' ? 0 : Math.max(0, Number(v)));

// The admin's edit panel for one quotation: unit details, price and terms, with the figures worked out live.
const QuotationEditor: React.FC<{ quote: Quotation; onDone: () => void }> = ({ quote, onDone }) => {
  const { saveQuotation, showToast } = useApp();
  const [d, setD] = useState<Quotation>({ ...quote, validUntil: quote.validUntil || daysFromToday(DEFAULT_VALID_DAYS) });
  const [error, setError] = useState('');
  const set = <K extends keyof Quotation>(k: K, v: Quotation[K]) => setD((prev) => ({ ...prev, [k]: v }));
  const f = quoteFigures(d);
  const financing = d.method === 'financing';

  const problem = () => {
    if (!d.clientName.trim()) return 'Add the client name.';
    if (!d.unitType.trim()) return 'Add the unit type.';
    if (!(d.unitPrice > 0)) return 'Add the unit price.';
    if (financing && !(d.downPayment > 0 && d.downPayment < d.unitPrice)) return 'The down payment must be more than zero and less than the unit price.';
    if (financing && !(d.annualRate >= 0 && d.annualRate <= 60)) return 'Check the interest rate.';
    if (!d.validUntil || d.validUntil < daysFromToday(0)) return 'Set a "valid until" date from today onward.';
    return '';
  };
  const [busy, setBusy] = useState(false);
  const save = async (send: boolean) => {
    const p = problem();
    if (p) return setError(p);
    setError('');
    setBusy(true);
    const win = send ? reserveWindow() : null; // opened during the click so the browser allows it
    const saved = await saveQuotation(quote.id, { ...d, downPayment: financing ? d.downPayment : 0 }, send);
    setBusy(false);
    if (!saved) return win?.close();
    if (send) {
      if (!openQuotation(saved, win)) showToast('Allow pop-ups', 'The quotation was sent. Allow pop-ups to preview its PDF here.', 'info');
      onDone();
    }
  };

  return (
    <div className="space-y-7">
      {d.clientNote && (
        <p className="text-[13px] text-[#2A2E31] bg-white border border-[#C9D1D6] px-3.5 py-2.5">
          <span className="gb-label block mb-1">Note</span>{d.clientNote}
        </p>
      )}

      <fieldset className="space-y-3">
        <legend className="font-display text-[15px] text-[#141517] mb-2">Client</legend>
        <Field label="Name"><input className={input} value={d.clientName} onChange={(e) => set('clientName', e.target.value)} /></Field>
        <Field label="Address"><input className={input} value={d.clientAddress} onChange={(e) => set('clientAddress', e.target.value)} /></Field>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="font-display text-[15px] text-[#141517] mb-2">Unit details</legend>
        <Field label="Unit type"><input className={input} value={d.unitType} onChange={(e) => set('unitType', e.target.value)} /></Field>
        <Field label="Variant"><input className={input} value={d.variant} placeholder="e.g. 2.8 Conquest 4x4 AT" onChange={(e) => set('variant', e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Engine number" hint="Blank prints “To be assigned”"><input className={input} value={d.engineNo} onChange={(e) => set('engineNo', e.target.value.toUpperCase())} /></Field>
          <Field label="Chassis number"><input className={input} value={d.chassisNo} onChange={(e) => set('chassisNo', e.target.value.toUpperCase())} /></Field>
          <Field label="Color"><input className={input} value={d.color} onChange={(e) => set('color', e.target.value)} /></Field>
          <Field label="Transmission"><input className={input} value={d.transmission} onChange={(e) => set('transmission', e.target.value)} /></Field>
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="font-display text-[15px] text-[#141517] mb-2">Price and terms</legend>
        <div className="grid grid-cols-2 border border-[#8C989F] divide-x divide-[#8C989F]" role="radiogroup" aria-label="Payment method">
          {(['financing', 'cash'] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={d.method === m}
              onClick={() => set('method', m)}
              className={`py-2 text-[13px] cursor-pointer transition-colors duration-150 ${d.method === m ? 'bg-[#141517] text-white font-semibold' : 'text-[#141517] hover:bg-[#EEF1F2]'}`}
            >
              {m === 'cash' ? 'Cash' : 'Financing'}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Unit price (₱)"><input type="number" min="0" className={input} value={d.unitPrice || ''} onChange={(e) => set('unitPrice', num(e.target.value))} /></Field>
          {financing && (
            <Field label="Down payment (₱)" hint={d.unitPrice ? `${Math.round((d.downPayment / d.unitPrice) * 100)}% of the price` : undefined}>
              <input type="number" min="0" className={input} value={d.downPayment || ''} onChange={(e) => set('downPayment', num(e.target.value))} />
            </Field>
          )}
          {financing && (
            <Field label="Term">
              <select className={`${input} cursor-pointer`} value={d.termMonths} onChange={(e) => set('termMonths', Number(e.target.value))}>
                {QUOTE_TERMS.map((m) => <option key={m} value={m}>{m} months</option>)}
              </select>
            </Field>
          )}
          {financing && (
            <Field label="Interest rate (% a year)"><input type="number" min="0" step="0.1" className={input} value={d.annualRate} onChange={(e) => set('annualRate', num(e.target.value))} /></Field>
          )}
        </div>
        <details className="group border-t border-[#C9D1D6] pt-3">
          <summary className="cursor-pointer text-[13px] font-semibold text-[#141517] list-none flex items-center justify-between">
            Fees for the all-in amount (optional)
            <span className="text-[#4E585E] font-normal group-open:hidden">Add</span>
          </summary>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <Field label="Insurance, 1st year (₱)"><input type="number" min="0" className={input} value={d.insurance || ''} onChange={(e) => set('insurance', num(e.target.value))} /></Field>
            <Field label="LTO registration (₱)"><input type="number" min="0" className={input} value={d.registration || ''} onChange={(e) => set('registration', num(e.target.value))} /></Field>
            {financing && <Field label="Chattel mortgage (₱)"><input type="number" min="0" className={input} value={d.chattelMortgage || ''} onChange={(e) => set('chattelMortgage', num(e.target.value))} /></Field>}
          </div>
        </details>
      </fieldset>

      {/* Live figures */}
      <dl className="bg-white border border-[#141517] divide-y divide-[#DDE3E6] text-[13.5px] tabular-nums" aria-live="polite">
        {[
          ...(financing
            ? [
                ['Amount financed', money(f.amountFinanced)],
                [`Monthly amortization · ${d.termMonths} mo`, money(f.monthly)],
              ]
            : [['Unit price', money(d.unitPrice)]]),
          ...(f.fees ? [[financing ? 'All-in down payment' : 'Total cash payment', money(f.allIn)]] : []),
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 px-3.5 py-2.5">
            <dt className="text-[#4E585E]">{k}</dt>
            <dd className="font-semibold text-[#141517]">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="space-y-3">
        <Field label="Valid until"><input type="date" min={daysFromToday(0)} className={input} value={d.validUntil} onChange={(e) => set('validUntil', e.target.value)} /></Field>
        <Field label="Remarks (optional)">
          <textarea rows={2} className={input} value={d.remarks} placeholder="e.g. Free 3 PMS, tint and floor mats" onChange={(e) => set('remarks', e.target.value)} />
        </Field>
      </div>

      {error && <p role="alert" className="text-[13px] text-[#B42318]">{error}</p>}

      <div className="flex flex-wrap gap-2 pt-1">
        <button className={`${btn.primary} flex items-center gap-1.5`} disabled={busy} onClick={() => save(true)}>
          <Send className="w-4 h-4" aria-hidden="true" />
          {quote.quoteNo ? 'Update & resend' : 'Send to client'}
        </button>
        <button className={btn.outline} disabled={busy} onClick={() => save(false)}>Save draft</button>
        <button
          className="px-3 py-2 text-[13px] font-semibold text-[#141517] underline decoration-[#8C989F] underline-offset-4 cursor-pointer"
          onClick={() => {
            if (!openQuotation({ ...d, preparedBy: d.preparedBy })) showToast('Allow pop-ups', 'Allow pop-ups for this site to preview the PDF.', 'error');
          }}
        >
          Preview PDF
        </button>
      </div>
    </div>
  );
};

// Admin: quotations made from reserved applications: drafts to send, sent ones, and the ones the client signed back.
export const Quotations: React.FC = () => {
  const { quotations, showToast } = useApp();
  const [filter, setFilter] = useState<Filter>('requested');
  const [openId, setOpenId] = useState<string | null>(null);
  const rows = filter === 'all' ? quotations : quotations.filter((q) => q.status === filter);
  const count = (f: Exclude<Filter, 'all'>) => quotations.filter((q) => q.status === f).length;
  const open = quotations.find((q) => q.id === openId);

  return (
    <section className="space-y-5">
      <SectionHeader
        title="Quotations"
        hint="Made with “Create quotation” on a reserved application. Fill in the unit details and the price, then send it. The client signs it and sends it back; then they fill in the information sheet."
      />
      <FilterTabs
        id="quotations"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'requested', label: 'To send', count: count('requested') },
          { value: 'sent', label: 'Sent', count: count('sent') },
          { value: 'returned', label: 'Returned', count: count('returned') },
          { value: 'all', label: 'All', count: quotations.length },
        ]}
      />
      {rows.length === 0 ? (
        <EmptyState title={filter === 'requested' ? 'Nothing to send' : 'Nothing here yet'} body="Use “Create quotation” on a reserved application; it appears here to check and send." />
      ) : (
        <ul key={filter} className="animate-view-fade border-b border-[#C9D1D6]">
          {rows.map((q) => {
            const f = quoteFigures(q);
            return (
              <li key={q.id} className="border-t border-[#C9D1D6]">
                <button onClick={() => setOpenId(q.id)} className="w-full flex flex-wrap items-start justify-between gap-x-6 gap-y-2 py-4 text-left cursor-pointer hover:bg-white/60 transition-colors">
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-[12.5px] tabular-nums text-[#4E585E]">{q.quoteNo || 'Draft, not sent'}</span>
                      <StatusMark status={quoteLabel(q)} />
                      <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[#141517]">{q.method === 'cash' ? 'Cash' : `Financing · ${q.termMonths} mo`}</span>
                    </span>
                    <span className="block mt-1.5 font-semibold text-[15px] text-[#141517]">{q.clientName}</span>
                    <span className="block text-[13px] text-[#2A2E31]">{q.vehicleTitle}</span>
                    <span className="block text-[12px] text-[#6B767D] tabular-nums">
                      Created {shortDate(q.requestedAt)}
                      {q.sentAt ? ` · sent ${shortDate(q.sentAt)}` : ''}
                      {q.validUntil && q.status !== 'requested' ? ` · ${isExpired(q) ? 'expired' : 'valid until'} ${shortDate(`${q.validUntil}T00:00:00`)}` : ''}
                      {q.applicationRef ? ` · ${q.applicationRef}` : ''}
                    </span>
                    {q.status === 'returned' && (
                      <span className="block mt-1 text-[12.5px] text-[#1B7F35] font-medium">
                        Signed by {q.conforme} · returned {shortDate(q.returnedAt)}{q.clientReply ? ` · Note: “${q.clientReply}”` : ''}
                      </span>
                    )}
                  </span>
                  <span className="text-right tabular-nums">
                    <span className="block text-[14px] font-semibold text-[#141517]">{money(q.unitPrice)}</span>
                    {q.method === 'financing' && <span className="block text-[12.5px] text-[#4E585E]">{money(f.monthly)} / mo</span>}
                  </span>
                </button>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pb-3.5 -mt-1">
                  <button onClick={() => setOpenId(q.id)} className={`${q.status === 'requested' ? btn.primary : btn.outline} inline-flex items-center gap-1.5`}>
                    <Send className="w-3.5 h-3.5" aria-hidden="true" /> {q.status === 'requested' ? 'Check & send to client' : 'Edit & resend'}
                  </button>
                  <button onClick={() => downloadQuotationPdf(q)} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#141517] underline decoration-[#8C989F] underline-offset-4 cursor-pointer">
                    <Download className="w-3.5 h-3.5" aria-hidden="true" /> PDF
                  </button>
                  <button
                    onClick={() => downloadQuotationXlsx(q).catch(() => showToast('Could not make the Excel file', 'Try again in a moment.', 'error'))}
                    className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#141517] underline decoration-[#8C989F] underline-offset-4 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" aria-hidden="true" /> Excel
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <Drawer open={!!open} onClose={() => setOpenId(null)} title={open ? open.quoteNo || 'Prepare quotation' : ''}>
        {open && (
          <>
            <p className="flex items-center gap-2 text-[13px] text-[#2A2E31] mb-5">
              <FileText className="w-4 h-4 text-[#4E585E]" aria-hidden="true" />
              {open.vehicleTitle}
            </p>
            <QuotationEditor key={open.id} quote={open} onDone={() => setOpenId(null)} />
          </>
        )}
      </Drawer>
    </section>
  );
};
