import React, { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { StatusMark } from './StatusMark.tsx';
import { PaymentReceipt, VehicleApplication } from '../types.ts';
import { openAcknowledgementReceipt, openImage, openInfoSheet, reserveWindow } from './receipt.ts';
import { dataUrlToBlob } from '../api.ts';
import { amountPaid } from './ApplicationProgress.tsx';
import { photoDataUrl } from '../media.ts';
import { FilterTabs, SectionHeader, EmptyState, ReasonAction, btn, peso, shortDate, checkUpload } from './admin/ui.tsx';
import { Check, PhoneCall, PackageCheck, Paperclip, Pencil, Plus, X, FileText } from 'lucide-react';


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

// A payment screenshot picked by the admin, shrunk before upload (it only needs to be readable).
const useScreenshot = () => {
  const [shot, setShot] = useState<{ blob: Blob; name: string } | undefined>();
  const [shotError, setShotError] = useState('');
  const attachShot = async (file?: File) => {
    if (!file) return;
    const problem = checkUpload(file);
    if (problem || !file.type.startsWith('image/')) return setShotError(problem || `${file.name} is not an image. Attach a screenshot or photo.`);
    setShotError('');
    setShot({ blob: await dataUrlToBlob(await photoDataUrl(file, 1400)), name: file.name.replace(/\.\w+$/, '.jpg') });
  };
  const blob = shot ? Object.assign(shot.blob, { name: shot.name }) : undefined;
  const field = (label = 'Payment screenshot') =>
    shot ? (
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
        {label}
        <input type="file" accept="image/*" className="sr-only" onChange={(e) => { attachShot(e.target.files?.[0]); e.target.value = ''; }} />
      </label>
    );
  return { blob, field, shotError, clear: () => setShot(undefined) };
};

const input = 'px-3 py-2 text-[14px] bg-white border border-[#8C989F] text-[#141517]';

// One AR line: amount received, description, payment screenshot and remarks. Used to release a new AR and to edit one.
export const PaymentLineForm: React.FC<{
  initial?: PaymentReceipt;
  defaultDescription: string;
  submitLabel: string;
  onSubmit: (v: { amount: number; description: string; remarks: string }, screenshot?: Blob & { name?: string }) => Promise<boolean>;
  onCancel: () => void;
}> = ({ initial, defaultDescription, submitLabel, onSubmit, onCancel }) => {
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
  const [description, setDescription] = useState(initial?.description ?? defaultDescription);
  const [remarks, setRemarks] = useState(initial?.remarks ?? '');
  const [saving, setSaving] = useState(false);
  const shot = useScreenshot();
  const value = Number(amount);
  return (
    <form
      className="flex flex-wrap items-center gap-2 animate-fade-up"
      onSubmit={async (e) => {
        e.preventDefault();
        if (saving) return;
        setSaving(true);
        const ok = await onSubmit({ amount: value, description: description.trim(), remarks: remarks.trim() }, shot.blob);
        setSaving(false);
        if (ok) shot.clear();
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
      <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" aria-label="Description on the receipt" className={`flex-1 min-w-[220px] ${input}`} />
      {shot.field(initial?.attachment ? 'Replace screenshot' : 'Payment screenshot')}
      <input value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Remarks (optional)" aria-label="Remarks on the receipt" className={`w-full ${input}`} />
      <button type="submit" disabled={saving || !(value > 0) || !description.trim()} className={btn.primary}>
        {saving ? 'Saving…' : submitLabel}
      </button>
      <button type="button" onClick={onCancel} className="px-3 py-2 text-[13px] text-[#4E585E] hover:text-[#141517] cursor-pointer">
        Cancel
      </button>
      {shot.shotError && <p role="alert" className="w-full text-[12.5px] text-[#B42318]">{shot.shotError}</p>}
    </form>
  );
};

// Confirmed partial payments on one application, each with its acknowledgement receipt, plus "Add new line" to release another.
const PartialPayments: React.FC<{ app: VehicleApplication }> = ({ app }) => {
  const { recordPartialPayment, updatePayment, showToast } = useApp();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
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
          {app.payments.map((p) =>
            editing === p.arNo ? (
              <li key={p.arNo} className="py-2 border-b border-[#DDE3E6] last:border-0 space-y-1.5">
                <p className="tabular-nums font-semibold text-[#141517]">Edit AR {p.arNo}</p>
                <PaymentLineForm
                  initial={p}
                  defaultDescription={p.description}
                  submitLabel="Save AR"
                  onCancel={() => setEditing(null)}
                  onSubmit={async (v, shot) => {
                    const ok = !!(await updatePayment(app.id, p.arNo, v, shot));
                    if (ok) setEditing(null);
                    return ok;
                  }}
                />
              </li>
            ) : (
              <li key={p.arNo} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-1.5 border-b border-[#DDE3E6] last:border-0">
                <span className="tabular-nums font-semibold text-[#141517]">AR {p.arNo}</span>
                <span className="tabular-nums text-[#141517]">{peso(p.amount)}</span>
                <span className="text-[#4E585E] tabular-nums">{shortDate(p.date)}</span>
                <span className="text-[#4E585E] truncate max-w-[260px]" title={p.description}>{p.description}</span>
                {p.remarks && <span className="w-full text-[12.5px] text-[#4E585E]">Remarks: {p.remarks}</span>}
                {p.attachment && (
                  <button onClick={() => openImage(p.attachment!, `Payment screenshot ${p.arNo}`)} className="inline-flex items-center gap-1 text-[13px] text-[#141517] underline decoration-[#8C989F] underline-offset-4 cursor-pointer">
                    <Paperclip className="w-3.5 h-3.5" aria-hidden="true" /> Screenshot
                  </button>
                )}
                <span className="ml-auto flex gap-4">
                  <button onClick={() => { setEditing(p.arNo); setOpen(false); }} className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#141517] underline decoration-[#8C989F] underline-offset-4 cursor-pointer">
                    <Pencil className="w-3.5 h-3.5" aria-hidden="true" /> Edit
                  </button>
                  <button onClick={() => show(p.arNo)} className="text-[13px] font-semibold text-[#1D5FD1] underline underline-offset-4 cursor-pointer">
                    View receipt
                  </button>
                </span>
              </li>
            )
          )}
        </ul>
      )}
      {canAccept &&
        (open ? (
          <PaymentLineForm
            defaultDescription={`Partial payment for ${app.vehicleTitle}`}
            submitLabel="Confirm & release AR"
            onCancel={() => setOpen(false)}
            onSubmit={async (v, shot) => {
              const win = reserveWindow(); // opened during the click so the browser allows it
              const receipt = await recordPartialPayment(app.id, v.amount, v.description, shot, v.remarks || undefined);
              if (!receipt) {
                win?.close();
                return false;
              }
              setOpen(false);
              openAcknowledgementReceipt({ ...app, payments: [...(app.payments ?? []), receipt] }, receipt, win);
              return true;
            }}
          />
        ) : (
          <button className={`${btn.outline} flex items-center gap-1.5`} onClick={() => { setOpen(true); setEditing(null); }}>
            <Plus className="w-4 h-4" aria-hidden="true" />
            Add new line
          </button>
        ))}
    </div>
  );
};

// Admin: the reservation payment (released as an AR in the client's name) that reserves the vehicle.
const ReserveAction: React.FC<{ app: VehicleApplication; blocked: boolean }> = ({ app, blocked }) => {
  const { reserveApplication } = useApp();
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <button className={`${btn.primary} flex items-center gap-1.5`} disabled={blocked} onClick={() => setOpen(true)}>
        <Check className="w-4 h-4" aria-hidden="true" />
        Reserve
      </button>
    );
  return (
    <div className="w-full space-y-1.5">
      <p className="text-[13px] font-semibold text-[#141517]">Reservation payment: an acknowledgement receipt is released to {app.applicantName}.</p>
      <PaymentLineForm
        defaultDescription={`Reservation fee for ${app.vehicleTitle}`}
        submitLabel="Reserve & release AR"
        onCancel={() => setOpen(false)}
        onSubmit={async (v, shot) => {
          const win = reserveWindow(); // opened during the click so the browser allows it
          const receipt = await reserveApplication(app.id, { amount: v.amount, description: v.description, remarks: v.remarks || undefined }, shot);
          if (!receipt) {
            win?.close();
            return false;
          }
          setOpen(false);
          openAcknowledgementReceipt({ ...app, payments: [...(app.payments ?? []), receipt] }, receipt, win);
          return true;
        }}
      />
    </div>
  );
};

