import React, { useState } from 'react';
import { Lock, User, Key, X, ShieldAlert, Sparkles, Factory, ArrowRight, ShieldCheck } from 'lucide-react';

export default function PartnerLoginModal({ isOpen, onClose, onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    setTimeout(() => {
      // Partner credentials
      if (
        (username.trim().toLowerCase() === 'partner' || username.trim().toLowerCase() === 'recycler') &&
        (password.trim() === 'partner123' || password.trim() === 'recycle2026')
      ) {
        setLoading(false);
        onLoginSuccess();
        onClose();
      } else {
        setLoading(false);
        setError('Invalid partner credentials. Use partner / partner123 or tap Demo Partner Login.');
      }
    }, 400);
  };

  const handleDemoPartnerLogin = () => {
    setUsername('partner');
    setPassword('partner123');
    setError(null);
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLoginSuccess();
      onClose();
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden text-left">
        
        {/* Header */}
        <div className="px-6 pt-6 pb-4 bg-gradient-to-r from-teal-700 via-emerald-800 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20">
              <Factory className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-extrabold text-base leading-tight">Recovery Partner Portal</h3>
              <p className="text-[11px] text-emerald-200">Refinery & Recycling Facility Authentication</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 transition-colors text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Security Badge */}
        <div className="bg-teal-50 px-5 py-2.5 border-b border-teal-100 flex items-center gap-2 text-xs font-semibold text-teal-800">
          <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
          <span>Restricted to Authorized Hydrometallurgical Recycling Facilities</span>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700 animate-shake">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              Partner Facility Username
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. partner"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-slate-400" />
              Facility Security Key / Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-teal-700 hover:bg-teal-600 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg shadow-teal-700/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {loading ? 'Verifying Credentials...' : 'Sign In to Recovery Facility'}
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* Quick Demo Credentials */}
          <div className="pt-2 border-t border-slate-100 flex flex-col items-center gap-2">
            <span className="text-[11px] text-slate-400 font-medium">Demo Partner Credentials: partner / partner123</span>
            <button
              type="button"
              onClick={handleDemoPartnerLogin}
              className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-200 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>1-Click Demo Partner Login</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
