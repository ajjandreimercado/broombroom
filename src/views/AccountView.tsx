import React, { useState } from 'react';
import { StatusMark } from '../components/StatusMark.tsx';
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
  ArrowLeftRight,
  Sparkles,
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
    sendMessage,
    notifications,
    markNotificationRead,
    clearAllNotifications,
    showToast,
    comparedVehicleIds,
    setCompareModalOpen,
    toggleCompareVehicle,
    clearCompare,
  } = useApp();

  // Profile Edit State
  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [street, setStreet] = useState(currentUser?.address?.street || '');
  const [city, setCity] = useState(currentUser?.address?.city || '');

  // Messaging State
  const [chatInput, setChatInput] = useState('');

  // Settings State
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');

  // Application detail modal
  const [viewingAppId, setViewingAppId] = useState<string | null>(null);

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#F7F8F8] flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <p className="text-base font-semibold text-[#141517]">Please sign in to access your account</p>
          <button
            onClick={() => navigateTo('marketplace')}
            className="mt-4 px-5 py-2.5 bg-[#141517] text-white rounded-[2px] text-xs font-semibold hover:bg-[#2A2E31] transition-colors cursor-pointer"
          >
            Return to Marketplace
          </button>
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

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !selectedConversation) return;
    sendMessage(selectedConversation.id, chatInput.trim());
    setChatInput('');
  };

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('Profile Saved', 'Your account profile details have been updated.');
  };

  const handlePasswordUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPass || newPass.length < 6) {
      showToast('Validation Error', 'New password must be at least 6 characters.', 'error');
      return;
    }
    showToast('Password Changed', 'Your security credentials have been updated.');
    setCurrentPass('');
    setNewPass('');
  };

  const tabs: { id: AccountTab; label: string; icon: any; badge?: number }[] = [
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'saved', label: 'Saved Vehicles', icon: Bookmark, badge: savedVehicles.length },
    { id: 'compare', label: 'Compare Vehicles', icon: ArrowLeftRight, badge: comparedVehicleIds.length || undefined },
    { id: 'applications', label: 'My Applications', icon: FileText, badge: userApplications.length },
    { id: 'messages', label: 'Messages', icon: MessageSquare, badge: conversations.length },
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
                    className={`shrink-0 lg:w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-[13.5px] font-medium cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-[#141517] text-white'
                        : 'text-[#2A2E31] hover:bg-[#EEF1F2] hover:text-[#141517]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{tab.label}</span>
                    </div>
                    {tab.badge !== undefined && tab.badge > 0 && (
                      <span
                        className={`text-[10px] tabular-nums font-bold px-1.5 py-0.5 rounded-full ${
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
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517]"
                      />
                    </div>
                    <div>
                      <label className="gb-label block mb-2">Email Address</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="gb-label block mb-2">Mobile Phone</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517]"
                      />
                    </div>
                    <div>
                      <label className="gb-label block mb-2">City / Municipality</label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="gb-label block mb-2">Street Address</label>
                    <input
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
                            Evaluate price, mileage, powertrain, and verified trust side-by-side with automated scoring.
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
            {accountTab === 'applications' && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-display text-[22px] leading-tight text-[#141517]">
                    My Purchase Applications <span className="text-[#6B767D] font-normal">({userApplications.length})</span>
                  </h2>
                  <p className="text-xs text-[#4E585E] mt-1">
                    Track seller review statuses, viewing appointments, and application progress.
                  </p>
                </div>

                {userApplications.length === 0 ? (
                  <div className="bg-white p-12 text-center rounded-[2px] border border-[#C9D1D6]">
                    <div className="w-12 h-12 rounded-full bg-[#EEF1F2] flex items-center justify-center mx-auto mb-3 text-[#6B767D]">
                      <FileText className="w-6 h-6" />
                    </div>
                    <p className="font-bold text-[#141517] text-sm">No active applications</p>
                    <p className="text-xs text-[#4E585E] mt-1 max-w-xs mx-auto">
                      When you find a vehicle you love, click "Apply for this Vehicle" on its listing page.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {userApplications.map((app) => {

                      return (
                        <div
                          key={app.id}
                          className="border-t-2 border-[#141517] pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
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
                                <StatusMark status={app.status} />
                              </div>
                              <h3 className="font-bold text-[#141517] text-sm mt-1">
                                {app.vehicleTitle}
                              </h3>
                              <p className="text-xs text-[#4E585E] mt-0.5">
                                Seller: {app.sellerName} · Method: {app.purchaseMethod.toUpperCase()}
                              </p>
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
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 4. MESSAGES TAB */}
            {accountTab === 'messages' && (
              <div className="bg-white rounded-[2px] border border-[#C9D1D6] overflow-hidden h-[620px] flex flex-col md:flex-row">
                {/* Conversation List */}
                <div className="w-full md:w-80 border-r border-[#C9D1D6] flex flex-col bg-[#F7F8F8]/50 max-h-48 md:max-h-none shrink-0">
                  <div className="p-4 border-b border-[#C9D1D6] font-bold text-xs uppercase tracking-wider text-[#2A2E31] tabular-nums">
                    Direct Inquiries ({conversations.length})
                  </div>
                  <div className="flex-1 overflow-y-auto divide-y divide-[#DDE3E6]">
                    {conversations.length === 0 ? (
                      <div className="p-6 text-center text-xs text-[#4E585E]">
                        No conversations yet. Inquire directly on any vehicle page to connect with sellers.
                      </div>
                    ) : (
                      conversations.map((conv) => (
                        <div
                          key={conv.id}
                          onClick={() => setActiveConversationId(conv.id)}
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
                            <span className="text-[10px] text-[#6B767D] tabular-nums">
                              {new Date(conv.updatedAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#1D5FD1] font-semibold truncate mt-0.5">
                            {conv.vehicleTitle}
                          </p>
                          <p className="text-xs text-[#4E585E] truncate mt-1">{conv.lastMessage}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Chat Thread */}
                <div className="flex-1 flex flex-col h-full bg-white">
                  {selectedConversation ? (
                    <>
                      {/* Chat Header */}
                      <div className="p-4 border-b border-[#C9D1D6] flex items-center justify-between bg-[#F7F8F8]/50">
                        <div className="flex items-center gap-3">
                          <img
                            src={selectedConversation.vehicleImage}
                            alt=""
                            className="w-12 h-9 rounded-[2px] object-cover bg-[#141517] border border-gray-800"
                          />
                          <div>
                            <p className="text-xs font-bold text-[#141517]">
                              {selectedConversation.sellerName}
                            </p>
                            <p className="text-[11px] text-[#4E585E] truncate max-w-xs">
                              {selectedConversation.vehicleTitle}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() =>
                            navigateTo('vehicle_detail', { vehicleId: selectedConversation.vehicleId })
                          }
                          className="text-xs font-semibold text-[#4E585E] hover:text-[#1D5FD1] flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <span>Listing</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Messages Flow */}
                      <div className="flex-1 p-5 overflow-y-auto space-y-3.5">
                        {selectedConversation.messages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex flex-col ${
                              msg.isSeller ? 'items-start' : 'items-end'
                            }`}
                          >
                            <div
                              className={`max-w-sm rounded-[2px] px-4 py-2.5 text-xs leading-relaxed ${
                                msg.isSeller
                                  ? 'bg-[#EEF1F2] text-[#141517] rounded-tl-xs'
                                  : 'bg-[#1D5FD1] text-white rounded-tr-xs'
                              }`}
                            >
                              <p>{msg.text}</p>
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

                      {/* Message Input Box */}
                      <form
                        onSubmit={handleSendMessage}
                        className="p-3.5 border-t border-[#C9D1D6] flex gap-2.5 bg-[#F7F8F8]/30"
                      >
                        <input
                          type="text"
                          placeholder="Type your inquiry message..."
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          className="flex-1 px-3.5 py-2.5 text-xs bg-white border border-[#C9D1D6] rounded-[2px] focus:border-[#1D5FD1]"
                        />
                        <button
                          type="submit"
                          className="px-5 py-2.5 bg-[#1D5FD1] hover:bg-[#174CA8] text-white rounded-[2px] text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Send</span>
                        </button>
                      </form>
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
                  <h2 className="font-display text-[22px] leading-tight text-[#141517]">Account Preferences & Security</h2>
                  <p className="text-xs text-[#4E585E] mt-1">
                    Manage alert channels, update credentials, and security settings.
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#2A2E31] tabular-nums">
                    Notification Preferences
                  </h3>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between p-4 bg-[#F7F8F8] border border-[#C9D1D6] rounded-[2px] cursor-pointer">
                      <span className="text-xs font-semibold text-[#202426]">
                        Email alerts for seller replies and application status changes
                      </span>
                      <input
                        type="checkbox"
                        checked={emailAlerts}
                        onChange={(e) => setEmailAlerts(e.target.checked)}
                        className="w-4 h-4 accent-[#1D5FD1]"
                      />
                    </label>

                    <label className="flex items-center justify-between p-4 bg-[#F7F8F8] border border-[#C9D1D6] rounded-[2px] cursor-pointer">
                      <span className="text-xs font-semibold text-[#202426]">
                        SMS notifications for price drops and verified deal alerts
                      </span>
                      <input
                        type="checkbox"
                        checked={smsAlerts}
                        onChange={(e) => setSmsAlerts(e.target.checked)}
                        className="w-4 h-4 accent-[#1D5FD1]"
                      />
                    </label>
                  </div>
                </div>

                <form onSubmit={handlePasswordUpdate} className="pt-5 border-t border-[#DDE3E6] space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#2A2E31] tabular-nums">
                    Update Password
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="gb-label block mb-2">
                        Current Password
                      </label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={currentPass}
                        onChange={(e) => setCurrentPass(e.target.value)}
                        className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517]"
                      />
                    </div>
                    <div>
                      <label className="gb-label block mb-2">
                        New Password
                      </label>
                      <input
                        type="password"
                        placeholder="Min 6 characters"
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
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#141517]/50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-[#141517] p-6 sm:p-8 space-y-5 animate-modal-in">
            <div className="flex items-center justify-between pb-3 border-b border-[#DDE3E6]">
              <div>
                <span className="text-[11px] tabular-nums font-bold text-[#6B767D]">
                  {viewingApplication.referenceNo}
                </span>
                <h3 className="text-base font-bold text-[#141517]">Application Summary</h3>
              </div>
              <button
                onClick={() => setViewingAppId(null)}
                className="p-1.5 rounded-[2px] text-[#6B767D] hover:text-[#2A2E31] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-[#F7F8F8] rounded-[2px] border border-[#C9D1D6] flex items-center gap-3.5">
              <img
                src={viewingApplication.vehicleImage}
                alt=""
                className="w-16 h-12 object-cover rounded-[2px] bg-[#141517] shrink-0"
              />
              <div className="text-xs">
                <p className="font-bold text-[#141517]">{viewingApplication.vehicleTitle}</p>
                <p className="text-[#4E585E] mt-0.5">Seller: {viewingApplication.sellerName}</p>
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
              {viewingApplication.sellerNotes && (
                <div className="p-4 bg-[#E8F0FC] border border-[#1D5FD1]/20 rounded-[2px] text-[#141517] mt-2">
                  <p className="font-bold text-xs text-[#1D5FD1] mb-1">Seller Note</p>
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
