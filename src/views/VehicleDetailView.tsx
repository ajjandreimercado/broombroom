import React, { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { Stamp } from '../components/Stamp.tsx';
import { portalUrl } from '../portals.ts';
import { AnimatePresence, motion } from 'motion/react';
import { EASE_OUT } from '../motion.ts';
import { StoredVideo } from '../components/StoredVideo.tsx';
import { Lightbox } from '../components/Lightbox.tsx';
import { QuoteRequest } from '../components/QuoteRequest.tsx';
import {
  Bookmark,
  Maximize2,
  MessageSquare,
  ArrowUpRight,
  ShieldCheck,
  MapPin,
  Share2,
  Flag,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Calculator,
  Check,
  Calendar,
  Gauge,
  Fuel,
  Cpu,
  Palette,
  Car,
  ArrowLeftRight,
  Play,
} from 'lucide-react';

export const VehicleDetailView: React.FC = () => {
  const {
    vehicles,
    selectedVehicleId,
    navigateTo,
    isVehicleSaved,
    toggleSaveVehicle,
    startOrOpenConversation,
    setActiveConversationId,
    isAuthenticated,
    setAuthModalOpen,
    setPendingAction,
    setReportModalVehicle,
    showToast,
    isInCompare,
    toggleCompareVehicle,
    myAgent,
    currentUser,
  } = useApp();

  const vehicle = vehicles.find((v) => v.id === selectedVehicleId); // never another car: a removed listing shows "not found"
  // A client who already belongs to an agent deals with that agent on every listing.
  const inCompare = vehicle ? isInCompare(vehicle.id) : false;

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false); // full, uncropped photo

  // Loan calculator state
  const [downPaymentPercent, setDownPaymentPercent] = useState(25);
  const [loanTermMonths, setLoanTermMonths] = useState(36);

  if (!vehicle) {
    return (
      <div className="min-h-screen bg-[#F7F8F8] flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <p className="text-base font-semibold text-[#141517]">Vehicle not found</p>
          <p className="text-xs text-[#4E585E] mt-1 mb-4">
            The vehicle listing you are looking for may have been sold or unlisted.
          </p>
          <button
            onClick={() => navigateTo('marketplace')}
            className="px-5 py-2.5 bg-[#141517] text-white rounded-[2px] text-xs font-semibold hover:bg-gray-800 transition-colors"
          >
            Browse Marketplace
          </button>
        </div>
      </div>
    );
  }

  // Photos first, then any uploaded videos, in one gallery.
  const media = [...vehicle.images.map((src) => ({ kind: 'photo' as const, src })), ...(vehicle.videos ?? []).map((src) => ({ kind: 'video' as const, src }))];
  const current = media[activeImageIndex] ?? media[0];
  const saved = isVehicleSaved(vehicle.id);

  // Financial calculations
  const downPaymentAmount = Math.round((vehicle.price * downPaymentPercent) / 100);
  const principalLoan = vehicle.price - downPaymentAmount;
  const annualRate = 0.085;
  const monthlyRate = annualRate / 12;
  const estimatedMonthly = Math.round(
    (principalLoan * (monthlyRate * Math.pow(1 + monthlyRate, loanTermMonths))) /
      (Math.pow(1 + monthlyRate, loanTermMonths) - 1)
  );

  const handleSave = () => {
    if (!isAuthenticated) {
      setPendingAction({ type: 'save', vehicleId: vehicle.id });
      setAuthModalOpen(true);
      return;
    }
    toggleSaveVehicle(vehicle.id);
  };

  const handleMessage = async () => {
    if (!isAuthenticated) {
      setPendingAction({ type: 'message', vehicleId: vehicle.id });
      setAuthModalOpen(true);
      return;
    }
    const convId = await startOrOpenConversation(vehicle.id);
    if (!convId) return;
    setActiveConversationId(convId);
    navigateTo('account', { accountTab: 'messages' });
  };

  const handleApply = () => {
    if (!isAuthenticated) {
      setPendingAction({ type: 'apply', vehicleId: vehicle.id });
      setAuthModalOpen(true);
      return;
    }
    navigateTo('apply', { vehicleId: vehicle.id });
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(portalUrl('buyer', `?vehicle=${vehicle.id}`));
      showToast('Link Copied', vehicle.title);
    }
  };

  const formattedPrice = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(vehicle.price);

  const specRows: { label: string; value: React.ReactNode; num?: boolean }[] = [
    { label: 'Condition', value: vehicle.condition },
    { label: 'Model year', value: vehicle.year, num: true },
    { label: 'Mileage', value: `${vehicle.mileage.toLocaleString()} km`, num: true },
    { label: 'Transmission', value: vehicle.transmission },
    { label: 'Fuel', value: vehicle.fuel },
    { label: 'Body type', value: vehicle.bodyType },
    { label: 'Colour', value: vehicle.color },
    { label: 'Drivetrain', value: vehicle.drivetrain },
    { label: 'Registered in', value: vehicle.location },
  ];

  return (
    <div className="bg-[#F7F8F8] pb-32 lg:pb-24">
      {/* Sub-navigation */}
      <div className="sticky top-[65px] z-20 bg-[#F7F8F8] border-b border-[#C9D1D6]">
        <div className="gb-container py-2.5 flex items-center justify-between">
          <button
            onClick={() => navigateTo('marketplace')}
            className="inline-flex items-center gap-2 py-1.5 text-[13px] font-medium text-[#141517] group cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
            Back to marketplace
          </button>
          <div className="flex items-center">
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-[#4E585E] hover:text-[#141517] cursor-pointer"
            >
              <Share2 className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Share</span>
            </button>
            <button
              onClick={() => setReportModalVehicle(vehicle)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-[#4E585E] hover:text-[#B42318] cursor-pointer"
            >
              <Flag className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Report</span>
            </button>
          </div>
        </div>
      </div>

      <main className="gb-container pt-8 sm:pt-10">
        {/* Title block */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end pb-8 border-b-2 border-[#141517]">
          <div className="lg:col-span-8">
            <h1 className="font-display text-[clamp(2rem,4.4vw,3.6rem)] leading-[0.98] text-[#141517]">
              {vehicle.title}
            </h1>
          </div>
          <div className="lg:col-span-4 lg:text-right">
            <span className="gb-label">Cash price</span>
            <div className="mt-2 font-display text-[clamp(1.8rem,3.4vw,2.6rem)] leading-none tabular-nums text-[#141517]">
              {formattedPrice}
            </div>
            {vehicle.originalPrice && (
              <p className="mt-2 text-[13px] tabular-nums text-[#4E585E]">
                <span className="line-through">₱{vehicle.originalPrice.toLocaleString()}</span>
                <span className="ml-2 font-semibold text-[#141517]">
                  Save ₱{(vehicle.originalPrice - vehicle.price).toLocaleString()}
                </span>
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 pt-8">
          {/* Gallery, specs, description */}
          <div className="lg:col-span-7 space-y-14">
            <div>
              <div className="relative aspect-[16/10] overflow-hidden bg-[#EEF1F2] group">
                <AnimatePresence initial={false}>
                  {current.kind === 'video' ? (
                    <motion.div
                      key={activeImageIndex}
                      initial={{ opacity: 0, zIndex: 1 }}
                      animate={{ opacity: 1, zIndex: 1 }}
                      exit={{ opacity: 0, zIndex: 0, transition: { opacity: { delay: 0.25, duration: 0 } } }}
                      transition={{ duration: 0.25, ease: EASE_OUT }}
                      className="absolute inset-0"
                    >
                      <StoredVideo id={current.src} controls className="w-full h-full object-contain" label={`${vehicle.title} video`} />
                    </motion.div>
                  ) : (
                  <motion.img
                    key={activeImageIndex}
                    src={current.src}
                    alt={vehicle.title}
                    initial={{ opacity: 0, zIndex: 1 }}
                    animate={{ opacity: 1, zIndex: 1 }}
                    exit={{ opacity: 0, zIndex: 0, transition: { opacity: { delay: 0.25, duration: 0 } } }}
                    transition={{ duration: 0.25, ease: EASE_OUT }}
                    style={{ viewTransitionName: 'listing-photo' }}
                    className="absolute inset-0 w-full h-full object-contain"
                  />
                  )}
                </AnimatePresence>
                {current.kind === 'photo' && (
                  // The frame crops the photo; clicking it shows the whole photo.
                  <button
                    type="button"
                    onClick={() => setViewerOpen(true)}
                    aria-label={`View the full photo of ${vehicle.title}`}
                    className="absolute inset-0 z-[5] cursor-zoom-in focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-[#1D5FD1]"
                  >
                    <span className="absolute left-0 bottom-0 inline-flex items-center gap-1.5 px-3 py-2 bg-white/90 border-t border-r border-[#141517] text-[12.5px] font-semibold text-[#141517]">
                      <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" /> View full photo
                    </span>
                  </button>
                )}
                <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-2">
                  <Stamp label="Saved" show={saved} className="bg-white/85" />
                  <Stamp label="Compare" show={inCompare} className="bg-white/85" />
                </div>
                {media.length > 1 && (
                  <div className={`absolute z-10 flex bg-white border-[#141517] ${current.kind === 'video' ? 'top-0 left-0 border-r border-b' : 'bottom-0 right-0 border-l border-t'}`}>
                    <button
                      onClick={() => setActiveImageIndex((prev) => (prev === 0 ? media.length - 1 : prev - 1))}
                      className="p-3 text-[#141517] hover:bg-[#EEF1F2] cursor-pointer"
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-3 grid place-items-center text-[13px] tabular-nums text-[#141517] border-x border-[#C9D1D6]">
                      {activeImageIndex + 1} / {media.length}
                    </span>
                    <button
                      onClick={() => setActiveImageIndex((prev) => (prev === media.length - 1 ? 0 : prev + 1))}
                      className="p-3 text-[#141517] hover:bg-[#EEF1F2] cursor-pointer"
                      aria-label="Next image"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              {viewerOpen && <Lightbox items={media} index={activeImageIndex} title={vehicle.title} onIndex={setActiveImageIndex} onClose={() => setViewerOpen(false)} />}
              {media.length > 1 && (
                <div className="flex gap-2 mt-2 overflow-x-auto scrollbar-none">
                  {media.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      aria-label={item.kind === 'video' ? `Play video ${idx + 1 - vehicle.images.length}` : `Show image ${idx + 1}`}
                      aria-current={activeImageIndex === idx}
                      className={`relative flex-shrink-0 w-24 h-16 overflow-hidden cursor-pointer ${
                        activeImageIndex === idx ? 'outline outline-2 outline-[#141517] outline-offset-2' : 'opacity-60 hover:opacity-100'
                      }`}
                    >
                      {item.kind === 'video' ? (
                        <>
                          <StoredVideo id={item.src} className="w-full h-full object-cover" />
                          <span className="absolute inset-0 grid place-items-center bg-black/25 text-white" aria-hidden="true"><Play className="w-5 h-5 fill-current" /></span>
                        </>
                      ) : (
                        <img src={item.src} alt="" className="w-full h-full object-cover" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Specifications */}
            <section aria-labelledby="specs-heading">
              <h2 id="specs-heading" className="font-display text-[24px] text-[#141517] pb-4 border-b-2 border-[#141517]">
                Specifications
              </h2>
              <dl className="grid grid-cols-2 sm:grid-cols-3">
                {specRows.map((row) => (
                  <div key={row.label} className="py-4 pr-4 border-b border-[#C9D1D6] min-w-0">
                    <dt className="gb-label">{row.label}</dt>
                    <dd className={`mt-1.5 text-[15px] font-medium text-[#141517] break-words ${row.num ? 'tabular-nums' : ''}`}>{row.value}</dd>
                  </div>
                ))}
              </dl>
              {vehicle.specs && Object.keys(vehicle.specs).length > 0 && (
                <dl className="mt-8 grid grid-cols-1 sm:grid-cols-2 sm:gap-x-10">
                  {Object.entries(vehicle.specs).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 py-3 border-b border-[#C9D1D6] text-[14px]">
                      <dt className="text-[#4E585E] capitalize">{k.replace(/([A-Z])/g, ' $1')}</dt>
                      <dd className="font-medium text-[#141517] tabular-nums text-right">{v}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </section>

            {/* Description */}
            <section aria-labelledby="overview-heading">
              <h2 id="overview-heading" className="font-display text-[24px] text-[#141517] pb-4 border-b-2 border-[#141517]">
                Overview
              </h2>
              {vehicle.description && (
                <p className="mt-5 text-[16px] text-[#2A2E31] leading-relaxed whitespace-pre-line max-w-[68ch]">
                  {vehicle.description}
                </p>
              )}
              <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[14px] text-[#141517]">
                {['Clean LTO title', 'Viewing ready', 'Verified odometer'].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <Check className="w-4 h-4" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* Purchase module */}
          <aside className="lg:col-span-5" aria-label="Buy this vehicle">
            <div className="lg:sticky lg:top-32 border-y-2 border-[#141517]">
              <div className="py-6 space-y-3">
                {vehicle.status === 'reserved' ? (
                  <p className="w-full py-4 px-5 border-2 border-[#1B7F35] text-[#1B7F35] font-semibold text-[15px] text-center">
                    Reserved: a cash settlement is in progress
                  </p>
                ) : (
                  <button
                    onClick={handleApply}
                    className="w-full py-4 px-5 bg-[#1D5FD1] hover:bg-[#174CA8] text-white font-semibold text-[15px] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    Apply for this vehicle
                    <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                )}
                {vehicle.status === 'available' && <QuoteRequest vehicle={vehicle} />}
                <div className="grid grid-cols-3 border border-[#8C989F] divide-x divide-[#8C989F]">
                  <button
                    onClick={handleMessage}
                    className="py-3 px-2 text-[13px] font-medium text-[#141517] hover:bg-[#EEF1F2] flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" aria-hidden="true" />
                    Message
                  </button>
                  <button
                    onClick={handleSave}
                    aria-pressed={saved}
                    className={`py-3 px-2 text-[13px] font-medium flex items-center justify-center gap-1.5 cursor-pointer ${
                      saved ? 'text-[#1B7F35]' : 'text-[#141517] hover:bg-[#EEF1F2]'
                    }`}
                  >
                    <Bookmark className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} aria-hidden="true" />
                    {saved ? 'Saved' : 'Save'}
                  </button>
                  <button
                    onClick={() => toggleCompareVehicle(vehicle.id)}
                    aria-pressed={inCompare}
                    className={`py-3 px-2 text-[13px] font-medium flex items-center justify-center gap-1.5 cursor-pointer ${
                      inCompare ? 'text-[#1B7F35]' : 'text-[#141517] hover:bg-[#EEF1F2]'
                    }`}
                  >
                    <ArrowLeftRight className="w-4 h-4" aria-hidden="true" />
                    Compare
                  </button>
                </div>
              </div>

              {vehicle.financingAvailable && (
                <div className="py-6 border-t border-[#C9D1D6] space-y-5">
                  <div className="flex items-end justify-between gap-4">
                    <span className="flex items-center gap-2 text-[14px] font-semibold text-[#141517]">
                      <Calculator className="w-4 h-4" aria-hidden="true" />
                      Financing estimate
                    </span>
                    <span className="font-display text-[24px] leading-none tabular-nums text-[#141517]">
                      ₱{estimatedMonthly.toLocaleString()}
                      <span className="text-[13px] font-normal text-[#4E585E]" style={{ fontStretch: '100%' }}>/mo</span>
                    </span>
                  </div>
                  <label className="block">
                    <span className="flex justify-between text-[13px] text-[#4E585E]">
                      <span>Down payment ({downPaymentPercent}%)</span>
                      <span className="tabular-nums font-medium text-[#141517]">₱{downPaymentAmount.toLocaleString()}</span>
                    </span>
                    <input
                      type="range"
                      min="15"
                      max="50"
                      step="5"
                      value={downPaymentPercent}
                      onChange={(e) => setDownPaymentPercent(Number(e.target.value))}
                      className="w-full mt-2 cursor-pointer"
                    />
                  </label>
                  <div>
                    <span className="gb-label block mb-2">Loan term</span>
                    <div className="grid grid-cols-4 border border-[#8C989F] divide-x divide-[#8C989F]">
                      {[12, 24, 36, 48].map((term) => (
                        <button
                          key={term}
                          onClick={() => setLoanTermMonths(term)}
                          aria-pressed={loanTermMonths === term}
                          className={`py-2.5 text-[13px] tabular-nums text-center cursor-pointer ${
                            loanTermMonths === term ? 'bg-[#141517] text-white font-semibold' : 'text-[#141517] hover:bg-[#EEF1F2]'
                          }`}
                        >
                          {term} mo
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-[12px] text-[#4E585E]">Estimate only. The agent confirms final terms.</p>
                </div>
              )}

              <div className="py-5 border-t border-[#C9D1D6] flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#141517] text-white font-semibold text-[14px] grid place-items-center shrink-0">
                  {(myAgent ?? vehicle.sellerName).charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-[#141517] truncate">{myAgent ?? vehicle.sellerName}</p>
                  <p className="text-[12px] text-[#4E585E] flex items-center gap-1 truncate">
                    {myAgent ? 'Your agent' : <><MapPin className="w-3 h-3 shrink-0" aria-hidden="true" /> {vehicle.location}</>}
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Mobile action bar */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-[#141517] px-4 py-3 z-30 flex items-center justify-between gap-3" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        <div className="min-w-0">
          <span className="gb-label">Price</span>
          <div className="font-display text-[18px] leading-tight tabular-nums text-[#141517] truncate">{formattedPrice}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleMessage}
            className="p-3 border border-[#8C989F] text-[#141517] cursor-pointer"
            aria-label="Message agent"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
          <button
            onClick={handleSave}
            aria-pressed={saved}
            className={`p-3 border border-[#8C989F] cursor-pointer ${saved ? 'text-[#1B7F35]' : 'text-[#141517]'}`}
            aria-label={saved ? 'Remove from saved' : 'Save vehicle'}
          >
            <Bookmark className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
          </button>
          <button
            onClick={handleApply}
            disabled={vehicle.status === 'reserved'}
            className="px-5 py-3 bg-[#1D5FD1] hover:bg-[#174CA8] disabled:bg-[#8C989F] disabled:cursor-not-allowed text-white font-semibold text-[14px] cursor-pointer"
          >
            {vehicle.status === 'reserved' ? 'Reserved' : 'Apply'}
          </button>
        </div>
      </div>
    </div>
  );
};
