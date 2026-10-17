import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { Expense, LedgerAccount } from '../../types.ts';
import { FilterTabs, SectionHeader, btn, shortDate } from '../admin/ui.tsx';
import { ColumnChart, LineChart, SALES, EXPENSE } from './charts.tsx';
import { accountBalance, monthLabel, monthlySeries, money } from './ledger.ts';
import { Pencil, Plus, PlusCircle } from 'lucide-react';

type Period = '3' | '6' | 'ytd';
type Draft = { name: string; amount: string; method: 'cash' | 'bank' };
const input = 'px-3 py-2 text-[14px] bg-white border border-[#8C989F] text-[#141517]';

// The company's money accounts of one kind, with what is left on each, and the admin's add / edit / delete.
const AccountList: React.FC<{ kind: LedgerAccount['kind']; vouchers: Expense[] }> = ({ kind, vouchers }) => {
  const { ledgerAccounts, saveLedgerAccount, deleteLedgerAccount } = useApp();
  const list = ledgerAccounts.filter((a) => a.kind === kind);
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [d, setD] = useState<Draft>({ name: '', amount: '', method: 'bank' });
  const credit = kind === 'credit';
  const open = (a?: LedgerAccount) => {
    setD(a ? { name: a.name, amount: String(a.amount), method: a.method ?? 'bank' } : { name: '', amount: '', method: 'bank' });
    setEditing(a?.id ?? 'new');
  };
  const used = (id: string) => vouchers.some((v) => v.accountId === id);
  const form = (a?: LedgerAccount) => (
    <form
      className="flex flex-wrap items-center gap-2 py-3 border-b border-[#DDE3E6] animate-fade-up"
      onSubmit={async (e) => {
        e.preventDefault();
        const ok = await saveLedgerAccount(a?.id ?? null, { kind, name: d.name.trim(), amount: Number(d.amount), method: credit ? undefined : d.method });
        if (ok) setEditing(null);
      }}
    >
      <input autoFocus required value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder={credit ? 'e.g. BDO corporate credit card' : 'e.g. BDO checking account'} aria-label="Account name" className={`flex-1 min-w-[180px] ${input}`} />
      {!credit && (
        <select value={d.method} onChange={(e) => setD({ ...d, method: e.target.value as Draft['method'] })} aria-label="Account type" className={`${input} cursor-pointer`}>
          <option value="bank">Bank</option>
          <option value="cash">Cash</option>
        </select>
      )}
      <input required type="number" min="0" step="0.01" inputMode="decimal" value={d.amount} onChange={(e) => setD({ ...d, amount: e.target.value })} placeholder={credit ? 'Credit limit' : 'Opening balance'} aria-label={credit ? 'Credit limit' : 'Opening balance'} className={`w-[150px] tabular-nums ${input}`} />
      <button type="submit" disabled={!d.name.trim() || d.amount === ''} className={btn.primary}>Save</button>
      {a && !used(a.id) && (
        <button type="button" onClick={async () => (await deleteLedgerAccount(a.id)) && setEditing(null)} className="px-2 py-2 text-[13px] font-semibold text-[#B42318] cursor-pointer">Delete</button>
      )}
      <button type="button" onClick={() => setEditing(null)} className="px-2 py-2 text-[13px] text-[#4E585E] hover:text-[#141517] cursor-pointer">Cancel</button>
    </form>
  );
  return (
    <div>
      <SectionHeader title={credit ? 'Credit available' : 'Cash and cash equivalents'} hint={credit ? 'Credit limit minus what was charged.' : 'Opening balance minus the expenses paid from it.'} />
      <ul>
        {list.length === 0 && editing !== 'new' && (
          <li className="py-3 border-b border-[#DDE3E6] text-[13.5px] text-[#4E585E]">No {credit ? 'credit' : 'cash or bank'} accounts yet. Add the company's accounts to record {credit ? 'credit entries' : 'expenses'}.</li>
        )}
        {list.map((a) =>
          editing === a.id ? (
            <li key={a.id}>{form(a)}</li>
          ) : (
            <li key={a.id} className="flex items-center justify-between gap-3 py-3 border-b border-[#DDE3E6] text-[14px]">
              <span className="text-[#141517]">{a.name}</span>
              <span className="flex items-center gap-3">
                <span className="tabular-nums text-[#141517]">
                  <strong>{money(accountBalance(a, vouchers))}</strong>
                  {credit && <span className="text-[#6B767D]"> of {money(a.amount)}</span>}
                </span>
                <button onClick={() => open(a)} aria-label={`Edit ${a.name}`} className="p-1 text-[#4E585E] hover:text-[#141517] cursor-pointer"><Pencil className="w-3.5 h-3.5" /></button>
              </span>
            </li>
          )
        )}
        {editing === 'new' && <li>{form()}</li>}
      </ul>
      {editing !== 'new' && (
        <button onClick={() => open()} className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#1D5FD1] cursor-pointer">
          <Plus className="w-4 h-4" aria-hidden="true" /> Add {credit ? 'credit account' : 'cash or bank account'}
        </button>
      )}
    </div>
  );
};

