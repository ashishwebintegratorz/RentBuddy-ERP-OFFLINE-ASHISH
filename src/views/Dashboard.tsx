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
  const cityAssets = (inventory || []).filter(a => a && (!a.city || a.city === currentCity));
  const activeAgreements = (orders || []).filter(o => o && o.status === 'Delivered');
  const cityActiveAgreements = (orders || []).filter(o => o && o.status === 'Delivered' && (inventory.find(a => a.id === o.items?.[0]?.assetId)?.city === currentCity));

  // Compute metrics
  const totalCustomers = (customers || []).length;
  const activeCustomers = (customers || []).filter(c => c && (c.status === 'Good Customer' || c.status === 'VIP' || c.status === 'Verified' || c.verificationStatus === 'Verified')).length;
  const newCustomersThisMonth = (customers || []).filter(c => {
    if (!c || !c.createdAt) return false;
    const time = new Date(c.createdAt).getTime();
    if (isNaN(time)) return false;
    return (Date.now() - time) < 30 * 24 * 60 * 60 * 1000;
  }).length;

  const totalAssets = cityAssets.length;
  const assetsRented = cityAssets.filter(a => a.status === 'Rented').length;
  const assetsAvailable = cityAssets.filter(a => a.status === 'Available').length;
  const assetsRepair = cityAssets.filter(a => a.status === 'Under Repair').length;
  const assetsLost = cityAssets.filter(a => a.status === 'Lost').length;

  const pendingDeliveries = (orders || []).filter(o => o && (o.status === 'Pending' || o.status === 'Assigned' || o.status === 'Out for Delivery')).length;
  const pendingPickups = (orders || []).filter(o => o && (o.status === 'Return Pickup')).length;

  // Financial calculations
  const monthlyRevenue = (invoices || [])
    .filter(i => i && i.status === 'Paid')
    .reduce((sum, i) => sum + (i.rentalCharges || 0), 0);

  const pendingPayments = (invoices || [])
    .filter(i => i && (i.status === 'Pending' || i.status === 'Overdue'))
    .reduce((sum, i) => sum + (i.totalAmount || 0), 0);

  const securityDepositsHeld = (orders || [])
    .filter(o => o && o.depositRefundStatus === 'Held')
    .reduce((sum, o) => sum + (o.totalDeposit || 0), 0);

  const refundPending = (orders || [])
    .filter(o => o && o.depositRefundStatus === 'Pending Inspection')
    .reduce((sum, o) => sum + (o.totalDeposit || 0), 0);

  const defaultersCount = (customers || []).filter(c => c && c.status === 'Defaulter').length;

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
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-md ${
              auditSuccess
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
            <span className="text-3xl font-extrabold text-white font-mono tracking-tight">{cityActiveAgreements.length}</span>
            <span className="text-[10px] text-slate-400 font-medium">local orders</span>
          </div>
        </div>
      </div>

      {/* SVG Analytics Charts (8 interactive widgets layout) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Chart 1: Revenue Trend (Line SVG) */}
        <div className="glass-card p-4 rounded-2xl flex flex-col justify-between h-[230px]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Revenue Trend (Line)</h3>
            <span className="text-[10px] text-emerald-400 font-semibold font-mono">₹48k Avg</span>
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
              {/* Path Area */}
              <path d="M 0 50 L 0 42 Q 20 30, 40 38 T 80 15 L 100 8 L 100 50 Z" fill="url(#lineGlow)" />
              {/* Path Line */}
              <path d="M 0 42 Q 20 30, 40 38 T 80 15 L 100 8" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" />
              {/* Hover dot */}
              <circle cx="100" cy="8" r="3" fill="#818cf8" stroke="white" strokeWidth="1" className="animate-pulse" />
            </svg>
            <div className="absolute bottom-2 left-2 right-2 flex justify-between text-[9px] text-slate-500 font-mono">
              <span>Jan</span><span>Mar</span><span>May</span><span>Jul (Current)</span>
            </div>
          </div>
        </div>

        {/* Chart 2: Rentals Per Month (Bar SVG) */}
        <div className="glass-card p-4 rounded-2xl flex flex-col justify-between h-[230px]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Rentals Per Month</h3>
            <span className="text-[10px] text-slate-400 font-mono">Total Orders</span>
          </div>
          <div className="flex-1 w-full bg-slate-950/40 rounded-xl relative p-2 flex items-end">
            <svg viewBox="0 0 100 50" className="w-full h-[120px] overflow-visible">
              {/* Set of Bars */}
              {/* Jan */}
              <rect x="5" y="30" width="8" height="20" rx="2" fill="rgba(99, 102, 241, 0.4)" />
              {/* Feb */}
              <rect x="20" y="25" width="8" height="25" rx="2" fill="rgba(99, 102, 241, 0.4)" />
              {/* Mar */}
              <rect x="35" y="15" width="8" height="35" rx="2" fill="rgba(99, 102, 241, 0.6)" />
              {/* Apr */}
              <rect x="50" y="20" width="8" height="30" rx="2" fill="rgba(99, 102, 241, 0.6)" />
              {/* May */}
              <rect x="65" y="10" width="8" height="40" rx="2" fill="rgba(168, 85, 247, 0.7)" />
              {/* Jun */}
              <rect x="80" y="5" width="8" height="45" rx="2" fill="rgba(168, 85, 247, 0.9)" className="glow-border-red" />
            </svg>
            <div className="absolute bottom-2 left-2 right-2 flex justify-between text-[9px] text-slate-500 font-mono">
              <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span>
            </div>
          </div>
        </div>

        {/* Chart 3: Inventory Utilization % (Radial Gauge) */}
        <div className="glass-card p-4 rounded-2xl flex flex-col justify-between h-[230px]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Inventory Util %</h3>
            <span className="text-[10px] text-slate-400 font-mono">City Capacity</span>
          </div>
          <div className="flex-1 w-full bg-slate-950/40 rounded-xl relative p-2 flex items-center justify-center">
            {/* Circular Gauge */}
            <svg viewBox="0 0 36 36" className="w-[110px] h-[110px] transform -rotate-90">
              {/* Track */}
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="3" />
              {/* Filled Ring */}
              <circle
                cx="18"
                cy="18"
                r="15.915"
                fill="none"
                stroke="url(#redGrad)"
                strokeDasharray={`${totalAssets > 0 ? Math.round((assetsRented / totalAssets) * 100) : 0}, 100`}
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
                {totalAssets > 0 ? Math.round((assetsRented / totalAssets) * 100) : 0}%
              </span>
              <span className="text-[9px] text-slate-400 block tracking-wider uppercase font-semibold">Rented</span>
            </div>
          </div>
        </div>

        {/* Chart 4: Asset Health Condition (Donut Chart) */}
        <div className="glass-card p-4 rounded-2xl flex flex-col justify-between h-[230px]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Asset Health</h3>
            <span className="text-[10px] text-slate-400 font-mono">Condition Index</span>
          </div>
          <div className="flex-1 w-full bg-slate-950/40 rounded-xl relative p-2 flex items-center justify-center">
            {/* Ring Chart */}
            <svg viewBox="0 0 36 36" className="w-[100px] h-[100px] transform -rotate-90">
              {/* Excellent Condition ring */}
              <circle cx="18" cy="18" r="14" fill="none" stroke="#10b981" strokeWidth="4" strokeDasharray="50, 100" />
              {/* Good/Repair ring */}
              <circle cx="18" cy="18" r="14" fill="none" stroke="#f59e0b" strokeWidth="4" strokeDasharray="35, 100" strokeDashoffset="-50" />
              {/* Lost/Scrap ring */}
              <circle cx="18" cy="18" r="14" fill="none" stroke="#f43f5e" strokeWidth="4" strokeDasharray="15, 100" strokeDashoffset="-85" />
            </svg>
            {/* Labels overlay */}
            <div className="absolute bottom-2 left-2 right-2 flex justify-between text-[9px] font-semibold">
              <span className="text-emerald-400 font-mono">🟢 Exc</span>
              <span className="text-amber-400 font-mono">🟡 Fair</span>
              <span className="text-rose-400 font-mono">🔴 Poor</span>
            </div>
          </div>
        </div>

        {/* Chart 5: Top Renting Categories (Horizontal Bars) */}
        <div className="glass-card p-4 rounded-2xl flex flex-col justify-between h-[230px]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Top Categories</h3>
            <span className="text-[10px] text-slate-400 font-mono">Indore HO Hub</span>
          </div>
          <div className="flex-1 w-full bg-slate-950/40 rounded-xl relative p-3 flex flex-col justify-center space-y-3">
            {/* Category rows */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-slate-300">
                <span>1. Beds & Mattress</span>
                <span className="font-mono">42 Rents</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-red-500 w-[85%] rounded-full"></div>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-slate-300">
                <span>2. Sofa Sets</span>
                <span className="font-mono">29 Rents</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-red-500 w-[62%] rounded-full"></div>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-slate-300">
                <span>3. Refrigerator</span>
                <span className="font-mono">18 Rents</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 w-[40%] rounded-full"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Chart 6: City-wise Revenue Share (Pie SVG) */}
        <div className="glass-card p-4 rounded-2xl flex flex-col justify-between h-[230px]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">City Revenue Share</h3>
            <span className="text-[10px] text-slate-400 font-mono">HO Group ERP</span>
          </div>
          <div className="flex-1 w-full bg-slate-950/40 rounded-xl relative p-2 flex items-center justify-center">
            {/* Multi-Segment Dial */}
            <svg viewBox="0 0 32 32" className="w-[100px] h-[100px] transform rotate-45">
              {/* Segment 1: Indore (Head Office) (55%) */}
              <circle cx="16" cy="16" r="12" fill="none" stroke="#6366f1" strokeWidth="5" strokeDasharray="55, 100" />
              {/* Segment 2: Bhopal (20%) */}
              <circle cx="16" cy="16" r="12" fill="none" stroke="#10b981" strokeWidth="5" strokeDasharray="20, 100" strokeDashoffset="-55" />
              {/* Segment 3: Surat (15%) */}
              <circle cx="16" cy="16" r="12" fill="none" stroke="#f59e0b" strokeWidth="5" strokeDasharray="15, 100" strokeDashoffset="-75" />
              {/* Segment 4: Ahmedabad (10%) */}
              <circle cx="16" cy="16" r="12" fill="none" stroke="#a855f7" strokeWidth="5" strokeDasharray="10, 100" strokeDashoffset="-90" />
            </svg>
            <div className="absolute bottom-1.5 left-1 right-1 flex justify-between text-[8px] font-semibold">
              <span className="text-red-400 font-mono">IND HO 55%</span>
              <span className="text-emerald-400 font-mono">BHO 20%</span>
              <span className="text-amber-400 font-mono">SUR 15%</span>
              <span className="text-purple-400 font-mono">AHM 10%</span>
            </div>
          </div>
        </div>

        {/* Chart 7: Customer Growth (Area SVG) */}
        <div className="glass-card p-4 rounded-2xl flex flex-col justify-between h-[230px]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Customer Growth</h3>
            <span className="text-[10px] text-slate-400 font-mono">+12% MoM</span>
          </div>
          <div className="flex-1 w-full bg-slate-950/40 rounded-xl relative p-2 flex items-end">
            <svg viewBox="0 0 100 50" className="w-full h-[120px] overflow-visible">
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M 0 50 L 0 45 Q 25 35, 50 25 T 100 10 L 100 50 Z" fill="url(#areaGrad)" />
              <path d="M 0 45 Q 25 35, 50 25 T 100 10" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
              <circle cx="100" cy="10" r="3" fill="#10b981" stroke="white" strokeWidth="1" />
            </svg>
            <div className="absolute bottom-2 left-2 right-2 flex justify-between text-[9px] text-slate-500 font-mono">
              <span>Mar</span><span>Apr</span><span>May</span><span>Jun</span>
            </div>
          </div>
        </div>

        {/* Chart 8: Payment Collection Rate (Gauge) */}
        <div className="glass-card p-4 rounded-2xl flex flex-col justify-between h-[230px]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Collection Rate</h3>
            <span className="text-[10px] text-emerald-400 font-semibold font-mono">94.2%</span>
          </div>
          <div className="flex-1 w-full bg-slate-950/40 rounded-xl relative p-2 flex items-center justify-center">
            {/* Semi-circular dial */}
            <svg viewBox="0 0 32 32" className="w-[110px] h-[110px] transform -rotate-180">
              <circle cx="16" cy="16" r="12" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="4" strokeDasharray="37.7, 75.4" strokeLinecap="round" />
              <circle cx="16" cy="16" r="12" fill="none" stroke="#10b981" strokeWidth="4.2" strokeDasharray={`${0.942 * 37.7}, 75.4`} strokeLinecap="round" />
            </svg>
            <div className="absolute text-center mt-6">
              <span className="text-xl font-bold text-white font-mono block">94.2%</span>
              <span className="text-[8px] text-slate-500 uppercase tracking-wider font-semibold block">Collected (30d)</span>
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
                className={`text-xs font-bold uppercase tracking-wider pb-1 transition-all border-b-2 cursor-pointer ${
                  selectedAuditTab === 'kpis' ? 'text-red-400 border-red-500' : 'text-slate-500 border-transparent hover:text-slate-300'
                }`}
              >
                expected vs Actual Audit
              </button>
              <button
                onClick={() => setSelectedAuditTab('fraud')}
                className={`text-xs font-bold uppercase tracking-wider pb-1 transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
                  selectedAuditTab === 'fraud' ? 'text-rose-400 border-rose-500' : 'text-slate-500 border-transparent hover:text-slate-300'
                }`}
              >
                active Anomaly Warnings
                {expectedVsActualAudit.fraudAlertCount > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
                )}
              </button>
              <button
                onClick={() => setSelectedAuditTab('simulation')}
                className={`text-xs font-bold uppercase tracking-wider pb-1 transition-all border-b-2 cursor-pointer ${
                  selectedAuditTab === 'simulation' ? 'text-purple-400 border-purple-500' : 'text-slate-500 border-transparent hover:text-slate-300'
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
