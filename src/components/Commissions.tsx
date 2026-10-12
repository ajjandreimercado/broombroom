import React, { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { StatusMark } from './StatusMark.tsx';
import { COMMISSION_RATE } from '../data/mockData.ts';
import { FileCheck2 } from 'lucide-react';

const MAX_PROOF_BYTES = 10 * 1024 * 1024;
const peso = (n: number) => `₱${n.toLocaleString()}`;

// Agent commissions. Agents read them; the admin pays each one and attaches the proof of payment.
export const Commissions: React.FC<{ mode: 'agent' | 'admin'; compact?: boolean }> = ({ mode, compact = false }) => {
  const { commissions, payCommission, navigateTo } = useApp();
  const [error, setError] = useState('');

  const rows = compact ? commissions.slice(0, 4) : commissions;
  const paidTotal = commissions.filter((c) => c.status === 'paid').reduce((sum, c) => sum + c.amount, 0);
  const pendingTotal = commissions.filter((c) => c.status === 'pending').reduce((sum, c) => sum + c.amount, 0);

  const attachProof = (id: string, file: File | undefined) => {
    if (!file) return;
    if (!/^(image\/|application\/pdf$)/.test(file.type)) {
      setError(`${file.name} is not a photo or PDF. Attach an image or a PDF of the payment.`);
      return;
    }
    if (file.size > MAX_PROOF_BYTES) {
      setError(`${file.name} is over 10 MB. Attach a smaller file.`);
      return;
    }
    setError('');
    payCommission(id, file.name);
  };

  return (
    <section aria-labelledby={`commissions-${mode}`}>
      <div className="flex flex-wrap items-end justify-between gap-3 pb-3 border-b-2 border-[#141517]">
        <h2 id={`commissions-${mode}`} className="font-display text-[22px] leading-none text-[#141517]">
          {mode === 'admin' ? 'Agent commissions' : 'Commissions'}
        </h2>
        {compact ? (
          <button
            onClick={() => navigateTo('seller', { sellerTab: 'commissions' })}
            className="text-[13px] font-semibold text-[#141517] underline decoration-[#8C989F] hover:decoration-[#141517] underline-offset-4 cursor-pointer"
          >
            All commissions
          </button>
        ) : (
          <p className="text-[13px] text-[#4E585E] tabular-nums">
            Paid <strong className="text-[#141517]">{peso(paidTotal)}</strong> · Awaiting{' '}
            <strong className="text-[#141517]">{peso(pendingTotal)}</strong> · Demo rate {COMMISSION_RATE * 100}% of the sale price
          </p>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-4 text-[13px] text-[#B42318] border border-[#B42318] bg-white px-4 py-3">{error}</p>
      )}

      {rows.length === 0 ? (
        <p className="py-10 text-[14px] text-[#4E585E]">
          No commissions yet. A commission appears here when an admin marks one of your sales as completed.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px] min-w-[720px]">
            <thead>
              <tr>
                <th className="gb-label py-3 font-semibold">Sale</th>
                <th className="gb-label py-3 font-semibold text-right">Sale price</th>
                <th className="gb-label py-3 font-semibold text-right">Commission</th>
                <th className="gb-label py-3 font-semibold pl-6">Status</th>
                <th className="gb-label py-3 font-semibold">Proof of payment</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {rows.map((c) => (
                <tr key={c.id} className="border-t border-[#C9D1D6] align-top">
                  <td className="py-4 pr-4">
                    <p className="font-semibold text-[#141517]">{c.vehicleTitle}</p>
                    <p className="text-[12px] text-[#4E585E] mt-0.5">
                      {c.applicationRef} · Client: {c.clientName}
                    </p>
                  </td>
                  <td className="py-4 text-right text-[#2A2E31] whitespace-nowrap">{peso(c.salePrice)}</td>
                  <td className="py-4 text-right font-semibold text-[#141517] whitespace-nowrap">{peso(c.amount)}</td>
                  <td className="py-4 pl-6">
                    <StatusMark status={c.status === 'paid' ? 'Paid' : 'Pending'} />
                  </td>
                  <td className="py-4">
                    {c.status === 'paid' ? (
                      <span className="flex items-start gap-1.5 text-[#141517]">
                        <FileCheck2 className="w-4 h-4 shrink-0 text-[#1B7F35]" aria-hidden="true" />
                        <span>
                          {c.proofFileName}
                          {c.paidAt && (
                            <span className="block text-[12px] text-[#4E585E]">Paid {new Date(c.paidAt).toLocaleDateString()}</span>
                          )}
                        </span>
                      </span>
                    ) : mode === 'admin' ? (
                      <label className="inline-block px-3.5 py-2 bg-[#1D5FD1] hover:bg-[#174CA8] text-white text-[13px] font-semibold cursor-pointer transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#1D5FD1]">
                        Pay &amp; attach proof
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          className="sr-only"
                          aria-label={`Attach proof of payment for ${c.applicationRef}`}
                          onChange={(e) => {
                            attachProof(c.id, e.target.files?.[0]);
                            e.target.value = '';
                          }}
                        />
                      </label>
                    ) : (
                      <span className="text-[#4E585E]">Awaiting payout from admin</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
