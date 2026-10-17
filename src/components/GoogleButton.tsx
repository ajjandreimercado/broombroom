import React, { useEffect, useRef, useState } from 'react';

// Google's "Sign in with Google" button (Google Identity Services). Google gives back an ID token, which the
// server verifies before signing the person in. The script loads only when the button is shown.
type Gis = {
  accounts: {
    id: {
      initialize: (o: { client_id: string; callback: (r: { credential: string }) => void; ux_mode?: 'popup'; context?: string }) => void;
      renderButton: (el: HTMLElement, o: Record<string, unknown>) => void;
    };
  };
};
declare global {
  interface Window {
    google?: Gis;
  }
}

let loading: Promise<Gis> | undefined;
const loadGis = () =>
  (loading ??= new Promise<Gis>((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve(window.google);
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client?hl=en'; // English like the rest of the site
    s.async = true;
    s.onload = () => (window.google ? resolve(window.google) : reject(new Error('Google sign-in did not load.')));
    s.onerror = () => {
      loading = undefined; // try again next time
      reject(new Error('Google sign-in could not load. Check your connection.'));
    };
    document.head.appendChild(s);
  }));

export const GoogleButton: React.FC<{ clientId: string; text: 'signin_with' | 'signup_with'; onCredential: (credential: string) => void; onError: (message: string) => void }> = ({
  clientId,
  text,
  onCredential,
  onError,
}) => {
  const box = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  // The latest handlers, so Google's one-time callback never calls a stale one.
  const handlers = useRef({ onCredential, onError });
  handlers.current = { onCredential, onError };

  useEffect(() => {
    let live = true;
    loadGis()
      .then((g) => {
        if (!live || !box.current) return;
        g.accounts.id.initialize({ client_id: clientId, ux_mode: 'popup', context: text === 'signup_with' ? 'signup' : 'signin', callback: (r) => handlers.current.onCredential(r.credential) });
        g.accounts.id.renderButton(box.current, { type: 'standard', theme: 'outline', size: 'large', text, shape: 'rectangular', logo_alignment: 'left', locale: 'en', width: box.current.offsetWidth || 360 });
        setReady(true);
      })
      .catch((e: Error) => live && handlers.current.onError(e.message));
    return () => {
      live = false;
    };
  }, [clientId, text]);

  return <div ref={box} className={`w-full min-h-[44px] flex justify-center ${ready ? '' : 'opacity-0'}`} />;
};
