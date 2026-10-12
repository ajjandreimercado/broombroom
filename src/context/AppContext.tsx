import { PORTAL } from '../portals.ts';
import { flushSync } from 'react-dom';
import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import {
  Vehicle,
  VehicleCategory,
  VehicleCondition,
  TransmissionType,
  FuelType,
  VehicleStatus,
  VehicleApplication,
  ApplicationStatus,
  Conversation,
  UserProfile,
  Guide,
  VehicleReport,
  AppNotification,
} from '../types.ts';
import {
  INITIAL_VEHICLES,
  INITIAL_GUIDES,
  INITIAL_USER,
  INITIAL_APPLICATIONS,
  INITIAL_CONVERSATIONS,
  INITIAL_NOTIFICATIONS,
  INITIAL_REPORTS,
  generateVehicleSvg,
} from '../data/mockData.ts';

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
  | 'notifications';

export type SellerTab =
  | 'dashboard'
  | 'sales_report'
  | 'vehicles'
  | 'add_vehicle'
  | 'applications'
  | 'messages'
  | 'profile_settings';

export type AdminTab =
  | 'dashboard'
  | 'vehicles'
  | 'sellers'
  | 'applications'
  | 'reports'
  | 'categories';

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
    }
  ) => void;

  // Modals
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  reportModalVehicle: Vehicle | null;
  setReportModalVehicle: (v: Vehicle | null) => void;

  // Toasts
  toasts: ToastMessage[];
  showToast: (title: string, message?: string, type?: 'success' | 'info' | 'error') => void;
  dismissToast: (id: string) => void;

  // Data State
  vehicles: Vehicle[];
  guides: Guide[];
  applications: VehicleApplication[];
  conversations: Conversation[];
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  reports: VehicleReport[];
  notifications: AppNotification[];

  // User & Auth
  currentUser: UserProfile | null;
  isAuthenticated: boolean;
  login: (email: string, role?: 'buyer' | 'seller' | 'admin') => void;
  register: (name: string, email: string, phone: string) => void;
  logout: () => void;
  switchRole: (role: 'buyer' | 'seller' | 'admin') => void;

  // Pending action preservation
  pendingAction: {
    type: 'apply' | 'save' | 'message';
    vehicleId: string;
  } | null;
  setPendingAction: (action: { type: 'apply' | 'save' | 'message'; vehicleId: string } | null) => void;
  executePendingActionIfAny: () => void;

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
  submitReport: (report: Omit<VehicleReport, 'id' | 'createdAt' | 'status'>) => void;

  // Vehicle Comparison (Buyer Role)
  comparedVehicleIds: string[];
  toggleCompareVehicle: (id: string) => void;
  isInCompare: (id: string) => boolean;
  clearCompare: () => void;
  compareModalOpen: boolean;
  setCompareModalOpen: (open: boolean) => void;

  // Applications
  createApplication: (appData: Omit<VehicleApplication, 'id' | 'referenceNo' | 'submittedAt' | 'status'>) => VehicleApplication;
  updateApplicationStatus: (id: string, status: ApplicationStatus, sellerNotes?: string) => void;
  withdrawApplication: (id: string) => void;

  // Messaging
  startOrOpenConversation: (vehicleId: string) => string;
  sendMessage: (conversationId: string, text: string) => void;
  markConversationRead: (conversationId: string) => void;

  // Notifications
  markNotificationRead: (id: string) => void;
  clearAllNotifications: () => void;

  // Seller Actions
  createVehicleListing: (vehicleData: Partial<Vehicle>) => Vehicle;
  updateVehicleListing: (id: string, updates: Partial<Vehicle>) => void;
  deleteVehicleListing: (id: string) => void;

  // Admin Actions
  adminApproveVehicle: (id: string) => void;
  adminUnpublishVehicle: (id: string) => void;
  adminDeleteVehicle: (id: string) => void;
  adminResolveReport: (reportId: string, action: 'dismiss' | 'unpublish_vehicle') => void;
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
const linkedVehicleId = PORTAL === 'buyer' ? new URLSearchParams(window.location.search).get('vehicle') : null;
const startView: CurrentView = PORTAL === 'seller' ? 'seller' : PORTAL === 'admin' ? 'admin' : linkedVehicleId ? 'vehicle_detail' : 'intro';

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Navigation
  const [currentView, setCurrentView] = useState<CurrentView>(startView);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(linkedVehicleId);
  const [selectedGuideSlug, setSelectedGuideSlug] = useState<string | null>(null);
  const [accountTab, setAccountTab] = useState<AccountTab>('profile');
  const [sellerTab, setSellerTab] = useState<SellerTab>('dashboard');
  const [adminTab, setAdminTab] = useState<AdminTab>('dashboard');

  // Modals
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [reportModalVehicle, setReportModalVehicle] = useState<Vehicle | null>(null);

  // Pending intent before auth
  const [pendingAction, setPendingAction] = useState<{
    type: 'apply' | 'save' | 'message';
    vehicleId: string;
  } | null>(null);

  // Toast notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (title: string, message?: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Core Data
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => {
    const saved = localStorage.getItem('gb_vehicles');
    if (!saved) return INITIAL_VEHICLES;
    try {
      const parsed: Vehicle[] = JSON.parse(saved);
      // Migrate legacy SVG data images to authentic photography from INITIAL_VEHICLES
      return parsed.map((pv) => {
        const init = INITIAL_VEHICLES.find((iv) => iv.id === pv.id);
        if (init && (pv.images?.[0]?.startsWith('data:image/svg') || !pv.images?.length)) {
          return { ...pv, images: init.images };
        }
        return pv;
      });
    } catch {
      return INITIAL_VEHICLES;
    }
  });

  const [guides] = useState<Guide[]>(INITIAL_GUIDES);

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('gb_user');
    const user: UserProfile | null = saved ? JSON.parse(saved) : PORTAL === 'buyer' ? INITIAL_USER : null;
    // Each portal only ever acts in its own role; portals start signed out.
    return user && PORTAL !== 'buyer' ? { ...user, role: PORTAL } : user;
  });

  const [applications, setApplications] = useState<VehicleApplication[]>(() => {
    const saved = localStorage.getItem('gb_applications');
    return saved ? JSON.parse(saved) : INITIAL_APPLICATIONS;
  });

  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const saved = localStorage.getItem('gb_conversations');
    return saved ? JSON.parse(saved) : INITIAL_CONVERSATIONS;
  });

  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const [reports, setReports] = useState<VehicleReport[]>(() => {
    const saved = localStorage.getItem('gb_reports');
    return saved ? JSON.parse(saved) : INITIAL_REPORTS;
  });

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const saved = localStorage.getItem('gb_notifications');
    return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
  });

  // Compare state (Buyer role)
  const [comparedVehicleIds, setComparedVehicleIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('gb_compare_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [compareModalOpen, setCompareModalOpen] = useState(false);

  // Filter state
  const [filters, setFilters] = useState<FilterState>(defaultFilters);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('gb_vehicles', JSON.stringify(vehicles));
    } catch {}
  }, [vehicles]);

  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem('gb_user', JSON.stringify(currentUser));
      } else {
        localStorage.removeItem('gb_user');
      }
    } catch {}
  }, [currentUser]);

  useEffect(() => {
    try {
      localStorage.setItem('gb_applications', JSON.stringify(applications));
    } catch {}
  }, [applications]);

  useEffect(() => {
    try {
      localStorage.setItem('gb_conversations', JSON.stringify(conversations));
    } catch {}
  }, [conversations]);

  useEffect(() => {
    try {
      localStorage.setItem('gb_reports', JSON.stringify(reports));
    } catch {}
  }, [reports]);

  useEffect(() => {
    try {
      localStorage.setItem('gb_notifications', JSON.stringify(notifications));
    } catch {}
  }, [notifications]);

  useEffect(() => {
    try {
      localStorage.setItem('gb_compare_ids', JSON.stringify(comparedVehicleIds));
    } catch {}
  }, [comparedVehicleIds]);

  // Navigate handler with window scroll to top
  const navigateTo: AppContextType['navigateTo'] = (view, params) => {
    const apply = (scroll: ScrollBehavior) => {
      setCurrentView(view);
      if (params?.vehicleId) setSelectedVehicleId(params.vehicleId);
      if (params?.guideSlug) setSelectedGuideSlug(params.guideSlug);
      if (params?.accountTab) setAccountTab(params.accountTab);
      if (params?.sellerTab) setSellerTab(params.sellerTab);
      if (params?.adminTab) setAdminTab(params.adminTab);
      window.scrollTo({ top: 0, behavior: scroll });
    };
    // View Transitions crossfade the swap (styles in index.css); older browsers just swap.
    const doc = document as Document & { startViewTransition?: (update: () => void) => unknown };
    if (doc.startViewTransition) doc.startViewTransition(() => flushSync(() => apply('instant')));
    else apply('smooth');
  };

  // Auth functions
  const login = (email: string, role: 'buyer' | 'seller' | 'admin' = PORTAL) => {
    const user: UserProfile = {
      ...INITIAL_USER,
      email,
      role,
      name: email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'Valued User',
    };
    setCurrentUser(user);
    setAuthModalOpen(false);
    showToast('Signed In', `Welcome back, ${user.name}!`);

    // Execute any pending action that requested authentication
    setTimeout(() => {
      executePendingActionIfAny();
    }, 100);
  };

  const register = (name: string, email: string, phone: string) => {
    const user: UserProfile = {
      id: `usr-${Date.now()}`,
      name,
      email,
      phone,
      role: PORTAL,
      address: {
        street: '',
        barangay: '',
        city: 'Metro Manila',
        province: 'Metro Manila',
        region: 'NCR',
        postalCode: '1000',
        country: 'Philippines',
      },
      savedVehicleIds: [],
      recentlyViewedIds: [],
      memberSince: 'October 2026',
    };
    setCurrentUser(user);
    setAuthModalOpen(false);
    showToast('Account Created', `Welcome to Groom Broom, ${name}!`);
    setTimeout(() => {
      executePendingActionIfAny();
    }, 100);
  };

  const logout = () => {
    setCurrentUser(null);
    setCurrentView(PORTAL === 'buyer' ? 'marketplace' : PORTAL);
    showToast('Signed Out', 'You have been logged out securely.');
  };

  const switchRole = (role: 'buyer' | 'seller' | 'admin') => {
    if (!currentUser) return;
    setCurrentUser({ ...currentUser, role });
    showToast('Switched Portal Role', `Now acting as ${role.toUpperCase()}`);
    if (role === 'seller') {
      navigateTo('seller', { sellerTab: 'dashboard' });
    } else if (role === 'admin') {
      navigateTo('admin', { adminTab: 'dashboard' });
    } else {
      navigateTo('marketplace');
    }
  };

  // Resume intent after login
  const executePendingActionIfAny = () => {
    if (!pendingAction) return;
    const { type, vehicleId } = pendingAction;
    setPendingAction(null);

    if (type === 'apply') {
      navigateTo('apply', { vehicleId });
      showToast('Resuming Application', 'Continuing with your vehicle purchase interest application.');
    } else if (type === 'save') {
      toggleSaveVehicle(vehicleId);
      navigateTo('vehicle_detail', { vehicleId });
    } else if (type === 'message') {
      const convId = startOrOpenConversation(vehicleId);
      setActiveConversationId(convId);
      navigateTo('account', { accountTab: 'messages' });
      showToast('Conversation Opened', 'You can now chat directly with the seller.');
    }
  };

  // Filter actions
  const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
  };

  // Extract all unique brands from inventory
  const availableBrands = useMemo(() => {
    const brands = new Set(vehicles.map((v) => v.brand));
    return ['all', ...Array.from(brands).sort()];
  }, [vehicles]);

  // Compute filtered & sorted vehicles
  const filteredVehicles = useMemo(() => {
    return vehicles
      .filter((v) => {
        // If on deals page, require isDeal
        if (currentView === 'deals' && !v.isDeal) return false;

        // Status check: regular users only see available/reserved
        if (currentUser?.role !== 'admin' && v.status === 'unpublished') return false;

        // Search Query
        if (filters.searchQuery.trim()) {
          const q = filters.searchQuery.toLowerCase();
          const matchTitle = v.title.toLowerCase().includes(q);
          const matchBrand = v.brand.toLowerCase().includes(q);
          const matchModel = v.model.toLowerCase().includes(q);
          const matchLoc = v.location.toLowerCase().includes(q);
          const matchCat = v.category.toLowerCase().includes(q);
          if (!matchTitle && !matchBrand && !matchModel && !matchLoc && !matchCat) {
            return false;
          }
        }

        // Category
        if (filters.category !== 'all' && v.category !== filters.category) return false;

        // Brand
        if (filters.brand !== 'all' && v.brand.toLowerCase() !== filters.brand.toLowerCase()) return false;

        // Condition
        if (filters.condition !== 'all' && v.condition !== filters.condition) return false;

        // Transmission
        if (filters.transmission !== 'all' && v.transmission !== filters.transmission) return false;

        // Fuel
        if (filters.fuel !== 'all' && v.fuel !== filters.fuel) return false;

        // Price
        if (v.price < filters.minPrice || v.price > filters.maxPrice) return false;

        // Year
        if (v.year < filters.minYear || v.year > filters.maxYear) return false;

        // Location
        if (filters.location !== 'all') {
          if (!v.location.toLowerCase().includes(filters.location.toLowerCase()) &&
              !v.province.toLowerCase().includes(filters.location.toLowerCase())) {
            return false;
          }
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
          case 'recommended':
          default:
            return (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || b.viewsCount - a.viewsCount;
        }
      });
  }, [vehicles, filters, currentView, currentUser]);

  // Saved vehicles
  const isVehicleSaved = (id: string) => {
    return !!currentUser?.savedVehicleIds.includes(id);
  };

  const toggleSaveVehicle = (id: string) => {
    if (!currentUser) {
      setPendingAction({ type: 'save', vehicleId: id });
      setAuthModalOpen(true);
      return;
    }

    const saved = currentUser.savedVehicleIds.includes(id);
    let updatedList: string[];
    if (saved) {
      updatedList = currentUser.savedVehicleIds.filter((vid) => vid !== id);
      showToast('Removed from Saved', 'Vehicle removed from your saved garage.');
    } else {
      updatedList = [...currentUser.savedVehicleIds, id];
      showToast('Saved to Garage', 'Vehicle added to your saved vehicles!');
    }
    setCurrentUser({ ...currentUser, savedVehicleIds: updatedList });
  };

  const addRecentlyViewed = (id: string) => {
    if (!currentUser) return;
    const current = currentUser.recentlyViewedIds || [];
    const filtered = current.filter((vid) => vid !== id);
    const updated = [id, ...filtered].slice(0, 10);
    setCurrentUser({ ...currentUser, recentlyViewedIds: updated });
  };

  // Compare Actions (Buyer Role)
  const toggleCompareVehicle = (id: string) => {
    if (comparedVehicleIds.includes(id)) {
      setComparedVehicleIds((prev) => prev.filter((vid) => vid !== id));
      showToast('Removed from Comparison', 'Vehicle removed from your compare dock.');
    } else {
      if (comparedVehicleIds.length >= 4) {
        showToast('Limit Reached', 'You can compare up to 4 vehicles simultaneously.', 'info');
        setCompareModalOpen(true);
        return;
      }
      const v = vehicles.find((x) => x.id === id);
      setComparedVehicleIds((prev) => [...prev, id]);
      showToast(
        'Added to Comparison',
        `${v ? v.title : 'Vehicle'} added (${comparedVehicleIds.length + 1}/4). Click Compare Now to review.`,
        'success'
      );
    }
  };

  const isInCompare = (id: string) => comparedVehicleIds.includes(id);

  const clearCompare = () => {
    setComparedVehicleIds([]);
    showToast('Comparison Cleared', 'All vehicles removed from comparison.');
  };

  // Reports
  const submitReport = (reportData: Omit<VehicleReport, 'id' | 'createdAt' | 'status'>) => {
    const newReport: VehicleReport = {
      ...reportData,
      id: `rep-${Date.now()}`,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    setReports((prev) => [newReport, ...prev]);
    setReportModalVehicle(null);
    showToast('Report Submitted', 'Thank you for keeping Groom Broom safe. Our team is reviewing this listing.');
  };

  // Applications
  const createApplication = (
    appData: Omit<VehicleApplication, 'id' | 'referenceNo' | 'submittedAt' | 'status'>
  ): VehicleApplication => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const newApp: VehicleApplication = {
      ...appData,
      id: `app-${Date.now()}`,
      referenceNo: `GB-2026-${randomSuffix}`,
      status: 'submitted',
      submittedAt: new Date().toISOString(),
    };

    setApplications((prev) => [newApp, ...prev]);

    // Send notification to user
    const newNotif: AppNotification = {
      id: `notif-${Date.now()}`,
      title: 'Application Received',
      message: `Your application ${newApp.referenceNo} for ${newApp.vehicleTitle} has been submitted to ${newApp.sellerName}.`,
      type: 'application',
      linkTarget: 'applications',
      read: false,
      createdAt: new Date().toISOString(),
    };
    setNotifications((prev) => [newNotif, ...prev]);

    showToast('Application Submitted', `Reference No: ${newApp.referenceNo}`);
    return newApp;
  };

  const updateApplicationStatus = (id: string, status: ApplicationStatus, sellerNotes?: string) => {
    setApplications((prev) =>
      prev.map((app) => {
        if (app.id === id) {
          return {
            ...app,
            status,
            sellerNotes: sellerNotes !== undefined ? sellerNotes : app.sellerNotes,
          };
        }
        return app;
      })
    );
    showToast('Application Updated', `Status changed to ${status.replace('_', ' ').toUpperCase()}`);
  };

  const withdrawApplication = (id: string) => {
    updateApplicationStatus(id, 'withdrawn');
    showToast('Application Withdrawn', 'Your application has been canceled.');
  };

  // Messaging
  const startOrOpenConversation = (vehicleId: string): string => {
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    if (!vehicle) return '';

    const buyerId = currentUser?.id || 'usr-guest';
    const buyerName = currentUser?.name || 'Guest User';

    const existing = conversations.find(
      (c) => c.vehicleId === vehicleId && c.buyerId === buyerId
    );

    if (existing) {
      return existing.id;
    }

    const newConv: Conversation = {
      id: `conv-${Date.now()}`,
      vehicleId: vehicle.id,
      vehicleTitle: vehicle.title,
      vehiclePrice: vehicle.price,
      vehicleImage: vehicle.images[0] || generateVehicleSvg('car', '#111827', vehicle.model),
      buyerId,
      buyerName,
      sellerId: vehicle.sellerId,
      sellerName: vehicle.sellerName,
      lastMessage: `Inquiry regarding ${vehicle.title}`,
      updatedAt: new Date().toISOString(),
      unreadBuyer: 0,
      unreadSeller: 1,
      messages: [
        {
          id: `msg-${Date.now()}`,
          senderId: buyerId,
          senderName: buyerName,
          text: `Hi ${vehicle.sellerName}, I am interested in your ${vehicle.title}. Is this vehicle still available for a viewing?`,
          timestamp: new Date().toISOString(),
          isSeller: false,
        },
      ],
    };

    setConversations((prev) => [newConv, ...prev]);
    return newConv.id;
  };

  const sendMessage = (conversationId: string, text: string) => {
    if (!text.trim()) return;

    setConversations((prev) =>
      prev.map((conv) => {
        if (conv.id === conversationId) {
          const isSellerRole = currentUser?.role === 'seller';
          const newMsg = {
            id: `msg-${Date.now()}`,
            senderId: currentUser?.id || 'usr-buyer-01',
            senderName: currentUser?.name || 'User',
            text: text.trim(),
            timestamp: new Date().toISOString(),
            isSeller: isSellerRole,
          };

          return {
            ...conv,
            lastMessage: text.trim(),
            updatedAt: new Date().toISOString(),
            unreadBuyer: isSellerRole ? conv.unreadBuyer + 1 : 0,
            unreadSeller: !isSellerRole ? conv.unreadSeller + 1 : 0,
            messages: [...conv.messages, newMsg],
          };
        }
        return conv;
      })
    );
  };

  const markConversationRead = (conversationId: string) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === conversationId) {
          return {
            ...c,
            unreadBuyer: currentUser?.role === 'seller' ? c.unreadBuyer : 0,
            unreadSeller: currentUser?.role === 'seller' ? 0 : c.unreadSeller,
          };
        }
        return c;
      })
    );
  };

  // Notifications
  const markNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    showToast('Notifications Cleared', 'All notifications have been removed.');
  };

  // Seller Listing Management
  const createVehicleListing = (vehicleData: Partial<Vehicle>): Vehicle => {
    const id = `veh-${Date.now()}`;
    const category = vehicleData.category || 'cars';
    const newVehicle: Vehicle = {
      id,
      title: vehicleData.title || 'Untitled Vehicle',
      brand: vehicleData.brand || 'Custom Brand',
      model: vehicleData.model || 'Model',
      year: vehicleData.year || 2024,
      category,
      price: vehicleData.price || 500000,
      mileage: vehicleData.mileage || 0,
      condition: vehicleData.condition || 'Used',
      transmission: vehicleData.transmission || 'Automatic',
      fuel: vehicleData.fuel || 'Gasoline',
      bodyType: vehicleData.bodyType || 'Sedan',
      color: vehicleData.color || 'Jet Black',
      drivetrain: vehicleData.drivetrain || 'Front-Wheel Drive',
      location: vehicleData.location || 'Metro Manila',
      province: vehicleData.province || 'Metro Manila',
      region: vehicleData.region || 'NCR',
      sellerId: currentUser?.id || 'sel-01',
      sellerName:
        currentUser?.role === 'seller'
          ? 'Groom Broom Certified Motors'
          : currentUser?.name || 'Groom Broom Certified Motors',
      sellerLocation: 'Metro Manila, Philippines',
      sellerRating: 5.0,
      sellerReviewCount: 1,
      sellerVerified: true,
      description: vehicleData.description || 'Complete documents, clean title, ready for transfer.',
      images:
        vehicleData.images && vehicleData.images.length > 0
          ? vehicleData.images
          : [generateVehicleSvg(category === 'cars' ? 'car' : category === 'motorcycles' ? 'bike' : 'car', '#111827', vehicleData.title || 'Vehicle')],
      specs: vehicleData.specs || {
        engine: 'Standard Engine',
        horsepower: 'Standard HP',
        seating: '5 Passengers',
        doors: '4 Doors',
      },
      financingAvailable: vehicleData.financingAvailable ?? true,
      minMonthlyPayment: Math.round((vehicleData.price || 500000) * 0.018),
      status: 'available',
      featured: false,
      createdAt: new Date().toISOString(),
      viewsCount: 1,
    };

    setVehicles((prev) => [newVehicle, ...prev]);
    showToast('Listing Published', `${newVehicle.title} is now active on the marketplace!`);
    return newVehicle;
  };

  const updateVehicleListing = (id: string, updates: Partial<Vehicle>) => {
    setVehicles((prev) =>
      prev.map((v) => (v.id === id ? { ...v, ...updates } : v))
    );
    showToast('Listing Updated', 'Vehicle details updated successfully.');
  };

  const deleteVehicleListing = (id: string) => {
    setVehicles((prev) => prev.filter((v) => v.id !== id));
    showToast('Listing Deleted', 'Vehicle removed from the marketplace.');
  };

  // Admin Management
  const adminApproveVehicle = (id: string) => {
    updateVehicleListing(id, { status: 'available' });
    showToast('Listing Approved', 'Vehicle is approved and visible to buyers.');
  };

  const adminUnpublishVehicle = (id: string) => {
    updateVehicleListing(id, { status: 'unpublished' });
    showToast('Listing Unpublished', 'Vehicle hidden from marketplace.');
  };

  const adminDeleteVehicle = (id: string) => {
    deleteVehicleListing(id);
  };

  const adminResolveReport = (reportId: string, action: 'dismiss' | 'unpublish_vehicle') => {
    const report = reports.find((r) => r.id === reportId);
    if (!report) return;

    if (action === 'unpublish_vehicle') {
      adminUnpublishVehicle(report.vehicleId);
    }

    setReports((prev) =>
      prev.map((r) =>
        r.id === reportId ? { ...r, status: action === 'dismiss' ? 'dismissed' : 'resolved' } : r
      )
    );
    showToast('Report Resolved', `Action executed: ${action.replace('_', ' ')}.`);
  };

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

        authModalOpen,
        setAuthModalOpen,
        reportModalVehicle,
        setReportModalVehicle,

        toasts,
        showToast,
        dismissToast,

        vehicles,
        guides,
        applications,
        conversations,
        activeConversationId,
        setActiveConversationId,
        reports,
        notifications,

        currentUser,
        isAuthenticated: !!currentUser,
        login,
        register,
        logout,
        switchRole,

        pendingAction,
        setPendingAction,
        executePendingActionIfAny,

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
        withdrawApplication,

        startOrOpenConversation,
        sendMessage,
        markConversationRead,

        markNotificationRead,
        clearAllNotifications,

        createVehicleListing,
        updateVehicleListing,
        deleteVehicleListing,

        adminApproveVehicle,
        adminUnpublishVehicle,
        adminDeleteVehicle,
        adminResolveReport,
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
