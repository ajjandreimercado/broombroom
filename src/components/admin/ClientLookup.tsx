import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { PALUWAGAN_SLOTS } from '../../types.ts';
import { SectionHeader, EmptyState, Drawer, peso, shortDate } from './ui.tsx';
import { ArDoc, downloadAR, lineTotal, manualAr, openAR, paymentAr } from '../receipt.ts';
import { clientHistory } from '../clientHistory.ts';
import { monthsBehind, paidCount } from '../paluwaganSchedule.ts';
import { Download, Eye, Search } from 'lucide-react';

const link = 'inline-flex items-center gap-1 text-[13px] font-semibold underline underline-offset-4 cursor-pointer';

// Admin: find any client by name, email, phone or AR number, then see their receipts, what they have with us, their
// agent and their whole history in one place.
export const ClientLookup: React.FC = () => {
  const { accounts, applications, receipts, paluwagan, paluwaganUnits, careLogs, leads, showToast } = useApp();
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const clients = accounts.filter((a) => a.role === 'buyer');
  // A client's ARs: payments on their applications, and receipts written for them (by id, or older ones by name).
  const arsOf = (id: string, name: string) => [
    ...applications.filter((a) => a.applicantId === id).flatMap((a) => (a.payments ?? []).map((p) => ({ arNo: p.arNo, date: p.date, what: `${p.description} (${a.referenceNo})`, amount: p.amount, doc: paymentAr(a, p) }))),
    ...receipts
      .filter((r) => r.clientId === id || (!r.clientId && r.receivedFrom.trim().toLowerCase() === name.trim().toLowerCase()))
      .map((r) => ({ arNo: r.arNo, date: r.date, what: r.lines.map((l) => l.description).join(', '), amount: lineTotal(r.lines), doc: manualAr(r) })),
  ].sort((a, b) => b.date.localeCompare(a.date));
  const find = q.trim().toLowerCase();
  const results = find
    ? clients.filter((c) => [c.name, c.email, c.phone ?? ''].some((s) => s.toLowerCase().includes(find)) || arsOf(c.id, c.name).some((r) => r.arNo.toLowerCase().includes(find)))
    : clients;
  const client = clients.find((c) => c.id === openId);
  const view = (d: ArDoc) => !openAR(d) && showToast('Allow pop-ups', 'Your browser blocked the receipt window. Allow pop-ups for this site and try again.', 'error');

  return (
    <section className="space-y-5">
      <SectionHeader title="Client lookup" hint="Search a client to see and track their acknowledgement receipts, their applications and paluwagan, their agent, and their full history." />
      <label className="relative flex items-center gap-2 border-b border-[#8C989F] py-1.5 max-w-md">
        <Search className="w-4 h-4 text-[#4E585E]" aria-hidden="true" />
        <span className="sr-only">Search clients</span>
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, email, phone or AR number" className="w-full bg-transparent text-[14px] outline-none" />
      </label>
      {results.length === 0 ? (
        <EmptyState title="No client matches" body="Try part of their name, their email, phone, or an AR number." />
      ) : (
        <ul className="divide-y divide-[#DDE3E6] bg-white border border-[#C9D1D6]">
          {results.slice(0, 100).map((c) => {
            const ars = arsOf(c.id, c.name);
            const pal = paluwagan.filter((m) => m.clientId === c.id && (m.status === 'joined' || m.status === 'released'));
            const late = pal.some((m) => { const u = paluwaganUnits.find((x) => x.id === m.unitId); return u && monthsBehind(u, m) > 0; });
            return (
              <li key={c.id}>
                <button onClick={() => setOpenId(c.id)} className="w-full text-left px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1 hover:bg-[#F7F8F8] cursor-pointer">
                  <span className="flex-1 min-w-[12rem]">
                    <span className="block font-semibold text-[14.5px] text-[#141517]">{c.name}</span>
                    <span className="block text-[12.5px] text-[#4E585E] break-all">{c.email}{c.phone ? ` · ${c.phone}` : ''}</span>
                  </span>
                  <span className="text-[12.5px] text-[#2A2E31] tabular-nums">{ars.length} AR{ars.length === 1 ? '' : 's'}{pal.length ? ` · ${pal.length} paluwagan` : ''}</span>
                  {late && <span className="px-2 py-0.5 bg-[#FDF3F2] text-[#B42318] text-[12px] font-semibold">Late payment</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Drawer open={!!client} onClose={() => setOpenId(null)} title={client?.name ?? ''}>
        {client && (() => {
          const ars = arsOf(client.id, client.name);
          const apps = applications.filter((a) => a.applicantId === client.id);
          const pal = paluwagan.filter((m) => m.clientId === client.id && m.status !== 'removed');
          const agent = leads.find((l) => l.clientId === client.id)?.agentName;
          const history = clientHistory({ clientId: client.id, careLogs, paluwagan, applications, receipts, leads });
          return (
            <div className="space-y-6 text-[13.5px]">
              <dl className="grid grid-cols-[7rem_1fr] gap-y-1">
                <dt className="text-[#4E585E]">Email</dt><dd className="break-all">{client.email}</dd>
                <dt className="text-[#4E585E]">Phone</dt><dd>{client.phone || '-'}</dd>
                <dt className="text-[#4E585E]">Client since</dt><dd>{shortDate(client.memberSince)}</dd>
                <dt className="text-[#4E585E]">Agent</dt><dd>{agent ?? 'The team'}</dd>
              </dl>

              <div>
                <h3 className="gb-label mb-2">Acknowledgement receipts ({ars.length})</h3>
                {ars.length === 0 ? <p className="text-[#4E585E]">No receipts yet.</p> : (
                  <ul className="divide-y divide-[#DDE3E6] border border-[#C9D1D6]">
                    {ars.map((r) => (
                      <li key={r.arNo} className="px-3 py-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="flex-1 min-w-[10rem]"><strong className="tabular-nums">AR {r.arNo}</strong> · {shortDate(r.date)}<span className="block text-[12.5px] text-[#4E585E]">{r.what}</span></span>
                        <span className="tabular-nums font-semibold">{peso(r.amount)}</span>
                        <button className={link} onClick={() => view(r.doc)}><Eye className="w-3.5 h-3.5" aria-hidden="true" />View</button>
                        <button className={link} onClick={() => downloadAR(r.doc)}><Download className="w-3.5 h-3.5" aria-hidden="true" />Save</button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {(apps.length > 0 || pal.length > 0) && (
                <div>
                  <h3 className="gb-label mb-2">With us</h3>
                  <ul className="space-y-1">
                    {apps.map((a) => <li key={a.id}>{a.vehicleTitle} · {a.referenceNo} · {a.purchaseMethod} · <strong>{a.status.replace(/_/g, ' ')}</strong></li>)}
                    {pal.map((m) => {
                      const u = paluwaganUnits.find((x) => x.id === m.unitId);
                      const behind = u ? monthsBehind(u, m) : 0;
                      return <li key={m.id}>Paluwagan {m.unitTitle} · slot {m.slot ?? '-'} · {m.status} · paid {paidCount(m)}/{PALUWAGAN_SLOTS}{behind ? <strong className="text-[#B42318]"> · {behind} behind</strong> : ''}{m.careAgent ? ` · care: ${m.careAgent}` : ''}</li>;
                    })}
                  </ul>
                </div>
              )}

              <div>
                <h3 className="gb-label mb-2">History ({history.length})</h3>
                {history.length === 0 ? <p className="text-[#4E585E]">Nothing yet.</p> : (
                  <ol className="space-y-1.5 border-l-2 border-[#DDE3E6] pl-3">
                    {history.map((h, i) => <li key={i}><span className="text-[#6B767D] tabular-nums">{shortDate(h.at)}</span> · {h.text}</li>)}
                  </ol>
                )}
              </div>
            </div>
          );
        })()}
      </Drawer>
    </section>
  );
};
