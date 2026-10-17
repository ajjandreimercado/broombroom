import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { CREDIT_CATEGORIES, EXPENSE_CATEGORIES } from '../../data/constants.ts';
import { Expense } from '../../types.ts';
import { uploadFile } from '../../api.ts';
import { SectionHeader, EmptyState, Drawer, btn, shortDate, checkUpload } from '../admin/ui.tsx';
import { accountBalance, creditAvailable, money } from './ledger.ts';
import { Paperclip, Plus, Trash2, X } from 'lucide-react';

type Kind = Expense['kind'];
type Draft = { category: string; description: string; amount: string; party: string; attachment?: string; file?: File };

const COPY: Record<Kind, { title: string; hint: string; account: string; party: string; balance: string; list: string }> = {
  expense: {
    title: 'Record an expense',
    hint: 'Pay from cash or a cash equivalent. The account balance updates as soon as you save.',
    account: 'Payment account',
    party: 'Vendor',
    balance: 'Balance',
    list: 'Recorded expenses',
  },
  credit: {
    title: 'Record a credit entry',
    hint: 'Charge a purchase to a credit line or card. It is paid to the creditor later.',
    account: 'Credit account',
    party: 'Creditor',
    balance: 'Available credit',
    list: 'Credit entries',
  },
};

const blankLine = (): Draft => ({ category: '', description: '', amount: '', party: '' });
const today = () => new Date().toISOString().slice(0, 10);
const field = 'w-full px-3 py-2.5 text-[14px] bg-white border text-[#141517] outline-none';
const fieldBorder = (bad: boolean) => (bad ? 'border-[#B42318]' : 'border-[#8C989F]');

