import { useState } from 'react';
import { useRentBuddyStore } from '../store/rentBuddyStore';
import {
  CreditCard,
  RefreshCw,
  Search,
  Printer,
  Send,
  X,
  Info
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function FinancePortal() {
  const {
    invoices,
    payInvoice,
    generateMonthlyInvoices,
    currentCity,
    orders
  } = useRentBuddyStore();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  
  // Razorpay Checkout Popup simulator state
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutPaymentMethod, setCheckoutPaymentMethod] = useState('UPI');

  const selectedInvoice = invoices.find(i => i.id === selectedInvoiceId);

  // Filter list
  const filteredInvoices = invoices.filter(i => {
    const matchesSearch = i.id.toLowerCase().includes(search.toLowerCase()) ||
                          i.customerName.toLowerCase().includes(search.toLowerCase()) ||
                          i.orderId.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || i.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handlePayInvoice = () => {
    if (!selectedInvoiceId) return;
    payInvoice(selectedInvoiceId, `Razorpay Gateway (${checkoutPaymentMethod})`);
    setShowCheckoutModal(false);
    
    // Blast confetti!
    confetti({
      particleCount: 100,
      spread: 60,
      origin: { y: 0.8 }
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Pending':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'Overdue':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-slate-800 text-slate-400';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 flex gap-6 relative text-xs text-slate-300">
      
      {/* Invoice list panel */}
      <div className="flex-1 space-y-4">
        
        {/* Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-4 rounded-2xl">
          <div className="relative w-64">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by Invoice ID, order ID, tenant name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-full rounded-xl py-2 bg-slate-900/40 text-xs"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl py-2 px-3 bg-slate-900/40 border border-slate-800"
            >
              <option value="All">All Invoices</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Overdue">Overdue</option>
            </select>
            <button
              onClick={() => {
                generateMonthlyInvoices();
                alert('Billing run executed successfully! New monthly invoices generated for active contracts.');
              }}
              className="bg-red-650 hover:bg-red-600 border border-red-500/25 hover:border-red-500 text-white rounded-xl font-semibold px-4 py-2 flex items-center gap-2 cursor-pointer transition-all shadow-md"
            >
              <RefreshCw className="w-4 h-4" /> Run Monthly Billing Cycle
            </button>
          </div>
        </div>

        {/* Invoices Table */}
        <div className="glass-panel rounded-2xl overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/40 text-slate-400 border-b border-slate-800/80">
                <th className="p-4 font-bold uppercase tracking-wider">Invoice ID</th>
                <th className="p-4 font-bold uppercase tracking-wider">Recipient (Order)</th>
                <th className="p-4 font-bold uppercase tracking-wider">Billing Period</th>
                <th className="p-4 font-bold uppercase tracking-wider">Total Charges</th>
                <th className="p-4 font-bold uppercase tracking-wider">Status</th>
                <th className="p-4 font-bold uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 font-medium">No invoices registered.</td>
                </tr>
              ) : (
                filteredInvoices.map(inv => (
                  <tr
                    key={inv.id}
                    onClick={() => setSelectedInvoiceId(inv.id)}
                    className={`hover:bg-slate-800/10 cursor-pointer transition-colors ${
                      selectedInvoiceId === inv.id ? 'bg-red-900/5' : ''
                    }`}
                  >
                    <td className="p-4 font-bold text-white">{inv.id}</td>
                    <td className="p-4">
                      <span className="font-semibold text-slate-200 block">{inv.customerName}</span>
                      <span className="text-[10px] text-slate-500 font-mono">Order: {inv.orderId}</span>
                    </td>
                    <td className="p-4 font-mono text-slate-300">{inv.billingPeriod}</td>
                    <td className="p-4 font-mono text-slate-200">
                      <div>₹{inv.totalAmount.toLocaleString()}</div>
                      {inv.lateFee > 0 && <span className="text-[9px] text-rose-400 font-semibold">+₹{inv.lateFee} Late fee</span>}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusColor(inv.status)}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedInvoiceId(inv.id);
                        }}
                        className="text-red-400 hover:text-red-300 font-semibold text-[11px]"
                      >
                        Inspect Bill
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over Invoice details */}
      {selectedInvoiceId && selectedInvoice && (
        <div className="w-[380px] glass-panel border border-slate-800/90 rounded-2xl p-5 space-y-4 flex-shrink-0 animate-fade-in max-h-[85vh] overflow-y-auto z-10 text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-white text-sm">Receipt Ledger Overview</h3>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">{selectedInvoice.id}</p>
            </div>
            <button
              onClick={() => setSelectedInvoiceId(null)}
              className="p-1 rounded bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Details summary */}
          <div className="space-y-3 bg-slate-950/40 p-4 border border-slate-900 rounded-xl">
            <div className="flex justify-between font-mono text-[11px]">
              <span className="text-slate-400">Recipient:</span>
              <strong className="text-slate-200">{selectedInvoice.customerName}</strong>
            </div>
            <div className="flex justify-between font-mono text-[11px]">
              <span className="text-slate-400">Linked Order:</span>
              <span className="text-slate-300">{selectedInvoice.orderId}</span>
            </div>
            <div className="flex justify-between font-mono text-[11px]">
              <span className="text-slate-400">Billing Term:</span>
              <span className="text-slate-300">{selectedInvoice.billingPeriod}</span>
            </div>
            <div className="flex justify-between font-mono text-[11px]">
              <span className="text-slate-400">Due Date:</span>
              <span className="text-slate-300">{selectedInvoice.dueDate}</span>
            </div>
            <div className="flex justify-between items-center border-t border-slate-900 pt-2 text-[11px]">
              <span className="text-slate-400">Status Check:</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusColor(selectedInvoice.status)}`}>
                {selectedInvoice.status}
              </span>
            </div>
          </div>

          {/* Charge list */}
          <div className="space-y-2 bg-slate-900/10 p-3 rounded-xl border border-slate-850">
            <div className="flex justify-between text-slate-400">
              <span>Rental Charges:</span>
              <span className="text-slate-200 font-mono">₹{selectedInvoice.rentalCharges}</span>
            </div>
            {selectedInvoice.depositAmount > 0 && (
              <div className="flex justify-between text-slate-400">
                <span>Security Deposit Hold:</span>
                <span className="text-slate-200 font-mono">₹{selectedInvoice.depositAmount}</span>
              </div>
            )}
            {selectedInvoice.lateFee > 0 && (
              <div className="flex justify-between text-rose-400">
                <span>Late Payment Fees:</span>
                <span className="font-mono">+₹{selectedInvoice.lateFee}</span>
              </div>
            )}
            {selectedInvoice.discount > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>Coupon Applied:</span>
                <span className="font-mono">-₹{selectedInvoice.discount}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-100 font-bold border-t border-slate-900 pt-1.5 text-sm">
              <span>Total Bill:</span>
              <span className="font-mono text-red-400">₹{selectedInvoice.totalAmount.toLocaleString()}</span>
            </div>
          </div>

          {/* Simulated Razorpay trigger */}
          {selectedInvoice.status !== 'Paid' && (
            <button
              onClick={() => setShowCheckoutModal(true)}
              className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-red-600/10"
            >
              <CreditCard className="w-4 h-4" /> Open Razorpay Payment Gateway
            </button>
          )}

          {/* Print preview */}
          <div className="pt-2 border-t border-slate-800/80 flex justify-between gap-2">
            <button
              onClick={() => alert(`Sending link via SMS: UPI://pay?pa=rentbuddy@upi&am=${selectedInvoice.totalAmount}`)}
              className="flex-1 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-all"
            >
              <Send className="w-3.5 h-3.5 text-red-400" /> Share UPI Link
            </button>
            <button
              onClick={() => window.print()}
              className="py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-lg px-3 flex items-center justify-center gap-1 cursor-pointer transition-all"
            >
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
          </div>
        </div>
      )}

      {/* Razorpay Gateway Checkout popup simulator */}
      {showCheckoutModal && selectedInvoice && (
        <div className="fixed inset-0 bg-[#030303]/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-[420px] bg-slate-950 border border-slate-800 text-slate-300 rounded-3xl p-6 shadow-2xl relative space-y-4">
            
            <button
              onClick={() => setShowCheckoutModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg bg-slate-900 hover:bg-slate-850 text-slate-500 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Gateway Brand Header */}
            <div className="flex items-center gap-2.5 border-b border-slate-900 pb-3">
              <div className="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center font-bold text-white text-base shadow shadow-red-500/20">
                R
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">Razorpay Checkout Sandbox</h4>
                <p className="text-[10px] text-red-400">Secure Merchant payment system</p>
              </div>
            </div>

            {/* Merchant detail */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Billing Account:</span>
                <span className="text-white font-medium">RentBuddy Ltd.</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Invoice ID:</span>
                <span className="text-white font-mono">{selectedInvoice.id}</span>
              </div>
              <div className="flex justify-between text-slate-400 text-sm border-t border-slate-900 pt-2">
                <span>Charge Amount:</span>
                <strong className="text-white font-mono text-base">₹{selectedInvoice.totalAmount.toLocaleString()}</strong>
              </div>
            </div>

            {/* Payment selectors */}
            <div className="space-y-2 pt-2.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Choose Payment Method</span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setCheckoutPaymentMethod('UPI')}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    checkoutPaymentMethod === 'UPI' ? 'bg-red-500/10 border-red-500/50 text-red-300 font-semibold' : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  ⚡ UPI AutoPay (Mandate)
                </button>
                <button
                  type="button"
                  onClick={() => setCheckoutPaymentMethod('Card')}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    checkoutPaymentMethod === 'Card' ? 'bg-red-500/10 border-red-500/50 text-red-300 font-semibold' : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  💳 Credit/Debit Card
                </button>
                <button
                  type="button"
                  onClick={() => setCheckoutPaymentMethod('Netbanking')}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    checkoutPaymentMethod === 'Netbanking' ? 'bg-red-500/10 border-red-500/50 text-red-300 font-semibold' : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  🏢 Net Banking
                </button>
                <button
                  type="button"
                  onClick={() => setCheckoutPaymentMethod('AutoDebit')}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    checkoutPaymentMethod === 'AutoDebit' ? 'bg-red-500/10 border-red-500/50 text-red-300 font-semibold' : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  🏦 Bank eMandate
                </button>
              </div>
            </div>

            <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-850 text-[10px] text-slate-500 leading-normal flex items-start gap-2">
              <Info className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <span>
                Simulating AutoPay setup: Accepting this mandate initiates recurring bank auto-debit cycles every 30 days. Sandbox logs attempts in financial auditable logs.
              </span>
            </div>

            <div className="flex gap-3 pt-3">
              <button
                onClick={handlePayInvoice}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl cursor-pointer"
              >
                Simulate Successful Payment
              </button>
              <button
                onClick={() => setShowCheckoutModal(false)}
                className="flex-1 py-2.5 border border-slate-800 text-slate-400 hover:bg-slate-900 rounded-xl font-bold cursor-pointer"
              >
                Abort Gateway
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
