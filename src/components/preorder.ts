import type { PreOrder } from '../types.ts';

// Pre-order: a client orders a unit built to their choices. Shared by the server (which recalculates every amount)
// and the pages, so both always agree.
export const PREORDER_CHOICES = {
  variant: ['4x4', '4x2'],
  transmission: ['Automatic', 'Manual', 'Tiptronic'],
  seat: ['Captain Seat', 'Straight Seat'],
} as const;
export const OTHERS = 'Others';

export const OFF_ROAD_INCLUSIONS = ['Carrier', 'Ladder', 'Bumper (front and back)', 'Fender flare', 'Mags', 'Terrain tires'];

// Financing on a pre-order: one of these down payments, then 2.5% a month (add-on) on the amount financed.
export const PREORDER_DOWN_PCTS = [15, 20, 30, 40, 50];
export const PREORDER_MONTHLY_ADD_ON = 2.5;
// The agent's commission on a pre-order: 10% of the net the admin enters.
export const PREORDER_COMMISSION_RATE = 0.1;

// Add-on interest: the full interest (rate x months) is added to the amount financed, then split evenly.
export const addOnMonthly = (financed: number, monthlyPct: number, months: number) =>
  financed <= 0 || months <= 0 ? 0 : (financed * (1 + (monthlyPct / 100) * months)) / months;

type Priced = Pick<PreOrder, 'unitPrice' | 'accessories' | 'offRoad' | 'offRoadPrice' | 'additionalAmount'>;
export const preorderBreakdown = (p: Priced) => {
  const accessories = p.accessories.reduce((s, a) => s + a.price, 0);
  const offRoad = p.offRoad ? p.offRoadPrice : 0;
  return { unit: p.unitPrice, accessories, offRoad, additional: p.additionalAmount, total: p.unitPrice + accessories + offRoad + p.additionalAmount };
};

// The lines a pre-order's quotation prints, in this order.
export const breakdownLines = (p: Priced & Pick<PreOrder, 'additionalDescription'>) => {
  const b = preorderBreakdown(p);
  return [
    { label: 'Unit Amount', amount: b.unit },
    { label: p.accessories.length ? `Accessories (${p.accessories.map((a) => a.name).join(', ')})` : 'Accessories', amount: b.accessories },
    { label: 'Off-Road Set Up', amount: b.offRoad },
    { label: p.additionalDescription ? `Additional Customization (${p.additionalDescription})` : 'Additional Customization', amount: b.additional },
  ];
};
