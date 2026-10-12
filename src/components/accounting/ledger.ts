import { Commission, Expense, VehicleApplication } from '../../types.ts';
import { CREDIT_ACCOUNTS, MONTHLY_HISTORY, PAYMENT_ACCOUNTS } from '../../data/mockData.ts';

export const monthOf = (isoOrDate: string) => isoOrDate.slice(0, 7);
export const monthLabel = (ym: string) =>
  new Date(`${ym}-01T00:00:00`).toLocaleDateString('en-PH', { month: 'short' });

export const accountBalance = (accountId: string, expenses: Expense[]) => {
  const acct = PAYMENT_ACCOUNTS.find((a) => a.id === accountId);
  if (!acct) return 0;
  return acct.openingBalance - expenses.filter((e) => e.accountId === accountId).reduce((s, e) => s + e.total, 0);
};

export const creditAvailable = (accountId: string, credits: Expense[]) => {
  const acct = CREDIT_ACCOUNTS.find((a) => a.id === accountId);
  if (!acct) return 0;
  return acct.limit - credits.filter((c) => c.accountId === accountId).reduce((s, c) => s + c.total, 0);
};

export type MonthRow = { month: string; sales: number; expenses: number };

// Monthly sales and expenses: the demo history, plus everything recorded in the app since
// (expense and credit vouchers, commission payouts, sales completed in Applications).
export const monthlySeries = (
  expenses: Expense[],
  credits: Expense[],
  commissions: Commission[],
  applications: VehicleApplication[]
): MonthRow[] => {
  const rows = new Map<string, MonthRow>(MONTHLY_HISTORY.map((m) => [m.month, { ...m }]));
  const add = (ym: string, key: 'sales' | 'expenses', amount: number) => {
    const row = rows.get(ym);
    if (row) row[key] += amount;
  };
  [...expenses, ...credits].forEach((e) => add(monthOf(e.paymentDate), 'expenses', e.total));
  commissions.filter((c) => c.status === 'paid' && c.paidAt).forEach((c) => add(monthOf(c.paidAt!), 'expenses', c.amount));
  // ponytail: a completed sale has no completion date yet, so it counts in the latest month; store one when the backend exists.
  const latest = MONTHLY_HISTORY[MONTHLY_HISTORY.length - 1].month;
  applications.filter((a) => a.status === 'completed').forEach((a) => add(latest, 'sales', a.vehiclePrice));
  return [...rows.values()];
};

// Accounting amounts always show centavos (₱5,750.50, ₱0.00).
export const money = (n: number) => `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
