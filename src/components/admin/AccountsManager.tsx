import React, { useState } from 'react';
import { useApp, AccountSummary } from '../../context/AppContext.tsx';
import { StatusMark } from '../StatusMark.tsx';
import { Drawer, EmptyState, FilterTabs, SectionHeader, btn, peso, shortDate } from './ui.tsx';
import { Download, KeyRound, Trash2, UserPlus } from 'lucide-react';
import { goodPassword, PASSWORD_RULE } from '../password.ts';

type Filter = 'seller' | 'admin' | 'buyer' | 'all';
const ROLE: Record<AccountSummary['role'], string> = { buyer: 'Client', seller: 'Agent', admin: 'Admin' };
const input = 'w-full px-3 py-2 text-[14px] bg-white border border-[#8C989F] text-[#141517]';

// A short random password the admin hands over privately; the person changes it in Settings.
const tempPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  for (;;) {
    const p = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => chars[b % chars.length]).join('');
    if (goodPassword(p)) return p; // needs a letter and a number
  }
};

// A new sign-in email for an account (e.g. when someone's email changes). Their Google sign-in link is reset.
const ChangeEmail: React.FC<{ account: AccountSummary }> = ({ account }) => {
  const { changeEmail } = useApp();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(account.email);
  if (!open)
    return (
      <button className={btn.outline} onClick={() => { setEmail(account.email); setOpen(true); }}>
        Change email
      </button>
    );
  return (
    <form
      className="flex flex-wrap items-center gap-2 w-full animate-fade-up"
      onSubmit={async (e) => {
        e.preventDefault();
        if (await changeEmail(account.id, email.trim())) setOpen(false);
      }}
    >
      <input type="email" autoFocus required value={email} onChange={(e) => setEmail(e.target.value)} aria-label={`New email for ${account.name}`} className={`${input} flex-1 min-w-[220px]`} />
      <button type="submit" className={btn.primary} disabled={!email.trim() || email.trim().toLowerCase() === account.email.toLowerCase()}>Save email</button>
      <button type="button" onClick={() => setOpen(false)} className="px-3 py-2 text-[13px] text-[#4E585E] hover:text-[#141517] cursor-pointer">Cancel</button>
    </form>
  );
};

const ResetPassword: React.FC<{ account: AccountSummary }> = ({ account }) => {
  const { resetPassword } = useApp();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  if (!open)
    return (
      <button className={`${btn.outline} inline-flex items-center gap-1.5`} onClick={() => { setPassword(tempPassword()); setOpen(true); }}>
        <KeyRound className="w-4 h-4" aria-hidden="true" /> Reset password
      </button>
    );
  return (
    <form
      className="flex flex-wrap items-center gap-2 w-full animate-fade-up"
      onSubmit={async (e) => {
        e.preventDefault();
        if (await resetPassword(account.id, password)) setOpen(false);
      }}
    >
      <input value={password} onChange={(e) => setPassword(e.target.value)} aria-label={`New password for ${account.name}`} className={`${input} flex-1 min-w-[180px] font-mono`} minLength={8} required />
      <button type="submit" className={btn.primary} disabled={!goodPassword(password)} title={PASSWORD_RULE}>Set password</button>
      <button type="button" onClick={() => setOpen(false)} className="px-3 py-2 text-[13px] text-[#4E585E] hover:text-[#141517] cursor-pointer">Cancel</button>
      <p className="w-full text-[12px] text-[#4E585E]">Copy it now and give it to {account.name} privately. They are signed out everywhere and must set their own password when they next sign in.</p>
    </form>
  );
};

