import React, { useEffect } from 'react';
import { PORTAL, PORTAL_LABEL, portalUrl } from './portals.ts';
import { MotionConfig } from 'motion/react';
import { AppProvider, useApp } from './context/AppContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { Footer } from './components/Footer.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { ReportModal } from './components/ReportModal.tsx';
import { ToastContainer } from './components/ToastContainer.tsx';
import { CompareDock } from './components/CompareDock.tsx';
import { CompareModal } from './components/CompareModal.tsx';

// Views
import { IntroView } from './views/IntroView.tsx';
import { MarketplaceView } from './views/MarketplaceView.tsx';
import { DealsView } from './views/DealsView.tsx';
import { VehicleDetailView } from './views/VehicleDetailView.tsx';
import { ApplicationWizardView } from './views/ApplicationWizardView.tsx';
import { AccountView } from './views/AccountView.tsx';
import { SellerDashboardView } from './views/SellerDashboardView.tsx';
import { AdminDashboardView } from './views/AdminDashboardView.tsx';
import { HowItWorksView } from './views/HowItWorksView.tsx';
import { HelpView } from './views/HelpView.tsx';
import { LegalView } from './views/LegalView.tsx';

const PortalSignIn: React.FC = () => {
  const { setAuthModalOpen } = useApp();
  const copy =
    PORTAL === 'seller'
      ? 'Sign in to manage your listings, review purchase applications and answer clients.'
      : 'Sign in to moderate listings, verify agents and review reports.';
  return (
    <section className="gb-container py-20 sm:py-28">
      <div className="max-w-xl border-t-2 border-[#141517] pt-8">
        <h1 className="font-display text-[clamp(2.2rem,5vw,3.6rem)] leading-[0.95] text-[#141517]">{PORTAL_LABEL[PORTAL]}</h1>
        <p className="mt-5 text-[16px] leading-relaxed text-[#4E585E] max-w-[46ch]">{copy}</p>
        <div className="mt-8 flex flex-wrap items-center gap-5">
          <button
            onClick={() => setAuthModalOpen(true)}
            className="px-6 py-3.5 bg-[#1D5FD1] hover:bg-[#174CA8] text-white text-[14px] font-semibold cursor-pointer"
          >
            Sign in
          </button>
          <a href={portalUrl('buyer')} className="text-[14px] font-semibold text-[#141517] underline decoration-[#8C989F] hover:decoration-[#141517] underline-offset-4">
            Back to the marketplace
          </a>
        </div>
      </div>
    </section>
  );
};

const SignInPrompt: React.FC<{ text: string; onSignIn: () => void }> = ({ text, onSignIn }) => (
  <section className="gb-container py-20">
    <div className="max-w-md border-t-2 border-[#141517] pt-6">
      <p className="text-[16px] text-[#141517]">{text}</p>
      <button onClick={onSignIn} className="mt-5 px-6 py-3 bg-[#1D5FD1] hover:bg-[#174CA8] text-white text-[14px] font-semibold cursor-pointer">
        Sign in
      </button>
    </div>
  </section>
);

const PortalFooter: React.FC = () => {
  const { navigateTo } = useApp();
  return (
    <footer className="bg-[#141517] text-[#C9D1D6]">
      <div className="gb-container py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[13px]">
        <p>© 2026 Broom Broom · {PORTAL_LABEL[PORTAL]}</p>
        <div className="flex items-center gap-5">
          <a href={portalUrl('buyer')} className="hover:text-white">Marketplace</a>
          <button onClick={() => navigateTo('help')} className="hover:text-white cursor-pointer">Help</button>
          <button onClick={() => navigateTo('terms')} className="hover:text-white cursor-pointer">Terms</button>
          <button onClick={() => navigateTo('privacy')} className="hover:text-white cursor-pointer">Privacy</button>
        </div>
      </div>
    </footer>
  );
};

// Views each site may show; anything else falls back to that site's home.
const SHARED_VIEWS = ['help', 'terms', 'privacy'];

const AppContent: React.FC = () => {
  const { currentView, currentUser, ready, serverError, refresh, setAuthModalOpen } = useApp();

  useEffect(() => {
    document.title = PORTAL === 'buyer' ? 'Broom Broom · A Happy Ride | Vehicle Marketplace' : `${PORTAL_LABEL[PORTAL]} · Broom Broom`;
  }, []);

  const renderShared = () => {
    switch (currentView) {
      case 'help':
        return <HelpView />;
      case 'terms':
        return <LegalView initialType="terms" />;
      case 'privacy':
        return <LegalView initialType="privacy" />;
      default:
        return null;
    }
  };

  const renderBuyerView = () => {
    switch (currentView) {
      case 'intro':
        return <IntroView />;
      case 'deals':
        return <DealsView />;
      case 'vehicle_detail':
        return <VehicleDetailView />;
      case 'apply':
        return currentUser ? <ApplicationWizardView /> : <SignInPrompt text="Sign in or create an account to apply for this vehicle." onSignIn={() => setAuthModalOpen(true)} />;
      case 'account':
        return <AccountView />;
      case 'how_it_works':
        return <HowItWorksView />;
      default:
        return SHARED_VIEWS.includes(currentView) ? renderShared() : <MarketplaceView />;
    }
  };

  const renderPortalView = () => {
    if (!currentUser) return <PortalSignIn />;
    if (SHARED_VIEWS.includes(currentView)) return renderShared();
    return PORTAL === 'seller' ? <SellerDashboardView /> : <AdminDashboardView />;
  };

  const isBuyerSite = PORTAL === 'buyer';

  if (!ready) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#F7F8F8]" role="status" aria-live="polite">
        <p className="text-[14px] text-[#4E585E]">Loading Broom Broom…</p>
      </div>
    );
  }
  if (serverError && !currentUser && !isBuyerSite) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#F7F8F8] p-6">
        <div className="max-w-sm text-center">
          <p className="font-semibold text-[#141517]">Cannot reach the server</p>
          <p className="mt-1 text-[13px] text-[#4E585E]">{serverError}</p>
          <button onClick={() => refresh()} className="mt-4 px-5 py-2.5 bg-[#141517] text-white text-[13px] font-semibold cursor-pointer">Try again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden bg-[#F7F8F8] text-[#141517]">
      <Navbar />
      <main key={currentView} className="flex-1 animate-view-fade">{isBuyerSite ? renderBuyerView() : renderPortalView()}</main>
      {isBuyerSite ? <Footer /> : <PortalFooter />}
      <AuthModal />
      <ReportModal />
      <ToastContainer />
      {isBuyerSite && <CompareDock />}
      {isBuyerSite && <CompareModal />}
    </div>
  );
};

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <AppProvider>
        <AppContent />
      </AppProvider>
    </MotionConfig>
  );
}
