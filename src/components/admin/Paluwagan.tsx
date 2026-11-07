import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { PALUWAGAN_SLOTS, type PaluwaganMember, type PaluwaganUnit } from '../../types.ts';
import { uploadFile, dataUrlToBlob } from '../../api.ts';
import { photoDataUrl, MAX_PHOTOS } from '../../media.ts';
import { PALUWAGAN_FORM_URL } from '../../data/constants.ts';
import { SlotGrid } from '../Paluwagan.tsx';
import { SectionHeader, EmptyState, btn, shortDate } from './ui.tsx';
import { dayText, dueDate, monthsBehind, nextDue, paidCount, totalGiven } from '../paluwaganSchedule.ts';
import { downloadPaluwaganXlsx } from '../paluwaganExcel.ts';
import { manualAr, openAR } from '../receipt.ts';
import { AlertTriangle, ChevronDown, Download, ExternalLink, ImagePlus, Search, Trash2, X } from 'lucide-react';

const input = 'w-full px-3 py-2 text-[14px] bg-white border border-[#8C989F] text-[#141517] focus:outline-none focus:border-[#1D5FD1]';

// One paluwagan listing: a name, photos and an optional note. No specifications.
const UnitForm: React.FC<{ unit?: PaluwaganUnit; onDone: () => void }> = ({ unit, onDone }) => {
  const { savePaluwaganUnit, showToast } = useApp();
  const [title, setTitle] = useState(unit?.title ?? '');
  const [description, setDescription] = useState(unit?.description ?? '');
  const [images, setImages] = useState<string[]>(unit?.images ?? []);
  const [hidden, setHidden] = useState(!!unit?.hidden);
  const [startDate, setStartDate] = useState(unit?.startDate ?? '');
  const [dueDay, setDueDay] = useState(unit?.dueDay ? String(unit.dueDay) : '');
  const [monthly, setMonthly] = useState(unit?.monthlyAmount ? String(unit.monthlyAmount) : '');
  const [busy, setBusy] = useState(false);
  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    for (const f of Array.from(files).slice(0, MAX_PHOTOS - images.length)) {
      try {
        const up = await uploadFile(await dataUrlToBlob(await photoDataUrl(f)), f.name.replace(/\.\w+$/, '.jpg'), 'public');
        setImages((x) => [...x, up.url]);
      } catch (e) {
        showToast('Photo not added', e instanceof Error ? e.message : f.name, 'error');
      }
    }
    setBusy(false);
  };
  return (
    <form
      className="space-y-3 p-4 bg-[#F7F8F8] border border-[#C9D1D6]"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const ok = await savePaluwaganUnit(unit?.id ?? null, { title: title.trim(), images, description: description.trim(), hidden, startDate: startDate || undefined, dueDay: dueDay ? Number(dueDay) : undefined, monthlyAmount: monthly ? Number(monthly) : undefined });
        setBusy(false);
        if (ok) onDone();
      }}
    >
      <label className="block"><span className="gb-label block mb-1.5">Unit name</span><input className={input} maxLength={120} value={title} placeholder="e.g. Toyota Hilux" onChange={(e) => setTitle(e.target.value)} /></label>
      <label className="block"><span className="gb-label block mb-1.5">Description (optional)</span><textarea rows={2} maxLength={2000} className={input} value={description} onChange={(e) => setDescription(e.target.value)} /></label>
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block"><span className="gb-label block mb-1.5">Start date (month 1 due, optional)</span><input type="date" className={input} value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label>
        <label className="block"><span className="gb-label block mb-1.5">Due day each month (1–28)</span><input className={`${input} tabular-nums`} inputMode="numeric" disabled={!startDate} placeholder={startDate ? String(Math.min(Number(startDate.slice(8)), 28)) : 'Set a start date first'} value={dueDay} onChange={(e) => setDueDay(e.target.value.replace(/\D/g, '').slice(0, 2))} /></label>
      </div>
      <label className="block sm:max-w-[16rem]"><span className="gb-label block mb-1.5">Monthly amount (₱)</span><input className={`${input} tabular-nums`} inputMode="numeric" placeholder="e.g. 8000" value={monthly} onChange={(e) => setMonthly(e.target.value.replace(/\D/g, '').slice(0, 9))} /></label>
      <p className="text-[12.5px] text-[#4E585E] -mt-1">With a start date, each month gets a due date, late members are flagged, and clients get a reminder 3 days before each payment. With a monthly amount, marking a month paid writes its acknowledgement receipt (AR) and sends it to the client.</p>
      <div className="flex flex-wrap gap-2">
        {images.map((u, i) => (
          <span key={u} className="relative w-24 h-16 border border-[#C9D1D6]">
            <img src={u} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
            <button type="button" onClick={() => setImages(images.filter((x) => x !== u))} aria-label={`Remove photo ${i + 1}`} className="absolute top-0.5 right-0.5 bg-white/90 p-0.5 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
          </span>
        ))}
        {images.length < MAX_PHOTOS && (
          <label className="w-24 h-16 flex flex-col items-center justify-center border border-dashed border-[#8C989F] text-[11.5px] font-semibold cursor-pointer hover:bg-[#EEF1F2] focus-within:outline focus-within:outline-2 focus-within:outline-[#1D5FD1]">
            <ImagePlus className="w-4 h-4" aria-hidden="true" />{busy ? 'Uploading…' : 'Add photos'}
            <input type="file" accept="image/*" multiple disabled={busy} className="sr-only" onChange={(e) => { addPhotos(e.target.files); e.target.value = ''; }} />
          </label>
        )}
      </div>
      <label className="flex items-center gap-2 text-[13.5px] cursor-pointer">
        <input type="checkbox" className="accent-[#1D5FD1] w-4 h-4" checked={hidden} onChange={(e) => setHidden(e.target.checked)} /> Hidden from clients (closed)
      </label>
      <div className="flex gap-2">
        <button type="submit" className={btn.primary} disabled={busy || !title.trim() || images.length === 0 || (!!dueDay && (Number(dueDay) < 1 || Number(dueDay) > 28))}>{unit ? 'Save listing' : 'Add listing'}</button>
        <button type="button" onClick={onDone} className="px-3 py-2 text-[13px] text-[#4E585E] hover:text-[#141517] cursor-pointer">Cancel</button>
      </div>
    </form>
  );
};

