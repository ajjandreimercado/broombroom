import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { PALUWAGAN_SLOTS, type PaluwaganMember, type PaluwaganUnit } from '../../types.ts';
import { SectionHeader, EmptyState, FilterTabs, btn, shortDate } from '../admin/ui.tsx';
import { dayText, paidCount } from '../paluwaganSchedule.ts';
import { standing } from '../PaluwaganSoa.tsx';
import { clientHistory } from '../clientHistory.ts';
import { AlertTriangle, CalendarClock, CheckCircle2, Phone } from 'lucide-react';

type Standing = ReturnType<typeof standing>;
const peso = (n: number) => `₱${n.toLocaleString('en-PH')}`;

// The reminder starts friendly and gets firmer only once a payment is late (never harsh), always with the exact
// amount and date, and says how to reply. The agent can edit it before sending.
export const reminderText = (m: PaluwaganMember, unit: PaluwaganUnit, s: Standing, agent: string) => {
  const first = m.clientName.split(' ')[0];
  const amount = s.amountDue ? ` (${peso(s.amountDue)})` : '';
  const month = s.next ? `month ${s.next.month}` : 'your next month';
  if (s.state === 'overdue')
    return `Hi ${first}, this is ${agent} from Broom Broom. Our records show ${s.behind} month${s.behind > 1 ? 's' : ''} of your ${unit.title} paluwagan unpaid${amount}, ${s.daysLate} day${s.daysLate === 1 ? '' : 's'} past due. Please settle it soon to keep slot ${m.slot} in good standing. If you already paid, just send your proof of payment here. I'm happy to help if you need anything.`;
  if (s.state === 'soon')
    return s.daysLeft === 0
      ? `Hi ${first}! Just a reminder that ${month}${amount} of your ${unit.title} paluwagan is due today. Once paid, send your proof of payment here and we'll send your receipt. Thank you!`
      : `Hi ${first}! A friendly reminder from Broom Broom: ${month}${amount} of your ${unit.title} paluwagan is due on ${dayText(s.next?.date)}. Once paid, send your proof of payment here and we'll send your receipt. Thank you!`;
  return `Hi ${first}! Thank you for keeping your ${unit.title} paluwagan up to date.${s.next?.date ? ` Your next payment, ${month}, is due on ${dayText(s.next.date)}.` : ''} Message me anytime if you have questions.`;
};

const Badge: React.FC<{ s: Standing }> = ({ s }) =>
  s.state === 'overdue' ? (
    <span className="px-2 py-1 bg-[#FDF3F2] text-[#B42318] text-[12px] font-semibold inline-flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />{s.daysLate} days late · {s.behind} unpaid</span>
  ) : s.state === 'soon' ? (
    <span className="px-2 py-1 bg-[#FFF8E6] text-[#B54708] text-[12px] font-semibold inline-flex items-center gap-1"><CalendarClock className="w-3.5 h-3.5" aria-hidden="true" />{s.daysLeft === 0 ? 'Due today' : `Due in ${s.daysLeft} day${s.daysLeft === 1 ? '' : 's'}`}</span>
  ) : (
    <span className="px-2 py-1 bg-[#EAF5EC] text-[#1B7F35] text-[12px] font-semibold inline-flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />Up to date</span>
  );