// Admin: approve after reading the information sheet, with optional credit investigation (C.I.) comments.
const ApproveAction: React.FC<{ app: VehicleApplication }> = ({ app }) => {
  const { updateApplicationStatus } = useApp();
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState('');
  if (!open)
    return (
      <button className={`${btn.primary} flex items-center gap-1.5`} onClick={() => setOpen(true)}>
        <Check className="w-4 h-4" aria-hidden="true" />
        Approve
      </button>
    );
  return (
    <form
      className="w-full space-y-2 animate-fade-up"
      onSubmit={async (e) => {
        e.preventDefault();
        if (await updateApplicationStatus(app.id, 'approved', comments.trim() || undefined)) setOpen(false);
      }}
    >
      <label className="block">
        <span className="gb-label block mb-1.5">C.I. comments (optional)</span>
        <textarea rows={2} value={comments} onChange={(e) => setComments(e.target.value)} className="w-full px-3 py-2 text-[14px] bg-white border border-[#8C989F] text-[#141517]" />
      </label>
      <div className="flex gap-2">
        <button type="submit" className={btn.primary}>Approve application</button>
        <button type="button" onClick={() => setOpen(false)} className="px-3 py-2 text-[13px] text-[#4E585E] hover:text-[#141517] cursor-pointer">Cancel</button>
      </div>
    </form>
  );
};

