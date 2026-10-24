import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import { 
  Check, Copy, Search, ArrowRight, MapPin, Calendar, 
  Sparkles, AlertCircle, Tag, Gift, Store, ShieldCheck, 
  Pill, User, Phone, Mail, Award, CheckCircle2, Share2, Printer,
  Lock, CheckCircle, Clock, AlertTriangle, Building2, RefreshCw, XCircle, Shield
} from 'lucide-react';
import { socket } from '../services/socket';

export default function TokenTracker({ initialToken, onNewReport, t }) {
  const [tokenInput, setTokenInput] = useState(initialToken || '');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copiedPromo, setCopiedPromo] = useState(false);
  const [tokenQrUrl, setTokenQrUrl] = useState('');

  // Redemption state
  const [redeemPhone, setRedeemPhone] = useState('');
  const [redeemStore, setRedeemStore] = useState('Apollo Pharmacy - Indiranagar 100ft Rd');
  const [redeeming, setRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState(null);
  const [redeemSuccess, setRedeemSuccess] = useState(null);

  // Fetch report / voucher by token or promoCode
  const fetchReport = async (codeToFetch, isBackgroundPoll = false) => {
    if (!codeToFetch) return;
    if (!isBackgroundPoll) {
      setLoading(true);
      setError(null);
      setRedeemError(null);
      setRedeemSuccess(null);
    }

    try {
      const res = await fetch(`/api/reports/${encodeURIComponent(codeToFetch.trim())}`);
      if (!res.ok) {
        throw new Error('No medical discount voucher found for this code.');
      }
      const data = await res.json();
      
      // Check if state changed from Pending to Verified during background polling
      setReport(prev => {
        const wasPending = prev && (prev.validationStatus === 'Pending' || (!prev.validationStatus && !prev.promoCodeIssued));
        const nowVerified = data && (data.validationStatus === 'Verified' || data.promoCodeIssued);
        if (wasPending && nowVerified) {
          try {
            confetti({
              particleCount: 140,
              spread: 90,
              origin: { y: 0.55 },
              colors: ['#10b981', '#bef264', '#3b82f6', '#f59e0b']
            });
          } catch (e) {}
        }
        return data;
      });

      // Pre-fill phone if customer provided during deposit
      if (data.userPhone && !data.isRedeemed) {
        setRedeemPhone(data.userPhone);
      }

      // Generate counter QR Code only if verified or active
      const isVerified = data.validationStatus === 'Verified' || data.promoCodeIssued || data.status === 'Verified & Promo Issued';
      if (isVerified) {
        const directUrl = `${window.location.origin}/#track=${data.promoCode || data.token}`;
        QRCode.toDataURL(directUrl, { 
          width: 240, 
          margin: 2,
          color: {
            dark: '#064e3b',
            light: '#ffffff'
          }
        }).then(setTokenQrUrl);
      } else {
        setTokenQrUrl('');
      }
    } catch (err) {
      if (!isBackgroundPoll) {
        setError(err.message);
        setReport(null);
      }
    } finally {
      if (!isBackgroundPoll) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (initialToken) {
      fetchReport(initialToken);
      try {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.55 },
          colors: ['#10b981', '#f59e0b', '#3b82f6', '#bef264']
        });
      } catch (e) {}
    }
  }, [initialToken]);

  // Real-time socket updates and periodic background polling while pending validation
  useEffect(() => {
    if (!report) return;

    const isPending = report.validationStatus === 'Pending' || (!report.validationStatus && !report.promoCodeIssued && report.status !== 'Verified & Promo Issued');
    
    // Auto-poll every 4s if pending chemist approval
    let pollInterval = null;
    if (isPending) {
      pollInterval = setInterval(() => {
        fetchReport(report.token || report.promoCode, true);
      }, 4000);
    }

    // Socket listener for instantaneous update
    const handleSocketUpdate = (updatedReport) => {
      if (!updatedReport) return;
      const currentToken = (report.token || '').toUpperCase();
      const match = (updatedReport.token && updatedReport.token.toUpperCase() === currentToken) ||
                    (updatedReport.id && updatedReport.id === report.id);
      if (match) {
        setReport(updatedReport);
        if (updatedReport.validationStatus === 'Verified' || updatedReport.promoCodeIssued) {
          try {
            confetti({
              particleCount: 150,
              spread: 100,
              origin: { y: 0.5 }
            });
          } catch (e) {}
        }
      }
    };

    socket.on('report:validated', handleSocketUpdate);
    socket.on('report:status_changed', handleSocketUpdate);

    return () => {
      if (pollInterval) clearInterval(pollInterval);
      socket.off('report:validated', handleSocketUpdate);
      socket.off('report:status_changed', handleSocketUpdate);
    };
  }, [report?.token, report?.validationStatus, report?.promoCodeIssued]);

  const handleCopyPromo = () => {
    const isVerified = report?.validationStatus === 'Verified' || report?.promoCodeIssued;
    if (!isVerified) return;

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

  // Redeem Promo Code handler (Mandatory Phone Number)
  const handleRedeem = async (e) => {
    e.preventDefault();
    setRedeemError(null);
    setRedeemSuccess(null);

    const clean = (redeemPhone || '').trim();
    const digitsOnly = clean.replace(/[^0-9]/g, '');
    if (!clean || digitsOnly.length < 10) {
      setRedeemError('Customer Phone Number (minimum 10 digits) is strictly mandatory to redeem this discount voucher.');
      return;
    }

    setRedeeming(true);
    try {
      const res = await fetch('/api/promocodes/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promoCode: report?.promoCode || report?.token,
          phone: clean,
          storeName: redeemStore
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to redeem voucher');
      }

      setReport(data.report);
      setRedeemSuccess(`Voucher successfully redeemed for ${clean} at ${redeemStore}!`);
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {}
    } catch (err) {
      setRedeemError(err.message);
    } finally {
      setRedeeming(false);
    }
  };

  // Determine validation status flags
  const isRejected = report?.validationStatus === 'Rejected' || report?.status === 'Rejected (Fake Proof)';
  const isVerified = report?.validationStatus === 'Verified' || report?.promoCodeIssued || report?.status === 'Verified & Promo Issued';
  const isPending = !isRejected && !isVerified;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Search Header for previous vouchers */}
      <div className="bg-white/90 backdrop-blur-md rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
          <Search className="w-5 h-5 text-emerald-600" />
          Track Deposit & Retrieve Pharmacy Discount Voucher
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Enter your Deposit Token or Promo Code to track chemist physical validation and access your discount voucher.
        </p>

        <form 
          onSubmit={(e) => { e.preventDefault(); fetchReport(tokenInput); }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
            placeholder="e.g. ECO-ABC-123 or ECOBLISTER-20OFF-K9X2"
            className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-mono text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase shadow-inner"
          />
          <button
            type="submit"
            disabled={loading || !tokenInput.trim()}
            className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            {loading ? 'Searching...' : 'Track'}
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

      {/* REPORT CONTENT */}
      {report && (
        <div className="space-y-6 animate-fade-in">
          
          {/* ============================================================== */}
          {/* VALIDATION STATUS ALERT BANNER                                 */}
          {/* ============================================================== */}
          
          {/* 1. PENDING PHARMACY VALIDATION BANNER */}
          {isPending && (
            <div className="p-5 sm:p-6 bg-gradient-to-r from-amber-500/10 via-amber-400/20 to-orange-500/10 border-2 border-amber-400/80 rounded-3xl shadow-lg space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black shadow-md animate-pulse">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-amber-950 flex items-center gap-2">
                      <span>Step 2 of 2: Awaiting Pharmacy Chemist Inspection</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-400/80 text-amber-950 text-[10px] font-black uppercase tracking-wider">
                        Queued for Validation
                      </span>
                    </h3>
                    <p className="text-xs text-amber-900/90 font-medium">
                      Phone verified via OTP. The chemist at <strong>{report.binId}</strong> is verifying that your deposited blister strips are authentic medicine packaging.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => fetchReport(report.token || report.promoCode)}
                  className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-amber-950 font-black text-xs rounded-xl shadow transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Check validation status"
                >
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Check Status (Auto 4s)</span>
                </button>
              </div>

              <div className="p-3 bg-white/80 rounded-2xl border border-amber-200 text-xs text-amber-950 flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Your <strong>{report.discountPercentage || 20}% OFF Promo Code</strong> is locked and will unlock immediately upon physical confirmation by the chemist.</span>
                </span>
                <a
                  href="#pharmacy"
                  className="text-xs font-bold text-emerald-800 underline hover:text-emerald-950 flex items-center gap-1 shrink-0"
                >
                  <Store className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Open Chemist Validator Portal to Approve</span>
                </a>
              </div>
            </div>
          )}

          {/* 2. REJECTED / FAKE BANNER */}
          {isRejected && (
            <div className="p-5 sm:p-6 bg-rose-50 border-2 border-rose-400 rounded-3xl shadow-lg space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-rose-600 text-white flex items-center justify-center font-black shadow-md">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-rose-950">
                    Deposit Flagged as Fake / Invalid by Chemist
                  </h3>
                  <p className="text-xs text-rose-800">
                    The in-store pharmacist at <strong>{report.binId}</strong> reviewed this drop and flagged it as non-compliant.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-white rounded-2xl border border-rose-200 text-xs text-rose-900">
                <strong>Rejection Reason:</strong> {report.rejectionReason || 'Physical blister strips in collection bin did not match submitted camera photo.'}
              </div>
              <p className="text-[11px] text-rose-700 font-medium">
                🔒 Promo code has been permanently blocked. If you believe this is an error, please consult the store manager at {report.binId}.
              </p>
            </div>
          )}

          {/* 3. VERIFIED BANNER */}
          {isVerified && (
            <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-lime-500/10 border-2 border-emerald-400 rounded-3xl shadow-md flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-md">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-emerald-950">
                    Physical Blister Strips Verified & Promo Code Issued!
                  </h3>
                  <p className="text-xs text-emerald-800">
                    Validated by <strong>{report.validatedBy || 'Store Chemist'}</strong> at {report.validatedStore || report.binId}. Ready to use at checkout.
                  </p>
                </div>
              </div>

              <span className="px-3 py-1 bg-emerald-600 text-white text-xs font-black rounded-full uppercase tracking-wider hidden sm:inline-block">
                ✓ Verified
              </span>
            </div>
          )}

          {/* ============================================================== */}
          {/* MAIN VOUCHER CARD                                              */}
          {/* ============================================================== */}
          <div className="relative rounded-[32px] p-6 sm:p-8 bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-800 text-white shadow-2xl overflow-hidden border-2 border-emerald-300/40">
            {/* Ambient shimmer & glowing blur circles */}
            <div className="absolute -top-12 -right-12 w-64 h-64 bg-amber-400/20 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-teal-400/20 rounded-full blur-3xl pointer-events-none"></div>

            {/* Top Badge: Verified Reward & Redemption Status */}
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pb-6 border-b border-white/20">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white/20 backdrop-blur-md rounded-full text-white text-xs font-black uppercase tracking-wider shadow-xs">
                <Gift className="w-4 h-4 text-amber-300 animate-bounce" />
                OFFICIAL PHARMACY DISCOUNT VOUCHER
              </div>

              <div className="flex items-center gap-2">
                {report.isRedeemed ? (
                  <span className="px-3 py-1 bg-amber-400 text-slate-950 rounded-full text-xs font-black uppercase tracking-wider shadow flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-slate-950" />
                    Claimed / Redeemed
                  </span>
                ) : isVerified ? (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-100 font-semibold bg-white/10 px-3 py-1 rounded-full">
                    <ShieldCheck className="w-4 h-4 text-emerald-200" />
                    <span>Active & Verified by Chemist</span>
                  </div>
                ) : isRejected ? (
                  <span className="px-3 py-1 bg-rose-500 text-white rounded-full text-xs font-black uppercase tracking-wider shadow">
                    Blocked (Flagged Fake)
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-amber-400 text-slate-950 rounded-full text-xs font-black uppercase tracking-wider shadow flex items-center gap-1.5 animate-pulse">
                    <Clock className="w-3.5 h-3.5" />
                    Awaiting Chemist Approval
                  </span>
                )}
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
                  <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-none">
                    {report.discountPercentage || 20}% OFF
                    <span className="text-base sm:text-lg font-bold text-emerald-100 block sm:inline sm:ml-2">
                      on Next Medicine Bill
                    </span>
                  </h1>
                </div>

                {/* Recipient Details */}
                <div className="p-3.5 bg-black/25 backdrop-blur-md rounded-2xl border border-white/10 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-emerald-300" />
                      <span className="text-emerald-200">Issued To:</span>
                      <span className="font-bold text-white text-sm">{report.userName || 'Valued Recycler'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {report.userPhone && (
                        <div className="text-[11px] text-emerald-200 flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          <span>{report.userPhone} (OTP Verified ✓)</span>
                        </div>
                      )}
                      {report.userEmail && (
                        <div className="text-[11px] text-emerald-200 flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          <span>{report.userEmail}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-emerald-200/90 pt-0.5">
                    <span>Strips Deposited: <strong className="text-white">{report.exactStrips || report.stripCount}</strong></span>
                    <span>•</span>
                    <span>Deposit Bin: <strong className="text-white">{report.binId}</strong></span>
                    <span>•</span>
                    <span>Deposit Token: <strong className="text-white font-mono">{report.token}</strong></span>
                  </div>
                </div>

                {/* Big Promo Code Box */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-100 block">
                    YOUR PHARMACY PROMO CODE:
                  </span>
                  
                  {isVerified ? (
                    /* UNLOCKED CODE */
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="px-5 py-3 bg-slate-950 text-amber-400 font-mono font-black text-xl sm:text-2xl rounded-2xl border-2 border-amber-400/50 shadow-2xl flex items-center gap-3 select-all tracking-wider animate-bounce-short">
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
                  ) : isRejected ? (
                    /* REJECTED / BLOCKED CODE */
                    <div className="px-5 py-3.5 bg-rose-950 text-rose-300 font-mono font-black text-base sm:text-lg rounded-2xl border-2 border-rose-500/60 shadow-inner flex items-center gap-2">
                      <XCircle className="w-5 h-5 text-rose-400" />
                      <span>PROMO CODE BLOCKED (SUBMISSION FLAGGED)</span>
                    </div>
                  ) : (
                    /* PENDING / LOCKED CODE */
                    <div className="space-y-2">
                      <div className="px-5 py-3.5 bg-slate-950/80 text-amber-300 font-mono font-black text-base sm:text-lg rounded-2xl border-2 border-dashed border-amber-400/60 shadow-inner flex items-center gap-3">
                        <Lock className="w-5 h-5 text-amber-400 animate-pulse" />
                        <span>🔒 PENDING PHARMACY VALIDATION</span>
                      </div>
                      <p className="text-xs text-amber-200">
                        ⚡ The chemist at {report.binId} will validate your physical blister strips. Your official discount code unlocks here instantly!
                      </p>
                    </div>
                  )}
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
                  {isVerified && tokenQrUrl ? (
                    <img src={tokenQrUrl} alt="Promo Voucher QR" className="w-36 h-36 object-contain rounded-lg" />
                  ) : isRejected ? (
                    <div className="w-36 h-36 flex flex-col items-center justify-center text-xs text-rose-500 p-2 text-center">
                      <XCircle className="w-8 h-8 text-rose-400 mb-1" />
                      <span className="font-bold">QR Disabled</span>
                    </div>
                  ) : (
                    <div className="w-36 h-36 flex flex-col items-center justify-center text-xs text-slate-500 p-2 text-center bg-amber-50/50 rounded-xl border border-amber-200/60">
                      <Lock className="w-8 h-8 text-amber-500 mb-1 animate-pulse" />
                      <span className="font-bold text-[11px] text-amber-900">QR Locked</span>
                      <span className="text-[9px] text-amber-700">Unlocks on Chemist Approval</span>
                    </div>
                  )}
                </div>

                <span className="text-[11px] font-mono font-bold text-slate-700 mt-2 truncate max-w-[160px]">
                  {isVerified ? (report.promoCode || report.token) : `TOKEN: ${report.token}`}
                </span>
                <span className="text-[9px] text-slate-400 uppercase tracking-tighter">
                  {isVerified ? 'Instant Discount Verified' : isRejected ? 'Verification Failed' : 'Pending Physical Verification'}
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

          {/* ================================================================ */}
          {/* CHEMIST VOUCHER REDEMPTION COUNTER (PHONE NUMBER MANDATORY)     */}
          {/* ================================================================ */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-lg border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Store className="w-5 h-5 text-emerald-600" />
                  Chemist Store Redemption Counter
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Customer phone number is strictly required to verify, record, and apply discount at billing.
                </p>
              </div>
              <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                isVerified 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}>
                {isVerified ? 'Billing Verification' : 'Locked Until Inspection'}
              </span>
            </div>

            {/* If Already Redeemed */}
            {report.isRedeemed ? (
              <div className="p-5 bg-gradient-to-r from-emerald-50 via-teal-50 to-slate-50 border-2 border-emerald-300 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-emerald-900 font-extrabold text-sm sm:text-base">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  <span>VOUCHER SUCCESSFULLY REDEEMED</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                  <div className="p-3 bg-white rounded-xl border border-emerald-100 shadow-xs">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Redeemed To Phone</span>
                    <strong className="text-slate-900 font-mono text-sm">{report.redeemedPhone || 'N/A'}</strong>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-emerald-100 shadow-xs">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Redemption Date & Time</span>
                    <strong className="text-slate-900 text-xs">
                      {report.redeemedAt ? new Date(report.redeemedAt).toLocaleString('en-IN') : 'Verified'}
                    </strong>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-emerald-100 shadow-xs">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Redeemed Store</span>
                    <strong className="text-slate-900 text-xs truncate block">{report.redeemedStore || 'Partner Pharmacy'}</strong>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 pt-1">
                  🔒 This voucher has been recorded in the central Eco-Blisters ledger and cannot be redeemed again.
                </p>
              </div>
            ) : !isVerified ? (
              /* If Still Pending Chemist Verification */
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Redemption form will activate as soon as the in-store chemist confirms your blister packaging submission.</span>
                </div>
                <button
                  type="button"
                  onClick={() => fetchReport(report.token || report.promoCode)}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 font-bold border border-slate-300 rounded-xl transition-all cursor-pointer shrink-0"
                >
                  Refresh Now
                </button>
              </div>
            ) : (
              /* If Active: Redemption Form */
              <form onSubmit={handleRedeem} className="space-y-4">
                {redeemError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700 animate-shake">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span className="font-semibold">{redeemError}</span>
                  </div>
                )}

                {redeemSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center gap-2 text-xs text-emerald-800">
                    <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span className="font-semibold">{redeemSuccess}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Phone Number: Mandatory */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      Customer Phone Number <span className="text-red-500 font-black">* (Required to Redeem)</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="tel"
                        required
                        value={redeemPhone}
                        onChange={(e) => setRedeemPhone(e.target.value)}
                        placeholder="e.g. +91 98765 43210"
                        className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                      />
                    </div>
                  </div>

                  {/* Store Name */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      Redeeming Pharmacy / Hospital Store
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <select
                        value={redeemStore}
                        onChange={(e) => setRedeemStore(e.target.value)}
                        className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                      >
                        <option value="Apollo Pharmacy - Indiranagar 100ft Rd">Apollo Pharmacy (100ft Rd, Indiranagar)</option>
                        <option value="MedPlus Pharmacy - Koramangala 5th Block">MedPlus Pharmacy (Koramangala 5th Block)</option>
                        <option value="Wellness Forever - Jayanagar 4th Block">Wellness Forever 24x7 (Jayanagar 4th Block)</option>
                        <option value="Victoria Hospital Chemist Hall">Victoria Hospital Chemist Hall</option>
                        <option value="Manipal Hospital Chemist Counter">Manipal Hospital Chemist Counter</option>
                        <option value="Other Partner Medical Store">Other Partner Medical Store</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="submit"
                    disabled={redeeming}
                    className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2 transform active:scale-95"
                  >
                    <CheckCircle className="w-4 h-4 text-amber-300" />
                    <span>{redeeming ? 'Verifying & Claiming...' : `Verify Phone & Redeem ${report.discountPercentage || 20}% OFF Voucher`}</span>
                  </button>

                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-emerald-600" />
                    Phone and redemption timestamp are permanently stored in admin audit records.
                  </span>
                </div>
              </form>
            )}
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
