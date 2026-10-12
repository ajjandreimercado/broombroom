import React from 'react';
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
import { GuidesView } from './views/GuidesView.tsx';
import { GuideDetailView } from './views/GuideDetailView.tsx';
import { HowItWorksView } from './views/HowItWorksView.tsx';
import { HelpView } from './views/HelpView.tsx';
import { LegalView } from './views/LegalView.tsx';

const AppContent: React.FC = () => {
  const { currentView } = useApp();

  const renderCurrentView = () => {
    switch (currentView) {
      case 'intro':
        return <IntroView />;
      case 'marketplace':
        return <MarketplaceView />;
      case 'deals':
        return <DealsView />;
      case 'vehicle_detail':
        return <VehicleDetailView />;
      case 'apply':
        return <ApplicationWizardView />;
      case 'account':
        return <AccountView />;
      case 'seller':
        return <SellerDashboardView />;
      case 'admin':
        return <AdminDashboardView />;
      case 'guides':
      case 'guide_detail':
        return <MarketplaceView />;
      case 'how_it_works':
        return <HowItWorksView />;
      case 'help':
        return <HelpView />;
      case 'terms':
        return <LegalView initialType="terms" />;
      case 'privacy':
        return <LegalView initialType="privacy" />;
      default:
        return <MarketplaceView />;
    }
  };


  return (
    <div className={`min-h-screen flex flex-col overflow-x-hidden bg-[#F7F8F8] text-[#141517]`}>
      <Navbar />
      <main key={currentView} className="flex-1 animate-view-fade">{renderCurrentView()}</main>
      <Footer />
      <AuthModal />
      <ReportModal />
      <ToastContainer />
      <CompareDock />
      <CompareModal />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
