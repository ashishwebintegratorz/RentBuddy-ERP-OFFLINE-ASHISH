import React, { useState } from 'react';
import { useRentBuddyStore } from '../store/rentBuddyStore';
import { getApiBaseUrl } from '../api/client';
import type { RentalOrder, OrderStatus } from '../types';
import {
  Search,
  ChevronRight,
  X
} from 'lucide-react';

export default function OrderManagement() {
  const {
    orders,
    drivers,
    updateOrderStatus,
    refundSecurityDeposit,
    requestOrderReturn,
  } = useRentBuddyStore();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Deposit refund form states
  const [deductions, setDeductions] = useState(0);
  const [refundReason, setRefundReason] = useState('');

  const selectedOrder = orders.find(o => o.id === selectedOrderId);

  // Filter list
  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.id.toLowerCase().includes(search.toLowerCase()) ||
                          o.customerName.toLowerCase().includes(search.toLowerCase()) ||
                          o.customerMobile.includes(search);
    const matchesStatus = statusFilter === 'All' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'Pending':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'Assigned':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'Out for Delivery':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'Delivered':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Return Pickup':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'Returned':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'Completed':
        return 'bg-slate-500/10 text-slate-400 border-slate-700/20';
    }
  };

  // Render pipeline timeline steps
  const renderTimeline = (order: RentalOrder) => {
    const steps = [
      { key: 'Pending', label: 'Order Placed', done: true },
      { key: 'Assigned', label: 'Courier Assigned', done: order.scannedAtLoading || order.status !== 'Pending' },
      { key: 'Out for Delivery', label: 'Out for Delivery', done: order.status === 'Out for Delivery' || order.status === 'Delivered' },
      { key: 'Delivered', label: 'Active Contract', done: order.status === 'Delivered' || order.status === 'Completed' },
    ];

    return (
      <div className="flex items-center justify-between p-3.5 bg-slate-950/40 rounded-2xl border border-slate-900 text-[10px]">
        {steps.map((step, idx) => (
          <React.Fragment key={step.key}>
            <div className="flex items-center gap-2">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold font-mono text-[9px] ${
                step.done ? 'bg-red-600 text-white shadow shadow-red-600/30' : 'bg-slate-800 text-slate-500'
              }`}>
                {idx + 1}
              </span>
              <span className={`font-semibold ${step.done ? 'text-slate-200' : 'text-slate-500'}`}>
                {step.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <ChevronRight className="w-3.5 h-3.5 text-slate-800" />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const handleProcessRefund = () => {
    if (!selectedOrderId) return;
    refundSecurityDeposit(selectedOrderId, deductions, refundReason);
    setDeductions(0);
    setRefundReason('');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 flex gap-6 relative">
      
      {/* List Panel */}
      <div className="flex-1 space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-4 rounded-2xl">
          <div className="relative w-64 text-xs">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by order ID, customer name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-full rounded-xl py-2 bg-slate-900/40"
            />
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl text-xs py-2 px-3 bg-slate-900/40 border border-slate-800"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending Scan</option>
              <option value="Assigned">Assigned Logistics</option>
              <option value="Out for Delivery">Out for Delivery</option>
              <option value="Delivered">Delivered (Active)</option>
              <option value="Return Pickup">Return Pickup</option>
              <option value="Returned">Returned</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>

        {/* Directory */}
        <div className="glass-panel rounded-2xl overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/40 text-slate-400 border-b border-slate-800/80">
                <th className="p-4 font-bold uppercase tracking-wider">Order ID / Customer</th>
                <th className="p-4 font-bold uppercase tracking-wider">Rented Items</th>
                <th className="p-4 font-bold uppercase tracking-wider">Durations</th>
                <th className="p-4 font-bold uppercase tracking-wider">Billing (Rent/Dep)</th>
                <th className="p-4 font-bold uppercase tracking-wider">Status</th>
                <th className="p-4 font-bold uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredOrders.map(o => (
                <tr
                  key={o.id}
                  onClick={() => setSelectedOrderId(o.id)}
                  className={`hover:bg-slate-800/15 cursor-pointer transition-colors ${
                    selectedOrderId === o.id ? 'bg-red-900/5' : ''
                  }`}
                >
                  <td className="p-4">
                    <div>
                      <div className="font-bold text-white text-sm">{o.id}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">{o.customerName} | {o.customerMobile}</div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="font-semibold text-slate-200">
                      {o.items.map(i => i.category).join(', ')}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono block mt-0.5">({o.items.length} assets)</span>
                  </td>
                  <td className="p-4 font-mono text-slate-300">
                    <div>{o.durationMonths} Months</div>
                    <div className="text-[9px] text-slate-500">Exp: {o.endDate}</div>
                  </td>
                  <td className="p-4">
                    <div className="text-slate-200">Rent: ₹{o.netMonthlyRent}/mo</div>
                    <div className="text-[10px] text-slate-500">Deposit: ₹{o.totalDeposit}</div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusColor(o.status)}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedOrderId(o.id);
                      }}
                      className="text-red-400 hover:text-red-300 font-semibold text-[11px]"
                    >
                      Track Order
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over tracking panel */}
      {selectedOrderId && selectedOrder && (
        <div className="w-[380px] glass-panel border border-slate-800/90 rounded-2xl p-5 space-y-5 flex-shrink-0 animate-fade-in max-h-[85vh] overflow-y-auto z-10 text-xs text-slate-300">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-white text-sm">Agreement Tracking & Audits</h3>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">{selectedOrder.id}</p>
            </div>
            <button
              onClick={() => setSelectedOrderId(null)}
              className="p-1 rounded bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Timeline */}
          <div className="space-y-2">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Fulfillment Timeline</span>
            {renderTimeline(selectedOrder)}
          </div>

          {/* Contract Details */}
          <div className="space-y-2.5 bg-slate-950/40 p-3.5 rounded-xl border border-slate-900">
            <h4 className="font-bold text-slate-200 text-sm">Agreement Terms</h4>
            <div className="space-y-1.5 font-mono text-[11px]">
              <div className="flex justify-between"><span>Tenant:</span> <span className="text-slate-300">{selectedOrder.customerName}</span></div>
              <div className="flex justify-between"><span>Mobile:</span> <span className="text-slate-300">{selectedOrder.customerMobile}</span></div>
              <div className="flex justify-between"><span>Start Date:</span> <span className="text-slate-300">{selectedOrder.startDate}</span></div>
              <div className="flex justify-between"><span>Term Period:</span> <span className="text-slate-300">{selectedOrder.durationMonths} months</span></div>
              <div className="flex justify-between"><span>Monthly Rent:</span> <span className="text-emerald-400 font-bold">₹{selectedOrder.netMonthlyRent}</span></div>
              <div className="flex justify-between"><span>Held Deposit:</span> <span className="text-red-400 font-bold">₹{selectedOrder.totalDeposit}</span></div>
            </div>
          </div>

          {/* Items checklist */}
          <div className="space-y-2">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Agreed furniture units ({selectedOrder.items.length})</span>
            <div className="space-y-1.5">
              {selectedOrder.items.map((item, i) => (
                <div key={i} className="p-2 rounded bg-slate-900/30 border border-slate-800/40 flex justify-between">
                  <span>{item.category}</span>
                  <span className="font-mono text-[10px] text-slate-400">{item.assetId}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Deposit workflow checks */}
          <div className="space-y-3.5 p-4 rounded-2xl bg-red-900/10 border border-red-500/20">
            <h5 className="font-bold text-red-300 uppercase tracking-wider text-[9px] flex justify-between">
              <span>Security Deposit Status</span>
              <span>{selectedOrder.depositRefundStatus}</span>
            </h5>

            {selectedOrder.depositRefundStatus === 'Pending Inspection' && (
              <div className="space-y-3 pt-2">
                <div className="p-2 bg-slate-950/40 rounded border border-slate-800 text-[10px] text-slate-400">
                  ⚠️ <strong>Deduction Guard</strong>: If assets were damaged during quality inspections (Minor/Major repair state), enter appropriate repair charges as deduction before releasing.
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="space-y-1">
                    <label className="text-slate-400">Deduction (₹)</label>
                    <input
                      type="number"
                      value={deductions || ''}
                      onChange={(e) => setDeductions(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-850 rounded px-2 py-1 text-xs"
                      placeholder="Deductions"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-400">Reason</label>
                    <input
                      type="text"
                      value={refundReason}
                      onChange={(e) => setRefundReason(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded px-2 py-1 text-xs"
                      placeholder="e.g. Scratches"
                    />
                  </div>
                </div>

                <button
                  onClick={handleProcessRefund}
                  className="w-full py-1.5 bg-red-600 hover:bg-red-500 rounded text-[10px] font-bold text-white cursor-pointer"
                >
                  Approve & Process Refund
                </button>
              </div>
            )}

            {selectedOrder.depositRefundStatus === 'Refunded' && (
              <div className="text-[11px] text-emerald-400 font-mono">
                ✓ Refund processed. Deductions: ₹{selectedOrder.depositDeductions}. Net refunded: ₹{selectedOrder.totalDeposit - selectedOrder.depositDeductions}
              </div>
            )}
            
            {selectedOrder.depositRefundStatus === 'Held' && selectedOrder.status === 'Delivered' && (
              <button
                onClick={() => requestOrderReturn(selectedOrder.id)}
                className="w-full py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white rounded border border-slate-800 font-bold text-[10px] cursor-pointer"
              >
                File Return Request
              </button>
            )}
          </div>

          {/* Assign Driver */}
          <div className="space-y-2 pt-3 border-t border-slate-800">
            <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Assign Delivery Driver / Rider</label>
            <select
              value={selectedOrder.assignedLogisticsUser || ''}
              onChange={(e) => {
                const driverName = e.target.value;
                const driverObj = drivers.find(d => d.fullName === driverName || d.id === driverName);
                if (driverObj) {
                  updateOrderStatus(selectedOrder.id, 'Assigned');
                  // update backend assignment
                  fetch(`${getApiBaseUrl()}/orders/${selectedOrder.id}/assign-driver`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ driverId: driverObj.id })
                  }).catch(err => console.error('Error assigning driver:', err));
                }
              }}
              className="w-full text-[11px] py-1.5 px-2.5 bg-slate-950 border border-slate-850 rounded text-cyan-300 font-semibold"
            >
              <option value="">-- Select Active Rider --</option>
              {drivers.filter(d => !d.isBlocked).map(d => (
                <option key={d.id} value={d.fullName}>{d.fullName} ({d.phone}) - {d.city}</option>
              ))}
            </select>
          </div>

          {/* Quick status controls */}
          <div className="space-y-2 pt-3 border-t border-slate-800">
            <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Modify Order Pipeline Status</label>
            <select
              value={selectedOrder.status}
              onChange={(e) => updateOrderStatus(selectedOrder.id, e.target.value as OrderStatus)}
              className="w-full text-[11px] py-1.5 px-2.5 bg-slate-950 border border-slate-850 rounded"
            >
              <option value="Pending">Pending Scan</option>
              <option value="Assigned">Assigned Logistics</option>
              <option value="Out for Delivery">Out for Delivery</option>
              <option value="Delivered">Delivered</option>
              <option value="Return Pickup">Return Pickup</option>
              <option value="Returned">Returned</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

        </div>
      )}

    </div>
  );
}
