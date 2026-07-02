import { useState } from 'react';
import { useRentBuddyStore } from '../store/rentBuddyStore';
import {
  Wrench,
  Activity,
  Plus,
  X,
  CreditCard
} from 'lucide-react';

export default function RepairDashboard() {
  const { repairs, inventory, logRepairJob, completeRepairJob, currentCity } = useRentBuddyStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState('');
  
  // New Repair form
  const [newRepair, setNewRepair] = useState({
    technician: '',
    vendor: '',
    repairCost: 0,
    repairTimeDays: 3,
    warrantyMonths: 6,
  });

  // Filter local repairs
  const cityRepairs = repairs.filter(
    r => inventory.find(a => a.id === r.assetId)?.city === currentCity
  );

  // Available assets to repair (status Under Repair but no active repair job in progress)
  const repairCandidates = inventory.filter(
    a => a.city === currentCity && a.status === 'Under Repair' && !repairs.some(r => r.assetId === a.id && r.status === 'In Progress')
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetId || !newRepair.technician || !newRepair.vendor) return;

    logRepairJob({
      assetId: selectedAssetId,
      ...newRepair,
    });

    // Reset
    setNewRepair({
      technician: '',
      vendor: '',
      repairCost: 0,
      repairTimeDays: 3,
      warrantyMonths: 6,
    });
    setSelectedAssetId('');
    setShowAddForm(false);
  };

  const activeRepairsCount = cityRepairs.filter(r => r.status === 'In Progress').length;
  const totalRepairCostSum = cityRepairs.reduce((sum, r) => sum + r.repairCost, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 text-xs text-slate-300">
      
      {/* Repair Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-4 rounded-2xl flex justify-between items-center">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Active Repair Jobs</span>
            <span className="text-2xl font-bold text-white font-mono mt-1 block">{activeRepairsCount}</span>
          </div>
          <Activity className="w-8 h-8 text-indigo-400 opacity-80" />
        </div>

        <div className="glass-card p-4 rounded-2xl flex justify-between items-center">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Expenses (City)</span>
            <span className="text-2xl font-bold text-rose-400 font-mono mt-1 block">₹{totalRepairCostSum.toLocaleString()}</span>
          </div>
          <CreditCard className="w-8 h-8 text-rose-400 opacity-80" />
        </div>

        <div className="glass-card p-4 rounded-2xl flex justify-between items-center">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Enforcement Mode</span>
            <span className="text-emerald-400 font-bold block mt-1">In-House + Vendor SLAs</span>
          </div>
          <Wrench className="w-8 h-8 text-emerald-400 opacity-80" />
        </div>
      </div>

      {/* Header controls */}
      <div className="flex justify-between items-center glass-panel p-4 rounded-2xl">
        <span className="text-slate-400">
          Showing repair history logs and vendor tickets for <strong className="text-slate-200">{currentCity}</strong>.
        </span>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold px-4 py-2 flex items-center gap-2 cursor-pointer shadow-lg"
        >
          <Plus className="w-4 h-4" /> Log Custom Repair Ticket
        </button>
      </div>

      {/* Repairs Table */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-950/40 text-slate-400 border-b border-slate-800/80">
              <th className="p-4 font-bold uppercase tracking-wider">Repair Ticket / Asset</th>
              <th className="p-4 font-bold uppercase tracking-wider">Technician / Vendor</th>
              <th className="p-4 font-bold uppercase tracking-wider">Expenses (Warranty)</th>
              <th className="p-4 font-bold uppercase tracking-wider">Duration</th>
              <th className="p-4 font-bold uppercase tracking-wider">Status</th>
              <th className="p-4 font-bold uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {cityRepairs.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500 font-medium">No active repair tickets in this city.</td>
              </tr>
            ) : (
              cityRepairs.map(job => (
                <tr key={job.id} className="hover:bg-slate-800/10 transition-colors">
                  <td className="p-4">
                    <div>
                      <div className="font-bold text-white text-sm">{job.id}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">{job.assetName} | {job.assetBarcode}</div>
                    </div>
                  </td>
                  <td className="p-4 text-slate-300">
                    <div>{job.technician}</div>
                    <div className="text-[10px] text-slate-500">Vendor: {job.vendor}</div>
                  </td>
                  <td className="p-4">
                    <div className="text-slate-200">Cost: ₹{job.repairCost}</div>
                    <div className="text-[10px] text-slate-500">Warranty: {job.warrantyMonths} months</div>
                  </td>
                  <td className="p-4 font-mono text-slate-400">
                    {job.repairTimeDays} Days
                  </td>
                  <td className="p-4">
                    {job.status === 'Completed' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Completed</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">In Progress</span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    {job.status === 'In Progress' && (
                      <button
                        onClick={() => completeRepairJob(job.id)}
                        className="bg-emerald-600/10 hover:bg-emerald-650 border border-emerald-500/20 hover:border-emerald-500 text-emerald-400 hover:text-white px-2.5 py-1 rounded font-bold cursor-pointer transition-all"
                      >
                        Resolve Repair Ticket
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Repair Ticket Dialog Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-[#030303]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-[450px] glass-panel border border-slate-800/90 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">File Asset Repair Ticket</h3>
              <button
                onClick={() => setShowAddForm(false)}
                className="p-1 rounded bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-slate-400 block font-medium">Select Defective Asset *</label>
                <select
                  value={selectedAssetId}
                  onChange={(e) => setSelectedAssetId(e.target.value)}
                  className="w-full text-xs py-2 px-2.5 bg-slate-950 border border-slate-850 rounded"
                  required
                >
                  <option value="">-- Choose Asset under repair status --</option>
                  {repairCandidates.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.category} - {a.brand} ({a.barcode})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 block font-medium">Technician Name *</label>
                  <input
                    type="text"
                    required
                    value={newRepair.technician}
                    onChange={(e) => setNewRepair({ ...newRepair, technician: e.target.value })}
                    className="w-full rounded-lg px-2.5 py-2"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 block font-medium">Repair Vendor *</label>
                  <input
                    type="text"
                    required
                    value={newRepair.vendor}
                    onChange={(e) => setNewRepair({ ...newRepair, vendor: e.target.value })}
                    className="w-full rounded-lg px-2.5 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 block font-medium">Repair Cost (₹) *</label>
                  <input
                    type="number"
                    required
                    value={newRepair.repairCost || ''}
                    onChange={(e) => setNewRepair({ ...newRepair, repairCost: Number(e.target.value) })}
                    className="w-full rounded-lg px-2.5 py-2"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 block font-medium">Repair SLA (Days)</label>
                  <input
                    type="number"
                    value={newRepair.repairTimeDays}
                    onChange={(e) => setNewRepair({ ...newRepair, repairTimeDays: Number(e.target.value) })}
                    className="w-full rounded-lg px-2.5 py-2"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 block font-medium">Warranty (Months)</label>
                  <input
                    type="number"
                    value={newRepair.warrantyMonths}
                    onChange={(e) => setNewRepair({ ...newRepair, warrantyMonths: Number(e.target.value) })}
                    className="w-full rounded-lg px-2.5 py-2"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold cursor-pointer"
                >
                  Dispatch to Workshop
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 py-2 border border-slate-800 text-slate-300 hover:bg-slate-900 rounded-lg font-bold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
