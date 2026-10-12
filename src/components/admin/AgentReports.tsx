import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { StatusMark } from '../StatusMark.tsx';
import { AGENTS } from '../../data/mockData.ts';
import { SectionHeader, Drawer, FilterTabs, peso } from './ui.tsx';
import { STATUS_LABEL, StatusControl } from './ListingsManager.tsx';
import { ChevronDown } from 'lucide-react';

type SortKey = 'revenue' | 'units' | 'conversion' | 'commission';

// Admin: how each agent is doing: sales, pipeline, client activity and what they are owed.
export const AgentReports: React.FC = () => {
  const { vehicles, applications, conversations, commissions } = useApp();
  const [sort, setSort] = useState<SortKey>('revenue');
  const [openAgent, setOpenAgent] = useState<string | null>(null);
  const [openListing, setOpenListing] = useState<string | null>(null);

  const rows = useMemo(
    () =>
      AGENTS.map((name) => {
        const listings = vehicles.filter((v) => v.sellerName === name);
        const apps = applications.filter((a) => a.sellerName === name);
        const coms = commissions.filter((c) => c.agentName === name);
        const sold = coms.filter((c) => c.transactionCompleted);
        const revenue = sold.reduce((s, c) => s + c.salePrice, 0);
        const decided = apps.filter((a) => ['approved', 'completed', 'declined'].includes(a.status));
        const won = apps.filter((a) => a.status === 'approved' || a.status === 'completed').length;
        const sum = (st: string) => coms.filter((c) => c.status === st).reduce((s, c) => s + c.amount, 0);
        return {
          name,
          listings: listings.length,
          live: listings.filter((v) => v.status === 'available').length,
          reserved: listings.filter((v) => v.status === 'reserved').length,
          units: sold.length,
          revenue,
          avgDeal: sold.length ? revenue / sold.length : 0,
          applications: apps.length,
          conversion: decided.length ? Math.round((won / decided.length) * 100) : -1,
          chats: conversations.filter((c) => c.sellerName === name).length,
          receivable: sum('receivable'),
          payable: sum('payable'),
          paid: sum('paid'),
        };
      }),
    [vehicles, applications, conversations, commissions]
  );

  const sorted = [...rows].sort((a, b) =>
    sort === 'revenue' ? b.revenue - a.revenue : sort === 'units' ? b.units - a.units : sort === 'conversion' ? b.conversion - a.conversion : b.paid + b.payable + b.receivable - (a.paid + a.payable + a.receivable)
  );
  const maxRevenue = Math.max(1, ...rows.map((r) => r.revenue));
  const top = (key: 'revenue' | 'units' | 'chats' | 'conversion') => [...rows].sort((a, b) => b[key] - a[key])[0];
  const totals = rows.reduce((t, r) => ({ revenue: t.revenue + r.revenue, units: t.units + r.units, owed: t.owed + r.receivable + r.payable }), { revenue: 0, units: 0, owed: 0 });

  const agentRow = openAgent ? rows.find((r) => r.name === openAgent) : undefined;
  const agentListings = vehicles.filter((v) => v.sellerName === openAgent);

  return (
    <section className="space-y-6">
      <SectionHeader title="Agent reports" hint="Sales are counted from completed transactions. Click an agent for their listings, applications and commissions." />

      {/* Team totals and leaders */}
      <dl className="grid grid-cols-2 md:grid-cols-4 border-b border-[#C9D1D6]">
        {[
          { label: 'Team sales', value: peso(totals.revenue), note: `${totals.units} units completed` },
          { label: 'Top seller', value: top('revenue').revenue ? top('revenue').name : '-', note: top('revenue').revenue ? peso(top('revenue').revenue) : 'No completed sales yet' },
          { label: 'Most client chats', value: top('chats').chats ? top('chats').name : '-', note: `${top('chats').chats} conversations` },
          { label: 'Commission owed', value: peso(totals.owed), note: 'Receivable + payable' },
        ].map((m, i) => (
          <div key={m.label} className={`py-4 pr-3 ${i % 2 ? 'pl-4 border-l border-[#C9D1D6]' : ''} ${i === 2 ? 'md:pl-4 md:border-l' : ''} ${i < 2 ? 'border-b md:border-b-0 border-[#C9D1D6]' : ''}`}>
            <dt className="gb-label">{m.label}</dt>
            <dd className="mt-1.5 font-display text-[clamp(17px,2.2vw,22px)] leading-tight text-[#141517] tabular-nums">{m.value}</dd>
            <dd className="mt-1 text-[12px] text-[#4E585E]">{m.note}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-wrap items-center gap-3">
        <span className="gb-label">Sort by</span>
        <FilterTabs
          id="agent-sort"
          value={sort}
          onChange={setSort}
          options={[
            { value: 'revenue', label: 'Sales' },
            { value: 'units', label: 'Units' },
            { value: 'conversion', label: 'Approval rate' },
            { value: 'commission', label: 'Commission' },
          ]}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-[13px] min-w-[860px]">
          <thead>
            <tr>
              <th className="gb-label py-3 font-semibold">Agent</th>
              <th className="gb-label py-3 font-semibold">Sales</th>
              <th className="gb-label py-3 font-semibold text-right">Units</th>
              <th className="gb-label py-3 font-semibold text-right">Listings</th>
              <th className="gb-label py-3 font-semibold text-right">Applications</th>
              <th className="gb-label py-3 font-semibold text-right">Approval</th>
              <th className="gb-label py-3 font-semibold text-right">Chats</th>
              <th className="gb-label py-3 font-semibold text-right">Owed</th>
              <th className="gb-label py-3 font-semibold text-right">Paid</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {sorted.map((r) => (
              <tr
                key={r.name}
                tabIndex={0}
                onClick={() => setOpenAgent(r.name)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setOpenAgent(r.name))}
                className="border-t border-[#C9D1D6] cursor-pointer hover:bg-white focus-visible:bg-white transition-colors"
                aria-label={`Open report for ${r.name}`}
              >
                <td className="py-3 pr-4 font-semibold text-[#141517] whitespace-nowrap">{r.name}</td>
                <td className="py-3 pr-4 w-[220px]">
                  <span className="block text-[#141517] font-medium">{peso(r.revenue)}</span>
                  <span className="mt-1 block h-1.5 bg-[#EEF1F2]">
                    <span className="block h-full bg-[#1D5FD1] transition-[width] duration-500" style={{ width: `${(r.revenue / maxRevenue) * 100}%` }} />
                  </span>
                </td>
                <td className="py-3 text-right">{r.units}</td>
                <td className="py-3 text-right">{r.listings}<span className="text-[#6B767D]"> · {r.live} live</span></td>
                <td className="py-3 text-right">{r.applications}</td>
                <td className="py-3 text-right">{r.conversion >= 0 ? `${r.conversion}%` : '-'}</td>
                <td className="py-3 text-right">{r.chats}</td>
                <td className="py-3 text-right">{peso(r.receivable + r.payable)}</td>
                <td className="py-3 text-right text-[#1B7F35] font-medium">{peso(r.paid)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Drawer open={!!agentRow} onClose={() => { setOpenAgent(null); setOpenListing(null); }} title={agentRow?.name || ''}>
        {agentRow && (
          <div className="space-y-6">
            <dl className="grid grid-cols-2 gap-y-3 text-[13px]">
              <dt className="text-[#4E585E]">Sales</dt><dd className="font-semibold text-[#141517] tabular-nums">{peso(agentRow.revenue)}</dd>
              <dt className="text-[#4E585E]">Units completed</dt><dd className="text-[#141517] tabular-nums">{agentRow.units}</dd>
              <dt className="text-[#4E585E]">Average deal</dt><dd className="text-[#141517] tabular-nums">{agentRow.avgDeal ? peso(agentRow.avgDeal) : '-'}</dd>
              <dt className="text-[#4E585E]">Commission receivable</dt><dd className="text-[#141517] tabular-nums">{peso(agentRow.receivable)}</dd>
              <dt className="text-[#4E585E]">Commission payable</dt><dd className="text-[#141517] tabular-nums">{peso(agentRow.payable)}</dd>
              <dt className="text-[#4E585E]">Commission paid</dt><dd className="text-[#1B7F35] font-medium tabular-nums">{peso(agentRow.paid)}</dd>
            </dl>
            <div>
              <span className="gb-label block mb-2">Listings ({agentListings.length})</span>
              <ul className="border-t border-[#C9D1D6]">
                {agentListings.map((v) => (
                  <li key={v.id} className="border-b border-[#DDE3E6]">
                    <button
                      onClick={() => setOpenListing(openListing === v.id ? null : v.id)}
                      aria-expanded={openListing === v.id}
                      className="w-full flex items-center justify-between gap-3 py-3 text-left cursor-pointer"
                    >
                      <span className="text-[13.5px] font-medium text-[#141517]">{v.title}</span>
                      <span className="flex items-center gap-2 shrink-0">
                        <StatusMark status={STATUS_LABEL[v.status]} />
                        <ChevronDown className={`w-4 h-4 text-[#4E585E] transition-transform duration-200 ${openListing === v.id ? 'rotate-180' : ''}`} />
                      </span>
                    </button>
                    <div className={`grid transition-[grid-template-rows] duration-200 ${openListing === v.id ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                      <div className="overflow-hidden">
                        <div className="pb-4">{openListing === v.id && <StatusControl vehicle={v} />}</div>
                      </div>
                    </div>
                  </li>
                ))}
                {agentListings.length === 0 && <li className="py-3 text-[13px] text-[#4E585E]">No listings assigned.</li>}
              </ul>
            </div>
          </div>
        )}
      </Drawer>
    </section>
  );
};
