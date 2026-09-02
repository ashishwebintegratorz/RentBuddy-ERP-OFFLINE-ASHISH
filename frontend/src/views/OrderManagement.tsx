import React, { useState } from 'react';
import { useRentBuddyStore } from '../store/rentBuddyStore';
import { getApiBaseUrl } from '../api/client';
import { matchCityContext } from '../utils/cityUtils';
import type { RentalOrder, OrderStatus } from '../types';
import {
  Search,
  ChevronRight,
  X,
  MapPin,
  Eye,
  User,
  Phone,
  Package,
  Calendar,
  DollarSign,
  Truck,
  ShieldCheck,
  CheckCircle2,
  Printer,
  Clock,
  Building,
  Tag,
  AlertCircle,
  Check,
  ExternalLink,
  Layers,
  RotateCcw
} from 'lucide-react';

export default function OrderManagement() {
  const {
    orders,
    drivers,
    currentCity,
    updateOrderStatus,
    refundSecurityDeposit,
    requestOrderReturn,
  } = useRentBuddyStore();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [selectedCityFilter, setSelectedCityFilter] = useState<string>('All');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Deposit refund form states
  const [deductions, setDeductions] = useState(0);
  const [refundReason, setRefundReason] = useState('');

  const selectedOrder = orders.find(o => o.id === selectedOrderId);

  // Filter list by Search, Status, and City Context
  const filteredOrders = orders.filter(o => {
    const effectiveCity = o.city || (
      (o.customerName || '').toLowerCase().includes('rahul') ? 'Indore (Head Office)' :
      (o.customerName || '').toLowerCase().includes('priya') ? 'Surat' :
      (o.customerName || '').toLowerCase().includes('amitabh') ? 'Bhopal' :
      (o.customerName || '').toLowerCase().includes('ananya') ? 'Ahmedabad' : 'Indore'
    );

    const matchesSearch = 
      (o.id || '').toLowerCase().includes(search.toLowerCase()) ||
      (o.customerName || '').toLowerCase().includes(search.toLowerCase()) ||
      (o.customerMobile || '').includes(search) ||
      effectiveCity.toLowerCase().includes(search.toLowerCase()) ||
      (o.deliveryAddress || '').toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'All' || o.status === statusFilter;
    
    const matchesCity = selectedCityFilter === 'All' 
      ? (currentCity === 'All Cities (Global View)' || currentCity === 'All' ? true : matchCityContext(effectiveCity, currentCity))
      : matchCityContext(effectiveCity, selectedCityFilter);

    return matchesSearch && matchesStatus && matchesCity;
  });

  const getStatusColor = (status: OrderStatus | string) => {
    switch ((status || '').toLowerCase()) {
      case 'pending':
      case 'ready for dispatch':
      case 'ready_for_dispatch':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'assigned':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'out for delivery':
      case 'in_transit':
      case 'out_for_delivery':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'delivered':
      case 'confirmed':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'return pickup':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'returned':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'completed':
        return 'bg-slate-500/10 text-slate-400 border-slate-700/20';
      case 'cancelled':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-slate-500/10 text-slate-300 border-slate-700/20';
    }
  };

  const getCityHubBadge = (city?: string, customerName?: string) => {
    let cityName = city;
    if (!cityName && customerName) {
      if (customerName.toLowerCase().includes('rahul')) cityName = 'Indore (Head Office)';
      else if (customerName.toLowerCase().includes('priya')) cityName = 'Surat';
      else if (customerName.toLowerCase().includes('amitabh')) cityName = 'Bhopal';
      else if (customerName.toLowerCase().includes('ananya')) cityName = 'Ahmedabad';
    }
    cityName = cityName || currentCity || 'Indore';
    const cleanCity = cityName.replace(/\(.*?\)/g, '').trim();
    return `${cleanCity} Hub`;
  };

  // Render pipeline timeline steps
  const renderTimeline = (order: RentalOrder) => {
    const isDelivered = (order.status || '').toLowerCase() === 'delivered' || Boolean(order.deliveryProofPhoto);
    const isInTransit = (order.status || '').toLowerCase() === 'out for delivery' || Boolean(order.assignedDriverId);
    const isAssigned = Boolean(order.assignedDriverId) || order.isPrepared || isInTransit || isDelivered;

    const steps = [
      { key: 'Pending', label: 'Order Placed', done: true },
      { key: 'Assigned', label: 'Staged & Rider Assigned', done: isAssigned },
      { key: 'Out for Delivery', label: 'Out for Delivery', done: isInTransit || isDelivered },
      { key: 'Delivered', label: 'Doorstep Delivered (Active)', done: isDelivered },
    ];

    return (
      <div className="flex items-center justify-between p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800 text-[10px]">
        {steps.map((step, idx) => (
          <React.Fragment key={step.key}>
            <div className="flex items-center gap-2">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold font-mono text-[9px] ${
                step.done ? 'bg-red-600 text-white shadow shadow-red-600/30' : 'bg-slate-800 text-slate-500'
              }`}>
                {step.done ? '✓' : idx + 1}
              </span>
              <span className={`font-semibold ${step.done ? 'text-slate-200' : 'text-slate-500'}`}>
                {step.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <ChevronRight className="w-3.5 h-3.5 text-slate-700" />
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
      
      {/* Main Order Directory Panel */}
      <div className="flex-1 space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-4 rounded-2xl border border-slate-700/80 bg-slate-900/90 shadow-xl">
          <div className="relative flex-1 max-w-md text-xs">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by order ID, customer name, mobile, location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-full rounded-xl py-2 bg-slate-950/80 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl text-xs py-2 px-3 bg-slate-950/80 border border-slate-800 text-slate-300 focus:outline-none focus:border-red-500 cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending Scan</option>
              <option value="Assigned">Assigned Logistics</option>
              <option value="Out for Delivery">Out for Delivery</option>
              <option value="Delivered">Delivered (Active)</option>
              <option value="Return Pickup">Return Pickup</option>
              <option value="Returned">Returned</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Directory Table */}
        <div className="glass-panel rounded-2xl overflow-hidden border border-slate-700/80 bg-slate-900/90 shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                  <th className="p-4 font-bold uppercase tracking-wider">Order ID / Customer</th>
                  <th className="p-4 font-bold uppercase tracking-wider">Location / Hub</th>
                  <th className="p-4 font-bold uppercase tracking-wider">Rented Items</th>
                  <th className="p-4 font-bold uppercase tracking-wider">Durations</th>
                  <th className="p-4 font-bold uppercase tracking-wider">Billing (Rent/Dep)</th>
                  <th className="p-4 font-bold uppercase tracking-wider">Status</th>
                  <th className="p-4 font-bold uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-400">
                      <Package className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                      No rental orders found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map(o => (
                    <tr
                      key={o.id}
                      onClick={() => setSelectedOrderId(o.id)}
                      className={`hover:bg-slate-800/25 cursor-pointer transition-colors ${
                        selectedOrderId === o.id ? 'bg-red-900/10' : ''
                      }`}
                    >
                      {/* 1. ORDER ID / CUSTOMER */}
                      <td className="p-4">
                        <div>
                          <div className="font-bold text-white text-sm">{o.id}</div>
                          <div className="text-[11px] text-slate-300 font-semibold mt-0.5">{o.customerName}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{o.customerMobile}</div>
                        </div>
                      </td>

                      {/* 2. LOCATION / HUB (NEW COLUMN) */}
                      <td className="p-4">
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/25 shadow-xs">
                            <MapPin className="w-3 h-3 text-red-400 shrink-0" />
                            <span>{getCityHubBadge(o.city, o.customerName)}</span>
                          </span>
                          <div className="text-[10px] text-slate-400 truncate max-w-[170px]" title={o.deliveryAddress || `${o.city || 'Indore'} Central`}>
                            {o.deliveryAddress || `${o.city || 'Indore'} Area`}
                          </div>
                        </div>
                      </td>

                      {/* 3. RENTED ITEMS */}
                      <td className="p-4">
                        <span className="font-semibold text-slate-200 block">
                          {(o.items || []).map(i => (i as any).name || i.category || 'Asset').join(', ') || 'Solid Wood Furniture'}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono block mt-0.5">({(o.items || []).length} assets)</span>
                      </td>

                      {/* 4. DURATIONS */}
                      <td className="p-4 font-mono text-slate-300">
                        <div>{o.durationMonths || 3} Months</div>
                        <div className="text-[9px] text-slate-500">Exp: {o.endDate || 'Active'}</div>
                      </td>

                      {/* 5. BILLING */}
                      <td className="p-4">
                        <div className="text-slate-200 font-semibold">Rent: ₹{o.netMonthlyRent || o.totalMonthlyRent || 0}/mo</div>
                        <div className="text-[10px] text-slate-400">Deposit: ₹{(o.totalDeposit || 0).toLocaleString()}</div>
                      </td>

                      {/* 6. STATUS */}
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getStatusColor(o.status)}`}>
                          {o.status}
                        </span>
                      </td>

                      {/* 7. ACTIONS (VIEW DETAIL BUTTON) */}
                      <td className="p-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrderId(o.id);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-red-600 text-slate-200 hover:text-white border border-slate-700 hover:border-red-500 font-bold text-xs transition-all shadow-sm cursor-pointer hover:scale-105 active:scale-95"
                        >
                          <Eye className="w-3.5 h-3.5 text-red-400 group-hover:text-white" />
                          <span>View Detail</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Comprehensive Order Details Modal / Card Overlay */}
      {selectedOrderId && selectedOrder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-2xl bg-slate-900 text-slate-100 rounded-3xl p-6 shadow-2xl border border-slate-700/80 flex flex-col max-h-[90vh] overflow-hidden relative">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400 shadow-inner">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-lg text-white">Rental Agreement & Dossier</h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getStatusColor(selectedOrder.status)}`}>
                      {selectedOrder.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">Order Ref: {selectedOrder.id}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedOrderId(null)}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="overflow-y-auto pr-1 py-4 space-y-5 flex-1 text-xs">
              
              {/* Timeline */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Fulfillment Lifecycle</span>
                {renderTimeline(selectedOrder)}
              </div>

              {/* Grid: Customer Info & Location Dossier */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* 1. Customer Details */}
                <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-slate-200 font-bold border-b border-slate-800/60 pb-2">
                    <User className="w-4 h-4 text-red-400" />
                    <span>Customer Profile</span>
                  </div>
                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Name:</span>
                      <span className="font-bold text-white">{selectedOrder.customerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Mobile:</span>
                      <span className="font-mono text-cyan-300">{selectedOrder.customerMobile}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">KYC Verification:</span>
                      <span className="font-bold text-emerald-400 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" /> Verified
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Location & Hub Depot */}
                <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-slate-200 font-bold border-b border-slate-800/60 pb-2">
                    <MapPin className="w-4 h-4 text-red-400" />
                    <span>Location & Hub Depot</span>
                  </div>
                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Registered Hub:</span>
                      <span className="font-bold text-red-400">{getCityHubBadge(selectedOrder.city, selectedOrder.customerName)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Hub Central Depot:</span>
                      <span className="text-slate-300">{selectedOrder.city || 'Indore'} Central Depot</span>
                    </div>
                    <div className="flex flex-col pt-0.5">
                      <span className="text-slate-500">Doorstep Address:</span>
                      <span className="text-slate-200 font-medium leading-relaxed mt-0.5">
                        {selectedOrder.deliveryAddress || `${selectedOrder.city || 'Indore'} Area, Destination`}
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Rented Furniture Units */}
              <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                  <div className="flex items-center gap-2 text-slate-200 font-bold">
                    <Package className="w-4 h-4 text-red-400" />
                    <span>Allocated Furniture & Assets ({(selectedOrder.items || []).length})</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Consignment Units</span>
                </div>

                <div className="space-y-2">
                  {(selectedOrder.items || []).map((item, i) => (
                    <div key={i} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center text-red-400 font-black shrink-0">
                          {i + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-white truncate">{(item as any).name || (item as any).title || item.category || 'Solid Wood Furniture Unit'}</div>
                          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2">
                            <span>ID: {item.assetId || (item as any).id || `AST-${i+1}`}</span>
                            {(item as any).barcode && <span>• Barcode: {(item as any).barcode}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="text-right font-mono shrink-0">
                        <div className="font-bold text-emerald-400">₹{item.monthlyRentalPrice || (item as any).monthlyRent || selectedOrder.netMonthlyRent || 550}/mo</div>
                        <div className="text-[10px] text-slate-500">Qty: {(item as any).quantity || 1}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial & Billing Breakdown */}
              <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-2.5">
                <div className="flex items-center gap-2 text-slate-200 font-bold border-b border-slate-800/60 pb-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  <span>Financial & Contract Billing Terms</span>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-[11px] pt-1">
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 block">Contract Duration</span>
                    <span className="text-sm font-bold text-white">{selectedOrder.durationMonths || 3} Months</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 block">Monthly Rent Rate</span>
                    <span className="text-sm font-bold text-emerald-400">₹{selectedOrder.netMonthlyRent || selectedOrder.totalMonthlyRent || 0}/mo</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 block">Held Security Deposit</span>
                    <span className="text-sm font-bold text-cyan-300">₹{(selectedOrder.totalDeposit || 0).toLocaleString()}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 block">Total Tenure Rent</span>
                    <span className="text-sm font-bold text-white font-mono">
                      ₹{((selectedOrder.netMonthlyRent || selectedOrder.totalMonthlyRent || 0) * (selectedOrder.durationMonths || 3) - (selectedOrder.discountAmount || 0)).toLocaleString()}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 sm:col-span-2">
                    <span className="text-[10px] text-slate-500 block">Total Initial Payment</span>
                    <span className="text-sm font-bold text-red-400 font-mono">
                      ₹{((selectedOrder.totalDeposit || 0) + ((selectedOrder.netMonthlyRent || selectedOrder.totalMonthlyRent || 0) * (selectedOrder.durationMonths || 3) - (selectedOrder.discountAmount || 0))).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Logistics & Proof of Delivery Details */}
              <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-2.5">
                <div className="flex items-center gap-2 text-slate-200 font-bold border-b border-slate-800/60 pb-2">
                  <Truck className="w-4 h-4 text-cyan-400" />
                  <span>Logistics & Dispatch Information</span>
                </div>

                <div className="space-y-2 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Warehouse Staging:</span>
                    <span className="font-semibold text-slate-200">
                      {selectedOrder.isPrepared ? `✓ Packaged by ${selectedOrder.packedBy || 'Warehouse Team'}` : 'Pending Preparation'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Assigned Delivery Rider:</span>
                    <span className="font-bold text-cyan-300">
                      {selectedOrder.assignedDriverName || selectedOrder.assignedLogisticsUser || 'Not Assigned Yet'}
                      {selectedOrder.assignedDriverPhone ? ` (${selectedOrder.assignedDriverPhone})` : ''}
                    </span>
                  </div>
                  {selectedOrder.deliveredAt && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Delivered At:</span>
                      <span className="font-mono text-emerald-400">{selectedOrder.deliveredAt}</span>
                    </div>
                  )}

                  {/* Delivery Proof Photo Preview if available */}
                  {selectedOrder.deliveryProofPhoto && (
                    <div className="pt-2 border-t border-slate-800/60">
                      <span className="text-slate-400 font-semibold block mb-1.5 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Proof of Delivery (POD Photo Attached):
                      </span>
                      <div className="w-32 h-32 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shadow-md">
                        <img 
                          src={selectedOrder.deliveryProofPhoto} 
                          alt="Delivery Proof" 
                          className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                          onClick={() => window.open(selectedOrder.deliveryProofPhoto, '_blank')}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Security Deposit Refund Workflow */}
              <div className="p-4 rounded-2xl bg-red-950/20 border border-red-500/20 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-red-300 uppercase tracking-wider text-[10px]">
                    Security Deposit Workflow
                  </h5>
                  <span className="font-bold text-xs text-white">Status: {selectedOrder.depositRefundStatus || 'Held'}</span>
                </div>

                {selectedOrder.depositRefundStatus === 'Pending Inspection' && (
                  <div className="space-y-3 pt-2">
                    <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800 text-[10px] text-slate-400">
                      ⚠️ <strong>Deduction Guard</strong>: Enter repair/cleaning deductions if furniture sustained damages.
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="space-y-1">
                        <label className="text-slate-400">Deduction (₹)</label>
                        <input
                          type="number"
                          value={deductions || ''}
                          onChange={(e) => setDeductions(Number(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                          placeholder="Deductions"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-slate-400">Reason</label>
                        <input
                          type="text"
                          value={refundReason}
                          onChange={(e) => setRefundReason(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                          placeholder="e.g. Scratches"
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleProcessRefund}
                      className="w-full py-2 bg-red-600 hover:bg-red-500 rounded-xl text-xs font-bold text-white cursor-pointer shadow-md"
                    >
                      Approve & Process Refund
                    </button>
                  </div>
                )}

                {selectedOrder.depositRefundStatus === 'Refunded' && (
                  <div className="text-[11px] text-emerald-400 font-mono bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
                    ✓ Security deposit refunded. Deductions: ₹{selectedOrder.depositDeductions || 0}. Net refunded: ₹{(selectedOrder.totalDeposit || 0) - (selectedOrder.depositDeductions || 0)}
                  </div>
                )}
              </div>

            </div>

            {/* Modal Footer Controls */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
              <button
                onClick={() => window.print()}
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold flex items-center gap-2 cursor-pointer shadow-md text-xs transition-colors"
              >
                <Printer className="w-4 h-4 text-red-400" />
                <span>Print Agreement</span>
              </button>

              <button
                onClick={() => setSelectedOrderId(null)}
                className="py-2.5 px-6 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold cursor-pointer shadow-lg shadow-red-600/30 text-xs transition-colors"
              >
                Done
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
