import React, { useState } from 'react';
import { useApp, type PreOrderEdit } from '../context/AppContext.tsx';
import type { PreOrder, VehicleApplication } from '../types.ts';
import { OFF_ROAD_INCLUSIONS, OTHERS, PREORDER_CHOICES, preorderBreakdown } from './preorder.ts';
import { btn, peso, shortDate } from './admin/ui.tsx';
import { Lock, Paperclip } from 'lucide-react';

const input = 'w-full px-3 py-2 text-[14px] bg-white border border-[#8C989F] text-[#141517] focus:outline-none focus:border-[#1D5FD1]';

// A dropdown of the usual choices plus "Others", which opens a box to type the choice.
export const ChoiceSelect: React.FC<{ label: string; options: readonly string[]; value: string; onChange: (v: string) => void; id: string }> = ({ label, options, value, onChange, id }) => {
  const [others, setOthers] = useState(!!value && !options.includes(value));
  return (
    <div>
      <label htmlFor={id} className="gb-label block mb-1.5">{label}</label>
      <select
        id={id}
        className={`${input} cursor-pointer`}
        value={others ? OTHERS : value}
        onChange={(e) => {
          const isOthers = e.target.value === OTHERS;
          setOthers(isOthers);
          onChange(isOthers ? '' : e.target.value);
        }}
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
        <option value={OTHERS}>{OTHERS}</option>
      </select>
      {others && <input aria-label={`${label}: type your choice`} className={`${input} mt-2`} maxLength={60} value={value} placeholder="Type your choice" onChange={(e) => onChange(e.target.value)} />}
    </div>
  );
};

// Unit Amount, Accessories, Off-Road Set Up, Additional Customization, Total Amount: the same everywhere.
export const PriceBreakdown: React.FC<{ p: Pick<PreOrder, 'unitPrice' | 'accessories' | 'offRoad' | 'offRoadPrice' | 'additionalAmount' | 'additionalDescription'>; pendingAdditional?: boolean }> = ({ p, pendingAdditional }) => {
  const b = preorderBreakdown(p);
  const rows: [string, string, string?][] = [
    ['Unit Amount', peso(b.unit)],
    ['Accessories', peso(b.accessories), p.accessories.map((a) => `${a.name} ${peso(a.price)}`).join(' · ')],
    ['Off-Road Set Up', p.offRoad ? peso(b.offRoad) : '—'],
    ['Additional Customization', pendingAdditional && !p.additionalAmount ? 'Set by Broom Broom' : peso(b.additional), p.additionalDescription],
  ];
  return (
    <dl className="border border-[#141517] bg-white divide-y divide-[#DDE3E6] text-[13.5px] tabular-nums">
      {rows.map(([k, v, note]) => (
        <div key={k} className="px-3.5 py-2.5">
          <div className="flex justify-between gap-4">
            <dt className="text-[#2A2E31]">{k}</dt>
            <dd className="font-semibold text-[#141517] text-right">{v}</dd>
          </div>
          {note && <p className="mt-0.5 text-[12px] text-[#4E585E]">{note}</p>}
        </div>
      ))}
      <div className="px-3.5 py-3 flex justify-between gap-4 bg-[#F7F8F8]">
        <dt className="font-semibold text-[#141517]">Total Amount{pendingAdditional && !p.additionalAmount ? ' (so far)' : ''}</dt>
        <dd className="font-display text-[18px] text-[#141517]">{peso(b.total)}</dd>
      </div>
    </dl>
  );
};

const STAGE: Partial<Record<VehicleApplication['status'], string>> = {
  submitted: 'Application under review',
  under_review: 'Application under review',
  contacted: 'Application under review',
  reserved: 'Reserved: quotation',
  processing: 'Processing',
  approved: 'Approved',
  completed: 'Released',
  declined: 'Closed (declined)',
  withdrawn: 'Closed (withdrawn)',
};
export const preorderStage = (p: PreOrder, apps: VehicleApplication[]) => {
  if (!p.agentName) return 'Waiting for an agent';
  const app = p.applicationRef ? apps.find((a) => a.referenceNo === p.applicationRef) : undefined;
  if (!app) return `With ${p.agentName}: waiting for the application`;
  return `${STAGE[app.status] ?? app.status}${p.locked && app.status === 'reserved' ? ' sent' : ''}`;
};

