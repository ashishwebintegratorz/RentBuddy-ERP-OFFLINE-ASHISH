import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import GlobalSearch from './components/GlobalSearch';

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
  const { runSystemAudit, theme, initializeStore, token } = useRentBuddyStore();

  // Run initial compliance audit and sync state from MongoDB Atlas
  useEffect(() => {
    initializeStore().then(() => {
      runSystemAudit();
    });
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

  const handleGlobalNavigate = (viewId: string, itemId?: string) => {
    setView(viewId);
    // You could save itemId in a state or store to highlight the row,
    // but simply switching the view is a massive UX jump!
  };

  const renderActiveView = () => {
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
      <Sidebar currentView={currentView} setView={setView} />

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-950/20 relative">
        {/* Top Navbar */}
        <Navbar currentView={currentView} onOpenSearch={() => setIsSearchOpen(true)} />

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
