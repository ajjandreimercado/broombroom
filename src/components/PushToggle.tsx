import React, { useEffect, useState } from 'react';
import { supported, isIos, standalone, local, currentSub, enablePush, disablePush } from '../push.ts';
import { useApp } from '../context/AppContext.tsx';
import { Bell, BellOff, Download, X } from 'lucide-react';

const usePushState = () => {
  const [state, setState] = useState<'on' | 'off' | 'denied' | 'unavailable' | 'ios-install'>('off');
  const check = async () => {
    if (isIos() && !standalone()) return setState('ios-install');
    if (!supported()) return setState('unavailable');
    if (Notification.permission === 'denied') return setState('denied');
    setState((await currentSub()) ? 'on' : 'off');
  };
  useEffect(() => {
    check();
  }, []);
  return { state, check };
};

// Settings: one switch for this phone or browser.
export const PushToggle: React.FC = () => {
  const { showToast } = useApp();
  const { state, check } = usePushState();
  const [busy, setBusy] = useState(false);
  const turnOn = async () => {
    setBusy(true);
    let why = '';
    const r = await enablePush().catch((e) => ((why = e instanceof Error ? e.message : String(e)), 'unavailable' as const));
    setBusy(false);
    if (r === 'on') showToast('Phone notifications on', 'You will be notified here even when Broom Broom is closed.');
    else if (r === 'denied') showToast('Notifications are blocked', 'Allow notifications for this site in your browser settings, then try again.', 'error');
    else showToast('Could not turn on notifications', why || 'This browser cannot receive notifications from Broom Broom.', 'error');
    check();
  };
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white border border-[#C9D1D6]">
      <div className="min-w-0">
        <p className="font-semibold text-[14.5px] text-[#141517]">Phone notifications</p>
        <p className="text-[13px] text-[#4E585E]">
          {state === 'on'
            ? 'On for this device: messages, due dates, receipts and updates arrive even when the app is closed.'
            : state === 'ios-install'
            ? 'On iPhone: tap Share, then “Add to Home Screen”. Open Broom Broom from your home screen and turn this on there.'
            : state === 'denied'
            ? 'Blocked in your browser settings. Allow notifications for this site to turn them on.'
            : state === 'unavailable'
            ? 'This browser cannot receive notifications.'
            : 'Get messages, due dates, receipts and updates on this device, even when the app is closed.'}
        </p>
      </div>
      {state === 'on' ? (
        <button className="px-4 py-2 border border-[#141517] text-[13.5px] font-semibold inline-flex items-center gap-1.5 cursor-pointer" onClick={async () => { await disablePush(); check(); showToast('Phone notifications off'); }}>
          <BellOff className="w-4 h-4" aria-hidden="true" /> Turn off
        </button>
      ) : state === 'off' ? (
        <button disabled={busy} className="px-4 py-2 bg-[#1D5FD1] text-white text-[13.5px] font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60" onClick={turnOn}>
          <Bell className="w-4 h-4" aria-hidden="true" /> {busy ? 'Turning on…' : 'Turn on'}
        </button>
      ) : null}
    </div>
  );
};

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
let installEvent: InstallEvent | null = null;
if (typeof window !== 'undefined')
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // shown from our own card instead of the browser's mini bar
    installEvent = e as InstallEvent;
    window.dispatchEvent(new Event('bb-installable'));
  });

// After sign-in on a phone: one friendly card to install the app and turn notifications on. Never shown again once
// dismissed or done (per device).
const PROMPT_KEY = 'bb-app-prompt';
export const AppPrompt: React.FC = () => {
  const { currentUser, showToast } = useApp();
  const { state, check } = usePushState();
  const [installable, setInstallable] = useState(!!installEvent);
  const [hidden, setHidden] = useState(() => local.get(PROMPT_KEY) === 'done');
  useEffect(() => {
    const on = () => setInstallable(true);
    window.addEventListener('bb-installable', on);
    return () => window.removeEventListener('bb-installable', on);
  }, []);
  const phone = window.matchMedia('(max-width: 900px)').matches || 'ontouchstart' in window;
  const wantsPush = state === 'off' || state === 'ios-install';
  if (!currentUser || hidden || !phone || (!wantsPush && !installable)) return null;
  const close = () => {
    local.set(PROMPT_KEY, 'done');
    setHidden(true);
  };
  return (
    <div role="dialog" aria-label="Get the Broom Broom app" className="fixed inset-x-3 z-[60] p-4 bg-white border border-[#141517] shadow-[0_8px_30px_rgba(0,0,0,0.18)] sm:max-w-sm sm:left-auto sm:right-4" style={{ bottom: 'calc(12px + env(safe-area-inset-bottom))' }}>
      <button onClick={close} aria-label="Not now" className="absolute top-2 right-2 p-1.5 text-[#4E585E] cursor-pointer"><X className="w-4 h-4" /></button>
      <p className="font-semibold text-[15px] text-[#141517] pr-6">Never miss an update</p>
      <p className="mt-1 text-[13.5px] text-[#4E585E]">
        {state === 'ios-install'
          ? 'Tap Share, then “Add to Home Screen”. Open Broom Broom from there to get notified about messages, due dates and receipts.'
          : 'Get notified about messages, due dates and receipts, even when Broom Broom is closed.'}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {installable && (
          <button
            className="px-4 py-2 border border-[#141517] text-[13.5px] font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            onClick={async () => {
              await installEvent?.prompt();
              installEvent = null;
              setInstallable(false);
            }}
          >
            <Download className="w-4 h-4" aria-hidden="true" /> Install app
          </button>
        )}
        {state === 'off' && (
          <button
            className="px-4 py-2 bg-[#1D5FD1] text-white text-[13.5px] font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            onClick={async () => {
              let why = '';
              const r = await enablePush().catch((e) => ((why = e instanceof Error ? e.message : String(e)), 'unavailable' as const));
              if (r === 'on') showToast('Phone notifications on');
              else if (r === 'denied') showToast('Notifications are blocked', 'Allow notifications for this site in your browser settings.', 'error');
              else showToast('Could not turn on notifications', why || 'This browser cannot receive notifications.', 'error');
              check();
              close();
            }}
          >
            <Bell className="w-4 h-4" aria-hidden="true" /> Turn on notifications
          </button>
        )}
      </div>
    </div>
  );
};
