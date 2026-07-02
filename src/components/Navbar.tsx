import React, { useState } from 'react';
import { useRentBuddyStore } from '../store/rentBuddyStore';
import {
  Bell,
  Search,
  Check,
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
  } = useRentBuddyStore();

  const [showNotifications, setShowNotifications] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleNotificationClick = (id: string) => {
    markNotificationRead(id);
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <AlertCircle className="w-4 h-4 text-rose-400" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      default:
        return <Info className="w-4 h-4 text-indigo-400" />;
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
      inspection: 'Return Quality Inspections',
      repair: 'Asset Repairs & Vendors',
      packages: 'Rental Product Bundles',
      finance: 'Billing Ledger & Invoices',
      reports: 'Business Reports Export Center',
    };
    return mapping[currentView] || 'RentBuddy';
  };

  return (
    <header className="h-16 glass-panel border-b border-slate-800/80 flex items-center justify-between px-6 z-20">
      {/* Breadcrumb / Title */}
      <div className="flex items-center gap-2">
        <span className="text-slate-500 text-sm">RentBuddy</span>
        <span className="text-slate-600 text-xs">/</span>
        <span className="text-white text-sm font-semibold tracking-wide">
          {getBreadcrumbTitle()}
        </span>
        <span className="ml-3 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          📍 {currentCity} Hub
        </span>
      </div>

      {/* Center/Right controls */}
      <div className="flex items-center gap-4">
        {/* Mock Global Search input */}
        <button
          onClick={onOpenSearch}
          className="w-64 bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800/80 rounded-xl px-3 py-1.5 flex items-center justify-between text-slate-500 text-xs transition-all hover:border-slate-700 cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            Global Search...
          </span>
          <kbd className="bg-slate-800 text-[10px] text-slate-400 px-1.5 py-0.5 rounded font-mono">
            ⌘K
          </kbd>
        </button>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="w-9 h-9 rounded-xl bg-slate-900/40 border border-slate-800/80 hover:bg-slate-900/80 flex items-center justify-center text-slate-300 transition-all hover:text-white cursor-pointer"
          title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-400" />
          )}
        </button>

        {/* Notifications Popover Toggle */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-9 h-9 rounded-xl bg-slate-900/40 border border-slate-800/80 hover:bg-slate-900/80 flex items-center justify-center text-slate-300 relative transition-all hover:text-white"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-bold text-[9px] w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Card */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 glass-panel border border-slate-800/90 rounded-2xl shadow-2xl p-4 space-y-3 z-50 text-slate-200">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-semibold text-xs text-white uppercase tracking-wider">Notifications ({unreadCount})</span>
                {notifications.length > 0 && (
                  <button
                    onClick={() => {
                      clearNotifications();
                      setShowNotifications(false);
                    }}
                    className="text-slate-400 hover:text-rose-400 p-1 transition-all"
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
                          ? 'bg-slate-900/10 border-slate-900/30 opacity-60'
                          : 'bg-indigo-900/10 hover:bg-indigo-900/20 border-indigo-500/25'
                      }`}
                    >
                      <div className="mt-0.5">{getNotifIcon(notif.type)}</div>
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between items-center">
                          <span className={`font-semibold text-[11px] ${notif.read ? 'text-slate-300' : 'text-indigo-200'}`}>
                            {notif.title}
                          </span>
                          {!notif.read && (
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
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
        <div className="flex items-center gap-2 border-l border-slate-800/80 pl-4">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center font-bold text-xs text-indigo-400">
            {currentUserRole.substring(0, 2).toUpperCase()}
          </div>
          <div className="hidden md:block">
            <span className="text-xs font-semibold text-white block leading-tight">
              {currentUserRole === 'Super Admin' ? 'Ashish (Admin)' : 'Staff User'}
            </span>
            <span className="text-[10px] text-slate-500 block">
              {currentUserRole}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
