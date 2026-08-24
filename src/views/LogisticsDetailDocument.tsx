import React, { useState } from 'react';
import { useRentBuddyStore } from '../store/rentBuddyStore';
import { getApiBaseUrl } from '../api/client';
import { SVG_AVATAR_PLACEHOLDER, SVG_DOCUMENT_PLACEHOLDER, SVG_VEHICLE_PLACEHOLDER } from '../utils/placeholderAssets';
import { LogisticsDriver, DriverVehicleType } from '../types';
import { compressImage } from '../utils/compressor';
import {
  Truck,
  ShieldCheck,
  ShieldAlert,
  FileCheck,
  Search,
  Plus,
  X,
  Phone,
  Mail,
  MapPin,
  Star,
  CheckCircle2,
  AlertTriangle,
  Ban,
  Upload,
  Eye,
  Check,
  Edit3,
  Clock,
  Package,
  Layers,
  FileText,
  CreditCard,
  KeyRound
} from 'lucide-react';

const generateSecurePin = () => Math.floor(1000 + Math.random() * 9000).toString();

export default function LogisticsDetailDocument() {
  const {
    drivers,
    addDriver,
    updateDriver,
    updateDriverStatus,
    verifyDriverDocument,
    verifyAllDriverDocuments,
    toggleBlockDriver,
    updateDriverDocuments,
    currentCity,
    cities,
  } = useRentBuddyStore();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [cityFilter, setCityFilter] = useState<string>('All');
  
  // Modals
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockReasonInput, setBlockReasonInput] = useState('');
  const [driverToBlock, setDriverToBlock] = useState<LogisticsDriver | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);
  const [activeDocTab, setActiveDocTab] = useState<'license' | 'aadhaar' | 'vehicle' | 'profile' | 'account'>('license');
  const [verificationNotesInput, setVerificationNotesInput] = useState('');

  // Sync drivers to MongoDB Atlas so Flutter Rider login always recognizes ERP onboarded drivers
  React.useEffect(() => {
    if (drivers && drivers.length > 0) {
      fetch(`${getApiBaseUrl()}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drivers })
      }).catch(() => {});
    }
  }, [drivers]);

  // Selected driver for view document modal
  const selectedDriver = drivers.find(d => d.id === selectedDriverId || d.phone === selectedDriverId || (d as any)._id === selectedDriverId);

  // New Driver Form State
  const [newDriverForm, setNewDriverForm] = useState({
    fullName: '',
    phone: '',
    alternatePhone: '',
    upiId: '',
    pin: generateSecurePin(),
    city: currentCity,
    vehicleType: 'Two Wheeler / Bike' as DriverVehicleType,
    vehicleNumber: '',
    licenseNumber: '',
    aadhaarNumber: '',
  });

  const [profilePhoto, setProfilePhoto] = useState('');
  const [dlFront, setDlFront] = useState('');
  const [aadhaarFront, setAadhaarFront] = useState('');
  const [vehiclePhoto, setVehiclePhoto] = useState('');

  // Edit Driver Form State
  const [editForm, setEditForm] = useState<{
    id: string;
    fullName: string;
    phone: string;
    alternatePhone: string;
    upiId: string;
    pin: string;
    city: any;
    vehicleType: DriverVehicleType;
    vehicleNumber: string;
    licenseNumber: string;
    aadhaarNumber: string;
  } | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, 600, 0.7);
      setter(compressed);
    } catch (err) {
      console.error('Image compression error:', err);
      const reader = new FileReader();
      reader.onloadend = () => setter(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Filter Drivers
  const filteredDrivers = drivers.filter(d => {
    const vNum = d.vehicleNumber || '';
    const dCity = d.city || 'Indore (Head Office)';
    const matchSearch =
      (d.fullName || '').toLowerCase().includes(search.toLowerCase()) ||
      (d.id || '').toLowerCase().includes(search.toLowerCase()) ||
      (d.phone || '').includes(search) ||
      (d.upiId || '').toLowerCase().includes(search.toLowerCase()) ||
      vNum.toLowerCase().includes(search.toLowerCase()) ||
      dCity.toLowerCase().includes(search.toLowerCase());

    const matchStatus =
      statusFilter === 'All' ||
      (statusFilter === 'Active' && d.status === 'Active' && !d.isBlocked) ||
      (statusFilter === 'Pending' && (d.status === 'Pending Verification' || d.verificationStatus === 'Pending')) ||
      (statusFilter === 'Blocked' && (d.isBlocked || d.status === 'Blocked' || d.status === 'Suspended'));

    const matchCity = cityFilter === 'All' || dCity === cityFilter;

    return matchSearch && matchStatus && matchCity;
  });

  // Calculate Metrics
  const totalDriversCount = drivers.length;
  const activeDriversCount = drivers.filter(d => d.status === 'Active' && !d.isBlocked).length;
  const pendingKYCCount = drivers.filter(d => d.verificationStatus === 'Pending' || d.status === 'Pending Verification').length;
  const blockedDriversCount = drivers.filter(d => d.isBlocked || d.status === 'Blocked' || d.status === 'Suspended').length;
  const totalFleetDelivered = drivers.reduce((acc, curr) => acc + (curr.totalDelivered || 0), 0);

  const handleCreateDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDriverForm.fullName || !newDriverForm.phone || !newDriverForm.vehicleNumber) {
      alert('Please fill in required rider details (Full Name, Mobile Number, Vehicle Number)');
      return;
    }

    const defaultMockDoc = SVG_DOCUMENT_PLACEHOLDER;
    const defaultMockPhoto = SVG_AVATAR_PLACEHOLDER;
    const defaultMockVehicle = SVG_VEHICLE_PLACEHOLDER;

    addDriver({
      fullName: newDriverForm.fullName,
      phone: newDriverForm.phone,
      alternatePhone: newDriverForm.alternatePhone,
      upiId: newDriverForm.upiId || `${newDriverForm.phone}@upi`,
      pin: newDriverForm.pin || generateSecurePin(),
      city: newDriverForm.city,
      vehicleType: newDriverForm.vehicleType,
      vehicleNumber: newDriverForm.vehicleNumber.toUpperCase(),
      status: 'Active',
      verificationStatus: 'Verified',
      joiningDate: new Date().toISOString().split('T')[0],
      totalDelivered: 0,
      pendingDeliveries: 0,
      deadlineOverdue: 0,
      rating: 5.0,
      currentLocation: `${newDriverForm.city} Hub`,
      isBlocked: false,
      verificationNotes: 'Onboarded via Admin Panel.',
      documents: {
        profilePhoto: profilePhoto || defaultMockPhoto,
        drivingLicenseFront: dlFront || defaultMockDoc,
        licenseFront: dlFront || defaultMockDoc,
        licenseNumber: newDriverForm.licenseNumber || 'DL-APPROVED',
        licenseVerified: true,
        aadhaarFront: aadhaarFront || defaultMockDoc,
        aadhaarNumber: newDriverForm.aadhaarNumber || 'UIDAI-VERIFIED',
        aadhaarVerified: true,
        vehiclePhoto: vehiclePhoto || defaultMockVehicle,
        vehicleNumber: newDriverForm.vehicleNumber.toUpperCase(),
        rcVerified: true
      }
    });

    setShowOnboardModal(false);
    // Reset fields
    setNewDriverForm({
      fullName: '',
      phone: '',
      alternatePhone: '',
      upiId: '',
      pin: generateSecurePin(),
      city: currentCity,
      vehicleType: 'Two Wheeler / Bike' as DriverVehicleType,
      vehicleNumber: '',
      licenseNumber: '',
      aadhaarNumber: '',
    });
    setProfilePhoto('');
    setDlFront('');
    setAadhaarFront('');
    setVehiclePhoto('');
  };

  const handleOpenEditModal = (driver: LogisticsDriver) => {
    setEditForm({
      id: driver.id,
      fullName: driver.fullName,
      phone: driver.phone,
      alternatePhone: driver.alternatePhone || '',
      upiId: driver.upiId || `${driver.phone}@upi`,
      pin: driver.pin || '1234',
      city: driver.city,
      vehicleType: driver.vehicleType,
      vehicleNumber: driver.vehicleNumber,
      licenseNumber: driver.documents?.licenseNumber || '',
      aadhaarNumber: driver.documents?.aadhaarNumber || '',
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm) return;

    updateDriver(editForm.id, {
      fullName: editForm.fullName,
      phone: editForm.phone,
      alternatePhone: editForm.alternatePhone,
      upiId: editForm.upiId,
      pin: editForm.pin,
      city: editForm.city,
      vehicleType: editForm.vehicleType,
      vehicleNumber: editForm.vehicleNumber.toUpperCase(),
    });

    updateDriverDocuments(editForm.id, {
      licenseNumber: editForm.licenseNumber,
      aadhaarNumber: editForm.aadhaarNumber,
      vehicleNumber: editForm.vehicleNumber.toUpperCase(),
    });

    setShowEditModal(false);
    setEditForm(null);
  };

  const handleOpenBlockModal = (driver: LogisticsDriver) => {
    setDriverToBlock(driver);
    setBlockReasonInput(driver.blockedReason || 'Policy or document compliance violation');
    setShowBlockModal(true);
  };

  const handleConfirmBlockToggle = () => {
    if (!driverToBlock) return;
    const newBlockedState = !driverToBlock.isBlocked;
    toggleBlockDriver(driverToBlock.id, newBlockedState, blockReasonInput);
    setShowBlockModal(false);
    setDriverToBlock(null);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 text-slate-200">
      
      {/* Top Banner & Header */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-700/50 bg-gradient-to-r from-slate-900/90 via-slate-800/80 to-slate-900/90 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                Logistic Detail Document & Driver Fleet
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Live KYC & Compliance
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Inspect onboarded logistics personnel, verify DL & Aadhaar KYC documents, track delivery performance, and manage driver operational status.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowOnboardModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-xs shadow-lg shadow-red-600/30 transition-all border border-red-400/30"
          >
            <Plus className="w-4 h-4" /> Onboard New Driver
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="glass-panel p-4 rounded-xl border border-slate-700/40 bg-slate-800/40 flex items-center gap-3.5">
          <div className="p-2.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-400">Total Fleet</div>
            <div className="text-xl font-black text-white">{totalDriversCount} Drivers</div>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-emerald-500/20 bg-emerald-950/20 flex items-center gap-3.5">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-emerald-300">Verified & Active</div>
            <div className="text-xl font-black text-emerald-400">{activeDriversCount}</div>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-amber-500/20 bg-amber-950/20 flex items-center gap-3.5">
          <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-amber-300">Pending KYC</div>
            <div className="text-xl font-black text-amber-400">{pendingKYCCount}</div>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-rose-500/20 bg-rose-950/20 flex items-center gap-3.5">
          <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Ban className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-rose-300">Blocked / Flagged</div>
            <div className="text-xl font-black text-rose-400">{blockedDriversCount}</div>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-red-500/20 bg-red-950/20 flex items-center gap-3.5 col-span-2 sm:col-span-1">
          <div className="p-2.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-red-300">Total Delivered</div>
            <div className="text-xl font-black text-red-400">{totalFleetDelivered} Orders</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="glass-panel p-4 rounded-xl border border-slate-700/50 bg-slate-900/60 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search driver name, ID, mobile, vehicle..."
            className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <div className="flex bg-slate-800/90 p-1 rounded-xl border border-slate-700">
            {['All', 'Active', 'Pending', 'Blocked'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === st
                    ? 'bg-red-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* City selector */}
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-red-500"
          >
            <option value="All">All Cities</option>
            {cities.map((city) => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Driver Cards Grid */}
      {filteredDrivers.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-2xl border border-slate-700/40">
          <Truck className="w-12 h-12 text-slate-600 mx-auto mb-3 animate-pulse" />
          <h3 className="text-sm font-bold text-slate-300">No Logistics Drivers Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Try adjusting your search criteria or register a new logistics driver to start managing the fleet.
          </p>
          <button
            onClick={() => setShowOnboardModal(true)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-md transition-all"
          >
            <Plus className="w-4 h-4" /> Onboard First Driver
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDrivers.map((driver) => {
            const isBlocked = driver.isBlocked || driver.status === 'Blocked' || driver.status === 'Suspended';
            const isVerified = driver.verificationStatus === 'Verified' && !isBlocked;

            return (
              <div
                key={driver.id || driver.phone || (driver as any)._id}
                className={`group relative rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col justify-between ${
                  isBlocked
                    ? 'bg-rose-950/10 border-rose-500/30 hover:border-rose-500/50 shadow-lg shadow-rose-950/20'
                    : isVerified
                    ? 'bg-slate-900/70 border-slate-700/60 hover:border-red-500/50 shadow-lg hover:shadow-red-950/30'
                    : 'bg-amber-950/10 border-amber-500/30 hover:border-amber-500/50 shadow-lg'
                }`}
              >
                {/* Top Card Header */}
                <div className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {/* Avatar Photo */}
                      <div className="relative">
                        <img
                          src={driver.documents?.profilePhoto || SVG_AVATAR_PLACEHOLDER}
                          alt={driver.fullName}
                          className="w-14 h-14 rounded-2xl object-cover border-2 border-slate-700/80 shadow-md group-hover:border-red-400/60 transition-colors"
                        />
                        <span
                          className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-900 ${
                            isBlocked
                              ? 'bg-rose-500'
                              : isVerified
                              ? 'bg-emerald-500 animate-pulse'
                              : 'bg-amber-500'
                          }`}
                          title={isBlocked ? 'Blocked' : isVerified ? 'Active & Verified' : 'Pending Verification'}
                        />
                      </div>

                      {/* Name & ID */}
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-extrabold text-sm text-white group-hover:text-red-300 transition-colors">
                            {driver.fullName || 'Logistic Rider'}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-red-400 border border-slate-700">
                            {driver.id || 'DRV'}
                          </span>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-500" /> {(driver.city || 'Indore').replace(' (Head Office)', '')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div>
                      {isBlocked ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          <Ban className="w-3 h-3" /> Blocked
                        </span>
                      ) : isVerified ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" /> Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          <Clock className="w-3 h-3" /> Pending KYC
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Vehicle Info Badge */}
                  <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-red-400 shrink-0" />
                      <span className="text-slate-300 font-medium text-[11px] truncate max-w-[150px]">
                        {driver.vehicleType || 'Two Wheeler / Bike'}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-[11px] text-amber-400 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-700">
                      {driver.vehicleNumber || 'N/A'}
                    </span>
                  </div>

                  {/* Contact & UPI Info */}
                  <div className="space-y-1 text-[11px] text-slate-400">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      <span className="font-mono text-slate-300">{driver.phone || 'N/A'}</span>
                      {driver.alternatePhone && (
                        <span className="text-[10px] text-slate-500">({driver.alternatePhone})</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 truncate">
                        <CreditCard className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate font-mono text-[11px] text-emerald-300 font-semibold">{driver.upiId || `${driver.phone}@upi`}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700">
                        <KeyRound className="w-2.5 h-2.5 text-amber-400" />
                        <span className="font-mono text-[10px] text-amber-300">PIN: {driver.pin || '1234'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Live Performance Metric Badges (As requested by user) */}
                  <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-800">
                    <div className="bg-slate-800/50 p-2 rounded-xl text-center border border-slate-700/40">
                      <div className="text-[9px] font-bold text-slate-400 uppercase">Delivered</div>
                      <div className="text-sm font-black text-emerald-400 mt-0.5">{driver.totalDelivered || 0}</div>
                    </div>

                    <div className="bg-slate-800/50 p-2 rounded-xl text-center border border-slate-700/40">
                      <div className="text-[9px] font-bold text-slate-400 uppercase">Pending</div>
                      <div className="text-sm font-black text-red-400 mt-0.5">{driver.pendingDeliveries || 0}</div>
                    </div>

                    <div className="bg-slate-800/50 p-2 rounded-xl text-center border border-slate-700/40">
                      <div className="text-[9px] font-bold text-slate-400 uppercase">Overdue</div>
                      <div className={`text-sm font-black mt-0.5 ${driver.deadlineOverdue > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-400'}`}>
                        {driver.deadlineOverdue || 0}
                      </div>
                    </div>

                    <div className="bg-slate-800/50 p-2 rounded-xl text-center border border-slate-700/40">
                      <div className="text-[9px] font-bold text-slate-400 uppercase flex items-center justify-center gap-0.5">
                        <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" /> Rating
                      </div>
                      <div className="text-sm font-black text-amber-400 mt-0.5">{driver.rating || 5.0}</div>
                    </div>
                  </div>

                  {/* Block reason notice if blocked */}
                  {isBlocked && driver.blockedReason && (
                    <div className="p-2 rounded-lg bg-rose-950/40 border border-rose-500/30 text-[10px] text-rose-300 flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                      <span>{driver.blockedReason}</span>
                    </div>
                  )}
                </div>

                {/* Card Actions Footer (View Document, Block/Unblock, Edit) */}
                <div className="p-3.5 bg-slate-950/60 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      setSelectedDriverId(driver.id || driver.phone || (driver as any)._id);
                      setVerificationNotesInput(driver.verificationNotes || '');
                      setActiveDocTab('license');
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-red-600/90 hover:bg-red-600 text-white font-bold text-xs shadow-md shadow-red-900/30 transition-all border border-red-400/30"
                  >
                    <Eye className="w-3.5 h-3.5" /> View Documents
                  </button>

                  <button
                    onClick={() => handleOpenEditModal(driver)}
                    title="Edit Driver Details"
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleOpenBlockModal(driver)}
                    title={isBlocked ? 'Unblock Driver' : 'Block Driver'}
                    className={`p-2 rounded-xl border transition-colors ${
                      isBlocked
                        ? 'bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-400 border-emerald-500/30'
                        : 'bg-rose-950/40 hover:bg-rose-900/50 text-rose-400 border-rose-500/30'
                    }`}
                  >
                    {isBlocked ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW DOCUMENTS & KYC INSPECTION MODAL (Requested specifically by user) */}
      {/* ========================================================================= */}
      {selectedDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="glass-panel w-full max-w-4xl max-h-[92vh] rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <div className="flex items-center gap-3">
                <img
                  src={selectedDriver.documents?.profilePhoto || SVG_AVATAR_PLACEHOLDER}
                  alt={selectedDriver.fullName}
                  className="w-12 h-12 rounded-xl object-cover border border-slate-700"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-black text-white">{selectedDriver.fullName}</h2>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/30">
                      {selectedDriver.id}
                    </span>
                    {selectedDriver.isBlocked ? (
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        Blocked
                      </span>
                    ) : selectedDriver.verificationStatus === 'Verified' ? (
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Verified KYC
                      </span>
                    ) : (
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Verification Pending
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">
                    Vehicle: <span className="text-slate-200 font-medium">{selectedDriver.vehicleType}</span> ({selectedDriver.vehicleNumber || 'No Plate'}) • City: <span className="text-slate-200 font-medium">{selectedDriver.city}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenEditModal(selectedDriver)}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                  title="Edit Rider Information"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedDriverId(null)}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Document Nav Tabs */}
              <div className="flex gap-2 border-b border-slate-800 pb-3">
                {[
                  { id: 'license', label: 'Driving License', verified: selectedDriver.documents?.licenseVerified },
                  { id: 'aadhaar', label: 'Aadhaar Card', verified: selectedDriver.documents?.aadhaarVerified },
                  { id: 'vehicle', label: 'Vehicle Photo & RC', verified: selectedDriver.documents?.rcVerified },
                  { id: 'profile', label: 'Rider Profile Photo', verified: true },
                  { id: 'account', label: 'Payout Account & Security', verified: true },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveDocTab(tab.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeDocTab === tab.id
                        ? 'bg-red-600 text-white shadow-lg shadow-red-950/40'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {tab.verified ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              {activeDocTab === 'license' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-800/50 border border-slate-700 text-xs">
                    <div>
                      <span className="text-slate-400 text-[11px] block">Driving License Number</span>
                      <span className="font-mono font-bold text-white text-sm">{selectedDriver.documents?.licenseNumber || 'License Attached'}</span>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end">
                      <button
                        onClick={() => verifyDriverDocument(selectedDriver.id, 'licenseVerified', !selectedDriver.documents?.licenseVerified)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          selectedDriver.documents?.licenseVerified
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30'
                        }`}
                      >
                        {selectedDriver.documents?.licenseVerified ? <Check className="w-3.5 h-3.5" /> : null}
                        {selectedDriver.documents?.licenseVerified ? 'Verified DL' : 'Mark DL Verified'}
                      </button>
                    </div>
                  </div>

                  <div className="max-w-md mx-auto space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
                      <span>Front Side of License</span>
                      <button
                        onClick={() => setPreviewImage({ url: selectedDriver.documents?.licenseFront || selectedDriver.documents?.drivingLicenseFront || '', title: 'Driving License' })}
                        className="text-red-400 hover:text-red-300 flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" /> Zoom
                      </button>
                    </div>
                    <div
                      onClick={() => setPreviewImage({ url: selectedDriver.documents?.licenseFront || selectedDriver.documents?.drivingLicenseFront || '', title: 'Driving License' })}
                      className="cursor-pointer group relative rounded-xl overflow-hidden border border-slate-700 bg-slate-950 aspect-[4/3] flex items-center justify-center shadow-lg"
                    >
                      <img
                        src={selectedDriver.documents?.licenseFront || selectedDriver.documents?.drivingLicenseFront || SVG_DOCUMENT_PLACEHOLDER}
                        alt="Driving License"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Eye className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeDocTab === 'aadhaar' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-800/50 border border-slate-700 text-xs">
                    <div>
                      <span className="text-slate-400 text-[11px] block">Aadhaar (UIDAI) Number</span>
                      <span className="font-mono font-bold text-white text-sm">{selectedDriver.documents?.aadhaarNumber || 'Aadhaar Attached'}</span>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end">
                      <button
                        onClick={() => verifyDriverDocument(selectedDriver.id, 'aadhaarVerified', !selectedDriver.documents?.aadhaarVerified)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          selectedDriver.documents?.aadhaarVerified
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30'
                        }`}
                      >
                        {selectedDriver.documents?.aadhaarVerified ? <Check className="w-3.5 h-3.5" /> : null}
                        {selectedDriver.documents?.aadhaarVerified ? 'Verified Aadhaar' : 'Mark Aadhaar Verified'}
                      </button>
                    </div>
                  </div>

                  <div className="max-w-md mx-auto space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
                      <span>Aadhaar Card Copy</span>
                      <button
                        onClick={() => setPreviewImage({ url: selectedDriver.documents?.aadhaarFront || '', title: 'Aadhaar Card' })}
                        className="text-red-400 hover:text-red-300 flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" /> Zoom
                      </button>
                    </div>
                    <div
                      onClick={() => setPreviewImage({ url: selectedDriver.documents?.aadhaarFront || '', title: 'Aadhaar Card' })}
                      className="cursor-pointer group relative rounded-xl overflow-hidden border border-slate-700 bg-slate-950 aspect-[4/3] flex items-center justify-center shadow-lg"
                    >
                      <img
                        src={selectedDriver.documents?.aadhaarFront || SVG_DOCUMENT_PLACEHOLDER}
                        alt="Aadhaar Card"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Eye className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeDocTab === 'vehicle' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-800/50 border border-slate-700 text-xs">
                    <div>
                      <span className="text-slate-400 text-[11px] block">Vehicle Registration / Number Plate</span>
                      <span className="font-mono font-bold text-amber-400 text-sm">{selectedDriver.vehicleNumber || 'Not Provided'}</span>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end">
                      <button
                        onClick={() => verifyDriverDocument(selectedDriver.id, 'rcVerified', !selectedDriver.documents?.rcVerified)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          selectedDriver.documents?.rcVerified
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30'
                        }`}
                      >
                        {selectedDriver.documents?.rcVerified ? <Check className="w-3.5 h-3.5" /> : null}
                        {selectedDriver.documents?.rcVerified ? 'Verified Vehicle' : 'Mark Vehicle Verified'}
                      </button>
                    </div>
                  </div>

                  <div className="max-w-md mx-auto space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
                      <span>Vehicle Photo with Number Plate</span>
                      <button
                        onClick={() => setPreviewImage({ url: selectedDriver.documents?.vehiclePhoto || selectedDriver.documents?.vehicleRC || selectedDriver.documents?.vehicleRc || '', title: 'Vehicle Photo' })}
                        className="text-red-400 hover:text-red-300 flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" /> Zoom
                      </button>
                    </div>
                    <div
                      onClick={() => setPreviewImage({ url: selectedDriver.documents?.vehiclePhoto || selectedDriver.documents?.vehicleRC || selectedDriver.documents?.vehicleRc || '', title: 'Vehicle Photo' })}
                      className="cursor-pointer group relative rounded-xl overflow-hidden border border-slate-700 bg-slate-950 aspect-[4/3] flex items-center justify-center shadow-lg"
                    >
                      <img
                        src={selectedDriver.documents?.vehiclePhoto || selectedDriver.documents?.vehicleRC || selectedDriver.documents?.vehicleRc || SVG_VEHICLE_PLACEHOLDER}
                        alt="Vehicle Photo"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Eye className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeDocTab === 'profile' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-800/50 border border-slate-700 text-xs">
                    <div>
                      <span className="text-slate-400 text-[11px] block">Rider Full Name & Contact</span>
                      <span className="font-bold text-white text-sm">{selectedDriver.fullName} ({selectedDriver.phone})</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">Assigned Operating City</span>
                      <span className="font-bold text-amber-400 text-sm">{selectedDriver.city || 'Indore (Head Office)'}</span>
                    </div>
                  </div>

                  <div className="max-w-md mx-auto space-y-1.5">
                    <span className="text-xs text-slate-400 font-semibold block text-center">Profile / Selfie Photo</span>
                    <div
                      onClick={() => setPreviewImage({ url: selectedDriver.documents?.profilePhoto || selectedDriver.documents?.selfiePhoto || '', title: 'Profile Photo' })}
                      className="cursor-pointer group relative rounded-xl overflow-hidden border border-slate-700 bg-slate-950 aspect-square max-w-[280px] mx-auto shadow-lg"
                    >
                      <img
                        src={selectedDriver.documents?.profilePhoto || selectedDriver.documents?.selfiePhoto || SVG_AVATAR_PLACEHOLDER}
                        alt="Profile Photo"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeDocTab === 'account' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700 space-y-3">
                    <h4 className="text-xs font-bold text-white flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-emerald-400" />
                      Payout & App Login Credentials
                    </h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-slate-400 text-[11px] block">Rider UPI ID (For Direct Payouts)</span>
                        <span className="font-mono font-bold text-emerald-300 text-sm mt-0.5 block">
                          {selectedDriver.upiId || `${selectedDriver.phone}@upi`}
                        </span>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-slate-400 text-[11px] block">Rider Mobile App Login PIN</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono font-bold text-amber-300 text-sm">
                            {selectedDriver.pin || '1234'}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            4-Digit Security PIN
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Admin Verification Notes Box */}
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700 space-y-2">
                <label className="text-xs font-bold text-slate-300 block">Fleet Admin Verification Notes</label>
                <div className="flex gap-2">
                  <textarea
                    rows={2}
                    value={verificationNotesInput}
                    onChange={(e) => setVerificationNotesInput(e.target.value)}
                    placeholder="Add audit notes, verification observations, or missing document alerts..."
                    className="flex-1 bg-slate-900/90 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-red-500"
                  />
                  <button
                    onClick={() => {
                      updateDriverStatus(selectedDriver.id, selectedDriver.status, verificationNotesInput);
                      alert('Verification notes saved successfully.');
                    }}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold self-end transition-colors"
                  >
                    Save Notes
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="p-5 border-t border-slate-800 bg-slate-950/90 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {/* Block / Unblock Driver Button */}
                <button
                  onClick={() => {
                    handleOpenBlockModal(selectedDriver);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                    selectedDriver.isBlocked
                      ? 'bg-emerald-600/90 hover:bg-emerald-600 text-white border-emerald-400/40'
                      : 'bg-rose-600/90 hover:bg-rose-600 text-white border-rose-400/40 shadow-lg shadow-rose-950/40'
                  }`}
                >
                  <Ban className="w-4 h-4" />
                  {selectedDriver.isBlocked ? 'Unblock Driver' : 'Block / Suspend Driver'}
                </button>

                {/* Edit Documents & Details */}
                <button
                  onClick={() => {
                    setSelectedDriverId(null);
                    handleOpenEditModal(selectedDriver);
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition-colors"
                >
                  <Edit3 className="w-4 h-4" /> Update Documents
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    verifyAllDriverDocuments(selectedDriver.id, 'Rejected', verificationNotesInput);
                    alert(`Driver ${selectedDriver.fullName} KYC marked as Rejected.`);
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-500/30 text-xs font-bold transition-colors"
                >
                  Reject KYC
                </button>

                <button
                  onClick={() => {
                    verifyAllDriverDocuments(selectedDriver.id, 'Verified', verificationNotesInput);
                    alert(`Driver ${selectedDriver.fullName} documents successfully verified and approved!`);
                  }}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white text-xs font-black shadow-lg shadow-emerald-900/30 transition-all border border-emerald-400/30"
                >
                  <CheckCircle2 className="w-4 h-4" /> Approve & Verify All Documents
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ONBOARD NEW DRIVER MODAL */}
      {/* ========================================================================= */}
      {showOnboardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="glass-panel w-full max-w-2xl max-h-[90vh] rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-red-500/20 text-red-400">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-white">Onboard New Logistics Driver</h2>
                  <p className="text-xs text-slate-400">Register delivery partner and upload initial KYC files.</p>
                </div>
              </div>
              <button
                onClick={() => setShowOnboardModal(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDriver} className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newDriverForm.fullName}
                    onChange={(e) => setNewDriverForm({ ...newDriverForm, fullName: e.target.value })}
                    placeholder="e.g. Mukesh Solanki"
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={newDriverForm.phone}
                    onChange={(e) => setNewDriverForm({ ...newDriverForm, phone: e.target.value.replace(/[^0-9]/g, '') })}
                    placeholder="e.g. 9826012345"
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">UPI ID (For Payouts) *</label>
                  <input
                    type="text"
                    required
                    value={newDriverForm.upiId}
                    onChange={(e) => setNewDriverForm({ ...newDriverForm, upiId: e.target.value })}
                    placeholder="e.g. 9826012345@upi"
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-emerald-300 font-mono focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">4-Digit Login PIN *</label>
                  <input
                    type="password"
                    required
                    maxLength={4}
                    value={newDriverForm.pin}
                    onChange={(e) => setNewDriverForm({ ...newDriverForm, pin: e.target.value.replace(/[^0-9]/g, '') })}
                    placeholder="e.g. 1234"
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono tracking-widest focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Alternate Phone</label>
                  <input
                    type="tel"
                    value={newDriverForm.alternatePhone}
                    onChange={(e) => setNewDriverForm({ ...newDriverForm, alternatePhone: e.target.value })}
                    placeholder="e.g. 9826099999"
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Operating City</label>
                  <select
                    value={newDriverForm.city}
                    onChange={(e) => setNewDriverForm({ ...newDriverForm, city: e.target.value as any })}
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-red-500"
                  >
                    {cities.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Vehicle Type</label>
                  <select
                    value={newDriverForm.vehicleType}
                    onChange={(e) => setNewDriverForm({ ...newDriverForm, vehicleType: e.target.value as any })}
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-red-500"
                  >
                    <option value="Two Wheeler / Bike">Two Wheeler / Bike</option>
                    <option value="Mini Truck / Tata Ace">Mini Truck / Tata Ace</option>
                    <option value="Pickup 3-Wheeler">Pickup 3-Wheeler</option>
                    <option value="Large Van">Large Van</option>
                    <option value="E-Loader / Electric Trike">E-Loader / Electric Trike</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Vehicle Registration No *</label>
                  <input
                    type="text"
                    required
                    value={newDriverForm.vehicleNumber}
                    onChange={(e) => setNewDriverForm({ ...newDriverForm, vehicleNumber: e.target.value.toUpperCase() })}
                    placeholder="e.g. MP-09-AB-1234"
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 uppercase focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Driving License (DL) No</label>
                  <input
                    type="text"
                    value={newDriverForm.licenseNumber}
                    onChange={(e) => setNewDriverForm({ ...newDriverForm, licenseNumber: e.target.value })}
                    placeholder="e.g. MP09-2021-004812"
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Aadhaar (UIDAI) No</label>
                  <input
                    type="text"
                    value={newDriverForm.aadhaarNumber}
                    onChange={(e) => setNewDriverForm({ ...newDriverForm, aadhaarNumber: e.target.value })}
                    placeholder="e.g. 1234 5678 9012"
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              {/* Document File Attachments */}
              <div className="pt-3 border-t border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider">KYC Document Uploads</h4>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  {/* Photo Upload */}
                  <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700 space-y-1.5">
                    <span className="font-semibold text-slate-300 block text-[11px]">1. Profile (Selfie)</span>
                    <label className="flex flex-col items-center justify-center p-3 border border-dashed border-slate-600 rounded-lg hover:border-red-500 cursor-pointer text-center bg-slate-900/60">
                      <Upload className="w-4 h-4 text-slate-400 mb-1" />
                      <span className="text-[10px] text-slate-400">{profilePhoto ? 'Photo Added ✓' : 'Upload Selfie'}</span>
                      <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, setProfilePhoto)} className="hidden" />
                    </label>
                  </div>

                  {/* DL Front */}
                  <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700 space-y-1.5">
                    <span className="font-semibold text-slate-300 block text-[11px]">2. Driving License</span>
                    <label className="flex flex-col items-center justify-center p-3 border border-dashed border-slate-600 rounded-lg hover:border-red-500 cursor-pointer text-center bg-slate-900/60">
                      <Upload className="w-4 h-4 text-slate-400 mb-1" />
                      <span className="text-[10px] text-slate-400">{dlFront ? 'DL Added ✓' : 'Upload DL'}</span>
                      <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, setDlFront)} className="hidden" />
                    </label>
                  </div>

                  {/* Aadhaar Front */}
                  <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700 space-y-1.5">
                    <span className="font-semibold text-slate-300 block text-[11px]">3. Aadhaar Card</span>
                    <label className="flex flex-col items-center justify-center p-3 border border-dashed border-slate-600 rounded-lg hover:border-red-500 cursor-pointer text-center bg-slate-900/60">
                      <Upload className="w-4 h-4 text-slate-400 mb-1" />
                      <span className="text-[10px] text-slate-400">{aadhaarFront ? 'Aadhaar Added ✓' : 'Upload Aadhaar'}</span>
                      <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, setAadhaarFront)} className="hidden" />
                    </label>
                  </div>

                  {/* Vehicle Photo with Plate */}
                  <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700 space-y-1.5">
                    <span className="font-semibold text-slate-300 block text-[11px]">4. Vehicle Photo</span>
                    <label className="flex flex-col items-center justify-center p-3 border border-dashed border-slate-600 rounded-lg hover:border-red-500 cursor-pointer text-center bg-slate-900/60">
                      <Upload className="w-4 h-4 text-slate-400 mb-1" />
                      <span className="text-[10px] text-slate-400">{vehiclePhoto ? 'Vehicle Added ✓' : 'Upload Gaadi Pic'}</span>
                      <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, setVehiclePhoto)} className="hidden" />
                    </label>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowOnboardModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-900/30"
                >
                  Onboard & Save Driver
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EDIT DRIVER DETAILS MODAL */}
      {/* ========================================================================= */}
      {showEditModal && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="glass-panel w-full max-w-xl max-h-[90vh] rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <h2 className="text-base font-black text-white">Update Driver Details ({editForm.id})</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Full Name</label>
                  <input
                    type="text"
                    value={editForm.fullName}
                    onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Mobile Phone</label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Vehicle Type</label>
                  <select
                    value={editForm.vehicleType}
                    onChange={(e) => setEditForm({ ...editForm, vehicleType: e.target.value as any })}
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-red-500"
                  >
                    <option value="Mini Truck / Tata Ace">Mini Truck / Tata Ace</option>
                    <option value="Pickup 3-Wheeler">Pickup 3-Wheeler</option>
                    <option value="Large Van">Large Van</option>
                    <option value="Bike / 2-Wheeler">Bike / 2-Wheeler</option>
                    <option value="E-Loader / Electric Trike">E-Loader / Electric Trike</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-300 block mb-1">UPI ID</label>
                  <input
                    type="text"
                    value={editForm.upiId}
                    onChange={(e) => setEditForm({ ...editForm, upiId: e.target.value })}
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-emerald-300 font-mono focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Login PIN</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={editForm.pin}
                    onChange={(e) => setEditForm({ ...editForm, pin: e.target.value.replace(/[^0-9]/g, '') })}
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-amber-300 font-mono tracking-widest focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Vehicle Plate No</label>
                  <input
                    type="text"
                    value={editForm.vehicleNumber}
                    onChange={(e) => setEditForm({ ...editForm, vehicleNumber: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 uppercase focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-300 block mb-1">License No</label>
                  <input
                    type="text"
                    value={editForm.licenseNumber}
                    onChange={(e) => setEditForm({ ...editForm, licenseNumber: e.target.value })}
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Aadhaar (UIDAI) No</label>
                  <input
                    type="text"
                    value={editForm.aadhaarNumber}
                    onChange={(e) => setEditForm({ ...editForm, aadhaarNumber: e.target.value })}
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-lg"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* BLOCK / SUSPEND DRIVER MODAL (Requested specifically by user) */}
      {/* ========================================================================= */}
      {showBlockModal && driverToBlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="glass-panel w-full max-w-md rounded-2xl border border-rose-500/30 bg-slate-900 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30">
                <Ban className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">
                  {driverToBlock.isBlocked ? 'Unblock Driver Fleet Partner' : 'Block & Suspend Driver'}
                </h3>
                <p className="text-xs text-slate-400">
                  {driverToBlock.fullName} ({driverToBlock.id})
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {driverToBlock.isBlocked
                ? 'Unblocking will restore this driver to active logistics duty, allowing delivery assignment and portal access.'
                : 'Blocking this driver will immediately suspend their dispatch eligibility and flag their profile in the ERP.'}
            </p>

            {!driverToBlock.isBlocked && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">Reason for Blocking *</label>
                <input
                  type="text"
                  value={blockReasonInput}
                  onChange={(e) => setBlockReasonInput(e.target.value)}
                  placeholder="e.g. Expired DL, Damaged Return Asset, Repeated Pickup Delay..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                />
              </div>
            )}

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowBlockModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBlockToggle}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-lg ${
                  driverToBlock.isBlocked
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-rose-600 hover:bg-rose-500 shadow-rose-950/50'
                }`}
              >
                {driverToBlock.isBlocked ? 'Confirm Unblock' : 'Confirm Block Driver'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* HIGH-RES IMAGE ZOOM MODAL */}
      {/* ========================================================================= */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn cursor-pointer"
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <div className="flex items-center justify-between w-full pb-2 text-white text-xs font-bold">
              <span>{previewImage.title}</span>
              <button onClick={() => setPreviewImage(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <img
              src={previewImage.url}
              alt={previewImage.title}
              className="max-w-full max-h-[80vh] rounded-2xl object-contain border border-slate-700 shadow-2xl"
            />
          </div>
        </div>
      )}

    </div>
  );
}
