import type { Quotation } from '../types.ts';

export const QUOTE_TERMS = [12, 24, 36, 48, 60];
export const DEFAULT_RATE = 8.5; // same rate as the listing page's financing estimate
export const DEFAULT_VALID_DAYS = 15;

// Monthly payment on an amortizing loan (the listing page's estimate uses the same formula).
export const monthlyPayment = (principal: number, annualRatePct: number, months: number) => {
  if (principal <= 0 || months <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  if (r === 0) return principal / months;
  const f = Math.pow(1 + r, months);
  return (principal * r * f) / (f - 1);
};

// Everything a quotation shows, derived from what the admin entered.
export const quoteFigures = (q: Pick<Quotation, 'method' | 'unitPrice' | 'downPayment' | 'termMonths' | 'annualRate' | 'insurance' | 'registration' | 'chattelMortgage'>) => {
  const financing = q.method === 'financing';
  const fees = q.insurance + q.registration + (financing ? q.chattelMortgage : 0);
  const amountFinanced = financing ? Math.max(0, q.unitPrice - q.downPayment) : 0;
  const monthly = financing ? monthlyPayment(amountFinanced, q.annualRate, q.termMonths) : 0;
  return {
    fees,
    amountFinanced,
    monthly,
    // Cash the client needs to drive the unit out: the down payment (or full price) plus the fees.
    allIn: (financing ? q.downPayment : q.unitPrice) + fees,
    totalOfPayments: financing ? q.downPayment + monthly * q.termMonths : q.unitPrice,
  };
};

export const nextQuoteNo = (quotes: Quotation[], year = new Date().getFullYear()) => {
  const used = quotes.map((q) => q.quoteNo).filter((n): n is string => !!n && n.startsWith(`QT-${year}-`)).map((n) => Number(n.slice(8)));
  return `QT-${year}-${String(Math.max(0, ...used) + 1).padStart(4, '0')}`;
};

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const isExpired = (q: Quotation) => q.status === 'sent' && !!q.validUntil && q.validUntil < today();
export const daysFromToday = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const quoteLabel = (q: Quotation) =>
  q.status === 'requested' ? 'Being prepared' : q.status === 'returned' ? 'Signed & returned' : q.status === 'accepted' ? 'Accepted' : isExpired(q) ? 'Expired' : 'Sent';
