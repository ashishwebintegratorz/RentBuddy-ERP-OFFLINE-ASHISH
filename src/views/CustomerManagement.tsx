import React, { useState } from 'react';
import { useRentBuddyStore } from '../store/rentBuddyStore';
import { Customer, CustomerStatus, VerificationStatus } from '../types';
import { compressImage } from '../utils/compressor';
import { SVG_AVATAR_PLACEHOLDER, SVG_DOCUMENT_PLACEHOLDER } from '../utils/placeholderAssets';
import {
  Search,
  Plus,
  X,
  FileText,
  Check,
  AlertTriangle,
  UserCheck,
  Building,
  MapPin,
  IndianRupee,
  Phone,
  Mail,
  History,
  ShieldAlert
} from 'lucide-react';
import { matchCityContext } from '../utils/cityUtils';

export default function CustomerManagement() {
  const {
    customers,
    addCustomer,
    updateCustomerStatus,
    verifyCustomerDocuments,
    orders,
    invoices,
    complaints,
    inventory,
    currentCity,
  } = useRentBuddyStore();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressedDataUrl = await compressImage(file, 300, 0.6);
      setter(compressedDataUrl);
    } catch (err) {
      console.error("Error compressing image:", err);
      const reader = new FileReader();
      reader.onloadend = () => {
        setter(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // New Customer State Form
  const [newCust, setNewCust] = useState({
    fullName: '',
    mobileNumber: '',
    alternateNumber: '',
    email: '',
    aadhaarNumber: '',
    panNumber: '',
    occupation: '',
    employer: '',
    monthlyIncome: 0,
    currentAddress: '',
    permanentAddress: '',
    landmark: '',
    gpsLocation: '22.5244, 75.9207',
    deliveryAddress: '',
    billingAddress: '',
    landlordName: '',
    landlordMobile: '',
    landlordId: '',
  });

  const [uploadedDoc, setUploadedDoc] = useState(false);
  const [aadhaarFront, setAadhaarFront] = useState('');
  const [aadhaarBack, setAadhaarBack] = useState('');
  const [panCard, setPanCard] = useState('');
  const [rentAgreement, setRentAgreement] = useState('');
  const [selfie, setSelfie] = useState('');

  // Integrated checkout states
  const [rentImmediately, setRentImmediately] = useState(false);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [duration, setDuration] = useState<number>(3);
  const [discountType, setDiscountType] = useState<'flat' | 'percent'>('flat');
  const [discount, setDiscount] = useState<number>(0);
  const [depDiscountType, setDepDiscountType] = useState<'flat' | 'percent'>('flat');
  const [depDiscount, setDepDiscount] = useState<number>(0);
  const [coupon, setCoupon] = useState('');

  // Calculations for onboarding checkout preview
  const availableInventory = inventory.filter(
    a => a.city === currentCity && a.status === 'Available' && !selectedAssets.includes(a.id)
  );

  const selectedInventoryItems = inventory.filter(a => selectedAssets.includes(a.id));
  const cartDeposit = selectedInventoryItems.reduce((sum, item) => sum + item.securityDeposit, 0);
  const cartRent = selectedInventoryItems.reduce((sum, item) => sum + item.monthlyRentalPrice, 0);

  const discountAmt = discountType === 'percent'
    ? Math.round(cartRent * (discount / 100))
    : discount;

  const totalRentNet = Math.max(100, cartRent - discountAmt);

  const depositDiscountAmt = depDiscountType === 'percent'
    ? Math.round(cartDeposit * (depDiscount / 100))
    : depDiscount;

  const netDepositVal = Math.max(0, cartDeposit - depositDiscountAmt);
  const checkoutTotal = netDepositVal + totalRentNet;

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCust.fullName || !newCust.mobileNumber) return;
    if (rentImmediately && !rentAgreement) {
      alert("⚠️ You must upload the Rent Agreement to proceed with instant checkout!");
      return;
    }

    const checkoutCart = rentImmediately && selectedAssets.length > 0 ? {
      items: selectedAssets.map(id => ({ assetId: id })),
      durationMonths: duration,
      discountType: discountType,
      discountValue: discount,
      depositDiscountType: depDiscountType,
      depositDiscountValue: depDiscount,
      couponCode: coupon || undefined,
    } : undefined;

    addCustomer({
      ...newCust,
      city: currentCity === 'All Cities' || currentCity === 'All' ? 'Indore (Head Office)' : currentCity,
      deliveryAddress: newCust.deliveryAddress || newCust.currentAddress || `${currentCity} Area`,
      billingAddress: newCust.billingAddress || newCust.currentAddress || `${currentCity} Area`,
      documents: {
        aadhaarFront: aadhaarFront || SVG_DOCUMENT_PLACEHOLDER,
        aadhaarBack: aadhaarBack || SVG_DOCUMENT_PLACEHOLDER,
        panCard: panCard || SVG_DOCUMENT_PLACEHOLDER,
        rentAgreement: rentAgreement || SVG_DOCUMENT_PLACEHOLDER,
        selfie: selfie || SVG_AVATAR_PLACEHOLDER,
      }
    }, checkoutCart);

    // Reset Form
    setNewCust({
      fullName: '',
      mobileNumber: '',
      alternateNumber: '',
      email: '',
      aadhaarNumber: '',
      panNumber: '',
      occupation: '',
      employer: '',
      monthlyIncome: 0,
      currentAddress: '',
      permanentAddress: '',
      landmark: '',
      gpsLocation: '22.5244, 75.9207',
      deliveryAddress: '',
      billingAddress: '',
      landlordName: '',
      landlordMobile: '',
      landlordId: '',
    });
    setUploadedDoc(false);
    setAadhaarFront('');
    setAadhaarBack('');
    setPanCard('');
    setRentAgreement('');
    setSelfie('');
    setRentImmediately(false);
    setSelectedAssets([]);
    setDuration(3);
    setDiscount(0);
    setDiscountType('flat');
    setDepDiscount(0);
    setDepDiscountType('flat');
    setCoupon('');
    setShowAddForm(false);
  };

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  // History collections
  const customerOrders = orders.filter(o => o.customerId === selectedCustomerId);
  const customerInvoices = invoices.filter(i => i.customerId === selectedCustomerId);
  const customerComplaints = complaints.filter(c => c.customerId === selectedCustomerId);

  // Filter list strictly by active city context (or all if All Cities)
  const filteredCustomers = customers.filter(c => {
    const matchesCity = matchCityContext(c.city || c.deliveryAddress || c.currentAddress, currentCity);
    const matchesSearch = (c.fullName || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.mobileNumber || '').includes(search) ||
      (c.id || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.panNumber && c.panNumber.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
    return matchesCity && matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: CustomerStatus) => {
    switch (status) {
      case 'Good Customer':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Good</span>;
      case 'VIP':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">VIP</span>;
      case 'Verified':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/10 text-teal-400 border border-teal-500/20">Verified</span>;
      case 'Defaulter':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">Defaulter</span>;
      case 'High Risk':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20">High Risk</span>;
      case 'Blacklisted':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">Blacklisted</span>;
    }
  };

  const getKYCBadge = (status: VerificationStatus) => {
    switch (status) {
      case 'Verified':
        return <span className="text-emerald-400 flex items-center gap-1 font-semibold">✔️ KYC Verified</span>;
      case 'Rejected':
        return <span className="text-rose-400 flex items-center gap-1 font-semibold">❌ Rejected</span>;
      default:
        return <span className="text-amber-400 flex items-center gap-1 font-semibold">⏳ Verification Pending</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 flex gap-6 relative">

      {/* Main Panel */}
      <div className="flex-1 space-y-4">
        {/* Filters Panel */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-4 rounded-2xl">
          <div className="relative w-72">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search customers by name, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-full rounded-xl text-xs py-2 bg-slate-900/40"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl text-xs py-2 px-3 bg-slate-900/40 border border-slate-800"
            >
              <option value="All">All Statuses</option>
              <option value="Good Customer">Good Customer</option>
              <option value="Verified">Verified</option>
              <option value="VIP">VIP</option>
              <option value="Defaulter">Defaulter</option>
              <option value="High Risk">High Risk</option>
              <option value="Blacklisted">Blacklisted</option>
            </select>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold px-4 py-2 flex items-center gap-2 cursor-pointer shadow-lg shadow-red-600/10"
            >
              <Plus className="w-4 h-4" /> Add Customer
            </button>
          </div>
        </div>

        {/* Directory Table */}
        <div className="glass-panel rounded-2xl overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/40 text-slate-400 border-b border-slate-800/80">
                <th className="p-4 font-bold uppercase tracking-wider">Customer Details</th>
                <th className="p-4 font-bold uppercase tracking-wider">KYC Status</th>
                <th className="p-4 font-bold uppercase tracking-wider">Status Badge</th>
                <th className="p-4 font-bold uppercase tracking-wider">Income & Job</th>
                <th className="p-4 font-bold uppercase tracking-wider">Onboarded</th>
                <th className="p-4 font-bold uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredCustomers.map(c => (
                <tr
                  key={c.id}
                  onClick={() => setSelectedCustomerId(c.id)}
                  className={`hover:bg-slate-800/15 cursor-pointer transition-colors ${selectedCustomerId === c.id ? 'bg-red-900/5' : ''
                    }`}
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <img src={c.documents.selfie} className="w-8 h-8 rounded-lg object-cover border border-slate-700/80" alt={c.fullName} />
                      <div>
                        <div className="font-bold text-white text-sm">{c.fullName}</div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">{c.id} | {c.mobileNumber}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="font-medium">
                      {c.verificationStatus === 'Verified' ? (
                        <span className="text-emerald-400 font-semibold">✔️ Approved</span>
                      ) : c.verificationStatus === 'Rejected' ? (
                        <span className="text-rose-400 font-semibold">❌ Rejected</span>
                      ) : (
                        <span className="text-amber-400 font-semibold">⏳ Pending Approval</span>
                      )}
                    </div>
                  </td>
                  <td className="p-4">{getStatusBadge(c.status)}</td>
                  <td className="p-4 text-slate-300">
                    <div>{c.occupation}</div>
                    <div className="text-[10px] text-slate-500">{c.employer}</div>
                  </td>
                  <td className="p-4 text-slate-400 font-mono">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCustomerId(c.id);
                      }}
                      className="text-red-400 hover:text-red-300 font-semibold text-[11px]"
                    >
                      Inspect Profile
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over Profile Details Panel */}
      {selectedCustomerId && selectedCustomer && (
        <div className="w-[380px] glass-panel border border-slate-800/90 rounded-2xl p-5 space-y-5 flex-shrink-0 animate-fade-in max-h-[85vh] overflow-y-auto z-10">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-white text-sm">Customer Profile Overview</h3>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">{selectedCustomer.id}</p>
            </div>
            <button
              onClick={() => setSelectedCustomerId(null)}
              className="p-1 rounded bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Profile Header */}
          <div className="flex items-center gap-4">
            {selectedCustomer.documents?.selfie ? (
              <img src={selectedCustomer.documents.selfie} className="w-14 h-14 rounded-xl object-cover border border-slate-700" alt="Selfie" />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-red-600/20 border border-red-500/30 text-red-300 font-bold flex items-center justify-center text-lg">
                {(selectedCustomer.fullName || 'CU').substring(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h4 className="font-bold text-white text-base">{selectedCustomer.fullName || 'Customer'}</h4>
              <div className="mt-1 flex gap-1.5 items-center">
                {getStatusBadge(selectedCustomer.status)}
              </div>
            </div>
          </div>

          {/* Contact Details */}
          <div className="space-y-2.5 text-xs bg-slate-950/40 p-3 rounded-xl border border-slate-900">
            <div className="flex items-center gap-2 text-slate-300">
              <Phone className="w-3.5 h-3.5 text-slate-500" />
              <span>{selectedCustomer.mobileNumber || 'N/A'}</span>
              {selectedCustomer.alternateNumber && (
                <span className="text-[10px] text-slate-500">({selectedCustomer.alternateNumber})</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <Mail className="w-3.5 h-3.5 text-slate-500" />
              <span>{selectedCustomer.email || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <Building className="w-3.5 h-3.5 text-slate-500" />
              <span>{selectedCustomer.occupation || 'Professional'} {selectedCustomer.employer ? `at ${selectedCustomer.employer}` : ''}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <IndianRupee className="w-3.5 h-3.5 text-slate-500" />
              <span>Income: ₹{(selectedCustomer.monthlyIncome || 0).toLocaleString()}/mo</span>
            </div>
          </div>

          {/* Addresses */}
          <div className="space-y-3 text-xs">
            <h5 className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Addresses</h5>
            <div className="space-y-2">
              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="font-semibold block text-[10px] text-red-400">Current Address</span>
                <span className="text-slate-200 text-xs mt-0.5 block">{selectedCustomer.currentAddress || selectedCustomer.deliveryAddress || `${selectedCustomer.city || 'Regional'} Hub Area`}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="font-semibold block text-[10px] text-emerald-400">Billing Address</span>
                <span className="text-slate-200 text-xs mt-0.5 block">{selectedCustomer.billingAddress || selectedCustomer.deliveryAddress || selectedCustomer.currentAddress || `${selectedCustomer.city || 'Regional'} Hub Area`}</span>
              </div>
            </div>
          </div>

          {/* Verification documents & KYC actions */}
          <div className="space-y-3 bg-slate-900/10 border border-slate-850 p-4 rounded-xl">
            <h5 className="font-bold text-slate-400 uppercase tracking-wider text-[10px] flex justify-between">
              <span>KYC Compliance Logs</span>
              <span>{getKYCBadge(selectedCustomer.verificationStatus)}</span>
            </h5>

            {/* Document link simulations */}
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              {selectedCustomer.documents?.aadhaarFront ? (
                <a href={selectedCustomer.documents.aadhaarFront} target="_blank" rel="noreferrer" className="p-1.5 bg-slate-950/60 rounded border border-slate-800 text-slate-400 hover:text-white flex items-center gap-1">
                  <FileText className="w-3 h-3 text-red-400" /> Aadhaar Front
                </a>
              ) : (
                <div className="p-1.5 bg-slate-950/40 rounded border border-slate-900 text-slate-600 flex items-center gap-1">
                  <FileText className="w-3 h-3 text-slate-600" /> Aadhaar Front (N/A)
                </div>
              )}

              {selectedCustomer.documents?.aadhaarBack ? (
                <a href={selectedCustomer.documents.aadhaarBack} target="_blank" rel="noreferrer" className="p-1.5 bg-slate-950/60 rounded border border-slate-800 text-slate-400 hover:text-white flex items-center gap-1">
                  <FileText className="w-3 h-3 text-red-400" /> Aadhaar Back
                </a>
              ) : (
                <div className="p-1.5 bg-slate-950/40 rounded border border-slate-900 text-slate-600 flex items-center gap-1">
                  <FileText className="w-3 h-3 text-slate-600" /> Aadhaar Back (N/A)
                </div>
              )}

              {selectedCustomer.documents?.panCard ? (
                <a href={selectedCustomer.documents.panCard} target="_blank" rel="noreferrer" className="p-1.5 bg-slate-950/60 rounded border border-slate-800 text-slate-400 hover:text-white flex items-center gap-1">
                  <FileText className="w-3 h-3 text-red-400" /> PAN Card
                </a>
              ) : (
                <div className="p-1.5 bg-slate-950/40 rounded border border-slate-900 text-slate-600 flex items-center gap-1">
                  <FileText className="w-3 h-3 text-slate-600" /> PAN Card (N/A)
                </div>
              )}

              {selectedCustomer.documents?.rentAgreement ? (
                <a href={selectedCustomer.documents.rentAgreement} target="_blank" rel="noreferrer" className="p-1.5 bg-slate-950/60 rounded border border-slate-800 text-slate-400 hover:text-white flex items-center gap-1">
                  <FileText className="w-3 h-3 text-red-400" /> Rent Agreement
                </a>
              ) : (
                <div className="p-1.5 bg-slate-950/40 rounded border border-slate-900 text-slate-600 flex items-center gap-1">
                  <FileText className="w-3 h-3 text-slate-600" /> Rent Agreement (N/A)
                </div>
              )}
            </div>

            {/* Verification Actions */}
            {selectedCustomer.verificationStatus === 'Pending' && (
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => verifyCustomerDocuments(selectedCustomer.id, 'Verified')}
                  className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-[10px] font-bold text-white cursor-pointer"
                >
                  Approve Verification
                </button>
                <button
                  onClick={() => verifyCustomerDocuments(selectedCustomer.id, 'Rejected')}
                  className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-500 rounded-lg text-[10px] font-bold text-white cursor-pointer"
                >
                  Reject Verification
                </button>
              </div>
            )}

            {/* Switch overall profile status (Defaulter, VIP) */}
            <div className="pt-2 border-t border-slate-800">
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Set Customer Flag</label>
              <select
                value={selectedCustomer.status}
                onChange={(e) => updateCustomerStatus(selectedCustomer.id, e.target.value as CustomerStatus)}
                className="w-full text-[10px] py-1 bg-slate-950 border border-slate-850 rounded"
              >
                <option value="Good Customer">Good Customer</option>
                <option value="Verified">Verified</option>
                <option value="VIP">VIP</option>
                <option value="Defaulter">Defaulter</option>
                <option value="High Risk">High Risk</option>
                <option value="Blacklisted">Blacklisted</option>
              </select>
            </div>
          </div>

          {/* Customer History Accordions */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <h5 className="font-bold text-slate-400 uppercase tracking-wider text-[10px] flex items-center gap-1">
              <History className="w-3 h-3" /> Agreement & Payment Ledger
            </h5>
            <div className="space-y-2 text-[11px] max-h-40 overflow-y-auto">
              {customerOrders.length === 0 ? (
                <div className="text-slate-600 text-center py-2">No active rental agreements.</div>
              ) : (
                customerOrders.map(o => (
                  <div key={o.id} className="p-2 bg-slate-900/30 rounded border border-slate-800/40 flex justify-between items-center">
                    <div>
                      <span className="font-semibold text-white block">Order {o.id}</span>
                      <span className="text-[9px] text-slate-500 font-mono">{o.items.length} items | {o.durationMonths} Months</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[8px] bg-red-500/10 text-red-400 font-semibold">{o.status}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Dialog Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-[#030303]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-[550px] glass-panel border border-slate-800/90 rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">Onboard New Customer (Wizard)</h3>
              <button
                onClick={() => setShowAddForm(false)}
                className="p-1 rounded bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 block font-medium">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newCust.fullName}
                    onChange={(e) => setNewCust({ ...newCust, fullName: e.target.value })}
                    className="w-full rounded-lg px-2.5 py-2"
                    placeholder="Enter full name"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 block font-medium">Mobile Number *</label>
                  <input
                    type="text"
                    required
                    value={newCust.mobileNumber}
                    onChange={(e) => setNewCust({ ...newCust, mobileNumber: e.target.value })}
                    className="w-full rounded-lg px-2.5 py-2"
                    placeholder="Primary mobile"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 block font-medium">Email Address</label>
                  <input
                    type="email"
                    value={newCust.email}
                    onChange={(e) => setNewCust({ ...newCust, email: e.target.value })}
                    className="w-full rounded-lg px-2.5 py-2"
                    placeholder="name@gmail.com"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 block font-medium">Alternate Number</label>
                  <input
                    type="text"
                    value={newCust.alternateNumber}
                    onChange={(e) => setNewCust({ ...newCust, alternateNumber: e.target.value })}
                    className="w-full rounded-lg px-2.5 py-2"
                    placeholder="Optional backup"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 block font-medium">Aadhaar Number (12 Digit)</label>
                  <input
                    type="text"
                    value={newCust.aadhaarNumber}
                    onChange={(e) => setNewCust({ ...newCust, aadhaarNumber: e.target.value })}
                    className="w-full rounded-lg px-2.5 py-2"
                    placeholder="xxxx xxxx xxxx"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 block font-medium">PAN Number</label>
                  <input
                    type="text"
                    value={newCust.panNumber}
                    onChange={(e) => setNewCust({ ...newCust, panNumber: e.target.value })}
                    className="w-full rounded-lg px-2.5 py-2"
                    placeholder="ABCDE1234F"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1">
                  <label className="text-slate-400 block font-medium">Employer / Office</label>
                  <input
                    type="text"
                    value={newCust.employer}
                    onChange={(e) => setNewCust({ ...newCust, employer: e.target.value })}
                    className="w-full rounded-lg px-2.5 py-2"
                    placeholder="Company Name"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 block font-medium">Monthly Income</label>
                  <input
                    type="number"
                    value={newCust.monthlyIncome || ''}
                    onChange={(e) => setNewCust({ ...newCust, monthlyIncome: Number(e.target.value) })}
                    className="w-full rounded-lg px-2.5 py-2"
                    placeholder="INR"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block font-medium">Delivery Address</label>
                <textarea
                  value={newCust.deliveryAddress}
                  onChange={(e) => setNewCust({ ...newCust, deliveryAddress: e.target.value })}
                  className="w-full rounded-lg px-2.5 py-2"
                  rows={2}
                  placeholder="Address where furniture will be delivered"
                />
              </div>

              {/* Landlord details for rent agreements */}
              <div className="p-3.5 bg-slate-950/40 rounded-xl border border-slate-900 space-y-3">
                <span className="font-bold text-red-400 block uppercase tracking-wider text-[9px]">Landlord / Property Reference</span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-400 block text-[10px]">Landlord Name</label>
                    <input
                      type="text"
                      value={newCust.landlordName}
                      onChange={(e) => setNewCust({ ...newCust, landlordName: e.target.value })}
                      className="w-full rounded-lg px-2.5 py-1.5"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-400 block text-[10px]">Landlord Mobile</label>
                    <input
                      type="text"
                      value={newCust.landlordMobile}
                      onChange={(e) => setNewCust({ ...newCust, landlordMobile: e.target.value })}
                      className="w-full rounded-lg px-2.5 py-1.5"
                    />
                  </div>
                </div>
              </div>

              {/* Document uploads */}
              <div className="space-y-3">
                <span className="text-slate-400 block font-medium">Upload Customer Documents</span>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {/* Aadhaar Front */}
                  <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-xl space-y-1.5 flex flex-col justify-between">
                    <label className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Aadhaar Front</label>
                    {aadhaarFront ? (
                      <div className="relative h-16 w-full bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex items-center justify-center">
                        <img src={aadhaarFront} alt="Aadhaar Front" className="h-full w-auto object-cover" />
                        <button type="button" onClick={() => setAadhaarFront('')} className="absolute top-1 right-1 p-0.5 bg-rose-500 rounded text-white text-[8px] font-bold">Remove</button>
                      </div>
                    ) : (
                      <label className="h-16 w-full bg-slate-950/60 border border-dashed border-slate-800 hover:border-red-500/50 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors">
                        <span className="text-[9px] text-slate-500 font-bold">📁 Upload Image</span>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, setAadhaarFront)} />
                      </label>
                    )}
                  </div>

                  {/* Aadhaar Back */}
                  <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-xl space-y-1.5 flex flex-col justify-between">
                    <label className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Aadhaar Back</label>
                    {aadhaarBack ? (
                      <div className="relative h-16 w-full bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex items-center justify-center">
                        <img src={aadhaarBack} alt="Aadhaar Back" className="h-full w-auto object-cover" />
                        <button type="button" onClick={() => setAadhaarBack('')} className="absolute top-1 right-1 p-0.5 bg-rose-500 rounded text-white text-[8px] font-bold">Remove</button>
                      </div>
                    ) : (
                      <label className="h-16 w-full bg-slate-950/60 border border-dashed border-slate-800 hover:border-red-500/50 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors">
                        <span className="text-[9px] text-slate-500 font-bold">📁 Upload Image</span>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, setAadhaarBack)} />
                      </label>
                    )}
                  </div>

                  {/* PAN Card */}
                  <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-xl space-y-1.5 flex flex-col justify-between">
                    <label className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">PAN Card</label>
                    {panCard ? (
                      <div className="relative h-16 w-full bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex items-center justify-center">
                        <img src={panCard} alt="PAN Card" className="h-full w-auto object-cover" />
                        <button type="button" onClick={() => setPanCard('')} className="absolute top-1 right-1 p-0.5 bg-rose-500 rounded text-white text-[8px] font-bold">Remove</button>
                      </div>
                    ) : (
                      <label className="h-16 w-full bg-slate-950/60 border border-dashed border-slate-800 hover:border-red-500/50 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors">
                        <span className="text-[9px] text-slate-500 font-bold">📁 Upload Image</span>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, setPanCard)} />
                      </label>
                    )}
                  </div>

                  {/* Rent Agreement - Mandatory for checkouts */}
                  <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-xl space-y-1.5 flex flex-col justify-between col-span-2">
                    <label className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">
                      Rent Agreement {rentImmediately && <span className="text-rose-500 font-extrabold">* (Required)</span>}
                    </label>
                    {rentAgreement ? (
                      <div className="relative h-16 w-full bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-center gap-1.5 px-3">
                        <span className="text-emerald-400 text-lg">📄</span>
                        <div className="flex-1 overflow-hidden">
                          <span className="text-[9px] font-bold text-emerald-300 block truncate">Agreement Attached</span>
                          <span className="text-[8px] text-slate-400 block truncate font-mono">agreement.pdf</span>
                        </div>
                        <button type="button" onClick={() => setRentAgreement('')} className="p-0.5 bg-rose-500 rounded text-white text-[8px] font-bold">Remove</button>
                      </div>
                    ) : (
                      <label className={`h-16 w-full border border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors ${rentImmediately ? 'border-rose-500/40 hover:border-rose-500 bg-rose-500/5' : 'border-slate-800 hover:border-red-500/50 bg-slate-950/60'
                        }`}>
                        <span className="text-[9px] text-slate-500 font-bold">📄 Upload Rent Agreement</span>
                        <span className="text-[8px] text-slate-600 block">(PDF or Image)</span>
                        <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => handleFileChange(e, setRentAgreement)} />
                      </label>
                    )}
                  </div>

                  {/* Selfie */}
                  <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-xl space-y-1.5 flex flex-col justify-between">
                    <label className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Selfie / Photo</label>
                    {selfie ? (
                      <div className="relative h-16 w-full bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex items-center justify-center">
                        <img src={selfie} alt="Selfie" className="h-full w-auto object-cover" />
                        <button type="button" onClick={() => setSelfie('')} className="absolute top-1 right-1 p-0.5 bg-rose-500 rounded text-white text-[8px] font-bold">Remove</button>
                      </div>
                    ) : (
                      <label className="h-16 w-full bg-slate-950/60 border border-dashed border-slate-800 hover:border-red-500/50 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors">
                        <span className="text-[9px] text-slate-500 font-bold">📁 Upload Image</span>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, setSelfie)} />
                      </label>
                    )}
                  </div>
                </div>
              </div>

              {/* Integrated Checkout Flow */}
              <div className="p-3.5 bg-slate-950/40 rounded-xl border border-slate-900 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-red-400 block uppercase tracking-wider text-[9px]">Rent Assets Immediately?</span>
                  <input
                    type="checkbox"
                    checked={rentImmediately}
                    onChange={(e) => setRentImmediately(e.target.checked)}
                    className="w-4 h-4 rounded text-red-600 focus:ring-red-500 bg-slate-900 border-slate-800"
                  />
                </div>

                {rentImmediately && (
                  <div className="space-y-3 pt-2 border-t border-slate-800 animate-fade-in text-xs">
                    {/* Catalog selection */}
                    <div className="space-y-1.5">
                      <label className="text-slate-400 block text-[10px]">Select Available Assets ({currentCity})</label>
                      {availableInventory.length === 0 ? (
                        <div className="text-[10px] text-slate-500 py-1 font-medium text-center">No available items in {currentCity}.</div>
                      ) : (
                        <div className="grid grid-cols-2 gap-1.5 max-h-[120px] overflow-y-auto pr-1">
                          {availableInventory.map(asset => (
                            <button
                              key={asset.id}
                              type="button"
                              onClick={() => setSelectedAssets([...selectedAssets, asset.id])}
                              className="text-left p-1.5 bg-slate-900 hover:bg-red-950/30 border border-slate-850 rounded text-[10px] text-slate-300 flex justify-between items-center transition-colors cursor-pointer"
                            >
                              <span className="truncate flex-1 font-semibold">{asset.brand} {asset.category}</span>
                              <span className="font-mono text-[9px] text-red-400 pl-1">₹{asset.monthlyRentalPrice}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Selected assets */}
                    {selectedAssets.length > 0 && (
                      <div className="space-y-1">
                        <label className="text-slate-400 block text-[10px] font-bold">Selected for Cart:</label>
                        <div className="flex flex-wrap gap-1">
                          {selectedAssets.map(id => {
                            const item = inventory.find(a => a.id === id);
                            return (
                              <div key={id} className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-[10px] text-slate-300">
                                <span>{item?.category} ({id})</span>
                                <button
                                  type="button"
                                  onClick={() => setSelectedAssets(selectedAssets.filter(aid => aid !== id))}
                                  className="text-rose-400 hover:text-rose-300 font-bold focus:outline-none cursor-pointer"
                                >
                                  ×
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Rental Duration */}
                    <div className="space-y-1">
                      <label className="text-slate-400 block text-[10px]">Rental Term Duration</label>
                      <select
                        value={duration}
                        onChange={(e) => setDuration(Number(e.target.value))}
                        className="w-full text-[11px] py-1 bg-slate-900 border border-slate-800 rounded text-slate-200 cursor-pointer"
                      >
                        <option value={2}>2 Months (Minimum)</option>
                        <option value={3}>3 Months</option>
                        <option value={6}>6 Months</option>
                        <option value={12}>12 Months</option>
                      </select>
                    </div>
                    {/* Discount Input & Toggle */}
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-slate-400">Rent Discount</label>
                          <button
                            type="button"
                            onClick={() => {
                              setDiscount(0);
                              setDiscountType(discountType === 'flat' ? 'percent' : 'flat');
                            }}
                            className="text-[9px] text-red-400 hover:text-red-300 font-bold uppercase focus:outline-none cursor-pointer"
                          >
                            Toggle {discountType === 'flat' ? '%' : '₹'}
                          </button>
                        </div>
                        <div className="relative">
                          <span className="absolute left-2 top-1 text-slate-500 font-semibold">{discountType === 'flat' ? '₹' : '%'}</span>
                          <input
                            type="number"
                            value={discount || ''}
                            onChange={(e) => setDiscount(Number(e.target.value))}
                            className="pl-5 w-full rounded py-0.5 bg-slate-900 border border-slate-800 text-slate-200"
                            placeholder={discountType === 'flat' ? 'Flat' : 'Percent'}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-slate-400">Coupon Code</label>
                        <input
                          type="text"
                          value={coupon}
                          onChange={(e) => setCoupon(e.target.value)}
                          placeholder="e.g. WELCOME"
                          className="w-full rounded py-0.5 uppercase bg-slate-900 border border-slate-800 text-slate-200"
                        />
                      </div>
                    </div>

                    {/* Deposit Discount Input & Toggle */}
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="space-y-1 col-span-2">
                        <div className="flex items-center justify-between">
                          <label className="text-slate-400">Deposit Discount</label>
                          <button
                            type="button"
                            onClick={() => {
                              setDepDiscount(0);
                              setDepDiscountType(depDiscountType === 'flat' ? 'percent' : 'flat');
                            }}
                            className="text-[9px] text-red-400 hover:text-red-300 font-bold uppercase focus:outline-none cursor-pointer"
                          >
                            Toggle {depDiscountType === 'flat' ? '%' : '₹'}
                          </button>
                        </div>
                        <div className="relative">
                          <span className="absolute left-2 top-1 text-slate-500 font-semibold">{depDiscountType === 'flat' ? '₹' : '%'}</span>
                          <input
                            type="number"
                            value={depDiscount || ''}
                            onChange={(e) => setDepDiscount(Number(e.target.value))}
                            className="pl-5 w-full rounded py-0.5 bg-slate-900 border border-slate-800 text-slate-200"
                            placeholder={depDiscountType === 'flat' ? 'Flat' : 'Percent'}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Calculations Summary */}
                    <div className="pt-2 border-t border-slate-800 space-y-1 font-mono text-[10px]">
                      <div className="flex justify-between text-slate-400">
                        <span>Gross Security Deposit:</span>
                        <span>₹{cartDeposit}</span>
                      </div>
                      {depDiscount > 0 && (
                        <div className="flex justify-between text-rose-400">
                          <span>Deposit Discount:</span>
                          <span>
                            -{depDiscountType === 'flat' ? '₹' : ''}
                            {depDiscount}
                            {depDiscountType === 'percent' ? '%' : ''} (₹{depositDiscountAmt})
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-slate-300 font-bold">
                        <span>Net Security Deposit:</span>
                        <span>₹{netDepositVal}</span>
                      </div>
                      <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800/40">
                        <span>Monthly Rent (Gross):</span>
                        <span>₹{cartRent}</span>
                      </div>
                      {discount > 0 && (
                        <div className="flex justify-between text-rose-400">
                          <span>Rent Discount:</span>
                          <span>
                            -{discountType === 'flat' ? '₹' : ''}
                            {discount}
                            {discountType === 'percent' ? '%' : ''} (₹{discountAmt})
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-red-300 font-bold border-t border-slate-900 pt-1">
                        <span>Net Monthly Rent:</span>
                        <span>₹{totalRentNet}</span>
                      </div>
                      <div className="flex justify-between text-emerald-400 font-bold">
                        <span>Total First Payment:</span>
                        <span>₹{checkoutTotal}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold cursor-pointer"
                >
                  Onboard Customer
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
