import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { StatusMark } from '../StatusMark.tsx';
import { AddVehicleForm } from '../AddVehicleForm.tsx';
import { STATUS_LABEL } from '../admin/ListingsManager.tsx';
import { SectionHeader, EmptyState, Drawer, FilterTabs, btn, peso, shortDate } from '../admin/ui.tsx';
import { Vehicle, PALUWAGAN_SLOTS, type PaluwaganMember } from '../../types.ts';
import { portalUrl } from '../../portals.ts';
import { agentSlug } from '../leads.ts';

// An agent's personal link to a listing; clients who arrive through it become that agent's clients.
const referralLink = (vehicleId: string, agentName: string) => portalUrl('buyer', `?vehicle=${vehicleId}&agent=${agentSlug(agentName)}`);
// The same for a paluwagan: opens the Paluwagan section on that unit; members who join through it are noted as the agent's.
const paluwaganLink = (unitId: string, agentName: string) => portalUrl('buyer', `?page=paluwagan&unit=${unitId}&agent=${agentSlug(agentName)}`);
import { Eye, Link2, PlusCircle } from 'lucide-react';

type Panel = { kind: 'add' } | { kind: 'edit'; vehicle: Vehicle } | null;

// A member who joined through the agent's paluwagan link, with the commission the agent asks for them (any amount;
// the admin approves it, then it is paid through Commissions).
const ReferredMember: React.FC<{ m: PaluwaganMember }> = ({ m }) => {
  const { setPaluwaganCommission } = useApp();
  const [amount, setAmount] = useState(m.commission && m.commission.status !== 'approved' ? String(m.commission.amount) : '');
  const [busy, setBusy] = useState(false);
  const c = m.commission;
  const status = m.status === 'released' ? 'released' : m.status === 'removed' ? 'removed' : `paid ${m.months.filter((x) => x.paid).length}/${PALUWAGAN_SLOTS}`;
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-2 border-t border-[#DDE3E6] text-[13px] text-[#2A2E31]">
      <span>Slot {m.slot ?? '–'}: <strong>{m.clientName}</strong> · {status}</span>
      {c?.status === 'approved' ? (
        <span className="text-[#1B7F35] font-semibold">₱{c.amount.toLocaleString()} approved · see Commissions</span>
      ) : m.status === 'removed' ? null : !m.verifiedAt ? (
        <span className="text-[#6B767D]">Waiting for the admin to verify their first payment</span>
      ) : (
        <form
          className="flex items-center gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            await setPaluwaganCommission(m.id, Number(amount));
            setBusy(false);
          }}
        >
          {c && <span className={c.status === 'declined' ? 'text-[#B42318]' : 'text-[#1D5FD1]'}>{c.status === 'declined' ? 'Declined, ask again:' : 'Waiting for approval'}</span>}
          <label className="flex items-center gap-1">
            <span className="sr-only">Your commission for {m.clientName} (₱)</span>₱
            <input className="w-24 px-2 py-1.5 bg-white border border-[#8C989F] tabular-nums" inputMode="numeric" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, '').slice(0, 9))} />
          </label>
          <button type="submit" className={btn.outline} disabled={busy || !Number(amount)}>{c ? 'Update' : 'Ask commission'}</button>
        </form>
      )}
    </li>
  );
};

