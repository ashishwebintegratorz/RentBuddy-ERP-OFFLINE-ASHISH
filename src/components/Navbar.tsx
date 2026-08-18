import React, { useState } from 'react';
import { useRentBuddyStore } from '../store/rentBuddyStore';
import {
  Bell,
  Search,
  Trash2,
  AlertTriangle,
  Info,
  CheckCircle,
  AlertCircle,
  Sun,
  Moon
} from 'lucide-react';

interface NavbarProps {
  currentView: string;
  onOpenSearch: () => void;
}

export default function Navbar({ currentView, onOpenSearch }: NavbarProps) {
  const {
    currentCity,
    currentUserRole,
    notifications,
    markNotificationRead,
    clearNotifications,
    theme,
    toggleTheme,
    currentUser,
  } = useRentBuddyStore();

  const [showNotifications, setShowNotifications] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleNotificationClick = (id: string) => {
    markNotificationRead(id);
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      default:
        return <Info className="w-4 h-4 text-red-400" />;
    }
  };

  // Convert currentView id to display title
  const getBreadcrumbTitle = () => {
    if (!currentView) return 'Dashboard';
    const mapping: { [key: string]: string } = {
      dashboard: 'Analytics & Audits',
      customers: 'Customer Accounts Directory',
      inventory: 'Asset Master Inventory',
      barcode: 'Barcode Generator & Scanner',
      pos: 'Offline Point of Sale (POS)',
      orders: 'Active Rental Agreements',
      logistics: 'Logistics Courier Pipeline',
      'logistic-docs': 'Logistics Driver Documents & KYC',
      inspection: 'Return Quality Inspections',
      repair: 'Asset Repairs & Vendors',
      packages: 'Rental Product Bundles',
      finance: 'Billing Ledger & Invoices',
      reports: 'Business Reports Export Center',
      quotations: 'Rental Quotations Generator',
      settings: 'System & Security Settings',
    };
    return mapping[currentView] || 'RentBuddy ERP';
  };

  return (
    <header className="h-16 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white border-b border-red-500/40 shadow-lg shadow-red-950/20 flex items-center justify-between px-6 z-20 select-none transition-all duration-300">
      {/* Breadcrumb / Title */}
      <div className="flex items-center gap-2.5">
        <span className="text-white/90 font-black text-sm tracking-wider uppercase">RentBuddy</span>
        <span className="text-white/50 text-xs font-bold">/</span>
        <span className="text-white text-sm font-bold tracking-wide drop-shadow-sm">
          {getBreadcrumbTitle()}
        </span>
        <span className="ml-3 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-white/20 text-white border border-white/30 backdrop-blur-md shadow-sm">
          📍 {currentCity} Hub
        </span>
      </div>

      {/* Center/Right controls */}
      <div className="flex items-center gap-3">
        {/* Global Search button */}
        <button
          onClick={onOpenSearch}
          className="w-64 bg-white/15 hover:bg-white/25 border border-white/25 rounded-xl px-3.5 py-1.5 flex items-center justify-between text-white/90 text-xs transition-all hover:border-white/50 cursor-pointer shadow-inner backdrop-blur-md"
        >
          <span className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-white/80" />
            <span className="font-medium placeholder-white/70">Search inventory, orders...</span>
          </span>
          <kbd className="bg-black/20 text-[10px] text-white/90 px-1.5 py-0.5 rounded font-mono border border-white/20">
            ⌘K
          </kbd>
        </button>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="w-9 h-9 rounded-xl bg-white/15 border border-white/25 hover:bg-white/25 flex items-center justify-center text-white transition-all cursor-pointer shadow-sm hover:scale-105"
          title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-300" />
          ) : (
            <Moon className="w-4 h-4 text-white" />
          )}
        </button>

        {/* Notifications Popover Toggle */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-9 h-9 rounded-xl bg-white/15 border border-white/25 hover:bg-white/25 flex items-center justify-center text-white relative transition-all cursor-pointer shadow-sm hover:scale-105"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-white text-red-600 font-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center shadow-md animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Card */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-4 space-y-3 z-50 text-slate-200">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-semibold text-xs text-white uppercase tracking-wider">Notifications ({unreadCount})</span>
                {notifications.length > 0 && (
                  <button
                    onClick={() => {
                      clearNotifications();
                      setShowNotifications(false);
                    }}
                    className="text-slate-400 hover:text-red-400 p-1 transition-all cursor-pointer"
                    title="Clear All"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {notifications.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-500 font-medium">
                    No active system alerts. All systems nominal.
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif.id)}
                      className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-2.5 ${
                        notif.read
                          ? 'bg-slate-950/40 border-slate-800/40 opacity-60'
                          : 'bg-red-950/30 hover:bg-red-950/50 border-red-500/30'
                      }`}
                    >
                      <div className="mt-0.5">{getNotifIcon(notif.type)}</div>
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between items-center">
                          <span className={`font-semibold text-[11px] ${notif.read ? 'text-slate-300' : 'text-red-300'}`}>
                            {notif.title}
                          </span>
                          {!notif.read && (
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-300 leading-normal">
                          {notif.message}
                        </p>
                        <span className="text-[9px] text-slate-500 block font-mono">
                          {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User profile block */}
        <div className="flex items-center gap-2.5 border-l border-white/25 pl-3">
          <div className="w-8 h-8 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center font-black text-xs text-white shadow-sm">
            {currentUserRole.substring(0, 2).toUpperCase()}
          </div>
          <div className="hidden md:block">
            <span className="text-xs font-bold text-white block leading-tight">
              {currentUser?.fullName || (currentUserRole === 'Super Admin' ? 'Admin' : 'Staff User')}
            </span>
            <span className="text-[10px] text-white/80 block font-semibold">
              {currentUserRole}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
