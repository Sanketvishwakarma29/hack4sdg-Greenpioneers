import React, { useState, useEffect } from 'react';
import { 
  Factory, Calendar, TrendingUp, Download, Plus, Filter, 
  Search, CheckCircle2, ShieldCheck, Flame, Layers, Award,
  Sparkles, RefreshCw, BarChart3, Clock, User, ArrowUpRight,
  LogOut, AlertTriangle, FileSpreadsheet, Zap
} from 'lucide-react';
import { socket } from '../services/socket';

export default function RecoveryPartnerPortal({ onLogout, t }) {
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTimeframe, setActiveTimeframe] = useState('daily'); // 'daily' | 'monthly' | 'yearly'
  const [isNewBatchModalOpen, setIsNewBatchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [materialFilter, setMaterialFilter] = useState('ALL');

  // New batch form state
  const [batchDate, setBatchDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [facilityName, setFacilityName] = useState('EcoMetals Hydrometallurgical Refinery Hub (Peenya, Bengaluru)');
  const [operatorName, setOperatorName] = useState('Rajesh Varma (Lead Metallurgy Engineer)');
  const [materialType, setMaterialType] = useState('PVC / PVDC Transparent + Aluminum Foil');
  const [sourceHub, setSourceHub] = useState('Bengaluru City Logistics Aggregate');
  const [inflowKg, setInflowKg] = useState('150');
  const [aluKg, setAluKg] = useState('48');
  const [polymerKg, setPolymerKg] = useState('98');
  const [purityGrade, setPurityGrade] = useState('99.2% Secondary Aluminum Ingot Quality');
  const [batchNotes, setBatchNotes] = useState('Delamination and solvent foil recovery complete. Purity lab verified.');
  const [submittingBatch, setSubmittingBatch] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Fetch partner data
  const fetchData = async () => {
    try {
      const [recsRes, sumRes] = await Promise.all([
        fetch('/api/partner/records'),
        fetch('/api/partner/summary')
      ]);
      const recs = await recsRes.json();
      const sum = await sumRes.json();
      setRecords(recs);
      setSummary(sum);
    } catch (e) {
      console.error('Error fetching partner data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Auto-poll every 8 seconds so both partner and admin screens stay live without manual refresh
    const pollInterval = setInterval(fetchData, 8000);

    // Socket listener for instant updates
    const handleNewBatch = (newBatch) => {
      setRecords((prev) => [newBatch, ...prev]);
      fetchData();
    };

    socket.on('partner:new_batch', handleNewBatch);

    return () => {
      clearInterval(pollInterval);
      socket.off('partner:new_batch', handleNewBatch);
    };
  }, []);

  // Recalculate auto-estimates when inflow changes
  const handleInflowChange = (val) => {
    setInflowKg(val);
    const num = parseFloat(val) || 0;
    if (num > 0) {
      setAluKg((num * 0.32).toFixed(1));
      setPolymerKg((num * 0.65).toFixed(1));
    }
  };

  // Submit new batch
  const handleCreateBatch = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmittingBatch(true);

    try {
      const payload = {
        date: new Date(batchDate).toISOString(),
        facilityName,
        operatorName,
        materialType,
        sourceHub,
        inflowKg: parseFloat(inflowKg) || 0,
        recycledAluminumKg: parseFloat(aluKg) || 0,
        recycledPolymerKg: parseFloat(polymerKg) || 0,
        purityGrade,
        notes: batchNotes
      };

      const res = await fetch('/api/partner/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to submit recovery batch');
      }

      const data = await res.json();
      setRecords((prev) => [data.record, ...prev]);
      setIsNewBatchModalOpen(false);
      fetchData();
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmittingBatch(false);
    }
  };

  // Filtered records
  const filteredRecords = records.filter((r) => {
    const matchesSearch = 
      (r.batchId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.operatorName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.sourceHub || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMat = materialFilter === 'ALL' || r.materialType === materialFilter;
    return matchesSearch && matchesMat;
  });

  // Export partner CSV
  const exportPartnerCSV = () => {
    const headers = [
      'Batch ID', 'Date & Time', 'Material Category', 'Source Hub', 
      'Inflow Material (kg)', 'Aluminum Recovered (kg)', 'Polymer Recovered (kg)', 
      'Recovery Efficiency (%)', 'Purity Grade', 'Operator', 'Notes'
    ];
    const rows = filteredRecords.map(r => [
      `"${r.batchId}"`,
      `"${new Date(r.date).toLocaleString('en-IN')}"`,
      `"${r.materialType}"`,
      `"${r.sourceHub}"`,
      r.inflowKg,
      r.recycledAluminumKg,
      r.recycledPolymerKg,
      r.recoveryEfficiencyPercent,
      `"${r.purityGrade}"`,
      `"${r.operatorName}"`,
      `"${r.notes}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ecoblister-refinery-recovery-data-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculations for KPI totals
  const totalInflow = records.reduce((s, r) => s + (Number(r.inflowKg) || 0), 0);
  const totalAlu = records.reduce((s, r) => s + (Number(r.recycledAluminumKg) || 0), 0);
  const totalPolymer = records.reduce((s, r) => s + (Number(r.recycledPolymerKg) || 0), 0);
  const avgEfficiency = totalInflow > 0 ? (((totalAlu + totalPolymer) / totalInflow) * 100).toFixed(1) : 98.2;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-fade-in pb-16">
      
      {/* Top Partner Header */}
      <div className="bg-gradient-to-r from-teal-900 via-emerald-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-teal-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 bg-teal-500/20 text-teal-300 rounded-full text-[10px] font-black uppercase tracking-wider border border-teal-400/30 flex items-center gap-1.5">
                <Factory className="w-3.5 h-3.5 text-teal-400" />
                Refinery Facility Hub
              </span>
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-[10px] font-black uppercase tracking-wider border border-emerald-400/30">
                🟢 Live Refinery Sync
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Pharmaceutical Blister Smelting & Recovery Facility
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              EcoMetals Hydrometallurgical Refinery Hub • Peenya Industrial Area, Bengaluru. 
              Logged batches synchronize in real time to both this partner portal and the central Eco-Blisters administrative ledger.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsNewBatchModalOpen(true)}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-500/30 flex items-center gap-2 transition-all cursor-pointer transform active:scale-95"
            >
              <Plus className="w-4 h-4 text-slate-950" />
              <span>Log Material Recovery Batch</span>
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-slate-200 font-semibold text-xs rounded-xl border border-white/20 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Sign Out of Facility Portal"
            >
              <LogOut className="w-4 h-4 text-rose-400" />
              <span>Partner Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 High-Impact KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
            <span>Total Inflow Received</span>
            <Layers className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">
            {totalInflow.toFixed(1)} <span className="text-sm font-semibold text-slate-500">kg</span>
          </div>
          <span className="text-[11px] text-teal-700 font-medium">From Hospital & Pharmacy Drops</span>
        </div>

        <div className="p-4 sm:p-5 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
            <span>Aluminum Recovered</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-500">
            {totalAlu.toFixed(1)} <span className="text-sm font-semibold text-slate-500">kg</span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">99.2% Pure Secondary Foil Ingots</span>
        </div>

        <div className="p-4 sm:p-5 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
            <span>Polymer Flakes</span>
            <Sparkles className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600">
            {totalPolymer.toFixed(1)} <span className="text-sm font-semibold text-slate-500">kg</span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">Clean PVC / PVDC Granulate</span>
        </div>

        <div className="p-4 sm:p-5 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
            <span>Recovery Efficiency</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-600">
            {avgEfficiency}%
          </div>
          <span className="text-[11px] text-slate-500 font-medium">Hydrometallurgical Delamination</span>
        </div>
      </div>

      {/* ================================================================ */}
      {/* DAILY / MONTHLY / YEARLY ANALYTICS ENGINE                         */}
      {/* ================================================================ */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-200 space-y-6">
        
        {/* Timeframe Switcher Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-teal-600" />
              Recycling Performance Breakdown
            </h2>
            <p className="text-xs text-slate-500">
              Select time horizon to inspect daily batches, monthly throughput, or annual circular metrics.
            </p>
          </div>

          <div className="inline-flex p-1 bg-slate-100 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTimeframe('daily')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTimeframe === 'daily'
                  ? 'bg-white text-teal-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Daily Batches
            </button>
            <button
              type="button"
              onClick={() => setActiveTimeframe('monthly')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTimeframe === 'monthly'
                  ? 'bg-white text-teal-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monthly Progress
            </button>
            <button
              type="button"
              onClick={() => setActiveTimeframe('yearly')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTimeframe === 'yearly'
                  ? 'bg-white text-teal-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Yearly Annual (2026)
            </button>
          </div>
        </div>

        {/* View 1: DAILY VIEW */}
        {activeTimeframe === 'daily' && (
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-teal-50/60 rounded-2xl border border-teal-200">
                <span className="text-xs font-bold uppercase text-teal-900 block mb-1">Today's Inflow</span>
                <span className="text-2xl font-black text-teal-950">
                  {summary?.daily?.inflowKg || 0} kg
                </span>
                <span className="text-[11px] text-teal-700 block mt-1">
                  Across {summary?.daily?.batchesCount || 0} refinery runs today
                </span>
              </div>

              <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200">
                <span className="text-xs font-bold uppercase text-amber-900 block mb-1">Today's Recycled Aluminum</span>
                <span className="text-2xl font-black text-amber-950">
                  {summary?.daily?.aluminumKg || 0} kg
                </span>
                <span className="text-[11px] text-amber-800 block mt-1">Secondary Ingot Quality</span>
              </div>

              <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200">
                <span className="text-xs font-bold uppercase text-emerald-900 block mb-1">Today's Polymer Granulate</span>
                <span className="text-2xl font-black text-emerald-950">
                  {summary?.daily?.polymerKg || 0} kg
                </span>
                <span className="text-[11px] text-emerald-800 block mt-1">PVC Pellets Dispatched</span>
              </div>
            </div>

            {/* List of Today's Batches */}
            <div className="space-y-2 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Today's Delamination Runs</h3>
              {summary?.daily?.records && summary.daily.records.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {summary.daily.records.map((b) => (
                    <div key={b.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs text-slate-900">{b.batchId}</span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                          {b.recoveryEfficiencyPercent}% Efficiency
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 flex items-center justify-between">
                        <span>Inflow: <strong>{b.inflowKg} kg</strong></span>
                        <span>Alu: <strong className="text-amber-700">{b.recycledAluminumKg} kg</strong></span>
                        <span>Polymer: <strong className="text-emerald-700">{b.recycledPolymerKg} kg</strong></span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        Operator: {b.operatorName} • {b.sourceHub}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
                  No batches logged today yet. Click "Log Material Recovery Batch" above to enter today's run.
                </div>
              )}
            </div>
          </div>
        )}

        {/* View 2: MONTHLY VIEW */}
        {activeTimeframe === 'monthly' && (
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-xs text-slate-500 font-bold uppercase block mb-1">October 2026 Inflow</span>
                <span className="text-2xl font-black text-slate-900">{summary?.monthly?.inflowKg || 0} kg</span>
                <span className="text-[11px] text-slate-500 block mt-1">{summary?.monthly?.batchesCount || 0} batches processed</span>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-xs text-slate-500 font-bold uppercase block mb-1">October Aluminum Output</span>
                <span className="text-2xl font-black text-amber-500">{summary?.monthly?.aluminumKg || 0} kg</span>
                <span className="text-[11px] text-slate-500 block mt-1">Yield: ~32% of total inflow</span>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-xs text-slate-500 font-bold uppercase block mb-1">October Polymer Output</span>
                <span className="text-2xl font-black text-emerald-600">{summary?.monthly?.polymerKg || 0} kg</span>
                <span className="text-[11px] text-slate-500 block mt-1">Clean PVC granules recovered</span>
              </div>
            </div>

            {/* Visual Month Progress Bars */}
            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">Monthly Inflow Distribution (2026)</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {summary?.yearly?.monthlyBreakdown?.map((m) => (
                  <div key={m.month} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-1">
                    <span className="text-[11px] font-bold text-slate-600 block">{m.month}</span>
                    <span className="text-sm font-black text-slate-900 block">{m.inflowKg} kg</span>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-teal-600 h-full rounded-full" 
                        style={{ width: `${Math.min(100, (m.inflowKg / 700) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* View 3: YEARLY VIEW */}
        {activeTimeframe === 'yearly' && (
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-teal-900 text-white rounded-2xl">
                <span className="text-xs uppercase font-bold text-teal-200 block mb-1">2026 Cumulative Inflow</span>
                <span className="text-3xl font-black">{((summary?.yearly?.inflowKg || 0) / 1000).toFixed(2)} MT</span>
                <span className="text-[11px] text-teal-200 block mt-1">Metric Tonnes Processed</span>
              </div>
              <div className="p-4 bg-amber-500/10 border border-amber-300 text-amber-950 rounded-2xl">
                <span className="text-xs uppercase font-bold text-amber-800 block mb-1">Annual Aluminum Ingots</span>
                <span className="text-3xl font-black text-amber-600">{((summary?.yearly?.aluminumKg || 0) / 1000).toFixed(2)} MT</span>
                <span className="text-[11px] text-amber-800 block mt-1">Reclaimed metal</span>
              </div>
              <div className="p-4 bg-emerald-500/10 border border-emerald-300 text-emerald-950 rounded-2xl">
                <span className="text-xs uppercase font-bold text-emerald-800 block mb-1">Annual Clean Polymer</span>
                <span className="text-3xl font-black text-emerald-600">{((summary?.yearly?.polymerKg || 0) / 1000).toFixed(2)} MT</span>
                <span className="text-[11px] text-emerald-800 block mt-1">Diverted from incineration</span>
              </div>
              <div className="p-4 bg-slate-900 text-white rounded-2xl">
                <span className="text-xs uppercase font-bold text-slate-300 block mb-1">Carbon Offset</span>
                <span className="text-3xl font-black text-emerald-400">{summary?.yearly?.co2SavedKg || 0} kg</span>
                <span className="text-[11px] text-slate-400 block mt-1">CO₂e emissions avoided</span>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ================================================================ */}
      {/* HISTORICAL REFINERY BATCH LOG TABLE                             */}
      {/* ================================================================ */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-teal-600" />
              Smelting & Recovery Batch Ledger
            </h3>
            <p className="text-xs text-slate-500">
              Complete historical register of all blister waste processed at the Peenya refinery.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search batch or operator..."
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Material Filter */}
            <select
              value={materialFilter}
              onChange={(e) => setMaterialFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
            >
              <option value="ALL">All Materials</option>
              <option value="PVC / PVDC Transparent + Aluminum Foil">PVC / PVDC + Alu</option>
              <option value="Alu-Alu Blister Foil (Cold Form Opaque)">Alu-Alu Opaque</option>
              <option value="High-Barrier Aclar / Alu Pharmaceutical Strip">High-Barrier Aclar</option>
              <option value="Mixed Pharmaceutical Blister Packs">Mixed Blisters</option>
            </select>

            <button
              type="button"
              onClick={exportPartnerCSV}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-200 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Batch ID</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Material Category</th>
                <th className="py-3 px-3">Source Hub</th>
                <th className="py-3 px-3 text-right">Inflow (kg)</th>
                <th className="py-3 px-3 text-right">Alu Output</th>
                <th className="py-3 px-3 text-right">Polymer Output</th>
                <th className="py-3 px-3 text-center">Efficiency</th>
                <th className="py-3 px-3">Purity Grade</th>
                <th className="py-3 px-4">Operator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredRecords.length > 0 ? (
                filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-teal-800">{r.batchId}</td>
                    <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                      {new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </td>
                    <td className="py-3 px-3 text-slate-800 font-semibold">{r.materialType}</td>
                    <td className="py-3 px-3 text-slate-500 truncate max-w-[140px]">{r.sourceHub}</td>
                    <td className="py-3 px-3 text-right font-black text-slate-900">{r.inflowKg} kg</td>
                    <td className="py-3 px-3 text-right font-bold text-amber-600">{r.recycledAluminumKg} kg</td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-600">{r.recycledPolymerKg} kg</td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        {r.recoveryEfficiencyPercent}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[11px] text-slate-600 truncate max-w-[150px]">{r.purityGrade}</td>
                    <td className="py-3 px-4 text-slate-700 whitespace-nowrap">{r.operatorName}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    No batch records match your filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================================================================ */}
      {/* MODAL: LOG NEW MATERIAL RECOVERY BATCH                          */}
      {/* ================================================================ */}
      {isNewBatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden text-left max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-teal-800 to-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2.5">
                <Factory className="w-5 h-5 text-teal-300" />
                <div>
                  <h3 className="font-extrabold text-base leading-tight">Log Smelting & Recovery Batch</h3>
                  <p className="text-[11px] text-teal-200">Enters live data into both Partner & Admin Portals</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setIsNewBatchModalOpen(false)} 
                className="p-1 rounded-full hover:bg-white/20 text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateBatch} className="p-6 space-y-4 overflow-y-auto flex-1">
              {submitError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                  {submitError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Date & Time of Processing</label>
                  <input
                    type="datetime-local"
                    required
                    value={batchDate}
                    onChange={(e) => setBatchDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Material Category</label>
                  <select
                    value={materialType}
                    onChange={(e) => setMaterialType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                  >
                    <option value="PVC / PVDC Transparent + Aluminum Foil">PVC / PVDC Transparent + Aluminum Foil</option>
                    <option value="Alu-Alu Blister Foil (Cold Form Opaque)">Alu-Alu Blister Foil (Cold Form Opaque)</option>
                    <option value="High-Barrier Aclar / Alu Pharmaceutical Strip">High-Barrier Aclar / Alu Pharmaceutical Strip</option>
                    <option value="Mixed Pharmaceutical Blister Packs">Mixed Pharmaceutical Blister Packs</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Total Inflow Received (kg)</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={inflowKg}
                    onChange={(e) => handleInflowChange(e.target.value)}
                    className="w-full px-3 py-2 bg-white border-2 border-teal-500 rounded-xl text-sm font-black text-teal-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Aluminum Recovered (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={aluKg}
                    onChange={(e) => setAluKg(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-black text-amber-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Clean Polymer Flakes (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={polymerKg}
                    onChange={(e) => setPolymerKg(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-black text-emerald-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Source Collection Node</label>
                  <input
                    type="text"
                    required
                    value={sourceHub}
                    onChange={(e) => setSourceHub(e.target.value)}
                    placeholder="e.g. Victoria Hospital & City Fleet"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Operator / Metallurgist Name</label>
                  <input
                    type="text"
                    required
                    value={operatorName}
                    onChange={(e) => setOperatorName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Purity Grade Certified</label>
                  <input
                    type="text"
                    value={purityGrade}
                    onChange={(e) => setPurityGrade(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Batch Processing Notes / Observations</label>
                <textarea
                  rows={2}
                  value={batchNotes}
                  onChange={(e) => setBatchNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewBatchModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingBatch}
                  className="px-6 py-2.5 bg-teal-700 hover:bg-teal-600 text-white text-xs font-black rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  {submittingBatch ? 'Submitting Batch...' : 'Submit Batch to Central Ledger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
