import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { StatusMark } from '../StatusMark.tsx';
import { VehicleApplication } from '../../types.ts';
import { docSummary } from '../ApplicationsManager.tsx';
import { FilterTabs, SectionHeader, EmptyState, ReasonAction, btn, peso, shortDate, checkUpload } from './ui.tsx';
import { Check, FileText, ChevronDown, Upload } from 'lucide-react';

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
  const { applications, reviewDocument, updateApplicationStatus, attachDocumentForClient, showToast } = useApp();
  const [openId, setOpenId] = useState<string | null>(null);
  const financing = applications.filter((a) => a.purchaseMethod === 'financing');
  const [filter, setFilter] = useState<Filter>('review');
  const rows = filter === 'all' ? financing : financing.filter((a) => stateOf(a) === filter);
  const count = (f: Exclude<Filter, 'all'>) => financing.filter((a) => stateOf(a) === f).length;

  return (
    <section className="space-y-5">
      <SectionHeader
        title="Financing documents"
        hint="Open an application to see the documents the client submitted. Upload anything the client hands in directly. A rejected document needs a reason, which the client sees right away. Once every document is approved, the application can be approved."
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
        <ul key={filter} className="animate-view-fade border-b border-[#C9D1D6]">
          {rows.map((app) => {
            const summary = docSummary(app);
            const canApproveApp = summary.tone === 'good' && OPEN.includes(app.status);
            const expanded = openId === app.id;
            return (
              <li key={app.id} className="border-t border-[#C9D1D6]">
                <button
                  onClick={() => setOpenId(expanded ? null : app.id)}
                  aria-expanded={expanded}
                  aria-controls={`docs-${app.id}`}
                  className="w-full flex flex-wrap items-start justify-between gap-3 py-4 text-left cursor-pointer hover:bg-white/60 transition-colors"
                >
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-[12.5px] tabular-nums text-[#4E585E]">{app.referenceNo}</span>
                      <StatusMark status={app.status} />
                    </span>
                    <span className="block mt-1.5 font-semibold text-[15px] text-[#141517]">{app.applicantName}</span>
                    <span className="block text-[13px] text-[#2A2E31] tabular-nums">
                      {app.vehicleTitle} · {peso(app.vehiclePrice)} · {app.financingTermMonths ?? '-'} months
                      {app.downPayment ? ` · ${peso(app.downPayment)} down` : ''}
                    </span>
                    <span className="block text-[12px] text-[#6B767D]">Submitted {shortDate(app.submittedAt)}</span>
                  </span>
                  <span className="flex items-center gap-2 shrink-0">
                    <span className={`text-[12.5px] font-medium ${summary.tone === 'good' ? 'text-[#1B7F35]' : summary.tone === 'bad' ? 'text-[#B42318]' : 'text-[#4E585E]'}`}>
                      {summary.text}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-[#4E585E] transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" />
                  </span>
                </button>

                <div id={`docs-${app.id}`} className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] ${expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                  <div className="overflow-hidden" inert={!expanded}>
                    {(app.documents || []).length === 0 ? (
                      <p className="pb-4 text-[13px] text-[#4E585E]">This application was sent before documents were required.</p>
                    ) : (
                      <ul className="border-t border-[#DDE3E6] mb-4">
                        {(app.documents || []).map((d, i) => (
                          <li key={d.label} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 border-b border-[#DDE3E6]">
                            <FileText className="w-4 h-4 text-[#4E585E] shrink-0" aria-hidden="true" />
                            <div className="min-w-0 flex-1">
                              <p className="text-[14px] font-medium text-[#141517]">{d.label}</p>
                              <p className="text-[12.5px] text-[#4E585E] truncate">
                                {d.fileName ? (
                                  <>
                                    {d.url ? (
                                      <a href={d.url} target="_blank" rel="noopener" className="text-[#1D5FD1] underline underline-offset-2">{d.fileName}</a>
                                    ) : (
                                      d.fileName
                                    )}
                                    {d.addedByAdmin ? ' · uploaded by admin' : d.resubmittedAt ? ' · new copy from the client' : ''}
                                  </>
                                ) : (
                                  'Not submitted yet. Upload it when the client hands it in.'
                                )}
                              </p>
                              {d.status === 'rejected' && d.reason && <p className="text-[12.5px] text-[#B42318]">Rejected: {d.reason}</p>}
                            </div>
                            <StatusMark status={!d.fileName ? 'Missing' : d.status === 'approved' ? 'Approved' : d.status === 'rejected' ? 'Rejected' : 'Pending'} />
                            {(!d.fileName || d.status === 'rejected') && (
                              <label className={`${btn.outline} inline-flex items-center gap-1.5 focus-within:outline focus-within:outline-2 focus-within:outline-[#1D5FD1]`}>
                                <Upload className="w-4 h-4" aria-hidden="true" />
                                {d.fileName ? 'Upload replacement' : 'Upload for client'}
                                <input
                                  type="file"
                                  accept="image/*,application/pdf"
                                  className="sr-only"
                                  aria-label={`Upload ${d.label} for ${app.applicantName}`}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    e.target.value = '';
                                    if (!file) return;
                                    const problem = checkUpload(file);
                                    if (problem) return showToast('Upload failed', problem, 'error');
                                    attachDocumentForClient(app.id, i, file);
                                  }}
                                />
                              </label>
                            )}
                            {d.fileName && d.status !== 'approved' && d.status !== 'rejected' && (
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
                    {canApproveApp && (
                      <button className={`${btn.primary} mb-5 flex items-center gap-1.5`} onClick={() => updateApplicationStatus(app.id, 'approved')}>
                        <Check className="w-4 h-4" aria-hidden="true" />
                        Approve application &amp; reserve
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
