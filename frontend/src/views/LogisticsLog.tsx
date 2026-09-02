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
    prepareOrder,
    cancelOrder
  } = useRentBuddyStore();

  const [selectedCity, setSelectedCity] = useState<string>('All');
  const [activeTab, setActiveTab] = useState<'preparation' | 'dispatch' | 'transit' | 'completed' | 'returns' | 'cancelled'>('preparation');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  
  // Initial mount sync with backend MongoDB orders
  useEffect(() => {
    useRentBuddyStore.getState().initializeStore();
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
  const [isReturnPickupModal, setIsReturnPickupModal] = useState(false);

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

  const isReturned = (o: RentalOrder) => 
    !isCancelled(o) && (
      (o.status || '').toLowerCase() === 'returned' || 
      (o.deliveryStatus || '').toLowerCase() === 'returned' ||
      o.scannedAtReturn === true
    );

  const isDelivered = (o: RentalOrder) => 
    !isCancelled(o) && !isReturned(o) && (
      (o.status || '').toLowerCase() === 'delivered' || 
      (o.status || '').toLowerCase() === 'completed' || 
      (o.deliveryStatus || '').toLowerCase() === 'delivered' || 
      (o.deliveryStatus || '').toLowerCase() === 'completed' ||
      Boolean(o.deliveryProofPhoto)
    );

  const isReturn = (o: RentalOrder) => 
    !isCancelled(o) && !isReturned(o) && (
      (o.status || '').toLowerCase() === 'return pickup' || 
      (o.status || '').toLowerCase() === 'return_pickup' || 
      (o.status || '').toLowerCase() === 'return scheduled' || 
      (o.deliveryStatus || '').toLowerCase() === 'return_assigned' ||
      (o.deliveryStatus || '').toLowerCase() === 'return_pickup' ||
      isDelivered(o)
    );

  const isInTransit = (o: RentalOrder) => 
    !isCancelled(o) && !isDelivered(o) && !isReturned(o) && (
      Boolean(o.assignedDriverId) || 
      Boolean(o.assignedDriverPhone) ||
      (o.status || '').toLowerCase() === 'assigned' || 
      (o.status || '').toLowerCase() === 'out for delivery' ||
      (o.status || '').toLowerCase() === 'in_transit' ||
      (o.status || '').toLowerCase() === 'out_for_delivery' ||
      o.scannedAtLoading
    );

  const isReadyForDispatch = (o: RentalOrder) => 
    !isCancelled(o) && !isDelivered(o) && !isReturned(o) && !isInTransit(o) && (
      o.isPrepared || 
      (o.status || '').toLowerCase() === 'ready for dispatch' || 
      (o.status || '').toLowerCase() === 'ready_for_dispatch'
    );

  const isPreparation = (o: RentalOrder) => 
    !isCancelled(o) && !isDelivered(o) && !isReturned(o) && !isInTransit(o) && !isReadyForDispatch(o);

  // Pipeline order lists
  const preparationOrders = cityFilteredOrders.filter(isPreparation);
  const readyForDispatchOrders = cityFilteredOrders.filter(isReadyForDispatch);
  const inTransitOrders = cityFilteredOrders.filter(isInTransit);
  const completedOrders = cityFilteredOrders.filter(o => isDelivered(o) || isReturned(o));
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
    
    // Call store prepareOrder which updates store & syncs to MongoDB atomically
    await prepareOrder(order.id, 'Warehouse Staging Team');

    // Automatically transition to Stage 2: Rider Assignment & Dispatch
    setActiveTab('dispatch');

    if (storeState.playNotificationSound) {
      storeState.playNotificationSound();
    }
  };

  const handleOpenAssignModal = (order: RentalOrder) => {
    setOrderToAssign(order);
    setIsReturnPickupModal(false);
    const eligibleDrivers = getEligibleDriversForOrder(order);
    const availableDriver = eligibleDrivers.find(d => !d.isBlocked);
    setSelectedDriverId(availableDriver ? availableDriver.id : (eligibleDrivers[0]?.id || ''));
    setDeliveryNotes('');
    setDeliveryDeadline('Today, 5:00 PM');
    setShowAssignModal(true);
  };

  const handleOpenReturnAssignModal = (order: RentalOrder) => {
    setOrderToAssign(order);
    setIsReturnPickupModal(true);
    const eligibleDrivers = getEligibleDriversForOrder(order);
    const availableDriver = eligibleDrivers.find(d => !d.isBlocked);
    setSelectedDriverId(availableDriver ? availableDriver.id : (eligibleDrivers[0]?.id || ''));
    setDeliveryNotes('Pickup furniture from customer address and scan barcode before releasing deposit refund');
    setDeliveryDeadline('Return Scheduled on Due Date');
    setShowAssignModal(true);
  };

  const handleConfirmAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderToAssign || !selectedDriverId) return;

    setIsAssigning(true);
    const driver = drivers.find(d => d.id === selectedDriverId);

    if (isReturnPickupModal) {
      // 1. Update local store state for Return Pickup Assignment
      const currentOrders = useRentBuddyStore.getState().orders;
      const updatedOrders = currentOrders.map(o => {
        if (o.id === orderToAssign.id) {
          return {
            ...o,
            assignedDriverId: driver?.id || selectedDriverId,
            assignedDriverName: driver?.fullName || 'Fleet Rider',
            assignedDriverPhone: driver?.phone || '',
            assignedLogisticsUser: driver?.fullName || 'Fleet Rider',
            status: 'Return Pickup' as OrderStatus,
            deliveryStatus: 'return_assigned',
            assignedAt: new Date().toISOString()
          };
        }
        return o;
      });
      useRentBuddyStore.setState({ orders: updatedOrders });

      // 2. Trigger active notification
      useRentBuddyStore.getState().triggerMockAlert(
        '🔄 Return Pickup Assigned to Rider',
        `Rider ${driver?.fullName} (${driver?.phone}) assigned to collect return furniture for Order #${orderToAssign.id} from ${orderToAssign.customerName} in ${orderToAssign.city || currentCity}.`,
        'info'
      );

      // 3. Sync to backend API
      try {
        const BACKEND_BASE = getApiBaseUrl();
        await fetch(`${BACKEND_BASE}/orders/${orderToAssign.id}/assign-driver`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ driverId: selectedDriverId, isReturn: true })
        });
      } catch (err) {
        console.warn("Backend return assign note:", err);
      }

      setIsAssigning(false);
      setAssignSuccessMessage(`✓ Return Pickup Task #${orderToAssign.id} dispatched to Rider ${driver?.fullName || 'Rider'} (${driver?.city || orderToAssign.city})! Mobile app queue updated.`);
      setTimeout(() => {
        setAssignSuccessMessage(null);
        setShowAssignModal(false);
        setIsReturnPickupModal(false);
        setOrderToAssign(null);
      }, 1500);
      return;
    }

    const assigned = await assignDriverToOrder(orderToAssign.id, selectedDriverId);
    setIsAssigning(false);

    if (assigned) {
      setAssignSuccessMessage(`✓ Dispatched Order ${orderToAssign.id} to ${driver?.fullName || 'Rider'} (${driver?.city || orderToAssign.city})! Mobile app notified.`);
      setTimeout(() => {
        setAssignSuccessMessage(null);
        setShowAssignModal(false);
        setOrderToAssign(null);
        setActiveTab('transit');
      }, 1500);
    }
  };

  const handleAcceptReturnDeposit = async (order: RentalOrder) => {
    try {
      const isConfirmed = window.confirm(`Accept return deposit and restock all furniture for Order #${order.id} into ${order.city || currentCity} warehouse inventory?`);
      if (!isConfirmed) return;

      // 1. Call Backend API
      const apiBase = getApiBaseUrl();
      const urls = [
        `${apiBase}/orders/${order.id}/accept-return-deposit`,
        `http://localhost:5001/api/v1/orders/${order.id}/accept-return-deposit`,
        `http://127.0.0.1:5001/api/v1/orders/${order.id}/accept-return-deposit`
      ];

      for (const url of urls) {
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: order.id })
          });
          if (res.ok) {
            console.log(`[RentBuddy Return] Successfully accepted return deposit via ${url}`);
            break;
          }
        } catch (err) {
          console.warn("Backend accept-return-deposit retry on:", url, err);
        }
      }

      // 2. Update local orders
      const currentOrders = useRentBuddyStore.getState().orders;
      const updatedOrders = currentOrders.map(o => {
        if (o.id === order.id) {
          return {
            ...o,
            status: 'Returned' as OrderStatus,
            deliveryStatus: 'returned',
            returnedAt: new Date().toISOString(),
            scannedAtReturn: true
          };
        }
        return o;
      });

      // 3. Mark all assets on that order as Available
      const orderAssetIds = new Set((order.items || []).map((it: any) => it.assetId || it.id));
      const currentInventory = useRentBuddyStore.getState().inventory;
      const updatedInventory = currentInventory.map(a => {
        if (orderAssetIds.has(a.id)) {
          return { ...a, status: 'Available' as any, currentCustomer: undefined, currentOrderId: undefined };
        }
        return a;
      });

      useRentBuddyStore.setState({
        orders: updatedOrders,
        inventory: updatedInventory
      });

      // 4. Play alert and notification
      useRentBuddyStore.getState().triggerMockAlert(
        '✅ Return Accepted & Inventory Restocked',
        `Order #${order.id} return completed. All furniture units are now Available in ${order.city || currentCity} Warehouse.`,
        'success'
      );

      // 5. Reload store
      await useRentBuddyStore.getState().initializeStore();
    } catch (e: any) {
      alert(`Error accepting return deposit: ${e.message}`);
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
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setPreviewPhotoOrder(order)}
                              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md transition-all hover:scale-105"
                              title="Click to view Side-by-Side POD Photos, Rider Details & Agreement Expiry"
                            >
                              <Eye className="w-3.5 h-3.5" /> View Details & POD
                            </button>
                          </div>
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
        {/* STAGE 5: RETURN PICKUPS (RENTAL EXPIRY & DEPOSIT REFUND PIPELINE)         */}
        {/* ========================================================================= */}
        {activeTab === 'returns' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl flex justify-between items-center bg-purple-100/90 border border-purple-300 shadow-sm text-slate-900">
              <div className="text-xs font-bold text-slate-900">
                🔄 <strong className="text-purple-950 font-black">Stage 5: Scheduled Return Pickups & Rental Maturity</strong> — Active furniture leases scheduled for return pickup upon contract completion. Rider verifies barcode at doorstep before security deposit release.
              </div>
              <span className="text-xs font-mono text-purple-950 font-black bg-purple-200 px-3 py-1 rounded-xl border border-purple-400">
                {returnOrders.length} Return Pickups Scheduled
              </span>
            </div>

            {returnOrders.length === 0 ? (
              <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center space-y-2 shadow-sm">
                <RotateCcw className="w-10 h-10 text-slate-400 mx-auto" />
                <h4 className="font-black text-slate-900 text-sm">No Pending Return Pickups</h4>
                <p className="text-slate-600 text-xs font-medium">When customer rental timelines mature, return pickup schedules will appear here.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl overflow-hidden shadow-lg border border-slate-200">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 border-b border-slate-200">
                      <th className="p-4 font-black uppercase tracking-wider text-slate-800">Agreement & Order ID</th>
                      <th className="p-4 font-black uppercase tracking-wider text-slate-800">Customer & Contact</th>
                      <th className="p-4 font-black uppercase tracking-wider text-slate-800">Furniture Asset & Barcode</th>
                      <th className="p-4 font-black uppercase tracking-wider text-slate-800">Contract Expiry Schedule</th>
                      <th className="p-4 font-black uppercase tracking-wider text-slate-800">Refundable Deposit</th>
                      <th className="p-4 font-black uppercase tracking-wider text-slate-800">Pickup Fleet Rider</th>
                      <th className="p-4 text-right font-black uppercase tracking-wider text-slate-800">Return Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {returnOrders.map((order) => {
                      const duration = order.durationMonths || 3;
                      const safeStart = order.startDate ? new Date(order.startDate) : null;
                      const startDate = safeStart && !isNaN(safeStart.getTime()) ? safeStart.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '26 Aug 2026';
                      
                      const targetEnd = order.endDate ? new Date(order.endDate) : new Date(Date.now() + duration * 30 * 86400000);
                      const endDate = targetEnd && !isNaN(targetEnd.getTime()) ? targetEnd.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '26 Nov 2026';
                      
                      const daysLeft = Math.ceil((targetEnd.getTime() - Date.now()) / 86400000);
                      const itemTitle = (order.items || [])[0] ? ((order.items[0] as any).name || (order.items[0] as any).assetName || order.items[0].category || 'Furniture Suite') : 'Furniture Suite';
                      const assetBarcode = (order.items || [])[0]?.assetId || 'RB-AST-101';

                        const isDepositPending = (order.status as string) === 'RETURN_DEPOSIT_PENDING' || (order.status as string) === 'Return Deposit Pending' || order.deliveryStatus === 'return_deposit_requested';

                        return (
                        <tr key={order.id} className={`hover:bg-purple-50/40 transition-colors ${isDepositPending ? 'bg-purple-50/60 border-l-4 border-l-purple-600' : 'bg-white'}`}>
                          <td className="p-4">
                            <div className="font-black text-slate-900 font-mono text-sm">{order.id}</div>
                            <span className="text-[10px] text-purple-900 font-bold bg-purple-100 px-2 py-0.5 rounded border border-purple-300 inline-block mt-1">
                              📍 {order.city || currentCity} Hub
                            </span>
                            {isDepositPending && (
                              <span className="text-[10px] text-amber-950 font-black bg-amber-200 px-2 py-0.5 rounded border border-amber-400 block mt-1 animate-pulse">
                                📥 Deposit Requested
                              </span>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="font-black text-slate-900 text-sm">{order.customerName}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-slate-700 font-mono font-bold">{order.customerMobile}</span>
                              <a
                                href={`tel:${order.customerMobile}`}
                                className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-black flex items-center gap-1 shadow-xs"
                              >
                                <Phone className="w-2.5 h-2.5" /> Call
                              </a>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="font-black text-slate-900 text-xs">{itemTitle}</div>
                            <span className="font-mono text-[11px] text-amber-950 font-black bg-amber-100 px-2 py-0.5 rounded border border-amber-300 inline-block mt-1">
                              Scan: {assetBarcode}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="text-slate-900 font-black text-xs">
                              {duration} Months Tenure
                            </div>
                            <div className="text-[11px] text-slate-700 font-bold font-mono mt-0.5">
                              Due: <strong className="text-purple-900 font-black">{endDate}</strong>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded font-black bg-purple-100 text-purple-900 border border-purple-300 mt-1 inline-block">
                              📅 {daysLeft > 0 ? `In ${daysLeft} Days` : 'Return Due'}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="font-mono font-black text-emerald-700 text-sm">
                              ₹{(order.totalDeposit || order.netDeposit || 0).toLocaleString()}
                            </div>
                            <span className="text-[10px] text-slate-600 font-bold block">Release on Depot Restock</span>
                          </td>
                          <td className="p-4">
                            {order.assignedDriverName || order.assignedLogisticsUser ? (
                              <div className="space-y-1">
                                <div className="font-black text-slate-900 flex items-center gap-1.5 text-xs">
                                  <Truck className="w-3.5 h-3.5 text-purple-700" />
                                  <span>{order.assignedDriverName || order.assignedLogisticsUser}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-slate-700 font-bold font-mono">
                                    {order.assignedDriverPhone || 'Fleet Contact'}
                                  </span>
                                  <button
                                    onClick={() => handleOpenReturnAssignModal(order)}
                                    className="text-[10px] text-purple-700 hover:text-purple-900 font-black underline cursor-pointer"
                                  >
                                    Change
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleOpenReturnAssignModal(order)}
                                className="px-2.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-[11px] flex items-center gap-1 cursor-pointer transition-all shadow-sm"
                              >
                                <Truck className="w-3 h-3" /> Assign Pickup Rider
                              </button>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {isDepositPending ? (
                                <button
                                  onClick={() => handleAcceptReturnDeposit(order)}
                                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-md animate-pulse"
                                  title="Accept Return & Restore Inventory to Available"
                                >
                                  <CheckCircle2 className="w-4 h-4" /> Accept Deposit & Restock
                                </button>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleOpenReturnAssignModal(order)}
                                    className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
                                    title="Assign Return Collection Rider for this order"
                                  >
                                    <Truck className="w-3.5 h-3.5" /> Assign Rider
                                  </button>
                                  <button
                                    onClick={() => setPreviewPhotoOrder(order)}
                                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-black text-xs flex items-center gap-1 cursor-pointer transition-all shadow-sm"
                                    title="View Delivery Proof & Product Agreement"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-cyan-300" /> View POD
                                  </button>
                                  <button
                                    onClick={() => {
                                      alert(`📲 Return pickup reminder SMS/WhatsApp dispatched to ${order.customerName} (${order.customerMobile}) for scheduled pickup on ${endDate}.`);
                                    }}
                                    className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1 cursor-pointer transition-all shadow-sm"
                                    title="Send SMS/WhatsApp pickup reminder to customer"
                                  >
                                    <Send className="w-3 h-3" /> Reminder
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* STAGE 6: CANCELLED & RESTORED INVENTORY                                   */}
        {/* ========================================================================= */}
        {activeTab === 'cancelled' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl flex justify-between items-center bg-rose-100 border border-rose-300 text-slate-900 shadow-sm">
              <div className="text-xs font-bold text-slate-900">
                🛑 <strong className="text-rose-950 font-black">Cancelled Orders & Stock Release Log</strong> — Orders cancelled by customers or warehouse staging. All allocated furniture units have been released back to Available inventory.
              </div>
              <span className="text-[11px] font-mono text-rose-950 font-black bg-rose-200 px-3 py-1 rounded-xl border border-rose-300">
                {cancelledOrders.length} Cancelled Orders
              </span>
            </div>

            {cancelledOrders.length === 0 ? (
              <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center space-y-2 shadow-sm">
                <CheckCircle2 className="w-10 h-10 text-slate-400 mx-auto" />
                <h4 className="font-black text-slate-900 text-sm">No Cancelled Orders</h4>
                <p className="text-slate-600 text-xs font-medium">All customer orders are processing smoothly through active staging and dispatch.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cancelledOrders.map((order) => (
                  <div
                    key={order.id}
                    className="p-5 bg-white rounded-2xl border border-rose-300 space-y-3 shadow-md"
                  >
                    <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                      <div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200 uppercase font-mono">
                          ✕ Cancelled & Restored
                        </span>
                        <h3 className="font-black text-slate-900 text-sm mt-1">{order.id}</h3>
                        <p className="text-[11px] text-slate-600 font-mono mt-0.5">Destination: {order.city || currentCity} Hub</p>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 font-mono">
                          Restored to Stock
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-800 font-medium">
                        <span className="text-slate-500">Customer:</span>
                        <span className="font-bold text-slate-900">{order.customerName}</span>
                      </div>
                      <div className="flex justify-between text-slate-800 font-medium">
                        <span className="text-slate-500">Phone:</span>
                        <span className="font-mono font-bold text-slate-900">{order.customerMobile}</span>
                      </div>
                      <div className="flex justify-between text-slate-800 font-medium">
                        <span className="text-slate-500">Reason:</span>
                        <span className="text-rose-700 font-semibold">{order.cancellationReason || 'Customer cancelled before dispatch'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* RICH ASSIGN DRIVER MODAL WITH STRICT CITY HUB FILTERING & HIGH CONTRAST */}
      {showAssignModal && orderToAssign && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-[580px] bg-white border-2 border-slate-300 rounded-3xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                  {isReturnPickupModal ? (
                    <>
                      <RotateCcw className="w-5 h-5 text-purple-700" /> Assign Return Pickup Task to Rider
                    </>
                  ) : (
                    <>
                      <Truck className="w-5 h-5 text-red-600" /> Assign Delivery Order to Driver
                    </>
                  )}
                </h3>
                <p className="text-[11px] text-slate-700 font-mono font-bold mt-0.5">
                  Order: <strong className="text-slate-950 font-black">#{orderToAssign.id}</strong> • {isReturnPickupModal ? 'Return Hub:' : 'Destination Hub:'} <strong className="text-purple-900 font-black">📍 {orderToAssign.city || currentCity}</strong>
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setIsReturnPickupModal(false);
                  setOrderToAssign(null);
                }}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-950 cursor-pointer transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {assignSuccessMessage ? (
              <div className="py-8 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center border-2 border-emerald-300">
                  <Check className="w-6 h-6" />
                </div>
                <h4 className="text-base font-black text-slate-900">{assignSuccessMessage}</h4>
                <p className="text-xs text-slate-600 font-medium">Task successfully transferred to the Rider's active mobile queue.</p>
              </div>
            ) : (
              <form onSubmit={handleConfirmAssignment} className="space-y-4 text-xs">
                
                {/* Customer Details Box */}
                <div className={`p-4 rounded-2xl border-2 space-y-2 ${
                  isReturnPickupModal ? 'bg-purple-50 border-purple-300' : 'bg-slate-50 border-slate-300'
                }`}>
                  <div className="flex justify-between items-center">
                    <span className={`text-[11px] font-black uppercase ${isReturnPickupModal ? 'text-purple-950' : 'text-slate-900'}`}>
                      {isReturnPickupModal ? '📍 Customer Pickup Location (Furniture Collection):' : 'Customer Destination:'}
                    </span>
                    <span className="font-mono text-purple-950 font-black text-xs">{orderToAssign.customerMobile}</span>
                  </div>
                  <div className="font-black text-slate-950 text-base">{orderToAssign.customerName}</div>
                  <div className="text-xs text-slate-800 font-bold flex items-start gap-1.5">
                    <MapPin className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span>{orderToAssign.deliveryAddress || `${orderToAssign.city || currentCity} Delivery Address`}</span>
                  </div>
                </div>

                {/* Furniture Items */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-black text-slate-900 uppercase tracking-wider block">
                    {isReturnPickupModal ? 'Return Assets to Collect from Customer:' : 'Furniture Assets to Dispatch:'} ({orderToAssign.items.length} units)
                  </span>
                  <div className="space-y-1 max-h-28 overflow-y-auto">
                    {orderToAssign.items.map((item, idx) => {
                      const asset = inventory.find(a => a.id === item.assetId);
                      return (
                        <div key={idx} className="p-2.5 rounded-xl bg-slate-100 border border-slate-300 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Package className={`w-4 h-4 ${isReturnPickupModal ? 'text-purple-700' : 'text-red-600'}`} />
                            <span className="font-black text-slate-950 text-xs">{asset ? `${asset.brand || ''} ${asset.model || asset.category}` : (item as any)?.name || item.category || 'Asset'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] text-amber-950 font-black bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                              Barcode: {asset?.barcode || item.assetId}
                            </span>
                            {isReturnPickupModal && (
                              <span className="font-mono text-xs text-emerald-800 font-black">
                                Refund: ₹{(orderToAssign.totalDeposit || orderToAssign.netDeposit || 0).toLocaleString()}
                              </span>
                            )}
                          </div>
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
                        <label className="text-slate-950 block font-black text-xs">
                          Select Rider in <span className="text-purple-900 font-black">{orderCityDisplay}</span> Hub *
                        </label>
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full font-black bg-slate-100 border border-slate-300 text-slate-800">
                          {eligibleDrivers.length} {eligibleDrivers.length === 1 ? 'Rider' : 'Riders'} in {orderCityDisplay}
                        </span>
                      </div>

                      {eligibleDrivers.length === 0 ? (
                        <div className="p-4 bg-red-50 border-2 border-red-300 text-red-950 rounded-2xl text-xs space-y-1.5 shadow-sm">
                          <div className="font-black flex items-center gap-2 text-red-950 text-xs">
                            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                            No Registered Riders Found for {orderCityDisplay}
                          </div>
                          <p className="text-[11px] text-slate-700 font-medium leading-relaxed">
                            Riders from other cities cannot be assigned to this order to prevent cross-city delivery issues. Please onboard a local rider in <span className="font-bold text-black">{orderCityDisplay}</span> before dispatching.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                          {eligibleDrivers.map((driver) => {
                            const isSelected = selectedDriverId === driver.id;
                            const activeDriverOrders = orders.filter(
                              o => (o.assignedDriverId === driver.id || o.assignedDriverPhone === driver.phone || o.assignedLogisticsUser === driver.fullName) &&
                                   (o.status === 'Assigned' || o.status === 'Out for Delivery' || o.status === 'Return Pickup')
                            );

                            return (
                              <div
                                key={driver.id}
                                onClick={() => setSelectedDriverId(driver.id)}
                                className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                                  isSelected
                                    ? isReturnPickupModal
                                      ? 'bg-purple-100 border-purple-600 shadow-md'
                                      : 'bg-red-50 border-red-600 shadow-md'
                                    : 'bg-slate-50 border-slate-200 hover:border-slate-400 hover:bg-slate-100'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-slate-300 flex items-center justify-center font-black text-slate-900 text-xs shrink-0 overflow-hidden">
                                    {driver.documents?.profilePhotoUrl ? (
                                      <img src={driver.documents.profilePhotoUrl} alt={driver.fullName} className="w-full h-full object-cover" />
                                    ) : (
                                      driver.fullName.substring(0, 2).toUpperCase()
                                    )}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h4 className="font-black text-slate-950 text-sm">{driver.fullName}</h4>
                                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-black bg-slate-200 text-slate-800 border border-slate-300">
                                        {driver.vehicleType || 'Bike'} • {driver.vehicleNumber || 'MP-09'}
                                      </span>
                                    </div>
                                    <div className="text-xs text-slate-700 font-bold flex items-center gap-2 mt-0.5">
                                      <span className="flex items-center text-amber-600 font-black">
                                        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500 inline mr-0.5" />
                                        {driver.rating || 4.9}
                                      </span>
                                      <span>•</span>
                                      <span className="font-mono text-slate-800">{driver.phone}</span>
                                      <span>•</span>
                                      <span className="text-purple-900 font-black">📍 {driver.city || orderCityDisplay} Hub</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="text-right">
                                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                                    activeDriverOrders.length === 0
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                                  }`}>
                                    {activeDriverOrders.length === 0 ? '🟢 Ready (0 Active)' : `🟡 ${activeDriverOrders.length} Active`}
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
                    <label className="text-slate-950 block mb-1 font-black">{isReturnPickupModal ? 'Return Priority' : 'Delivery Priority'}</label>
                    <select
                      value={deliveryPriority}
                      onChange={(e) => setDeliveryPriority(e.target.value as any)}
                      className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 font-bold cursor-pointer focus:border-purple-600 focus:outline-none"
                    >
                      <option value="Standard">Standard Pickup (24-48 hrs)</option>
                      <option value="Urgent">Urgent Priority (Today)</option>
                      <option value="Same-Day">Same-Day Express (4 hrs)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-950 block mb-1 font-black">Scheduled Slot</label>
                    <select
                      value={deliveryDeadline}
                      onChange={(e) => setDeliveryDeadline(e.target.value)}
                      className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 font-bold font-mono cursor-pointer focus:border-purple-600 focus:outline-none"
                    >
                      <option value="Today, 5:00 PM">Today, 5:00 PM</option>
                      <option value="Today, 8:00 PM">Today, 8:00 PM</option>
                      <option value="Tomorrow, 12:00 PM">Tomorrow, 12:00 PM</option>
                      <option value="Tomorrow, 6:00 PM">Tomorrow, 6:00 PM</option>
                      <option value="Return Scheduled on Due Date">Return Scheduled on Due Date</option>
                    </select>
                  </div>
                </div>

                {/* Dispatch Button */}
                <div className="pt-3 border-t border-slate-200 flex gap-3">
                  <button
                    type="submit"
                    disabled={isAssigning || !selectedDriverId}
                    className={`flex-1 py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-all ${
                      isAssigning || !selectedDriverId
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                        : isReturnPickupModal
                          ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-600/30 hover:scale-[1.01]'
                          : 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/30 hover:scale-[1.01]'
                    }`}
                  >
                    {isReturnPickupModal ? (
                      <>
                        <RotateCcw className="w-4 h-4" />
                        {isAssigning ? 'Dispatching Return Task...' : 'Dispatch Return Pickup Task to Rider'}
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        {isAssigning ? 'Dispatching...' : 'Dispatch Order to Rider Mobile App'}
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAssignModal(false);
                      setIsReturnPickupModal(false);
                      setOrderToAssign(null);
                    }}
                    className="py-3 px-5 rounded-xl border-2 border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black cursor-pointer transition-all"
                  >
                    Cancel
                  </button>
                </div>

              </form>
            )}
          </div>
        </div>
      )}

      {/* DELIVERY PROOF (POD) & RENTAL AGREEMENT AUDIT MODAL */}
      {previewPhotoOrder && (() => {
        const item = (previewPhotoOrder.items || [])[0];
        const assetInfo = inventory.find(a => a.id === item?.assetId || a.barcode === item?.assetId || a.id === (item as any)?.id);
        const duration = previewPhotoOrder.durationMonths || 3;
        const startDate = previewPhotoOrder.startDate 
          ? new Date(previewPhotoOrder.startDate).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' }) 
          : '26 Aug 2026';
        const endDate = previewPhotoOrder.endDate 
          ? new Date(previewPhotoOrder.endDate).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })
          : new Date(Date.now() + duration * 30 * 24 * 60 * 60 * 1000).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });

        const originalProductImg = assetInfo?.imageUrl || 
          'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80';

        const roomPodImg = previewPhotoOrder.deliveryProofPhoto || 
          'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80';

        return (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in overflow-y-auto">
            <div className="w-[820px] max-w-full my-auto bg-white border-2 border-slate-300 rounded-3xl shadow-2xl p-6 sm:p-7 space-y-5 text-slate-900">
              
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-3.5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-indigo-100 border border-indigo-300 text-indigo-800">
                    <FileCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-slate-950 text-base tracking-tight">
                        Delivery Proof (POD) & Agreement Audit
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300 uppercase font-mono">
                        ✓ Delivered & Active
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-700 font-mono font-bold mt-0.5">
                      Order ID: <strong className="text-slate-950 font-black">#{previewPhotoOrder.id}</strong> • 📍 {previewPhotoOrder.city || currentCity} Hub
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setPreviewPhotoOrder(null)}
                  className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-950 cursor-pointer transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 2-Column Info Grid: Rider Details & Customer Agreement */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* 🚚 Delivering Rider Card */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-300 space-y-2.5 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-[11px] font-black text-indigo-900 uppercase tracking-wider flex items-center gap-1">
                      <Truck className="w-4 h-4 text-indigo-700" /> Delivering Fleet Rider
                    </span>
                    <span className="text-[10px] font-mono text-emerald-900 font-black bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                      OTP Verified Handover
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="text-base font-black text-slate-950">
                      {previewPhotoOrder.assignedLogisticsUser || previewPhotoOrder.assignedDriverName || 'Faisal Rabani'}
                    </div>
                    <div className="text-xs text-slate-700 font-mono font-bold flex items-center gap-2">
                      <span>📞 {previewPhotoOrder.assignedDriverPhone || '7008452720'}</span>
                      <span>•</span>
                      <span className="text-purple-900 font-bold">📍 {previewPhotoOrder.city || currentCity} Hub</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px] pt-1">
                    <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-900 font-black flex items-center gap-1 font-mono">
                      ✓ Depot Loading Scan
                    </div>
                    <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-900 font-black flex items-center gap-1 font-mono">
                      ✓ Doorstep Handover Scan
                    </div>
                  </div>
                </div>

                {/* 👤 Customer & Rental Contract Card */}
                <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 space-y-2.5 shadow-xs">
                  <div className="flex items-center justify-between border-b border-purple-200 pb-2">
                    <span className="text-[11px] font-black text-purple-950 uppercase tracking-wider flex items-center gap-1">
                      <User className="w-4 h-4 text-purple-700" /> Customer & Rental Agreement
                    </span>
                    <span className="text-[10px] font-mono text-purple-950 font-black bg-purple-200 px-2 py-0.5 rounded border border-purple-300">
                      {duration} Months Tenure
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="text-base font-black text-slate-950">
                      {previewPhotoOrder.customerName}
                    </div>
                    <div className="text-xs text-slate-700 font-mono font-bold">
                      📞 {previewPhotoOrder.customerMobile}
                    </div>
                    <div className="text-[11px] text-slate-700 font-medium line-clamp-1">
                      📍 {previewPhotoOrder.deliveryAddress || `${previewPhotoOrder.city || currentCity} Registered Address`}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px] pt-1 font-mono">
                    <div className="p-2 rounded-lg bg-white border border-purple-200">
                      <span className="text-slate-500 block font-sans font-bold">Start Date:</span>
                      <strong className="text-slate-900 font-black">{startDate}</strong>
                    </div>
                    <div className="p-2 rounded-lg bg-white border border-purple-200">
                      <span className="text-slate-500 block font-sans font-bold">Contract Expiry:</span>
                      <strong className="text-purple-950 font-black">{endDate}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Side-by-Side Furniture Comparison */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-purple-700" /> Side-by-Side Visual Inspection Proof
                  </span>
                  <span className="text-[10px] text-emerald-800 font-black font-mono bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                    ✓ Barcode & Condition Verified
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Left: Original Warehouse Dispatch Catalog Photo */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border-2 border-slate-300 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-amber-950 uppercase tracking-wider">
                        1. Warehouse Dispatch Product Photo
                      </span>
                      <span className="text-[10px] font-mono font-black text-amber-950 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                        {assetInfo?.barcode || item?.assetId || 'RB-AST-101'}
                      </span>
                    </div>
                    <div className="w-full h-52 rounded-xl bg-slate-200 overflow-hidden border border-slate-300">
                      <img
                        src={originalProductImg}
                        alt="Original Product"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="text-xs text-slate-900 font-bold">
                      <strong className="text-slate-950 block">{assetInfo ? `${assetInfo.brand || ''} ${assetInfo.model || assetInfo.category}` : (item as any)?.name || (item as any)?.assetName || item?.category || 'Solid Wood Furniture Unit'}</strong>
                      <span className="text-[10px] text-emerald-700 block font-mono font-black">Quality Stage: Warehouse Pass ✓</span>
                    </div>
                  </div>

                  {/* Right: Driver Room Setup POD Photo */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border-2 border-slate-300 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-indigo-950 uppercase tracking-wider">
                        2. Customer Room Setup (POD Photo)
                      </span>
                      <span className="text-[10px] font-mono font-black text-indigo-950 bg-indigo-100 px-2 py-0.5 rounded border border-indigo-300">
                        Captured by Rider
                      </span>
                    </div>
                    <div className="w-full h-52 rounded-xl bg-slate-200 overflow-hidden border border-slate-300">
                      <img
                        src={roomPodImg}
                        alt="Room Setup POD"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="text-xs text-slate-900 font-bold">
                      <span className="text-emerald-800 font-black block">✓ Delivered to {previewPhotoOrder.customerName}</span>
                      <span className="text-[10px] text-slate-600 font-medium">Setup verified at customer address</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <div className="text-xs font-mono text-slate-700 font-bold">
                  Refundable Deposit: <strong className="text-emerald-700 text-sm font-black">₹{(previewPhotoOrder.totalDeposit || previewPhotoOrder.netDeposit || 0).toLocaleString()}</strong>
                </div>
                <button
                  onClick={() => setPreviewPhotoOrder(null)}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-xs cursor-pointer border border-slate-700 transition-all shadow-md"
                >
                  Close Audit
                </button>
              </div>

            </div>
          </div>
        );
      })()}

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
