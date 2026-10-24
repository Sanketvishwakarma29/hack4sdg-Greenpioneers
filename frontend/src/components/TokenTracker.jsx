import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import { 
  Check, Copy, Search, ArrowRight, MapPin, Calendar, 
  Sparkles, AlertCircle, Tag, Gift, Store, ShieldCheck, 
  Pill, User, Phone, Mail, Award, CheckCircle2, Share2, Printer
} from 'lucide-react';

export default function TokenTracker({ initialToken, onNewReport, t }) {
  const [tokenInput, setTokenInput] = useState(initialToken || '');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copiedPromo, setCopiedPromo] = useState(false);
  const [tokenQrUrl, setTokenQrUrl] = useState('');

  // Fetch report / voucher by token or promoCode
  const fetchReport = async (codeToFetch) => {
    if (!codeToFetch) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports/${encodeURIComponent(codeToFetch.trim())}`);
      if (!res.ok) {
        throw new Error('No medical discount voucher found for this code.');
      }
      const data = await res.json();
      setReport(data);

      // Generate counter QR Code for direct chemist redemption
      const directUrl = `${window.location.origin}/#track=${data.promoCode || data.token}`;
      QRCode.toDataURL(directUrl, { 
        width: 240, 
        margin: 2,
        color: {
          dark: '#064e3b',
          light: '#ffffff'
        }
      }).then(setTokenQrUrl);
    } catch (err) {
      setError(err.message);
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialToken) {
      fetchReport(initialToken);
      // Trigger festive celebratory confetti
      try {
        confetti({
          particleCount: 120,
          spread: 90,
          origin: { y: 0.55 },
          colors: ['#10b981', '#f59e0b', '#3b82f6', '#ec4899']
        });
      } catch (e) {}
    }
  }, [initialToken]);

  const handleCopyPromo = () => {
    const code = report?.promoCode || report?.token;
    if (code) {
      navigator.clipboard.writeText(code);
      setCopiedPromo(true);
      setTimeout(() => setCopiedPromo(false), 2500);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Search Header for previous vouchers */}
      <div className="bg-white/80 backdrop-blur-md rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
          <Search className="w-5 h-5 text-emerald-600" />
          Find or Retrieve Your Discount Voucher
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Enter your Promo Code or Voucher ID to view your discount voucher for medical store billing.
        </p>

        <form 
          onSubmit={(e) => { e.preventDefault(); fetchReport(tokenInput); }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
            placeholder="e.g. ECOBLISTER-20OFF-K9X2 or ECO-K9X-201"
            className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-mono text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase shadow-inner"
          />
          <button
            type="submit"
            disabled={loading || !tokenInput.trim()}
            className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            {loading ? 'Searching...' : 'Retrieve'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {error && (
          <div className="mt-3 flex items-center gap-2 text-xs text-red-600 bg-red-50 p-3 rounded-xl border border-red-200">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* EXCLUSIVE MEDICAL STORE DISCOUNT PROMO VOUCHER (NO TRACKING STEPS) */}
      {report && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Main Voucher Card */}
          <div className="relative rounded-[32px] p-6 sm:p-8 bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-800 text-white shadow-2xl overflow-hidden border-2 border-emerald-300/40">
            {/* Ambient shimmer & glowing blur circles */}
            <div className="absolute -top-12 -right-12 w-64 h-64 bg-amber-400/20 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-teal-400/20 rounded-full blur-3xl pointer-events-none"></div>

            {/* Top Badge: Verified Reward */}
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pb-6 border-b border-white/20">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white/20 backdrop-blur-md rounded-full text-white text-xs font-black uppercase tracking-wider shadow-xs">
                <Gift className="w-4 h-4 text-amber-300 animate-bounce" />
                OFFICIAL PHARMACY DISCOUNT VOUCHER
              </div>

              <div className="flex items-center gap-2 text-xs text-emerald-100 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-200" />
                <span>Verified by Ecoblister</span>
              </div>
            </div>

            {/* Center Body: Discount Tier & User Name */}
            <div className="relative z-10 pt-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              
              {/* Left Column: Big Discount + Promo Code */}
              <div className="md:col-span-8 space-y-4">
                <div>
                  <span className="text-xs font-bold text-amber-300 uppercase tracking-widest block mb-1">
                    Special Reward Tier
                  </span>
                  <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-none">
                    {report.discountPercentage || 20}% OFF
                    <span className="text-base sm:text-lg font-bold text-emerald-100 block sm:inline sm:ml-2">
                      on Next Medicine Bill
                    </span>
                  </h1>
                </div>

                {/* Recipient Details */}
                <div className="p-3 bg-black/25 backdrop-blur-md rounded-2xl border border-white/10 text-xs space-y-1">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-emerald-300" />
                    <span className="text-emerald-200">Issued To:</span>
                    <span className="font-bold text-white text-sm">{report.userName || 'Valued Recycler'}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-emerald-200/90 pt-0.5">
                    <span>Strips Deposited: <strong className="text-white">{report.stripCount}</strong></span>
                    <span>•</span>
                    <span>Location: <strong className="text-white">{report.binId}</strong></span>
                  </div>
                </div>

                {/* Big Promo Code Box */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-100 block">
                    YOUR PHARMACY PROMO CODE:
                  </span>
                  
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="px-5 py-3 bg-slate-950 text-amber-400 font-mono font-black text-xl sm:text-2xl rounded-2xl border-2 border-amber-400/50 shadow-2xl flex items-center gap-3 select-all tracking-wider">
                      <span>{report.promoCode || report.token}</span>
                      <button
                        type="button"
                        onClick={handleCopyPromo}
                        className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                        title="Copy Code"
                      >
                        {copiedPromo ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyPromo}
                      className="px-4 py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-2xl shadow-lg transition-transform active:scale-95 cursor-pointer flex items-center gap-1.5"
                    >
                      {copiedPromo ? <Check className="w-4 h-4 text-slate-950" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedPromo ? 'Copied!' : 'Copy Code'}</span>
                    </button>
                  </div>
                </div>

                <p className="text-xs text-emerald-100/90 leading-relaxed pt-1">
                  Show this code or present the QR code to the chemist at checkout to claim your <strong>{report.discountPercentage || 20}% discount</strong> on your medicine purchase!
                </p>
              </div>

              {/* Right Column: High-Res QR Code for Chemist Checkout */}
              <div className="md:col-span-4 flex flex-col items-center justify-center p-4 bg-white rounded-3xl shadow-2xl text-slate-900 border border-emerald-100 shrink-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 mb-2 flex items-center gap-1">
                  <Store className="w-3 h-3 text-emerald-600" />
                  Scan at Chemist Billing
                </span>

                <div className="p-2 bg-slate-50 rounded-2xl border border-slate-200">
                  {tokenQrUrl ? (
                    <img src={tokenQrUrl} alt="Promo Voucher QR" className="w-36 h-36 object-contain rounded-lg" />
                  ) : (
                    <div className="w-36 h-36 flex items-center justify-center text-xs text-slate-400">Loading QR...</div>
                  )}
                </div>

                <span className="text-[11px] font-mono font-bold text-slate-700 mt-2 truncate max-w-[150px]">
                  {report.promoCode || report.token}
                </span>
                <span className="text-[9px] text-slate-400 uppercase tracking-tighter">
                  Instant Discount Verified
                </span>
              </div>
            </div>

            {/* Bottom Section: Partner Pharmacy List & Terms */}
            <div className="relative z-10 mt-8 pt-5 border-t border-white/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-emerald-100">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-extrabold text-white flex items-center gap-1">
                  <Store className="w-4 h-4 text-amber-300" />
                  Accepted At:
                </span>
                <span className="bg-white/10 px-2 py-0.5 rounded-md">Apollo Pharmacy</span>
                <span className="bg-white/10 px-2 py-0.5 rounded-md">MedPlus</span>
                <span className="bg-white/10 px-2 py-0.5 rounded-md">Wellness Forever</span>
                <span className="bg-white/10 px-2 py-0.5 rounded-md">Hospital Chemists</span>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-emerald-200">
                <Calendar className="w-3.5 h-3.5" />
                <span>Valid for 30 Days from Deposit</span>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={onNewReport}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Pill className="w-4 h-4" />
              <span>Deposit More Blister Packs</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-3 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm rounded-2xl border border-slate-200 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save Voucher</span>
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
