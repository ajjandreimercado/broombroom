import React from 'react';
import { useApp } from '../context/AppContext.tsx';
import { portalUrl } from '../portals.ts';
import { StampedLog, LogEntry } from '../components/StampedLog.tsx';
import {
  Search,
  MessageSquare,
  FileCheck2,
  CalendarCheck,
  CreditCard,
  KeyRound,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

export const HowItWorksView: React.FC = () => {
  const { navigateTo } = useApp();

  const buyerSteps = [
    {
      num: '01',
      title: 'Browse & Filter Inventory',
      desc: 'Explore curated vehicles across cars, motorcycles, pickup trucks, e-bikes, and scooters with clean LTO documentation and verified mileage history.',
      icon: Search,
    },
    {
      num: '02',
      title: 'Inquire Directly with Agents',
      desc: 'Connect in real time with certified dealerships and verified private owners. Request service logs, live walk-around videos, and reserve status.',
      icon: MessageSquare,
    },
    {
      num: '03',
      title: 'Structured Purchase Application',
      desc: 'Submit your purchase intent or financing application digitally from the listing, as cash or financing.',
      icon: FileCheck2,
    },
    {
      num: '04',
      title: 'Showroom Viewing & Test Drive',
      desc: 'Schedule an on-site physical inspection. Verify engine stamps, chassis numbers, and road manners before making any financial commitment.',
      icon: CalendarCheck,
    },
    {
      num: '05',
      title: 'Transparent Settlement',
      desc: 'Finalize notarized Deed of Absolute Sale (DOAS) or activate certified bank auto-financing terms with complete peace of mind.',
      icon: CreditCard,
    },
    {
      num: '06',
      title: 'Take Delivery with Confidence',
      desc: 'Receive the original OR/CR and keys directly from the agent.',
      icon: KeyRound,
    },
  ];

  const stamps = ['Found', 'Asked', 'Applied', 'Viewed', 'Settled', 'Released'];
  const entries: LogEntry[] = buyerSteps.map((step, i) => ({
    label: `Step ${i + 1}`,
    title: step.title,
    body: step.desc,
    stamp: stamps[i],
  }));


  return (
    <div className="bg-[#F7F8F8]">
      <section className="border-b border-[#141517]">
        <div className="gb-container pt-12 sm:pt-16 pb-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
          <h1 className="lg:col-span-7 font-display text-[clamp(2.4rem,5.4vw,4.4rem)] leading-[0.95] text-[#141517] max-w-[12ch]">
            How Groom Broom works
          </h1>
          <p className="lg:col-span-5 text-[16px] sm:text-[17px] leading-relaxed text-[#4E585E] max-w-[48ch]">
            Search, message the agent, apply and follow your application to the keys, all from one listing.
          </p>
        </div>
      </section>

      <section className="gb-container py-16 sm:py-20 grid grid-cols-1 lg:grid-cols-12 gap-10" aria-labelledby="journey-heading">
        <div className="lg:col-span-4">
          <h2 id="journey-heading" className="font-display text-[clamp(1.6rem,2.8vw,2.2rem)] leading-none text-[#141517] lg:sticky lg:top-28">
            The client journey, in six stamps.
          </h2>
        </div>
        <div className="lg:col-span-8">
          <StampedLog entries={entries} />
        </div>
      </section>


      <section className="bg-[#141517] text-white">
        <div className="gb-container py-16 sm:py-20 grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
          <div className="lg:col-span-7">
            <h2 className="font-display text-[clamp(1.8rem,3.6vw,3rem)] leading-[1] text-white max-w-[18ch]">
              Ready to showcase your vehicles to qualified clients?
            </h2>
            <p className="mt-4 text-[16px] text-[#C9D1D6] leading-relaxed max-w-[48ch]">
              Publish inventory in minutes, track client inquiries, and access comprehensive sales reports.
            </p>
          </div>
          <div className="lg:col-span-5 flex flex-wrap gap-3 lg:justify-end">
            <button
              onClick={() => window.location.assign(portalUrl('seller'))}
              className="px-6 py-3.5 bg-[#1D5FD1] hover:bg-[#174CA8] text-white font-semibold text-[14px] cursor-pointer flex items-center gap-2"
            >
              List a vehicle
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              onClick={() => navigateTo('marketplace')}
              className="px-6 py-3.5 border border-white/60 hover:border-white hover:bg-white/10 text-white font-semibold text-[14px] cursor-pointer"
            >
              Explore inventory
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
