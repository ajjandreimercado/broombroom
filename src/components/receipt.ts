import { Commission, ManualReceipt, PaymentReceipt, Quotation, ReceiptLine, VehicleApplication } from '../types.ts';
import { pesoWords } from './ar.ts';
import { quoteFigures, termText } from './quote.ts';
import pdfLib from 'html2pdf.js/dist/html2pdf.bundle.min.js?url';
import { AFFIRMATION } from './infoSheet.ts';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const peso = (n: number) => `₱${Math.round(n).toLocaleString('en-PH')}`;
const date = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) : '-';
const logoUrl = () => new URL(`${import.meta.env.BASE_URL}broom-broom-logo.png`, window.location.href).href;

// Every document page gets two choices: download it as a PDF file, or print it. The PDF is drawn in that page
// (html2pdf, loaded from this site) from the .sheet element, so the buttons are not in it.
const tools = (file: string) => `
<div class="tools"><button type="button" id="bb-pdf">Download PDF</button><button type="button" class="ghost" id="bb-print">Print</button></div>
<style>
  .tools { display: flex; justify-content: center; gap: 10px; margin: 24px auto 40px; }
  .tools button { padding: 10px 18px; background: #1D5FD1; color: #fff; border: 1px solid #1D5FD1; font: 600 14px Arial, sans-serif; cursor: pointer; }
  .tools button.ghost { background: #fff; color: #141517; border-color: #8C989F; }
  @media print { .tools { display: none; } }
</style>
<script src="${esc(new URL(pdfLib, window.location.href).href)}"></script>
<script src="${esc(new URL(`${import.meta.env.BASE_URL}print-tools.js`, window.location.href).href)}" data-file="${esc(file.replace(/[^\w.-]+/g, '-'))}"></script>`;

// Saves a document page straight to a PDF file without opening it: drawn in a hidden frame, then removed.
const downloadPdf = (html: string) =>
  new Promise<void>((resolve) => {
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:900px;height:1200px;border:0';
    document.body.appendChild(frame);
    const doc = frame.contentDocument!;
    doc.open();
    doc.write(html);
    doc.close();
    const started = Date.now();
    const done = () => { frame.remove(); resolve(); };
    const tick = () => {
      const w = frame.contentWindow as (Window & { bbPdf?: () => Promise<void> }) | null;
      if (w?.bbPdf && doc.readyState === 'complete') w.bbPdf().then(done, done);
      else if (Date.now() - started > 20000) done();
      else setTimeout(tick, 100);
    };
    tick();
  });

// Opens a printable page in its own tab, with Download PDF and Print buttons. False if pop-ups are blocked.
// Pass a window opened earlier (during the click) when the content arrives after a server call.
const openPrintable = (html: string, existing?: Window | null) => {
  const win = existing ?? window.open('', '_blank');
  if (!win) return false;
  win.document.open();
  win.document.write(html);
  win.document.close();
  return true;
};

// The official receipt for a paid commission, laid out for A4 and opened in its own tab.
// The browser's print dialog saves it as a PDF ("Save as PDF"), so no PDF library is needed.
// Stored files are paths on this site; the receipt window needs full addresses.
const abs = (u?: string) => (u ? new URL(u, window.location.href).href : '');

// Opens an empty tab right away (inside the click, so it is not blocked) for content that comes back from the server.
export const reserveWindow = () => {
  const win = window.open('', '_blank');
  win?.document.write('<p style="font-family:sans-serif;padding:24px;color:#4E585E">Preparing…</p>');
  return win;
};