// The agent's and admin's changes. Only changed fields are sent; the server records each in the history.
const EditForm: React.FC<{ p: PreOrder; admin: boolean; onDone: () => void }> = ({ p, admin, onDone }) => {
  const { editPreorder, preorderSettings } = useApp();
  const [d, setD] = useState({
    variant: p.variant,
    transmission: p.transmission,
    seat: p.seat,
    color: p.color,
    note: p.note ?? '',
    suggestions: p.suggestions ?? '',
    accessoryIds: preorderSettings.accessories.filter((a) => p.accessories.some((x) => x.name === a.name)).map((a) => a.id),
    offRoad: p.offRoad,
    additionalAmount: String(p.additionalAmount || ''),
    additionalDescription: p.additionalDescription ?? '',
  });
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof typeof d>(k: K, v: (typeof d)[K]) => setD((x) => ({ ...x, [k]: v }));
  // Accessories the admin has since removed from the list cannot be ticked, so saving drops them (shown as a warning).
  const gone = p.accessories.filter((a) => !preorderSettings.accessories.some((x) => x.name === a.name));
  return (
    <form
      className="space-y-4 border-t border-[#C9D1D6] pt-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const { additionalAmount, additionalDescription, ...rest } = d;
        const changes: PreOrderEdit = { ...rest, ...(admin ? { additionalAmount: Number(additionalAmount || 0), additionalDescription } : {}) };
        setBusy(true);
        const ok = await editPreorder(p.id, changes);
        setBusy(false);
        if (ok) onDone();
      }}
    >
      <div className="grid sm:grid-cols-2 gap-3">
        <ChoiceSelect id={`v-${p.id}`} label="Variant" options={PREORDER_CHOICES.variant} value={d.variant} onChange={(v) => set('variant', v)} />
        <ChoiceSelect id={`t-${p.id}`} label="Transmission" options={PREORDER_CHOICES.transmission} value={d.transmission} onChange={(v) => set('transmission', v)} />
        <ChoiceSelect id={`s-${p.id}`} label="Seat" options={PREORDER_CHOICES.seat} value={d.seat} onChange={(v) => set('seat', v)} />
        <div>
          <label htmlFor={`c-${p.id}`} className="gb-label block mb-1.5">Color</label>
          <input id={`c-${p.id}`} className={input} maxLength={60} value={d.color} onChange={(e) => set('color', e.target.value)} />
        </div>
      </div>
      <fieldset>
        <legend className="gb-label mb-1.5">Accessories</legend>
        <div className="space-y-1.5">
          {preorderSettings.accessories.map((a) => (
            <label key={a.id} className="flex items-center gap-2 text-[13.5px] cursor-pointer">
              <input type="checkbox" className="accent-[#1D5FD1] w-4 h-4" checked={d.accessoryIds.includes(a.id)} onChange={(e) => set('accessoryIds', e.target.checked ? [...d.accessoryIds, a.id] : d.accessoryIds.filter((x) => x !== a.id))} />
              <span className="flex-1">{a.name}</span>
              <span className="tabular-nums text-[#4E585E]">{peso(p.accessories.find((x) => x.name === a.name)?.price ?? a.price)}</span>
            </label>
          ))}
          {gone.map((a) => <p key={a.name} className="text-[12px] text-[#9B2C2C]">{a.name} is no longer offered; it is removed when you save.</p>)}
        </div>
      </fieldset>
      <label className="flex items-center gap-2 text-[13.5px] cursor-pointer">
        <input type="checkbox" className="accent-[#1D5FD1] w-4 h-4" checked={d.offRoad} onChange={(e) => set('offRoad', e.target.checked)} />
        <span className="flex-1">Off-Road Set Up</span>
        <span className="tabular-nums text-[#4E585E]">{peso(p.offRoadPrice)}</span>
      </label>
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="gb-label block mb-1.5">Note</span>
          <textarea rows={2} maxLength={1000} className={input} value={d.note} onChange={(e) => set('note', e.target.value)} />
        </label>
        <label className="block">
          <span className="gb-label block mb-1.5">Others / suggestions</span>
          <textarea rows={2} maxLength={1000} className={input} value={d.suggestions} onChange={(e) => set('suggestions', e.target.value)} />
        </label>
      </div>
      {admin && (
        <div className="grid sm:grid-cols-[12rem_1fr] gap-3 p-3 bg-[#F7F8F8] border border-[#C9D1D6]">
          <label className="block">
            <span className="gb-label block mb-1.5">Additional Customization (₱)</span>
            <input inputMode="numeric" maxLength={9} className={`${input} tabular-nums`} value={d.additionalAmount} onChange={(e) => set('additionalAmount', e.target.value.replace(/\D/g, ''))} />
          </label>
          <label className="block">
            <span className="gb-label block mb-1.5">What it covers</span>
            <input maxLength={200} className={input} value={d.additionalDescription} placeholder="e.g. Snorkel, roof rack" onChange={(e) => set('additionalDescription', e.target.value)} />
          </label>
        </div>
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={busy || !d.variant.trim() || !d.transmission.trim() || !d.seat.trim() || !d.color.trim()} className={btn.primary}>{busy ? 'Saving…' : 'Save changes'}</button>
        <button type="button" onClick={onDone} className="px-3 py-2 text-[13px] text-[#4E585E] hover:text-[#141517] cursor-pointer">Cancel</button>
      </div>
    </form>
  );
};

