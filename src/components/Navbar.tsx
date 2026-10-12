import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { GroomBroomLogo } from './GroomBroomLogo.tsx';
import {
  Bookmark,
  Bell,
  User as UserIcon,
  Menu,
  X,
  ShieldCheck,
  Store,
  LogOut,
  ChevronDown,
  FileText,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    currentView,
    navigateTo,
    currentUser,
    isAuthenticated,
    setAuthModalOpen,
    logout,
    switchRole,
    updateFilter,
    notifications,
    markNotificationRead,
  } = useApp();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);

  const userDropRef = useRef<HTMLDivElement>(null);
  const notifDropRef = useRef<HTMLDivElement>(null);

  const unreadNotifs = notifications.filter((n) => !n.read).length;
  const savedCount = currentUser?.savedVehicleIds.length || 0;

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userDropRef.current && !userDropRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
      if (notifDropRef.current && !notifDropRef.current.contains(e.target as Node)) {
        setNotifDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [currentView]);


  const navLinks = [
    { label: 'Home', view: 'intro' as const },
    { label: 'Marketplace', view: 'marketplace' as const },
    { label: 'Deals', view: 'deals' as const },
    { label: 'How It Works', view: 'how_it_works' as const },
  ];

  /* ── SURFACE TOKENS ── */
  const bg = 'bg-[#141517] border-b border-[#141517]';
  const textBase = 'text-[#C9D1D6] font-medium';
  const textActive = 'text-white font-semibold';
  const dropBg = 'bg-white border-[#C9D1D6] text-[#141517]';
  const dropItemHover = 'hover:bg-[#EEF1F2]';

  return (
    <header
      className={`sticky top-0 z-40 transition-colors duration-200 ${bg}`}
    >
      <div className="gb-container">
        <div className="flex items-center h-16 gap-3 sm:gap-6">

          {/* ── LOGO ── */}
          <button
            onClick={() => navigateTo('intro')}
            className="shrink-0 cursor-pointer hover:opacity-80 transition-opacity duration-150 inline-flex items-center"
            aria-label="Groom Broom Home"
          >
            <GroomBroomLogo size="md" />
          </button>

          {/* ── NAV LINKS (Desktop) ── */}
          <nav className="hidden lg:flex items-stretch self-stretch gap-6 ml-4" aria-label="Main navigation">
            {navLinks.map((link) => {
              const isActive = currentView === link.view;
              return (
                <button
                  key={link.label}
                  onClick={() => navigateTo(link.view)}
                  className={`relative flex items-center text-[13.5px] transition-colors duration-150 cursor-pointer whitespace-nowrap ${
                    isActive ? textActive : `${textBase} hover:text-white`
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {link.label}
                  {isActive && (
                    <span
                      className="absolute -bottom-px left-0 right-0 h-[3px] bg-[#1B7F35] animate-rule-in"
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* ── SPACER ── */}
          <div className="flex-1" />

          {/* ── ROLE SWITCHER (Desktop) ── */}
          <div
            className="hidden md:flex items-center text-[12px] border border-[#4E585E] divide-x divide-[#4E585E]"
          >
            {(['buyer', 'seller', 'admin'] as const).map((role) => {
              const isActiveRole =
                role === 'buyer'
                  ? currentUser?.role === 'buyer' && currentView !== 'seller' && currentView !== 'admin'
                  : role === 'seller'
                  ? currentUser?.role === 'seller' || currentView === 'seller'
                  : currentUser?.role === 'admin' || currentView === 'admin';
              return (
                <button
                  key={role}
                  onClick={() => switchRole(role)}
                  aria-pressed={isActiveRole}
                  className={`px-3 py-1.5 transition-colors duration-150 cursor-pointer capitalize ${
                    isActiveRole
                      ? 'bg-white text-[#141517] font-semibold'
                      : 'text-[#C9D1D6] hover:text-white hover:bg-white/10 font-medium'
                  }`}
                >
                  {role}
                </button>
              );
            })}
          </div>

          {/* ── ICON BUTTONS ── */}
          <div className="flex items-center gap-1 sm:gap-2">

            {/* Saved */}
            <button
              onClick={() => {
                if (!isAuthenticated) { setAuthModalOpen(true); return; }
                navigateTo('account', { accountTab: 'saved' });
              }}
              className="relative p-2 rounded-[2px] transition-colors duration-150 cursor-pointer text-white hover:bg-white/10"
              title="Saved Vehicles"
              aria-label="Saved Vehicles"
            >
              <Bookmark className="w-4 h-4" />
              {savedCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] text-[9px] font-bold bg-[#1D5FD1] text-white flex items-center justify-center rounded-full px-0.5 tabular-nums">
                  {savedCount}
                </span>
              )}
            </button>

            {/* Notifications */}
            <div className="relative" ref={notifDropRef}>
              <button
                onClick={() => { setNotifDropdownOpen((v) => !v); setUserDropdownOpen(false); }}
                className="relative p-2 rounded-[2px] transition-colors duration-150 cursor-pointer text-white hover:bg-white/10"
                title="Notifications"
                aria-label="Notifications"
                aria-expanded={notifDropdownOpen}
              >
                <Bell className="w-4 h-4" />
                {unreadNotifs > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-[6px] h-[6px] bg-[#1D5FD1] rounded-full ring-2 ring-[#141517]" aria-hidden="true" />
                )}
              </button>

              {notifDropdownOpen && (
                <div
                  className={`absolute right-0 mt-2 w-[300px] rounded-[2px] border z-50 animate-fade-up overflow-hidden ${dropBg}`}
                  role="menu"
                >
                  <div className={`px-4 py-3 flex items-center justify-between border-b border-[#DDE3E6]`}>
                    <span className={`gb-label`}>
                      Notifications
                    </span>
                    <button
                      onClick={() => { navigateTo('account', { accountTab: 'notifications' }); setNotifDropdownOpen(false); }}
                      className="text-[11px] text-[#1D5FD1] hover:text-[#174CA8] font-semibold cursor-pointer"
                    >
                      View all
                    </button>
                  </div>
                  <div className={`max-h-[280px] overflow-y-auto divide-y divide-[#DDE3E6]`}>
                    {notifications.length === 0 ? (
                      <div className={`py-8 text-center text-[12px] text-[#6B767D]`}>
                        No notifications
                      </div>
                    ) : (
                      notifications.slice(0, 4).map((notif) => (
                        <button
                          key={notif.id}
                          onClick={() => {
                            markNotificationRead(notif.id);
                            setNotifDropdownOpen(false);
                            if (notif.linkTarget === 'messages') navigateTo('account', { accountTab: 'messages' });
                            else if (notif.linkTarget === 'applications') navigateTo('account', { accountTab: 'applications' });
                            else if (notif.linkTarget === 'deals') navigateTo('deals');
                          }}
                          className={`w-full text-left px-4 py-3 transition-colors duration-150 cursor-pointer ${
                            !notif.read
                              ? 'bg-[#E8F0FC]/60'
                              : ''
                          } ${dropItemHover}`}
                          role="menuitem"
                        >
                          <div className="flex items-start gap-2">
                            {!notif.read && (
                              <span className="mt-1.5 w-[5px] h-[5px] rounded-full bg-[#1D5FD1] shrink-0" />
                            )}
                            <div className={!notif.read ? '' : 'ml-[9px]'}>
                              <p className={`text-[12px] font-semibold text-[#141517]`}>
                                {notif.title}
                              </p>
                              <p className={`text-[11px] mt-0.5 line-clamp-2 leading-relaxed text-[#6B767D]`}>
                                {notif.message}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User / Sign In */}
            {isAuthenticated ? (
              <div className="relative" ref={userDropRef}>
                <button
                  onClick={() => { setUserDropdownOpen((v) => !v); setNotifDropdownOpen(false); }}
                  className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-[2px] transition-colors duration-150 cursor-pointer hover:bg-white/10 text-white"
                  aria-expanded={userDropdownOpen}
                  aria-label="User menu"
                >
                  <div className="w-7 h-7 rounded-full bg-white text-[#141517] flex items-center justify-center font-bold text-[11px] shrink-0">
                    {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span className="hidden sm:inline text-[12px] font-semibold text-white max-w-[90px] truncate">
                    {currentUser?.name?.split(' ')[0]}
                  </span>
                  <ChevronDown className={`w-3 h-3 text-[#C9D1D6] transition-transform duration-150 ${userDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {userDropdownOpen && (
                  <div
                    className={`absolute right-0 mt-2 w-[220px] rounded-[2px] border z-50 animate-fade-up overflow-hidden py-1 ${dropBg}`}
                    role="menu"
                  >
                    {/* User info */}
                    <div className="px-4 py-3 border-b border-[#DDE3E6]">
                      <p className="text-[13px] font-semibold truncate text-[#141517]">
                        {currentUser?.name}
                      </p>
                      <p className="text-[11px] truncate mt-0.5 text-[#6B767D]">
                        {currentUser?.email}
                      </p>
                    </div>

                    {[
                      { icon: UserIcon, label: 'My Account', action: () => navigateTo('account', { accountTab: 'profile' }) },
                      { icon: Bookmark, label: 'Saved Vehicles', action: () => navigateTo('account', { accountTab: 'saved' }) },
                      { icon: FileText, label: 'My Applications', action: () => navigateTo('account', { accountTab: 'applications' }) },
                    ].map(({ icon: Icon, label, action }) => (
                      <button
                        key={label}
                        onClick={() => { action(); setUserDropdownOpen(false); }}
                        className={`w-full text-left px-4 py-2.5 flex items-center gap-2.5 text-[13px] text-[#4E585E] transition-colors duration-150 cursor-pointer ${dropItemHover}`}
                        role="menuitem"
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        {label}
                      </button>
                    ))}

                    <div className="my-1 border-t border-[#DDE3E6]" />

                    {[
                      { icon: Store, label: 'Seller Dashboard', action: () => navigateTo('seller', { sellerTab: 'dashboard' }) },
                      { icon: ShieldCheck, label: 'Admin Console', action: () => navigateTo('admin', { adminTab: 'dashboard' }) },
                    ].map(({ icon: Icon, label, action }) => (
                      <button
                        key={label}
                        onClick={() => { action(); setUserDropdownOpen(false); }}
                        className={`w-full text-left px-4 py-2.5 flex items-center gap-2.5 text-[13px] text-[#4E585E] transition-colors duration-150 cursor-pointer ${dropItemHover}`}
                        role="menuitem"
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        {label}
                      </button>
                    ))}

                    <div className="my-1 border-t border-[#DDE3E6]" />

                    <button
                      onClick={() => { logout(); setUserDropdownOpen(false); }}
                      className="w-full text-left px-4 py-2.5 flex items-center gap-2.5 text-[13px] text-[#B42318] hover:bg-white0/8 transition-colors duration-150 cursor-pointer"
                      role="menuitem"
                    >
                      <LogOut className="w-3.5 h-3.5 shrink-0" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="px-4 py-2 text-[12.5px] font-semibold text-white bg-[#1D5FD1] hover:bg-[#174CA8] transition-colors duration-150 whitespace-nowrap cursor-pointer"
              >
                Sign In
              </button>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-[2px] transition-colors duration-150 cursor-pointer text-white hover:bg-white/10"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-4.5 h-4.5" /> : <Menu className="w-4.5 h-4.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* ── MOBILE MENU ── */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden border-t border-[#C9D1D6] bg-[#F7F8F8] animate-fade-up"
        >
          <div className="gb-container py-3">

            {/* Nav Links */}
            {navLinks.map((link) => {
              const isActive = currentView === link.view;
              return (
                <button
                  key={link.label}
                  onClick={() => { navigateTo(link.view); setMobileMenuOpen(false); }}
                  className={`w-full text-left px-1 py-3 border-b border-[#DDE3E6] font-display text-[18px] transition-colors duration-150 cursor-pointer flex items-center justify-between ${
                    isActive ? 'text-[#141517]' : 'text-[#4E585E] hover:text-[#141517]'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {link.label}
                </button>
              );
            })}

            {/* Role Switcher Mobile */}
            <div className="pt-4">
              <p className="gb-label mb-2 px-1">
                Portal role
              </p>
              <div className="flex border border-[#8C989F] divide-x divide-[#8C989F]">
                {(['buyer', 'seller', 'admin'] as const).map((role) => (
                  <button
                    key={role}
                    onClick={() => { switchRole(role); setMobileMenuOpen(false); }}
                    className={`flex-1 py-2.5 text-[12.5px] font-semibold transition-colors duration-150 cursor-pointer capitalize ${
                      (role === 'buyer' ? currentUser?.role === 'buyer' && currentView !== 'seller' && currentView !== 'admin'
                        : role === 'seller' ? currentUser?.role === 'seller' || currentView === 'seller'
                        : currentUser?.role === 'admin' || currentView === 'admin')
                        ? 'bg-[#141517] text-white'
                        : 'text-[#4E585E] hover:bg-[#EEF1F2]'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
