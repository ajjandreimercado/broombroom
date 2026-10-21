import React, { useEffect, useState } from 'react';
import { goodPassword, PASSWORD_RULE } from '../components/password.ts';
import { PasswordInput } from '../components/PasswordInput.tsx';
import { StatusMark } from '../components/StatusMark.tsx';
import { openAcknowledgementReceipt, openImage } from '../components/receipt.ts';
import { ApplicationProgress, isOngoing } from '../components/ApplicationProgress.tsx';
import { MyQuotations } from '../components/MyQuotations.tsx';
import { quoteFor } from '../components/quote.ts';
import { useApp } from '../context/AppContext.tsx';
import { AccountTab } from '../context/AppContext.tsx';
import { VehicleCard } from '../components/VehicleCard.tsx';
import {
  User,
  Bookmark,
  MessageSquare,
  FileText,
  Clock,
  Settings,
  Bell,
  LogOut,
  Send,
  CheckCircle,
  XCircle,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  MapPin,
  Trash2,
  Lock,
  X,
  ArrowLeft,
  ArrowLeftRight,
  Sparkles,
  Calculator,
  Plus,
} from 'lucide-react';

export const AccountView: React.FC = () => {
  const {
    currentUser,
    accountTab,
    navigateTo,
    logout,
    vehicles,
    applications,
    withdrawApplication,
    conversations,
    activeConversationId,
    setActiveConversationId,
    writeToAgent,
    myAgent,
    markConversationRead,
    sendMessage,
    applyThroughAgent,
    notifications: allNotifications,
    markNotificationRead,
    clearAllNotifications,
    showToast,
    comparedVehicleIds,
    setCompareModalOpen,
    toggleCompareVehicle,
    clearCompare,
    quotations,
    updateProfile,
    changePassword,
    setAuthModalOpen,
    selectedApplicationId,
    resubmitDocument,
  } = useApp();
  // Clients only see notifications meant for them.
  const notifications = allNotifications.filter((n) => (n.audience ?? 'client') === 'client');

  // Profile Edit State
  const [name, setName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [street, setStreet] = useState(currentUser?.address?.street || '');
  const [city, setCity] = useState(currentUser?.address?.city || '');

  // Messaging State
  const [chatInput, setChatInput] = useState('');
  // "New message" to the agent: about a listing or a general question.
  const [composing, setComposing] = useState(false);
  const [chatOpen, setChatOpen] = useState(!!activeConversationId); // phones: the open chat instead of the list
  const [composeAbout, setComposeAbout] = useState('');
  const [composeText, setComposeText] = useState('');
  const [composeBusy, setComposeBusy] = useState(false);

  // Settings State
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');

  // Application detail modal
  const [viewingAppId, setViewingAppId] = useState<string | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState<number | null>(null);
  // Arriving from the re-submission email (or a notification): open that application once it has loaded.
  useEffect(() => {
    if (selectedApplicationId && applications.some((a) => a.id === selectedApplicationId)) setViewingAppId(selectedApplicationId);
  }, [selectedApplicationId, applications]);

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#F7F8F8] flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <p className="text-base font-semibold text-[#141517]">Please sign in to see your account</p>
          <div className="mt-4 flex justify-center gap-2">
            <button
              onClick={() => setAuthModalOpen(true)}
              className="px-5 py-2.5 bg-[#1D5FD1] text-white rounded-[2px] text-xs font-semibold hover:bg-[#174CA8] transition-colors cursor-pointer"
            >
              Sign in
            </button>
            <button
              onClick={() => navigateTo('marketplace')}
              className="px-5 py-2.5 border border-[#141517] text-[#141517] rounded-[2px] text-xs font-semibold hover:bg-[#EEF1F2] transition-colors cursor-pointer"
            >
              Browse vehicles
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Saved vehicles
  const savedVehicles = vehicles.filter((v) => currentUser.savedVehicleIds.includes(v.id));

  // Recently viewed vehicles
  const recentlyViewedVehicles = vehicles.filter((v) =>
    currentUser.recentlyViewedIds.includes(v.id)
  );

  // User's applications
  const userApplications = applications.filter(
    (app) => app.applicantEmail === currentUser.email || app.applicantId === currentUser.id
  );

  // Active chat conversation
  const selectedConversation =
    conversations.find((c) => c.id === activeConversationId) || conversations[0];

  // The open chat is read (the Messages count drops); new messages in it are seen as they arrive.
  useEffect(() => {
    if (accountTab === 'messages' && !composing && selectedConversation && selectedConversation.unreadBuyer > 0) markConversationRead(selectedConversation.id);
  }, [accountTab, composing, selectedConversation?.id, selectedConversation?.unreadBuyer]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !selectedConversation) return;
    sendMessage(selectedConversation.id, chatInput.trim());
    setChatInput('');
  };

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return showToast('Add your name', 'Your full name is required.', 'error');
    updateProfile({ name: name.trim(), phone: phone.trim(), address: { ...currentUser.address, street: street.trim(), city: city.trim() } });
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const setting = currentUser.hasPassword === false; // made with Google: the first password needs no current one
    if (!setting && !currentPass) return showToast('Enter your current password', undefined, 'error');
    if (!goodPassword(newPass)) return showToast('Choose a stronger password', PASSWORD_RULE, 'error');
    if (await changePassword(currentPass, newPass)) {
      setCurrentPass('');
      setNewPass('');
    }
  };

  const tabs: { id: AccountTab; label: string; icon: any; badge?: number }[] = [
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'saved', label: 'Saved Vehicles', icon: Bookmark, badge: savedVehicles.length },
    { id: 'compare', label: 'Compare Vehicles', icon: ArrowLeftRight, badge: comparedVehicleIds.length || undefined },
    { id: 'applications', label: 'My Applications', icon: FileText, badge: userApplications.length },
    { id: 'quotations', label: 'My Quotations', icon: Calculator, badge: quotations.filter((q) => q.clientId === currentUser?.id).length || undefined },
    { id: 'messages', label: 'Messages', icon: MessageSquare, badge: conversations.filter((c) => c.unreadBuyer > 0).length },
    { id: 'recently_viewed', label: 'Recently Viewed', icon: Clock },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: notifications.filter((n) => !n.read).length },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const viewingApplication = applications.find((a) => a.id === viewingAppId);

  return (
    <div className="min-h-screen bg-[#F7F8F8] pb-24">
      {/* Account Header */}
      <div className="bg-[#F7F8F8] text-[#141517] pt-10 pb-8 border-b-2 border-[#141517]">
        <div className="gb-container flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-[#141517] text-white flex items-center justify-center font-bold text-base">
              {currentUser.name.charAt(0)}
            </div>
            <div>
              <h1 className="font-display text-[clamp(1.6rem,3vw,2.4rem)] leading-none">{currentUser.name}</h1>
              <p className="text-[13px] text-[#4E585E] tabular-nums mt-2">
                {currentUser.email} · Member since {currentUser.memberSince}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={logout}
              className="px-4 py-2 border border-[#141517] text-[13px] font-semibold text-[#141517] hover:bg-white flex items-center gap-2 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      <div className="gb-container pt-8 sm:pt-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Navigation Sidebar (3 cols) */}
          <aside className="lg:col-span-3 space-y-2">
            <div className="border-y-2 lg:border-y-0 lg:border-t-2 border-[#141517] py-1 lg:py-2 flex lg:flex-col overflow-x-auto scrollbar-none gap-0.5">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = accountTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => navigateTo('account', { accountTab: tab.id })}
                    className={`relative shrink-0 lg:w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-[13.5px] font-medium cursor-pointer whitespace-nowrap transition-colors duration-200 ${
                      isActive ? 'text-white' : 'text-[#2A2E31] hover:bg-[#EEF1F2] hover:text-[#141517]'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {isActive && (
                      <span className="absolute inset-0 bg-[#141517]" aria-hidden="true" />
                    )}
                    <div className="relative flex items-center gap-2.5">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{tab.label}</span>
                    </div>
                    {tab.badge !== undefined && tab.badge > 0 && (
                      <span
                        className={`relative text-[10px] tabular-nums font-bold px-1.5 py-0.5 rounded-full transition-colors duration-200 ${
                          isActive
                            ? 'bg-white text-[#141517]'
                            : 'bg-[#EEF1F2] text-[#4E585E]'
                        }`}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Active Tab Content (9 cols) */}
          <main className="lg:col-span-9">
            {/* 1. PROFILE TAB */}
            {accountTab === 'profile' && (
              <div className="border-t-2 border-[#141517] pt-6 space-y-6">
                <div>
                  <h2 className="font-display text-[22px] leading-tight text-[#141517]">Personal Information</h2>
                  <p className="text-xs text-[#4E585E] mt-1">
                    Manage your contact details and default address for streamlined purchase applications.
                  </p>
                </div>

                <form onSubmit={handleProfileSave} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="gb-label block mb-2">Full Legal Name</label>
                      <input aria-label="Full Legal Name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517]"
                      />
                    </div>
                    <div>
                      <label className="gb-label block mb-2">Email Address</label>
                      <input aria-label="Email Address"
                        type="email"
                        value={currentUser.email}
                        readOnly
                        aria-describedby="email-hint"
                        className="w-full px-3 py-2.5 text-[14px] bg-[#EEF1F2] border border-[#C9D1D6] text-[#4E585E]"
                      />
                      <p id="email-hint" className="mt-1 text-[11.5px] text-[#6B767D]">Your sign-in email. Ask the admin team to change it.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="gb-label block mb-2">Mobile Phone</label>
                      <input aria-label="Mobile Phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517]"
                      />
                    </div>
                    <div>
                      <label className="gb-label block mb-2">City / Municipality</label>
                      <input aria-label="City / Municipality"
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="gb-label block mb-2">Street Address</label>
                    <input aria-label="Street Address"
                      type="text"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="py-3 px-6 bg-[#1D5FD1] hover:bg-[#174CA8] text-white font-bold text-xs rounded-[2px] transition-colors cursor-pointer"
                  >
                    Save Changes
                  </button>
                </form>
              </div>
            )}

            {/* 2. SAVED VEHICLES TAB */}
            {accountTab === 'saved' && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#C9D1D6]">
                  <h2 className="font-display text-[22px] leading-tight text-[#141517]">
                    Saved Vehicles <span className="text-[#6B767D] font-normal">({savedVehicles.length})</span>
                  </h2>
                  <button
                    onClick={() => navigateTo('marketplace')}
                    className="text-xs text-[#1D5FD1] font-semibold hover:underline cursor-pointer"
                  >
                    Explore Inventory
                  </button>
                </div>

                {savedVehicles.length === 0 ? (
                  <div className="bg-white p-12 text-center rounded-[2px] border border-[#C9D1D6]">
                    <div className="w-12 h-12 rounded-full bg-[#EEF1F2] flex items-center justify-center mx-auto mb-3 text-[#6B767D]">
                      <Bookmark className="w-6 h-6" />
                    </div>
                    <p className="font-bold text-[#141517] text-sm">No saved vehicles yet</p>
                    <p className="text-xs text-[#4E585E] mt-1 max-w-xs mx-auto">
                      Click the bookmark icon on any vehicle card to save it for quick reference.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                    {savedVehicles.map((vehicle) => (
                      <VehicleCard key={vehicle.id} vehicle={vehicle} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 2.5. COMPARE VEHICLES TAB */}
            {accountTab === 'compare' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#C9D1D6] gap-3">
                  <div>
                    <h2 className="font-display text-[22px] leading-tight text-[#141517] flex items-center gap-2">
                      <span>Vehicle Comparison</span>
                      <span className="text-xs bg-[#1D5FD1] text-white px-2 py-0.5 rounded-full tabular-nums font-bold">
                        {comparedVehicleIds.length}/4
                      </span>
                    </h2>
                    <p className="text-xs text-[#4E585E] mt-0.5">
                      Analyze specs side-by-side with automated scoring on price, mileage, and overall value.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {comparedVehicleIds.length > 0 && (
                      <button
                        onClick={clearCompare}
                        className="px-3 py-1.5 text-xs text-[#4E585E] hover:text-[#141517] border border-[#C9D1D6] rounded-[2px] hover:bg-[#F7F8F8] transition-colors cursor-pointer"
                      >
                        Clear List
                      </button>
                    )}
                    <button
                      onClick={() => setCompareModalOpen(true)}
                      className="px-4 py-2 bg-[#1D5FD1] hover:bg-[#174CA8] text-white text-xs font-bold rounded-[2px] transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                      <span>Open Side-by-Side Analysis</span>
                    </button>
                  </div>
                </div>

                {comparedVehicleIds.length === 0 ? (
                  <div className="bg-white p-12 text-center rounded-[2px] border border-[#C9D1D6] space-y-4">
                    <div className="w-12 h-12 rounded-full bg-[#E8F0FC] text-[#1D5FD1] flex items-center justify-center mx-auto">
                      <ArrowLeftRight className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold text-[#141517] text-sm">No vehicles currently queued for comparison</p>
                      <p className="text-xs text-[#4E585E] mt-1 max-w-sm mx-auto">
                        Click the "Compare" button on any vehicle card in the Marketplace or Saved tab to compare up to 4 models.
                      </p>
                    </div>
                    <button
                      onClick={() => navigateTo('marketplace')}
                      className="px-5 py-2.5 bg-[#202426] hover:bg-black text-white text-xs font-semibold rounded-[2px] transition-colors cursor-pointer"
                    >
                      Browse Marketplace
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                      {comparedVehicleIds
                        .map((id) => vehicles.find((v) => v.id === id))
                        .filter((v): v is typeof vehicles[0] => Boolean(v))
                        .map((vehicle) => (
                          <VehicleCard key={vehicle.id} vehicle={vehicle} />
                        ))}
                    </div>

                    <div className="p-6 rounded-[2px] bg-[#141517] text-white flex flex-col sm:flex-row items-center justify-between gap-4 border border-gray-800">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-[2px] bg-[#1D5FD1] text-white flex items-center justify-center shrink-0">
                          <Sparkles className="w-5 h-5 text-[#141517]" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">Ready to compare which car is better overall?</p>
                          <p className="text-xs text-[#6B767D]">
                            Compare price, mileage, year, condition and fuel side by side.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setCompareModalOpen(true)}
                        className="px-5 py-2.5 bg-[#1D5FD1] hover:bg-[#174CA8] text-white font-bold text-xs rounded-[2px] transition-colors shrink-0 cursor-pointer flex items-center gap-2"
                      >
                        <ArrowLeftRight className="w-4 h-4" />
                        <span>Launch Comparison Engine</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3. MY APPLICATIONS TAB */}
            {accountTab === 'quotations' && <MyQuotations />}

            {accountTab === 'applications' && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-display text-[22px] leading-tight text-[#141517]">
                    My Purchase Applications <span className="text-[#6B767D] font-normal">({userApplications.length})</span>
                  </h2>
                  <p className="text-xs text-[#4E585E] mt-1">
                    Track agent review statuses, viewing appointments, and application progress.
                  </p>
                </div>

                {userApplications.length === 0 ? (
                  <div className="bg-white p-12 text-center rounded-[2px] border border-[#C9D1D6]">
                    <div className="w-12 h-12 rounded-full bg-[#EEF1F2] flex items-center justify-center mx-auto mb-3 text-[#6B767D]">
                      <FileText className="w-6 h-6" />
                    </div>
                    <p className="font-bold text-[#141517] text-sm">No active applications</p>
                    <p className="text-xs text-[#4E585E] mt-1 max-w-xs mx-auto">
                      When you find a vehicle you love, click "Request to apply" on its listing. Your agent sends you the application link in Messages.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {userApplications.map((app) => {

                      return (
                        <div key={app.id} className="border-t-2 border-[#141517] pt-6 space-y-5">
                        <div
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-4">
                            <img
                              src={app.vehicleImage}
                              alt={app.vehicleTitle}
                              className="w-20 h-14 rounded-[2px] object-cover bg-[#202426] shrink-0"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="tabular-nums text-xs font-bold text-[#6B767D]">
                                  {app.referenceNo}
                                </span>
                                <StatusMark status={app.status === 'completed' ? 'Released' : app.status} />
                                {isOngoing(app) && <StatusMark status="Ongoing" />}
                              </div>
                              <h3 className="font-bold text-[#141517] text-sm mt-1">
                                {app.vehicleTitle}
                              </h3>
                              <p className="text-xs text-[#4E585E] mt-0.5">
                                Agent: {app.sellerName} · Method: {app.purchaseMethod.toUpperCase()}
                              </p>
                              {app.documents?.some((d) => d.status === 'rejected') && (
                                <p className="text-xs text-[#B42318] mt-0.5">A document needs attention. Open the details to see why.</p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 self-end sm:self-center">
                            <button
                              onClick={() => setViewingAppId(app.id)}
                              className="px-3.5 py-2 bg-[#EEF1F2] hover:bg-gray-200 text-[#141517] text-xs font-semibold rounded-[2px] transition-colors cursor-pointer"
                            >
                              View Details
                            </button>
                            {app.status !== 'withdrawn' && app.status !== 'declined' && (
                              <button
                                onClick={() => withdrawApplication(app.id)}
                                className="px-3.5 py-2 border border-[#C9D1D6] hover:bg-white hover:text-[#B42318] hover:border-[#B42318] text-[#4E585E] text-xs font-semibold rounded-[2px] transition-colors cursor-pointer"
                              >
                                Withdraw
                              </button>
                            )}
                          </div>
                        </div>
                        {app.status === 'reserved' && (() => {
                          // After the reservation: the admin sends a quotation, the client signs it back, then the information sheet.
                          const quote = quoteFor(quotations, app);
                          const signed = quote?.status === 'confirmed';
                          const inReview = quote?.status === 'returned';
                          const toSign = quote?.status === 'sent';
                          return (
                            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[#E8F0FC] border-l-2 border-[#1D5FD1]">
                              <p className="text-[13px] text-[#141517]">
                                <strong>The vehicle is reserved for you.</strong>{' '}
                                {signed ? "Your quotation is confirmed. Next: fill in the Applicant's Information Sheet." : inReview ? 'Your signed quotation is with the admin team for review.' : toSign ? 'Next: check and sign your quotation.' : 'Next: the admin team sends you a quotation.'}
                              </p>
                              {(signed || toSign) && (
                                <button
                                  onClick={() => (signed ? navigateTo('info_sheet', { applicationId: app.id }) : navigateTo('account', { accountTab: 'quotations' }))}
                                  className="px-4 py-2 bg-[#1D5FD1] hover:bg-[#174CA8] text-white text-[13px] font-semibold cursor-pointer"
                                >
                                  {signed ? 'Fill in information sheet' : 'Sign quotation'}
                                </button>
                              )}
                            </div>
                          );
                        })()}
                        <ApplicationProgress app={app} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 4. MESSAGES TAB */}
            {accountTab === 'messages' && (
              <div className="bg-white rounded-[2px] border border-[#C9D1D6] overflow-hidden h-[calc(100dvh-140px)] min-h-[420px] md:h-[620px] flex flex-col md:flex-row">
                {/* Conversation List (phones: hidden while a chat is open) */}
                <div className={`${chatOpen ? 'hidden md:flex' : 'flex'} w-full md:w-80 h-full border-r border-[#C9D1D6] flex-col bg-[#F7F8F8]/50 shrink-0`}>
                  <div className="p-3 pl-4 border-b border-[#C9D1D6] flex items-center justify-between gap-2">
                    <span className="font-bold text-xs uppercase tracking-wider text-[#2A2E31] tabular-nums">Conversations ({conversations.length})</span>
                    <button
                      onClick={() => { setComposing(true); setComposeAbout(''); setComposeText(''); setChatOpen(true); }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#1D5FD1] hover:bg-[#174CA8] text-white text-[12px] font-semibold rounded-[2px] cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" aria-hidden="true" /> New message
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto divide-y divide-[#DDE3E6]">
                    {conversations.length === 0 ? (
                      <div className="p-6 text-center text-xs text-[#4E585E]">
                        No conversations yet. Press “Request to apply” on a vehicle: the first agent to take you on starts the chat here with your application link.
                      </div>
                    ) : (
                      conversations.map((conv) => (
                        <div
                          key={conv.id}
                          onClick={() => { setActiveConversationId(conv.id); setComposing(false); setChatOpen(true); }}
                          className={`p-4 cursor-pointer transition-colors ${
                            selectedConversation?.id === conv.id
                              ? 'bg-white outline outline-1 outline-[#141517] -outline-offset-1'
                              : 'hover:bg-[#EEF1F2]/70'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-[#141517] truncate">
                              {conv.sellerName}
                            </span>
                            {conv.unreadBuyer > 0 && (
                          <span className="ml-auto shrink-0 min-w-[20px] h-5 px-1.5 grid place-items-center bg-[#1D5FD1] text-white text-[11px] font-bold tabular-nums rounded-full" aria-label={`${conv.unreadBuyer} unread`}>{conv.unreadBuyer}</span>
                        )}
                            <span className="text-[10px] text-[#6B767D] tabular-nums">
                              {new Date(conv.updatedAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#1D5FD1] font-semibold truncate mt-0.5">
                            {conv.vehicleTitle}
                          </p>
                          <p className="text-xs text-[#4E585E] truncate mt-1">{conv.closedAt ? 'Chat ended · ' : ''}{conv.lastMessage}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Chat Thread (phones: only while open, with a back button) */}
                <div className={`${chatOpen ? 'flex' : 'hidden md:flex'} flex-1 min-h-0 min-w-0 flex-col h-full bg-white`}>
                  {composing ? (
                    <form
                      className="flex-1 flex flex-col p-4 sm:p-5 gap-4 overflow-y-auto"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!composeText.trim() || composeBusy) return;
                        setComposeBusy(true);
                        const id = await writeToAgent(composeAbout, composeText.trim());
                        setComposeBusy(false);
                        if (!id) return;
                        setActiveConversationId(id);
                        setComposing(false);
                      }}
                    >
                      <div>
                        <p className="text-[15px] font-bold text-[#141517]">New message</p>
                        <p className="text-xs text-[#4E585E] mt-0.5">{myAgent ? `To ${myAgent}, your agent.` : 'To the Broom Broom sales team. An agent will reply.'}</p>
                      </div>
                      <label className="block">
                        <span className="gb-label block mb-1.5">About</span>
                        <select value={composeAbout} onChange={(e) => setComposeAbout(e.target.value)} className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517] cursor-pointer">
                          <option value="">A general question</option>
                          {vehicles.filter((v) => v.status === 'available' || v.status === 'reserved').map((v) => (
                            <option key={v.id} value={v.id}>{v.title}</option>
                          ))}
                        </select>
                      </label>
                      <label className="block flex-1 flex flex-col">
                        <span className="gb-label block mb-1.5">Message</span>
                        <textarea
                          required
                          autoFocus
                          maxLength={2000}
                          value={composeText}
                          onChange={(e) => setComposeText(e.target.value)}
                          placeholder="Ask about a unit, a viewing, financing, your application..."
                          className="w-full flex-1 min-h-[120px] px-3 py-2.5 text-[16px] md:text-[14px] bg-white border border-[#8C989F] text-[#141517]"
                        />
                      </label>
                      <div className="flex gap-3">
                        <button type="submit" disabled={!composeText.trim() || composeBusy} className="px-5 py-2.5 bg-[#1D5FD1] hover:bg-[#174CA8] disabled:bg-[#8C989F] text-white text-[13px] font-semibold rounded-[2px] cursor-pointer">
                          {composeBusy ? 'Sending…' : 'Send'}
                        </button>
                        <button type="button" onClick={() => { setComposing(false); setChatOpen(false); }} className="px-3 py-2.5 text-[13px] text-[#4E585E] hover:text-[#141517] cursor-pointer">Cancel</button>
                      </div>
                    </form>
                  ) : selectedConversation ? (
                    <>
                      {/* Chat Header */}
                      <div className="p-3 sm:p-4 border-b border-[#C9D1D6] flex items-center justify-between gap-2 bg-[#F7F8F8]/50 shrink-0">
                        <div className="flex items-center gap-3 min-w-0">
                          <button type="button" onClick={() => setChatOpen(false)} aria-label="Back to conversations" className="md:hidden -ml-1 p-2 text-[#141517] cursor-pointer">
                            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
                          </button>
                          {selectedConversation.vehicleImage ? (
                            <img src={selectedConversation.vehicleImage} alt="" className="w-12 h-9 rounded-[2px] object-cover bg-[#141517] border border-gray-800" />
                          ) : (
                            <span className="w-12 h-9 rounded-[2px] grid place-items-center bg-[#EEF1F2] text-[#4E585E]" aria-hidden="true"><MessageSquare className="w-4 h-4" /></span>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[#141517] truncate">
                              {selectedConversation.sellerName}
                            </p>
                            <p className="text-[11px] text-[#4E585E] truncate max-w-xs">
                              {selectedConversation.vehicleTitle}
                            </p>
                          </div>
                        </div>

                        {selectedConversation.vehicleId && (
                          <button
                            onClick={() =>
                              navigateTo('vehicle_detail', { vehicleId: selectedConversation.vehicleId })
                            }
                            className="shrink-0 text-xs font-semibold text-[#4E585E] hover:text-[#1D5FD1] flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <span>Listing</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Messages Flow */}
                      <div className="flex-1 min-h-0 p-3 sm:p-5 overflow-y-auto space-y-3.5">
                        {selectedConversation.messages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex flex-col ${
                              msg.isSeller ? 'items-start' : 'items-end'
                            }`}
                          >
                            <div
                              className={`max-w-[85%] sm:max-w-sm rounded-[2px] px-4 py-2.5 text-[13px] sm:text-xs leading-relaxed break-words ${
                                msg.isSeller
                                  ? 'bg-[#EEF1F2] text-[#141517] rounded-tl-xs'
                                  : 'bg-[#1D5FD1] text-white rounded-tr-xs'
                              }`}
                            >
                              <p>{msg.text}</p>
                              {msg.applyVehicleId && msg.applyAgent && (
                                <button
                                  type="button"
                                  onClick={() => applyThroughAgent(msg.applyVehicleId!, msg.applyAgent!)}
                                  className="mt-2 w-full bg-[#1D5FD1] hover:bg-[#174DB0] text-white text-xs font-semibold px-3 py-2 rounded-[2px]"
                                >
                                  Apply for the {msg.applyVehicleTitle}
                                </button>
                              )}
                            </div>
                            <span className="text-[10px] text-[#6B767D] mt-1 px-1 tabular-nums">
                              {new Date(msg.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Message Input Box (an ended chat is read-only) */}
                      {selectedConversation.closedAt ? (
                        <p className="p-3.5 border-t border-[#C9D1D6] bg-[#F7F8F8] text-[12.5px] text-[#4E585E] shrink-0">
                          {selectedConversation.closedReason === 'removed_by_agent'
                            ? 'Your agent removed this conversation. You can start a new one from the vehicle listing.'
                            : 'This chat ended when your vehicle was released. To buy another one, press “Request to apply” on its listing.'}
                        </p>
                      ) : (
                      <form
                        onSubmit={handleSendMessage}
                        className="p-3 sm:p-3.5 border-t border-[#C9D1D6] flex gap-2 sm:gap-2.5 bg-[#F7F8F8]/30 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
                      >
                        <input
                          type="text"
                          placeholder="Type your inquiry message..."
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          aria-label="Message"
                          className="flex-1 min-w-0 px-3.5 py-2.5 text-[16px] md:text-xs bg-white border border-[#C9D1D6] rounded-[2px] focus:border-[#1D5FD1]"
                        />
                        <button
                          type="submit"
                          className="shrink-0 px-4 sm:px-5 py-2.5 bg-[#1D5FD1] hover:bg-[#174CA8] text-white rounded-[2px] text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Send</span>
                        </button>
                      </form>
                      )}
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center p-6 text-[#6B767D] text-xs">
                      Select a conversation on the left to start messaging.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 5. RECENTLY VIEWED */}
            {accountTab === 'recently_viewed' && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#C9D1D6]">
                  <h2 className="font-display text-[22px] leading-tight text-[#141517]">
                    Recently Viewed Vehicles <span className="text-[#6B767D] font-normal">({recentlyViewedVehicles.length})</span>
                  </h2>
                </div>
                {recentlyViewedVehicles.length === 0 ? (
                  <div className="bg-white p-12 text-center rounded-[2px] border border-[#C9D1D6]">
                    <div className="w-12 h-12 rounded-full bg-[#EEF1F2] flex items-center justify-center mx-auto mb-3 text-[#6B767D]">
                      <Clock className="w-6 h-6" />
                    </div>
                    <p className="font-bold text-[#141517] text-sm">No browsing history yet</p>
                    <p className="text-xs text-[#4E585E] mt-1 max-w-xs mx-auto">
                      Vehicles you inspect will appear here for fast recall.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                    {recentlyViewedVehicles.map((vehicle) => (
                      <VehicleCard key={vehicle.id} vehicle={vehicle} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 6. NOTIFICATIONS TAB */}
            {accountTab === 'notifications' && (
              <div className="border-t-2 border-[#141517] pt-6 space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-[#DDE3E6]">
                  <h2 className="font-display text-[22px] leading-tight text-[#141517]">Notifications</h2>
                  {notifications.length > 0 && (
                    <button
                      onClick={clearAllNotifications}
                      className="text-xs text-[#4E585E] hover:text-[#B42318] flex items-center gap-1 cursor-pointer font-semibold transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear All</span>
                    </button>
                  )}
                </div>

                <div className="divide-y divide-[#DDE3E6]">
                  {notifications.length === 0 ? (
                    <p className="text-xs text-[#4E585E] py-10 text-center tabular-nums">
                      All caught up. No new notifications.
                    </p>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => markNotificationRead(notif.id)}
                        className={`py-4 flex items-start justify-between gap-4 cursor-pointer hover:bg-[#F7F8F8] px-3 rounded-[2px] transition-colors ${
                          !notif.read ? 'bg-[#E8F0FC]/40' : ''
                        }`}
                      >
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-[#141517] flex items-center gap-2">
                            <span>{notif.title}</span>
                            {!notif.read && (
                              <span className="w-2 h-2 rounded-full bg-[#1D5FD1]" />
                            )}
                          </p>
                          <p className="text-xs text-[#4E585E]">{notif.message}</p>
                          <span className="text-[10px] text-[#6B767D] block tabular-nums">
                            {new Date(notif.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 7. SETTINGS TAB */}
            {accountTab === 'settings' && (
              <div className="border-t-2 border-[#141517] pt-6 space-y-6">
                <div>
                  <h2 className="font-display text-[22px] leading-tight text-[#141517]">Password & security</h2>
                  <p className="text-xs text-[#4E585E] mt-1">
                    {currentUser.hasPassword === false
                      ? 'You sign in with Google. You can also set a password to sign in with your email.'
                      : `Changing your password signs you out on your other devices.${currentUser.googleLinked ? ' You can also sign in with Google.' : ''}`}
                  </p>
                </div>

                <form onSubmit={handlePasswordUpdate} className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#2A2E31] tabular-nums">
                    {currentUser.hasPassword === false ? 'Set a password' : 'Update Password'}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {currentUser.hasPassword !== false && <div>
                      <label className="gb-label block mb-2">
                        Current Password
                      </label>
                      <PasswordInput aria-label="Current Password"
                        placeholder="••••••••"
                        autoComplete="current-password"
                        value={currentPass}
                        onChange={(e) => setCurrentPass(e.target.value)}
                        className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517]"
                      />
                    </div>}
                    <div>
                      <label className="gb-label block mb-2">
                        New Password
                      </label>
                      <PasswordInput aria-label="New Password"
                        placeholder="8+ characters, letters and numbers"
                        autoComplete="new-password"
                        value={newPass}
                        onChange={(e) => setNewPass(e.target.value)}
                        className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="py-3 px-6 bg-[#141517] hover:bg-[#2A2E31] text-white font-bold text-xs rounded-[2px] transition-colors cursor-pointer"
                  >
                    Update Password
                  </button>
                </form>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Application Detail Modal */}
      {viewingApplication && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#141517]/50 flex justify-center p-4">
          <div role="dialog" aria-modal="true" aria-label="Application details" className="my-auto w-full max-w-lg bg-white border border-[#141517] p-6 sm:p-8 space-y-5 animate-modal-in">
            <div className="flex items-center justify-between pb-3 border-b border-[#DDE3E6]">
              <div>
                <span className="text-[11px] tabular-nums font-bold text-[#6B767D]">
                  {viewingApplication.referenceNo}
                </span>
                <h3 className="font-display text-[18px] leading-tight text-[#141517]">Application Summary</h3>
              </div>
              <button
                onClick={() => setViewingAppId(null)}
                aria-label="Close"
                className="p-1.5 rounded-[2px] text-[#6B767D] hover:text-[#2A2E31] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <ApplicationProgress app={viewingApplication} stacked />

            <div className="p-4 bg-[#F7F8F8] rounded-[2px] border border-[#C9D1D6] flex items-center gap-3.5">
              <img
                src={viewingApplication.vehicleImage}
                alt=""
                className="w-16 h-12 object-cover rounded-[2px] bg-[#141517] shrink-0"
              />
              <div className="text-xs">
                <p className="font-bold text-[#141517]">{viewingApplication.vehicleTitle}</p>
                <p className="text-[#4E585E] mt-0.5">Agent: {viewingApplication.sellerName}</p>
                <p className="tabular-nums font-bold text-[#1D5FD1] mt-0.5">
                  ₱{viewingApplication.vehiclePrice.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1.5 border-b border-[#DDE3E6]">
                <span className="text-[#4E585E]">Status</span>
                <span className="font-bold uppercase text-[#1D5FD1] tabular-nums">
                  {viewingApplication.status.replace('_', ' ')}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#DDE3E6]">
                <span className="text-[#4E585E]">Purchase Method</span>
                <span className="font-semibold capitalize text-[#141517]">
                  {viewingApplication.purchaseMethod}
                </span>
              </div>
              {viewingApplication.financingTermMonths && (
                <div className="flex justify-between py-1.5 border-b border-[#DDE3E6]">
                  <span className="text-[#4E585E]">Loan Term</span>
                  <span className="font-semibold text-[#141517]">
                    {viewingApplication.financingTermMonths} months
                  </span>
                </div>
              )}
              <div className="flex justify-between py-1.5 border-b border-[#DDE3E6]">
                <span className="text-[#4E585E]">Submission Date</span>
                <span className="tabular-nums text-[#141517]">
                  {new Date(viewingApplication.submittedAt).toLocaleDateString()}
                </span>
              </div>
              {(viewingApplication.documents || []).length > 0 && (
                <div className="pt-3">
                  <p className="gb-label mb-2">Documents</p>
                  <ul className="border-t border-[#C9D1D6]">
                    {viewingApplication.documents!.map((d, i) => {
                      const open = !['declined', 'withdrawn', 'completed'].includes(viewingApplication.status);
                      const canUpload = open && (!d.fileName || d.status === 'rejected');
                      return (
                        <li key={d.label} className={`py-2 border-b border-[#DDE3E6] ${d.status === 'rejected' ? 'bg-[#FDF3F2] -mx-2 px-2' : ''}`}>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-[#141517]">
                              {d.url ? <a href={d.url} target="_blank" rel="noopener" className="underline underline-offset-2">{d.label}</a> : d.label}
                            </span>
                            <StatusMark status={!d.fileName ? 'Hand to admin' : d.status === 'approved' ? 'Approved' : d.status === 'rejected' ? 'Rejected' : 'In review'} />
                          </div>
                          {d.status === 'rejected' && d.reason && <p className="text-[#B42318] mt-1">Reason: {d.reason}</p>}
                          {canUpload && (
                            <label
                              className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold border cursor-pointer transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-[#1D5FD1] ${
                                d.status === 'rejected' ? 'bg-[#1D5FD1] border-[#1D5FD1] text-white hover:bg-[#174CA8]' : 'border-[#141517] text-[#141517] hover:bg-[#EEF1F2]'
                              } ${uploadingDoc === i ? 'opacity-60 pointer-events-none' : ''}`}
                            >
                              {uploadingDoc === i ? 'Uploading…' : d.status === 'rejected' ? 'Upload a new copy' : 'Upload it here'}
                              <input
                                type="file"
                                accept="image/*,application/pdf"
                                className="sr-only"
                                aria-label={`Upload ${d.label}`}
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  e.target.value = '';
                                  if (!file) return;
                                  if (!/^(image\/|application\/pdf$)/.test(file.type)) return showToast('Use a photo or PDF', `${file.name} is not a photo or PDF.`, 'error');
                                  if (file.size > 10 * 1024 * 1024) return showToast('File too large', `${file.name} is over 10 MB.`, 'error');
                                  setUploadingDoc(i);
                                  await resubmitDocument(viewingApplication.id, i, file);
                                  setUploadingDoc(null);
                                }}
                              />
                            </label>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              {!!viewingApplication.payments?.length && (
                <div className="pt-3">
                  <p className="gb-label mb-2">Acknowledgement receipts</p>
                  <ul className="border-t border-[#C9D1D6]">
                    {viewingApplication.payments.map((p) => (
                      <li key={p.arNo} className="flex flex-wrap items-center justify-between gap-3 py-2 border-b border-[#DDE3E6]">
                        <span className="text-[#141517] tabular-nums">
                          AR {p.arNo} · ₱{p.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                          <span className="text-[#4E585E]"> · {new Date(p.date).toLocaleDateString()}</span>
                        </span>
                        <button
                          onClick={() => {
                            if (!openAcknowledgementReceipt(viewingApplication, p)) showToast('Allow pop-ups', 'Your browser blocked the receipt window. Allow pop-ups for this site and try again.', 'error');
                          }}
                          className="font-semibold text-[#1D5FD1] underline underline-offset-4 cursor-pointer"
                        >
                          View &amp; save PDF
                        </button>
                        {p.attachment && (
                          <button onClick={() => openImage(p.attachment!, `Payment screenshot ${p.arNo}`)} className="text-[#141517] underline decoration-[#8C989F] underline-offset-4 cursor-pointer">
                            Screenshot
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {viewingApplication.sellerNotes && (
                <div className="p-4 bg-white border border-[#C9D1D6] text-[#141517] mt-2">
                  <p className="font-bold text-xs mb-1">Note from the admin team</p>
                  <p className="text-xs leading-relaxed">{viewingApplication.sellerNotes}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewingAppId(null)}
                className="px-5 py-2.5 bg-[#141517] hover:bg-[#2A2E31] text-white font-bold text-xs rounded-[2px] cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
