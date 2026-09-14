import React, { useState } from 'react';
import { useRentBuddyStore } from '../store/rentBuddyStore';
import rentBuddyLogo from '../assets/rentbuddy1.png';
import { Lock, User, Eye, EyeOff, ShieldCheck, KeyRound, Fingerprint } from 'lucide-react';

export default function Login() {
  const { login, loginError } = useRentBuddyStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showForgotNotice, setShowForgotNotice] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;

    setLoading(true);
    const success = await login(username, password);
    setLoading(false);
    
    if (success) {
      // Trigger a success audio chime
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const ctx = new AudioContextClass();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(587.33, ctx.currentTime);
          osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
          gain.gain.setValueAtTime(0.08, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.3);
        }
      } catch (err) {}
    }
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-[#07090e] relative overflow-hidden font-sans select-none antialiased p-4">
      {/* Background glowing gradient spheres with brand red */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-red-600/10 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-rose-600/10 rounded-full blur-[140px] pointer-events-none"></div>

      <div className="w-full max-w-[440px] bg-[#11151f]/95 backdrop-blur-xl border border-slate-800/90 rounded-3xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.7),0_0_40px_rgba(225,29,72,0.08)] relative z-10 transition-all">
        
        {/* Header Logo */}
        <div className="flex flex-col items-center text-center space-y-3 mb-8">
          <div className="w-16 h-16 bg-white/95 rounded-2xl p-2 flex items-center justify-center shadow-xl shadow-red-950/50 border border-red-500/30 relative">
            <img src={rentBuddyLogo} alt="RentBuddy Logo" className="w-full h-full object-contain" />
            <div className="absolute -top-1 -right-1 bg-red-500 w-3 h-3 rounded-full border-2 border-[#11151f] animate-ping"></div>
            <div className="absolute -top-1 -right-1 bg-red-500 w-3 h-3 rounded-full border-2 border-[#11151f]"></div>
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center justify-center gap-1.5">
              RentBuddy <span className="text-white font-mono text-xs px-2 py-0.5 bg-red-600 border border-red-500 rounded-md font-bold uppercase tracking-wider">ERP v2</span>
            </h2>
            <p className="text-[11px] text-slate-400 mt-1 font-medium">
              Enterprise Rental Logistics & Fleet Management Portal
            </p>
          </div>
        </div>

        {/* Security Warning banner */}
        <div className="mb-6 bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 flex gap-3 items-start">
          <ShieldCheck className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <h4 className="text-[11px] font-bold text-slate-200">High-Security Environment</h4>
            <p className="text-[10px] text-slate-400 leading-normal font-medium">
              Secured with bcrypt verification and rate-limited offline & cloud sync engines.
            </p>
          </div>
        </div>

        {/* Error Notification banner */}
        {loginError && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl p-3 text-[11px] font-semibold text-center leading-normal">
            ⚠️ {loginError}
          </div>
        )}

        {/* Forgot password notification */}
        {showForgotNotice && (
          <div className="mb-5 bg-slate-900/90 border border-slate-700/80 text-slate-300 rounded-xl p-3.5 text-[11px] leading-relaxed relative animate-fadeIn">
            <div className="font-bold text-white mb-1 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-red-400" />
              Administrative Password Reset
            </div>
            <p className="text-slate-400 text-[10px]">
              Password resets for operational staff and administrators are managed centrally by the IT Security Officer. Please contact the administrator desk or use the ERP Management Console.
            </p>
            <button
              type="button"
              onClick={() => setShowForgotNotice(false)}
              className="mt-2 text-[10px] font-bold text-red-400 hover:text-red-300 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Username */}
          <div className="space-y-1.5">
            <label htmlFor="login-username" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Username</label>
            <div className="relative group">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 group-focus-within:text-red-400 transition-colors">
                <User className="w-4.5 h-4.5" />
              </span>
              <input
                id="login-username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full pl-10 pr-4 py-3 bg-slate-950/70 border border-slate-800 hover:border-slate-700/80 focus:border-red-500 rounded-xl text-xs font-semibold text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-red-500/30 transition-all font-sans"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="login-password" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Password</label>
              <button
                type="button"
                onClick={() => setShowForgotNotice(true)}
                className="text-[10px] font-bold text-red-400 hover:text-red-300 hover:underline cursor-pointer"
              >
                Forgot?
              </button>
            </div>
            <div className="relative group">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 group-focus-within:text-red-400 transition-colors">
                <KeyRound className="w-4.5 h-4.5" />
              </span>
              <input
                id="login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-10 py-3 bg-slate-950/70 border border-slate-800 hover:border-slate-700/80 focus:border-red-500 rounded-xl text-xs font-semibold text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-red-500/30 transition-all font-mono"
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
              </button>
            </div>
          </div>

          {/* Remember Me */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-slate-300 text-[11px] font-semibold">
              <input type="checkbox" defaultChecked className="rounded border-slate-800 text-red-600 focus:ring-0 focus:ring-offset-0 bg-slate-950 w-4 h-4 cursor-pointer" />
              Remember device
            </label>
            <span className="text-[10px] text-slate-400 font-medium">Session logs: 24h</span>
          </div>

          {/* Login button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-xs font-extrabold py-3.5 rounded-xl transition-all hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-red-950/40 cursor-pointer flex items-center justify-center gap-2 border border-red-500/30 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/35 border-t-white rounded-full animate-spin"></div>
            ) : (
              'Sign In securely'
            )}
          </button>
        </form>

        {/* Biometric / SSO */}
        <div className="mt-6 pt-6 border-t border-slate-800/80 flex flex-col items-center space-y-3">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Or access with</span>
          <div className="grid grid-cols-2 gap-3.5 w-full">
            <button
              type="button"
              className="bg-slate-900/60 hover:bg-slate-900 text-slate-300 text-[10px] font-bold py-2.5 px-4 rounded-xl border border-slate-800 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01]"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google SSO
            </button>
            <button
              type="button"
              className="bg-slate-900/60 hover:bg-slate-900 text-slate-300 text-[10px] font-bold py-2.5 px-4 rounded-xl border border-slate-800 flex items-center justify-center gap-1.5 cursor-pointer transition-all hover:scale-[1.01]"
            >
              <Fingerprint className="w-3.5 h-3.5 text-red-500" /> Biometric
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