// Admin: the paluwagan listings, apart from the marketplace's Add listing.
export const PaluwaganSetup: React.FC = () => {
  const { paluwaganUnits, deletePaluwaganUnit } = useApp();
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  return (
    <section className="space-y-4">
      <SectionHeader title="Paluwagan listings" hint={`Shown under Paluwagan in the marketplace as just a photo and a name, each with ${PALUWAGAN_SLOTS} slots. A listing with members can be hidden, not deleted.`}>
        {editing !== 'new' && <button className={btn.primary} onClick={() => setEditing('new')}>Add paluwagan listing</button>}
      </SectionHeader>
      {editing === 'new' && <UnitForm onDone={() => setEditing(null)} />}
      {paluwaganUnits.length === 0 && editing !== 'new' && <EmptyState title="No paluwagan listings yet" body="Add the first unit clients can join a paluwagan for." />}
      {paluwaganUnits.map((u) =>
        editing === u.id ? (
          <UnitForm key={u.id} unit={u} onDone={() => setEditing(null)} />
        ) : (
          <div key={u.id} className="flex flex-wrap items-center gap-4 p-3 bg-white border border-[#C9D1D6]">
            <img src={u.images[0]} alt="" className="w-24 h-16 object-cover bg-[#EEF1F2]" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[14.5px] text-[#141517]">{u.title}</p>
              <p className="text-[13px] tabular-nums text-[#2A2E31]">{u.taken.length} of {PALUWAGAN_SLOTS} slots taken{u.monthlyAmount ? ` · ₱${u.monthlyAmount.toLocaleString()}/month` : ' · no monthly amount'}{u.startDate ? ` · starts ${dayText(dueDate(u, 1))}` : ' · no start date'}{u.hidden ? ' · Hidden' : ''}</p>
            </div>
            <button className={btn.outline} onClick={() => setEditing(u.id)}>Edit</button>
            <button className="p-2 text-[#9B2C2C] hover:bg-[#FBEAEA] cursor-pointer" aria-label={`Delete ${u.title}`} onClick={() => window.confirm(`Delete ${u.title}?`) && deletePaluwaganUnit(u.id)}><Trash2 className="w-4 h-4" /></button>
          </div>
        )
      )}
    </section>
  );
};

// One month's details, opened by right-clicking (or long-pressing) a month: paid, how much was given, and a note.
const MonthEditor: React.FC<{ m: PaluwaganMember; unit?: PaluwaganUnit; n: number; onClose: () => void }> = ({ m, unit, n, onClose }) => {
  const { setPaluwaganMonth, receipts, showToast } = useApp();
  const x = m.months[n - 1];
  const ar = x.arNo ? receipts.find((r) => r.arNo === x.arNo) : undefined;
  const due = unit && dueDate(unit, n);
  const [paid, setPaid] = useState(x.paid);
  const [amount, setAmount] = useState(x.amount ? String(x.amount) : '');
  const [note, setNote] = useState(x.note ?? '');
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="p-3 bg-[#F7F8F8] border border-[#141517] space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const ok = await setPaluwaganMonth(m.id, n, { paid, amount: amount ? Number(amount) : paid && !x.paid ? undefined : null, note: note.trim() });
        setBusy(false);
        if (ok) onClose();
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold text-[14px] text-[#141517]">Month {n} of {PALUWAGAN_SLOTS}<span className="font-normal text-[12.5px] text-[#4E585E]">{due ? ` · due ${dayText(due)}` : ''}{x.paidAt ? ` · paid ${shortDate(x.paidAt)}` : ''}</span></p>
        <button type="button" onClick={onClose} aria-label="Close" className="p-1 text-[#4E585E] hover:text-[#141517] cursor-pointer"><X className="w-4 h-4" /></button>
      </div>
      <label className="flex items-center gap-2 text-[13.5px] cursor-pointer">
        <input type="checkbox" className="accent-[#1B7F35] w-4 h-4" checked={paid} onChange={(e) => setPaid(e.target.checked)} /> Paid
      </label>
      <div className="grid sm:grid-cols-[10rem_1fr] gap-3">
        <label className="block"><span className="gb-label block mb-1.5">Amount given (₱)</span><input className={`${input} tabular-nums`} inputMode="numeric" placeholder={unit?.monthlyAmount ? String(unit.monthlyAmount) : ''} value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, '').slice(0, 9))} /></label>
        <label className="block"><span className="gb-label block mb-1.5">Note (optional)</span><input className={input} maxLength={300} value={note} placeholder="e.g. paid through GCash" onChange={(e) => setNote(e.target.value)} /></label>
      </div>
      {x.arNo ? (
        <p className="text-[13px] text-[#2A2E31]">
          Receipt AR {x.arNo} was sent to the client.{' '}
          {ar && <button type="button" className="font-semibold underline underline-offset-4 cursor-pointer" onClick={() => !openAR(manualAr(ar)) && showToast('Allow pop-ups', 'Your browser blocked the receipt window.', 'error')}>View AR</button>}
        </p>
      ) : (
        <p className="text-[12.5px] text-[#4E585E]">Saved as paid with an amount{unit?.monthlyAmount ? ` (empty = ₱${unit.monthlyAmount.toLocaleString()})` : ''}, this month gets its acknowledgement receipt (AR) and the client is told.</p>
      )}
      <button type="submit" className={btn.primary} disabled={busy}>{busy ? 'Saving…' : 'Save month'}</button>
    </form>
  );
};

