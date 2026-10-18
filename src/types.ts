import type { InfoSheet } from './components/infoSheet.ts';
export type VehicleCategory = 'all' | 'cars' | 'motorcycles' | 'trucks' | 'ebikes' | 'scooters' | 'atvs';

export type VehicleCondition = 'New' | 'Surplus / 2nd hand';

export type TransmissionType = 'Automatic' | 'Manual' | 'CVT' | 'Dual-Clutch' | 'Direct Drive';

export type FuelType = 'Gasoline' | 'Diesel' | 'Hybrid' | 'Electric';

export type VehicleStatus = 'available' | 'reserved' | 'sold' | 'unpublished';

export interface Vehicle {
  id: string;
  title: string;
  brand: string;
  model: string;
  year: number;
  category: Exclude<VehicleCategory, 'all'>;
  price: number;
  originalPrice?: number;
  isDeal?: boolean;
  dealDiscount?: string;
  mileage: number;
  condition: VehicleCondition;
  transmission: TransmissionType;
  fuel: FuelType;
  bodyType: string;
  color: string;
  drivetrain: string;
  location: string;
  province: string;
  region: string;
  sellerId: string;
  sellerName: string;
  sellerLocation: string;
  description: string;
  images: string[];
  videos?: string[]; // "idb:<id>" refs, see media.ts
  specs: {
    engine?: string;
    horsepower?: string;
    seating?: string;
    doors?: string;
    fuelEconomy?: string;
    rangeKm?: string;
    topSpeed?: string;
  };
  financingAvailable: boolean;
  minMonthlyPayment?: number;
  status: VehicleStatus;
  featured?: boolean;
  createdAt: string;
  viewsCount: number;
}

export type ApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'contacted'
  | 'reserved' // the admin reserved the car (reservation AR issued); the client fills in the information sheet
  | 'processing' // information sheet in; the admin approves or disapproves
  | 'approved'
  | 'declined'
  | 'withdrawn'
  | 'completed';

export interface VehicleApplication {
  id: string;
  referenceNo: string;
  vehicleId: string;
  vehicleTitle: string;
  vehiclePrice: number;
  vehicleImage: string;
  vehicleLocation: string;
  sellerId: string;
  sellerName: string;
  applicantId: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  address: {
    street: string;
    barangay: string;
    city: string;
    province: string;
    region: string;
    postalCode: string;
    country: string;
  };
  purchaseMethod: 'cash' | 'financing';
  financingTermMonths?: number;
  downPayment?: number;
  status: ApplicationStatus;
  submittedAt: string;
  notes?: string;
  sellerNotes?: string;
  documents?: ApplicationDocument[];
  payments?: PaymentReceipt[];
  quotationNo?: string; // the client applied from this quotation
  viaAgentLink?: string; // the agent whose apply link the client used
  financingApprovedAt?: string; // financing: approved (with the application)
  reservedAt?: string;
  infoSheet?: InfoSheet; // the Applicant's Information Sheet, filled in by the client after the reservation
  infoSheetSubmittedAt?: string;
  ciComments?: string; // the admin's credit investigation comments, given when approving
  approvedAt?: string;
  releasedAt?: string; // vehicle released to the client, with its OR and CR
  orcrConfirmed?: boolean;
}

// A partial payment the admin confirmed; each one releases a numbered acknowledgement receipt (AR).
export interface PaymentReceipt {
  arNo: string; // 2026-0001, counted across every application
  date: string;
  description: string;
  amount: number;
  receivedBy: string;
  attachment?: string; // payment screenshot, shrunk JPEG data URL
  attachmentName?: string;
  remarks?: string;
  editedAt?: string;
}

// One line on an acknowledgement receipt (DESCRIPTIONS / QTY / PRICE / AMOUNT).
export interface ReceiptLine {
  description: string;
  qty: number;
  price: number;
}

