import React, { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { AnimatePresence, motion } from 'motion/react';
import { backdropMotion, modalMotion } from '../motion.ts';
import { GroomBroomLogo } from './GroomBroomLogo.tsx';
import { X, Mail, Lock, Phone, User, KeyRound, ArrowRight, Eye, EyeOff } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { authModalOpen, setAuthModalOpen, login, register, showToast, pendingAction } = useApp();

  const [mode, setMode] = useState<'signin' | 'register' | 'forgot'>('signin');
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1);
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

  // Forgot
  const [forgotTarget, setForgotTarget] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [error, setError] = useState('');


  const switchMode = (m: typeof mode) => { setError(''); setMode(m); };

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!identifier.trim()) { setError('Please enter your email or username.'); return; }
    if (!password) { setError('Please enter your password.'); return; }
    login(identifier.includes('@') ? identifier : `${identifier}@groombroom.ph`);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!regName.trim() || !regEmail.trim() || !regPhone.trim()) { setError('Please fill out all required fields.'); return; }
    if (!regPass || regPass.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (regPass !== regConfirmPass) { setError('Passwords do not match.'); return; }
    if (!agreedTerms) { setError('Please agree to the Terms & Conditions.'); return; }
    register(regName.trim(), regEmail.trim(), regPhone.trim());
  };

  const handleGoogleSignIn = () => {
    login('ajjandreimercado@gmail.com');
    showToast('Signed in with Google', 'Authenticated as Andrei Mercado');
  };

  const handlePasskeySignIn = () => {
    login('andrei.passkey@groombroom.ph');
    showToast('Passkey Verified', 'Biometric key validated successfully.');
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (forgotStep === 1) {
      if (!forgotTarget.trim()) { setError('Please enter your registered email or phone.'); return; }
      setForgotStep(2);
      showToast('Code Sent', 'Use code 882910 to verify.');
    } else if (forgotStep === 2) {
      if (!forgotCode.trim()) { setError('Please enter the 6-digit code.'); return; }
      setForgotStep(3);
    } else if (forgotStep === 3) {
      if (!newPassword || newPassword.length < 6) { setError('New password must be at least 6 characters.'); return; }
      showToast('Password Reset', 'You can now sign in with your new password.');
      switchMode('signin');
      setForgotStep(1);
    }
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
                  <label className={labelClass}>Email or Username</label>
                  <div className={iconInputClass}>
                    <User className={iconClass} />
                    <input
                      type="text"
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
                      onClick={() => { setError(''); switchMode('forgot'); setForgotStep(1); }}
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
                  className="w-full py-2.5 px-4 bg-[#1D5FD1] hover:bg-[#174CA8] text-white font-semibold text-[14px] rounded-[2px] transition-colors duration-150 cursor-pointer flex items-center justify-center gap-2"
                >
                  Sign In
                </button>
              </form>

              {/* Divider */}
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#DDE3E6]" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-3 bg-[#F7F8F8] text-[11px] text-[#6B767D] font-medium uppercase tracking-wider">
                    or continue with
                  </span>
                </div>
              </div>

              {/* Social */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 border border-[#C9D1D6] rounded-[2px] text-[13px] font-medium text-[#141517] hover:bg-[#EEF1F2] transition-colors duration-150 cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.3 8.9 5 12 5z"/>
                    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"/>
                    <path fill="#FBBC05" d="M5.3 14.7c-.2-.7-.4-1.5-.4-2.7s.2-2 .4-2.7L1.6 6.4C.6 8.3 0 10.1 0 12s.6 3.7 1.6 5.6l3.7-2.9z"/>
                    <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.3-6.7-5.3L1.6 16c1.9 3.8 5.8 7 10.4 7z"/>
                  </svg>
                  <span>Google</span>
                </button>

                <button
                  type="button"
                  onClick={handlePasskeySignIn}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 border border-[#C9D1D6] rounded-[2px] text-[13px] font-medium text-[#141517] hover:bg-[#EEF1F2] transition-colors duration-150 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5 text-[#1D5FD1]" />
                  <span>Passkey</span>
                </button>
              </div>

              <p className="mt-5 text-center text-[13px] text-[#6B767D]">
                No account?{' '}
                <button onClick={() => switchMode('register')} className="font-semibold text-[#1D5FD1] hover:text-[#174CA8] cursor-pointer transition-colors">
                  Create one
                </button>
              </p>
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
                    <input type="password" placeholder="Min 6 chars" value={regPass} onChange={(e) => setRegPass(e.target.value)} className={inputClass} required />
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
                <button type="submit" className="w-full mt-1 py-2.5 px-4 bg-[#1D5FD1] hover:bg-[#174CA8] text-white font-semibold text-[14px] rounded-[2px] transition-colors duration-150 cursor-pointer">
                  Create Account
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
                <h2 className="font-display text-[24px] leading-tight text-[#141517]">Reset password</h2>
                <p className="text-[13px] text-[#6B767D] mt-0.5">
                  Step {forgotStep} of 3 — {forgotStep === 1 ? 'Identify account' : forgotStep === 2 ? 'Verify code' : 'Set new password'}
                </p>
              </div>

              {/* Step indicator */}
              <div className="flex items-center gap-1 mb-5">
                {[1, 2, 3].map((s) => (
                  <div
                    key={s}
                    className={`h-1 rounded-full transition-[width,flex-grow,background-color] duration-200 ${
                      s === forgotStep ? 'bg-[#1D5FD1] flex-1' : s < forgotStep ? 'bg-[#1D5FD1]/40 w-8' : 'bg-[#C9D1D6] w-8'
                    }`}
                  />
                ))}
              </div>

              <form onSubmit={handleForgotSubmit} className="space-y-4">
                {forgotStep === 1 && (
                  <div>
                    <label className={labelClass}>Registered Email or Mobile</label>
                    <input
                      type="text"
                      placeholder="name@example.com or 09171234567"
                      value={forgotTarget}
                      onChange={(e) => setForgotTarget(e.target.value)}
                      className={inputClass}
                      required
                    />
                    <p className="text-[11px] text-[#6B767D] mt-1.5">We'll send a 6-digit verification code.</p>
                  </div>
                )}
                {forgotStep === 2 && (
                  <div>
                    <label className={labelClass}>6-Digit Verification Code</label>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="882910"
                      value={forgotCode}
                      onChange={(e) => setForgotCode(e.target.value)}
                      className={inputClass + ' text-center text-[20px] tracking-[0.3em] tabular-nums'}
                      required
                    />
                    <p className="text-[11px] text-[#141517] mt-1.5 text-center font-medium">Demo code: <strong>882910</strong></p>
                  </div>
                )}
                {forgotStep === 3 && (
                  <div>
                    <label className={labelClass}>New Password</label>
                    <input
                      type="password"
                      placeholder="Minimum 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>
                )}

                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => { if (forgotStep > 1) setForgotStep((prev) => (prev - 1) as 1 | 2); else switchMode('signin'); }}
                    className="flex-1 py-2.5 text-[13px] font-medium border border-[#C9D1D6] rounded-[2px] text-[#4E585E] hover:bg-[#EEF1F2] transition-colors duration-150 cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="flex-[2] py-2.5 text-[13px] font-semibold bg-[#1D5FD1] hover:bg-[#174CA8] text-white rounded-[2px] transition-colors duration-150 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>{forgotStep === 3 ? 'Save Password' : 'Continue'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
    )}
    </AnimatePresence>
  );
};
