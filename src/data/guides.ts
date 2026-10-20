import type { Guide } from '../types.ts';
import { generateVehicleSvg } from './constants.ts';

// Buying guides shown under Guides.
export const GUIDES: Guide[] = [
  {
    id: 'guide-01',
    slug: 'first-time-car-buyer-guide-philippines',
    title: 'First-Time Vehicle Client’s Complete Guide in the Philippines',
    subtitle: 'From budget allocation and test drives to LTO transfer and insurance essentials.',
    category: 'Buying Advice',
    readTime: '6 min read',
    author: 'Broom Broom team',
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
    author: 'Broom Broom team',
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
        heading: '3. Comparing Both on Broom Broom',
        content:
          'Once your vehicle is reserved, the admin team sends you a quotation for your cash or financing purchase. It shows the unit price, down payment, term and estimated monthly amortization. Financing is still subject to the bank or financing company’s approval.',
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
    author: 'Broom Broom team',
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
    author: 'Broom Broom team',
    heroImage: generateVehicleSvg('truck', '#1e293b', 'LTO Ownership Transfer'),
    excerpt:
      'Never drive a vehicle in another person’s name indefinitely. Follow this exact workflow to transfer legal ownership smoothly and avoid penalties.',
    sections: [
      {
        heading: 'Step 1: Notarized Deed of Absolute Sale',
        content:
          'Both client and agent must execute a Deed of Absolute Sale with 2 valid government-issued IDs with 3 sample specimen signatures each. Ensure full vehicle details (VIN, plate, engine number) are typed without typographical errors.',
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
