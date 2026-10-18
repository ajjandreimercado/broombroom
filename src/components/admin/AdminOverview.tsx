import React from 'react';
import { useApp, AdminTab } from '../../context/AppContext.tsx';
import { docSummary } from '../ApplicationsManager.tsx';
import { SectionHeader, peso, shortDate } from './ui.tsx';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

// Admin home: what needs a decision right now, then the state of the marketplace.
export const AdminOverview: React.FC = () => {
  const { listingRequests, applications, commissions, reports, vehicles, notifications, navigateTo } = useApp();
  const open = ['submitted', 'under_review', 'contacted'];

  const queue: { tab: AdminTab; label: string; count: number; detail: string }[] = [
    { tab: 'approvals', label: 'Listing requests from agents', count: listingRequests.filter((r) => r.status === 'pending').length, detail: 'New listings, edits and removals waiting for approval' },
    { tab: 'applications', label: 'Information sheets to process', count: applications.filter((a) => a.status === 'processing').length, detail: 'Read the sheet, then approve or disapprove' },
    { tab: 'applications', label: 'Applications to review', count: applications.filter((a) => open.includes(a.status)).length, detail: 'Reserve with the reservation payment, or decline with a reason' },
    { tab: 'financing', label: 'Client documents to check', count: applications.filter((a) => open.includes(a.status) && docSummary(a).tone !== 'good').length, detail: 'Cash and financing: approve or reject each document' },
    { tab: 'applications', label: 'Approved, ready to release', count: applications.filter((a) => a.status === 'approved').length, detail: 'Release once the OR and CR are ready' },
    { tab: 'commissions', label: 'Commissions ready to approve', count: commissions.filter((c) => c.status === 'receivable' && c.transactionCompleted).length, detail: 'Sale is complete; approve to make it payable' },
    { tab: 'commissions', label: 'Commissions to pay', count: commissions.filter((c) => c.status === 'payable').length, detail: 'Transfer the cash and attach the proof' },
    { tab: 'reports', label: 'Pending listing reports', count: reports.filter((r) => r.status === 'pending').length, detail: 'Dismiss or take the listing down' },
  ];
  const pendingItems = queue.filter((q) => q.count > 0);
  const owed = commissions.filter((c) => c.status !== 'paid').reduce((s, c) => s + c.amount, 0);
  const activity = notifications.filter((n) => n.audience === 'admin').slice(0, 5);

  return (
    <div className="space-y-12">
      <section className="space-y-2">
        <SectionHeader title="Needs your attention" hint={pendingItems.length ? `${pendingItems.reduce((s, q) => s + q.count, 0)} items across ${pendingItems.length} queues.` : undefined} />
        {pendingItems.length === 0 ? (
          <p className="flex items-center gap-2 py-6 text-[15px] text-[#1B7F35] font-medium">
            <CheckCircle2 className="w-5 h-5" aria-hidden="true" /> All clear. Nothing is waiting on you.
          </p>
        ) : (
          <ul>
            {pendingItems.map((q, i) => (
              <li key={q.label}>
                <button
                  onClick={() => navigateTo('admin', { adminTab: q.tab })}
                  className="group w-full grid grid-cols-[56px_1fr_auto] items-center gap-4 py-4 border-b border-[#C9D1D6] text-left cursor-pointer hover:bg-white transition-colors gb-rise"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <span className="font-display text-[26px] leading-none tabular-nums text-[#141517] text-right">{q.count}</span>
                  <span>
                    <span className="block text-[15px] font-semibold text-[#141517]">{q.label}</span>
                    <span className="block text-[13px] text-[#4E585E]">{q.detail}</span>
                  </span>
                  <ArrowRight className="w-4 h-4 text-[#141517] transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <SectionHeader title="Marketplace" />
        <dl className="grid grid-cols-2 md:grid-cols-4 border-b border-[#C9D1D6]">
          {[
            { label: 'Approved listings', value: vehicles.filter((v) => v.status === 'available').length, tab: 'vehicles' as AdminTab },
            { label: 'Reserved', value: vehicles.filter((v) => v.status === 'reserved').length, tab: 'vehicles' as AdminTab },
            { label: 'Released', value: vehicles.filter((v) => v.status === 'sold').length, tab: 'vehicles' as AdminTab },
            { label: 'Commission owed', value: peso(owed), tab: 'commissions' as AdminTab },
          ].map((m, i) => (
            <button
              key={m.label}
              onClick={() => navigateTo('admin', { adminTab: m.tab })}
              className={`text-left py-5 pr-3 cursor-pointer group ${i % 2 ? 'pl-4 border-l border-[#C9D1D6]' : ''} ${i === 2 ? 'md:pl-4 md:border-l' : ''} ${i < 2 ? 'border-b md:border-b-0 border-[#C9D1D6]' : ''}`}
            >
              <dt className="gb-label group-hover:text-[#141517]">{m.label}</dt>
              <dd className="mt-2 font-display text-[clamp(22px,2.6vw,30px)] leading-none tabular-nums text-[#141517]">{m.value}</dd>
            </button>
          ))}
        </dl>
      </section>

      {activity.length > 0 && (
        <section>
          <SectionHeader title="Recent activity" />
          <ul>
            {activity.map((n) => (
              <li key={n.id} className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-3 border-b border-[#DDE3E6] text-[13px]">
                <span className="text-[#141517]"><strong>{n.title}.</strong> {n.message}</span>
                <span className="text-[#6B767D] tabular-nums">{shortDate(n.createdAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};
