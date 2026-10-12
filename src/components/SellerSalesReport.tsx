import React, { useState, useMemo } from 'react';
import { StatusMark } from './StatusMark.tsx';
import { useApp } from '../context/AppContext.tsx';
import { VehicleCategory } from '../types.ts';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  Download,
  Filter,
  CheckCircle2,
  CreditCard,
  Percent,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  FileSpreadsheet,
  Award,
  Search,
  FileText,
  Printer,
  X,
  Car,
  Truck,
  Bike,
  Zap,
  Building2,
  Layers,
  BarChart2,
  Hash,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export type SalesTimeframe = 'daily' | 'weekly' | 'monthly' | 'annual';

interface SalesDataPoint {
  label: string;
  shortLabel: string;
  revenue: number;
  units: number;
}

interface ClosedTransaction {
  id: string;
  referenceNo: string;
  vehicleTitle: string;
  vehicleImage: string;
  category: VehicleCategory;
  buyerName: string;
  date: string;
  time?: string;
  amount: number;
  paymentMethod: 'Bank Financing' | 'Cash Transfer' | 'In-House Financing' | "Manager's Check";
  status: 'Completed & Transferred' | 'Payment Cleared' | 'Escrow Released';
}

export const SellerSalesReport: React.FC = () => {
  const { showToast } = useApp();

  const [timeframe, setTimeframe] = useState<SalesTimeframe>('monthly');
  const [selectedCategory, setSelectedCategory] = useState<VehicleCategory>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [chartViewMode, setChartViewMode] = useState<'revenue' | 'units'>('revenue');
  const [hoveredPoint, setHoveredPoint] = useState<SalesDataPoint | null>(null);
  const [viewingReceiptTx, setViewingReceiptTx] = useState<ClosedTransaction | null>(null);

  // Timeframe-specific configurations & datasets
  const reportData = useMemo(() => {
    switch (timeframe) {
      case 'daily':
        return {
          title: "Today's Sales Performance",
          periodLabel: 'October 6, 2026 (00:00 - 23:59 PST)',
          grossRevenue: 3750000,
          previousRevenue: 2450000,
          growthRate: 53.1,
          growthPositive: true,
          unitsSold: 2,
          previousUnits: 1,
          averageOrderValue: 1875000,
          inquiriesReceived: 14,
          conversionRate: 14.3,
          financingPercentage: 56,
          cashPercentage: 44,
          targetRevenue: 3000000,
          chartData: [
            { label: '08:00 - 10:00', shortLabel: '8am - 10am', revenue: 0, units: 0 },
            { label: '10:00 - 12:00', shortLabel: '10am - 12pm', revenue: 1650000, units: 1 },
            { label: '12:00 - 14:00', shortLabel: '12pm - 2pm', revenue: 0, units: 0 },
            { label: '14:00 - 16:00', shortLabel: '2pm - 4pm', revenue: 1480000, units: 1 },
            { label: '16:00 - 18:00', shortLabel: '4pm - 6pm', revenue: 620000, units: 0 },
            { label: '18:00 - 20:00', shortLabel: '6pm - 8pm', revenue: 0, units: 0 },
          ] as SalesDataPoint[],
          transactions: [
            {
              id: 'tx-d1',
              referenceNo: 'GB-SALES-2610-001',
              vehicleTitle: '2024 Honda Civic RS Turbo',
              vehicleImage: 'https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&w=600&q=80',
              category: 'cars',
              buyerName: 'Andrei Mercado',
              date: 'Oct 6, 2026',
              time: '11:15 AM',
              amount: 1650000,
              paymentMethod: 'Bank Financing',
              status: 'Completed & Transferred',
            },
            {
              id: 'tx-d2',
              referenceNo: 'GB-SALES-2610-002',
              vehicleTitle: '2023 Toyota Hilux Conquest 4x4',
              vehicleImage: 'https://images.unsplash.com/photo-1559416523-140ddc3d238c?auto=format&fit=crop&w=600&q=80',
              category: 'trucks',
              buyerName: 'Maria Santos',
              date: 'Oct 6, 2026',
              time: '03:40 PM',
              amount: 1480000,
              paymentMethod: 'Cash Transfer',
              status: 'Payment Cleared',
            },
            {
              id: 'tx-d3',
              referenceNo: 'GB-SALES-2610-003',
              vehicleTitle: '2024 Yamaha MT-09 SP (Secured Downpayment)',
              vehicleImage: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=600&q=80',
              category: 'motorcycles',
              buyerName: 'Carlo Reyes',
              date: 'Oct 6, 2026',
              time: '05:10 PM',
              amount: 620000,
              paymentMethod: 'In-House Financing',
              status: 'Escrow Released',
            },
          ] as ClosedTransaction[],
          categoryBreakdown: [
            { name: 'Cars & Sedans', key: 'cars', amount: 1650000, count: 1, share: 44, topModel: 'Honda Civic RS Turbo', color: '#1D5FD1' },
            { name: 'Trucks & 4x4', key: 'trucks', amount: 1480000, count: 1, share: 39, topModel: 'Toyota Hilux Conquest', color: '#1E293B' },
            { name: 'Performance Bikes', key: 'motorcycles', amount: 620000, count: 1, share: 17, topModel: 'Yamaha MT-09 SP', color: '#D97706' },
          ],
        };

      case 'weekly':
        return {
          title: 'Weekly Sales Performance',
          periodLabel: 'Week 40: September 30 – October 6, 2026',
          grossRevenue: 14820000,
          previousRevenue: 12100000,
          growthRate: 22.5,
          growthPositive: true,
          unitsSold: 8,
          previousUnits: 6,
          averageOrderValue: 1852500,
          inquiriesReceived: 43,
          conversionRate: 18.6,
          financingPercentage: 62,
          cashPercentage: 38,
          targetRevenue: 13500000,
          chartData: [
            { label: 'Monday (Sep 30)', shortLabel: 'Mon', revenue: 1850000, units: 1 },
            { label: 'Tuesday (Oct 1)', shortLabel: 'Tue', revenue: 2900000, units: 2 },
            { label: 'Wednesday (Oct 2)', shortLabel: 'Wed', revenue: 1450000, units: 1 },
            { label: 'Thursday (Oct 3)', shortLabel: 'Thu', revenue: 3100000, units: 2 },
            { label: 'Friday (Oct 4)', shortLabel: 'Fri', revenue: 2450000, units: 1 },
            { label: 'Saturday (Oct 5)', shortLabel: 'Sat', revenue: 1820000, units: 1 },
            { label: 'Sunday (Oct 6)', shortLabel: 'Sun', revenue: 1250000, units: 0 },
          ] as SalesDataPoint[],
          transactions: [
            {
              id: 'tx-w1',
              referenceNo: 'GB-SALES-W40-001',
              vehicleTitle: '2024 Ford Ranger Raptor 3.0 V6',
              vehicleImage: 'https://images.unsplash.com/photo-1559416523-140ddc3d238c?auto=format&fit=crop&w=600&q=80',
              category: 'trucks',
              buyerName: 'Rafael De Guzman',
              date: 'Oct 5, 2026',
              time: '02:15 PM',
              amount: 2750000,
              paymentMethod: 'Bank Financing',
              status: 'Completed & Transferred',
            },
            {
              id: 'tx-w2',
              referenceNo: 'GB-SALES-W40-002',
              vehicleTitle: '2023 BMW M340i xDrive',
              vehicleImage: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=600&q=80',
              category: 'cars',
              buyerName: 'Victor Villanueva',
              date: 'Oct 4, 2026',
              time: '11:00 AM',
              amount: 3850000,
              paymentMethod: "Manager's Check",
              status: 'Completed & Transferred',
            },
            {
              id: 'tx-w3',
              referenceNo: 'GB-SALES-W40-003',
              vehicleTitle: '2024 Hyundai Ioniq 5 Long Range EV',
              vehicleImage: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=600&q=80',
              category: 'cars',
              buyerName: 'Patricia Lim',
              date: 'Oct 3, 2026',
              time: '04:20 PM',
              amount: 2450000,
              paymentMethod: 'Bank Financing',
              status: 'Payment Cleared',
            },
            {
              id: 'tx-w4',
              referenceNo: 'GB-SALES-W40-004',
              vehicleTitle: '2024 Ducati Monster Plus 937',
              vehicleImage: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=600&q=80',
              category: 'motorcycles',
              buyerName: 'Kenneth Tan',
              date: 'Oct 2, 2026',
              time: '01:30 PM',
              amount: 980000,
              paymentMethod: 'Cash Transfer',
              status: 'Escrow Released',
            },
            {
              id: 'tx-w5',
              referenceNo: 'GB-SALES-W40-005',
              vehicleTitle: '2022 Mitsubishi Montero Sport GT 4x4',
              vehicleImage: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=600&q=80',
              category: 'trucks',
              buyerName: 'Eduardo Ramos',
              date: 'Oct 1, 2026',
              time: '10:45 AM',
              amount: 1790000,
              paymentMethod: 'Bank Financing',
              status: 'Completed & Transferred',
            },
          ] as ClosedTransaction[],
          categoryBreakdown: [
            { name: 'Trucks & 4x4', key: 'trucks', amount: 6800000, count: 3, share: 46, topModel: 'Ford Ranger Raptor', color: '#1E293B' },
            { name: 'Cars & Sedans', key: 'cars', amount: 4950000, count: 3, share: 33, topModel: 'BMW M340i xDrive', color: '#1D5FD1' },
            { name: 'Performance Bikes', key: 'motorcycles', amount: 2450000, count: 2, share: 17, topModel: 'Ducati Monster Plus', color: '#D97706' },
            { name: 'Smart E-Bikes', key: 'ebikes', amount: 620000, count: 1, share: 4, topModel: 'Sur-Ron Light Bee X', color: '#059669' },
          ],
        };

      case 'monthly':
        return {
          title: 'Monthly Sales Statement',
          periodLabel: 'October 2026 Month-to-Date (MTD)',
          grossRevenue: 28450000,
          previousRevenue: 24780000,
          growthRate: 14.8,
          growthPositive: true,
          unitsSold: 16,
          previousUnits: 14,
          averageOrderValue: 1778125,
          inquiriesReceived: 88,
          conversionRate: 18.2,
          financingPercentage: 68,
          cashPercentage: 32,
          targetRevenue: 35000000,
          chartData: [
            { label: 'Week 1 (Oct 1 - 7)', shortLabel: 'Wk 1 (Oct 1-7)', revenue: 7200000, units: 4 },
            { label: 'Week 2 (Oct 8 - 14)', shortLabel: 'Wk 2 (Oct 8-14)', revenue: 8100000, units: 5 },
            { label: 'Week 3 (Oct 15 - 21)', shortLabel: 'Wk 3 (Oct 15-21)', revenue: 7400000, units: 4 },
            { label: 'Week 4 (Oct 22 - 31)', shortLabel: 'Wk 4 (Oct 22-31)', revenue: 5750000, units: 3 },
          ] as SalesDataPoint[],
          transactions: [
            {
              id: 'tx-m1',
              referenceNo: 'GB-SALES-2610-098',
              vehicleTitle: '2024 Toyota Land Cruiser LC300 ZX',
              vehicleImage: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=600&q=80',
              category: 'trucks',
              buyerName: 'Atty. Manuel Roxas',
              date: 'Oct 4, 2026',
              time: '02:30 PM',
              amount: 5850000,
              paymentMethod: 'Bank Financing',
              status: 'Completed & Transferred',
            },
            {
              id: 'tx-m2',
              referenceNo: 'GB-SALES-2610-099',
              vehicleTitle: '2024 Porsche 911 Carrera S (992)',
              vehicleImage: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=600&q=80',
              category: 'cars',
              buyerName: 'Geronimo Sy',
              date: 'Oct 3, 2026',
              time: '11:15 AM',
              amount: 9850000,
              paymentMethod: "Manager's Check",
              status: 'Completed & Transferred',
            },
            {
              id: 'tx-m3',
              referenceNo: 'GB-SALES-2610-100',
              vehicleTitle: '2024 BMW R 1250 GS Adventure Trophy',
              vehicleImage: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=600&q=80',
              category: 'motorcycles',
              buyerName: 'Christian Mendoza',
              date: 'Oct 2, 2026',
              time: '03:45 PM',
              amount: 1450000,
              paymentMethod: 'Bank Financing',
              status: 'Payment Cleared',
            },
            {
              id: 'tx-m4',
              referenceNo: 'GB-SALES-2610-101',
              vehicleTitle: '2024 Sur-Ron Ultra Bee R E-Moto',
              vehicleImage: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=600&q=80',
              category: 'ebikes',
              buyerName: 'Jose Maria Santos',
              date: 'Oct 1, 2026',
              time: '01:00 PM',
              amount: 420000,
              paymentMethod: 'Cash Transfer',
              status: 'Escrow Released',
            },
          ] as ClosedTransaction[],
          categoryBreakdown: [
            { name: 'Cars & Sedans', key: 'cars', amount: 13200000, count: 6, share: 46, topModel: 'Porsche 911 Carrera S', color: '#1D5FD1' },
            { name: 'Trucks & 4x4', key: 'trucks', amount: 10450000, count: 5, share: 37, topModel: 'Toyota Land Cruiser LC300', color: '#1E293B' },
            { name: 'Performance Bikes', key: 'motorcycles', amount: 3750000, count: 3, share: 13, topModel: 'BMW R 1250 GS Trophy', color: '#D97706' },
            { name: 'Smart E-Bikes', key: 'ebikes', amount: 1050000, count: 2, share: 4, topModel: 'Sur-Ron Ultra Bee R', color: '#059669' },
          ],
        };

      case 'annual':
        return {
          title: 'Annual Fiscal Sales Report',
          periodLabel: 'Calendar Year 2026 (YTD Pacing vs FY2025)',
          grossRevenue: 184650000,
          previousRevenue: 142200000,
          growthRate: 29.8,
          growthPositive: true,
          unitsSold: 98,
          previousUnits: 79,
          averageOrderValue: 1884183,
          inquiriesReceived: 492,
          conversionRate: 19.9,
          financingPercentage: 71,
          cashPercentage: 29,
          targetRevenue: 220000000,
          chartData: [
            { label: 'Q1 2026 (Jan - Mar)', shortLabel: 'Q1 (Jan-Mar)', revenue: 38500000, units: 21 },
            { label: 'Q2 2026 (Apr - Jun)', shortLabel: 'Q2 (Apr-Jun)', revenue: 49200000, units: 26 },
            { label: 'Q3 2026 (Jul - Sep)', shortLabel: 'Q3 (Jul-Sep)', revenue: 58400000, units: 31 },
            { label: 'Q4 2026 (Oct - Dec Pacing)', shortLabel: 'Q4 (Pacing)', revenue: 38550000, units: 20 },
          ] as SalesDataPoint[],
          transactions: [
            {
              id: 'tx-a1',
              referenceNo: 'GB-ANNUAL-26-094',
              vehicleTitle: '2024 Porsche 911 GT3 RS (992)',
              vehicleImage: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=600&q=80',
              category: 'cars',
              buyerName: 'Enrique Zobel',
              date: 'Oct 1, 2026',
              time: '04:00 PM',
              amount: 24500000,
              paymentMethod: "Manager's Check",
              status: 'Completed & Transferred',
            },
            {
              id: 'tx-a2',
              referenceNo: 'GB-ANNUAL-26-095',
              vehicleTitle: '2024 Lexus LX600 VIP 4-Seater',
              vehicleImage: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=600&q=80',
              category: 'trucks',
              buyerName: 'Benjamin Aquino',
              date: 'Sep 19, 2026',
              time: '02:30 PM',
              amount: 6150000,
              paymentMethod: 'Bank Financing',
              status: 'Completed & Transferred',
            },
            {
              id: 'tx-a3',
              referenceNo: 'GB-ANNUAL-26-096',
              vehicleTitle: '2023 Ford Ranger Raptor Bi-Turbo',
              vehicleImage: 'https://images.unsplash.com/photo-1559416523-140ddc3d238c?auto=format&fit=crop&w=600&q=80',
              category: 'trucks',
              buyerName: 'Michael Concepcion',
              date: 'Aug 24, 2026',
              time: '11:20 AM',
              amount: 2580000,
              paymentMethod: 'Bank Financing',
              status: 'Completed & Transferred',
            },
            {
              id: 'tx-a4',
              referenceNo: 'GB-ANNUAL-26-097',
              vehicleTitle: '2024 Ducati Panigale V4 S',
              vehicleImage: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=600&q=80',
              category: 'motorcycles',
              buyerName: 'Dominic Laurel',
              date: 'Aug 14, 2026',
              time: '03:15 PM',
              amount: 1850000,
              paymentMethod: 'Cash Transfer',
              status: 'Completed & Transferred',
            },
          ] as ClosedTransaction[],
          categoryBreakdown: [
            { name: 'Cars & Sedans', key: 'cars', amount: 82400000, count: 42, share: 45, topModel: 'Porsche 911 GT3 RS', color: '#1D5FD1' },
            { name: 'Trucks & 4x4', key: 'trucks', amount: 69800000, count: 35, share: 38, topModel: 'Lexus LX600 VIP', color: '#1E293B' },
            { name: 'Performance Bikes', key: 'motorcycles', amount: 24350000, count: 14, share: 13, topModel: 'Ducati Panigale V4 S', color: '#D97706' },
            { name: 'Smart E-Bikes', key: 'ebikes', amount: 8100000, count: 7, share: 4, topModel: 'Sur-Ron Ultra Bee R', color: '#059669' },
          ],
        };
    }
  }, [timeframe]);

  // Format currency helpers
  const formatPHP = (num: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      maximumFractionDigits: 0,
    }).format(num);
  };

  // Filter transactions by category, status, and search query
  const filteredTransactions = useMemo(() => {
    return reportData.transactions.filter((tx) => {
      const matchesCategory = selectedCategory === 'all' || tx.category === selectedCategory;
      const matchesStatus = selectedStatus === 'all' || tx.status === selectedStatus;
      const matchesQuery =
        !searchQuery.trim() ||
        tx.referenceNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.vehicleTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.buyerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.paymentMethod.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesStatus && matchesQuery;
    });
  }, [reportData.transactions, selectedCategory, selectedStatus, searchQuery]);

  // Chart normalization metrics
  const maxRevenue = useMemo(() => {
    const max = Math.max(...reportData.chartData.map((d) => d.revenue));
    return max > 0 ? max : 1;
  }, [reportData.chartData]);

  const maxUnits = useMemo(() => {
    const max = Math.max(...reportData.chartData.map((d) => d.units));
    return max > 0 ? max : 1;
  }, [reportData.chartData]);

  // CSV Export Action
  const handleExportCSV = () => {
    const headers = ['Transaction Reference', 'Vehicle', 'Category', 'Buyer', 'Date', 'Time', 'Amount (PHP)', 'Payment Method', 'Status'];
    const rows = reportData.transactions.map((tx) => [
      tx.referenceNo,
      `"${tx.vehicleTitle}"`,
      tx.category,
      `"${tx.buyerName}"`,
      tx.date,
      tx.time || '',
      tx.amount,
      `"${tx.paymentMethod}"`,
      `"${tx.status}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `GroomBroom_CertifiedMotors_Sales_${timeframe}_2026.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(
      'Sales Report Exported',
      `Official Groom Broom Certified Motors statement for ${timeframe.toUpperCase()} exported to CSV.`,
      'success'
    );
  };

  const getCategoryIcon = (key?: string) => {
    switch (key) {
      case 'trucks':
        return <Truck className="w-5 h-5 text-[#202426]" />;
      case 'motorcycles':
        return <Bike className="w-5 h-5 text-[#141517]" />;
      case 'ebikes':
        return <Zap className="w-5 h-5 text-[#141517]" />;
      default:
        return <Car className="w-5 h-5 text-[#1D5FD1]" />;
    }
  };

  return (
    <div className="space-y-8 w-full">
      {/* ── 1. REPORT HEADER & TIMEFRAME SELECTOR ── */}
      <div className="border-t-2 border-[#141517] pt-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-6 border-b border-[#DDE3E6]">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-[#4E585E] tabular-nums">
                {reportData.periodLabel}
              </span>
              <span className="text-xs text-[#4E585E]">· Demo data</span>
            </div>
            <h2 className="font-display text-[clamp(1.6rem,3vw,2.4rem)] leading-none text-[#141517] mt-3">
              {reportData.title}
            </h2>
            <p className="text-xs sm:text-sm text-[#4E585E] mt-1">
              Live executive financial metrics for <strong className="text-[#141517] font-semibold">Groom Broom Certified Motors</strong>.
            </p>
          </div>

          {/* Timeframe Switcher & Export */}
          <div className="flex flex-wrap items-center gap-3 self-start lg:self-center">
            {/* Interactive Timeframe Segmented Control */}
            <div className="inline-flex items-center p-1 rounded-[2px] bg-[#EEF1F2] border border-[#C9D1D6] text-xs font-semibold">
              {(
                [
                  { id: 'daily', label: 'Daily' },
                  { id: 'weekly', label: 'Weekly' },
                  { id: 'monthly', label: 'Monthly' },
                  { id: 'annual', label: 'Annual' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setTimeframe(tab.id)}
                  className={`px-4 py-2 rounded-[2px] text-xs font-bold transition-colors cursor-pointer ${
                    timeframe === tab.id
                      ? 'bg-[#141517] text-white'
                      : 'text-[#4E585E] hover:text-[#141517] hover:bg-gray-200/60'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Export CSV Button */}
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-[#F7F8F8] border border-[#C9D1D6] hover:border-[#141517] text-[#202426] rounded-[2px] text-xs font-bold transition-colors cursor-pointer"
              title="Export statement as CSV"
            >
              <Download className="w-4 h-4 text-[#1D5FD1]" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Primary Metric KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 pt-6">
          {/* Gross Revenue */}
          <div className="p-5 border-t border-[#8C989F] transition-colors">
            <div className="flex items-center justify-between">
              <span className="gb-label">
                Gross Sales Volume
              </span>
            </div>
            <div className="font-display text-[clamp(24px,4vw,30px)] leading-none text-[#141517] tabular-nums mt-2 whitespace-nowrap">
              {formatPHP(reportData.grossRevenue)}
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs">
              <span className={`inline-flex items-center gap-1 font-bold ${
                reportData.growthPositive ? 'text-[#141517]' : 'text-[#B42318]'
              }`}>
                {reportData.growthPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                +{reportData.growthRate}%
              </span>
              <span className="text-[#6B767D] text-[11px] tabular-nums">vs prior {timeframe}</span>
            </div>
          </div>

          {/* Units Settled */}
          <div className="p-5 border-t border-[#8C989F] transition-colors">
            <div className="flex items-center justify-between">
              <span className="gb-label">
                Units Settled
              </span>
            </div>
            <div className="font-display text-[clamp(24px,4vw,30px)] leading-none text-[#141517] tabular-nums mt-2 whitespace-nowrap">
              {reportData.unitsSold} <span className="text-sm font-sans font-semibold text-[#4E585E]">Vehicles</span>
            </div>
            <div className="text-xs text-[#4E585E] mt-2 flex items-center justify-between">
              <span>Lot velocity: <strong className="text-[#141517] tabular-nums">14 days avg</strong></span>
              <span className="text-[#141517] font-semibold tabular-nums text-[11px]">+{reportData.unitsSold - reportData.previousUnits} units</span>
            </div>
          </div>

          {/* Average Selling Price */}
          <div className="p-5 border-t border-[#8C989F] transition-colors">
            <div className="flex items-center justify-between">
              <span className="gb-label">
                Average Deal Size (ASP)
              </span>
            </div>
            <div className="font-display text-[clamp(24px,4vw,30px)] leading-none text-[#141517] tabular-nums mt-2 whitespace-nowrap">
              {formatPHP(reportData.averageOrderValue)}
            </div>
            <div className="text-xs text-[#4E585E] mt-2 flex items-center justify-between">
              <span>Conversion: <strong className="text-[#141517] tabular-nums">{reportData.conversionRate}%</strong></span>
              <span className="text-[#6B767D] tabular-nums text-[11px]">{reportData.inquiriesReceived} leads</span>
            </div>
          </div>

          {/* Financing Mix */}
          <div className="p-5 border-t border-[#8C989F] transition-colors">
            <div className="flex items-center justify-between">
              <span className="gb-label">
                Payment Settlement Mix
              </span>
            </div>
            <div className="flex items-center justify-between mt-3 text-xs tabular-nums font-bold">
              <span className="text-[#141517] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#1D5FD1]" />
                Financing {reportData.financingPercentage}%
              </span>
              <span className="text-[#141517] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#141517]" />
                Cash {reportData.cashPercentage}%
              </span>
            </div>
            <div className="w-full h-2.5 bg-gray-200 rounded-full mt-3 overflow-hidden flex">
              <div
                className="bg-[#1D5FD1] h-full transition-[width,height] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]"
                style={{ width: `${reportData.financingPercentage}%` }}
              />
              <div
                className="bg-[#141517] h-full transition-[width,height] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]"
                style={{ width: `${reportData.cashPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. VISUAL GRAPH: REVENUE TRAJECTORY & UNIT VELOCITY (INTUITIVE & CLEAR) ── */}
      <div className="border-t-2 border-[#141517] pt-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#DDE3E6]">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg sm:text-xl font-bold text-[#141517]">
                Revenue Trajectory & Unit Velocity
              </h3>
              <span className="text-[10px] tabular-nums font-bold text-[#4E585E] bg-[#EEF1F2] border border-[#C9D1D6] px-2.5 py-0.5 rounded-full">
                {timeframe.toUpperCase()}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#4E585E] mt-1">
              Clear visual pacing with readable scale benchmarks and live interval breakdown.
            </p>
          </div>

          {/* Metric View Mode Toggle (Revenue vs Units) */}
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center p-1 rounded-[2px] bg-[#EEF1F2] border border-[#C9D1D6] text-xs font-bold">
              <button
                onClick={() => setChartViewMode('revenue')}
                className={`px-3 py-1.5 rounded-[2px] transition-colors cursor-pointer flex items-center gap-1.5 ${
                  chartViewMode === 'revenue'
                    ? 'bg-white text-[#141517]'
                    : 'text-[#4E585E] hover:text-[#141517]'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5 text-[#1D5FD1]" />
                <span>Revenue (₱)</span>
              </button>
              <button
                onClick={() => setChartViewMode('units')}
                className={`px-3 py-1.5 rounded-[2px] transition-colors cursor-pointer flex items-center gap-1.5 ${
                  chartViewMode === 'units'
                    ? 'bg-white text-[#141517]'
                    : 'text-[#4E585E] hover:text-[#141517]'
                }`}
              >
                <Car className="w-3.5 h-3.5 text-[#2A2E31]" />
                <span>Units Sold</span>
              </button>
            </div>
          </div>
        </div>

        {/* Clear Chart Area with Explicit Y-Axis Scale Gridlines */}
        <div className="relative pt-6 pb-2">
          {/* Y-Axis Gridlines & Reference Scale */}
          <div className="absolute inset-x-0 top-6 bottom-10 flex flex-col justify-between pointer-events-none text-[11px] tabular-nums text-[#6B767D]">
            {[1, 0.75, 0.5, 0.25, 0].map((fraction, i) => (
              <div key={i} className="flex items-center w-full border-b border-gray-100/90 pb-0.5">
                <span className="w-14 sm:w-20 shrink-0 text-right pr-2 sm:pr-3 font-semibold text-[#6B767D]">
                  {chartViewMode === 'revenue'
                    ? fraction === 0
                      ? '₱0'
                      : `₱${((maxRevenue * fraction) / 1000000).toFixed(1)}M`
                    : fraction === 0
                    ? '0'
                    : `${Math.round(maxUnits * fraction)} units`}
                </span>
                <div className="flex-1 border-b border-dashed border-[#C9D1D6]" />
              </div>
            ))}
          </div>

          {/* Bar Chart Columns */}
          <div className="h-64 sm:h-72 ml-14 sm:ml-20 flex items-end justify-between gap-2 sm:gap-6 px-0 sm:px-6 relative z-10">
            {reportData.chartData.map((dp, idx) => {
              const currentVal = chartViewMode === 'revenue' ? dp.revenue : dp.units;
              const maxVal = chartViewMode === 'revenue' ? maxRevenue : maxUnits;
              const heightPercent = maxVal > 0 ? Math.round((currentVal / maxVal) * 100) : 0;
              const isZero = currentVal === 0;

              return (
                <div
                  key={idx}
                  onMouseEnter={() => setHoveredPoint(dp)}
                  onMouseLeave={() => setHoveredPoint(null)}
                  className="flex-1 min-w-0 flex flex-col items-center h-full justify-end group cursor-pointer relative"
                >
                  {/* Top value chip - Visible and readable */}
                  <div className="mb-2 text-center transition-colors duration-200 hidden sm:block">
                    <span
                      className={`inline-block whitespace-nowrap tabular-nums text-[11px] font-bold px-2 py-0.5 rounded-[2px] ${
                        dp.revenue > 0
                          ? 'bg-[#202426] text-white group-hover:bg-[#1D5FD1]'
                          : 'text-[#8C989F]'
                      }`}
                    >
                      {chartViewMode === 'revenue'
                        ? dp.revenue > 0
                          ? `₱${(dp.revenue / 1000000).toFixed(1)}M`
                          : '₱0'
                        : `${dp.units} u`}
                    </span>
                  </div>

                  {/* Refined Modern Bar */}
                  <div className="w-full max-w-[56px] bg-[#EEF1F2]/80 rounded-t-[2px] overflow-hidden flex flex-col justify-end h-full group-hover:bg-gray-200 transition-colors">
                    <div
                      className={`w-full transition-[width,height] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] rounded-t-[2px] ${
                        currentVal > 0
                          ? chartViewMode === 'revenue'
                            ? 'bg-[#1D5FD1] group-hover:bg-[#174CA8]'
                            : 'bg-[#8C989F] group-hover:bg-[#141517]'
                          : 'bg-gray-200 h-1'
                      }`}
                      style={{
                        height: isZero ? '4px' : `${Math.max(heightPercent, 8)}%`,
                      }}
                    />
                  </div>

                  {/* Bottom interval text */}
                  <div className="mt-3 text-center w-full min-w-0">
                    <span className="block max-w-full text-[11px] sm:text-xs tabular-nums font-bold text-[#2A2E31] truncate group-hover:text-[#141517]">
                      {dp.shortLabel}
                    </span>
                    <span className="hidden sm:block text-[10px] text-[#6B767D] tabular-nums mt-0.5">
                      {dp.units} {dp.units === 1 ? 'deal' : 'deals'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Hover / Info Legend Banner */}
        <div className="pt-3 border-t border-[#DDE3E6] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 text-[#4E585E] tabular-nums text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-[2px] bg-[#1D5FD1]" />
              Volume Pacing
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-[2px] bg-gray-800" />
              Units Closed
            </span>
          </div>

          {hoveredPoint ? (
            <div className="bg-[#141517] text-white px-3.5 py-1.5 rounded-[2px] tabular-nums text-xs flex items-center gap-3 animate-fade-in">
              <span className="text-[#8C989F] font-semibold">{hoveredPoint.label}:</span>
              <span className="text-[#1D5FD1] font-bold">{formatPHP(hoveredPoint.revenue)}</span>
              <span className="text-[#6B767D]">({hoveredPoint.units} units settled)</span>
            </div>
          ) : (
            <span className="text-[#6B767D] tabular-nums text-[11px]">
              Hover over columns for interval inspection · Peak: <strong className="text-[#2A2E31]">{formatPHP(maxRevenue)}</strong>
            </span>
          )}
        </div>
      </div>

      {/* ── 3. REVENUE BY VEHICLE CLASS (HARMONIOUS PORTFOLIO BAR + DIRECT FILTER CARDS) ── */}
      <div className="border-t-2 border-[#141517] pt-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#DDE3E6]">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg sm:text-xl font-bold text-[#141517]">
                Revenue by Vehicle Class
              </h3>
              <span className="text-[10px] tabular-nums font-bold uppercase tracking-wider px-2 py-0.5 rounded-[2px] bg-[#EEF1F2] text-[#2A2E31] border border-[#C9D1D6]">
                Fleet Portfolio
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#4E585E] mt-1">
              Cohesive portfolio share and sales breakdown. Click any category card to immediately filter the ledger below.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs tabular-nums text-[#4E585E]">
            <span>Portfolio Total:</span>
            <strong className="text-[#141517] font-bold">{formatPHP(reportData.grossRevenue)}</strong>
          </div>
        </div>

        {/* Unified 100% Stacked Distribution Bar */}
        <div className="space-y-2">
          <div className="w-full h-4 bg-[#EEF1F2] rounded-[2px] overflow-hidden flex border border-[#C9D1D6]/60">
            {reportData.categoryBreakdown.map((cat, idx) => (
              <div
                key={idx}
                style={{ width: `${cat.share}%`, backgroundColor: cat.color }}
                className="h-full transition-[width,height] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] hover:opacity-90 relative group cursor-pointer"
                onClick={() => setSelectedCategory(cat.key as VehicleCategory)}
                title={`${cat.name}: ${cat.share}% (${formatPHP(cat.amount)})`}
              />
            ))}
          </div>

          {/* Unified Legend */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs tabular-nums">
            {reportData.categoryBreakdown.map((cat, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedCategory(selectedCategory === cat.key ? 'all' : (cat.key as VehicleCategory))}
                className={`flex items-center gap-2 px-2.5 py-1 rounded-[2px] transition-colors cursor-pointer ${
                  selectedCategory === cat.key ? 'bg-[#EEF1F2] font-bold' : 'hover:bg-[#F7F8F8]'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                <span className="text-[#2A2E31]">{cat.name}</span>
                <span className="font-bold text-[#141517]">({cat.share}%)</span>
              </button>
            ))}
          </div>
        </div>

        {/* 4 Clean Comparative Category Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5 pt-2">
          {reportData.categoryBreakdown.map((cat, i) => {
            const isSelected = selectedCategory === cat.key;
            const icon = getCategoryIcon(cat.key);

            return (
              <div
                key={i}
                onClick={() => setSelectedCategory(isSelected ? 'all' : (cat.key as VehicleCategory))}
                className={`p-5 rounded-[2px] border transition-colors cursor-pointer flex flex-col justify-between space-y-4 ${
                  isSelected
                    ? 'bg-[#F7F8F8] border-[#1D5FD1] ring-2 ring-[#1D5FD1]/20'
                    : 'bg-white border-[#C9D1D6] hover:border-[#141517] hover:bg-[#F7F8F8]/50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-[2px] bg-[#EEF1F2] border border-[#C9D1D6] flex items-center justify-center">
                        {icon}
                      </div>
                      <div>
                        <h4 className="font-bold text-[#141517] text-sm leading-tight">
                          {cat.name}
                        </h4>
                        <span className="text-[10px] text-[#6B767D] tabular-nums">
                          Rank #{i + 1} Contributor
                        </span>
                      </div>
                    </div>
                    <span className="text-xs tabular-nums font-bold text-[#141517] bg-[#EEF1F2] px-2 py-0.5 rounded-[2px] border border-[#C9D1D6]">
                      {cat.share}%
                    </span>
                  </div>

                  <div className="mt-4">
                    <span className="text-[10px] tabular-nums font-bold uppercase tracking-wider text-[#6B767D] block">
                      Total Volume
                    </span>
                    <div className="text-xl font-bold text-[#141517] tabular-nums tracking-tight mt-0.5">
                      {formatPHP(cat.amount)}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-[#4E585E]">
                    <span>Settled Units:</span>
                    <strong className="tabular-nums text-[#141517]">{cat.count} vehicles</strong>
                  </div>
                  <div className="flex items-center justify-between text-[#4E585E]">
                    <span>Average ASP:</span>
                    <strong className="tabular-nums text-[#141517]">{formatPHP(Math.round(cat.amount / cat.count))}</strong>
                  </div>
                  <div className="flex items-center justify-between text-[#4E585E]">
                    <span>Top Model:</span>
                    <span className="font-medium text-[#141517] truncate max-w-[130px]">{cat.topModel}</span>
                  </div>

                  <div className="pt-2">
                    <span className={`block text-center py-1.5 rounded-[2px] text-[11px] font-bold transition-colors ${
                      isSelected
                        ? 'bg-[#1D5FD1] text-white'
                        : 'bg-[#EEF1F2] text-[#2A2E31] hover:bg-gray-200'
                    }`}>
                      {isSelected ? 'Filtering ledger' : 'Filter Ledger'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 4. CLOSED DEALS LEDGER (USER-FRIENDLY & HIGH SCANABILITY) ── */}
      <div className="border-t-2 border-[#141517] pt-6 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#DDE3E6]">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg sm:text-xl font-bold text-[#141517]">
                Closed Deals Ledger
              </h3>
              <span className="text-[10px] tabular-nums font-bold uppercase tracking-wider px-2 py-0.5 rounded-[2px] bg-[#E8F0FC] text-[#1D5FD1] border border-[#1D5FD1]/20">
                Official Deeds
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#4E585E] mt-1">
              Searchable registry of executed vehicle ownership transfers, notarized deeds, and cleared funds.
            </p>
          </div>

          {/* Quick Search & Clear Toolbar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[240px] sm:min-w-[280px]">
              <Search className="w-4 h-4 text-[#6B767D] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search deals by buyer, vehicle, ref..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 text-xs bg-[#F7F8F8] border border-[#C9D1D6] rounded-[2px] text-[#141517] focus:bg-white focus:border-[#1D5FD1] transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B767D] hover:text-[#2A2E31] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Dropdown */}
            <div className="flex items-center gap-1.5 bg-[#F7F8F8] border border-[#C9D1D6] rounded-[2px] px-2.5 py-1.5">
              <Filter className="w-3.5 h-3.5 text-[#4E585E] shrink-0" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as VehicleCategory)}
                className="bg-transparent text-xs text-[#202426] font-semibold focus:outline-hidden cursor-pointer"
              >
                <option value="all">All Vehicle Classes</option>
                <option value="cars">Cars & Sedans</option>
                <option value="trucks">Trucks & 4x4</option>
                <option value="motorcycles">Motorcycles</option>
                <option value="ebikes">E-Bikes</option>
              </select>
            </div>
          </div>
        </div>

        {/* Quick Status Filter Tabs (One-Click Status Filtering) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
          <span className="text-[#6B767D] font-medium text-[11px] mr-1 shrink-0">Filter Status:</span>
          {[
            { id: 'all', label: 'All Deals' },
            { id: 'Completed & Transferred', label: 'Completed & Transferred' },
            { id: 'Payment Cleared', label: 'Payment Cleared' },
            { id: 'Escrow Released', label: 'Escrow Released' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedStatus(tab.id)}
              className={`px-3 py-1.5 rounded-[2px] font-bold whitespace-nowrap cursor-pointer transition-colors border ${
                selectedStatus === tab.id
                  ? 'bg-[#141517] text-white border-[#141517]'
                  : 'bg-[#F7F8F8] hover:bg-[#EEF1F2] text-[#4E585E] border-[#C9D1D6]'
              }`}
            >
              {tab.label}
            </button>
          ))}

          {(selectedCategory !== 'all' || selectedStatus !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSelectedStatus('all');
                setSearchQuery('');
              }}
              className="text-[11px] font-bold text-[#1D5FD1] hover:underline px-2 py-1 cursor-pointer shrink-0 ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Clear, Spacious Table with High Scanability */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[920px]">
            <thead>
              <tr className="border-b border-[#DDE3E6] text-[#6B767D] uppercase tabular-nums tracking-wider text-[10px]">
                <th className="pb-3 pl-2 font-bold w-[170px]">Date & Reference</th>
                <th className="pb-3 font-bold w-[280px]">Vehicle</th>
                <th className="pb-3 font-bold w-[160px]">Buyer</th>
                <th className="pb-3 font-bold w-[150px]">Payment Method</th>
                <th className="pb-3 font-bold w-[160px]">Status</th>
                <th className="pb-3 font-bold text-right w-[140px]">Settled Price</th>
                <th className="pb-3 font-bold text-center pr-2 w-[110px]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DDE3E6]">
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-[#F7F8F8]/80 transition-colors group">
                    {/* Date & Ref */}
                    <td className="py-4 pl-2 tabular-nums">
                      <span className="font-bold text-[#141517] block text-xs">
                        {tx.date}
                      </span>
                      <span className="inline-block tabular-nums text-[11px] text-[#4E585E] mt-0.5">
                        {tx.referenceNo}
                      </span>
                    </td>

                    {/* Vehicle */}
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={tx.vehicleImage}
                          alt=""
                          className="w-14 h-10 rounded-[2px] object-cover bg-[#141517] shrink-0 border border-[#C9D1D6]"
                        />
                        <div className="min-w-0 pr-3">
                          <p className="font-bold text-[#141517] text-xs sm:text-sm truncate">
                            {tx.vehicleTitle}
                          </p>
                          <span className="inline-block text-[10px] tabular-nums uppercase font-bold text-[#4E585E] mt-0.5">
                            {tx.category.toUpperCase()} · Certified LTO Stock
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Buyer */}
                    <td className="py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gray-200 text-[#202426] font-bold flex items-center justify-center shrink-0 tabular-nums text-xs">
                          {tx.buyerName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-[#141517] leading-tight">
                            {tx.buyerName}
                          </p>
                          <span className="text-[10px] text-[#6B767D] tabular-nums block mt-0.5">
                            Verified PhilID
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Payment Method */}
                    <td className="py-4">
                      <span className="inline-flex items-center gap-1.5 text-[#2A2E31] font-medium text-xs bg-[#EEF1F2] px-2.5 py-1 rounded-[2px] border border-[#C9D1D6]/80">
                        <CreditCard className="w-3.5 h-3.5 text-[#4E585E]" />
                        <span>{tx.paymentMethod}</span>
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-4">
                      <StatusMark status={tx.status} />
                    </td>

                    {/* Amount */}
                    <td className="py-4 text-right">
                      <div className="tabular-nums text-sm sm:text-base font-bold text-[#141517] tabular-nums">
                        {formatPHP(tx.amount)}
                      </div>
                      <span className="text-[10px] text-[#6B767D] tabular-nums">
                        VAT & Docs Incl.
                      </span>
                    </td>

                    {/* Action */}
                    <td className="py-4 pr-2 text-center">
                      <button
                        onClick={() => setViewingReceiptTx(tx)}
                        className="px-3 py-1.5 bg-[#EEF1F2] hover:bg-[#1D5FD1] hover:text-white text-[#2A2E31] rounded-[2px] text-xs font-bold transition-colors flex items-center gap-1.5 mx-auto cursor-pointer"
                        title="View Official Certificate of Sale & Deed"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Deed</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#6B767D]">
                    <p className="text-sm font-semibold">No closed transactions match your filters.</p>
                    <button
                      onClick={() => {
                        setSelectedCategory('all');
                        setSelectedStatus('all');
                        setSearchQuery('');
                      }}
                      className="mt-2 text-xs font-bold text-[#1D5FD1] hover:underline cursor-pointer"
                    >
                      Reset all filters
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Ledger Bottom Summary Bar */}
        <div className="pt-4 border-t border-[#DDE3E6] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#4E585E] tabular-nums">
          <div className="flex items-center gap-2">
            <span>Showing <strong className="text-[#141517]">{filteredTransactions.length}</strong> of <strong className="text-[#141517]">{reportData.transactions.length}</strong> ledger records</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Filtered Volume: <strong className="text-[#141517] font-bold">{formatPHP(filteredTransactions.reduce((acc, t) => acc + t.amount, 0))}</strong></span>
            <span className="hidden sm:inline text-[#8C989F]">|</span>
            <span className="text-[#141517] font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#141517]" /> Bureau of Internal Revenue (BIR) Compliant
            </span>
          </div>
        </div>
      </div>

      {/* ── 5. OFFICIAL RECEIPT & DEED MODAL ── */}
      {viewingReceiptTx && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-[#141517]/50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setViewingReceiptTx(null);
          }}
        >
          <div className="w-full max-w-xl bg-white p-6 sm:p-8 border border-[#141517] animate-modal-in space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#DDE3E6]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[2px] bg-[#1D5FD1] text-white flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display text-[18px] leading-tight text-[#141517]">
                    Certificate of Sale & Official Receipt
                  </h3>
                  <p className="text-xs text-[#4E585E] tabular-nums">
                    Groom Broom Certified Motors · Taguig City, Philippines
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingReceiptTx(null)}
                className="p-1.5 rounded-[2px] text-[#6B767D] hover:text-[#2A2E31] hover:bg-[#EEF1F2] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Official Reference & Timestamp */}
            <div className="p-4 border-t border-[#8C989F] flex items-center justify-between text-xs tabular-nums">
              <div>
                <span className="text-[#6B767D] block text-[10px] uppercase font-bold">Document Reference</span>
                <span className="font-bold text-[#141517] text-sm">{viewingReceiptTx.referenceNo}</span>
              </div>
              <div className="text-right">
                <span className="text-[#6B767D] block text-[10px] uppercase font-bold">Execution Date</span>
                <span className="font-bold text-[#141517]">{viewingReceiptTx.date} {viewingReceiptTx.time || ''}</span>
              </div>
            </div>

            {/* Parties */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 border-t border-[#8C989F]">
                <span className="text-[10px] tabular-nums font-bold uppercase text-[#6B767D] block">Seller Entity</span>
                <p className="font-bold text-[#141517] mt-1">Groom Broom Certified Motors</p>
                <p className="text-[11px] text-[#4E585E]">TIN: 009-842-192-000</p>
                <p className="text-[11px] text-[#4E585E]">BGC Taguig, Metro Manila</p>
              </div>

              <div className="p-3.5 border-t border-[#8C989F]">
                <span className="text-[10px] tabular-nums font-bold uppercase text-[#6B767D] block">Purchaser / Grantee</span>
                <p className="font-bold text-[#141517] mt-1">{viewingReceiptTx.buyerName}</p>
                <p className="text-[11px] text-[#4E585E]">Status: Verified Citizen</p>
                <p className="text-[11px] text-[#4E585E]">Payment: {viewingReceiptTx.paymentMethod}</p>
              </div>
            </div>

            {/* Vehicle Details */}
            <div className="p-4 rounded-[2px] border border-[#C9D1D6] flex items-center gap-4">
              <img
                src={viewingReceiptTx.vehicleImage}
                alt=""
                className="w-16 h-12 rounded-[2px] object-cover bg-[#202426] border border-[#8C989F]"
              />
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-[#141517] text-sm truncate">{viewingReceiptTx.vehicleTitle}</h4>
                <div className="flex items-center gap-2 text-xs text-[#4E585E] tabular-nums mt-0.5">
                  <span className="capitalize">{viewingReceiptTx.category}</span>
                  <span>·</span>
                  <span className="text-[#141517] font-bold">{viewingReceiptTx.status}</span>
                </div>
              </div>
            </div>

            {/* Financial Ledger Calculation */}
            <div className="space-y-2 border-t border-[#DDE3E6] pt-4 text-xs">
              <div className="flex items-center justify-between text-[#4E585E]">
                <span>Vehicle Base Consideration</span>
                <span className="tabular-nums font-semibold">{formatPHP(Math.round(viewingReceiptTx.amount * 0.88))}</span>
              </div>
              <div className="flex items-center justify-between text-[#4E585E]">
                <span>Value Added Tax (12% VAT)</span>
                <span className="tabular-nums font-semibold">{formatPHP(Math.round(viewingReceiptTx.amount * 0.11))}</span>
              </div>
              <div className="flex items-center justify-between text-[#4E585E]">
                <span>LTO Transfer & Notarial Fee</span>
                <span className="tabular-nums font-semibold">{formatPHP(Math.round(viewingReceiptTx.amount * 0.01))}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-[#DDE3E6] text-sm font-bold text-[#141517]">
                <span>Total Settled Amount</span>
                <span className="tabular-nums text-base text-[#1D5FD1]">{formatPHP(viewingReceiptTx.amount)}</span>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-[#DDE3E6]">
              <span className="text-[11px] text-[#141517] tabular-nums font-bold flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-[#141517]" /> Deed of Absolute Sale Attached
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    showToast('Document Printed', 'Official sales receipt sent to system printer.', 'success');
                  }}
                  className="px-4 py-2 border border-[#C9D1D6] hover:bg-[#F7F8F8] rounded-[2px] text-xs font-bold text-[#202426] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Receipt</span>
                </button>
                <button
                  onClick={() => setViewingReceiptTx(null)}
                  className="px-4 py-2 bg-[#141517] hover:bg-[#2A2E31] text-white rounded-[2px] text-xs font-bold transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
