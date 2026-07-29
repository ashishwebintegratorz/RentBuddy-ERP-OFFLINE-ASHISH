import React, { useState } from 'react';
import { useRentBuddyStore } from '../store/rentBuddyStore';
import type { Asset, AssetStatus } from '../types';
import { compressImage } from '../utils/compressor';
import {
  Search,
  Plus,
  X,
  MapPin,
  AlertCircle
} from 'lucide-react';

export default function InventoryManagement() {
  const {
    inventory,
    addAsset,
    updateAssetStatus,
    moveAssetWarehouse,
    currentCity,
    cities,
  } = useRentBuddyStore();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  // New Asset form state
  const [newAsset, setNewAsset] = useState({
    category: 'Bed',
    brand: '',
    model: '',
    purchaseCost: 0,
    currentValue: 0,
    securityDeposit: 0,
    monthlyRentalPrice: 0,
    warehouse: '',
    city: currentCity,
    rackNumber: '',
    barcode: '',
    qrCode: '',
    imageUrl: '',
  });

  const categories = [
    'Sofa',
    'Bed',
    'Mattress',
    'Dining Table',
    'Chair',
    'Wardrobe',
    'Refrigerator',
    'Washing Machine',
    'Study Table',
    'TV Unit',
  ];

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressedDataUrl = await compressImage(file, 300, 0.6);
      setNewAsset(prev => ({ ...prev, imageUrl: compressedDataUrl }));
    } catch (err) {
      console.error("Error compressing image:", err);
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewAsset(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAsset.brand || !newAsset.model || !newAsset.warehouse || !newAsset.city) return;

    const barcode = newAsset.barcode || `RB-${newAsset.category.replace(/\s+/g, '').toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    addAsset({
      ...newAsset,
      barcode,
      qrCode: `${barcode}-QR`,
      purchaseDate: new Date().toISOString().split('T')[0],
      currentValue: newAsset.purchaseCost,
      city: newAsset.city,
      status: 'Available',
    });

    // Reset Form
    setNewAsset({
      category: 'Bed',
      brand: '',
      model: '',
      purchaseCost: 0,
      currentValue: 0,
      securityDeposit: 0,
      monthlyRentalPrice: 0,
      warehouse: '',
      city: currentCity,
      rackNumber: '',
      barcode: '',
      qrCode: '',
      imageUrl: '',
    });
    setShowAddAsset(false);
  };

  const selectedAsset = inventory.find(a => a.id === selectedAssetId);

  // Low Stock thresholds check (Mumbai, Delhi, Indore specific)
  const lowStockAlerts = categories.map(cat => {
    const stockCount = inventory.filter(a => a.city === currentCity && a.category === cat && a.status === 'Available').length;
    return { category: cat, count: stockCount };
  }).filter(item => item.count <= 1); // 1 or less is low stock!

  // Filter lists based on City, Category, Status, Search
  const filteredAssets = inventory.filter(a => {
    const matchesCity = a.city === currentCity;
    const matchesCategory = selectedCategory === 'All' || a.category === selectedCategory;
    const matchesStatus = selectedStatus === 'All' || a.status === selectedStatus;
    const matchesSearch = a.brand.toLowerCase().includes(search.toLowerCase()) ||
                          a.model.toLowerCase().includes(search.toLowerCase()) ||
                          a.id.toLowerCase().includes(search.toLowerCase()) ||
                          a.barcode.toLowerCase().includes(search.toLowerCase());
    return matchesCity && matchesCategory && matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: AssetStatus) => {
    switch (status) {
      case 'Available':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Available</span>;
      case 'Rented':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">Rented</span>;
      case 'Reserved':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">Reserved</span>;
      case 'Under Repair':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20">Repairing</span>;
      case 'Lost':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">Lost</span>;
      case 'Scrapped':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-550/10 text-slate-400 border border-slate-700/20">Scrapped</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 flex gap-6 relative">
      
      {/* Main Inventory Panel */}
      <div className="flex-1 space-y-5">
        
        {/* Low Stock Alerts Banner */}
        {lowStockAlerts.length > 0 && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2">
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
              <AlertCircle className="w-4 h-4" /> {currentCity} Low Inventory Warning
            </span>
            <div className="flex flex-wrap gap-2 text-[10px]">
              {lowStockAlerts.map(alert => (
                <span key={alert.category} className="px-2 py-1 rounded bg-slate-900 border border-amber-500/20 text-amber-300 font-mono">
                  {alert.category}: {alert.count === 0 ? 'OUT OF STOCK' : `${alert.count} remaining`}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Filter controls */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 glass-panel p-4 rounded-2xl">
          <div className="relative w-64">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by model, brand, tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-full rounded-xl text-xs py-2 bg-slate-900/40"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Category selection */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="rounded-xl text-xs py-2 px-3 bg-slate-900/40 border border-slate-800"
            >
              <option value="All">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            {/* Status selection */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="rounded-xl text-xs py-2 px-3 bg-slate-900/40 border border-slate-800"
            >
              <option value="All">All Statuses</option>
              <option value="Available">Available</option>
              <option value="Reserved">Reserved</option>
              <option value="Rented">Rented</option>
              <option value="Under Repair">Under Repair</option>
              <option value="Lost">Lost</option>
            </select>

            <button
              onClick={() => setShowAddAsset(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold px-4 py-2 flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <Plus className="w-4 h-4" /> Add Furniture Asset
            </button>
          </div>
        </div>

        {/* Inventory list */}
        <div className="glass-panel rounded-2xl overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/40 text-slate-400 border-b border-slate-800/80">
                <th className="p-4 font-bold uppercase tracking-wider">Asset Description</th>
                <th className="p-4 font-bold uppercase tracking-wider">Rack Location</th>
                <th className="p-4 font-bold uppercase tracking-wider">Pricing (Mo / Dep)</th>
                <th className="p-4 font-bold uppercase tracking-wider">Status</th>
                <th className="p-4 font-bold uppercase tracking-wider font-mono">ROI %</th>
                <th className="p-4 font-bold uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredAssets.map(asset => {
                const roi = asset.purchaseCost > 0 ? Math.round((asset.lifecycle.revenueEarned / asset.purchaseCost) * 100) : 0;
                return (
                  <tr
                    key={asset.id}
                    onClick={() => setSelectedAssetId(asset.id)}
                    className={`hover:bg-slate-800/15 cursor-pointer transition-colors ${
                      selectedAssetId === asset.id ? 'bg-indigo-900/5' : ''
                    }`}
                  >
                    <td className="p-4">
                      <div>
                        <div className="font-bold text-white text-sm">{asset.brand} {asset.model}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5 flex gap-2">
                          <span className="font-mono text-indigo-400">{asset.id}</span>
                          <span>|</span>
                          <span>{asset.category}</span>
                          <span>|</span>
                          <span className="font-medium text-slate-400">{asset.warehouse}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-mono text-slate-300">{asset.rackNumber}</td>
                    <td className="p-4">
                      <div className="text-slate-200">Rent: ₹{asset.monthlyRentalPrice}/mo</div>
                      <div className="text-[10px] text-slate-500">Deposit: ₹{asset.securityDeposit}</div>
                    </td>
                    <td className="p-4">{getStatusBadge(asset.status)}</td>
                    <td className="p-4 font-mono font-bold text-emerald-400">{roi}%</td>
                    <td className="p-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAssetId(asset.id);
                        }}
                        className="text-indigo-400 hover:text-indigo-300 font-semibold text-[11px]"
                      >
                        Lifecycle ROI
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Asset Lifecycle & ROI Side-Panel */}
      {selectedAssetId && selectedAsset && (
        <div className="w-[380px] glass-panel border border-slate-800/90 rounded-2xl p-5 space-y-5 flex-shrink-0 animate-fade-in max-h-[85vh] overflow-y-auto z-10 text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-white text-sm">Asset Master Lifecycle</h3>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">{selectedAsset.id}</p>
            </div>
            <button
              onClick={() => setSelectedAssetId(null)}
              className="p-1 rounded bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Model Profile */}
          <div className="space-y-3">
            {selectedAsset.imageUrl ? (
              <img
                src={selectedAsset.imageUrl}
                className="w-full h-36 rounded-xl object-cover border border-slate-800/80 shadow-lg"
                alt={selectedAsset.model}
              />
            ) : (
              <div className="w-full h-24 bg-slate-900/40 rounded-xl border border-slate-800/40 flex items-center justify-center text-slate-600 font-medium">
                No custom photo uploaded (WebP format)
              </div>
            )}
            <div className="space-y-1">
              <span className="px-2 py-0.5 rounded text-[9px] bg-slate-900 border border-slate-800 text-slate-400 font-mono tracking-wider font-semibold">
                {selectedAsset.category}
              </span>
              <h4 className="font-bold text-white text-base mt-1">{selectedAsset.brand} {selectedAsset.model}</h4>
              <div className="pt-1">{getStatusBadge(selectedAsset.status)}</div>
            </div>
          </div>

          {/* Location & Tags details */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-900">
              <span className="text-[9px] text-slate-500 block font-semibold uppercase">Barcode Tag</span>
              <span className="font-mono text-slate-200 block mt-0.5">{selectedAsset.barcode}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-900">
              <span className="text-[9px] text-slate-500 block font-semibold uppercase">Rack Number</span>
              <span className="font-mono text-slate-200 block mt-0.5">{selectedAsset.rackNumber}</span>
            </div>
          </div>

          {/* ROI Telemetry (Calculated dynamically) */}
          <div className="p-4 bg-gradient-to-br from-indigo-950/30 to-purple-950/30 border border-indigo-500/25 rounded-2xl space-y-3 relative">
            <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider block">Financial ROI Performance</span>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] text-slate-400">Total Revenue Earned</span>
                <div className="text-lg font-bold text-white font-mono mt-0.5">₹{selectedAsset.lifecycle.revenueEarned.toLocaleString()}</div>
              </div>
              <div>
                <span className="text-[10px] text-slate-400">Purchase Cost</span>
                <div className="text-lg font-bold text-slate-300 font-mono mt-0.5">₹{selectedAsset.purchaseCost.toLocaleString()}</div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-indigo-900/60 text-xs">
              <span className="text-slate-400">ROI Return Metric:</span>
              <span className="font-mono font-bold text-emerald-400 text-sm">
                {selectedAsset.purchaseCost > 0 ? Math.round((selectedAsset.lifecycle.revenueEarned / selectedAsset.purchaseCost) * 100) : 0}%
              </span>
            </div>
          </div>

          {/* Details list */}
          <div className="space-y-2 bg-slate-900/10 p-3 rounded-xl border border-slate-850">
            <div className="flex justify-between text-slate-400">
              <span>Procurement Date:</span>
              <span className="text-slate-200 font-mono">{selectedAsset.purchaseDate}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Current Book Value:</span>
              <span className="text-slate-200 font-mono">₹{selectedAsset.currentValue}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Depreciation Index:</span>
              <span className="text-slate-200 font-mono">-₹100/mo</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Security Deposit:</span>
              <span className="text-slate-200 font-mono">₹{selectedAsset.securityDeposit}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Monthly Rental Fee:</span>
              <span className="text-slate-200 font-mono">₹{selectedAsset.monthlyRentalPrice}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Rentals Count:</span>
              <span className="text-slate-200 font-mono font-semibold">{selectedAsset.lifecycle.totalRentalsCount} times</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Cumulative repairs:</span>
              <span className="text-slate-200 font-mono">₹{selectedAsset.lifecycle.repairCost}</span>
            </div>
          </div>

          {/* Quick Actions (Relocate / Status change) */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <h5 className="font-bold text-slate-400 uppercase tracking-wider text-[10px] flex items-center gap-1">
              <MapPin className="w-3 h-3 text-indigo-400" /> Relocate Warehouse / Change State
            </h5>
            <div className="space-y-2.5">
              <div>
                <label className="text-[9px] text-slate-500 block mb-1">Assigned Warehouse</label>
                <select
                  value={selectedAsset.warehouse}
                  onChange={(e) => moveAssetWarehouse(selectedAsset.id, e.target.value)}
                  className="w-full text-[11px] py-1 px-2 bg-slate-950 border border-slate-850 rounded"
                >
                  <option value="Delhi Warehouse A">Delhi Warehouse A</option>
                  <option value="Delhi Warehouse B">Delhi Warehouse B</option>
                  <option value="Mumbai Central Warehouse">Mumbai Central Warehouse</option>
                  <option value="Thane Warehouse">Thane Warehouse</option>
                  <option value="Indore Bypass Warehouse">Indore Bypass Warehouse</option>
                </select>
              </div>

              <div>
                <label className="text-[9px] text-slate-500 block mb-1">State Flag Override</label>
                <select
                  value={selectedAsset.status}
                  onChange={(e) => updateAssetStatus(selectedAsset.id, e.target.value as AssetStatus)}
                  className="w-full text-[11px] py-1 px-2 bg-slate-950 border border-slate-850 rounded"
                >
                  <option value="Available">Available</option>
                  <option value="Reserved">Reserved</option>
                  <option value="Rented">Rented</option>
                  <option value="Under Repair">Under Repair</option>
                  <option value="Lost">Lost</option>
                  <option value="Scrapped">Scrapped</option>
                </select>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Add Furniture dialog modal */}
      {showAddAsset && (
        <div className="fixed inset-0 bg-[#030303]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-[500px] glass-panel border border-slate-800/90 rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">Procure New Furniture Asset</h3>
              <button
                onClick={() => setShowAddAsset(false)}
                className="p-1 rounded bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAsset} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 block font-medium">Category *</label>
                  <select
                    value={newAsset.category}
                    onChange={(e) => setNewAsset({ ...newAsset, category: e.target.value })}
                    className="w-full rounded-lg px-2.5 py-2 cursor-pointer"
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 block font-medium">Brand Name *</label>
                  <input
                    type="text"
                    required
                    value={newAsset.brand}
                    onChange={(e) => setNewAsset({ ...newAsset, brand: e.target.value })}
                    className="w-full rounded-lg px-2.5 py-2"
                    placeholder="e.g. Godrej, LG, Sleepwell"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block font-medium">Model Description *</label>
                <input
                  type="text"
                  required
                  value={newAsset.model}
                  onChange={(e) => setNewAsset({ ...newAsset, model: e.target.value })}
                  className="w-full rounded-lg px-2.5 py-2"
                  placeholder="e.g. Double door 250L, orthopaedic mattress"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 block font-medium">Purchase Cost *</label>
                  <input
                    type="number"
                    required
                    value={newAsset.purchaseCost || ''}
                    onChange={(e) => setNewAsset({ ...newAsset, purchaseCost: Number(e.target.value) })}
                    className="w-full rounded-lg px-2.5 py-2"
                    placeholder="INR"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 block font-medium">Rental Price / Month *</label>
                  <input
                    type="number"
                    required
                    value={newAsset.monthlyRentalPrice || ''}
                    onChange={(e) => setNewAsset({ ...newAsset, monthlyRentalPrice: Number(e.target.value) })}
                    className="w-full rounded-lg px-2.5 py-2"
                    placeholder="INR"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 block font-medium">Security Deposit *</label>
                  <input
                    type="number"
                    required
                    value={newAsset.securityDeposit || ''}
                    onChange={(e) => setNewAsset({ ...newAsset, securityDeposit: Number(e.target.value) })}
                    className="w-full rounded-lg px-2.5 py-2"
                    placeholder="INR"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 block font-medium">City Context *</label>
                  <select
                    value={newAsset.city}
                    onChange={(e) => setNewAsset({ ...newAsset, city: e.target.value })}
                    className="w-full rounded-lg px-2.5 py-2 cursor-pointer bg-slate-900 border border-slate-800 text-slate-200"
                    required
                  >
                    {cities.map((city) => (
                      <option key={city} value={city} className="bg-slate-900 text-slate-200">{city}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 block font-medium">Warehouse Name *</label>
                  <input
                    type="text"
                    required
                    value={newAsset.warehouse}
                    onChange={(e) => setNewAsset({ ...newAsset, warehouse: e.target.value })}
                    className="w-full rounded-lg px-2.5 py-2 bg-slate-900 border border-slate-800 text-slate-200"
                    placeholder="e.g. Surat Depot"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 block font-medium">Rack Position *</label>
                  <input
                    type="text"
                    required
                    value={newAsset.rackNumber}
                    onChange={(e) => setNewAsset({ ...newAsset, rackNumber: e.target.value })}
                    className="w-full rounded-lg px-2.5 py-2 bg-slate-900 border border-slate-800 text-slate-200"
                    placeholder="e.g. RACK-4-A"
                  />
                </div>
              </div>

              {/* Asset Photo Upload with Lossless WebP converter */}
              <div className="space-y-1.5 p-3.5 bg-slate-950/40 rounded-xl border border-slate-900">
                <label className="text-slate-400 block font-medium">Asset Image Upload (lossless auto-WebP conversion)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="text-[10px] text-slate-500 file:mr-3 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-indigo-500/20 file:text-indigo-300 hover:file:bg-indigo-500/30 cursor-pointer"
                  />
                  {newAsset.imageUrl && (
                    <div className="flex items-center gap-2">
                      <img
                        src={newAsset.imageUrl}
                        className="w-8 h-8 rounded border border-slate-800 object-cover"
                        alt="WebP preview"
                      />
                      <span className="text-[9px] text-emerald-400 font-semibold font-mono">lossless webp</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-900 text-[10px] text-slate-500 leading-normal">
                Tagging: RentBuddy automatically generates a permanent Code-128 Barcode and QR sticker matching standard formats. Barcodes cannot be edited after creation.
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold cursor-pointer"
                >
                  Procure Asset & Generate Barcode
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddAsset(false)}
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
