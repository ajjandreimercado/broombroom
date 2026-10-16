import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { PORTAL, PORTAL_LABEL, portalUrl } from '../portals.ts';
import { AnimatePresence, motion } from 'motion/react';
import { popoverMotion, indicatorTransition, EASE_OUT } from '../motion.ts';
import { GroomBroomLogo } from './GroomBroomLogo.tsx';
import {
  Bookmark,
  Bell,
  User as UserIcon,
  Menu,
  X,
  ArrowUpRight,
  LogOut,
  ChevronDown,
  FileText,
  Calculator,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    currentView,
    navigateTo,
    currentUser,
    isAuthenticated,
    setAuthModalOpen,
    logout,
    updateFilter,
    notifications,
    markNotificationRead,
  } = useApp();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);

  const userDropRef = useRef<HTMLDivElement>(null);
  const notifDropRef = useRef<HTMLDivElement>(null);

  // Each portal only sees notifications meant for it (records without an audience are clients').
  const audience = PORTAL === 'seller' ? 'agent' : PORTAL === 'admin' ? 'admin' : 'client';
  const myNotifs = notifications.filter(
    (n) => (n.audience ?? 'client') === audience && (audience !== 'agent' || !n.recipient || n.recipient === currentUser?.name)
  );
  const unreadNotifs = myNotifs.filter((n) => !n.read).length;
  const openNotification = (target?: string) => {
    if (PORTAL === 'seller') {
      navigateTo('seller', { sellerTab: target === 'commissions' ? 'commissions' : target === 'vehicles' ? 'vehicles' : target === 'leads' ? 'leads' : 'messages' });
    } else if (PORTAL === 'admin') {
      const tab = (['approvals', 'applications', 'financing', 'commissions', 'reports', 'quotations', 'leads'] as const).find((t) => t === target);
      navigateTo('admin', { adminTab: tab || 'dashboard' });
    } else if (target === 'messages') navigateTo('account', { accountTab: 'messages' });
    else if (target === 'applications') navigateTo('account', { accountTab: 'applications' });
    else if (target === 'quotations') navigateTo('account', { accountTab: 'quotations' });
    else if (target === 'deals') navigateTo('deals');
    else navigateTo('account', { accountTab: 'notifications' });
  };
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


  const isBuyerSite = PORTAL === 'buyer';
  const navLinks = isBuyerSite
    ? [
        { label: 'Home', view: 'intro' as const },
        { label: 'Marketplace', view: 'marketplace' as const },
        { label: 'Deals', view: 'deals' as const },
        { label: 'How It Works', view: 'how_it_works' as const },
      ]
    : [];
  const homeView = PORTAL === 'seller' ? 'seller' : PORTAL === 'admin' ? 'admin' : 'intro';

  /* ── SURFACE TOKENS ── */
  const bg = 'bg-[#141517] border-b border-[#141517]';
  const textBase = 'text-[#C9D1D6] font-medium';
  const textActive = 'text-white font-semibold';
  const dropBg = 'bg-white border-[#C9D1D6] text-[#141517]';
  const dropItemHover = 'hover:bg-[#EEF1F2]';

  return (
    <header
      className={`site-header sticky top-0 z-40 transition-colors duration-200 ${bg}`}
    >
      <div className="gb-container">
        <div className="flex items-center h-16 gap-2 sm:gap-6 min-w-0">

          {/* ── LOGO ── */}
          <button
            onClick={() => navigateTo(homeView)}
            className="shrink-0 cursor-pointer hover:opacity-80 transition-opacity duration-150 inline-flex items-center"
            aria-label={`Broom Broom ${PORTAL_LABEL[PORTAL]} home`}
          >
            <GroomBroomLogo size="md" />
          </button>
          {!isBuyerSite && (
            <span className="hidden md:block pl-4 border-l border-[#4E585E] text-[13.5px] font-semibold text-white whitespace-nowrap">
              {PORTAL_LABEL[PORTAL]}
            </span>
          )}

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
                    <motion.span
                      layoutId="nav-underline"
                      transition={indicatorTransition}
                      className="absolute -bottom-px left-0 right-0 h-[3px] bg-[#1B7F35]"
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* ── SPACER ── */}
          <div className="flex-1" />

          {!isBuyerSite && (
            <a
              href={portalUrl('buyer')}
              className="hidden lg:inline-flex items-center gap-1.5 text-[13px] font-medium text-[#C9D1D6] hover:text-white"
            >
              Open marketplace
              <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
          )}

          {/* ── ICON BUTTONS ── */}
          <div className="flex items-center gap-1 sm:gap-2">

            {/* Saved */}
            {isBuyerSite && (
            <button
              onClick={() => {
                if (!isAuthenticated) { setAuthModalOpen(true); return; }
                navigateTo('account', { accountTab: 'saved' });
              }}
              className="relative p-2 hidden sm:block transition-colors duration-150 cursor-pointer text-white hover:bg-white/10"
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
            )}

            {/* Notifications */}
            <div className={`relative ${!isBuyerSite && !isAuthenticated ? 'hidden' : ''}`} ref={notifDropRef}>
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

              <AnimatePresence>
              {notifDropdownOpen && (
                <motion.div
                  {...popoverMotion}
                  style={{ transformOrigin: 'top right' }}
                  className={`fixed inset-x-4 top-[72px] sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2 sm:w-[300px] border z-50 overflow-hidden ${dropBg}`}
                  role="menu"
                >
                  <div className={`px-4 py-3 flex items-center justify-between border-b border-[#DDE3E6]`}>
                    <span className={`gb-label`}>
                      Notifications
                    </span>
                    {isBuyerSite && (
                      <button
                        onClick={() => { navigateTo('account', { accountTab: 'notifications' }); setNotifDropdownOpen(false); }}
                        className="text-[11px] text-[#1D5FD1] hover:text-[#174CA8] font-semibold cursor-pointer"
                      >
                        View all
                      </button>
                    )}
                  </div>
                  <div className={`max-h-[340px] overflow-y-auto divide-y divide-[#DDE3E6]`}>
                    {myNotifs.length === 0 ? (
                      <div className={`py-8 text-center text-[12px] text-[#6B767D]`}>
                        No notifications
                      </div>
                    ) : (
                      myNotifs.slice(0, 6).map((notif) => (
                        <button
                          key={notif.id}
                          onClick={() => {
                            markNotificationRead(notif.id);
                            setNotifDropdownOpen(false);
                            openNotification(notif.linkTarget);
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
                </motion.div>
              )}
              </AnimatePresence>
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
                  <span className={`${isBuyerSite ? 'hidden sm:inline' : 'hidden lg:inline'} text-[12px] font-semibold text-white max-w-[90px] truncate`}>
                    {currentUser?.name?.split(' ')[0]}
                  </span>
                  <ChevronDown className={`hidden sm:block w-3 h-3 text-[#C9D1D6] transition-transform duration-150 ${userDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                {userDropdownOpen && (
                  <motion.div
                    {...popoverMotion}
                    style={{ transformOrigin: 'top right' }}
                    className={`absolute right-0 mt-2 w-[220px] border z-50 overflow-hidden py-1 ${dropBg}`}
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

                    {isBuyerSite && [
                      { icon: UserIcon, label: 'My Account', action: () => navigateTo('account', { accountTab: 'profile' }) },
                      { icon: Bookmark, label: 'Saved Vehicles', action: () => navigateTo('account', { accountTab: 'saved' }) },
                      { icon: FileText, label: 'My Applications', action: () => navigateTo('account', { accountTab: 'applications' }) },
                      { icon: Calculator, label: 'My Quotations', action: () => navigateTo('account', { accountTab: 'quotations' }) },
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

                    {!isBuyerSite && (
                      <a
                        href={portalUrl('buyer')}
                        className={`w-full text-left px-4 py-2.5 flex items-center gap-2.5 text-[13px] text-[#4E585E] transition-colors duration-150 ${dropItemHover}`}
                        role="menuitem"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                        Open marketplace
                      </a>
                    )}

                    <div className="my-1 border-t border-[#DDE3E6]" />

                    <button
                      onClick={() => { logout(); setUserDropdownOpen(false); }}
                      className="w-full text-left px-4 py-2.5 flex items-center gap-2.5 text-[13px] text-[#B42318] hover:bg-white0/8 transition-colors duration-150 cursor-pointer"
                      role="menuitem"
                    >
                      <LogOut className="w-3.5 h-3.5 shrink-0" />
                      Sign Out
                    </button>
                  </motion.div>
                )}
                </AnimatePresence>
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
      <AnimatePresence>
      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, transform: 'translateY(-8px)' }}
          animate={{ opacity: 1, transform: 'translateY(0px)' }}
          exit={{ opacity: 0, transform: 'translateY(-8px)' }}
          transition={{ duration: 0.2, ease: EASE_OUT }}
          className="lg:hidden border-t border-[#C9D1D6] bg-[#F7F8F8]"
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

            {!isBuyerSite && (
              <a
                href={portalUrl('buyer')}
                className="w-full px-1 py-3 flex items-center justify-between font-display text-[18px] text-[#4E585E] hover:text-[#141517]"
              >
                Open marketplace
                <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
              </a>
            )}
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </header>
  );
};
