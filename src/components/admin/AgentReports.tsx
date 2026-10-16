import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { AGENTS } from '../../data/mockData.ts';
import { SectionHeader, Drawer, FilterTabs, peso } from './ui.tsx';

type SortKey = 'revenue' | 'units' | 'commission';

// Admin: how each agent is doing: completed sales and their commission at each stage.
export const AgentReports: React.FC = () => {
  const { commissions } = useApp();
  const [sort, setSort] = useState<SortKey>('revenue');
  const [openAgent, setOpenAgent] = useState<string | null>(null);

  const rows = useMemo(
    () =>
      AGENTS.map((name) => {
        const coms = commissions.filter((c) => c.agentName === name);
        const sold = coms.filter((c) => c.transactionCompleted);
        const revenue = sold.reduce((s, c) => s + c.salePrice, 0);
        const sum = (st: string) => coms.filter((c) => c.status === st).reduce((s, c) => s + c.amount, 0);
        return {
          name,
          units: sold.length,
          revenue,
          avgDeal: sold.length ? revenue / sold.length : 0,
          receivable: sum('receivable'),
          payable: sum('payable'),
          paid: sum('paid'),
        };
      }),
    [commissions]
  );

  const sorted = [...rows].sort((a, b) =>
    sort === 'revenue' ? b.revenue - a.revenue : sort === 'units' ? b.units - a.units : b.paid + b.payable + b.receivable - (a.paid + a.payable + a.receivable)
  );
  const maxRevenue = Math.max(1, ...rows.map((r) => r.revenue));
  const top = [...rows].sort((a, b) => b.revenue - a.revenue)[0];
  const totals = rows.reduce(
    (t, r) => ({ revenue: t.revenue + r.revenue, units: t.units + r.units, receivable: t.receivable + r.receivable, paid: t.paid + r.paid }),
    { revenue: 0, units: 0, receivable: 0, paid: 0 }
  );

  const agentRow = openAgent ? rows.find((r) => r.name === openAgent) : undefined;

  return (
    <section className="space-y-6">
      <SectionHeader title="Agent reports" hint="Sales are counted from completed transactions. Click an agent for their commission breakdown." />

      {/* Team totals and leaders */}
      <dl className="grid grid-cols-2 md:grid-cols-4 border-b border-[#C9D1D6]">
        {[
          { label: 'Team sales', value: peso(totals.revenue), note: `${totals.units} units completed` },
          { label: 'Top seller', value: top.revenue ? top.name : '-', note: top.revenue ? peso(top.revenue) : 'No completed sales yet' },
          { label: 'Commission receivable', value: peso(totals.receivable), note: 'Earned, not yet approved for payout' },
          { label: 'Commission paid', value: peso(totals.paid), note: 'Transferred with proof of payment' },
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
            { value: 'commission', label: 'Commission' },
          ]}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-[13px] min-w-[640px]">
          <thead>
            <tr>
              <th className="gb-label py-3 font-semibold">Agent</th>
              <th className="gb-label py-3 font-semibold">Sales</th>
              <th className="gb-label py-3 font-semibold text-right">Units</th>
              <th className="gb-label py-3 font-semibold text-right">Receivable</th>
              <th className="gb-label py-3 font-semibold text-right">Payable</th>
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
                <td className="py-3 text-right">{peso(r.receivable)}</td>
                <td className="py-3 text-right">{peso(r.payable)}</td>
                <td className="py-3 text-right text-[#1B7F35] font-medium">{peso(r.paid)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Drawer open={!!agentRow} onClose={() => setOpenAgent(null)} title={agentRow?.name || ''}>
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
          </div>
        )}
      </Drawer>
    </section>
  );
};