const ClientRow: React.FC<{ m: PaluwaganMember; unit: PaluwaganUnit; s: Standing }> = ({ m, unit, s }) => {
  const { careRemind, careLog, careLogs, currentUser } = useApp();
  const [mode, setMode] = useState<'remind' | 'log' | null>(null);
  const [message, setMessage] = useState('');
  const [kind, setKind] = useState<'call' | 'note'>('call');
  const [busy, setBusy] = useState(false);
  const last = careLogs.find((c) => c.memberId === m.id);
  const history = clientHistory({ clientId: m.clientId, careLogs, paluwagan: [m] });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setBusy(true);
    const ok = mode === 'remind' ? await careRemind(m.id, message.trim()) : await careLog(m.id, kind, message.trim());
    setBusy(false);
    if (ok) setMode(null);
  };
  return (
    <li className="bg-white border border-[#C9D1D6] p-3 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="w-10 h-10 grid place-items-center bg-[#141517] text-white font-display text-[17px] tabular-nums shrink-0" aria-label={`Slot ${m.slot}`}>{m.slot}</span>
        <div className="flex-1 min-w-[12rem]">
          <p className="font-semibold text-[14.5px] text-[#141517]">{m.clientName}</p>
          <p className="text-[12.5px] text-[#4E585E]">
            {m.unitTitle} · paid {paidCount(m)}/{PALUWAGAN_SLOTS}
            {s.next?.date ? ` · next: month ${s.next.month}, ${dayText(s.next.date)}` : ''}
            {s.amountDue ? ` · ${peso(s.amountDue)} due` : ''}
          </p>
          <p className="text-[12px] text-[#6B767D]">{last ? `Last contact ${shortDate(last.createdAt)}: ${last.kind}` : 'Not contacted yet'}</p>
        </div>
        <Badge s={s} />
      </div>
      <div className="flex flex-wrap gap-2">
        <button className={s.state === 'ok' ? btn.outline : btn.primary} onClick={() => { setMode('remind'); setMessage(reminderText(m, unit, s, currentUser?.name ?? 'your agent')); }}>Send reminder</button>
        <button className={btn.outline} onClick={() => { setMode('log'); setMessage(''); }}>Log call / note</button>
        {m.clientPhone && <a href={`tel:${m.clientPhone}`} className={`${btn.outline} inline-flex items-center gap-1.5`}><Phone className="w-4 h-4" aria-hidden="true" />{m.clientPhone}</a>}
      </div>
      {mode && (
        <form onSubmit={submit} className="p-3 bg-[#F7F8F8] border border-[#141517] space-y-2">
          {mode === 'remind' ? (
            <p className="text-[12.5px] text-[#4E585E]">This goes into your chat with {m.clientName.split(' ')[0]}, and they get a notification. Edit it if you like.</p>
          ) : (
            <div className="flex gap-4 text-[13px]">
              {(['call', 'note'] as const).map((k) => (
                <label key={k} className="flex items-center gap-1.5 cursor-pointer"><input type="radio" name={`kind-${m.id}`} checked={kind === k} onChange={() => setKind(k)} className="accent-[#1D5FD1]" />{k === 'call' ? 'Call' : 'Note'}</label>
              ))}
            </div>
          )}
          <label className="block">
            <span className="sr-only">{mode === 'remind' ? 'Reminder message' : 'What happened'}</span>
            <textarea rows={mode === 'remind' ? 4 : 2} maxLength={1000} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={mode === 'log' ? 'e.g. Called, will pay on Friday through GCash' : ''} className="w-full px-3 py-2 text-[14px] bg-white border border-[#8C989F]" />
          </label>
          <div className="flex gap-2">
            <button type="submit" className={btn.primary} disabled={busy || !message.trim()}>{busy ? 'Saving…' : mode === 'remind' ? 'Send reminder' : 'Save'}</button>
            <button type="button" onClick={() => setMode(null)} className="px-3 py-2 text-[13px] text-[#4E585E] hover:text-[#141517] cursor-pointer">Cancel</button>
          </div>
        </form>
      )}
      {history.length > 0 && (
        <details className="text-[13px]">
          <summary className="cursor-pointer text-[#4E585E]">Client history ({history.length})</summary>
          <ol className="mt-2 space-y-1.5 border-l-2 border-[#DDE3E6] pl-3">
            {history.slice(0, 30).map((h, i) => (
              <li key={i}><span className="text-[#6B767D] tabular-nums">{shortDate(h.at)}</span> · {h.text}</li>
            ))}
          </ol>
        </details>
      )}
    </li>
  );
};

type View = 'attention' | 'overdue' | 'soon' | 'all';

// Agent: My clients. The agent is each client's customer care: they see who is late or due soon, remind them in
// their chat in one tap, and log calls and notes. Late clients come first.
export const CareDesk: React.FC = () => {
  const { paluwagan, paluwaganUnits, currentUser } = useApp();
  const [view, setView] = useState<View>('attention');
  const rows = paluwagan
    .filter((m) => m.careAgent === currentUser?.name && (m.status === 'joined' || m.status === 'released') && paidCount(m) < PALUWAGAN_SLOTS)
    .map((m) => ({ m, unit: paluwaganUnits.find((u) => u.id === m.unitId) }))
    .filter((x): x is { m: PaluwaganMember; unit: PaluwaganUnit } => !!x.unit)
    .map((x) => ({ ...x, s: standing(x.unit, x.m) }))
    .sort((a, b) => b.s.behind - a.s.behind || b.s.daysLate - a.s.daysLate || (a.s.daysLeft ?? 99) - (b.s.daysLeft ?? 99));
  const count = (st: string) => rows.filter((r) => r.s.state === st).length;
  const shown = rows.filter((r) => (view === 'all' ? true : view === 'attention' ? r.s.state !== 'ok' : r.s.state === view));
  return (
    <section className="space-y-4">
      <SectionHeader
        title="My clients"
        hint="You are customer care for these clients. Remind them before each due date, follow up when a payment is late, and log every call. Reminders go into your chat with the client, and everything shows in their history."
      />
      <FilterTabs
        id="care-view"
        value={view}
        onChange={setView}
        options={[
          { value: 'attention', label: 'Needs attention', count: count('overdue') + count('soon') },
          { value: 'overdue', label: 'Late', count: count('overdue') },
          { value: 'soon', label: 'Due soon', count: count('soon') },
          { value: 'all', label: 'All', count: rows.length },
        ]}
      />
      {shown.length === 0 ? (
        <EmptyState
          title={rows.length ? 'Nobody needs a reminder right now' : 'No clients in your care yet'}
          body={rows.length ? 'Everyone is paid up and nothing is due in the next 3 days. See All for everyone in your care.' : 'Claim verified paluwagan members in Leads → Paluwagan (the ones from your link are kept for you for 24 hours), or the admin assigns them to you.'}
        />
      ) : (
        <ol className="space-y-2">{shown.map((r) => <ClientRow key={r.m.id} m={r.m} unit={r.unit} s={r.s} />)}</ol>
      )}
    </section>
  );
};

export const careAttention = (paluwagan: PaluwaganMember[], units: PaluwaganUnit[], me?: string) =>
  paluwagan.filter((m) => {
    const u = units.find((x) => x.id === m.unitId);
    return u && m.careAgent === me && (m.status === 'joined' || m.status === 'released') && standing(u, m).state !== 'ok';
  }).length;
