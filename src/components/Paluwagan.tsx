import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { PALUWAGAN_SLOTS, type PaluwaganMember, type PaluwaganUnit } from '../types.ts';
import { PALUWAGAN_FORM_URL } from '../data/constants.ts';
import { dayText, monthsBehind, nextDue } from './paluwaganSchedule.ts';
import { AlertTriangle, CheckCircle2, MessageSquare } from 'lucide-react';

const slotNumbers = Array.from({ length: PALUWAGAN_SLOTS }, (_, i) => i + 1);
const paidCount = (m: PaluwaganMember) => m.months.filter((x) => x.paid).length;

// The 36 slots of one paluwagan: taken, yours, or open.
export const SlotGrid: React.FC<{ taken: number[]; mine?: number }> = ({ taken, mine }) => (
  <ol className="grid grid-cols-9 gap-1" aria-label={`${PALUWAGAN_SLOTS - taken.length} of ${PALUWAGAN_SLOTS} slots open`}>
    {slotNumbers.map((n) => {
      const state = n === mine ? 'yours' : taken.includes(n) ? 'taken' : 'open';
      return (
        <li
          key={n}
          title={`Slot ${n}: ${state}`}
          className={`h-6 grid place-items-center text-[10.5px] tabular-nums font-semibold ${
            state === 'yours' ? 'bg-[#1B7F35] text-white' : state === 'taken' ? 'bg-[#2A2E31] text-white' : 'bg-white text-[#4E585E] border border-[#C9D1D6]'
          }`}
        >
          {n}
        </li>
      );
    })}
  </ol>
);

// The client's view of the slots: how many of 1-36 are taken, as one bar.
const SlotBar: React.FC<{ taken: number; mine?: number }> = ({ taken, mine }) => (
  <div className="space-y-1.5">
    <div className="flex items-baseline justify-between gap-2 text-[13px]">
      <span className="text-[#2A2E31]">Slots 1–{PALUWAGAN_SLOTS}</span>
      <span className="tabular-nums text-[#141517]"><strong>{taken}</strong> taken · <strong>{PALUWAGAN_SLOTS - taken}</strong> open</span>
    </div>
    <div className="h-2 bg-[#DDE3E6]" role="progressbar" aria-label="Slots taken" aria-valuemin={0} aria-valuemax={PALUWAGAN_SLOTS} aria-valuenow={taken}>
      <div className="h-full bg-[#141517]" style={{ width: `${(taken / PALUWAGAN_SLOTS) * 100}%` }} />
    </div>
    {mine && <p className="text-[13px] text-[#1B7F35] font-semibold">Your slot: {mine} of {PALUWAGAN_SLOTS}</p>}
  </div>
);

