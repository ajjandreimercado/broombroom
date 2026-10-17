import React from 'react';
import { useApp } from '../context/AppContext.tsx';
import { GroomBroomLogo } from './GroomBroomLogo.tsx';
import { portalUrl } from '../portals.ts';
import { VehicleCategory } from '../types.ts';
import { CONTACT_EMAIL } from '../data/constants.ts';

export const Footer: React.FC = () => {
  const { navigateTo, updateFilter } = useApp();

  const handleCategoryClick = (cat: Exclude<VehicleCategory, 'all'>) => {
    updateFilter('category', cat);
    navigateTo('marketplace');
  };

  const colLabel = 'gb-label !text-[#8C989F] block mb-4';
  const colLink = 'block text-[14px] text-[#C9D1D6] hover:text-white hover:underline decoration-[#1D5FD1] decoration-2 underline-offset-4 cursor-pointer mb-2.5 w-fit text-left';

  const columns: { title: string; links: { label: string; onClick: () => void }[] }[] = [
    {
      title: 'Categories',
      links: [
        { label: 'Cars', onClick: () => handleCategoryClick('cars') },
        { label: 'Motorcycles', onClick: () => handleCategoryClick('motorcycles') },
        { label: 'Trucks', onClick: () => handleCategoryClick('trucks') },
        { label: 'E-bikes', onClick: () => handleCategoryClick('ebikes') },
        { label: 'Scooters', onClick: () => handleCategoryClick('scooters') },
        { label: 'ATVs', onClick: () => handleCategoryClick('atvs') },
      ],
    },
    {
      title: 'Explore',
      links: [
        { label: 'Marketplace', onClick: () => navigateTo('marketplace') },
        { label: 'Deals', onClick: () => navigateTo('deals') },
        { label: 'How it works', onClick: () => navigateTo('how_it_works') },
        { label: 'Agent sign-in', onClick: () => window.location.assign(portalUrl('seller')) },
      ],
    },
    {
      title: 'Support',
      links: [
        { label: 'Help center', onClick: () => navigateTo('help') },
        { label: 'Terms of use', onClick: () => navigateTo('terms') },
        { label: 'Privacy policy', onClick: () => navigateTo('privacy') },
      ],
    },
  ];

  return (
    <footer className="bg-[#141517] text-[#C9D1D6]">
      <div className="gb-container pt-16 pb-8">
        <div className="grid grid-cols-2 md:grid-cols-12 gap-x-8 gap-y-10 pb-14">
          <div className="col-span-2 md:col-span-5">
            <button
              onClick={() => navigateTo('intro')}
              className="cursor-pointer inline-flex hover:opacity-80"
              aria-label="Broom Broom home"
            >
              <GroomBroomLogo size="lg" variant="dark" />
            </button>
            <p className="mt-6 font-display text-[22px] leading-tight text-white max-w-[18ch]">
              Find the ride. Apply on the spot.
            </p>
            <a href={`mailto:${CONTACT_EMAIL}`} className="mt-4 inline-block text-[14px] text-[#C9D1D6] hover:text-white underline decoration-[#4E585E] underline-offset-4">
              {CONTACT_EMAIL}
            </a>
          </div>
          {columns.map((col) => (
            <div key={col.title} className="md:col-span-2 last:col-span-2 md:last:col-span-3">
              <span className={colLabel}>{col.title}</span>
              {col.links.map((l) => (
                <button key={l.label} onClick={l.onClick} className={colLink}>
                  {l.label}
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className="pt-6 border-t border-[#3A4044] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[13px] text-[#8C989F]">
          <p>© 2026 Broom Broom. A Happy Ride.</p>
          <p className="tabular-nums">Prices in Philippine pesos (₱)</p>
        </div>
      </div>
    </footer>
  );
};
