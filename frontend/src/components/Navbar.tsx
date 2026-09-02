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
  Menu,
  Truck,
  Package,
  Wrench,
  CheckCheck
} from 'lucide-react';

interface NavbarProps {
  currentView: string;
  setView?: (view: string) => void;
  onOpenSearch: () => void;
  onToggleSidebar?: () => void;
  isSidebarCollapsed?: boolean;
}

export default function Navbar({ currentView, setView, onOpenSearch, onToggleSidebar, isSidebarCollapsed }: NavbarProps) {
  const {
    currentCity,
    currentUserRole,
    notifications = [],
    markNotificationRead,
    markAllNotificationsRead,
    clearNotifications,
    theme,
    toggleTheme,
    currentUser,
  } = useRentBuddyStore();

  const [showNotifications, setShowNotifications] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'logistics' | 'damage' | 'order'>('all');

  const unreadCount = (notifications || []).filter((n) => !n.read).length;

  const handleNotificationClick = (notif: any) => {
    // Instantly mark as read in store and MongoDB Atlas without navigating away
    markNotificationRead(notif.id);
  };

  const handleMarkAllRead = () => {
    markAllNotificationsRead();
  };

  const filteredNotifications = (notifications || []).filter(n => {
    if (!n) return false;
    if (activeFilter === 'all') return true;
    const cat = ((n as any).category || '').toLowerCase();
    const title = (n.title || '').toLowerCase();
    if (activeFilter === 'logistics') {
      return cat === 'logistics' || title.includes('rider') || title.includes('loading') || title.includes('delivery') || title.includes('otp') || title.includes('handover');
    }
    if (activeFilter === 'damage') {
      return cat === 'damage' || title.includes('damage') || title.includes('quality') || title.includes('defect') || title.includes('repair');
    }
    if (activeFilter === 'order') {
      return cat === 'order' || title.includes('order') || title.includes('placed') || title.includes('booked');
    }
    return true;
  });

  const getNotifIcon = (type: string, category?: string) => {
    if (category === 'logistics' || type === 'logistics') {
      return <Truck className="w-4 h-4 text-indigo-400" />;
    }
    switch (type) {
      case 'error':
        return <AlertCircle className="w-4 h-4 text-rose-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      default:
        return <Info className="w-4 h-4 text-cyan-400" />;
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
    <header className={`h-16 ${isDark ? 'bg-[#0d131f] text-slate-100 border-slate-800 shadow-md' : 'bg-white text-slate-800 border-slate-200/90 shadow-xs'} border-b flex items-center justify-between px-6 relative z-50 select-none transition-colors duration-300`}>
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
          <span className={`${isDark ? 'text-slate-600' : 'text-slate-300'} font-bold`}>/</span>
          <span className={`text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
            {getBreadcrumbTitle()}
          </span>
          {currentCity && (
            <span className={`ml-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
              isDark
                ? 'bg-red-950/40 text-red-400 border-red-800/50'
                : 'bg-red-50 text-red-700 border-red-200'
            }`}>
              📍 {currentCity.replace(' (Head Office)', ' Hub')}
            </span>
          )}
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {/* Global Search trigger button */}
        <button
          onClick={onOpenSearch}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs transition-all cursor-pointer shadow-2xs ${
            isDark
              ? 'bg-slate-850 hover:bg-slate-800 border-slate-700/80 text-slate-400 hover:text-slate-200'
              : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-700'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Search inventory, orders...</span>
          <kbd className={`hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono border ${
            isDark ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-200 border-slate-300 text-slate-600'
          }`}>⌘K</kbd>
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-105 ${
            isDark
              ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200'
              : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
          }`}
          title={isDark ? "Switch to Light Theme" : "Switch to Dark Theme"}
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

          {/* Notifications Dropdown Card (z-[100] to completely cover cards without bleed-through) */}
          {showNotifications && (
            <div className={`absolute right-0 mt-2 w-[390px] sm:w-[440px] border rounded-2xl shadow-2xl p-4 space-y-3 z-[100] animate-fade-in ${
              isDark
                ? 'bg-slate-900 border-slate-700 text-slate-100 shadow-black/80'
                : 'bg-white border-slate-200 text-slate-800 shadow-slate-400/30'
            }`}>
              {/* Header */}
              <div className={`flex items-center justify-between border-b pb-2.5 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-500">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className={`font-black text-xs uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Live Notifications
                    </h4>
                    <span className="text-[10px] text-red-500 font-bold">
                      {unreadCount} unread alert{unreadCount === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors cursor-pointer px-2 py-1 rounded bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20"
                    >
                      <CheckCheck className="w-3 h-3" /> Mark all read
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      onClick={() => {
                        clearNotifications();
                        setShowNotifications(false);
                      }}
                      className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-500/10 transition-all cursor-pointer"
                      title="Clear All"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Clickable Notification Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setActiveFilter('all')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    activeFilter === 'all'
                      ? isDark ? 'bg-red-600 text-white font-black shadow-sm' : 'bg-red-600 text-white font-black'
                      : isDark ? 'bg-slate-800 hover:bg-slate-750 text-slate-400' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  All ({notifications.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('logistics')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    activeFilter === 'logistics'
                      ? isDark ? 'bg-red-600 text-white font-black shadow-sm' : 'bg-red-600 text-white font-black'
                      : isDark ? 'bg-slate-800 hover:bg-slate-750 text-slate-400' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  🚚 Logistics & Riders
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('damage')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    activeFilter === 'damage'
                      ? isDark ? 'bg-red-600 text-white font-black shadow-sm' : 'bg-red-600 text-white font-black'
                      : isDark ? 'bg-slate-800 hover:bg-slate-750 text-slate-400' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  ⚠️ Quality & Damage
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('order')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    activeFilter === 'order'
                      ? isDark ? 'bg-red-600 text-white font-black shadow-sm' : 'bg-red-600 text-white font-black'
                      : isDark ? 'bg-slate-800 hover:bg-slate-750 text-slate-400' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  📦 Orders
                </button>
              </div>

              {/* Notifications List */}
              <div className="max-h-80 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-800/40">
                {filteredNotifications.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500 font-medium">
                    <CheckCircle className="w-8 h-8 text-emerald-500/40 mx-auto mb-1.5" />
                    No notifications matching this filter.
                  </div>
                ) : (
                  filteredNotifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`pt-2.5 pb-2.5 px-3 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-3 hover:scale-[1.01] ${
                        notif.read
                          ? isDark ? 'bg-slate-800/30 border-slate-800 text-slate-400 hover:bg-slate-800/50' : 'bg-slate-50/80 border-slate-200 text-slate-500 hover:bg-slate-100'
                          : isDark ? 'bg-red-950/40 hover:bg-red-950/60 border-red-800/80 text-slate-100 shadow-sm' : 'bg-red-50/90 hover:bg-red-100/80 border-red-200 text-slate-900'
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">{getNotifIcon(notif.type, (notif as any).category)}</div>
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between items-center">
                          <span className={`font-black text-xs ${
                            notif.read
                              ? isDark ? 'text-slate-400' : 'text-slate-600'
                              : isDark ? 'text-white' : 'text-slate-900'
                          }`}>
                            {notif.title}
                          </span>
                          {!notif.read && (
                            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                          )}
                        </div>
                        <p className={`text-xs leading-relaxed font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                          {notif.message}
                        </p>

                        {/* Rider, City & Order Badges */}
                        {((notif as any).riderName || (notif as any).orderId || notif.city) && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            {(notif as any).riderName && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/25">
                                🚚 Rider: {(notif as any).riderName} {(notif as any).riderPhone ? `(${(notif as any).riderPhone})` : ''}
                              </span>
                            )}
                            {notif.city && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/25">
                                📍 {notif.city}
                              </span>
                            )}
                            {(notif as any).orderId && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 font-mono">
                                #{(notif as any).orderId}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1">
                          <span>
                            {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(notif.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                          <span className={`font-bold ${notif.read ? 'text-emerald-500/70' : 'text-red-400 hover:text-red-300'}`}>
                            {notif.read ? '✓ Read' : '● Mark as read'}
                          </span>
                        </div>
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
