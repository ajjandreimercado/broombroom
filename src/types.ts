export type VehicleCategory = 'all' | 'cars' | 'motorcycles' | 'trucks' | 'ebikes' | 'scooters' | 'atvs';

export type VehicleCondition = 'New' | 'Certified Pre-Owned' | 'Used';

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
  sellerRating: number;
  sellerReviewCount: number;
  sellerVerified: boolean;
  description: string;
  images: string[];
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
  documents?: { label: string; fileName: string }[];
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  isSeller: boolean;
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
}

export interface Guide {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  readTime: string;
  publishDate: string;
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

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'message' | 'application' | 'deal' | 'system';
  linkTarget?: string;
  read: boolean;
  createdAt: string;
}

// An agent's commission on a closed sale; admin pays it and attaches the proof of payment.
export interface Commission {
  id: string;
  applicationRef: string;
  vehicleTitle: string;
  clientName: string;
  salePrice: number;
  rate: number;
  amount: number;
  status: 'pending' | 'paid';
  proofFileName?: string;
  paidAt?: string;
  createdAt: string;
}
