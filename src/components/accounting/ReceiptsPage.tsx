import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { ManualReceipt, PaymentReceipt, ReceiptLine, VehicleApplication } from '../../types.ts';
import { SectionHeader, EmptyState, Drawer, btn, checkUpload } from '../admin/ui.tsx';
import { PaymentLineForm } from '../ApplicationsManager.tsx';
import { ArDoc, downloadAR, lineTotal, manualAr, openAR, openImage, paymentAr, reserveWindow } from '../receipt.ts';
import { pesoWords } from '../ar.ts';
import { mdy, money } from './ledger.ts';
import { Download, Paperclip, Pencil, Plus, Trash2, X } from 'lucide-react';

// Every acknowledgement receipt in one register: the ones released from an application's partial payment and the
// ones the admin writes here by hand. Both share the running AR number.
type Row =
  | { kind: 'payment'; arNo: string; date: string; from: string; what: string; amount: number; doc: ArDoc; app: VehicleApplication; p: PaymentReceipt }
  | { kind: 'manual'; arNo: string; date: string; from: string; what: string; amount: number; doc: ArDoc; r: ManualReceipt };

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const dayOf = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const field = 'w-full px-3 py-2 text-[14px] bg-white border border-[#8C989F] text-[#141517]';
type DraftLine = { description: string; qty: string; price: string };

// Create or edit a hand-written AR, laid out like the paper receipt: lines of description, qty, price and amount.
const ReceiptForm: React.FC<{ initial?: ManualReceipt; onDone: () => void }> = ({ initial, onDone }) => {
  const { saveReceipt, showToast } = useApp();
  const [date, setDate] = useState(initial ? dayOf(initial.date) : today());
  const [receivedFrom, setReceivedFrom] = useState(initial?.receivedFrom ?? '');
  const [lines, setLines] = useState<DraftLine[]>(initial?.lines.map((l) => ({ description: l.description, qty: String(l.qty), price: String(l.price) })) ?? [{ description: '', qty: '1', price: '' }]);
  const [remarks, setRemarks] = useState(initial?.remarks ?? '');
  const [file, setFile] = useState<File | undefined>();
  const [saving, setSaving] = useState(false);
  const parsed: ReceiptLine[] = lines.map((l) => ({ description: l.description.trim(), qty: Number(l.qty), price: Number(l.price) }));
  const valid = receivedFrom.trim() && parsed.every((l) => l.description && Number.isInteger(l.qty) && l.qty > 0 && l.price > 0);
  const total = valid ? lineTotal(parsed) : 0;
  const set = (i: number, k: keyof DraftLine, v: string) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, [k]: v } : l)));

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!valid || saving) return;
        setSaving(true);
        const win = initial ? null : reserveWindow(); // opened during the click so the browser allows it
        const saved = await saveReceipt(initial?.id ?? null, { date, receivedFrom: receivedFrom.trim(), lines: parsed, remarks: remarks.trim() || undefined }, file);
        setSaving(false);
        if (!saved) return win?.close();
        onDone();
        if (!initial && !openAR(manualAr(saved), win)) showToast('Allow pop-ups', 'The receipt was saved. Allow pop-ups to see it here.', 'info');
      }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="gb-label block mb-1.5">Date</span>
          <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={field} />
        </label>
        <label className="block">
          <span className="gb-label block mb-1.5">Received from (client)</span>
          <input required value={receivedFrom} onChange={(e) => setReceivedFrom(e.target.value)} className={field} />
        </label>
      </div>

      <fieldset>
        <legend className="gb-label mb-1.5">Lines</legend>
        <div className="space-y-2">
          {lines.map((l, i) => (
            <div key={i} className="grid grid-cols-[1fr_64px_110px_auto] gap-2 items-center">
              <input value={l.description} onChange={(e) => set(i, 'description', e.target.value)} placeholder="Description" aria-label={`Line ${i + 1} description`} className={field} />
              <input type="number" min="1" step="1" value={l.qty} onChange={(e) => set(i, 'qty', e.target.value)} aria-label={`Line ${i + 1} quantity`} className={`${field} tabular-nums`} />
              <input type="number" min="0.01" step="0.01" inputMode="decimal" value={l.price} onChange={(e) => set(i, 'price', e.target.value)} placeholder="Price" aria-label={`Line ${i + 1} price`} className={`${field} tabular-nums`} />
              <button type="button" disabled={lines.length === 1} onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} aria-label={`Remove line ${i + 1}`} className="p-2 text-[#4E585E] hover:text-[#B42318] cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        {lines.length < 8 && (
          <button type="button" onClick={() => setLines((ls) => [...ls, { description: '', qty: '1', price: '' }])} className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#1D5FD1] cursor-pointer">
            <Plus className="w-4 h-4" aria-hidden="true" /> Add new line
          </button>
        )}
      </fieldset>

      <label className="block">
        <span className="gb-label block mb-1.5">Remarks</span>
        <textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} className={field} />
      </label>

      <div>
        <span className="gb-label block mb-1.5">Payment screenshot (optional)</span>
        {file ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-2 border border-[#1B7F35] text-[12.5px] max-w-full">
            <Paperclip className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{file.name}</span>
            <button type="button" onClick={() => setFile(undefined)} aria-label="Remove file" className="cursor-pointer text-[#4E585E]"><X className="w-3.5 h-3.5" /></button>
          </span>
        ) : (
          <label className={`${btn.outline} inline-flex items-center gap-1.5`}>
            <Paperclip className="w-4 h-4" aria-hidden="true" /> {initial?.attachment ? 'Replace screenshot' : 'Attach screenshot'}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (!f) return;
                const problem = checkUpload(f);
                if (problem || !f.type.startsWith('image/')) return showToast('Cannot attach', problem || `${f.name} is not an image.`, 'error');
                setFile(f);
              }}
            />
          </label>
        )}
      </div>

      <div className="border-y border-[#141517] py-3 flex justify-between gap-4 items-baseline">
        <span className="text-[12px] text-[#4E585E] max-w-[60%]">{valid ? pesoWords(total) : 'Fill in every line to see the total.'}</span>
        <strong className="tabular-nums text-[18px]">{money(total)}</strong>
      </div>

      <div className="flex gap-2">
        <button type="submit" disabled={!valid || saving} className={btn.primary}>{saving ? 'Saving…' : initial ? 'Save AR' : 'Confirm & release AR'}</button>
        <button type="button" onClick={onDone} className="px-3 py-2 text-[13px] text-[#4E585E] hover:text-[#141517] cursor-pointer">Cancel</button>
      </div>
    </form>
  );
};

