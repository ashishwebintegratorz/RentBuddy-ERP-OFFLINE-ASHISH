import { useState } from 'react';
import { useRentBuddyStore } from '../store/rentBuddyStore';
import { Gift, Plus, X } from 'lucide-react';

export default function RentalPackages() {
  const { packages, addPackage } = useRentBuddyStore();
  const [showAddForm, setShowAddForm] = useState(false);

  // New Package form state
  const [newPkg, setNewPkg] = useState({
    name: '',
    description: '',
    offerPrice: 0,
    securityDeposit: 0,
    discountPercent: 10,
    durationMonths: 6,
  });

  const [categoriesInput, setCategoriesInput] = useState([
    { category: 'Bed', quantity: 1 },
    { category: 'Study Table', quantity: 1 },
  ]);

  const handleAddCategoryRow = () => {
    setCategoriesInput([...categoriesInput, { category: 'Chair', quantity: 1 }]);
  };

  const handleRemoveCategoryRow = (idx: number) => {
    setCategoriesInput(categoriesInput.filter((_, i) => i !== idx));
  };

  const handleRowChange = (idx: number, field: 'category' | 'quantity', val: any) => {
    const updated = categoriesInput.map((row, i) => {
      if (i === idx) {
        return {
          ...row,
          [field]: field === 'quantity' ? Number(val) : val,
        };
      }
      return row;
    });
    setCategoriesInput(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPkg.name || !newPkg.description) return;

    addPackage({
      ...newPkg,
      includedAssets: categoriesInput,
    });

    // Reset Form
    setNewPkg({
      name: '',
      description: '',
      offerPrice: 0,
      securityDeposit: 0,
      discountPercent: 10,
      durationMonths: 6,
    });
    setCategoriesInput([{ category: 'Bed', quantity: 1 }]);
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 text-xs text-slate-300">
      
      {/* Header */}
      <div className="flex justify-between items-center glass-panel p-4 rounded-2xl">
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Gift className="w-4 h-4 text-indigo-400" /> Admin Rental Package Bundles
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">Preconfigure multi-furniture discount packages for students, corporates and office setups.</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold px-4 py-2 flex items-center gap-2 cursor-pointer shadow-lg"
        >
          <Plus className="w-4 h-4" /> Create Bundle Package
        </button>
      </div>

      {/* Packages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {packages.map(pkg => (
          <div key={pkg.id} className="glass-card p-5 rounded-2xl flex flex-col justify-between h-[300px] border border-slate-800 relative">
            <div className="absolute top-4 right-4 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded font-mono text-[9px] font-bold">
              {pkg.id}
            </div>

            <div className="space-y-3">
              <div>
                <h4 className="font-bold text-white text-base leading-snug">{pkg.name}</h4>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{pkg.description}</p>
              </div>

              {/* Included items */}
              <div className="space-y-1 bg-slate-950/40 p-2.5 rounded-xl border border-slate-900">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Bundle Contents</span>
                <div className="space-y-1 font-mono text-[10px] text-slate-300">
                  {pkg.includedAssets.map((asset, i) => (
                    <div key={i} className="flex justify-between">
                      <span>• {asset.category}</span>
                      <span className="text-slate-500">Qty: {asset.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Financial Details */}
            <div className="border-t border-slate-850 pt-3 flex justify-between items-end">
              <div>
                <span className="text-[10px] text-slate-500 block">Offer Price</span>
                <span className="text-lg font-black text-white font-mono leading-none">₹{pkg.offerPrice}</span>
                <span className="text-[9px] text-slate-500 font-mono">/mo</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 block">Security Deposit</span>
                <span className="text-sm font-bold text-slate-300 font-mono">₹{pkg.securityDeposit}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Package Dialog Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-[#030303]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-[500px] glass-panel border border-slate-800/90 rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">Configure Custom Rental Bundle</h3>
              <button
                onClick={() => setShowAddForm(false)}
                className="p-1 rounded bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-slate-400 block font-medium">Package Name *</label>
                <input
                  type="text"
                  required
                  value={newPkg.name}
                  onChange={(e) => setNewPkg({ ...newPkg, name: e.target.value })}
                  placeholder="e.g. Student Essential Package"
                  className="w-full rounded-lg px-2.5 py-2"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block font-medium">Description *</label>
                <textarea
                  required
                  value={newPkg.description}
                  onChange={(e) => setNewPkg({ ...newPkg, description: e.target.value })}
                  placeholder="Summarize package inclusions..."
                  className="w-full rounded-lg px-2.5 py-2"
                  rows={2}
                />
              </div>

              {/* Dynamic asset categories layout */}
              <div className="space-y-2 p-3 bg-slate-950/40 rounded-xl border border-slate-900">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider">Bundle Composition *</span>
                  <button
                    type="button"
                    onClick={handleAddCategoryRow}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold"
                  >
                    + Add Row
                  </button>
                </div>

                <div className="space-y-2">
                  {categoriesInput.map((row, idx) => (
                    <div key={idx} className="flex gap-2">
                      <select
                        value={row.category}
                        onChange={(e) => handleRowChange(idx, 'category', e.target.value)}
                        className="flex-1 text-[11px] py-1 bg-slate-950 border border-slate-850 rounded"
                      >
                        <option value="Bed">Bed</option>
                        <option value="Mattress">Mattress</option>
                        <option value="Sofa">Sofa</option>
                        <option value="Chair">Ergonomic Chair</option>
                        <option value="Study Table">Study Table</option>
                        <option value="Refrigerator">Refrigerator</option>
                        <option value="Washing Machine">Washing Machine</option>
                        <option value="TV Unit">TV Unit</option>
                      </select>
                      <input
                        type="number"
                        min="1"
                        value={row.quantity}
                        onChange={(e) => handleRowChange(idx, 'quantity', e.target.value)}
                        className="w-16 rounded bg-slate-950 border border-slate-855 px-2 text-center text-xs"
                      />
                      {categoriesInput.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveCategoryRow(idx)}
                          className="text-rose-400 hover:text-rose-300 p-1"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 block font-medium">Monthly Offer Price *</label>
                  <input
                    type="number"
                    required
                    value={newPkg.offerPrice || ''}
                    onChange={(e) => setNewPkg({ ...newPkg, offerPrice: Number(e.target.value) })}
                    className="w-full rounded-lg px-2.5 py-2"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 block font-medium">Bundle Deposit *</label>
                  <input
                    type="number"
                    required
                    value={newPkg.securityDeposit || ''}
                    onChange={(e) => setNewPkg({ ...newPkg, securityDeposit: Number(e.target.value) })}
                    className="w-full rounded-lg px-2.5 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 block font-medium">Discount (%)</label>
                  <input
                    type="number"
                    value={newPkg.discountPercent}
                    onChange={(e) => setNewPkg({ ...newPkg, discountPercent: Number(e.target.value) })}
                    className="w-full rounded-lg px-2.5 py-2"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 block font-medium">Default Term (Months)</label>
                  <input
                    type="number"
                    value={newPkg.durationMonths}
                    onChange={(e) => setNewPkg({ ...newPkg, durationMonths: Number(e.target.value) })}
                    className="w-full rounded-lg px-2.5 py-2"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold cursor-pointer"
                >
                  Create Preset Bundle
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
