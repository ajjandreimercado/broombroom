import React from 'react';
import { useApp } from '../context/AppContext.tsx';
import { AnimatePresence, motion } from 'motion/react';
import { sheetMotion } from '../motion.ts';
import { ArrowLeftRight, X, Plus } from 'lucide-react';

export const CompareDock: React.FC = () => {
  const {
    vehicles,
    comparedVehicleIds,
    toggleCompareVehicle,
    clearCompare,
    compareModalOpen,
    setCompareModalOpen,
    currentUser,
    currentView,
  } = useApp();

  // Compare dock is strictly for buyer role on marketplace / buyer views
  const visible = !(
    comparedVehicleIds.length === 0 ||
    compareModalOpen ||
    currentView === 'seller' ||
    currentView === 'admin' ||
    (currentUser && currentUser.role !== 'buyer')
  );

  const comparedVehicles = comparedVehicleIds
    .map((id) => vehicles.find((v) => v.id === id))
    .filter(Boolean);

  return (
    <AnimatePresence>
    {visible && (
    <motion.div
      key="dock"
      {...sheetMotion}
      className="fixed bottom-4 sm:bottom-6 inset-x-0 mx-auto w-fit z-40 max-w-[94vw]"
      style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="bg-[#141517] border border-[#141517] px-3 sm:px-5 py-2.5 sm:py-3 flex items-center gap-3 sm:gap-5 text-white">
        
        {/* Left Indicator & Thumbnails */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 shrink-0 hidden md:flex">
                        <span className="gb-label !text-[#C9D1D6]">
              Compare
            </span>
          </div>

          {/* Vehicle mini-chips */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {comparedVehicles.map((vehicle) => {
              if (!vehicle) return null;
              return (
                <div
                  key={vehicle.id}
                  className="relative group w-10 h-10 sm:w-12 sm:h-12 rounded-[2px] overflow-hidden border border-[#2A2E31] bg-[#1C1F21] shrink-0"
                  title={`${vehicle.title} (Click X to remove)`}
                >
                  <img
                    src={vehicle.images[0]}
                    alt={vehicle.title}
                    className="w-full h-full object-cover"
                  />
                  {/* Remove hover button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCompareVehicle(vehicle.id);
                    }}
                    className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-white"
                    title="Remove from comparison"
                    aria-label={`Remove ${vehicle.title}`}
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              );
            })}

            {/* Empty slots up to 4 */}
            {Array.from({ length: 4 - comparedVehicles.length }).map((_, idx) => (
              <div
                key={`empty-${idx}`}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-[2px] border border-dashed border-[#4E585E] flex items-center justify-center text-[#8C989F] shrink-0"
                title="Add up to 4 vehicles to compare"
              >
                <Plus className="w-3.5 h-3.5" />
              </div>
            ))}
          </div>
        </div>

        {/* Counter & Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right hidden sm:block">
            <span className="text-[12px] font-bold text-white block">
              {comparedVehicles.length} of 4 selected
            </span>
            <span className="text-[11px] text-[#C9D1D6] block tabular-nums">
              {comparedVehicles.length < 2 ? 'Add 1 more' : 'Ready to compare'}
            </span>
          </div>

          <button
            onClick={() => setCompareModalOpen(true)}
            className="flex items-center gap-2 px-3.5 sm:px-4 py-2 bg-[#1D5FD1] hover:bg-[#174CA8] text-white text-[13px] font-semibold cursor-pointer"
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span className="whitespace-nowrap">Compare now</span>
          </button>

          <button
            onClick={clearCompare}
            className="p-2 text-[#C9D1D6] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Clear comparison dock"
            aria-label="Clear comparison"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

      </div>
    </motion.div>
    )}
    </AnimatePresence>
  );
};
