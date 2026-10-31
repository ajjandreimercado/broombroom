import React from 'react';
import { useApp, AdminTab } from '../context/AppContext.tsx';
import { AddVehicleForm } from '../components/AddVehicleForm.tsx';
import { ApplicationsManager, docSummary } from '../components/ApplicationsManager.tsx';
import { Commissions } from '../components/Commissions.tsx';
import { AdminOverview } from '../components/admin/AdminOverview.tsx';
import { ListingRequests } from '../components/admin/ListingRequests.tsx';
import { Referrals } from '../components/admin/Referrals.tsx';
import { FinancingReview } from '../components/admin/FinancingReview.tsx';
import { ListingsManager } from '../components/admin/ListingsManager.tsx';
import { AgentReports } from '../components/admin/AgentReports.tsx';
import { ConversationsMonitor } from '../components/admin/ConversationsMonitor.tsx';
import { SafetyReports } from '../components/admin/SafetyReports.tsx';
import { AccountingOverview } from '../components/accounting/AccountingOverview.tsx';
import { VoucherPage } from '../components/accounting/VoucherPage.tsx';
import { SalesReport } from '../components/accounting/SalesReport.tsx';
import { ReceiptsPage } from '../components/accounting/ReceiptsPage.tsx';
import { LeadsManager } from '../components/admin/LeadsManager.tsx';
import { AccountsManager } from '../components/admin/AccountsManager.tsx';
import { PreOrdersList, PreOrderSetup } from '../components/admin/PreOrders.tsx';
import {
  ShieldAlert,
  LayoutDashboard,
  ClipboardCheck,
  FileText,
  Landmark,
  Wallet,
  Car,
  PlusCircle,
  Flag,
  BarChart3,
  UserPlus,
  MessagesSquare,
  LineChart as LineChartIcon,
  Receipt,
  CreditCard,
  FileSpreadsheet,
  ReceiptText,
  Users,
  UserCog,
  ClipboardList,
  SlidersHorizontal,
} from 'lucide-react';
import { ErrorBoundary } from '../components/ErrorBoundary.tsx';

type NavItem = { id: AdminTab; label: string; icon: React.ComponentType<{ className?: string }>; count?: number };

