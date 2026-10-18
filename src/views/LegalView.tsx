import React from 'react';
import { useApp } from '../context/AppContext.tsx';
import { Shield, FileText, ArrowLeft, ArrowRight } from 'lucide-react';
import { CONTACT_EMAIL } from '../data/constants.ts';

// What the site actually does. Have the company's lawyer review this text before launch.
const TERMS: { h: string; p: string }[] = [
  {
    h: '1. What Broom Broom is',
    p: 'Broom Broom sells the vehicles listed on this site through its sales team and agents. You can browse listings, request a quotation, message an agent and send a purchase application online.',
  },
  {
    h: '2. Applications and payments',
    p: 'Applying is free and charges nothing online. An application tells us you want to buy the vehicle; it is not a sale. The admin team reviews it and your documents; the vehicle is held for you once it is reserved with a reservation payment. After you fill in the Applicant’s Information Sheet, the application is approved or disapproved, and the vehicle is released with its OR and CR. Payments are made directly with Broom Broom, and each payment we receive is acknowledged with a numbered acknowledgement receipt.',
  },
  {
    h: '3. Quotations and financing',
    p: 'A quotation is valid until the date written on it. Monthly amortizations are estimates; financing is subject to the approval of the bank or financing company.',
  },
  {
    h: '4. Listings',
    p: 'We describe each vehicle as accurately as we can. Please inspect the vehicle and its papers (OR/CR) in person before paying. If you see a listing that looks wrong, use Report on the listing.',
  },
  {
    h: '5. Your account',
    p: 'Keep your password private and give true information in your applications. We may suspend accounts that misuse the site.',
  },
];

const PRIVACY: { h: string; p: string }[] = [
  {
    h: '1. What we collect',
    p: 'Your name, email, phone number and address; the documents you upload with an application (IDs, proof of billing, proof of income and similar); your quotations, applications and payments; and your messages with our agents.',
  },
  {
    h: '2. Why we use it',
    p: 'To answer your inquiries, prepare quotations, assess your application and financing, process your purchase and keep the records the law requires.',
  },
  {
    h: '3. Who can see it',
    p: 'The agent assigned to you and the Broom Broom admin team. Messages may be reviewed by the admin team for service quality and safety. Your data is stored with our hosting and database providers and emails are sent through an email service provider; they process it only for us. We do not sell your information.',
  },
  {
    h: '4. How it is protected',
    p: 'Connections to the site are encrypted, passwords are stored hashed, and your uploaded documents can only be opened by you and the admin team.',
  },
  {
    h: '5. Your rights',
    p: 'Under the Philippine Data Privacy Act of 2012 you may ask to see, correct or delete your personal data, or object to its use. You can update your profile and withdraw an application in My Account; for anything else, email us at the address below.',
  },
];

const Sections: React.FC<{ items: { h: string; p: string }[] }> = ({ items }) => (
  <div className="space-y-6 text-sm text-[#4E585E] leading-relaxed">
    {items.map((x) => (
      <div key={x.h}>
        <h2 className="font-display text-[22px] leading-tight text-[#141517] mb-1.5">{x.h}</h2>
        <p>{x.p}</p>
      </div>
    ))}
  </div>
);

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
                  Broom Broom
                </span>
                <h1 className="text-2xl sm:text-4xl font-bold text-[#141517] tracking-tight mt-1.5">
                  Terms and Conditions of Use
                </h1>
                <p className="text-xs text-[#6B767D] mt-1 tabular-nums">Last updated: October 2026</p>
              </div>

              <Sections items={TERMS} />
            </div>
          ) : (
            /* PRIVACY POLICY */
            <div className="space-y-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#1D5FD1] tabular-nums">
                  Broom Broom
                </span>
                <h1 className="text-2xl sm:text-4xl font-bold text-[#141517] tracking-tight mt-1.5">
                  Privacy Policy
                </h1>
                <p className="text-xs text-[#6B767D] mt-1 tabular-nums">Last updated: October 2026</p>
              </div>

              <Sections items={PRIVACY} />
            </div>
          )}

          <div className="pt-8 border-t border-[#DDE3E6] flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
            <span className="text-[#6B767D]">Questions? Contact <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-4 [overflow-wrap:anywhere]">{CONTACT_EMAIL}</a></span>
            <button
              onClick={() => navigateTo('marketplace')}
              className="px-5 py-2.5 bg-[#1D5FD1] hover:bg-[#174CA8] text-white font-bold rounded-[2px] transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span>Back to the marketplace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
