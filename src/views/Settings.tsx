import React, { useState, useEffect } from 'react';
import { useRentBuddyStore } from '../store/rentBuddyStore';
import { getApiBaseUrl } from '../api/client';
import { Shield, KeyRound, UserPlus, Users, Settings as Gear, ShieldCheck, Eye, EyeOff, RefreshCw, Trash, User } from 'lucide-react';
import type { UserRole, CityName } from '../types';

export default function Settings() {
  const { token, currentUser, cities } = useRentBuddyStore();
  const BACKEND_URL = getApiBaseUrl();
  
  // Self Password Change states
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selfLoading, setSelfLoading] = useState(false);
  const [selfMessage, setSelfMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // User Management states
  const [usersList, setUsersList] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [resettingUser, setResettingUser] = useState<any | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetMessage, setResetMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  // Create User states
  const [newUsername, setNewUsername] = useState('');
  const [newPass, setNewPass] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('Operations Manager');
  const [newCity, setNewCity] = useState<CityName>('Indore (Head Office)');
  const [createMessage, setCreateMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [createLoading, setCreateLoading] = useState(false);

  const fetchUsers = async () => {
    if (!token || currentUser?.role !== 'Super Admin') return;
    setUsersLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setUsersList(data.users);
      }
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [token, currentUser]);

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
          city: newCity
        })
      });
      const data = await res.json();
      if (data.success) {
        setCreateMessage({ text: 'User created successfully', type: 'success' });
        setNewUsername('');
        setNewPass('');
        setNewFullName('');
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

  const roles: UserRole[] = [
    'Super Admin',
    'Operations Manager',
    'Warehouse Manager',
    'Logistics Team',
    'Repair Team',
    'Finance',
    'Customer Support',
    'Read-only Auditor'
  ];

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Gear className="w-5.5 h-5.5 text-red-400" />
            Security & User Settings
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            Manage your personal login credentials and administrative ERP users list
          </p>
        </div>
        <button
          onClick={fetchUsers}
          className="p-2 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          title="Refresh User Data"
        >
          <RefreshCw className={`w-4 h-4 text-slate-300 ${usersLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Change password (Self) */}
        <div className="glass-card p-6 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-4 lg:col-span-1">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded bg-red-500/10"><KeyRound className="w-4 h-4 text-red-400" /></div>
              <div>
                <h3 className="text-sm font-bold text-white">Change Password</h3>
                <p className="text-[10px] text-slate-400 font-medium">Update your own profile credentials</p>
              </div>
            </div>

            {selfMessage && (
              <div className={`p-2.5 rounded-lg text-[10px] font-bold text-center border ${
                selfMessage.type === 'success' 
                  ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' 
                  : 'bg-rose-500/10 border-rose-500/25 text-rose-400'
              }`}>
                {selfMessage.text}
              </div>
            )}

            <form onSubmit={handleSelfPasswordChange} className="space-y-3.5 pt-2">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Current Password</label>
                <input
                  type="password"
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 focus:border-[#00ab55] rounded-xl text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-[#00ab55]/20 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 focus:border-[#00ab55] rounded-xl text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-[#00ab55]/20 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 focus:border-[#00ab55] rounded-xl text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-[#00ab55]/20 font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={selfLoading}
                className="w-full bg-[#00ab55] hover:bg-[#008f44] text-white text-[10px] font-bold py-2.5 rounded-xl cursor-pointer transition-all hover:scale-[1.01] flex items-center justify-center gap-1.5"
              >
                {selfLoading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Col: User Management & Create User (Super Admin only) */}
        {currentUser?.role === 'Super Admin' ? (
          <div className="lg:col-span-2 space-y-6">
            
            {/* Create user block */}
            <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded bg-emerald-500/10"><UserPlus className="w-4 h-4 text-emerald-400" /></div>
                <div>
                  <h3 className="text-sm font-bold text-white">Register New Console User</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Provision new staff accounts with custom RBAC profiles</p>
                </div>
              </div>

              {createMessage && (
                <div className={`p-2.5 rounded-lg text-[10px] font-bold text-center border ${
                  createMessage.type === 'success' 
                    ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' 
                    : 'bg-rose-500/10 border-rose-500/25 text-rose-400'
                }`}>
                  {createMessage.text}
                </div>
              )}

              <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Full Name</label>
                  <input
                    type="text"
                    required
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    placeholder="E.g., Sanjay Sen"
                    className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 focus:border-[#00ab55] rounded-xl text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-[#00ab55]/20"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Username</label>
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="E.g., sanjaysen"
                    className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 focus:border-[#00ab55] rounded-xl text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-[#00ab55]/20 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Default Password</label>
                  <input
                    type="password"
                    required
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 focus:border-[#00ab55] rounded-xl text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-[#00ab55]/20 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Security Role</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-[#00ab55] rounded-xl text-xs font-semibold text-slate-300 focus:outline-none cursor-pointer"
                  >
                    {roles.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Primary City Hub Scope</label>
                  <select
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value as CityName)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-[#00ab55] rounded-xl text-xs font-semibold text-slate-300 focus:outline-none cursor-pointer"
                  >
                    {cities.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="md:col-span-2 pt-2">
                  <button
                    type="submit"
                    disabled={createLoading}
                    className="w-full bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold py-2.5 rounded-xl cursor-pointer transition-all hover:scale-[1.01]"
                  >
                    {createLoading ? 'Provisioning...' : 'Provision User Account'}
                  </button>
                </div>
              </form>
            </div>

            {/* Users listing block */}
            <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded bg-red-500/10"><Users className="w-4 h-4 text-red-400" /></div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Existing System Operators</h3>
                    <p className="text-[10px] text-slate-400 font-medium">Replicate, audits, and reset access for active personnel</p>
                  </div>
                </div>
                <span className="text-[9px] bg-slate-800/80 text-slate-300 border border-slate-700 px-2 py-0.5 rounded font-mono font-bold">
                  {usersList.length} Accounts
                </span>
              </div>

              {/* Users table */}
              <div className="overflow-x-auto border border-slate-800/60 rounded-xl bg-slate-950/30">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800/80 text-slate-400 text-[9px] uppercase tracking-wider font-bold">
                      <th className="p-3">User Profile</th>
                      <th className="p-3">Role</th>
                      <th className="p-3">Primary Hub</th>
                      <th className="p-3 text-right">Access Control</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {usersList.map((usr) => (
                      <tr key={usr.username} className="hover:bg-slate-900/20 text-xs transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-slate-800 rounded-full flex items-center justify-center font-bold text-slate-200 uppercase font-mono">
                              {usr.username.slice(0,2)}
                            </div>
                            <div>
                              <div className="font-semibold text-white">{usr.fullName}</div>
                              <div className="text-[9px] text-slate-500 font-mono">@{usr.username}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                            usr.role === 'Super Admin' 
                              ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' 
                              : usr.role === 'Operations Manager' 
                              ? 'bg-red-500/10 border-red-500/20 text-red-400'
                              : 'bg-slate-800 border-slate-700 text-slate-300'
                          }`}>
                            {usr.role}
                          </span>
                        </td>
                        <td className="p-3 text-slate-400 text-[10px] font-medium font-mono">{usr.city.split(' ')[0]}</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => {
                              setResettingUser(usr);
                              setResetMessage(null);
                              setResetNewPassword('');
                            }}
                            className="text-[10px] text-emerald-400 hover:text-emerald-300 font-extrabold px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 rounded-lg cursor-pointer transition-all hover:scale-[1.01]"
                          >
                            Reset Password
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 glass-card p-6 rounded-2xl border border-slate-800 flex flex-col items-center justify-center text-center space-y-3 min-h-[300px]">
            <Shield className="w-10 h-10 text-slate-600" />
            <h4 className="text-sm font-bold text-white">Administrative Actions Locked</h4>
            <p className="text-[11px] text-slate-400 max-w-[280px] leading-normal font-medium">
              Only console users provisioned with the **Super Admin** role are authorized to manage or reset staff logins.
            </p>
          </div>
        )}

      </div>

      {/* Reset Password Drawer/Modal Overlay */}
      {resettingUser && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-[380px] bg-[#161c24] border border-slate-800 rounded-3xl p-6 shadow-2xl relative animate-scaleUp">
            <h3 className="text-base font-extrabold text-white tracking-tight flex items-center gap-1.5">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              Reset Staff Password
            </h3>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">
              Force reset access credentials for user **{resettingUser.fullName}** (@{resettingUser.username})
            </p>

            {resetMessage && (
              <div className={`mt-4 p-2.5 rounded-lg text-[10px] font-bold text-center border ${
                resetMessage.type === 'success' 
                  ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' 
                  : 'bg-rose-500/10 border-rose-500/25 text-rose-400'
              }`}>
                {resetMessage.text}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4 mt-5">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">New Password</label>
                <input
                  type="password"
                  required
                  value={resetNewPassword}
                  onChange={(e) => setResetNewPassword(e.target.value)}
                  placeholder="Type new secure password"
                  className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 focus:border-[#00ab55] rounded-xl text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-[#00ab55]/20 font-mono"
                />
              </div>

              <div className="flex gap-3 pt-1.5">
                <button
                  type="button"
                  onClick={() => setResettingUser(null)}
                  className="flex-1 bg-slate-900 border border-slate-800 text-slate-300 text-[10px] font-bold py-2.5 rounded-xl transition-all cursor-pointer hover:bg-slate-900/80 text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="flex-1 bg-[#00ab55] hover:bg-[#008f44] text-white text-[10px] font-bold py-2.5 rounded-xl transition-all hover:scale-[1.01] cursor-pointer text-center"
                >
                  {resetLoading ? 'Saving...' : 'Save Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
