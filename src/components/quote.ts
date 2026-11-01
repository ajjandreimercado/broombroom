import type { Quotation, VehicleApplication } from '../types.ts';
import { PREORDER_DOWN_PCTS, PREORDER_MONTHLY_ADD_ON, addOnMonthly } from './preorder.ts';

// Loan terms offered, in months: 36 is the longest, on every listing (new or already listed), application and quotation.
export const QUOTE_TERMS = [12, 24, 36];
export const DEFAULT_RATE = 8.5; // yearly rate a regular listing's quotation starts at
export const DEFAULT_VALID_DAYS = 15;

// Monthly payment on an amortizing loan (the listing page's estimate uses the same formula).
export const monthlyPayment = (principal: number, annualRatePct: number, months: number) => {
  if (principal <= 0 || months <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  if (r === 0) return principal / months;
  const f = Math.pow(1 + r, months);
  return (principal * r * f) / (f - 1);
};

// The lowest monthly figure a listing can show: the biggest down payment (50%) over the longest term (36 months), at
// 2.5% a month add-on. Cards and Compare show this as "from"; the listing page's calculator lands on it.
export const MAX_DOWN_PCT = Math.max(...PREORDER_DOWN_PCTS);
export const listingMonthly = (price: number, downPct: number, months: number) =>
  Math.round(addOnMonthly(price - Math.round((price * downPct) / 100), PREORDER_MONTHLY_ADD_ON, months));
export const fromMonthly = (price: number) => listingMonthly(price, MAX_DOWN_PCT, Math.max(...QUOTE_TERMS));

// Everything a quotation shows, derived from what the admin entered.
export const quoteFigures = (q: Pick<Quotation, 'method' | 'unitPrice' | 'downPayment' | 'termMonths' | 'annualRate' | 'insurance' | 'registration' | 'chattelMortgage' | 'monthlyAddOn'>) => {
  const financing = q.method === 'financing';
  const fees = q.insurance + q.registration + (financing ? q.chattelMortgage : 0);
  const amountFinanced = financing ? Math.max(0, q.unitPrice - q.downPayment) : 0;
  // Pre-orders use add-on interest per month; other quotations a reducing-balance yearly rate.
  const monthly = !financing ? 0 : q.monthlyAddOn ? addOnMonthly(amountFinanced, q.monthlyAddOn, q.termMonths) : monthlyPayment(amountFinanced, q.annualRate, q.termMonths);
  return {
    fees,
    amountFinanced,
    monthly,
    // Cash the client needs to drive the unit out: the down payment (or full price) plus the fees.
    allIn: (financing ? q.downPayment : q.unitPrice) + fees,
    totalOfPayments: financing ? q.downPayment + monthly * q.termMonths : q.unitPrice,
  };
};

// How a quotation prints its interest.
export const termText = (q: Pick<Quotation, 'termMonths' | 'annualRate' | 'monthlyAddOn'>) =>
  `${q.termMonths} months at ${q.monthlyAddOn ? `${q.monthlyAddOn}% a month (add-on)` : `${q.annualRate}% a year`}`;

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
// The quotation made for this application. Two applications for the same car must never share one, so the match is by
// the application's reference; older quotations without one fall back to the same client and car.
export const quoteFor = (quotations: Quotation[], app: VehicleApplication) =>
  quotations.find((q) => q.applicationRef === app.referenceNo) ??
  quotations.find((q) => !q.applicationRef && q.clientId === app.applicantId && q.vehicleId === app.vehicleId);

export const quoteLabel = (q: Quotation) =>
  q.status === 'requested' ? 'Being prepared' : q.status === 'returned' ? 'Signed, under review' : q.status === 'confirmed' ? 'Confirmed' : q.status === 'accepted' ? 'Accepted' : isExpired(q) ? 'Expired' : 'Sent';
