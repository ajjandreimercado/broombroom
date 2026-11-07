import { PALUWAGAN_SLOTS, type PaluwaganMember, type PaluwaganUnit } from '../types.ts';

// Month N of a paluwagan is due on the unit's due day, N-1 months after its start month. No start date: no schedule.
export const dueDate = (unit: Pick<PaluwaganUnit, 'startDate' | 'dueDay'>, n: number): Date | undefined => {
  if (!unit.startDate) return undefined;
  const [y, m, d] = unit.startDate.split('-').map(Number);
  return new Date(y, m - 1 + (n - 1), unit.dueDay ?? Math.min(d, 28));
};

const startOfDay = (t: Date) => new Date(t.getFullYear(), t.getMonth(), t.getDate());

// Unpaid months whose due day has passed.
export const monthsBehind = (unit: Pick<PaluwaganUnit, 'startDate' | 'dueDay'>, m: Pick<PaluwaganMember, 'months'>, today = new Date()) => {
  const day = startOfDay(today);
  return m.months.filter((x, i) => {
    const due = dueDate(unit, i + 1);
    return !x.paid && !!due && due < day;
  }).length;
};

// The first unpaid month and when it is due.
export const nextDue = (unit: Pick<PaluwaganUnit, 'startDate' | 'dueDay'>, m: Pick<PaluwaganMember, 'months'>) => {
  const i = m.months.findIndex((x) => !x.paid);
  if (i < 0) return undefined;
  return { month: i + 1, date: dueDate(unit, i + 1) };
};

export const dayText = (d?: Date) => (d ? d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '');
export const paidCount = (m: Pick<PaluwaganMember, 'months'>) => m.months.filter((x) => x.paid).length;
export const totalGiven = (m: Pick<PaluwaganMember, 'months'>) => m.months.reduce((t, x) => t + (x.amount ?? 0), 0);
export const holdsSlot = (m: Pick<PaluwaganMember, 'status'>) => m.status === 'joined' || m.status === 'released';
export { PALUWAGAN_SLOTS };
