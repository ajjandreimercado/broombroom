import { PORTAL } from '../portals.ts';
import { flushSync } from 'react-dom';
import React, { createContext, useContext, useState, useEffect, useMemo, useRef, useCallback, ReactNode } from 'react';
import {
  Vehicle,
  VehicleCategory,
  VehicleStatus,
  VehicleApplication,
  ApplicationStatus,
  Conversation,
  UserProfile,
  Guide,
  VehicleReport,
  AppNotification,
  Commission,
  ListingRequest,
  Expense,
  PaymentReceipt,
  Quotation,
  ClientLead,
  ManualReceipt,
  SalesEntry,
  LedgerAccount,
  Referral,
  ReferralStatus,
} from '../types.ts';
import { api, uploadFile, ApiError } from '../api.ts';
import type { InfoSheet } from '../components/infoSheet.ts';
import { GUIDES } from '../data/guides.ts';

export type CurrentView =
  | 'intro'
  | 'marketplace'
  | 'deals'
  | 'vehicle_detail'
  | 'apply'
  | 'account'
  | 'seller'
  | 'admin'
  | 'guides'
  | 'guide_detail'
  | 'how_it_works'
  | 'permits'
  | 'info_sheet'
  | 'help'
  | 'terms'
  | 'privacy';

export type AccountTab =
  | 'profile'
  | 'saved'
  | 'compare'
  | 'applications'
  | 'messages'
  | 'recently_viewed'
  | 'settings'
  | 'notifications'
  | 'quotations';

export type SellerTab =
  | 'dashboard'
  | 'sales_report'
  | 'vehicles'
  | 'messages'
  | 'commissions'
  | 'leads';

export type AdminTab =
  | 'dashboard'
  | 'approvals'
  | 'applications'
  | 'financing'
  | 'commissions'
  | 'vehicles'
  | 'add_vehicle'
  | 'reports'
  | 'agent_reports'
  | 'referrals'
  | 'conversations'
  | 'accounting'
  | 'acc_expenses'
  | 'acc_credit'
  | 'acc_reports'
  | 'acc_receipts'
  | 'quotations'
  | 'leads'
  | 'accounts';

export interface FilterState {
  searchQuery: string;
  category: VehicleCategory;
  brand: string;
  condition: string;
  transmission: string;
  fuel: string;
  minPrice: number;
  maxPrice: number;
  minYear: number;
  maxYear: number;
  location: string;
  sortBy: 'recommended' | 'newest' | 'price_asc' | 'price_desc' | 'mileage_asc' | 'mileage_desc';
}

interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'error';
  title: string;
  message?: string;
}

// An account as the admin sees it in Accounts.
export interface AccountSummary {
  id: string;
  name: string;
  email: string;
  role: 'buyer' | 'seller' | 'admin';
  active: boolean;
  phone?: string;
  memberSince?: string;
}

// Everything the server lets this person see (server/state.ts).
interface ServerState {
  me: UserProfile | null;
  vehicles: Vehicle[];
  googleClientId?: string | null;
  applications?: VehicleApplication[];
  conversations?: Conversation[];
  quotations?: Quotation[];
  notifications?: AppNotification[];
  commissions?: Commission[];
  listingRequests?: ListingRequest[];
  reports?: VehicleReport[];
  leads?: ClientLead[];
  expenses?: Expense[];
  credits?: Expense[];
  receipts?: ManualReceipt[];
  salesEntries?: SalesEntry[];
  ledgerAccounts?: LedgerAccount[];
  referrals?: Referral[];
  agents?: string[];
  users?: AccountSummary[];
  myAgent?: string | null;
}

export type ApplicationInput = {
  vehicleId: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  address: VehicleApplication['address'];
  purchaseMethod: 'cash' | 'financing';
  financingTermMonths?: number;
  downPayment?: number;
  notes: string;
  documents: Record<string, string>; // requirement key -> uploaded file id
  quotationId?: string;
};

export type ReceiptInput = Pick<ManualReceipt, 'receivedFrom' | 'lines' | 'remarks'> & { date: string }; // date yyyy-mm-dd
export type PaymentEdit = { amount: number; description: string; remarks?: string };

export type VoucherInput = Omit<Expense, 'id' | 'voucherNo' | 'createdAt' | 'total' | 'lines'> & {
  lines: { category: string; description: string; amount: number; party: string; fileId?: string }[];
};

interface AppContextType {
  // Navigation & Views
  currentView: CurrentView;
  selectedVehicleId: string | null;
  selectedGuideSlug: string | null;
  accountTab: AccountTab;
  sellerTab: SellerTab;
  adminTab: AdminTab;
  navigateTo: (
    view: CurrentView,
    params?: {
      vehicleId?: string;
      guideSlug?: string;
      accountTab?: AccountTab;
      sellerTab?: SellerTab;
      adminTab?: AdminTab;
      quotationId?: string | null;
      applicationId?: string | null;
    }
  ) => void;
  selectedQuotationId: string | null;
  // Opens one application's details in My Applications (e.g. from the re-submission email link).
  selectedApplicationId: string | null;

  // Server connection
  ready: boolean;
  serverError: string | null;
  refresh: () => Promise<void>;

  // Modals
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  reportModalVehicle: Vehicle | null;
  setReportModalVehicle: (v: Vehicle | null) => void;

  // Toasts
  toasts: ToastMessage[];
  showToast: (title: string, message?: string, type?: 'success' | 'info' | 'error') => void;
  dismissToast: (id: string) => void;

