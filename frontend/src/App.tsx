import { useState, useEffect, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import GlobalSearch from './components/GlobalSearch';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

// Views
import Dashboard from './views/Dashboard';
import CustomerManagement from './views/CustomerManagement';
import InventoryManagement from './views/InventoryManagement';
import BarcodeTracking from './views/BarcodeTracking';
import PointOfSale from './views/PointOfSale';
import OrderManagement from './views/OrderManagement';
import LogisticsLog from './views/LogisticsLog';
import LogisticsDetailDocument from './views/LogisticsDetailDocument';
import ReturnInspection from './views/ReturnInspection';
import RepairDashboard from './views/RepairDashboard';
import RentalPackages from './views/RentalPackages';
import FinancePortal from './views/FinancePortal';
import ReportsCenter from './views/ReportsCenter';
import Login from './views/Login';
import Settings from './views/Settings';
import Quotations from './views/Quotations';

import { useRentBuddyStore } from './store/rentBuddyStore';

function App() {
  const [currentView, setView] = useState('dashboard');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { runSystemAudit, theme, initializeStore, token, currentUser, currentUserRole } = useRentBuddyStore();

  const isSuperAdmin = currentUserRole === 'Super Admin' || currentUser?.role === 'Super Admin' || (Boolean(currentUser?.permissions?.includes('*')) || Boolean(currentUser?.permissions?.includes('all')));

  // Check if active view is permitted for this user
  const isPermitted = useMemo(() => {
    if (isSuperAdmin) return true;
    if (currentView === 'settings') return false;
    if (currentUser?.permissions && Array.isArray(currentUser.permissions) && currentUser.permissions.length > 0) {
      return currentUser.permissions.includes(currentView);
    }
    return true;
  }, [isSuperAdmin, currentView, currentUser?.permissions]);

  // First available view for non-admin users
  const firstAllowedView = useMemo(() => {
    if (isSuperAdmin) return 'dashboard';
    if (currentUser?.permissions && Array.isArray(currentUser.permissions) && currentUser.permissions.length > 0) {
      return currentUser.permissions[0];
    }
    return 'dashboard';
  }, [isSuperAdmin, currentUser?.permissions]);

  // Run initial compliance audit and sync state from MongoDB Atlas
  useEffect(() => {
    // Purge legacy mock cache from browser localStorage
    try {
      localStorage.removeItem('rentbuddy-erp-storage-v2');
      localStorage.removeItem('rentbuddy-storage');
      localStorage.removeItem('rentbuddy-offline-storage');
    } catch (e) {
      console.warn("Storage purge warning:", e);
    }

    initializeStore().then(() => {
      runSystemAudit();
    });

    // Real-time polling every 5 seconds for new drivers / live updates from mobile apps
    const interval = setInterval(() => {
      initializeStore();
    }, 5000);

    return () => clearInterval(interval);
  }, [initializeStore, runSystemAudit]);

  // Sync theme changes with document root class
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
      root.classList.remove('light');
    }
  }, [theme]);

  // Hook global keyboard shortcut Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleGlobalNavigate = (viewId: string, _itemId?: string) => {
    setView(viewId);
  };

  const renderActiveView = () => {
    if (!isPermitted) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 glass-card rounded-3xl border border-slate-800 space-y-4 max-w-lg mx-auto mt-12">
          <div className="p-4 rounded-full bg-rose-500/10 border border-rose-500/25 text-rose-400">
            <ShieldAlert className="w-10 h-10" />
          </div>
          <h2 className="text-lg font-black text-white">Section Access Restricted</h2>
          <p className="text-xs text-slate-400 font-medium leading-relaxed">
            This ERP module has not been handed over to your staff account. Contact your Super Administrator to request permission for this section.
          </p>
          <button
            onClick={() => setView(firstAllowedView)}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl cursor-pointer transition-all flex items-center gap-2 shadow-lg shadow-red-900/40"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go to My Permitted Section</span>
          </button>
        </div>
      );
    }

    switch (currentView) {
      case 'dashboard':
        return <Dashboard setView={setView} />;
      case 'customers':
        return <CustomerManagement />;
      case 'inventory':
        return <InventoryManagement />;
      case 'barcode':
        return <BarcodeTracking />;
      case 'pos':
        return <PointOfSale />;
      case 'orders':
        return <OrderManagement />;
      case 'logistics':
        return <LogisticsLog />;
      case 'logistic-docs':
        return <LogisticsDetailDocument />;
      case 'inspection':
        return <ReturnInspection />;
      case 'repair':
        return <RepairDashboard />;
      case 'packages':
        return <RentalPackages />;
      case 'finance':
        return <FinancePortal />;
      case 'reports':
        return <ReportsCenter />;
      case 'settings':
        return <Settings />;
      case 'quotations':
        return <Quotations />;
      default:
        return <Dashboard setView={setView} />;
    }
  };

  if (!token) {
    return <Login />;
  }

  return (
    <div className="flex h-screen bg-[#0b0f19] text-slate-200 overflow-hidden font-sans select-none antialiased">
      {/* Sidebar layout */}
      <Sidebar
        currentView={currentView}
        setView={setView}
        isCollapsed={isSidebarCollapsed}
      />

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-950/20 relative">
        {/* Top Navbar */}
        <Navbar
          currentView={currentView}
          setView={setView}
          onOpenSearch={() => setIsSearchOpen(true)}
          onToggleSidebar={() => setIsSidebarCollapsed(prev => !prev)}
          isSidebarCollapsed={isSidebarCollapsed}
        />

        {/* Dynamic View port wrapper */}
        <main className="flex-1 overflow-y-auto p-6 focus:outline-none scroll-smooth">
          {renderActiveView()}
        </main>
      </div>

      {/* Global Command Center Search Modal */}
      <GlobalSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={handleGlobalNavigate}
      />
    </div>
  );
}

export default App;
