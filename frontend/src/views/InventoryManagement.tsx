import React, { useState } from 'react';
import { useRentBuddyStore } from '../store/rentBuddyStore';
import type { Asset, AssetStatus } from '../types';
import { compressImage } from '../utils/compressor';
import BarcodeStickerModal from '../components/BarcodeStickerModal';
import {
  Search,
  Plus,
  X,
  MapPin,
  AlertCircle,
  Edit3,
  Power,
  Ban,
  CheckCircle2,
  Image as ImageIcon,
  QrCode,
  Printer
} from 'lucide-react';
import { matchCityContext } from '../utils/cityUtils';

export default function InventoryManagement() {
  const {
    inventory,
    addAsset,
    updateAsset,
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
  const [stickerAsset, setStickerAsset] = useState<Asset | null>(null);

  // Edit Asset Modal state
  const [showEditAsset, setShowEditAsset] = useState(false);
  const [editAssetForm, setEditAssetForm] = useState<Asset | null>(null);

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

  const openEditModal = (asset: Asset) => {
    setEditAssetForm({ ...asset });
    setShowEditAsset(true);
  };

  const handleEditImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editAssetForm) return;
    try {
      const compressedDataUrl = await compressImage(file, 300, 0.6);
      setEditAssetForm(prev => prev ? ({ ...prev, imageUrl: compressedDataUrl }) : null);
    } catch (err) {
      console.error("Error compressing edit image:", err);
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditAssetForm(prev => prev ? ({ ...prev, imageUrl: reader.result as string }) : null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveEditAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editAssetForm) return;
    updateAsset(editAssetForm.id, {
      brand: editAssetForm.brand,
      model: editAssetForm.model,
      category: editAssetForm.category,
      purchaseCost: Number(editAssetForm.purchaseCost) || 0,
      monthlyRentalPrice: Number(editAssetForm.monthlyRentalPrice) || 0,
      securityDeposit: Number(editAssetForm.securityDeposit) || 0,
      city: editAssetForm.city,
      warehouse: editAssetForm.warehouse,
      rackNumber: editAssetForm.rackNumber,
      imageUrl: editAssetForm.imageUrl,
      status: editAssetForm.status,
    });
    setShowEditAsset(false);
    setEditAssetForm(null);
  };

  const handleToggleCloseAsset = (asset: Asset) => {
    if (asset.status === 'Scrapped') {
      updateAssetStatus(asset.id, 'Available');
    } else {
      updateAssetStatus(asset.id, 'Scrapped');
    }
  };

  const selectedAsset = inventory.find(a => a.id === selectedAssetId);

  // Low Stock thresholds check (Mumbai, Delhi, Indore specific)
  const lowStockAlerts = categories.map(cat => {
    const stockCount = inventory.filter(a => a.city === currentCity && a.category === cat && a.status === 'Available').length;
    return { category: cat, count: stockCount };
  }).filter(item => item.count <= 1); // 1 or less is low stock!

  // Filter lists based on City, Category, Status, Search
  const filteredAssets = (inventory || []).filter(a => {
    if (!a) return false;
    const matchesCity = matchCityContext(a.city, currentCity);
    const matchesCategory = selectedCategory === 'All' || a.category === selectedCategory;
    const matchesStatus = selectedStatus === 'All' || a.status === selectedStatus;
    const matchesSearch = (a.brand || '').toLowerCase().includes(search.toLowerCase()) ||
      (a.model || '').toLowerCase().includes(search.toLowerCase()) ||
      (a.id || '').toLowerCase().includes(search.toLowerCase()) ||
      (a.barcode || '').toLowerCase().includes(search.toLowerCase());
    return matchesCity && matchesCategory && matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: AssetStatus) => {
    switch (status) {
      case 'Available':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Available</span>;
      case 'Rented':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">Rented</span>;
      case 'Reserved':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">Reserved</span>;
      case 'Under Repair':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20">Repairing</span>;
      case 'Lost':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">Lost</span>;
      case 'Scrapped':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-700/30 text-slate-400 border border-slate-700/40">Closed / Off-Rent</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Available</span>;
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
              className="bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold px-4 py-2 flex items-center gap-2 cursor-pointer shadow-lg"
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
                const revenue = asset.lifecycle?.revenueEarned ?? 0;
                const cost = asset.purchaseCost || 1;
                const roi = Math.round((revenue / cost) * 100);
                return (
                  <tr
                    key={asset.id}
                    onClick={() => setSelectedAssetId(asset.id)}
                    className={`hover:bg-slate-800/15 cursor-pointer transition-colors ${selectedAssetId === asset.id ? 'bg-red-900/5' : ''
                      }`}
                  >
                    <td className="p-4">
                      <div>
                        <div className="font-bold text-white text-sm">
                          {asset.brand || 'RentBuddy'} {asset.model || asset.category || 'Asset'}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5 flex gap-2">
                          <span className="font-mono text-red-400">{asset.id}</span>
                          <span>|</span>
                          <span>{asset.category}</span>
                          <span>|</span>
                          <span className="font-medium text-slate-400">{asset.warehouse || 'Hub Warehouse'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-mono text-slate-300">{asset.rackNumber || 'A-01'}</td>
                    <td className="p-4">
                      <div className="text-slate-200">Rent: ₹{asset.monthlyRentalPrice || 0}/mo</div>
                      <div className="text-[10px] text-slate-500">Deposit: ₹{asset.securityDeposit || 0}</div>
                    </td>
                    <td className="p-4">{getStatusBadge(asset.status)}</td>
                    <td className="p-4 font-mono font-bold text-emerald-400">{roi}%</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setStickerAsset(asset);
                          }}
                          className="px-2 py-1 rounded-lg bg-red-600/10 text-red-400 hover:bg-red-600/20 font-semibold text-[11px] flex items-center gap-1 transition-colors cursor-pointer border border-red-500/20"
                          title="Print Barcode & QR Label Sticker"
                        >
                          <QrCode className="w-3 h-3 text-red-400" /> QR Label
                        </button>

                        {asset.status !== 'Available' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              updateAssetStatus(asset.id, 'Available');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer border border-emerald-500/40 shadow-sm"
                            title="Mark asset returned & available for renting"
                          >
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Available
                          </button>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(asset);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 font-semibold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                          title="Edit Furniture Details"
                        >
                          <Edit3 className="w-3 h-3" /> Edit
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleCloseAsset(asset);
                          }}
                          className={`px-2 py-1 rounded-lg font-semibold text-[11px] flex items-center gap-1 transition-colors cursor-pointer ${asset.status === 'Scrapped'
                              ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                              : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                            }`}
                          title={asset.status === 'Scrapped' ? 'Reactivate Asset for Renting' : 'Close / Take Off Renting Market'}
                        >
                          {asset.status === 'Scrapped' ? (
                            <><Power className="w-3 h-3" /> Reopen</>
                          ) : (
                            <><Ban className="w-3 h-3" /> Close</>
                          )}
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAssetId(asset.id);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white font-semibold text-[11px] cursor-pointer"
                        >
                          ROI
                        </button>
                      </div>
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
              <span className="font-mono text-slate-200 block mt-0.5">{selectedAsset.rackNumber || 'A-01'}</span>
            </div>
          </div>

          {/* Action Buttons: Edit, Make Available & Close Asset */}
          <div className="space-y-2 pt-1">
            {selectedAsset.status !== 'Available' && (
              <button
                onClick={() => updateAssetStatus(selectedAsset.id, 'Available')}
                className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-600/20 text-xs transition-all hover:scale-[1.02]"
              >
                <CheckCircle2 className="w-4 h-4" /> Mark Returned / Set Available
              </button>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => openEditModal(selectedAsset)}
                className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow text-xs"
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit Furniture
              </button>
              <button
                onClick={() => handleToggleCloseAsset(selectedAsset)}
                className={`flex-1 py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow text-xs ${selectedAsset.status === 'Scrapped'
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-red-950/80 hover:bg-red-900 border border-red-500/40 text-red-300'
                  }`}
              >
                {selectedAsset.status === 'Scrapped' ? (
                  <><Power className="w-3.5 h-3.5" /> Reactivate</>
                ) : (
                  <><Ban className="w-3.5 h-3.5" /> Close / Off-Rent</>
                )}
              </button>
            </div>
          </div>

          {/* ROI Telemetry (Calculated dynamically) */}
          <div className="p-4 bg-gradient-to-br from-red-950/30 to-purple-950/30 border border-red-500/25 rounded-2xl space-y-3 relative">
            <span className="text-[9px] font-bold text-red-400 uppercase tracking-wider block">Financial ROI Performance</span>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] text-slate-400">Total Revenue Earned</span>
                <div className="text-lg font-bold text-white font-mono mt-0.5">₹{(selectedAsset.lifecycle?.revenueEarned ?? 0).toLocaleString()}</div>
              </div>
              <div>
                <span className="text-[10px] text-slate-400">Purchase Cost</span>
                <div className="text-lg font-bold text-slate-300 font-mono mt-0.5">₹{(selectedAsset.purchaseCost || 0).toLocaleString()}</div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-red-900/60 text-xs">
              <span className="text-slate-400">ROI Return Metric:</span>
              <span className="font-mono font-bold text-emerald-400 text-sm">
                {(selectedAsset.purchaseCost || 0) > 0 ? Math.round(((selectedAsset.lifecycle?.revenueEarned ?? 0) / selectedAsset.purchaseCost) * 100) : 0}%
              </span>
            </div>
          </div>

          {/* Details list */}
          <div className="space-y-2 bg-slate-900/10 p-3 rounded-xl border border-slate-850">
            <div className="flex justify-between text-slate-400">
              <span>Procurement Date:</span>
              <span className="text-slate-200 font-mono">{selectedAsset.purchaseDate || 'N/A'}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Current Book Value:</span>
              <span className="text-slate-200 font-mono">₹{selectedAsset.currentValue || selectedAsset.purchaseCost || 0}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Depreciation Index:</span>
              <span className="text-slate-200 font-mono">-₹100/mo</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Security Deposit:</span>
              <span className="text-slate-200 font-mono">₹{selectedAsset.securityDeposit || 0}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Monthly Rental Fee:</span>
              <span className="text-slate-200 font-mono">₹{selectedAsset.monthlyRentalPrice || 0}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Rentals Count:</span>
              <span className="text-slate-200 font-mono font-semibold">{selectedAsset.lifecycle?.totalRentalsCount ?? 0} times</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Cumulative repairs:</span>
              <span className="text-slate-200 font-mono">₹{selectedAsset.lifecycle?.repairCost ?? 0}</span>
            </div>
          </div>

          {/* Quick Actions (Relocate / Status change) */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <h5 className="font-bold text-slate-400 uppercase tracking-wider text-[10px] flex items-center gap-1">
              <MapPin className="w-3 h-3 text-red-400" /> Relocate Warehouse / Change State
            </h5>
            <div className="space-y-2.5">
              <div>
                <label className="text-[9px] text-slate-500 block mb-1">Assigned Warehouse</label>
                <select
                  value={selectedAsset.warehouse || 'Indore Bypass Warehouse'}
                  onChange={(e) => moveAssetWarehouse(selectedAsset.id, e.target.value)}
                  className="w-full text-[11px] py-1 px-2 bg-slate-950 border border-slate-850 rounded"
                >
                  <option value="Delhi Warehouse A">Delhi Warehouse A</option>
                  <option value="Delhi Warehouse B">Delhi Warehouse B</option>
                  <option value="Mumbai Central Warehouse">Mumbai Central Warehouse</option>
                  <option value="Thane Warehouse">Thane Warehouse</option>
                  <option value="Indore Bypass Warehouse">Indore Bypass Warehouse</option>
                  <option value="Bhopal Hub Warehouse">Bhopal Hub Warehouse</option>
                  <option value="Surat Depot">Surat Depot</option>
                  <option value="Ahmedabad Depot">Ahmedabad Depot</option>
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
                  <option value="Scrapped">Closed / Off-Rent (Scrapped)</option>
                </select>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Add Furniture dialog modal */}
      {showAddAsset && (
        <div className="fixed inset-0 bg-[#030303]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-[520px] glass-panel border border-slate-800/90 rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
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
                    className="w-full rounded-lg px-2.5 py-2 cursor-pointer bg-slate-900 border border-slate-800 text-slate-200"
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
                    className="w-full rounded-lg px-2.5 py-2 bg-slate-900 border border-slate-800 text-slate-200"
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
                  className="w-full rounded-lg px-2.5 py-2 bg-slate-900 border border-slate-800 text-slate-200"
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
                    className="w-full rounded-lg px-2.5 py-2 bg-slate-900 border border-slate-800 text-slate-200"
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
                    className="w-full rounded-lg px-2.5 py-2 bg-slate-900 border border-slate-800 text-slate-200"
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
                    className="w-full rounded-lg px-2.5 py-2 bg-slate-900 border border-slate-800 text-slate-200"
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
                    className="text-[10px] text-slate-500 file:mr-3 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-red-500/20 file:text-red-300 hover:file:bg-red-500/30 cursor-pointer"
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
                Tagging: RentBuddy automatically generates a permanent Code-128 Barcode and QR sticker matching standard formats.
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold cursor-pointer shadow"
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

      {/* Edit Asset Modal */}
      {showEditAsset && editAssetForm && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-[560px] glass-panel border border-slate-700 rounded-3xl shadow-2xl p-6 space-y-4 max-h-[92vh] overflow-y-auto bg-slate-900 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-cyan-400" /> Edit Furniture Asset
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{editAssetForm.id} • Barcode: {editAssetForm.barcode || 'N/A'}</p>
              </div>
              <button
                onClick={() => {
                  setShowEditAsset(false);
                  setEditAssetForm(null);
                }}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditAsset} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-white font-bold block">Category *</label>
                  <select
                    value={editAssetForm.category}
                    onChange={(e) => setEditAssetForm({ ...editAssetForm, category: e.target.value })}
                    className="w-full rounded-xl px-3 py-2.5 cursor-pointer bg-slate-950 border border-slate-700 text-white font-medium focus:border-cyan-500 focus:outline-none"
                  >
                    {categories.map(c => <option key={c} value={c} className="bg-slate-900 text-white">{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-white font-bold block">Brand Name *</label>
                  <input
                    type="text"
                    required
                    value={editAssetForm.brand}
                    onChange={(e) => setEditAssetForm({ ...editAssetForm, brand: e.target.value })}
                    className="w-full rounded-xl px-3 py-2.5 bg-slate-950 border border-slate-700 text-white font-medium focus:border-cyan-500 focus:outline-none"
                    placeholder="e.g. Godrej, LG, Sleepwell, IKEA"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-white font-bold block">Model & Item Description *</label>
                <input
                  type="text"
                  required
                  value={editAssetForm.model}
                  onChange={(e) => setEditAssetForm({ ...editAssetForm, model: e.target.value })}
                  className="w-full rounded-xl px-3 py-2.5 bg-slate-950 border border-slate-700 text-white font-medium focus:border-cyan-500 focus:outline-none"
                  placeholder="e.g. Double door 250L, orthopaedic queen size"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-white font-bold block">Purchase Cost (₹) *</label>
                  <input
                    type="number"
                    required
                    value={editAssetForm.purchaseCost || ''}
                    onChange={(e) => setEditAssetForm({ ...editAssetForm, purchaseCost: Number(e.target.value) })}
                    className="w-full rounded-xl px-3 py-2.5 bg-slate-950 border border-slate-700 text-white font-mono font-bold focus:border-cyan-500 focus:outline-none"
                    placeholder="INR"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-white font-bold block">Monthly Rent (₹) *</label>
                  <input
                    type="number"
                    required
                    value={editAssetForm.monthlyRentalPrice || ''}
                    onChange={(e) => setEditAssetForm({ ...editAssetForm, monthlyRentalPrice: Number(e.target.value) })}
                    className="w-full rounded-xl px-3 py-2.5 bg-slate-950 border border-slate-700 text-white font-mono font-bold focus:border-cyan-500 focus:outline-none"
                    placeholder="INR"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-white font-bold block">Deposit (₹) *</label>
                  <input
                    type="number"
                    required
                    value={editAssetForm.securityDeposit || ''}
                    onChange={(e) => setEditAssetForm({ ...editAssetForm, securityDeposit: Number(e.target.value) })}
                    className="w-full rounded-xl px-3 py-2.5 bg-slate-950 border border-slate-700 text-cyan-300 font-mono font-bold focus:border-cyan-500 focus:outline-none"
                    placeholder="INR"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-white font-bold block">City Hub *</label>
                  <select
                    value={editAssetForm.city}
                    onChange={(e) => setEditAssetForm({ ...editAssetForm, city: e.target.value as any })}
                    className="w-full rounded-xl px-3 py-2.5 cursor-pointer bg-slate-950 border border-slate-700 text-white font-medium focus:border-cyan-500 focus:outline-none"
                    required
                  >
                    {cities.map((city) => (
                      <option key={city} value={city} className="bg-slate-900 text-white">{city}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-white font-bold block">Warehouse *</label>
                  <input
                    type="text"
                    required
                    value={editAssetForm.warehouse}
                    onChange={(e) => setEditAssetForm({ ...editAssetForm, warehouse: e.target.value })}
                    className="w-full rounded-xl px-3 py-2.5 bg-slate-950 border border-slate-700 text-white font-medium focus:border-cyan-500 focus:outline-none"
                    placeholder="e.g. Bhopal Main Hub"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-white font-bold block flex items-center justify-between">
                    <span>Rack Position *</span>
                    <span className="text-[10px] text-cyan-400 font-mono font-normal">Shelf location</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editAssetForm.rackNumber || ''}
                    onChange={(e) => setEditAssetForm({ ...editAssetForm, rackNumber: e.target.value })}
                    className="w-full rounded-xl px-3 py-2.5 bg-slate-950 border border-slate-700 text-white font-mono font-bold focus:border-cyan-500 focus:outline-none"
                    placeholder="e.g. RACK-4-A"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-white font-bold block">Status / Availability State</label>
                <select
                  value={editAssetForm.status}
                  onChange={(e) => setEditAssetForm({ ...editAssetForm, status: e.target.value as AssetStatus })}
                  className="w-full rounded-xl px-3 py-2.5 cursor-pointer bg-slate-950 border border-slate-700 text-white font-bold focus:border-cyan-500 focus:outline-none"
                >
                  <option value="Available" className="bg-slate-900 text-emerald-400 font-bold">Available (Ready to Rent)</option>
                  <option value="Reserved" className="bg-slate-900 text-amber-400 font-bold">Reserved (Awaiting Dispatch)</option>
                  <option value="Rented" className="bg-slate-900 text-red-400 font-bold">Rented (Active Customer Contract)</option>
                  <option value="Under Repair" className="bg-slate-900 text-orange-400 font-bold">Under Repair</option>
                  <option value="Lost" className="bg-slate-900 text-rose-400 font-bold">Lost</option>
                  <option value="Scrapped" className="bg-slate-900 text-slate-400 font-bold">Closed / Off-Rent (Take Off Market)</option>
                </select>
              </div>

              {/* Asset Photo Upload */}
              <div className="space-y-2 p-3.5 bg-slate-950 rounded-2xl border border-slate-800">
                <label className="text-white font-bold block text-xs">Update Photo (lossless WebP conversion)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleEditImageUpload}
                    className="text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-cyan-500/20 file:text-cyan-300 hover:file:bg-cyan-500/30 cursor-pointer"
                  />
                  {editAssetForm.imageUrl && (
                    <div className="flex items-center gap-2">
                      <img
                        src={editAssetForm.imageUrl}
                        className="w-10 h-10 rounded-xl border border-slate-700 object-cover shadow-sm"
                        alt="Preview"
                      />
                      <span className="text-[10px] text-cyan-400 font-semibold font-mono">Current Photo</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white rounded-xl font-bold cursor-pointer shadow-lg shadow-cyan-600/20 transition-all hover:scale-[1.02]"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditAsset(false);
                    setEditAssetForm(null);
                  }}
                  className="flex-1 py-3 border border-slate-700 text-slate-300 hover:bg-slate-800 rounded-xl font-bold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barcode & QR Code Printable Sticker Modal */}
      {stickerAsset && (
        <BarcodeStickerModal
          asset={stickerAsset}
          onClose={() => setStickerAsset(null)}
        />
      )}

    </div>
  );
}
