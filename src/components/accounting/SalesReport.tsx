import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { Drawer, EmptyState, FilterTabs, SectionHeader, btn } from '../admin/ui.tsx';
import { mdy, money } from './ledger.ts';
import { Plus, Trash2 } from 'lucide-react';

type Preset = 'today' | 'week' | 'month' | 'year' | 'custom';

// Local calendar day as yyyy-mm-dd, the format <input type="date"> uses.
const dayOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const longDay = mdy;
const field = 'w-full px-3 py-2 text-[14px] bg-white border border-[#8C989F] text-[#141517]';

// A sale entered by hand (e.g. one closed outside the site). It shows in the report like any completed sale.
const SaleForm: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const { addSalesEntry, agents } = useApp();
  const [f, setF] = useState({ date: dayOf(new Date()), vehicle: '', client: '', agent: '', amount: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  const valid = f.date && f.vehicle.trim() && f.client.trim() && Number(f.amount) > 0;
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!valid || saving) return;
        setSaving(true);
        const ok = await addSalesEntry({ date: f.date, vehicle: f.vehicle.trim(), client: f.client.trim(), agent: f.agent || undefined, amount: Number(f.amount), notes: f.notes.trim() || undefined });
        setSaving(false);
        if (ok) onDone();
      }}
    >
      <label className="block"><span className="gb-label block mb-1.5">Date of sale</span><input type="date" required value={f.date} onChange={set('date')} className={field} /></label>
      <label className="block"><span className="gb-label block mb-1.5">Vehicle</span><input required value={f.vehicle} onChange={set('vehicle')} placeholder="e.g. 2023 Toyota Fortuner 2.8 Q" className={field} /></label>
      <label className="block"><span className="gb-label block mb-1.5">Client</span><input required value={f.client} onChange={set('client')} className={field} /></label>
      <label className="block">
        <span className="gb-label block mb-1.5">Agent</span>
        <select value={f.agent} onChange={set('agent')} className={`${field} cursor-pointer`}>
          <option value="">No agent (direct sale)</option>
          {agents.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </label>
      <label className="block"><span className="gb-label block mb-1.5">Amount (₱)</span><input type="number" required min="0.01" step="0.01" inputMode="decimal" value={f.amount} onChange={set('amount')} className={`${field} tabular-nums`} /></label>
      <label className="block"><span className="gb-label block mb-1.5">Notes (optional)</span><textarea rows={2} value={f.notes} onChange={set('notes')} className={field} /></label>
      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={!valid || saving} className={btn.primary}>{saving ? 'Saving…' : 'Add sale'}</button>
        <button type="button" onClick={onDone} className="px-3 py-2 text-[13px] text-[#4E585E] hover:text-[#141517] cursor-pointer">Cancel</button>
      </div>
    </form>
  );
};

const rangeFor = (p: Exclude<Preset, 'custom'>): [string, string] => {
  const now = new Date();
  const today = dayOf(now);
  if (p === 'today') return [today, today];
  if (p === 'week') {
    const start = new Date(now);
    start.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // Monday
    return [dayOf(start), today];
  }
  if (p === 'month') return [dayOf(new Date(now.getFullYear(), now.getMonth(), 1)), today];
  return [`${now.getFullYear()}-01-01`, today];
};