export const AdminDashboardView: React.FC = () => {
  const { adminTab, navigateTo, vehicles, reports, applications, commissions, listingRequests, conversations, quotations, leads, referrals, preorders } = useApp();
  const open = ['submitted', 'under_review', 'contacted'];

  // Grouped so the admin reads the sidebar as: what needs me, what I manage, who I oversee.
  const groups: { title: string; items: NavItem[] }[] = [
    {
      title: 'Work queue',
      items: [
        { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
        { id: 'applications', label: 'Applications', icon: FileText, count: applications.filter((a) => open.includes(a.status) || a.status === 'processing').length + quotations.filter((q) => q.status === 'requested').length },
        {
          id: 'financing',
          label: 'Documents',
          icon: Landmark,
          count: applications.filter((a) => open.includes(a.status) && docSummary(a).tone !== 'good').length,
        },
        { id: 'commissions', label: 'Commissions', icon: Wallet, count: commissions.filter((c) => c.status !== 'paid').length },
        { id: 'preorders', label: 'Pre-orders', icon: ClipboardList, count: preorders.filter((p) => !p.locked && !p.additionalAmount && !!p.applicationRef).length || undefined },
      ],
    },
    {
      title: 'Accounting',
      items: [
        { id: 'accounting', label: 'Overview', icon: LineChartIcon },
        { id: 'acc_expenses', label: 'Expenses', icon: Receipt },
        { id: 'acc_credit', label: 'Credit', icon: CreditCard },
        { id: 'acc_receipts', label: 'Receipts (AR)', icon: ReceiptText },
        { id: 'acc_reports', label: 'Reports', icon: FileSpreadsheet },
      ],
    },
    {
      title: 'Marketplace',
      items: [
        { id: 'vehicles', label: 'Listings', icon: Car, count: vehicles.length },
        { id: 'add_vehicle', label: 'Add listing', icon: PlusCircle },
        { id: 'preorder_setup', label: 'Pre-order setup', icon: SlidersHorizontal },
        { id: 'reports', label: 'Reports', icon: Flag, count: reports.filter((r) => r.status === 'pending').length },
      ],
    },
    {
      title: 'Agents',
      items: [
        { id: 'approvals', label: 'Agent requests', icon: ClipboardCheck, count: listingRequests.filter((r) => r.status === 'pending').length },
        { id: 'leads', label: 'Clients & leads', icon: Users, count: leads.filter((l) => !l.agentName).length },
        { id: 'agent_reports', label: 'Agent reports', icon: BarChart3 },
        { id: 'referrals', label: 'Referrals', icon: UserPlus, count: referrals.filter((r) => r.status === 'receivable' || r.status === 'processing').length },
        { id: 'conversations', label: 'Conversations', icon: MessagesSquare, count: conversations.length },
        { id: 'accounts', label: 'Accounts', icon: UserCog },
      ],
    },
  ];

  const NavButton: React.FC<{ item: NavItem }> = ({ item }) => {
    const isActive = adminTab === item.id || (item.id === 'applications' && adminTab === 'quotations'); // quotations live in Applications
    const Icon = item.icon;
    return (
      <button
        onClick={() => navigateTo('admin', { adminTab: item.id })}
        aria-current={isActive ? 'page' : undefined}
        className={`relative shrink-0 lg:w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-[13.5px] font-medium cursor-pointer whitespace-nowrap transition-colors duration-200 ${
          isActive ? 'text-white' : 'text-[#2A2E31] hover:bg-[#EEF1F2] hover:text-[#141517]'
        }`}
      >
        {isActive && <span className="absolute inset-0 bg-[#141517]" aria-hidden="true" />}
        <span className="relative flex items-center gap-2.5">
          <Icon className="w-4 h-4 shrink-0" />
          {item.label}
        </span>
        {!!item.count && (
          <span className={`relative text-[10.5px] tabular-nums font-semibold min-w-[20px] px-1.5 py-0.5 text-center transition-colors duration-200 ${isActive ? 'bg-white text-[#141517]' : 'bg-[#EEF1F2] text-[#2A2E31]'}`}>
            {item.count}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-[#F7F8F8] pb-24">
      <div className="bg-[#F7F8F8] text-[#141517] pt-10 pb-8 border-b-2 border-[#141517]">
        <div className="gb-container flex items-center gap-3.5">
          <div className="w-12 h-12 border-2 border-[#141517] text-[#141517] flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-display text-[clamp(1.6rem,3vw,2.4rem)] leading-none">Administration console</h1>
            <p className="text-[13px] text-[#4E585E] mt-2">Approvals, paperwork, payouts and oversight of agents and listings.</p>
          </div>
        </div>
      </div>

      <div className="gb-container pt-8 sm:pt-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <aside className="lg:col-span-3" aria-label="Admin sections">
            <nav className="lg:sticky lg:top-[89px] border-y-2 lg:border-y-0 lg:border-t-2 border-[#141517] py-1 lg:py-2 flex lg:flex-col overflow-x-auto scrollbar-none gap-0.5">
              {groups.map((g, gi) => (
                <div key={g.title} className={`flex lg:flex-col gap-0.5 ${gi > 0 ? 'lg:mt-4 pl-2 lg:pl-0 border-l lg:border-l-0 border-[#C9D1D6]' : ''}`}>
                  <span className="hidden lg:block gb-label px-3.5 pt-2 pb-1.5">{g.title}</span>
                  {g.items.map((item) => <NavButton key={item.id} item={item} />)}
                </div>
              ))}
            </nav>
          </aside>

          <main className="lg:col-span-9 min-w-0">
            <ErrorBoundary key={adminTab}>
            {adminTab === 'dashboard' && <AdminOverview />}
            {adminTab === 'approvals' && <ListingRequests />}
            {(adminTab === 'applications' || adminTab === 'quotations') && <ApplicationsManager key={adminTab} initial={adminTab === 'quotations' ? 'quotations' : 'review'} />}
            {adminTab === 'financing' && <FinancingReview />}
            {adminTab === 'commissions' && <Commissions mode="admin" />}
            {adminTab === 'vehicles' && <ListingsManager />}
            {adminTab === 'add_vehicle' && <AddVehicleForm />}
            {adminTab === 'reports' && <SafetyReports />}
            {adminTab === 'agent_reports' && <AgentReports />}
            {adminTab === 'referrals' && <Referrals />}
            {adminTab === 'conversations' && <ConversationsMonitor />}
            {adminTab === 'accounting' && <AccountingOverview />}
            {adminTab === 'acc_expenses' && <VoucherPage kind="expense" />}
            {adminTab === 'acc_credit' && <VoucherPage kind="credit" />}
            {adminTab === 'acc_reports' && <SalesReport />}
            {adminTab === 'acc_receipts' && <ReceiptsPage />}
            {adminTab === 'leads' && <LeadsManager />}
            {adminTab === 'accounts' && <AccountsManager />}
            {adminTab === 'preorders' && <PreOrdersList />}
            {adminTab === 'preorder_setup' && <PreOrderSetup />}
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </div>
  );
};
