import React from 'react';
import { useApp } from '../context/AppContext.tsx';
import { StatusMark } from './StatusMark.tsx';
import { openQuotation } from './receipt.ts';
import { quoteFigures, quoteLabel, isExpired } from './quote.ts';
import { money } from './accounting/ledger.ts';
import { FileText } from 'lucide-react';

const day = (ymd: string) => new Date(`${ymd}T00:00:00`).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });

// Client: quotations they asked for, with the PDF and a shortcut into the application using the quoted terms.
export const MyQuotations: React.FC = () => {
  const { quotations, currentUser, navigateTo, showToast } = useApp();
  const mine = quotations.filter((q) => q.clientId === currentUser?.id);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-[22px] leading-tight text-[#141517]">
          My Quotations <span className="text-[#6B767D] font-normal">({mine.length})</span>
        </h2>
        <p className="text-xs text-[#4E585E] mt-1">After your vehicle is reserved, the admin team prepares your quotation here. Save it as a PDF anytime.</p>
      </div>

      {mine.length === 0 ? (
        <div className="bg-white p-12 text-center border border-[#C9D1D6]">
          <FileText className="w-6 h-6 mx-auto mb-3 text-[#6B767D]" aria-hidden="true" />
          <p className="font-bold text-[#141517] text-sm">No quotations yet</p>
          <p className="text-xs text-[#4E585E] mt-1">Your quotation appears here once your vehicle is reserved.</p>
          <button onClick={() => navigateTo('marketplace')} className="mt-4 px-4 py-2 bg-[#141517] text-white text-xs font-semibold cursor-pointer">
            Browse vehicles
          </button>
        </div>
      ) : (
        <ul className="space-y-4">
          {mine.map((q) => {
            const f = quoteFigures(q);
            const expired = isExpired(q);
            return (
              <li key={q.id} className="border-t-2 border-[#141517] pt-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <img src={q.vehicleImage} alt="" className="w-20 h-14 object-cover bg-[#202426] shrink-0" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="tabular-nums text-xs font-bold text-[#6B767D]">{q.quoteNo || 'Quotation'}</span>
                        <StatusMark status={quoteLabel(q)} />
                      </div>
                      <h3 className="font-bold text-[#141517] text-sm mt-1">{q.vehicleTitle}</h3>
                      <p className="text-xs text-[#4E585E] mt-0.5">
                        {q.status === 'requested'
                          ? 'The admin team is preparing your quotation.'
                          : q.status === 'accepted'
                          ? `You applied with this quotation${q.applicationRef ? ` (${q.applicationRef})` : ''}.`
                          : expired
                          ? `Expired on ${day(q.validUntil!)}. Ask your agent for an updated one.`
                          : `Valid until ${day(q.validUntil!)}.`}
                      </p>
                    </div>
                  </div>
                  {q.status !== 'requested' && (
                    <div className="flex flex-wrap items-center gap-2.5 sm:justify-end">
                      <button
                        onClick={() => !openQuotation(q) && showToast('Allow pop-ups', 'Your browser blocked the quotation window. Allow pop-ups for this site and try again.', 'error')}
                        className="px-3.5 py-2 bg-[#EEF1F2] hover:bg-[#DDE3E6] text-[#141517] text-xs font-semibold cursor-pointer transition-colors"
                      >
                        View &amp; save PDF
                      </button>
                    </div>
                  )}
                </div>
                {q.status !== 'requested' && (
                  <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 text-[12.5px] tabular-nums">
                    <div><dt className="text-[#4E585E]">Unit price</dt><dd className="font-semibold text-[#141517]">{money(q.unitPrice)}</dd></div>
                    {q.method === 'financing' ? (
                      <>
                        <div><dt className="text-[#4E585E]">Down payment</dt><dd className="font-semibold text-[#141517]">{money(q.downPayment)}</dd></div>
                        <div><dt className="text-[#4E585E]">Amount financed</dt><dd className="font-semibold text-[#141517]">{money(f.amountFinanced)}</dd></div>
                        <div><dt className="text-[#4E585E]">Monthly · {q.termMonths} mo</dt><dd className="font-semibold text-[#141517]">{money(f.monthly)}</dd></div>
                      </>
                    ) : (
                      <div><dt className="text-[#4E585E]">Payment</dt><dd className="font-semibold text-[#141517]">Cash</dd></div>
                    )}
                  </dl>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
