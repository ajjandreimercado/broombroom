// Settings shared by the site and the API server. Keep this file free of browser-only code.

// Listings belong to the whole team; clients belong to the agent who claimed them (see components/leads.ts).
export const TEAM_NAME = 'Broom Broom sales team';

// The company's contact address, shown on the site and used for support messages.
export const CONTACT_EMAIL = 'broombroombookingservices@gmail.com';

// Agent commission: this share of the sale price.
export const COMMISSION_RATE = 0.03;

// Credit entry types.
export const CREDIT_CATEGORIES = [
  'Vehicle acquisition on credit',
  'Supplier credit',
  'Credit card purchase',
  'Loan drawdown',
  'Interest and bank charges',
  'Other',
];

// Expense types.
export const EXPENSE_CATEGORIES = [
  'Vehicle acquisition',
  'Agent commissions',
  'Salaries and wages',
  'Rent',
  'Utilities',
  'Marketing and advertising',
  'Repairs and maintenance',
  'LTO registration and fees',
  'Office supplies',
  'Transportation',
  'Taxes and licenses',
  'Other',
];

// Picture for a listing saved without photos.
export const generateVehicleSvg = (
  type: 'car' | 'bike' | 'truck' | 'scooter' | 'ebike' | 'atv',
  accentColor: string,
  modelName: string
): string => {
  const encoded = encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="100%" height="100%">
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#18181B" />
          <stop offset="70%" stop-color="#09090B" />
          <stop offset="100%" stop-color="#000000" />
        </linearGradient>
        <linearGradient id="carBody" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#27272A" />
          <stop offset="50%" stop-color="#18181B" />
          <stop offset="100%" stop-color="#09090B" />
        </linearGradient>
        <radialGradient id="studioLight" cx="50%" cy="30%" r="60%">
          <stop offset="0%" stop-color="#27272A" stop-opacity="0.6" />
          <stop offset="100%" stop-color="#09090B" stop-opacity="0" />
        </radialGradient>
      </defs>

      {/* Clean Studio Backdrop */}
      <rect width="800" height="500" fill="url(#bgGrad)" />
      <rect width="800" height="500" fill="url(#studioLight)" />

      {/* Ground Contact Shadow */}
      <ellipse cx="400" cy="405" rx="320" ry="18" fill="#000000" fill-opacity="0.8" />
      <line x1="120" y1="400" x2="680" y2="400" stroke="#27272A" stroke-width="1" />

      ${
        type === 'car'
          ? `
        <!-- Sports Car Architecture -->
        <path d="M 140 370 C 150 320 200 310 260 310 L 330 310 C 370 240 440 215 560 215 L 630 265 C 690 275 730 320 735 370 Z" fill="url(#carBody)" stroke="#3F3F46" stroke-width="1.5" />
        <!-- Aerodynamic Roof Line -->
        <path d="M 350 305 L 430 230 L 550 230 L 610 305 Z" fill="#09090B" stroke="#27272A" stroke-width="1.5" />
        <!-- Headlight Slit -->
        <polygon points="144,345 170,335 165,355" fill="#1D5FD1" />
        <!-- Blue Side Mirror & Contour Accent -->
        <path d="M 425 255 L 445 250 L 440 260 Z" fill="#1D5FD1" />
        <line x1="330" y1="310" x2="630" y2="310" stroke="#1D5FD1" stroke-width="1.5" opacity="0.6" />
        <!-- Wheels -->
        <circle cx="240" cy="375" r="44" fill="#09090B" stroke="#3F3F46" stroke-width="6" />
        <circle cx="240" cy="375" r="24" fill="#18181B" stroke="#1D5FD1" stroke-width="2" />
        <circle cx="630" cy="375" r="44" fill="#09090B" stroke="#3F3F46" stroke-width="6" />
        <circle cx="630" cy="375" r="24" fill="#18181B" stroke="#1D5FD1" stroke-width="2" />
        `
          : type === 'bike'
          ? `
        <!-- Sport Motorcycle Minimal Silhouette -->
        <path d="M 240 365 L 330 300 L 460 295 L 560 225 L 590 235 L 550 320 L 570 365 Z" fill="url(#carBody)" stroke="#3F3F46" stroke-width="2" />
        <path d="M 390 275 Q 460 225 530 245 L 550 285 L 450 315 Z" fill="#18181B" stroke="#1D5FD1" stroke-width="1.5" />
        <!-- Wheels -->
        <circle cx="230" cy="365" r="50" fill="#09090B" stroke="#3F3F46" stroke-width="6" />
        <circle cx="230" cy="365" r="22" fill="#18181B" stroke="#1D5FD1" stroke-width="2" />
        <circle cx="570" cy="365" r="50" fill="#09090B" stroke="#3F3F46" stroke-width="6" />
        <circle cx="570" cy="365" r="22" fill="#18181B" stroke="#1D5FD1" stroke-width="2" />
        `
          : type === 'truck'
          ? `
        <!-- Truck Architecture -->
        <path d="M 130 370 L 135 310 L 250 310 L 310 210 L 500 210 L 510 295 L 720 295 L 730 370 Z" fill="url(#carBody)" stroke="#3F3F46" stroke-width="1.5" />
        <path d="M 320 295 L 340 225 L 480 225 L 485 295 Z" fill="#09090B" stroke="#27272A" stroke-width="1.5" />
        <line x1="510" y1="275" x2="710" y2="275" stroke="#1D5FD1" stroke-width="2" />
        <!-- Wheels -->
        <circle cx="230" cy="375" r="52" fill="#09090B" stroke="#3F3F46" stroke-width="8" />
        <circle cx="230" cy="375" r="24" fill="#18181B" stroke="#1D5FD1" stroke-width="2.5" />
        <circle cx="630" cy="375" r="52" fill="#09090B" stroke="#3F3F46" stroke-width="8" />
        <circle cx="630" cy="375" r="24" fill="#18181B" stroke="#1D5FD1" stroke-width="2.5" />
        `
          : type === 'scooter'
          ? `
        <!-- Minimalist Scooter -->
        <path d="M 230 370 L 280 330 L 400 350 L 480 290 L 560 240 L 580 310 L 540 370 Z" fill="url(#carBody)" stroke="#3F3F46" stroke-width="1.5" />
        <circle cx="230" cy="370" r="42" fill="#09090B" stroke="#3F3F46" stroke-width="5" />
        <circle cx="560" cy="370" r="42" fill="#09090B" stroke="#3F3F46" stroke-width="5" />
        <path d="M 540 240 L 570 190" stroke="#1D5FD1" stroke-width="2" />
        `
          : type === 'ebike'
          ? `
        <!-- Architectural E-Bike -->
        <circle cx="230" cy="365" r="48" fill="none" stroke="#52525B" stroke-width="4" />
        <circle cx="570" cy="365" r="48" fill="none" stroke="#52525B" stroke-width="4" />
        <path d="M 230 365 L 370 365 L 480 260 L 330 260 Z" fill="none" stroke="#D4D4D8" stroke-width="6" stroke-linejoin="round" />
        <line x1="370" y1="365" x2="480" y2="260" stroke="#1D5FD1" stroke-width="8" />
        <line x1="480" y1="260" x2="570" y2="365" stroke="#D4D4D8" stroke-width="6" />
        <circle cx="230" cy="365" r="14" fill="#1D5FD1" />
        <circle cx="570" cy="365" r="14" fill="#1D5FD1" />
        `
          : `
        <!-- ATV Quad -->
        <path d="M 170 360 L 230 280 L 420 280 L 520 240 L 620 280 L 670 360 Z" fill="url(#carBody)" stroke="#3F3F46" stroke-width="1.5" />
        <circle cx="220" cy="365" r="54" fill="#09090B" stroke="#3F3F46" stroke-width="10" />
        <circle cx="610" cy="365" r="54" fill="#09090B" stroke="#3F3F46" stroke-width="10" />
        <circle cx="220" cy="365" r="24" fill="#18181B" stroke="#1D5FD1" stroke-width="2" />
        <circle cx="610" cy="365" r="24" fill="#18181B" stroke="#1D5FD1" stroke-width="2" />
        `
      }

      {/* Minimal Top Brand Bar */}
      <text x="40" y="48" fill="#71717A" font-family="system-ui, sans-serif" font-weight="700" font-size="11" letter-spacing="2">BROOM BROOM</text>
      
      {/* Quiet Technical Typography */}
      <text x="760" y="465" text-anchor="end" fill="#52525B" font-family="system-ui, sans-serif" font-weight="700" font-size="16" letter-spacing="1">
        ${modelName.toUpperCase()}
      </text>
    </svg>
  `);
  return `data:image/svg+xml;utf8,${encoded}`;
};