// Accounting home: sales, expenses and profit for the chosen period, then the money on hand.
export const AccountingOverview: React.FC = () => {
  const { expenses, credits, commissions, salesEntries, navigateTo } = useApp();
  const [period, setPeriod] = useState<Period>('3');

  const all = useMemo(() => monthlySeries(expenses, credits, commissions, salesEntries), [expenses, credits, commissions, salesEntries]);
  const thisYear = String(new Date().getFullYear());
  const rows = period === 'ytd' ? all.filter((r) => r.month.startsWith(thisYear)) : all.slice(-Number(period));
  const sales = rows.reduce((s, r) => s + r.sales, 0);
  const spent = rows.reduce((s, r) => s + r.expenses, 0);
  const profit = sales - spent;
  const margin = sales ? Math.round((profit / sales) * 100) : 0;
  const scale = Math.max(sales, spent, 1);
  const monthYear = (ym: string) => `${monthLabel(ym)} ${ym.slice(0, 4)}`;
  const periodLabel = `${monthYear(rows[0].month)} to ${monthYear(rows[rows.length - 1].month)}`;
  const recent = [...expenses, ...credits].sort((a, b) => b.paymentDate.localeCompare(a.paymentDate)).slice(0, 5);

  return (
    <div className="space-y-10">
      <SectionHeader title="Accounting" hint={`${periodLabel}. Every voucher, commission payout, completed sale and sale entered by hand.`}>
        <FilterTabs
          id="acc-period"
          value={period}
          onChange={setPeriod}
          options={[
            { value: '3', label: '3 months' },
            { value: '6', label: '6 months' },
            { value: 'ytd', label: 'This year' },
          ]}
        />
      </SectionHeader>

      {/* Sales and expenses, side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-10">
        <section aria-labelledby="acc-sales">
          <div className="flex items-baseline justify-between gap-3 border-b border-[#C9D1D6] pb-3">
            <h3 id="acc-sales" className="flex items-center gap-2 gb-label !text-[#141517]">
              <span className="w-3 h-[2px]" style={{ background: SALES }} aria-hidden="true" /> Sales
            </h3>
            <span className="text-[12px] text-[#4E585E]">Total for the period</span>
          </div>
          <p className="mt-3 font-display text-[clamp(26px,3vw,34px)] leading-none tabular-nums text-[#141517]">{money(sales)}</p>
          <div className="mt-4"><LineChart key={period} points={rows.map((r) => ({ label: monthLabel(r.month), value: r.sales }))} name="Sales" /></div>
        </section>

        <section aria-labelledby="acc-expenses">
          <div className="flex items-baseline justify-between gap-3 border-b border-[#C9D1D6] pb-3">
            <h3 id="acc-expenses" className="flex items-center gap-2 gb-label !text-[#141517]">
              <span className="w-2.5 h-2.5" style={{ background: EXPENSE }} aria-hidden="true" /> Expenses
            </h3>
            <button onClick={() => navigateTo('admin', { adminTab: 'acc_expenses' })} className="text-[12.5px] font-semibold text-[#141517] underline decoration-[#8C989F] hover:decoration-[#141517] underline-offset-4 cursor-pointer">
              Record expense
            </button>
          </div>
          <p className="mt-3 font-display text-[clamp(26px,3vw,34px)] leading-none tabular-nums text-[#141517]">{money(spent)}</p>
          <div className="mt-4"><ColumnChart key={period} points={rows.map((r) => ({ label: monthLabel(r.month), value: r.expenses }))} name="Expenses" /></div>
        </section>
      </div>

      {/* Profit and loss */}
      <section aria-labelledby="acc-pl" className="border-t-2 border-[#141517] pt-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h3 id="acc-pl" className="gb-label !text-[#141517]">{profit >= 0 ? 'Net profit' : 'Net loss'}</h3>
            <p className={`mt-2 font-display text-[clamp(30px,4vw,44px)] leading-none tabular-nums ${profit >= 0 ? 'text-[#141517]' : 'text-[#B42318]'}`}>
              {profit < 0 && '−'}{money(Math.abs(profit))}
            </p>
          </div>
          <p className="text-[13px] text-[#4E585E]">Margin <strong className="text-[#141517] tabular-nums">{margin}%</strong> of sales</p>
        </div>
        <dl className="mt-6 space-y-4">
          {[
            { label: 'Income', value: sales, color: SALES },
            { label: 'Expenses', value: spent, color: EXPENSE },
          ].map((b) => (
            <div key={b.label} className="grid grid-cols-[80px_1fr] sm:grid-cols-[96px_1fr_140px] items-center gap-x-4 gap-y-1">
              <dt className="text-[13px] font-medium text-[#141517]">{b.label}</dt>
              <dd className="h-3 bg-[#EEF1F2] col-span-1">
                <span className="block h-full rounded-r-[4px] transition-[width] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]" style={{ width: `${(b.value / scale) * 100}%`, background: b.color }} />
              </dd>
              <dd className="col-start-2 sm:col-start-auto text-[13px] tabular-nums text-[#141517] sm:text-right">{money(b.value)}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Money on hand */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-8">
        <AccountList kind="payment" vouchers={expenses} />
        <AccountList kind="credit" vouchers={credits} />
      </section>

      <section>
        <SectionHeader title="Recent vouchers">
          <button className={`${btn.primary} flex items-center gap-1.5`} onClick={() => navigateTo('admin', { adminTab: 'acc_expenses' })}>
            <PlusCircle className="w-4 h-4" aria-hidden="true" /> New expense
          </button>
        </SectionHeader>
        <ul>
          {recent.map((v) => (
            <li key={v.id} className="grid grid-cols-[1fr_auto] sm:grid-cols-[110px_1fr_auto] gap-x-4 gap-y-0.5 py-3 border-b border-[#DDE3E6] text-[13.5px]">
              <span className="text-[#4E585E] tabular-nums">{shortDate(v.paymentDate)}</span>
              <span className="text-[#141517] sm:col-start-2 row-start-2 sm:row-start-1 col-span-2 sm:col-span-1">
                {v.payee} <span className="text-[#4E585E]">· {v.lines.map((l) => l.category).join(', ')}</span>
              </span>
              <span className="tabular-nums font-semibold text-[#141517] text-right row-start-1 col-start-2 sm:col-start-3">
                {money(v.total)} <span className="text-[11px] font-medium text-[#6B767D]">{v.kind === 'credit' ? 'credit' : 'paid'}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};
