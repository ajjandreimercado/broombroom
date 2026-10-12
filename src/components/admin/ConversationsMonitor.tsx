import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { AGENTS } from '../../data/mockData.ts';
import { SectionHeader, EmptyState, shortDate } from './ui.tsx';
import { Eye } from 'lucide-react';

// Admin: read-only view of every agent-to-client conversation.
export const ConversationsMonitor: React.FC = () => {
  const { conversations } = useApp();
  const [agent, setAgent] = useState('all');
  const list = conversations
    .filter((c) => agent === 'all' || c.sellerName === agent)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const [openId, setOpenId] = useState<string | null>(null);
  const open = list.find((c) => c.id === openId) || list[0];

  return (
    <section className="space-y-5">
      <SectionHeader title="Conversations" hint="Monitor what agents tell clients. This view is read-only; nothing you open here is marked as read.">
        <select
          value={agent}
          onChange={(e) => { setAgent(e.target.value); setOpenId(null); }}
          aria-label="Filter by agent"
          className="px-3 py-2 text-[13px] bg-white border border-[#8C989F] text-[#141517] cursor-pointer"
        >
          <option value="all">All agents</option>
          {AGENTS.map((a) => <option key={a} value={a}>{a}</option>)}
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
                <span className="flex items-center gap-1.5 text-[12px] text-[#4E585E]"><Eye className="w-3.5 h-3.5" aria-hidden="true" /> Monitoring</span>
              </div>
              <ol className="flex-1 p-5 space-y-3 overflow-y-auto max-h-[480px]">
                {open.messages.map((m) => (
                  <li key={m.id} className={`flex flex-col ${m.isSeller ? 'items-end' : 'items-start'}`}>
                    <span className="text-[11px] text-[#6B767D] mb-1">{m.isSeller ? `${open.sellerName} · agent` : `${open.buyerName} · client`}</span>
                    <p className={`max-w-[70%] px-3.5 py-2.5 text-[13px] leading-relaxed ${m.isSeller ? 'bg-[#1D5FD1] text-white' : 'bg-[#EEF1F2] text-[#141517]'}`}>{m.text}</p>
                    <span className="text-[11px] text-[#6B767D] mt-1 tabular-nums">{new Date(m.timestamp).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
