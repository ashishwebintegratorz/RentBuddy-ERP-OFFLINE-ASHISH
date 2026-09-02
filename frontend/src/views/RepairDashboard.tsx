import React, { useState } from 'react';
import { useRentBuddyStore } from '../store/rentBuddyStore';
import { matchCityContext } from '../utils/cityUtils';
import {
  Wrench,
  Activity,
  Plus,
  X,
  CreditCard,
  MapPin,
  CheckCircle2,
  Clock,
  Building,
  ShieldCheck,
  Tag,
  AlertTriangle,
  User,
  Calendar,
  Layers,
  Search,
  Filter
} from 'lucide-react';

export default function RepairDashboard() {
  const { 
    repairs = [], 
    inventory = [], 
    logRepairJob, 
    completeRepairJob, 
    currentCity,
    cities = ['Indore (Head Office)', 'Bhopal', 'Surat', 'Ahmedabad']
  } = useRentBuddyStore();

  const [selectedCityFilter, setSelectedCityFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  
  // New Repair form state
  const [modalCity, setModalCity] = useState<string>(currentCity === 'All Cities (Global View)' || currentCity === 'All' ? 'Indore (Head Office)' : currentCity);
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [customAssetName, setCustomAssetName] = useState('');
  const [defectType, setDefectType] = useState('Wood Joint Loose / Polish Wear');
  const [priority, setPriority] = useState<'Standard' | 'Urgent' | 'Critical'>('Standard');
  const [newRepair, setNewRepair] = useState({
    technician: '',
    vendor: 'RentBuddy In-House Workshop',
    repairCost: 450,
    repairTimeDays: 3,
    warrantyMonths: 6,
  });

  // Filter repairs by City, Search, and Status
  const filteredRepairs = (repairs || []).filter(job => {
    if (!job) return false;
    const linkedAsset = (inventory || []).find(a => a.id === job.assetId || a.barcode === job.assetBarcode);
    const jobCity = (job as any).city || linkedAsset?.city || 'Indore (Head Office)';

    const matchesCity = selectedCityFilter === 'All'
      ? (currentCity === 'All Cities (Global View)' || currentCity === 'All' ? true : matchCityContext(jobCity, currentCity))
      : matchCityContext(jobCity, selectedCityFilter);

    const matchesStatus = statusFilter === 'All' || job.status === statusFilter;

    const query = search.toLowerCase();
    const matchesSearch = 
      (job.id || '').toLowerCase().includes(query) ||
      (job.assetName || '').toLowerCase().includes(query) ||
      (job.assetBarcode || '').toLowerCase().includes(query) ||
      (job.technician || '').toLowerCase().includes(query) ||
      (job.vendor || '').toLowerCase().includes(query);

    return matchesCity && matchesStatus && matchesSearch;
  });

  // Available assets for the chosen modal city
  const cityAssets = (inventory || []).filter(a => {
    return matchCityContext(a.city, modalCity);
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetId && !customAssetName) return;

    const chosenAsset = inventory.find(a => a.id === selectedAssetId);
    const assetName = (chosenAsset as any)?.name || chosenAsset?.category || customAssetName || 'Furniture Unit';
    const assetBarcode = chosenAsset?.barcode || selectedAssetId;

    logRepairJob({
      assetId: selectedAssetId || `CUSTOM-${Date.now()}`,
      ...newRepair,
      ...({
        city: modalCity,
        assetName,
        assetBarcode,
        defectType,
        priority
      } as any)
    });

    // Reset Form
    setNewRepair({
      technician: '',
      vendor: 'RentBuddy In-House Workshop',
      repairCost: 450,
      repairTimeDays: 3,
      warrantyMonths: 6,
    });
    setSelectedAssetId('');
    setCustomAssetName('');
    setShowAddForm(false);
  };

  const activeRepairsCount = filteredRepairs.filter(r => r.status === 'In Progress').length;
  const completedRepairsCount = filteredRepairs.filter(r => r.status === 'Completed').length;
  const totalRepairCostSum = filteredRepairs.reduce((sum, r) => sum + (r.repairCost || 0), 0);

  const getCityHubBadge = (city?: string) => {
    const clean = (city || currentCity || 'Indore').replace(/\(.*?\)/g, '').trim();
    return `${clean} Hub`;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 text-xs text-slate-300">
      
      {/* Repair Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-4 rounded-2xl flex justify-between items-center border border-slate-700/80 bg-slate-900/90 shadow-lg">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Active Repair Jobs</span>
            <span className="text-2xl font-black text-amber-400 font-mono mt-1 block">{activeRepairsCount} Jobs</span>
            <span className="text-[10px] text-slate-500">{completedRepairsCount} completed previously</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl flex justify-between items-center border border-slate-700/80 bg-slate-900/90 shadow-lg">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Repair Expenses</span>
            <span className="text-2xl font-black text-rose-400 font-mono mt-1 block">₹{totalRepairCostSum.toLocaleString()}</span>
            <span className="text-[10px] text-slate-500">Workshop & Vendor SLA costs</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl flex justify-between items-center border border-slate-700/80 bg-slate-900/90 shadow-lg">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Workshop Enforcement</span>
            <span className="text-sm font-bold text-emerald-400 block mt-1">SLA Guarantee & Warranty</span>
            <span className="text-[10px] text-slate-500">In-house + Certified Vendor Network</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Header Search & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-4 rounded-2xl border border-slate-700/80 bg-slate-900/90 shadow-lg">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by ticket ID, asset name, barcode, technician, vendor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 w-full rounded-xl py-2 bg-slate-950/80 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-red-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl text-xs py-2 px-3 bg-slate-950/80 border border-slate-800 text-slate-300 cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>

          <button
            onClick={() => {
              setModalCity(currentCity === 'All Cities (Global View)' || currentCity === 'All' ? 'Indore (Head Office)' : currentCity);
              setShowAddForm(true);
            }}
            className="bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold px-4 py-2 flex items-center gap-2 cursor-pointer shadow-lg shadow-red-600/20 transition-all hover:scale-105 active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" /> Log Custom Repair Ticket
          </button>
        </div>
      </div>

      {/* Repairs & Vendor Tickets Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-slate-700/80 bg-slate-900/90 shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                <th className="p-4 font-bold uppercase tracking-wider">Ticket / Asset</th>
                <th className="p-4 font-bold uppercase tracking-wider">Hub Location</th>
                <th className="p-4 font-bold uppercase tracking-wider">Technician / Vendor</th>
                <th className="p-4 font-bold uppercase tracking-wider">Cost & Warranty</th>
                <th className="p-4 font-bold uppercase tracking-wider">Turnaround SLA</th>
                <th className="p-4 font-bold uppercase tracking-wider">Status</th>
                <th className="p-4 font-bold uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredRepairs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400">
                    <Wrench className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    No repair tickets found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredRepairs.map(job => (
                  <tr key={job.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="p-4">
                      <div>
                        <div className="font-bold text-white text-sm">{job.id}</div>
                        <div className="text-[11px] text-slate-300 font-medium mt-0.5">{job.assetName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">Barcode: {job.assetBarcode}</div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/25">
                        <MapPin className="w-3 h-3 text-red-400" />
                        <span>{getCityHubBadge((job as any).city)}</span>
                      </span>
                    </td>
                    <td className="p-4 text-slate-300">
                      <div className="font-semibold text-white">{job.technician || 'Technician'}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Building className="w-3 h-3 text-slate-500" /> {job.vendor || 'Workshop'}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-rose-400 font-bold font-mono">₹{(job.repairCost || 0).toLocaleString()}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{job.warrantyMonths || 6} mo warranty</div>
                    </td>
                    <td className="p-4 font-mono text-slate-300">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{job.repairTimeDays || 3} Days SLA</span>
                      </div>
                    </td>
                    <td className="p-4">
                      {job.status === 'Completed' ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          ✓ Completed
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                          ⏳ In Progress
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      {job.status !== 'Completed' ? (
                        <button
                          onClick={() => completeRepairJob(job.id)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer shadow-md transition-all hover:scale-105 active:scale-95"
                        >
                          Resolve Ticket
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-500 font-mono">Resolved</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Custom Repair Ticket Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 text-slate-100 rounded-3xl p-6 shadow-2xl border border-slate-700/80 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-white">Log Asset Repair Ticket</h3>
                  <p className="text-[10px] text-slate-400">Dispatch furniture to certified workshop/vendor</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddForm(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              
              {/* City Hub Selection */}
              <div className="space-y-1">
                <label className="text-slate-400 font-bold block">1. City Hub Context *</label>
                <select
                  value={modalCity}
                  onChange={(e) => {
                    setModalCity(e.target.value);
                    setSelectedAssetId('');
                  }}
                  className="w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-red-400 font-bold focus:outline-none focus:border-red-500 cursor-pointer"
                  required
                >
                  {cities.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Asset Selection */}
              <div className="space-y-1">
                <label className="text-slate-400 font-bold block">2. Select Asset from Inventory *</label>
                <select
                  value={selectedAssetId}
                  onChange={(e) => setSelectedAssetId(e.target.value)}
                  className="w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-red-500 cursor-pointer"
                >
                  <option value="">-- Choose Asset from {getCityHubBadge(modalCity)} --</option>
                  {cityAssets.map(a => (
                    <option key={a.id} value={a.id}>
                      {(a as any).name || a.category} ({a.brand || 'RentBuddy'}) — {a.barcode} [Status: {a.status}]
                    </option>
                  ))}
                </select>
                {!selectedAssetId && (
                  <input
                    type="text"
                    placeholder="Or type custom asset description..."
                    value={customAssetName}
                    onChange={(e) => setCustomAssetName(e.target.value)}
                    className="w-full mt-1.5 py-1.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs placeholder-slate-500"
                  />
                )}
              </div>

              {/* Defect / Damage Type */}
              <div className="space-y-1">
                <label className="text-slate-400 font-bold block">3. Defect & Repair Type</label>
                <select
                  value={defectType}
                  onChange={(e) => setDefectType(e.target.value)}
                  className="w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 cursor-pointer"
                >
                  <option value="Wood Joint Loose / Polish Wear">Wood Joint Loose / Polish Wear</option>
                  <option value="Fabric Tear / Cushion Replacement">Fabric Tear / Cushion Replacement</option>
                  <option value="Compressor Gas Leak / Cooling Coil">Compressor Gas Leak / Cooling Coil</option>
                  <option value="Motor Malfunction / Drum Alignment">Motor Malfunction / Drum Alignment</option>
                  <option value="Display Panel / Electrical Short">Display Panel / Electrical Short</option>
                  <option value="Structural Frame Bend / Screw Missing">Structural Frame Bend / Screw Missing</option>
                  <option value="General Preventive Maintenance">General Preventive Maintenance</option>
                </select>
              </div>

              {/* Technician & Vendor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold block">Technician Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mahesh Soni (Master Tech)"
                    value={newRepair.technician}
                    onChange={(e) => setNewRepair({ ...newRepair, technician: e.target.value })}
                    className="w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold block">Authorized Vendor / Workshop *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Wood Crafts / CoolTech"
                    value={newRepair.vendor}
                    onChange={(e) => setNewRepair({ ...newRepair, vendor: e.target.value })}
                    className="w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500"
                  />
                </div>
              </div>

              {/* Cost, SLA, Warranty */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold block">Cost (₹) *</label>
                  <input
                    type="number"
                    required
                    value={newRepair.repairCost || ''}
                    onChange={(e) => setNewRepair({ ...newRepair, repairCost: Number(e.target.value) })}
                    className="w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                    placeholder="450"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold block">SLA (Days)</label>
                  <input
                    type="number"
                    value={newRepair.repairTimeDays}
                    onChange={(e) => setNewRepair({ ...newRepair, repairTimeDays: Number(e.target.value) })}
                    className="w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold block">Warranty (Mo)</label>
                  <input
                    type="number"
                    value={newRepair.warrantyMonths}
                    onChange={(e) => setNewRepair({ ...newRepair, warrantyMonths: Number(e.target.value) })}
                    className="w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                  />
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex gap-3 pt-3 border-t border-slate-800">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold cursor-pointer shadow-lg shadow-red-600/30 transition-all hover:scale-105"
                >
                  Dispatch to Workshop
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="py-2.5 px-5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold cursor-pointer transition-colors"
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
