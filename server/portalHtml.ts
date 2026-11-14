// Each portal installs as its own app. Safari (Add to Home Screen) reads the manifest, icon and app name from the
// HTML it was sent, not from what the page's script changes later, so the server writes them per portal.
const APPS = { agent: 'Broom Broom Agent', admin: 'Broom Broom Admin' } as const;

export const portalHtml = (html: string, portal: unknown): string => {
  if (portal !== 'agent' && portal !== 'admin') return html;
  return html
    .replace(/href="(\.?)\/manifest\.webmanifest"/, `href="$1/manifest-${portal}.webmanifest"`) // the build writes ./
    .replace(/href="(\.?)\/icons\/apple-touch-icon\.png"/, `href="$1/icons/apple-touch-icon-${portal}.png"`)
    .replace('name="apple-mobile-web-app-title" content="Broom Broom"', `name="apple-mobile-web-app-title" content="${APPS[portal]}"`);
};