const Card: React.FC<{ unit: PaluwaganUnit; member?: PaluwaganMember; onConfirmed: (m: PaluwaganMember) => void; focus?: boolean }> = ({ unit, member, onConfirmed, focus }) => {
  const { currentUser, setAuthModalOpen, joinPaluwagan, confirmPaluwagan, openPaluwaganChat } = useApp();
  const [busy, setBusy] = useState(false);
  const open = PALUWAGAN_SLOTS - unit.taken.length;
  const released = member?.status === 'released';
  const joined = member?.status === 'joined' || released;
  const pending = member?.status === 'pending';
  const waiting = member?.status === 'waitlist';
  const full = open === 0;
  const paid = member ? paidCount(member) : 0;
  const behind = joined ? monthsBehind(unit, member!) : 0;
  const due = joined ? nextDue(unit, member!) : undefined;
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (focus) ref.current?.scrollIntoView({ block: 'center' });
  }, [focus]);

  // Opens the tab first (inside the click, so it is not blocked), then records the client and sends it to the form.
  const apply = async () => {
    if (!currentUser) return setAuthModalOpen(true);
    const tab = window.open('about:blank', '_blank');
    setBusy(true);
    const m = await joinPaluwagan(unit.id);
    setBusy(false);
    if (!m) return tab?.close();
    if (tab) {
      tab.opener = null;
      tab.location.href = PALUWAGAN_FORM_URL;
    } else window.location.href = PALUWAGAN_FORM_URL;
  };
  const waitlist = async () => {
    if (!currentUser) return setAuthModalOpen(true);
    setBusy(true);
    await joinPaluwagan(unit.id, true);
    setBusy(false);
  };
  const confirm = async () => {
    if (!member) return;
    setBusy(true);
    const m = await confirmPaluwagan(member.id);
    setBusy(false);
    if (m) onConfirmed(m);
  };

  return (
    <article ref={ref} className={`bg-white border flex flex-col ${focus ? 'border-[#141517] outline outline-2 outline-[#1B7F35]' : 'border-[#C9D1D6]'}`}>
      <div className="relative aspect-[4/3] bg-[#EEF1F2]">
        {unit.images[0] && <img src={unit.images[0]} alt={unit.title} className="w-full h-full object-cover" loading="lazy" />}
        <span className="absolute top-3 left-3 bg-[#141517] text-white text-[11px] font-semibold uppercase tracking-wider px-2 py-1">Paluwagan</span>
        {full && <span className="absolute top-3 right-3 bg-[#B42318] text-white text-[11px] font-semibold uppercase tracking-wider px-2 py-1">Full</span>}
      </div>
      <div className="p-5 flex flex-col gap-4 flex-1">
        <div>
          <h3 className="font-display text-[22px] leading-tight text-[#141517]">{unit.title}</h3>
          {unit.monthlyAmount ? (
            <p className="mt-1 text-[#141517]">
              <span className="font-display text-[20px] tabular-nums">₱{unit.monthlyAmount.toLocaleString('en-PH')}</span>
              <span className="text-[13.5px] text-[#4E585E]"> / month · {PALUWAGAN_SLOTS} months</span>
            </p>
          ) : null}
          {unit.description && <p className="mt-1.5 text-[13.5px] text-[#4E585E] line-clamp-3">{unit.description}</p>}
        </div>
        <SlotBar taken={unit.taken.length} mine={joined ? member!.slot : undefined} />
        {full && !member && <p className="text-[13px] text-[#B42318] font-semibold">Full: all {PALUWAGAN_SLOTS} slots are taken. Join the waitlist to be told when one opens.</p>}
        {waiting && (
          <p className="p-3 bg-[#F7F8F8] border border-[#C9D1D6] text-[13px] text-[#2A2E31]">
            {full ? "You're on the waitlist. We'll tell you as soon as a slot opens." : 'A slot is open. Press Apply to take it.'}
          </p>
        )}
        {released && (
          <p className="flex items-center gap-2 p-3 bg-[#EAF5EC] border border-[#1B7F35] text-[13.5px] text-[#141517]">
            <CheckCircle2 className="w-4 h-4 text-[#1B7F35] shrink-0" aria-hidden="true" />
            Your {unit.title} was released on {new Date(member!.releasedAt!).toLocaleDateString('en-PH', { dateStyle: 'medium' })}.
            {paid < PALUWAGAN_SLOTS && ` Keep paying the ${PALUWAGAN_SLOTS - paid} months left.`}
          </p>
        )}
        {joined && paid < PALUWAGAN_SLOTS && (
          <div className="space-y-1.5 text-[13px] text-[#2A2E31]">
            <p>Paid <strong className="tabular-nums">{paid}</strong> of {PALUWAGAN_SLOTS} months. The admin marks each month once your payment is in.</p>
            {due?.date && <p>Next payment: month {due.month}, due <strong>{dayText(due.date)}</strong>.</p>}
            {behind > 0 && (
              <p className="flex items-center gap-1.5 text-[#B42318] font-semibold">
                <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" /> {behind} month{behind > 1 ? 's' : ''} behind. Please pay or message us.
              </p>
            )}
          </div>
        )}
        {pending && (
          <div className="p-3 bg-[#F7F8F8] border border-[#C9D1D6] space-y-2.5">
            <p className="text-[13px] text-[#2A2E31]">Sent the Google Form? Confirm it here to take your slot.</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={confirm} disabled={busy} className="px-3.5 py-2 bg-[#1B7F35] hover:bg-[#166A2C] text-white text-[13px] font-semibold cursor-pointer disabled:opacity-60">I've sent the form</button>
              <a href={PALUWAGAN_FORM_URL} target="_blank" rel="noopener noreferrer" className="px-3.5 py-2 border border-[#8C989F] text-[13px] font-semibold text-[#141517] hover:bg-[#EEF1F2]">Open the form again</a>
            </div>
          </div>
        )}
        <div className="mt-auto flex gap-2">
          {!joined && !pending && !(waiting && full) && (
            <button type="button" onClick={full ? waitlist : apply} disabled={busy} className="flex-1 px-4 py-2.5 bg-[#141517] hover:bg-[#2A2E31] text-white text-[14px] font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
              {full ? (busy ? 'Joining…' : 'Join the waitlist') : busy ? 'Opening the form…' : 'Apply'}
            </button>
          )}
          <button
            type="button"
            onClick={() => openPaluwaganChat(unit.id)}
            className={`${joined || pending || (waiting && full) ? 'flex-1' : ''} px-3 py-2.5 border border-[#8C989F] text-[#141517] hover:bg-[#EEF1F2] cursor-pointer flex items-center justify-center gap-2 text-[13.5px] font-semibold`}
            aria-label={`Message Broom Broom about the ${unit.title} paluwagan`}
            title="Message Broom Broom"
          >
            <MessageSquare className="w-4 h-4" aria-hidden="true" />
            {(joined || pending || (waiting && full)) && 'Message us'}
          </button>
        </div>
      </div>
    </article>
  );
};

