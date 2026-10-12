import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { motion } from 'motion/react';
import { indicatorTransition } from '../motion.ts';
import { VehicleCard } from '../components/VehicleCard.tsx';
import { VehicleCategory } from '../types.ts';
import { StampedLog, LogEntry } from '../components/StampedLog.tsx';
import { ArrowRight, ArrowUpRight, MapPin } from 'lucide-react';

export const IntroView: React.FC = () => {
  const { vehicles, navigateTo, updateFilter } = useApp();

  const [heroSearch, setHeroSearch] = useState('');
  const [heroCategory, setHeroCategory] = useState<VehicleCategory>('all');
  const [heroBudget, setHeroBudget] = useState<string>('all');
  const [activeCategoryTab, setActiveCategoryTab] = useState<VehicleCategory>('all');

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (heroSearch.trim()) updateFilter('searchQuery', heroSearch.trim());
    if (heroCategory !== 'all') updateFilter('category', heroCategory);
    if (heroBudget !== 'all') {
      const n = parseInt(heroBudget, 10);
      if (!isNaN(n)) updateFilter('maxPrice', n);
    }
    navigateTo('marketplace');
  };

  const spotlightVehicles = useMemo(() => {
    const available = vehicles.filter((v) => v.status === 'available');
    if (activeCategoryTab === 'all') return available.slice(0, 6);
    const filtered = available.filter((v) => v.category === activeCategoryTab);
    return filtered.length > 0 ? filtered.slice(0, 6) : available.slice(0, 6);
  }, [vehicles, activeCategoryTab]);

  const heroVehicle = useMemo(() => vehicles.find((v) => v.price > 2000000) || vehicles[0], [vehicles]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      cars: 0,
      motorcycles: 0,
      trucks: 0,
      ebikes: 0,
      scooters: 0,
      atvs: 0,
    };
    vehicles.forEach((v) => {
      if (counts[v.category] !== undefined) {
        counts[v.category]++;
      }
    });
    return counts;
  }, [vehicles]);

  const categoryIndex: { id: Exclude<VehicleCategory, 'all'>; label: string }[] = [
    { id: 'cars', label: 'Cars' },
    { id: 'motorcycles', label: 'Motorcycles' },
    { id: 'trucks', label: 'Trucks' },
    { id: 'ebikes', label: 'E-bikes' },
    { id: 'scooters', label: 'Scooters' },
    { id: 'atvs', label: 'ATVs' },
  ];

  const categoryTabs: { id: VehicleCategory; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'cars', label: 'Cars' },
    { id: 'trucks', label: 'Trucks' },
    { id: 'motorcycles', label: 'Motorcycles' },
    { id: 'ebikes', label: 'E-bikes' },
  ];

  const peso = (n: number) =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(n);

  const fieldBase = 'w-full bg-transparent text-[16px] text-[#141517] font-medium outline-none py-2 cursor-pointer';

  return (
    <div className="bg-[#F7F8F8]">
      {/* Hero: the booklet's first page */}
      <section className="border-b border-[#141517]">
        <div className="gb-container grid grid-cols-1 lg:grid-cols-12 lg:divide-x divide-[#141517]">
          {/* Headline + search form */}
          <div className="lg:col-span-7 pt-10 sm:pt-14 lg:pt-20 pb-10 lg:pb-14 lg:pr-12 flex flex-col">
            <h1 className="font-display text-[clamp(2.6rem,6.2vw,5.4rem)] leading-[0.95] text-[#141517] max-w-[11ch]">
              Find the ride. Apply on the spot.
            </h1>
            <p className="mt-6 text-[16px] sm:text-[17px] leading-relaxed text-[#4E585E] max-w-[52ch]">
              Cars, motorcycles, trucks, e-bikes, scooters and ATVs from agents across the Philippines.
              Compare up to four side by side, then apply with cash or financing without leaving the listing.
            </p>

            {/* Search, set as a ruled form row */}
            <form onSubmit={handleHeroSearch} className="mt-10 lg:mt-auto lg:pt-12" aria-label="Search vehicles">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-[0.9fr_0.9fr_1.4fr_auto] border-y-2 border-[#141517]">
                <label className="block pt-3 pb-1 border-b sm:border-r md:border-b-0 border-[#C9D1D6] sm:pr-4">
                  <span className="gb-label">Looking for</span>
                  <select value={heroCategory} onChange={(e) => setHeroCategory(e.target.value as VehicleCategory)} className={fieldBase}>
                    <option value="all">Any vehicle</option>
                    <option value="cars">Cars</option>
                    <option value="trucks">Trucks</option>
                    <option value="motorcycles">Motorcycles</option>
                    <option value="ebikes">E-bikes</option>
                    <option value="scooters">Scooters</option>
                    <option value="atvs">ATVs</option>
                  </select>
                </label>
                <label className="block pt-3 pb-1 border-b md:border-b-0 md:border-r border-[#C9D1D6] sm:pl-4 md:pr-4">
                  <span className="gb-label">Budget up to</span>
                  <select value={heroBudget} onChange={(e) => setHeroBudget(e.target.value)} className={`${fieldBase} tabular-nums`}>
                    <option value="all">Any budget</option>
                    <option value="800000">₱800,000</option>
                    <option value="1500000">₱1,500,000</option>
                    <option value="2500000">₱2,500,000</option>
                    <option value="4000000">₱4,000,000</option>
                    <option value="8000000">₱8,000,000</option>
                  </select>
                </label>
                <label className="block pt-3 pb-1 sm:col-span-2 md:col-span-1 md:pl-4 md:pr-4">
                  <span className="gb-label">Make, model or keyword</span>
                  <input
                    type="text"
                    placeholder="e.g. Ranger Raptor"
                    value={heroSearch}
                    onChange={(e) => setHeroSearch(e.target.value)}
                    className="w-full bg-transparent text-[16px] text-[#141517] font-medium outline-none py-2"
                  />
                </label>
                <button
                  type="submit"
                  className="sm:col-span-2 md:col-span-1 my-3 flex items-center justify-center gap-2 px-7 py-4 bg-[#1D5FD1] hover:bg-[#174CA8] text-white font-semibold text-[15px] cursor-pointer"
                >
                  Search
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </form>
          </div>

          {/* One real listing, shown as its record */}
          {heroVehicle && (
            <button
              type="button"
              onClick={(e) => {
                const img = e.currentTarget.querySelector('img');
                if (img) img.style.viewTransitionName = 'listing-photo';
                navigateTo('vehicle_detail', { vehicleId: heroVehicle.id });
              }}
              className="gb-plate group lg:col-span-5 text-left flex flex-col pb-10 lg:pb-0 cursor-pointer"
              aria-label={`View ${heroVehicle.title}`}
            >
              <div className="relative flex-1 min-h-[280px] sm:min-h-[360px] overflow-hidden bg-[#EEF1F2]">
                <img src={heroVehicle.images[0]} alt="" className="absolute inset-0 w-full h-full object-cover" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 border-t border-[#141517] bg-white">
                <div className="p-4 sm:col-span-2 border-b border-[#C9D1D6]">
                  <p className="text-[17px] font-semibold text-[#141517] group-hover:underline decoration-[#1D5FD1] decoration-2 underline-offset-4">
                    {heroVehicle.title}
                  </p>
                </div>
                <div className="p-4">
                  <span className="gb-label">Price</span>
                  <p className="mt-1.5 font-display text-[20px] lg:text-[clamp(17px,1.55vw,22px)] leading-none tabular-nums text-[#141517] whitespace-nowrap">{peso(heroVehicle.price)}</p>
                </div>
                <div className="p-4 min-w-0 border-t sm:border-t-0 sm:border-l border-[#C9D1D6]">
                  <span className="gb-label">Location</span>
                  <p className="mt-1 text-[14px] text-[#141517] truncate flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    {heroVehicle.location.split(',')[0]}
                  </p>
                </div>
              </div>
            </button>
          )}
        </div>
      </section>

      {/* Category index */}
      <nav aria-label="Browse by category" className="border-b border-[#141517] bg-white">
        <div className="gb-container"><div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-[#C9D1D6] border-x border-[#C9D1D6]">
          {categoryIndex.map((cat, i) => (
            <button
              key={cat.id}
              onClick={() => {
                updateFilter('category', cat.id);
                navigateTo('marketplace');
              }}
              className="group relative text-left py-5 px-4 bg-white cursor-pointer hover:bg-[#F7F8F8] min-w-0"
            >
              <span className="block font-display text-[16px] sm:text-[17px] text-[#141517]">{cat.label}</span>
              <span className="block mt-1 text-[12px] tabular-nums text-[#4E585E]">{categoryCounts[cat.id]} listed</span>
              <span
                className="absolute left-0 right-0 bottom-0 h-[3px] bg-[#1B7F35] scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300"
                aria-hidden="true"
              />
            </button>
          ))}
        </div></div>
      </nav>

      {/* The purchase, as service intervals */}
      <PurchaseIntervals onStart={() => navigateTo('marketplace')} onLearn={() => navigateTo('how_it_works')} />

      {/* Listings */}
      <section className="gb-container py-16 sm:py-24" aria-labelledby="spotlight-heading">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-2">
          <h2 id="spotlight-heading" className="font-display text-[clamp(1.8rem,3.4vw,2.8rem)] leading-none text-[#141517]">
            On the lot this week
          </h2>
          <div className="flex items-stretch gap-6 overflow-x-auto scrollbar-none -mx-4 px-4 md:mx-0 md:px-0" role="tablist" aria-label="Filter by category">
            {categoryTabs.map((tab) => {
              const active = activeCategoryTab === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveCategoryTab(tab.id)}
                  className={`relative shrink-0 pb-2 text-[14px] cursor-pointer whitespace-nowrap ${active ? 'text-[#141517] font-semibold' : 'text-[#4E585E] hover:text-[#141517]'}`}
                >
                  {tab.label}
                  {active && <motion.span layoutId="lot-tab" transition={indicatorTransition} className="absolute left-0 right-0 bottom-0 h-[3px] bg-[#1B7F35]" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </div>

        <div key={activeCategoryTab} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12 mt-6">
          {spotlightVehicles.map((vehicle, i) => (
            <div key={vehicle.id} className="gb-rise flex" style={{ animationDelay: `${i * 50}ms` }}>
              <VehicleCard vehicle={vehicle} />
            </div>
          ))}
        </div>

        <div className="mt-14 pt-5 border-t-2 border-[#141517] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-[14px] text-[#4E585E]">
            <span className="font-semibold text-[#141517] tabular-nums">{vehicles.length}</span> vehicles listed across the Philippines
          </p>
          <button onClick={() => navigateTo('marketplace')} className="group flex items-center gap-1.5 text-[14px] font-semibold text-[#141517] cursor-pointer w-fit">
            <span className="underline decoration-[#141517] decoration-1 underline-offset-4">Browse the marketplace</span>
            <ArrowUpRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
          </button>
        </div>
      </section>
    </div>
  );
};

/* The buying steps as a service log, stamped as it scrolls in:
   the landing page's one authored motion moment. */
const intervals: LogEntry[] = [
  { label: 'Step 1', title: 'Search and compare', body: 'Filter by type, budget, region and condition. Put up to four vehicles side by side.', stamp: 'Found' },
  { label: 'Step 2', title: 'Message the agent', body: 'Ask about the unit, its papers or a viewing in the built-in chat.', stamp: 'Asked' },
  { label: 'Step 3', title: 'Apply on the listing', body: 'Choose cash or financing, set your term and down payment, and send it to the agent.', stamp: 'Applied' },
  { label: 'Step 4', title: 'Track it to the keys', body: 'Follow the application from submitted to approved in your account.', stamp: 'Approved' },
];

const PurchaseIntervals: React.FC<{ onStart: () => void; onLearn: () => void }> = ({ onStart, onLearn }) => (
  <section className="bg-white border-b border-[#141517]" aria-labelledby="intervals-heading">
    <div className="gb-container py-16 sm:py-24 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12">
      <div className="lg:col-span-4">
        <h2 id="intervals-heading" className="font-display text-[clamp(1.8rem,3.4vw,2.8rem)] leading-none text-[#141517]">
          From listing to keys, logged.
        </h2>
        <p className="mt-5 text-[16px] leading-relaxed text-[#4E585E] max-w-[38ch]">
          Every step happens here, and each one is recorded in your account like a service booklet.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button onClick={onStart} className="px-5 py-3 bg-[#141517] hover:bg-[#2A2E31] text-white text-[14px] font-semibold cursor-pointer">
            Start browsing
          </button>
          <button onClick={onLearn} className="px-5 py-3 border border-[#141517] text-[#141517] hover:bg-[#F7F8F8] text-[14px] font-semibold cursor-pointer">
            How it works
          </button>
        </div>
      </div>
      <div className="lg:col-span-8">
        <StampedLog entries={intervals} />
      </div>
    </div>
  </section>
);
