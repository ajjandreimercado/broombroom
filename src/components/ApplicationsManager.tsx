import React, { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { StatusMark } from './StatusMark.tsx';
import { ApplicationStatus } from '../types.ts';
import { X } from 'lucide-react';

// Admin-only: review client purchase applications and move them through their statuses.
export const ApplicationsManager: React.FC = () => {
  const { applications, updateApplicationStatus } = useApp();
  const [respondingAppId, setRespondingAppId] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState<ApplicationStatus>('under_review');
  const [sellerNoteInput, setSellerNoteInput] = useState('');

  const handleUpdateApplication = () => {
    if (!respondingAppId) return;
    updateApplicationStatus(respondingAppId, newStatus, sellerNoteInput.trim());
    setRespondingAppId(null);
    setSellerNoteInput('');
  };

  return (
    <>
              <div className="space-y-6">
                <div className="pb-3 border-b border-[#C9D1D6]">
                  <h2 className="font-display text-[22px] leading-tight text-[#141517]">
                    Client Applications <span className="text-[#6B767D] font-normal">({applications.length})</span>
                  </h2>
                </div>
                <div className="space-y-4">
                  {applications.map((app) => (
                    <div
                      key={app.id}
                      className="border-t-2 border-[#141517] pt-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="tabular-nums text-xs font-bold text-[#6B767D]">
                            {app.referenceNo}
                          </span>
                          <StatusMark status={app.status} />
                        </div>
                        <h3 className="font-bold text-[#141517] text-sm">
                          {app.applicantName} · <span className="text-[#4E585E] font-normal tabular-nums">{app.applicantPhone}</span>
                        </h3>
                        <p className="text-xs text-[#4E585E]">
                          Applied for: <strong>{app.vehicleTitle}</strong> (₱{app.vehiclePrice.toLocaleString()})
                        </p>
                        <p className="text-[11px] text-[#6B767D] tabular-nums">
                          Submitted {new Date(app.submittedAt).toLocaleDateString()} · Method: {app.purchaseMethod.toUpperCase()}
                        </p>
                        {app.documents && app.documents.length > 0 && (
                          <ul className="text-[12px] text-[#2A2E31] mt-2 space-y-0.5">
                            {app.documents.map((d) => (
                              <li key={d.label} className="flex flex-wrap gap-x-2">
                                <span className="text-[#4E585E]">{d.label}:</span>
                                <span className="font-medium">{d.fileName}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {app.notes && (
                          <p className="text-xs bg-[#F7F8F8] border border-[#C9D1D6] p-3 rounded-[2px] text-[#2A2E31] mt-2">
                            <strong>Client Note:</strong> "{app.notes}"
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-center">
                        <button
                          onClick={() => {
                            setRespondingAppId(app.id);
                            setNewStatus(app.status);
                            setSellerNoteInput(app.sellerNotes || '');
                          }}
                          className="px-4 py-2 bg-[#1D5FD1] hover:bg-[#174CA8] text-white font-bold text-xs rounded-[2px] transition-colors cursor-pointer"
                        >
                          Update Status
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

      {/* Update Application Modal */}
      {respondingAppId && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#141517]/50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white p-6 space-y-4 border border-[#141517] animate-modal-in">
            <div className="flex items-center justify-between pb-2 border-b border-[#DDE3E6]">
              <h3 className="font-display text-[18px] leading-tight text-[#141517]">Update Application Progress</h3>
              <button
                onClick={() => setRespondingAppId(null)}
                className="p-1 rounded-[2px] text-[#6B767D] hover:text-[#2A2E31] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="gb-label block mb-2">Status</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as ApplicationStatus)}
                className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517] cursor-pointer"
              >
                <option value="under_review">Under Review</option>
                <option value="contacted">Contacted Client</option>
                <option value="approved">Approved for Viewing/Sale</option>
                <option value="declined">Declined</option>
                <option value="completed">Completed Transaction</option>
              </select>
            </div>

            <div>
              <label className="gb-label block mb-2">
                Agent Response Message / Schedule Details
              </label>
              <textarea
                rows={3}
                value={sellerNoteInput}
                onChange={(e) => setSellerNoteInput(e.target.value)}
                placeholder="e.g. Scheduled viewing for Saturday at 2 PM. Please bring 2 valid IDs."
                className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#DDE3E6]">
              <button
                onClick={() => setRespondingAppId(null)}
                className="px-4 py-2 border border-[#C9D1D6] hover:bg-[#F7F8F8] rounded-[2px] text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateApplication}
                className="px-4 py-2 bg-[#1D5FD1] hover:bg-[#174CA8] text-white rounded-[2px] text-xs font-bold cursor-pointer transition-colors"
              >
                Update Status
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
