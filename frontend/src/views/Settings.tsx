import React, { useState, useEffect } from 'react';
import { useRentBuddyStore } from '../store/rentBuddyStore';
import { getApiBaseUrl } from '../api/client';
import {
  Shield,
  KeyRound,
  UserPlus,
  Users,
  Settings as Gear,
  ShieldCheck,
  Eye,
  EyeOff,
  RefreshCw,
  Trash2,
  User,
  Sliders,
  Sparkles,
  Copy,
  Check,
  Building2,
  CheckSquare,
  Square,
  Lock,
  Search,
  Layers,
  AlertTriangle,
  FileSpreadsheet
} from 'lucide-react';
import type { UserRole, CityName, ERPSectionKey } from '../types';
import { ERP_SECTIONS_LIST, ROLE_DEFAULT_PERMISSIONS } from '../types';

export default function Settings() {
  const { token, currentUser, currentUserRole, cities } = useRentBuddyStore();
  const BACKEND_URL = getApiBaseUrl();

  const isSuperAdmin = currentUserRole === 'Super Admin' || currentUser?.role === 'Super Admin' || (Boolean(currentUser?.permissions?.includes('*')) || Boolean(currentUser?.permissions?.includes('all')));

  // Active Tab
  const [activeTab, setActiveTab] = useState<'handover' | 'security'>('handover');

  // Self Password Change states
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selfLoading, setSelfLoading] = useState(false);
  const [selfMessage, setSelfMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // User Management states
  const [usersList, setUsersList] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Edit Permissions Modal states
  const [editingPermissionsUser, setEditingPermissionsUser] = useState<any | null>(null);
  const [selectedEditPermissions, setSelectedEditPermissions] = useState<ERPSectionKey[]>([]);
  const [editPermissionsLoading, setEditPermissionsLoading] = useState(false);
  const [editPermissionsMessage, setEditPermissionsMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Reset Password Modal states
  const [resettingUser, setResettingUser] = useState<any | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetMessage, setResetMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  // Delete User Modal states
  const [deletingUser, setDeletingUser] = useState<any | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Create User states
  const [newFullName, setNewFullName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPass, setNewPass] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [newRole, setNewRole] = useState<UserRole>('Operations Manager');
  const [newCity, setNewCity] = useState<CityName>('Indore (Head Office)');
  const [selectedPermissions, setSelectedPermissions] = useState<ERPSectionKey[]>(
    ROLE_DEFAULT_PERMISSIONS['Operations Manager'] || []
  );
  const [createMessage, setCreateMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);

  // Roles list
  const roles: UserRole[] = [
    'Operations Manager',
    'Warehouse Manager',
    'Logistics Team',
    'Repair Team',
    'Finance',
    'Customer Support',
    'Read-only Auditor',
    'Super Admin'
  ];

  const fetchUsers = async () => {
    if (!token || !isSuperAdmin) return;
    setUsersLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setUsersList(data.data?.users || data.users || []);
      }
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [token, isSuperAdmin]);

  // Handle Role selection preset update
  const handleRoleChange = (role: UserRole) => {
    setNewRole(role);
    const defaults = ROLE_DEFAULT_PERMISSIONS[role] || [];
    setSelectedPermissions(defaults);
  };

  // Generate a random secure alphanumeric password
  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    let pass = '';
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPass(pass);
  };

  const copyPasswordToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPass(true);
    setTimeout(() => setCopiedPass(false), 2000);
  };

  // Toggle individual section permission during user creation
  const togglePermission = (secId: ERPSectionKey) => {
    setSelectedPermissions(prev =>
      prev.includes(secId) ? prev.filter(p => p !== secId) : [...prev, secId]
    );
  };

  // Toggle individual section permission during editing
  const toggleEditPermission = (secId: ERPSectionKey) => {
    setSelectedEditPermissions(prev =>
      prev.includes(secId) ? prev.filter(p => p !== secId) : [...prev, secId]
    );
  };

  // Apply quick preset to creation state
  const applyPreset = (presetRole?: UserRole | 'all' | 'clear') => {
    if (presetRole === 'all') {
      setSelectedPermissions(ERP_SECTIONS_LIST.map(s => s.id));
    } else if (presetRole === 'clear') {
      setSelectedPermissions([]);
    } else if (presetRole && ROLE_DEFAULT_PERMISSIONS[presetRole]) {
      setSelectedPermissions(ROLE_DEFAULT_PERMISSIONS[presetRole]);
    }
  };

  // Apply quick preset to editing state
  const applyEditPreset = (presetRole?: UserRole | 'all' | 'clear') => {
    if (presetRole === 'all') {
      setSelectedEditPermissions(ERP_SECTIONS_LIST.map(s => s.id));
    } else if (presetRole === 'clear') {
      setSelectedEditPermissions([]);
    } else if (presetRole && ROLE_DEFAULT_PERMISSIONS[presetRole]) {
      setSelectedEditPermissions(ROLE_DEFAULT_PERMISSIONS[presetRole]);
    }
  };

  // Create User Handler
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateMessage(null);
    setCreateLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          username: newUsername,
          password: newPass,
          fullName: newFullName,
          role: newRole,
          city: newCity,
          permissions: selectedPermissions
        })
      });
      const data = await res.json();
      if (data.success) {
        setCreateMessage({ text: `Account for @${newUsername} created with ${selectedPermissions.length} delegated sections!`, type: 'success' });
        setNewUsername('');
        setNewPass('');
        setNewFullName('');
        setSelectedPermissions(ROLE_DEFAULT_PERMISSIONS['Operations Manager'] || []);
        fetchUsers();
      } else {
        setCreateMessage({ text: data.message || 'Failed to create user', type: 'error' });
      }
    } catch (err) {
      setCreateMessage({ text: 'Error connecting to server', type: 'error' });
    } finally {
      setCreateLoading(false);
    }
  };

  // Save Permissions Edit Handler
  const handleSavePermissions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPermissionsUser) return;
    setEditPermissionsMessage(null);
    setEditPermissionsLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/users/${editingPermissionsUser.username}/permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ permissions: selectedEditPermissions })
      });
      const data = await res.json();
      if (data.success) {
        setEditPermissionsMessage({ text: `Successfully updated sections for @${editingPermissionsUser.username}!`, type: 'success' });
        fetchUsers();
        setTimeout(() => {
          setEditingPermissionsUser(null);
        }, 1200);
      } else {
        setEditPermissionsMessage({ text: data.message || 'Failed to update permissions', type: 'error' });
      }
    } catch (err) {
      setEditPermissionsMessage({ text: 'Error connecting to server', type: 'error' });
    } finally {
      setEditPermissionsLoading(false);
    }
  };

  // Reset Password Handler
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingUser) return;
    setResetMessage(null);
    setResetLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/users/${resettingUser.username}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newPassword: resetNewPassword })
      });
      const data = await res.json();
      if (data.success) {
        setResetMessage({ text: `Successfully reset password for @${resettingUser.username}`, type: 'success' });
        setResetNewPassword('');
        setTimeout(() => setResettingUser(null), 1500);
      } else {
        setResetMessage({ text: data.message || 'Failed to reset password', type: 'error' });
      }
    } catch (err) {
      setResetMessage({ text: 'Error connecting to server', type: 'error' });
    } finally {
      setResetLoading(false);
    }
  };

  // Delete User Handler
  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    setDeleteMessage(null);
    setDeleteLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/users/${deletingUser.username}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        fetchUsers();
        setDeletingUser(null);
      } else {
        setDeleteMessage({ text: data.message || 'Failed to delete user', type: 'error' });
      }
    } catch (err) {
      setDeleteMessage({ text: 'Error connecting to server', type: 'error' });
    } finally {
      setDeleteLoading(false);
    }
  };

  // Self Password Change Handler
  const handleSelfPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setSelfMessage(null);

    if (newPassword !== confirmPassword) {
      setSelfMessage({ text: 'New passwords do not match', type: 'error' });
      return;
    }

    setSelfLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/users/self/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ oldPassword, newPassword })
      });
      const data = await res.json();
      if (data.success) {
        setSelfMessage({ text: data.message || 'Password changed successfully', type: 'success' });
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setSelfMessage({ text: data.message || 'Failed to change password', type: 'error' });
      }
    } catch (err: any) {
      setSelfMessage({ text: 'Error connecting to auth server', type: 'error' });
    } finally {
      setSelfLoading(false);
    }
  };

  // Group sections by category
  const categories = ['Core Operations', 'Inventory & Logistics', 'Service & Quality', 'Commercial & Reporting'] as const;

  const filteredUsers = usersList.filter(u => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      (u.fullName || '').toLowerCase().includes(q) ||
      (u.username || '').toLowerCase().includes(q) ||
      (u.role || '').toLowerCase().includes(q) ||
      (u.city || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner & Tab Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-3xl border border-slate-800 shadow-xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-red-600/15 border border-red-500/30 rounded-2xl text-red-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                Handover & Role Delegation Portal
                <span className="text-[10px] bg-red-600/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full font-mono font-black uppercase">
                  Super Admin
                </span>
              </h1>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Grant, restrict, and manage granular ERP section access for all operations and management personnel
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800/80 shrink-0">
          <button
            onClick={() => setActiveTab('handover')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'handover'
                ? 'bg-red-600 text-white shadow-lg shadow-red-900/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Management Handover</span>
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'security'
                ? 'bg-red-600 text-white shadow-lg shadow-red-900/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>My Security & Profile</span>
          </button>
        </div>
      </div>

      {/* Main Tab 1: Handover & Permission Management */}
      {activeTab === 'handover' && (
        <>
          {!isSuperAdmin ? (
            <div className="glass-card p-12 rounded-3xl border border-slate-800 flex flex-col items-center justify-center text-center space-y-4">
              <div className="p-4 rounded-full bg-rose-500/10 border border-rose-500/20">
                <Shield className="w-12 h-12 text-rose-400" />
              </div>
              <h3 className="text-lg font-black text-white">Super Admin Access Required</h3>
              <p className="text-xs text-slate-400 max-w-md leading-relaxed font-medium">
                The Section Handover and Management Team Delegation Portal is strictly reserved for Super Administrators. Your active login credentials do not have permission to modify operator privileges.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Quick Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-900/50 border border-slate-800/80 p-4 rounded-2xl flex items-center gap-3.5">
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Management Operators</div>
                    <div className="text-xl font-black text-white">{usersList.length} Accounts</div>
                  </div>
                </div>

                <div className="bg-slate-900/50 border border-slate-800/80 p-4 rounded-2xl flex items-center gap-3.5">
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total ERP Modules</div>
                    <div className="text-xl font-black text-white">{ERP_SECTIONS_LIST.length} Sections</div>
                  </div>
                </div>

                <div className="bg-slate-900/50 border border-slate-800/80 p-4 rounded-2xl flex items-center gap-3.5">
                  <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active City Hubs</div>
                    <div className="text-xl font-black text-white">{cities.length} Hubs</div>
                  </div>
                </div>

                <div className="bg-slate-900/50 border border-slate-800/80 p-4 rounded-2xl flex items-center gap-3.5">
                  <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">RBAC Security Mode</div>
                    <div className="text-sm font-black text-purple-300">Granular Enforcement</div>
                  </div>
                </div>
              </div>

              {/* Provision New Management User Card */}
              <div className="bg-[#111622]/90 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-red-600/10 border border-red-500/25 text-red-400">
                      <UserPlus className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-white tracking-tight">Provision & Handover Access to Staff</h2>
                      <p className="text-[11px] text-slate-400 font-medium">
                        Create credentials for Operations, Logistics, Warehouse, or Finance teams and choose exactly which sections they see
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-red-600/15 text-red-400 border border-red-500/20 px-3 py-1 rounded-full font-mono font-bold self-start sm:self-auto">
                    Live Role Delegation
                  </span>
                </div>

                {createMessage && (
                  <div className={`p-3.5 rounded-2xl text-xs font-bold text-center border animate-scaleUp ${
                    createMessage.type === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  }`}>
                    {createMessage.text}
                  </div>
                )}

                <form onSubmit={handleCreateUser} className="space-y-6">
                  {/* Basic Credentials Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Full Name</label>
                      <input
                        type="text"
                        required
                        value={newFullName}
                        onChange={(e) => setNewFullName(e.target.value)}
                        placeholder="E.g., Sanjay Sen"
                        className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-800 focus:border-red-500 rounded-xl text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-red-500/20"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Username / Login ID</label>
                      <input
                        type="text"
                        required
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        placeholder="E.g., sanjaysen"
                        className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-800 focus:border-red-500 rounded-xl text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-red-500/20 font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Password</label>
                        <button
                          type="button"
                          onClick={generatePassword}
                          className="text-[9px] text-red-400 hover:text-red-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Sparkles className="w-2.5 h-2.5" /> Auto-Gen
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={showNewPass ? 'text' : 'password'}
                          required
                          value={newPass}
                          onChange={(e) => setNewPass(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-3.5 pr-16 py-2.5 bg-slate-950/70 border border-slate-800 focus:border-red-500 rounded-xl text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-red-500/20 font-mono"
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                          {newPass && (
                            <button
                              type="button"
                              onClick={() => copyPasswordToClipboard(newPass)}
                              title="Copy Password"
                              className="p-1 text-slate-400 hover:text-white cursor-pointer"
                            >
                              {copiedPass ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setShowNewPass(prev => !prev)}
                            className="p-1 text-slate-400 hover:text-white cursor-pointer"
                          >
                            {showNewPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Primary Role Profile</label>
                      <select
                        value={newRole}
                        onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-red-500 rounded-xl text-xs font-semibold text-slate-200 focus:outline-none cursor-pointer"
                      >
                        {roles.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>

                    <div className="space-y-1.5 md:col-span-2 lg:col-span-4">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Branch / Hub Scope</label>
                      <select
                        value={newCity}
                        onChange={(e) => setNewCity(e.target.value as CityName)}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-red-500 rounded-xl text-xs font-semibold text-slate-200 focus:outline-none cursor-pointer"
                      >
                        {cities.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Section Delegation Checkbox Matrix */}
                  <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                      <div>
                        <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                          <Sliders className="w-3.5 h-3.5 text-red-400" />
                          Handover Section Access Matrix ({selectedPermissions.length}/{ERP_SECTIONS_LIST.length} Allowed)
                        </h3>
                        <p className="text-[10px] text-slate-400 font-medium">
                          Select the specific ERP modules this staff operator is permitted to view & operate
                        </p>
                      </div>

                      {/* Quick Presets */}
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => applyPreset('all')}
                          className="text-[9px] font-bold px-2.5 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 rounded-lg cursor-pointer transition-all"
                        >
                          All Sections
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPreset('Operations Manager')}
                          className="text-[9px] font-bold px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg cursor-pointer transition-all"
                        >
                          Ops Preset
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPreset('Warehouse Manager')}
                          className="text-[9px] font-bold px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg cursor-pointer transition-all"
                        >
                          Warehouse Preset
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPreset('Logistics Team')}
                          className="text-[9px] font-bold px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg cursor-pointer transition-all"
                        >
                          Logistics Preset
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPreset('Finance')}
                          className="text-[9px] font-bold px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg cursor-pointer transition-all"
                        >
                          Finance Preset
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPreset('clear')}
                          className="text-[9px] font-bold px-2.5 py-1 bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-800/40 rounded-lg cursor-pointer transition-all"
                        >
                          Clear All
                        </button>
                      </div>
                    </div>

                    {/* Section Grid by Category */}
                    <div className="space-y-4 pt-1">
                      {categories.map((cat) => {
                        const items = ERP_SECTIONS_LIST.filter(s => s.category === cat);
                        return (
                          <div key={cat} className="space-y-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block pl-1">
                              {cat}
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                              {items.map((sec) => {
                                const isChecked = selectedPermissions.includes(sec.id);
                                return (
                                  <div
                                    key={sec.id}
                                    onClick={() => togglePermission(sec.id)}
                                    className={`p-3 rounded-xl border transition-all cursor-pointer select-none flex items-start gap-2.5 ${
                                      isChecked
                                        ? 'bg-red-950/30 border-red-500/50 shadow-md shadow-red-950/30'
                                        : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 opacity-60 hover:opacity-100'
                                    }`}
                                  >
                                    <div className="mt-0.5 shrink-0">
                                      {isChecked ? (
                                        <CheckSquare className="w-4 h-4 text-red-400" />
                                      ) : (
                                        <Square className="w-4 h-4 text-slate-600" />
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <div className={`text-xs font-bold leading-tight ${isChecked ? 'text-white' : 'text-slate-300'}`}>
                                        {sec.label}
                                      </div>
                                      <p className="text-[9px] text-slate-400 mt-0.5 line-clamp-1 leading-snug">
                                        {sec.description}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Provision Submit Button */}
                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={createLoading}
                      className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-2xl cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-red-900/30 flex items-center gap-2"
                    >
                      {createLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Provisioning Account...</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          <span>Provision Account & Handover {selectedPermissions.length} Sections</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Management Team Directory & Handover Controls Table */}
              <div className="bg-[#111622]/90 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-red-600/10 border border-red-500/25 text-red-400">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-white tracking-tight">Active Management Personnel Directory</h2>
                      <p className="text-[11px] text-slate-400 font-medium">
                        Modify permissions on the fly, reset credentials, or revoke operator logins
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search staff..."
                        className="pl-8 pr-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs font-semibold text-white placeholder-slate-500 focus:outline-none focus:border-red-500 w-44 sm:w-56"
                      />
                    </div>
                    <button
                      onClick={fetchUsers}
                      className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all cursor-pointer"
                      title="Refresh Staff List"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-slate-300 ${usersLoading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto border border-slate-800/60 rounded-2xl bg-slate-950/40">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase tracking-wider font-bold bg-slate-900/40">
                        <th className="p-3.5">Operator Profile</th>
                        <th className="p-3.5">Role Profile</th>
                        <th className="p-3.5">Assigned Hub</th>
                        <th className="p-3.5">Delegated Sections</th>
                        <th className="p-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-xs text-slate-500 font-medium">
                            No operator accounts match the current query.
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((usr) => {
                          const perms = Array.isArray(usr.permissions) ? usr.permissions : [];
                          const isFull = perms.includes('*') || perms.includes('all') || usr.role === 'Super Admin';
                          const permCount = isFull ? ERP_SECTIONS_LIST.length : perms.length;

                          return (
                            <tr key={usr.username} className="hover:bg-slate-900/30 text-xs transition-colors">
                              <td className="p-3.5">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center font-black text-white uppercase text-xs shadow-md">
                                    {(usr.fullName || usr.username).slice(0, 2)}
                                  </div>
                                  <div>
                                    <div className="font-bold text-white flex items-center gap-1.5">
                                      {usr.fullName}
                                      {usr.username === 'admin' && (
                                        <span className="text-[9px] bg-red-600/20 text-red-400 border border-red-500/30 px-1.5 py-0.2 rounded font-mono font-black">
                                          ROOT
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[10px] text-slate-500 font-mono">@{usr.username}</div>
                                  </div>
                                </div>
                              </td>

                              <td className="p-3.5">
                                <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold border ${
                                  usr.role === 'Super Admin'
                                    ? 'bg-red-500/10 border-red-500/25 text-red-400'
                                    : usr.role === 'Operations Manager'
                                    ? 'bg-rose-500/10 border-rose-500/25 text-rose-400'
                                    : 'bg-slate-800 border-slate-700 text-slate-300'
                                }`}>
                                  {usr.role}
                                </span>
                              </td>

                              <td className="p-3.5 text-slate-300 font-medium font-mono text-[11px]">
                                {usr.city}
                              </td>

                              <td className="p-3.5">
                                <div className="flex items-center gap-2">
                                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${
                                    isFull
                                      ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                                      : permCount > 0
                                      ? 'bg-cyan-500/10 border-cyan-500/25 text-cyan-400'
                                      : 'bg-rose-500/10 border-rose-500/25 text-rose-400'
                                  }`}>
                                    {isFull ? 'Full Access (All 14 Modules)' : `${permCount} of ${ERP_SECTIONS_LIST.length} Modules`}
                                  </span>
                                </div>
                              </td>

                              <td className="p-3.5 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {/* Edit Permissions Button */}
                                  <button
                                    onClick={() => {
                                      setEditingPermissionsUser(usr);
                                      const current = isFull
                                        ? ERP_SECTIONS_LIST.map(s => s.id)
                                        : (Array.isArray(usr.permissions) ? usr.permissions : (ROLE_DEFAULT_PERMISSIONS[usr.role as UserRole] || []));
                                      setSelectedEditPermissions(current);
                                      setEditPermissionsMessage(null);
                                    }}
                                    className="px-2.5 py-1 text-[10px] font-bold text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 rounded-lg cursor-pointer transition-all"
                                  >
                                    Edit Sections
                                  </button>

                                  {/* Reset Password Button */}
                                  <button
                                    onClick={() => {
                                      setResettingUser(usr);
                                      setResetMessage(null);
                                      setResetNewPassword('');
                                    }}
                                    className="px-2.5 py-1 text-[10px] font-bold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-lg cursor-pointer transition-all"
                                  >
                                    Reset Pass
                                  </button>

                                  {/* Delete User Button (Hidden for root admin) */}
                                  {usr.username !== 'admin' && (
                                    <button
                                      onClick={() => {
                                        setDeletingUser(usr);
                                        setDeleteMessage(null);
                                      }}
                                      className="p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg cursor-pointer transition-all"
                                      title="Delete Staff Account"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}
        </>
      )}

      {/* Main Tab 2: Personal Profile & Self Password Change */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Active Session Card */}
          <div className="bg-[#111622]/90 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <div className="p-2.5 rounded-2xl bg-red-600/10 border border-red-500/25 text-red-400">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Active Session Details</h3>
                <p className="text-[11px] text-slate-400 font-medium">Current logged-in identity on this terminal</p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-2xl flex justify-between items-center">
                <span className="text-xs text-slate-400 font-medium">Logged-in User</span>
                <span className="text-xs font-bold text-white">{currentUser?.fullName || 'Super Administrator'}</span>
              </div>
              <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-2xl flex justify-between items-center">
                <span className="text-xs text-slate-400 font-medium">Username</span>
                <span className="text-xs font-mono font-bold text-red-400">@{currentUser?.username || 'admin'}</span>
              </div>
              <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-2xl flex justify-between items-center">
                <span className="text-xs text-slate-400 font-medium">Security Role</span>
                <span className="text-xs font-bold text-emerald-400">{currentUser?.role || currentUserRole}</span>
              </div>
              <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-2xl flex justify-between items-center">
                <span className="text-xs text-slate-400 font-medium">Hub Scope</span>
                <span className="text-xs font-bold text-cyan-400">{currentUser?.city || 'Indore (Head Office)'}</span>
              </div>
            </div>
          </div>

          {/* Change Personal Password Form */}
          <div className="bg-[#111622]/90 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <div className="p-2.5 rounded-2xl bg-emerald-600/10 border border-emerald-500/25 text-emerald-400">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Update Your Password</h3>
                <p className="text-[11px] text-slate-400 font-medium">Secure your personal management console credentials</p>
              </div>
            </div>

            {selfMessage && (
              <div className={`p-3 rounded-xl text-xs font-bold text-center border ${
                selfMessage.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/25 text-rose-400'
              }`}>
                {selfMessage.text}
              </div>
            )}

            <form onSubmit={handleSelfPasswordChange} className="space-y-3.5 pt-1">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Current Password</label>
                <input
                  type="password"
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-800 focus:border-red-500 rounded-xl text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-red-500/20 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-800 focus:border-red-500 rounded-xl text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-red-500/20 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-800 focus:border-red-500 rounded-xl text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-red-500/20 font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={selfLoading}
                className="w-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-3 rounded-xl cursor-pointer transition-all hover:scale-[1.01] flex items-center justify-center gap-1.5 shadow-lg shadow-red-900/30"
              >
                {selfLoading ? 'Updating Password...' : 'Save New Password'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal 1: Edit Permissions Modal */}
      {editingPermissionsUser && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#111622] border border-slate-800 rounded-3xl p-6 shadow-2xl relative max-h-[90vh] flex flex-col animate-scaleUp">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    Edit Delegated Sections: {editingPermissionsUser.fullName}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium">
                    @{editingPermissionsUser.username} • Role: {editingPermissionsUser.role}
                  </p>
                </div>
              </div>
              <span className="text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 px-2.5 py-1 rounded-full font-mono font-bold">
                {selectedEditPermissions.length}/{ERP_SECTIONS_LIST.length} Enabled
              </span>
            </div>

            {editPermissionsMessage && (
              <div className={`mt-4 p-3 rounded-xl text-xs font-bold text-center border ${
                editPermissionsMessage.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/25 text-rose-400'
              }`}>
                {editPermissionsMessage.text}
              </div>
            )}

            {/* Quick Presets Bar */}
            <div className="flex flex-wrap gap-1.5 pt-4">
              <button
                type="button"
                onClick={() => applyEditPreset('all')}
                className="text-[9px] font-bold px-2 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 rounded-lg cursor-pointer"
              >
                All 14 Modules
              </button>
              <button
                type="button"
                onClick={() => applyEditPreset('Operations Manager')}
                className="text-[9px] font-bold px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg cursor-pointer"
              >
                Ops Manager
              </button>
              <button
                type="button"
                onClick={() => applyEditPreset('Warehouse Manager')}
                className="text-[9px] font-bold px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg cursor-pointer"
              >
                Warehouse
              </button>
              <button
                type="button"
                onClick={() => applyEditPreset('Logistics Team')}
                className="text-[9px] font-bold px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg cursor-pointer"
              >
                Logistics
              </button>
              <button
                type="button"
                onClick={() => applyEditPreset('Finance')}
                className="text-[9px] font-bold px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg cursor-pointer"
              >
                Finance
              </button>
              <button
                type="button"
                onClick={() => applyEditPreset('clear')}
                className="text-[9px] font-bold px-2 py-1 bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-800/40 rounded-lg cursor-pointer"
              >
                Clear All
              </button>
            </div>

            {/* Scrollable Checkbox List */}
            <div className="flex-1 overflow-y-auto space-y-3.5 my-4 pr-1">
              {categories.map((cat) => {
                const items = ERP_SECTIONS_LIST.filter(s => s.category === cat);
                return (
                  <div key={cat} className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      {cat}
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {items.map((sec) => {
                        const isChecked = selectedEditPermissions.includes(sec.id);
                        return (
                          <div
                            key={sec.id}
                            onClick={() => toggleEditPermission(sec.id)}
                            className={`p-2.5 rounded-xl border transition-all cursor-pointer select-none flex items-start gap-2.5 ${
                              isChecked
                                ? 'bg-red-950/30 border-red-500/50'
                                : 'bg-slate-900/40 border-slate-800 opacity-60 hover:opacity-100'
                            }`}
                          >
                            <div className="mt-0.5 shrink-0">
                              {isChecked ? (
                                <CheckSquare className="w-4 h-4 text-red-400" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-600" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className={`text-xs font-bold ${isChecked ? 'text-white' : 'text-slate-300'}`}>
                                {sec.label}
                              </div>
                              <p className="text-[9px] text-slate-400 truncate">
                                {sec.description}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingPermissionsUser(null)}
                className="flex-1 bg-slate-900 border border-slate-800 text-slate-300 text-xs font-bold py-2.5 rounded-xl transition-all cursor-pointer hover:bg-slate-800 text-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePermissions}
                disabled={editPermissionsLoading}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2.5 rounded-xl transition-all hover:scale-[1.01] cursor-pointer text-center flex items-center justify-center gap-2 shadow-lg shadow-red-900/30"
              >
                {editPermissionsLoading ? 'Saving...' : 'Save & Update Permissions'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Modal 2: Reset Staff Password Modal */}
      {resettingUser && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-[400px] bg-[#111622] border border-slate-800 rounded-3xl p-6 shadow-2xl relative animate-scaleUp">
            <h3 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-amber-400" />
              Reset Staff Password
            </h3>
            <p className="text-[11px] text-slate-400 mt-1 font-medium">
              Force reset credentials for **{resettingUser.fullName}** (@{resettingUser.username})
            </p>

            {resetMessage && (
              <div className={`mt-4 p-2.5 rounded-xl text-xs font-bold text-center border ${
                resetMessage.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/25 text-rose-400'
              }`}>
                {resetMessage.text}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4 mt-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">New Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
                      let pass = '';
                      for (let i = 0; i < 10; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
                      setResetNewPassword(pass);
                    }}
                    className="text-[9px] text-red-400 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-2.5 h-2.5" /> Auto-Gen
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={resetNewPassword}
                  onChange={(e) => setResetNewPassword(e.target.value)}
                  placeholder="Enter or generate new password"
                  className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-800 focus:border-red-500 rounded-xl text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-red-500/20 font-mono"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setResettingUser(null)}
                  className="flex-1 bg-slate-900 border border-slate-800 text-slate-300 text-xs font-bold py-2.5 rounded-xl transition-all cursor-pointer hover:bg-slate-800 text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2.5 rounded-xl transition-all hover:scale-[1.01] cursor-pointer text-center"
                >
                  {resetLoading ? 'Saving...' : 'Set Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Delete Staff Account Modal */}
      {deletingUser && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-[400px] bg-[#111622] border border-rose-900/40 rounded-3xl p-6 shadow-2xl relative animate-scaleUp">
            <div className="flex items-center gap-2.5 text-rose-400 mb-2">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-black text-white">Confirm Account Deletion</h3>
            </div>
            <p className="text-xs text-slate-300 mt-1 font-medium leading-relaxed">
              Are you sure you want to permanently revoke and delete the operator account for <strong className="text-white">@{deletingUser.username}</strong> ({deletingUser.fullName})?
            </p>

            {deleteMessage && (
              <div className="mt-3 p-2.5 rounded-xl text-xs font-bold text-center bg-rose-500/10 border border-rose-500/25 text-rose-400">
                {deleteMessage.text}
              </div>
            )}

            <div className="flex gap-3 pt-5">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="flex-1 bg-slate-900 border border-slate-800 text-slate-300 text-xs font-bold py-2.5 rounded-xl transition-all cursor-pointer hover:bg-slate-800 text-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={deleteLoading}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-2.5 rounded-xl transition-all cursor-pointer text-center"
              >
                {deleteLoading ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

