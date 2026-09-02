import React, { useEffect, useState, useRef } from 'react';
import { useRentBuddyStore } from '../store/rentBuddyStore';
import { Search, X, Users, Box, CreditCard, ShieldAlert } from 'lucide-react';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (viewId: string, itemId?: string) => void;
}

export default function GlobalSearch({ isOpen, onClose, onNavigate }: GlobalSearchProps) {
  const { customers, inventory, invoices, orders } = useRentBuddyStore();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Search logic
  const searchNormalized = query.toLowerCase().trim();
  
  const results = {
    customers: searchNormalized ? customers.filter(
      c => c.fullName.toLowerCase().includes(searchNormalized) || 
           c.mobileNumber.includes(searchNormalized) ||
           c.email.toLowerCase().includes(searchNormalized) ||
           c.panNumber.toLowerCase().includes(searchNormalized) ||
           c.aadhaarNumber.includes(searchNormalized)
    ) : [],
    assets: searchNormalized ? inventory.filter(
      a => a.id.toLowerCase().includes(searchNormalized) ||
           a.barcode.toLowerCase().includes(searchNormalized) ||
           a.category.toLowerCase().includes(searchNormalized) ||
           a.brand.toLowerCase().includes(searchNormalized) ||
           a.model.toLowerCase().includes(searchNormalized)
    ) : [],
    invoices: searchNormalized ? invoices.filter(
      i => i.id.toLowerCase().includes(searchNormalized) ||
           i.orderId.toLowerCase().includes(searchNormalized) ||
           i.customerName.toLowerCase().includes(searchNormalized)
    ) : [],
    orders: searchNormalized ? orders.filter(
      o => o.id.toLowerCase().includes(searchNormalized) ||
           o.customerName.toLowerCase().includes(searchNormalized) ||
           o.customerMobile.includes(searchNormalized)
    ) : []
  };

  const totalResults = results.customers.length + results.assets.length + results.invoices.length + results.orders.length;

  return (
    <div className="fixed inset-0 bg-[#030303]/85 backdrop-blur-md flex items-start justify-center pt-24 z-50 transition-opacity">
      <div className="w-[600px] glass-panel border border-slate-800/90 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[500px]">
        {/* Search header input */}
        <div className="p-4 border-b border-slate-800/80 flex items-center gap-3">
          <Search className="w-5 h-5 text-red-500" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type customer name, order ID, PAN, Aadhaar, barcode, invoice..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent border-0 outline-none text-white text-sm focus:ring-0 placeholder-slate-500"
          />
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-900/50 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!query ? (
            <div className="text-center py-10 space-y-2 text-slate-500 text-xs font-medium">
              <p>Search anything across the RentBuddy database.</p>
              <p className="text-[10px] text-slate-600 font-mono">Tip: Search "bed", "Rajesh", "INV", "ORD", or "1234"</p>
            </div>
          ) : totalResults === 0 ? (
            <div className="text-center py-10 text-slate-500 text-xs font-medium">
              No matching records found for "{query}".
            </div>
          ) : (
            <div className="space-y-4">
              {/* Category: Customers */}
              {results.customers.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[10px] uppercase font-bold text-red-400 tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    Customers ({results.customers.length})
                  </div>
                  <div className="space-y-1">
                    {results.customers.map(c => (
                      <button
                        key={c.id}
                        onClick={() => {
                          onNavigate('customers', c.id);
                          onClose();
                        }}
                        className="w-full text-left p-2.5 rounded-xl border border-slate-800 bg-slate-900/10 hover:bg-red-950/20 hover:border-red-500/30 transition-all flex items-center justify-between text-slate-300 text-xs cursor-pointer group"
                      >
                        <div>
                          <div className="font-semibold text-white group-hover:text-red-400 transition-colors">{c.fullName}</div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">{c.id} | {c.mobileNumber} | {c.email}</div>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 uppercase tracking-wider font-semibold">
                          {c.status}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Category: Assets */}
              {results.assets.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider flex items-center gap-1.5">
                    <Box className="w-3.5 h-3.5" />
                    Assets ({results.assets.length})
                  </div>
                  <div className="space-y-1">
                    {results.assets.map(a => (
                      <button
                        key={a.id}
                        onClick={() => {
                          onNavigate('inventory', a.id);
                          onClose();
                        }}
                        className="w-full text-left p-2.5 rounded-xl border border-slate-800 bg-slate-900/10 hover:bg-slate-800/40 hover:border-slate-700/80 transition-all flex items-center justify-between text-slate-300 text-xs cursor-pointer group"
                      >
                        <div>
                          <div className="font-semibold text-white group-hover:text-emerald-300 transition-colors">
                            {a.brand} {a.model} ({a.category})
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">ID: {a.id} | Barcode: {a.barcode} | Rack: {a.rackNumber}</div>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/15 text-red-400 uppercase tracking-wider font-semibold">
                          {a.status}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Category: Orders */}
              {results.orders.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[10px] uppercase font-bold text-amber-400 tracking-wider flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Rental Orders ({results.orders.length})
                  </div>
                  <div className="space-y-1">
                    {results.orders.map(o => (
                      <button
                        key={o.id}
                        onClick={() => {
                          onNavigate('orders', o.id);
                          onClose();
                        }}
                        className="w-full text-left p-2.5 rounded-xl border border-slate-800 bg-slate-900/10 hover:bg-slate-800/40 hover:border-slate-700/80 transition-all flex items-center justify-between text-slate-300 text-xs cursor-pointer group"
                      >
                        <div>
                          <div className="font-semibold text-white group-hover:text-amber-300 transition-colors">Order {o.id}</div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">Customer: {o.customerName} | Duration: {o.durationMonths}mo | Rent: ₹{o.netMonthlyRent}/mo</div>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 uppercase tracking-wider font-semibold">
                          {o.status}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Category: Invoices */}
              {results.invoices.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[10px] uppercase font-bold text-red-400 tracking-wider flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5" />
                    Invoices ({results.invoices.length})
                  </div>
                  <div className="space-y-1">
                    {results.invoices.map(i => (
                      <button
                        key={i.id}
                        onClick={() => {
                          onNavigate('finance', i.id);
                          onClose();
                        }}
                        className="w-full text-left p-2.5 rounded-xl border border-slate-800 bg-slate-900/10 hover:bg-slate-800/40 hover:border-slate-700/80 transition-all flex items-center justify-between text-slate-300 text-xs cursor-pointer group"
                      >
                        <div>
                          <div className="font-semibold text-white group-hover:text-red-400 transition-colors">Invoice {i.id}</div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">Customer: {i.customerName} | Period: {i.billingPeriod} | Total: ₹{i.totalAmount}</div>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded uppercase tracking-wider font-semibold ${
                          i.status === 'Paid' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                        }`}>
                          {i.status}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="p-3 bg-slate-950/60 border-t border-slate-800/80 text-[10px] text-slate-500 flex justify-between">
          <span>Use <strong>Enter</strong> to select, <strong>ESC</strong> to close.</span>
          <span>RentBuddy Search Core v2.0</span>
        </div>
      </div>
    </div>
  );
}
