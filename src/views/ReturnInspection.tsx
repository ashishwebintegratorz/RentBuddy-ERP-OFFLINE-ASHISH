import { useState } from 'react';
import { useRentBuddyStore } from '../store/rentBuddyStore';
import type { InspectionResult } from '../types';
import {
  ClipboardCheck,
  User,
  X
} from 'lucide-react';

export default function ReturnInspection() {
  const { orders, inventory, submitReturnInspection, currentCity } = useRentBuddyStore();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');

  // Checklist states
  const [cleanliness, setCleanliness] = useState(true);
  const [scratches, setScratches] = useState(false);
  const [brokenParts, setBrokenParts] = useState(false);
  const [notes, setNotes] = useState('');
  const [result, setResult] = useState<InspectionResult>('Excellent');

  const selectedOrder = orders.find(o => o.id === selectedOrderId);
  
  // Filter orders that are "Returned" and pending inspection
  const returnedOrders = orders.filter(
    o => o.status === 'Returned' || o.depositRefundStatus === 'Pending Inspection'
  );

  const activeAsset = inventory.find(a => a.id === selectedAssetId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId || !selectedAssetId) return;

    submitReturnInspection({
      orderId: selectedOrderId,
      assetId: selectedAssetId,
      cleanliness,
      scratches,
      brokenParts,
      notes,
      result,
    });

    // Reset Checklist
    setCleanliness(true);
    setScratches(false);
    setBrokenParts(false);
    setNotes('');
    setResult('Excellent');
    setSelectedAssetId('');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 flex flex-col md:flex-row gap-6 relative text-xs text-slate-300">
      
      {/* Return Queue Directory */}
      <div className="flex-1 space-y-4">
        <div className="glass-panel p-4 rounded-2xl flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <ClipboardCheck className="w-4 h-4 text-red-400" /> Quality Control Return Queue ({currentCity})
          </h3>
          <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
            Awaiting Inspection
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {returnedOrders.length === 0 ? (
            <div className="col-span-2 text-center py-12 text-slate-500 font-medium border border-dashed border-slate-800 rounded-2xl">
              No returned furniture items currently in the QC queue.
            </div>
          ) : (
            returnedOrders.map(order => (
              <div
                key={order.id}
                onClick={() => {
                  setSelectedOrderId(order.id);
                  setSelectedAssetId(order.items[0]?.assetId || '');
                }}
                className={`p-4 glass-card rounded-2xl border cursor-pointer transition-all flex flex-col justify-between h-[150px] ${
                  selectedOrderId === order.id ? 'border-red-500 bg-red-900/5 shadow-red-600/10' : 'border-slate-800/80'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start">
                    <span className="font-mono font-bold text-white text-sm">{order.id}</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                      Inspection Pending
                    </span>
                  </div>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-300 text-xs">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      <span>{order.customerName}</span>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Rented: {order.items.map(i => i.category).join(', ')}
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-850 pt-2 flex justify-between items-center text-[10px] text-slate-400">
                  <span>{order.items.length} assets to check</span>
                  <span className="text-red-400 font-bold hover:underline">Start QC Checklist</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* QC Form Wizard Panel */}
      {selectedOrderId && selectedOrder && (
        <div className="w-[380px] glass-panel border border-slate-800/90 rounded-2xl p-5 space-y-4 flex-shrink-0 animate-fade-in max-h-[85vh] overflow-y-auto z-10 text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-white text-sm">QC Evaluation Sheet</h3>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">Agreement {selectedOrder.id}</p>
            </div>
            <button
              onClick={() => setSelectedOrderId(null)}
              className="p-1 rounded bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Asset Select */}
          <div className="space-y-1">
            <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Select Asset to Evaluate</label>
            <select
              value={selectedAssetId}
              onChange={(e) => setSelectedAssetId(e.target.value)}
              className="w-full text-xs py-1.5 px-2 bg-slate-950 border border-slate-850 rounded"
            >
              {selectedOrder.items.map(item => (
                <option key={item.assetId} value={item.assetId}>
                  {item.category} ({item.assetId})
                </option>
              ))}
            </select>
          </div>

          {activeAsset && (
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              {/* Asset Snapshot details */}
              <div className="p-3 bg-slate-950/40 border border-slate-900 rounded-xl space-y-1.5">
                <span className="text-[10px] font-bold text-red-400 block">{activeAsset.brand} {activeAsset.model}</span>
                <div className="text-[10px] text-slate-500 font-mono flex justify-between">
                  <span>Barcode: {activeAsset.barcode}</span>
                  <span>Rack Target: {activeAsset.rackNumber}</span>
                </div>
              </div>

              {/* Checklist inputs */}
              <div className="space-y-2">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">QC Inspection Checklist</span>
                
                {/* Cleanliness */}
                <label className="flex items-center gap-2.5 p-2 rounded bg-slate-900/20 border border-slate-850/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cleanliness}
                    onChange={(e) => setCleanliness(e.target.checked)}
                    className="w-4 h-4 text-red-600 bg-slate-950 rounded border-slate-800 focus:ring-red-500"
                  />
                  <div>
                    <span className="font-semibold block text-slate-200">Cleanliness Passed</span>
                    <span className="text-[10px] text-slate-500 block">Unit is sanitised and dust-free</span>
                  </div>
                </label>

                {/* Scratches */}
                <label className="flex items-center gap-2.5 p-2 rounded bg-slate-900/20 border border-slate-855/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={scratches}
                    onChange={(e) => setScratches(e.target.checked)}
                    className="w-4 h-4 text-red-600 bg-slate-950 rounded border-slate-800 focus:ring-red-500"
                  />
                  <div>
                    <span className="font-semibold block text-slate-200">Scratches / Cosmetic Damage</span>
                    <span className="text-[10px] text-slate-500 block">Surface dents, fabric stains or paint peel</span>
                  </div>
                </label>

                {/* Broken Parts */}
                <label className="flex items-center gap-2.5 p-2 rounded bg-slate-900/20 border border-slate-855/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={brokenParts}
                    onChange={(e) => setBrokenParts(e.target.checked)}
                    className="w-4 h-4 text-red-600 bg-slate-950 rounded border-slate-800 focus:ring-red-500"
                  />
                  <div>
                    <span className="font-semibold block text-slate-200">Structural Damage / Broken Parts</span>
                    <span className="text-[10px] text-slate-500 block">Loose joints, broken leg or motor failures</span>
                  </div>
                </label>
              </div>

              {/* Inspector notes */}
              <div className="space-y-1">
                <label className="text-slate-400 font-semibold block">Inspector Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-lg px-2 py-1.5"
                  rows={2}
                  placeholder="Describe defects or condition detail"
                />
              </div>

              {/* Final Routing decision */}
              <div className="space-y-1 bg-slate-950/40 p-3 rounded-xl border border-slate-900 space-y-2">
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Final Quality Result & Route</label>
                  <select
                    value={result}
                    onChange={(e) => setResult(e.target.value as InspectionResult)}
                    className="w-full text-xs py-1.5 px-2 bg-slate-950 border border-slate-850 rounded mt-1"
                  >
                    <option value="Excellent">Excellent (Put Back to Available Stock)</option>
                    <option value="Minor Repair">Minor Repair (Route to in-house shop)</option>
                    <option value="Major Repair">Major Repair (Route to vendor, cost incurred)</option>
                    <option value="Scrap">Scrapped (Remove from active Asset list)</option>
                  </select>
                </div>
                <div className="text-[9px] text-slate-500 leading-normal">
                  💡 Note: Selecting "Minor/Major Repair" automatically opens a repair ticket and routes asset to "Under Repair" stage.
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold cursor-pointer"
              >
                Submit Quality Evaluation Sheet
              </button>
            </form>
          )}
        </div>
      )}

    </div>
  );
}