  // Data
  vehicles: Vehicle[];
  guides: Guide[];
  applications: VehicleApplication[];
  conversations: Conversation[];
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  reports: VehicleReport[];
  commissions: Commission[];
  listingRequests: ListingRequest[];
  expenses: Expense[];
  credits: Expense[];
  quotations: Quotation[];
  receipts: ManualReceipt[];
  salesEntries: SalesEntry[];
  ledgerAccounts: LedgerAccount[];
  referrals: Referral[];
  leads: ClientLead[];
  notifications: AppNotification[];
  agents: string[];
  accounts: AccountSummary[];
  myAgent: string | null;

  // User & Auth
  currentUser: UserProfile | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  googleClientId: string | null;
  googleSignIn: (credential: string) => Promise<string | null>;
  register: (name: string, email: string, phone: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  updateProfile: (changes: Partial<Pick<UserProfile, 'name' | 'phone' | 'address'>>) => Promise<boolean>;
  changePassword: (current: string, next: string) => Promise<boolean>;

  // Pending action preservation
  pendingAction: { type: 'apply' | 'save' | 'message'; vehicleId: string } | null;
  setPendingAction: (action: { type: 'apply' | 'save' | 'message'; vehicleId: string } | null) => void;

  // Filter & Search
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  updateFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  resetFilters: () => void;
  filteredVehicles: Vehicle[];
  availableBrands: string[];

  // Vehicle Actions
  toggleSaveVehicle: (id: string) => void;
  isVehicleSaved: (id: string) => boolean;
  addRecentlyViewed: (id: string) => void;
  submitReport: (report: Omit<VehicleReport, 'id' | 'createdAt' | 'status'>) => Promise<boolean>;

  // Vehicle Comparison
  comparedVehicleIds: string[];
  toggleCompareVehicle: (id: string) => void;
  isInCompare: (id: string) => boolean;
  clearCompare: () => void;
  compareModalOpen: boolean;
  setCompareModalOpen: (open: boolean) => void;

  // Applications
  createApplication: (input: ApplicationInput) => Promise<VehicleApplication | undefined>;
  updateApplicationStatus: (id: string, status: ApplicationStatus, note?: string, commission?: number) => Promise<boolean>;
  reserveApplication: (id: string, payment: { amount: number; description: string; remarks?: string }, screenshot?: Blob & { name?: string }) => Promise<PaymentReceipt | undefined>;
  submitInfoSheet: (id: string, sheet: Omit<InfoSheet, 'sketchUrl'>, sketch?: Blob & { name?: string }) => Promise<boolean>;
  releaseVehicle: (id: string, commission: number, orcr: Blob & { name?: string }) => Promise<boolean>;
  withdrawApplication: (id: string) => Promise<boolean>;
  reviewDocument: (appId: string, docIndex: number, approve: boolean, reason?: string) => Promise<boolean>;
  attachDocumentForClient: (appId: string, docIndex: number, file: File) => Promise<boolean>;
  resubmitDocument: (appId: string, docIndex: number, file: File) => Promise<boolean>;
  recordPartialPayment: (appId: string, amount: number, description: string, screenshot?: Blob & { name?: string }, remarks?: string) => Promise<PaymentReceipt | undefined>;
  updatePayment: (appId: string, arNo: string, changes: PaymentEdit, screenshot?: Blob & { name?: string }) => Promise<PaymentReceipt | undefined>;
  deletePayment: (appId: string, arNo: string) => Promise<boolean>;
  saveReceipt: (id: string | null, input: ReceiptInput, file?: File) => Promise<ManualReceipt | undefined>;
  deleteReceipt: (id: string) => Promise<boolean>;
  addSalesEntry: (input: Omit<SalesEntry, 'id' | 'createdBy' | 'createdAt'>) => Promise<boolean>;
  deleteSalesEntry: (id: string) => Promise<boolean>;
  addReferral: (input: Pick<Referral, 'referredBy' | 'clientName'>) => Promise<boolean>;
  setReferralStatus: (id: string, status: ReferralStatus) => Promise<boolean>;
  saveLedgerAccount: (id: string | null, input: Pick<LedgerAccount, 'name' | 'amount'> & Partial<Pick<LedgerAccount, 'kind' | 'method'>>) => Promise<boolean>;
  deleteLedgerAccount: (id: string) => Promise<boolean>;
  takeOverConversation: (id: string) => Promise<boolean>;
  endTakeover: (id: string) => Promise<boolean>;

  // Quotations
  requestQuotation: (vehicleId: string, req: { method: 'cash' | 'financing'; downPayment: number; termMonths: number; note: string }) => Promise<Quotation | undefined>;
  saveQuotation: (id: string, changes: Partial<Quotation>, send: boolean) => Promise<Quotation | undefined>;

  // Commissions
  payCommission: (id: string, proof: File) => Promise<boolean>;

  // Messaging
  startOrOpenConversation: (vehicleId: string) => Promise<string>;
  // A new message to the client's agent: about a listing, or a general question ('' vehicle). Returns the chat id.
  writeToAgent: (vehicleId: string, text: string) => Promise<string>;
  sendMessage: (conversationId: string, text: string) => Promise<boolean>;
  sendApplyLink: (conversationId: string, vehicleId: string) => Promise<boolean>;
  applyThroughAgent: (vehicleId: string, agentSlug: string) => void;
  markConversationRead: (conversationId: string) => void;

  // Notifications
  markNotificationRead: (id: string) => void;
  clearAllNotifications: () => void;

  // Listings
  createVehicleListing: (vehicleData: Partial<Vehicle>) => Promise<Vehicle | undefined>;
  updateVehicleListing: (id: string, updates: Partial<Vehicle>) => Promise<boolean>;
  deleteVehicleListing: (id: string) => Promise<boolean>;
  setVehicleStatus: (id: string, status: VehicleStatus) => Promise<boolean>;
  submitListingRequest: (req: Pick<ListingRequest, 'type' | 'vehicleId' | 'vehicleTitle' | 'changes' | 'note'>) => Promise<boolean>;
  decideListingRequest: (id: string, approve: boolean, reason?: string) => Promise<boolean>;
  adminResolveReport: (reportId: string, action: 'dismiss' | 'unpublish_vehicle') => Promise<boolean>;

  // Leads
  // Both return the chat with that client (started with the agent's introduction when there was none).
  claimLead: (clientId: string) => Promise<string | null>;
  openClientChat: (clientId: string) => Promise<string | null>;
  assignLead: (clientId: string, agentName: string | null) => Promise<boolean>;
  unlockLead: (clientId: string) => Promise<boolean>;

  // Accounting
  addExpense: (v: VoucherInput) => Promise<Expense | undefined>;

  // Accounts (admin)
  createAccount: (a: { name: string; email: string; role: 'seller' | 'admin'; password: string; phone?: string }) => Promise<boolean>;
  resetPassword: (userId: string, password: string) => Promise<boolean>;
  changeEmail: (userId: string, email: string) => Promise<boolean>;
  setAccountActive: (userId: string, active: boolean) => Promise<boolean>;
}

const defaultFilters: FilterState = {
  searchQuery: '',
  category: 'all',
  brand: 'all',
  condition: 'all',
  transmission: 'all',
  fuel: 'all',
  minPrice: 0,
  maxPrice: 20000000,
  minYear: 2018,
  maxYear: 2026,
  location: 'all',
  sortBy: 'recommended',
};

const AppContext = createContext<AppContextType | undefined>(undefined);

// Buyer links like /?vehicle=v-123 open straight on that listing (used by Share and the portals).
const params = new URLSearchParams(window.location.search);
const linkedVehicleId = PORTAL === 'buyer' ? params.get('vehicle') : null;
// An agent's share link (?agent=carlo-santos) is remembered on this browser and sent with the client's first
// message, application or quotation request; the server decides whether it applies.
const REF_KEY = 'gb_ref_agent';
if (PORTAL === 'buyer' && params.get('agent')) {
  try {
    localStorage.setItem(REF_KEY, params.get('agent')!.toLowerCase());
  } catch {}
}
const takeRef = () => {
  try {
    return localStorage.getItem(REF_KEY) || undefined;
  } catch {
    return undefined;
  }
};
const clearRef = () => {
  try {
    localStorage.removeItem(REF_KEY);
  } catch {}
};
// An agent's apply link in the chat: the application for that vehicle is sent as through that agent (it locks the client to them).
const VIA_KEY = 'gb_apply_via';
const takeVia = (vehicleId: string) => {
  try {
    const v = JSON.parse(localStorage.getItem(VIA_KEY) || 'null');
    return v?.vehicleId === vehicleId ? (v.agent as string) : undefined;
  } catch {
    return undefined;
  }
};
// The re-submission email links to /?resubmit=<application id>: open that application in My Applications.
const linkedApplicationId = PORTAL === 'buyer' ? params.get('resubmit') : null;
// The reservation email links to /?infosheet=<application id>: open the information sheet form.
const linkedSheetId = PORTAL === 'buyer' ? params.get('infosheet') : null;
// Direct links to the info pages: /?page=privacy, /?page=terms, /?page=help, /?page=permits.
const linkedPage = PORTAL === 'buyer' ? (['privacy', 'terms', 'help', 'permits'] as const).find((p) => p === params.get('page')) : undefined;
const startView: CurrentView = PORTAL === 'seller' ? 'seller' : PORTAL === 'admin' ? 'admin' : linkedSheetId ? 'info_sheet' : linkedApplicationId ? 'account' : linkedVehicleId ? 'vehicle_detail' : linkedPage ?? 'marketplace';

const EMPTY: ServerState = { me: null, vehicles: [] };

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Navigation
  const [currentView, setCurrentView] = useState<CurrentView>(startView);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(linkedVehicleId);
  const [selectedGuideSlug, setSelectedGuideSlug] = useState<string | null>(null);
  const [accountTab, setAccountTab] = useState<AccountTab>(linkedApplicationId ? 'applications' : 'profile');
  const [sellerTab, setSellerTab] = useState<SellerTab>('dashboard');
  const [adminTab, setAdminTab] = useState<AdminTab>('dashboard');
  const [selectedQuotationId, setSelectedQuotationId] = useState<string | null>(null);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(linkedSheetId ?? linkedApplicationId);

