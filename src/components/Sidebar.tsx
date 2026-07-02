import React from 'react';
import { useRentBuddyStore } from '../store/rentBuddyStore';
import type { UserRole, CityName } from '../types';
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
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  setView: (view: string) => void;
}

export default function Sidebar({ currentView, setView }: SidebarProps) {
  const {
    currentUserRole,
    currentCity,
    cities,
    addCity,
    setRole,
    setCity,
    expectedVsActualAudit,
    notifications,
    currentUser,
    logout
  } = useRentBuddyStore();

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
    { id: 'inspection', label: 'Quality Inspection', icon: ClipboardCheck, roles: ['Super Admin', 'Operations Manager', 'Warehouse Manager'] },
    { id: 'repair', label: 'Repairs & Vendors', icon: Wrench, roles: ['Super Admin', 'Operations Manager', 'Repair Team'] },
    { id: 'packages', label: 'Rental Bundles', icon: Gift, roles: ['Super Admin', 'Operations Manager'] },
    { id: 'finance', label: 'Finance Portal', icon: CreditCard, roles: ['Super Admin', 'Operations Manager', 'Finance'] },
    { id: 'reports', label: 'Reports & Export', icon: FileSpreadsheet, roles: ['Super Admin', 'Operations Manager', 'Read-only Auditor'] },
    { id: 'settings', label: 'Settings', icon: Settings, roles: ['*'] },
  ];

  // Filter items matching role
  const filteredMenuItems = menuItems.filter(
    (item) => item.roles.includes('*') || item.roles.includes(currentUserRole)
  );

  return (
    <aside className="w-64 flex-shrink-0 glass-panel border-r border-slate-800/80 flex flex-col h-full z-10">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/60 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <span className="font-bold text-white text-lg tracking-wider">R</span>
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1">
            RentBuddy <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded font-mono">ERP</span>
          </h1>
          <p className="text-[11px] text-slate-400">Offline Asset Lifecycle</p>
        </div>
      </div>

      {/* User Profile Card & Logout */}
      {currentUser && (
        <div className="mx-4 mt-4 p-3 bg-slate-900/40 border border-slate-800/80 rounded-2xl flex items-center justify-between gap-2.5">
          <div className="min-w-0">
            <h4 className="text-[11px] font-bold text-white truncate">{currentUser.fullName}</h4>
            <p className="text-[9px] text-slate-400 truncate">@{currentUser.username}</p>
          </div>
          <button
            onClick={() => logout()}
            className="text-[9px] text-rose-400 hover:text-rose-300 font-extrabold px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/20 rounded-xl transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
          >
            Logout
          </button>
        </div>
      )}

      {/* Role & City Selector Widget */}
      <div className="p-4 role-city-widget space-y-3">
        {/* Role Selection */}
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
            <Shield className="w-3 h-3 text-indigo-400" />
            Switch User Role
          </label>
          <select
            value={currentUserRole}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="w-full text-xs font-semibold rounded-lg px-2.5 py-1.5 cursor-pointer role-select-box transition-all"
          >
            {roles.map((role) => (
              <option key={role} value={role} className="role-option-item">
                {role}
              </option>
            ))}
          </select>
        </div>

        {/* City Selection */}
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3 h-3 text-emerald-400" />
              City Context
            </span>
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {cities.map((city) => (
              <button
                key={city}
                onClick={() => setCity(city)}
                title={city}
                className={`text-[10px] py-1.5 px-1 rounded-lg border transition-all text-center truncate ${
                  currentCity === city
                    ? 'city-btn-active font-bold shadow-sm shadow-emerald-500/5'
                    : 'city-btn-inactive font-medium'
                }`}
              >
                {city.replace(' (Head Office)', ' (HO)')}
              </button>
            ))}
          </div>

          {/* Add City Input for Super Admin */}
          {(currentUserRole === 'Super Admin' || currentUserRole === 'Operations Manager') && (
            <div className="mt-2.5 pt-2.5 border-t border-slate-800/40">
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
                  className="flex-1 bg-slate-950/60 border border-slate-800/80 rounded px-2 py-1 text-[10px] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/60"
                />
                <button
                  type="submit"
                  className="bg-indigo-500/20 hover:bg-indigo-500/40 border border-indigo-500/30 text-indigo-300 text-[10px] font-medium px-2 py-1 rounded transition-colors"
                >
                  Add
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {filteredMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                isActive
                  ? 'bg-indigo-500/15 text-indigo-300 border-l-2 border-indigo-500 font-medium pl-2.5'
                  : 'text-slate-300 hover:bg-slate-800/30 hover:text-slate-100 pl-3'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
              <span>{item.label}</span>
              {item.id === 'dashboard' && expectedVsActualAudit.fraudAlertCount > 0 && (
                <span className="ml-auto w-2 h-2 rounded-full bg-rose-500 pulse-glow-rose"></span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer System Status */}
      <div className="p-4 border-t border-slate-800/60 bg-slate-950/40 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Database Integrity:</span>
          {expectedVsActualAudit.fraudAlertCount > 0 ? (
            <span className="text-rose-400 font-semibold flex items-center gap-1">
              <AlertOctagon className="w-3.5 h-3.5 animate-bounce" /> Compromised
            </span>
          ) : (
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              🛡️ Secure
            </span>
          )}
        </div>
        {expectedVsActualAudit.fraudAlertCount > 0 && (
          <div className="text-[10px] text-rose-300/80 bg-rose-500/10 border border-rose-500/20 rounded p-1.5 font-mono text-center">
            {expectedVsActualAudit.fraudAlertCount} Fraud Alert{expectedVsActualAudit.fraudAlertCount > 1 ? 's' : ''} Active
          </div>
        )}
      </div>
    </aside>
  );
}