export const ReceiptsPage: React.FC = () => {
  const { applications, receipts, updatePayment, deletePayment, deleteReceipt, showToast } = useApp();
  const [drawer, setDrawer] = useState<{ edit?: ManualReceipt } | null>(null);
  const [editingPayment, setEditingPayment] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const rows = useMemo<Row[]>(() => {
    const fromApps: Row[] = applications.flatMap((app) =>
      (app.payments ?? []).map((p) => ({ kind: 'payment' as const, arNo: p.arNo, date: p.date, from: app.applicantName, what: `${p.description} (${app.referenceNo})`, amount: p.amount, doc: paymentAr(app, p), app, p }))
    );
    const manual: Row[] = receipts.map((r) => ({ kind: 'manual' as const, arNo: r.arNo, date: r.date, from: r.receivedFrom, what: r.lines.map((l) => l.description).join(', '), amount: lineTotal(r.lines), doc: manualAr(r), r }));
    const q = query.trim().toLowerCase();
    return [...fromApps, ...manual]
      .filter((x) => !q || `${x.arNo} ${x.from} ${x.what}`.toLowerCase().includes(q))
      .sort((a, b) => b.arNo.localeCompare(a.arNo));
  }, [applications, receipts, query]);

  const view = (d: ArDoc) => !openAR(d) && showToast('Allow pop-ups', 'Your browser blocked the receipt window. Allow pop-ups for this site and try again.', 'error');
  const link = 'inline-flex items-center gap-1 text-[13px] font-semibold underline underline-offset-4 cursor-pointer';

  return (
    <section className="space-y-5">
      <SectionHeader title="Acknowledgement receipts" hint="Every AR in one place: those released from an application's partial payment and those you write here. All share one running AR number.">
        <button className={`${btn.primary} inline-flex items-center gap-1.5`} onClick={() => setDrawer({})}>
          <Plus className="w-4 h-4" aria-hidden="true" /> New AR
        </button>
      </SectionHeader>

      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by AR no., client or description" aria-label="Search receipts" className={`${field} max-w-md`} />

      {rows.length === 0 ? (
        <EmptyState title="No receipts" body={query ? 'Nothing matches that search.' : 'Receipts appear here when you confirm a partial payment or write one with New AR.'} />
      ) : (
        <ul className="border-b border-[#C9D1D6]">
          {rows.map((x) => (
            <li key={x.arNo} className="py-3.5 border-t border-[#C9D1D6] space-y-2">
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <span className="tabular-nums font-semibold text-[#141517]">AR {x.arNo}</span>
                <span className="tabular-nums text-[13px] text-[#4E585E]">{mdy(x.date)}</span>
                <span className="text-[14px] text-[#141517]">{x.from}</span>
                <span className="text-[12px] text-[#6B767D]">{x.kind === 'payment' ? 'Partial payment' : 'Written by hand'}</span>
                <span className="ml-auto tabular-nums font-semibold text-[#141517]">{money(x.amount)}</span>
              </div>
              <p className="text-[13px] text-[#2A2E31]">{x.what}</p>
              {x.doc.remarks && <p className="text-[12.5px] text-[#4E585E]">Remarks: {x.doc.remarks}</p>}

              {x.kind === 'payment' && editingPayment === x.arNo ? (
                <PaymentLineForm
                  initial={x.p}
                  defaultDescription={x.p.description}
                  submitLabel="Save AR"
                  onCancel={() => setEditingPayment(null)}
                  onSubmit={async (v, shot) => {
                    const ok = !!(await updatePayment(x.app.id, x.arNo, v, shot));
                    if (ok) setEditingPayment(null);
                    return ok;
                  }}
                />
              ) : confirmDelete === x.arNo ? (
                <div className="flex flex-wrap items-center gap-2 animate-fade-up">
                  <span className="text-[13px] text-[#B42318]">Delete AR {x.arNo}? {x.kind === 'payment' ? 'The payment is taken off the application balance.' : ''}</span>
                  <button
                    className="px-3.5 py-2 bg-[#B42318] text-white text-[13px] font-semibold cursor-pointer"
                    onClick={async () => {
                      setConfirmDelete(null);
                      if (x.kind === 'payment') await deletePayment(x.app.id, x.arNo);
                      else await deleteReceipt(x.r.id);
                    }}
                  >
                    Delete
                  </button>
                  <button onClick={() => setConfirmDelete(null)} className="px-3 py-2 text-[13px] text-[#4E585E] hover:text-[#141517] cursor-pointer">Cancel</button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  <button onClick={() => view(x.doc)} className={`${link} text-[#1D5FD1]`}>View</button>
                  <button onClick={() => downloadAR(x.doc)} className={`${link} text-[#141517] decoration-[#8C989F]`}><Download className="w-3.5 h-3.5" aria-hidden="true" /> PDF</button>
                  {(x.kind === 'payment' ? x.p.attachment : x.r.attachment) && (
                    <button onClick={() => openImage((x.kind === 'payment' ? x.p.attachment : x.r.attachment)!, `Attachment ${x.arNo}`)} className={`${link} text-[#141517] decoration-[#8C989F]`}>
                      <Paperclip className="w-3.5 h-3.5" aria-hidden="true" /> Screenshot
                    </button>
                  )}
                  <button onClick={() => (x.kind === 'payment' ? setEditingPayment(x.arNo) : setDrawer({ edit: x.r }))} className={`${link} text-[#141517] decoration-[#8C989F]`}>
                    <Pencil className="w-3.5 h-3.5" aria-hidden="true" /> Edit
                  </button>
                  <button onClick={() => setConfirmDelete(x.arNo)} className={`${link} text-[#B42318]`}><Trash2 className="w-3.5 h-3.5" aria-hidden="true" /> Delete</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <Drawer open={!!drawer} onClose={() => setDrawer(null)} title={drawer?.edit ? `Edit AR ${drawer.edit.arNo}` : 'New acknowledgement receipt'}>
        {drawer && <ReceiptForm key={drawer.edit?.id ?? 'new'} initial={drawer.edit} onDone={() => setDrawer(null)} />}
      </Drawer>
    </section>
  );
};
