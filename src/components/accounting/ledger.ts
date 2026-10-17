import { Commission, Expense, LedgerAccount, SalesEntry } from '../../types.ts';

export const monthOf = (isoOrDate: string) => isoOrDate.slice(0, 7);
export const monthLabel = (ym: string) =>
  new Date(`${ym}-01T00:00:00`).toLocaleDateString('en-PH', { month: 'short' });

// Payment account: opening balance minus expenses paid from it. Credit account: limit minus what was charged to it.
const left = (acct: LedgerAccount | undefined, vouchers: Expense[]) =>
  acct ? acct.amount - vouchers.filter((v) => v.accountId === acct.id).reduce((s, v) => s + v.total, 0) : 0;
export const accountBalance = left;
export const creditAvailable = left;

export type MonthRow = { month: string; sales: number; expenses: number };

// Monthly sales and expenses for the 12 months up to this one, from what is recorded in the app: expense and credit
// vouchers, commission payouts, completed sales (dated when completed) and sales entered by hand.
export const monthlySeries = (
  expenses: Expense[],
  credits: Expense[],
  commissions: Commission[],
  salesEntries: SalesEntry[] = [],
  now = new Date()
): MonthRow[] => {
  const rows = new Map<string, MonthRow>();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    rows.set(ym, { month: ym, sales: 0, expenses: 0 });
  }
  const add = (ym: string, key: 'sales' | 'expenses', amount: number) => {
    const row = rows.get(ym);
    if (row) row[key] += amount;
  };
  [...expenses, ...credits].forEach((e) => add(monthOf(e.paymentDate), 'expenses', e.total));
  commissions.filter((c) => c.status === 'paid' && c.paidAt).forEach((c) => add(monthOf(c.paidAt!), 'expenses', c.amount));
  commissions.filter((c) => c.transactionCompleted).forEach((c) => add(monthOf(c.completedAt ?? c.createdAt), 'sales', c.salePrice));
  salesEntries.forEach((e) => add(monthOf(e.date), 'sales', e.amount)); // sales the admin entered by hand
  return [...rows.values()];
};

// Accounting amounts always show centavos (₱5,750.50, ₱0.00).
export const money = (n: number) => `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Accounting dates read month/day/year: 10/17/2026. Takes an ISO time or a yyyy-mm-dd day.
export const mdy = (iso: string) => {
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
};
