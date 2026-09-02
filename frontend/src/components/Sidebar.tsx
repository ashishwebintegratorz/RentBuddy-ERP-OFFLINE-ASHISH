import React from 'react';
import { useRentBuddyStore } from '../store/rentBuddyStore';
import type { UserRole } from '../types';
import rentBuddyLogo from '../assets/rentbuddy1.png';
import {
  LayoutDashboard,
  Users,
  Warehouse,
  QrCode,
  ShoppingCart,
  ShieldCheck,
  Truck,
  ClipboardCheck,
  Wrench,
  CreditCard,
  Gift,
  FileSpreadsheet,
  AlertOctagon,
  MapPin,
  Shield,
  Settings,
  FileText,
  Globe,
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  setView: (view: string) => void;
  isCollapsed?: boolean;
}

export default function Sidebar({ currentView, setView, isCollapsed = false }: SidebarProps) {
  const {
    currentUserRole,
    currentCity,
    cities,
    addCity,
    setRole,
    setCity,
    expectedVsActualAudit,
    currentUser,
    logout,
    theme
  } = useRentBuddyStore();

  const isDark = theme === 'dark';

  const roles: UserRole[] = [
    'Super Admin',
    'Operations Manager',
    'Warehouse Manager',
    'Logistics Team',
    'Repair Team',
    'Finance',
    'Customer Support',
    'Read-only Auditor',
  ];

  // Role-based route definitions
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['*'] },
    { id: 'customers', label: 'Customers', icon: Users, roles: ['Super Admin', 'Operations Manager', 'Customer Support'] },
    { id: 'inventory', label: 'Inventory Master', icon: Warehouse, roles: ['Super Admin', 'Operations Manager', 'Warehouse Manager', 'Read-only Auditor'] },
    { id: 'barcode', label: 'Barcode & Scanning', icon: QrCode, roles: ['Super Admin', 'Operations Manager', 'Warehouse Manager', 'Logistics Team'] },
    { id: 'pos', label: 'Point of Sale (POS)', icon: ShoppingCart, roles: ['Super Admin', 'Operations Manager', 'Customer Support'] },
    { id: 'orders', label: 'Rental Orders', icon: ShieldCheck, roles: ['Super Admin', 'Operations Manager', 'Finance'] },
    { id: 'logistics', label: 'Logistics Tasks', icon: Truck, roles: ['Super Admin', 'Operations Manager', 'Logistics Team'] },
    { id: 'logistic-docs', label: 'Logistic Driver Documents', icon: ShieldCheck, roles: ['Super Admin', 'Operations Manager', 'Logistics Team'] },
    { id: 'inspection', label: 'Quality Inspection', icon: ClipboardCheck, roles: ['Super Admin', 'Operations Manager', 'Warehouse Manager'] },
    { id: 'repair', label: 'Repairs & Vendors', icon: Wrench, roles: ['Super Admin', 'Operations Manager', 'Repair Team'] },
    { id: 'packages', label: 'Rental Bundles', icon: Gift, roles: ['Super Admin', 'Operations Manager'] },
    { id: 'finance', label: 'Finance Portal', icon: CreditCard, roles: ['Super Admin', 'Operations Manager', 'Finance'] },
    { id: 'reports', label: 'Reports & Export', icon: FileSpreadsheet, roles: ['Super Admin', 'Operations Manager', 'Read-only Auditor'] },
    { id: 'quotations', label: 'Quotations', icon: FileText, roles: ['*'] },
    { id: 'settings', label: 'Settings', icon: Settings, roles: ['*'] },
  ];

  // Filter items matching role
  const filteredMenuItems = menuItems.filter(
    (item) => item.roles.includes('*') || item.roles.includes(currentUserRole)
  );

  return (
    <aside
      className={`${isCollapsed ? 'w-20' : 'w-64'} flex-shrink-0 ${isDark
          ? 'bg-gradient-to-b from-[#1a0709] via-[#120507] to-[#0a0d14] text-slate-100 border-r border-red-950/60 shadow-2xl'
          : 'bg-gradient-to-b from-red-600 via-rose-600 to-red-700 text-white border-r border-red-500/40 shadow-xl'
        } flex flex-col h-full z-10 select-none transition-all duration-300 ease-in-out`}
    >
      {/* Brand Header with RentBuddy Official Logo */}
      <div className={`p-4 border-b ${isDark ? 'border-red-950/60' : 'border-white/15'} flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
        <div className="w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center shadow-md overflow-hidden shrink-0">
          <img src={rentBuddyLogo} alt="RentBuddy Logo" className="w-full h-full object-contain" />
        </div>
        {!isCollapsed && (
          <div className="min-w-0">
            <h1 className="text-sm font-black tracking-tight text-white flex items-center gap-1.5 truncate">
              RentBuddy <span className="text-[9px] bg-white text-red-700 px-1.5 py-0.5 rounded font-mono font-black shadow-2xs">ERP</span>
            </h1>
            <p className="text-[10px] text-white/80 font-medium truncate">Offline Fleet & Asset Suite</p>
          </div>
        )}
      </div>

      {/* User Profile Card & Logout */}
      {currentUser && !isCollapsed && (
        <div className={`mx-3 mt-3 p-2.5 rounded-xl flex items-center justify-between gap-2 shadow-2xs ${isDark
            ? 'bg-red-950/30 border border-red-900/40 text-slate-200'
            : 'bg-white/15 border border-white/20 text-white'
          }`}>
          <div className="min-w-0">
            <h4 className="text-[11px] font-bold truncate text-white">{currentUser.fullName}</h4>
            <p className="text-[9px] text-white/80 truncate">@{currentUser.username}</p>
          </div>
          <button
            onClick={() => logout()}
            className={`text-[9px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer shadow-2xs hover:scale-[1.02] ${isDark
                ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-500/30'
                : 'bg-white text-red-700 hover:bg-white/90 font-black'
              }`}
          >
            Logout
          </button>
        </div>
      )}

      {/* Role & City Selector Widget (Hidden in collapsed mode) */}
      {!isCollapsed && (
        <div className={`p-3.5 space-y-2.5 border-b ${isDark ? 'border-red-950/60 bg-black/20' : 'border-white/15 bg-black/10'}`}>
          {/* Role Selection */}
          <div>
            <label className="text-[9px] font-bold text-white/80 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
              <Shield className="w-3 h-3 text-white" />
              Switch User Role
            </label>
            <select
              value={currentUserRole}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className={`w-full text-xs font-semibold rounded-lg px-2.5 py-1.5 cursor-pointer transition-all shadow-2xs ${isDark
                  ? 'bg-slate-900/90 border border-slate-800 text-slate-100 focus:border-red-500'
                  : 'bg-white/15 border border-white/25 text-white focus:bg-white focus:text-slate-900'
                }`}
            >
              {roles.map((role) => (
                <option key={role} value={role} className="text-slate-900 bg-white py-1">
                  {role}
                </option>
              ))}
            </select>
          </div>

          {/* City Selection */}
          <div>
            <label className="text-[9px] font-bold text-white/80 uppercase tracking-wider block mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-white" />
                City Context
              </span>
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => setCity('All Cities')}
                title="All Cities (Global View)"
                className={`col-span-2 text-[10px] py-1.5 px-2 rounded-lg border transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${currentCity === 'All Cities' || currentCity === 'All'
                    ? isDark
                      ? 'bg-red-600 text-white font-bold border-red-500 shadow-md'
                      : 'bg-white text-red-700 font-bold border-white shadow-md'
                    : isDark
                      ? 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 border-slate-800 font-medium'
                      : 'bg-white/10 text-white hover:bg-white/20 border-white/20 font-medium'
                  }`}
              >
                <Globe className="w-3 h-3 text-cyan-300" />
                <span>All Cities (Global View)</span>
              </button>
              {cities.filter(c => c !== 'All Cities' && c !== 'All').map((city) => (
                <button
                  key={city}
                  onClick={() => setCity(city)}
                  title={city}
                  className={`text-[10px] py-1.5 px-1 rounded-lg border transition-all text-center truncate cursor-pointer ${currentCity === city
                      ? isDark
                        ? 'bg-red-600 text-white font-bold border-red-500 shadow-md'
                        : 'bg-white text-red-700 font-bold border-white shadow-md'
                      : isDark
                        ? 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 border-slate-800 font-medium'
                        : 'bg-white/10 text-white hover:bg-white/20 border-white/20 font-medium'
                    }`}
                >
                  {city.replace(' (Head Office)', ' (HO)')}
                </button>
              ))}
            </div>

            {/* Add City Input for Super Admin */}
            {(currentUserRole === 'Super Admin' || currentUserRole === 'Operations Manager') && (
              <div className={`mt-2 pt-2 border-t ${isDark ? 'border-red-950/60' : 'border-white/15'}`}>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const data = new FormData(form);
                    const newCity = data.get('newCityName')?.toString().trim();
                    if (newCity) {
                      addCity(newCity);
                      form.reset();
                    }
                  }}
                  className="flex items-center gap-1.5"
                >
                  <input
                    type="text"
                    name="newCityName"
                    placeholder="+ Add new city..."
                    className={`flex-1 rounded px-2 py-1 text-[10px] placeholder-white/60 focus:outline-none shadow-2xs ${isDark
                        ? 'bg-slate-900 border border-slate-800 text-slate-200 focus:border-red-500'
                        : 'bg-white/15 border border-white/25 text-white placeholder-white/60 focus:bg-white/25'
                      }`}
                  />
                  <button
                    type="submit"
                    className={`text-[10px] font-bold px-2 py-1 rounded transition-colors shadow-2xs ${isDark
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-white text-red-700 hover:bg-white/90'
                      }`}
                  >
                    Add
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto p-2.5 space-y-1">
        {filteredMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              title={item.label}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2 py-2.5' : 'gap-2.5 px-3 py-2'} rounded-xl text-xs transition-all duration-200 cursor-pointer ${isActive
                  ? isDark
                    ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold shadow-lg shadow-red-900/40 border border-red-500/40'
                    : 'bg-white text-red-700 font-bold shadow-md'
                  : isDark
                    ? 'text-slate-400 hover:bg-red-950/20 hover:text-red-300 font-medium'
                    : 'text-white/90 hover:bg-white/15 hover:text-white font-medium'
                }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive
                  ? isDark ? 'text-white' : 'text-red-700'
                  : isDark ? 'text-slate-400' : 'text-white/90'
                }`} />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
              {!isCollapsed && item.id === 'dashboard' && expectedVsActualAudit.fraudAlertCount > 0 && (
                <span className="ml-auto w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer System Status */}
      <div className={`p-3 border-t ${isDark ? 'border-red-950/60 bg-black/20' : 'border-white/15 bg-black/10'} ${isCollapsed ? 'flex justify-center' : 'space-y-1.5'}`}>
        {!isCollapsed ? (
          <>
            <div className="flex items-center justify-between text-[11px] text-white/80">
              <span>Database Integrity:</span>
              {expectedVsActualAudit.fraudAlertCount > 0 ? (
                <span className="text-amber-300 font-bold flex items-center gap-1">
                  <AlertOctagon className="w-3.5 h-3.5 animate-bounce" /> Flagged
                </span>
              ) : (
                <span className="text-emerald-300 font-bold flex items-center gap-1">
                  🛡️ Secure
                </span>
              )}
            </div>
            {expectedVsActualAudit.fraudAlertCount > 0 && (
              <div className="text-[10px] text-white bg-red-950/60 border border-red-800 rounded p-1 font-mono text-center font-bold">
                {expectedVsActualAudit.fraudAlertCount} Fraud Alert{expectedVsActualAudit.fraudAlertCount > 1 ? 's' : ''} Active
              </div>
            )}
          </>
        ) : (
          <div title={`Database Integrity: ${expectedVsActualAudit.fraudAlertCount > 0 ? 'Flagged' : 'Secure'}`}>
            {expectedVsActualAudit.fraudAlertCount > 0 ? (
              <AlertOctagon className="w-4 h-4 text-amber-300 animate-bounce" />
            ) : (
              <span className="text-sm">🛡️</span>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
