import React, { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import type { AddOns, VehicleApplication } from '../types.ts';
import { OFF_ROAD_INCLUSIONS } from './preorder.ts';
import { PriceBreakdown } from './PreOrderPanel.tsx';
import { quoteFor } from './quote.ts';
import { btn, peso } from './admin/ui.tsx';
import { Lock } from 'lucide-react';

const input = 'w-full px-3 py-2 text-[14px] bg-white border border-[#8C989F] text-[#141517] focus:outline-none focus:border-[#1D5FD1]';

// The add-ons form: accessories (the admin's list), others / suggestions, and the Off-Road Set Up package.
// `priceOf` shows an item's kept price when editing (it keeps the price it was picked at).
export const AddOnsFields: React.FC<{
  accessoryIds: string[];
  onAccessories: (ids: string[]) => void;
  suggestions: string;
  onSuggestions: (s: string) => void;
  offRoad: boolean;
  onOffRoad: (b: boolean) => void;
  priceOf?: (name: string) => number | undefined;
  offRoadPrice?: number;
}> = ({ accessoryIds, onAccessories, suggestions, onSuggestions, offRoad, onOffRoad, priceOf, offRoadPrice }) => {
  const { preorderSettings } = useApp();
  return (
    <div className="space-y-4">
      <div>
        <p className="gb-label">Accessories</p>
        <p className="text-[12.5px] text-[#4E585E] mt-0.5">Check the box for each add-on you want.</p>
        {preorderSettings.accessories.length === 0 ? (
          <p className="mt-2 text-[13px] text-[#4E585E]">No accessories listed yet. Write what you want under Others / suggestions.</p>
        ) : (
          <div className="mt-2 border border-[#C9D1D6] bg-white divide-y divide-[#DDE3E6]">
            {preorderSettings.accessories.map((a) => (
              <label key={a.id} className="flex items-center gap-3 px-3.5 py-2.5 text-[13.5px] cursor-pointer hover:bg-[#F7F8F8]">
                <input type="checkbox" className="accent-[#1D5FD1] w-4 h-4" checked={accessoryIds.includes(a.id)} onChange={(e) => onAccessories(e.target.checked ? [...accessoryIds, a.id] : accessoryIds.filter((x) => x !== a.id))} />
                <span className="flex-1 text-[#141517]">{a.name}</span>
                <span className="tabular-nums text-[#2A2E31]">{peso(priceOf?.(a.name) ?? a.price)}</span>
              </label>
            ))}
          </div>
        )}
      </div>
      <label className="block">
        <span className="gb-label block mb-1.5">Others / suggestions</span>
        <textarea rows={2} maxLength={1000} className={input} value={suggestions} placeholder="Anything else you want on the unit. Broom Broom prices it in your quotation." onChange={(e) => onSuggestions(e.target.value)} />
      </label>
      <label className="flex gap-3 p-3.5 border border-[#141517] bg-white cursor-pointer">
        <input type="checkbox" className="accent-[#1D5FD1] w-4 h-4 mt-0.5" checked={offRoad} onChange={(e) => onOffRoad(e.target.checked)} />
        <span className="flex-1">
          <span className="flex justify-between gap-3 font-semibold text-[14px] text-[#141517]">
            Off-Road Set Up <span className="tabular-nums">{peso(offRoadPrice ?? preorderSettings.offRoadPrice)}</span>
          </span>
          <span className="block mt-1 text-[12.5px] text-[#4E585E]">Inclusions: {OFF_ROAD_INCLUSIONS.join(', ')}.</span>
        </span>
      </label>
    </div>
  );
};

const EMPTY: AddOns = { accessories: [], offRoad: false, offRoadPrice: 0, additionalAmount: 0, history: [] };
const editable = (app: VehicleApplication) => ['submitted', 'under_review', 'contacted', 'reserved'].includes(app.status) && !app.preorderRef;

// A ready unit's add-ons on its application: the price breakdown, the history, and (for the client's agent and the
// admin) changes until the quotation is sent. Only the admin sets Additional Customization and reopens a sent quotation.
export const AddOnsPanel: React.FC<{ app: VehicleApplication; mode: 'client' | 'agent' | 'admin' }> = ({ app, mode }) => {
  const { quotations, preorderSettings, editAddOns, reopenAddOns } = useApp();
  const a = app.addOns ?? { ...EMPTY, offRoadPrice: preorderSettings.offRoadPrice };
  const q = quoteFor(quotations, app);
  const locked = app.quoteSent ?? (!!q && ['sent', 'returned', 'confirmed', 'accepted'].includes(q.status));
  const canEdit = mode !== 'client' && editable(app) && !locked;
  const [editing, setEditing] = useState(false);
  const [d, setD] = useState({
    accessoryIds: preorderSettings.accessories.filter((x) => a.accessories.some((y) => y.name === x.name)).map((x) => x.id),
    offRoad: a.offRoad,
    suggestions: a.suggestions ?? '',
    additionalAmount: String(a.additionalAmount || ''),
    additionalDescription: a.additionalDescription ?? '',
  });
  const [busy, setBusy] = useState(false);
  if (!app.addOns && !canEdit) return null;
  const gone = a.accessories.filter((x) => !preorderSettings.accessories.some((y) => y.name === x.name));

  return (
    <div className="border border-[#C9D1D6] bg-[#F7F8F8] p-3.5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-[14px] text-[#141517] flex items-center gap-1.5">
          {locked && app.addOns && <Lock className="w-3.5 h-3.5" aria-label="Locked" />} Add-ons
        </p>
        {!editing && canEdit && (
          <button className={btn.outline} onClick={() => setEditing(true)}>
            {app.addOns ? (mode === 'admin' ? 'Edit / set Additional Customization' : 'Update add-ons') : 'Add add-ons'}
          </button>
        )}
        {mode === 'admin' && locked && app.addOns && app.status === 'reserved' && !editing && (
          <button className={btn.outline} onClick={() => reopenAddOns(app.id)}>Reopen for changes</button>
        )}
      </div>
      {app.addOns && <PriceBreakdown p={{ unitPrice: app.listPrice ?? app.vehiclePrice, ...a }} pendingAdditional={!locked} />}
      {app.addOns?.suggestions && <p className="text-[13px] text-[#2A2E31]"><span className="gb-label block">Others / suggestions</span>{app.addOns.suggestions}</p>}
      {mode !== 'client' && locked && app.addOns && <p className="text-[12.5px] text-[#4E585E]">Locked: the quotation is with the client{mode === 'agent' ? '. Ask the admin to reopen it for changes.' : '.'}</p>}

      {editing && (
        <form
          className="space-y-4 border-t border-[#C9D1D6] pt-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            const { additionalAmount, additionalDescription, ...rest } = d;
            const ok = await editAddOns(app.id, { ...rest, ...(mode === 'admin' ? { additionalAmount: Number(additionalAmount || 0), additionalDescription } : {}) });
            setBusy(false);
            if (ok) setEditing(false);
          }}
        >
          <AddOnsFields
            accessoryIds={d.accessoryIds}
            onAccessories={(ids) => setD((x) => ({ ...x, accessoryIds: ids }))}
            suggestions={d.suggestions}
            onSuggestions={(s) => setD((x) => ({ ...x, suggestions: s }))}
            offRoad={d.offRoad}
            onOffRoad={(b) => setD((x) => ({ ...x, offRoad: b }))}
            priceOf={(name) => a.accessories.find((x) => x.name === name)?.price}
            offRoadPrice={app.addOns ? a.offRoadPrice : undefined}
          />
          {gone.map((x) => <p key={x.name} className="text-[12px] text-[#9B2C2C]">{x.name} is no longer offered; it is removed when you save.</p>)}
          {mode === 'admin' && (
            <div className="grid sm:grid-cols-[12rem_1fr] gap-3 p-3 bg-white border border-[#C9D1D6]">
              <label className="block">
                <span className="gb-label block mb-1.5">Additional Customization (₱)</span>
                <input inputMode="numeric" maxLength={9} className={`${input} tabular-nums`} value={d.additionalAmount} onChange={(e) => setD((x) => ({ ...x, additionalAmount: e.target.value.replace(/\D/g, '') }))} />
              </label>
              <label className="block">
                <span className="gb-label block mb-1.5">What it covers</span>
                <input maxLength={200} className={input} value={d.additionalDescription} placeholder="e.g. Roof rack" onChange={(e) => setD((x) => ({ ...x, additionalDescription: e.target.value }))} />
              </label>
            </div>
          )}
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className={btn.primary}>{busy ? 'Saving…' : 'Save add-ons'}</button>
            <button type="button" onClick={() => setEditing(false)} className="px-3 py-2 text-[13px] text-[#4E585E] hover:text-[#141517] cursor-pointer">Cancel</button>
          </div>
        </form>
      )}

      {app.addOns && app.addOns.history.length > 0 && (
        <details>
          <summary className="cursor-pointer text-[12.5px] font-semibold text-[#141517]">History ({app.addOns.history.length})</summary>
          <ol className="mt-1.5 space-y-1 text-[12px] text-[#2A2E31]">
            {[...app.addOns.history].reverse().map((h, i) => (
              <li key={i}><span className="text-[#4E585E] tabular-nums">{new Date(h.at).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}</span> · {h.by}: {h.text}</li>
            ))}
          </ol>
        </details>
      )}
    </div>
  );
};
