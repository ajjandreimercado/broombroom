import React, { useState } from 'react';
import { useApp, FilterState } from '../context/AppContext.tsx';
import { VehicleCard } from '../components/VehicleCard.tsx';
import { AnimatePresence, motion } from 'motion/react';
import { indicatorTransition, backdropMotion, sheetMotion } from '../motion.ts';
import { VehicleCategory } from '../types.ts';
import {
  Search,
  SlidersHorizontal,
  X,
  RotateCcw,
} from 'lucide-react';

export const MarketplaceView: React.FC = () => {
  const {
    filters,
    updateFilter,
    resetFilters,
    filteredVehicles,
    availableBrands,
    currentView,
  } = useApp();

  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const categories: { label: string; value: VehicleCategory }[] = [
    { label: 'All', value: 'all' },
    { label: 'Cars', value: 'cars' },
    { label: 'Motorcycles', value: 'motorcycles' },
    { label: 'Trucks', value: 'trucks' },
    { label: 'E-Bikes', value: 'ebikes' },
    { label: 'Scooters', value: 'scooters' },
    { label: 'ATVs', value: 'atvs' },
  ];

  const activeFiltersCount = [
    filters.category !== 'all',
    filters.brand !== 'all',
    filters.condition !== 'all',
    filters.transmission !== 'all',
    filters.fuel !== 'all',
    filters.location !== 'all',
    filters.minPrice > 0,
    filters.maxPrice < 20000000,
    filters.searchQuery.trim().length > 0,
  ].filter(Boolean).length;

  const labelClass = 'gb-label block mb-2';
  const selectClass = 'w-full py-2 text-[14px] border-b border-[#8C989F] bg-transparent text-[#141517] font-medium outline-none cursor-pointer hover:border-[#141517]';
  const filterBtnClass = (active: boolean) =>
    `px-2 py-2 text-[12.5px] text-center cursor-pointer outline outline-1 -outline-offset-[0.5px] ${
      active
        ? 'bg-[#141517] text-white outline-[#141517] font-semibold relative z-10'
        : 'bg-transparent text-[#4E585E] outline-[#C9D1D6] hover:text-[#141517] hover:bg-white'
    }`;

  const FilterPanel = () => (
    <div className="space-y-6 text-[13px]">
      {/* Brand */}
      <div>
        <label className={labelClass}>Make / Brand</label>
        <select
          value={filters.brand}
          onChange={(e) => updateFilter('brand', e.target.value)}
          className={selectClass}
        >
          <option value="all">All Brands</option>
          {availableBrands.filter((b) => b !== 'all').map((brand) => (
            <option key={brand} value={brand}>{brand}</option>
          ))}
        </select>
      </div>

      {/* Condition */}
      <div>
        <label className={labelClass}>Condition</label>
        <div className="grid grid-cols-2">
          {['all', 'New', 'Certified Pre-Owned', 'Used'].map((c) => (
            <button
              key={c}
              onClick={() => updateFilter('condition', c)}
              className={filterBtnClass(filters.condition === c)}
            >
              {c === 'all' ? 'Any' : c === 'Certified Pre-Owned' ? 'Certified' : c}
            </button>
          ))}
        </div>
      </div>

      {/* Transmission */}
      <div>
        <label className={labelClass}>Transmission</label>
        <select
          value={filters.transmission}
          onChange={(e) => updateFilter('transmission', e.target.value)}
          className={selectClass}
        >
          <option value="all">Any Transmission</option>
          <option value="Automatic">Automatic</option>
          <option value="Manual">Manual</option>
          <option value="CVT">CVT</option>
          <option value="Dual-Clutch">Dual-Clutch</option>
          <option value="Direct Drive">Direct Drive (EV)</option>
        </select>
      </div>

      {/* Fuel */}
      <div>
        <label className={labelClass}>Powertrain</label>
        <div className="grid grid-cols-2">
          {['all', 'Gasoline', 'Diesel', 'Electric'].map((f) => (
            <button
              key={f}
              onClick={() => updateFilter('fuel', f)}
              className={filterBtnClass(filters.fuel === f)}
            >
              {f === 'all' ? 'Any' : f}
            </button>
          ))}
        </div>
      </div>

      {/* Location */}
      <div>
        <label className={labelClass}>Location</label>
        <select
          value={filters.location}
          onChange={(e) => updateFilter('location', e.target.value)}
          className={selectClass}
        >
          <option value="all">All Locations</option>
          <option value="Manila">Metro Manila</option>
          <option value="Cebu">Cebu City</option>
          <option value="Davao">Davao City</option>
          <option value="Pampanga">Pampanga</option>
          <option value="Laguna">Laguna</option>
        </select>
      </div>

      {/* Price Range */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className={labelClass + ' mb-0'}>Max Price</label>
          <span className="text-[14px] font-semibold text-[#141517] tabular-nums">
            ₱{(filters.maxPrice / 1000000).toFixed(1)}M
          </span>
        </div>
        <input
          type="range"
          min="200000"
          max="20000000"
          step="200000"
          value={filters.maxPrice}
          onChange={(e) => updateFilter('maxPrice', Number(e.target.value))}
          className="w-full cursor-pointer"
          style={{ accentColor: '#1D5FD1' }}
        />
        <div className="flex justify-between text-[11px] text-[#4E585E] mt-1 tabular-nums">
          <span>₱200K</span>
          <span>₱20M</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F7F8F8]">

      {/* Page head: title, search, categories, sort */}
      <div className="border-b border-[#141517] bg-[#F7F8F8]">
        <div className="gb-container pt-10 sm:pt-14">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <h1 className="font-display text-[clamp(2.2rem,5vw,4rem)] leading-[0.95] text-[#141517]">
              {currentView === 'deals' ? 'Deals' : 'Marketplace'}
            </h1>
            <p className="text-[14px] text-[#4E585E] md:pb-1">
              <span className="font-display text-[22px] text-[#141517] tabular-nums mr-1.5">{filteredVehicles.length}</span>
              {filteredVehicles.length === 1 ? 'vehicle matches' : 'vehicles match'}
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-[1fr_auto] border-t-2 border-[#141517]">
            <label className="relative flex items-center gap-3 py-3 md:pr-6">
              <Search className="w-4 h-4 text-[#4E585E] shrink-0" aria-hidden="true" />
              <span className="sr-only">Search vehicles</span>
              <input
                type="text"
                placeholder="Search make, model or location"
                value={filters.searchQuery}
                onChange={(e) => updateFilter('searchQuery', e.target.value)}
                className="w-full bg-transparent text-[16px] text-[#141517] outline-none py-1"
              />
              {filters.searchQuery && (
                <button
                  onClick={() => updateFilter('searchQuery', '')}
                  className="p-1 text-[#4E585E] hover:text-[#141517] cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </label>
            <div className="flex items-center gap-3 border-t md:border-t-0 md:border-l border-[#C9D1D6] py-3 md:pl-6">
              <label className="flex items-center gap-2">
                <span className="gb-label">Sort</span>
                <select
                  value={filters.sortBy}
                  onChange={(e) => updateFilter('sortBy', e.target.value as FilterState['sortBy'])}
                  className="bg-transparent text-[14px] font-medium text-[#141517] outline-none cursor-pointer py-1"
                >
                  <option value="recommended">Featured</option>
                  <option value="newest">Newest</option>
                  <option value="price_asc">Price, low to high</option>
                  <option value="price_desc">Price, high to low</option>
                  <option value="mileage_asc">Mileage, lowest</option>
                </select>
              </label>
              <button
                onClick={() => setMobileFilterOpen(true)}
                className="lg:hidden ml-auto flex items-center gap-2 px-3 py-2 border border-[#141517] text-[13px] font-semibold text-[#141517] cursor-pointer"
              >
                <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
                Filters
                {activeFiltersCount > 0 && (
                  <span className="min-w-[18px] h-[18px] px-1 bg-[#1D5FD1] text-white text-[11px] font-semibold rounded-full grid place-items-center tabular-nums">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="flex items-stretch gap-6 overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0 border-t border-[#C9D1D6]" role="tablist" aria-label="Category">
            {categories.map((cat) => {
              const isSelected = filters.category === cat.value;
              return (
                <button
                  key={cat.value}
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => updateFilter('category', cat.value)}
                  className={`relative shrink-0 py-3.5 text-[14px] cursor-pointer whitespace-nowrap ${
                    isSelected ? 'text-[#141517] font-semibold' : 'text-[#4E585E] hover:text-[#141517]'
                  }`}
                >
                  {cat.label}
                  {isSelected && <motion.span layoutId="market-tab" transition={indicatorTransition} className="absolute left-0 right-0 -bottom-px h-[3px] bg-[#1B7F35]" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="gb-container py-10">
        <div className="flex gap-10">

          {/* Desktop filter column */}
          <aside className="hidden lg:block w-[232px] shrink-0" aria-label="Filters">
            <div className="sticky top-[92px] border-t-2 border-[#141517] pt-4">
              <div className="flex items-center justify-between pb-4">
                <span className="text-[14px] font-semibold text-[#141517]">Filters</span>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={resetFilters}
                    className="text-[12px] text-[#141517] font-medium underline decoration-[#1D5FD1] decoration-2 underline-offset-4 cursor-pointer flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" aria-hidden="true" />
                    Reset ({activeFiltersCount})
                  </button>
                )}
              </div>
              <FilterPanel />
            </div>
          </aside>

          {/* Vehicle grid */}
          <main className="flex-1 min-w-0">
            {filteredVehicles.length === 0 ? (
              <div className="border-t-2 border-[#141517] py-16 grid grid-cols-1 md:grid-cols-[auto_1fr] gap-8 items-start">
                <span className="gb-stamp text-[13px] px-3 py-2 opacity-60">No match</span>
                <div>
                  <h2 className="font-display text-[24px] text-[#141517]">Nothing on the lot fits that.</h2>
                  <p className="mt-2 text-[15px] text-[#4E585E] max-w-[48ch]">
                    Try a wider budget, another region, or clear the filters to see every listing.
                  </p>
                  <button
                    onClick={resetFilters}
                    className="mt-6 px-5 py-3 bg-[#141517] hover:bg-[#2A2E31] text-white font-semibold text-[14px] cursor-pointer"
                  >
                    Clear all filters
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-12">
                {filteredVehicles.map((vehicle) => (
                  <VehicleCard key={vehicle.id} vehicle={vehicle} />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* ── MOBILE FILTER DRAWER ── */}
      <AnimatePresence>
      {mobileFilterOpen && (
        <motion.div
          key="filters"
          {...backdropMotion}
          className="fixed inset-0 z-50 flex items-end justify-center bg-[#141517]/50"
          onClick={(e) => { if (e.target === e.currentTarget) setMobileFilterOpen(false); }}
        >
          <motion.div {...sheetMotion} className="w-full max-w-lg bg-[#F7F8F8] border-t-2 border-[#141517] max-h-[85vh] flex flex-col overflow-hidden">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#DDE3E6] shrink-0">
              <h3 className="font-display text-[18px] text-[#141517]">Filters</h3>
              <button
                onClick={() => setMobileFilterOpen(false)}
                className="p-2 text-[#4E585E] hover:text-[#141517] hover:bg-[#EEF1F2] cursor-pointer"
                aria-label="Close filters"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="px-5 py-5 overflow-y-auto flex-1">
              <FilterPanel />
            </div>

            {/* Actions */}
            <div className="px-5 py-4 border-t border-[#DDE3E6] flex gap-3 shrink-0">
              <button
                onClick={() => { resetFilters(); setMobileFilterOpen(false); }}
                className="flex-1 py-2.5 text-[13px] font-semibold border border-[#141517] text-[#141517] hover:bg-white cursor-pointer transition-colors"
              >
                Reset
              </button>
              <button
                onClick={() => setMobileFilterOpen(false)}
                className="flex-[2] py-2.5 text-[13px] font-semibold bg-[#1D5FD1] text-white hover:bg-[#174CA8] cursor-pointer transition-colors"
              >
                Show {filteredVehicles.length} results
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
};
