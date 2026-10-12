import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { AnimatePresence, motion } from 'motion/react';
import { backdropMotion, modalMotion } from '../motion.ts';
import { Stamp } from './Stamp.tsx';
import { Vehicle } from '../types.ts';
import {
  ArrowLeftRight,
  X,
  Plus,
  CheckCircle2,
  Sparkles,
  Trophy,
  DollarSign,
  Calendar,
  Gauge,
  Fuel,
  ShieldCheck,
  Zap,
  ArrowUpRight,
  MessageSquare,
  Search,
} from 'lucide-react';

type QuickTag = 'overall' | 'price' | 'model' | 'mileage' | 'efficiency' | 'trust';

interface MetricEvaluation {
  winnerId: string;
  scores: Record<string, number>;
  verdictTitle: string;
  verdictDescription: string;
  vehicleBadges: Record<string, string>;
}

export const CompareModal: React.FC = () => {
  const {
    vehicles,
    comparedVehicleIds,
    toggleCompareVehicle,
    clearCompare,
    compareModalOpen,
    setCompareModalOpen,
    navigateTo,
    isAuthenticated,
    setAuthModalOpen,
    setPendingAction,
    startOrOpenConversation,
    setActiveConversationId,
  } = useApp();

  const [activeTag, setActiveTag] = useState<QuickTag>('overall');
  const [addDropdownOpen, setAddDropdownOpen] = useState(false);
  const [addSearchQuery, setAddSearchQuery] = useState('');

  const comparedVehicles: Vehicle[] = useMemo(() => {
    return comparedVehicleIds
      .map((id) => vehicles.find((v) => v.id === id))
      .filter((v): v is Vehicle => Boolean(v));
  }, [comparedVehicleIds, vehicles]);

  // Available vehicles that can be added
  const availableToAdd = useMemo(() => {
    return vehicles
      .filter((v) => !comparedVehicleIds.includes(v.id))
      .filter((v) =>
        addSearchQuery
          ? v.title.toLowerCase().includes(addSearchQuery.toLowerCase()) ||
            v.brand.toLowerCase().includes(addSearchQuery.toLowerCase())
          : true
      )
      .slice(0, 8);
  }, [vehicles, comparedVehicleIds, addSearchQuery]);

  // Algorithmic evaluation of vehicles
  const evaluation: MetricEvaluation | null = useMemo(() => {
    if (comparedVehicles.length === 0) return null;

    const scores: Record<string, number> = {};
    const vehicleBadges: Record<string, string> = {};

    // 1. Min / Max references
    const minPrice = Math.min(...comparedVehicles.map((v) => v.price));
    const maxPrice = Math.max(...comparedVehicles.map((v) => v.price));
    const minMileage = Math.min(...comparedVehicles.map((v) => v.mileage));
    const maxMileage = Math.max(...comparedVehicles.map((v) => v.mileage));
    const maxYear = Math.max(...comparedVehicles.map((v) => v.year));
    const minYear = Math.min(...comparedVehicles.map((v) => v.year));

    comparedVehicles.forEach((v) => {
      // Normalization helpers (0 - 100)
      const priceScore = maxPrice === minPrice ? 90 : 100 - ((v.price - minPrice) / (maxPrice - minPrice || 1)) * 60;
      const mileageScore = maxMileage === minMileage ? 90 : 100 - ((v.mileage - minMileage) / (maxMileage - minMileage || 1)) * 50;
      const yearScore = maxYear === minYear ? 90 : 70 + ((v.year - minYear) / (maxYear - minYear || 1)) * 30;
      
      const conditionScore =
        v.condition === 'New' ? 100 : v.condition === 'Certified Pre-Owned' ? 92 : 78;
      
      const ecoScore =
        v.fuel === 'Electric' ? 100 : v.fuel === 'Hybrid' ? 94 : v.fuel === 'Diesel' ? 80 : 75;

      const sellerScore = (v.sellerRating / 5) * 80 + (v.sellerVerified ? 20 : 0);

      let totalScore = 0;
      if (activeTag === 'price') {
        totalScore = priceScore * 0.7 + yearScore * 0.15 + mileageScore * 0.15;
      } else if (activeTag === 'mileage') {
        totalScore = mileageScore * 0.7 + conditionScore * 0.15 + yearScore * 0.15;
      } else if (activeTag === 'model') {
        totalScore = yearScore * 0.7 + priceScore * 0.15 + sellerScore * 0.15;
      } else if (activeTag === 'efficiency') {
        totalScore = ecoScore * 0.7 + yearScore * 0.15 + priceScore * 0.15;
      } else if (activeTag === 'trust') {
        totalScore = sellerScore * 0.5 + conditionScore * 0.35 + yearScore * 0.15;
      } else {
        // Overall: balanced composite score
        totalScore =
          priceScore * 0.3 +
          mileageScore * 0.2 +
          yearScore * 0.2 +
          conditionScore * 0.15 +
          ecoScore * 0.15;
      }

      scores[v.id] = Math.round(totalScore);
    });

    // Determine winner
    let winnerId = comparedVehicles[0].id;
    let highestScore = scores[winnerId];

    comparedVehicles.forEach((v) => {
      if (scores[v.id] > highestScore) {
        highestScore = scores[v.id];
        winnerId = v.id;
      }
    });

    // Assign badges
    const winner = comparedVehicles.find((v) => v.id === winnerId);
    comparedVehicles.forEach((v) => {
      if (v.id === winnerId) {
        vehicleBadges[v.id] = 'Best Overall Winner';
      } else if (v.price === minPrice) {
        vehicleBadges[v.id] = 'Lowest Price';
      } else if (v.mileage === minMileage) {
        vehicleBadges[v.id] = 'Lowest Mileage';
      } else if (v.year === maxYear) {
        vehicleBadges[v.id] = 'Newest Model';
      } else if (v.fuel === 'Electric' || v.fuel === 'Hybrid') {
        vehicleBadges[v.id] = 'Eco Champion';
      } else {
        vehicleBadges[v.id] = 'Strong Contender';
      }
    });

    let verdictTitle = '';
    let verdictDescription = '';

    if (winner) {
      if (activeTag === 'price') {
        verdictTitle = `Best Price Choice: ${winner.title}`;
        verdictDescription = `Offers the most accessible cost of ownership with an estimated monthly payment of ₱${winner.minMonthlyPayment?.toLocaleString() || 'N/A'}/mo.`;
      } else if (activeTag === 'mileage') {
        verdictTitle = `Lowest Wear Choice: ${winner.title}`;
        verdictDescription = `With just ${winner.mileage.toLocaleString()} km on the odometer, this vehicle exhibits significantly less wear and tear compared to rivals.`;
      } else if (activeTag === 'model') {
        verdictTitle = `Newest Generation: ${winner.title}`;
        verdictDescription = `Features modern ${winner.year} architecture, updated safety systems, and modern styling.`;
      } else if (activeTag === 'efficiency') {
        verdictTitle = `Eco Efficiency Pick: ${winner.title}`;
        verdictDescription = `Engineered with high-efficiency ${winner.fuel} powertrain, ensuring reduced fuel expenses and modern emissions.`;
      } else if (activeTag === 'trust') {
        verdictTitle = `Top Reliability & Trust: ${winner.title}`;
        verdictDescription = `Listed by verified seller ${winner.sellerName} (rated ${winner.sellerRating} of 5) with ${winner.condition} certification.`;
      } else {
        verdictTitle = `Best Overall Value: ${winner.title} (${scores[winner.id]}/100 Score)`;
        verdictDescription = `Combines the most favorable balance of purchase price, low mileage (${winner.mileage.toLocaleString()} km), ${winner.year} model year, and ${winner.condition} condition.`;
      }
    }

    return {
      winnerId,
      scores,
      verdictTitle,
      verdictDescription,
      vehicleBadges,
    };
  }, [comparedVehicles, activeTag]);

  const handleInquire = (vehicleId: string) => {
    if (!isAuthenticated) {
      setPendingAction({ type: 'message', vehicleId });
      setAuthModalOpen(true);
      return;
    }
    const convId = startOrOpenConversation(vehicleId);
    setActiveConversationId(convId);
    setCompareModalOpen(false);
    navigateTo('account', { accountTab: 'messages' });
  };

  const handleApply = (vehicleId: string) => {
    if (!isAuthenticated) {
      setPendingAction({ type: 'apply', vehicleId });
      setAuthModalOpen(true);
      return;
    }
    setCompareModalOpen(false);
    navigateTo('apply', { vehicleId });
  };

  const handleViewDetail = (vehicleId: string) => {
    setCompareModalOpen(false);
    navigateTo('vehicle_detail', { vehicleId });
  };

  const quickTagsList: { id: QuickTag; label: string; icon: React.ReactNode }[] = [
    { id: 'overall', label: 'Best Overall', icon: <Trophy className="w-3.5 h-3.5 text-[#141517]" /> },
    { id: 'price', label: 'By Price & Financing', icon: <DollarSign className="w-3.5 h-3.5 text-[#141517]" /> },
    { id: 'model', label: 'By Model & Year', icon: <Calendar className="w-3.5 h-3.5 text-[#141517]" /> },
    { id: 'mileage', label: 'By Mileage & Low Wear', icon: <Gauge className="w-3.5 h-3.5 text-[#141517]" /> },
    { id: 'efficiency', label: 'By Fuel & Efficiency', icon: <Fuel className="w-3.5 h-3.5 text-[#141517]" /> },
    { id: 'trust', label: 'By Certified & Trust', icon: <ShieldCheck className="w-3.5 h-3.5 text-[#141517]" /> },
  ];


  return (
    <AnimatePresence>
    {compareModalOpen && (
    <motion.div
      key="compare"
      {...backdropMotion}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-8 bg-[#141517]/50 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) setCompareModalOpen(false);
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="compare-modal-title"
    >
      <motion.div {...modalMotion} className="bg-[#F7F8F8] text-[#141517] border border-[#141517] max-w-6xl w-full max-h-[92vh] flex flex-col overflow-hidden my-auto">
        
        {/* ── HEADER ── */}
        <div className="px-5 sm:px-7 py-4 border-b border-[#C9D1D6] bg-white flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 id="compare-modal-title" className="font-display text-[22px] leading-tight text-[#141517]">
                  Compare
                </h2>
                <span className="text-[13px] tabular-nums text-[#4E585E]">
                  {comparedVehicles.length} of 4
                </span>
              </div>
              <p className="text-[12px] text-[#4E585E]">
                Specs side by side, scored on price, mileage, year and condition.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {comparedVehicles.length > 0 && (
              <button
                onClick={clearCompare}
                className="text-[12px] font-semibold text-[#4E585E] hover:text-[#141517] px-3 py-1.5 rounded-[2px] hover:bg-[#EEF1F2] transition-colors cursor-pointer"
              >
                Clear All
              </button>
            )}
            <button
              onClick={() => setCompareModalOpen(false)}
              className="w-9 h-9 rounded-[2px] border border-[#C9D1D6] hover:border-[#8C989F] flex items-center justify-center text-[#4E585E] hover:text-[#141517] hover:bg-[#EEF1F2] transition-colors cursor-pointer"
              aria-label="Close comparison"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── QUICK PERSPECTIVE TAGS ── */}
        <div className="px-5 sm:px-7 py-3 border-b border-[#C9D1D6] bg-[#F7F8F8] flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0">
          <span className="gb-label shrink-0 mr-1">
            Rank by
          </span>
          {quickTagsList.map((tag) => (
            <button
              key={tag.id}
              onClick={() => setActiveTag(tag.id)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] text-[12px] font-bold transition-colors duration-150 cursor-pointer border ${
                activeTag === tag.id
                  ? 'bg-[#141517] text-white border-[#141517]'
                  : 'bg-white text-[#4E585E] border-[#C9D1D6] hover:border-[#8C989F] hover:text-[#141517]'
              }`}
            >
              {tag.icon}
              <span>{tag.label}</span>
            </button>
          ))}
        </div>

        {/* ── BODY (Scrollable Matrix) ── */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-5 space-y-6">

          {/* Empty / Insufficient State */}
          {comparedVehicles.length < 2 && (
            <div className="p-8 rounded-[2px] bg-white border border-[#C9D1D6] text-center max-w-lg mx-auto space-y-4 my-6">
              <div>
                <h3 className="text-base font-bold text-[#141517]">
                  {comparedVehicles.length === 0
                    ? 'No Vehicles Selected for Comparison'
                    : 'Select at least 2 vehicles to compare'}
                </h3>
                <p className="text-[13px] text-[#4E585E] mt-1 leading-relaxed">
                  Add 2 to 4 vehicles from the marketplace to analyze specs side-by-side and see which car is better overall.
                </p>
              </div>

              {/* Quick Pick Starter */}
              <div className="pt-2">
                <p className="text-[11px] tabular-nums uppercase tracking-wider text-[#6B767D] mb-3 font-semibold">
                  Quick Add Top Marketplace Picks:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                  {vehicles.slice(0, 4).map((v) => (
                    <button
                      key={v.id}
                      onClick={() => toggleCompareVehicle(v.id)}
                      className={`p-2.5 rounded-[2px] border flex items-center gap-3 transition-colors cursor-pointer ${
                        comparedVehicleIds.includes(v.id)
                          ? 'border-[#141517] bg-white'
                          : 'border-[#C9D1D6] hover:border-[#8C989F] bg-white'
                      }`}
                    >
                      <img src={v.images[0]} alt={v.title} className="w-10 h-10 rounded-[2px] object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-bold text-[#141517] truncate">{v.title}</p>
                        <p className="text-[12px] tabular-nums text-[#4E585E]">
                          ₱{v.price.toLocaleString()}
                        </p>
                      </div>
                      <Plus className="w-4 h-4 text-[#6B767D] shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── VERDICT BANNER ── */}
          {evaluation && comparedVehicles.length >= 2 && (
            <div className="bg-[#141517] text-white p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="text-[#C9D1D6] text-[12px]">
                    Ranked by {quickTagsList.find((t) => t.id === activeTag)?.label.toLowerCase()}
                  </span>
                </div>
                <h3 className="font-display text-[20px] leading-tight text-white">
                  {evaluation.verdictTitle}
                </h3>
                <p className="text-[14px] text-[#C9D1D6] leading-relaxed">
                  {evaluation.verdictDescription}
                </p>
              </div>

              {/* Winner score pill */}
              <div className="bg-white/10 border border-white/15 px-4 py-3 rounded-[2px] flex items-center gap-3 shrink-0 self-stretch md:self-auto justify-center">
                <Trophy className="w-6 h-6 text-white shrink-0" />
                <div className="text-left">
                  <span className="text-[10px] tabular-nums uppercase tracking-wider text-white/70 block">Overall Score</span>
                  <span className="text-xl font-bold text-white tabular-nums">
                    {evaluation.scores[evaluation.winnerId]}<span className="text-xs text-white/70 font-normal">/100</span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ── SIDE-BY-SIDE MATRIX TABLE ── */}
          {comparedVehicles.length >= 2 && (
            <div className="bg-white rounded-[2px] border border-[#C9D1D6] overflow-x-auto">
              <table className="w-full border-collapse text-left min-w-[640px]">
                <thead>
                  <tr className="border-b border-[#C9D1D6] divide-x divide-[#C9D1D6]">
                    <th className="p-4 w-44 bg-[#F7F8F8] text-[11px] tabular-nums uppercase text-[#5A646A] font-bold align-bottom">
                      Vehicle & Model
                    </th>
                    {comparedVehicles.map((vehicle) => {
                      const isWinner = evaluation?.winnerId === vehicle.id;
                      const badge = evaluation?.vehicleBadges[vehicle.id];

                      return (
                        <th
                          key={vehicle.id}
                          className={`p-4 min-w-[210px] relative align-top transition-colors ${
                            'bg-white'
                          }`}
                        >
                          {/* Close button */}
                          <button
                            onClick={() => toggleCompareVehicle(vehicle.id)}
                            className="absolute top-3 right-3 w-6 h-6 rounded-full bg-black/10 hover:bg-black/20 text-[#4E585E] hover:text-[#141517] flex items-center justify-center cursor-pointer transition-colors"
                            title="Remove from comparison"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>

                          {/* Image */}
                          <div className="relative aspect-[16/10] rounded-[2px] overflow-hidden mb-3 border border-[#C9D1D6] bg-[#EEF1F2]">
                            <img
                              src={vehicle.images[0]}
                              alt={vehicle.title}
                              className="w-full h-full object-cover"
                            />
                            {/* Score bubble */}
                            {evaluation && (
                              <span className="absolute bottom-2 left-2 bg-[#141517]/85 text-white px-2 py-0.5 rounded-[2px] tabular-nums font-bold text-[11px] border border-white/10">
                                {evaluation.scores[vehicle.id]} pts
                              </span>
                            )}
                          </div>

                          {/* Badge */}
                          {badge && (
                            <div className="mb-2">
                              {isWinner ? (
                                <Stamp label={badge} show />
                              ) : (
                                <span className="gb-label">{badge}</span>
                              )}
                            </div>
                          )}

                          {/* Title */}
                          <h4 className="text-[14px] font-bold text-[#141517] leading-snug line-clamp-2">
                            {vehicle.title}
                          </h4>

                          {/* Price */}
                          <div className="mt-2 mb-3">
                            <span className="text-[17px] font-bold text-[#141517] tabular-nums">
                              ₱{vehicle.price.toLocaleString()}
                            </span>
                            {vehicle.minMonthlyPayment && (
                              <span className="block text-[12px] tabular-nums text-[#4E585E]">
                                from ₱{vehicle.minMonthlyPayment.toLocaleString()}/mo
                              </span>
                            )}
                          </div>

                          {/* Action CTAs */}
                          <div className="flex flex-col gap-1.5">
                            <button
                              onClick={() => handleApply(vehicle.id)}
                              className="w-full py-2 px-3 bg-[#1D5FD1] hover:bg-[#174CA8] text-white text-[12px] font-bold rounded-[2px] transition-colors flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <span>Apply Now</span>
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>
                            <div className="grid grid-cols-2 gap-1.5">
                              <button
                                onClick={() => handleInquire(vehicle.id)}
                                className="py-1.5 px-2 bg-[#EEF1F2] hover:bg-[#E6EAEC] text-[#141517] text-[11px] font-semibold rounded-[2px] border border-[#C9D1D6] transition-colors flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <MessageSquare className="w-3 h-3 text-[#4E585E]" />
                                <span>Inquire</span>
                              </button>
                              <button
                                onClick={() => handleViewDetail(vehicle.id)}
                                className="py-1.5 px-2 bg-white hover:bg-[#EEF1F2] text-[#141517] text-[11px] font-semibold rounded-[2px] border border-[#C9D1D6] transition-colors flex items-center justify-center cursor-pointer"
                              >
                                <span>Details</span>
                              </button>
                            </div>
                          </div>
                        </th>
                      );
                    })}

                    {/* Add Slot if < 4 */}
                    {comparedVehicles.length < 4 && (
                      <th className="p-4 min-w-[180px] bg-[#F7F8F8] text-center align-middle">
                        <div className="relative">
                          <button
                            onClick={() => setAddDropdownOpen(!addDropdownOpen)}
                            className="w-full py-8 border-2 border-dashed border-[#8C989F] hover:border-[#1D5FD1] rounded-[2px] flex flex-col items-center justify-center gap-2 text-[#4E585E] hover:text-[#1D5FD1] transition-colors cursor-pointer bg-white/60 hover:bg-white"
                          >
                            <div className="w-9 h-9 rounded-full bg-[#F7F8F8] border border-[#C9D1D6] flex items-center justify-center">
                              <Plus className="w-4 h-4" />
                            </div>
                            <span className="text-[12px] font-bold">Add Another Vehicle</span>
                            <span className="text-[10px] tabular-nums text-[#6B767D]">Up to 4 cars</span>
                          </button>

                          {/* Quick Add Dropdown */}
                          {addDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-[2px] border border-[#C9D1D6] p-3 z-30 text-left w-64 animate-fade-down">
                              <div className="relative mb-2">
                                <Search className="w-3.5 h-3.5 text-[#6B767D] absolute left-2.5 top-1/2 -translate-y-1/2" />
                                <input
                                  type="text"
                                  placeholder="Search vehicles to add..."
                                  value={addSearchQuery}
                                  onChange={(e) => setAddSearchQuery(e.target.value)}
                                  className="w-full pl-8 pr-2.5 py-1 text-[11px] border border-[#C9D1D6] rounded-[2px] bg-[#F7F8F8] text-[#141517] outline-none"
                                />
                              </div>
                              <div className="max-h-48 overflow-y-auto space-y-1">
                                {availableToAdd.map((v) => (
                                  <button
                                    key={v.id}
                                    onClick={() => {
                                      toggleCompareVehicle(v.id);
                                      setAddDropdownOpen(false);
                                    }}
                                    className="w-full text-left p-1.5 rounded-[2px] hover:bg-[#E8F0FC] flex items-center gap-2 transition-colors cursor-pointer"
                                  >
                                    <img src={v.images[0]} alt={v.title} className="w-8 h-8 rounded-[2px] object-cover" />
                                    <div className="min-w-0 flex-1">
                                      <p className="text-[11px] font-bold text-[#141517] truncate">{v.title}</p>
                                      <p className="text-[10px] tabular-nums text-[#1D5FD1]">₱{v.price.toLocaleString()}</p>
                                    </div>
                                    <Plus className="w-3 h-3 text-[#1D5FD1]" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </th>
                    )}
                  </tr>
                </thead>

                {/* ── SPECIFICATION ROWS ── */}
                <tbody className="divide-y divide-[#C9D1D6] text-[13px]">
                  
                  {/* Condition & Status */}
                  <tr className="divide-x divide-[#C9D1D6]">
                    <td className="p-3.5 font-bold text-[#5A646A] text-[11px] tabular-nums uppercase bg-[#F7F8F8]">
                      Condition
                    </td>
                    {comparedVehicles.map((v) => (
                      <td key={v.id} className="p-3.5 font-semibold text-[#141517]">
                        <span className="inline-flex items-center gap-1.5">
                          {v.condition === 'Certified Pre-Owned' || v.condition === 'New' ? (
                            <CheckCircle2 className="w-4 h-4 text-[#141517] shrink-0" />
                          ) : null}
                          {v.condition}
                        </span>
                      </td>
                    ))}
                    {comparedVehicles.length < 4 && <td className="bg-[#F7F8F8]" />}
                  </tr>

                  {/* Year */}
                  <tr className="divide-x divide-[#C9D1D6]">
                    <td className="p-3.5 font-bold text-[#5A646A] text-[11px] tabular-nums uppercase bg-[#F7F8F8]">
                      Model Year
                    </td>
                    {comparedVehicles.map((v) => {
                      const isNewest = v.year === Math.max(...comparedVehicles.map((x) => x.year));
                      return (
                        <td key={v.id} className="p-3.5 tabular-nums font-bold text-[#141517]">
                          {v.year}
                          {isNewest && (
                            <span className="ml-2 text-[10px] bg-white text-[#141517] px-1.5 py-0.5 rounded-[2px] font-sans font-bold">
                              Newest
                            </span>
                          )}
                        </td>
                      );
                    })}
                    {comparedVehicles.length < 4 && <td className="bg-[#F7F8F8]" />}
                  </tr>

                  {/* Mileage */}
                  <tr className="divide-x divide-[#C9D1D6]">
                    <td className="p-3.5 font-bold text-[#5A646A] text-[11px] tabular-nums uppercase bg-[#F7F8F8]">
                      Mileage
                    </td>
                    {comparedVehicles.map((v) => {
                      const isLowest = v.mileage === Math.min(...comparedVehicles.map((x) => x.mileage));
                      return (
                        <td key={v.id} className="p-3.5 tabular-nums font-bold text-[#141517]">
                          {v.mileage.toLocaleString()} km
                          {isLowest && (
                            <span className="ml-2 text-[10px] bg-white text-[#141517] px-1.5 py-0.5 rounded-[2px] font-sans font-bold">
                              Lowest
                            </span>
                          )}
                        </td>
                      );
                    })}
                    {comparedVehicles.length < 4 && <td className="bg-[#F7F8F8]" />}
                  </tr>

                  {/* Fuel / Powertrain */}
                  <tr className="divide-x divide-[#C9D1D6]">
                    <td className="p-3.5 font-bold text-[#5A646A] text-[11px] tabular-nums uppercase bg-[#F7F8F8]">
                      Fuel / Powertrain
                    </td>
                    {comparedVehicles.map((v) => (
                      <td key={v.id} className="p-3.5 font-medium text-[#141517] capitalize">
                        {v.fuel}
                        {v.specs.fuelEconomy && (
                          <span className="block text-[11px] text-[#4E585E] tabular-nums mt-0.5">
                            {v.specs.fuelEconomy}
                          </span>
                        )}
                      </td>
                    ))}
                    {comparedVehicles.length < 4 && <td className="bg-[#F7F8F8]" />}
                  </tr>

                  {/* Transmission */}
                  <tr className="divide-x divide-[#C9D1D6]">
                    <td className="p-3.5 font-bold text-[#5A646A] text-[11px] tabular-nums uppercase bg-[#F7F8F8]">
                      Transmission
                    </td>
                    {comparedVehicles.map((v) => (
                      <td key={v.id} className="p-3.5 font-medium text-[#141517]">
                        {v.transmission}
                      </td>
                    ))}
                    {comparedVehicles.length < 4 && <td className="bg-[#F7F8F8]" />}
                  </tr>

                  {/* Engine & Horsepower */}
                  <tr className="divide-x divide-[#C9D1D6]">
                    <td className="p-3.5 font-bold text-[#5A646A] text-[11px] tabular-nums uppercase bg-[#F7F8F8]">
                      Engine & Power
                    </td>
                    {comparedVehicles.map((v) => (
                      <td key={v.id} className="p-3.5 font-medium text-[#141517]">
                        <div>{v.specs.engine || 'Standard'}</div>
                        <div className="text-[11px] text-[#4E585E] tabular-nums">{v.specs.horsepower || 'Rated HP'}</div>
                      </td>
                    ))}
                    {comparedVehicles.length < 4 && <td className="bg-[#F7F8F8]" />}
                  </tr>

                  {/* Seating & Doors */}
                  <tr className="divide-x divide-[#C9D1D6]">
                    <td className="p-3.5 font-bold text-[#5A646A] text-[11px] tabular-nums uppercase bg-[#F7F8F8]">
                      Seating & Body
                    </td>
                    {comparedVehicles.map((v) => (
                      <td key={v.id} className="p-3.5 font-medium text-[#141517]">
                        <div>{v.specs.seating || '5 Seats'}</div>
                        <div className="text-[11px] text-[#4E585E] capitalize">{v.bodyType || v.category}</div>
                      </td>
                    ))}
                    {comparedVehicles.length < 4 && <td className="bg-[#F7F8F8]" />}
                  </tr>

                  {/* Seller Trust & Rating */}
                  <tr className="divide-x divide-[#C9D1D6]">
                    <td className="p-3.5 font-bold text-[#5A646A] text-[11px] tabular-nums uppercase bg-[#F7F8F8]">
                      Seller Rating
                    </td>
                    {comparedVehicles.map((v) => (
                      <td key={v.id} className="p-3.5 font-medium text-[#141517]">
                        <div className="flex items-center gap-1 font-bold">
                          <span className="tabular-nums">{v.sellerRating} / 5</span>
                          <span className="text-[11px] font-normal text-[#4E585E]">
                            ({v.sellerReviewCount} reviews)
                          </span>
                        </div>
                        {v.sellerVerified && (
                          <span className="text-[10px] text-[#141517] font-bold flex items-center gap-1 mt-0.5">
                            <ShieldCheck className="w-3 h-3" /> Verified Dealer
                          </span>
                        )}
                      </td>
                    ))}
                    {comparedVehicles.length < 4 && <td className="bg-[#F7F8F8]" />}
                  </tr>

                  {/* Location */}
                  <tr className="divide-x divide-[#C9D1D6]">
                    <td className="p-3.5 font-bold text-[#5A646A] text-[11px] tabular-nums uppercase bg-[#F7F8F8]">
                      Location
                    </td>
                    {comparedVehicles.map((v) => (
                      <td key={v.id} className="p-3.5 text-[#141517] text-[12px]">
                        {v.location}
                      </td>
                    ))}
                    {comparedVehicles.length < 4 && <td className="bg-[#F7F8F8]" />}
                  </tr>

                </tbody>
              </table>
            </div>
          )}

        </div>

        {/* ── FOOTER ── */}
        <div className="px-5 sm:px-7 py-3.5 border-t border-[#C9D1D6] bg-white flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <span className="text-[11px] text-[#4E585E] tabular-nums">
            Direct vehicle exchange · Escrow protection · Clean LTO records
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setCompareModalOpen(false);
                navigateTo('marketplace');
              }}
              className="px-4 py-2 border border-[#C9D1D6] hover:border-[#8C989F] text-[#141517] font-semibold text-[12px] rounded-[2px] hover:bg-[#EEF1F2] transition-colors cursor-pointer"
            >
              Browse More Cars
            </button>
            <button
              onClick={() => setCompareModalOpen(false)}
              className="px-5 py-2 bg-[#141517] hover:bg-black text-white font-bold text-[12px] rounded-[2px] transition-colors cursor-pointer"
            >
              Done Comparing
            </button>
          </div>
        </div>

      </motion.div>
    </motion.div>
    )}
    </AnimatePresence>
  );
};
