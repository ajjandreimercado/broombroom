import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { SectionHeader, EmptyState, btn, shortDate } from './ui.tsx';
import { canTakeOver, duration, unansweredSince } from '../leads.ts';
import { Eye } from 'lucide-react';

// Admin: every agent-to-client conversation. Reading is silent (nothing is marked read, nobody is told). When a client
// has waited 2 days for a reply, the admin can take the chat over and answer; the agent is told about a takeover.
export const ConversationsMonitor: React.FC = () => {
  const { conversations, agents, sendMessage, takeOverConversation, endTakeover } = useApp();
  const [reply, setReply] = useState('');
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  const [agent, setAgent] = useState('all');
  const list = conversations
    .filter((c) => agent === 'all' || c.sellerName === agent)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const [openId, setOpenId] = useState<string | null>(null);
  const open = list.find((c) => c.id === openId) || list[0];

  return (
    <section className="space-y-5">
      <SectionHeader title="Conversations" hint="Monitor what agents tell clients. Reading is silent: nothing you open here is marked as read. If a client waits 2 days for a reply, you can take the chat over.">
        <select
          value={agent}
          onChange={(e) => { setAgent(e.target.value); setOpenId(null); }}
          aria-label="Filter by agent"
          className="px-3 py-2 text-[13px] bg-white border border-[#8C989F] text-[#141517] cursor-pointer"
        >
          <option value="all">All agents</option>
          {agents.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </SectionHeader>

      {list.length === 0 ? (
        <EmptyState title="No conversations" body="When a client messages an agent about a listing, the thread shows up here." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] border border-[#C9D1D6] bg-white min-h-[460px]">
          <ul className="border-b md:border-b-0 md:border-r border-[#C9D1D6] max-h-60 md:max-h-[560px] overflow-y-auto">
            {list.map((c) => {
              const active = open?.id === c.id;
              return (
                <li key={c.id}>
                  <button
                    onClick={() => setOpenId(c.id)}
                    aria-current={active}
                    className={`w-full text-left px-4 py-3 border-b border-[#DDE3E6] cursor-pointer transition-colors ${active ? 'bg-[#141517] text-white' : 'hover:bg-[#F7F8F8]'}`}
                  >
                    <span className="block text-[13px] font-semibold">{c.buyerName} ↔ {c.sellerName}</span>
                    <span className={`block text-[12px] truncate ${active ? 'text-[#C9D1D6]' : 'text-[#4E585E]'}`}>{c.vehicleTitle}</span>
                    <span className={`block text-[11.5px] tabular-nums mt-0.5 ${active ? 'text-[#C9D1D6]' : 'text-[#6B767D]'}`}>
                      {c.messages.length} messages · {shortDate(c.updatedAt)}
                    </span>
                    {c.takenOverAt ? (
                      <span className={`block text-[11.5px] font-semibold mt-0.5 ${active ? 'text-white' : 'text-[#1D5FD1]'}`}>You are answering</span>
                    ) : canTakeOver(c, now) ? (
                      <span className={`block text-[11.5px] font-semibold mt-0.5 ${active ? 'text-white' : 'text-[#B42318]'}`}>No reply for 2+ days</span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
          {open && (
            <div key={open.id} className="flex flex-col animate-view-fade">
              <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 border-b border-[#C9D1D6] bg-[#F7F8F8]">
                <p className="text-[13px] text-[#141517]">
                  <strong>{open.buyerName}</strong> (client) and <strong>{open.sellerName}</strong> (agent) about {open.vehicleTitle}
                </p>
                {open.takenOverAt ? (
                  <button className={btn.outline} onClick={() => endTakeover(open.id)}>Hand back to {open.sellerName}</button>
                ) : (
                  <span className="flex items-center gap-1.5 text-[12px] text-[#4E585E]"><Eye className="w-3.5 h-3.5" aria-hidden="true" /> Only you can see this</span>
                )}
              </div>
              {canTakeOver(open, now) && (
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-[#C9D1D6] bg-[#FDF3F2]">
                  <p className="text-[13px] text-[#B42318]">
                    {open.buyerName} has waited {duration(now - unansweredSince(open)!)} for a reply.
                  </p>
                  <button className={btn.primary} onClick={() => takeOverConversation(open.id)}>Take over chat</button>
                </div>
              )}
              <ol className="flex-1 p-5 space-y-3 overflow-y-auto max-h-[480px]">
                {open.messages.map((m) => (
                  <li key={m.id} className={`flex flex-col ${m.isSeller ? 'items-end' : 'items-start'}`}>
                    <span className="text-[11px] text-[#6B767D] mb-1">{m.byAdmin ? 'You · admin' : m.isSeller ? `${open.sellerName} · agent` : `${open.buyerName} · client`}</span>
                    <p className={`max-w-[70%] px-3.5 py-2.5 text-[13px] leading-relaxed ${m.byAdmin ? 'bg-[#141517] text-white' : m.isSeller ? 'bg-[#1D5FD1] text-white' : 'bg-[#EEF1F2] text-[#141517]'}`}>{m.text}</p>
                    <span className="text-[11px] text-[#6B767D] mt-1 tabular-nums">{new Date(m.timestamp).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  </li>
                ))}
              </ol>
              {open.takenOverAt && (
                <form
                  className="flex gap-2.5 p-3.5 border-t border-[#C9D1D6] bg-[#F7F8F8]"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!reply.trim()) return;
                    if (await sendMessage(open.id, reply.trim())) setReply('');
                  }}
                >
                  <input
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder={`Reply to ${open.buyerName} as Broom Broom…`}
                    aria-label={`Reply to ${open.buyerName}`}
                    className="flex-1 px-3.5 py-2.5 text-[13px] bg-white border border-[#8C989F]"
                  />
                  <button type="submit" disabled={!reply.trim()} className={btn.primary}>Send</button>
                </form>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