// An acknowledgement receipt the admin writes by hand (not from an application's partial payment).
// It shares the running AR number with the payment receipts.
export interface ManualReceipt {
  id: string;
  arNo: string;
  date: string;
  receivedFrom: string;
  lines: ReceiptLine[];
  remarks?: string;
  receivedBy: string;
  attachment?: string;
  attachmentName?: string;
  createdAt: string;
  editedAt?: string;
}

// A company money account the accounting pages use: cash or a bank account expenses are paid from (amount =
// opening balance), or a credit line purchases are charged to (amount = credit limit). The admin manages them.
export interface LedgerAccount {
  id: string;
  kind: 'payment' | 'credit';
  name: string;
  method?: 'cash' | 'bank'; // payment accounts: how money leaves it
  amount: number;
  createdAt: string;
}

// A sale the admin enters by hand in the sales report (e.g. a sale made outside the site).
export interface SalesEntry {
  id: string;
  date: string; // yyyy-mm-dd
  vehicle: string;
  client: string;
  agent?: string;
  amount: number;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  isSeller: boolean;
  // An agent's apply link: the client applies for this vehicle through their agent (and is then locked to them).
  applyVehicleId?: string;
  applyVehicleTitle?: string;
  applyAgent?: string; // agent slug
  byAdmin?: boolean; // sent by the admin during a takeover
}

export interface Conversation {
  id: string;
  vehicleId: string;
  vehicleTitle: string;
  vehiclePrice: number;
  vehicleImage: string;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  lastMessage: string;
  updatedAt: string;
  unreadBuyer: number;
  unreadSeller: number;
  messages: ChatMessage[];
  // The admin took over after the client waited 2 days for a reply; the admin can then answer in this chat.
  takenOverAt?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'buyer' | 'seller' | 'admin';
  address: {
    street: string;
    barangay: string;
    city: string;
    province: string;
    region: string;
    postalCode: string;
    country: string;
  };
  savedVehicleIds: string[];
  recentlyViewedIds: string[];
  memberSince: string;
  avatar?: string;
  googleLinked?: boolean; // can sign in with Google
  hasPassword?: boolean; // false for accounts made with Google (they may set one in Settings)
  mustChangePassword?: boolean; // signed in with a temporary password: must set their own before anything else
}

export interface Guide {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  readTime: string;
  author: string;
  heroImage: string;
  excerpt: string;
  sections: {
    heading: string;
    content: string;
  }[];
}

export interface VehicleReport {
  id: string;
  vehicleId: string;
  vehicleTitle: string;
  reportedBy: string;
  reportedEmail: string;
  reason: 'Misleading information' | 'Suspicious listing' | 'Incorrect price' | 'Incorrect vehicle information' | 'Prohibited content' | 'Other';
  details: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  createdAt: string;
}

export interface ApplicationDocument {
  label: string;
  fileName: string; // '' until the client or the admin supplies it
  addedByAdmin?: boolean; // the client handed it in and the admin uploaded it
  resubmittedAt?: string; // the client uploaded a new copy after a rejection
  url?: string; // the uploaded file (private: the client and admins only)
  // Admin review (financing section); a rejection always carries a reason.
  status?: 'pending' | 'approved' | 'rejected';
  reason?: string;
}

export interface AppNotification {
  id: string;
  // Who sees it; older records without one belong to clients.
  audience?: 'client' | 'agent' | 'admin';
  // For agent notifications: the one agent it is about.
  recipient?: string;
  title: string;
  message: string;
  type: 'message' | 'application' | 'deal' | 'system';
  linkTarget?: string;
  read: boolean;
  createdAt: string;
}

