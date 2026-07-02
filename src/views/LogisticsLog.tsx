import { useState } from 'react';
import { useRentBuddyStore } from '../store/rentBuddyStore';
import {
  Truck,
  User,
  MapPin,
  ChevronRight,
  X
} from 'lucide-react';

export default function LogisticsLog() {
  const { orders, scanAssetBarcode, updateOrderStatus, currentCity } = useRentBuddyStore();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [scanError, setScanError] = useState(false);

  const selectedOrder = orders.find(o => o.id === selectedOrderId);

  // Filter orders related to logistics (active transit stages) in current city
  const logisticsOrders = orders.filter(
    o => o.status !== 'Completed' && o.status !== 'Returned'
  );

  const handleBarcodeScan = (assetId: string, scanType: 'loading' | 'delivery' | 'pickup') => {
    if (!selectedOrderId) return;
    const success = scanAssetBarcode(selectedOrderId, assetId, scanType);
    if (success) {
      setScanSuccess(true);
      setScanError(false);
      setTimeout(() => setScanSuccess(false), 2000);
    } else {
      setScanError(true);
      setScanSuccess(false);
      setTimeout(() => setScanError(false), 2000);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 flex flex-col md:flex-row gap-6 relative text-xs text-slate-300">
      
      {/* Deliveries Directory */}
      <div className="flex-1 space-y-4">
        <div className="glass-panel p-4 rounded-2xl flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-indigo-400" /> Active Shipping & Transit Tasks ({currentCity})
          </h3>
          <span className="text-[10px] text-indigo-400 font-bold bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
            Logistics Dashboard
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {logisticsOrders.length === 0 ? (
            <div className="col-span-2 text-center py-12 text-slate-500 font-medium border border-dashed border-slate-800 rounded-2xl">
              No active logistics, delivery, or return assignments in {currentCity}.
            </div>
          ) : (
            logisticsOrders.map(order => (
              <div
                key={order.id}
                onClick={() => setSelectedOrderId(order.id)}
                className={`p-4 glass-card rounded-2xl border cursor-pointer transition-all flex flex-col justify-between h-[150px] ${
                  selectedOrderId === order.id ? 'border-indigo-500 bg-indigo-900/5 shadow-indigo-600/10 shadow-lg' : 'border-slate-800/80'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start">
                    <span className="font-mono font-bold text-white text-sm">{order.id}</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-900 text-slate-300 border border-slate-800 font-mono">
                      {order.status}
                    </span>
                  </div>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-300 text-xs">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      <span>{order.customerName}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400 text-[11px] line-clamp-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      <span>{order.customerMobile}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-800/50 pt-2 flex justify-between items-center text-[10px] text-slate-400">
                  <span>{order.items.length} units tag scan checklist</span>
                  <ChevronRight className="w-4 h-4 text-indigo-400" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Checklist Scanning Action Panel */}
      {selectedOrderId && selectedOrder && (
        <div className="w-[380px] glass-panel border border-slate-800/90 rounded-2xl p-5 space-y-5 flex-shrink-0 animate-fade-in max-h-[85vh] overflow-y-auto z-10 text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-white text-sm">Fulfillment Scanning Check</h3>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">{selectedOrder.id}</p>
            </div>
            <button
              onClick={() => setSelectedOrderId(null)}
              className="p-1 rounded bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Delivery Details */}
          <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-900 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-white text-xs">
              <User className="w-3.5 h-3.5 text-indigo-400" />
              <span>{selectedOrder.customerName}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
              <MapPin className="w-3.5 h-3.5 text-indigo-400" />
              <span>{selectedOrder.customerMobile}</span>
            </div>
            <div className="text-[11px] text-slate-400 pt-1">
              Status: <span className="font-mono font-bold text-indigo-300">{selectedOrder.status}</span>
            </div>
          </div>

          {/* Scanner Indicators */}
          {scanSuccess && (
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-center rounded-lg font-bold">
              ✓ Item Scan Validated!
            </div>
          )}

          {scanError && (
            <div className="p-2 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-center rounded-lg font-bold">
              ❌ Scanner mismatch: Item not in order agreement!
            </div>
          )}

          {/* Steps & Scan Checklists */}
          <div className="space-y-4">
            
            {/* Step 1: Loading Scan (Pending -> Assigned) */}
            <div className="space-y-2.5 p-3 rounded-xl bg-slate-900/20 border border-slate-800">
              <span className="font-bold text-slate-300 block uppercase tracking-wider text-[9px] flex justify-between">
                <span>1. Loading bay scanner (Procurement to Van)</span>
                <span>{selectedOrder.scannedAtLoading ? '✔️ Completed' : '⏳ Pending'}</span>
              </span>

              <div className="space-y-1">
                {selectedOrder.items.map(item => (
                  <div key={item.assetId} className="flex justify-between items-center bg-slate-950/40 p-2 rounded border border-slate-900">
                    <span className="font-mono text-[10px] text-slate-400">{item.assetId}</span>
                    {selectedOrder.scannedAtLoading ? (
                      <span className="text-emerald-400 font-bold">Verified</span>
                    ) : (
                      <button
                        onClick={() => handleBarcodeScan(item.assetId, 'loading')}
                        className="bg-indigo-600/25 border border-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded text-[9px] font-bold cursor-pointer"
                      >
                        Simulate Scan
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {selectedOrder.scannedAtLoading && selectedOrder.status === 'Pending' && (
                <button
                  onClick={() => updateOrderStatus(selectedOrder.id, 'Assigned')}
                  className="w-full py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-bold cursor-pointer"
                >
                  Confirm Loaded onto Vehicle
                </button>
              )}
            </div>

            {/* Step 2: Delivery Point Scan (Assigned -> Out for Delivery -> Delivered) */}
            {(selectedOrder.status === 'Assigned' || selectedOrder.status === 'Out for Delivery' || selectedOrder.status === 'Delivered') && (
              <div className="space-y-2.5 p-3 rounded-xl bg-slate-900/20 border border-slate-800">
                <span className="font-bold text-slate-300 block uppercase tracking-wider text-[9px] flex justify-between">
                  <span>2. Delivery Point scanner (Van to Customer)</span>
                  <span>{selectedOrder.scannedAtDelivery ? '✔️ Completed' : '⏳ Pending'}</span>
                </span>

                {selectedOrder.status === 'Assigned' ? (
                  <button
                    onClick={() => updateOrderStatus(selectedOrder.id, 'Out for Delivery')}
                    className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-bold cursor-pointer"
                  >
                    Set Transit: Out for Delivery
                  </button>
                ) : (
                  <>
                    <div className="space-y-1">
                      {selectedOrder.items.map(item => (
                        <div key={item.assetId} className="flex justify-between items-center bg-slate-950/40 p-2 rounded border border-slate-900">
                          <span className="font-mono text-[10px] text-slate-400">{item.assetId}</span>
                          {selectedOrder.scannedAtDelivery ? (
                            <span className="text-emerald-400 font-bold">Verified</span>
                          ) : (
                            <button
                              onClick={() => handleBarcodeScan(item.assetId, 'delivery')}
                              className="bg-indigo-600/25 border border-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded text-[9px] font-bold cursor-pointer"
                            >
                              Simulate Scan
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {selectedOrder.scannedAtDelivery && selectedOrder.status === 'Out for Delivery' && (
                      <button
                        onClick={() => updateOrderStatus(selectedOrder.id, 'Delivered')}
                        className="w-full py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold cursor-pointer"
                      >
                        Complete Handover Delivery
                      </button>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Step 3: Pickup Scan (Return stages) */}
            {(selectedOrder.status === 'Return Pickup' || selectedOrder.status === 'Returned') && (
              <div className="space-y-2.5 p-3 rounded-xl bg-slate-900/20 border border-slate-800">
                <span className="font-bold text-slate-300 block uppercase tracking-wider text-[9px] flex justify-between">
                  <span>3. Return pickup scan (Customer to Van)</span>
                  <span>{selectedOrder.scannedAtPickup ? '✔️ Completed' : '⏳ Pending'}</span>
                </span>

                <div className="space-y-1">
                  {selectedOrder.items.map(item => (
                    <div key={item.assetId} className="flex justify-between items-center bg-slate-950/40 p-2 rounded border border-slate-900">
                      <span className="font-mono text-[10px] text-slate-400">{item.assetId}</span>
                      {selectedOrder.scannedAtPickup ? (
                        <span className="text-emerald-400 font-bold">Verified</span>
                      ) : (
                        <button
                          onClick={() => handleBarcodeScan(item.assetId, 'pickup')}
                          className="bg-indigo-600/25 border border-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded text-[9px] font-bold cursor-pointer"
                        >
                          Simulate Scan
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {selectedOrder.scannedAtPickup && selectedOrder.status === 'Return Pickup' && (
                  <button
                    onClick={() => updateOrderStatus(selectedOrder.id, 'Returned')}
                    className="w-full py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-bold cursor-pointer"
                  >
                    Confirm Loaded for Return
                  </button>
                )}
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
