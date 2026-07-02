import { useState } from 'react';
import { useRentBuddyStore } from '../store/rentBuddyStore';
import type { Asset } from '../types';
import {
  Search,
  ShoppingCart,
  Trash2,
  Printer,
  User,
  BadgeAlert,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function PointOfSale() {
  const {
    customers,
    inventory,
    checkoutOrder,
    currentCity,
  } = useRentBuddyStore();

  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustId, setSelectedCustId] = useState<string>('');
  
  // Cart Items
  const [cart, setCart] = useState<Asset[]>([]);
  const [duration, setDuration] = useState<number>(3); // default 3 months
  const [discount, setDiscount] = useState<number>(0);
  const [coupon, setCoupon] = useState('');
  const [discountType, setDiscountType] = useState<'flat' | 'percent'>('flat');
  const [checkedOutOrder, setCheckedOutOrder] = useState<any>(null);

  // Filter verified customer list
  const filteredCustomers = customerSearch ? customers.filter(
    c => c.fullName.toLowerCase().includes(customerSearch.toLowerCase()) ||
         c.mobileNumber.includes(customerSearch)
  ) : [];

  const activeCustomer = customers.find(c => c.id === selectedCustId);

  // Available inventory in current city to add to cart
  const availableInventory = inventory.filter(
    a => a.city === currentCity && a.status === 'Available' && !cart.some(item => item.id === a.id)
  );

  const handleAddToCart = (asset: Asset) => {
    setCart([...cart, asset]);
  };

  const handleRemoveFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  // Calculations
  const cartDeposit = cart.reduce((sum, item) => sum + item.securityDeposit, 0);
  const cartRent = cart.reduce((sum, item) => sum + item.monthlyRentalPrice, 0);
  
  const discountAmt = discountType === 'percent'
    ? Math.round(cartRent * (discount / 100))
    : discount;

  const totalRentNet = Math.max(100, cartRent - discountAmt);
  const checkoutTotal = cartDeposit + totalRentNet;

  const handlePOSCheckout = () => {
    if (!selectedCustId || cart.length === 0) return;

    if (activeCustomer?.verificationStatus !== 'Verified') {
      alert('WARNING: Customer documents are not KYC verified! Please approve KYC before creating orders.');
      return;
    }

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
      
      // Trigger canvas-confetti blast
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
      alert(`Error checking out: ${e.message}`);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Customer and Item Selection */}
        <div className="lg:col-span-2 space-y-5">
          
          {/* Customer Selection Block */}
          <div className="glass-panel p-5 rounded-2xl space-y-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <User className="w-4 h-4 text-indigo-400" /> Walk-In Customer Details
            </h3>

            {!activeCustomer ? (
              <div className="space-y-3">
                <div className="relative text-xs">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search customer by name, mobile number..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="pl-9 w-full rounded-xl py-2 bg-slate-900/40"
                  />
                </div>

                {/* Dropdown matches list */}
                {customerSearch && (
                  <div className="border border-slate-800/80 rounded-xl max-h-40 overflow-y-auto divide-y divide-slate-800 bg-slate-950/60 text-xs">
                    {filteredCustomers.length === 0 ? (
                      <div className="p-3 text-slate-500 text-center font-medium">No customers found. Onboard first!</div>
                    ) : (
                      filteredCustomers.map(c => (
                        <button
                          key={c.id}
                          onClick={() => {
                            setSelectedCustId(c.id);
                            setCustomerSearch('');
                          }}
                          className="w-full text-left p-3 hover:bg-indigo-900/10 flex justify-between items-center text-slate-300 cursor-pointer"
                        >
                          <div>
                            <span className="font-semibold text-white block">{c.fullName}</span>
                            <span className="text-[10px] text-slate-500 font-mono">{c.id} | {c.mobileNumber}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                            c.verificationStatus === 'Verified' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                          }`}>
                            KYC: {c.verificationStatus}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between p-3.5 bg-slate-900/40 rounded-xl border border-slate-800 text-xs text-slate-300">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center text-indigo-400 font-bold">
                    {activeCustomer.fullName.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">{activeCustomer.fullName}</h4>
                    <span className="text-[10px] text-slate-500 font-mono">{activeCustomer.id} | {activeCustomer.mobileNumber}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {activeCustomer.verificationStatus !== 'Verified' ? (
                    <span className="px-2 py-1 rounded bg-rose-500/15 border border-rose-500/30 text-rose-400 font-bold text-[9px] flex items-center gap-1">
                      <BadgeAlert className="w-3.5 h-3.5" /> KYC Pending
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-[9px]">
                      ✓ KYC Approved
                    </span>
                  )}
                  <button
                    onClick={() => setSelectedCustId('')}
                    className="text-rose-400 hover:text-rose-300 font-semibold"
                  >
                    Change
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Asset Selection Grid */}
          <div className="glass-panel p-5 rounded-2xl space-y-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <ShoppingCart className="w-4 h-4 text-indigo-400" /> Select Furniture Catalog ({currentCity})
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-[300px] overflow-y-auto pr-1">
              {availableInventory.length === 0 ? (
                <div className="col-span-2 text-center py-10 text-slate-500 text-xs font-medium">
                  No available items found in {currentCity} warehouse. Relocate/procure assets first.
                </div>
              ) : (
                availableInventory.map(asset => (
                  <div
                    key={asset.id}
                    className="p-3 bg-slate-900/20 border border-slate-800/80 rounded-xl flex justify-between items-center text-xs"
                  >
                    <div>
                      <h4 className="font-bold text-white leading-tight">{asset.brand} {asset.model}</h4>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">{asset.category} | {asset.id}</p>
                      <div className="text-[10px] text-slate-400 mt-1 flex gap-3">
                        <span>Rent: <strong>₹{asset.monthlyRentalPrice}</strong></span>
                        <span>Dep: <strong>₹{asset.securityDeposit}</strong></span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAddToCart(asset)}
                      className="bg-indigo-600/10 hover:bg-indigo-600 border border-indigo-500/20 hover:border-indigo-500 text-indigo-300 hover:text-white rounded-lg px-2.5 py-1.5 transition-all text-[11px] font-bold cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Checkout Cart Summary */}
        <div className="space-y-5">
          <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between min-h-[400px]">
            <div className="space-y-4 text-xs">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2">
                Checkout Basket ({cart.length})
              </h3>

              {/* Cart List */}
              <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                {cart.length === 0 ? (
                  <div className="text-center py-10 text-slate-500 text-xs font-medium">
                    Basket is empty. Select items to checkout.
                  </div>
                ) : (
                  cart.map(item => (
                    <div key={item.id} className="p-2 rounded-xl bg-slate-950/40 border border-slate-900 flex justify-between items-center">
                      <div>
                        <span className="font-bold text-white block">{item.brand} {item.model}</span>
                        <span className="text-[9px] text-slate-500 font-mono mt-0.5">{item.id}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-slate-300 font-mono block">₹{item.monthlyRentalPrice}</span>
                          <span className="text-[9px] text-slate-500 font-mono block">Dep: ₹{item.securityDeposit}</span>
                        </div>
                        <button
                          onClick={() => handleRemoveFromCart(item.id)}
                          className="text-slate-500 hover:text-rose-400 transition-colors p-1"
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
                  {/* Duration Slider/Select */}
                  <div>
                    <label className="text-slate-400 font-medium block mb-1">Rental Duration (Months)</label>
                    <select
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                      className="w-full text-xs py-1.5 rounded-lg px-2"
                    >
                      <option value={2}>2 Months (Min Duration)</option>
                      <option value={3}>3 Months</option>
                      <option value={6}>6 Months</option>
                      <option value={12}>12 Months</option>
                      <option value={18}>18 Months (Admin Custom)</option>
                    </select>
                  </div>

                  {/* Discount / coupon input */}
                  {/* Discount / coupon input */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-slate-400 font-medium block">Manual Disc</label>
                        <button
                          type="button"
                          onClick={() => {
                            setDiscount(0);
                            setDiscountType(discountType === 'flat' ? 'percent' : 'flat');
                          }}
                          className="text-[9px] text-indigo-400 hover:text-indigo-300 font-bold uppercase focus:outline-none"
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
                          className="pl-6 w-full rounded-lg py-1 text-xs bg-slate-900 border border-slate-800 text-slate-200"
                          placeholder={discountType === 'flat' ? 'Flat' : 'Percent'}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-400 font-medium block">Coupon Code</label>
                      <input
                        type="text"
                        value={coupon}
                        onChange={(e) => setCoupon(e.target.value)}
                        placeholder="e.g. WELCOME10"
                        className="w-full rounded-lg px-2 py-1 text-xs uppercase bg-slate-900 border border-slate-800 text-slate-200"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Calculations Breakdown */}
            {cart.length > 0 && (
              <div className="space-y-3 mt-4 pt-4 border-t border-slate-800 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Gross Furniture Rent/mo:</span>
                  <span className="font-mono text-slate-200">₹{cartRent}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Contract Duration:</span>
                  <span className="font-mono text-slate-200">{duration} Months</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Agreement Security Deposit:</span>
                  <span className="font-mono text-slate-200">₹{cartDeposit}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-rose-400">
                    <span>Discount Applied:</span>
                    <span className="font-mono">
                      -{discountType === 'flat' ? '₹' : ''}
                      {discount}
                      {discountType === 'percent' ? '%' : ''} (₹{discountAmt})
                    </span>
                  </div>
                )}
                
                <div className="flex justify-between text-slate-200">
                  <span>Net Rent/mo:</span>
                  <span className="font-mono text-slate-200">₹{totalRentNet}</span>
                </div>
                
                <div className="flex justify-between text-slate-200 border-t border-slate-900 pt-2 text-sm">
                  <span className="font-bold">Total First Payment:</span>
                  <span className="font-mono font-black text-indigo-400">₹{checkoutTotal.toLocaleString()}</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  * First payment includes 100% refundable security deposit + first month's rental fee.
                </p>

                <button
                  onClick={handlePOSCheckout}
                  disabled={!selectedCustId}
                  className={`w-full py-2.5 rounded-xl font-bold text-white text-center cursor-pointer shadow-lg transition-all ${
                    selectedCustId
                      ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/10'
                      : 'bg-slate-800 border border-slate-700/40 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  Confirm POS Rental Checkout
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Checkout Receipt Slide-over Modal */}
      {checkedOutOrder && (
        <div className="fixed inset-0 bg-[#030303]/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-[450px] bg-white text-slate-900 rounded-3xl p-6 shadow-2xl relative flex flex-col justify-between min-h-[500px] border border-slate-200">
            <button
              onClick={() => setCheckedOutOrder(null)}
              className="absolute top-4 right-4 p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-xl font-black">
                ✓
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900">Rental Agreement Created</h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">Agreement ID: {checkedOutOrder.id}</p>
              </div>

              {/* Receipt Body */}
              <div className="text-left border-t border-dashed border-slate-200 pt-4 space-y-3.5 text-xs text-slate-700">
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <strong className="text-slate-900">{checkedOutOrder.customerName}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Rental Term:</span>
                  <strong className="text-slate-900 font-mono">{checkedOutOrder.durationMonths} Months</strong>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rented items</span>
                  <div className="space-y-1 pl-1 text-[11px]">
                    {checkedOutOrder.items.map((item: any, i: number) => (
                      <div key={i} className="flex justify-between">
                        <span>{item.category} ({item.assetId})</span>
                        <span className="font-mono text-slate-900">₹{item.monthlyRentalPrice}/mo</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3 space-y-2 font-mono text-[11px]">
                  <div className="flex justify-between text-slate-500">
                    <span>Security Deposit Hold:</span>
                    <span>₹{checkedOutOrder.totalDeposit}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Monthly Rent Charge:</span>
                    <span>₹{checkedOutOrder.netMonthlyRent}</span>
                  </div>
                  <div className="flex justify-between text-slate-900 font-bold border-t border-slate-100 pt-2 text-xs">
                    <span>First Payment Total:</span>
                    <span>₹{(checkedOutOrder.totalDeposit + checkedOutOrder.netMonthlyRent).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Barcode scanner note */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-150 text-[10px] text-slate-500 text-left leading-normal">
                🚨 <strong>Logistics Scan Mandatory</strong>: Items must be verified with the handheld barcode scanner before loading and dispatching to customer. No shipping allowed without scan check.
              </div>
            </div>

            <div className="flex gap-3 pt-5 border-t border-slate-100">
              <button
                onClick={() => {
                  window.print();
                }}
                className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4.5 h-4.5" /> Print Receipt
              </button>
              <button
                onClick={() => setCheckedOutOrder(null)}
                className="flex-1 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-semibold cursor-pointer"
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
