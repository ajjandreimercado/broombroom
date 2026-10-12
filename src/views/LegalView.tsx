import React from 'react';
import { useApp } from '../context/AppContext.tsx';
import { Shield, FileText, ArrowLeft, ArrowRight } from 'lucide-react';

interface LegalViewProps {
  initialType?: 'terms' | 'privacy';
}

export const LegalView: React.FC<LegalViewProps> = ({ initialType = 'terms' }) => {
  const { currentView, navigateTo } = useApp();

  const isPrivacy = currentView === 'privacy' || initialType === 'privacy';

  return (
    <div className="min-h-screen bg-[#F7F8F8] pb-24">
      {/* Sub-Navigation Bar */}
      <div className="sticky top-[65px] z-20 bg-[#F7F8F8] border-b border-[#C9D1D6]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <button
            onClick={() => navigateTo('marketplace')}
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#2A2E31] hover:text-[#141517] transition-colors group cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#4E585E] group-hover:-translate-x-0.5 transition-transform" />
            <span>Marketplace</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateTo('terms')}
              className={`px-3.5 py-1.5 rounded-[2px] text-xs font-semibold transition-colors cursor-pointer ${
                !isPrivacy
                  ? 'bg-[#141517] text-white border border-[#141517]'
                  : 'text-[#4E585E] hover:text-[#141517] border border-transparent'
              }`}
            >
              Terms of Use
            </button>
            <button
              onClick={() => navigateTo('privacy')}
              className={`px-3.5 py-1.5 rounded-[2px] text-xs font-semibold transition-colors cursor-pointer ${
                isPrivacy
                  ? 'bg-[#141517] text-white border border-[#141517]'
                  : 'text-[#4E585E] hover:text-[#141517] border border-transparent'
              }`}
            >
              Privacy Policy
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 sm:pt-10">
        <div className="border-t-2 border-[#141517] pt-6 space-y-8">
          {!isPrivacy ? (
            /* TERMS OF SERVICE */
            <div className="space-y-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#1D5FD1] tabular-nums">
                  Groom Broom Legal Governance
                </span>
                <h1 className="text-2xl sm:text-4xl font-bold text-[#141517] tracking-tight mt-1.5">
                  Terms and Conditions of Use
                </h1>
                <p className="text-xs text-[#6B767D] mt-1 tabular-nums">Last updated: October 2026</p>
              </div>

              <div className="space-y-6 text-sm text-[#4E585E] leading-relaxed">
                <div>
                  <h2 className="font-display text-[22px] leading-tight text-[#141517] mb-1.5">
                    1. Marketplace Platform Structure & Pre-Applications
                  </h2>
                  <p>
                    Groom Broom operates as a specialized automotive marketplace connecting prospective buyers and verified automotive dealerships or private vehicle owners. Initiating an inquiry or clicking "Apply for this Vehicle" does <strong>not</strong> constitute an automated electronic charge, card deduction, or transfer of vehicle title. Applications represent formal expressions of interest to enable certified sellers to review customer eligibility, schedule physical vehicle viewings and road tests, and structure tailored cash settlements or partner bank auto-loans.
                  </p>
                </div>

                <div>
                  <h2 className="font-display text-[22px] leading-tight text-[#141517] mb-1.5">
                    2. Vehicle Representation & Merchant Verification
                  </h2>
                  <p>
                    All registered merchants certify that listed vehicles possess clean LTO registration records, genuine VIN/chassis identification stamps, and verified odometer readings. Misleading descriptions, salvage history concealment, or unauthorized duplicate listings violate our community trust guidelines and will result in listing removal and account restriction.
                  </p>
                </div>

                <div>
                  <h2 className="font-display text-[22px] leading-tight text-[#141517] mb-1.5">
                    3. On-Site Inspection & Safe Handoff
                  </h2>
                  <p>
                    Buyers are strongly encouraged to carry out an in-person physical inspection and mechanical evaluation before releasing payment. Groom Broom encourages adherence to our published vehicle inspection guides and LTO ownership transfer protocols.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* PRIVACY POLICY */
            <div className="space-y-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#1D5FD1] tabular-nums">
                  Data Governance & Security
                </span>
                <h1 className="text-2xl sm:text-4xl font-bold text-[#141517] tracking-tight mt-1.5">
                  Privacy Policy
                </h1>
                <p className="text-xs text-[#6B767D] mt-1 tabular-nums">Compliant with Philippine Data Privacy Act of 2012</p>
              </div>

              <div className="space-y-6 text-sm text-[#4E585E] leading-relaxed">
                <div>
                  <h2 className="font-display text-[22px] leading-tight text-[#141517] mb-1.5">
                    1. Personal Information Collection
                  </h2>
                  <p>
                    When submitting vehicle purchase applications or creating an account, Groom Broom collects your full name, email address, phone number, and residential delivery address. This information is strictly shared with the specific seller of the vehicle you applied for to facilitate inspection appointments and sales contracts.
                  </p>
                </div>

                <div>
                  <h2 className="font-display text-[22px] leading-tight text-[#141517] mb-1.5">
                    2. Security of Communications
                  </h2>
                  <p>
                    Direct messaging between buyers and sellers is encrypted in transit. We do not sell or monetize personal contact information to third-party telemarketers.
                  </p>
                </div>

                <div>
                  <h2 className="font-display text-[22px] leading-tight text-[#141517] mb-1.5">
                    3. Your Privacy Rights
                  </h2>
                  <p>
                    You retain full rights to request deletion of your account, download stored application records, or withdraw active purchase applications at any time through your User Account console.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="pt-8 border-t border-[#DDE3E6] flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
            <span className="text-[#6B767D] tabular-nums">Questions? Contact legal@groombroom.ph</span>
            <button
              onClick={() => navigateTo('marketplace')}
              className="px-5 py-2.5 bg-[#1D5FD1] hover:bg-[#174CA8] text-white font-bold rounded-[2px] transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span>Return to Inventory</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
