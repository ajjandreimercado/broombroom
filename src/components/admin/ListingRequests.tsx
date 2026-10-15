import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { StatusMark } from '../StatusMark.tsx';
import { ListingRequest, Vehicle } from '../../types.ts';
import { FilterTabs, SectionHeader, EmptyState, ReasonAction, btn, peso, shortDate } from './ui.tsx';
import { Check } from 'lucide-react';

const TYPE_LABEL: Record<ListingRequest['type'], string> = { add: 'New listing', edit: 'Edit', remove: 'Removal' };
const FIELD_LABEL: Partial<Record<keyof Vehicle, string>> = {
  title: 'Title', brand: 'Brand', model: 'Model', year: 'Year', category: 'Category', price: 'Price', mileage: 'Mileage',
  condition: 'Condition', transmission: 'Transmission', fuel: 'Fuel', location: 'Location', description: 'Description',
};
const show = (k: keyof Vehicle, v: unknown) =>
  v === undefined || v === '' ? '-' : Array.isArray(v) ? `${v.length} attached` : k === 'price' ? peso(Number(v)) : k === 'mileage' ? `${Number(v).toLocaleString()} km` : String(v);

// Admin: agents' requests to add, edit or remove a listing. Approving applies the change.
export const ListingRequests: React.FC = () => {
  const { listingRequests, decideListingRequest, vehicles } = useApp();
  const [filter, setFilter] = useState<ListingRequest['status']>('pending');
  const rows = listingRequests.filter((r) => r.status === filter);
  const count = (s: ListingRequest['status']) => listingRequests.filter((r) => r.status === s).length;

  return (
    <section className="space-y-5">
      <SectionHeader title="Listing approvals" hint="Agents can’t post or change listings. They send requests here; approving one applies it to the marketplace." />
      <FilterTabs
        id="requests"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'pending', label: 'Pending', count: count('pending') },
          { value: 'approved', label: 'Approved', count: count('approved') },
          { value: 'rejected', label: 'Rejected', count: count('rejected') },
        ]}
      />
      {rows.length === 0 ? (
        <EmptyState title={filter === 'pending' ? 'No pending requests' : 'Nothing here yet'} body="Requests from agents to add, edit or remove listings appear in this list." />
      ) : (
        <ul key={filter} className="animate-view-fade">
          {rows.map((r) => {
            const current = r.vehicleId ? vehicles.find((v) => v.id === r.vehicleId) : undefined;
            const fields = Object.keys(r.changes || {}) as (keyof Vehicle)[];
            return (
              <li key={r.id} className="py-5 border-b border-[#C9D1D6] space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 border border-[#141517] text-[11px] font-semibold uppercase tracking-[0.06em] text-[#141517]">{TYPE_LABEL[r.type]}</span>
                  <p className="font-semibold text-[15px] text-[#141517]">{r.vehicleTitle}</p>
                  {r.status !== 'pending' && <StatusMark status={r.status === 'approved' ? 'Approved' : 'Rejected'} />}
                </div>
                <p className="text-[12.5px] text-[#4E585E]">Requested by <strong className="text-[#141517] font-semibold">{r.agentName}</strong> · {shortDate(r.createdAt)}</p>
                {r.note && <p className="text-[13px] text-[#2A2E31] max-w-[70ch]">“{r.note}”</p>}

                {fields.length > 0 && (
                  <table className="text-[13px] w-full max-w-xl">
                    <tbody>
                      {fields.map((k) => (
                        <tr key={k} className="border-t border-[#DDE3E6]">
                          <td className="py-1.5 pr-4 text-[#4E585E] w-32">{FIELD_LABEL[k] || k}</td>
                          {r.type === 'edit' && <td className="py-1.5 pr-4 text-[#6B767D] line-through tabular-nums">{show(k, current?.[k])}</td>}
                          <td className="py-1.5 text-[#141517] font-medium tabular-nums">{show(k, r.changes?.[k])}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {r.type !== 'add' && !current && r.status === 'pending' && (
                  <p className="text-[12.5px] text-[#B42318]">This listing no longer exists.</p>
                )}
                {r.status === 'rejected' && r.reason && <p className="text-[13px] text-[#B42318]">Reason: {r.reason}</p>}

                {r.status === 'pending' && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button className={`${btn.primary} flex items-center gap-1.5`} disabled={r.type !== 'add' && !current} onClick={() => decideListingRequest(r.id, true)}>
                      <Check className="w-4 h-4" aria-hidden="true" /> Approve &amp; apply
                    </button>
                    <ReasonAction label="Reject" placeholder="Reason the agent will see" onConfirm={(reason) => decideListingRequest(r.id, false, reason)} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