// An agent's commission. Receivable once the client's application is approved (car reserved);
// payable after the admin approves it, which needs the transaction to be complete; paid once
// the admin transfers the cash and attaches the proof.
export interface Commission {
  id: string;
  agentName: string;
  applicationRef: string;
  vehicleTitle: string;
  clientName: string;
  salePrice: number;
  rate: number;
  amount: number;
  status: 'receivable' | 'payable' | 'paid';
  transactionCompleted: boolean;
  approvedAt?: string;
  proofFileName?: string;
  proofImage?: string; // shrunk JPEG data URL, printed on the receipt; absent for PDF proofs
  receiptNo?: string;
  paidAt?: string;
  completedAt?: string; // when the sale was completed; dates the sale in accounting reports
  createdAt: string;
}

// A referral the admin keeps track of by hand: who referred which client, and where it stands.
export type ReferralStatus = 'receivable' | 'processing' | 'approved' | 'disapproved';
export interface Referral {
  id: string;
  referredBy: string;
  clientName: string;
  status: ReferralStatus;
  history: { at: string; by: string; text: string }[];
  createdBy: string;
  createdAt: string;
}

// An agent's request to add, edit or remove a listing; only the admin can apply it.
export interface ListingRequest {
  id: string;
  type: 'add' | 'edit' | 'remove';
  agentName: string;
  vehicleId?: string;
  vehicleTitle: string;
  changes?: Partial<Vehicle>;
  note: string;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
  createdAt: string;
  decidedAt?: string;
}

// Accounting: one voucher with one or more lines. An expense is paid from cash or a cash
// equivalent; a credit entry is charged to a credit account and paid to the creditor later.
export interface ExpenseLine {
  category: string;
  description: string;
  amount: number;
  party: string; // vendor for expenses, creditor for credit
  attachment?: string;
  attachmentUrl?: string; // the uploaded file
}

export interface Expense {
  id: string;
  kind: 'expense' | 'credit';
  voucherNo: string;
  payee: string;
  accountId: string;
  paymentDate: string; // yyyy-mm-dd
  method: 'bank' | 'cash';
  refNo: string;
  lines: ExpenseLine[];
  remarks: string;
  total: number;
  createdAt: string;
}

// A priced offer for one unit. The client requests it, the admin fills in the unit and the numbers and sends it.
export interface Quotation {
  id: string;
  quoteNo?: string; // QT-2026-0001, given when first sent
  status: 'requested' | 'sent' | 'accepted';
  requestedAt: string;
  sentAt?: string;
  validUntil?: string; // yyyy-mm-dd; a sent quotation past this date is expired
  vehicleId: string;
  vehicleTitle: string;
  vehicleImage: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;
  method: 'cash' | 'financing';
  clientNote?: string;
  // Unit details
  unitType: string;
  variant: string;
  engineNo: string;
  chassisNo: string;
  color: string;
  transmission: string;
  // Price and terms
  unitPrice: number;
  downPayment: number;
  termMonths: number;
  annualRate: number; // percent, e.g. 8.5
  insurance: number;
  registration: number;
  chattelMortgage: number;
  remarks: string;
  preparedBy?: string;
  applicationRef?: string; // set when the client applies from this quotation
}

// Which agent a client belongs to. One per client: every chat, application and commission follows it.
export interface ClientLead {
  id: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  agentName?: string; // empty = waiting in the Open leads pool
  source: 'link' | 'pool' | 'admin'; // came through an agent's link, claimed from the pool, or set by the admin
  createdAt: string;
  pooledAt?: string; // when it (re-)entered the pool; the 2-hour unclaimed rule counts from here
  claimedAt?: string;
  interest: string; // the vehicle that first brought the client in
  lastClientAt?: string; // client's latest message, application or quotation request
  lastAgentAt?: string; // owning agent's latest reply
  escalatedAt?: string; // admin was told it sat unclaimed
  history: { at: string; text: string }[];
  preview?: string; // the client's latest chat message, shown to agents in Open leads
  // Locked: the client applied through their agent's apply link, so no one else can take them (and the
  // 24-hour rule does not apply) until that application is completed, declined or withdrawn, or the admin unlocks.
  lockedTo?: string;
  lockedRef?: string;
  lockedAt?: string;
}
