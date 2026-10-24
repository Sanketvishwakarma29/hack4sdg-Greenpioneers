import React, { useState } from 'react';
import { Store, User, Key, X, ShieldAlert, Sparkles, Building2, ArrowRight, ShieldCheck } from 'lucide-react';

export default function PharmacyLoginModal({ isOpen, onClose, onLoginSuccess }) {
  const [storeName, setStoreName] = useState('Apollo Pharmacy - Indiranagar 100ft Rd');
  const [pharmacistName, setPharmacistName] = useState('Pharmacist Rajesh (Lead Chemist)');
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
      // Chemist credentials
      const user = username.trim().toLowerCase();
      const pass = password.trim();

      if (
        (user === 'chemist' || user === 'pharmacy' || user === 'apollo' || user === 'medplus') &&
        (pass === 'pharmacy123' || pass === 'chemist123' || pass === 'apollo123')
      ) {
        setLoading(false);
        sessionStorage.setItem('ecoblister_pharmacy', 'true');
        sessionStorage.setItem('ecoblister_pharmacy_store', storeName);
        sessionStorage.setItem('ecoblister_pharmacist_name', pharmacistName || 'Store Pharmacist');
        onLoginSuccess();
        onClose();
      } else {
        setLoading(false);
        setError('Invalid chemist credentials. Use chemist / pharmacy123 or click "Demo Chemist Login".');
      }
    }, 350);
  };

  const handleDemoLogin = () => {
    setUsername('chemist');
    setPassword('pharmacy123');
    setError(null);
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      sessionStorage.setItem('ecoblister_pharmacy', 'true');
      sessionStorage.setItem('ecoblister_pharmacy_store', storeName);
      sessionStorage.setItem('ecoblister_pharmacist_name', pharmacistName || 'Pharmacist Rajesh (Lead Chemist)');
      onLoginSuccess();
      onClose();
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden text-left">
        
        {/* Header */}
        <div className="px-6 pt-6 pb-4 bg-gradient-to-r from-emerald-800 via-teal-900 to-[#062e1b] text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20">
              <Store className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-extrabold text-base leading-tight">Pharmacy Chemist Portal</h3>
              <p className="text-[11px] text-emerald-200">Blister Validation & Promo Code Issuance</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="text-white/60 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Demo Fast Fill Badge */}
        <div className="px-6 pt-4 pb-1">
          <button
            type="button"
            onClick={handleDemoLogin}
            className="w-full py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300/80 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Click for Instant Demo Chemist Login (chemist / pharmacy123)</span>
          </button>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700 animate-shake">
              <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Select Pharmacy Store */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Your Pharmacy Drop-box Location:
            </label>
            <div className="relative">
              <select
                value={storeName}
                onChange={e => setStoreName(e.target.value)}
                className="w-full h-11 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#bef264]"
              >
                <option value="Apollo Pharmacy - Indiranagar 100ft Rd">Apollo Pharmacy - Indiranagar 100ft Rd</option>
                <option value="Victoria Hospital - Fort Road OPD Counter">Victoria Hospital - Fort Road OPD Counter</option>
                <option value="Manipal Hospital - Old Airport Road">Manipal Hospital - Old Airport Road</option>
                <option value="MedPlus Pharmacy - Malleshwaram 8th Cross">MedPlus Pharmacy - Malleshwaram 8th Cross</option>
                <option value="All Bengaluru Chemist Drop-boxes">All Bengaluru Chemist Drop-boxes (Network Lead)</option>
              </select>
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
            </div>
          </div>

          {/* Pharmacist Name / Identifier */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Pharmacist Staff Name:
            </label>
            <div className="relative">
              <input
                type="text"
                value={pharmacistName}
                onChange={e => setPharmacistName(e.target.value)}
                placeholder="e.g. Pharmacist Rajesh Kumar"
                className="w-full h-11 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#bef264]"
              />
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
            </div>
          </div>

          {/* Username */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Staff Username:
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="chemist"
                className="w-full h-11 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#bef264]"
              />
              <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Password:
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full h-11 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#bef264]"
              />
              <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-[#062e1b] hover:bg-[#073c24] text-[#bef264] font-black text-xs sm:text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Chemist Validator Portal'}</span>
              <ArrowRight className="w-4 h-4 text-[#bef264]" />
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
