import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { StatusMark } from '../StatusMark.tsx';
import { ClientLead } from '../../types.ts';
import { EmptyState, FilterTabs, SectionHeader, shortDate } from './ui.tsx';
import { REPLY_RELEASE_MS, UNCLAIMED_ALERT_MS, duration, waitingSince } from '../leads.ts';

type Filter = 'all' | 'open' | 'owned';
const SOURCE: Record<ClientLead['source'], string> = { link: "Agent's link", pool: 'Claimed', admin: 'Set by admin' };
const POOL = '__pool__';

// Admin: who every client belongs to, what is overdue, and reassigning when needed.
export const LeadsManager: React.FC = () => {
  const { leads, assignLead, agents } = useApp();
  const [filter, setFilter] = useState<Filter>('all');
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  const rows = leads.filter((l) => filter === 'all' || (filter === 'open' ? !l.agentName : !!l.agentName));

  const status = (l: ClientLead) => {
    if (!l.agentName) {
      const waited = now - new Date(l.pooledAt ?? l.createdAt).getTime();
      return { text: `Unclaimed for ${duration(waited)}`, tone: waited >= UNCLAIMED_ALERT_MS ? 'text-[#B42318]' : 'text-[#4E585E]' };
    }
    const since = waitingSince(l);
    if (since === null) return { text: 'Up to date', tone: 'text-[#1B7F35]' };
    return { text: `Waiting for a reply · released in ${duration(REPLY_RELEASE_MS - (now - since))}`, tone: 'text-[#B4690E]' };
  };

  return (
    <section className="space-y-5">
      <SectionHeader
        title="Clients & leads"
        hint="Listings are open to every agent; each client belongs to one agent. You are told when a lead sits unclaimed for 2 hours, and a client who waits 24 hours for a reply goes back to Open leads. Reassign any client here."
      />
      <FilterTabs
        id="leads"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: 'All', count: leads.length },
          { value: 'open', label: 'Open leads', count: leads.filter((l) => !l.agentName).length },
          { value: 'owned', label: 'With an agent', count: leads.filter((l) => l.agentName).length },
        ]}
      />
      {rows.length === 0 ? (
        <EmptyState title="No clients here" body="Clients appear when they first message, apply or ask for a quotation." />
      ) : (
        <ul key={filter} className="animate-view-fade border-b border-[#C9D1D6]">
          {rows.map((l) => {
            const st = status(l);
            const last = l.history[l.history.length - 1];
            return (
              <li key={l.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 py-4 border-t border-[#C9D1D6]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-[15px] text-[#141517]">{l.clientName}</span>
                    {l.agentName ? <span className="text-[12px] text-[#4E585E]">{SOURCE[l.source]}</span> : <StatusMark status="Open lead" />}
                  </div>
                  <p className="text-[13px] text-[#2A2E31]">First asked about {l.interest} · since {shortDate(l.createdAt)}</p>
                  <p className={`text-[12.5px] font-medium ${st.tone}`}>{st.text}</p>
                  {last && <p className="text-[12px] text-[#6B767D]">{last.text} · {shortDate(last.at)}</p>}
                </div>
                <label className="flex items-center gap-2 shrink-0">
                  <span className="gb-label">Agent</span>
                  <select
                    value={l.agentName ?? POOL}
                    onChange={(e) => assignLead(l.clientId, e.target.value === POOL ? null : e.target.value)}
                    aria-label={`Agent for ${l.clientName}`}
                    className="px-3 py-2 text-[14px] bg-white border border-[#8C989F] text-[#141517] cursor-pointer"
                  >
                    <option value={POOL}>Open leads (anyone)</option>
                    {agents.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
