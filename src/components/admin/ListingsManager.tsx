import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { StatusMark } from '../StatusMark.tsx';
import { AGENTS } from '../../data/mockData.ts';
import { Vehicle, VehicleStatus } from '../../types.ts';
import { FilterTabs, SectionHeader, EmptyState, Drawer, btn, peso } from './ui.tsx';
import { PlusCircle, Search, ExternalLink } from 'lucide-react';
import { portalUrl } from '../../portals.ts';

// How the admin talks about listing states (stored values stay the same).
export const STATUS_LABEL: Record<VehicleStatus, string> = {
  available: 'Approved',
  reserved: 'Reserved',
  sold: 'Released',
  unpublished: 'Disapproved',
};
const STATUS_HELP: Record<VehicleStatus, string> = {
  available: 'Live on the marketplace; clients can apply.',
  reserved: 'Held for a client whose application was approved.',
  sold: 'Sale completed and the unit released to the client.',
  unpublished: 'Hidden from the marketplace.',
};
const ORDER: VehicleStatus[] = ['available', 'reserved', 'sold', 'unpublished'];

// The status controls for one listing, used in the listings panel and the agent panel.
export const StatusControl: React.FC<{ vehicle: Vehicle }> = ({ vehicle }) => {
  const { setVehicleStatus } = useApp();
  return (
    <div>
      <span className="gb-label block mb-2">Listing status</span>
      <div className="grid grid-cols-2 border border-[#8C989F]" role="radiogroup" aria-label={`Status of ${vehicle.title}`}>
        {ORDER.map((st, i) => {
          const active = vehicle.status === st;
          return (
            <button
              key={st}
              role="radio"
              aria-checked={active}
              onClick={() => !active && setVehicleStatus(vehicle.id, st)}
              className={`px-3 py-2.5 text-[13px] text-left cursor-pointer transition-colors duration-200 ${i % 2 ? 'border-l border-[#8C989F]' : ''} ${i > 1 ? 'border-t border-[#8C989F]' : ''} ${
                active ? 'bg-[#141517] text-white font-semibold' : 'text-[#141517] hover:bg-[#EEF1F2]'
              }`}
            >
              {STATUS_LABEL[st]}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[12.5px] text-[#4E585E]">{STATUS_HELP[vehicle.status]}</p>
    </div>
  );
};

export const ListingDetail: React.FC<{ vehicle: Vehicle; onDeleted: () => void }> = ({ vehicle, onDeleted }) => {
  const { applications, deleteVehicleListing } = useApp();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const apps = applications.filter((a) => a.vehicleId === vehicle.id);
  return (
    <div className="space-y-6">
      <img src={vehicle.images[0]} alt="" className="w-full aspect-[16/10] object-cover bg-[#EEF1F2]" />
      <div>
        <p className="font-display text-[22px] leading-tight text-[#141517]">{peso(vehicle.price)}</p>
        <dl className="mt-3 grid grid-cols-2 gap-y-2 text-[13px]">
          <dt className="text-[#4E585E]">Agent</dt><dd className="text-[#141517] font-medium">{vehicle.sellerName}</dd>
          <dt className="text-[#4E585E]">Condition</dt><dd className="text-[#141517]">{vehicle.condition}</dd>
          <dt className="text-[#4E585E]">Location</dt><dd className="text-[#141517]">{vehicle.location}</dd>
          <dt className="text-[#4E585E]">Mileage</dt><dd className="text-[#141517] tabular-nums">{vehicle.mileage.toLocaleString()} km</dd>
        </dl>
      </div>
      <StatusControl vehicle={vehicle} />
      <div>
        <span className="gb-label block mb-2">Applications on this listing</span>
        {apps.length === 0 ? (
          <p className="text-[13px] text-[#4E585E]">None yet.</p>
        ) : (
          <ul className="border-t border-[#C9D1D6]">
            {apps.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-2.5 border-b border-[#DDE3E6] text-[13px]">
                <span className="text-[#141517]">{a.applicantName} <span className="text-[#4E585E] tabular-nums">· {a.referenceNo}</span></span>
                <StatusMark status={a.status} />
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex flex-wrap gap-2 pt-2 border-t border-[#C9D1D6]">
        <a href={portalUrl('buyer', `?vehicle=${vehicle.id}`)} target="_blank" rel="noopener" className={`${btn.outline} inline-flex items-center gap-1.5`}>
          <ExternalLink className="w-4 h-4" aria-hidden="true" /> View public page
        </a>
        {confirmDelete ? (
          <button
            className="px-3.5 py-2 bg-[#B42318] text-white text-[13px] font-semibold cursor-pointer"
            onClick={() => {
              deleteVehicleListing(vehicle.id);
              onDeleted();
            }}
          >
            Confirm delete
          </button>
        ) : (
          <button className={btn.danger} onClick={() => setConfirmDelete(true)}>Delete listing</button>
        )}
      </div>
    </div>
  );
};

// Admin: every listing, filterable by status and agent; a row opens its status panel.
export const ListingsManager: React.FC = () => {
  const { vehicles, applications, navigateTo } = useApp();
  const ongoing = new Set(applications.filter((a) => a.status === 'approved').map((a) => a.vehicleId));
  const [status, setStatus] = useState<VehicleStatus | 'all'>('all');
  const [agent, setAgent] = useState('all');
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const byAgent = vehicles.filter((v) => agent === 'all' || v.sellerName === agent);
  const rows = byAgent.filter(
    (v) => (status === 'all' || v.status === status) && (!query.trim() || v.title.toLowerCase().includes(query.trim().toLowerCase()))
  );
  const open = vehicles.find((v) => v.id === openId);

  return (
    <section className="space-y-5">
      <SectionHeader title="Listings" hint="Only admins post listings and change their status. Click a listing to approve, reserve, disapprove or release it.">
        <button className={`${btn.primary} flex items-center gap-1.5`} onClick={() => navigateTo('admin', { adminTab: 'add_vehicle' })}>
          <PlusCircle className="w-4 h-4" aria-hidden="true" /> Add listing
        </button>
      </SectionHeader>

      <div className="flex flex-wrap items-center gap-3">
        <FilterTabs
          id="listing-status"
          value={status}
          onChange={setStatus}
          options={[
            { value: 'all', label: 'All', count: byAgent.length },
            ...ORDER.map((st) => ({ value: st, label: STATUS_LABEL[st], count: byAgent.filter((v) => v.status === st).length })),
          ]}
        />
        <select
          value={agent}
          onChange={(e) => setAgent(e.target.value)}
          aria-label="Filter by agent"
          className="px-3 py-2 text-[13px] bg-white border border-[#8C989F] text-[#141517] cursor-pointer"
        >
          <option value="all">All agents</option>
          {AGENTS.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <label className="flex items-center gap-2 px-3 py-2 bg-white border border-[#8C989F] min-w-[200px] flex-1 max-w-xs">
          <Search className="w-4 h-4 text-[#4E585E]" aria-hidden="true" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search listings" aria-label="Search listings" className="w-full bg-transparent text-[13px] outline-none" />
        </label>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No listings" body="Try another status, agent or search." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px] min-w-[640px]">
            <thead>
              <tr>
                <th className="gb-label py-3 font-semibold">Vehicle</th>
                <th className="gb-label py-3 font-semibold">Agent</th>
                <th className="gb-label py-3 font-semibold text-right">Price</th>
                <th className="gb-label py-3 font-semibold pl-6">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((v) => (
                <tr
                  key={v.id}
                  tabIndex={0}
                  onClick={() => setOpenId(v.id)}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setOpenId(v.id))}
                  className="border-t border-[#C9D1D6] cursor-pointer hover:bg-white focus-visible:bg-white transition-colors"
                  aria-label={`Open ${v.title}`}
                >
                  <td className="py-3 pr-4">
                    <span className="flex items-center gap-3">
                      <img src={v.images[0]} alt="" className="w-14 h-10 object-cover bg-[#EEF1F2] shrink-0" />
                      <span className="font-medium text-[#141517]">{v.title}</span>
                    </span>
                  </td>
                  <td className="py-3 text-[#2A2E31]">{v.sellerName}</td>
                  <td className="py-3 text-right tabular-nums font-semibold text-[#141517] whitespace-nowrap">{peso(v.price)}</td>
                  <td className="py-3 pl-6">
                    <span className="flex flex-wrap gap-1.5">
                      <StatusMark status={STATUS_LABEL[v.status]} />
                      {v.status === 'reserved' && ongoing.has(v.id) && <StatusMark status="Ongoing" />}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Drawer open={!!open} onClose={() => setOpenId(null)} title={open?.title || ''}>
        {open && <ListingDetail vehicle={open} onDeleted={() => setOpenId(null)} />}
      </Drawer>
    </section>
  );
};
