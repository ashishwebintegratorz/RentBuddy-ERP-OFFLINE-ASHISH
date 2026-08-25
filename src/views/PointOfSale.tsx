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
  Sparkles,
  Lock
} from 'lucide-react';
import { matchCityContext } from '../utils/cityUtils';
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
    city: currentCity === 'All Cities' || currentCity === 'All' ? 'Indore (Head Office)' : currentCity,
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

  // Filter verified customer list strictly by active city hub
  const cityCustomers = (customers || []).filter(
    c => matchCityContext(c.city || c.deliveryAddress || c.currentAddress, currentCity)
  );

  const filteredCustomers = customerSearch ? cityCustomers.filter(
    c => (c.fullName || '').toLowerCase().includes(customerSearch.toLowerCase()) ||
      (c.mobileNumber || '').includes(customerSearch) ||
      (c.id || '').toLowerCase().includes(customerSearch.toLowerCase())
  ) : cityCustomers;

  const activeCustomer = (customers || []).find(c => c.id === selectedCustId);

  // City catalog items for POS
  const cityCatalog = (inventory || []).filter(
    a => matchCityContext(a.city, currentCity) &&
      (selectedCategory === 'All' || (a.category || '').toLowerCase() === selectedCategory.toLowerCase())
  );

  const availableCount = cityCatalog.filter(a => a.status === 'Available' && !cart.some(c => c.id === a.id)).length;

  const categories = ['All', 'Bed', 'Sofa', 'Dining Table', 'Refrigerator', 'Washing Machine', 'Wardrobe', 'Desk'];

  const handleAddToCart = (asset: Asset) => {
    if (asset.status !== 'Available') return;
    setCart([...cart, asset]);
  };

  const handleRemoveFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  // Calculations
  const cartDeposit = cart.reduce((sum, item) => sum + (item.securityDeposit || 0), 0);
  const cartMonthlyRent = cart.reduce((sum, item) => sum + (item.monthlyRentalPrice || 0), 0);
  const totalTenureRent = cartMonthlyRent * duration;

  const discountAmt = discountType === 'percent'
    ? Math.round(totalTenureRent * (discount / 100))
    : discount;

  const netTenureRent = Math.max(100, totalTenureRent - discountAmt);
  const checkoutTotal = cartDeposit + netTenureRent;

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

    const assignedCity = currentCity === 'All Cities' || currentCity === 'All' ? 'Indore (Head Office)' : currentCity;

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
      city: assignedCity,
      currentAddress: quickCustForm.currentAddress || `${assignedCity} Central Area`,
      permanentAddress: quickCustForm.currentAddress || `${assignedCity} Central Area`,
      landmark: '',
      gpsLocation: '22.7196, 75.8577',
      deliveryAddress: quickCustForm.currentAddress || `${assignedCity} Central Area`,
      billingAddress: quickCustForm.currentAddress || `${assignedCity} Central Area`,
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
    <div className="space-y-6 max-w-7xl mx-auto pb-12 text-slate-100">

      {/* Top Header Banner */}
      <div className="glass-panel p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-700/80 bg-gradient-to-r from-slate-900/90 via-slate-850 to-slate-900/90 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-red-600/25 text-red-400 border border-red-500/40 shadow-inner">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-black text-white tracking-tight flex items-center gap-2.5">
              Point of Sale (POS) & Rental Agreement Checkout
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Instant Billing
              </span>
            </h1>
            <p className="text-xs text-slate-300 mt-0.5">
              Select verified customer, add furniture items to basket, and generate official contract for delivery.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-cyan-300 font-bold shadow-sm flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-cyan-400" /> Hub Context: {currentCity}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column: Customer & Furniture Catalog */}
        <div className="lg:col-span-2 space-y-6">

          {/* STEP 1: CUSTOMER SELECTION BLOCK */}
          <div className="glass-panel p-5 rounded-2xl space-y-4 border border-slate-700/80 bg-slate-900/90 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center text-xs font-black shadow-md">1</span>
                <span>Select Rental Customer ({cityCustomers.length} in {currentCity})</span>
              </h2>

              <button
                type="button"
                onClick={() => {
                  setQuickCustForm({
                    fullName: '',
                    mobileNumber: '',
                    city: currentCity === 'All Cities' || currentCity === 'All' ? 'Indore (Head Office)' : currentCity,
                    currentAddress: '',
                    monthlyIncome: 35000,
                    occupation: 'Salaried Professional'
                  });
                  setShowQuickAddModal(true);
                }}
                className="px-3.5 py-1.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white border border-red-400/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md hover:scale-105"
              >
                <Plus className="w-3.5 h-3.5" /> + Quick Add Customer
              </button>
            </div>

            {!activeCustomer ? (
              <div className="space-y-3.5">

                {/* 1-Click Dropdown Selector */}
                <div className="space-y-1.5">
                  <label className="text-white font-bold text-xs flex items-center justify-between">
                    <span>Choose Existing Customer from {currentCity}:</span>
                    <span className="text-[11px] text-cyan-400 font-mono font-medium">{cityCustomers.length} registered</span>
                  </label>
                  <select
                    value={selectedCustId}
                    onChange={(e) => setSelectedCustId(e.target.value)}
                    className="w-full rounded-xl py-3 px-3.5 bg-slate-950 border-2 border-slate-700 text-white text-xs font-semibold cursor-pointer shadow-inner focus:border-red-500 focus:outline-none transition-colors"
                  >
                    <option value="" className="text-slate-400 bg-slate-900">-- Click to Select a Customer --</option>
                    {cityCustomers.map((c) => (
                      <option key={c.id} value={c.id} className="text-white bg-slate-900 py-1.5">
                        {c.fullName} • {c.mobileNumber} ({c.verificationStatus === 'Verified' ? '✓ Verified' : 'KYC Pending'}) [{c.city || 'Indore'}]
                      </option>
                    ))}
                  </select>
                </div>

                {/* Instant Search Bar */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-slate-300 text-xs font-semibold block">
                    Or Search by Name / Mobile / ID:
                  </label>
                  <div className="relative text-xs">
                    <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder={`Type name or phone to filter in ${currentCity}...`}
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="pl-10 w-full rounded-xl py-2.5 bg-slate-950/80 border border-slate-700 text-white placeholder-slate-400 text-xs font-medium focus:border-red-500 focus:outline-none shadow-inner"
                    />
                  </div>
                </div>

                {/* Search Matches List */}
                {customerSearch && (
                  <div className="border border-slate-700 rounded-xl max-h-48 overflow-y-auto divide-y divide-slate-800 bg-slate-950 text-xs shadow-2xl">
                    {filteredCustomers.length === 0 ? (
                      <div className="p-4 text-slate-400 text-center font-medium">
                        No customer found matching "{customerSearch}" in {currentCity}. Click "+ Quick Add Customer" above!
                      </div>
                    ) : (
                      filteredCustomers.map(c => (
                        <div
                          key={c.id}
                          onClick={() => {
                            setSelectedCustId(c.id);
                            setCustomerSearch('');
                          }}
                          className="p-3.5 hover:bg-red-950/30 flex justify-between items-center text-slate-200 cursor-pointer transition-colors"
                        >
                          <div>
                            <span className="font-bold text-white text-sm block">{c.fullName}</span>
                            <span className="text-xs text-slate-400 font-mono mt-0.5">{c.id} • {c.mobileNumber} • {c.city || 'Indore'}</span>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${c.verificationStatus === 'Verified' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
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
              <div className="p-4 bg-emerald-950/40 rounded-2xl border-2 border-emerald-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-600/30 border border-emerald-500/50 text-emerald-300 font-black text-base flex items-center justify-center shadow-sm shrink-0">
                    {(activeCustomer.fullName || 'CU').substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white text-sm tracking-wide">{activeCustomer.fullName}</h3>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/30">
                        ✓ Selected for Contract
                      </span>
                    </div>
                    <div className="text-xs text-slate-200 font-mono flex flex-wrap items-center gap-3 mt-1">
                      <span className="flex items-center gap-1.5 text-white"><Phone className="w-3.5 h-3.5 text-emerald-400" /> {activeCustomer.mobileNumber}</span>
                      <span className="flex items-center gap-1.5 text-slate-300"><MapPin className="w-3.5 h-3.5 text-emerald-400" /> {activeCustomer.deliveryAddress || activeCustomer.currentAddress || activeCustomer.city || currentCity}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedCustId('')}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-rose-300 hover:text-white rounded-xl font-bold text-xs border border-slate-700 cursor-pointer transition-colors shadow-sm shrink-0"
                >
                  Change Customer
                </button>
              </div>
            )}
          </div>

          {/* STEP 2: FURNITURE CATALOG GRID */}
          <div className="glass-panel p-5 rounded-2xl space-y-4 border border-slate-700/80 bg-slate-900/90 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center text-xs font-black shadow-md">2</span>
                <span>Select Furniture Catalog ({availableCount} Available • {cityCatalog.length} in {currentCity})</span>
              </h2>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${selectedCategory === cat
                        ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                        : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700'
                      }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[420px] overflow-y-auto pr-1">
              {cityCatalog.length === 0 ? (
                <div className="col-span-2 text-center py-12 text-slate-400 text-xs font-medium border-2 border-dashed border-slate-800 rounded-2xl bg-slate-950/40">
                  <Package className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  No items found in <strong>{currentCity}</strong> for category "{selectedCategory}". Add new items from Inventory Master.
                </div>
              ) : (
                cityCatalog.map(asset => {
                  const isInCart = cart.some(item => item.id === asset.id);
                  const isReservedOrRented = asset.status === 'Reserved' || asset.status === 'Rented' || asset.status === 'Under Repair';

                  return (
                    <div
                      key={asset.id}
                      className={`p-4 rounded-2xl flex items-center gap-3.5 text-xs transition-all shadow-md relative ${
                        isReservedOrRented
                          ? 'bg-slate-950/40 border border-slate-800/80 opacity-75'
                          : isInCart
                          ? 'bg-slate-950 border border-emerald-500/50 shadow-emerald-500/5'
                          : 'bg-slate-950/80 hover:bg-slate-950 border border-slate-700/90 hover:border-red-500/50 group'
                      }`}
                    >
                      <div className="w-14 h-14 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden shrink-0 shadow-inner relative">
                        {asset.imageUrl ? (
                          <img src={asset.imageUrl} alt={asset.brand} className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-6 h-6 text-red-400" />
                        )}
                        {isReservedOrRented && (
                          <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex items-center justify-center">
                            <Lock className="w-4 h-4 text-rose-400" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-bold text-white text-sm truncate tracking-wide">{asset.brand} {asset.model}</h3>
                          {asset.status === 'Reserved' && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                              🔒 Reserved
                            </span>
                          )}
                          {asset.status === 'Rented' && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                              🔒 Rented Out
                            </span>
                          )}
                          {asset.status === 'Under Repair' && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                              🔧 In Repair
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-400 font-mono mt-0.5">{asset.category} • {asset.barcode || asset.id}</p>
                        <div className="text-xs text-slate-200 mt-1.5 flex flex-wrap gap-x-3 font-mono">
                          <span className="text-slate-300">Rent: <strong className="text-white font-black text-sm">₹{asset.monthlyRentalPrice}</strong>/mo</span>
                          <span className="text-slate-300">Deposit: <strong className="text-cyan-300 font-black">₹{asset.securityDeposit}</strong></span>
                        </div>
                      </div>

                      {isInCart ? (
                        <span className="px-3.5 py-2 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold rounded-xl text-xs flex items-center gap-1 shrink-0">
                          <Check className="w-3.5 h-3.5" /> In Basket
                        </span>
                      ) : isReservedOrRented ? (
                        <span className="px-3 py-2 bg-slate-900 border border-slate-800 text-slate-400 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-not-allowed select-none shrink-0">
                          <Lock className="w-3.5 h-3.5 text-slate-500" /> Rented
                        </span>
                      ) : (
                        <button
                          onClick={() => handleAddToCart(asset)}
                          className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl px-3.5 py-2.5 transition-all text-xs font-bold cursor-pointer shrink-0 shadow-lg shadow-red-600/20 hover:scale-105 active:scale-95"
                        >
                          + Add
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Checkout Basket & Agreement Summary */}
        <div className="space-y-6">
          <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between min-h-[520px] border border-slate-700/80 bg-slate-900/90 shadow-2xl">
            <div className="space-y-4 text-xs">

              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-red-400" />
                  <span>Rental Basket ({cart.length})</span>
                </h2>
                {cart.length > 0 && (
                  <button
                    onClick={() => setCart([])}
                    className="text-xs text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Customer Warning Status Box */}
              {!activeCustomer ? (
                <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs font-semibold space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-300">
                    <BadgeAlert className="w-4 h-4 text-amber-400 shrink-0" /> Step 1: No Customer Selected
                  </div>
                  <p className="text-[11px] text-amber-200/90">
                    Please pick a customer from the dropdown above to enable checkout.
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="font-bold text-white truncate">{activeCustomer.fullName}</span>
                  </div>
                  <span className="text-xs text-emerald-300 font-mono font-bold">{activeCustomer.mobileNumber}</span>
                </div>
              )}

              {/* Cart Items List */}
              <div className="space-y-2.5 max-h-[190px] overflow-y-auto pr-1">
                {cart.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-xs font-medium border-2 border-dashed border-slate-800 rounded-2xl bg-slate-950/40">
                    Basket is empty. Click "+ Add" on furniture catalog items.
                  </div>
                ) : (
                  cart.map(item => (
                    <div key={item.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center shadow-sm">
                      <div className="min-w-0 flex-1 pr-2">
                        <span className="font-bold text-white text-xs block truncate">{item.brand} {item.model}</span>
                        <span className="text-[11px] text-slate-400 font-mono mt-0.5">{item.category} • {item.barcode || item.id}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <span className="text-white font-mono font-bold text-xs block">₹{item.monthlyRentalPrice}/mo</span>
                          <span className="text-[11px] text-cyan-300 font-mono block">Dep: ₹{item.securityDeposit}</span>
                        </div>
                        <button
                          onClick={() => handleRemoveFromCart(item.id)}
                          className="text-slate-400 hover:text-rose-400 transition-colors p-1.5 cursor-pointer rounded-lg hover:bg-slate-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Term Duration & Coupons */}
              {cart.length > 0 && (
                <div className="space-y-3.5 pt-3.5 border-t border-slate-800">
                  {/* Duration Selector */}
                  <div className="space-y-1">
                    <label className="text-white font-bold text-xs flex items-center justify-between">
                      <span>Rental Contract Duration:</span>
                      <span className="text-[11px] text-red-400 font-mono font-bold">{duration} Months Tenure</span>
                    </label>
                    <select
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                      className="w-full text-xs py-2.5 rounded-xl px-3 bg-slate-950 border border-slate-700 text-white font-semibold cursor-pointer shadow-inner focus:border-red-500"
                    >
                      <option value={1} className="bg-slate-900">1 Month (Flexible Plan)</option>
                      <option value={2} className="bg-slate-900">2 Months (Short Term)</option>
                      <option value={3} className="bg-slate-900">3 Months (Quarterly Plan)</option>
                      <option value={6} className="bg-slate-900">6 Months (Half-Yearly • Most Popular)</option>
                      <option value={9} className="bg-slate-900">9 Months (Extended Plan)</option>
                      <option value={12} className="bg-slate-900">12 Months (Annual Plan)</option>
                    </select>
                  </div>

                  {/* Manual Discount & Coupon */}
                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-slate-300 font-medium block">Discount</label>
                        <button
                          type="button"
                          onClick={() => {
                            setDiscount(0);
                            setDiscountType(discountType === 'flat' ? 'percent' : 'flat');
                          }}
                          className="text-[10px] text-red-400 hover:text-red-300 font-bold uppercase cursor-pointer"
                        >
                          Toggle {discountType === 'flat' ? '%' : '₹'}
                        </button>
                      </div>
                      <div className="relative">
                        <span className="absolute left-2.5 top-2 text-slate-400 text-xs font-semibold">
                          {discountType === 'flat' ? '₹' : '%'}
                        </span>
                        <input
                          type="number"
                          value={discount || ''}
                          onChange={(e) => setDiscount(Number(e.target.value))}
                          className="pl-6 w-full rounded-xl py-2 text-xs bg-slate-950 border border-slate-700 text-white font-medium"
                          placeholder={discountType === 'flat' ? 'Flat' : 'Percent'}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-300 font-medium block">Coupon</label>
                      <input
                        type="text"
                        value={coupon}
                        onChange={(e) => setCoupon(e.target.value)}
                        placeholder="WELCOME10"
                        className="w-full rounded-xl px-3 py-2 text-xs uppercase bg-slate-950 border border-slate-700 text-white font-medium placeholder-slate-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Calculations Breakdown & Submit Button */}
            {cart.length > 0 && (
              <div className="space-y-2.5 mt-4 pt-4 border-t border-slate-800 text-xs">
                {/* Gross Monthly Rate */}
                <div className="flex justify-between text-slate-300">
                  <span>Gross Monthly Rent Rate:</span>
                  <span className="font-mono text-white font-bold">₹{cartMonthlyRent.toLocaleString()} / month</span>
                </div>

                {/* Contract Duration */}
                <div className="flex justify-between text-slate-300">
                  <span>Contract Duration:</span>
                  <span className="font-mono text-white font-bold">{duration} Months</span>
                </div>

                {/* Total Rent for Contract Duration */}
                <div className="flex justify-between text-slate-300">
                  <span>Total Tenure Rent ({duration} × ₹{cartMonthlyRent.toLocaleString()}):</span>
                  <span className="font-mono text-emerald-400 font-bold">₹{totalTenureRent.toLocaleString()}</span>
                </div>

                {/* Security Deposit */}
                <div className="flex justify-between text-slate-300">
                  <span>Security Deposit (Refundable):</span>
                  <span className="font-mono text-cyan-300 font-bold">₹{cartDeposit.toLocaleString()}</span>
                </div>

                {/* Discount */}
                {discount > 0 && (
                  <div className="flex justify-between text-rose-400 font-semibold">
                    <span>Discount Applied ({discountType === 'flat' ? 'Flat' : `${discount}%`}):</span>
                    <span className="font-mono">
                      -₹{discountAmt.toLocaleString()}
                    </span>
                  </div>
                )}

                {/* Total Initial Payment */}
                <div className="flex justify-between items-center text-white border-t border-slate-800 pt-2.5 text-sm font-bold bg-slate-950/60 p-3 rounded-xl border">
                  <div>
                    <span className="block font-bold">Total Initial Payment:</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      (Deposit ₹{cartDeposit.toLocaleString()} + {duration} Mo Rent ₹{netTenureRent.toLocaleString()})
                    </span>
                  </div>
                  <span className="font-mono font-black text-rose-400 text-lg">₹{checkoutTotal.toLocaleString()}</span>
                </div>

                <button
                  onClick={handlePOSCheckout}
                  disabled={!selectedCustId}
                  className={`w-full py-3.5 rounded-xl font-bold text-white text-center cursor-pointer shadow-xl transition-all flex items-center justify-center gap-2 text-xs ${selectedCustId
                      ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 shadow-red-600/30 hover:scale-[1.02] active:scale-95'
                      : 'bg-slate-800 border border-slate-700 text-slate-400 cursor-not-allowed'
                    }`}
                >
                  {selectedCustId ? (
                    <>
                      <Sparkles className="w-4 h-4" /> Generate Agreement & Checkout (₹{checkoutTotal.toLocaleString()})
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
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-[480px] glass-panel border border-slate-700 rounded-3xl shadow-2xl p-6 space-y-4 bg-slate-900 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <User className="w-5 h-5 text-red-500" /> Quick Add Customer in {quickCustForm.city}
              </h3>
              <button
                onClick={() => setShowQuickAddModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateQuickCustomer} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-white font-bold block">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={quickCustForm.fullName}
                  onChange={(e) => setQuickCustForm({ ...quickCustForm, fullName: e.target.value })}
                  className="w-full rounded-xl py-2.5 px-3.5 bg-slate-950 border border-slate-700 text-white font-medium focus:border-red-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-white font-bold block">Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="e.g. 9826012345"
                    value={quickCustForm.mobileNumber}
                    onChange={(e) => setQuickCustForm({ ...quickCustForm, mobileNumber: e.target.value.replace(/\D/g, '') })}
                    className="w-full rounded-xl py-2.5 px-3.5 bg-slate-950 border border-slate-700 text-white font-mono font-bold focus:border-red-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-white font-bold block">City Hub</label>
                  <input
                    type="text"
                    disabled
                    value={quickCustForm.city}
                    className="w-full rounded-xl py-2.5 px-3.5 bg-slate-900 border border-slate-700 text-cyan-300 font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-white font-bold block">Delivery Address</label>
                <input
                  type="text"
                  placeholder={`e.g. Flat 402, Lotus Pride, ${quickCustForm.city}`}
                  value={quickCustForm.currentAddress}
                  onChange={(e) => setQuickCustForm({ ...quickCustForm, currentAddress: e.target.value })}
                  className="w-full rounded-xl py-2.5 px-3.5 bg-slate-950 border border-slate-700 text-white font-medium focus:border-red-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-800">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl font-bold cursor-pointer shadow-lg shadow-red-600/25 transition-all"
                >
                  Save & Select Customer
                </button>
                <button
                  type="button"
                  onClick={() => setShowQuickAddModal(false)}
                  className="py-3 px-5 border border-slate-700 text-slate-300 hover:bg-slate-800 rounded-xl font-bold cursor-pointer"
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
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-[480px] bg-white text-slate-900 rounded-3xl p-6 shadow-2xl relative flex flex-col justify-between border border-slate-200">
            <button
              onClick={() => setCheckedOutOrder(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-4">
              <div className="text-center border-b border-slate-100 pb-3">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2 shadow-inner">
                  <Check className="w-6 h-6" />
                </div>
                <h3 className="font-black text-xl text-slate-900">Rental Agreement Created!</h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">Order ID: {checkedOutOrder.id}</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl space-y-2 text-xs border border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer:</span>
                  <span className="font-bold text-slate-900">{checkedOutOrder.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Rental Contract Duration:</span>
                  <span className="font-bold text-slate-900">{checkedOutOrder.durationMonths} Months</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Monthly Rent Rate:</span>
                  <span className="font-bold text-slate-800">₹{checkedOutOrder.totalMonthlyRent}/mo</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Tenure Rent ({checkedOutOrder.durationMonths} Mo):</span>
                  <span className="font-bold text-emerald-600 font-mono">₹{(checkedOutOrder.totalMonthlyRent * checkedOutOrder.durationMonths - (checkedOutOrder.discountAmount || 0)).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Security Deposit:</span>
                  <span className="font-bold text-slate-900 font-mono">₹{checkedOutOrder.totalDeposit.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-bold">
                  <span className="text-slate-900">Total Initial Payment:</span>
                  <span className="font-bold text-red-600 font-mono text-base">
                    ₹{(checkedOutOrder.totalDeposit + (checkedOutOrder.totalMonthlyRent * checkedOutOrder.durationMonths - (checkedOutOrder.discountAmount || 0))).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Queued in Logistics Dispatch
                </div>
                <p className="text-[11px] text-emerald-800">Order is now ready in <strong>Logistics Tasks</strong> tab for driver assignment & QR dispatch!</p>
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <button
                onClick={() => {
                  setCheckedOutOrder(null);
                  window.print();
                }}
                className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <Printer className="w-4 h-4" /> Print Agreement
              </button>
              <button
                onClick={() => setCheckedOutOrder(null)}
                className="py-3 px-6 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold cursor-pointer shadow-md shadow-red-600/20"
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
