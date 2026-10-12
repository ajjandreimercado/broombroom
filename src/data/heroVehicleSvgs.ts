// High-fidelity vector vehicle cutouts on transparent/white stage for the editorial hero
export const generateKeiVanSvg = (): string => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 520" width="100%" height="100%">
      <!-- Ground Contact Shadow -->
      <ellipse cx="400" cy="472" rx="310" ry="24" fill="#000000" fill-opacity="0.14" />
      <ellipse cx="410" cy="474" rx="250" ry="14" fill="#000000" fill-opacity="0.22" />
      <ellipse cx="230" cy="470" rx="75" ry="10" fill="#000000" fill-opacity="0.35" />
      <ellipse cx="585" cy="470" rx="80" ry="10" fill="#000000" fill-opacity="0.35" />

      <!-- Roof Rack Structure -->
      <!-- Rack Mounting Feet -->
      <polygon points="230,95 242,75 252,75 238,95" fill="#18181B" />
      <polygon points="380,92 390,75 400,75 388,92" fill="#18181B" />
      <polygon points="530,95 540,75 550,75 538,95" fill="#18181B" />
      <!-- Rack Base Rails -->
      <rect x="200" y="72" width="370" height="9" rx="2" fill="#27272A" stroke="#18181B" stroke-width="1.5" />
      <!-- Crossbars (Silver/Aluminum) -->
      <rect x="215" y="60" width="110" height="12" rx="2" fill="#E4E4E7" stroke="#71717A" stroke-width="2" />
      <rect x="350" y="60" width="110" height="12" rx="2" fill="#E4E4E7" stroke="#71717A" stroke-width="2" />
      <rect x="475" y="60" width="110" height="12" rx="2" fill="#E4E4E7" stroke="#71717A" stroke-width="2" />
      <rect x="210" y="66" width="380" height="4" fill="#A1A1AA" />

      <!-- Main Van Body (3/4 Perspective Cobalt Blue) -->
      <!-- Main Cab Shell -->
      <path d="M 175 425 C 170 380 180 270 215 195 C 235 150 270 95 320 95 L 590 95 C 640 95 655 130 660 170 L 670 415 C 670 440 655 450 635 450 L 195 450 C 180 450 176 440 175 425 Z" fill="#1D4ED8" stroke="#1E40AF" stroke-width="2" />

      <!-- Body Side Highlight Contour -->
      <path d="M 330 98 L 590 98 C 635 98 648 130 654 170 L 664 425 L 530 425 L 525 210 L 330 210 Z" fill="#2563EB" opacity="0.6" />

      <!-- Front Windshield (Black Tinted with Pillar Reflections) -->
      <path d="M 230 195 C 245 155 275 110 320 110 L 460 110 C 475 110 480 140 480 195 Z" fill="#09090B" stroke="#18181B" stroke-width="2" />
      <path d="M 245 190 C 255 155 285 118 325 118 L 450 118 C 465 118 470 140 470 190 Z" fill="#18181B" opacity="0.8" />
      <!-- Interior Mirror & Seats Silhouette -->
      <rect x="360" y="122" width="28" height="12" rx="2" fill="#3F3F46" />
      <rect x="372" y="134" width="4" height="10" fill="#27272A" />
      <path d="M 290 190 C 295 160 315 145 330 145 C 345 145 365 160 370 190 Z" fill="#27272A" />

      <!-- Side Passenger Windows (Tinted Privacy Glass) -->
      <path d="M 495 115 L 575 115 C 590 115 595 130 595 155 L 595 195 L 495 195 Z" fill="#18181B" stroke="#09090B" stroke-width="1.5" />
      <path d="M 605 120 L 650 135 C 655 140 655 160 655 195 L 605 195 Z" fill="#18181B" stroke="#09090B" stroke-width="1.5" />
      <line x1="598" y1="115" x2="598" y2="195" stroke="#1E40AF" stroke-width="3" />

      <!-- Front Hood & Grille Section -->
      <path d="M 180 260 C 210 240 270 230 460 230 L 465 295 C 350 295 240 300 180 305 Z" fill="#1D4ED8" stroke="#1E40AF" stroke-width="1.5" />
      <!-- Hood Feature Lines -->
      <path d="M 235 200 L 255 245" stroke="#1E40AF" stroke-width="2" />
      <path d="M 450 200 L 440 245" stroke="#1E40AF" stroke-width="2" />

      <!-- Chrome Upper Grille Bar -->
      <rect x="220" y="270" width="230" height="20" rx="3" fill="#E4E4E7" stroke="#71717A" stroke-width="1.5" />
      <rect x="225" y="273" width="220" height="6" fill="#F4F4F5" />
      <!-- Suzuki Style 'S' Emblem -->
      <rect x="325" y="274" width="20" height="12" rx="1" fill="#D4D4D8" stroke="#3F3F46" stroke-width="1" />
      <path d="M 329 277 L 341 277 L 333 283 L 341 283" stroke="#18181B" stroke-width="1.5" fill="none" />

      <!-- Crystalline Headlights (Front Corner) -->
      <path d="M 180 270 L 220 270 L 220 345 C 195 345 180 320 180 270 Z" fill="#F8FAFC" stroke="#94A3B8" stroke-width="2" />
      <circle cx="200" cy="305" r="16" fill="#E2E8F0" stroke="#64748B" stroke-width="2" />
      <circle cx="200" cy="305" r="8" fill="#F8FAFC" />
      <rect x="184" y="325" width="28" height="12" rx="2" fill="#F59E0B" opacity="0.9" />

      <!-- Left Passenger Headlight -->
      <path d="M 450 270 L 480 270 C 480 310 470 335 450 335 Z" fill="#F8FAFC" stroke="#94A3B8" stroke-width="2" />
      <circle cx="462" cy="295" r="12" fill="#E2E8F0" stroke="#64748B" stroke-width="2" />

      <!-- Lower Grille & Bumper -->
      <path d="M 175 345 C 220 340 380 340 480 345 L 475 425 C 380 435 220 435 175 425 Z" fill="#1E40AF" stroke="#172554" stroke-width="2" />
      <!-- Radiator Mesh -->
      <rect x="230" y="355" width="210" height="42" rx="3" fill="#09090B" stroke="#27272A" stroke-width="1.5" />
      <line x1="230" y1="368" x2="440" y2="368" stroke="#27272A" stroke-width="1.5" />
      <line x1="230" y1="382" x2="440" y2="382" stroke="#27272A" stroke-width="1.5" />
      <!-- Lower Fog Lamps -->
      <circle cx="200" cy="385" r="12" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="2" />
      <circle cx="200" cy="385" r="6" fill="#F59E0B" />
      <circle cx="455" cy="385" r="12" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="2" />
      <circle cx="455" cy="385" r="6" fill="#F59E0B" />

      <!-- Front License Plate Base -->
      <rect x="305" y="402" width="60" height="24" rx="2" fill="#09090B" stroke="#3F3F46" stroke-width="1" />

      <!-- Side Door Panel Details & Cutlines -->
      <line x1="482" y1="195" x2="480" y2="440" stroke="#172554" stroke-width="2" />
      <line x1="598" y1="195" x2="598" y2="440" stroke="#172554" stroke-width="2" />
      <!-- Silver Door Handles -->
      <rect x="500" y="260" width="22" height="7" rx="2" fill="#E4E4E7" stroke="#52525B" stroke-width="1" />
      <rect x="560" y="260" width="22" height="7" rx="2" fill="#E4E4E7" stroke="#52525B" stroke-width="1" />

      <!-- Driver Side Mirror -->
      <path d="M 200 190 L 165 195 C 160 210 160 240 180 240 L 205 230 Z" fill="#09090B" stroke="#27272A" stroke-width="2" />
      <ellipse cx="185" cy="215" rx="14" ry="20" fill="#18181B" />
      <!-- Passenger Side Mirror -->
      <path d="M 480 195 L 505 198 C 510 210 510 230 495 230 L 480 220 Z" fill="#09090B" />

      <!-- Deep Wheel Arches -->
      <path d="M 185 450 C 190 380 270 380 280 450 Z" fill="#09090B" />
      <path d="M 535 450 C 540 380 630 380 635 450 Z" fill="#09090B" />

      <!-- Front Wheel (Black Alloy with Detail) -->
      <circle cx="232" cy="425" r="46" fill="#18181B" stroke="#09090B" stroke-width="6" />
      <circle cx="232" cy="425" r="32" fill="#09090B" stroke="#3F3F46" stroke-width="2" />
      <!-- Multi-Spokes -->
      <line x1="232" y1="395" x2="232" y2="455" stroke="#27272A" stroke-width="4" />
      <line x1="202" y1="425" x2="262" y2="425" stroke="#27272A" stroke-width="4" />
      <line x1="210" y1="403" x2="254" y2="447" stroke="#27272A" stroke-width="4" />
      <line x1="254" y1="403" x2="210" y2="447" stroke="#27272A" stroke-width="4" />
      <!-- Wheel Center Cap -->
      <circle cx="232" cy="425" r="10" fill="#E4E4E7" stroke="#18181B" stroke-width="2" />

      <!-- Rear Wheel (Black Alloy with Detail) -->
      <circle cx="585" cy="425" r="46" fill="#18181B" stroke="#09090B" stroke-width="6" />
      <circle cx="585" cy="425" r="32" fill="#09090B" stroke="#3F3F46" stroke-width="2" />
      <line x1="585" y1="395" x2="585" y2="455" stroke="#27272A" stroke-width="4" />
      <line x1="555" y1="425" x2="615" y2="425" stroke="#27272A" stroke-width="4" />
      <line x1="563" y1="403" x2="607" y2="447" stroke="#27272A" stroke-width="4" />
      <line x1="607" y1="403" x2="563" y2="447" stroke="#27272A" stroke-width="4" />
      <circle cx="585" cy="425" r="10" fill="#E4E4E7" stroke="#18181B" stroke-width="2" />
    </svg>
  `;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const generatePorscheWhiteSvg = (): string => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 520" width="100%" height="100%">
      <!-- Ground Contact Shadow -->
      <ellipse cx="380" cy="445" rx="310" ry="20" fill="#000000" fill-opacity="0.16" />
      <ellipse cx="380" cy="446" rx="240" ry="12" fill="#000000" fill-opacity="0.25" />
      <ellipse cx="210" cy="440" rx="70" ry="9" fill="#000000" fill-opacity="0.38" />
      <ellipse cx="570" cy="440" rx="75" ry="9" fill="#000000" fill-opacity="0.38" />

      <!-- Sports Car Architecture (Jet Black / Charcoal with Blue Brake Detail) -->
      <path d="M 110 395 C 120 340 180 320 250 320 L 320 320 C 370 230 460 205 580 205 L 660 260 C 710 270 740 330 745 395 Z" fill="#18181B" stroke="#27272A" stroke-width="2" />
      <!-- Roof Glass -->
      <path d="M 340 315 L 430 220 L 560 220 L 630 315 Z" fill="#09090B" stroke="#27272A" stroke-width="1.5" />
      <!-- Headlight Slit & Blue Caliper Accents -->
      <polygon points="115,365 145,350 140,375" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="1" />
      <line x1="320" y1="320" x2="650" y2="320" stroke="#1D5FD1" stroke-width="2" />

      <!-- Wheels -->
      <circle cx="210" cy="405" r="48" fill="#09090B" stroke="#3F3F46" stroke-width="6" />
      <circle cx="210" cy="405" r="28" fill="#18181B" stroke="#1D5FD1" stroke-width="3" />
      <circle cx="570" cy="405" r="48" fill="#09090B" stroke="#3F3F46" stroke-width="6" />
      <circle cx="570" cy="405" r="28" fill="#18181B" stroke="#1D5FD1" stroke-width="3" />
    </svg>
  `;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const generateRaptorWhiteSvg = (): string => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 520" width="100%" height="100%">
      <!-- Ground Contact Shadow -->
      <ellipse cx="400" cy="455" rx="320" ry="22" fill="#000000" fill-opacity="0.16" />
      <ellipse cx="400" cy="457" rx="260" ry="14" fill="#000000" fill-opacity="0.25" />
      <ellipse cx="220" cy="450" rx="80" ry="10" fill="#000000" fill-opacity="0.38" />
      <ellipse cx="590" cy="450" rx="80" ry="10" fill="#000000" fill-opacity="0.38" />

      <!-- Truck Architecture (Conquer Grey 4x4) -->
      <path d="M 120 390 L 125 320 L 240 320 L 300 195 L 500 195 L 515 300 L 720 300 L 730 390 Z" fill="#334155" stroke="#1E293B" stroke-width="2" />
      <path d="M 310 300 L 330 215 L 480 215 L 490 300 Z" fill="#0F172A" stroke="#1E293B" stroke-width="1.5" />
      <rect x="120" y="340" width="40" height="25" fill="#E2E8F0" stroke="#94A3B8" stroke-width="1.5" />
      <line x1="510" y1="280" x2="710" y2="280" stroke="#1D5FD1" stroke-width="3" />

      <!-- Heavy Duty 4x4 Wheels -->
      <circle cx="220" cy="405" r="56" fill="#09090B" stroke="#334155" stroke-width="8" />
      <circle cx="220" cy="405" r="28" fill="#18181B" stroke="#1D5FD1" stroke-width="3" />
      <circle cx="590" cy="405" r="56" fill="#09090B" stroke="#334155" stroke-width="8" />
      <circle cx="590" cy="405" r="28" fill="#18181B" stroke="#1D5FD1" stroke-width="3" />
    </svg>
  `;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};
