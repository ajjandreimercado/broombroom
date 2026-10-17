import React, { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { AnimatePresence, motion } from 'motion/react';
import { backdropMotion, modalMotion } from '../motion.ts';
import { X, AlertTriangle } from 'lucide-react';
import { VehicleReport } from '../types.ts';

export const ReportModal: React.FC = () => {
  const { reportModalVehicle, setReportModalVehicle, submitReport, currentUser } = useApp();

  const [reason, setReason] = useState<VehicleReport['reason']>('Misleading information');
  const [details, setDetails] = useState('');
  const [reporterEmail, setReporterEmail] = useState(currentUser?.email || '');


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportModalVehicle || !details.trim()) return;

    submitReport({
      vehicleId: reportModalVehicle.id,
      vehicleTitle: reportModalVehicle.title,
      reportedBy: currentUser?.name || 'Anonymous User',
      reportedEmail: reporterEmail.trim(),
      reason,
      details: details.trim(),
    });
  };

  const inputClass = 'w-full px-3.5 py-2.5 text-[13px] border border-[#C9D1D6] rounded-[2px] bg-[#EEF1F2] text-[#141517] placeholder:text-[#6B767D] focus:border-[#1D5FD1] focus:ring-0 outline-none transition-colors duration-150';
  const labelClass = 'block text-[12px] font-semibold text-[#4E585E] mb-1.5';

  return (
    <AnimatePresence>
    {reportModalVehicle && (
    <motion.div
      key="report"
      {...backdropMotion}
      className="fixed inset-0 z-50 bg-[#141517]/50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) setReportModalVehicle(null); }}
    >
      <motion.div {...modalMotion} role="dialog" aria-modal="true" aria-label="Report this listing" className="w-full max-w-[480px] bg-[#F7F8F8] border border-[#141517] overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b border-[#DDE3E6] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-[2px] bg-white border border-[#B42318] flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5 text-[#B42318]" />
            </div>
            <h3 className="text-[14px] font-semibold text-[#141517]">Report Listing</h3>
          </div>
          <button
            onClick={() => setReportModalVehicle(null)}
            className="p-1.5 rounded-[2px] text-[#6B767D] hover:text-[#141517] hover:bg-[#EEF1F2] transition-colors duration-150 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* Vehicle preview */}
          <div className="flex items-center gap-3 p-3 bg-[#EEF1F2] rounded-[2px] border border-[#DDE3E6]">
            <img
              src={reportModalVehicle.images[0]}
              alt={reportModalVehicle.title}
              className="w-14 h-10 object-cover rounded-[2px] bg-[#C9D1D6] shrink-0"
            />
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-[#141517] truncate">{reportModalVehicle.title}</p>
              <p className="text-[11px] text-[#6B767D] truncate">{reportModalVehicle.sellerName}</p>
            </div>
          </div>

          <div>
            <label className={labelClass}>Reason</label>
            <select aria-label="Reason"
              value={reason}
              onChange={(e) => setReason(e.target.value as VehicleReport['reason'])}
              className={inputClass}
              style={{ backgroundImage: 'none' }}
            >
              <option value="Misleading information">Misleading information</option>
              <option value="Suspicious listing">Suspicious listing / scam risk</option>
              <option value="Incorrect price">Incorrect price</option>
              <option value="Incorrect vehicle information">Incorrect vehicle information</option>
              <option value="Prohibited content">Prohibited content or stolen vehicle</option>
              <option value="Other">Other concern</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Details</label>
            <textarea aria-label="Details"
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Provide specific details to help our team investigate..."
              className={inputClass + ' resize-none'}
              required
            />
          </div>

          <div>
            <label className={labelClass}>Your email (for updates)</label>
            <input aria-label="Your email (for updates)"
              type="email"
              value={reporterEmail}
              onChange={(e) => setReporterEmail(e.target.value)}
              className={inputClass}
              required
            />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => setReportModalVehicle(null)}
              className="flex-1 py-2.5 text-[13px] font-semibold border border-[#C9D1D6] rounded-[2px] text-[#4E585E] hover:bg-[#EEF1F2] transition-colors duration-150 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 text-[13px] font-semibold bg-[#B42318] hover:bg-[#B42318] text-white rounded-[2px] transition-colors duration-150 cursor-pointer"
            >
              Submit Report
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
    )}
    </AnimatePresence>
  );
};
