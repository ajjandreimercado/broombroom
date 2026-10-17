import type { Quotation } from '../types.ts';
import { quoteFigures } from './quote.ts';

// The quotation as an Excel file, laid out like the PDF: header, client, unit details, price and terms, fees, remarks.
// exceljs is loaded only when someone downloads one.
export const downloadQuotationXlsx = async (q: Quotation) => {
  const { default: ExcelJS } = await import('exceljs');
  const f = quoteFigures(q);
  const financing = q.method === 'financing';
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Quotation', { pageSetup: { orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
  ws.columns = [{ width: 36 }, { width: 44 }];
  const PESO = '"₱"#,##0.00';
  const thin = { style: 'thin' as const };
  const box = { top: thin, left: thin, bottom: thin, right: thin };
  const day = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) : '-');

  // Logo across the top, when it can be loaded.
  try {
    const res = await fetch(new URL(`${import.meta.env.BASE_URL}broom-broom-logo.png`, window.location.href));
    if (res.ok) {
      const logo = wb.addImage({ buffer: await res.arrayBuffer(), extension: 'png' });
      ws.addImage(logo, { tl: { col: 0.6, row: 0.2 }, ext: { width: 180, height: 46 } });
    }
  } catch {}
  ws.getRow(1).height = 42;

  const title = ws.addRow(['QUOTATION']);
  ws.mergeCells(title.number, 1, title.number, 2);
  title.getCell(1).font = { bold: true, size: 18 };
  title.getCell(1).alignment = { horizontal: 'center' };
  ws.addRow([]);

  const meta = (k: string, v: string) => {
    const r = ws.addRow([k, v]);
    r.getCell(1).font = { bold: true };
  };
  meta('No.', q.quoteNo || 'Draft');
  meta('Date', day(q.sentAt || q.requestedAt));
  meta('Valid until', q.validUntil ? day(`${q.validUntil}T00:00:00`) : '-');
  ws.addRow([]);
  meta('Name', q.clientName);
  meta('Address', q.clientAddress || '-');
  meta('Contact', [q.clientPhone, q.clientEmail].filter(Boolean).join(' · '));

  const section = (name: string) => {
    ws.addRow([]);
    const r = ws.addRow([name]);
    ws.mergeCells(r.number, 1, r.number, 2);
    r.getCell(1).font = { bold: true, size: 12 };
    r.getCell(1).alignment = { horizontal: 'center' };
  };
  const row = (k: string, v: string | number, strong = false) => {
    const r = ws.addRow([k, typeof v === 'number' ? Math.round(v * 100) / 100 : v]); // money to the centavo
    r.eachCell((c) => {
      c.border = box;
      c.alignment = { vertical: 'top', wrapText: true };
      if (strong) c.font = { bold: true };
    });
    if (typeof v === 'number') r.getCell(2).numFmt = PESO;
  };

  section('UNIT DETAILS');
  row('Unit type', q.unitType || '-');
  row('Variant', q.variant || '-');
  row('Engine number', q.engineNo || 'To be assigned');
  row('Chassis number', q.chassisNo || 'To be assigned');
  row('Color', q.color || '-');
  row('Transmission', q.transmission || '-');

  section('PRICE AND TERMS');
  row('Unit price', q.unitPrice, true);
  if (financing) {
    row('Down payment', q.downPayment);
    row('Amount financed', f.amountFinanced, true);
    row('Term', `${q.termMonths} months at ${q.annualRate}% a year`);
    row('Monthly amortization', f.monthly, true);
  } else row('Payment', 'Cash');

  if (f.fees) {
    section('FEES');
    if (q.insurance) row('Insurance (1st year)', q.insurance);
    if (q.registration) row('LTO registration', q.registration);
    if (financing && q.chattelMortgage) row('Chattel mortgage fee', q.chattelMortgage);
    row(financing ? 'All-in down payment' : 'Total cash payment', f.allIn, true);
  }

  if (q.remarks) {
    ws.addRow([]);
    const r = ws.addRow(['Remarks', q.remarks]);
    r.getCell(1).font = { bold: true };
    r.getCell(2).alignment = { wrapText: true, vertical: 'top' };
  }
  ws.addRow([]);
  ws.addRow(['Prices and terms are valid until the date above and may change after it.']);
  if (financing) ws.addRow(['Financing is subject to bank or financing company approval. The monthly amortization is an estimate.']);
  ws.addRow([]);
  ws.addRow([]);
  const names = ws.addRow([q.preparedBy || '', q.clientName]);
  names.alignment = { horizontal: 'center' };
  const sign = ws.addRow(['PREPARED BY', 'CONFORME (CLIENT)']);
  sign.eachCell((c) => {
    c.font = { bold: true };
    c.alignment = { horizontal: 'center' };
    c.border = { top: thin };
  });

  const blob = new Blob([await wb.xlsx.writeBuffer()], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `Quotation-${q.quoteNo || 'draft'}.xlsx`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};
