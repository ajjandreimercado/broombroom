import React, { useState } from 'react';
import { useApp, AccountSummary } from '../../context/AppContext.tsx';
import { StatusMark } from '../StatusMark.tsx';
import { EmptyState, FilterTabs, SectionHeader, btn } from './ui.tsx';
import { KeyRound, UserPlus } from 'lucide-react';
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
      <SectionHeader title="Accounts" hint="Agents and admins can only be added here. Clients create their own accounts on the site. Reset a password when someone forgets theirs.">
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
                <ResetPassword account={a} />
                {a.id !== currentUser?.id && (
                  <button className={a.active ? btn.danger : btn.outline} onClick={() => setAccountActive(a.id, !a.active)}>
                    {a.active ? 'Disable' : 'Enable'}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
