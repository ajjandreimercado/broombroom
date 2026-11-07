import React, { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { PALUWAGAN_SLOTS, type ManualReceipt, type PaluwaganMember, type PaluwaganUnit } from '../types.ts';
import { dayText, dueDate, holdsSlot, monthsBehind, nextDue, paidCount, totalGiven } from './paluwaganSchedule.ts';
import { downloadAR, lineTotal, manualAr, openAR } from './receipt.ts';
import { AlertTriangle, CalendarClock, Download, Eye, MessageSquare, X } from 'lucide-react';

const DAY = 86400e3;
const SOON_DAYS = 3;
const peso = (n: number) => `₱${n.toLocaleString('en-PH')}`;
const startOfDay = (t: Date) => new Date(t.getFullYear(), t.getMonth(), t.getDate());

// Where one membership stands today: overdue (a due date passed unpaid), due soon (within 3 days), or fine.
export const standing = (unit: PaluwaganUnit, m: PaluwaganMember, today = new Date()) => {
  const day = startOfDay(today);
  const behind = monthsBehind(unit, m, today);
  const next = nextDue(unit, m);
  const firstLate = m.months.findIndex((x, i) => !x.paid && (dueDate(unit, i + 1) ?? day) < day);
  const daysLate = firstLate < 0 ? 0 : Math.round((day.getTime() - dueDate(unit, firstLate + 1)!.getTime()) / DAY);
  const daysLeft = next?.date ? Math.round((next.date.getTime() - day.getTime()) / DAY) : undefined;
  const state: 'overdue' | 'soon' | 'ok' = behind > 0 ? 'overdue' : daysLeft !== undefined && daysLeft <= SOON_DAYS ? 'soon' : 'ok';
  const monthsDue = behind + (state === 'soon' ? 1 : 0);
  return { behind, next, daysLate, daysLeft, state, amountDue: unit.monthlyAmount ? unit.monthlyAmount * monthsDue : undefined, monthsDue };
};

// The client's memberships that still pay, with their unit.
const useMine = () => {
  const { paluwagan, paluwaganUnits } = useApp();
  return paluwagan
    .filter(holdsSlot)
    .map((m) => ({ m, unit: paluwaganUnits.find((u) => u.id === m.unitId) }))
    .filter((x): x is { m: PaluwaganMember; unit: PaluwaganUnit } => !!x.unit && paidCount(x.m) < PALUWAGAN_SLOTS);
};

const DISMISS_KEY = 'bb-soa-dismissed';
const todayKey = () => new Date().toDateString();
const dismissedToday = () => {
  try {
    return localStorage.getItem(DISMISS_KEY) === todayKey();
  } catch {
    return false;
  }
};

// Shown on top of the client's pages when a paluwagan payment is late (red, stays) or due within 3 days (amber,
// can be hidden for the day): how much, by when, and one tap to the statement or to message us.
export const PaluwaganDueBanner: React.FC = () => {
  const { navigateTo, openPaluwaganChat } = useApp();
  const [hidden, setHidden] = useState(dismissedToday);
  const due = useMine()
    .map((x) => ({ ...x, s: standing(x.unit, x.m) }))
    .filter((x) => x.s.state !== 'ok')
    .sort((a, b) => b.s.behind - a.s.behind);
  if (!due.length) return null;
  const late = due.some((x) => x.s.state === 'overdue');
  if (!late && hidden) return null;
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 space-y-2" role="region" aria-label="Paluwagan payments due">
      {due.map(({ m, unit, s }) => {
        const red = s.state === 'overdue';
        return (
          <div key={m.id} className={`flex flex-wrap items-center gap-x-5 gap-y-3 p-4 border ${red ? 'bg-[#FDF3F2] border-[#F2B8B5]' : 'bg-[#FFF8E6] border-[#F5D08A]'}`}>
            {red ? <AlertTriangle className="w-6 h-6 text-[#B42318] shrink-0" aria-hidden="true" /> : <CalendarClock className="w-6 h-6 text-[#B54708] shrink-0" aria-hidden="true" />}
            <div className="flex-1 min-w-[12rem]">
              <p className={`text-[12px] font-semibold uppercase tracking-wider ${red ? 'text-[#B42318]' : 'text-[#B54708]'}`}>
                {red ? `Past due · ${s.daysLate} day${s.daysLate === 1 ? '' : 's'} late` : s.daysLeft === 0 ? 'Due today' : `Due in ${s.daysLeft} day${s.daysLeft === 1 ? '' : 's'}`}
              </p>
              <p className="font-display text-[26px] leading-tight text-[#141517] tabular-nums">
                {s.amountDue ? peso(s.amountDue) : `${s.monthsDue} month${s.monthsDue > 1 ? 's' : ''}`}
                <span className="ml-2 font-sans text-[13px] text-[#2A2E31]">
                  {red ? `${s.behind} month${s.behind > 1 ? 's' : ''} unpaid` : `month ${s.next?.month}, due ${dayText(s.next?.date)}`}
                </span>
              </p>
              <p className="text-[13px] text-[#2A2E31]">{m.unitTitle} paluwagan · slot {m.slot}{red ? '. Please settle it to keep your slot in good standing.' : ''}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => navigateTo('account', { accountTab: 'paluwagan' })} className={`px-4 py-2 text-[13.5px] font-semibold text-white cursor-pointer ${red ? 'bg-[#B42318] hover:bg-[#912018]' : 'bg-[#141517] hover:bg-[#2A2E31]'}`}>
                View statement
              </button>
              <button onClick={() => openPaluwaganChat(unit.id)} className="px-4 py-2 text-[13.5px] font-semibold border border-[#141517] bg-white hover:bg-[#EEF1F2] inline-flex items-center gap-1.5 cursor-pointer">
                <MessageSquare className="w-4 h-4" aria-hidden="true" /> Message us
              </button>
            </div>
            {!red && (
              <button
                aria-label="Hide for today"
                className="p-1 text-[#4E585E] hover:text-[#141517] cursor-pointer"
                onClick={() => {
                  try {
                    localStorage.setItem(DISMISS_KEY, todayKey());
                  } catch {}
                  setHidden(true);
                }}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Account → My paluwagan: one paluwagan at a time (tabs when there are several). A summary of what is due, the 36
// months as a small grid (tap one for its details and receipt), and the receipts. No long scrolling.
type MonthState = 'paid' | 'late' | 'next' | 'later';
const CHIP: Record<MonthState, string> = {
  paid: 'bg-[#1B7F35] text-white border-[#1B7F35]',
  late: 'bg-[#FDF3F2] text-[#B42318] border-[#B42318]',
  next: 'bg-white text-[#141517] border-[#141517] border-2',
  later: 'bg-white text-[#6B767D] border-[#C9D1D6]',
};

const Statement: React.FC<{ m: PaluwaganMember; unit?: PaluwaganUnit }> = ({ m, unit }) => {
  const { receipts, openPaluwaganChat, showToast } = useApp();
  const today = startOfDay(new Date());
  const s = unit && standing(unit, m);
  const paid = paidCount(m);
  const given = totalGiven(m);
  const balance = unit?.monthlyAmount ? unit.monthlyAmount * (PALUWAGAN_SLOTS - paid) : undefined;
  const stateOf = (i: number): MonthState => {
    const x = m.months[i];
    if (x.paid) return 'paid';
    const due = unit && dueDate(unit, i + 1);
    if (due && due < today) return 'late';
    return s?.next?.month === i + 1 ? 'next' : 'later';
  };
  // Opens on what matters: the first late month, else the next one due, else the last month.
  const firstLate = m.months.findIndex((_, i) => stateOf(i) === 'late');
  const [picked, setPicked] = useState(firstLate >= 0 ? firstLate + 1 : s?.next?.month ?? PALUWAGAN_SLOTS);
  const [allReceipts, setAllReceipts] = useState(false);
  const arOf = (arNo?: string) => (arNo ? receipts.find((r) => r.arNo === arNo) : undefined);
  const view = (r: ManualReceipt) => !openAR(manualAr(r)) && showToast('Allow pop-ups', 'Your browser blocked the receipt window.', 'error');
  const x = m.months[picked - 1];
  const pickedDue = unit && dueDate(unit, picked);
  const pickedAr = arOf(x.arNo);
  const st = stateOf(picked - 1);
  const mineReceipts = m.months
    .map((mo, i) => ({ n: i + 1, r: arOf(mo.arNo) }))
    .filter((y): y is { n: number; r: ManualReceipt } => !!y.r)
    .reverse();
  const shownReceipts = allReceipts ? mineReceipts : mineReceipts.slice(0, 3);

  return (
    <section className="bg-white border border-[#C9D1D6]" aria-label={`${m.unitTitle} statement of account`}>
      <header className={`p-4 border-b border-[#C9D1D6] ${s?.state === 'overdue' ? 'bg-[#FDF3F2]' : s?.state === 'soon' ? 'bg-[#FFF8E6]' : 'bg-[#F7F8F8]'}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wider text-[#4E585E]">Statement of account</p>
            <h3 className="font-display text-[22px] text-[#141517]">{m.unitTitle}</h3>
            <p className="text-[13px] text-[#2A2E31]">Slot {m.slot} of {PALUWAGAN_SLOTS}{m.status === 'released' ? ' · unit released to you' : ''}{!m.verifiedAt ? ' · we are checking your form and first payment' : m.careAgent ? ` · your agent: ${m.careAgent}` : ''}</p>
          </div>
          <button onClick={() => openPaluwaganChat(m.unitId)} className="px-3 py-2 text-[13px] font-semibold border border-[#141517] bg-white hover:bg-[#EEF1F2] inline-flex items-center gap-1.5 cursor-pointer">
            <MessageSquare className="w-4 h-4" aria-hidden="true" /> Message us
          </button>
        </div>
        <dl className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[13px]">
          <div><dt className="text-[#4E585E]">Amount due now</dt><dd className={`font-semibold tabular-nums text-[15px] ${s?.state === 'overdue' ? 'text-[#B42318]' : 'text-[#141517]'}`}>{s && s.state !== 'ok' ? (s.amountDue ? peso(s.amountDue) : `${s.monthsDue} month${s.monthsDue > 1 ? 's' : ''}`) : 'Nothing due'}</dd></div>
          <div><dt className="text-[#4E585E]">Next due</dt><dd className="font-semibold text-[#141517]">{s?.next ? `Month ${s.next.month}${s.next.date ? `, ${dayText(s.next.date)}` : ''}` : 'All paid'}</dd></div>
          <div><dt className="text-[#4E585E]">Paid</dt><dd className="font-semibold tabular-nums text-[#141517]">{paid}/{PALUWAGAN_SLOTS}{given ? ` · ${peso(given)}` : ''}</dd></div>
          <div><dt className="text-[#4E585E]">Remaining</dt><dd className="font-semibold tabular-nums text-[#141517]">{balance !== undefined ? peso(balance) : `${PALUWAGAN_SLOTS - paid} months`}</dd></div>
        </dl>
        <div className="mt-3 h-2 bg-[#DDE3E6]" aria-hidden="true"><div className="h-full bg-[#1B7F35]" style={{ width: `${(paid / PALUWAGAN_SLOTS) * 100}%` }} /></div>
        {s?.state === 'overdue' && <p className="mt-3 flex items-center gap-2 text-[13.5px] font-semibold text-[#B42318]"><AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" /> {s.behind} month{s.behind > 1 ? 's are' : ' is'} past due ({s.daysLate} days). Please pay and send us your proof of payment.</p>}
      </header>

      <div className="p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="gb-label !text-[#141517]">Your 36 months</h4>
          <ul className="flex flex-wrap gap-3 text-[12px] text-[#4E585E]">
            <li className="flex items-center gap-1"><span className="w-3 h-3 bg-[#1B7F35]" />Paid</li>
            <li className="flex items-center gap-1"><span className="w-3 h-3 border border-[#B42318] bg-[#FDF3F2]" />Late</li>
            <li className="flex items-center gap-1"><span className="w-3 h-3 border-2 border-[#141517]" />Next</li>
            <li className="flex items-center gap-1"><span className="w-3 h-3 border border-[#C9D1D6]" />Later</li>
          </ul>
        </div>
        <ol className="grid grid-cols-6 sm:grid-cols-12 gap-1.5" aria-label="Monthly payments">
          {m.months.map((_, i) => {
            const k = stateOf(i);
            return (
              <li key={i}>
                <button
                  onClick={() => setPicked(i + 1)}
                  aria-pressed={picked === i + 1}
                  aria-label={`Month ${i + 1}: ${k === 'paid' ? 'paid' : k === 'late' ? 'late' : k === 'next' ? 'next to pay' : 'not yet due'}`}
                  className={`w-full h-10 border text-[13px] font-semibold tabular-nums cursor-pointer ${CHIP[k]} ${picked === i + 1 ? 'outline outline-2 outline-offset-2 outline-[#1D5FD1]' : ''}`}
                >
                  {i + 1}
                </button>
              </li>
            );
          })}
        </ol>
        {/* The month tapped: its due date, amount, status and receipt */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#F7F8F8] border border-[#C9D1D6] text-[13.5px]" aria-live="polite">
          <div>
            <p className="font-semibold text-[#141517]">Month {picked} of {PALUWAGAN_SLOTS}{pickedDue ? ` · due ${dayText(pickedDue)}` : ''}</p>
            <p className={st === 'paid' ? 'text-[#1B7F35]' : st === 'late' ? 'text-[#B42318] font-semibold' : 'text-[#4E585E]'}>
              {x.amount ? peso(x.amount) : unit?.monthlyAmount ? peso(unit.monthlyAmount) : ''}
              {x.amount || unit?.monthlyAmount ? ' · ' : ''}
              {st === 'paid' ? `Paid${x.paidAt ? ` ${new Date(x.paidAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}` : st === 'late' ? `Overdue ${Math.round((today.getTime() - pickedDue!.getTime()) / DAY)} days` : 'Not yet paid'}
            </p>
          </div>
          {pickedAr ? (
            <span className="flex gap-2">
              <button className="px-3 py-2 bg-[#141517] text-white text-[13px] font-semibold inline-flex items-center gap-1.5 cursor-pointer" onClick={() => view(pickedAr)}><Eye className="w-4 h-4" aria-hidden="true" />View AR</button>
              <button className="px-3 py-2 border border-[#141517] bg-white text-[13px] font-semibold inline-flex items-center gap-1.5 cursor-pointer" onClick={() => downloadAR(manualAr(pickedAr))}><Download className="w-4 h-4" aria-hidden="true" />Save</button>
            </span>
          ) : x.paid && x.amount ? <span className="text-[12.5px] text-[#6B767D]">Receipt being prepared</span> : null}
        </div>
      </div>

      {mineReceipts.length > 0 && (
        <div className="px-4 pb-4">
          <h4 className="gb-label !text-[#141517] mb-2">Receipts ({mineReceipts.length})</h4>
          <ul className="divide-y divide-[#DDE3E6] border border-[#C9D1D6]">
            {shownReceipts.map(({ n, r }) => (
              <li key={r.arNo} className="px-3 py-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
                <span className="flex-1 min-w-[10rem]"><strong className="tabular-nums">AR {r.arNo}</strong> · month {n}</span>
                <span className="tabular-nums font-semibold">{peso(lineTotal(r.lines))}</span>
                <button className="inline-flex items-center gap-1 font-semibold underline underline-offset-4 cursor-pointer" onClick={() => view(r)}><Eye className="w-3.5 h-3.5" aria-hidden="true" />View</button>
                <button className="inline-flex items-center gap-1 text-[#4E585E] cursor-pointer" aria-label={`Save AR ${r.arNo}`} onClick={() => downloadAR(manualAr(r))}><Download className="w-3.5 h-3.5" aria-hidden="true" />Save</button>
              </li>
            ))}
          </ul>
          {mineReceipts.length > 3 && (
            <button className="mt-2 text-[13px] font-semibold text-[#1D5FD1] cursor-pointer" onClick={() => setAllReceipts(!allReceipts)}>{allReceipts ? 'Show fewer' : `Show all ${mineReceipts.length} receipts`}</button>
          )}
        </div>
      )}
    </section>
  );
};

export const MyPaluwagan: React.FC = () => {
  const { paluwagan, paluwaganUnits, navigateTo, updateFilter } = useApp();
  const mine = paluwagan.filter(holdsSlot);
  const unitOf = (m: PaluwaganMember) => paluwaganUnits.find((u) => u.id === m.unitId);
  // Late ones first, so the tab that needs attention is the one open.
  const sorted = [...mine].sort((a, b) => {
    const sa = unitOf(a) ? standing(unitOf(a)!, a).behind : 0;
    const sb = unitOf(b) ? standing(unitOf(b)!, b).behind : 0;
    return sb - sa;
  });
  const [openId, setOpenId] = useState<string | undefined>(sorted[0]?.id);
  if (!mine.length)
    return (
      <div className="p-8 bg-white border border-[#C9D1D6] text-center space-y-3">
        <p className="font-semibold text-[#141517]">You have no paluwagan yet</p>
        <p className="text-[14px] text-[#4E585E]">Join one to own a unit by paying monthly with a group of {PALUWAGAN_SLOTS}.</p>
        <button className="px-4 py-2 bg-[#141517] text-white text-[13.5px] font-semibold cursor-pointer" onClick={() => { updateFilter('category', 'paluwagan'); navigateTo('marketplace'); }}>See paluwagan units</button>
      </div>
    );
  const open = sorted.find((m) => m.id === openId) ?? sorted[0];
  return (
    <div className="space-y-4">
      {sorted.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Your paluwagan">
          {sorted.map((m) => {
            const u = unitOf(m);
            const st = u ? standing(u, m).state : 'ok';
            const active = m.id === open.id;
            return (
              <button
                key={m.id}
                role="tab"
                aria-selected={active}
                onClick={() => setOpenId(m.id)}
                className={`shrink-0 px-3.5 py-2 text-left border cursor-pointer ${active ? 'bg-[#141517] text-white border-[#141517]' : 'bg-white border-[#C9D1D6] hover:border-[#141517]'}`}
              >
                <span className="block text-[13.5px] font-semibold">{m.unitTitle}</span>
                <span className={`block text-[12px] ${active ? 'text-[#C9D1D6]' : st === 'overdue' ? 'text-[#B42318] font-semibold' : st === 'soon' ? 'text-[#B54708] font-semibold' : 'text-[#6B767D]'}`}>
                  {st === 'overdue' ? 'Past due' : st === 'soon' ? 'Due soon' : `Paid ${paidCount(m)}/${PALUWAGAN_SLOTS}`}
                </span>
              </button>
            );
          })}
        </div>
      )}
      <Statement key={open.id} m={open} unit={unitOf(open)} />
    </div>
  );
};
