import type { CareLog, ClientLead, ManualReceipt, PaluwaganMember, VehicleApplication } from '../types.ts';

export type HistoryItem = { at: string; text: string; kind: 'care' | 'paluwagan' | 'application' | 'receipt' | 'lead' };

// One client's history across everything they did with us, newest first: customer-care contacts, paluwagan events,
// applications and their payments, receipts and who handled them as a lead.
export const clientHistory = (src: {
  clientId: string;
  careLogs?: CareLog[];
  paluwagan?: PaluwaganMember[];
  applications?: VehicleApplication[];
  receipts?: ManualReceipt[];
  leads?: ClientLead[];
}): HistoryItem[] => {
  const id = src.clientId;
  const items: HistoryItem[] = [
    ...(src.careLogs ?? []).filter((c) => c.clientId === id).map((c) => ({
      at: c.createdAt,
      kind: 'care' as const,
      text: `${c.agentName} ${c.kind === 'reminder' ? 'sent a reminder' : c.kind === 'call' ? 'logged a call' : 'noted'}: ${c.text}`,
    })),
    ...(src.paluwagan ?? []).filter((m) => m.clientId === id).flatMap((m) => (m.history ?? []).map((h) => ({ at: h.at, kind: 'paluwagan' as const, text: `${m.unitTitle} paluwagan: ${h.text}` }))),
    ...(src.applications ?? []).filter((a) => a.applicantId === id).flatMap((a) => [
      { at: a.submittedAt, kind: 'application' as const, text: `Applied for the ${a.vehicleTitle} (${a.referenceNo}, ${a.purchaseMethod})` },
      ...(a.payments ?? []).map((p) => ({ at: p.date, kind: 'receipt' as const, text: `Paid ₱${p.amount.toLocaleString()} for ${a.referenceNo}: AR ${p.arNo}` })),
    ]),
    ...(src.receipts ?? []).filter((r) => r.clientId === id).map((r) => ({ at: r.createdAt, kind: 'receipt' as const, text: `AR ${r.arNo}: ${r.lines.map((l) => l.description).join(', ')}` })),
    ...(src.leads ?? []).filter((l) => l.clientId === id).flatMap((l) => (l.history ?? []).map((h) => ({ at: h.at, kind: 'lead' as const, text: h.text }))),
  ];
  return items.filter((x) => x.at).sort((a, b) => b.at.localeCompare(a.at));
};
