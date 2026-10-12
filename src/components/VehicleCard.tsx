import React from 'react';
import { Vehicle } from '../types.ts';
import { useApp } from '../context/AppContext.tsx';
import { Stamp } from './Stamp.tsx';
import {
  Bookmark,
  MessageSquare,
  ArrowUpRight,
  ShieldCheck,
  MapPin,
  ArrowLeftRight,
} from 'lucide-react';

interface VehicleCardProps {
  vehicle: Vehicle;
  variant?: 'light' | 'dark';
}

export const VehicleCard: React.FC<VehicleCardProps> = ({ vehicle }) => {
  const {
    navigateTo,
    isVehicleSaved,
    toggleSaveVehicle,
    startOrOpenConversation,
    setActiveConversationId,
    isAuthenticated,
    setAuthModalOpen,
    setPendingAction,
    addRecentlyViewed,
    isInCompare,
    toggleCompareVehicle,
  } = useApp();

  const saved = isVehicleSaved(vehicle.id);
  const inCompare = isInCompare(vehicle.id);

  const handleCardClick = () => {
    addRecentlyViewed(vehicle.id);
    navigateTo('vehicle_detail', { vehicleId: vehicle.id });
  };

  const handleSaveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleSaveVehicle(vehicle.id);
  };

  const handleCompareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleCompareVehicle(vehicle.id);
  };

  const handleMessageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      setPendingAction({ type: 'message', vehicleId: vehicle.id });
      setAuthModalOpen(true);
      return;
    }
    const convId = startOrOpenConversation(vehicle.id);
    setActiveConversationId(convId);
    navigateTo('account', { accountTab: 'messages' });
  };

  const handleApplyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      setPendingAction({ type: 'apply', vehicleId: vehicle.id });
      setAuthModalOpen(true);
      return;
    }
    navigateTo('apply', { vehicleId: vehicle.id });
  };

  const formattedPrice = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(vehicle.price);

  const conditionLabel =
    vehicle.condition === 'Certified Pre-Owned' ? 'Certified' : vehicle.condition;

  return (
    <article
      onClick={handleCardClick}
      className="group gb-plate flex flex-col cursor-pointer border-t-2 border-[#141517] bg-transparent"
      role="article"
      aria-label={`${vehicle.title}, ${formattedPrice}`}
    >
      {/* Photo plate */}
      <div className="relative aspect-[4/3] overflow-hidden shrink-0 bg-[#EEF1F2] mt-3">
        <img
          src={vehicle.images[0]}
          alt={vehicle.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute top-3 right-3 flex flex-col items-end gap-2">
          <Stamp label="Saved" show={saved} className="bg-white/85" />
          <Stamp label="Compare" show={inCompare} className="bg-white/85" />
        </div>
        {vehicle.isDeal && vehicle.dealDiscount && (
          <span className="absolute left-0 bottom-0 bg-[#141517] text-white text-[11px] font-semibold px-2.5 py-1.5 tabular-nums">
            {vehicle.dealDiscount}
          </span>
        )}
      </div>

      {/* Record */}
      <div className="flex flex-col flex-1 pt-3">
        <h3 className="text-[16px] font-semibold leading-snug line-clamp-2 text-[#141517] group-hover:underline decoration-[#1D5FD1] decoration-2 underline-offset-4">
          {vehicle.title}
        </h3>

        {/* Spec cells */}
        <dl className="mt-3 grid grid-cols-3 border-y border-[#C9D1D6] divide-x divide-[#C9D1D6] text-[12px]">
          <div className="py-2 pr-2">
            <dt className="sr-only">Year</dt>
            <dd className="tabular-nums text-[#141517] font-medium">{vehicle.year}</dd>
          </div>
          <div className="py-2 px-2 min-w-0">
            <dt className="sr-only">Mileage</dt>
            <dd className="tabular-nums text-[#141517] font-medium truncate">{vehicle.mileage.toLocaleString()} km</dd>
          </div>
          <div className="py-2 pl-2 min-w-0">
            <dt className="sr-only">Condition</dt>
            <dd className="text-[#141517] font-medium truncate">{conditionLabel}</dd>
          </div>
        </dl>
        <p className="mt-2 flex items-center gap-1 text-[12px] text-[#4E585E] min-w-0">
          <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{vehicle.location}</span>
          {vehicle.sellerVerified && (
            <span className="ml-auto pl-2 flex items-center gap-1 shrink-0 text-[#141517]">
              <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
              Verified seller
            </span>
          )}
        </p>

        {/* Price + actions */}
        <div className="mt-auto pt-4 flex flex-col gap-3">
          <div className="min-w-0">
            <div className="font-display text-[22px] leading-none tabular-nums text-[#141517]">{formattedPrice}</div>
            {vehicle.minMonthlyPayment ? (
              <div className="text-[12px] tabular-nums mt-1.5 text-[#4E585E]">
                from ₱{vehicle.minMonthlyPayment.toLocaleString()}/mo
              </div>
            ) : vehicle.originalPrice ? (
              <div className="text-[12px] tabular-nums mt-1.5 text-[#6B767D] line-through">
                ₱{vehicle.originalPrice.toLocaleString()}
              </div>
            ) : null}
          </div>
          <div className="flex items-stretch border border-[#8C989F] divide-x divide-[#8C989F]">
            <button
              onClick={handleSaveClick}
              className={`p-2.5 cursor-pointer ${saved ? 'text-[#1B7F35]' : 'text-[#4E585E] hover:text-[#141517] hover:bg-[#EEF1F2]'}`}
              title={saved ? 'Remove from saved' : 'Save vehicle'}
              aria-label={saved ? 'Remove from saved' : 'Save vehicle'}
              aria-pressed={saved}
            >
              <Bookmark className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={handleCompareClick}
              className={`p-2.5 cursor-pointer ${inCompare ? 'text-[#1B7F35]' : 'text-[#4E585E] hover:text-[#141517] hover:bg-[#EEF1F2]'}`}
              title={inCompare ? 'Remove from compare' : 'Compare vehicle'}
              aria-label={inCompare ? 'Remove from compare' : 'Compare vehicle'}
              aria-pressed={inCompare}
            >
              <ArrowLeftRight className="w-4 h-4" />
            </button>
            <button
              onClick={handleMessageClick}
              className="p-2.5 cursor-pointer text-[#4E585E] hover:text-[#141517] hover:bg-[#EEF1F2]"
              title="Message seller"
              aria-label="Message seller"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
            <button
              onClick={handleApplyClick}
              className="flex-1 px-3 py-2.5 bg-[#141517] hover:bg-[#1D5FD1] text-white text-[13px] font-semibold flex items-center justify-center gap-1 cursor-pointer"
            >
              Apply
              <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};