// One member, folded to a single line; open it for contact details and the 36 months. Click a month to mark it paid
// (or unpaid); right-click it for the amount and a note.
const MemberRow: React.FC<{ m: PaluwaganMember; unit?: PaluwaganUnit; showUnit: boolean; nextInLine: boolean }> = ({ m, unit, showUnit, nextInLine }) => {
  const { setPaluwaganMonth, removePaluwaganMember, releasePaluwagan, decidePaluwaganCommission, setCareAgent, verifyPaluwagan, agents } = useApp();
  const [busy, setBusy] = useState<number | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [details, setDetails] = useState(false); // touch screens: a tap opens the month's details instead of toggling
  const paid = paidCount(m);
  const given = totalGiven(m);
  const released = m.status === 'released';
  const behind = unit ? monthsBehind(unit, m) : 0;
  const due = unit && nextDue(unit, m);
  const today = new Date(new Date().toDateString());
  const toggle = async (n: number) => {
    if (details) return setEditing(n);
    setBusy(n);
    await setPaluwaganMonth(m.id, n, { paid: !m.months[n - 1].paid });
    setBusy(null);
  };
  return (
    <li className="bg-white border border-[#C9D1D6]">
      <details>
        <summary className="flex flex-wrap items-center gap-3 p-3 cursor-pointer list-none hover:bg-[#F7F8F8]">
          <span className="w-10 h-10 grid place-items-center bg-[#141517] text-white font-display text-[17px] tabular-nums shrink-0" aria-label={`Slot ${m.slot}`}>{m.slot}</span>
          <span className="flex-1 min-w-0">
            <span className="block font-semibold text-[14.5px] text-[#141517] truncate">{m.clientName}</span>
            <span className="block text-[12.5px] text-[#4E585E] truncate">{showUnit ? `${m.unitTitle} · ` : ''}{!m.verifiedAt ? '' : m.careAgent ? `care: ${m.careAgent} · ` : 'waiting for an agent to claim · '}{m.referredBy && m.referredBy !== m.careAgent ? `via ${m.referredBy} · ` : ''}joined {shortDate(m.joinedAt)}</span>
          </span>
          {!m.verifiedAt && <span className="px-2 py-1 bg-[#FFF8E6] text-[#B54708] text-[12px] font-semibold">To verify</span>}
          {behind > 0 && <span className="px-2 py-1 bg-[#FDF3F2] text-[#B42318] text-[12px] font-semibold flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />{behind} month{behind > 1 ? 's' : ''} behind</span>}
          {m.commission?.status === 'requested' && <span className="px-2 py-1 bg-[#EEF3FC] text-[#1D5FD1] text-[12px] font-semibold">Commission to approve</span>}
          {nextInLine && !released && <span className="px-2 py-1 bg-[#EEF1F2] text-[#141517] text-[12px] font-semibold">Next to release</span>}
          {released && <span className="px-2 py-1 bg-[#EAF5EC] text-[#1B7F35] text-[12px] font-semibold">Released {shortDate(m.releasedAt)}</span>}
          {(!released || paid < PALUWAGAN_SLOTS) && (
            <span className="w-28 shrink-0" aria-label={`Paid ${paid} of ${PALUWAGAN_SLOTS} months`}>
              <span className="block text-[12px] tabular-nums text-[#2A2E31] text-right">{paid}/{PALUWAGAN_SLOTS} paid</span>
              <span className="block h-1.5 mt-1 bg-[#DDE3E6]"><span className="block h-full bg-[#1B7F35]" style={{ width: `${(paid / PALUWAGAN_SLOTS) * 100}%` }} /></span>
            </span>
          )}
          <ChevronDown className="w-4 h-4 text-[#4E585E] shrink-0" aria-hidden="true" />
        </summary>
        <div className="px-3 pb-3 pt-1 space-y-3 border-t border-[#DDE3E6]">
          <div className="flex flex-wrap items-start justify-between gap-2 text-[13px] text-[#4E585E]">
            <p className="break-all">{m.unitTitle} · {m.clientEmail}{m.clientPhone ? ` · ${m.clientPhone}` : ''}{given ? ` · ₱${given.toLocaleString()} given` : ''}{due?.date ? ` · next: month ${due.month}, due ${dayText(due.date)}` : ''}</p>
            <div className="flex flex-wrap gap-3">
              {!released && <button className="text-[12.5px] font-semibold text-[#1B7F35] hover:underline cursor-pointer" onClick={() => window.confirm(`Release the ${m.unitTitle} to ${m.clientName} (slot ${m.slot}) now? They keep paying the months left.`) && releasePaluwagan(m.id)}>Release unit</button>}
              {released && m.releasedManually && <button className="text-[12.5px] text-[#4E585E] hover:underline cursor-pointer" onClick={() => window.confirm('Undo this release?') && releasePaluwagan(m.id, true)}>Undo release</button>}
              {!released && <button className="text-[12.5px] text-[#9B2C2C] hover:underline cursor-pointer" onClick={() => window.confirm(`Take ${m.clientName} off this paluwagan? Slot ${m.slot} opens up; their payment record stays.`) && removePaluwaganMember(m.id)}>Remove</button>}
            </div>
          </div>
          {!m.verifiedAt ? (
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-[#FFF8E6] border border-[#F5D08A] text-[13px]">
              <span>Check their <a href={PALUWAGAN_FORM_URL} target="_blank" rel="noopener noreferrer" className="underline">Google Form answers</a> and their month 1 payment. Verifying marks month 1 paid{unit?.monthlyAmount ? ' and sends its AR' : ''}, then agents can claim them{m.referredBy ? ` (${m.referredBy} first, for 24 hours)` : ''}.</span>
              <button className={btn.primary} onClick={() => window.confirm(`Verify ${m.clientName}? Month 1 is marked paid.`) && verifyPaluwagan(m.id)}>Verify member</button>
            </div>
          ) : (
          <label className="flex flex-wrap items-center gap-2 text-[13px] text-[#2A2E31]">
            <span className="font-semibold">Care agent</span>
            <select value={m.careAgent ?? ''} onChange={(e) => setCareAgent(m.id, e.target.value || null)} className="px-2 py-1.5 bg-white border border-[#8C989F] cursor-pointer">
              <option value="">None (the team)</option>
              {agents.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <span className="text-[12px] text-[#6B767D]">{m.careAgent ? 'keeps the client updated on their dues' : 'nobody claimed them yet: assign one, or wait for an agent to claim'}</span>
          </label>
          )}
          {m.commission && (
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-[#F7F8F8] border border-[#C9D1D6] text-[13px]">
              <span>{m.referredBy} asks <strong className="tabular-nums">₱{m.commission.amount.toLocaleString()}</strong> commission · {m.commission.status === 'requested' ? 'waiting for you' : m.commission.status === 'approved' ? 'approved (pay it in Commissions)' : 'declined'}</span>
              {m.commission.status === 'requested' && (
                <span className="flex gap-2">
                  <button className={btn.primary} onClick={() => decidePaluwaganCommission(m.id, true)}>Approve</button>
                  <button className={btn.outline} onClick={() => decidePaluwaganCommission(m.id, false)}>Decline</button>
                </span>
              )}
            </div>
          )}
          <ol className="grid grid-cols-6 sm:grid-cols-12 gap-1" aria-label={`${m.clientName}'s monthly payments`}>
            {m.months.map((x, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => toggle(i + 1)}
                  onContextMenu={(e) => { e.preventDefault(); setEditing(i + 1); }}
                  disabled={busy !== null}
                  aria-pressed={x.paid}
                  aria-label={`Month ${i + 1}: ${x.paid ? 'paid' : 'not paid'}${x.amount ? `, ₱${x.amount.toLocaleString()}` : ''}${x.note ? `, note: ${x.note}` : ''}`}
                  title={[`Month ${i + 1}: ${x.paid ? `paid ${shortDate(x.paidAt)}` : 'not paid'}`, unit && dueDate(unit, i + 1) ? `due ${dayText(dueDate(unit, i + 1))}` : '', x.amount ? `₱${x.amount.toLocaleString()}` : '', x.arNo ? `AR ${x.arNo}` : '', x.note ?? '', 'Right-click for amount and note'].filter(Boolean).join('\n')}
                  className={`relative w-full h-8 text-[11.5px] font-semibold tabular-nums cursor-pointer disabled:cursor-wait ${editing === i + 1 ? 'outline outline-2 outline-[#1D5FD1]' : ''} ${x.paid ? 'bg-[#1B7F35] text-white hover:bg-[#166A2C]' : unit && (dueDate(unit, i + 1) ?? today) < today ? 'bg-[#FDF3F2] text-[#B42318] border border-[#F2B8B5] hover:border-[#B42318]' : 'bg-white text-[#4E585E] border border-[#C9D1D6] hover:border-[#141517]'}`}
                >
                  {busy === i + 1 ? '…' : i + 1}
                  {(x.amount || x.note) && <span className={`absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full ${x.paid ? 'bg-white' : 'bg-[#1D5FD1]'}`} aria-hidden="true" />}
                </button>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[12px] text-[#6B767D]">{details ? 'Tap a month to open its details.' : 'Click a month to mark it paid (its AR is sent automatically). Right-click it for the amount and a note.'} A dot means it has an amount or note; red means overdue.</p>
            <label className="flex items-center gap-2 text-[12.5px] text-[#2A2E31] cursor-pointer">
              <input type="checkbox" className="accent-[#1D5FD1] w-4 h-4" checked={details} onChange={(e) => setDetails(e.target.checked)} /> Edit details on tap
            </label>
          </div>
          {editing && <MonthEditor key={editing} m={m} unit={unit} n={editing} onClose={() => setEditing(null)} />}
        </div>
      </details>
    </li>
  );
};

// Admin: the people in each paluwagan (36 slots), who is still filling in the form, and each member's 36 months.
export const PaluwaganMembers: React.FC = () => {
  const { paluwaganUnits, paluwagan } = useApp();
  const [unitId, setUnitId] = useState('all');
  const [q, setQ] = useState('');
  if (!paluwaganUnits.length) return <EmptyState title="No paluwagan listings yet" body="Add one in Paluwagan listings first." />;
  const unit = paluwaganUnits.find((u) => u.id === unitId);
  const find = q.trim().toLowerCase();
  const rows = paluwagan.filter((m) => (!unit || m.unitId === unit.id) && (!find || [m.clientName, m.clientEmail, m.unitTitle].some((s) => s.toLowerCase().includes(find))));
  const unitOf = (m: PaluwaganMember) => paluwaganUnits.find((u) => u.id === m.unitId);
  const behindOf = (m: PaluwaganMember) => (unitOf(m) ? monthsBehind(unitOf(m)!, m) : 0);
  // Late members first (most months behind), then by unit and slot.
  const members = rows
    .filter((m) => m.status === 'joined' || m.status === 'released')
    .sort((a, b) => behindOf(b) - behindOf(a) || a.unitTitle.localeCompare(b.unitTitle) || (a.slot ?? 0) - (b.slot ?? 0));
  // Next in slot order: the lowest slot in each unit that does not have its unit yet.
  const nextIds = new Set(
    paluwaganUnits.map((u) => paluwagan.filter((m) => m.unitId === u.id && m.status === 'joined').sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0))[0]?.id)
  );
  const late = members.filter((m) => behindOf(m) > 0).length;
  const pending = rows.filter((m) => m.status === 'pending');
  const waitlist = rows.filter((m) => m.status === 'waitlist').sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const removed = rows.filter((m) => m.status === 'removed');
  return (
    <section className="space-y-6">
      <SectionHeader
        title="Paluwagan members"
        hint={<>Clients join through the Google Form, then come back to take a slot. Check each new member against the <a href={PALUWAGAN_FORM_URL} target="_blank" rel="noopener noreferrer" className="underline decoration-[#1D5FD1] inline-flex items-center gap-0.5">form's answers<ExternalLink className="w-3 h-3" aria-hidden="true" /></a>. When all {PALUWAGAN_SLOTS} months are paid, the unit is released to the member.</>}
      >
        <select value={unitId} onChange={(e) => setUnitId(e.target.value)} aria-label="Paluwagan unit" className="px-3 py-2 text-[13px] bg-white border border-[#8C989F] text-[#141517] cursor-pointer">
          <option value="all">All paluwagan ({paluwagan.filter((m) => m.status === 'joined' || m.status === 'released').length})</option>
          {paluwaganUnits.map((u) => <option key={u.id} value={u.id}>{u.title} ({u.taken.length}/{PALUWAGAN_SLOTS})</option>)}
        </select>
      </SectionHeader>
      {unit && (
        <div className="p-4 bg-white border border-[#C9D1D6] space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[13px] text-[#2A2E31]">{unit.title}: <strong className="tabular-nums">{unit.taken.length}</strong> of {PALUWAGAN_SLOTS} slots taken{unit.startDate ? ` · month 1 due ${dayText(dueDate(unit, 1))}` : ''}</p>
            <button className={`${btn.outline} flex items-center gap-1.5`} onClick={() => downloadPaluwaganXlsx(unit, paluwagan.filter((m) => m.unitId === unit.id && m.status !== 'pending'))}>
              <Download className="w-4 h-4" aria-hidden="true" /> Excel
            </button>
          </div>
          <SlotGrid taken={unit.taken} />
        </div>
      )}
      {!unit && <p className="text-[13px] text-[#4E585E]">Members are grouped by unit. Open a unit to see its slots and download its Excel file.</p>}
      {late > 0 && (
        <p className="flex items-center gap-2 p-3 bg-[#FDF3F2] border border-[#F2B8B5] text-[13.5px] text-[#B42318] font-semibold">
          <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" /> {late} member{late > 1 ? 's are' : ' is'} behind on payments. They are listed first.
        </p>
      )}
      <label className="relative flex items-center gap-2 border-b border-[#8C989F] py-1.5 max-w-sm">
        <Search className="w-4 h-4 text-[#4E585E]" aria-hidden="true" />
        <span className="sr-only">Search members</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, email or unit" className="w-full bg-transparent text-[14px] outline-none" />
      </label>
      {members.length === 0 ? <EmptyState title={find ? 'No member matches' : 'No members yet'} body={find ? 'Try another name or email.' : 'Members show here once they send the Google Form and take a slot.'} /> : unit ? (
        <ol className="space-y-2">{members.map((m) => <MemberRow key={m.id} m={m} unit={unit} showUnit={false} nextInLine={nextIds.has(m.id)} />)}</ol>
      ) : (
        // All units: one folding group per unit, so each unit's members stay together.
        <div className="space-y-3">
          {paluwaganUnits.map((u) => {
            const group = members.filter((m) => m.unitId === u.id);
            if (!group.length) return null;
            const groupLate = group.filter((m) => behindOf(m) > 0).length;
            return (
              <details key={u.id} open className="bg-[#F7F8F8] border border-[#C9D1D6]">
                <summary className="flex flex-wrap items-center gap-3 p-3 cursor-pointer list-none">
                  <img src={u.images[0]} alt="" className="w-14 h-10 object-cover bg-[#EEF1F2]" />
                  <span className="flex-1 min-w-0">
                    <span className="block font-semibold text-[15px] text-[#141517] truncate">{u.title}</span>
                    <span className="block text-[12.5px] text-[#4E585E] tabular-nums">{group.length} member{group.length > 1 ? 's' : ''} · {u.taken.length}/{PALUWAGAN_SLOTS} slots{u.monthlyAmount ? ` · ₱${u.monthlyAmount.toLocaleString()}/month` : ''}</span>
                  </span>
                  {groupLate > 0 && <span className="px-2 py-1 bg-[#FDF3F2] text-[#B42318] text-[12px] font-semibold">{groupLate} behind</span>}
                  <button type="button" className={`${btn.outline} flex items-center gap-1.5`} onClick={(e) => { e.preventDefault(); setUnitId(u.id); }}>Open unit</button>
                  <ChevronDown className="w-4 h-4 text-[#4E585E]" aria-hidden="true" />
                </summary>
                <ol className="space-y-2 p-3 pt-0">{group.map((m) => <MemberRow key={m.id} m={m} unit={u} showUnit={false} nextInLine={nextIds.has(m.id)} />)}</ol>
              </details>
            );
          })}
        </div>
      )}
      {pending.length > 0 && (
        <div className="space-y-2">
          <h3 className="gb-label">Opened the form, no slot yet ({pending.length})</h3>
          <ul className="divide-y divide-[#DDE3E6] bg-white border border-[#C9D1D6] text-[13px]">
            {pending.map((m) => <li key={m.id} className="px-4 py-2.5"><strong>{m.clientName}</strong> · {m.unitTitle} · {m.clientEmail} · since {shortDate(m.createdAt)}</li>)}
          </ul>
        </div>
      )}
      {waitlist.length > 0 && (
        <div className="space-y-2">
          <h3 className="gb-label">Waitlist ({waitlist.length})</h3>
          <ol className="divide-y divide-[#DDE3E6] bg-white border border-[#C9D1D6] text-[13px]">
            {waitlist.map((m, i) => (
              <li key={m.id} className="px-4 py-2.5"><strong className="tabular-nums">#{i + 1}</strong> {m.clientName} · {m.unitTitle} · {m.clientEmail} · since {shortDate(m.createdAt)}</li>
            ))}
          </ol>
          <p className="text-[12.5px] text-[#4E585E]">When a slot opens (you remove a member), everyone waiting for that unit is told. The first to apply gets it.</p>
        </div>
      )}
      {removed.length > 0 && (
        <details className="text-[13px]">
          <summary className="cursor-pointer text-[#4E585E]">Removed ({removed.length})</summary>
          <ul className="mt-2 divide-y divide-[#DDE3E6] bg-white border border-[#C9D1D6]">
            {removed.map((m) => <li key={m.id} className="px-4 py-2.5">{m.clientName} · {m.unitTitle} · paid {m.months.filter((x) => x.paid).length} months · {m.history.at(-1)?.text}</li>)}
          </ul>
        </details>
      )}
    </section>
  );
};
