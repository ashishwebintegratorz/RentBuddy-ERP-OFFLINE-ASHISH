import React, { useState } from 'react';
import { useRentBuddyStore } from '../store/rentBuddyStore';
import type { Asset, Customer } from '../types';
import {
  Search,
  ShoppingCart,
  Trash2,
  Printer,
  User,
  BadgeAlert,
  X,
  Plus,
  Check,
  CheckCircle2,
  Phone,
  MapPin,
  Package,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function PointOfSale() {
  const {
    customers,
    inventory,
    checkoutOrder,
    addCustomer,
    currentCity,
  } = useRentBuddyStore();

  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustId, setSelectedCustId] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  // Quick Add Customer Modal
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [quickCustForm, setQuickCustForm] = useState({
    fullName: '',
    mobileNumber: '',
    city: currentCity,
    currentAddress: '',
    monthlyIncome: 35000,
    occupation: 'Salaried Professional'
  });

  // Cart Items
  const [cart, setCart] = useState<Asset[]>([]);
  const [duration, setDuration] = useState<number>(3); // default 3 months
  const [discount, setDiscount] = useState<number>(0);
  const [coupon, setCoupon] = useState('');
  const [discountType, setDiscountType] = useState<'flat' | 'percent'>('flat');
  const [checkedOutOrder, setCheckedOutOrder] = useState<any>(null);

  // Filter verified customer list for search
  const filteredCustomers = customerSearch ? (customers || []).filter(
    c => (c.fullName || '').toLowerCase().includes(customerSearch.toLowerCase()) ||
         (c.mobileNumber || '').includes(customerSearch)
  ) : (customers || []);

  const activeCustomer = (customers || []).find(c => c.id === selectedCustId);

  // Available inventory in current city
  const availableInventory = (inventory || []).filter(
    a => (a.city || '').toLowerCase().includes((currentCity || '').toLowerCase()) &&
         a.status === 'Available' &&
         !cart.some(item => item.id === a.id) &&
         (selectedCategory === 'All' || (a.category || '').toLowerCase() === selectedCategory.toLowerCase())
  );

  const categories = ['All', 'Bed', 'Sofa', 'Dining Table', 'Refrigerator', 'Washing Machine', 'Wardrobe', 'Desk'];

  const handleAddToCart = (asset: Asset) => {
    setCart([...cart, asset]);
  };

  const handleRemoveFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  // Calculations
  const cartDeposit = cart.reduce((sum, item) => sum + (item.securityDeposit || 0), 0);
  const cartRent = cart.reduce((sum, item) => sum + (item.monthlyRentalPrice || 0), 0);
  
  const discountAmt = discountType === 'percent'
    ? Math.round(cartRent * (discount / 100))
    : discount;

  const totalRentNet = Math.max(100, cartRent - discountAmt);
  const checkoutTotal = cartDeposit + totalRentNet;

  const handlePOSCheckout = () => {
    if (!selectedCustId || cart.length === 0) return;

    try {
      const order = checkoutOrder({
        customerId: selectedCustId,
        items: cart.map(item => ({ assetId: item.id })),
        durationMonths: duration,
        discountType: discountType,
        discountValue: discount,
        couponCode: coupon || undefined,
      });

      setCheckedOutOrder(order);
      
      // Trigger confetti blast
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });

      // Clear Cart
      setCart([]);
      setSelectedCustId('');
      setCustomerSearch('');
      setDiscount(0);
      setDiscountType('flat');
      setCoupon('');
    } catch (e: any) {
      alert(`Error creating rental order: ${e.message}`);
    }
  };

  const handleCreateQuickCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCustForm.fullName || !quickCustForm.mobileNumber) return;

    addCustomer({
      fullName: quickCustForm.fullName,
      mobileNumber: quickCustForm.mobileNumber,
      alternateNumber: '',
      email: `${quickCustForm.mobileNumber}@rentbuddy.in`,
      aadhaarNumber: '1234 5678 9012',
      panNumber: 'ABCDE1234F',
      occupation: quickCustForm.occupation,
      employer: 'Self/Company',
      monthlyIncome: quickCustForm.monthlyIncome,
      currentAddress: quickCustForm.currentAddress || `${currentCity} Central Area`,
      permanentAddress: quickCustForm.currentAddress || `${currentCity} Central Area`,
      landmark: '',
      gpsLocation: '22.7196, 75.8577',
      deliveryAddress: quickCustForm.currentAddress || `${currentCity} Central Area`,
      billingAddress: quickCustForm.currentAddress || `${currentCity} Central Area`,
      landlordName: '',
      landlordMobile: '',
      landlordId: '',
      documents: {
        aadhaarFront: '',
        aadhaarBack: '',
        panCard: '',
        rentAgreement: '',
        selfie: ''
      }
    });

    setShowQuickAddModal(false);
    // Find the newly added customer by phone
    setTimeout(() => {
      const created = useRentBuddyStore.getState().customers.find(c => c.mobileNumber === quickCustForm.mobileNumber);
      if (created) {
        setSelectedCustId(created.id);
      }
    }, 100);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 text-xs text-slate-300">
      
      {/* Header Banner */}
      <div className="glass-panel p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-white tracking-tight flex items-center gap-2">
              Point of Sale (POS) & Rental Agreement Checkout
            </h2>
            <p className="text-[11px] text-slate-400">
              Select customer, add furniture items to basket, and generate official contract for delivery.
            </p>
          </div>
        </div>

        <span className="px-3 py-1 bg-slate-900 border border-slate-800 rounded-xl text-[11px] font-mono text-cyan-400 font-bold">
          Hub: {currentCity}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Customer & Furniture Catalog */}
        <div className="lg:col-span-2 space-y-5">
          
          {/* STEP 1: CUSTOMER SELECTION BLOCK */}
          <div className="glass-panel p-5 rounded-2xl space-y-4 border border-slate-800/90 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px] font-bold">1</span>
                <span>Select Rental Customer</span>
              </h3>

              <button
                type="button"
                onClick={() => setShowQuickAddModal(true)}
                className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/30 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> + Quick Add Customer
              </button>
            </div>

            {!activeCustomer ? (
              <div className="space-y-3">
                
                {/* 1-Click Dropdown Selector */}
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold text-[11px] block">
                    Choose Existing Customer from List:
                  </label>
                  <select
                    value={selectedCustId}
                    onChange={(e) => setSelectedCustId(e.target.value)}
                    className="w-full rounded-xl py-2.5 px-3 bg-slate-950 border border-slate-800 text-slate-200 text-xs font-semibold cursor-pointer"
                  >
                    <option value="">-- Click to Select a Customer --</option>
                    {(customers || []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.fullName} • {c.mobileNumber} ({c.verificationStatus === 'Verified' ? '✓ Verified' : 'KYC Pending'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Instant Search Bar */}
                <div className="space-y-1 pt-1">
                  <label className="text-slate-500 text-[10px] uppercase font-bold block">
                    Or Search by Name / Mobile:
                  </label>
                  <div className="relative text-xs">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Type customer name or phone to filter..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="pl-9 w-full rounded-xl py-2 bg-slate-900/60 border border-slate-800 text-slate-200"
                    />
                  </div>
                </div>

                {/* Search Matches List */}
                {customerSearch && (
                  <div className="border border-slate-800 rounded-xl max-h-40 overflow-y-auto divide-y divide-slate-800 bg-slate-950/80 text-xs">
                    {filteredCustomers.length === 0 ? (
                      <div className="p-3 text-slate-500 text-center font-medium">
                        No customer found matching "{customerSearch}". Click "+ Quick Add Customer" above!
                      </div>
                    ) : (
                      filteredCustomers.map(c => (
                        <div
                          key={c.id}
                          onClick={() => {
                            setSelectedCustId(c.id);
                            setCustomerSearch('');
                          }}
                          className="p-3 hover:bg-red-950/20 flex justify-between items-center text-slate-300 cursor-pointer transition-colors"
                        >
                          <div>
                            <span className="font-bold text-white block">{c.fullName}</span>
                            <span className="text-[10px] text-slate-500 font-mono">{c.id} • {c.mobileNumber}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            c.verificationStatus === 'Verified' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {c.verificationStatus === 'Verified' ? '✓ Verified' : 'KYC Pending'}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Selected Customer Card */
              <div className="p-4 bg-emerald-950/20 rounded-2xl border border-emerald-500/30 flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 font-black text-sm flex items-center justify-center">
                    {(activeCustomer.fullName || 'CU').substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-white text-sm">{activeCustomer.fullName}</h4>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[9px] border border-emerald-500/30">
                        ✓ Selected Customer
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-500" /> {activeCustomer.mobileNumber}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-500" /> {activeCustomer.deliveryAddress || activeCustomer.currentAddress || currentCity}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedCustId('')}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-rose-400 hover:text-rose-300 rounded-xl font-bold text-[11px] border border-slate-800 cursor-pointer"
                >
                  Change Customer
                </button>
              </div>
            )}
          </div>

          {/* STEP 2: FURNITURE CATALOG GRID */}
          <div className="glass-panel p-5 rounded-2xl space-y-4 border border-slate-800/90 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px] font-bold">2</span>
                <span>Select Furniture Catalog ({availableInventory.length} Available in {currentCity})</span>
              </h3>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all shrink-0 cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-red-600 text-white shadow-sm'
                        : 'bg-slate-900/60 text-slate-400 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-[360px] overflow-y-auto pr-1">
              {availableInventory.length === 0 ? (
                <div className="col-span-2 text-center py-12 text-slate-500 text-xs font-medium border border-dashed border-slate-800 rounded-xl">
                  No available items found in {currentCity} for category "{selectedCategory}". Add new items from Inventory Master.
                </div>
              ) : (
                availableInventory.map(asset => (
                  <div
                    key={asset.id}
                    className="p-3.5 bg-slate-900/30 hover:bg-slate-900/60 border border-slate-800 rounded-xl flex items-center gap-3 text-xs transition-all shadow-sm group"
                  >
                    <div className="w-12 h-12 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                      {asset.imageUrl ? (
                        <img src={asset.imageUrl} alt={asset.brand} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-5 h-5 text-red-500/60" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-white text-xs truncate">{asset.brand} {asset.model}</h4>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">{asset.category} • {asset.barcode || asset.id}</p>
                      <div className="text-[10px] text-slate-300 mt-1 flex gap-3 font-mono">
                        <span>Rent: <strong className="text-white">₹{asset.monthlyRentalPrice}</strong>/mo</span>
                        <span>Dep: <strong className="text-cyan-400">₹{asset.securityDeposit}</strong></span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAddToCart(asset)}
                      className="bg-red-600/20 hover:bg-red-600 border border-red-500/30 hover:border-red-500 text-red-300 hover:text-white rounded-xl px-3 py-2 transition-all text-xs font-bold cursor-pointer shrink-0 shadow-md"
                    >
                      + Add
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Checkout Basket & Agreement Summary */}
        <div className="space-y-5">
          <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between min-h-[500px] border border-slate-800 shadow-2xl">
            <div className="space-y-4 text-xs">
              
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <ShoppingCart className="w-4 h-4 text-red-400" />
                  <span>Rental Basket ({cart.length})</span>
                </h3>
                {cart.length > 0 && (
                  <button
                    onClick={() => setCart([])}
                    className="text-[10px] text-slate-500 hover:text-rose-400 cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Customer Warning Status Box */}
              {!activeCustomer ? (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-semibold space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <BadgeAlert className="w-4 h-4 text-amber-400" /> Step 1: No Customer Selected
                  </div>
                  <p className="text-[10px] text-amber-400/80">
                    Please pick a customer from the dropdown above to enable checkout.
                  </p>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/20 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-emerald-300 truncate">{activeCustomer.fullName}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">{activeCustomer.mobileNumber}</span>
                </div>
              )}

              {/* Cart Items List */}
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                {cart.length === 0 ? (
                  <div className="text-center py-10 text-slate-500 text-xs font-medium border border-dashed border-slate-800/80 rounded-xl">
                    Basket is empty. Click "+ Add" on furniture catalog items.
                  </div>
                ) : (
                  cart.map(item => (
                    <div key={item.id} className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-900 flex justify-between items-center">
                      <div className="min-w-0 flex-1 pr-2">
                        <span className="font-bold text-white block truncate">{item.brand} {item.model}</span>
                        <span className="text-[9px] text-slate-500 font-mono mt-0.5">{item.category} • {item.barcode || item.id}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <span className="text-slate-200 font-mono font-bold block">₹{item.monthlyRentalPrice}/mo</span>
                          <span className="text-[9px] text-cyan-400 font-mono block">Dep: ₹{item.securityDeposit}</span>
                        </div>
                        <button
                          onClick={() => handleRemoveFromCart(item.id)}
                          className="text-slate-500 hover:text-rose-400 transition-colors p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Term Duration & Coupons */}
              {cart.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-slate-800/80">
                  {/* Duration Selector */}
                  <div>
                    <label className="text-slate-400 font-bold block mb-1">Rental Contract Duration:</label>
                    <select
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                      className="w-full text-xs py-2 rounded-xl px-3 bg-slate-950 border border-slate-800 text-slate-200 font-semibold"
                    >
                      <option value={2}>2 Months (Short Term)</option>
                      <option value={3}>3 Months (Standard)</option>
                      <option value={6}>6 Months (Most Popular)</option>
                      <option value={12}>12 Months (Annual Plan)</option>
                    </select>
                  </div>

                  {/* Manual Discount & Coupon */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-slate-400 font-medium block">Discount</label>
                        <button
                          type="button"
                          onClick={() => {
                            setDiscount(0);
                            setDiscountType(discountType === 'flat' ? 'percent' : 'flat');
                          }}
                          className="text-[9px] text-red-400 hover:text-red-300 font-bold uppercase"
                        >
                          Toggle {discountType === 'flat' ? '%' : '₹'}
                        </button>
                      </div>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1.5 text-slate-500 text-[11px] font-semibold">
                          {discountType === 'flat' ? '₹' : '%'}
                        </span>
                        <input
                          type="number"
                          value={discount || ''}
                          onChange={(e) => setDiscount(Number(e.target.value))}
                          className="pl-6 w-full rounded-lg py-1.5 text-xs bg-slate-900 border border-slate-800 text-slate-200"
                          placeholder={discountType === 'flat' ? 'Flat' : 'Percent'}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-400 font-medium block">Coupon</label>
                      <input
                        type="text"
                        value={coupon}
                        onChange={(e) => setCoupon(e.target.value)}
                        placeholder="WELCOME10"
                        className="w-full rounded-lg px-2.5 py-1.5 text-xs uppercase bg-slate-900 border border-slate-800 text-slate-200"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Calculations Breakdown & Submit Button */}
            {cart.length > 0 && (
              <div className="space-y-3 mt-4 pt-4 border-t border-slate-800 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Gross Monthly Rent:</span>
                  <span className="font-mono text-slate-200">₹{cartRent}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Security Deposit (Refundable):</span>
                  <span className="font-mono text-cyan-300">₹{cartDeposit}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-rose-400">
                    <span>Discount Applied:</span>
                    <span className="font-mono">
                      -{discountType === 'flat' ? '₹' : ''}{discount}{discountType === 'percent' ? '%' : ''} (₹{discountAmt})
                    </span>
                  </div>
                )}
                
                <div className="flex justify-between text-slate-200 border-t border-slate-900 pt-2 text-sm">
                  <span className="font-bold">Total Initial Payment:</span>
                  <span className="font-mono font-black text-red-400">₹{checkoutTotal.toLocaleString()}</span>
                </div>

                <button
                  onClick={handlePOSCheckout}
                  disabled={!selectedCustId}
                  className={`w-full py-3 rounded-xl font-bold text-white text-center cursor-pointer shadow-xl transition-all flex items-center justify-center gap-2 text-xs ${
                    selectedCustId
                      ? 'bg-red-600 hover:bg-red-500 shadow-red-600/20 hover:scale-[1.02]'
                      : 'bg-slate-800 border border-slate-700/40 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {selectedCustId ? (
                    <>
                      <Sparkles className="w-4 h-4" /> Generate Agreement & Checkout
                    </>
                  ) : (
                    '⚠️ Step 1: Select Customer First'
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* QUICK ADD CUSTOMER MODAL */}
      {showQuickAddModal && (
        <div className="fixed inset-0 bg-[#030303]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-[460px] glass-panel border border-slate-800/90 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <User className="w-4 h-4 text-red-500" /> Quick Add Rental Customer
              </h3>
              <button
                onClick={() => setShowQuickAddModal(false)}
                className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateQuickCustomer} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-bold block">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ashish Sharma"
                  value={quickCustForm.fullName}
                  onChange={(e) => setQuickCustForm({ ...quickCustForm, fullName: e.target.value })}
                  className="w-full rounded-xl py-2 px-3 bg-slate-950 border border-slate-800 text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-bold block">Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="e.g. 9876543210"
                    value={quickCustForm.mobileNumber}
                    onChange={(e) => setQuickCustForm({ ...quickCustForm, mobileNumber: e.target.value.replace(/\D/g, '') })}
                    className="w-full rounded-xl py-2 px-3 bg-slate-950 border border-slate-800 text-slate-200 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-bold block">City Hub</label>
                  <input
                    type="text"
                    disabled
                    value={quickCustForm.city}
                    className="w-full rounded-xl py-2 px-3 bg-slate-900 border border-slate-800 text-slate-400"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-bold block">Delivery Address (House/Flat, Landmark)</label>
                <input
                  type="text"
                  placeholder="e.g. Flat 302, Royal Residency, Vijay Nagar"
                  value={quickCustForm.currentAddress}
                  onChange={(e) => setQuickCustForm({ ...quickCustForm, currentAddress: e.target.value })}
                  className="w-full rounded-xl py-2 px-3 bg-slate-950 border border-slate-800 text-slate-200"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-800">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold cursor-pointer shadow-lg shadow-red-600/20"
                >
                  Save & Select Customer
                </button>
                <button
                  type="button"
                  onClick={() => setShowQuickAddModal(false)}
                  className="py-2.5 px-4 border border-slate-800 text-slate-400 hover:bg-slate-900 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Checkout Receipt Slide-over Modal */}
      {checkedOutOrder && (
        <div className="fixed inset-0 bg-[#030303]/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-[480px] bg-white text-slate-900 rounded-3xl p-6 shadow-2xl relative flex flex-col justify-between border border-slate-200">
            <button
              onClick={() => setCheckedOutOrder(null)}
              className="absolute top-4 right-4 p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-4">
              <div className="text-center border-b border-slate-100 pb-3">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Check className="w-5 h-5" />
                </div>
                <h3 className="font-black text-lg text-slate-900">Rental Agreement Created!</h3>
                <p className="text-xs text-slate-500 font-mono">Order ID: {checkedOutOrder.id}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer:</span>
                  <span className="font-bold">{checkedOutOrder.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Rental Period:</span>
                  <span className="font-bold">{checkedOutOrder.durationMonths} Months</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Monthly Rent:</span>
                  <span className="font-bold text-red-600">₹{checkedOutOrder.netMonthlyRent}/mo</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Deposit Paid:</span>
                  <span className="font-bold">₹{checkedOutOrder.totalDeposit}</span>
                </div>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-800 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Queued in Logistics Dispatch
                </div>
                <p>Order is now ready in <strong>Logistics Tasks</strong> tab for driver assignment!</p>
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <button
                onClick={() => {
                  setCheckedOutOrder(null);
                  window.print();
                }}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Print Agreement
              </button>
              <button
                onClick={() => setCheckedOutOrder(null)}
                className="py-2.5 px-5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