// Client: the Paluwagan category. Units show as just a photo and a name; Apply opens the Google Form, and the form's
// confirmation link (?page=paluwagan&submitted=1) or "I've sent the form" brings them back to take a slot.
export const PaluwaganSection: React.FC = () => {
  const { paluwaganUnits, paluwagan, currentUser, confirmPaluwagan } = useApp();
  const [focusId] = useState(() => new URLSearchParams(location.search).get('unit'));
  const [confirmed, setConfirmed] = useState<PaluwaganMember | null>(null);
  const tried = useRef(false);
  const mine = (unitId: string) => paluwagan.find((m) => m.unitId === unitId && m.status !== 'removed');

  // The address says Paluwagan while it is open, so Back from the Google Form (or a reload) comes back here.
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    if (q.get('page') !== 'paluwagan') history.replaceState(history.state, '', '?page=paluwagan');
    return () => {
      if (new URLSearchParams(location.search).get('page') === 'paluwagan') history.replaceState(history.state, '', location.pathname);
    };
  }, []);

  // Back from the Google Form: confirm the client's latest pending application once they are signed in.
  useEffect(() => {
    if (tried.current || !currentUser || new URLSearchParams(location.search).get('submitted') !== '1') return;
    tried.current = true;
    history.replaceState(history.state, '', '?page=paluwagan');
    const pending = paluwagan.find((m) => m.status === 'pending');
    if (pending) confirmPaluwagan(pending.id).then((m) => m && setConfirmed(m));
  }, [currentUser, paluwagan]);

  return (
    <div className="space-y-8">
      <div className="border-t-2 border-[#141517] pt-5">
        <h2 className="font-display text-[28px] leading-none text-[#141517]">Paluwagan</h2>
        <p className="mt-2 text-[14.5px] text-[#4E585E] max-w-[62ch]">
          Pool in with others for a unit over {PALUWAGAN_SLOTS} months. Each paluwagan has {PALUWAGAN_SLOTS} slots. Press Apply, fill in the Google Form, then come back to take your slot.
        </p>
      </div>
      {confirmed && (
        <div role="status" className="flex items-start gap-3 p-4 bg-[#EAF5EC] border border-[#1B7F35]">
          <CheckCircle2 className="w-5 h-5 text-[#1B7F35] shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-[14px] text-[#141517]">
            <p className="font-semibold">You're in: slot {confirmed.slot} of {PALUWAGAN_SLOTS} for the {confirmed.unitTitle}.</p>
            <p className="text-[#2A2E31] mt-0.5">Thank you for filling in the form. Broom Broom will check your answers and message you about the first payment.</p>
          </div>
        </div>
      )}
      {paluwaganUnits.length === 0 ? (
        <p className="py-10 text-[15px] text-[#4E585E]">No paluwagan is open right now. Check back soon.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
          {paluwaganUnits.map((u) => <Card key={u.id} unit={u} member={mine(u.id)} onConfirmed={setConfirmed} focus={u.id === focusId} />)}
        </div>
      )}
    </div>
  );
};
