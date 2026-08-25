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
  Moon,
  Menu
} from 'lucide-react';

interface NavbarProps {
  currentView: string;
  onOpenSearch: () => void;
  onToggleSidebar?: () => void;
  isSidebarCollapsed?: boolean;
}

export default function Navbar({ currentView, onOpenSearch, onToggleSidebar, isSidebarCollapsed }: NavbarProps) {
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
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-emerald-600" />;
      default:
        return <Info className="w-4 h-4 text-red-600" />;
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

  const isDark = theme === 'dark';

  return (
    <header className={`h-16 ${isDark ? 'bg-[#0d131f] text-slate-100 border-slate-800 shadow-md' : 'bg-white text-slate-800 border-slate-200/90 shadow-xs'} border-b flex items-center justify-between px-6 z-20 select-none transition-colors duration-300`}>
      {/* Left: Sidebar Hamburger Toggle + Breadcrumb */}
      <div className="flex items-center gap-3">
        {/* 3-line Hamburger Menu Toggle Icon */}
        <button
          onClick={onToggleSidebar}
          className={`p-2 rounded-xl border transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95 ${
            isDark
              ? 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-200 hover:text-red-400'
              : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 hover:text-red-600'
          }`}
          title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Breadcrumb Hierarchy */}
        <div className="flex items-center gap-2">
          <span className="text-red-600 font-black text-sm tracking-wider uppercase">RentBuddy</span>
          <span className={`${isDark ? 'text-slate-600' : 'text-slate-300'} text-xs font-bold`}>/</span>
          <span className={`${isDark ? 'text-white' : 'text-slate-900'} text-sm font-bold tracking-wide`}>
            {getBreadcrumbTitle()}
          </span>
          <span className={`ml-2 px-2.5 py-0.5 rounded-full text-[11px] font-bold border shadow-2xs ${
            isDark
              ? 'bg-red-950/50 text-red-400 border-red-900/80'
              : 'bg-red-50 text-red-700 border-red-200'
          }`}>
            📍 {currentCity} Hub
          </span>
        </div>
      </div>

      {/* Center/Right controls */}
      <div className="flex items-center gap-3">
        {/* Global Search button */}
        <button
          onClick={onOpenSearch}
          className={`w-64 border rounded-xl px-3.5 py-2 flex items-center justify-between text-xs transition-all cursor-pointer shadow-2xs ${
            isDark
              ? 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
              : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600 hover:border-slate-300'
          }`}
        >
          <span className="flex items-center gap-2">
            <Search className={`w-3.5 h-3.5 ${isDark ? 'text-slate-400' : 'text-slate-400'}`} />
            <span className={`font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Search inventory, orders...</span>
          </span>
          <kbd className={`text-[10px] px-1.5 py-0.5 rounded font-mono border shadow-2xs ${
            isDark
              ? 'bg-slate-900 text-slate-400 border-slate-700'
              : 'bg-white text-slate-500 border-slate-200'
          }`}>
            ⌘K
          </kbd>
        </button>

        {/* Theme Toggle Button (Full dark/light mode toggle functioning) */}
        <button
          onClick={toggleTheme}
          className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-105 ${
            isDark
              ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200'
              : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
          }`}
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDark ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-700" />
          )}
        </button>

        {/* Notifications Popover Toggle */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className={`w-9 h-9 rounded-xl border flex items-center justify-center relative transition-all cursor-pointer shadow-2xs hover:scale-105 ${
              isDark
                ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
            }`}
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white font-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center shadow-sm animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Card */}
          {showNotifications && (
            <div className={`absolute right-0 mt-2 w-80 border rounded-2xl shadow-2xl p-4 space-y-3 z-50 ${
              isDark
                ? 'bg-slate-900 border-slate-700 text-slate-100'
                : 'bg-white border-slate-200 text-slate-800'
            }`}>
              <div className={`flex items-center justify-between border-b pb-2 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                <span className={`font-bold text-xs uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>Notifications ({unreadCount})</span>
                {notifications.length > 0 && (
                  <button
                    onClick={() => {
                      clearNotifications();
                      setShowNotifications(false);
                    }}
                    className="text-slate-400 hover:text-red-600 p-1 transition-all cursor-pointer"
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
                          ? isDark ? 'bg-slate-800/40 border-slate-700 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-500'
                          : isDark ? 'bg-red-950/40 hover:bg-red-950/60 border-red-800 text-slate-200' : 'bg-red-50/70 hover:bg-red-50 border-red-200 text-slate-800'
                      }`}
                    >
                      <div className="mt-0.5">{getNotifIcon(notif.type)}</div>
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between items-center">
                          <span className={`font-bold text-[11px] ${
                            notif.read
                              ? isDark ? 'text-slate-400' : 'text-slate-600'
                              : isDark ? 'text-red-400' : 'text-red-700'
                          }`}>
                            {notif.title}
                          </span>
                          {!notif.read && (
                            <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
                          )}
                        </div>
                        <p className={`text-[11px] leading-normal ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                          {notif.message}
                        </p>
                        <span className="text-[9px] text-slate-400 block font-mono">
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
        <div className={`flex items-center gap-2.5 border-l pl-3 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className={`w-8 h-8 rounded-xl border flex items-center justify-center font-black text-xs shadow-2xs ${
            isDark
              ? 'bg-red-950/50 border-red-800 text-red-400'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            {currentUserRole.substring(0, 2).toUpperCase()}
          </div>
          <div className="hidden md:block">
            <span className={`text-xs font-bold block leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {currentUser?.fullName || (currentUserRole === 'Super Admin' ? 'Ashish Admin' : 'Staff User')}
            </span>
            <span className={`text-[10px] block font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {currentUserRole}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
