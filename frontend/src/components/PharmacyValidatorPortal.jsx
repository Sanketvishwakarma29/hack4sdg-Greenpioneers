import React, { useState, useEffect } from 'react';
import { 
  Store, ShieldCheck, CheckCircle2, AlertTriangle, XCircle, Search, 
  Phone, Calendar, Pill, Award, Clock, Eye, RefreshCw, LogOut, Check,
  Filter, Building2, ExternalLink, Sparkles, AlertCircle
} from 'lucide-react';

export default function PharmacyValidatorPortal({ t, onLogout }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState('pending'); // 'pending', 'verified', 'rejected', 'all'
  const [selectedStore, setSelectedStore] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState({});
  const [selectedPhotoModal, setSelectedPhotoModal] = useState(null);
  const [rejectModalReport, setRejectModalReport] = useState(null);
  const [rejectReason, setRejectReason] = useState('Blister foils in bin did not match submitted camera photo');
  const [customRejectNote, setCustomRejectNote] = useState('');
  const [toastMessage, setToastMessage] = useState(null);

  // Pharmacy staff info from session
  const [pharmacistName, setPharmacistName] = useState(() => {
    return sessionStorage.getItem('ecoblister_pharmacist_name') || 'Pharmacist Rajesh (Lead Chemist)';
  });
  const [currentStoreName, setCurrentStoreName] = useState(() => {
    return sessionStorage.getItem('ecoblister_pharmacy_store') || 'Apollo Pharmacy - Indiranagar 100ft Rd';
  });

  const fetchDeposits = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/reports');
      if (res.ok) {
        const data = await res.json();
        setReports(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching pharmacy deposits:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeposits();
    // Auto-refresh every 8s for live deposits
    const interval = setInterval(fetchDeposits, 8000);
    return () => clearInterval(interval);
  }, []);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Handle Approve & Issue Promo Code
  const handleApproveDeposit = async (report) => {
    const token = report.token || report.id;
    setActionLoading(prev => ({ ...prev, [token]: 'approving' }));

    try {
      const res = await fetch('/api/pharmacy/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          action: 'approve',
          pharmacistName,
          storeName: currentStoreName
        })
      });

      if (!res.ok) {
        // Fallback to /api/reports/:token/status if serverless route missing
        const fallbackRes = await fetch(`/api/reports/${encodeURIComponent(token)}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'Verified & Promo Issued',
            note: `Validated by ${pharmacistName} at ${currentStoreName}. Promo Code issued to customer.`
          })
        });
        if (!fallbackRes.ok) throw new Error('Failed to validate deposit');
      }

      showToast(`✓ Deposit #${report.token} verified! ${report.discountPercentage || 20}% OFF Promo Code issued to customer.`);
      fetchDeposits();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(prev => ({ ...prev, [token]: null }));
    }
  };

  // Handle Reject (Fake / Duplicate strips)
  const handleConfirmReject = async () => {
    if (!rejectModalReport) return;
    const token = rejectModalReport.token || rejectModalReport.id;
    const finalReason = customRejectNote.trim() || rejectReason;

    setActionLoading(prev => ({ ...prev, [token]: 'rejecting' }));

    try {
      const res = await fetch('/api/pharmacy/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          action: 'reject',
          pharmacistName,
          storeName: currentStoreName,
          rejectionReason: finalReason
        })
      });

      if (!res.ok) {
        await fetch(`/api/reports/${encodeURIComponent(token)}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'Rejected (Fake Proof)',
            note: `Flagged as fake/invalid by ${pharmacistName}: ${finalReason}`
          })
        });
      }

      showToast(`✕ Deposit #${rejectModalReport.token} flagged as fake/invalid. Promo code blocked.`, 'error');
      setRejectModalReport(null);
      setCustomRejectNote('');
      fetchDeposits();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(prev => ({ ...prev, [token]: null }));
    }
  };

  // Filtering reports
  const filteredReports = reports.filter(r => {
    // Store filter
    if (selectedStore !== 'all') {
      const matchStore = (r.binId || '').toLowerCase().includes(selectedStore.toLowerCase());
      if (!matchStore) return false;
    }

    // Status tab filter
    const valStatus = r.validationStatus || (r.status === 'Verified & Promo Issued' ? 'Verified' : r.status === 'Rejected (Fake Proof)' ? 'Rejected' : 'Pending');
    if (filterTab === 'pending' && valStatus !== 'Pending') return false;
    if (filterTab === 'verified' && valStatus !== 'Verified') return false;
    if (filterTab === 'rejected' && valStatus !== 'Rejected') return false;

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const match = (r.token && r.token.toLowerCase().includes(q)) ||
                    (r.promoCode && r.promoCode.toLowerCase().includes(q)) ||
                    (r.userName && r.userName.toLowerCase().includes(q)) ||
                    (r.userPhone && r.userPhone.includes(q)) ||
                    (r.binId && r.binId.toLowerCase().includes(q));
      if (!match) return false;
    }

    return true;
  });

  // Calculate Metrics
  const pendingCount = reports.filter(r => (r.validationStatus || 'Pending') === 'Pending' && r.status !== 'Resolved').length;
  const verifiedCount = reports.filter(r => r.validationStatus === 'Verified' || r.status === 'Verified & Promo Issued' || r.status === 'Resolved').length;
  const rejectedCount = reports.filter(r => r.validationStatus === 'Rejected' || (r.status || '').includes('Rejected')).length;
  const totalVerifiedStrips = reports
    .filter(r => r.validationStatus === 'Verified' || r.status === 'Resolved')
    .reduce((acc, curr) => acc + (Number(curr.exactStrips) || 10), 0);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-16 animate-fade-in text-left">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-bold text-white transition-all transform animate-bounce ${
          toastMessage.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'
        }`}>
          {toastMessage.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Banner: Pharmacy Validator Header */}
      <div className="bg-[#062e1b] text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-emerald-800 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-[#bef264]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-900/80 border border-emerald-700/60 text-xs font-bold text-[#bef264]">
            <Store className="w-3.5 h-3.5" />
            <span>Official Chemist & Drop-box Validator Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Pharmacy Blister Verification & Voucher Issuing
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100/80 max-w-2xl leading-relaxed">
            Verify customer blister strip deposits physically deposited in your pharmacy collection box. Inspect the customer's camera proof and click <strong>"Validate & Issue Promo Code"</strong> to unlock their prescription discount.
          </p>
        </div>

        {/* Staff & Store Badge */}
        <div className="bg-emerald-950/90 border border-emerald-700/70 p-4 rounded-2xl space-y-2.5 relative z-10 md:min-w-[280px]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">Active Chemist Station</span>
            <button
              type="button"
              onClick={onLogout}
              className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-bold cursor-pointer transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
          
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-white block truncate">{pharmacistName}</span>
            <span className="text-[11px] text-[#bef264] font-semibold block truncate">📍 {currentStoreName}</span>
          </div>

          <button
            type="button"
            onClick={fetchDeposits}
            className="w-full py-1.5 px-3 bg-emerald-800/80 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Queue</span>
          </button>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Metric 1: Pending */}
        <div className="p-4 sm:p-5 bg-amber-50/80 rounded-2xl border-2 border-amber-300/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">Needs Inspection</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <span className="text-2xl sm:text-3xl font-black text-amber-950 block">{pendingCount}</span>
          <span className="text-[11px] text-amber-800 font-medium block">Awaiting physical check in bin</span>
        </div>

        {/* Metric 2: Verified */}
        <div className="p-4 sm:p-5 bg-emerald-50/80 rounded-2xl border-2 border-emerald-300/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Vouchers Issued</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-2xl sm:text-3xl font-black text-emerald-950 block">{verifiedCount}</span>
          <span className="text-[11px] text-emerald-800 font-medium block">Approved & promo code live</span>
        </div>

        {/* Metric 3: Total Strips */}
        <div className="p-4 sm:p-5 bg-teal-50/80 rounded-2xl border-2 border-teal-300/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-teal-900 uppercase tracking-wider">Verified Strips</span>
            <Pill className="w-4 h-4 text-teal-600" />
          </div>
          <span className="text-2xl sm:text-3xl font-black text-teal-950 block">{totalVerifiedStrips}</span>
          <span className="text-[11px] text-teal-800 font-medium block">Empty blisters in recovery bin</span>
        </div>

        {/* Metric 4: Rejected / Flagged */}
        <div className="p-4 sm:p-5 bg-rose-50/80 rounded-2xl border-2 border-rose-300/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-900 uppercase tracking-wider">Flagged / Fake</span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <span className="text-2xl sm:text-3xl font-black text-rose-950 block">{rejectedCount}</span>
          <span className="text-[11px] text-rose-800 font-medium block">Denied fake proof attempts</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setFilterTab('pending')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterTab === 'pending'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Needs Check ({pendingCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('verified')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterTab === 'verified'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Approved ({verifiedCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('rejected')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterTab === 'rejected'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Flagged Fake ({rejectedCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('all')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterTab === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              All Deposits ({reports.length})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative min-w-[260px]">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by phone, name, token, promo..."
              className="w-full h-10 pl-9 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#bef264]"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          </div>

        </div>

        {/* Store Selector Dropdown */}
        <div className="flex items-center gap-2 pt-1 border-t border-slate-100 text-xs">
          <span className="font-bold text-slate-500 flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5 text-emerald-600" />
            Filter Location:
          </span>
          <select
            value={selectedStore}
            onChange={e => setSelectedStore(e.target.value)}
            className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#bef264]"
          >
            <option value="all">All Pharmacy Drop-box Hubs ({reports.length})</option>
            <option value="Apollo">Apollo Pharmacy Stores</option>
            <option value="Victoria">Victoria Hospital OPD</option>
            <option value="Manipal">Manipal Hospital Hub</option>
            <option value="MedPlus">MedPlus Pharmacy</option>
          </select>
        </div>
      </div>

      {/* Main Inspection Queue Table / Cards */}
      <div className="space-y-4">
        {loading && reports.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-sm space-y-2">
            <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
            <span className="text-sm font-bold text-slate-700 block">Loading Pharmacy Verification Queue...</span>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-base font-black text-slate-800">No Deposits in this View</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              All blister deposits matching this filter have been addressed. Switch tabs or check back when a new citizen deposits empty strips!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredReports.map(report => {
              const valStatus = report.validationStatus || (report.status === 'Verified & Promo Issued' ? 'Verified' : report.status === 'Rejected (Fake Proof)' ? 'Rejected' : 'Pending');
              const isPending = valStatus === 'Pending';
              const isVerified = valStatus === 'Verified';
              const isRejected = valStatus === 'Rejected';
              const tokenKey = report.token || report.id;
              const isActing = actionLoading[tokenKey];

              return (
                <div 
                  key={report.id || report.token}
                  className={`bg-white rounded-3xl p-5 sm:p-6 shadow-md border-2 transition-all space-y-4 relative ${
                    isPending ? 'border-amber-300 hover:border-amber-400' :
                    isVerified ? 'border-emerald-300 bg-emerald-50/10' :
                    'border-rose-200 bg-rose-50/15'
                  }`}
                >
                  {/* Top Status & Timestamp Header */}
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black font-mono text-slate-900 tracking-tight">
                          #{report.token}
                        </span>
                        {isPending && (
                          <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 rounded-full text-[10px] font-black uppercase tracking-wider border border-amber-300 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-700 animate-pulse" />
                            Awaiting Inspection
                          </span>
                        )}
                        {isVerified && (
                          <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-black uppercase tracking-wider border border-emerald-300 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Verified & Promo Issued
                          </span>
                        )}
                        {isRejected && (
                          <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 rounded-full text-[10px] font-black uppercase tracking-wider border border-rose-200 flex items-center gap-1">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            Flagged Fake
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium block">
                        {new Date(report.date || Date.now()).toLocaleString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                    </div>

                    {/* Reward Discount Badge */}
                    <div className="px-3 py-1 bg-emerald-50 text-emerald-900 rounded-full border border-emerald-300 text-xs font-black shadow-2xs shrink-0 flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{report.discountPercentage || 20}% OFF</span>
                    </div>
                  </div>

                  {/* Customer & Strips Details */}
                  <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Citizen Recycler</span>
                      <span className="font-bold text-slate-900 block truncate">{report.userName || 'Valued Citizen'}</span>
                      {report.userPhone && (
                        <a 
                          href={`tel:${report.userPhone}`}
                          className="text-[11px] text-emerald-700 hover:underline font-bold flex items-center gap-1 mt-0.5"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{report.userPhone}</span>
                        </a>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Blister Strips Claimed</span>
                      <span className="font-black text-emerald-950 text-sm block">
                        {report.exactStrips || report.stripCount || '10 Strips'}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium block truncate">
                        {report.materialType || 'PVC + Aluminum Foil'}
                      </span>
                    </div>
                  </div>

                  {/* Drop-box Location */}
                  <div className="text-xs text-slate-600 flex items-start gap-1.5">
                    <Store className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="font-semibold text-slate-800 truncate">{report.binId}</span>
                  </div>

                  {/* Camera Photo Proof Thumbnail with Verification Watermark Indicator */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        Live Camera Verification Photo:
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedPhotoModal(report.photoUrl || report.photoBase64)}
                        className="text-[11px] text-emerald-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect Full Photo</span>
                      </button>
                    </div>

                    <div 
                      onClick={() => setSelectedPhotoModal(report.photoUrl || report.photoBase64)}
                      className="relative h-44 rounded-2xl overflow-hidden bg-slate-900 border border-slate-300 cursor-pointer group shadow-inner"
                    >
                      <img 
                        src={report.photoUrl || report.photoBase64 || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=60'} 
                        alt="Customer camera proof"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                      
                      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] text-white bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-lg">
                        <span className="font-mono truncate">Live Verification Watermark</span>
                        <span className="font-bold text-amber-300 flex items-center gap-0.5">
                          <span>🔍 Click to Zoom</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Active Promo Code Status Display */}
                  <div className="p-3 bg-slate-100 rounded-2xl border border-slate-200/90 text-xs space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Promo Code Status:
                    </span>
                    {isVerified ? (
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-black text-sm text-emerald-900 bg-emerald-100/90 px-2 py-0.5 rounded-md border border-emerald-300 select-all">
                          {report.promoCode || report.token}
                        </span>
                        <span className="text-[10px] text-emerald-700 font-bold">
                          ✓ Active for Chemist Billing
                        </span>
                      </div>
                    ) : isRejected ? (
                      <span className="font-bold text-rose-700 text-xs block">
                        🚫 Blocked (Fake / Invalid Proof Flagged by Chemist)
                      </span>
                    ) : (
                      <div className="flex items-center justify-between text-amber-800">
                        <span className="font-mono font-bold text-xs bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300">
                          🔒 Locked until Chemist Approval
                        </span>
                        <span className="text-[10px] font-bold text-amber-700">
                          Assigned: {report.promoCode || 'Pending'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Chemist Action Buttons (for Pending Deposits) */}
                  {isPending && (
                    <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
                      <button
                        type="button"
                        disabled={isActing}
                        onClick={() => handleApproveDeposit(report)}
                        className="w-full sm:flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 transition-all transform active:scale-95 cursor-pointer"
                      >
                        {isActing === 'approving' ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Issuing Voucher...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4 stroke-[3]" />
                            <span>Validate & Issue Promo Code</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        disabled={isActing}
                        onClick={() => setRejectModalReport(report)}
                        className="w-full sm:w-auto py-3 px-3.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-bold text-xs border border-rose-200 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        title="Flag as Fake / Non-Blister Waste"
                      >
                        <XCircle className="w-4 h-4 text-rose-600" />
                        <span>Flag Fake</span>
                      </button>
                    </div>
                  )}

                  {/* Stamp Info for Verified / Rejected */}
                  {report.verifiedBy && (
                    <div className="text-[10px] text-slate-500 font-medium pt-1 border-t border-slate-100 flex items-center justify-between">
                      <span>Validated by: <strong>{report.verifiedBy}</strong></span>
                      <span>{report.verifiedAt ? new Date(report.verifiedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectModalReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border-2 border-rose-300 text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-700">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <h3 className="font-black text-base text-slate-900">Flag as Fake / Invalid Blisters</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setRejectModalReport(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Flagging deposit <strong>#{rejectModalReport.token}</strong> will block the customer's promo code and log the fraud warning. Select a reason:
            </p>

            <div className="space-y-2 text-xs">
              {[
                'Blister foils in bin did not match submitted camera photo',
                'Non-medicinal waste or empty box deposited',
                'Duplicate / re-uploaded photo detected',
                'Zero strips found in collection bin'
              ].map(reason => (
                <label key={reason} className="flex items-center gap-2 p-2.5 bg-slate-50 hover:bg-rose-50/50 rounded-xl border border-slate-200 cursor-pointer">
                  <input
                    type="radio"
                    name="rejectReason"
                    checked={rejectReason === reason}
                    onChange={() => setRejectReason(reason)}
                    className="text-rose-600 focus:ring-rose-500"
                  />
                  <span className="font-semibold text-slate-800">{reason}</span>
                </label>
              ))}
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 block">Custom Note (Optional):</label>
              <input
                type="text"
                value={customRejectNote}
                onChange={e => setCustomRejectNote(e.target.value)}
                placeholder="e.g. Only 1 strip found instead of 25"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectModalReport(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md cursor-pointer"
              >
                Confirm & Block Promo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Zoom Modal */}
      {selectedPhotoModal && (
        <div 
          onClick={() => setSelectedPhotoModal(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="bg-slate-950 p-2 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col items-center overflow-hidden border border-emerald-500 shadow-2xl relative"
          >
            <button
              type="button"
              onClick={() => setSelectedPhotoModal(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-black/60 hover:bg-black text-white rounded-full transition-colors cursor-pointer"
            >
              <XCircle className="w-6 h-6" />
            </button>
            <img 
              src={selectedPhotoModal} 
              alt="Enlarged blister camera proof"
              className="w-full h-auto max-h-[82vh] object-contain rounded-2xl"
            />
          </div>
        </div>
      )}

    </div>
  );
}