// The expense and credit forms share one layout: who, from which account, when, how, then the lines.
export const VoucherPage: React.FC<{ kind: Kind }> = ({ kind }) => {
  const { expenses, credits, ledgerAccounts, addExpense, showToast, navigateTo } = useApp();
  const [saving, setSaving] = useState(false);
  const copy = COPY[kind];
  const records = kind === 'expense' ? expenses : credits;
  const accounts = ledgerAccounts.filter((a) => a.kind === (kind === 'expense' ? 'payment' : 'credit'));
  const categories = kind === 'expense' ? EXPENSE_CATEGORIES : CREDIT_CATEGORIES;
  const available = (id: string) => (kind === 'expense' ? accountBalance : creditAvailable)(accounts.find((a) => a.id === id), records);

  const [payee, setPayee] = useState('');
  const [accountId, setAccountId] = useState('');
  const [date, setDate] = useState(today());
  const [method, setMethod] = useState<Expense['method']>('bank');
  const [refNo, setRefNo] = useState('');
  const [lines, setLines] = useState<Draft[]>([blankLine()]);
  const [remarks, setRemarks] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [openId, setOpenId] = useState<string | null>(null);

  const total = lines.reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const balance = accountId ? available(accountId) : null;

  const setLine = (i: number, patch: Partial<Draft>) => setLines((prev) => prev.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const removeLine = (i: number) => setLines((prev) => (prev.length === 1 ? [blankLine()] : prev.filter((_, j) => j !== i)));

  const pickAccount = (id: string) => {
    setAccountId(id);
    const acct = accounts.find((a) => a.id === id);
    if (acct?.method) setMethod(acct.method); // cash on hand is paid in cash; bank accounts by bank
  };

  const attach = (i: number, file?: File) => {
    if (!file) return;
    const problem = checkUpload(file);
    setErrors((e) => ({ ...e, [`attach-${i}`]: problem || '' }));
    if (!problem) setLine(i, { attachment: file.name, file });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!payee.trim()) e.payee = 'Enter who was paid.';
    if (!accountId) e.account = `Choose a ${copy.account.toLowerCase()}.`;
    if (!date) e.date = 'Pick the date.';
    const filled = lines.filter((l) => l.category || l.description || l.amount || l.party);
    if (!filled.length) e.lines = 'Add at least one line with a category and an amount.';
    lines.forEach((l, i) => {
      const used = l.category || l.description || l.amount || l.party;
      if (!used) return;
      if (!l.category) e[`cat-${i}`] = 'Choose a category.';
      if (!(Number(l.amount) > 0)) e[`amt-${i}`] = 'Enter an amount above zero.';
    });
    if (!e.account && balance !== null && total > balance) {
      e.total = `The total is more than the ${copy.balance.toLowerCase()} of ${money(balance)}.`;
    }
    return e;
  };

  const save = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (saving) return;
    const e = validate();
    setErrors(e);
    if (Object.values(e).some(Boolean)) return;
    setSaving(true);
    try {
      // Line attachments are uploaded first; the voucher then refers to them. The server recomputes the total.
      const used = await Promise.all(
        lines
          .filter((l) => l.category && Number(l.amount) > 0)
          .map(async (l) => ({
            category: l.category,
            description: l.description.trim() || l.category,
            amount: Number(l.amount),
            party: l.party.trim(),
            fileId: l.file ? (await uploadFile(l.file, l.file.name, 'private')).id : undefined,
          }))
      );
      const saved = await addExpense({ kind, payee: payee.trim(), accountId, paymentDate: date, method, refNo: refNo.trim(), lines: used, remarks: remarks.trim() });
      if (saved) {
        setPayee(''); setAccountId(''); setDate(today()); setRefNo(''); setLines([blankLine()]); setRemarks(''); setErrors({});
      }
    } catch (err) {
      showToast('Could not save', err instanceof Error ? err.message : 'Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const err = (k: string) => errors[k] ? <p className="mt-1 text-[12px] text-[#B42318]">{errors[k]}</p> : null;
  const open = records.find((r) => r.id === openId);
  const accountName = (id: string) => ledgerAccounts.find((a) => a.id === id)?.name || id;

  return (
    <div className="space-y-12">
      <section>
        <SectionHeader title={copy.title} hint={copy.hint} />
        <form onSubmit={save} noValidate className="pt-6 space-y-6">
          {/* Who, from where, when, how */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
            <label className="block">
              <span className="gb-label block mb-2">Payee</span>
              <input value={payee} onChange={(e) => setPayee(e.target.value)} placeholder="Who received the payment" className={`${field} ${fieldBorder(!!errors.payee)}`} />
              {err('payee')}
            </label>
            <label className="block">
              <span className="gb-label block mb-2">{copy.account}</span>
              <select value={accountId} onChange={(e) => pickAccount(e.target.value)} className={`${field} ${fieldBorder(!!errors.account)} cursor-pointer`}>
                <option value="">{kind === 'expense' ? 'Cash and cash equivalents' : 'Choose a credit account'}</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              {accounts.length ? (
                <span className="mt-1.5 block text-[12.5px] text-[#4E585E] tabular-nums">
                  {copy.balance}: <strong className="text-[#141517]">{money(balance ?? 0)}</strong>
                </span>
              ) : (
                <span className="mt-1.5 block text-[12.5px] text-[#B42318]">
                  No {kind === 'expense' ? 'cash or bank' : 'credit'} accounts yet.{' '}
                  <button type="button" onClick={() => navigateTo('admin', { adminTab: 'accounting' })} className="font-semibold underline underline-offset-4 cursor-pointer">Add one in Accounting overview</button>
                </span>
              )}
              {err('account')}
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-5">
            <label className="block">
              <span className="gb-label block mb-2">Payment date</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${field} ${fieldBorder(!!errors.date)}`} />
              {err('date')}
            </label>
            <label className="block">
              <span className="gb-label block mb-2">Payment method</span>
              <select value={method} onChange={(e) => setMethod(e.target.value as Expense['method'])} className={`${field} border-[#8C989F] cursor-pointer`}>
                <option value="bank">Bank</option>
                <option value="cash">Cash</option>
              </select>
            </label>
            <label className="block">
              <span className="gb-label block mb-2">Ref. no.</span>
              <input value={refNo} onChange={(e) => setRefNo(e.target.value)} placeholder="Receipt or transfer no." className={`${field} border-[#8C989F]`} />
            </label>
          </div>

          {/* Lines */}
          <div>
            <div className="hidden lg:grid grid-cols-[28px_1.1fr_1.4fr_0.8fr_1fr_120px_36px] gap-3 pb-2 border-b-2 border-[#141517]">
              {['#', 'Category', 'Description', 'Amount', copy.party, 'Attachment', ''].map((h) => <span key={h} className="gb-label">{h}</span>)}
            </div>
            <ol>
              {lines.map((l, i) => (
                <li key={i} className="grid grid-cols-2 lg:grid-cols-[28px_1.1fr_1.4fr_0.8fr_1fr_120px_36px] gap-3 py-3 border-b border-[#C9D1D6] items-start animate-fade-up">
                  <span className="col-span-2 lg:col-span-1 gb-label lg:pt-3.5 tabular-nums"><span className="lg:hidden">Line </span>{i + 1}</span>
                  <div className="col-span-2 lg:col-span-1">
                    <select aria-label={`Category, line ${i + 1}`} value={l.category} onChange={(e) => setLine(i, { category: e.target.value })} className={`${field} ${fieldBorder(!!errors[`cat-${i}`])} cursor-pointer`}>
                      <option value="">Choose category</option>
                      {categories.map((c) => <option key={c}>{c}</option>)}
                    </select>
                    {err(`cat-${i}`)}
                  </div>
                  <input aria-label={`Description, line ${i + 1}`} value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} placeholder="Description" className={`${field} border-[#8C989F] col-span-2 lg:col-span-1`} />
                  <div>
                    <div className={`flex items-center bg-white border ${fieldBorder(!!errors[`amt-${i}`])}`}>
                      <span className="pl-3 text-[14px] text-[#4E585E]">₱</span>
                      <input aria-label={`Amount, line ${i + 1}`} inputMode="decimal" value={l.amount} onChange={(e) => setLine(i, { amount: e.target.value.replace(/[^0-9.]/g, '') })} placeholder="0.00" className="w-full px-2 py-2.5 text-[14px] text-[#141517] outline-none tabular-nums text-right bg-transparent" />
                    </div>
                    {err(`amt-${i}`)}
                  </div>
                  <input aria-label={`${copy.party}, line ${i + 1}`} value={l.party} onChange={(e) => setLine(i, { party: e.target.value })} placeholder={copy.party} className={`${field} border-[#8C989F]`} />
                  <div className="min-w-0">
                    {l.attachment ? (
                      <span className="flex items-center gap-1.5 py-2.5 text-[12.5px] text-[#141517] min-w-0">
                        <Paperclip className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <span className="truncate" title={l.attachment}>{l.attachment}</span>
                        <button type="button" aria-label={`Remove attachment, line ${i + 1}`} onClick={() => setLine(i, { attachment: undefined })} className="p-1 text-[#4E585E] hover:text-[#B42318] cursor-pointer shrink-0"><X className="w-3.5 h-3.5" /></button>
                      </span>
                    ) : (
                      <label className="flex items-center justify-center gap-1.5 px-3 py-2.5 border border-dashed border-[#8C989F] text-[12.5px] font-semibold text-[#141517] hover:bg-white cursor-pointer focus-within:outline focus-within:outline-2 focus-within:outline-[#1D5FD1]">
                        <Paperclip className="w-3.5 h-3.5" aria-hidden="true" /> Add file
                        <input type="file" accept="image/*,application/pdf" className="sr-only" aria-label={`Attach a file, line ${i + 1}`} onChange={(e) => { attach(i, e.target.files?.[0]); e.target.value = ''; }} />
                      </label>
                    )}
                    {err(`attach-${i}`)}
                  </div>
                  <button type="button" onClick={() => removeLine(i)} aria-label={`Delete line ${i + 1}`} title="Delete line" className="justify-self-end lg:justify-self-auto p-2.5 text-[#4E585E] hover:text-[#B42318] hover:bg-white cursor-pointer">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ol>
            {err('lines')}

            <div className="flex flex-wrap items-center justify-between gap-4 pt-4">
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setLines((p) => [...p, blankLine()])} className={`${btn.outline} flex items-center gap-1.5`}>
                  <Plus className="w-4 h-4" aria-hidden="true" /> Add line
                </button>
                <button type="button" onClick={() => setLines([blankLine()])} className="px-3.5 py-2 text-[13px] font-semibold text-[#4E585E] hover:text-[#B42318] cursor-pointer">
                  Clear all lines
                </button>
              </div>
              <p className="text-right">
                <span className="gb-label mr-3">Total</span>
                <span className="font-display text-[26px] leading-none tabular-nums text-[#141517]">{money(total)}</span>
              </p>
            </div>
            {err('total')}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-end">
            <label className="block max-w-xl">
              <span className="gb-label block mb-2">Remarks</span>
              <textarea rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Anything worth noting for this voucher" className={`${field} border-[#8C989F]`} />
            </label>
            <button type="submit" disabled={saving} className="px-8 py-3.5 bg-[#1D5FD1] hover:bg-[#174CA8] disabled:opacity-60 text-white text-[14px] font-semibold cursor-pointer transition-colors">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </section>

      <section>
        <SectionHeader title={copy.list} hint={`${records.length} vouchers · ${money(records.reduce((s, r) => s + r.total, 0))} in total`} />
        {records.length === 0 ? (
          <EmptyState title="Nothing recorded yet" body="Saved vouchers appear here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px] min-w-[640px]">
              <thead>
                <tr>
                  {['Voucher', 'Date', 'Payee', 'Account', 'Total'].map((h) => (
                    <th key={h} className={`gb-label py-3 font-semibold ${h === 'Total' ? 'text-right' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {[...records].sort((a, b) => b.paymentDate.localeCompare(a.paymentDate)).map((r) => (
                  <tr
                    key={r.id}
                    tabIndex={0}
                    onClick={() => setOpenId(r.id)}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setOpenId(r.id))}
                    className="border-t border-[#C9D1D6] cursor-pointer hover:bg-white focus-visible:bg-white transition-colors"
                    aria-label={`Open ${r.voucherNo}`}
                  >
                    <td className="py-3 font-semibold text-[#141517]">{r.voucherNo}</td>
                    <td className="py-3 text-[#2A2E31]">{shortDate(r.paymentDate)}</td>
                    <td className="py-3 text-[#141517]">{r.payee}</td>
                    <td className="py-3 text-[#2A2E31]">{accountName(r.accountId)}</td>
                    <td className="py-3 text-right font-semibold text-[#141517]">{money(r.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Drawer open={!!open} onClose={() => setOpenId(null)} title={open?.voucherNo || ''}>
        {open && (
          <div className="space-y-6 text-[13.5px]">
            <dl className="grid grid-cols-2 gap-y-2">
              <dt className="text-[#4E585E]">Payee</dt><dd className="text-[#141517] font-medium">{open.payee}</dd>
              <dt className="text-[#4E585E]">{copy.account}</dt><dd className="text-[#141517]">{accountName(open.accountId)}</dd>
              <dt className="text-[#4E585E]">Date</dt><dd className="text-[#141517] tabular-nums">{shortDate(open.paymentDate)}</dd>
              <dt className="text-[#4E585E]">Method</dt><dd className="text-[#141517]">{open.method === 'bank' ? 'Bank' : 'Cash'}</dd>
              <dt className="text-[#4E585E]">Ref. no.</dt><dd className="text-[#141517] tabular-nums">{open.refNo || '-'}</dd>
            </dl>
            <ul className="border-t border-[#141517]">
              {open.lines.map((l, i) => (
                <li key={i} className="py-3 border-b border-[#DDE3E6]">
                  <div className="flex justify-between gap-3">
                    <span className="font-medium text-[#141517]">{l.category}</span>
                    <span className="tabular-nums font-semibold text-[#141517]">{money(l.amount)}</span>
                  </div>
                  <p className="text-[#4E585E]">{[l.description, l.party].filter(Boolean).join(' · ')}</p>
                  {l.attachment && (
                    <p className="mt-1 flex items-center gap-1 text-[#141517]">
                      <Paperclip className="w-3.5 h-3.5" aria-hidden="true" />
                      {l.attachmentUrl ? <a href={l.attachmentUrl} target="_blank" rel="noopener" className="underline underline-offset-2">{l.attachment}</a> : l.attachment}
                    </p>
                  )}
                </li>
              ))}
            </ul>
            <p className="flex justify-between font-semibold text-[#141517]"><span>Total</span><span className="tabular-nums">{money(open.total)}</span></p>
            {open.remarks && <p className="text-[#2A2E31]">Remarks: {open.remarks}</p>}
          </div>
        )}
      </Drawer>
    </div>
  );
};