// Completed sales and payments received on the days picked. The admin sees everything and can add a sale by hand;
// an agent sees their own sales (the server only sends them their own records).
export const SalesReport: React.FC<{ mode?: 'admin' | 'agent' }> = ({ mode = 'admin' }) => {
  const isAdmin = mode === 'admin';
  const { commissions, applications, salesEntries, deleteSalesEntry } = useApp();
  const [adding, setAdding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [preset, setPreset] = useState<Preset>('month');
  const [[from, to], setRange] = useState<[string, string]>(rangeFor('month'));

  const choose = (p: Preset) => {
    setPreset(p);
    if (p !== 'custom') setRange(rangeFor(p));
  };
  const setFrom = (v: string) => { setPreset('custom'); setRange(([, t]) => [v, v > t ? v : t]); };
  const setTo = (v: string) => { setPreset('custom'); setRange(([f]) => [v < f ? v : f, v]); };
  const inRange = (iso: string) => {
    const d = dayOf(new Date(iso));
    return d >= from && d <= to;
  };

  // A sale is a completed transaction; its commission record carries the price, client, agent and completion date.
  const sales = useMemo(
    () =>
      [
        ...commissions
          .filter((c) => c.transactionCompleted)
          .map((c) => ({ id: c.applicationRef, manual: false, date: c.completedAt ?? c.createdAt, ref: c.applicationRef, vehicle: c.vehicleTitle, client: c.clientName, agent: c.agentName, amount: c.salePrice })),
        // entered by hand: the day is kept as yyyy-mm-dd, read at local noon so it stays on that day
        ...salesEntries.map((e) => ({ id: e.id, manual: true, date: new Date(`${e.date}T12:00:00`).toISOString(), ref: 'Entered by hand', vehicle: e.vehicle, client: e.client, agent: e.agent ?? '-', amount: e.amount })),
      ]
        .filter((s) => inRange(s.date))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [commissions, salesEntries, from, to]
  );
  const payments = useMemo(
    () =>
      applications
        .flatMap((a) => (a.payments ?? []).map((p) => ({ ...p, client: a.applicantName, vehicle: a.vehicleTitle })))
        .filter((p) => inRange(p.date))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [applications, from, to]
  );

  const totalSales = sales.reduce((s, x) => s + x.amount, 0);
  const totalPayments = payments.reduce((s, x) => s + x.amount, 0);
  const byDay = [...sales.reduce((m, s) => {
    const d = dayOf(new Date(s.date));
    const row = m.get(d) ?? { units: 0, amount: 0 };
    m.set(d, { units: row.units + 1, amount: row.amount + s.amount });
    return m;
  }, new Map<string, { units: number; amount: number }>())];
  const label = from === to ? longDay(from) : `${longDay(from)} to ${longDay(to)}`;

  const dateInput = 'px-3 py-2 text-[14px] bg-white border border-[#8C989F] text-[#141517] tabular-nums';

  return (
    <section className="space-y-6">
      <SectionHeader title={isAdmin ? 'Sales report' : 'My sales report'} hint={isAdmin ? 'Pick any day or range of days to see the sales completed and the payments received in it.' : 'Your completed sales and the payments your clients made, for any day or range of days.'}>
        {isAdmin && (
          <button className={`${btn.primary} inline-flex items-center gap-1.5`} onClick={() => setAdding(true)}>
            <Plus className="w-4 h-4" aria-hidden="true" /> Add sale
          </button>
        )}
      </SectionHeader>
      <Drawer open={adding} onClose={() => setAdding(false)} title="Add a sale">
        {adding && <SaleForm onDone={() => setAdding(false)} />}
      </Drawer>

      <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
        <FilterTabs
          id="sales-range"
          value={preset}
          onChange={choose}
          options={[
            { value: 'today', label: 'Today' },
            { value: 'week', label: 'This week' },
            { value: 'month', label: 'This month' },
            { value: 'year', label: 'This year' },
            { value: 'custom', label: 'Custom' },
          ]}
        />
        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="gb-label block mb-1.5">From</span>
            <input type="date" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} className={dateInput} />
          </label>
          <label className="block">
            <span className="gb-label block mb-1.5">To</span>
            <input type="date" value={to} min={from} onChange={(e) => e.target.value && setTo(e.target.value)} className={dateInput} />
          </label>
        </div>
      </div>

      <div>
        <p className="text-[13px] text-[#4E585E]" aria-live="polite">{label}</p>
        <dl className="mt-3 grid grid-cols-1 sm:grid-cols-3 border-y border-[#C9D1D6]">
          {[
            { k: 'Total sales', v: money(totalSales), n: `${sales.length} vehicle${sales.length === 1 ? '' : 's'} sold` },
            { k: 'Payments received', v: money(totalPayments), n: `${payments.length} acknowledgement receipt${payments.length === 1 ? '' : 's'}` },
            { k: 'Average sale', v: sales.length ? money(totalSales / sales.length) : '-', n: 'Per completed sale' },
          ].map((m, i) => (
            <div key={m.k} className={`py-4 ${i ? 'sm:pl-5 sm:border-l border-t sm:border-t-0 border-[#C9D1D6]' : ''}`}>
              <dt className="gb-label">{m.k}</dt>
              <dd className="mt-1.5 font-display text-[clamp(20px,2.4vw,26px)] leading-tight tabular-nums text-[#141517]">{m.v}</dd>
              <dd className="mt-1 text-[12px] text-[#4E585E]">{m.n}</dd>
            </div>
          ))}
        </dl>
      </div>

      {sales.length === 0 && payments.length === 0 ? (
        <EmptyState title="No sales on these dates" body="Try another day or a wider range." />
      ) : (
        <>
          {byDay.length > 0 && (
            <div>
              <h3 className="gb-label !text-[#141517] pb-2 border-b border-[#141517]">Sales by day</h3>
              <ul className="text-[13.5px]">
                {byDay.map(([d, r]) => (
                  <li key={d} className="flex justify-between gap-3 py-2.5 border-b border-[#DDE3E6] tabular-nums">
                    <span className="text-[#141517]">{longDay(d)}</span>
                    <span className="text-[#4E585E]">{r.units} sold · <strong className="text-[#141517]">{money(r.amount)}</strong></span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {sales.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px] min-w-[640px]">
                <caption className="text-left gb-label !text-[#141517] pb-2">Completed sales</caption>
                <thead>
                  <tr className="border-y border-[#141517]">
                    {['Date', 'Reference', 'Vehicle', 'Client', 'Agent'].map((h) => <th key={h} className="gb-label py-2.5 pr-4 font-semibold">{h}</th>)}
                    <th className="gb-label py-2.5 font-semibold text-right">Amount</th>
                    <th className="w-10"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {sales.map((s) => (
                    <tr key={s.id} className="border-b border-[#DDE3E6]">
                      <td className="py-2.5 pr-4 whitespace-nowrap text-[#4E585E]">{longDay(dayOf(new Date(s.date)))}</td>
                      <td className="py-2.5 pr-4 text-[#4E585E]">{s.ref}</td>
                      <td className="py-2.5 pr-4 text-[#141517]">{s.vehicle}</td>
                      <td className="py-2.5 pr-4 text-[#141517]">{s.client}</td>
                      <td className="py-2.5 pr-4 text-[#141517]">{s.agent}</td>
                      <td className="py-2.5 text-right font-semibold text-[#141517] whitespace-nowrap">{money(s.amount)}</td>
                      <td className="py-2.5 pl-2 text-right whitespace-nowrap">
                        {s.manual &&
                          (confirmDelete === s.id ? (
                            <span className="inline-flex gap-2">
                              <button onClick={() => { setConfirmDelete(null); deleteSalesEntry(s.id); }} className="text-[12.5px] font-semibold text-[#B42318] cursor-pointer">Remove</button>
                              <button onClick={() => setConfirmDelete(null)} className="text-[12.5px] text-[#4E585E] cursor-pointer">Keep</button>
                            </span>
                          ) : (
                            <button onClick={() => setConfirmDelete(s.id)} aria-label={`Remove the sale of ${s.vehicle}`} className="p-1 text-[#4E585E] hover:text-[#B42318] cursor-pointer">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[#141517]">
                    <td colSpan={5} className="py-2.5 font-semibold text-[#141517]">Total</td>
                    <td className="py-2.5 text-right font-semibold tabular-nums text-[#141517] whitespace-nowrap">{money(totalSales)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {payments.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px] min-w-[560px]">
                <caption className="text-left gb-label !text-[#141517] pb-2">Payments received</caption>
                <thead>
                  <tr className="border-y border-[#141517]">
                    {['Date', 'AR No.', 'Client', 'Vehicle'].map((h) => <th key={h} className="gb-label py-2.5 pr-4 font-semibold">{h}</th>)}
                    <th className="gb-label py-2.5 font-semibold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {payments.map((p) => (
                    <tr key={p.arNo} className="border-b border-[#DDE3E6]">
                      <td className="py-2.5 pr-4 whitespace-nowrap text-[#4E585E]">{longDay(dayOf(new Date(p.date)))}</td>
                      <td className="py-2.5 pr-4 text-[#141517]">{p.arNo}</td>
                      <td className="py-2.5 pr-4 text-[#141517]">{p.client}</td>
                      <td className="py-2.5 pr-4 text-[#141517]">{p.vehicle}</td>
                      <td className="py-2.5 text-right font-semibold text-[#141517] whitespace-nowrap">{money(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[#141517]">
                    <td colSpan={4} className="py-2.5 font-semibold text-[#141517]">Total</td>
                    <td className="py-2.5 text-right font-semibold tabular-nums text-[#141517] whitespace-nowrap">{money(totalPayments)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
};
