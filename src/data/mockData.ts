import { Vehicle, VehicleApplication, Conversation, UserProfile, Guide, VehicleReport, AppNotification } from '../types.ts';

// Minimalist, high-end studio automotive SVG generator
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
      <text x="40" y="48" fill="#71717A" font-family="system-ui, sans-serif" font-weight="700" font-size="11" letter-spacing="2">GROOM BROOM ARCHIVE</text>
      
      {/* Quiet Technical Typography */}
      <text x="760" y="465" text-anchor="end" fill="#52525B" font-family="system-ui, sans-serif" font-weight="700" font-size="16" letter-spacing="1">
        ${modelName.toUpperCase()}
      </text>
    </svg>
  `);
  return `data:image/svg+xml;utf8,${encoded}`;
};

export const INITIAL_VEHICLES: Vehicle[] = [
  {
    id: 'veh-00',
    title: '2025 Suzuki Every Cargo Turbo 4WD Microvan',
    brand: 'Suzuki',
    model: 'Every Cargo Turbo 4WD',
    year: 2025,
    category: 'cars',
    price: 680000,
    originalPrice: 720000,
    isDeal: true,
    dealDiscount: '₱40,000 OFF',
    mileage: 3800,
    condition: 'Certified Pre-Owned',
    transmission: 'Automatic',
    fuel: 'Gasoline',
    bodyType: 'Kei Van / Compact MPV',
    color: 'Brilliant Cobalt Blue',
    drivetrain: 'Four-Wheel Drive (4WD)',
    location: 'Quezon City, Metro Manila',
    province: 'Metro Manila',
    region: 'NCR',
    sellerId: 'sel-03',
    sellerName: 'Tokyo Direct Auto Imports Manila',
    sellerLocation: 'Quezon City, Metro Manila',
    sellerRating: 4.9,
    sellerReviewCount: 94,
    sellerVerified: true,
    description:
      'Immaculate 2025 Suzuki Every Cargo Turbo 4WD in signature Brilliant Cobalt Blue with full black aerodynamic roof rack system and 14-inch sport multi-spoke black alloys. Factory high-roof specification, twin sliding passenger doors, fold-flat cargo floor, air conditioning, power steering, and clean Philippine LTO registration papers with verified engine and chassis numbers.',
    images: [
      `${import.meta.env.BASE_URL}vehicles/suzuki-every-microvan.jpg`,
      'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1200&q=80',
    ],
    specs: {
      engine: '660cc Intercooled Turbo DOHC 3-Cylinder',
      horsepower: '64 HP @ 6,000 RPM',
      seating: '4 Passengers (Fold-Flat Cargo)',
      doors: '5 Doors (Dual Sliding)',
      fuelEconomy: '18.2 km/L Combined',
      topSpeed: '140 km/h',
    },
    financingAvailable: true,
    minMonthlyPayment: 11800,
    status: 'available',
    featured: true,
    createdAt: '2026-10-01T09:00:00Z',
    viewsCount: 2450,
  },
  {
    id: 'veh-01',
    title: '2024 Porsche 911 Carrera S Coupe',
    brand: 'Porsche',
    model: '911 Carrera S',
    year: 2024,
    category: 'cars',
    price: 11850000,
    originalPrice: 12500000,
    isDeal: true,
    dealDiscount: '₱650,000 OFF',
    mileage: 4200,
    condition: 'Certified Pre-Owned',
    transmission: 'Dual-Clutch',
    fuel: 'Gasoline',
    bodyType: 'Coupe',
    color: 'Jet Black Metallic with Blue Trim',
    drivetrain: 'Rear-Wheel Drive (RWD)',
    location: 'Bonifacio Global City (BGC), Taguig',
    province: 'Metro Manila',
    region: 'NCR',
    sellerId: 'sel-01',
    sellerName: 'Groom Broom Certified Motors',
    sellerLocation: 'Taguig City, Metro Manila',
    sellerRating: 4.9,
    sellerReviewCount: 142,
    sellerVerified: true,
    description:
      'Immaculately maintained 2024 Porsche 911 Carrera S with factory Sport Chrono Package, Sport Exhaust System, and bespoke orange aerodynamic accent stitching. Full dealer maintenance history at Porsche Philippines, ceramic coated since delivery, and clean LTO registration records ready for immediate transfer.',
    images: [
      `${import.meta.env.BASE_URL}vehicles/porsche-911-carrera.jpg`,
      'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80',
    ],
    specs: {
      engine: '3.0L Twin-Turbo Flat-6',
      horsepower: '443 HP @ 6,500 RPM',
      seating: '4 Passengers (2+2)',
      doors: '2 Doors',
      fuelEconomy: '9.8 km/L Highway',
      topSpeed: '308 km/h',
    },
    financingAvailable: true,
    minMonthlyPayment: 178500,
    status: 'available',
    featured: true,
    createdAt: '2026-09-28T08:30:00Z',
    viewsCount: 1840,
  },
  {
    id: 'veh-02',
    title: '2024 Ducati Panigale V4 S Superbike',
    brand: 'Ducati',
    model: 'Panigale V4 S',
    year: 2024,
    category: 'motorcycles',
    price: 1890000,
    originalPrice: 1990000,
    isDeal: true,
    dealDiscount: '₱100,000 OFF',
    mileage: 1850,
    condition: 'Certified Pre-Owned',
    transmission: 'Manual',
    fuel: 'Gasoline',
    bodyType: 'SuperSport',
    color: 'Ducati Red & Carbon Jet Black',
    drivetrain: 'Chain Drive',
    location: 'Makati Commercial Center, Makati',
    province: 'Metro Manila',
    region: 'NCR',
    sellerId: 'sel-02',
    sellerName: 'MotoKinetics Superbike Hub',
    sellerLocation: 'Makati City, Metro Manila',
    sellerRating: 4.8,
    sellerReviewCount: 88,
    sellerVerified: true,
    description:
      'Pristine 2024 Panigale V4 S equipped with Ohlins Smart EC 2.0 electronically controlled suspension, Akrapovic full titanium exhaust system, and cornering EVO traction control. Zero track drops, strictly weekend canyon cruiser, single owner with original invoice and warranty booklet.',
    images: [
      `${import.meta.env.BASE_URL}vehicles/ducati-panigale-v4s.jpg`,
      'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=1200&q=80',
    ],
    specs: {
      engine: '1,103cc Desmosedici Stradale V4',
      horsepower: '215.5 HP @ 13,000 RPM',
      seating: 'Single Seat + Passenger Kit',
      doors: 'N/A',
      fuelEconomy: '14.2 km/L',
      topSpeed: '299+ km/h',
    },
    financingAvailable: true,
    minMonthlyPayment: 29500,
    status: 'available',
    featured: true,
    createdAt: '2026-09-29T10:15:00Z',
    viewsCount: 1420,
  },
  {
    id: 'veh-03',
    title: '2025 Ford Ranger Raptor 3.0L V6 4x4',
    brand: 'Ford',
    model: 'Ranger Raptor',
    year: 2025,
    category: 'trucks',
    price: 2548000,
    mileage: 3100,
    condition: 'New',
    transmission: 'Automatic',
    fuel: 'Gasoline',
    bodyType: 'Double Cab Pickup',
    color: 'Conquer Grey Metallic',
    drivetrain: 'Four-Wheel Drive (4WD)',
    location: 'San Fernando City, Pampanga',
    province: 'Pampanga',
    region: 'Region III (Central Luzon)',
    sellerId: 'sel-03',
    sellerName: 'Pampanga Premier Motors',
    sellerLocation: 'San Fernando, Pampanga',
    sellerRating: 4.9,
    sellerReviewCount: 215,
    sellerVerified: true,
    description:
      'The undisputed king of desert trucks. Powered by a twin-turbo 3.0L EcoBoost V6 engine paired with Fox 2.5 Live Valve Internal Bypass shock absorbers. Loaded with Baja drive mode, active valve dual exhaust, Matrix LED headlights, and 12-inch SYNC 4 touchscreen.',
    images: [
      `${import.meta.env.BASE_URL}vehicles/ford-ranger-raptor.jpg`,
      'https://images.unsplash.com/photo-1559416523-140ddc3d238c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80',
    ],
    specs: {
      engine: '3.0L EcoBoost Twin-Turbo V6',
      horsepower: '392 HP / 583 Nm Torque',
      seating: '5 Passengers',
      doors: '4 Doors',
      fuelEconomy: '8.4 km/L Combined',
      topSpeed: '180 km/h (Governed)',
    },
    financingAvailable: true,
    minMonthlyPayment: 38200,
    status: 'available',
    featured: true,
    createdAt: '2026-09-27T14:40:00Z',
    viewsCount: 2210,
  },
  {
    id: 'veh-04',
    title: '2024 Honda Civic Type R (FL5)',
    brand: 'Honda',
    model: 'Civic Type R',
    year: 2024,
    category: 'cars',
    price: 3950000,
    mileage: 6800,
    condition: 'Used',
    transmission: 'Manual',
    fuel: 'Gasoline',
    bodyType: 'Hatchback',
    color: 'Championship White',
    drivetrain: 'Front-Wheel Drive (FWD)',
    location: 'Quezon City, Metro Manila',
    province: 'Metro Manila',
    region: 'NCR',
    sellerId: 'sel-01',
    sellerName: 'Groom Broom Certified Motors',
    sellerLocation: 'Taguig City, Metro Manila',
    sellerRating: 4.9,
    sellerReviewCount: 142,
    sellerVerified: true,
    description:
      'The track-honed benchmark. 6-speed manual with rev-matching, Brembo 4-piston calipers, Michelin Pilot Sport 4S tires on 19-inch lightweight alloys, and signature red suede bucket seats. First owner, always parked indoors, zero modifications.',
    images: [
      `${import.meta.env.BASE_URL}vehicles/honda-civic-type-r.jpg`,
      'https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1200&q=80',
    ],
    specs: {
      engine: '2.0L VTEC Turbocharged I4',
      horsepower: '315 HP @ 6,500 RPM',
      seating: '4 Passengers',
      doors: '5 Doors',
      fuelEconomy: '10.5 km/L Combined',
      topSpeed: '272 km/h',
    },
    financingAvailable: true,
    minMonthlyPayment: 59800,
    status: 'available',
    featured: false,
    createdAt: '2026-09-25T11:00:00Z',
    viewsCount: 1650,
  },
  {
    id: 'veh-05',
    title: '2025 Yamaha TMAX 560 Tech MAX',
    brand: 'Yamaha',
    model: 'TMAX 560 Tech MAX',
    year: 2025,
    category: 'scooters',
    price: 825000,
    originalPrice: 875000,
    isDeal: true,
    dealDiscount: '₱50,000 OFF',
    mileage: 950,
    condition: 'New',
    transmission: 'Automatic',
    fuel: 'Gasoline',
    bodyType: 'Maxi Scooter',
    color: 'Dark Petrol Matte & Gold Accents',
    drivetrain: 'Belt Drive',
    location: 'Cebu City, Central Visayas',
    province: 'Cebu',
    region: 'Region VII (Central Visayas)',
    sellerId: 'sel-04',
    sellerName: 'Visayas Wheels Prestige',
    sellerLocation: 'Cebu City, Cebu',
    sellerRating: 4.7,
    sellerReviewCount: 94,
    sellerVerified: true,
    description:
      'The pinnacle of premium sport scooters. Features an electronically adjustable windscreen, cruise control, heated grips and rider seat, 7-inch TFT screen with full-map Garmin Navigation, smart key ignition, and traction control system.',
    images: [
      'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1200&q=80',
    ],
    specs: {
      engine: '562cc Parallel-Twin DOHC',
      horsepower: '47.6 HP @ 7,500 RPM',
      seating: '2 Passengers',
      doors: 'N/A',
      fuelEconomy: '20.8 km/L',
      topSpeed: '165 km/h',
    },
    financingAvailable: true,
    minMonthlyPayment: 13200,
    status: 'available',
    featured: false,
    createdAt: '2026-09-30T16:20:00Z',
    viewsCount: 980,
  },
  {
    id: 'veh-06',
    title: '2025 Specialized Turbo Vado 5.0 IGH E-Bike',
    brand: 'Specialized',
    model: 'Turbo Vado 5.0',
    year: 2025,
    category: 'ebikes',
    price: 295000,
    mileage: 180,
    condition: 'New',
    transmission: 'CVT',
    fuel: 'Electric',
    bodyType: 'Commuter Step-Through',
    color: 'Satin Obsidian Charcoal',
    drivetrain: 'Gates Carbon Belt Drive',
    location: 'Pasig City (Ortigas Center)',
    province: 'Metro Manila',
    region: 'NCR',
    sellerId: 'sel-05',
    sellerName: 'Volt & Pedal E-Mobility',
    sellerLocation: 'Ortigas, Pasig City',
    sellerRating: 5.0,
    sellerReviewCount: 63,
    sellerVerified: true,
    description:
      'The ultimate urban commuter. Specialized 2.2 motor with 90Nm torque, 710Wh removable lithium battery offering up to 140km range on eco mode. Enviolo stepless internal gear hub with Gates belt drive means zero chain maintenance and silent cruising.',
    images: [
      'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1571068316344-75bc76f77890?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?auto=format&fit=crop&w=1200&q=80',
    ],
    specs: {
      engine: 'Specialized 2.2 250W (90Nm)',
      horsepower: 'N/A (Peak 565W electric)',
      seating: '1 Rider',
      doors: 'N/A',
      fuelEconomy: '710Wh Battery / 140km Range',
      rangeKm: '140 km on single charge',
      topSpeed: '45 km/h assist',
    },
    financingAvailable: true,
    minMonthlyPayment: 4850,
    status: 'available',
    featured: false,
    createdAt: '2026-09-24T09:45:00Z',
    viewsCount: 780,
  },
  {
    id: 'veh-07',
    title: '2024 Can-Am Maverick X3 X RS Turbo RR Quad',
    brand: 'Can-Am',
    model: 'Maverick X3 X RS',
    year: 2024,
    category: 'atvs',
    price: 1850000,
    mileage: 620,
    condition: 'Used',
    transmission: 'CVT',
    fuel: 'Gasoline',
    bodyType: 'Side-by-Side (SxS) / Buggy',
    color: 'Catalyst Grey & Desert Blue',
    drivetrain: 'Smart-Lok 4WD with Front Diff Lock',
    location: 'Davao City, Southern Mindanao',
    province: 'Davao del Sur',
    region: 'Region XI (Davao Region)',
    sellerId: 'sel-06',
    sellerName: 'Mindanao Offroad & Powersports',
    sellerLocation: 'Lanang, Davao City',
    sellerRating: 4.9,
    sellerReviewCount: 110,
    sellerVerified: true,
    description:
      'Unstoppable off-road capability. 200HP Rotax ACE triple-cylinder engine with intercooled turbocharger. Fox 3.0 PODIUM RC2 Piggyback shocks with bypass, 72-inch track width, beadlock wheels, and heavy-duty front bumper with integrated winch.',
    images: [
      `${import.meta.env.BASE_URL}vehicles/canam-maverick-x3.jpg`,
      'https://images.unsplash.com/photo-1551524559-8af4e6624178?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
    ],
    specs: {
      engine: '900cc Rotax Turbo RR 3-Cylinder',
      horsepower: '200 HP',
      seating: '2 Passengers',
      doors: 'Quarter Doors',
      fuelEconomy: 'Off-Road Spec',
      topSpeed: '140 km/h (Terrain limited)',
    },
    financingAvailable: true,
    minMonthlyPayment: 28900,
    status: 'available',
    featured: true,
    createdAt: '2026-09-26T12:00:00Z',
    viewsCount: 1190,
  },
  {
    id: 'veh-08',
    title: '2025 Toyota Land Cruiser Prado 250 First Edition',
    brand: 'Toyota',
    model: 'Land Cruiser Prado 250',
    year: 2025,
    category: 'cars',
    price: 4950000,
    mileage: 1200,
    condition: 'New',
    transmission: 'Automatic',
    fuel: 'Diesel',
    bodyType: 'SUV',
    color: 'Heritage Blue & Grayscale Roof',
    drivetrain: 'Full-Time 4WD with Torsen Center Diff',
    location: 'Santa Rosa City, Laguna',
    province: 'Laguna',
    region: 'Region IV-A (CALABARZON)',
    sellerId: 'sel-03',
    sellerName: 'Pampanga Premier Motors',
    sellerLocation: 'San Fernando, Pampanga',
    sellerRating: 4.9,
    sellerReviewCount: 215,
    sellerVerified: true,
    description:
      'The eagerly anticipated Land Cruiser 250 series. Retro round LED headlights, boxy heritage silhouette, 2.8L turbo-diesel engine with 8-speed automatic, Crawl Control, Multi-Terrain Select, and full safety suite including Toyota Safety Sense 3.0.',
    images: [
      'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1200&q=80',
    ],
    specs: {
      engine: '2.8L 1GD-FTV Turbo Diesel',
      horsepower: '201 HP / 500 Nm Torque',
      seating: '7 Passengers',
      doors: '5 Doors',
      fuelEconomy: '12.4 km/L Combined',
      topSpeed: '185 km/h',
    },
    financingAvailable: true,
    minMonthlyPayment: 74200,
    status: 'available',
    featured: true,
    createdAt: '2026-09-30T17:00:00Z',
    viewsCount: 3100,
  },
  {
    id: 'veh-09',
    title: '2024 NIU MQi GT EVO Electric Smart Scooter',
    brand: 'NIU',
    model: 'MQi GT EVO',
    year: 2024,
    category: 'scooters',
    price: 185000,
    originalPrice: 205000,
    isDeal: true,
    dealDiscount: '₱20,000 OFF',
    mileage: 820,
    condition: 'Certified Pre-Owned',
    transmission: 'Direct Drive',
    fuel: 'Electric',
    bodyType: 'Urban Electric Scooter',
    color: 'Matte Titanium & Bright Blue Accents',
    drivetrain: 'Rear Hub Motor',
    location: 'Makati Commercial Center, Makati',
    province: 'Metro Manila',
    region: 'NCR',
    sellerId: 'sel-05',
    sellerName: 'Volt & Pedal E-Mobility',
    sellerLocation: 'Ortigas, Pasig City',
    sellerRating: 5.0,
    sellerReviewCount: 63,
    sellerVerified: true,
    description:
      'Built for daily city commutes with 100 km/h top speed powered by twin 72V 26Ah 4th-gen lithium battery packs. Connected smartphone app with 24/7 GPS anti-theft tracking, keyless Bluetooth start, and regenerative electronic braking.',
    images: [
      'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=1200&q=80',
    ],
    specs: {
      engine: '5kW Continuous Hub Motor',
      horsepower: '6.7 HP Peak Electric',
      seating: '2 Passengers',
      doors: 'N/A',
      fuelEconomy: 'Dual 72V Lithium Batteries',
      rangeKm: '75 km at full speed',
      topSpeed: '100 km/h',
    },
    financingAvailable: true,
    minMonthlyPayment: 3100,
    status: 'available',
    featured: false,
    createdAt: '2026-09-22T08:00:00Z',
    viewsCount: 920,
  },
  {
    id: 'veh-10',
    title: '2024 Toyota Hilux GR Sport 4x4 Double Cab',
    brand: 'Toyota',
    model: 'Hilux GR Sport',
    year: 2024,
    category: 'trucks',
    price: 2185000,
    mileage: 8900,
    condition: 'Used',
    transmission: 'Automatic',
    fuel: 'Diesel',
    bodyType: 'Double Cab Pickup',
    color: 'Emotional Red with GR Black Decals',
    drivetrain: 'Part-Time 4WD with Rear Diff Lock',
    location: 'Cebu City, Central Visayas',
    province: 'Cebu',
    region: 'Region VII (Central Visayas)',
    sellerId: 'sel-04',
    sellerName: 'Visayas Wheels Prestige',
    sellerLocation: 'Cebu City, Cebu',
    sellerRating: 4.7,
    sellerReviewCount: 94,
    sellerVerified: true,
    description:
      'Dakar-inspired wide-tread Hilux GR Sport. Tuned monotube KYB shock absorbers, GR brake calipers, wider fender flares, matte black sport bar, paddle shifters, and GR push-start button. Well maintained with complete records from Toyota Cebu.',
    images: [
      'https://images.unsplash.com/photo-1559416523-140ddc3d238c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=1200&q=80',
    ],
    specs: {
      engine: '2.8L 4-Cylinder DOHC Turbo Diesel',
      horsepower: '224 HP / 550 Nm Torque',
      seating: '5 Passengers',
      doors: '4 Doors',
      fuelEconomy: '11.8 km/L Combined',
      topSpeed: '180 km/h',
    },
    financingAvailable: true,
    minMonthlyPayment: 32800,
    status: 'available',
    featured: false,
    createdAt: '2026-09-21T15:30:00Z',
    viewsCount: 1780,
  },
];

export const INITIAL_GUIDES: Guide[] = [
  {
    id: 'guide-01',
    slug: 'first-time-car-buyer-guide-philippines',
    title: 'First-Time Vehicle Buyer’s Complete Guide in the Philippines',
    subtitle: 'From budget allocation and test drives to LTO transfer and insurance essentials.',
    category: 'Buying Advice',
    readTime: '6 min read',
    publishDate: 'September 2026',
    author: 'Marco Santos, Senior Automotive Editor',
    heroImage: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&w=1200&q=80',
    excerpt:
      'Buying your first vehicle in the Philippines can feel overwhelming. Here is the definitive roadmap covering total cost of ownership, comprehensive inspections, and LTO documentation.',
    sections: [
      {
        heading: '1. Calculating True Total Cost of Ownership',
        content:
          'When planning your vehicle budget, never look solely at the sticker price or the monthly amortization. Account for comprehensive car insurance (typically 2-3% of market value annually), quarterly PMS (periodic maintenance service), fuel consumption based on your typical commute (averaging ₱6,000–₱12,000/month in Metro Manila traffic), and parking dues.',
      },
      {
        heading: '2. Verifying the OR/CR (Official Receipt & Certificate of Registration)',
        content:
          'Before handing over any deposit, insist on inspecting the original LTO Official Receipt (OR) and Certificate of Registration (CR). Verify that the engine number and chassis number stamped on the vehicle match the CR exactly. Use the LTO 2600 SMS verification or LTMS online portal to ensure the unit has no pending alarm or apprehension records.',
      },
      {
        heading: '3. Test Driving Like a Seasoned Mechanic',
        content:
          'Turn off the radio and AC during the initial 5 minutes of your test drive. Listen for knocking rods, suspension clunks over speed bumps, and wheel bearing hums. Test the brakes at moderate speeds on a straight patch to verify the steering does not pull left or right.',
      },
    ],
  },
  {
    id: 'guide-02',
    slug: 'cash-vs-financing-smart-choice',
    title: 'Cash vs. Auto Financing: What’s the Smartest Choice for Your Ride?',
    subtitle: 'An objective mathematical breakdown of interest rates, opportunity costs, and bank approvals.',
    category: 'Financing',
    readTime: '5 min read',
    publishDate: 'August 2026',
    author: 'Elena Reyes, Consumer Finance Specialist',
    heroImage: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1200&q=80',
    excerpt:
      'Is paying cash always king? Or does low-interest auto financing preserve essential liquidity for your investments and emergency fund? Here is how to decide.',
    sections: [
      {
        heading: '1. The Real Cost of Cash Deals',
        content:
          'Paying 100% in cash gives you immediate title ownership, avoids chattel mortgage fees, and eliminates monthly debt obligations. However, if using cash drains your emergency fund below 6 months of living expenses, you expose yourself to catastrophic financial risk if unexpected emergencies occur.',
      },
      {
        heading: '2. Understanding Add-On Interest vs Effective Interest Rates',
        content:
          'Banks frequently advertise add-on rates of 5% to 7% per year. Beware: because the interest is calculated on the original principal rather than diminishing balance, the effective annual interest rate (EIR) is often 10% to 14%. Always request the Truth in Lending Act disclosure sheet before signing.',
      },
      {
        heading: '3. The Groom Broom Financing Advantage',
        content:
          'Through verified Groom Broom seller partnerships, buyers can apply directly with pre-screened documentation, comparing bank-backed auto loan rates alongside in-house deferred payment schemes tailored to freelancers, OFWs, and SME owners.',
      },
    ],
  },
  {
    id: 'guide-03',
    slug: 'motorcycle-and-scooter-maintenance-101',
    title: 'Motorcycle & Scooter Maintenance 101 for Daily Commuters',
    subtitle: 'Keep your two-wheeler reliable, fuel-efficient, and road-worthy through all weather.',
    category: 'Maintenance',
    readTime: '4 min read',
    publishDate: 'September 2026',
    author: 'Renzo De Leon, Lead Technical Mechanic',
    heroImage: generateVehicleSvg('bike', '#0f172a', 'Two-Wheeler Maintenance'),
    excerpt:
      'Simple proactive checks on tire pressure, CVT drive belts, chain tension, and synthetic motor oil that prevent breakdowns on the road.',
    sections: [
      {
        heading: '1. Tire Pressure and Tread Inspection',
        content:
          'Motorcycles rely on two tiny contact patches no bigger than credit cards. Check cold tire pressures weekly using a reliable gauge. Under-inflated tires cause sluggish cornering and accelerate center tire wear, while over-inflation reduces grip in wet rainy conditions.',
      },
      {
        heading: '2. CVT Belt and Roller Weights for Scooters',
        content:
          'For automatic scooters (such as Click, NMAX, and Vespa), inspect the drive belt every 8,000 km and replace it around 15,000–20,000 km. Worn belt fibers lead to sudden snapping during highway speeds, leaving you stranded.',
      },
    ],
  },
  {
    id: 'guide-04',
    slug: 'lto-transfer-of-ownership-step-by-step',
    title: 'LTO Transfer of Ownership Step-by-Step in the Philippines',
    subtitle: 'Notarized Deeds of Sale, PNP-HPG clearance, and LTMS electronic registration.',
    category: 'Legal & Transfer',
    readTime: '7 min read',
    publishDate: 'July 2026',
    author: 'Atty. J. Carandang, Transport Law Counsel',
    heroImage: generateVehicleSvg('truck', '#1e293b', 'LTO Ownership Transfer'),
    excerpt:
      'Never drive a vehicle in another person’s name indefinitely. Follow this exact workflow to transfer legal ownership smoothly and avoid penalties.',
    sections: [
      {
        heading: 'Step 1: Notarized Deed of Absolute Sale',
        content:
          'Both buyer and seller must execute a Deed of Absolute Sale with 2 valid government-issued IDs with 3 sample specimen signatures each. Ensure full vehicle details (VIN, plate, engine number) are typed without typographical errors.',
      },
      {
        heading: 'Step 2: PNP-HPG Macro-Etching Clearance',
        content:
          'Bring the unit to the nearest Philippine National Police - Highway Patrol Group (PNP-HPG) Motor Vehicle Clearance Division for stencil and stencil verification to ensure the unit is not stolen or on the hotlist.',
      },
      {
        heading: 'Step 3: LTO District Office MVIR and Registration',
        content:
          'Present your Motor Vehicle Inspection Report (MVIR), Compulsory Third Party Liability (CTPL) insurance, PNP-HPG clearance, and original OR/CR at your mother LTO district office to receive the new CR in your name.',
      },
    ],
  },
];

export const INITIAL_USER: UserProfile = {
  id: 'usr-buyer-01',
  name: 'Andrei Mercado',
  email: 'ajjandreimercado@gmail.com',
  phone: '+63 917 842 9918',
  role: 'buyer',
  address: {
    street: '28th Street, High Street South Block',
    barangay: 'Fort Bonifacio',
    city: 'Taguig City',
    province: 'Metro Manila',
    region: 'NCR',
    postalCode: '1634',
    country: 'Philippines',
  },
  savedVehicleIds: ['veh-01', 'veh-03'],
  recentlyViewedIds: ['veh-01', 'veh-02', 'veh-03'],
  memberSince: 'March 2025',
};

export const INITIAL_APPLICATIONS: VehicleApplication[] = [
  {
    id: 'app-001',
    referenceNo: 'GB-2026-8841',
    vehicleId: 'veh-01',
    vehicleTitle: '2024 Porsche 911 Carrera S Coupe',
    vehiclePrice: 11850000,
    vehicleImage: generateVehicleSvg('car', '#111827', 'Porsche 911'),
    vehicleLocation: 'Bonifacio Global City, Taguig',
    sellerId: 'sel-01',
    sellerName: 'Groom Broom Certified Motors',
    applicantId: 'usr-buyer-01',
    applicantName: 'Andrei Mercado',
    applicantEmail: 'ajjandreimercado@gmail.com',
    applicantPhone: '+63 917 842 9918',
    address: {
      street: '28th Street, High Street South Block',
      barangay: 'Fort Bonifacio',
      city: 'Taguig City',
      province: 'Metro Manila',
      region: 'NCR',
      postalCode: '1634',
      country: 'Philippines',
    },
    purchaseMethod: 'financing',
    financingTermMonths: 48,
    downPayment: 3500000,
    status: 'under_review',
    submittedAt: '2026-09-29T14:22:00Z',
    notes: 'Interested in physical viewing this coming Saturday afternoon. Bank pre-approval ready.',
    sellerNotes: 'Scheduled showroom viewing for Oct 5 at 2:00 PM. Requested proof of billing.',
  },
  {
    id: 'app-002',
    referenceNo: 'GB-2026-7209',
    vehicleId: 'veh-03',
    vehicleTitle: '2025 Ford Ranger Raptor 3.0L V6 4x4',
    vehiclePrice: 2548000,
    vehicleImage: generateVehicleSvg('truck', '#334155', 'Ranger Raptor'),
    vehicleLocation: 'San Fernando City, Pampanga',
    sellerId: 'sel-03',
    sellerName: 'Pampanga Premier Motors',
    applicantId: 'usr-buyer-01',
    applicantName: 'Andrei Mercado',
    applicantEmail: 'ajjandreimercado@gmail.com',
    applicantPhone: '+63 917 842 9918',
    address: {
      street: '28th Street, High Street South Block',
      barangay: 'Fort Bonifacio',
      city: 'Taguig City',
      province: 'Metro Manila',
      region: 'NCR',
      postalCode: '1634',
      country: 'Philippines',
    },
    purchaseMethod: 'cash',
    status: 'submitted',
    submittedAt: '2026-10-01T09:15:00Z',
    notes: 'Cash purchase upon inspection and verified test drive.',
  },
];

export const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-01',
    vehicleId: 'veh-01',
    vehicleTitle: '2024 Porsche 911 Carrera S Coupe',
    vehiclePrice: 11850000,
    vehicleImage: generateVehicleSvg('car', '#111827', 'Porsche 911'),
    buyerId: 'usr-buyer-01',
    buyerName: 'Andrei Mercado',
    sellerId: 'sel-01',
    sellerName: 'Groom Broom Certified Motors',
    lastMessage: 'Good day! Yes, the Carrera S is currently parked in our BGC showroom ready for viewing.',
    updatedAt: '2026-10-02T11:45:00Z',
    unreadBuyer: 1,
    unreadSeller: 0,
    messages: [
      {
        id: 'msg-01',
        senderId: 'usr-buyer-01',
        senderName: 'Andrei Mercado',
        text: 'Hello, is this 2024 Porsche 911 Carrera S still available for viewing this weekend?',
        timestamp: '2026-10-02T10:12:00Z',
        isSeller: false,
      },
      {
        id: 'msg-02',
        senderId: 'sel-01',
        senderName: 'Groom Broom Certified Motors',
        text: 'Good day Andrei! Yes, the Carrera S is currently parked in our BGC showroom ready for viewing. What time suits you best?',
        timestamp: '2026-10-02T11:45:00Z',
        isSeller: true,
      },
    ],
  },
  {
    id: 'conv-02',
    vehicleId: 'veh-02',
    vehicleTitle: '2024 Ducati Panigale V4 S Superbike',
    vehiclePrice: 1890000,
    vehicleImage: generateVehicleSvg('bike', '#b91c1c', 'Ducati Panigale'),
    buyerId: 'usr-buyer-01',
    buyerName: 'Andrei Mercado',
    sellerId: 'sel-02',
    sellerName: 'MotoKinetics Superbike Hub',
    lastMessage: 'All original stock exhaust parts and extra key fobs are included in the crate.',
    updatedAt: '2026-09-30T16:20:00Z',
    unreadBuyer: 0,
    unreadSeller: 0,
    messages: [
      {
        id: 'msg-03',
        senderId: 'usr-buyer-01',
        senderName: 'Andrei Mercado',
        text: 'Does this Panigale V4 S come with the original stock exhaust in case of LTO renewal?',
        timestamp: '2026-09-30T15:05:00Z',
        isSeller: false,
      },
      {
        id: 'msg-04',
        senderId: 'sel-02',
        senderName: 'MotoKinetics Superbike Hub',
        text: 'All original stock exhaust parts and extra key fobs are included in the crate. Everything is 100% street-legal with valid emission certificates.',
        timestamp: '2026-09-30T16:20:00Z',
        isSeller: true,
      },
    ],
  },
];

export const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-01',
    title: 'Seller Responded',
    message: 'Groom Broom Certified Motors replied regarding the 2024 Porsche 911 Carrera S Coupe.',
    type: 'message',
    linkTarget: 'messages',
    read: false,
    createdAt: '2026-10-02T11:45:00Z',
  },
  {
    id: 'notif-02',
    title: 'Application Status Update',
    message: 'Your application GB-2026-8841 for Porsche 911 is now Under Review.',
    type: 'application',
    linkTarget: 'applications',
    read: false,
    createdAt: '2026-09-29T16:00:00Z',
  },
  {
    id: 'notif-03',
    title: 'Special Weekend Deal',
    message: 'New price drop on 2025 Yamaha TMAX 560: Save ₱50,000 this week only!',
    type: 'deal',
    linkTarget: 'deals',
    read: true,
    createdAt: '2026-09-28T09:00:00Z',
  },
];

export const INITIAL_REPORTS: VehicleReport[] = [
  {
    id: 'rep-01',
    vehicleId: 'veh-04',
    vehicleTitle: '2024 Honda Civic Type R (FL5)',
    reportedBy: 'User Verification Bot',
    reportedEmail: 'safety@groombroom.ph',
    reason: 'Incorrect vehicle information',
    details: 'Verify if the odometer reading reflects current PMS records.',
    status: 'pending',
    createdAt: '2026-09-27T10:00:00Z',
  },
];