  // Modals
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [reportModalVehicle, setReportModalVehicle] = useState<Vehicle | null>(null);
  const [pendingAction, setPendingAction] = useState<{ type: 'apply' | 'save' | 'message'; vehicleId: string } | null>(null);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const showToast = useCallback((title: string, message?: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; // two toasts can land in the same millisecond
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500);
  }, []);
  const dismissToast = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  // ----- Server data -----
  const [data, setData] = useState<ServerState>(EMPTY);
  const [ready, setReady] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const loading = useRef<Promise<void> | null>(null);

  const refresh = useCallback(async () => {
    // One fetch at a time; a change announced mid-fetch triggers one more.
    if (loading.current) {
      await loading.current;
    }
    const p = (async () => {
      try {
        setData(await api<ServerState>('/state'));
        setServerError(null);
      } catch (e) {
        setServerError(e instanceof ApiError ? e.message : 'Cannot reach the server.');
      } finally {
        setReady(true);
      }
    })();
    loading.current = p;
    await p;
    loading.current = null;
  }, []);

  // Live updates: the server announces every change; each open portal refetches what it may see.
  useEffect(() => {
    refresh();
    const events = new EventSource('/api/events');
    let timer: number | undefined;
    events.addEventListener('change', () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(refresh, 80);
    });
    events.onopen = () => refresh(); // catch up after a reconnect
    return () => {
      events.close();
      window.clearTimeout(timer);
    };
  }, [refresh]);

  const currentUser = data.me;

  // Runs a server action: refreshes the data after it, toasts success, and turns refusals into an error toast.
  const run = async <T,>(fn: () => Promise<T>, ok?: [string, string?], failTitle = 'Could not save'): Promise<T | undefined> => {
    try {
      const out = await fn();
      await refresh();
      if (ok) showToast(ok[0], ok[1]);
      return out;
    } catch (e) {
      showToast(failTitle, e instanceof Error ? e.message : 'Please try again.', 'error');
      if (e instanceof ApiError && e.status === 401) refresh();
      return undefined;
    }
  };
  const done = (x: unknown) => x !== undefined;

  // Navigate handler with window scroll to top
  const navigateTo: AppContextType['navigateTo'] = (view, params) => {
    const apply = (scroll: ScrollBehavior) => {
      setCurrentView(view);
      if (params?.vehicleId) setSelectedVehicleId(params.vehicleId);
      if (params?.guideSlug) setSelectedGuideSlug(params.guideSlug);
      if (params?.accountTab) setAccountTab(params.accountTab);
      if (params?.sellerTab) setSellerTab(params.sellerTab);
      if (params?.adminTab) setAdminTab(params.adminTab);
      if (params && 'quotationId' in params) setSelectedQuotationId(params.quotationId ?? null);
      if (params && 'applicationId' in params) setSelectedApplicationId(params.applicationId ?? null);
      window.scrollTo({ top: 0, behavior: scroll });
    };
    // Switching tabs inside the same page swaps only the panel; a whole-page transition there reads as a blink.
    if (view === currentView) return apply('instant');
    // View Transitions crossfade the swap (styles in index.css); older browsers just swap.
    const doc = document as Document & { startViewTransition?: (update: () => void) => { ready: Promise<void> } };
    // A hidden tab can't run a transition (the browser rejects it), so it just swaps.
    if (doc.startViewTransition && !document.hidden) doc.startViewTransition(() => flushSync(() => apply('instant'))).ready.catch(() => {});
    else apply('smooth');
  };

  // ----- Auth -----
  const afterSignIn = (name: string, title: string) => {
    setAuthModalOpen(false);
    showToast(title, `Welcome, ${name}!`);
    const action = pendingAction;
    setPendingAction(null);
    if (!action) return;
    if (action.type === 'apply') navigateTo('apply', { vehicleId: action.vehicleId });
    else if (action.type === 'save') {
      toggleSave(action.vehicleId, true);
      navigateTo('vehicle_detail', { vehicleId: action.vehicleId });
    } else if (action.type === 'message') {
      startOrOpenConversation(action.vehicleId).then((id) => {
        if (!id) return;
        setActiveConversationId(id);
        navigateTo('account', { accountTab: 'messages' });
      });
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const user = await api<UserProfile>('/auth/login', { body: { email, password } });
      await refresh();
      afterSignIn(user.name, 'Signed in');
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : 'Could not sign in.';
    }
  };

  const googleSignIn = async (credential: string) => {
    try {
      const user = await api<UserProfile & { created: boolean }>('/auth/google', { body: { credential } });
      await refresh();
      afterSignIn(user.name, user.created ? 'Account created' : 'Signed in');
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : 'Could not sign in with Google.';
    }
  };

  const register = async (name: string, email: string, phone: string, password: string) => {
    try {
      const user = await api<UserProfile>('/auth/register', { body: { name, email, phone, password } });
      await refresh();
      afterSignIn(user.name, 'Account created');
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : 'Could not create the account.';
    }
  };

  const logout = async () => {
    try {
      await api('/auth/logout', { body: {} });
    } catch {}
    await refresh();
    setCurrentView(PORTAL === 'buyer' ? 'marketplace' : PORTAL);
    showToast('Signed out', 'You have been signed out.');
  };

  const updateProfile: AppContextType['updateProfile'] = async (changes) =>
    done(await run(() => api('/me', { method: 'PATCH', body: changes }), ['Profile saved', 'Your details were updated.']));

  const changePassword = async (current: string, next: string) =>
    done(await run(() => api('/me/password', { body: { current, next } }), ['Password changed', 'Use your new password next time you sign in.']));

  // ----- Browsing (filters stay in the browser) -----
  const [comparedVehicleIds, setComparedVehicleIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('gb_compare_ids') || '[]');
    } catch {
      return [];
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem('gb_compare_ids', JSON.stringify(comparedVehicleIds));
    } catch {}
  }, [comparedVehicleIds]);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => setFilters((prev) => ({ ...prev, [key]: value }));
  const resetFilters = () => setFilters(defaultFilters);

  const vehicles = data.vehicles;
  const availableBrands = useMemo(() => ['all', ...Array.from(new Set(vehicles.map((v) => v.brand))).sort()], [vehicles]);

  const filteredVehicles = useMemo(
    () =>
      vehicles
        .filter((v) => {
          if (currentView === 'deals' && !v.isDeal) return false;
          // The marketplace lists active cars only, for every role.
          if (v.status === 'unpublished' || v.status === 'sold') return false;
          if (filters.searchQuery.trim()) {
            const q = filters.searchQuery.toLowerCase();
            if (![v.title, v.brand, v.model, v.location, v.category].some((s) => s.toLowerCase().includes(q))) return false;
          }
          if (filters.category !== 'all' && v.category !== filters.category) return false;
          if (filters.brand !== 'all' && v.brand.toLowerCase() !== filters.brand.toLowerCase()) return false;
          if (filters.condition !== 'all' && v.condition !== filters.condition) return false;
          if (filters.transmission !== 'all' && v.transmission !== filters.transmission) return false;
          if (filters.fuel !== 'all' && v.fuel !== filters.fuel) return false;
          if (v.price < filters.minPrice || v.price > filters.maxPrice) return false;
          if (v.year < filters.minYear || v.year > filters.maxYear) return false;
          if (filters.location !== 'all') {
            const loc = filters.location.toLowerCase();
            if (!v.location.toLowerCase().includes(loc) && !v.province.toLowerCase().includes(loc)) return false;
          }
          return true;
        })
        .sort((a, b) => {
          switch (filters.sortBy) {
            case 'newest':
              return b.year - a.year || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            case 'price_asc':
              return a.price - b.price;
            case 'price_desc':
              return b.price - a.price;
            case 'mileage_asc':
              return a.mileage - b.mileage;
            case 'mileage_desc':
              return b.mileage - a.mileage;
            default:
              return (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || b.viewsCount - a.viewsCount;
          }
        }),
    [vehicles, filters, currentView]
  );

  // Saved and recently viewed live on the client's account, so they follow them to any device.
  const isVehicleSaved = (id: string) => !!currentUser?.savedVehicleIds?.includes(id);
  const toggleSave = (id: string, forceSave = false) => {
    if (!currentUser) return;
    const saved = currentUser.savedVehicleIds?.includes(id);
    if (saved && forceSave) return;
    const savedVehicleIds = saved ? currentUser.savedVehicleIds.filter((v) => v !== id) : [...(currentUser.savedVehicleIds ?? []), id];
    setData((d) => (d.me ? { ...d, me: { ...d.me, savedVehicleIds } } : d)); // show it right away
    run(() => api('/me', { method: 'PATCH', body: { savedVehicleIds } }), saved ? ['Removed from saved'] : ['Saved', 'Find it under Saved Vehicles.']);
  };
  const toggleSaveVehicle = (id: string) => {
    if (!currentUser) {
      setPendingAction({ type: 'save', vehicleId: id });
      setAuthModalOpen(true);
      return;
    }
    toggleSave(id);
  };
  const addRecentlyViewed = (id: string) => {
    if (!currentUser || currentUser.recentlyViewedIds?.[0] === id) return;
    const recentlyViewedIds = [id, ...(currentUser.recentlyViewedIds ?? []).filter((v) => v !== id)].slice(0, 10);
    setData((d) => (d.me ? { ...d, me: { ...d.me, recentlyViewedIds } } : d));
    api('/me', { method: 'PATCH', body: { recentlyViewedIds } }).catch(() => {});
  };

  const toggleCompareVehicle = (id: string) => {
    if (comparedVehicleIds.includes(id)) {
      setComparedVehicleIds((prev) => prev.filter((vid) => vid !== id));
      showToast('Removed from Comparison', 'Vehicle removed from your compare dock.');
      return;
    }
    if (comparedVehicleIds.length >= 4) {
      showToast('Limit Reached', 'You can compare up to 4 vehicles simultaneously.', 'info');
      setCompareModalOpen(true);
      return;
    }
    const v = vehicles.find((x) => x.id === id);
    setComparedVehicleIds((prev) => [...prev, id]);
    showToast('Added to Comparison', `${v ? v.title : 'Vehicle'} added (${comparedVehicleIds.length + 1}/4). Click Compare Now to review.`);
  };
  const isInCompare = (id: string) => comparedVehicleIds.includes(id);
  const clearCompare = () => {
    setComparedVehicleIds([]);
    showToast('Comparison Cleared', 'All vehicles removed from comparison.');
  };

  const submitReport: AppContextType['submitReport'] = async (r) => {
    const out = await run(() => api('/reports', { body: r }), ['Report sent', 'Thank you. Our team will review this listing.'], 'Could not send the report');
    if (done(out)) setReportModalVehicle(null);
    return done(out);
  };

  // ----- Applications -----
  const createApplication: AppContextType['createApplication'] = async (input) => {
    const app = await run(() => api<VehicleApplication>('/applications', { body: { ...input, ref: takeRef(), viaAgent: takeVia(input.vehicleId) } }), undefined, 'Could not send the application');
    if (app) {
      clearRef();
      try {
        localStorage.removeItem(VIA_KEY);
      } catch {}
      showToast('Application submitted', `Reference no. ${app.referenceNo}`);
    }
    return app;
  };
  const updateApplicationStatus: AppContextType['updateApplicationStatus'] = async (id, status, note, commission) =>
    done(await run(() => api(`/applications/${id}/status`, { body: { status, note, commission } }), ['Application updated', `Now ${status.replace('_', ' ')}.`]));
  const reserveApplication: AppContextType['reserveApplication'] = (id, payment, screenshot) =>
    run(async () => {
      const up = screenshot ? await uploadFile(screenshot, screenshot.name || 'payment.jpg', 'private') : undefined;
      return api<PaymentReceipt>(`/applications/${id}/reserve`, { body: { ...payment, fileId: up?.id } });
    }, ['Vehicle reserved', 'The reservation AR was released and the client was asked to fill in the information sheet.'], 'Could not reserve');
  const submitInfoSheet: AppContextType['submitInfoSheet'] = async (id, sheet, sketch) =>
    done(
      await run(async () => {
        const up = sketch ? await uploadFile(sketch, sketch.name || 'sketch.jpg', 'private') : undefined;
        return api(`/applications/${id}/info-sheet`, { body: { ...sheet, sketchFileId: up?.id } });
      }, ['Information sheet sent', 'Your application is now processing.'], 'Could not send the information sheet')
    );
  const releaseVehicle: AppContextType['releaseVehicle'] = async (id, commission, orcr) =>
    done(await run(async () => {
      const up = await uploadFile(orcr, orcr.name || 'or-cr', 'private');
      return api(`/applications/${id}/release`, { body: { orcrConfirmed: true, commission, orcrFileId: up.id } });
    }, ['Vehicle released', 'The sale is complete; the agent’s full commission is now payable.']));
  const withdrawApplication = async (id: string) =>
    done(await run(() => api(`/applications/${id}/status`, { body: { status: 'withdrawn' } }), ['Application withdrawn', 'Your application has been canceled.']));
  const reviewDocument: AppContextType['reviewDocument'] = async (appId, i, approve, reason) =>
    done(await run(() => api(`/applications/${appId}/documents/${i}/review`, { body: { approve, reason } })));
  const attachDocumentForClient: AppContextType['attachDocumentForClient'] = async (appId, i, file) =>
    done(
      await run(async () => {
        const up = await uploadFile(file, file.name, 'private');
        return api(`/applications/${appId}/documents/${i}/file`, { body: { fileId: up.id } });
      }, ['Document uploaded', 'It is now waiting for review.'], 'Could not upload')
    );
  const resubmitDocument: AppContextType['resubmitDocument'] = async (appId, i, file) =>
    done(
      await run(async () => {
        const up = await uploadFile(file, file.name, 'private');
        return api(`/applications/${appId}/documents/${i}/resubmit`, { body: { fileId: up.id } });
      }, ['New copy sent', 'The admin team will review it.'], 'Could not upload')
    );
  const recordPartialPayment: AppContextType['recordPartialPayment'] = (appId, amount, description, screenshot, remarks) =>
    run(async () => {
      const up = screenshot ? await uploadFile(screenshot, screenshot.name || 'payment.jpg', 'private') : undefined;
      return api<PaymentReceipt>(`/applications/${appId}/payments`, { body: { amount, description, remarks, fileId: up?.id } });
    }, undefined, 'Could not record the payment').then((r) => {
      if (r) showToast('Payment confirmed', `Acknowledgement receipt ${r.arNo} was released.`);
      return r;
    });

  const updatePayment: AppContextType['updatePayment'] = (appId, arNo, changes, screenshot) =>
    run(async () => {
      const up = screenshot ? await uploadFile(screenshot, screenshot.name || 'payment.jpg', 'private') : undefined;
      return api<PaymentReceipt>(`/applications/${appId}/payments/${encodeURIComponent(arNo)}`, { method: 'PATCH', body: { ...changes, fileId: up?.id } });
    }, ['Receipt updated', `AR ${arNo} was saved.`], 'Could not save the receipt');
  const deletePayment = async (appId: string, arNo: string) =>
    done(await run(() => api(`/applications/${appId}/payments/${encodeURIComponent(arNo)}`, { method: 'DELETE' }), ['Receipt deleted', `AR ${arNo} was removed.`]));

  // ----- Acknowledgement receipts written by hand, and sales entered by hand -----
  const saveReceipt: AppContextType['saveReceipt'] = (id, input, file) =>
    run(async () => {
      const up = file ? await uploadFile(file, file.name, 'private') : undefined;
      const body = { ...input, fileId: up?.id };
      return id ? api<ManualReceipt>(`/receipts/${id}`, { method: 'PATCH', body }) : api<ManualReceipt>('/receipts', { body });
    }, id ? ['Receipt updated'] : ['Receipt released', 'It has the next AR number.'], 'Could not save the receipt');
  const deleteReceipt = async (id: string) => done(await run(() => api(`/receipts/${id}`, { method: 'DELETE' }), ['Receipt deleted']));
  const addSalesEntry: AppContextType['addSalesEntry'] = async (input) => done(await run(() => api('/sales-entries', { body: input }), ['Sale added', 'It is now in the sales report.']));
  const saveLedgerAccount: AppContextType['saveLedgerAccount'] = async (id, input) =>
    done(await run(() => (id ? api(`/ledger-accounts/${id}`, { method: 'PATCH', body: input }) : api('/ledger-accounts', { body: input })), [id ? 'Account saved' : 'Account added']));
  const deleteLedgerAccount = async (id: string) => done(await run(() => api(`/ledger-accounts/${id}`, { method: 'DELETE' }), ['Account deleted']));
  const addReferral: AppContextType['addReferral'] = async (input) => done(await run(() => api('/referrals', { body: input }), ['Referral added']));
  const setReferralStatus: AppContextType['setReferralStatus'] = async (id, status) => done(await run(() => api(`/referrals/${id}/status`, { body: { status } }), ['Referral updated', `Now ${status}.`]));
  const deleteSalesEntry = async (id: string) => done(await run(() => api(`/sales-entries/${id}`, { method: 'DELETE' }), ['Sale removed']));

  // ----- Quotations -----
  const requestQuotation: AppContextType['requestQuotation'] = async (vehicleId, req) => {
    const q = await run(() => api<Quotation>('/quotations', { body: { vehicleId, ...req, ref: takeRef() } }), ['Quotation requested', 'The admin team will send it to My Quotations.'], 'Could not request a quotation');
    if (q) clearRef();
    return q;
  };
  const saveQuotation: AppContextType['saveQuotation'] = (id, changes, send) =>
    run(() => api<Quotation>(`/quotations/${id}`, { method: 'PATCH', body: { changes, send } }), send ? ['Quotation sent', 'The client can see it in My Quotations.'] : ['Draft saved', 'The client will see it once you send it.']);

  // ----- Commissions -----
  const payCommission = async (id: string, proof: File) =>
    done(
      await run(async () => {
        const up = await uploadFile(proof, proof.name, 'private');
        return api(`/commissions/${id}/pay`, { body: { fileId: up.id } });
      }, ['Commission paid', 'The agent was notified and can download the receipt.'])
    );

  // ----- Chat -----
  const startOrOpenConversation = async (vehicleId: string) => {
    const existing = data.conversations?.find((c) => c.vehicleId === vehicleId && c.buyerId === currentUser?.id);
    if (existing) return existing.id;
    const conv = await run(() => api<Conversation>('/conversations', { body: { vehicleId, ref: takeRef() } }), undefined, 'Could not start the chat');
    if (conv) clearRef();
    return conv?.id ?? '';
  };
  const writeToAgent = async (vehicleId: string, text: string) => {
    const conv = await run(() => api<Conversation>('/conversations', { body: { vehicleId, text, ref: takeRef() } }), ['Message sent'], 'Message not sent');
    if (conv) clearRef();
    return conv?.id ?? '';
  };
  const sendMessage = async (conversationId: string, text: string) =>
    done(await run(() => api(`/conversations/${conversationId}/messages`, { body: { text } }), undefined, 'Message not sent'));
  const sendApplyLink = async (conversationId: string, vehicleId: string) =>
    done(await run(() => api(`/conversations/${conversationId}/messages`, { body: { applyVehicleId: vehicleId } }), ['Apply link sent', 'Once the client applies through it, they are locked to you.'], 'Link not sent'));
  const applyThroughAgent = (vehicleId: string, agentSlug: string) => {
    try {
      localStorage.setItem(VIA_KEY, JSON.stringify({ vehicleId, agent: agentSlug }));
    } catch {}
    navigateTo('apply', { vehicleId });
  };
  const takeOverConversation = async (id: string) =>
    done(await run(() => api(`/conversations/${id}/takeover`, { body: {} }), ['Chat taken over', 'You can now reply to the client.']));
  const endTakeover = async (id: string) => done(await run(() => api(`/conversations/${id}/end-takeover`, { body: {} }), ['Handed back', 'The agent answers this chat again.']));
  const markConversationRead = (conversationId: string) => {
    const field = PORTAL === 'seller' ? 'unreadSeller' : 'unreadBuyer';
    setData((d) => ({ ...d, conversations: d.conversations?.map((c) => (c.id === conversationId ? { ...c, [field]: 0 } : c)) }));
    api(`/conversations/${conversationId}/read`, { body: {} }).catch(() => {});
  };

  // ----- Notifications -----
  const markNotificationRead = (id: string) => {
    setData((d) => ({ ...d, notifications: d.notifications?.map((n) => (n.id === id ? { ...n, read: true } : n)) }));
    api(`/notifications/${id}/read`, { body: {} }).catch(() => {});
  };
  const clearAllNotifications = () => {
    run(() => api('/notifications/clear', { body: {} }), ['Notifications cleared']);
  };

  // ----- Listings -----
  const createVehicleListing = (v: Partial<Vehicle>) =>
    run(() => api<Vehicle>('/vehicles', { body: v }), v.status === 'unpublished' ? ['Listing saved', 'It is hidden until you approve it.'] : ['Listing published', `${v.title} is now on the marketplace.`]);
  const updateVehicleListing = async (id: string, updates: Partial<Vehicle>) =>
    done(await run(() => api(`/vehicles/${id}`, { method: 'PATCH', body: updates }), ['Listing updated']));
  const deleteVehicleListing = async (id: string) => done(await run(() => api(`/vehicles/${id}`, { method: 'DELETE' }), ['Listing deleted', 'It was removed from the marketplace.']));
  const setVehicleStatus = async (id: string, status: VehicleStatus) => {
    const label = { available: 'approved', reserved: 'reserved', sold: 'released', unpublished: 'disapproved' }[status];
    return done(await run(() => api(`/vehicles/${id}/status`, { body: { status } }), ['Listing status updated', `The listing is now ${label}.`]));
  };
  const submitListingRequest: AppContextType['submitListingRequest'] = async (req) =>
    done(await run(() => api('/listing-requests', { body: req }), ['Request sent', 'The admin team will review it.']));
  const decideListingRequest = async (id: string, approve: boolean, reason?: string) =>
    done(await run(() => api(`/listing-requests/${id}/decide`, { body: { approve, reason } }), [approve ? 'Request approved' : 'Request rejected', 'The agent was notified.']));
  const adminResolveReport = async (reportId: string, action: 'dismiss' | 'unpublish_vehicle') =>
    done(await run(() => api(`/reports/${reportId}/resolve`, { body: { action } }), ['Report resolved', action === 'dismiss' ? 'Dismissed.' : 'The listing was hidden.']));

  // ----- Leads -----
  const claimLead = async (clientId: string) =>
    (await run(() => api<{ conversationId?: string }>(`/leads/${encodeURIComponent(clientId)}/claim`, { body: {} }), ['Client claimed', 'Your introduction was sent. Say hello in the chat.'], 'Could not claim'))?.conversationId ?? null;
  const openClientChat = async (clientId: string) =>
    (await run(() => api<{ conversationId?: string }>(`/leads/${encodeURIComponent(clientId)}/conversation`, { body: {} }), undefined, 'Could not open the chat'))?.conversationId ?? null;
  const unlockLead = async (clientId: string) =>
    done(await run(() => api(`/leads/${clientId}/unlock`, { body: {} }), ['Client unlocked', 'You can now reassign them.']));
  const assignLead = async (clientId: string, agentName: string | null) =>
    done(await run(() => api(`/leads/${encodeURIComponent(clientId)}/assign`, { body: { agentName } }), agentName ? ['Client reassigned', `Now with ${agentName}.`] : ['Back in Open leads', 'Any agent can claim them.']));

  // ----- Accounting -----
  const addExpense: AppContextType['addExpense'] = async (v) => {
    const e = await run(() => api<Expense>('/vouchers', { body: v }));
    if (e) showToast(e.kind === 'credit' ? 'Credit entry saved' : 'Expense saved', `${e.voucherNo} for ₱${e.total.toLocaleString()} · ${e.payee}.`);
    return e;
  };

  // ----- Accounts -----
  const createAccount: AppContextType['createAccount'] = async (a) =>
    done(await run(() => api('/users', { body: a }), ['Account created', `${a.name} can now sign in.`], 'Could not create the account'));
  const changeEmail = async (userId: string, email: string) =>
    done(await run(() => api(`/users/${userId}/email`, { body: { email } }), ['Email changed', 'They sign in with the new email from now on.']));
  const resetPassword = async (userId: string, password: string) =>
    done(await run(() => api(`/users/${userId}/password`, { body: { password } }), ['Password reset', 'Share it with them privately; they must set their own when they next sign in.']));
  const setAccountActive = async (userId: string, active: boolean) =>
    done(await run(() => api(`/users/${userId}/active`, { body: { active } }), [active ? 'Account enabled' : 'Account disabled']));

  return (
    <AppContext.Provider
      value={{
        currentView,
        selectedVehicleId,
        selectedGuideSlug,
        accountTab,
        sellerTab,
        adminTab,
        navigateTo,
        selectedQuotationId,
        selectedApplicationId,

        ready,
        serverError,
        refresh,

        authModalOpen,
        setAuthModalOpen,
        reportModalVehicle,
        setReportModalVehicle,

        toasts,
        showToast,
        dismissToast,

        vehicles,
        guides: GUIDES,
        applications: data.applications ?? [],
        conversations: data.conversations ?? [],
        activeConversationId,
        setActiveConversationId,
        reports: data.reports ?? [],
        commissions: data.commissions ?? [],
        listingRequests: data.listingRequests ?? [],
        expenses: data.expenses ?? [],
        credits: data.credits ?? [],
        quotations: data.quotations ?? [],
        receipts: data.receipts ?? [],
        salesEntries: data.salesEntries ?? [],
        ledgerAccounts: data.ledgerAccounts ?? [],
        referrals: data.referrals ?? [],
        leads: data.leads ?? [],
        notifications: data.notifications ?? [],
        agents: data.agents ?? [],
        accounts: data.users ?? [],
        myAgent: data.myAgent ?? null,

        currentUser,
        isAuthenticated: !!currentUser,
        login,
        googleSignIn,
        googleClientId: data.googleClientId ?? null,
        register,
        logout,
        updateProfile,
        changePassword,

        pendingAction,
        setPendingAction,

        filters,
        setFilters,
        updateFilter,
        resetFilters,
        filteredVehicles,
        availableBrands,

        toggleSaveVehicle,
        isVehicleSaved,
        addRecentlyViewed,
        submitReport,

        comparedVehicleIds,
        toggleCompareVehicle,
        isInCompare,
        clearCompare,
        compareModalOpen,
        setCompareModalOpen,

        createApplication,
        updateApplicationStatus,
        reserveApplication,
        submitInfoSheet,
        releaseVehicle,
        withdrawApplication,
        reviewDocument,
        attachDocumentForClient,
        resubmitDocument,
        recordPartialPayment,
        updatePayment,
        deletePayment,
        saveReceipt,
        deleteReceipt,
        addSalesEntry,
        deleteSalesEntry,
        addReferral,
        setReferralStatus,
        saveLedgerAccount,
        deleteLedgerAccount,
        takeOverConversation,
        endTakeover,

        requestQuotation,
        saveQuotation,

        payCommission,

        startOrOpenConversation,
        writeToAgent,
        sendMessage,
        sendApplyLink,
        applyThroughAgent,
        markConversationRead,

        markNotificationRead,
        clearAllNotifications,

        createVehicleListing,
        updateVehicleListing,
        deleteVehicleListing,
        setVehicleStatus,
        submitListingRequest,
        decideListingRequest,
        adminResolveReport,

        claimLead,
        openClientChat,
        assignLead,
        unlockLead,

        addExpense,

        createAccount,
        resetPassword,
        changeEmail,
        setAccountActive,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
