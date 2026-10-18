import React, { useEffect, useMemo, useState } from 'react';
import { StatusMark } from '../components/StatusMark.tsx';
import { useApp } from '../context/AppContext.tsx';
import { portalUrl } from '../portals.ts';
import { SellerTab } from '../context/AppContext.tsx';
import { SalesReport } from '../components/accounting/SalesReport.tsx';
import { Commissions } from '../components/Commissions.tsx';
import { AgentListings } from '../components/agent/AgentListings.tsx';
import { AgentLeads } from '../components/agent/AgentLeads.tsx';
import {
  LayoutDashboard,
  BarChart3,
  Car,
  MessageSquare,
  Wallet,
  Eye,
  ArrowUpRight,
  Send,
  Users,
} from 'lucide-react';
import { ErrorBoundary } from '../components/ErrorBoundary.tsx';

export const SellerDashboardView: React.FC = () => {
  const {
    currentUser,
    sellerTab,
    navigateTo,
    vehicles,
    commissions: allCommissions,
    conversations: allConversations,
    activeConversationId,
    setActiveConversationId,
    sendMessage,
    sendApplyLink,
    leads,
    applications,
    markConversationRead,
  } = useApp();

  // Every agent can sell every listing; chats and commissions are only for the agent's own clients.
  const me = currentUser?.name;
  const sellerVehicles = vehicles;
  const openLeads = leads.filter((l) => !l.agentName).length;
  const conversations = allConversations.filter((c) => c.sellerName === me);
  const commissions = allCommissions.filter((c) => c.agentName === me);
  const pendingCommissions = commissions.filter((c) => c.status !== 'paid');
  const paidTotal = commissions.filter((c) => c.status === 'paid').reduce((sum, c) => sum + c.amount, 0);
  const pendingTotal = pendingCommissions.reduce((sum, c) => sum + c.amount, 0);
  const inProgress = applications.filter((a) => a.sellerName === me && ['submitted', 'under_review', 'contacted', 'reserved', 'processing', 'approved'].includes(a.status)).length;
  // Closed sales = completed transactions on the agent's commissions, by when they were completed.
  const closedByPeriod = useMemo(() => {
    const now = new Date();
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const week = new Date(day);
    week.setDate(day.getDate() - ((day.getDay() + 6) % 7)); // Monday
    const done = commissions.filter((c) => c.transactionCompleted).map((c) => ({ at: new Date(c.completedAt ?? c.createdAt), price: c.salePrice }));
    return ([
      ['Today', day],
      ['This week', week],
      ['Month to date', new Date(now.getFullYear(), now.getMonth(), 1)],
      ['Year to date', new Date(now.getFullYear(), 0, 1)],
    ] as const).map(([label, from]) => {
      const inside = done.filter((s) => s.at >= from);
      return [label, inside.reduce((t, s) => t + s.price, 0), inside.length] as const;
    });
  }, [commissions]);

  // Seller Chat
  const [sellerChatText, setSellerChatText] = useState('');
  const selectedConv = conversations.find((c) => c.id === activeConversationId) || conversations[0];

  const available = vehicles.filter((v) => v.status === 'available');
  const [linkVehicleId, setLinkVehicleId] = useState('');
  const linkVehicle = available.find((v) => v.id === linkVehicleId) ? linkVehicleId : available.find((v) => v.id === selectedConv?.vehicleId)?.id || available[0]?.id || '';

  // The open chat is read: new messages in it are seen as they arrive.
  useEffect(() => {
    if (sellerTab === 'messages' && selectedConv && selectedConv.unreadSeller > 0) markConversationRead(selectedConv.id);
  }, [sellerTab, selectedConv?.id, selectedConv?.unreadSeller]);

  const handleSendSellerReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellerChatText.trim() || !selectedConv) return;
    sendMessage(selectedConv.id, sellerChatText.trim());
    setSellerChatText('');
  };

  const sellerTabs: { id: SellerTab; label: string; icon: any; count?: number }[] = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'sales_report', label: 'Sales Report', icon: BarChart3 },
    { id: 'leads', label: 'Leads', icon: Users, count: openLeads },
    // Chats with messages the agent has not read yet; opening a chat marks it read.
    { id: 'messages', label: 'Client Chats', icon: MessageSquare, count: conversations.filter((c) => c.unreadSeller > 0).length },
    { id: 'commissions', label: 'Commissions', icon: Wallet, count: pendingCommissions.length },
    { id: 'vehicles', label: 'Listings', icon: Car, count: sellerVehicles.length },
  ];

  return (
    <div className="min-h-screen bg-[#F7F8F8] pb-24">
      {/* Seller Portal Header Banner */}
      <div className="bg-[#F7F8F8] text-[#141517] pt-10 pb-8 border-b-2 border-[#141517]">
        <div className="gb-container flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-center gap-3.5 sm:gap-4">
            <div className="w-12 h-12 rounded-full bg-[#141517] text-white grid place-items-center font-semibold text-[18px] shrink-0">
              {(currentUser?.name || 'A').charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="font-display text-[clamp(1.6rem,3vw,2.4rem)] leading-none text-[#141517]">
                {currentUser?.name || 'Agent'}
              </h1>
              <p className="text-[13px] text-[#4E585E] mt-2">
                Sales agent · Help clients choose and buy, then track your commissions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigateTo('seller', { sellerTab: 'sales_report' })}
              className={`px-4 py-2.5 font-semibold text-[13px] flex items-center gap-2 cursor-pointer ${
                sellerTab === 'sales_report'
                  ? 'bg-[#1D5FD1] text-white'
                  : 'bg-white hover:bg-[#EEF1F2] text-[#141517] border border-[#141517]'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Sales Report</span>
            </button>
            <button
              onClick={() => navigateTo('seller', { sellerTab: 'messages' })}
              className="px-4 py-2.5 bg-[#1D5FD1] hover:bg-[#174CA8] text-white font-semibold text-[13px] flex items-center gap-2 cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Client chats</span>
            </button>
          </div>
        </div>
      </div>

      <div className="gb-container pt-8 sm:pt-10">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Navigation Sidebar */}
          <aside className="w-full lg:w-64 shrink-0 space-y-2 lg:sticky lg:top-[89px] z-10">
            <div className="border-y-2 lg:border-y-0 lg:border-t-2 border-[#141517] py-1 lg:py-2 flex lg:flex-col overflow-x-auto scrollbar-none gap-0.5">
              {sellerTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = sellerTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => navigateTo('seller', { sellerTab: tab.id })}
                    className={`relative shrink-0 lg:w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-[13.5px] font-medium cursor-pointer whitespace-nowrap transition-colors duration-200 ${
                      isActive ? 'text-white' : 'text-[#2A2E31] hover:bg-[#EEF1F2] hover:text-[#141517]'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {isActive && (
                      <span className="absolute inset-0 bg-[#141517]" aria-hidden="true" />
                    )}
                    <div className="relative flex items-center gap-2.5">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{tab.label}</span>
                    </div>
                    {tab.count !== undefined && tab.count > 0 && (
                      <span
                        className={`relative text-[10px] tabular-nums font-bold px-1.5 py-0.5 rounded-full transition-colors duration-200 ${
                          isActive
                            ? 'bg-white text-[#141517]'
                            : 'bg-[#EEF1F2] text-[#4E585E]'
                        }`}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Active Seller Section Content */}
          <main className="flex-1 w-full min-w-0 space-y-8">
            <ErrorBoundary key={sellerTab}>
            {/* 1. OVERVIEW DASHBOARD */}
            {sellerTab === 'dashboard' && (
              <div className="space-y-12">
                {/* Ledger: the dealership's figures as one ruled row */}
                <section aria-labelledby="ledger-heading">
                  <div className="flex items-end justify-between gap-4 pb-3 border-b-2 border-[#141517]">
                    <h2 id="ledger-heading" className="font-display text-[22px] leading-none text-[#141517]">Ledger</h2>
                  </div>
                  <dl className="grid grid-cols-2 md:grid-cols-4 border-b border-[#C9D1D6]">
                    {[
                      { label: 'Open leads', value: openLeads.toLocaleString(), note: (() => { const n = leads.filter((l) => l.agentName === me).length; return `${n} client${n === 1 ? ' is' : 's are'} yours`; })() },
                      { label: 'Commission paid', value: `₱${paidTotal.toLocaleString()}`, note: `₱${pendingTotal.toLocaleString()} receivable or payable` },
                      { label: 'Client chats', value: conversations.length.toLocaleString(), note: 'Active conversations' },
                      { label: 'Applications', value: inProgress.toLocaleString(), note: 'In progress for your clients' },
                    ].map((m, i) => (
                      <div key={m.label} className={`py-5 pr-4 ${i % 2 === 1 ? 'pl-4 border-l' : ''} ${i === 2 ? 'md:pl-4 md:border-l' : ''} ${i === 3 ? 'pl-4' : ''} ${i < 2 ? 'border-b md:border-b-0' : ''} border-[#C9D1D6]`}>
                        <dt className="gb-label">{m.label}</dt>
                        <dd className="mt-2 font-display text-[clamp(20px,2.4vw,32px)] leading-none tabular-nums text-[#141517] [overflow-wrap:anywhere]">{m.value}</dd>
                        <dd className="mt-2 text-[12.5px] text-[#4E585E]">{m.note}</dd>
                      </div>
                    ))}
                  </dl>
                </section>

                {/* Closed sales by period */}
                <section aria-labelledby="sales-heading">
                  <div className="flex flex-wrap items-end justify-between gap-4 pb-3 border-b-2 border-[#141517]">
                    <h2 id="sales-heading" className="font-display text-[22px] leading-none text-[#141517]">Closed sales</h2>
                    <button
                      onClick={() => navigateTo('seller', { sellerTab: 'sales_report' })}
                      className="group inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#141517] cursor-pointer"
                    >
                      <span className="underline decoration-[#8C989F] group-hover:decoration-[#141517] underline-offset-4">Full sales report</span>
                      <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                  <table className="w-full text-[14px]">
                    <caption className="sr-only">Your closed sales by period</caption>
                    <thead>
                      <tr className="text-left">
                        <th className="gb-label py-3 font-semibold">Period</th>
                        <th className="gb-label py-3 font-semibold text-right">Revenue</th>
                        <th className="gb-label py-3 font-semibold text-right">Units</th>
                      </tr>
                    </thead>
                    <tbody className="tabular-nums">
                      {closedByPeriod.map(([period, revenue, units]) => (
                        <tr key={period} className="border-t border-[#C9D1D6]">
                          <td className="py-3.5 text-[#141517]">{period}</td>
                          <td className="py-3.5 text-right font-semibold text-[#141517]">₱{revenue.toLocaleString()}</td>
                          <td className="py-3.5 text-right text-[#4E585E]">{units}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>

                <Commissions mode="agent" compact />
              </div>
            )}

            {/* 2. SALES REPORT */}
            {sellerTab === 'sales_report' && <SalesReport mode="agent" />}

            {/* 3. VEHICLES MANAGEMENT */}
            {sellerTab === 'vehicles' && <AgentListings vehicles={sellerVehicles} />}
            {sellerTab === 'leads' && <AgentLeads />}

            {/* 6. MESSAGES TAB */}
            {sellerTab === 'messages' && (
              <div className="bg-white rounded-[2px] border border-[#C9D1D6] overflow-hidden h-[560px] flex flex-col md:flex-row">
                <div className="w-full md:w-80 border-r border-[#C9D1D6] flex flex-col bg-[#F7F8F8]/50 max-h-48 md:max-h-none shrink-0">
                  <div className="p-4 border-b border-[#C9D1D6] text-xs font-bold uppercase tracking-wider text-[#2A2E31] tabular-nums">
                    Client Inquiries ({conversations.length})
                  </div>
                  <div className="flex-1 overflow-y-auto divide-y divide-[#DDE3E6]">
                    {conversations.map((conv) => (
                      <div
                        key={conv.id}
                        onClick={() => setActiveConversationId(conv.id)}
                        className={`p-3.5 cursor-pointer text-xs transition-colors ${
                          selectedConv?.id === conv.id ? 'bg-white font-bold outline outline-1 outline-[#141517] -outline-offset-1' : 'hover:bg-[#EEF1F2]/70'
                        }`}
                      >
                        <p className="flex items-center gap-2 text-[#141517] font-bold">
                          <span className="truncate">{conv.buyerName}</span>
                          {conv.unreadSeller > 0 && (
                          <span className="ml-auto shrink-0 min-w-[20px] h-5 px-1.5 grid place-items-center bg-[#1D5FD1] text-white text-[11px] font-bold tabular-nums rounded-full" aria-label={`${conv.unreadSeller} unread`}>{conv.unreadSeller}</span>
                        )}
                        </p>
                        <p className="text-[11px] text-[#4E585E] font-normal truncate mt-0.5">
                          {conv.vehicleTitle}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex-1 flex flex-col h-full bg-white">
                  {selectedConv ? (
                    <>
                      <div className="p-4 border-b border-[#C9D1D6] text-xs font-bold text-[#141517] bg-[#F7F8F8]/50">
                        Chatting with {selectedConv.buyerName} ({selectedConv.vehicleTitle})
                      </div>
                      <div className="flex-1 p-5 overflow-y-auto space-y-3.5">
                        {selectedConv.messages.map((m) => (
                          <div
                            key={m.id}
                            className={`flex flex-col ${m.isSeller ? 'items-end' : 'items-start'}`}
                          >
                            <div
                              className={`max-w-xs rounded-[2px] px-4 py-2.5 text-xs leading-relaxed ${
                                m.isSeller
                                  ? 'bg-[#1D5FD1] text-white rounded-tr-xs'
                                  : 'bg-[#EEF1F2] text-[#141517] rounded-tl-xs'
                              }`}
                            >
                              {m.text}
                              {m.byAdmin && <span className="block mb-1 text-[10px] font-semibold opacity-80">Admin</span>}
                              {m.applyVehicleId && <span className="block mt-1.5 text-[10px] font-semibold opacity-80">Apply link: {m.applyVehicleTitle}</span>}
                            </div>
                            <span className="text-[10px] text-[#6B767D] mt-1 tabular-nums">
                              {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))}
                      </div>
                      <form onSubmit={handleSendSellerReply} className="p-3.5 border-t border-[#C9D1D6] flex gap-2.5 bg-[#F7F8F8]/30">
                        <input
                          type="text"
                          placeholder="Reply to client..."
                          value={sellerChatText}
                          onChange={(e) => setSellerChatText(e.target.value)}
                          className="flex-1 px-3.5 py-2.5 text-xs bg-white border border-[#C9D1D6] rounded-[2px] focus:border-[#1D5FD1]"
                        />
                        <button
                          type="submit"
                          className="px-5 py-2.5 bg-[#1D5FD1] hover:bg-[#174CA8] text-white rounded-[2px] text-xs font-bold cursor-pointer transition-colors"
                        >
                          Send
                        </button>
                      </form>
                      {available.length > 0 && (
                        <div className="px-3.5 pb-3.5 flex gap-2.5 items-center bg-[#F7F8F8]/30">
                          <label htmlFor="apply-link-vehicle" className="text-[11px] text-[#4E585E] shrink-0">Apply link for</label>
                          <select
                            id="apply-link-vehicle"
                            value={linkVehicle}
                            onChange={(e) => setLinkVehicleId(e.target.value)}
                            className="flex-1 min-w-0 px-2.5 py-2 text-xs bg-white border border-[#C9D1D6] rounded-[2px] focus:border-[#1D5FD1]"
                          >
                            {available.map((v) => (
                              <option key={v.id} value={v.id}>{v.title}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => selectedConv && linkVehicle && sendApplyLink(selectedConv.id, linkVehicle)}
                            title="The client applies through this link and is then locked to you"
                            className="px-3.5 py-2 border border-[#1D5FD1] text-[#1D5FD1] hover:bg-[#1D5FD1] hover:text-white rounded-[2px] text-xs font-bold cursor-pointer transition-colors shrink-0"
                          >
                            Send apply link
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="p-6 text-center text-xs text-[#6B767D]">No conversation selected.</div>
                  )}
                </div>
              </div>
            )}

            {/* 5. COMMISSIONS */}
            {sellerTab === 'commissions' && <Commissions mode="agent" />}
            </ErrorBoundary>
          </main>
        </div>
      </div>

    </div>
  );
};
