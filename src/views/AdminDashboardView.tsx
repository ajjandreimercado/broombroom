import React, { useState } from 'react';
import { StatusMark } from '../components/StatusMark.tsx';
import { useApp } from '../context/AppContext.tsx';
import { AdminTab } from '../context/AppContext.tsx';
import {
  ShieldAlert,
  Car,
  Users,
  FileText,
  Layers,
  Settings,
  CheckCircle,
  XCircle,
  Eye,
  Trash2,
  AlertTriangle,
  Flag,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

export const AdminDashboardView: React.FC = () => {
  const {
    adminTab,
    navigateTo,
    vehicles,
    reports,
    applications,
    adminApproveVehicle,
    adminUnpublishVehicle,
    adminDeleteVehicle,
    adminResolveReport,
    showToast,
  } = useApp();

  const adminTabs: { id: AdminTab; label: string; icon: any; count?: number }[] = [
    { id: 'dashboard', label: 'Platform Pulse', icon: Layers },
    { id: 'vehicles', label: 'Vehicle Moderation', icon: Car, count: vehicles.length },
    { id: 'reports', label: 'Safety Reports', icon: Flag, count: reports.filter((r) => r.status === 'pending').length },
    { id: 'applications', label: 'All Applications', icon: FileText, count: applications.length },
    { id: 'sellers', label: 'Seller Verification', icon: Users },
    { id: 'categories', label: 'Vehicle Taxonomy', icon: Layers },
  ];

  return (
    <div className="min-h-screen bg-[#F7F8F8] pb-24">
      {/* Admin Top Banner */}
      <div className="bg-[#F7F8F8] text-[#141517] pt-10 pb-8 border-b-2 border-[#141517]">
        <div className="gb-container flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 border-2 border-[#141517] text-[#141517] flex items-center justify-center font-bold">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-display text-[clamp(1.6rem,3vw,2.4rem)] leading-none">Administration console</h1>
              <p className="text-[13px] text-[#4E585E] mt-2">Content moderation, seller verification, platform governance</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[13px] border border-[#C9D1D6] bg-white px-3 py-2 text-[#141517] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#141517]" />
              <span>Platform Online</span>
            </span>
          </div>
        </div>
      </div>

      <div className="gb-container pt-8 sm:pt-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Navigation Sidebar */}
          <aside className="lg:col-span-3 space-y-2">
            <div className="border-y-2 lg:border-y-0 lg:border-t-2 border-[#141517] py-1 lg:py-2 flex lg:flex-col overflow-x-auto scrollbar-none gap-0.5">
              {adminTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = adminTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => navigateTo('admin', { adminTab: tab.id })}
                    className={`shrink-0 lg:w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-[13.5px] font-medium cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-[#141517] text-white'
                        : 'text-[#2A2E31] hover:bg-[#F7F8F8] hover:text-[#141517]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{tab.label}</span>
                    </div>
                    {tab.count !== undefined && tab.count > 0 && (
                      <span
                        className={`text-[10px] tabular-nums font-bold px-1.5 py-0.5 rounded-full ${
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

          {/* Active Admin Section Content */}
          <main className="lg:col-span-9">
            {/* 1. PULSE / DASHBOARD */}
            {adminTab === 'dashboard' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-6">
                  <div className="border-t-2 border-[#141517] pt-6">
                    <span className="gb-label block">Total Vehicles</span>
                    <span className="font-display text-[30px] leading-none text-[#141517] tabular-nums mt-1.5 block">
                      {vehicles.length}
                    </span>
                    <span className="text-[11px] text-[#141517] font-semibold mt-1.5 block">
                      100% compliant
                    </span>
                  </div>

                  <div className="border-t-2 border-[#141517] pt-6">
                    <span className="gb-label block">Active Applications</span>
                    <span className="font-display text-[30px] leading-none text-[#141517] tabular-nums mt-1.5 block">
                      {applications.length}
                    </span>
                    <span className="text-[11px] text-[#4E585E] font-medium mt-1.5 block">Platform-wide</span>
                  </div>

                  <div className="border-t-2 border-[#141517] pt-6">
                    <span className="gb-label block">Pending Reports</span>
                    <span className="font-display text-[30px] leading-none text-[#141517] tabular-nums mt-1.5 block">
                      {reports.filter((r) => r.status === 'pending').length}
                    </span>
                    <span className="text-[11px] text-[#4E585E] font-medium mt-1.5 block">Requires review</span>
                  </div>

                  <div className="border-t-2 border-[#141517] pt-6">
                    <span className="gb-label block">Dealership Partners</span>
                    <span className="font-display text-[30px] leading-none text-[#141517] tabular-nums mt-1.5 block">
                      6
                    </span>
                    <span className="text-[11px] text-[#141517] font-semibold mt-1.5 block">Verified Shield</span>
                  </div>
                </div>

                {/* Reports Console */}
                <div className="border-t-2 border-[#141517] pt-6 space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-[#DDE3E6]">
                    <h2 className="font-display text-[22px] leading-tight text-[#141517] flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-[#141517]" />
                      <span>Pending Listing Flag Reports</span>
                    </h2>
                    <button
                      onClick={() => navigateTo('admin', { adminTab: 'reports' })}
                      className="text-[13px] font-semibold text-[#141517] underline decoration-[#8C989F] hover:decoration-[#141517] underline-offset-4 cursor-pointer"
                    >
                      View All Reports
                    </button>
                  </div>

                  {reports.length === 0 ? (
                    <p className="text-xs text-[#4E585E] py-6 text-center tabular-nums">No active user reports.</p>
                  ) : (
                    <div className="space-y-3.5">
                      {reports.map((report) => (
                        <div
                          key={report.id}
                          className="p-5 bg-[#F7F8F8] border border-[#C9D1D6] rounded-[2px] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[#141517]">{report.vehicleTitle}</span>
                              <span className="px-2 py-0.5 rounded-[2px] text-[10px] font-bold bg-white text-[#B42318]">
                                {report.reason}
                              </span>
                            </div>
                            <p className="text-[#4E585E] mt-1.5">"{report.details}"</p>
                            <p className="text-[11px] text-[#6B767D] mt-1 tabular-nums">
                              Reported by: {report.reportedBy} ({report.reportedEmail})
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => adminResolveReport(report.id, 'dismiss')}
                              className="px-3.5 py-1.5 border border-[#C9D1D6] hover:bg-[#EEF1F2] rounded-[2px] font-semibold text-[#2A2E31] transition-colors cursor-pointer"
                            >
                              Dismiss
                            </button>
                            <button
                              onClick={() => adminResolveReport(report.id, 'unpublish_vehicle')}
                              className="px-3.5 py-1.5 bg-[#B42318] hover:bg-[#B42318] text-white rounded-[2px] font-bold transition-colors cursor-pointer"
                            >
                              Unpublish Vehicle
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 2. VEHICLES MODERATION */}
            {adminTab === 'vehicles' && (
              <div className="border-t-2 border-[#141517] pt-6 space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-[#DDE3E6]">
                  <h2 className="font-display text-[22px] leading-tight text-[#141517]">
                    Marketplace Vehicle Moderation <span className="text-[#6B767D] font-normal">({vehicles.length})</span>
                  </h2>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[680px]">
                    <thead>
                      <tr className="border-b border-[#DDE3E6] text-[#6B767D] uppercase tabular-nums tracking-wider text-[10px]">
                        <th className="pb-2.5 font-bold">Vehicle</th>
                        <th className="pb-2.5 font-bold">Seller</th>
                        <th className="pb-2.5 font-bold">Price</th>
                        <th className="pb-2.5 font-bold">Status</th>
                        <th className="pb-2.5 font-bold text-right">Moderation Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#DDE3E6]">
                      {vehicles.map((v) => (
                        <tr key={v.id} className="hover:bg-[#F7F8F8] transition-colors">
                          <td className="py-3.5 font-semibold text-[#141517] flex items-center gap-3">
                            <img src={v.images[0]} alt="" className="w-11 h-8 rounded-[2px] object-cover bg-[#141517] shrink-0" />
                            <span className="truncate max-w-[200px]">{v.title}</span>
                          </td>
                          <td className="py-3.5 text-[#4E585E]">{v.sellerName}</td>
                          <td className="py-3.5 tabular-nums font-bold text-[#141517]">
                            ₱{v.price.toLocaleString()}
                          </td>
                          <td className="py-3.5">
                            <StatusMark status={v.status} />
                          </td>
                          <td className="py-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {v.status === 'unpublished' ? (
                                <button
                                  onClick={() => adminApproveVehicle(v.id)}
                                  className="px-3 py-1 bg-[#141517] hover:bg-[#141517] text-white rounded-[2px] text-xs font-semibold cursor-pointer transition-colors"
                                >
                                  Approve
                                </button>
                              ) : (
                                <button
                                  onClick={() => adminUnpublishVehicle(v.id)}
                                  className="px-3 py-1 border border-[#C9D1D6] hover:bg-[#EEF1F2] rounded-[2px] text-xs font-semibold text-[#2A2E31] cursor-pointer transition-colors"
                                >
                                  Unpublish
                                </button>
                              )}
                              <button
                                onClick={() => adminDeleteVehicle(v.id)}
                                className="p-1.5 text-[#6B767D] hover:text-[#B42318] hover:bg-white rounded-[2px] cursor-pointer transition-colors"
                                title="Remove vehicle"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 3. SAFETY REPORTS */}
            {adminTab === 'reports' && (
              <div className="border-t-2 border-[#141517] pt-6 space-y-5">
                <div className="pb-3 border-b border-[#DDE3E6]">
                  <h2 className="font-display text-[22px] leading-tight text-[#141517]">Safety & Listing Reports</h2>
                </div>
                <div className="space-y-4">
                  {reports.map((report) => (
                    <div key={report.id} className="p-5 border border-[#C9D1D6] rounded-[2px] space-y-3 text-xs bg-[#F7F8F8]/40">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-[#141517] text-sm">{report.vehicleTitle}</span>
                        <span className="font-bold uppercase text-[#B42318] bg-white border border-[#B42318] px-2.5 py-0.5 rounded-[2px] text-[10px] tabular-nums">
                          {report.status}
                        </span>
                      </div>
                      <p className="text-[#2A2E31]">Reason: <strong>{report.reason}</strong></p>
                      <p className="text-[#4E585E] border-t-2 border-[#141517] pt-6 leading-relaxed">
                        {report.details}
                      </p>
                      <div className="flex gap-2.5 pt-1">
                        <button
                          onClick={() => adminResolveReport(report.id, 'dismiss')}
                          className="px-4 py-2 border border-[#C9D1D6] hover:bg-[#F7F8F8] rounded-[2px] text-xs font-semibold cursor-pointer transition-colors"
                        >
                          Dismiss
                        </button>
                        <button
                          onClick={() => adminResolveReport(report.id, 'unpublish_vehicle')}
                          className="px-4 py-2 bg-[#B42318] hover:bg-[#B42318] text-white rounded-[2px] text-xs font-bold cursor-pointer transition-colors"
                        >
                          Take Down Listing
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. APPLICATIONS OVERVIEW */}
            {adminTab === 'applications' && (
              <div className="border-t-2 border-[#141517] pt-6 space-y-5">
                <div className="pb-3 border-b border-[#DDE3E6]">
                  <h2 className="font-display text-[22px] leading-tight text-[#141517]">
                    Global Vehicle Applications <span className="text-[#6B767D] font-normal">({applications.length})</span>
                  </h2>
                </div>
                <div className="space-y-3.5">
                  {applications.map((app) => (
                    <div
                      key={app.id}
                      className="p-5 border border-[#C9D1D6] rounded-[2px] flex items-center justify-between text-xs hover:bg-[#F7F8F8]/60 transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="tabular-nums font-bold text-[#6B767D]">{app.referenceNo}</span>
                          <span className="font-bold text-[#141517]">{app.applicantName}</span>
                        </div>
                        <p className="text-[#4E585E] mt-1">
                          {app.vehicleTitle} · Seller: {app.sellerName}
                        </p>
                      </div>
                      <StatusMark status={app.status} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5. SELLERS */}
            {adminTab === 'sellers' && (
              <div className="border-t-2 border-[#141517] pt-6 space-y-5">
                <div className="pb-3 border-b border-[#DDE3E6]">
                  <h2 className="font-display text-[22px] leading-tight text-[#141517]">Verified Sellers & Dealerships</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { name: 'Groom Broom Certified Motors', loc: 'BGC Taguig, Metro Manila', rating: 4.9, count: 142 },
                    { name: 'MotoKinetics Superbike Hub', loc: 'Makati, Metro Manila', rating: 4.8, count: 88 },
                    { name: 'Pampanga Premier Motors', loc: 'San Fernando, Pampanga', rating: 4.9, count: 215 },
                    { name: 'Visayas Wheels Prestige', loc: 'Cebu City, Cebu', rating: 4.7, count: 94 },
                  ].map((s) => (
                    <div key={s.name} className="p-5 border border-[#C9D1D6] rounded-[2px] text-xs space-y-1.5 bg-[#F7F8F8]/50">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#141517] text-sm">{s.name}</span>
                        <span className="text-[10px] font-bold text-[#141517] bg-white border border-[#8C989F] px-2 py-0.5 rounded-[2px] tabular-nums">
                          VERIFIED
                        </span>
                      </div>
                      <p className="text-[#4E585E]">{s.loc}</p>
                      <p className="text-[#202426] font-semibold pt-1">Rated {s.rating} / 5 ({s.count} verified transactions)</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 6. CATEGORIES */}
            {adminTab === 'categories' && (
              <div className="border-t-2 border-[#141517] pt-6 space-y-5">
                <div className="pb-3 border-b border-[#DDE3E6]">
                  <h2 className="font-display text-[22px] leading-tight text-[#141517]">Marketplace Vehicle Categories</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {[
                    { name: 'Cars & Sedans', key: 'cars', count: 4 },
                    { name: 'Motorcycles & Superbikes', key: 'motorcycles', count: 2 },
                    { name: 'Trucks & Pickups', key: 'trucks', count: 2 },
                    { name: 'Smart E-Bikes', key: 'ebikes', count: 1 },
                    { name: 'Scooters & Maxi-Scooters', key: 'scooters', count: 2 },
                    { name: 'ATVs & Off-Road Buggies', key: 'atvs', count: 1 },
                  ].map((c) => (
                    <div key={c.key} className="p-5 border border-[#C9D1D6] rounded-[2px] text-xs space-y-1 bg-[#F7F8F8]/50">
                      <p className="font-bold text-[#141517] text-sm">{c.name}</p>
                      <p className="text-[#6B767D] tabular-nums text-[11px]">{c.count} active listings</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};
