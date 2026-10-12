import React, { useState } from 'react';
import { StatusMark } from '../components/StatusMark.tsx';
import { useApp } from '../context/AppContext.tsx';
import { motion } from 'motion/react';
import { indicatorTransition } from '../motion.ts';
import { portalUrl } from '../portals.ts';
import { SellerTab } from '../context/AppContext.tsx';
import { Vehicle, VehicleCategory, VehicleCondition, TransmissionType, FuelType, VehicleStatus, ApplicationStatus } from '../types.ts';
import { SellerSalesReport } from '../components/SellerSalesReport.tsx';
import {
  LayoutDashboard,
  BarChart3,
  Car,
  PlusCircle,
  FileCheck2,
  MessageSquare,
  Store,
  TrendingUp,
  Eye,
  CheckCircle,
  Clock,
  Trash2,
  Edit,
  ArrowUpRight,
  ShieldCheck,
  Send,
  X,
} from 'lucide-react';

export const SellerDashboardView: React.FC = () => {
  const {
    currentUser,
    sellerTab,
    navigateTo,
    vehicles,
    applications,
    updateApplicationStatus,
    conversations,
    activeConversationId,
    setActiveConversationId,
    sendMessage,
    createVehicleListing,
    updateVehicleListing,
    deleteVehicleListing,
    showToast,
  } = useApp();

  // Seller listings and applications
  const sellerVehicles = vehicles;
  const sellerApplications = applications;

  // Add Vehicle Form state
  const [title, setTitle] = useState('');
  const [brand, setBrand] = useState('Honda');
  const [model, setModel] = useState('');
  const [year, setYear] = useState(2025);
  const [category, setCategory] = useState<Exclude<VehicleCategory, 'all'>>('cars');
  const [price, setPrice] = useState<number>(1200000);
  const [mileage, setMileage] = useState<number>(5000);
  const [condition, setCondition] = useState<VehicleCondition>('New');
  const [transmission, setTransmission] = useState<TransmissionType>('Automatic');
  const [fuel, setFuel] = useState<FuelType>('Gasoline');
  const [bodyType, setBodyType] = useState('Sedan');
  const [color, setColor] = useState('Obsidian Black');
  const [location, setLocation] = useState('Bonifacio Global City, Taguig');
  const [description, setDescription] = useState('');
  const [financingAvailable, setFinancingAvailable] = useState(true);

  // Status edit modal / popover
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [editPriceVal, setEditPriceVal] = useState<number>(0);
  const [editStatusVal, setEditStatusVal] = useState<VehicleStatus>('available');

  // Application response note modal
  const [respondingAppId, setRespondingAppId] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState<ApplicationStatus>('under_review');
  const [sellerNoteInput, setSellerNoteInput] = useState('');

  // Seller Chat
  const [sellerChatText, setSellerChatText] = useState('');
  const selectedConv = conversations.find((c) => c.id === activeConversationId) || conversations[0];

  const handleCreateVehicle = (e: React.FormEvent, isDraft = false) => {
    e.preventDefault();
    if (!title.trim() || !brand.trim()) {
      showToast('Validation Error', 'Vehicle title and brand are required.', 'error');
      return;
    }

    createVehicleListing({
      title: title.trim(),
      brand: brand.trim(),
      model: model.trim() || title.trim(),
      year: Number(year),
      category,
      price: Number(price),
      mileage: Number(mileage),
      condition,
      transmission,
      fuel,
      bodyType,
      color,
      location,
      description: description.trim() || 'Comprehensive service records, pristine condition, ready for LTO transfer.',
      financingAvailable,
      status: isDraft ? 'unpublished' : 'available',
    });

    // Reset and route to vehicles list
    setTitle('');
    setModel('');
    setDescription('');
    navigateTo('seller', { sellerTab: 'vehicles' });
  };

  const handleSaveVehicleEdit = (vehicleId: string) => {
    updateVehicleListing(vehicleId, {
      price: editPriceVal,
      status: editStatusVal,
    });
    setEditingVehicleId(null);
  };

  const handleUpdateApplication = () => {
    if (!respondingAppId) return;
    updateApplicationStatus(respondingAppId, newStatus, sellerNoteInput.trim());
    setRespondingAppId(null);
    setSellerNoteInput('');
  };

  const handleSendSellerReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellerChatText.trim() || !selectedConv) return;
    sendMessage(selectedConv.id, sellerChatText.trim());
    setSellerChatText('');
  };

  const sellerTabs: { id: SellerTab; label: string; icon: any; count?: number }[] = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'sales_report', label: 'Sales Report', icon: BarChart3 },
    { id: 'vehicles', label: 'My Vehicles', icon: Car, count: sellerVehicles.length },
    { id: 'add_vehicle', label: 'Add Vehicle', icon: PlusCircle },
    { id: 'applications', label: 'Applications', icon: FileCheck2, count: sellerApplications.length },
    { id: 'messages', label: 'Inquiries', icon: MessageSquare, count: conversations.length },
    { id: 'profile_settings', label: 'Dealership Store', icon: Store },
  ];

  return (
    <div className="min-h-screen bg-[#F7F8F8] pb-24">
      {/* Seller Portal Header Banner */}
      <div className="bg-[#F7F8F8] text-[#141517] pt-10 pb-8 border-b-2 border-[#141517]">
        <div className="gb-container flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-center gap-3.5 sm:gap-4">
            <div className="w-12 h-12 border-2 border-[#141517] text-[#141517] flex items-center justify-center font-bold shrink-0">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="font-display text-[clamp(1.6rem,3vw,2.4rem)] leading-none text-[#141517]">
                  Groom Broom Certified Motors
                </h1>
                <span className="text-[#141517] text-[11px] font-semibold px-2 py-1 border border-[#8C989F] uppercase tracking-[0.06em] flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Verified dealership
                </span>
              </div>
              <p className="text-[13px] text-[#4E585E] mt-2 flex items-center gap-1.5 flex-wrap">
                <span className="text-[#141517] font-semibold">Flagship merchant</span>
                <span className="text-[#4E585E]">·</span>
                <span>Bonifacio Global City, Taguig City, Philippines</span>
                <span className="text-[#4E585E]">·</span>
                <span className="text-[#6B767D]">Merchant Hub ID: GB-DEALER-01</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigateTo('seller', { sellerTab: 'sales_report' })}
              className={`px-4 py-2.5 font-semibold text-[13px] flex items-center gap-2 cursor-pointer ${
                sellerTab === 'sales_report'
                  ? 'bg-[#1D5FD1] text-white'
                  : 'bg-white hover:bg-[#EEF1F2] text-[#141517] border border-[#141517]'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Sales Report</span>
            </button>
            <button
              onClick={() => navigateTo('seller', { sellerTab: 'add_vehicle' })}
              className="px-4 py-2.5 bg-[#1D5FD1] hover:bg-[#174CA8] text-white font-semibold text-[13px] flex items-center gap-2 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Post Vehicle</span>
            </button>
          </div>
        </div>
      </div>

      <div className="gb-container pt-8 sm:pt-10">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Navigation Sidebar */}
          <aside className="w-full lg:w-64 shrink-0 space-y-2 lg:sticky lg:top-[89px] z-10">
            <div className="border-y-2 lg:border-y-0 lg:border-t-2 border-[#141517] py-1 lg:py-2 flex lg:flex-col overflow-x-auto scrollbar-none gap-0.5">
              {sellerTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = sellerTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => navigateTo('seller', { sellerTab: tab.id })}
                    className={`relative shrink-0 lg:w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-[13.5px] font-medium cursor-pointer whitespace-nowrap transition-colors duration-200 ${
                      isActive ? 'text-white' : 'text-[#2A2E31] hover:bg-[#EEF1F2] hover:text-[#141517]'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {isActive && (
                      <motion.span layoutId="seller-side-tab" transition={indicatorTransition} className="absolute inset-0 bg-[#141517]" aria-hidden="true" />
                    )}
                    <div className="relative flex items-center gap-2.5">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{tab.label}</span>
                    </div>
                    {tab.count !== undefined && tab.count > 0 && (
                      <span
                        className={`relative text-[10px] tabular-nums font-bold px-1.5 py-0.5 rounded-full transition-colors duration-200 ${
                          isActive
                            ? 'bg-white text-[#141517]'
                            : 'bg-[#EEF1F2] text-[#4E585E]'
                        }`}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Active Seller Section Content */}
          <main className="flex-1 w-full min-w-0 space-y-8">
            {/* 1. OVERVIEW DASHBOARD */}
            {sellerTab === 'dashboard' && (
              <div className="space-y-12">
                {/* Ledger: the dealership's figures as one ruled row */}
                <section aria-labelledby="ledger-heading">
                  <div className="flex items-end justify-between gap-4 pb-3 border-b-2 border-[#141517]">
                    <h2 id="ledger-heading" className="font-display text-[22px] leading-none text-[#141517]">Ledger</h2>
                    <span className="text-[12px] text-[#4E585E]">Demo data</span>
                  </div>
                  <dl className="grid grid-cols-2 md:grid-cols-4 border-b border-[#C9D1D6]">
                    {[
                      { label: 'Live listings', value: sellerVehicles.filter((v) => v.status === 'available').length.toLocaleString(), note: 'On the marketplace' },
                      { label: 'Open applications', value: sellerApplications.length.toLocaleString(), note: 'Awaiting your review' },
                      { label: 'Buyer chats', value: conversations.length.toLocaleString(), note: 'Active conversations' },
                      { label: 'Listing views', value: '12,480', note: 'This month' },
                    ].map((m, i) => (
                      <div key={m.label} className={`py-5 pr-4 ${i % 2 === 1 ? 'pl-4 border-l' : ''} ${i === 2 ? 'md:pl-4 md:border-l' : ''} ${i === 3 ? 'pl-4' : ''} ${i < 2 ? 'border-b md:border-b-0' : ''} border-[#C9D1D6]`}>
                        <dt className="gb-label">{m.label}</dt>
                        <dd className="mt-2 font-display text-[26px] sm:text-[32px] leading-none tabular-nums text-[#141517]">{m.value}</dd>
                        <dd className="mt-2 text-[12.5px] text-[#4E585E]">{m.note}</dd>
                      </div>
                    ))}
                  </dl>
                </section>

                {/* Closed sales by period */}
                <section aria-labelledby="sales-heading">
                  <div className="flex flex-wrap items-end justify-between gap-4 pb-3 border-b-2 border-[#141517]">
                    <h2 id="sales-heading" className="font-display text-[22px] leading-none text-[#141517]">Closed sales</h2>
                    <button
                      onClick={() => navigateTo('seller', { sellerTab: 'sales_report' })}
                      className="group inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#141517] cursor-pointer"
                    >
                      <span className="underline decoration-[#8C989F] group-hover:decoration-[#141517] underline-offset-4">Full sales report</span>
                      <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                  <table className="w-full text-[14px]">
                    <caption className="sr-only">Closed sales by period, demo data</caption>
                    <thead>
                      <tr className="text-left">
                        <th className="gb-label py-3 font-semibold">Period</th>
                        <th className="gb-label py-3 font-semibold text-right">Revenue</th>
                        <th className="gb-label py-3 font-semibold text-right hidden sm:table-cell">Units</th>
                        <th className="gb-label py-3 font-semibold text-right">Change</th>
                      </tr>
                    </thead>
                    <tbody className="tabular-nums">
                      {[
                        ['Today', '₱3,750,000', '2', '+53%'],
                        ['This week', '₱14,820,000', '8', '+22%'],
                        ['Month to date', '₱28,450,000', '16', '+14%'],
                        ['Year to date', '₱184,650,000', '98', '+29%'],
                      ].map(([period, revenue, units, change]) => (
                        <tr key={period} className="border-t border-[#C9D1D6]">
                          <td className="py-3.5 text-[#141517]">{period}</td>
                          <td className="py-3.5 text-right font-semibold text-[#141517]">{revenue}</td>
                          <td className="py-3.5 text-right text-[#4E585E] hidden sm:table-cell">{units}</td>
                          <td className="py-3.5 text-right text-[#141517]">{change}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>

                {/* Recent Applications Quick Table */}
                <div className="border-t-2 border-[#141517] pt-6 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#DDE3E6]">
                    <h2 className="font-display text-[22px] leading-tight text-[#141517]">
                      Recent Buyer Purchase Inquiries
                    </h2>
                    <button
                      onClick={() => navigateTo('seller', { sellerTab: 'applications' })}
                      className="text-[13px] font-semibold text-[#141517] underline decoration-[#8C989F] hover:decoration-[#141517] underline-offset-4 cursor-pointer"
                    >
                      View All
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[680px]">
                      <thead>
                        <tr className="border-b border-[#DDE3E6] text-[#6B767D] uppercase tabular-nums tracking-wider text-[10px]">
                          <th className="pb-2.5 font-bold">Reference</th>
                          <th className="pb-2.5 font-bold">Applicant</th>
                          <th className="pb-2.5 font-bold">Vehicle</th>
                          <th className="pb-2.5 font-bold">Method</th>
                          <th className="pb-2.5 font-bold">Status</th>
                          <th className="pb-2.5 font-bold text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#DDE3E6]">
                        {sellerApplications.slice(0, 4).map((app) => (
                          <tr key={app.id} className="hover:bg-[#F7F8F8] transition-colors">
                            <td className="py-3 tabular-nums font-bold text-[#141517]">{app.referenceNo}</td>
                            <td className="py-3 font-medium text-[#202426]">{app.applicantName}</td>
                            <td className="py-3 font-medium text-[#202426]">{app.vehicleTitle}</td>
                            <td className="py-3 capitalize text-[#4E585E]">{app.purchaseMethod}</td>
                            <td className="py-3">
                              <StatusMark status={app.status} />
                            </td>
                            <td className="py-3 text-right">
                              <button
                                onClick={() => {
                                  setRespondingAppId(app.id);
                                  setNewStatus(app.status);
                                }}
                                className="px-3 py-1 bg-[#EEF1F2] hover:bg-[#1D5FD1] hover:text-white rounded-[2px] text-xs font-semibold transition-colors cursor-pointer"
                              >
                                Update
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 2. SALES REPORT */}
            {sellerTab === 'sales_report' && <SellerSalesReport />}

            {/* 3. VEHICLES MANAGEMENT */}
            {sellerTab === 'vehicles' && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#C9D1D6]">
                  <h2 className="font-display text-[22px] leading-tight text-[#141517]">
                    Vehicle Inventory Management <span className="text-[#6B767D] font-normal">({sellerVehicles.length})</span>
                  </h2>
                  <button
                    onClick={() => navigateTo('seller', { sellerTab: 'add_vehicle' })}
                    className="px-4 py-2 bg-[#1D5FD1] hover:bg-[#174CA8] text-white font-bold text-xs rounded-[2px] flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Add Vehicle</span>
                  </button>
                </div>

                <div className="space-y-3.5">
                  {sellerVehicles.map((vehicle) => (
                    <div
                      key={vehicle.id}
                      className="border-t border-[#C9D1D6] pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <img
                          src={vehicle.images[0]}
                          alt={vehicle.title}
                          className="w-20 h-14 rounded-[2px] object-cover bg-[#141517] shrink-0 border border-gray-800"
                        />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="font-bold text-[#141517] text-sm">{vehicle.title}</span>
                            <StatusMark status={vehicle.status} />
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#4E585E] mt-1 tabular-nums">
                            <span className="text-[#141517] font-bold">
                              ₱{vehicle.price.toLocaleString()}
                            </span>
                            <span>·</span>
                            <span>{vehicle.mileage.toLocaleString()} km</span>
                            <span>·</span>
                            <span className="font-sans capitalize">{vehicle.category}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          onClick={() => {
                            setEditingVehicleId(vehicle.id);
                            setEditPriceVal(vehicle.price);
                            setEditStatusVal(vehicle.status);
                          }}
                          className="px-3 py-1.5 border border-[#C9D1D6] hover:bg-[#F7F8F8] text-[#2A2E31] text-xs font-semibold rounded-[2px] flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => window.open(portalUrl('buyer', `?vehicle=${vehicle.id}`), '_blank', 'noopener')}
                          className="px-3 py-1.5 bg-[#EEF1F2] hover:bg-gray-200 text-[#141517] text-xs font-semibold rounded-[2px] flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>

                        <button
                          onClick={() => deleteVehicleListing(vehicle.id)}
                          className="p-2 text-[#6B767D] hover:text-[#B42318] hover:bg-white rounded-[2px] transition-colors cursor-pointer"
                          title="Delete Listing"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. ADD VEHICLE FORM */}
            {sellerTab === 'add_vehicle' && (
              <div className="border-t-2 border-[#141517] pt-6 space-y-6">
                <div>
                  <h2 className="font-display text-[22px] leading-tight text-[#141517]">Post a Vehicle for Sale</h2>
                  <p className="text-xs text-[#4E585E] mt-1">
                    Your listing will be indexed across the Groom Broom automotive inventory.
                  </p>
                </div>

                <form onSubmit={(e) => handleCreateVehicle(e, false)} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="gb-label block mb-2">
                        Vehicle Headline Title *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 2025 Honda Civic RS Turbo"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517]"
                        required
                      />
                    </div>

                    <div>
                      <label className="gb-label block mb-2">
                        Category *
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value as any)}
                        className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517] cursor-pointer"
                      >
                        <option value="cars">Cars & Sedans</option>
                        <option value="motorcycles">Motorcycles & Superbikes</option>
                        <option value="trucks">Trucks & Pickups</option>
                        <option value="ebikes">Smart E-Bikes</option>
                        <option value="scooters">Scooters & Maxi-Scooters</option>
                        <option value="atvs">ATVs & Buggies</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="gb-label block mb-2">Brand *</label>
                      <input
                        type="text"
                        placeholder="e.g. Honda, Porsche, Toyota"
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                        className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517]"
                        required
                      />
                    </div>

                    <div>
                      <label className="gb-label block mb-2">Model *</label>
                      <input
                        type="text"
                        placeholder="e.g. Civic RS, 911 Carrera"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517]"
                      />
                    </div>

                    <div>
                      <label className="gb-label block mb-2">Year *</label>
                      <input
                        type="number"
                        value={year}
                        onChange={(e) => setYear(Number(e.target.value))}
                        className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517]"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="gb-label block mb-2">Price (₱) *</label>
                      <input
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(Number(e.target.value))}
                        className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517]"
                        required
                      />
                    </div>

                    <div>
                      <label className="gb-label block mb-2">Mileage (km)</label>
                      <input
                        type="number"
                        value={mileage}
                        onChange={(e) => setMileage(Number(e.target.value))}
                        className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517]"
                      />
                    </div>

                    <div>
                      <label className="gb-label block mb-2">Condition</label>
                      <select
                        value={condition}
                        onChange={(e) => setCondition(e.target.value as any)}
                        className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517] cursor-pointer"
                      >
                        <option value="New">New</option>
                        <option value="Certified Pre-Owned">Certified Pre-Owned</option>
                        <option value="Used">Used</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="gb-label block mb-2">Transmission</label>
                      <select
                        value={transmission}
                        onChange={(e) => setTransmission(e.target.value as any)}
                        className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517] cursor-pointer"
                      >
                        <option value="Automatic">Automatic</option>
                        <option value="Manual">Manual</option>
                        <option value="CVT">CVT</option>
                        <option value="Dual-Clutch">Dual-Clutch</option>
                        <option value="Direct Drive">Direct Drive (Electric)</option>
                      </select>
                    </div>

                    <div>
                      <label className="gb-label block mb-2">Fuel Type</label>
                      <select
                        value={fuel}
                        onChange={(e) => setFuel(e.target.value as any)}
                        className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517] cursor-pointer"
                      >
                        <option value="Gasoline">Gasoline</option>
                        <option value="Diesel">Diesel</option>
                        <option value="Hybrid">Hybrid</option>
                        <option value="Electric">Electric</option>
                      </select>
                    </div>

                    <div>
                      <label className="gb-label block mb-2">Location</label>
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="gb-label block mb-2">
                      Full Description & Vehicle Condition Notes
                    </label>
                    <textarea
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Detail maintenance records, tire health, registered OR/CR status..."
                      className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517]"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="sellerFinancing"
                      checked={financingAvailable}
                      onChange={(e) => setFinancingAvailable(e.target.checked)}
                      className="w-4 h-4 accent-[#1D5FD1]"
                    />
                    <label htmlFor="sellerFinancing" className="text-xs font-semibold text-[#2A2E31] cursor-pointer">
                      Offer low-downpayment partner financing on this vehicle
                    </label>
                  </div>

                  <div className="flex gap-3 pt-3">
                    <button
                      type="button"
                      onClick={(e) => handleCreateVehicle(e, true)}
                      className="py-3 px-5 border border-[#C9D1D6] hover:bg-[#F7F8F8] text-[#2A2E31] font-semibold text-xs rounded-[2px] cursor-pointer transition-colors"
                    >
                      Save as Draft
                    </button>
                    <button
                      type="submit"
                      className="py-3 px-6 bg-[#1D5FD1] hover:bg-[#174CA8] text-white font-bold text-xs rounded-[2px] transition-colors cursor-pointer"
                    >
                      Publish Listing Now
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* 5. APPLICATIONS TAB */}
            {sellerTab === 'applications' && (
              <div className="space-y-6">
                <div className="pb-3 border-b border-[#C9D1D6]">
                  <h2 className="font-display text-[22px] leading-tight text-[#141517]">
                    Buyer Applications <span className="text-[#6B767D] font-normal">({sellerApplications.length})</span>
                  </h2>
                </div>
                <div className="space-y-4">
                  {sellerApplications.map((app) => (
                    <div
                      key={app.id}
                      className="border-t-2 border-[#141517] pt-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="tabular-nums text-xs font-bold text-[#6B767D]">
                            {app.referenceNo}
                          </span>
                          <StatusMark status={app.status} />
                        </div>
                        <h3 className="font-bold text-[#141517] text-sm">
                          {app.applicantName} · <span className="text-[#4E585E] font-normal tabular-nums">{app.applicantPhone}</span>
                        </h3>
                        <p className="text-xs text-[#4E585E]">
                          Applied for: <strong>{app.vehicleTitle}</strong> (₱{app.vehiclePrice.toLocaleString()})
                        </p>
                        <p className="text-[11px] text-[#6B767D] tabular-nums">
                          Submitted {new Date(app.submittedAt).toLocaleDateString()} · Method: {app.purchaseMethod.toUpperCase()}
                        </p>
                        {app.notes && (
                          <p className="text-xs bg-[#F7F8F8] border border-[#C9D1D6] p-3 rounded-[2px] text-[#2A2E31] mt-2">
                            <strong>Buyer Note:</strong> "{app.notes}"
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-center">
                        <button
                          onClick={() => {
                            setRespondingAppId(app.id);
                            setNewStatus(app.status);
                            setSellerNoteInput(app.sellerNotes || '');
                          }}
                          className="px-4 py-2 bg-[#1D5FD1] hover:bg-[#174CA8] text-white font-bold text-xs rounded-[2px] transition-colors cursor-pointer"
                        >
                          Update Status
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 6. MESSAGES TAB */}
            {sellerTab === 'messages' && (
              <div className="bg-white rounded-[2px] border border-[#C9D1D6] overflow-hidden h-[560px] flex flex-col md:flex-row">
                <div className="w-full md:w-80 border-r border-[#C9D1D6] flex flex-col bg-[#F7F8F8]/50 max-h-48 md:max-h-none shrink-0">
                  <div className="p-4 border-b border-[#C9D1D6] text-xs font-bold uppercase tracking-wider text-[#2A2E31] tabular-nums">
                    Buyer Inquiries ({conversations.length})
                  </div>
                  <div className="flex-1 overflow-y-auto divide-y divide-[#DDE3E6]">
                    {conversations.map((conv) => (
                      <div
                        key={conv.id}
                        onClick={() => setActiveConversationId(conv.id)}
                        className={`p-3.5 cursor-pointer text-xs transition-colors ${
                          selectedConv?.id === conv.id ? 'bg-white font-bold outline outline-1 outline-[#141517] -outline-offset-1' : 'hover:bg-[#EEF1F2]/70'
                        }`}
                      >
                        <p className="text-[#141517] font-bold">{conv.buyerName}</p>
                        <p className="text-[11px] text-[#4E585E] font-normal truncate mt-0.5">
                          {conv.vehicleTitle}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex-1 flex flex-col h-full bg-white">
                  {selectedConv ? (
                    <>
                      <div className="p-4 border-b border-[#C9D1D6] text-xs font-bold text-[#141517] bg-[#F7F8F8]/50">
                        Chatting with {selectedConv.buyerName} ({selectedConv.vehicleTitle})
                      </div>
                      <div className="flex-1 p-5 overflow-y-auto space-y-3.5">
                        {selectedConv.messages.map((m) => (
                          <div
                            key={m.id}
                            className={`flex flex-col ${m.isSeller ? 'items-end' : 'items-start'}`}
                          >
                            <div
                              className={`max-w-xs rounded-[2px] px-4 py-2.5 text-xs leading-relaxed ${
                                m.isSeller
                                  ? 'bg-[#1D5FD1] text-white rounded-tr-xs'
                                  : 'bg-[#EEF1F2] text-[#141517] rounded-tl-xs'
                              }`}
                            >
                              {m.text}
                            </div>
                            <span className="text-[10px] text-[#6B767D] mt-1 tabular-nums">
                              {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))}
                      </div>
                      <form onSubmit={handleSendSellerReply} className="p-3.5 border-t border-[#C9D1D6] flex gap-2.5 bg-[#F7F8F8]/30">
                        <input
                          type="text"
                          placeholder="Reply to buyer..."
                          value={sellerChatText}
                          onChange={(e) => setSellerChatText(e.target.value)}
                          className="flex-1 px-3.5 py-2.5 text-xs bg-white border border-[#C9D1D6] rounded-[2px] focus:border-[#1D5FD1]"
                        />
                        <button
                          type="submit"
                          className="px-5 py-2.5 bg-[#1D5FD1] hover:bg-[#174CA8] text-white rounded-[2px] text-xs font-bold cursor-pointer transition-colors"
                        >
                          Send
                        </button>
                      </form>
                    </>
                  ) : (
                    <div className="p-6 text-center text-xs text-[#6B767D]">No conversation selected.</div>
                  )}
                </div>
              </div>
            )}

            {/* 7. PROFILE / STORE */}
            {sellerTab === 'profile_settings' && (
              <div className="border-t-2 border-[#141517] pt-6 space-y-6">
                <div>
                  <h2 className="font-display text-[22px] leading-tight text-[#141517]">Dealer Storefront Profile</h2>
                  <p className="text-xs text-[#4E585E] mt-1">
                    This verified profile is displayed to buyers on your vehicle listings.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="gb-label block mb-2">Dealership Name</label>
                    <input
                      type="text"
                      defaultValue="Groom Broom Certified Motors"
                      className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517] font-medium"
                    />
                  </div>
                  <div>
                    <label className="gb-label block mb-2">Showroom Address</label>
                    <input
                      type="text"
                      defaultValue="Groom Broom Flagship Hub, 32nd St, Bonifacio Global City, Taguig City, Metro Manila"
                      className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517] font-medium"
                    />
                  </div>
                  <div>
                    <label className="gb-label block mb-2">Dealership Bio</label>
                    <textarea
                      rows={3}
                      defaultValue="Official flagship certified automotive merchant of Groom Broom. Complete LTO documentation, verified 160-point multi-point inspection warranty, guaranteed clean titles, and seamless vehicle financing."
                      className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517] font-medium"
                    />
                  </div>

                  <button
                    onClick={() => showToast('Store Profile Saved', 'Public dealership details refreshed.')}
                    className="py-3 px-6 bg-[#1D5FD1] hover:bg-[#174CA8] text-white font-bold text-xs rounded-[2px] cursor-pointer transition-colors"
                  >
                    Save Storefront Details
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Edit Vehicle Modal */}
      {editingVehicleId && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#141517]/50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white p-6 space-y-4 border border-[#141517] animate-modal-in">
            <div className="flex items-center justify-between pb-2 border-b border-[#DDE3E6]">
              <h3 className="font-display text-[18px] leading-tight text-[#141517]">Quick Edit Vehicle</h3>
              <button
                onClick={() => setEditingVehicleId(null)}
                className="p-1 rounded-[2px] text-[#6B767D] hover:text-[#2A2E31] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="gb-label block mb-2">Selling Price (₱)</label>
              <input
                type="number"
                value={editPriceVal}
                onChange={(e) => setEditPriceVal(Number(e.target.value))}
                className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517]"
              />
            </div>

            <div>
              <label className="gb-label block mb-2">Listing Status</label>
              <select
                value={editStatusVal}
                onChange={(e) => setEditStatusVal(e.target.value as VehicleStatus)}
                className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517] cursor-pointer"
              >
                <option value="available">Available (Public)</option>
                <option value="reserved">Reserved (Under Contract)</option>
                <option value="sold">Sold</option>
                <option value="unpublished">Unpublished (Hidden)</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#DDE3E6]">
              <button
                onClick={() => setEditingVehicleId(null)}
                className="px-4 py-2 border border-[#C9D1D6] hover:bg-[#F7F8F8] rounded-[2px] text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveVehicleEdit(editingVehicleId)}
                className="px-4 py-2 bg-[#1D5FD1] hover:bg-[#174CA8] text-white rounded-[2px] text-xs font-bold cursor-pointer transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Application Modal */}
      {respondingAppId && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#141517]/50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white p-6 space-y-4 border border-[#141517] animate-modal-in">
            <div className="flex items-center justify-between pb-2 border-b border-[#DDE3E6]">
              <h3 className="font-display text-[18px] leading-tight text-[#141517]">Update Application Progress</h3>
              <button
                onClick={() => setRespondingAppId(null)}
                className="p-1 rounded-[2px] text-[#6B767D] hover:text-[#2A2E31] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="gb-label block mb-2">Status</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as ApplicationStatus)}
                className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517] cursor-pointer"
              >
                <option value="under_review">Under Review</option>
                <option value="contacted">Contacted Buyer</option>
                <option value="approved">Approved for Viewing/Sale</option>
                <option value="declined">Declined</option>
                <option value="completed">Completed Transaction</option>
              </select>
            </div>

            <div>
              <label className="gb-label block mb-2">
                Seller Response Message / Schedule Details
              </label>
              <textarea
                rows={3}
                value={sellerNoteInput}
                onChange={(e) => setSellerNoteInput(e.target.value)}
                placeholder="e.g. Scheduled viewing for Saturday at 2 PM. Please bring 2 valid IDs."
                className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#DDE3E6]">
              <button
                onClick={() => setRespondingAppId(null)}
                className="px-4 py-2 border border-[#C9D1D6] hover:bg-[#F7F8F8] rounded-[2px] text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateApplication}
                className="px-4 py-2 bg-[#1D5FD1] hover:bg-[#174CA8] text-white rounded-[2px] text-xs font-bold cursor-pointer transition-colors"
              >
                Update Status
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
