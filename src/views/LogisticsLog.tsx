import React, { useState, useEffect } from 'react';
import { useRentBuddyStore } from '../store/rentBuddyStore';
import { LogisticsDriver, OrderStatus, RentalOrder } from '../types';
import BarcodeStickerModal from '../components/BarcodeStickerModal';
import { getApiBaseUrl } from '../api/client';
import {
  Truck,
  User,
  MapPin,
  ChevronRight,
  X,
  Phone,
  CheckCircle2,
  Clock,
  Navigation,
  Send,
  Package,
  ShieldCheck,
  AlertCircle,
  Building,
  Calendar,
  Check,
  ArrowRight,
  Smartphone,
  Eye,
  Star,
  ExternalLink,
  MessageSquare,
  Camera,
  Timer,
  FileCheck,
  Tag,
  Printer,
  Boxes,
  RotateCcw,
  Sparkles
} from 'lucide-react';

export default function LogisticsLog() {
  const {
    orders,
    drivers,
    inventory,
    currentCity,
    cities,
    assignDriverToOrder,
    updateOrderStatus,
    cancelOrder
  } = useRentBuddyStore();

  const [selectedCity, setSelectedCity] = useState<string>('All');
  const [activeTab, setActiveTab] = useState<'preparation' | 'dispatch' | 'transit' | 'completed' | 'returns' | 'cancelled'>('preparation');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  
  // Real-time background sync with backend MongoDB orders every 2.5 seconds
  useEffect(() => {
    let isMounted = true;
    const syncBackendOrders = async () => {
      try {
        const BACKEND_BASE = getApiBaseUrl();
        const res = await fetch(`${BACKEND_BASE}/orders`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && isMounted) {
          const currentStoreOrders = useRentBuddyStore.getState().orders;
          const serverOrderIds = new Set(json.data.map((s: any) => s.id || s._id));

          // 1. Keep local orders that are newly created
          const localOnly = currentStoreOrders.filter(l => !serverOrderIds.has(l.id));

          // 2. Map server orders, preserving local updates like isPrepared
          const serverMerged = json.data.map((serverOrd: any) => {
            const localOrd = currentStoreOrders.find(l => l.id === serverOrd.id || l.id === serverOrd._id);
            const isOrderPrepared = serverOrd.isPrepared ?? localOrd?.isPrepared ?? (
              serverOrd.status === 'READY_FOR_DISPATCH' || 
              serverOrd.status === 'Ready for Dispatch' || 
              Boolean(serverOrd.preparedAt)
            );

            return {
              ...(localOrd || {}),
              ...serverOrd,
              id: serverOrd.id || serverOrd._id,
              items: serverOrd.items || localOrd?.items || [],
              customerName: serverOrd.customerName || localOrd?.customerName,
              customerMobile: serverOrd.customerMobile || localOrd?.customerMobile,
              deliveryAddress: serverOrd.deliveryAddress || localOrd?.deliveryAddress,
              city: serverOrd.city || localOrd?.city || currentCity,
              status: (serverOrd.status || localOrd?.status || 'Pending') as OrderStatus,
              deliveryStatus: serverOrd.deliveryStatus || localOrd?.deliveryStatus,
              isPrepared: isOrderPrepared,
              preparedAt: serverOrd.preparedAt || localOrd?.preparedAt,
              packedBy: serverOrd.packedBy || localOrd?.packedBy,
              assignedDriverId: serverOrd.assignedDriverId || localOrd?.assignedDriverId,
              assignedDriverName: serverOrd.assignedDriverName || localOrd?.assignedDriverName,
              assignedDriverPhone: serverOrd.assignedDriverPhone || localOrd?.assignedDriverPhone,
              scannedAtLoading: serverOrd.scannedAtLoading ?? localOrd?.scannedAtLoading ?? false,
              scannedAtDelivery: serverOrd.scannedAtDelivery ?? localOrd?.scannedAtDelivery ?? false,
              deliveryProofPhoto: serverOrd.deliveryProofPhoto || serverOrd.deliveryProof?.photos?.[0] || localOrd?.deliveryProofPhoto,
              deliveredAt: serverOrd.deliveredAt || localOrd?.deliveredAt
            };
          });

          useRentBuddyStore.setState({ orders: [...localOnly, ...serverMerged] });
        }
      } catch (_) {}
    };

    syncBackendOrders();
    const interval = setInterval(syncBackendOrders, 2500);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Cancel Order Modal State
  const [cancellingOrder, setCancellingOrder] = useState<RentalOrder | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('Customer cancelled order before dispatch');
  const [isCancelling, setIsCancelling] = useState(false);

  // Assign Driver Modal State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [orderToAssign, setOrderToAssign] = useState<RentalOrder | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [deliveryNotes, setDeliveryNotes] = useState<string>('');
  const [deliveryPriority, setDeliveryPriority] = useState<'Standard' | 'Urgent' | 'Same-Day'>('Standard');
  const [deliveryDeadline, setDeliveryDeadline] = useState<string>('Today, 5:00 PM');
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignSuccessMessage, setAssignSuccessMessage] = useState<string | null>(null);

  // Photo POD Preview Modal State
  const [previewPhotoOrder, setPreviewPhotoOrder] = useState<RentalOrder | null>(null);

  // Barcode / Label Sticker Print Modal
  const [stickerAssetForPrint, setStickerAssetForPrint] = useState<{
    id: string;
    barcode: string;
    brand?: string;
    model?: string;
    category?: string;
    warehouse?: string;
    rackNumber?: string;
    orderId?: string;
    customerName?: string;
    customerMobile?: string;
    deliveryAddress?: string;
    city?: string;
    durationMonths?: number;
    monthlyRent?: number;
    depositPaid?: number;
    startDate?: string;
  } | null>(null);

  // Filter orders by city
  const cityFilteredOrders = orders.filter(o => {
    if (selectedCity === 'All') return true;
    return (o.city || currentCity).toLowerCase().includes(selectedCity.toLowerCase());
  });

  // Stage classification helpers with robust case-insensitivity
  const isCancelled = (o: RentalOrder) => 
    (o.status || '').toLowerCase() === 'cancelled' || (o.deliveryStatus || '').toLowerCase() === 'cancelled';

  const isDelivered = (o: RentalOrder) => 
    !isCancelled(o) && (
      (o.status || '').toLowerCase() === 'delivered' || 
      (o.status || '').toLowerCase() === 'completed' || 
      (o.deliveryStatus || '').toLowerCase() === 'delivered' || 
      (o.deliveryStatus || '').toLowerCase() === 'completed' ||
      Boolean(o.deliveryProofPhoto)
    );

  const isReturn = (o: RentalOrder) => 
    !isCancelled(o) && ((o.status || '').toLowerCase() === 'return pickup' || (o.status || '').toLowerCase() === 'returned');

  const isInTransit = (o: RentalOrder) => 
    !isCancelled(o) && !isDelivered(o) && !isReturn(o) && (
      Boolean(o.assignedDriverId) || 
      Boolean(o.assignedDriverPhone) ||
      (o.status || '').toLowerCase() === 'assigned' || 
      (o.status || '').toLowerCase() === 'out for delivery' ||
      (o.status || '').toLowerCase() === 'in_transit' ||
      (o.status || '').toLowerCase() === 'out_for_delivery' ||
      o.scannedAtLoading
    );

  const isReadyForDispatch = (o: RentalOrder) => 
    !isCancelled(o) && !isDelivered(o) && !isReturn(o) && !isInTransit(o) && (
      o.isPrepared || 
      (o.status || '').toLowerCase() === 'ready for dispatch' || 
      (o.status || '').toLowerCase() === 'ready_for_dispatch'
    );

  const isPreparation = (o: RentalOrder) => 
    !isCancelled(o) && !isDelivered(o) && !isReturn(o) && !isInTransit(o) && !isReadyForDispatch(o);

  // Pipeline order lists
  const preparationOrders = cityFilteredOrders.filter(isPreparation);
  const readyForDispatchOrders = cityFilteredOrders.filter(isReadyForDispatch);
  const inTransitOrders = cityFilteredOrders.filter(isInTransit);
  const completedOrders = cityFilteredOrders.filter(isDelivered);
  const returnOrders = cityFilteredOrders.filter(isReturn);
  const cancelledOrders = cityFilteredOrders.filter(isCancelled);

  // Filter drivers for selected city view banner
  const cityDrivers = drivers.filter(d => {
    if (selectedCity === 'All') return !d.isBlocked;
    return !d.isBlocked && (d.city || currentCity).toLowerCase().includes(selectedCity.toLowerCase());
  });

  // Helper to extract base city name (e.g. "Indore" from "Indore (Head Office)")
  const getBaseCity = (cityName?: string) => {
    if (!cityName) return '';
    return cityName.split('(')[0].trim().toLowerCase();
  };

  // Get eligible drivers strictly for the specific order being assigned
  const getEligibleDriversForOrder = (order: RentalOrder | null) => {
    if (!order) return [];
    const targetCity = getBaseCity(order.city || currentCity);
    return drivers.filter(d => {
      if (d.isBlocked) return false;
      const driverCity = getBaseCity(d.city || currentCity);
      // Strict matching: driver must be in the same city as the order
      return driverCity === targetCity || driverCity.includes(targetCity) || targetCity.includes(driverCity);
    });
  };

  // Handle Mark Order as Packed & Ready for Dispatch
  const handleMarkAsPrepared = async (order: RentalOrder) => {
    const storeState = useRentBuddyStore.getState() as any;
    
    // 1. Update locally in store immediately
    const currentOrders = useRentBuddyStore.getState().orders;
    const updatedOrders = currentOrders.map(o => {
      if (o.id === order.id || o.id === (order as any)._id) {
        return {
          ...o,
          isPrepared: true,
          status: 'Ready for Dispatch' as OrderStatus,
          deliveryStatus: 'ready_for_dispatch',
          preparedAt: new Date().toISOString(),
          packedBy: 'Warehouse Staging Team'
        };
      }
      return o;
    });

    useRentBuddyStore.setState({ orders: updatedOrders });

    // 2. Call backend API on port 5001
    try {
      const BACKEND_BASE = getApiBaseUrl();
      await fetch(`${BACKEND_BASE}/orders/${order.id}/prepare`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packedBy: 'Warehouse Staging Team' })
      });
    } catch (err) {
      console.warn("Backend prepare order sync deferred:", err);
    }

    // Automatically transition to Stage 2: Rider Assignment & Dispatch
    setActiveTab('dispatch');

    if (storeState.playNotificationSound) {
      storeState.playNotificationSound();
    }
  };

  const handleOpenAssignModal = (order: RentalOrder) => {
    setOrderToAssign(order);
    const eligibleDrivers = getEligibleDriversForOrder(order);
    const availableDriver = eligibleDrivers.find(d => !d.isBlocked);
    setSelectedDriverId(availableDriver ? availableDriver.id : '');
    setDeliveryNotes('');
    setDeliveryDeadline('Today, 5:00 PM');
    setShowAssignModal(true);
  };

  const handleConfirmAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderToAssign || !selectedDriverId) return;

    setIsAssigning(true);
    const assigned = await assignDriverToOrder(orderToAssign.id, selectedDriverId);
    setIsAssigning(false);

    if (assigned) {
      const driver = drivers.find(d => d.id === selectedDriverId);
      setAssignSuccessMessage(`✓ Dispatched Order ${orderToAssign.id} to ${driver?.fullName || 'Rider'} (${driver?.city || orderToAssign.city})! Mobile app notified.`);
      setTimeout(() => {
        setAssignSuccessMessage(null);
        setShowAssignModal(false);
        setOrderToAssign(null);
        setActiveTab('transit');
      }, 1500);
    }
  };

  const handlePrintConsignmentLabel = (order: RentalOrder) => {
    const custFirst = (order.customerName || 'CUST').trim().split(' ')[0].replace(/[^a-zA-Z]/g, '').toUpperCase() || 'CUST';
    const cleanOrd = (order.id || '647641').replace(/[^0-9]/g, '') || '647641';
    const consignmentBarcode = `RB-${custFirst}-${cleanOrd}`;

    setStickerAssetForPrint({
      id: order.id,
      barcode: consignmentBarcode,
      brand: 'RentBuddy Furniture Consignment',
      model: `${order.items?.length || 1} Furniture Units (${(order.items || []).map((i: any) => i.name || i.category || 'Asset').join(', ') || 'Solid Wood Furniture'})`,
      category: 'Living Room & Bedroom Furniture',
      warehouse: `${order.city || currentCity} Central Depot`,
      rackNumber: 'A-01',
      orderId: order.id,
      customerName: order.customerName,
      customerMobile: order.customerMobile,
      deliveryAddress: order.deliveryAddress,
      city: order.city || currentCity,
      durationMonths: order.durationMonths || 6,
      monthlyRent: order.netMonthlyRent || order.totalMonthlyRent || 2500,
      depositPaid: order.totalDeposit || 4000,
      startDate: order.startDate || new Date().toISOString().split('T')[0],
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 flex flex-col gap-6 text-xs text-slate-300">
      
      {/* Top Header & City Filter Bar */}
      <div className="glass-panel p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-tight">
                Logistics & Warehouse Operations Center
              </h2>
              <p className="text-[11px] text-slate-400">
                Linear 5-Stage Pipeline: Staging & Packing ➔ Barcode Printing ➔ Fleet Dispatch ➔ Live Telemetry ➔ Doorstep Handover & POD.
              </p>
            </div>
          </div>
        </div>

        {/* City Filter & Active Stats */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-900/60 p-1.5 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold px-2 uppercase">City Hub:</span>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs font-semibold rounded-lg px-2.5 py-1 cursor-pointer"
            >
              <option value="All">All Operating Cities</option>
              {cities.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>

          <span className="px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 font-mono font-bold text-xs">
            {cityDrivers.length} Active Fleet Riders
          </span>
        </div>
      </div>

      {/* 5-STAGE LINEAR LOGISTICS WORKFLOW TABS */}
      <div className="flex items-center gap-2 p-1.5 glass-panel rounded-2xl border border-slate-800/80 overflow-x-auto">
        
        {/* Stage 1: Preparation */}
        <button
          onClick={() => setActiveTab('preparation')}
          className={`flex-1 min-w-[170px] py-3 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'preparation'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>1. Warehouse Staging & Packing</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/40 font-mono font-bold">
            {preparationOrders.length}
          </span>
        </button>

        {/* Stage 2: Dispatch */}
        <button
          onClick={() => setActiveTab('dispatch')}
          className={`flex-1 min-w-[170px] py-3 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'dispatch'
              ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
          }`}
        >
          <Send className="w-4 h-4" />
          <span>2. Assign to Rider</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/40 font-mono font-bold">
            {readyForDispatchOrders.length}
          </span>
        </button>

        {/* Stage 3: In-Transit */}
        <button
          onClick={() => setActiveTab('transit')}
          className={`flex-1 min-w-[170px] py-3 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'transit'
              ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
          }`}
        >
          <Navigation className="w-4 h-4" />
          <span>3. In-Transit & Scans</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/40 font-mono font-bold">
            {inTransitOrders.length}
          </span>
        </button>

        {/* Stage 4: Delivered */}
        <button
          onClick={() => setActiveTab('completed')}
          className={`flex-1 min-w-[170px] py-3 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'completed'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>4. Delivered (POD Proof)</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/40 font-mono font-bold">
            {completedOrders.length}
          </span>
        </button>

        {/* Stage 5: Returns */}
        <button
          onClick={() => setActiveTab('returns')}
          className={`flex-1 min-w-[170px] py-3 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'returns'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          <span>5. Return Pickups</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/40 font-mono font-bold">
            {returnOrders.length}
          </span>
        </button>

        {/* Stage 6: Cancelled */}
        <button
          onClick={() => setActiveTab('cancelled')}
          className={`flex-1 min-w-[170px] py-3 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'cancelled'
              ? 'bg-rose-800 text-white shadow-lg shadow-rose-800/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
          }`}
        >
          <X className="w-4 h-4 text-rose-400" />
          <span>6. Cancelled & Restored</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/40 font-mono font-bold text-rose-300">
            {cancelledOrders.length}
          </span>
        </button>

      </div>

      {/* TAB CONTENT AREA */}
      <div>
        
        {/* ========================================================================= */}
        {/* STAGE 1: ORDER PREPARATION & WAREHOUSE PACKING                            */}
        {/* ========================================================================= */}
        {activeTab === 'preparation' && (
          <div className="space-y-4">
            <div className="glass-panel p-4 rounded-2xl flex justify-between items-center bg-amber-950/20 border border-amber-500/20">
              <div className="text-xs text-amber-200">
                📦 <strong>Step 1: Warehouse Team Action Required</strong> — Wrap furniture, click <strong>[Print Barcode Label & Contract]</strong>, stick it on the item, and click <strong>[Mark as Packed & Ready]</strong>.
              </div>
              <span className="text-[11px] font-mono text-amber-400 font-bold">{preparationOrders.length} Orders Awaiting Packing</span>
            </div>

            {preparationOrders.length === 0 ? (
              <div className="p-12 glass-panel rounded-2xl border border-slate-800 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <h4 className="font-bold text-white text-sm">All Placed Orders are Packed & Barcode-Labeled!</h4>
                <p className="text-slate-400 text-xs">Switch to "2. Assign to Rider" tab to dispatch orders to fleet drivers.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {preparationOrders.map((order) => (
                  <div
                    key={order.id}
                    className="p-5 glass-panel rounded-2xl border border-slate-800 space-y-4 hover:border-amber-500/40 transition-all"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between border-b border-slate-800 pb-3">
                      <div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase font-mono">
                          Needs Packaging & Label
                        </span>
                        <h3 className="font-bold text-white text-sm mt-1">{order.id}</h3>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">Placed: {order.createdAt.substring(0, 10)} • {order.city || currentCity} Hub</p>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-emerald-400 text-xs">₹{order.netMonthlyRent || order.totalMonthlyRent}/mo</div>
                        <div className="text-[10px] text-slate-500 font-mono">Deposit: ₹{order.totalDeposit}</div>
                      </div>
                    </div>

                    {/* Customer Info */}
                    <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-900 space-y-1.5">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1 font-bold text-slate-200">
                          <User className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{order.customerName}</span>
                        </div>
                        <span className="font-mono text-cyan-400 text-[11px]">{order.customerMobile}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-start gap-1">
                        <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-1">{order.deliveryAddress || `${order.city || currentCity} Delivery Address`}</span>
                      </div>
                    </div>

                    {/* Furniture Assets to Pack */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Furniture Items to Pack ({order.items.length} units):
                      </span>
                      <div className="space-y-1">
                        {order.items.map((item, idx) => {
                          const assetInfo = inventory.find(a => a.id === item.assetId);
                          return (
                            <div
                              key={idx}
                              className="p-2 rounded-lg bg-slate-900/40 border border-slate-800/60 flex items-center justify-between"
                            >
                              <div className="flex items-center gap-2">
                                <Package className="w-3.5 h-3.5 text-amber-400" />
                                <span className="font-semibold text-slate-200 text-xs">
                                  {assetInfo ? `${assetInfo.brand || ''} ${assetInfo.model || assetInfo.category}` : item.category || 'Furniture Item'}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setStickerAssetForPrint({
                                  id: assetInfo?.id || item.assetId,
                                  barcode: assetInfo?.barcode || item.assetId,
                                  brand: assetInfo?.brand,
                                  model: assetInfo?.model,
                                  category: assetInfo?.category || item.category,
                                  warehouse: assetInfo?.warehouse || `${order.city || currentCity} Central Depot`,
                                  rackNumber: assetInfo?.rackNumber || 'A-01',
                                  orderId: order.id,
                                  customerName: order.customerName,
                                  customerMobile: order.customerMobile,
                                  deliveryAddress: order.deliveryAddress,
                                  city: order.city || currentCity,
                                  durationMonths: order.durationMonths,
                                  monthlyRent: order.netMonthlyRent || order.totalMonthlyRent,
                                  depositPaid: order.totalDeposit,
                                  startDate: order.startDate
                                })}
                                className="font-mono text-[10px] text-amber-400 bg-amber-950/30 hover:bg-amber-900/40 px-2.5 py-1 rounded-lg border border-amber-500/25 flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
                                title="Click to Print Barcode Label with Customer Contract"
                              >
                                <Tag className="w-3 h-3 text-amber-400" /> {assetInfo?.barcode || item.assetId}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Actions: Print Label, Call Customer, Cancel & Mark Prepared */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => handlePrintConsignmentLabel(order)}
                        className="py-2 px-3 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-800 cursor-pointer"
                        title="Print Consignment Barcode Sticker & Tax Invoice"
                      >
                        <Printer className="w-3.5 h-3.5 text-amber-400" /> Print Slip
                      </button>

                      <a
                        href={`tel:${order.customerMobile}`}
                        className="py-2 px-3 bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/40 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-sm"
                        title={`Call Customer: ${order.customerMobile}`}
                      >
                        <Phone className="w-3.5 h-3.5 text-emerald-400" /> Call Customer
                      </a>

                      <button
                        onClick={() => setCancellingOrder(order)}
                        className="py-2 px-3 bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-500/30 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                        title="Cancel Order & Restore Furniture to Available Stock"
                      >
                        <X className="w-3.5 h-3.5 text-red-400" /> Cancel
                      </button>

                      <button
                        onClick={() => handleMarkAsPrepared(order)}
                        className="flex-1 min-w-[140px] py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-600/20 cursor-pointer transition-all hover:scale-[1.02]"
                      >
                        <Check className="w-3.5 h-3.5" /> Mark Packed ➔
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* STAGE 2: READY FOR DISPATCH & ASSIGN TO RIDER                             */}
        {/* ========================================================================= */}
        {activeTab === 'dispatch' && (
          <div className="space-y-4">
            <div className="glass-panel p-4 rounded-2xl flex justify-between items-center bg-red-950/20 border border-red-500/20">
              <div className="text-xs text-red-200">
                🚚 <strong>Step 2: Assign Packed Orders to Fleet Drivers</strong> — Orders here are packed and barcode-labeled. Select an available rider with SLA delivery timeline.
              </div>
              <span className="text-[11px] font-mono text-red-400 font-bold">{readyForDispatchOrders.length} Orders Ready</span>
            </div>

            {readyForDispatchOrders.length === 0 ? (
              <div className="p-12 glass-panel rounded-2xl border border-slate-800 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <h4 className="font-bold text-white text-sm">All Packed Orders are Dispatched!</h4>
                <p className="text-slate-400 text-xs">Switch to "3. In-Transit & Scans" tab to track live rider telemetry and scans.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {readyForDispatchOrders.map((order) => (
                  <div
                    key={order.id}
                    className="p-5 glass-panel rounded-2xl border border-slate-800 space-y-4 hover:border-red-500/40 transition-all"
                  >
                    <div className="flex items-start justify-between border-b border-slate-800 pb-3">
                      <div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase font-mono">
                          ✓ Packed & Barcode Labeled
                        </span>
                        <h3 className="font-bold text-white text-sm mt-1">{order.id}</h3>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">Destination: {order.city || currentCity} Hub</p>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-emerald-400 text-xs">₹{order.netMonthlyRent || order.totalMonthlyRent}/mo</div>
                        <span className="text-[10px] text-slate-500">6 Months Contract</span>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-900 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-200 text-xs">{order.customerName}</span>
                        <span className="font-mono text-cyan-400 text-[11px]">{order.customerMobile}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-start gap-1">
                        <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-1">{order.deliveryAddress || `${order.city || currentCity} Delivery Area`}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
                      <button
                        onClick={() => handlePrintConsignmentLabel(order)}
                        className="py-2 px-3 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-800 cursor-pointer"
                        title="Print Consignment Barcode Sticker & Tax Invoice"
                      >
                        <Printer className="w-3.5 h-3.5 text-red-400" /> Print Slip
                      </button>

                      <a
                        href={`tel:${order.customerMobile}`}
                        className="py-2 px-3 bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/40 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-sm"
                        title={`Call Customer: ${order.customerMobile}`}
                      >
                        <Phone className="w-3.5 h-3.5 text-emerald-400" /> Call Customer
                      </a>

                      <button
                        onClick={() => setCancellingOrder(order)}
                        className="py-2 px-3 bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-500/30 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                        title="Cancel Order & Restore Furniture to Available Stock"
                      >
                        <X className="w-3.5 h-3.5 text-red-400" /> Cancel
                      </button>

                      <button
                        onClick={() => handleOpenAssignModal(order)}
                        className="flex-1 min-w-[140px] px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-red-600/20 hover:scale-[1.02] transition-all cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" /> Assign to Rider ➔
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* STAGE 3: IN-TRANSIT & LIVE TELEMETRY                                      */}
        {/* ========================================================================= */}
        {activeTab === 'transit' && (
          <div className="space-y-4">
            <div className="glass-panel p-4 rounded-2xl flex justify-between items-center bg-cyan-950/20 border border-cyan-500/20">
              <div className="text-xs text-cyan-200">
                📍 <strong>Step 3: Live Rider Tracking & Barcode Scans</strong> — Monitor Depot Loading Scan, Doorstep Handover Scan, and Delivery Proof Photo.
              </div>
              <span className="text-[11px] font-mono text-cyan-400 font-bold">{inTransitOrders.length} Active Deliveries</span>
            </div>

            {inTransitOrders.length === 0 ? (
              <div className="p-12 glass-panel rounded-2xl border border-slate-800 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-slate-600 mx-auto" />
                <h4 className="font-bold text-white text-sm">No Active Deliveries In-Transit</h4>
                <p className="text-slate-400 text-xs">Orders assigned to fleet riders will appear here with live barcode scanning verification.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {inTransitOrders.map((order) => {
                  const isLoaded = Boolean(order.scannedAtLoading);
                  const isDeliveredScan = Boolean(order.scannedAtDelivery);
                  const hasPhoto = Boolean(order.deliveryProofPhoto);

                  return (
                    <div
                      key={order.id}
                      className="p-5 glass-panel rounded-2xl border border-slate-800 space-y-4 shadow-lg"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                            <Truck className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-white text-base font-mono">{order.id}</h3>
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                {isLoaded ? '🚚 Out for Doorstep Delivery' : '📦 Dispatched (Awaiting Depot Scan)'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-300 mt-1">
                              Customer: <strong className="text-white font-bold">{order.customerName}</strong> ({order.customerMobile}) • {order.deliveryAddress}
                            </p>
                          </div>
                        </div>

                        {/* Call Customer & Call Rider Action Panel */}
                        <div className="flex items-center gap-2 flex-wrap bg-slate-950 p-2 rounded-2xl border border-slate-800">
                          <a
                            href={`tel:${order.customerMobile}`}
                            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                            title={`Call Customer: ${order.customerMobile}`}
                          >
                            <Phone className="w-3.5 h-3.5" /> Call Customer
                          </a>

                          <div className="px-2 text-right">
                            <span className="text-[9px] text-slate-400 uppercase font-bold block">Assigned Rider:</span>
                            <span className="font-bold text-cyan-300 text-xs">{order.assignedLogisticsUser || order.assignedDriverName || 'Fleet Driver'}</span>
                          </div>

                          {order.assignedDriverPhone && (
                            <a
                              href={`tel:${order.assignedDriverPhone}`}
                              className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                              title={`Call Rider: ${order.assignedDriverPhone}`}
                            >
                              <Phone className="w-3.5 h-3.5" /> Call Rider
                            </a>
                          )}
                        </div>
                      </div>

                      {/* AMAZON/FLIPKART HIGH-CONTRAST LIVE TRACKING PROGRESS STEPPER */}
                      <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-300 uppercase tracking-wider">Live Delivery Stages:</span>
                          <span className="font-mono text-cyan-400 font-bold">Deadline: {order.deliveryDeadline || 'Today, 5:00 PM'}</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-1">
                          
                          {/* Step 1: Dispatched */}
                          <div className="p-3 rounded-2xl bg-slate-900 border-2 border-emerald-500 flex items-center gap-2.5 shadow-md">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                            <div>
                              <div className="font-bold text-white text-xs">1. Driver Assigned</div>
                              <div className="text-[10px] text-emerald-400 font-bold font-mono">Notified on App</div>
                            </div>
                          </div>

                          {/* Step 2: Depot Barcode Scan */}
                          <div className={`p-3 rounded-2xl border-2 flex items-center gap-2.5 shadow-md transition-all ${
                            isLoaded 
                              ? 'bg-slate-900 border-emerald-500' 
                              : 'bg-slate-950 border-slate-800'
                          }`}>
                            <CheckCircle2 className={`w-5 h-5 shrink-0 ${isLoaded ? 'text-emerald-400' : 'text-slate-600'}`} />
                            <div>
                              <div className={`font-bold text-xs ${isLoaded ? 'text-white' : 'text-slate-400'}`}>
                                {isLoaded ? '✓ Depot Scan Verified' : '2. Depot Loading Scan'}
                              </div>
                              <div className={`text-[10px] font-mono font-bold ${isLoaded ? 'text-emerald-400' : 'text-slate-500'}`}>
                                {isLoaded ? 'Loaded to Vehicle' : 'Pending at Warehouse'}
                              </div>
                            </div>
                          </div>

                          {/* Step 3: Doorstep Handover Scan */}
                          <div className={`p-3 rounded-2xl border-2 flex items-center gap-2.5 shadow-md transition-all ${
                            isDeliveredScan 
                              ? 'bg-slate-900 border-emerald-500' 
                              : 'bg-slate-950 border-slate-800'
                          }`}>
                            <CheckCircle2 className={`w-5 h-5 shrink-0 ${isDeliveredScan ? 'text-emerald-400' : 'text-slate-600'}`} />
                            <div>
                              <div className={`font-bold text-xs ${isDeliveredScan ? 'text-white' : 'text-slate-400'}`}>
                                {isDeliveredScan ? '✓ Doorstep Verified' : '3. Doorstep Scan'}
                              </div>
                              <div className={`text-[10px] font-mono font-bold ${isDeliveredScan ? 'text-emerald-400' : 'text-slate-500'}`}>
                                {isDeliveredScan ? 'Verified Handover' : 'Pending at Customer'}
                              </div>
                            </div>
                          </div>

                          {/* Step 4: Photo Proof (POD) */}
                          <div className={`p-3 rounded-2xl border-2 flex items-center gap-2.5 shadow-md transition-all ${
                            hasPhoto 
                              ? 'bg-slate-900 border-emerald-500 cursor-pointer hover:border-emerald-400' 
                              : 'bg-slate-950 border-slate-800'
                          }`}
                            onClick={() => {
                              if (hasPhoto) setPreviewPhotoOrder(order);
                            }}
                          >
                            <Camera className={`w-5 h-5 shrink-0 ${hasPhoto ? 'text-emerald-400' : 'text-slate-600'}`} />
                            <div>
                              <div className={`font-bold text-xs ${hasPhoto ? 'text-white flex items-center gap-1' : 'text-slate-400'}`}>
                                {hasPhoto ? '✓ Photo POD Attached' : '4. Room Setup Photo'}
                                {hasPhoto && <Eye className="w-3 h-3 text-emerald-400" />}
                              </div>
                              <div className={`text-[10px] font-mono font-bold ${hasPhoto ? 'text-emerald-400' : 'text-slate-500'}`}>
                                {hasPhoto ? 'Click to View Photo' : 'Pending Upload'}
                              </div>
                            </div>
                          </div>

                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* STAGE 4: DELIVERED & COMPLETED (POD PHOTO PROOF)                          */}
        {/* ========================================================================= */}
        {activeTab === 'completed' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl flex justify-between items-center bg-emerald-50 border border-emerald-200 shadow-sm">
              <div className="text-xs text-emerald-900 font-medium">
                ✅ <strong>Delivered & Active Rentals</strong> — All orders with verified 2-way barcode scans and room setup photo proof (POD).
              </div>
              <span className="text-xs font-mono text-emerald-800 font-bold bg-emerald-100 px-3 py-1 rounded-lg border border-emerald-300">{completedOrders.length} Completed</span>
            </div>

            {completedOrders.length === 0 ? (
              <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center space-y-2 shadow-sm">
                <CheckCircle2 className="w-10 h-10 text-slate-400 mx-auto" />
                <h4 className="font-bold text-slate-800 text-sm">No Delivered Orders Yet</h4>
                <p className="text-slate-500 text-xs">Completed deliveries will appear here with proof photo inspection.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl overflow-hidden shadow-lg border border-slate-200">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                      <th className="p-4 font-bold uppercase tracking-wider text-slate-700">Order ID</th>
                      <th className="p-4 font-bold uppercase tracking-wider text-slate-700">Customer & Call</th>
                      <th className="p-4 font-bold uppercase tracking-wider text-slate-700">Delivered Rider</th>
                      <th className="p-4 font-bold uppercase tracking-wider text-slate-700">2-Way Scan Verification</th>
                      <th className="p-4 font-bold uppercase tracking-wider text-slate-700">POD Proof Photo</th>
                      <th className="p-4 font-bold uppercase tracking-wider text-slate-700">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {completedOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50/80 transition-all bg-white">
                        <td className="p-4 font-mono font-extrabold text-slate-900 text-sm tracking-wide">{order.id}</td>
                        <td className="p-4">
                          <div className="font-extrabold text-slate-900 text-sm">{order.customerName}</div>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-xs text-slate-600 font-mono font-bold">{order.customerMobile}</span>
                            <a
                              href={`tel:${order.customerMobile}`}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition-all"
                              title={`Call ${order.customerName}`}
                            >
                              <Phone className="w-3 h-3" /> Call Customer
                            </a>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-slate-800 text-xs">{order.assignedLogisticsUser || order.assignedDriverName || 'Fleet Driver'}</div>
                          <div className="text-xs text-slate-500 font-medium">{order.city || currentCity} Hub</div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-400 text-emerald-800 text-xs font-bold flex items-center gap-1 font-mono shadow-sm">
                              ✓ Depot Scan
                            </span>
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-400 text-emerald-800 text-xs font-bold flex items-center gap-1 font-mono shadow-sm">
                              ✓ Doorstep Scan
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          {order.deliveryProofPhoto ? (
                            <button
                              onClick={() => setPreviewPhotoOrder(order)}
                              className="px-3 py-1.5 rounded-xl bg-cyan-50 text-cyan-800 border border-cyan-400 hover:bg-cyan-100 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                            >
                              <Camera className="w-3.5 h-3.5 text-cyan-600" /> View Room Setup Photo
                            </button>
                          ) : (
                            <span className="text-xs text-slate-500 font-mono font-semibold">OTP Verified Handover</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-400 uppercase font-mono tracking-wider">
                            ✓ DELIVERED
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* STAGE 5: RETURN PICKUPS (RENTAL EXPIRY & DEPOSIT REFUND)                   */}
        {/* ========================================================================= */}
        {activeTab === 'returns' && (
          <div className="space-y-4">
            <div className="glass-panel p-4 rounded-2xl flex justify-between items-center bg-purple-950/20 border border-purple-500/20">
              <div className="text-xs text-purple-200">
                🔄 <strong>Step 5: End-of-Rental Return Pickups</strong> — When rental tenure completes, rider scans the SAME barcode at customer house to verify returned furniture and release deposit.
              </div>
              <span className="text-[11px] font-mono text-purple-400 font-bold">{returnOrders.length} Returns</span>
            </div>

            {returnOrders.length === 0 ? (
              <div className="p-12 glass-panel rounded-2xl border border-slate-800 text-center space-y-2">
                <RotateCcw className="w-10 h-10 text-slate-600 mx-auto" />
                <h4 className="font-bold text-white text-sm">No Pending Return Pickups</h4>
                <p className="text-slate-400 text-xs">When customer rental timelines complete, return pickup requests will appear here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {returnOrders.map((order) => (
                  <div key={order.id} className="p-5 glass-panel rounded-2xl border border-slate-800 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase font-mono">
                          Return Pickup
                        </span>
                        <h4 className="font-bold text-white text-sm mt-1">{order.id}</h4>
                        <p className="text-[11px] text-slate-400">{order.customerName} ({order.customerMobile})</p>
                      </div>
                      <span className="font-mono font-bold text-purple-400 text-xs">Refund: ₹{order.totalDeposit}</span>
                    </div>

                    <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-900 text-[11px] flex justify-between items-center">
                      <span className="text-slate-400">Barcode to Scan on Pickup:</span>
                      <span className="font-mono font-bold text-red-400">{order.items[0]?.assetId || 'RB-BARCODE'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* STAGE 6: CANCELLED & RESTORED INVENTORY                                   */}
        {/* ========================================================================= */}
        {activeTab === 'cancelled' && (
          <div className="space-y-4">
            <div className="glass-panel p-4 rounded-2xl flex justify-between items-center bg-rose-950/20 border border-rose-500/20">
              <div className="text-xs text-rose-200">
                🛑 <strong>Cancelled Orders & Stock Release Log</strong> — Orders cancelled by customers or warehouse staging. All allocated furniture units have been released back to Available inventory.
              </div>
              <span className="text-[11px] font-mono text-rose-400 font-bold">{cancelledOrders.length} Cancelled Orders</span>
            </div>

            {cancelledOrders.length === 0 ? (
              <div className="p-12 glass-panel rounded-2xl border border-slate-800 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-slate-600 mx-auto" />
                <h4 className="font-bold text-white text-sm">No Cancelled Orders</h4>
                <p className="text-slate-400 text-xs">All customer orders are processing smoothly through active staging and dispatch.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cancelledOrders.map((order) => (
                  <div
                    key={order.id}
                    className="p-5 glass-panel rounded-2xl border border-rose-500/20 space-y-3 bg-rose-950/10"
                  >
                    <div className="flex items-start justify-between border-b border-slate-800/80 pb-3">
                      <div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 uppercase font-mono">
                          ✕ Cancelled & Restored
                        </span>
                        <h3 className="font-bold text-white text-sm mt-1">{order.id}</h3>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">Destination: {order.city || currentCity} Hub</p>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                          ✓ Stock Released
                        </span>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-900 space-y-1">
                      <div className="flex justify-between items-center text-xs font-bold text-slate-200">
                        <span>{order.customerName}</span>
                        <span className="font-mono text-cyan-400">{order.customerMobile}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-1">{order.deliveryAddress || `${order.city || currentCity} Delivery Area`}</p>
                    </div>

                    <div className="p-2.5 bg-slate-950/40 rounded-xl border border-slate-900 text-[11px] space-y-1">
                      <div className="text-slate-400 font-medium">
                        Reason: <span className="text-rose-300 font-semibold">{order.cancellationReason || 'Cancelled at staging'}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {order.items?.length || 1} furniture units returned to Available warehouse stock.
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* RICH ASSIGN DRIVER MODAL WITH SLA DEADLINE & LOAD */}
      {showAssignModal && orderToAssign && (
        <div className="fixed inset-0 bg-[#030303]/85 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-[580px] glass-panel border border-slate-800/90 rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Truck className="w-5 h-5 text-red-500" /> Assign Delivery Order to Driver
                </h3>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">Order: {orderToAssign.id} • Destination: {orderToAssign.city || currentCity}</p>
              </div>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setOrderToAssign(null);
                }}
                className="p-1 rounded bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {assignSuccessMessage ? (
              <div className="py-8 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/30">
                  <Check className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-white">{assignSuccessMessage}</h4>
                <p className="text-xs text-slate-400">Order successfully transferred to the Rider's active mobile queue.</p>
              </div>
            ) : (
              <form onSubmit={handleConfirmAssignment} className="space-y-4 text-xs">
                
                {/* Customer Details Box */}
                <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-900 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Customer Destination:</span>
                    <span className="font-mono text-cyan-300 font-bold">{orderToAssign.customerMobile}</span>
                  </div>
                  <div className="font-bold text-slate-200 text-sm">{orderToAssign.customerName}</div>
                  <div className="text-[11px] text-slate-400 flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                    <span>{orderToAssign.deliveryAddress || `${orderToAssign.city || currentCity} Delivery Address`}</span>
                  </div>
                </div>

                {/* Furniture Items to be Delivered */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Furniture Assets to Dispatch ({orderToAssign.items.length} units):
                  </span>
                  <div className="space-y-1 max-h-28 overflow-y-auto">
                    {orderToAssign.items.map((item, idx) => {
                      const asset = inventory.find(a => a.id === item.assetId);
                      return (
                        <div key={idx} className="p-2 rounded bg-slate-900/50 border border-slate-800/80 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Package className="w-3.5 h-3.5 text-red-400" />
                            <span className="font-bold text-slate-200">{asset ? `${asset.brand || ''} ${asset.model || asset.category}` : item.category || 'Asset'}</span>
                          </div>
                          <span className="font-mono text-[10px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-850">
                            {asset?.barcode || item.assetId}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Driver Selection with Strict City-Level Matching */}
                {(() => {
                  const eligibleDrivers = getEligibleDriversForOrder(orderToAssign);
                  const orderCityDisplay = orderToAssign.city || currentCity;
                  return (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-slate-300 block font-bold text-xs">
                          Select Rider in <span className="text-red-400 font-extrabold">{orderCityDisplay}</span> Hub *
                        </label>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-900 border border-slate-800 text-slate-400">
                          {eligibleDrivers.length} {eligibleDrivers.length === 1 ? 'Rider' : 'Riders'} in {orderCityDisplay}
                        </span>
                      </div>

                      {eligibleDrivers.length === 0 ? (
                        <div className="p-4 bg-red-950/30 border border-red-500/40 text-red-300 rounded-2xl text-xs space-y-1.5 shadow-md">
                          <div className="font-bold flex items-center gap-2 text-red-200 text-xs">
                            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                            No Registered Riders Found for {orderCityDisplay}
                          </div>
                          <p className="text-[11px] text-slate-300 leading-relaxed">
                            Riders from other cities (e.g. Bhopal/Indore) cannot be assigned to this order to prevent cross-city delivery issues. Please onboard a local rider in <span className="font-bold text-white">{orderCityDisplay}</span> before dispatching.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                          {eligibleDrivers.map((driver) => {
                            const isSelected = selectedDriverId === driver.id;
                            const activeDriverOrders = orders.filter(
                              o => (o.assignedDriverId === driver.id || o.assignedDriverPhone === driver.phone || o.assignedLogisticsUser === driver.fullName) &&
                                   (o.status === 'Assigned' || o.status === 'Out for Delivery')
                            );

                            return (
                              <div
                                key={driver.id}
                                onClick={() => setSelectedDriverId(driver.id)}
                                className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                                  isSelected
                                    ? 'bg-red-950/30 border-red-500 shadow-md shadow-red-500/10'
                                    : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-white text-xs shrink-0 overflow-hidden">
                                    {driver.documents?.profilePhotoUrl ? (
                                      <img src={driver.documents.profilePhotoUrl} alt={driver.fullName} className="w-full h-full object-cover" />
                                    ) : (
                                      driver.fullName.substring(0, 2).toUpperCase()
                                    )}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h4 className="font-bold text-slate-100 text-xs">{driver.fullName}</h4>
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-slate-800 text-slate-300">
                                        {driver.vehicleType || 'Bike'} • {driver.vehicleNumber || 'MP-09'}
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                                      <span className="flex items-center text-amber-400 font-bold">
                                        <Star className="w-3 h-3 fill-amber-400 text-amber-400 inline mr-0.5" />
                                        {driver.rating || 4.9}
                                      </span>
                                      <span>•</span>
                                      <span className="font-mono">{driver.phone}</span>
                                      <span>•</span>
                                      <span className="text-red-400 font-semibold">📍 {driver.city || orderCityDisplay}</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="text-right">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    activeDriverOrders.length === 0
                                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                  }`}>
                                    {activeDriverOrders.length === 0 ? '🟢 Ready (0 Active)' : `🟡 ${activeDriverOrders.length} In-Transit`}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Priority & Deadline */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-slate-400 block mb-1 font-semibold">Delivery Priority</label>
                    <select
                      value={deliveryPriority}
                      onChange={(e) => setDeliveryPriority(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 cursor-pointer"
                    >
                      <option value="Standard">Standard Delivery (24-48 hrs)</option>
                      <option value="Urgent">Urgent Priority (Today)</option>
                      <option value="Same-Day">Same-Day Express (4 hrs)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1 font-semibold">SLA Deadline Slot</label>
                    <select
                      value={deliveryDeadline}
                      onChange={(e) => setDeliveryDeadline(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 cursor-pointer font-mono"
                    >
                      <option value="Today, 5:00 PM">Today, 5:00 PM</option>
                      <option value="Today, 8:00 PM">Today, 8:00 PM</option>
                      <option value="Tomorrow, 12:00 PM">Tomorrow, 12:00 PM</option>
                      <option value="Tomorrow, 6:00 PM">Tomorrow, 6:00 PM</option>
                    </select>
                  </div>
                </div>

                {/* Dispatch Button */}
                <div className="pt-3 border-t border-slate-800 flex gap-3">
                  <button
                    type="submit"
                    disabled={isAssigning || !selectedDriverId}
                    className={`flex-1 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-all ${
                      isAssigning || !selectedDriverId
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/20 hover:scale-[1.01]'
                    }`}
                  >
                    <Send className="w-4 h-4" />
                    {isAssigning ? 'Dispatching...' : 'Dispatch Order to Rider Mobile App'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAssignModal(false);
                      setOrderToAssign(null);
                    }}
                    className="py-3 px-4 rounded-xl border border-slate-800 text-slate-300 hover:bg-slate-900 font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

              </form>
            )}
          </div>
        </div>
      )}

      {/* DELIVERY PROOF (POD) PREVIEW MODAL */}
      {previewPhotoOrder && (
        <div className="fixed inset-0 bg-[#030303]/90 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-[520px] glass-panel border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-emerald-400" /> Proof of Delivery (POD) Inspection
                </h3>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">Order ID: {previewPhotoOrder.id}</p>
              </div>
              <button
                onClick={() => setPreviewPhotoOrder(null)}
                className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Room Photo Preview */}
            <div className="space-y-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Customer Room Setup Photo:</span>
              <div className="w-full h-64 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center">
                {previewPhotoOrder.deliveryProofPhoto ? (
                  <img
                    src={previewPhotoOrder.deliveryProofPhoto}
                    alt="Delivery Proof"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center text-slate-500 space-y-2">
                    <Camera className="w-10 h-10 mx-auto text-slate-700" />
                    <p className="text-xs">Live POD photo captured at customer doorstep</p>
                  </div>
                )}
              </div>
            </div>

            {/* Verification checklist badges */}
            <div className="grid grid-cols-2 gap-3 text-[11px]">
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-900 space-y-1">
                <span className="text-slate-500 text-[10px] uppercase font-bold block">1. Depot Loading Scan:</span>
                <div className="font-bold text-emerald-400 flex items-center gap-1">
                  ✓ Verified by Driver
                </div>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-900 space-y-1">
                <span className="text-slate-500 text-[10px] uppercase font-bold block">2. Doorstep Handover Scan:</span>
                <div className="font-bold text-emerald-400 flex items-center gap-1">
                  ✓ Verified at Doorstep
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setPreviewPhotoOrder(null)}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Printable Sticker Modal */}
      {stickerAssetForPrint && (
        <BarcodeStickerModal
          asset={stickerAssetForPrint as any}
          onClose={() => setStickerAssetForPrint(null)}
        />
      )}

      {/* Cancel Order & Stock Restoration Modal */}
      {cancellingOrder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-[500px] glass-panel border border-red-500/30 rounded-3xl p-6 shadow-2xl space-y-5 text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-red-950/60 border border-red-500/30 text-red-400">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Cancel Order & Restore Stock</h3>
                  <p className="text-[11px] text-slate-400 font-mono">Order ID: {cancellingOrder.id}</p>
                </div>
              </div>
              <button
                onClick={() => setCancellingOrder(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Order Details & Items Info */}
            <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-900 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-200">{cancellingOrder.customerName}</span>
                <span className="font-mono text-cyan-400">{cancellingOrder.customerMobile}</span>
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-1">{cancellingOrder.deliveryAddress || `${cancellingOrder.city || currentCity} Delivery Area`}</p>
              
              <div className="pt-2 border-t border-slate-900">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-1">
                  📦 Items to be Restored to Available Stock ({cancellingOrder.items?.length || 1} units):
                </span>
                <div className="space-y-1">
                  {(cancellingOrder.items || []).map((item, idx) => (
                    <div key={idx} className="text-[11px] text-slate-300 flex items-center gap-1.5 font-mono">
                      <span className="text-emerald-400">✓</span>
                      <span>{(item as any).name || item.category || 'Furniture Item'}</span>
                      <span className="text-[9px] text-slate-500">({item.assetId})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Cancellation Reason Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">Reason for Cancellation:</label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-2.5 text-xs font-medium focus:border-red-500 outline-none"
              >
                <option value="Customer refused delivery / cancelled at staging">Customer refused delivery / cancelled at staging</option>
                <option value="Customer unreachable or wrong phone number">Customer unreachable or wrong phone number</option>
                <option value="Item damaged during packaging inspection">Item damaged during packaging inspection</option>
                <option value="Customer requested date reschedule or cancellation">Customer requested date reschedule or cancellation</option>
                <option value="Payment / Security deposit verification failure">Payment / Security deposit verification failure</option>
              </select>
            </div>

            <div className="p-3 bg-red-950/20 border border-red-500/20 rounded-xl text-[11px] text-red-300">
              ⚠️ <strong>Note:</strong> All {cancellingOrder.items?.length || 1} furniture units will be immediately marked as <strong>"Available"</strong> in the {cancellingOrder.city || currentCity} warehouse inventory for new customer rentals.
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCancellingOrder(null)}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl font-bold text-xs"
              >
                Keep Order
              </button>
              <button
                type="button"
                disabled={isCancelling}
                onClick={async () => {
                  if (!cancellingOrder) return;
                  setIsCancelling(true);
                  await cancelOrder(cancellingOrder.id, cancelReason);
                  setIsCancelling(false);
                  setCancellingOrder(null);
                }}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-red-600/30"
              >
                {isCancelling ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <X className="w-4 h-4" /> Confirm & Restore Stock
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
