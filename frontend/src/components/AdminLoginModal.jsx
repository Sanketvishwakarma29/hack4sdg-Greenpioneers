import React, { useState } from 'react';
import { Shield, Lock, User, Key, AlertCircle, ArrowRight, CheckCircle2, X } from 'lucide-react';
import BrandLogo from './BrandLogo';

export default function AdminLoginModal({ isOpen, onClose, onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    setTimeout(() => {
      // Standard Admin credentials
      const validUsers = ['admin', 'driver', 'ecoblister', 'staff'];
      const validPass = ['admin', 'admin123', 'ecoblister', 'ecoblister2026'];

      if (
        validUsers.includes(username.trim().toLowerCase()) &&
        validPass.includes(password.trim())
      ) {
        setLoading(false);
        onLoginSuccess();
        onClose();
      } else {
        setLoading(false);
        setError('Invalid staff credentials. Hint: Username "admin", Password "admin123"');
      }
    }, 400);
  };

  const handleQuickDemoLogin = () => {
    setUsername('admin');
    setPassword('admin123');
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLoginSuccess();
      onClose();
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-6 text-white text-center relative border-b border-emerald-500/20">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 p-1.5 rounded-full hover:bg-white/10 text-slate-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center mx-auto mb-3 shadow-inner">
            <Lock className="w-6 h-6 text-emerald-400" />
          </div>

          <h3 className="text-xl font-black text-white">Logistics & Admin Portal</h3>
          <p className="text-xs text-slate-300 mt-1">
            Restricted access for Eco-Blisters collection drivers, logistics fleet & partner chemist staff
          </p>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-600" />
                Staff Username / Driver ID
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. admin or driver"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-emerald-600" />
                Secure Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password (default: admin123)"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Admin Fleet'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Button */}
          <div className="pt-2 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={handleQuickDemoLogin}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5 text-emerald-600" />
              <span>One-Click Demo Staff Login (admin / admin123)</span>
            </button>
            <p className="text-[10px] text-slate-400 mt-2">
              🔒 Citizens cannot view or access recovery operations without signing in.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
