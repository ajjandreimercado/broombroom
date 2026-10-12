import React from 'react';
import { useApp } from '../context/AppContext.tsx';
import { VehicleCard } from '../components/VehicleCard.tsx';
import { ArrowRight } from 'lucide-react';

export const DealsView: React.FC = () => {
  const { vehicles, navigateTo } = useApp();

  const dealVehicles = vehicles.filter((v) => v.isDeal && v.status === 'available');

  return (
    <div className="bg-[#F7F8F8] pb-24">
      <section className="border-b border-[#141517]">
        <div className="gb-container pt-12 sm:pt-16 pb-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
          <div className="lg:col-span-7">
            <h1 className="font-display text-[clamp(2.4rem,5.4vw,4.4rem)] leading-[0.95] text-[#141517]">
              Deals
            </h1>
            <p className="mt-5 text-[16px] sm:text-[17px] leading-relaxed text-[#4E585E] max-w-[52ch]">
              Price reductions, promotional financing and dealer incentives on listed vehicles.
            </p>
          </div>
          <div className="lg:col-span-5 flex flex-wrap lg:justify-end items-end gap-6">
            <p className="text-[14px] text-[#4E585E]">
              <span className="font-display text-[22px] text-[#141517] tabular-nums mr-1.5">{dealVehicles.length}</span>
              offers live
            </p>
            <button
              onClick={() => navigateTo('marketplace')}
              className="group inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#141517] cursor-pointer"
            >
              <span className="underline decoration-[#141517] decoration-1 underline-offset-4">Full inventory</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>

      <div className="gb-container pt-10">
        {dealVehicles.length === 0 ? (
          <div className="border-t-2 border-[#141517] py-16 max-w-xl">
            <h2 className="font-display text-[24px] text-[#141517]">No offers running right now.</h2>
            <p className="mt-2 text-[15px] text-[#4E585E]">Sellers post new deals often. Meanwhile, the full inventory is open.</p>
            <button
              onClick={() => navigateTo('marketplace')}
              className="mt-6 px-5 py-3 bg-[#141517] hover:bg-[#2A2E31] text-white text-[14px] font-semibold cursor-pointer"
            >
              Browse inventory
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
            {dealVehicles.map((vehicle) => (
              <VehicleCard key={vehicle.id} vehicle={vehicle} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