// Admin: release the vehicle, confirming it now has its OR and CR.
const ReleaseAction: React.FC<{ app: VehicleApplication }> = ({ app }) => {
  const { releaseVehicle } = useApp();
  const [open, setOpen] = useState(false);
  const [orcr, setOrcr] = useState(false);
  if (!open)
    return (
      <button className={`${btn.ink} flex items-center gap-1.5`} onClick={() => { setOrcr(false); setOpen(true); }}>
        <PackageCheck className="w-4 h-4" aria-hidden="true" />
        Release vehicle
      </button>
    );
  return (
    <form
      className="w-full space-y-2 animate-fade-up"
      onSubmit={async (e) => {
        e.preventDefault();
        if (orcr && (await releaseVehicle(app.id))) setOpen(false);
      }}
    >
      <label className="flex items-start gap-2 text-[13.5px] text-[#141517] cursor-pointer">
        <input type="checkbox" checked={orcr} onChange={(e) => setOrcr(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[#1D5FD1]" />
        This vehicle now has its OR and CR, and is ready to be released to {app.applicantName}.
      </label>
      <div className="flex gap-2">
        <button type="submit" disabled={!orcr} className={btn.ink}>Confirm release</button>
        <button type="button" onClick={() => setOpen(false)} className="px-3 py-2 text-[13px] text-[#4E585E] hover:text-[#141517] cursor-pointer">Cancel</button>
      </div>
    </form>
  );
};

type Filter = 'review' | 'reserved' | 'processing' | 'approved' | 'completed' | 'closed' | 'all';
const OPEN: VehicleApplication['status'][] = ['submitted', 'under_review', 'contacted'];

// Admin: review -> reserve (reservation AR) -> the client's information sheet -> approve -> release with OR/CR.
export const ApplicationsManager: React.FC = () => {
  const { applications, updateApplicationStatus, navigateTo, showToast } = useApp();
  const [filter, setFilter] = useState<Filter>('review');

  const matches = (f: Filter, a: VehicleApplication) =>
    f === 'all' ||
    (f === 'review' && OPEN.includes(a.status)) ||
    (f === 'reserved' && a.status === 'reserved') ||
    (f === 'processing' && a.status === 'processing') ||
    (f === 'approved' && a.status === 'approved') ||
    (f === 'completed' && a.status === 'completed') ||
    (f === 'closed' && (a.status === 'declined' || a.status === 'withdrawn'));
  const count = (f: Filter) => applications.filter((a) => matches(f, a)).length;
  const rows = applications.filter((a) => matches(filter, a));
  const viewSheet = (app: VehicleApplication) => !openInfoSheet(app) && showToast('Allow pop-ups', 'Your browser blocked the sheet window. Allow pop-ups for this site and try again.', 'error');

  return (
    <section className="space-y-5">
      <SectionHeader
        title="Applications"
        hint="Review the documents, then reserve the vehicle with the reservation payment (an AR is released to the client). The client then fills in the Applicant's Information Sheet; read it and approve or disapprove. Once the vehicle has its OR and CR, release it."
      />
      <FilterTabs
        id="applications"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'review', label: 'To review', count: count('review') },
          { value: 'reserved', label: 'Reserved', count: count('reserved') },
          { value: 'processing', label: 'Processing', count: count('processing') },
          { value: 'approved', label: 'Approved', count: count('approved') },
          { value: 'completed', label: 'Released', count: count('completed') },
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
            const docsBlock = docs.tone !== 'good' && (app.documents?.length ?? 0) > 0; // cash or financing: documents first
            return (
              <li key={app.id} className="py-5 border-b border-[#C9D1D6] space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[12.5px] tabular-nums text-[#4E585E]">{app.referenceNo}{app.quotationNo ? ` · from ${app.quotationNo}` : ''}</span>
                      <StatusMark status={app.status === 'completed' ? 'Released' : app.status} />
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
                {app.ciComments && <p className="text-[13px] text-[#2A2E31] max-w-[70ch]">C.I. comments: “{app.ciComments}”</p>}

                {OPEN.includes(app.status) && (
                  <div className="flex flex-wrap items-center gap-2">
                    <ReserveAction app={app} blocked={docsBlock} />
                    {app.status !== 'contacted' && (
                      <button className={`${btn.outline} flex items-center gap-1.5`} onClick={() => updateApplicationStatus(app.id, 'contacted')}>
                        <PhoneCall className="w-4 h-4" aria-hidden="true" />
                        Mark contacted
                      </button>
                    )}
                    <ReasonAction label="Decline" placeholder="Reason the client will see" onConfirm={(r) => updateApplicationStatus(app.id, 'declined', r)} />
                    {docsBlock && (
                      <button onClick={() => navigateTo('admin', { adminTab: 'financing' })} className="text-[13px] font-semibold text-[#1D5FD1] underline underline-offset-4 cursor-pointer">
                        Review documents first
                      </button>
                    )}
                  </div>
                )}
                {app.status === 'reserved' && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[12.5px] font-medium text-[#B4690E]">Reserved · waiting for the client's information sheet.</span>
                    <ReasonAction label="Cancel reservation" confirmLabel="Cancel & free the car" placeholder="Reason the client will see" onConfirm={(r) => updateApplicationStatus(app.id, 'declined', r)} />
                  </div>
                )}
                {app.status === 'processing' && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button className={`${btn.outline} flex items-center gap-1.5`} onClick={() => viewSheet(app)}>
                      <FileText className="w-4 h-4" aria-hidden="true" /> View information sheet
                    </button>
                    <ApproveAction app={app} />
                    <ReasonAction label="Disapprove" confirmLabel="Disapprove & free the car" placeholder="Reason the client will see" onConfirm={(r) => updateApplicationStatus(app.id, 'declined', r)} />
                  </div>
                )}
                {app.status === 'approved' && (
                  <div className="flex flex-wrap items-center gap-2">
                    <ReleaseAction app={app} />
                    {app.infoSheet && (
                      <button className={`${btn.outline} flex items-center gap-1.5`} onClick={() => viewSheet(app)}>
                        <FileText className="w-4 h-4" aria-hidden="true" /> Information sheet
                      </button>
                    )}
                    <ReasonAction label="Cancel approval" confirmLabel="Cancel & free the car" placeholder="Reason the client will see" onConfirm={(r) => updateApplicationStatus(app.id, 'declined', r)} />
                    <span className="text-[12.5px] text-[#4E585E] tabular-nums">
                      Approved · paid so far: {peso(amountPaid(app))} of {peso(app.vehiclePrice)}
                    </span>
                  </div>
                )}
                {app.status === 'completed' && (
                  <p className="text-[12.5px] text-[#1B7F35] font-medium">
                    Released{app.releasedAt ? ` ${shortDate(app.releasedAt)}` : ''} with OR and CR · sale completed.
                    {app.infoSheet && (
                      <button className="ml-3 text-[#1D5FD1] underline underline-offset-4 cursor-pointer" onClick={() => viewSheet(app)}>Information sheet</button>
                    )}
                  </p>
                )}
                <PartialPayments app={app} />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
