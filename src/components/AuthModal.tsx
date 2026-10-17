import React, { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { PORTAL } from '../portals.ts';
import { AnimatePresence, motion } from 'motion/react';
import { backdropMotion, modalMotion } from '../motion.ts';
import { GroomBroomLogo } from './GroomBroomLogo.tsx';
import { X, Mail, Lock, Phone, User, Eye, EyeOff } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { authModalOpen, setAuthModalOpen, login, register, pendingAction } = useApp();
  const [busy, setBusy] = useState(false);

  const [mode, setMode] = useState<'signin' | 'register' | 'forgot'>('signin');
  const [showPass, setShowPass] = useState(false);

  // Sign in
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  // Register
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regConfirmPass, setRegConfirmPass] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(false);


  const [error, setError] = useState('');


  const switchMode = (m: typeof mode) => { setError(''); setMode(m); };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!identifier.trim()) { setError('Please enter your email.'); return; }
    if (!password) { setError('Please enter your password.'); return; }
    setBusy(true);
    const problem = await login(identifier.trim(), password);
    setBusy(false);
    if (problem) setError(problem);
    else setPassword('');
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!regName.trim() || !regEmail.trim() || !regPhone.trim()) { setError('Please fill out all required fields.'); return; }
    if (!regPass || regPass.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (regPass !== regConfirmPass) { setError('Passwords do not match.'); return; }
    if (!agreedTerms) { setError('Please agree to the Terms & Conditions.'); return; }
    setBusy(true);
    const problem = await register(regName.trim(), regEmail.trim(), regPhone.trim(), regPass);
    setBusy(false);
    if (problem) setError(problem);
    else { setRegPass(''); setRegConfirmPass(''); }
  };

  const inputClass = 'w-full px-3.5 py-2.5 text-[15px] border border-[#8C989F] bg-white text-[#141517] placeholder:text-[#6B767D] outline-none';
  const labelClass = 'gb-label block mb-2';
  const iconInputClass = 'relative';
  const iconClass = 'absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6B767D] pointer-events-none';

  return (
    <AnimatePresence>
    {authModalOpen && (
    <motion.div
      key="auth"
      {...backdropMotion}
      className="fixed inset-0 z-50 bg-[#141517]/50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) { setError(''); setAuthModalOpen(false); } }}
    >
      <motion.div {...modalMotion} className="w-full max-w-[420px] bg-[#F7F8F8] border border-[#141517] overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between bg-[#141517]">
          <GroomBroomLogo size="sm" />
          <button
            onClick={() => { setError(''); setAuthModalOpen(false); }}
            className="p-1.5 text-[#C9D1D6] hover:text-white hover:bg-white/10 transition-colors duration-150 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">

          {/* Pending action banner */}
          {pendingAction && (
            <div className="mb-4 px-3.5 py-2.5 bg-white border border-[#141517] text-[13px] text-[#141517] flex items-start gap-2">
              <span className="mt-0.5 w-1 h-1 rounded-full bg-[#1D5FD1] shrink-0" />
              <span>Sign in to complete your <strong>{pendingAction.type}</strong> — you'll be returned immediately.</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-4 px-3.5 py-2.5 bg-white border border-[#B42318] text-[#B42318] rounded-[2px] text-[12px]">
              {error}
            </div>
          )}

          {/* ── SIGN IN ── */}
          {mode === 'signin' && (
            <div>
              <div className="mb-5">
                <h2 className="font-display text-[24px] leading-tight text-[#141517]">Welcome back</h2>
                <p className="text-[13px] text-[#6B767D] mt-0.5">Sign in to your Groom Broom account</p>
              </div>

              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className={labelClass}>Email</label>
                  <div className={iconInputClass}>
                    <User className={iconClass} />
                    <input
                      type="email"
                      placeholder="name@example.com"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      className={inputClass + ' pl-10'}
                      required
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className={labelClass + ' mb-0'}>Password</label>
                    <button
                      type="button"
                      onClick={() => switchMode('forgot')}
                      className="text-[12px] text-[#1D5FD1] hover:text-[#174CA8] cursor-pointer transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className={iconInputClass}>
                    <Lock className={iconClass} />
                    <input
                      type={showPass ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={inputClass + ' pl-10 pr-10'}
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B767D] hover:text-[#4E585E] cursor-pointer transition-colors"
                      aria-label={showPass ? 'Hide password' : 'Show password'}
                    >
                      {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-2.5 px-4 bg-[#1D5FD1] hover:bg-[#174CA8] disabled:opacity-60 text-white font-semibold text-[14px] rounded-[2px] transition-colors duration-150 cursor-pointer flex items-center justify-center gap-2"
                >
                  {busy ? 'Signing in…' : 'Sign In'}
                </button>
              </form>

              {PORTAL === 'buyer' ? (
                <p className="mt-5 text-center text-[13px] text-[#6B767D]">
                  No account?{' '}
                  <button onClick={() => switchMode('register')} className="font-semibold text-[#1D5FD1] hover:text-[#174CA8] cursor-pointer transition-colors">
                    Create one
                  </button>
                </p>
              ) : (
                <p className="mt-5 text-center text-[13px] text-[#6B767D]">Agent and admin accounts are created by the admin team.</p>
              )}
            </div>
          )}

          {/* ── REGISTER ── */}
          {mode === 'register' && (
            <div>
              <div className="mb-5">
                <h2 className="font-display text-[24px] leading-tight text-[#141517]">Create account</h2>
                <p className="text-[13px] text-[#6B767D] mt-0.5">Join the Groom Broom marketplace</p>
              </div>

              <form onSubmit={handleRegister} className="space-y-3.5">
                <div>
                  <label className={labelClass}>Full Name</label>
                  <div className={iconInputClass}>
                    <User className={iconClass} />
                    <input type="text" placeholder="e.g. Andrei Mercado" value={regName} onChange={(e) => setRegName(e.target.value)} className={inputClass + ' pl-10'} required />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Email Address</label>
                  <div className={iconInputClass}>
                    <Mail className={iconClass} />
                    <input type="email" placeholder="you@domain.com" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} className={inputClass + ' pl-10'} required />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Mobile Number</label>
                  <div className={iconInputClass}>
                    <Phone className={iconClass} />
                    <input type="tel" placeholder="+63 917 123 4567" value={regPhone} onChange={(e) => setRegPhone(e.target.value)} className={inputClass + ' pl-10'} required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className={labelClass}>Password</label>
                    <input type="password" placeholder="Min 8 chars" autoComplete="new-password" value={regPass} onChange={(e) => setRegPass(e.target.value)} className={inputClass} required />
                  </div>
                  <div>
                    <label className={labelClass}>Confirm</label>
                    <input type="password" placeholder="Repeat" value={regConfirmPass} onChange={(e) => setRegConfirmPass(e.target.value)} className={inputClass} required />
                  </div>
                </div>
                <div className="flex items-start gap-2.5 pt-1">
                  <input type="checkbox" id="termsAgree" checked={agreedTerms} onChange={(e) => setAgreedTerms(e.target.checked)} className="mt-0.5 w-3.5 h-3.5" />
                  <label htmlFor="termsAgree" className="text-[12px] text-[#4E585E] leading-relaxed cursor-pointer select-none">
                    I agree to the <span className="text-[#1D5FD1] font-semibold">Terms & Conditions</span> and <span className="text-[#1D5FD1] font-semibold">Privacy Policy</span>
                  </label>
                </div>
                <button type="submit" disabled={busy} className="w-full mt-1 py-2.5 px-4 bg-[#1D5FD1] hover:bg-[#174CA8] disabled:opacity-60 text-white font-semibold text-[14px] rounded-[2px] transition-colors duration-150 cursor-pointer">
                  {busy ? 'Creating account…' : 'Create Account'}
                </button>
              </form>

              <p className="mt-4 text-center text-[13px] text-[#6B767D]">
                Already registered?{' '}
                <button onClick={() => switchMode('signin')} className="font-semibold text-[#1D5FD1] hover:text-[#174CA8] cursor-pointer transition-colors">
                  Sign in
                </button>
              </p>
            </div>
          )}

          {/* ── FORGOT PASSWORD ── */}
          {mode === 'forgot' && (
            <div>
              <div className="mb-5">
                <h2 className="font-display text-[24px] leading-tight text-[#141517]">Forgot your password?</h2>
                <p className="text-[13px] text-[#4E585E] mt-2 leading-relaxed">
                  For your security, the Broom Broom admin team resets passwords. Contact them with the email you signed up with; they will give you a
                  temporary password, which you can change in Settings after you sign in.
                </p>
              </div>
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className="w-full py-2.5 text-[13px] font-semibold border border-[#141517] rounded-[2px] text-[#141517] hover:bg-[#EEF1F2] transition-colors duration-150 cursor-pointer"
              >
                Back to sign in
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
    )}
    </AnimatePresence>
  );
};
