import React, { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { StatusMark } from './StatusMark.tsx';
import { VehicleApplication } from '../types.ts';
import { FilterTabs, SectionHeader, EmptyState, ReasonAction, btn, peso, shortDate } from './admin/ui.tsx';
import { Check, PhoneCall, PackageCheck } from 'lucide-react';

type Filter = 'review' | 'approved' | 'completed' | 'closed' | 'all';
const OPEN: VehicleApplication['status'][] = ['submitted', 'under_review', 'contacted'];

export const docSummary = (app: VehicleApplication) => {
  const docs = app.documents || [];
  if (!docs.length) return { text: 'No documents', tone: 'muted' as const };
  const approved = docs.filter((d) => d.status === 'approved').length;
  const rejected = docs.filter((d) => d.status === 'rejected').length;
  if (rejected) return { text: `${rejected} document${rejected > 1 ? 's' : ''} rejected`, tone: 'bad' as const };
  if (approved === docs.length) return { text: `All ${docs.length} documents approved`, tone: 'good' as const };
  return { text: `${approved} of ${docs.length} documents approved`, tone: 'muted' as const };
};

// Admin: move each client application from review to approval (reserves the car) to a completed sale.
export const ApplicationsManager: React.FC = () => {
  const { applications, updateApplicationStatus, navigateTo } = useApp();
  const [filter, setFilter] = useState<Filter>('review');

  const matches = (f: Filter, a: VehicleApplication) =>
    f === 'all' ||
    (f === 'review' && OPEN.includes(a.status)) ||
    (f === 'approved' && a.status === 'approved') ||
    (f === 'completed' && a.status === 'completed') ||
    (f === 'closed' && (a.status === 'declined' || a.status === 'withdrawn'));
  const count = (f: Filter) => applications.filter((a) => matches(f, a)).length;
  const rows = applications.filter((a) => matches(filter, a));

  return (
    <section className="space-y-5">
      <SectionHeader
        title="Applications"
        hint="Approving an application reserves the vehicle for that client. Financing applications need every document approved first."
      />
      <FilterTabs
        id="applications"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'review', label: 'To review', count: count('review') },
          { value: 'approved', label: 'Approved', count: count('approved') },
          { value: 'completed', label: 'Completed', count: count('completed') },
          { value: 'closed', label: 'Declined', count: count('closed') },
          { value: 'all', label: 'All', count: applications.length },
        ]}
      />

      {rows.length === 0 ? (
        <EmptyState title="All caught up" body="No applications in this list." />
      ) : (
        <ul key={filter} className="animate-view-fade">
          {rows.map((app) => {
            const docs = docSummary(app);
            const docsBlock = app.purchaseMethod === 'financing' && docs.tone !== 'good';
            return (
              <li key={app.id} className="py-5 border-b border-[#C9D1D6] space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[12.5px] tabular-nums text-[#4E585E]">{app.referenceNo}</span>
                      <StatusMark status={app.status} />
                      <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[#141517]">
                        {app.purchaseMethod === 'cash' ? 'Cash' : `Financing · ${app.financingTermMonths ?? '-'} mo`}
                      </span>
                    </div>
                    <p className="mt-1.5 font-semibold text-[15px] text-[#141517]">
                      {app.applicantName} <span className="font-normal text-[#4E585E] tabular-nums">· {app.applicantPhone}</span>
                    </p>
                    <p className="text-[13px] text-[#2A2E31]">
                      {app.vehicleTitle} · <span className="tabular-nums">{peso(app.vehiclePrice)}</span> · Agent {app.sellerName}
                    </p>
                    <p className="text-[12px] text-[#6B767D] tabular-nums">Submitted {shortDate(app.submittedAt)}</p>
                  </div>
                  <p className={`text-[12.5px] font-medium ${docs.tone === 'good' ? 'text-[#1B7F35]' : docs.tone === 'bad' ? 'text-[#B42318]' : 'text-[#4E585E]'}`}>
                    {docs.text}
                  </p>
                </div>

                {app.notes && <p className="text-[13px] text-[#2A2E31] max-w-[70ch]">Client note: “{app.notes}”</p>}
                {app.sellerNotes && <p className="text-[13px] text-[#2A2E31] max-w-[70ch]">Admin note: “{app.sellerNotes}”</p>}

                {OPEN.includes(app.status) && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      className={`${btn.primary} flex items-center gap-1.5`}
                      disabled={docsBlock}
                      onClick={() => updateApplicationStatus(app.id, 'approved')}
                    >
                      <Check className="w-4 h-4" aria-hidden="true" />
                      Approve &amp; reserve
                    </button>
                    {app.status !== 'contacted' && (
                      <button className={`${btn.outline} flex items-center gap-1.5`} onClick={() => updateApplicationStatus(app.id, 'contacted')}>
                        <PhoneCall className="w-4 h-4" aria-hidden="true" />
                        Mark contacted
                      </button>
                    )}
                    <ReasonAction label="Decline" placeholder="Reason the client will see" onConfirm={(r) => updateApplicationStatus(app.id, 'declined', r)} />
                    {docsBlock && (
                      <button
                        onClick={() => navigateTo('admin', { adminTab: 'financing' })}
                        className="text-[13px] font-semibold text-[#1D5FD1] underline underline-offset-4 cursor-pointer"
                      >
                        Review documents first
                      </button>
                    )}
                  </div>
                )}
                {app.status === 'approved' && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button className={`${btn.ink} flex items-center gap-1.5`} onClick={() => updateApplicationStatus(app.id, 'completed')}>
                      <PackageCheck className="w-4 h-4" aria-hidden="true" />
                      Mark sale completed
                    </button>
                    <ReasonAction label="Cancel approval" confirmLabel="Cancel & release car" placeholder="Reason the client will see" onConfirm={(r) => updateApplicationStatus(app.id, 'declined', r)} />
                    <span className="text-[12.5px] text-[#4E585E]">Vehicle is reserved for this client.</span>
                  </div>
                )}
                {app.status === 'completed' && <p className="text-[12.5px] text-[#1B7F35] font-medium">Sale completed · vehicle released to the client.</p>}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