// Agents can't change listings. Every agent sees all of them, shares them with a personal link, and sends change requests to the admin.
export const AgentListings: React.FC<{ vehicles: Vehicle[] }> = ({ vehicles }) => {
  const { listingRequests, submitListingRequest, currentUser, showToast, paluwaganUnits, paluwagan } = useApp();
  const copy = async (link: string, body: string) => {
    try {
      await navigator.clipboard.writeText(link);
      showToast('Your link is copied', body);
    } catch {
      window.prompt('Copy your link', link);
    }
  };
  const copyLink = (v: Vehicle) => copy(referralLink(v.id, currentUser?.name || ''), 'Clients who use it show up in Open leads and you are told; claim them to start the chat.');
  const [panel, setPanel] = useState<Panel>(null);
  // Listings, Paluwagan and My requests are tabs, so agents switch instead of scrolling past every listing.
  const [tab, setTab] = useState<'listings' | 'paluwagan' | 'requests'>('listings');
  const [price, setPrice] = useState(0);
  const [mileage, setMileage] = useState(0);
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [note, setNote] = useState('');
  const myRequests = listingRequests.filter((r) => r.agentName === currentUser?.name);
  const pendingFor = (id: string) => myRequests.some((r) => r.vehicleId === id && r.status === 'pending');

  const openEdit = (v: Vehicle) => {
    setPrice(v.price);
    setMileage(v.mileage);
    setLocation(v.location);
    setDescription(v.description);
    setNote('');
    setPanel({ kind: 'edit', vehicle: v });
  };

  const sendEdit = (v: Vehicle) => {
    const changes: Partial<Vehicle> = {};
    if (price !== v.price) changes.price = price;
    if (mileage !== v.mileage) changes.mileage = mileage;
    if (location.trim() !== v.location) changes.location = location.trim();
    if (description.trim() !== v.description) changes.description = description.trim();
    if (!Object.keys(changes).length) return;
    submitListingRequest({ type: 'edit', vehicleId: v.id, vehicleTitle: v.title, changes, note: note.trim() });
    setPanel(null);
  };

  const field = 'w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517]';

  return (
    <section className="space-y-6">
      <FilterTabs
        id="agent-listings"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'listings', label: 'Listings', count: vehicles.length },
          { value: 'paluwagan', label: 'Paluwagan', count: paluwaganUnits.length },
          { value: 'requests', label: 'My requests', count: myRequests.length },
        ]}
      />
      {tab === 'listings' && <div className="space-y-4">
        <SectionHeader title="Listings" hint="Every listing is open to every agent. Share one with your own link: you are told when a client uses it, then claim them in Open leads. The admin team posts listings and sets their status.">
          <button className={`${btn.primary} flex items-center gap-1.5`} onClick={() => setPanel({ kind: 'add' })}>
            <PlusCircle className="w-4 h-4" aria-hidden="true" /> Request new listing
          </button>
        </SectionHeader>
        {vehicles.length === 0 ? (
          <EmptyState title="No listings yet" body="Listings the admin team posts appear here." />
        ) : (
          <ul>
            {vehicles.map((v) => (
              <li key={v.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4 border-b border-[#C9D1D6]">
                <div className="flex items-center gap-4 min-w-0">
                  <img src={v.images[0]} alt="" className="w-20 h-14 object-cover bg-[#EEF1F2] shrink-0" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-[14px] text-[#141517]">{v.title}</span>
                      <StatusMark status={STATUS_LABEL[v.status]} />
                    </div>
                    <p className="text-[12.5px] text-[#4E585E] tabular-nums mt-0.5">
                      {peso(v.price)} · {v.mileage.toLocaleString()} km · {v.condition}
                      {pendingFor(v.id) && <span className="text-[#1D5FD1]"> · change requested</span>}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <button className={`${btn.primary} flex items-center gap-1.5`} onClick={() => copyLink(v)}>
                    <Link2 className="w-4 h-4" aria-hidden="true" /> Copy my link
                  </button>
                  <button className={`${btn.outline} flex items-center gap-1.5`} onClick={() => window.open(portalUrl('buyer', `?vehicle=${v.id}`), '_blank', 'noopener')}>
                    <Eye className="w-4 h-4" aria-hidden="true" /> View
                  </button>
                  <button className={btn.outline} disabled={pendingFor(v.id)} onClick={() => openEdit(v)}>Request edit</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>}

      {tab === 'paluwagan' && <div className="space-y-4">
        <SectionHeader title="Paluwagan" hint={`Share a paluwagan with your own link. Clients apply on the Paluwagan page through the Google Form; Broom Broom handles the payments. When someone joins through your link, enter the commission you ask for them: the admin approves it and pays it through Commissions.`} />
        {paluwaganUnits.length === 0 ? (
          <p className="text-[14px] text-[#4E585E]">No paluwagan is open right now.</p>
        ) : (
          <ul>
            {paluwaganUnits.map((u) => {
              const mine = paluwagan.filter((m) => m.unitId === u.id && m.referredBy === currentUser?.name);
              return (
                <li key={u.id} className="py-4 border-b border-[#C9D1D6] space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-4 min-w-0">
                      <img src={u.images[0]} alt="" className="w-20 h-14 object-cover bg-[#EEF1F2] shrink-0" />
                      <div className="min-w-0">
                        <span className="font-semibold text-[14px] text-[#141517]">{u.title}</span>
                        <p className="text-[12.5px] text-[#4E585E] tabular-nums mt-0.5">{u.taken.length} of {PALUWAGAN_SLOTS} slots taken · {mine.length} through your link</p>
                      </div>
                    </div>
                    <button className={`${btn.primary} flex items-center gap-1.5 self-start sm:self-auto`} onClick={() => copy(paluwaganLink(u.id, currentUser?.name || ''), 'Clients who join this paluwagan through it are noted as yours.')}>
                      <Link2 className="w-4 h-4" aria-hidden="true" /> Copy my link
                    </button>
                  </div>
                  {mine.length > 0 && <ul className="sm:pl-24">{mine.map((m) => <ReferredMember key={m.id} m={m} />)}</ul>}
                </li>
              );
            })}
          </ul>
        )}
      </div>}

      {tab === 'requests' && <div className="space-y-4">
        <SectionHeader title="My requests" />
        {myRequests.length === 0 ? (
          <p className="text-[14px] text-[#4E585E]">You haven’t sent any listing requests.</p>
        ) : (
          <ul>
            {myRequests.map((r) => (
              <li key={r.id} className="flex flex-wrap items-start justify-between gap-3 py-3 border-b border-[#DDE3E6]">
                <div>
                  <p className="text-[14px] text-[#141517]">
                    <span className="font-semibold">{r.type === 'add' ? 'New listing' : r.type === 'edit' ? 'Edit' : 'Removal'}</span> · {r.vehicleTitle}
                  </p>
                  <p className="text-[12.5px] text-[#4E585E]">Sent {shortDate(r.createdAt)}</p>
                  {r.status === 'rejected' && r.reason && <p className="text-[12.5px] text-[#B42318]">Reason: {r.reason}</p>}
                </div>
                <StatusMark status={r.status === 'pending' ? 'Pending' : r.status === 'approved' ? 'Approved' : 'Rejected'} />
              </li>
            ))}
          </ul>
        )}
      </div>}

      <Drawer
        open={!!panel}
        onClose={() => setPanel(null)}
        title={panel?.kind === 'add' ? 'Request a new listing' : 'Request an edit'}
      >
        {panel?.kind === 'add' && <AddVehicleForm mode="request" onDone={() => setPanel(null)} />}
        {panel?.kind === 'edit' && (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); sendEdit(panel.vehicle); }}>
            <p className="text-[14px] font-semibold text-[#141517]">{panel.vehicle.title}</p>
            <label className="block"><span className="gb-label block mb-2">Price (₱)</span>
              <input type="number" min={0} value={price} onChange={(e) => setPrice(Number(e.target.value))} className={field} /></label>
            <label className="block"><span className="gb-label block mb-2">Mileage (km)</span>
              <input type="number" min={0} value={mileage} onChange={(e) => setMileage(Number(e.target.value))} className={field} /></label>
            <label className="block"><span className="gb-label block mb-2">Location</span>
              <input value={location} onChange={(e) => setLocation(e.target.value)} className={field} /></label>
            <label className="block"><span className="gb-label block mb-2">Description</span>
              <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className={field} /></label>
            <label className="block"><span className="gb-label block mb-2">Why the change</span>
              <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Client feedback on the price" className={field} /></label>
            <p className="text-[12.5px] text-[#4E585E]">Only the fields you change are sent. Status changes are made by the admin.</p>
            <button type="submit" className={btn.primary}>Send request</button>
          </form>
        )}
      </Drawer>
    </section>
  );
};
