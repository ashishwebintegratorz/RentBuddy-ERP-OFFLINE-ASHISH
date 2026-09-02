import React, { useState } from 'react';
import { useRentBuddyStore } from '../store/rentBuddyStore';
import { FileText, Plus, ShoppingCart, Percent, User, Phone, Mail, MapPin, Calendar, CheckCircle2, Printer, ArrowRight, Trash } from 'lucide-react';
import type { CityName } from '../types';

interface QuotationItem {
  id: string;
  category: string;
  brand: string;
  monthlyRentalPrice: number;
  securityDeposit: number;
  isCustom?: boolean;
}

export default function Quotations() {
  const { inventory, currentCity, organizationConfig } = useRentBuddyStore();

  // Quotation form states
  const [custName, setCustName] = useState('');
  const [custMobile, setCustMobile] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [selectedCity, setSelectedCity] = useState<CityName>(currentCity);
  const [duration, setDuration] = useState<number>(3);
  
  // Custom Product inline creator states
  const [customName, setCustomName] = useState('');
  const [customBrand, setCustomBrand] = useState('');
  const [customRent, setCustomRent] = useState<number | ''>('');
  const [customDeposit, setCustomDeposit] = useState<number | ''>('');

  // Cart items list (Catalog selected + Manual custom items)
  const [cartItems, setCartItems] = useState<QuotationItem[]>([]);

  // Global discounts
  const [rentDiscountType, setRentDiscountType] = useState<'flat' | 'percent'>('flat');
  const [rentDiscount, setRentDiscount] = useState<number>(0);
  const [depDiscountType, setDepDiscountType] = useState<'flat' | 'percent'>('flat');
  const [depDiscount, setDepDiscount] = useState<number>(0);

  // Generated estimate state
  const [generatedQuotation, setGeneratedQuotation] = useState<any | null>(null);

  // Available catalog assets
  const availableInventory = inventory.filter(
    a => a.city === selectedCity && a.status === 'Available' && !cartItems.some(ci => ci.id === a.id)
  );

  // Calculations
  const totalDeposit = cartItems.reduce((sum, item) => sum + (Number(item.securityDeposit) || 0), 0);
  const totalMonthlyRent = cartItems.reduce((sum, item) => sum + (Number(item.monthlyRentalPrice) || 0), 0);

  const rentDiscountAmt = rentDiscountType === 'percent'
    ? Math.round(totalMonthlyRent * (rentDiscount / 100))
    : rentDiscount;
  const netMonthlyRent = Math.max(0, totalMonthlyRent - rentDiscountAmt);

  const depDiscountAmt = depDiscountType === 'percent'
    ? Math.round(totalDeposit * (depDiscount / 100))
    : depDiscount;
  const netDeposit = Math.max(0, totalDeposit - depDiscountAmt);
  const firstPaymentTotal = netDeposit + netMonthlyRent;

  // Add catalog item to cart
  const handleAddCatalogItem = (asset: any) => {
    if (cartItems.some(item => item.id === asset.id)) return;
    const newItem: QuotationItem = {
      id: asset.id,
      category: asset.category,
      brand: asset.brand,
      monthlyRentalPrice: asset.monthlyRentalPrice,
      securityDeposit: asset.securityDeposit,
      isCustom: false,
    };
    setCartItems([...cartItems, newItem]);
  };

  // Add custom manual item to cart
  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName) return;

    const newItem: QuotationItem = {
      id: `RB-CUST-${Math.floor(1000 + Math.random() * 9000)}`,
      category: customName,
      brand: customBrand || 'Custom Product',
      monthlyRentalPrice: Number(customRent) || 0,
      securityDeposit: Number(customDeposit) || 0,
      isCustom: true,
    };

    setCartItems([...cartItems, newItem]);
    setCustomName('');
    setCustomBrand('');
    setCustomRent('');
    setCustomDeposit('');
  };

  // Update item-level fields directly in cart
  const handleUpdateItemValue = (id: string, key: 'monthlyRentalPrice' | 'securityDeposit', value: number) => {
    setCartItems(cartItems.map(item => item.id === id ? { ...item, [key]: value } : item));
  };

  // Remove item from cart
  const handleRemoveItem = (id: string) => {
    setCartItems(cartItems.filter(item => item.id !== id));
  };

  // Generate Quotation
  const handleGenerateQuotation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName || !custMobile || cartItems.length === 0) return;

    const qtnId = `RB-QTN-${Math.floor(100000 + Math.random() * 900000)}`;
    setGeneratedQuotation({
      id: qtnId,
      customer: {
        fullName: custName,
        mobileNumber: custMobile,
        email: custEmail,
        city: selectedCity,
      },
      duration,
      items: [...cartItems],
      totalDeposit,
      depDiscountType,
      depDiscount,
      depDiscountAmt,
      netDeposit,
      totalMonthlyRent,
      rentDiscountType,
      rentDiscount,
      rentDiscountAmt,
      netMonthlyRent,
      firstPaymentTotal,
      date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
      validity: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 print:bg-white print:text-slate-900 print:p-0">
      {/* Title Header */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <FileText className="w-5.5 h-5.5 text-red-400" />
            Estimate & Quotation Portal
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            Draft, review, and print custom-product estimate quotations with item-level pricing overrides
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 print:block">
        {/* Left Side: Creation Panel */}
        <div className="xl:col-span-2 space-y-6 print:hidden">
          <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-4">
            
            {/* Header info */}
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded bg-red-500/10"><Plus className="w-4.5 h-4.5 text-red-400" /></div>
              <div>
                <h3 className="text-sm font-bold text-white">Create New Quotation</h3>
                <p className="text-[10px] text-slate-400 font-medium">Configure customer lead details and rental terms</p>
              </div>
            </div>

            {/* Customer fields */}
            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Customer Name</label>
                <input
                  type="text"
                  required
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  placeholder="Prospective customer full name"
                  className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 focus:border-[#00ab55] rounded-xl text-xs font-semibold text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Mobile Number</label>
                  <input
                    type="text"
                    required
                    value={custMobile}
                    onChange={(e) => setCustMobile(e.target.value)}
                    placeholder="E.g., +91 99071"
                    className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 focus:border-[#00ab55] rounded-xl text-xs font-semibold text-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Email ID</label>
                  <input
                    type="email"
                    value={custEmail}
                    onChange={(e) => setCustEmail(e.target.value)}
                    placeholder="customer@domain.com"
                    className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 focus:border-[#00ab55] rounded-xl text-xs font-semibold text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Hub Context</label>
                  <select
                    value={selectedCity}
                    onChange={(e) => {
                      setSelectedCity(e.target.value as CityName);
                      setCartItems([]);
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-[#00ab55] rounded-xl text-xs font-semibold text-slate-300 focus:outline-none cursor-pointer"
                  >
                    <option value="Indore (Head Office)">Indore</option>
                    <option value="Bhopal Hub">Bhopal</option>
                    <option value="Surat Hub">Surat</option>
                    <option value="Ahmedabad Hub">Ahmedabad</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Rental Duration</label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-[#00ab55] rounded-xl text-xs font-semibold text-slate-300 focus:outline-none cursor-pointer"
                  >
                    <option value={2}>2 Months (Min)</option>
                    <option value={3}>3 Months</option>
                    <option value={6}>6 Months</option>
                    <option value={12}>12 Months</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Custom Product Creator Form */}
            <div className="p-3.5 bg-slate-950/40 rounded-xl border border-slate-900 space-y-3 pt-2">
              <span className="font-bold text-red-400 block uppercase tracking-wider text-[9px]">Add Custom Item (Manual Add)</span>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Item Name (e.g. Chair)"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-[10px] text-white focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Brand/Model"
                  value={customBrand}
                  onChange={(e) => setCustomBrand(e.target.value)}
                  className="w-full px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-[10px] text-white focus:outline-none"
                />
                <input
                  type="number"
                  placeholder="Rent (₹)"
                  value={customRent}
                  onChange={(e) => setCustomRent(e.target.value !== '' ? Number(e.target.value) : '')}
                  className="w-full px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-[10px] text-white focus:outline-none"
                />
                <input
                  type="number"
                  placeholder="Deposit (₹)"
                  value={customDeposit}
                  onChange={(e) => setCustomDeposit(e.target.value !== '' ? Number(e.target.value) : '')}
                  className="w-full px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-[10px] text-white focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={handleAddCustomItem}
                disabled={!customName}
                className="w-full py-1 bg-red-600/25 hover:bg-red-600/45 border border-red-500/20 text-red-300 text-[10px] font-bold rounded-lg transition-all cursor-pointer disabled:opacity-40"
              >
                + Add Custom Item
              </button>
            </div>

            {/* Catalog Selector */}
            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Or Select Available Catalog Items ({selectedCity})</label>
              {availableInventory.length === 0 ? (
                <div className="text-[10px] text-slate-500 text-center py-2 font-medium">No available items.</div>
              ) : (
                <div className="grid grid-cols-2 gap-2 max-h-[110px] overflow-y-auto pr-1">
                  {availableInventory.map(asset => (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => handleAddCatalogItem(asset)}
                      className="text-left p-2 bg-slate-950 hover:bg-red-950/20 border border-slate-850 rounded-xl text-[10px] text-slate-300 flex justify-between items-center transition-colors cursor-pointer"
                    >
                      <span className="truncate flex-1 font-semibold">{asset.brand} {asset.category}</span>
                      <span className="font-mono text-red-400 pl-1 text-[9px]">₹{asset.monthlyRentalPrice}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Items in Quotation (with editable fields) */}
            {cartItems.length > 0 && (
              <div className="space-y-2.5 pt-2 border-t border-slate-800/60">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Items in Quotation (Adjust pricing below):</label>
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                  {cartItems.map(item => (
                    <div key={item.id} className="p-2.5 bg-slate-950/60 border border-slate-850 rounded-xl space-y-2">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="font-bold text-slate-300 truncate max-w-[150px]">
                          {item.brand} {item.category}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className={`text-[8px] px-1 py-0.5 rounded font-mono font-bold ${
                            item.isCustom ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-slate-850 text-slate-400'
                          }`}>
                            {item.id}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-rose-400 hover:text-rose-300 transition-colors focus:outline-none cursor-pointer"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-[9px]">
                        <div>
                          <label className="text-slate-500 block mb-0.5 font-bold">Monthly Rent (₹)</label>
                          <input
                            type="number"
                            value={item.monthlyRentalPrice}
                            onChange={(e) => handleUpdateItemValue(item.id, 'monthlyRentalPrice', Number(e.target.value))}
                            className="w-full px-2 py-0.5 bg-slate-900 border border-slate-800 text-slate-200 rounded focus:outline-none font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-slate-500 block mb-0.5 font-bold">Deposit (₹)</label>
                          <input
                            type="number"
                            value={item.securityDeposit}
                            onChange={(e) => handleUpdateItemValue(item.id, 'securityDeposit', Number(e.target.value))}
                            className="w-full px-2 py-0.5 bg-slate-900 border border-slate-800 text-slate-200 rounded focus:outline-none font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Global discounts */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/60 text-[10px]">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-slate-400 font-medium">Rent Discount</label>
                  <button
                    type="button"
                    onClick={() => {
                      setRentDiscount(0);
                      setRentDiscountType(rentDiscountType === 'flat' ? 'percent' : 'flat');
                    }}
                    className="text-[9px] text-red-400 font-bold focus:outline-none cursor-pointer"
                  >
                    Use {rentDiscountType === 'flat' ? '%' : '₹'}
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-2.5 top-1.5 text-slate-500 font-semibold">{rentDiscountType === 'flat' ? '₹' : '%'}</span>
                  <input
                    type="number"
                    value={rentDiscount || ''}
                    onChange={(e) => setRentDiscount(Number(e.target.value))}
                    className="pl-5.5 w-full rounded-xl py-1.5 bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-slate-400 font-medium">Deposit Discount</label>
                  <button
                    type="button"
                    onClick={() => {
                      setDepDiscount(0);
                      setDepDiscountType(depDiscountType === 'flat' ? 'percent' : 'flat');
                    }}
                    className="text-[9px] text-red-400 font-bold focus:outline-none cursor-pointer"
                  >
                    Use {depDiscountType === 'flat' ? '%' : '₹'}
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-2.5 top-1.5 text-slate-500 font-semibold">{depDiscountType === 'flat' ? '₹' : '%'}</span>
                  <input
                    type="number"
                    value={depDiscount || ''}
                    onChange={(e) => setDepDiscount(Number(e.target.value))}
                    className="pl-5.5 w-full rounded-xl py-1.5 bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerateQuotation}
              disabled={custName === '' || custMobile === '' || cartItems.length === 0}
              className="w-full bg-[#00ab55] hover:bg-[#008f44] text-white text-[10px] font-bold py-2.5 rounded-xl cursor-pointer transition-all hover:scale-[1.01] flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:pointer-events-none"
            >
              <FileText className="w-3.5 h-3.5" />
              Generate Business Estimate
            </button>
          </div>
        </div>

        {/* Right Side: High-Fidelity Quotation Print Preview */}
        <div className="xl:col-span-3">
          {generatedQuotation ? (
            <div className="space-y-4 print:space-y-0">
              {/* Controls bar */}
              <div className="flex items-center justify-between bg-slate-900/40 border border-slate-800/80 p-3 rounded-2xl print:hidden">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-[10px] font-bold text-slate-300">Quotation Ready for Client Review</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handlePrint}
                    className="bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print / Save PDF
                  </button>
                  <button
                    onClick={() => setGeneratedQuotation(null)}
                    className="border border-slate-800 text-slate-300 hover:bg-slate-900 text-[10px] font-bold px-3 py-1.5 rounded-lg cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* High Fidelity Business Quotation Sheet */}
              <div className="bg-[#1e2530] text-slate-100 rounded-3xl border border-slate-800/80 p-8 shadow-2xl space-y-6 print:border-none print:shadow-none print:bg-white print:text-slate-950 print:p-0 print:m-0">
                {/* Header branding */}
                <div className="flex justify-between items-start border-b border-slate-800/80 pb-6 print:border-slate-300">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 bg-gradient-to-tr from-red-500 to-purple-600 rounded-xl flex items-center justify-center print:from-red-600 print:to-purple-700">
                        <span className="font-extrabold text-white text-lg font-mono">R</span>
                      </div>
                      <div>
                        <h2 className="text-base font-extrabold text-white tracking-tight leading-none print:text-slate-950">{organizationConfig.companyName}</h2>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider print:text-slate-500">{organizationConfig.tagline}</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium max-w-[240px] leading-relaxed print:text-slate-600">
                      {organizationConfig.headOfficeAddress}
                    </p>
                  </div>

                  <div className="text-right space-y-1 font-mono">
                    <h3 className="text-xs font-bold text-[#00ab55] print:text-emerald-700">RENTAL QUOTATION</h3>
                    <div className="text-[10px] text-slate-400 space-y-0.5 print:text-slate-600">
                      <div>Ref: <span className="text-white font-bold print:text-slate-900">{generatedQuotation.id}</span></div>
                      <div>Date: <span>{generatedQuotation.date}</span></div>
                      <div>Validity: <span className="text-rose-400 font-semibold print:text-rose-700">Expires {generatedQuotation.validity}</span></div>
                    </div>
                  </div>
                </div>

                {/* Client detail fields */}
                <div className="grid grid-cols-2 gap-6 bg-slate-900/20 border border-slate-800/40 p-4 rounded-2xl print:bg-slate-100/50 print:border-slate-200">
                  <div className="space-y-1">
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">PREPARED FOR</span>
                    <div className="text-xs font-extrabold text-white print:text-slate-900">{generatedQuotation.customer.fullName}</div>
                    <div className="text-[10px] text-slate-400 font-medium print:text-slate-600">📱 {generatedQuotation.customer.mobileNumber}</div>
                    {generatedQuotation.customer.email && (
                      <div className="text-[10px] text-slate-400 font-medium print:text-slate-600">✉️ {generatedQuotation.customer.email}</div>
                    )}
                  </div>
                  <div className="space-y-1 text-right">
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">HUB SCOPE</span>
                    <div className="text-xs font-extrabold text-white print:text-slate-900">{generatedQuotation.customer.city}</div>
                    <div className="text-[10px] text-slate-400 font-medium print:text-slate-600">⌛ Quotation Term: <span className="text-red-400 font-bold print:text-red-700">{generatedQuotation.duration} Months</span></div>
                  </div>
                </div>

                {/* Itemized list */}
                <div className="space-y-2.5">
                  <h4 className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Itemized Asset Estimates</h4>
                  <div className="overflow-hidden border border-slate-800/60 rounded-2xl bg-slate-950/20 print:border-slate-200 print:bg-transparent">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-800/80 bg-slate-900/40 text-slate-400 font-bold text-[9px] uppercase tracking-wider print:bg-slate-100 print:border-slate-200 print:text-slate-600">
                          <th className="p-3">Asset ID / Description</th>
                          <th className="p-3 text-right">Monthly Rent (Gross)</th>
                          <th className="p-3 text-right">Security Deposit (Gross)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50 print:divide-slate-200">
                        {generatedQuotation.items.map((item: any) => (
                          <tr key={item.id} className="hover:bg-slate-900/10 text-slate-300 print:text-slate-800">
                            <td className="p-3 font-semibold text-slate-200 print:text-slate-900">
                              {item.brand} {item.category}
                              <span className="text-[9px] text-slate-500 block font-mono">@{item.id}</span>
                            </td>
                            <td className="p-3 text-right font-mono font-medium">₹{item.monthlyRentalPrice}/mo</td>
                            <td className="p-3 text-right font-mono font-medium">₹{item.securityDeposit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Final calculations summary list */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  {/* Terms & details */}
                  <div className="space-y-2 text-[10px] text-slate-400 leading-relaxed font-medium print:text-slate-600">
                    <h5 className="font-bold text-white uppercase tracking-wider text-[9px] print:text-slate-800">Rental Terms & Scope</h5>
                    <ul className="list-disc pl-4 space-y-1">
                      <li>Security Deposit is fully refundable post asset inspection & clearance.</li>
                      <li>Monthly rentals are invoiced in advance by the 5th of every calendar month.</li>
                      <li>A signed rent agreement must be uploaded at the time of order confirmation.</li>
                      <li>Estimate is valid for 7 days from the date of issue.</li>
                    </ul>
                  </div>

                  {/* Pricing grid */}
                  <div className="p-4 bg-slate-950/30 border border-slate-800/80 rounded-2xl space-y-2 font-mono text-xs print:bg-slate-50 print:border-slate-200">
                    <div className="flex justify-between text-slate-400 print:text-slate-600">
                      <span>Gross Security Deposit:</span>
                      <span>₹{generatedQuotation.totalDeposit}</span>
                    </div>
                    {generatedQuotation.depDiscount > 0 && (
                      <div className="flex justify-between text-rose-400 print:text-rose-700">
                        <span>Deposit Discount:</span>
                        <span>
                          -{generatedQuotation.depDiscountType === 'flat' ? '₹' : ''}
                          {generatedQuotation.depDiscount}
                          {generatedQuotation.depDiscountType === 'percent' ? '%' : ''} (₹{generatedQuotation.depDiscountAmt})
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-200 font-bold border-b border-slate-800 pb-1.5 print:text-slate-900 print:border-slate-200">
                      <span>Net Security Deposit Payable:</span>
                      <span>₹{generatedQuotation.netDeposit}</span>
                    </div>
                    
                    <div className="flex justify-between text-slate-400 pt-1.5 print:text-slate-600">
                      <span>Gross Monthly Rent:</span>
                      <span>₹{generatedQuotation.totalMonthlyRent}</span>
                    </div>
                    {generatedQuotation.rentDiscount > 0 && (
                      <div className="flex justify-between text-rose-400 print:text-rose-700">
                        <span>Rent Discount:</span>
                        <span>
                          -{generatedQuotation.rentDiscountType === 'flat' ? '₹' : ''}
                          {generatedQuotation.rentDiscount}
                          {generatedQuotation.rentDiscountType === 'percent' ? '%' : ''} (₹{generatedQuotation.rentDiscountAmt})
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-red-400 font-bold border-b border-slate-800 pb-1.5 print:text-red-700 print:border-slate-200">
                      <span>Net Monthly Rent Charges:</span>
                      <span>₹{generatedQuotation.netMonthlyRent}</span>
                    </div>

                    <div className="flex justify-between text-emerald-400 font-bold text-sm pt-2 print:text-emerald-700">
                      <span>Total First Payment Due:</span>
                      <span>₹{generatedQuotation.firstPaymentTotal}</span>
                    </div>
                  </div>
                </div>

                {/* Footer signoff */}
                <div className="flex justify-between items-center pt-6 border-t border-slate-800/80 text-[10px] text-slate-500 print:border-slate-300 print:text-slate-500">
                  <span>Authorized Signature, RentBuddy ERP</span>
                  <span>Thank you for choosing RentBuddy!</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-card p-8 rounded-3xl border border-slate-800 flex flex-col items-center justify-center text-center space-y-3 min-h-[400px]">
              <FileText className="w-12 h-12 text-slate-700" />
              <h4 className="text-sm font-bold text-white">No Quotation Rendered</h4>
              <p className="text-[11px] text-slate-400 max-w-[280px] leading-normal font-medium">
                Fill in the creation form on the left, add inventory or custom manual items, override rents/deposits directly in the list, and generate a print-ready estimate invoice.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
