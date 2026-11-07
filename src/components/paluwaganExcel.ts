import type { PaluwaganMember, PaluwaganUnit } from '../types.ts';
import { PALUWAGAN_SLOTS, dueDate, monthsBehind, paidCount, totalGiven } from './paluwaganSchedule.ts';

// One paluwagan as an Excel file: a Members sheet (one row each) and a Payments sheet (one row per member-month).
// exceljs is loaded only when someone downloads one.
export const downloadPaluwaganXlsx = async (unit: PaluwaganUnit, members: PaluwaganMember[]) => {
  const { default: ExcelJS } = await import('exceljs');
  const wb = new ExcelJS.Workbook();
  const PESO = '"₱"#,##0.00';
  const day = (iso?: string | Date) => (iso ? new Date(iso).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '');
  const rows = [...members].sort((a, b) => (a.slot ?? 99) - (b.slot ?? 99));
  const head = (ws: import('exceljs').Worksheet) => {
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF1F2' } };
    ws.views = [{ state: 'frozen', ySplit: 1 }];
  };

  const ms = wb.addWorksheet('Members');
  ms.columns = [
    { header: 'Slot', key: 'slot', width: 7 },
    { header: 'Client', key: 'name', width: 26 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Phone', key: 'phone', width: 16 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Joined', key: 'joined', width: 14 },
    { header: 'Months paid', key: 'paid', width: 12 },
    { header: 'Months behind', key: 'behind', width: 14 },
    { header: 'Total given', key: 'given', width: 14, style: { numFmt: PESO } },
    { header: 'Released', key: 'released', width: 14 },
    { header: 'Referred by', key: 'agent', width: 20 },
    { header: 'Agent commission', key: 'commission', width: 18 },
  ];
  head(ms);
  for (const m of rows)
    ms.addRow({
      slot: m.slot ?? '', name: m.clientName, email: m.clientEmail, phone: m.clientPhone, status: m.status, joined: day(m.joinedAt),
      paid: `${paidCount(m)}/${PALUWAGAN_SLOTS}`, behind: monthsBehind(unit, m), given: totalGiven(m), released: day(m.releasedAt),
      agent: m.referredBy ?? '', commission: m.commission ? `₱${m.commission.amount.toLocaleString()} (${m.commission.status})` : '',
    });

  const ps = wb.addWorksheet('Payments');
  ps.columns = [
    { header: 'Slot', key: 'slot', width: 7 },
    { header: 'Client', key: 'name', width: 26 },
    { header: 'Month', key: 'month', width: 8 },
    { header: 'Due', key: 'due', width: 14 },
    { header: 'Paid', key: 'paid', width: 7 },
    { header: 'Paid on', key: 'paidAt', width: 14 },
    { header: 'Amount', key: 'amount', width: 14, style: { numFmt: PESO } },
    { header: 'Receipt (AR)', key: 'ar', width: 14 },
    { header: 'Note', key: 'note', width: 40 },
  ];
  head(ps);
  for (const m of rows.filter((x) => x.slot))
    m.months.forEach((x, i) =>
      ps.addRow({ slot: m.slot, name: m.clientName, month: i + 1, due: day(dueDate(unit, i + 1)), paid: x.paid ? 'Yes' : '', paidAt: day(x.paidAt), amount: x.amount ?? null, ar: x.arNo ?? '', note: x.note ?? '' })
    );

  const buf = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `Paluwagan ${unit.title.replace(/[\\/:*?"<>|]/g, '')} ${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