export const openCommissionReceipt = (c: Commission) => {
  const logo = logoUrl();
  const rows: [string, string][] = [
    ['Receipt no.', c.receiptNo || '-'],
    ['Date paid', date(c.paidAt)],
    ['Paid to (agent)', c.agentName],
    ['Sale reference', c.applicationRef],
    ['Vehicle sold', c.vehicleTitle],
    ['Client', c.clientName],
    ['Sale price', peso(c.salePrice)],
    ['Commission rate', `${(c.rate * 100).toFixed(1).replace(/\.0$/, '')}%`],
    ['Approved for payout', date(c.approvedAt)],
    ['Proof of payment', c.proofFileName || '-'],
  ];
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Commission receipt ${esc(c.receiptNo || '')}</title>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&display=swap" rel="stylesheet">
<style>
  @page { size: A4; margin: 18mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Archivo, system-ui, sans-serif; color: #141517; background: #fff; }
  .sheet { max-width: 720px; margin: 32px auto; padding: 0 24px; }
  header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #141517; padding-bottom: 16px; }
  header img { height: 34px; }
  h1 { font-stretch: 125%; font-weight: 650; font-size: 28px; letter-spacing: -0.02em; margin: 28px 0 4px; }
  .sub { color: #4E585E; font-size: 13px; margin: 0; }
  .amount { margin: 28px 0; padding: 18px 0; border-top: 1px solid #C9D1D6; border-bottom: 1px solid #C9D1D6; display: flex; justify-content: space-between; align-items: baseline; }
  .amount span { font-size: 12px; letter-spacing: .06em; text-transform: uppercase; color: #4E585E; font-weight: 600; }
  .amount strong { font-stretch: 125%; font-size: 34px; font-variant-numeric: tabular-nums; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  td { padding: 10px 0; border-bottom: 1px solid #DDE3E6; vertical-align: top; }
  td:first-child { color: #4E585E; width: 42%; }
  td:last-child { font-weight: 600; font-variant-numeric: tabular-nums; }
  .stamp { display: inline-block; margin-top: 28px; border: 2px solid #1B7F35; color: #1B7F35; padding: 6px 12px; font-stretch: 125%; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; transform: rotate(-6deg); }
  footer { margin-top: 40px; display: flex; justify-content: space-between; gap: 24px; font-size: 12px; color: #4E585E; }
  .sign { border-top: 1px solid #141517; padding-top: 6px; min-width: 200px; text-align: center; color: #141517; }
  .proof { margin-top: 28px; }
  .proof p { font-size: 12px; letter-spacing: .06em; text-transform: uppercase; color: #4E585E; font-weight: 600; margin: 0 0 8px; }
  .proof img { display: block; max-width: 100%; max-height: 360px; border: 1px solid #C9D1D6; }
  @media print { .sheet { margin: 0; } }
</style></head>
<body><div class="sheet">
  <header><img src="${esc(logo)}" alt="Broom Broom"><p class="sub">Official commission receipt</p></header>
  <h1>Commission payment</h1>
  <p class="sub">Issued by the Broom Broom admin team to the agent named below.</p>
  <div class="amount"><span>Amount paid</span><strong>${peso(c.amount)}</strong></div>
  <table>${rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</table>
  ${c.proofImage ? `<div class="proof"><p>Proof of payment</p><img src="${esc(abs(c.proofImage))}" alt="Proof of payment ${esc(c.proofFileName || '')}"></div>` : ''}
  <div class="stamp">Paid</div>
  <footer><span>Issued by the Broom Broom admin team.</span><span class="sign">Released by Admin</span></footer>
</div>
${tools(`Commission-receipt-${c.receiptNo || ''}.pdf`)}
</body></html>`;
  return openPrintable(html);
};

// Shows an attached image (e.g. a payment screenshot) in its own tab; browsers block opening data: URLs directly.
export const openImage = (src: string, title: string) =>
  openPrintable(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>body{margin:0;background:#141517;display:grid;place-items:center;min-height:100vh}img{max-width:100%;max-height:100vh}</style></head>
<body><img src="${esc(abs(src))}" alt="${esc(title)}"></body></html>`);

const money2 = (n: number) => n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// What an acknowledgement receipt shows, from a confirmed partial payment or one the admin wrote by hand.
export type ArDoc = { arNo: string; date: string; lines: ReceiptLine[]; client: string; receivedBy: string; remarks?: string; ref?: string };
export const lineTotal = (lines: ReceiptLine[]) => lines.reduce((s, l) => s + l.qty * l.price, 0);
export const paymentAr = (app: VehicleApplication, p: PaymentReceipt): ArDoc => ({
  arNo: p.arNo, date: p.date, lines: [{ description: p.description, qty: 1, price: p.amount }], client: app.applicantName, receivedBy: p.receivedBy,
  remarks: p.remarks, ref: `Application ${app.referenceNo} · ${app.vehicleTitle}`,
});
export const manualAr = (r: ManualReceipt): ArDoc => ({ arNo: r.arNo, date: r.date, lines: r.lines, client: r.receivedFrom, receivedBy: r.receivedBy, remarks: r.remarks });

// Acknowledgement receipt laid out like the paper AR template (US Letter).
const arHtml = (d: ArDoc) => {
  const total = lineTotal(d.lines);
  const rows = d.lines.map((l) => `<tr><td>${esc(l.description)}</td><td>${l.qty}</td><td>${money2(l.price)}</td><td>${money2(l.qty * l.price)}</td></tr>`).join('');
  const blankRows = Array.from({ length: Math.max(0, 8 - d.lines.length) }, () => '<tr><td>&nbsp;</td><td></td><td></td><td></td></tr>').join('');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Acknowledgement receipt ${esc(d.arNo)}</title>
<style>
  @page { size: letter; margin: 0.75in; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #000; background: #fff; font-size: 12pt; }
  .sheet { max-width: 7in; margin: 32px auto; padding: 0 16px; }
  .logo { text-align: center; }
  .logo img { height: 56px; }
  h1 { text-align: center; font-size: 16pt; font-weight: 700; margin: 18px 0 20px; letter-spacing: .02em; }
  .meta { display: flex; justify-content: space-between; font-weight: 700; margin-bottom: 10px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #000; padding: 5px 8px; }
  th { font-weight: 400; }
  .items td:not(:first-child), .items th:not(:first-child) { text-align: center; }
  .items td { height: 26px; }
  .sum td { border-top: 0; text-align: center; }
  .sum td:first-child { text-align: left; }
  .bold { font-weight: 700; }
  .ref { margin-top: 10px; font-size: 10pt; color: #333; }
  .remarks { margin: 12px 0 0; font-size: 11pt; }
  .signs { display: flex; justify-content: space-between; gap: 48px; margin-top: 72px; text-align: center; }
  .signs div { flex: 1; }
  .signs p { margin: 0; }
  .line { border-top: 1px solid #000; padding-top: 4px; font-weight: 700; }
  .name { min-height: 18px; margin-bottom: 4px !important; }
  @media print { .sheet { margin: 0; padding: 0; } }
</style></head>
<body><div class="sheet">
  <div class="logo"><img src="${esc(logoUrl())}" alt="Broom Broom"></div>
  <h1>ACKNOWLEDGEMENT RECEIPT</h1>
  <div class="meta"><span>DATE: ${esc(date(d.date))}</span><span>AR No.: ${esc(d.arNo)}</span></div>
  <table class="items">
    <thead><tr><th style="width:52%">DESCRIPTIONS</th><th style="width:10%">QTY</th><th style="width:19%">PRICE</th><th style="width:19%">AMOUNT</th></tr></thead>
    <tbody>
      ${rows}
      ${blankRows}
    </tbody>
  </table>
  <table class="sum">
    <tr>
      <td style="width:52%">AMOUNT IN WORDS:<div style="text-align:center;margin-top:4px">${esc(pesoWords(total))}</div></td>
      <td class="bold" style="width:29%">TOTAL AMOUNT:</td>
      <td class="bold" style="width:19%">₱ ${money2(total)}</td>
    </tr>
  </table>
  ${d.remarks ? `<p class="remarks"><b>REMARKS:</b> ${esc(d.remarks)}</p>` : ''}
  ${d.ref ? `<p class="ref">${esc(d.ref)}</p>` : ''}
  <div class="signs">
    <div><p class="name">${esc(d.client)}</p><p class="line">CLIENT</p></div>
    <div><p class="name">${esc(d.receivedBy)}</p><p class="line">RECEIVED BY</p></div>
  </div>
</div>
${tools(`AR-${d.arNo}.pdf`)}
</body></html>`;
};
export const openAR = (d: ArDoc, win?: Window | null) => openPrintable(arHtml(d), win);
export const downloadAR = (d: ArDoc) => downloadPdf(arHtml(d));
export const openAcknowledgementReceipt = (app: VehicleApplication, p: PaymentReceipt, win?: Window | null) => openAR(paymentAr(app, p), win);


// The quotation as the client receives it, laid out like the paper quotation (name, address, unit details, price).
const quotationHtml = (q: Quotation) => {
  const f = quoteFigures(q);
  const financing = q.method === 'financing';
  const row = (k: string, v: string, strong = false) => `<tr${strong ? ' class="strong"' : ''}><th>${esc(k)}</th><td>${esc(v)}</td></tr>`;
  const peso2 = (n: number) => `₱ ${money2(n)}`;
  const unit = [
    row('Unit type', q.unitType || '-'),
    row('Variant', q.variant || '-'),
    row('Engine number', q.engineNo || 'To be assigned'),
    row('Chassis number', q.chassisNo || 'To be assigned'),
    row('Color', q.color || '-'),
    row('Transmission', q.transmission || '-'),
  ].join('');
  const price = [
    ...(q.breakdown ?? []).map((l) => row(l.label, peso2(l.amount))),
    row(q.breakdown ? 'Total Amount' : 'Unit price', peso2(q.unitPrice), true),
    ...(financing
      ? [
          row(q.downPct ? `Down payment (${q.downPct}%)` : 'Down payment', peso2(q.downPayment)),
          row('Amount financed', peso2(f.amountFinanced), true),
          row('Term', termText(q)),
          row('Monthly amortization', peso2(f.monthly), true),
        ]
      : [row('Payment', 'Cash')]),
  ].join('');
  const fees = f.fees
    ? [
        q.insurance ? row('Insurance (1st year)', peso2(q.insurance)) : '',
        q.registration ? row('LTO registration', peso2(q.registration)) : '',
        financing && q.chattelMortgage ? row('Chattel mortgage fee', peso2(q.chattelMortgage)) : '',
        row(financing ? 'All-in down payment' : 'Total cash payment', peso2(f.allIn), true),
      ].join('')
    : '';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Quotation ${esc(q.quoteNo || '')}</title>
<style>
  @page { size: letter; margin: 0.75in; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #000; background: #fff; font-size: 11.5pt; }
  .sheet { max-width: 7in; margin: 32px auto; padding: 0 16px; }
  .logo { text-align: center; }
  .logo img { height: 56px; }
  h1 { text-align: center; font-size: 18pt; margin: 16px 0 4px; letter-spacing: .04em; }
  .meta { display: flex; justify-content: space-between; gap: 16px; font-size: 10pt; margin: 14px 0 18px; }
  .client p { margin: 3px 0; }
  .client b { display: inline-block; min-width: 80px; }
  h2 { text-align: center; font-size: 13pt; margin: 22px 0 8px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
  th, td { border: 1px solid #000; padding: 6px 10px; text-align: left; vertical-align: top; }
  th { width: 42%; font-weight: 400; }
  tr.strong th, tr.strong td { font-weight: 700; }
  td { font-variant-numeric: tabular-nums; }
  .notes { font-size: 9.5pt; color: #333; margin: 10px 0 0; padding-left: 18px; }
  .notes li { margin: 2px 0; }
  .remarks { margin-top: 10px; font-size: 10.5pt; }
  .signs { display: flex; justify-content: space-between; gap: 48px; margin-top: 56px; text-align: center; }
  .signs div { flex: 1; }
  .signs p { margin: 0; }
  .name { min-height: 18px; margin-bottom: 4px !important; }
  .line { border-top: 1px solid #000; padding-top: 4px; font-weight: 700; }
  @media print { .sheet { margin: 0; padding: 0; } }
</style></head>
<body><div class="sheet">
  <div class="logo"><img src="${esc(logoUrl())}" alt="Broom Broom"></div>
  <h1>QUOTATION</h1>
  <div class="meta">
    <span><b>No.:</b> ${esc(q.quoteNo || 'Draft')}</span>
    <span><b>Date:</b> ${esc(date(q.sentAt || q.requestedAt))}</span>
    <span><b>Valid until:</b> ${esc(q.validUntil ? date(`${q.validUntil}T00:00:00`) : '-')}</span>
  </div>
  <div class="client">
    <p><b>Name:</b> ${esc(q.clientName)}</p>
    <p><b>Address:</b> ${esc(q.clientAddress || '-')}</p>
    <p><b>Contact:</b> ${esc([q.clientPhone, q.clientEmail].filter(Boolean).join(' · '))}</p>
  </div>
  <h2>Unit details</h2>
  <table>${unit}</table>
  <table>${price}</table>
  ${fees ? `<table>${fees}</table>` : ''}
  ${q.remarks ? `<p class="remarks"><b>Remarks:</b> ${esc(q.remarks)}</p>` : ''}
  <ul class="notes">
    <li>Prices and terms are valid until the date above and may change after it.</li>
    ${financing ? '<li>Financing is subject to bank or financing company approval. The monthly amortization is an estimate.</li>' : ''}
  </ul>
  <div class="signs">
    <div><p class="name">${esc(q.preparedBy || '')}</p><p class="line">PREPARED BY</p></div>
    <div><p class="name">${esc(q.conforme || "")}</p><p class="line">CONFORME (CLIENT)</p></div>
  </div>
</div>
${tools(`Quotation-${q.quoteNo || 'draft'}.pdf`)}
</body></html>`;
};
export const openQuotation = (q: Quotation, win?: Window | null) => openPrintable(quotationHtml(q), win);
export const downloadQuotationPdf = (q: Quotation) => downloadPdf(quotationHtml(q));

// The client's Applicant's Information Sheet, placed like the paper form (same order, two columns for the applicant
// and the spouse/surety), for the admin to read, download or print.
export const openInfoSheet = (app: VehicleApplication, win?: Window | null) => {
  const sheet = app.infoSheet;
  if (!sheet) return false;
  const a = sheet.answers;
  const v = (k: string) => esc(a[k] || '');
  const f = (label: string, value: string, extra = '') => `<div class="r"><span>${label}</span><b class="f"${extra}>${value}</b></div>`;
  const tick = (on: boolean) => `<span class="ck">${on ? '✔' : '&nbsp;'}</span>`;
  const cols = (left: string, right: string) => `<div class="cols"><div>${left}</div><div>${right}</div></div>`;
  const person = (p: string, title: string) => `
    <p class="h">${title}</p>
    <div class="r"><b class="f">${[v(`${p}.firstName`), v(`${p}.middleName`), v(`${p}.lastName`)].join(' ')}</b></div>
    <div class="cap"><span>First Name</span><span>Middle</span><span>Family</span></div>
    <div class="r"><span>Age:</span><b class="f s">${v(`${p}.age`)}</b><span>Date of Birth:</span><b class="f" style="white-space:nowrap">${a[`${p}.birthDate`] ? esc(a[`${p}.birthDate`].replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$2/$3/$1')) : ''}</b>
      <span>${tick(a[`${p}.civilStatus`] === 'Single')}Single ${tick(a[`${p}.civilStatus`] === 'Married')}Married</span></div>
    <div class="r"><span>Religion:</span><b class="f">${v(`${p}.religion`)}</b><span>Nickname:</span><b class="f">${v(`${p}.nickname`)}</b></div>
    ${f('Present Address:', v(`${p}.presentAddress`))}
    ${f('Previous Address:', v(`${p}.previousAddress`))}
    ${f('Birth Place:', v(`${p}.birthPlace`))}`;
  const work = (p: string, who: string) => `
    <p class="h">${who} EMPLOYED?</p>
    ${f('Firm:', v(`${p}.firm`))}${f('Address:', v(`${p}.firmAddress`))}${f('Position:', v(`${p}.position`))}${f('Salary (Net):', v(`${p}.salary`))}${f('Length of Service:', v(`${p}.serviceLength`))}`;
  const biz = (p: string) => `
    <p class="h">IN BUSINESS?</p>
    ${f('Business Name:', v(`${p}.businessName`))}${f('Address:', v(`${p}.businessAddress`))}${f('Line of Business:', v(`${p}.businessLine`))}${f('Since when operated:', v(`${p}.businessSince`))}
    <div class="r"><span>Capital:</span><b class="f">${v(`${p}.capital`)}</b><span>Net Income:</span><b class="f">${v(`${p}.netIncome`)}</b></div>`;
  const parents = (p: string, title: string) => `
    <p class="h">${title}</p>
    <div class="r"><span>1. Father:</span><b class="f">${v(`${p}.fatherName`)}</b><span>Age</span><b class="f s">${v(`${p}.fatherAge`)}</b></div>
    ${f('Address:', v(`${p}.fatherAddress`))}${f('Occupation:', v(`${p}.fatherOccupation`))}
    <div class="r"><span>2. Mother:</span><b class="f">${v(`${p}.motherName`)}</b><span>Age</span><b class="f s">${v(`${p}.motherAge`)}</b></div>
    ${f('Address:', v(`${p}.motherAddress`))}${f('Occupation:', v(`${p}.motherOccupation`))}`;
  const ids = (p: string, sig: string, label: string) =>
    `${f(`${label}:`, esc(sig))}${f('Com Tax. Cert. No.:', v(`${p}.ctcNo`))}${f('Issued at:', v(`${p}.ctcIssuedAt`))}${f('Issued on:', v(`${p}.ctcIssuedOn`))}${f('TIN No.', v(`${p}.tin`))}${f('SSS No.', v(`${p}.sss`))}`;
  const blank = { name: '', age: '', studying: '', others: '' };
  const deps = [...sheet.dependents, ...Array(Math.max(0, 5 - sheet.dependents.length)).fill(blank)];
  const res = a['residence.type'];
  const at = (type: string, k: string) => (res === type ? v(k) : '');
  const has = (p: string) => sheet.purposes.includes(p);
  const others = sheet.purposeOther || '';

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Information sheet ${esc(app.referenceNo)}</title>
<style>
  @page { size: letter; margin: 0.5in; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #000; background: #fff; font-size: 9pt; }
  .sheet { max-width: 7.5in; margin: 24px auto; padding: 0 16px; }
  h1 { text-align: center; font-size: 13pt; margin: 0 0 4px; }
  .date { display: flex; justify-content: flex-end; } .date .r { width: 2.4in; }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 0 26px; margin-top: 8px; }
  .h { margin: 8px 0 2px; font-weight: 700; }
  .c { text-align: center; } .u { text-decoration: underline; }
  .r { display: flex; align-items: flex-end; gap: 4px; margin: 3px 0; }
  .r > span { white-space: nowrap; }
  .f { flex: 1; min-height: 13px; border-bottom: 1px solid #000; font-weight: 400; padding: 0 3px; white-space: pre-wrap; font-family: 'Courier New', monospace; font-size: 9pt; }
  .f.s { flex: 0 0 34px; } .f.m { flex: 0 0 70px; }
  .cap { display: flex; justify-content: space-between; padding: 0 14px; font-size: 8pt; }
  .ck { display: inline-block; min-width: 18px; border-bottom: 1px solid #000; text-align: center; margin-right: 2px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { text-align: left; font-weight: 700; font-size: 8.5pt; padding-bottom: 2px; }
  td { border-bottom: 1px solid #000; height: 15px; padding: 0 4px; font-family: 'Courier New', monospace; }
  td + td { border-left: 10px solid #fff; }
  .affirm { margin: 10px 0; line-height: 1.35; text-indent: 3em; }
  .sketch img { max-width: 100%; max-height: 3.2in; border: 1px solid #999; margin-top: 4px; }
  .block { margin-top: 8px; }
  @media print { .sheet { margin: 0; padding: 0; } }
</style></head>
<body><div class="sheet">
  <h1>APPLICANT'S INFORMATION SHEET</h1>
  <div class="date">${f('DATE', esc(date(app.infoSheetSubmittedAt)))}</div>
  ${cols(person('applicant', 'NAME OF APPLICANT:'), person('spouse', 'SPOUSE/SURETY OF APPLICANT:'))}

  <table><tr><th style="width:38%">NAME OF DEPENDENTS</th><th style="width:8%">AGE</th><th>WHERE STUDYING YR &amp; COURSE</th><th style="width:20%">OTHERS</th></tr>
    ${deps.map((d) => `<tr><td>${esc(d.name)}</td><td>${esc(d.age)}</td><td>${esc(d.studying)}</td><td>${esc(d.others || '')}</td></tr>`).join('')}</table>

  <div class="block">
    <div class="r">${tick(res === 'Own house & lot')}<span>Own house &amp; lot?</span><span>Length of residence:</span><b class="f">${at('Own house & lot', 'residence.length')}</b></div>
    <div class="r">${tick(res === 'Own house, renting the lot')}<span>Own house &amp; renting lot? (Owner's Name:</span><b class="f">${at('Own house, renting the lot', 'residence.owner')}</b><span>) Rental:</span><b class="f m">${at('Own house, renting the lot', 'residence.rental')}</b><span>Length of residence:</span><b class="f m">${at('Own house, renting the lot', 'residence.length')}</b></div>
    <div class="r">${tick(res === 'Renting house & lot')}<span>Renting house &amp; lot? (Owner's Name:</span><b class="f">${at('Renting house & lot', 'residence.owner')}</b><span>Rental</span><b class="f m">${at('Renting house & lot', 'residence.rental')}</b><span>Length of res.</span><b class="f m">${at('Renting house & lot', 'residence.length')}</b><span>)</span></div>
    <div class="r"><span>Tel. Nos.</span><b class="f">${v('residence.telephone')}</b><span>Cellphone Nos.</span><b class="f">${v('residence.cellphone')}</b></div>
  </div>

  ${cols(work('applicantWork', 'APPLICANT'), work('spouseWork', 'SPOUSE/SURETY'))}
  ${cols(biz('applicantWork'), biz('spouseWork'))}
  ${cols(f('<b>OTHER INCOME:</b>', v('applicantWork.otherIncome')), f('<b>OTHER INCOME:</b>', v('spouseWork.otherIncome')))}

  <p class="h c"><span class="u">BANK REFERENCES (Savings, Current, Time Deposit)</span>:</p>
  <div class="r"><b class="f">${v('assets.bankReferences')}</b></div>
  <p class="h c"><span class="u">PERSONAL/REAL PROPERTY (land, vehicles, appliances others)</span></p>
  <div class="r"><b class="f">${v('assets.property')}</b></div>

  ${cols(parents('applicantParents', "APPLICANT'S PARENTS:"), parents('spouseParents', "SPOUSE/SURETY'S PARENTS:"))}

  <p class="h">REFERENCES:</p>
  ${f("a. (To Sales) Ask any Broom Broom staff if he/she knows the applicant or is familiar w/ applicant's hometown:", v('references.staff'))}
  ${f('b. Anyone within/nearby the City/Town where Broom Broom is located:', v('references.nearby'))}
  ${f('c. Co-Workers:', v('references.coWorkers'))}
  ${f('d. Neighbors:', v('references.neighbors'))}
  ${f('e. Relatives:', v('references.relatives'))}

  <p class="block">The purpose of this motorcycle/unit (please check):
    ${tick(has('Habal-habal'))} habal-habal; ${tick(has('Tricycle'))} tricycle; ${tick(has('Masiao / bagdok'))} masiao/bagdok; ${tick(has('Rental'))} rental; ${tick(has('Election'))} election;
    ${tick(has('Others'))} others (pls. state) <b class="f" style="display:inline-block;min-width:1.6in">${esc(others)}</b></p>
  ${f('<b>COMPANIES/PERSONS WHO EXTENDED YOU CREDIT?</b>', v('credit.creditors'))}
  ${f('<b>WHAT MERCHANDISE?</b>', v('credit.merchandise'))}
  ${f('<b>THE STATUS:</b> Fully Paid, Still Unpaid, If still unpaid, WHY?', [v('credit.status'), v('credit.unpaidReason')].filter(Boolean).join(' · '))}
  ${f('What attracted you to buy motorcycle/unit at Broom Broom?', v('credit.attracted'))}

  <div style="width:3.6in">${f('<b>AGENT:</b>', esc(app.sellerName))}</div>
  <p class="affirm">${esc(AFFIRMATION)}</p>
  ${cols(ids('applicantIds', sheet.signature, "Applicant's Signature"), ids('spouseIds', sheet.spouseSignature || '', 'Spouse/Surety Signature'))}

  <p class="h" style="margin-top:12px">C.I. MAN'S (NAME and SIGNATURE) COMMENTS:</p>
  <div class="r"><b class="f">${esc(app.ciComments || '')}</b></div>
  <p class="h">SKETCH:</p>
  ${a['directions.text'] ? `<p>${v('directions.text')}</p>` : ''}
  ${sheet.sketchUrl ? `<p class="sketch"><img src="${esc(abs(sheet.sketchUrl))}" alt="Sketch / map to the applicant's home"></p>` : '<div style="height:2in"></div>'}
</div>
${tools(`Information-sheet-${app.referenceNo}.pdf`)}
</body></html>`;
  return openPrintable(html, win);
};