// One pre-order: what the client chose, the price breakdown, where it is in the flow, and its change history.
// The agent and the admin can edit it until its quotation is sent; only the admin can reopen it after that.
export const PreOrderPanel: React.FC<{ p: PreOrder; mode: 'client' | 'agent' | 'admin' }> = ({ p, mode }) => {
  const { applications, reopenPreorder } = useApp();
  const [editing, setEditing] = useState(false);
  const app = p.applicationRef ? applications.find((a) => a.referenceNo === p.applicationRef) : undefined;
  const closed = !!app && ['completed', 'declined', 'withdrawn'].includes(app.status);
  const canEdit = mode !== 'client' && !p.locked && !closed;
  const facts: [string, string][] = [
    ['Variant', p.variant],
    ['Transmission', p.transmission],
    ['Seat', p.seat],
    ['Color', p.color],
  ];
  return (
    <article className="bg-white border border-[#C9D1D6] p-4 sm:p-5 space-y-4">
      <header className="flex flex-wrap gap-4">
        <img src={p.unitImage} alt="" className="w-28 h-20 object-cover bg-[#EEF1F2] shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="gb-label">{p.refNo} · {shortDate(p.createdAt)}{mode !== 'client' ? ` · ${p.clientName}` : ''}</p>
          <h3 className="font-display text-[18px] leading-tight text-[#141517] mt-1">{p.unitTitle}</h3>
          <p className="mt-1.5 text-[13px] text-[#2A2E31] flex items-center gap-1.5">
            {p.locked && <Lock className="w-3.5 h-3.5 shrink-0" aria-label="Locked" />}
            {preorderStage(p, applications)}
            {p.applicationRef && <span className="text-[#4E585E]">· {p.applicationRef}</span>}
          </p>
        </div>
      </header>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[13.5px]">
            {facts.map(([k, v]) => (
              <div key={k}>
                <dt className="gb-label">{k}</dt>
                <dd className="text-[#141517]">{v}</dd>
              </div>
            ))}
          </dl>
          {p.note && <p className="text-[13px] text-[#2A2E31]"><span className="gb-label block">Note</span>{p.note}</p>}
          {p.suggestions && <p className="text-[13px] text-[#2A2E31]"><span className="gb-label block">Others / suggestions</span>{p.suggestions}</p>}
          {p.offRoad && <p className="text-[12.5px] text-[#4E585E]"><span className="gb-label block">Off-Road Set Up includes</span>{OFF_ROAD_INCLUSIONS.join(', ')}</p>}
          {p.photoUrl && (
            <a href={p.photoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#1D5FD1] hover:underline">
              <Paperclip className="w-3.5 h-3.5" aria-hidden="true" /> Client’s photo of the unit{p.photoName ? ` (${p.photoName})` : ''}
            </a>
          )}
        </div>
        <PriceBreakdown p={p} pendingAdditional={mode === 'client' || !p.locked} />
      </div>

      {editing ? (
        <EditForm p={p} admin={mode === 'admin'} onDone={() => setEditing(false)} />
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {canEdit && <button className={btn.outline} onClick={() => setEditing(true)}>{mode === 'admin' ? 'Edit / set Additional Customization' : 'Update customization'}</button>}
          {mode === 'admin' && p.locked && app?.status === 'reserved' && (
            <button className={btn.outline} onClick={() => reopenPreorder(p.id)}>Reopen for changes</button>
          )}
          {mode !== 'client' && p.locked && <span className="text-[12.5px] text-[#4E585E]">Locked: the quotation is with the client{mode === 'agent' ? '. Ask the admin to reopen it for changes.' : '.'}</span>}
        </div>
      )}

      <details className="border-t border-[#C9D1D6] pt-3">
        <summary className="cursor-pointer text-[13px] font-semibold text-[#141517]">History ({p.history.length})</summary>
        <ol className="mt-2 space-y-1 text-[12.5px] text-[#2A2E31]">
          {[...p.history].reverse().map((h, i) => (
            <li key={i}><span className="text-[#4E585E] tabular-nums">{new Date(h.at).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}</span> · {h.by}: {h.text}</li>
          ))}
        </ol>
      </details>
    </article>
  );
};
