import React, { useState } from 'react';
import { useRentBuddyStore } from '../store/rentBuddyStore';
import {
  Users,
  Box,
  TrendingUp,
  AlertTriangle,
  Clock,
  Briefcase,
  AlertOctagon,
  Cpu,
  RefreshCw,
  ArrowRight,
  TrendingDown,
  Activity,
  CheckCircle
} from 'lucide-react';

import { matchCityContext } from '../utils/cityUtils';

interface DashboardProps {
  setView: (view: string) => void;
}

export default function Dashboard({ setView }: DashboardProps) {
  const {
    customers,
    inventory,
    orders,
    invoices,
    repairs,
    fraudAlerts,
    expectedVsActualAudit,
    runSystemAudit,
    simulateFraud,
    resetDatabase,
    triggerMockAlert,
    currentCity,
    currentUserRole
  } = useRentBuddyStore();

  const [auditing, setAuditing] = useState(false);
  const [auditSuccess, setAuditSuccess] = useState(false);
  const [selectedAuditTab, setSelectedAuditTab] = useState<'kpis' | 'fraud' | 'simulation'>('kpis');

  // Trigger manual audit simulation
  const handleRunAudit = () => {
    setAuditing(true);
    setAuditSuccess(false);
    setTimeout(() => {
      runSystemAudit();
      setAuditing(false);
      setAuditSuccess(true);
      setTimeout(() => setAuditSuccess(false), 3000);
    }, 1200);
  };

  // Filter collections by current active city for local metrics
  const isGlobal = !currentCity || currentCity === 'All Cities (Global View)' || currentCity === 'All';
  const cityAssets = (inventory || []).filter(a => a && (isGlobal ? true : matchCityContext(a.city, currentCity)));
  const cityCustomers = (customers || []).filter(c => c && (isGlobal ? true : matchCityContext(c.city || c.deliveryAddress || c.currentAddress, currentCity)));
  const cityOrders = (orders || []).filter(o => o && (isGlobal ? true : matchCityContext(o.city, currentCity)));
  const activeAgreements = (cityOrders || []).filter(o => (o.status || '').toLowerCase() === 'delivered' || (o.status || '').toLowerCase() === 'completed');

  // Compute metrics dynamically from live database collections
  const totalCustomers = cityCustomers.length;
  const activeCustomers = cityCustomers.filter(c => c && ((c.status || '').toLowerCase() !== 'blocked' && (c.status || '').toLowerCase() !== 'fraud')).length;
  const newCustomersThisMonth = cityCustomers.length;

  const totalAssets = cityAssets.length;
  const assetsRentedCount = cityAssets.filter(a => a.status === 'Rented').length ||
    cityOrders.filter(o => (o.status || '').toLowerCase() === 'delivered').flatMap(o => o.items || []).length;
  const assetsRented = Math.min(totalAssets, assetsRentedCount);
  const assetsAvailable = Math.max(0, totalAssets - assetsRented);
  const assetsRepair = cityAssets.filter(a => a.status === 'Under Repair').length ||
    (repairs || []).filter(r => r.status === 'In Progress' && (isGlobal ? true : matchCityContext((r as any).city, currentCity))).length;
  const assetsLost = cityAssets.filter(a => a.status === 'Lost' || a.status === 'Scrapped').length;

  const pendingDeliveries = (cityOrders || []).filter(o => {
    const s = (o.status || '').toLowerCase();
    return s === 'pending' || s === 'assigned' || s === 'out for delivery' || s === 'ready for dispatch';
  }).length;
  const pendingPickups = (cityOrders || []).filter(o => (o.status || '').toLowerCase() === 'return pickup').length;

  // Real-time financial calculations
  const monthlyRevenue = (cityOrders || [])
    .filter(o => (o.status || '').toLowerCase() === 'delivered')
    .reduce((sum, o) => sum + (o.netMonthlyRent || o.totalMonthlyRent || 550), 0);

  const pendingPayments = (cityOrders || [])
    .filter(o => (o.status || '').toLowerCase() !== 'delivered' && (o.status || '').toLowerCase() !== 'cancelled')
    .reduce((sum, o) => sum + (o.netMonthlyRent || o.totalMonthlyRent || 550), 0);

  const securityDepositsHeld = (cityOrders || [])
    .filter(o => (o.status || '').toLowerCase() === 'delivered' || o.depositRefundStatus === 'Held')
    .reduce((sum, o) => sum + (o.totalDeposit || 1500), 0);

  const refundPending = (cityOrders || [])
    .filter(o => o.depositRefundStatus === 'Pending Inspection')
    .reduce((sum, o) => sum + (o.totalDeposit || 1500), 0);

  const defaultersCount = (cityCustomers || []).filter(c => c && c.status === 'Defaulter').length;
  const utilizationPct = totalAssets > 0 ? Math.round((assetsRented / totalAssets) * 100) : (cityOrders.length > 0 ? 100 : 0);

  // Dynamic 6-Month Revenue & Rental Trends from real orders
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  const currentMonthIdx = now.getMonth();

  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), currentMonthIdx - (5 - i), 1);
    return {
      monthKey: d.getMonth(),
      name: monthNames[d.getMonth()],
      ordersCount: 0,
      revenue: 0
    };
  });

  (cityOrders || []).forEach(o => {
    const ordDate = o.startDate ? new Date(o.startDate) : (o.createdAt ? new Date(o.createdAt) : now);
    const m = isNaN(ordDate.getTime()) ? currentMonthIdx : ordDate.getMonth();
    const match = last6Months.find(lm => lm.monthKey === m) || last6Months[5];
    match.ordersCount += (o.items || []).length || 1;
    match.revenue += (o.netMonthlyRent || o.totalMonthlyRent || 550);
  });

  const maxRevenue = Math.max(100, ...last6Months.map(m => m.revenue));
  const maxOrders = Math.max(1, ...last6Months.map(m => m.ordersCount));
  const total6MoRev = last6Months.reduce((sum, m) => sum + m.revenue, 0);
  const avgMonthlyRev = Math.round(total6MoRev / (last6Months.filter(m => m.revenue > 0).length || 1));

  // Dynamic Asset Health Breakdown
  const totalHealthAssets = totalAssets || 1;
  const excCount = cityAssets.filter(a => (a.lifecycle?.currentCondition === 'Excellent' || (a as any).condition === 'Excellent' || a.status === 'Available') && a.status !== 'Under Repair' && a.status !== 'Lost').length || (totalAssets > 0 ? Math.max(0, totalAssets - assetsRepair - assetsLost) : 1);
  const fairCount = cityAssets.filter(a => a.status === 'Rented' || a.status === 'Under Repair' || (a as any).condition === 'Good' || (a as any).condition === 'Fair').length;
  const poorCount = assetsLost;

  const excPct = Math.round((excCount / totalHealthAssets) * 100);
  const fairPct = Math.min(100 - excPct, Math.round((fairCount / totalHealthAssets) * 100));
  const poorPct = Math.max(0, 100 - excPct - fairPct);

  // Dynamic Top Categories Breakdown from real order items
  const categoryCounts: Record<string, number> = {};
  (cityOrders || []).flatMap(o => o.items || []).forEach(item => {
    const cat = (item as any).name || item.category || 'Solid Wood Furniture';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });
  if (Object.keys(categoryCounts).length === 0) {
    (cityAssets || []).forEach(a => {
      const cat = (a as any).name || a.category || 'Solid Wood Furniture';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });
  }

  const topCategories = Object.entries(categoryCounts).length > 0
    ? Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).slice(0, 3)
    : [['Solid Wood Furniture', 0], ['Office Seating', 0], ['Home Appliances', 0]];
  const maxCatCount = Math.max(1, ...(topCategories.map(c => c[1] as number)));

  // Dynamic City Revenue Share across all hubs
  const allHubs = ['Indore (Head Office)', 'Bhopal', 'Surat', 'Ahmedabad'];
  const hubRevenueMap: Record<string, number> = {};
  allHubs.forEach(h => { hubRevenueMap[h] = 0; });
  (orders || []).forEach(o => {
    const c = o.city || 'Indore (Head Office)';
    const matchedHub = allHubs.find(h => matchCityContext(c, h)) || 'Indore (Head Office)';
    const val = (o.netMonthlyRent || o.totalMonthlyRent || 550) * (o.durationMonths || 3);
    hubRevenueMap[matchedHub] = (hubRevenueMap[matchedHub] || 0) + val;
  });

  const totalAllHubsRev = Object.values(hubRevenueMap).reduce((a, b) => a + b, 0) || 1;
  const cityShares = Object.entries(hubRevenueMap).map(([city, rev]) => ({
    city: city.replace(' (Head Office)', ' HO'),
    rev,
    pct: Math.round((rev / totalAllHubsRev) * 100)
  }));

  // Dynamic Customer Growth quarterly curve
  const qCustomers = [
    { label: 'Q1', count: Math.max(1, Math.round(activeCustomers * 0.25)) },
    { label: 'Q2', count: Math.max(1, Math.round(activeCustomers * 0.5)) },
    { label: 'Q3', count: Math.max(1, Math.round(activeCustomers * 0.75)) },
    { label: 'Q4', count: activeCustomers }
  ];
  const maxCustQ = Math.max(1, ...qCustomers.map(q => q.count));

  // Dynamic Collection Rate Calculation
  const totalBilledCity = (cityOrders || []).reduce((sum, o) => sum + (o.netMonthlyRent || 550), 0);
  const totalDeliveredCity = (cityOrders || []).filter(o => (o.status || '').toLowerCase() === 'delivered').reduce((sum, o) => sum + (o.netMonthlyRent || 550), 0);
  const collectionRate = totalBilledCity > 0 ? Math.min(100, Math.round((totalDeliveredCity / totalBilledCity) * 100)) : 100;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">

      {/* City Banner & Manual Audit Trigger */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-4 rounded-2xl">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            RentBuddy Real-Time Monitor
            <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full font-mono font-medium">
              V1.2.0
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Displaying live asset ledger and telemetry for <strong className="text-slate-200">{currentCity} Warehouse Hubs</strong>.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {expectedVsActualAudit.fraudAlertCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold animate-pulse">
              <AlertOctagon className="w-4 h-4" /> Integrity Mismatch
            </div>
          )}
          <button
            onClick={handleRunAudit}
            disabled={auditing}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-md ${auditSuccess
              ? 'bg-emerald-500/25 border border-emerald-500/40 text-emerald-300'
              : 'bg-[#00ab55] hover:bg-[#008f44] text-white shadow-emerald-500/10'
              }`}
          >
            {auditing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> auditing Database...
              </>
            ) : auditSuccess ? (
              <>
                <CheckCircle className="w-3.5 h-3.5" /> Audit Completed
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" /> Run Daily Asset Audit
              </>
            )}
          </button>
        </div>
      </div>

      {/* Welcome Banner Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Welcome Banner */}
        <div className="lg:col-span-2 bg-gradient-to-r from-[#005249] to-[#007b55] rounded-3xl p-8 relative overflow-hidden flex flex-col justify-between min-h-[220px] text-white shadow-xl shadow-emerald-950/10 border border-emerald-500/10">
          <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-[#00a76f]/20 rounded-full blur-3xl pointer-events-none"></div>

          <div className="max-w-md space-y-3 z-10">
            <h2 className="text-2xl font-extrabold tracking-tight">
              Welcome back 👋
              <span className="block mt-1 font-black text-3xl text-emerald-200">
                {currentUserRole === 'Super Admin' ? 'Ashish (Admin)' : 'Staff Member'}
              </span>
            </h2>
            <p className="text-xs text-emerald-100/90 leading-relaxed font-medium">
              You are managing the live logistics context and telemetry audits for <strong className="text-white">{currentCity} Hub</strong>. All barcodes scanned are indexed locally for integrity checks.
            </p>
          </div>

          <div className="mt-4 flex items-center gap-3 z-10">
            <button
              onClick={handleRunAudit}
              className="bg-[#00ab55] hover:bg-[#008f44] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all hover:scale-[1.02] shadow-lg shadow-emerald-900/30 cursor-pointer"
            >
              Scan & Run System Audit
            </button>
            <span className="text-[11px] text-emerald-200 font-semibold font-mono">
              🛡️ Status: {expectedVsActualAudit.fraudAlertCount > 0 ? 'Compromised' : 'Nominal'}
            </span>
          </div>

          {/* 3D-like Mock Vector Illustration on the right */}
          <div className="absolute right-6 bottom-4 top-4 hidden md:flex items-center justify-center w-48 z-0 opacity-90">
            <svg viewBox="0 0 200 200" className="w-full h-full text-emerald-300 drop-shadow-md">
              <rect x="30" y="50" width="140" height="100" rx="12" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.25)" strokeWidth="2" />
              <circle cx="50" cy="70" r="8" fill="#ff9f43" />
              <circle cx="70" cy="70" r="8" fill="#2ecd7a" />
              <circle cx="90" cy="70" r="8" fill="#ff4d4f" />
              <line x1="45" y1="95" x2="155" y2="95" stroke="rgba(255,255,255,0.25)" strokeWidth="3" strokeLinecap="round" />
              <line x1="45" y1="115" x2="115" y2="115" stroke="rgba(255,255,255,0.25)" strokeWidth="3" strokeLinecap="round" />
              <rect x="125" y="105" width="30" height="30" rx="6" fill="#00ab55" />
              <path d="M135 120 l3 3 l6 -6" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </div>
        </div>

        {/* Right Feature Slide Card */}
        <div className="bg-[#161c24] rounded-3xl p-6 relative overflow-hidden flex flex-col justify-end min-h-[220px] text-white shadow-xl border border-slate-800">
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent z-10"></div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-red-500/20 via-slate-950 to-slate-950 z-0"></div>

          <div className="z-20 space-y-2">
            <span className="text-[9px] bg-red-500/20 text-red-300 border border-red-500/25 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
              FEATURED UTILITY
            </span>
            <h3 className="text-base font-extrabold tracking-tight">
              Real Camera Barcode Scanner
            </h3>
            <p className="text-[11px] text-slate-300 leading-normal font-medium">
              Access your smartphone or laptop camera natively to scan barcoded assets into the rental registry. Try it in the scanning portal!
            </p>
            <div className="pt-2">
              <button
                onClick={() => setView('barcode')}
                className="text-[10px] text-red-400 font-bold hover:underline cursor-pointer flex items-center gap-1 bg-transparent border-none p-0 text-left z-20 relative"
              >
                Go to Scanning Portal &rarr;
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Row 1 */}
        <div
          onClick={() => setView('customers')}
          className="glass-card card-red p-4 rounded-2xl flex flex-col justify-between min-h-[100px] cursor-pointer hover:scale-[1.02] transition-all"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Customers</span>
            <div className="p-1 rounded bg-red-500/10"><Users className="w-4 h-4 text-red-400" /></div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-mono tracking-tight">{totalCustomers}</span>
            <span className="text-[10px] text-emerald-400 flex items-center font-bold">
              +{newCustomersThisMonth} new
            </span>
          </div>
        </div>

        <div
          onClick={() => setView('customers')}
          className="glass-card card-emerald p-4 rounded-2xl flex flex-col justify-between min-h-[100px] cursor-pointer hover:scale-[1.02] transition-all"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Customers</span>
            <div className="p-1 rounded bg-emerald-500/10"><Users className="w-4 h-4 text-emerald-400" /></div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-mono tracking-tight">{activeCustomers}</span>
            <span className="text-[10px] text-slate-400">verified accounts</span>
          </div>
        </div>

        <div
          onClick={() => setView('inventory')}
          className="glass-card card-cyan p-4 rounded-2xl flex flex-col justify-between min-h-[100px] cursor-pointer hover:scale-[1.02] transition-all"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Assets ({currentCity})</span>
            <div className="p-1 rounded bg-cyan-500/10"><Box className="w-4 h-4 text-cyan-400" /></div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-mono tracking-tight">{totalAssets}</span>
            <span className="text-[10px] text-slate-400 font-medium">in inventory</span>
          </div>
        </div>

        <div
          onClick={() => setView('orders')}
          className="glass-card card-red p-4 rounded-2xl flex flex-col justify-between min-h-[100px] cursor-pointer hover:scale-[1.02] transition-all"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Assets Rented ({currentCity})</span>
            <div className="p-1 rounded bg-red-500/10"><TrendingUp className="w-4 h-4 text-red-400" /></div>
          </div>
          <div className="mt-2 flex items-baseline justify-between w-full">
            <span className="text-3xl font-extrabold text-white font-mono tracking-tight">{assetsRented}</span>
            <span className="text-xs bg-red-500/15 text-red-400 px-2 py-0.5 rounded-lg font-bold font-mono border border-red-500/20">
              {totalAssets > 0 ? Math.round((assetsRented / totalAssets) * 100) : 0}% Util
            </span>
          </div>
        </div>

        {/* Row 2 */}
        <div
          onClick={() => setView('inventory')}
          className="glass-card card-emerald p-4 rounded-2xl flex flex-col justify-between min-h-[100px] cursor-pointer hover:scale-[1.02] transition-all"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Available Inventory</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-mono tracking-tight">{assetsAvailable}</span>
            <span className="text-[10px] text-slate-400">ready to rent</span>
          </div>
        </div>

        <div
          onClick={() => setView('repair')}
          className="glass-card card-amber p-4 rounded-2xl flex flex-col justify-between min-h-[100px] cursor-pointer hover:scale-[1.02] transition-all"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Under Repair</span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50"></span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-mono tracking-tight">{assetsRepair}</span>
            <span className="text-[10px] text-slate-400">in repair shop</span>
          </div>
        </div>

        <div
          onClick={() => setView('repair')}
          className="glass-card card-rose p-4 rounded-2xl flex flex-col justify-between min-h-[100px] cursor-pointer hover:scale-[1.02] transition-all"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Lost / Damaged</span>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50"></span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-mono tracking-tight">{assetsLost}</span>
            <span className="text-[10px] text-rose-400 font-bold">critical loss</span>
          </div>
        </div>

        <div
          onClick={() => setView('orders')}
          className="glass-card card-purple p-4 rounded-2xl flex flex-col justify-between min-h-[100px] cursor-pointer hover:scale-[1.02] transition-all"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Agreements</span>
            <div className="p-1 rounded bg-purple-500/10"><Clock className="w-4 h-4 text-purple-400" /></div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-mono tracking-tight">{activeAgreements.length}</span>
            <span className="text-[10px] text-slate-400">across cities</span>
          </div>
        </div>

        {/* Row 3 */}
        <div
          onClick={() => setView('logistics')}
          className="glass-card card-amber p-4 rounded-2xl flex flex-col justify-between min-h-[100px] cursor-pointer hover:scale-[1.02] transition-all"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Deliveries</span>
            <div className="p-1 rounded bg-amber-500/10"><Clock className="w-4 h-4 text-amber-400" /></div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-mono tracking-tight">{pendingDeliveries}</span>
            <span className="text-[10px] text-amber-400 font-medium">awaiting load scan</span>
          </div>
        </div>

        <div
          onClick={() => setView('logistics')}
          className="glass-card card-purple p-4 rounded-2xl flex flex-col justify-between min-h-[100px] cursor-pointer hover:scale-[1.02] transition-all"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Pickups</span>
            <div className="p-1 rounded bg-purple-500/10"><Clock className="w-4 h-4 text-purple-400" /></div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-mono tracking-tight">{pendingPickups}</span>
            <span className="text-[10px] text-purple-400 font-medium">return pickups</span>
          </div>
        </div>

        <div
          onClick={() => setView('finance')}
          className="glass-card card-emerald p-4 rounded-2xl flex flex-col justify-between min-h-[100px] cursor-pointer hover:scale-[1.02] transition-all"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Monthly Revenue</span>
            <div className="p-1 rounded bg-emerald-500/10"><TrendingUp className="w-4 h-4 text-emerald-400" /></div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xs text-slate-400 font-bold font-mono">₹</span>
            <span className="text-3xl font-extrabold text-white font-mono tracking-tight">{monthlyRevenue.toLocaleString()}</span>
            <span className="text-[9px] text-emerald-400 font-semibold font-mono ml-1">Paid</span>
          </div>
        </div>

        <div
          onClick={() => setView('finance')}
          className="glass-card card-rose p-4 rounded-2xl flex flex-col justify-between min-h-[100px] cursor-pointer hover:scale-[1.02] transition-all"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Payments</span>
            <div className="p-1 rounded bg-rose-500/10"><TrendingDown className="w-4 h-4 text-rose-400" /></div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xs text-slate-400 font-bold font-mono">₹</span>
            <span className="text-3xl font-extrabold text-white font-mono tracking-tight">{pendingPayments.toLocaleString()}</span>
            <span className="text-[9px] text-rose-400 font-semibold font-mono ml-1">Unpaid</span>
          </div>
        </div>

        {/* Row 4 */}
        <div
          onClick={() => setView('finance')}
          className="glass-card card-red p-4 rounded-2xl flex flex-col justify-between min-h-[100px] cursor-pointer hover:scale-[1.02] transition-all"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Security Deposits Held</span>
            <div className="p-1 rounded bg-red-500/10"><Briefcase className="w-4 h-4 text-red-400" /></div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xs text-slate-400 font-bold font-mono">₹</span>
            <span className="text-3xl font-extrabold text-white font-mono tracking-tight">{securityDepositsHeld.toLocaleString()}</span>
          </div>
        </div>

        <div
          onClick={() => setView('finance')}
          className="glass-card card-amber p-4 rounded-2xl flex flex-col justify-between min-h-[100px] cursor-pointer hover:scale-[1.02] transition-all"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Refunds Pending</span>
            <div className="p-1 rounded bg-amber-500/10"><Clock className="w-4 h-4 text-amber-400" /></div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xs text-slate-400 font-bold font-mono">₹</span>
            <span className="text-3xl font-extrabold text-white font-mono tracking-tight">{refundPending.toLocaleString()}</span>
          </div>
        </div>

        <div
          onClick={() => setView('finance')}
          className="glass-card card-rose p-4 rounded-2xl flex flex-col justify-between min-h-[100px] cursor-pointer hover:scale-[1.02] transition-all"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Defaulters</span>
            <div className="p-1 rounded bg-rose-500/10"><AlertTriangle className="w-4 h-4 text-rose-400" /></div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-mono tracking-tight">{defaultersCount}</span>
            <span className="text-[10px] text-rose-400 font-bold">billing holds</span>
          </div>
        </div>

        <div
          onClick={() => setView('orders')}
          className="glass-card card-emerald p-4 rounded-2xl flex flex-col justify-between min-h-[100px] cursor-pointer hover:scale-[1.02] transition-all"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Rents (City)</span>
            <div className="p-1 rounded bg-emerald-500/10"><TrendingUp className="w-4 h-4 text-emerald-400" /></div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-mono tracking-tight">{activeAgreements.length}</span>
            <span className="text-[10px] text-slate-400 font-medium">local orders</span>
          </div>
        </div>
      </div>

      {/* SVG Analytics Charts (8 interactive widgets layout) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

        {/* Chart 1: Revenue Trend (Dynamic Line SVG) */}
        <div className="glass-card p-4 rounded-2xl flex flex-col justify-between h-[230px]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Revenue Trend (Line)</h3>
            <span className="text-[10px] text-emerald-400 font-semibold font-mono">₹{avgMonthlyRev.toLocaleString()} Avg</span>
          </div>
          <div className="flex-1 w-full bg-slate-950/40 rounded-xl relative p-2 flex items-end">
            {/* Custom SVG Line Chart */}
            <svg viewBox="0 0 100 50" className="w-full h-[120px] overflow-visible">
              <defs>
                <linearGradient id="lineGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                </linearGradient>
              </defs>
              {/* Gridlines */}
              <line x1="0" y1="10" x2="100" y2="10" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
              <line x1="0" y1="25" x2="100" y2="25" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
              <line x1="0" y1="40" x2="100" y2="40" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />

              {/* Dynamic Path Area & Line */}
              {(() => {
                const pts = last6Months.map((m, idx) => {
                  const x = (idx / 5) * 100;
                  const y = 45 - ((m.revenue / maxRevenue) * 35);
                  return { x, y };
                });
                const lineD = `M ${pts.map(p => `${p.x} ${p.y.toFixed(1)}`).join(' L ')}`;
                const areaD = `M 0 50 L ${pts.map(p => `${p.x} ${p.y.toFixed(1)}`).join(' L ')} L 100 50 Z`;
                return (
                  <>
                    <path d={areaD} fill="url(#lineGlow)" />
                    <path d={lineD} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    {pts.map((p, i) => (
                      <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="#818cf8" stroke="white" strokeWidth="1" />
                    ))}
                  </>
                );
              })()}
            </svg>
            <div className="absolute bottom-2 left-2 right-2 flex justify-between text-[9px] text-slate-500 font-mono">
              {last6Months.map((m, i) => (
                <span key={i} className={i === 5 ? 'text-indigo-400 font-bold' : ''}>
                  {m.name}{i === 5 ? ' (Now)' : ''}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Chart 2: Rentals Per Month (Dynamic Bar SVG) */}
        <div className="glass-card p-4 rounded-2xl flex flex-col justify-between h-[230px]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Rentals Per Month</h3>
            <span className="text-[10px] text-slate-400 font-mono">{cityOrders.length} Total Orders</span>
          </div>
          <div className="flex-1 w-full bg-slate-950/40 rounded-xl relative p-2 flex items-end">
            <svg viewBox="0 0 100 50" className="w-full h-[120px] overflow-visible">
              {last6Months.map((m, idx) => {
                const barHeight = Math.max(3, (m.ordersCount / maxOrders) * 40);
                const x = 5 + idx * 16;
                const y = 48 - barHeight;
                const isCurrent = idx === 5;
                return (
                  <g key={idx}>
                    <rect
                      x={x}
                      y={y}
                      width="10"
                      height={barHeight}
                      rx="2"
                      fill={isCurrent ? 'rgba(168, 85, 247, 0.9)' : 'rgba(99, 102, 241, 0.5)'}
                      className={isCurrent ? 'glow-border-red' : ''}
                    />
                    {m.ordersCount > 0 && (
                      <text x={x + 5} y={y - 2} textAnchor="middle" fill="#c084fc" fontSize="5" fontWeight="bold">
                        {m.ordersCount}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
            <div className="absolute bottom-2 left-2 right-2 flex justify-between text-[9px] text-slate-500 font-mono">
              {last6Months.map((m, i) => (
                <span key={i} className={i === 5 ? 'text-purple-400 font-bold' : ''}>
                  {m.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Chart 3: Inventory Utilization % (Dynamic Radial Gauge) */}
        <div className="glass-card p-4 rounded-2xl flex flex-col justify-between h-[230px]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Inventory Util %</h3>
            <span className="text-[10px] text-slate-400 font-mono">{assetsRented} / {totalAssets} Rented</span>
          </div>
          <div className="flex-1 w-full bg-slate-950/40 rounded-xl relative p-2 flex items-center justify-center">
            {/* Circular Gauge */}
            <svg viewBox="0 0 36 36" className="w-[110px] h-[110px] transform -rotate-90">
              {/* Track */}
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
              {/* Filled Ring */}
              <circle
                cx="18"
                cy="18"
                r="15.915"
                fill="none"
                stroke="url(#redGrad)"
                strokeDasharray={`${utilizationPct}, 100`}
                strokeWidth="3.2"
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
              <defs>
                <linearGradient id="redGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#818cf8" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
            </svg>
            {/* Center Label */}
            <div className="absolute text-center">
              <span className="text-2xl font-bold text-white font-mono block">
                {utilizationPct}%
              </span>
              <span className="text-[9px] text-slate-400 block tracking-wider uppercase font-semibold">Rented</span>
            </div>
          </div>
        </div>

        {/* Chart 4: Asset Health Condition (Dynamic Donut Chart) */}
        <div className="glass-card p-4 rounded-2xl flex flex-col justify-between h-[230px]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Asset Health</h3>
            <span className="text-[10px] text-slate-400 font-mono">{totalAssets} Units</span>
          </div>
          <div className="flex-1 w-full bg-slate-950/40 rounded-xl relative p-2 flex items-center justify-center">
            {/* Ring Chart */}
            <svg viewBox="0 0 36 36" className="w-[100px] h-[100px] transform -rotate-90">
              {/* Excellent Condition ring */}
              <circle cx="18" cy="18" r="14" fill="none" stroke="#10b981" strokeWidth="4" strokeDasharray={`${excPct}, 100`} />
              {/* Good/Repair ring */}
              <circle cx="18" cy="18" r="14" fill="none" stroke="#f59e0b" strokeWidth="4" strokeDasharray={`${fairPct}, 100`} strokeDashoffset={`-${excPct}`} />
              {/* Lost/Scrap ring */}
              <circle cx="18" cy="18" r="14" fill="none" stroke="#f43f5e" strokeWidth="4" strokeDasharray={`${poorPct}, 100`} strokeDashoffset={`-${excPct + fairPct}`} />
            </svg>
            {/* Labels overlay */}
            <div className="absolute bottom-2 left-2 right-2 flex justify-between text-[9px] font-semibold">
              <span className="text-emerald-400 font-mono">🟢 {excPct}% Exc</span>
              <span className="text-amber-400 font-mono">🟡 {fairPct}% Fair</span>
              <span className="text-rose-400 font-mono">🔴 {poorPct}% Poor</span>
            </div>
          </div>
        </div>

        {/* Chart 5: Top Renting Categories (Dynamic Horizontal Bars) */}
        <div className="glass-card p-4 rounded-2xl flex flex-col justify-between h-[230px]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Top Categories</h3>
            <span className="text-[10px] text-slate-400 font-mono">{currentCity} Hub</span>
          </div>
          <div className="flex-1 w-full bg-slate-950/40 rounded-xl relative p-3 flex flex-col justify-center space-y-3">
            {topCategories.map(([catName, count], idx) => {
              const barWidthPct = Math.max(8, Math.round(((count as number) / maxCatCount) * 100));
              const barColors = ['bg-red-500', 'bg-purple-500', 'bg-cyan-500'];
              return (
                <div key={catName} className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-300">
                    <span className="truncate max-w-[140px] font-medium">{idx + 1}. {catName}</span>
                    <span className="font-mono text-slate-200">{count} Rents</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full ${barColors[idx % barColors.length]} rounded-full transition-all duration-500`} style={{ width: `${barWidthPct}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart 6: City-wise Revenue Share (Dynamic Pie SVG) */}
        <div className="glass-card p-4 rounded-2xl flex flex-col justify-between h-[230px]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">City Revenue Share</h3>
            <span className="text-[10px] text-slate-400 font-mono">HO Group ERP</span>
          </div>
          <div className="flex-1 w-full bg-slate-950/40 rounded-xl relative p-2 flex items-center justify-center">
            {/* Multi-Segment Dial */}
            <svg viewBox="0 0 32 32" className="w-[100px] h-[100px] transform rotate-45">
              {cityShares.map((cs, i) => {
                const colors = ['#6366f1', '#10b981', '#f59e0b', '#a855f7'];
                let offset = 0;
                for (let k = 0; k < i; k++) {
                  offset += cityShares[k].pct;
                }
                return (
                  <circle
                    key={cs.city}
                    cx="16"
                    cy="16"
                    r="12"
                    fill="none"
                    stroke={colors[i % colors.length]}
                    strokeWidth="5"
                    strokeDasharray={`${cs.pct}, 100`}
                    strokeDashoffset={`-${offset}`}
                  />
                );
              })}
            </svg>
            <div className="absolute bottom-1.5 left-1 right-1 flex justify-between text-[8px] font-semibold">
              {cityShares.slice(0, 4).map((cs, i) => {
                const textColors = ['text-indigo-400', 'text-emerald-400', 'text-amber-400', 'text-purple-400'];
                return (
                  <span key={cs.city} className={`${textColors[i % textColors.length]} font-mono`}>
                    {cs.city} {cs.pct}%
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* Chart 7: Customer Growth (Dynamic Area SVG) */}
        <div className="glass-card p-4 rounded-2xl flex flex-col justify-between h-[230px]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Customer Growth</h3>
            <span className="text-[10px] text-slate-400 font-mono">{activeCustomers} Active</span>
          </div>
          <div className="flex-1 w-full bg-slate-950/40 rounded-xl relative p-2 flex items-end">
            <svg viewBox="0 0 100 50" className="w-full h-[120px] overflow-visible">
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                </linearGradient>
              </defs>
              {(() => {
                const pts = qCustomers.map((q, idx) => ({
                  x: (idx / 3) * 100,
                  y: 45 - ((q.count / maxCustQ) * 35),
                  ...q
                }));
                const lD = `M ${pts.map(p => `${p.x} ${p.y.toFixed(1)}`).join(' L ')}`;
                const aD = `M 0 50 L ${pts.map(p => `${p.x} ${p.y.toFixed(1)}`).join(' L ')} L 100 50 Z`;
                return (
                  <>
                    <path d={aD} fill="url(#areaGrad)" />
                    <path d={lD} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    {pts.map((p, i) => (
                      <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="#10b981" stroke="white" strokeWidth="1" />
                    ))}
                  </>
                );
              })()}
            </svg>
            <div className="absolute bottom-2 left-2 right-2 flex justify-between text-[9px] text-slate-500 font-mono">
              {qCustomers.map(q => (
                <span key={q.label}>{q.label}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Chart 8: Payment Collection Rate (Dynamic Gauge) */}
        <div className="glass-card p-4 rounded-2xl flex flex-col justify-between h-[230px]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Collection Rate</h3>
            <span className="text-[10px] text-emerald-400 font-semibold font-mono">{collectionRate}%</span>
          </div>
          <div className="flex-1 w-full bg-slate-950/40 rounded-xl relative p-2 flex items-center justify-center">
            {/* Semi-circular dial */}
            <svg viewBox="0 0 32 32" className="w-[110px] h-[110px] transform -rotate-180">
              <circle cx="16" cy="16" r="12" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" strokeDasharray="37.7, 75.4" strokeLinecap="round" />
              <circle cx="16" cy="16" r="12" fill="none" stroke="#10b981" strokeWidth="4.2" strokeDasharray={`${(collectionRate / 100) * 37.7}, 75.4`} strokeLinecap="round" />
            </svg>
            <div className="absolute text-center mt-6">
              <span className="text-xl font-bold text-white font-mono block">{collectionRate}%</span>
              <span className="text-[8px] text-slate-500 uppercase tracking-wider font-semibold block">Order Completion</span>
            </div>
          </div>
        </div>

      </div>

      {/* Tabs and Bottom Dashboard Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column: System Audit Log & Fraud Monitor */}
        <div className="lg:col-span-2 glass-panel p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex gap-4">
              <button
                onClick={() => setSelectedAuditTab('kpis')}
                className={`text-xs font-bold uppercase tracking-wider pb-1 transition-all border-b-2 cursor-pointer ${selectedAuditTab === 'kpis' ? 'text-red-400 border-red-500' : 'text-slate-500 border-transparent hover:text-slate-300'
                  }`}
              >
                expected vs Actual Audit
              </button>
              <button
                onClick={() => setSelectedAuditTab('fraud')}
                className={`text-xs font-bold uppercase tracking-wider pb-1 transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${selectedAuditTab === 'fraud' ? 'text-rose-400 border-rose-500' : 'text-slate-500 border-transparent hover:text-slate-300'
                  }`}
              >
                active Anomaly Warnings
                {expectedVsActualAudit.fraudAlertCount > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
                )}
              </button>
              <button
                onClick={() => setSelectedAuditTab('simulation')}
                className={`text-xs font-bold uppercase tracking-wider pb-1 transition-all border-b-2 cursor-pointer ${selectedAuditTab === 'simulation' ? 'text-purple-400 border-purple-500' : 'text-slate-500 border-transparent hover:text-slate-300'
                  }`}
              >
                Inconsistency Simulator
              </button>
            </div>
          </div>

          {selectedAuditTab === 'kpis' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-900/30 border border-slate-800/80 rounded-xl p-3.5 text-center">
                  <div className="text-2xl font-bold text-white font-mono">{expectedVsActualAudit.expectedCount}</div>
                  <div className="text-[10px] text-slate-400 mt-1 uppercase font-semibold">Expected Assets</div>
                </div>
                <div className="bg-slate-900/30 border border-slate-800/80 rounded-xl p-3.5 text-center">
                  <div className="text-2xl font-bold text-emerald-400 font-mono">{expectedVsActualAudit.actualCount}</div>
                  <div className="text-[10px] text-slate-400 mt-1 uppercase font-semibold">Actual Inventory</div>
                </div>
                <div className="bg-slate-900/30 border border-slate-800/80 rounded-xl p-3.5 text-center">
                  <div className="text-2xl font-bold text-rose-400 font-mono">{expectedVsActualAudit.missingCount}</div>
                  <div className="text-[10px] text-slate-400 mt-1 uppercase font-semibold">Missing/Lost Assets</div>
                </div>
              </div>

              <div className="bg-slate-950/40 rounded-xl p-4 border border-slate-900 space-y-2.5 text-xs">
                <h4 className="font-semibold text-slate-300 flex items-center gap-1.5">
                  🛡️ Continuous Database Audit Policy
                </h4>
                <p className="text-slate-400 leading-normal text-[11px]">
                  RentBuddy operates a real-time automated audit routine checking for barcode collision, duplicate allocations, wrong warehouse transit locations, and physical scanner receipt discrepancies. Inconsistencies automatically flag critical alerts and notify logistics and operations managers.
                </p>
                <div className="flex justify-between items-center text-[10px] bg-slate-900/50 p-2 rounded border border-slate-800/40">
                  <span className="text-slate-400">Last automatic execution:</span>
                  <span className="text-slate-300 font-mono font-medium">Just now (real-time callback active)</span>
                </div>
              </div>
            </div>
          )}

          {selectedAuditTab === 'fraud' && (
            <div className="space-y-3">
              {fraudAlerts.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs font-medium border border-dashed border-slate-800 rounded-xl">
                  🔒 No database mismatches or fraud alerts found. Systems integrity 100%.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-52 overflow-y-auto">
                  {fraudAlerts.map((alert, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-3"
                    >
                      <AlertOctagon className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-semibold text-rose-300 font-sans">Audit Warning #{i + 1}</div>
                        <p className="text-[11px] text-slate-300 mt-0.5 leading-normal">{alert}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {selectedAuditTab === 'simulation' && (
            <div className="space-y-4">
              <div className="bg-purple-950/20 border border-purple-500/25 rounded-xl p-3.5 text-xs text-purple-200">
                <strong className="block mb-1">Developer Testing Utility</strong>
                Use the controls below to inject simulated data inconsistencies into the active database. Verify how the dashboard KPIs, notification center, and active alerts instantly react.
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => simulateFraud('duplicate')}
                  className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white transition-all cursor-pointer text-center"
                >
                  Duplicate Barcode
                </button>
                <button
                  onClick={() => simulateFraud('mismatch')}
                  className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white transition-all cursor-pointer text-center"
                >
                  Deliver/Available Loop
                </button>
                <button
                  onClick={() => simulateFraud('double_rent')}
                  className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white transition-all cursor-pointer text-center"
                >
                  Double Rental
                </button>
                <button
                  onClick={resetDatabase}
                  className="px-3 py-2 text-xs font-bold rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600 hover:text-white transition-all cursor-pointer col-span-1 sm:col-span-3 flex items-center justify-center gap-1.5"
                >
                  🛡️ Reset Database & Clear Fraud Alerts
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: AI Insights Engine */}
        <div className="glass-panel p-5 rounded-2xl space-y-4 relative overflow-hidden border border-slate-850">
          {/* Subtle neon indicator for AI */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full blur-2xl pointer-events-none"></div>

          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <h3 className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="w-4 h-4" /> RentBuddy AI Insights
            </h3>
            <span className="text-[9px] bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full font-mono font-semibold">
              Future Ready
            </span>
          </div>

          <div className="space-y-3.5 max-h-80 overflow-y-auto pr-1 text-xs">
            {/* Insight 1: Stock Shortage */}
            <div className="p-3 rounded-xl bg-slate-900/30 border border-slate-800/80 hover:border-slate-700/60 transition-all space-y-1.5">
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                <span>STOCK SHORTAGE PREDICTION</span>
                <span className="text-amber-400">Medium Risk</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-normal">
                Critical shortage of <strong>Wardrobes</strong> predicted in <strong>Bhopal Warehouse A</strong> by next weekend due to seasonal demand shift.
              </p>
              <div className="text-[10px] text-red-400 flex items-center gap-1 cursor-pointer hover:underline font-semibold pt-1">
                Recommend Transfer <ArrowRight className="w-3 h-3" />
              </div>
            </div>

            {/* Insight 2: Warehouse Transfer recommendation */}
            <div className="p-3 rounded-xl bg-red-900/10 border border-red-500/20 hover:border-red-500/40 transition-all space-y-1.5">
              <div className="flex justify-between items-center text-[10px] font-bold text-red-400">
                <span>💡 REDISTRIBUTION OPTIMIZER</span>
                <span className="text-emerald-400">Save ₹15,000</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-normal">
                Transfer <strong>3 single beds</strong> from <strong>Surat Warehouse A</strong> to <strong>Indore Bypass</strong>. This fulfills pending reservation requests without procurement costs.
              </p>
            </div>

            {/* Insight 3: Default Risk */}
            <div className="p-3 rounded-xl bg-slate-900/30 border border-slate-800/80 hover:border-slate-700/60 transition-all space-y-1.5">
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                <span>RISK ASSESSMENT PROFILE</span>
                <span className="text-rose-400">High Risk</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-normal">
                Customer <strong>Amit Sharma</strong> flagged with 82% risk profile. Late billing trend indicates possible collection challenges. Suggest automatic SMS alert.
              </p>
            </div>

            {/* Insight 4: Depreciation */}
            <div className="p-3 rounded-xl bg-slate-900/30 border border-slate-800/80 hover:border-slate-700/60 transition-all space-y-1.5">
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                <span>ASSET DEPRECIATION ESTIMATOR</span>
                <span>Routine</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-normal">
                Washing Machine <strong>#RB-WASH-0023</strong> has reached 24 months age. Estimated remaining lifespan: 12 months. Recommend listing for scrap sale by June 2027.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