// Deleting an agent starts here: their full account report (clients, applications, sales, commissions, chats
// and requests), a copy to download and keep, and only then the permanent delete.
const DeleteAgent: React.FC<{ account: AccountSummary }> = ({ account }) => {
  const { commissions, applications, leads, conversations, listingRequests, applyRequests, salesEntries, deleteAgentAccount } = useApp();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const name = account.name;

  const myLeads = leads.filter((l) => l.agentName === name);
  const myApps = applications.filter((a) => a.sellerName === name);
  const openApps = myApps.filter((a) => !['completed', 'declined', 'withdrawn'].includes(a.status));
  const myComs = commissions.filter((c) => c.agentName === name);
  const sold = myComs.filter((c) => c.transactionCompleted);
  const sum = (st: string) => myComs.filter((c) => c.status === st).reduce((s, c) => s + c.amount, 0);
  const unpaid = myComs.filter((c) => c.status !== 'paid');
  const openChats = conversations.filter((c) => c.sellerName === name && !c.closedAt);
  const myRequests = listingRequests.filter((r) => r.agentName === name);
  const claimed = applyRequests.filter((r) => r.claimedBy === name && !r.doneAt);
  const manualSales = salesEntries.filter((s) => s.agent === name);
  const revenue = sold.reduce((s, c) => s + c.salePrice, 0);

  const stats: [string, string][] = [
    ['Clients now', String(myLeads.length)],
    ['Open applications', String(openApps.length)],
    ['Completed sales', `${sold.length} · ${peso(revenue)}`],
    ['Commission receivable', peso(sum('receivable'))],
    ['Commission payable', peso(sum('payable'))],
    ['Commission paid', peso(sum('paid'))],
    ['Open chats', String(openChats.length)],
    ['Pending listing requests', String(myRequests.filter((r) => r.status === 'pending').length)],
    ['Apply requests claimed', String(claimed.length)],
    ['Sales entered by hand', `${manualSales.length} · ${peso(manualSales.reduce((s, x) => s + x.amount, 0))}`],
  ];

  const reportText = () =>
    [
      `AGENT ACCOUNT REPORT — ${name}`,
      `Generated ${new Date().toLocaleString('en-PH')} (before account deletion)`,
      '',
      `Email: ${account.email}`,
      `Phone: ${account.phone || '-'}`,
      `Member since: ${account.memberSince || '-'}`,
      `Account status: ${account.active ? 'Active' : 'Disabled'}`,
      '',
      ...stats.map(([k, v]) => `${k}: ${v}`),
      '',
      'Clients returned to Open leads on deletion:',
      ...(myLeads.length ? myLeads.map((l) => `- ${l.clientName} (first asked about ${l.interest})`) : ['- None']),
      '',
      'Open applications handed to the sales team on deletion:',
      ...(openApps.length ? openApps.map((a) => `- ${a.referenceNo} · ${a.vehicleTitle} · ${a.applicantName} · ${a.status.replace('_', ' ')}`) : ['- None']),
      '',
      'Unpaid commissions (kept on record under their name):',
      ...(unpaid.length ? unpaid.map((c) => `- ${c.applicationRef} · ${c.vehicleTitle} · ${c.clientName} · ${peso(c.amount)} · ${c.status}`) : ['- None']),
    ].join('\n');

  const download = () => {
    const url = URL.createObjectURL(new Blob([reportText()], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-agent-report.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const close = () => {
    setOpen(false);
    setConfirm(false);
  };

  return (
    <>
      <button className={`${btn.danger} inline-flex items-center gap-1.5`} onClick={() => setOpen(true)}>
        <Trash2 className="w-4 h-4" aria-hidden="true" /> Report &amp; delete
      </button>
      <Drawer open={open} onClose={close} title={`${name} — agent report`}>
        <div className="space-y-6">
          <p className="text-[13.5px] leading-relaxed text-[#4E585E]">
            Review this report before deleting. Deletion is permanent: download a copy for your records first if you need one.
          </p>

          <dl className="grid grid-cols-2 gap-y-3 text-[13px]">
            <dt className="text-[#4E585E]">Email</dt><dd className="text-[#141517] break-all">{account.email}</dd>
            <dt className="text-[#4E585E]">Phone</dt><dd className="text-[#141517]">{account.phone || '-'}</dd>
            <dt className="text-[#4E585E]">Member since</dt><dd className="text-[#141517]">{account.memberSince || '-'}</dd>
            <dt className="text-[#4E585E]">Account status</dt><dd className="text-[#141517]">{account.active ? 'Active' : 'Disabled'}</dd>
            {stats.map(([k, v]) => (
              <React.Fragment key={k}>
                <dt className="text-[#4E585E]">{k}</dt>
                <dd className="font-medium text-[#141517] tabular-nums">{v}</dd>
              </React.Fragment>
            ))}
          </dl>

          {myLeads.length > 0 && (
            <div>
              <h4 className="gb-label">Clients ({myLeads.length})</h4>
              <ul className="mt-2 space-y-1.5 text-[13px] text-[#2A2E31]">
                {myLeads.slice(0, 6).map((l) => (
                  <li key={l.id}>{l.clientName} <span className="text-[#6B767D]">· first asked about {l.interest}{l.lockedTo ? ` · locked (${l.lockedRef})` : ''}</span></li>
                ))}
                {myLeads.length > 6 && <li className="text-[#6B767D]">…and {myLeads.length - 6} more</li>}
              </ul>
            </div>
          )}

          {openApps.length > 0 && (
            <div>
              <h4 className="gb-label">Open applications ({openApps.length})</h4>
              <ul className="mt-2 space-y-1.5 text-[13px] text-[#2A2E31]">
                {openApps.slice(0, 6).map((a) => (
                  <li key={a.id}>{a.referenceNo} · {a.vehicleTitle} <span className="text-[#6B767D]">· {a.applicantName} · {a.status.replace('_', ' ')} · {shortDate(a.submittedAt)}</span></li>
                ))}
                {openApps.length > 6 && <li className="text-[#6B767D]">…and {openApps.length - 6} more</li>}
              </ul>
            </div>
          )}

          {unpaid.length > 0 && (
            <div>
              <h4 className="gb-label">Unpaid commissions ({unpaid.length})</h4>
              <ul className="mt-2 space-y-1.5 text-[13px] text-[#2A2E31]">
                {unpaid.slice(0, 6).map((c) => (
                  <li key={c.id}>{c.vehicleTitle} <span className="text-[#6B767D]">· {c.clientName} · {peso(c.amount)} · {c.status}</span></li>
                ))}
                {unpaid.length > 6 && <li className="text-[#6B767D]">…and {unpaid.length - 6} more</li>}
              </ul>
            </div>
          )}

          <div className="border-t border-[#C9D1D6] pt-4">
            <h4 className="gb-label">What deleting does</h4>
            <ul className="mt-2 list-disc pl-5 space-y-1.5 text-[13px] leading-relaxed text-[#2A2E31]">
              <li>{name} can no longer sign in, and is signed out everywhere.</li>
              <li>Their clients go back to Open leads; open chats and applications move to the sales team.</li>
              <li>Claimed apply requests reopen for other agents; pending listing requests are rejected.</li>
              <li>Completed sales and commissions stay on record under {name}&apos;s name, so reports and unpaid amounts are not lost.</li>
            </ul>
          </div>

          <button type="button" onClick={download} className={`${btn.outline} inline-flex items-center gap-1.5`}>
            <Download className="w-4 h-4" aria-hidden="true" /> Download this report
          </button>

          <div className="border border-[#B42318] p-4 space-y-3">
            {!confirm ? (
              <>
                <p className="text-[13px] text-[#2A2E31]">Delete this agent account permanently? This cannot be undone. (To only block sign-in, use Disable instead.)</p>
                <button type="button" onClick={() => setConfirm(true)} className="px-3.5 py-2 bg-[#B42318] hover:bg-[#912018] text-white text-[13px] font-semibold cursor-pointer transition-colors">
                  Delete {name}&apos;s account
                </button>
              </>
            ) : (
              <>
                <p className="text-[13.5px] font-semibold text-[#B42318]">Permanently delete {name}&apos;s account?</p>
                <p className="text-[13px] text-[#2A2E31]">Make sure you have downloaded the report above if you need it. Their clients ({myLeads.length}) return to Open leads right away.</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={async () => {
                      setDeleting(true);
                      if (await deleteAgentAccount(account.id)) close();
                      setDeleting(false);
                    }}
                    className="px-3.5 py-2 bg-[#B42318] hover:bg-[#912018] text-white text-[13px] font-semibold cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deleting ? 'Deleting…' : 'Permanently delete'}
                  </button>
                  <button type="button" onClick={() => setConfirm(false)} className="px-3 py-2 text-[13px] text-[#4E585E] hover:text-[#141517] cursor-pointer">Cancel</button>
                </div>
              </>
            )}
          </div>
        </div>
      </Drawer>
    </>
  );
};

// Admin: who can sign in. Agents and admins are created here (they cannot sign up themselves); clients sign up on the site.
export const AccountsManager: React.FC = () => {
  const { accounts, currentUser, createAccount, setAccountActive } = useApp();
  const [filter, setFilter] = useState<Filter>('seller');
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: 'seller' as 'seller' | 'admin', phone: '', password: '' });
  const rows = accounts.filter((a) => filter === 'all' || a.role === filter);
  const count = (f: Exclude<Filter, 'all'>) => accounts.filter((a) => a.role === f).length;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await createAccount(form)) {
      setAdding(false);
      setFilter(form.role);
      setForm({ name: '', email: '', role: 'seller', phone: '', password: '' });
    }
  };

  return (
    <section className="space-y-5">
      <SectionHeader title="Accounts" hint="Agents and admins can only be added here. Clients create their own accounts on the site. Reset a password when someone forgets theirs. Deleting an agent opens their full report first; their clients then go back to Open leads.">
        {!adding && (
          <button className={`${btn.primary} flex items-center gap-1.5`} onClick={() => { setForm((f) => ({ ...f, password: tempPassword() })); setAdding(true); }}>
            <UserPlus className="w-4 h-4" aria-hidden="true" /> Add agent or admin
          </button>
        )}
      </SectionHeader>

      {adding && (
        <form onSubmit={submit} className="border border-[#141517] bg-white p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fade-up" aria-label="Add an account">
          <label className="block">
            <span className="gb-label block mb-1.5">Full name</span>
            <input className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
          <label className="block">
            <span className="gb-label block mb-1.5">Email (used to sign in)</span>
            <input type="email" className={input} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </label>
          <label className="block">
            <span className="gb-label block mb-1.5">Role</span>
            <select className={`${input} cursor-pointer`} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as 'seller' | 'admin' })}>
              <option value="seller">Agent (agent portal)</option>
              <option value="admin">Admin (admin console)</option>
            </select>
          </label>
          <label className="block">
            <span className="gb-label block mb-1.5">Phone (optional)</span>
            <input className={input} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </label>
          <label className="block sm:col-span-2">
            <span className="gb-label block mb-1.5">Temporary password</span>
            <input className={`${input} font-mono`} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={8} required />
            <span className="block mt-1 text-[12px] text-[#4E585E]">Give it to them privately. They must set their own password when they first sign in, or they can sign in with Google using this email (the temporary password then stops working).</span>
          </label>
          <div className="sm:col-span-2 flex gap-2">
            <button type="submit" className={btn.primary}>Create account</button>
            <button type="button" onClick={() => setAdding(false)} className="px-3 py-2 text-[13px] text-[#4E585E] hover:text-[#141517] cursor-pointer">Cancel</button>
          </div>
        </form>
      )}

      <FilterTabs
        id="accounts"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'seller', label: 'Agents', count: count('seller') },
          { value: 'admin', label: 'Admins', count: count('admin') },
          { value: 'buyer', label: 'Clients', count: count('buyer') },
          { value: 'all', label: 'All', count: accounts.length },
        ]}
      />
      {rows.length === 0 ? (
        <EmptyState title="No accounts here" body="Accounts appear here once they are created." />
      ) : (
        <ul key={filter} className="animate-view-fade border-b border-[#C9D1D6]">
          {rows.map((a) => (
            <li key={a.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 py-4 border-t border-[#C9D1D6]">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-[15px] text-[#141517]">{a.name}</span>
                  <span className="text-[12px] text-[#4E585E]">{ROLE[a.role]}</span>
                  {!a.active && <StatusMark status="Disabled" />}
                  {a.id === currentUser?.id && <span className="text-[12px] text-[#1D5FD1]">You</span>}
                </div>
                <p className="text-[13px] text-[#2A2E31] break-all">{a.email}{a.phone ? ` · ${a.phone}` : ''}</p>
                {a.memberSince && <p className="text-[12px] text-[#6B767D]">Since {a.memberSince}</p>}
              </div>
              <div className="flex flex-wrap items-center gap-2 md:justify-end">
                <ChangeEmail account={a} />
                <ResetPassword account={a} />
                {a.id !== currentUser?.id && (
                  <button className={a.active ? btn.danger : btn.outline} onClick={() => setAccountActive(a.id, !a.active)}>
                    {a.active ? 'Disable' : 'Enable'}
                  </button>
                )}
                {a.role === 'seller' && a.id !== currentUser?.id && <DeleteAgent account={a} />}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
