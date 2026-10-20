import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { ClientLead } from '../../types.ts';
import { EmptyState, FilterTabs, SectionHeader, btn } from '../admin/ui.tsx';
import { REPLY_RELEASE_MS, duration, waitingSince } from '../leads.ts';
import { Hand, MessageSquare } from 'lucide-react';

const SOURCE: Record<ClientLead['source'], string> = { link: 'Came through your link', pool: 'Claimed from Open leads', admin: 'Assigned by the admin' };

// Agent: claim new clients from the shared pool, and keep track of the clients who are yours.
export const AgentLeads: React.FC = () => {
  const { leads, claimLead, openClientChat, currentUser, conversations, navigateTo, setActiveConversationId } = useApp();
  const me = currentUser?.name;
  const [view, setView] = useState<'open' | 'mine'>('open');
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const open = leads.filter((l) => !l.agentName && !l.doneAt).sort((a, b) => (a.pooledAt ?? a.createdAt).localeCompare(b.pooledAt ?? b.createdAt));
  const mine = leads.filter((l) => l.agentName === me);
  const lastClientLine = (clientId: string) =>
    conversations
      .filter((c) => c.buyerId === clientId)
      .flatMap((c) => c.messages.filter((m) => !m.isSeller))
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0]?.text;
  // The agent starts the conversation: claiming (or Message client) opens the chat, created if the client had none.
  const goToChat = (conversationId: string | null) => {
    if (!conversationId) return;
    setActiveConversationId(conversationId);
    navigateTo('seller', { sellerTab: 'messages' });
  };
  const openChat = async (clientId: string) => goToChat(await openClientChat(clientId));
  const claim = async (clientId: string) => goToChat(await claimLead(clientId));

  return (
    <section className="space-y-5">
      <SectionHeader
        title="Leads"
        hint="Every new client waits in Open leads. First come, first served: the first agent to claim a client who asked to apply sends them the apply link in a new chat and keeps them, with the commission if they buy."
      />
      <FilterTabs
        id="agent-leads"
        value={view}
        onChange={setView}
        options={[
          { value: 'open', label: 'Open leads', count: open.length },
          { value: 'mine', label: 'My clients', count: mine.length },
        ]}
      />

      {view === 'open' &&
        (open.length === 0 ? (
          <EmptyState title="No open leads" body="Clients who press “Request to apply” on a vehicle appear here. Be the first to claim them." />
        ) : (
          <ul key="open" className="animate-view-fade border-b border-[#C9D1D6]">
            {open.map((l) => {
              const line = l.preview ?? lastClientLine(l.clientId);
              return (
                <li key={l.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4 border-t border-[#C9D1D6]">
                  <div className="min-w-0">
                    <p className="font-semibold text-[15px] text-[#141517]">{l.clientName}</p>
                    <p className="text-[13px] text-[#2A2E31]">{l.applyVehicleId ? 'Wants to apply for' : 'Interested in'} {l.interest}</p>
                    {line && <p className="text-[12.5px] text-[#4E585E] truncate max-w-[60ch]">“{line}”</p>}
                    <p className="text-[12px] text-[#6B767D] tabular-nums">Waiting {duration(now - new Date(l.pooledAt ?? l.createdAt).getTime())}</p>
                  </div>
                  <button className={`${btn.primary} flex items-center gap-1.5 self-start sm:self-center`} onClick={() => claim(l.clientId)}>
                    <Hand className="w-4 h-4" aria-hidden="true" /> {l.applyVehicleId ? 'Claim & send apply link' : 'Claim client'}
                  </button>
                </li>
              );
            })}
          </ul>
        ))}

      {view === 'mine' &&
        (mine.length === 0 ? (
          <EmptyState title="No clients yet" body="Share your listing links or claim clients from Open leads." />
        ) : (
          <ul key="mine" className="animate-view-fade border-b border-[#C9D1D6]">
            {mine.map((l) => {
              const since = waitingSince(l);
              const left = since === null ? null : REPLY_RELEASE_MS - (now - since);
              return (
                <li key={l.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4 border-t border-[#C9D1D6]">
                  <div className="min-w-0">
                    <p className="font-semibold text-[15px] text-[#141517]">{l.clientName}</p>
                    <p className="text-[13px] text-[#2A2E31]">Interested in {l.interest} · {SOURCE[l.source]}</p>
                    {l.lockedTo ? (
                      <p className="text-[12.5px] font-medium text-[#1D5FD1]">Locked to you · applied through your link ({l.lockedRef})</p>
                    ) : left === null ? (
                      <p className="text-[12.5px] text-[#1B7F35]">Up to date</p>
                    ) : (
                      <p className={`text-[12.5px] font-medium ${left < 4 * 3600e3 ? 'text-[#B42318]' : 'text-[#B4690E]'}`}>
                        Waiting for your reply · goes back to Open leads in {duration(left)}
                      </p>
                    )}
                  </div>
                  <button className={`${btn.outline} flex items-center gap-1.5 self-start sm:self-center`} onClick={() => openChat(l.clientId)}>
                    <MessageSquare className="w-4 h-4" aria-hidden="true" /> Message client
                  </button>
                </li>
              );
            })}
          </ul>
        ))}
    </section>
  );
};
