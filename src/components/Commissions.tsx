import React, { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { COMMISSION_RATE } from '../data/constants.ts';
import { Commission, VehicleApplication } from '../types.ts';
import { openCommissionReceipt } from './receipt.ts';
import { photoDataUrl } from '../media.ts';
import { dataUrlToBlob } from '../api.ts';
import { FilterTabs, SectionHeader, EmptyState, btn, peso, shortDate, checkUpload } from './admin/ui.tsx';
import { FileCheck2, Download } from 'lucide-react';

type Stage = Commission['status'];

// A commission exists from the vehicle's release (payable, in full) until the cash is sent with proof (paid).
const ALL_STAGES: { value: Stage; label: string; explain: string }[] = [
  { value: 'payable', label: 'Payable', explain: 'The vehicle was released. Waiting for the cash transfer.' },
  { value: 'paid', label: 'Paid', explain: 'Cash transferred with proof of payment. The PDF receipt is ready.' },
];

// What a commission was earned for: a vehicle sale (add-ons included), a pre-order, or a paluwagan referral.
type Kind = 'sale' | 'preorder' | 'paluwagan';
const KINDS: { value: Kind; label: string; explain: string }[] = [
  { value: 'sale', label: 'Vehicle sales', explain: 'Ready units sold through you, with any add-ons commission included.' },
  { value: 'preorder', label: 'Pre-orders', explain: 'Units built to order: a share of the net amount.' },
  { value: 'paluwagan', label: 'Paluwagan', explain: 'Members who joined a paluwagan through your link: the amount you set, approved by the admin.' },
];
const kindOf = (c: Commission, apps: VehicleApplication[]): Kind =>
  c.vehicleTitle.startsWith('Paluwagan:') ? 'paluwagan' : apps.find((a) => a.referenceNo === c.applicationRef)?.preorderRef ? 'preorder' : 'sale';
const kindLabel = (k: Kind) => KINDS.find((x) => x.value === k)!.label;

// The steps a commission moves through, drawn as a ruled track.
const StageTrack: React.FC<{ status: Stage; stages: typeof ALL_STAGES }> = ({ status, stages: STAGES }) => {
  const reached = STAGES.findIndex((s) => s.value === status);
  return (
    <ol className="flex items-center gap-1.5" aria-label={`Stage: ${status}`}>
      {STAGES.map((s, i) => (
        <li key={s.value} className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full transition-colors duration-300 ${
              i < reached || status === 'paid' ? 'bg-[#1B7F35]' : i === reached ? 'bg-[#1D5FD1]' : 'bg-[#C9D1D6]'
            }`}
          />
          <span className={`text-[11.5px] ${i === reached ? 'text-[#141517] font-semibold' : 'text-[#6B767D]'}`}>{s.label}</span>
          {i < STAGES.length - 1 && <span className="w-3 h-px bg-[#C9D1D6]" />}
        </li>
      ))}
    </ol>
  );
};

// Agent commissions. Agents read theirs; the admin approves, pays (with proof) and issues the receipt.
export const Commissions: React.FC<{ mode: 'agent' | 'admin'; compact?: boolean }> = ({ mode, compact = false }) => {
  const { commissions, applications, payCommission, navigateTo, currentUser, showToast } = useApp();
  // Same status ('payable'), named from who's looking: the company pays it out, the agent is owed it (receivable).
  const STAGES = mode === 'agent'
    ? ALL_STAGES.map((s) => (s.value === 'payable' ? { ...s, label: 'Receivable', explain: 'The vehicle was released. This is owed to you; waiting for the cash transfer.' } : s))
    : ALL_STAGES; // unreleased (older, receivable) ones are not shown
  const everyKind = commissions.filter((c) => STAGES.some((s) => s.value === c.status) && (mode === 'admin' || c.agentName === currentUser?.name));
  const [kind, setKind] = useState<Kind | 'all'>('all');
  const kinds = new Map(everyKind.map((c) => [c.id, kindOf(c, applications)]));
  const mine = kind === 'all' || compact ? everyKind : everyKind.filter((c) => kinds.get(c.id) === kind);
  const [stage, setStage] = useState<Stage | 'all'>(mode === 'admin' ? 'payable' : 'all');
  const [error, setError] = useState('');

  const total = (s: Stage) => mine.filter((c) => c.status === s).reduce((sum, c) => sum + c.amount, 0);
  const count = (s: Stage) => mine.filter((c) => c.status === s).length;
  const rows = (stage === 'all' ? mine : mine.filter((c) => c.status === stage)).slice(0, compact ? 4 : undefined);

  const attachProof = async (id: string, file?: File) => {
    if (!file) return;
    const problem = checkUpload(file);
    if (problem) return setError(problem);
    setError('');
    // A photo of the proof is printed on the agent's receipt (shrunk first); a PDF proof is listed by name only.
    const proof = file.type.startsWith('image/')
      ? await photoDataUrl(file, 1600)
          .then(dataUrlToBlob)
          .then((b) => new File([b], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }))
          .catch(() => file)
      : file;
    payCommission(id, proof);
  };

  const receipt = (c: Commission) => {
    if (!openCommissionReceipt(c, kindLabel(kinds.get(c.id) ?? 'sale'))) showToast('Allow pop-ups', 'Your browser blocked the receipt window. Allow pop-ups for this site and try again.', 'error');
  };

  return (
    <section className="space-y-5">
      <SectionHeader
        title={mode === 'admin' ? 'Agent commissions' : 'Commissions'}
        hint={compact ? undefined : mode === 'admin' ? `The admin sets each commission (standard ${COMMISSION_RATE * 100}% of the sale price). It is payable in full once the vehicle is released, then paid with proof.` : 'Your full commission is receivable once your client’s vehicle is released.'}
      >
        {compact && (
          <button
            onClick={() => navigateTo('seller', { sellerTab: 'commissions' })}
            className="text-[13px] font-semibold text-[#141517] underline decoration-[#8C989F] hover:decoration-[#141517] underline-offset-4 cursor-pointer"
          >
            All commissions
          </button>
        )}
      </SectionHeader>

      {!compact && (
        <div className="space-y-2">
          <FilterTabs
            id={`kind-${mode}`}
            value={kind}
            onChange={setKind}
            options={[
              { value: 'all', label: 'All kinds', count: everyKind.length },
              ...KINDS.map((k) => ({ value: k.value, label: k.label, count: everyKind.filter((c) => kinds.get(c.id) === k.value).length })),
            ]}
          />
          {kind !== 'all' && <p className="text-[13px] text-[#4E585E]">{KINDS.find((k) => k.value === kind)?.explain}</p>}
        </div>
      )}

      {/* Stage totals: what is owed at each step */}
      <dl className={`grid ${STAGES.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} border-b border-[#C9D1D6]`}>
        {STAGES.map((s, i) => (
          <button
            key={s.value}
            onClick={() => setStage(s.value)}
            className={`text-left py-4 pr-3 cursor-pointer group ${i > 0 ? 'pl-4 border-l border-[#C9D1D6]' : ''}`}
          >
            <dt className="gb-label group-hover:text-[#141517]">{s.label}</dt>
            <dd className="mt-1.5 font-display text-[clamp(18px,2.4vw,24px)] leading-none tabular-nums text-[#141517]">{peso(total(s.value))}</dd>
            <dd className="mt-1 text-[12px] text-[#4E585E]">{count(s.value)} {count(s.value) === 1 ? 'commission' : 'commissions'}</dd>
          </button>
        ))}
      </dl>

      {!compact && STAGES.length > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <FilterTabs
            id={`stage-${mode}`}
            value={stage}
            onChange={setStage}
            options={[
              { value: 'all', label: 'All', count: mine.length },
              ...STAGES.map((s) => ({ value: s.value, label: s.label, count: count(s.value) })),
            ]}
          />
          {stage !== 'all' && <p className="text-[13px] text-[#4E585E] max-w-[52ch]">{STAGES.find((s) => s.value === stage)?.explain}</p>}
        </div>
      )}

      {error && <p role="alert" className="text-[13px] text-[#B42318] border border-[#B42318] bg-white px-4 py-3">{error}</p>}

      {rows.length === 0 ? (
        <EmptyState
          title="Nothing here"
          body={mode === 'agent' ? 'A commission appears when one of your clients’ vehicles is released.' : 'No commissions at this stage.'}
        />
      ) : (
        <ul key={stage} className="animate-view-fade">
          {rows.map((c) => {
            const k = kinds.get(c.id) ?? 'sale';
            const addOns = k === 'sale' ? applications.find((a) => a.referenceNo === c.applicationRef)?.addOnsCommission : undefined;
            return (
            <li key={c.id} className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-x-6 gap-y-3 py-4 border-b border-[#C9D1D6]">
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <p className="font-semibold text-[15px] text-[#141517]">
                    <span className={`mr-2 align-middle px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider ${k === 'paluwagan' ? 'bg-[#EAF5EC] text-[#1B7F35]' : k === 'preorder' ? 'bg-[#EEF3FC] text-[#1D5FD1]' : 'bg-[#EEF1F2] text-[#2A2E31]'}`}>{kindLabel(k)}</span>
                    {c.vehicleTitle}
                  </p>
                  <p className="font-display text-[20px] leading-none tabular-nums text-[#141517]">{peso(c.amount)}</p>
                </div>
                <p className="mt-1 text-[12.5px] text-[#4E585E] tabular-nums">
                  {c.applicationRef} · Client {c.clientName}
                  {mode === 'admin' && <> · Agent <strong className="text-[#141517] font-semibold">{c.agentName}</strong></>}
                  {c.salePrice > 0 && <> · Sale {peso(c.salePrice)}</>}
                  {!!addOns && <> · includes {peso(addOns)} add-ons</>}
                </p>
                <div className="mt-2.5">
                  <StageTrack status={c.status} stages={STAGES} />
                </div>
                {c.status === 'paid' && (
                  <p className="mt-2 flex items-center gap-1.5 text-[12.5px] text-[#141517]">
                    <FileCheck2 className="w-4 h-4 text-[#1B7F35]" aria-hidden="true" />
                    Proof: {c.proofFileName} · Paid {shortDate(c.paidAt)} · {c.receiptNo}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 md:justify-end self-center">
                {c.status === 'paid' && (
                  <button className={`${btn.outline} flex items-center gap-1.5`} onClick={() => receipt(c)}>
                    <Download className="w-4 h-4" aria-hidden="true" />
                    PDF receipt
                  </button>
                )}
                {mode === 'admin' && c.status === 'payable' && (
                  <label className={`${btn.primary} focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#1D5FD1]`}>
                    Pay &amp; attach proof
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="sr-only"
                      aria-label={`Attach proof of payment for ${c.applicationRef}`}
                      onChange={(e) => {
                        attachProof(c.id, e.target.files?.[0]);
                        e.target.value = '';
                      }}
                    />
                  </label>
                )}
                {mode === 'agent' && c.status !== 'paid' && (
                  <span className="text-[12.5px] text-[#4E585E]">
                    {k === 'paluwagan' ? 'Approved' : 'Vehicle released'} · cash transfer pending
                  </span>
                )}
              </div>
            </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
