import React, { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { PasswordInput } from './PasswordInput.tsx';
import { goodPassword, PASSWORD_RULE } from './password.ts';
import { PORTAL } from '../portals.ts';

const field = 'w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517]';

// Shown instead of everything else while the account has a temporary password (made or reset by the admin).
// The server refuses all other actions until the person sets their own.
export const SetPassword: React.FC = () => {
  const { currentUser, changePassword, logout, googleClientId } = useApp();
  const [temp, setTemp] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <section className="gb-container py-16 sm:py-24">
      <div className="max-w-md border-t-2 border-[#141517] pt-6">
        <h1 className="font-display text-[clamp(1.8rem,4vw,2.6rem)] leading-tight text-[#141517]">Set your own password</h1>
        <p className="mt-3 text-[14px] leading-relaxed text-[#4E585E]">
          Welcome, {currentUser?.name}. You signed in with a temporary password from the admin team. Choose your own to continue; the temporary one stops working.
        </p>
        <form
          className="mt-6 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setError('');
            if (!goodPassword(next)) return setError(PASSWORD_RULE);
            if (next !== again) return setError('The new passwords do not match.');
            if (next === temp) return setError('Choose your own password, not the temporary one.');
            setBusy(true);
            await changePassword(temp, next);
            setBusy(false);
          }}
        >
          <div>
            <span className="gb-label block mb-1.5">Temporary password</span>
            <PasswordInput aria-label="Temporary password" required autoComplete="current-password" value={temp} onChange={(e) => setTemp(e.target.value)} className={field} />
          </div>
          <div>
            <span className="gb-label block mb-1.5">New password</span>
            <PasswordInput aria-label="New password" required autoComplete="new-password" placeholder="8+ characters, letters and numbers" value={next} onChange={(e) => setNext(e.target.value)} className={field} />
          </div>
          <div>
            <span className="gb-label block mb-1.5">New password again</span>
            <PasswordInput aria-label="New password again" required autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} className={field} />
          </div>
          {error && <p role="alert" className="text-[13px] text-[#B42318]">{error}</p>}
          <div className="flex flex-wrap items-center gap-4 pt-1">
            <button type="submit" disabled={busy} className="px-6 py-3 bg-[#1D5FD1] hover:bg-[#174CA8] disabled:bg-[#8C989F] text-white text-[14px] font-semibold cursor-pointer">
              {busy ? 'Saving…' : 'Save and continue'}
            </button>
            <button type="button" onClick={logout} className="text-[14px] font-semibold text-[#141517] underline decoration-[#8C989F] underline-offset-4 cursor-pointer">
              Sign out
            </button>
          </div>
        </form>
        {googleClientId && PORTAL !== 'buyer' && (
          <p className="mt-6 text-[13px] leading-relaxed text-[#4E585E]">
            Prefer not to keep a password? Sign out, then use <strong>Sign in with Google</strong> with the Google account for {currentUser?.email}.
          </p>
        )}
      </div>
    </section>
  );
};
