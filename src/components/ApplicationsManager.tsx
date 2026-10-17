import React, { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { StatusMark } from './StatusMark.tsx';
import { VehicleApplication } from '../types.ts';
import { openAcknowledgementReceipt, openImage, reserveWindow } from './receipt.ts';
import { dataUrlToBlob } from '../api.ts';
import { isOngoing, amountPaid } from './ApplicationProgress.tsx';
import { photoDataUrl } from '../media.ts';
import { FilterTabs, SectionHeader, EmptyState, ReasonAction, btn, peso, shortDate, checkUpload } from './admin/ui.tsx';
import { Check, PhoneCall, PackageCheck, ReceiptText, Paperclip, X } from 'lucide-react';

type Filter = 'review' | 'approved' | 'completed' | 'closed' | 'all';
const OPEN: VehicleApplication['status'][] = ['submitted', 'under_review', 'contacted'];

export const docSummary = (app: VehicleApplication) => {
  const docs = app.documents || [];
  if (!docs.length) return { text: 'No documents', tone: 'muted' as const };
  const approved = docs.filter((d) => d.status === 'approved').length;
  const rejected = docs.filter((d) => d.status === 'rejected').length;
  if (rejected) return { text: `${rejected} document${rejected > 1 ? 's' : ''} rejected`, tone: 'bad' as const };
  if (approved === docs.length) return { text: `All ${docs.length} documents approved`, tone: 'good' as const };
  const missing = docs.filter((d) => !d.fileName).length;
  return {
    text: `${approved} of ${docs.length} documents approved${missing ? ` · ${missing} not yet submitted` : ''}`,
    tone: 'muted' as const,
  };
};

// Confirmed partial payments on one application, each with its acknowledgement receipt, plus the form to confirm another.
const PartialPayments: React.FC<{ app: VehicleApplication }> = ({ app }) => {
  const { recordPartialPayment, showToast } = useApp();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState(`Partial payment for ${app.vehicleTitle}`);
  const [shot, setShot] = useState<{ blob: Blob; name: string } | undefined>();
  const [saving, setSaving] = useState(false);
  const [shotError, setShotError] = useState('');
  const attachShot = async (file?: File) => {
    if (!file) return;
    const problem = checkUpload(file);
    if (problem || !file.type.startsWith('image/')) return setShotError(problem || `${file.name} is not an image. Attach a screenshot or photo.`);
    setShotError('');
    // Shrunk before upload; the screenshot only needs to be readable.
    setShot({ blob: await dataUrlToBlob(await photoDataUrl(file, 1400)), name: file.name.replace(/\.\w+$/, '.jpg') });
  };
  const value = Number(amount);
  const canAccept = app.status !== 'declined' && app.status !== 'withdrawn' && app.status !== 'completed';
  const show = (arNo: string) => {
    const p = app.payments?.find((x) => x.arNo === arNo);
    if (p && !openAcknowledgementReceipt(app, p)) showToast('Allow pop-ups', 'Your browser blocked the receipt window. Allow pop-ups for this site and try again.', 'error');
  };
  if (!app.payments?.length && !canAccept) return null;
  return (
    <div className="space-y-2">
      {!!app.payments?.length && (
        <ul className="text-[13px]">
          {app.payments.map((p) => (
            <li key={p.arNo} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-1.5 border-b border-[#DDE3E6] last:border-0">
              <span className="tabular-nums font-semibold text-[#141517]">AR {p.arNo}</span>
              <span className="tabular-nums text-[#141517]">{peso(p.amount)}</span>
              <span className="text-[#4E585E] tabular-nums">{shortDate(p.date)}</span>
              {p.attachment && (
                <button onClick={() => openImage(p.attachment!, `Payment screenshot ${p.arNo}`)} className="inline-flex items-center gap-1 text-[13px] text-[#141517] underline decoration-[#8C989F] underline-offset-4 cursor-pointer">
                  <Paperclip className="w-3.5 h-3.5" aria-hidden="true" /> Screenshot
                </button>
              )}
              <button onClick={() => show(p.arNo)} className="ml-auto text-[13px] font-semibold text-[#1D5FD1] underline underline-offset-4 cursor-pointer">
                View receipt
              </button>
            </li>
          ))}
        </ul>
      )}
      {canAccept &&
        (open ? (
          <form
            className="flex flex-wrap items-center gap-2 animate-fade-up"
            onSubmit={async (e) => {
              e.preventDefault();
              if (saving) return;
              setSaving(true);
              const win = reserveWindow(); // opened during the click so the browser allows it
              const receipt = await recordPartialPayment(app.id, value, description, shot ? Object.assign(shot.blob, { name: shot.name }) : undefined);
              setSaving(false);
              if (!receipt) return win?.close();
              setOpen(false);
              setAmount('');
              setShot(undefined);
              openAcknowledgementReceipt({ ...app, payments: [...(app.payments ?? []), receipt] }, receipt, win);
            }}
          >
            <label className="flex items-center border border-[#8C989F] bg-white">
              <span className="pl-3 text-[14px] text-[#4E585E]">₱</span>
              <input
                autoFocus
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Amount received"
                aria-label="Amount received"
                className="w-[150px] px-2 py-2 text-[14px] tabular-nums outline-none"
              />
            </label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              aria-label="Description on the receipt"
              className="flex-1 min-w-[220px] px-3 py-2 text-[14px] bg-white border border-[#8C989F] text-[#141517]"
            />
            {shot ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-2 border border-[#1B7F35] text-[12.5px] text-[#141517] max-w-[200px]">
                <Paperclip className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{shot.name}</span>
                <button type="button" onClick={() => setShot(undefined)} aria-label="Remove screenshot" className="cursor-pointer text-[#4E585E] hover:text-[#141517]">
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ) : (
              <label className={`${btn.outline} inline-flex items-center gap-1.5 focus-within:outline focus-within:outline-2 focus-within:outline-[#1D5FD1]`}>
                <Paperclip className="w-4 h-4" aria-hidden="true" />
                Payment screenshot
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => { attachShot(e.target.files?.[0]); e.target.value = ''; }} />
              </label>
            )}
            <button type="submit" disabled={saving || !(value > 0) || !description.trim()} className={btn.primary}>
              {saving ? 'Saving…' : 'Confirm & release AR'}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="px-3 py-2 text-[13px] text-[#4E585E] hover:text-[#141517] cursor-pointer">
              Cancel
            </button>
            {shotError && <p role="alert" className="w-full text-[12.5px] text-[#B42318]">{shotError}</p>}
          </form>
        ) : (
          <button className={`${btn.outline} flex items-center gap-1.5`} onClick={() => setOpen(true)}>
            <ReceiptText className="w-4 h-4" aria-hidden="true" />
            Confirm partial payment
          </button>
        ))}
    </div>
  );
};

// Admin: move each client application from review to approval (reserves the car) to a completed sale.
export const ApplicationsManager: React.FC = () => {
  const { applications, updateApplicationStatus, navigateTo } = useApp();
  const [filter, setFilter] = useState<Filter>('review');

  const matches = (f: Filter, a: VehicleApplication) =>
    f === 'all' ||
    (f === 'review' && OPEN.includes(a.status)) ||
    (f === 'approved' && a.status === 'approved') ||
    (f === 'completed' && a.status === 'completed') ||
    (f === 'closed' && (a.status === 'declined' || a.status === 'withdrawn'));
  const count = (f: Filter) => applications.filter((a) => matches(f, a)).length;
  const rows = applications.filter((a) => matches(filter, a));

  return (
    <section className="space-y-5">
      <SectionHeader
        title="Applications"
        hint="Approving an application reserves the vehicle for that client. Financing applications need every document approved first. Confirming a partial payment releases a numbered acknowledgement receipt (AR) to the client."
      />
      <FilterTabs
        id="applications"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'review', label: 'To review', count: count('review') },
          { value: 'approved', label: 'Approved', count: count('approved') },
          { value: 'completed', label: 'Completed', count: count('completed') },
          { value: 'closed', label: 'Declined', count: count('closed') },
          { value: 'all', label: 'All', count: applications.length },
        ]}
      />

      {rows.length === 0 ? (
        <EmptyState title="All caught up" body="No applications in this list." />
      ) : (
        <ul key={filter} className="animate-view-fade">
          {rows.map((app) => {
            const docs = docSummary(app);
            const docsBlock = app.purchaseMethod === 'financing' && docs.tone !== 'good';
            return (
              <li key={app.id} className="py-5 border-b border-[#C9D1D6] space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[12.5px] tabular-nums text-[#4E585E]">{app.referenceNo}{app.quotationNo ? ` · from ${app.quotationNo}` : ''}</span>
                      <StatusMark status={app.status} />
                      {isOngoing(app) && <StatusMark status="Ongoing" />}
                      <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[#141517]">
                        {app.purchaseMethod === 'cash' ? 'Cash' : `Financing · ${app.financingTermMonths ?? '-'} mo`}
                      </span>
                    </div>
                    <p className="mt-1.5 font-semibold text-[15px] text-[#141517]">
                      {app.applicantName} <span className="font-normal text-[#4E585E] tabular-nums">· {app.applicantPhone}</span>
                    </p>
                    <p className="text-[13px] text-[#2A2E31]">
                      {app.vehicleTitle} · <span className="tabular-nums">{peso(app.vehiclePrice)}</span> · Agent {app.sellerName}
                    </p>
                    <p className="text-[12px] text-[#6B767D] tabular-nums">Submitted {shortDate(app.submittedAt)}</p>
                  </div>
                  <p className={`text-[12.5px] font-medium ${docs.tone === 'good' ? 'text-[#1B7F35]' : docs.tone === 'bad' ? 'text-[#B42318]' : 'text-[#4E585E]'}`}>
                    {docs.text}
                  </p>
                </div>

                {app.notes && <p className="text-[13px] text-[#2A2E31] max-w-[70ch]">Client note: “{app.notes}”</p>}
                {app.sellerNotes && <p className="text-[13px] text-[#2A2E31] max-w-[70ch]">Admin note: “{app.sellerNotes}”</p>}

                {OPEN.includes(app.status) && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      className={`${btn.primary} flex items-center gap-1.5`}
                      disabled={docsBlock}
                      onClick={() => updateApplicationStatus(app.id, 'approved')}
                    >
                      <Check className="w-4 h-4" aria-hidden="true" />
                      Approve &amp; reserve
                    </button>
                    {app.status !== 'contacted' && (
                      <button className={`${btn.outline} flex items-center gap-1.5`} onClick={() => updateApplicationStatus(app.id, 'contacted')}>
                        <PhoneCall className="w-4 h-4" aria-hidden="true" />
                        Mark contacted
                      </button>
                    )}
                    <ReasonAction label="Decline" placeholder="Reason the client will see" onConfirm={(r) => updateApplicationStatus(app.id, 'declined', r)} />
                    {docsBlock && (
                      <button
                        onClick={() => navigateTo('admin', { adminTab: 'financing' })}
                        className="text-[13px] font-semibold text-[#1D5FD1] underline underline-offset-4 cursor-pointer"
                      >
                        Review documents first
                      </button>
                    )}
                  </div>
                )}
                {app.status === 'approved' && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button className={`${btn.ink} flex items-center gap-1.5`} onClick={() => updateApplicationStatus(app.id, 'completed')}>
                      <PackageCheck className="w-4 h-4" aria-hidden="true" />
                      Mark sale completed
                    </button>
                    <ReasonAction label="Cancel approval" confirmLabel="Cancel & release car" placeholder="Reason the client will see" onConfirm={(r) => updateApplicationStatus(app.id, 'declined', r)} />
                    <span className="text-[12.5px] text-[#4E585E] tabular-nums">
                      Reserved · payment ongoing: {peso(amountPaid(app))} of {peso(app.vehiclePrice)} received
                    </span>
                  </div>
                )}
                {app.status === 'completed' && <p className="text-[12.5px] text-[#1B7F35] font-medium">Sale completed · vehicle released to the client.</p>}
                <PartialPayments app={app} />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
