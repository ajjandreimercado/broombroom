import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { Referral, ReferralStatus } from '../../types.ts';
import { FilterTabs, SectionHeader, EmptyState, btn, shortDate } from './ui.tsx';
import { Plus } from 'lucide-react';

const input = 'w-full px-3 py-2 text-[14px] bg-white border border-[#8C989F] text-[#141517]';
const STATUSES: ReferralStatus[] = ['receivable', 'processing', 'approved', 'disapproved'];
const LABEL: Record<ReferralStatus, string> = { receivable: 'Receivable', processing: 'Processing', approved: 'Approved', disapproved: 'Disapproved' };
const TONE: Record<ReferralStatus, string> = { receivable: 'text-[#B4690E]', processing: 'text-[#1D5FD1]', approved: 'text-[#1B7F35]', disapproved: 'text-[#B42318]' };
const time = (iso: string) => `${shortDate(iso)} ${new Date(iso).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}`;

// Admin: who referred which client. The admin moves each one through its status by hand; every change is kept.
export const Referrals: React.FC = () => {
  const { referrals, agents, addReferral, setReferralStatus } = useApp();
  const [filter, setFilter] = useState<ReferralStatus | 'all' | 'history'>('all');
  const [referredBy, setReferredBy] = useState('');
  const [clientName, setClientName] = useState('');

  const rows = referrals.filter((r) => filter === 'all' || r.status === filter);
  const history = referrals
    .flatMap((r) => r.history.map((h) => ({ ...h, r })))
    .sort((a, b) => b.at.localeCompare(a.at));
  const count = (s: ReferralStatus) => referrals.filter((r) => r.status === s).length;
  const changeText = (t: string) => t.replace(/\b(receivable|processing|approved|disapproved)\b/g, (s) => LABEL[s as ReferralStatus]);

  return (
    <section className="space-y-5">
      <SectionHeader title="Referrals" hint="Record who referred a client, then set each referral’s status from the dropdown. Every change is kept in the history." />

      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await addReferral({ referredBy: referredBy.trim(), clientName: clientName.trim() })) {
            setReferredBy('');
            setClientName('');
          }
        }}
      >
        <label className="block flex-1 min-w-[200px]">
          <span className="gb-label block mb-1.5">Referred by</span>
          <input className={input} list="referral-agents" value={referredBy} onChange={(e) => setReferredBy(e.target.value)} maxLength={120} required />
          <datalist id="referral-agents">{agents.map((a) => <option key={a} value={a} />)}</datalist>
        </label>
        <label className="block flex-1 min-w-[200px]">
          <span className="gb-label block mb-1.5">Client name</span>
          <input className={input} value={clientName} onChange={(e) => setClientName(e.target.value)} maxLength={120} required />
        </label>
        <button type="submit" disabled={!referredBy.trim() || !clientName.trim()} className={`${btn.primary} flex items-center gap-1.5`}>
          <Plus className="w-4 h-4" aria-hidden="true" /> Add referral
        </button>
      </form>

      <FilterTabs
        id="referrals"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: 'All', count: referrals.length },
          ...STATUSES.map((s) => ({ value: s, label: LABEL[s], count: count(s) })),
          { value: 'history', label: 'History', count: history.length },
        ]}
      />

      {filter === 'history' ? (
        history.length === 0 ? (
          <EmptyState title="No history yet" body="Adding a referral or changing its status is recorded here." />
        ) : (
          <ul className="animate-view-fade">
            {history.map((h, i) => (
              <li key={`${h.r.id}-${i}`} className="py-3 border-b border-[#C9D1D6] flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                <p className="text-[14px] text-[#141517]">
                  <span className="font-semibold">{h.r.clientName}</span> <span className="text-[#4E585E]">· referred by {h.r.referredBy}</span> · {changeText(h.text)}
                </p>
                <p className="text-[12.5px] text-[#6B767D] tabular-nums">{time(h.at)} · {h.by}</p>
              </li>
            ))}
          </ul>
        )
      ) : rows.length === 0 ? (
        <EmptyState title="No referrals here" body="Add a referral above to start tracking it." />
      ) : (
        <ul key={filter} className="animate-view-fade">
          {rows.map((r: Referral) => (
            <li key={r.id} className="py-4 border-b border-[#C9D1D6] flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
              <div className="min-w-0">
                <p className="font-semibold text-[15px] text-[#141517]">{r.clientName}</p>
                <p className="text-[13px] text-[#2A2E31]">Referred by {r.referredBy}</p>
                <p className="text-[12px] text-[#6B767D] tabular-nums">
                  Added {shortDate(r.createdAt)} · last change: {changeText(r.history.at(-1)!.text)} ({time(r.history.at(-1)!.at)})
                </p>
              </div>
              <label className="flex items-center gap-2">
                <span className="sr-only">Status of {r.clientName}’s referral</span>
                <select
                  value={r.status}
                  onChange={(e) => setReferralStatus(r.id, e.target.value as ReferralStatus)}
                  className={`px-3 py-2 text-[14px] font-semibold bg-white border border-[#8C989F] cursor-pointer ${TONE[r.status]}`}
                >
                  {STATUSES.map((s) => <option key={s} value={s}>{LABEL[s]}</option>)}
                </select>
              </label>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
