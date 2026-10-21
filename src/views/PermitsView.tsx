import React, { useState } from 'react';
import { Maximize2 } from 'lucide-react';
import { Lightbox } from '../components/Lightbox.tsx';

const img = (file: string) => `${import.meta.env.BASE_URL}permits/${file}`;

// Broom Broom's government registrations and permits, as issued (October 2026). Update the numbers, dates and
// photos here when they are renewed.
const BUSINESS = {
  name: 'Broom Broom Booking Services',
  owner: 'Zebee Dexter Lor Palomo',
  address: 'Purok 1, Bading, Butuan City',
  nature: 'Buy & sell surplus cars (agent)',
};

const DOCS: { title: string; issuer: string; facts: [string, string][]; file: string; wide?: boolean }[] = [
  {
    title: 'Certificate of Business Name Registration',
    issuer: 'Department of Trade and Industry (DTI)',
    facts: [['Business Name No.', '8532913'], ['Valid', 'Oct 5, 2026 to Oct 5, 2031']],
    file: 'dti-business-name.jpg',
  },
  {
    title: 'Business Permit',
    issuer: 'City Government of Butuan',
    facts: [['Permit No.', '2026-17326'], ['Valid until', 'Dec 31, 2026']],
    file: 'business-permit.jpg',
  },
  {
    title: 'BIR Registration',
    issuer: 'Bureau of Internal Revenue (BIR)',
    facts: [['RSN', '103RC20260000008360'], ['Registered', '2026']],
    file: 'bir-registration.jpg',
    wide: true,
  },
];

// Client site: proof that Broom Broom is a registered, permitted business.
export const PermitsView: React.FC = () => {
  const [viewing, setViewing] = useState<number | null>(null); // which document is open in full
  return (
  <div className="bg-[#F7F8F8]">
    <section className="border-b border-[#141517]">
      <div className="gb-container pt-12 sm:pt-16 pb-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
        <h1 className="lg:col-span-7 font-display text-[clamp(2.4rem,5.4vw,4.4rem)] leading-[0.95] text-[#141517] max-w-[14ch]">
          Registered and permitted
        </h1>
        <p className="lg:col-span-5 text-[16px] sm:text-[17px] leading-relaxed text-[#4E585E] max-w-[48ch]">
          Broom Broom is a registered business in Butuan City. These are our current registrations and permits; open any one to see the full document.
        </p>
      </div>
    </section>

    <section className="gb-container pt-10 sm:pt-12" aria-labelledby="business-heading">
      <h2 id="business-heading" className="sr-only">The business</h2>
      <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-y border-[#141517]">
        {[
          ['Registered name', BUSINESS.name],
          ['Proprietor', BUSINESS.owner],
          ['Address', BUSINESS.address],
          ['Nature of business', BUSINESS.nature],
        ].map(([k, v], i) => (
          <div key={k} className={`py-4 sm:pr-4 ${i ? 'border-t sm:border-t-0' : ''} ${i % 2 ? 'sm:pl-4 sm:border-l' : ''} ${i === 2 ? 'lg:pl-4 lg:border-l' : ''} border-[#C9D1D6]`}>
            <dt className="gb-label">{k}</dt>
            <dd className="mt-1.5 text-[15px] font-semibold text-[#141517]">{v}</dd>
          </div>
        ))}
      </dl>
    </section>

    <section className="gb-container py-12 sm:py-16" aria-labelledby="documents-heading">
      <h2 id="documents-heading" className="font-display text-[clamp(1.6rem,2.8vw,2.2rem)] leading-none text-[#141517]">Documents</h2>
      <ul className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {DOCS.map((d, i) => (
          <li key={d.file} className={`bg-white border border-[#C9D1D6] flex flex-col ${d.wide ? 'sm:col-span-2 lg:col-span-1' : ''}`}>
            <button type="button" onClick={() => setViewing(i)} aria-label={`View the full ${d.title}`} className="group block w-full border-b border-[#C9D1D6] bg-[#EEF1F2] cursor-zoom-in focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1D5FD1]">
              <img
                src={img(d.file)}
                alt={`${d.title} issued to ${BUSINESS.name}`}
                loading="lazy"
                decoding="async"
                className={`w-full ${d.wide ? 'aspect-[16/7] object-contain p-4' : 'aspect-[3/4] object-cover object-top'} transition-opacity group-hover:opacity-90`}
              />
            </button>
            <div className="p-4 flex-1 flex flex-col">
              <h3 className="font-semibold text-[15px] text-[#141517]">{d.title}</h3>
              <p className="text-[12.5px] text-[#4E585E]">{d.issuer}</p>
              <dl className="mt-3 space-y-1 text-[13px]">
                {d.facts.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3">
                    <dt className="text-[#4E585E]">{k}</dt>
                    <dd className="font-medium text-[#141517] tabular-nums text-right [overflow-wrap:anywhere]">{v}</dd>
                  </div>
                ))}
              </dl>
              <button type="button" onClick={() => setViewing(i)} className="mt-4 self-start inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#1D5FD1] underline underline-offset-4 cursor-pointer">
                <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" /> View full document
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
    {viewing !== null && (
      <Lightbox
        items={DOCS.map((d) => ({ kind: 'photo' as const, src: img(d.file) }))}
        index={viewing}
        title={DOCS[viewing].title}
        onIndex={setViewing}
        onClose={() => setViewing(null)}
      />
    )}
  </div>
  );
};
