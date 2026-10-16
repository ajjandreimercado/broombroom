import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { StatusMark } from '../StatusMark.tsx';
import { VehicleApplication } from '../../types.ts';
import { docSummary } from '../ApplicationsManager.tsx';
import { FilterTabs, SectionHeader, EmptyState, ReasonAction, btn, peso, shortDate } from './ui.tsx';
import { Check, FileText } from 'lucide-react';

type Filter = 'review' | 'rejected' | 'approved' | 'all';

// An open application stays in "To review" until it is decided, even once every document passes,
// so the approve button never disappears mid-review.
const OPEN = ['submitted', 'under_review', 'contacted'];
const stateOf = (app: VehicleApplication): Exclude<Filter, 'all'> => {
  const tone = docSummary(app).tone;
  if (tone === 'bad') return 'rejected';
  return OPEN.includes(app.status) ? 'review' : 'approved';
};

// Admin: approve each financing document, or reject it with the reason the client will read.
export const FinancingReview: React.FC = () => {
  const { applications, reviewDocument, updateApplicationStatus } = useApp();
  const financing = applications.filter((a) => a.purchaseMethod === 'financing');
  const [filter, setFilter] = useState<Filter>('review');
  const rows = filter === 'all' ? financing : financing.filter((a) => stateOf(a) === filter);
  const count = (f: Exclude<Filter, 'all'>) => financing.filter((a) => stateOf(a) === f).length;

  return (
    <section className="space-y-5">
      <SectionHeader
        title="Financing documents"
        hint="Check each document. A rejected document needs a reason, which the client sees right away. Once every document is approved, the application can be approved."
      />
      <FilterTabs
        id="financing"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'review', label: 'To review', count: count('review') },
          { value: 'rejected', label: 'Rejected', count: count('rejected') },
          { value: 'approved', label: 'Approved', count: count('approved') },
          { value: 'all', label: 'All', count: financing.length },
        ]}
      />

      {rows.length === 0 ? (
        <EmptyState title="Nothing to review" body="Financing applications with documents waiting for a decision appear here." />
      ) : (
        <ul key={filter} className="animate-view-fade space-y-8">
          {rows.map((app) => {
            const allApproved = docSummary(app).tone === 'good';
            const canApproveApp = allApproved && OPEN.includes(app.status);
            return (
              <li key={app.id} className="border-t border-[#141517]">
                <div className="flex flex-wrap items-start justify-between gap-3 py-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[12.5px] tabular-nums text-[#4E585E]">{app.referenceNo}</span>
                      <StatusMark status={app.status} />
                    </div>
                    <p className="mt-1.5 font-semibold text-[15px] text-[#141517]">{app.applicantName}</p>
                    <p className="text-[13px] text-[#2A2E31] tabular-nums">
                      {app.vehicleTitle} · {peso(app.vehiclePrice)} · {app.financingTermMonths ?? '-'} months
                      {app.downPayment ? ` · ${peso(app.downPayment)} down` : ''}
                    </p>
                    <p className="text-[12px] text-[#6B767D]">Submitted {shortDate(app.submittedAt)}</p>
                  </div>
                  {canApproveApp && (
                    <button className={`${btn.primary} flex items-center gap-1.5`} onClick={() => updateApplicationStatus(app.id, 'approved')}>
                      <Check className="w-4 h-4" aria-hidden="true" />
                      Approve application &amp; reserve
                    </button>
                  )}
                </div>

                {(app.documents || []).length === 0 ? (
                  <p className="pb-4 text-[13px] text-[#4E585E]">This application was sent before documents were required.</p>
                ) : (
                  <ul className="border-t border-[#C9D1D6]">
                    {(app.documents || []).map((d, i) => (
                      <li key={d.label} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 border-b border-[#DDE3E6]">
                        <FileText className="w-4 h-4 text-[#4E585E] shrink-0" aria-hidden="true" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[14px] font-medium text-[#141517]">{d.label}</p>
                          <p className="text-[12.5px] text-[#4E585E] truncate">{d.fileName || 'Not submitted yet. The client will hand it to the admin team.'}</p>
                          {d.status === 'rejected' && d.reason && <p className="text-[12.5px] text-[#B42318]">Rejected: {d.reason}</p>}
                        </div>
                        <StatusMark status={!d.fileName ? 'Missing' : d.status === 'approved' ? 'Approved' : d.status === 'rejected' ? 'Rejected' : 'Pending'} />
                        {d.fileName && d.status !== 'approved' && (
                          <button className={btn.outline} onClick={() => reviewDocument(app.id, i, true)}>
                            Approve
                          </button>
                        )}
                        {d.fileName && d.status !== 'rejected' && (
                          <ReasonAction label="Reject" placeholder="Why it was rejected, e.g. ID is expired" onConfirm={(r) => reviewDocument(app.id, i, false, r)} />
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
