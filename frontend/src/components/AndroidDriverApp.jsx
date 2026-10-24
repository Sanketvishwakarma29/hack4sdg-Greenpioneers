import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { 
  Truck, AlertTriangle, CheckCircle2, Clock, MapPin, 
  Navigation, Radio, Bell, RefreshCw, Filter, ExternalLink,
  Shield, Check, ArrowUpRight, Camera, Smartphone, ChevronRight,
  BarChart3, PieChart, TrendingUp, DollarSign, Calculator,
  FileSpreadsheet, Download, Search, Tag, Building2, Leaf,
  Sparkles, CheckCircle, Info, Award, Factory, Eye, X, Phone, Lock
} from 'lucide-react';
import { socket, playNotificationSound } from '../services/socket';
import BrandLogo from './BrandLogo';

// Custom Map Icons
const createIcon = (color, label = '') => new L.DivIcon({
  className: 'custom-pin',
  html: `<div style="background-color: ${color}; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 11px;">${label || '💊'}</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -18]
});

const driverTruckIcon = new L.DivIcon({
  className: 'truck-pin',
  html: `<div style="background-color: #059669; width: 38px; height: 38px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 15px rgba(5,150,105,0.7); display: flex; align-items: center; justify-content: center; color: white; font-size: 18px;">🚚</div>`,
  iconSize: [38, 38],
  iconAnchor: [19, 19],
});

export default function AndroidDriverApp({ t }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('feed'); // 'feed', 'analytics', 'table', 'promocodes', 'impact', 'economics', 'partner', 'map'
  const [selectedReport, setSelectedReport] = useState(null);
  const [newAlert, setNewAlert] = useState(null);
  const [driverName, setDriverName] = useState('Kiran Gowda (Eco-Blisters Van #01)');
  const [driverLocation, setDriverLocation] = useState({ lat: 12.9716, lng: 77.5946 });
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [phoneFrameMode, setPhoneFrameMode] = useState(false);
  const [graphMode, setGraphMode] = useState('shops'); // 'shops' | 'areas'
  const [tableSearch, setTableSearch] = useState('');
  const [tableStatusFilter, setTableStatusFilter] = useState('ALL');
  const [promoSearch, setPromoSearch] = useState('');
  const [redeemedCodes, setRedeemedCodes] = useState({});

  // Recovery Partner Data (Shared across partner & admin portals)
  const [partnerRecords, setPartnerRecords] = useState([]);
  const [partnerSummary, setPartnerSummary] = useState(null);
  const [partnerTimeframe, setPartnerTimeframe] = useState('daily');

  // Lightbox & Admin Redeem Modal
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [adminRedeemModal, setAdminRedeemModal] = useState(null);
  const [adminRedeemPhone, setAdminRedeemPhone] = useState('');
  const [adminRedeemError, setAdminRedeemError] = useState(null);
  const [adminRedeeming, setAdminRedeeming] = useState(false);

  // Unit Economics Calculator Inputs
  const [stripsMonthly, setStripsMonthly] = useState(50000);
  const [avgStripWeight, setAvgStripWeight] = useState(1.6); // grams
  const [aluPricePerKg, setAluPricePerKg] = useState(220); // ₹ / kg
  const [polymerPricePerKg, setPolymerPricePerKg] = useState(45); // ₹ / kg
  const [affiliateFeePerVoucher, setAffiliateFeePerVoucher] = useState(15); // ₹ / voucher
  const [logisticsCostPerStrip, setLogisticsCostPerStrip] = useState(0.35); // ₹ / strip
  const [processingCostPerStrip, setProcessingCostPerStrip] = useState(0.25); // ₹ / strip

  // Load initial reports
  const fetchReports = async () => {
    try {
      const res = await fetch('/api/reports');
      const data = await res.json();
      setReports(data);
      if (data.length > 0 && !selectedReport) {
        setSelectedReport(data[0]);
      }
    } catch (e) {
      console.error('Error fetching reports:', e);
    } finally {
      setLoading(false);
    }
  };

  // Load partner data
  const fetchPartnerData = async () => {
    try {
      const [recRes, sumRes] = await Promise.all([
        fetch('/api/partner/records'),
        fetch('/api/partner/summary')
      ]);
      const recs = await recRes.json();
      const sum = await sumRes.json();
      setPartnerRecords(recs);
      setPartnerSummary(sum);
    } catch (e) {
      console.error('Error fetching partner data:', e);
    }
  };

  useEffect(() => {
    fetchReports();
    fetchPartnerData();

    // AUTO-POLL: Refreshes state automatically every 5 seconds so admin NEVER needs to manually refresh!
    const pollInterval = setInterval(() => {
      fetchReports();
      fetchPartnerData();
    }, 5000);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setDriverLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {}
      );
    }

    const handleNewReport = (newReport) => {
      setReports((prev) => [newReport, ...prev]);
      setNewAlert(newReport);
      playNotificationSound('alert');
      setTimeout(() => setNewAlert(null), 7000);
    };

    const handleStatusChanged = (update) => {
      setReports((prev) =>
        prev.map((r) =>
          r.token === update.token || r.id === update.id
            ? { ...r, ...update.report, status: update.status }
            : r
        )
      );
      if (selectedReport && (selectedReport.token === update.token || selectedReport.id === update.id)) {
        setSelectedReport((prev) => ({ ...prev, ...update.report, status: update.status }));
      }
    };

    const handlePromocodeRedeemed = (data) => {
      setReports((prev) =>
        prev.map((r) =>
          r.promoCode === data.promoCode || r.token === data.token
            ? { ...r, isRedeemed: true, redeemedPhone: data.phone, redeemedAt: data.redeemedAt, redeemedStore: data.storeName }
            : r
        )
      );
    };

    const handlePartnerBatch = (newBatch) => {
      setPartnerRecords((prev) => [newBatch, ...prev]);
      fetchPartnerData();
    };

    socket.on('report:new', handleNewReport);
    socket.on('report:status_changed', handleStatusChanged);
    socket.on('promocode:redeemed', handlePromocodeRedeemed);
    socket.on('partner:new_batch', handlePartnerBatch);

    return () => {
      clearInterval(pollInterval);
      socket.off('report:new', handleNewReport);
      socket.off('report:status_changed', handleStatusChanged);
      socket.off('promocode:redeemed', handlePromocodeRedeemed);
      socket.off('partner:new_batch', handlePartnerBatch);
    };
  }, []);

  // Update status with immediate optimistic UI update (No manual refresh needed)
  const updateStatus = async (token, newStatus) => {
    setReports((prev) =>
      prev.map((r) =>
        r.token === token || r.id === token
          ? { ...r, status: newStatus }
          : r
      )
    );
    if (selectedReport && (selectedReport.token === token || selectedReport.id === token)) {
      setSelectedReport((prev) => ({ ...prev, status: newStatus }));
    }

    try {
      const res = await fetch(`/api/reports/${encodeURIComponent(token)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          driverName: driverName,
          note: `Status updated to ${newStatus} by ${driverName}`,
          resolutionPhotoUrl: newStatus === 'Resolved' 
            ? 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=60' 
            : null
        })
      });
      const data = await res.json();
      playNotificationSound('success');
      if (data.report) {
        setSelectedReport(data.report);
        setReports((prev) =>
          prev.map((r) =>
            r.token === token || r.id === token ? { ...r, ...data.report } : r
          )
        );
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  // Distance helper
  const calcDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(1);
  };

  // Status Metrics
  const total = reports.length;
  const pendingCount = reports.filter((r) => r.status === 'Pending').length;
  const inProgressCount = reports.filter((r) => r.status === 'In Progress' || r.status === 'Assigned').length;
  const resolvedCount = reports.filter((r) => r.status === 'Resolved').length;

  // Derive Zone from address/bin
  const getZone = (item) => {
    const text = `${item.binId} ${item.address}`.toLowerCase();
    if (text.includes('indiranagar') || text.includes('hal') || text.includes('whitefield')) return 'East Bengaluru';
    if (text.includes('majestic') || text.includes('shivajinagar') || text.includes('market') || text.includes('bowring')) return 'Central Bengaluru';
    if (text.includes('koramangala') || text.includes('jayanagar') || text.includes('bannerghatta') || text.includes('fortis')) return 'South Bengaluru';
    return 'West / Metro Zone';
  };

  // Graph Data: Recovery aggregated by Shop
  const shopRecoveryData = useMemo(() => {
    const map = {};
    reports.forEach((r) => {
      const name = r.binId || 'Central Collection Hub';
      const exact = Number(r.exactStrips) || 12;
      if (!map[name]) {
        map[name] = { name, count: 0, strips: 0, aluGrams: 0, polymerGrams: 0 };
      }
      map[name].count += 1;
      map[name].strips += exact;
      map[name].aluGrams += Math.round(exact * 0.5); // ~0.5g pure aluminum per strip
      map[name].polymerGrams += Math.round(exact * 1.1); // ~1.1g polymer per strip
    });
    return Object.values(map).sort((a, b) => b.strips - a.strips);
  }, [reports]);

  // Graph Data: Recovery aggregated by Area/Zone
  const areaRecoveryData = useMemo(() => {
    const map = {};
    reports.forEach((r) => {
      const zone = getZone(r);
      const exact = Number(r.exactStrips) || 12;
      if (!map[zone]) {
        map[zone] = { zone, count: 0, strips: 0, aluGrams: 0, polymerGrams: 0 };
      }
      map[zone].count += 1;
      map[zone].strips += exact;
      map[zone].aluGrams += Math.round(exact * 0.5);
      map[zone].polymerGrams += Math.round(exact * 1.1);
    });
    return Object.values(map).sort((a, b) => b.strips - a.strips);
  }, [reports]);

  const maxShopStrips = Math.max(...shopRecoveryData.map(s => s.strips), 1);
  const maxAreaStrips = Math.max(...areaRecoveryData.map(a => a.strips), 1);

  // Promocode Analytics
  const promocodesList = useMemo(() => {
    return reports.map((r, idx) => ({
      id: r.id || `promo-${idx}`,
      token: r.token,
      promoCode: r.promoCode || `ECOBLISTER-${r.discountPercentage || 15}OFF-${r.token?.slice(-4) || '7A92'}`,
      userName: r.userName || 'Citizen Recycler',
      discount: r.discountPercentage || 15,
      shop: r.binId || 'Apollo Pharmacy Indiranagar',
      date: r.date || new Date().toISOString(),
      isRedeemed: !!r.isRedeemed || !!redeemedCodes[r.promoCode || r.token],
      redeemedPhone: r.redeemedPhone || null,
      redeemedAt: r.redeemedAt || null,
      redeemedStore: r.redeemedStore || null,
      strips: r.stripCount || '10 Strips',
      photoUrl: r.photoBase64 || r.photoUrl || null,
      isLivePhoto: !!r.isLivePhoto
    }));
  }, [reports, redeemedCodes]);

  const activePromosCount = promocodesList.filter(p => !p.isRedeemed).length;
  const redeemedPromosCount = promocodesList.filter(p => p.isRedeemed).length;
  const avgDiscount = promocodesList.length > 0 
    ? Math.round(promocodesList.reduce((acc, p) => acc + (p.discount || 15), 0) / promocodesList.length)
    : 17;

  // Admin action: Redeem voucher with mandatory phone number
  const handleAdminRedeemSubmit = async (e) => {
    e.preventDefault();
    if (!adminRedeemModal) return;
    setAdminRedeemError(null);

    const clean = (adminRedeemPhone || '').trim();
    const digits = clean.replace(/[^0-9]/g, '');
    if (!clean || digits.length < 10) {
      setAdminRedeemError('Customer Phone Number (minimum 10 digits) is strictly mandatory to claim discount.');
      return;
    }

    setAdminRedeeming(true);
    try {
      const res = await fetch('/api/promocodes/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promoCode: adminRedeemModal.promoCode,
          phone: clean,
          storeName: adminRedeemModal.shop || 'Central Pharmacy Fleet Desk'
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to redeem voucher');
      }
      playNotificationSound('success');
      setAdminRedeemModal(null);
      setAdminRedeemPhone('');
      fetchReports();
    } catch (err) {
      setAdminRedeemError(err.message);
    } finally {
      setAdminRedeeming(false);
    }
  };

  // Master Table Filtering
  const filteredTableData = useMemo(() => {
    return reports.filter((r) => {
      const matchesSearch = 
        (r.token && r.token.toLowerCase().includes(tableSearch.toLowerCase())) ||
        (r.binId && r.binId.toLowerCase().includes(tableSearch.toLowerCase())) ||
        (r.userName && r.userName.toLowerCase().includes(tableSearch.toLowerCase())) ||
        (r.materialType && r.materialType.toLowerCase().includes(tableSearch.toLowerCase())) ||
        (r.redeemedPhone && r.redeemedPhone.includes(tableSearch));
      
      const matchesStatus = tableStatusFilter === 'ALL' || r.status === tableStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [reports, tableSearch, tableStatusFilter]);

  // Export CSV Helper (Includes Photo type, Customer phone & Redemption Timestamp)
  const downloadCSV = () => {
    const headers = [
      'Batch Token', 'Citizen Name', 'Drop-off Shop', 'Zone', 'Packaging Material', 
      'Strips Count', 'Alu Recovered (g)', 'Polymer Recovered (g)', 'Issued Voucher', 
      'Voucher Status', 'Redemption Phone', 'Redemption Date', 'Redeeming Store',
      'Photo Status', 'Pipeline Status', 'Date'
    ];
    const rows = filteredTableData.map(r => {
      const exact = Number(r.exactStrips) || 12;
      const isRedeemed = !!r.isRedeemed || !!redeemedCodes[r.promoCode || r.token];
      return [
        `"${r.token}"`,
        `"${r.userName || 'Citizen'}"`,
        `"${r.binId}"`,
        `"${getZone(r)}"`,
        `"${r.materialType || 'PVC Blister'}"`,
        `"${r.stripCount || '10 Strips'}"`,
        (exact * 0.5).toFixed(1),
        (exact * 1.1).toFixed(1),
        `"${r.promoCode || 'ECOBLISTER-VOUCHER'}"`,
        `"${isRedeemed ? 'Redeemed' : 'Active'}"`,
        `"${r.redeemedPhone || (isRedeemed ? 'Verified' : 'Not Redeemed')}"`,
        `"${r.redeemedAt ? new Date(r.redeemedAt).toLocaleString('en-IN') : 'N/A'}"`,
        `"${r.redeemedStore || 'N/A'}"`,
        `"${r.isLivePhoto ? 'Live Camera Verified' : (r.photoUrl || r.photoBase64 ? 'Uploaded Photo' : 'No Photo')}"`,
        `"${r.status || 'Pending'}"`,
        `"${new Date(r.date).toLocaleDateString()}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ecoblister-recovery-master-data-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Unit Economics Calculations
  const totalWeightKg = (stripsMonthly * avgStripWeight) / 1000;
  const aluWeightKg = totalWeightKg * 0.32; // ~32% aluminum by weight
  const polymerWeightKg = totalWeightKg * 0.68; // ~68% polymers by weight

  const revenueAlu = Math.round(aluWeightKg * aluPricePerKg);
  const revenuePolymer = Math.round(polymerWeightKg * polymerPricePerKg);
  // Estimate ~70% of deposited strips generate a redeemed affiliate coupon
  const totalRedeemedVouchers = Math.round((stripsMonthly / 12) * 0.70);
  const revenueAffiliate = Math.round(totalRedeemedVouchers * affiliateFeePerVoucher);
  const totalMonthlyRevenue = revenueAlu + revenuePolymer + revenueAffiliate;

  const costLogistics = Math.round(stripsMonthly * logisticsCostPerStrip);
  const costProcessing = Math.round(stripsMonthly * processingCostPerStrip);
  const totalMonthlyCost = costLogistics + costProcessing;

  const netMonthlyProfit = totalMonthlyRevenue - totalMonthlyCost;
  const profitMarginPercent = totalMonthlyRevenue > 0 ? ((netMonthlyProfit / totalMonthlyRevenue) * 100).toFixed(1) : 0;
  const unitProfitPerStrip = (netMonthlyProfit / stripsMonthly).toFixed(2);
  const co2AvoidedKg = Math.round(aluWeightKg * 3.2);

  // Preset scenarios
  const applyScenario = (strips, name) => {
    setStripsMonthly(strips);
  };

  const filteredReports = reports.filter((r) => {
    if (filterCategory === 'ALL') return true;
    return r.status === filterCategory;
  });

  const content = (
    <div className="bg-slate-900 text-slate-100 min-h-screen pb-20 sm:pb-8 flex flex-col font-sans">
      {/* Real-time Notification Banner */}
      {newAlert && (
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white p-3 sm:px-6 shadow-xl flex items-center justify-between animate-bounce">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-full animate-pulse">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-xs sm:text-sm block">🚨 Real-time Blister Recovery Alert</span>
              <span className="text-[11px] text-white/90">
                {newAlert.stripCount} deposited at {newAlert.binId} by {newAlert.userName || 'Citizen'}
              </span>
            </div>
          </div>
          <button
            onClick={() => { setSelectedReport(newAlert); setNewAlert(null); setActiveTab('feed'); }}
            className="px-3 py-1 bg-white text-emerald-800 font-bold text-xs rounded-xl shadow hover:bg-slate-100 cursor-pointer"
          >
            View
          </button>
        </div>
      )}

      {/* Top Fleet Header */}
      <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <BrandLogo size="sm" theme="dark" />
          <span className="hidden sm:inline-block text-[10px] bg-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border border-emerald-500/30">
            Logistics & Intelligence Fleet
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Frame Toggle */}
          <button
            type="button"
            onClick={() => setPhoneFrameMode(!phoneFrameMode)}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 cursor-pointer"
            title="Toggle Android Device Frame Preview"
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
            <span>{phoneFrameMode ? 'Full Screen' : 'Device Frame'}</span>
          </button>

          <button
            type="button"
            onClick={fetchReports}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            title="Refresh Fleet Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 p-3 sm:p-6 max-w-7xl mx-auto w-full space-y-4">
        
        {/* KPI Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 bg-slate-800/80 border border-slate-700/60 rounded-2xl">
            <span className="text-[11px] text-slate-400 block font-medium">Total Deposits</span>
            <span className="text-xl font-black text-white">{total}</span>
          </div>
          <div className="p-3 bg-rose-950/40 border border-rose-800/50 rounded-2xl">
            <span className="text-[11px] text-rose-300 block font-medium">Pending Pickup</span>
            <span className="text-xl font-black text-rose-400">{pendingCount}</span>
          </div>
          <div className="p-3 bg-amber-950/40 border border-amber-800/50 rounded-2xl">
            <span className="text-[11px] text-amber-300 block font-medium">In Transit</span>
            <span className="text-xl font-black text-amber-400">{inProgressCount}</span>
          </div>
          <div className="p-3 bg-emerald-950/40 border border-emerald-800/50 rounded-2xl">
            <span className="text-[11px] text-emerald-300 block font-medium">Active Promocodes</span>
            <span className="text-xl font-black text-emerald-400">{activePromosCount}</span>
          </div>
        </div>

        {/* 6 Specialized Logistics & Business Suite Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-950 rounded-2xl border border-slate-800 overflow-x-auto">
          <button
            onClick={() => setActiveTab('feed')}
            className={`px-3 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'feed'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Recovery Fleet ({reports.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-3 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
            <span>Recovery Graphs</span>
          </button>

          <button
            onClick={() => setActiveTab('table')}
            className={`px-3 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'table'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-teal-400" />
            <span>Master Recovery Data</span>
          </button>

          <button
            onClick={() => setActiveTab('promocodes')}
            className={`px-3 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'promocodes'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Tag className="w-3.5 h-3.5 text-rose-400" />
            <span>Active Promocodes ({activePromosCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('impact')}
            className={`px-3 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'impact'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-blue-400" />
            <span>Shops Profit & City Impact</span>
          </button>

          <button
            onClick={() => setActiveTab('economics')}
            className={`px-3 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'economics'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calculator className="w-3.5 h-3.5 text-emerald-400" />
            <span>Unit Economics Calculator</span>
          </button>

          <button
            onClick={() => setActiveTab('partner')}
            className={`px-3 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'partner'
                ? 'bg-teal-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Factory className="w-3.5 h-3.5 text-teal-300" />
            <span>Partner & Refinery Data ({partnerRecords.length})</span>
          </button>
        </div>

        {/* ================= TAB 1: RECOVERY FLEET DISPATCH ================= */}
        {activeTab === 'feed' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left Queue List */}
            <div className="lg:col-span-5 space-y-2">
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-bold uppercase text-slate-400">Incoming Blister Batches</span>
                <div className="flex gap-1 text-[11px]">
                  {['ALL', 'Pending', 'In Progress', 'Resolved'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setFilterCategory(cat)}
                      className={`px-2 py-0.5 rounded-lg font-medium cursor-pointer ${
                        filterCategory === cat
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 max-h-[650px] overflow-y-auto pr-1">
                {filteredReports.map((item) => {
                  const isSelected = selectedReport?.token === item.token || selectedReport?.id === item.id;
                  const dist = calcDistance(driverLocation.lat, driverLocation.lng, item.latitude, item.longitude);
                  return (
                    <div
                      key={item.token || item.id}
                      onClick={() => setSelectedReport(item)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-slate-800 border-emerald-500 shadow-md ring-1 ring-emerald-500/50'
                          : 'bg-slate-950/70 border-slate-800 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-800 text-emerald-400">
                            {item.token}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.status === 'Resolved' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                            item.status === 'In Progress' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                            'bg-rose-950 text-rose-400 border border-rose-800'
                          }`}>
                            {item.status}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                          <Navigation className="w-3 h-3 text-emerald-400" />
                          {dist} km
                        </span>
                      </div>

                      <h4 className="font-bold text-xs text-white mt-1.5 line-clamp-1">{item.binId}</h4>
                      <p className="text-[11px] text-slate-400 line-clamp-1">📍 {item.address}</p>

                      <div className="flex items-center gap-2.5 mt-2 pt-2 border-t border-slate-800/80">
                        {(item.photoBase64 || item.photoUrl) && (
                          <img
                            src={item.photoBase64 || item.photoUrl}
                            alt="Blister proof"
                            className="w-10 h-10 rounded-lg object-cover border border-slate-700 shrink-0 bg-slate-900"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-emerald-300 font-semibold truncate">💊 {item.stripCount}</span>
                            <span className="text-slate-400 truncate">👤 {item.userName || 'Citizen'}</span>
                          </div>
                          {item.isLivePhoto ? (
                            <span className="text-[9px] text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                              ● Live Camera Verified
                            </span>
                          ) : (item.photoBase64 || item.photoUrl) ? (
                            <span className="text-[9px] text-slate-400 flex items-center gap-1 mt-0.5">
                              📷 Photo Attached
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Selected Report Detail */}
            <div className="lg:col-span-7">
              {selectedReport ? (
                <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div>
                      <span className="text-xs font-mono text-emerald-400 font-bold block">{selectedReport.token}</span>
                      <h3 className="text-base font-extrabold text-white">{selectedReport.binId}</h3>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      selectedReport.status === 'Resolved' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                      selectedReport.status === 'In Progress' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                      'bg-rose-950 text-rose-300 border border-rose-800'
                    }`}>
                      Pipeline: {selectedReport.status}
                    </span>
                  </div>

                  {/* Metadata Chips */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Citizen</span>
                      <span className="font-bold text-white truncate block">{selectedReport.userName || 'Citizen'}</span>
                    </div>
                    <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Material</span>
                      <span className="font-bold text-teal-300 truncate block">{selectedReport.materialType || 'PVC Blister'}</span>
                    </div>
                    <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Quantity</span>
                      <span className="font-bold text-emerald-400 block">{selectedReport.stripCount}</span>
                    </div>
                    <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Issued Voucher</span>
                      <span className="font-mono font-bold text-amber-300 block truncate">{selectedReport.promoCode || 'PROMO-CODE'}</span>
                    </div>
                  </div>

                  {/* Address & Navigation */}
                  <div className="p-3 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-2">
                    <p className="text-xs text-slate-300">📍 {selectedReport.address}</p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] font-mono text-slate-400">
                        GPS: {selectedReport.latitude?.toFixed(4)}, {selectedReport.longitude?.toFixed(4)}
                      </span>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${selectedReport.latitude},${selectedReport.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>Google Maps Turn-by-Turn</span>
                      </a>
                    </div>
                  </div>

                  {/* Customer Uploaded Blister Photo */}
                  <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase font-extrabold text-slate-300 flex items-center gap-1.5">
                        <Camera className="w-4 h-4 text-emerald-400" />
                        Customer Camera Blister Photo Proof
                      </span>
                      {selectedReport.isLivePhoto ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1 shadow-xs">
                          <Shield className="w-3 h-3 text-emerald-400" />
                          Live Camera Verified Shot
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                          {(selectedReport.photoBase64 || selectedReport.photoUrl) ? '📷 Camera Photo Attached' : 'No Photo Captured'}
                        </span>
                      )}
                    </div>

                    {(selectedReport.photoBase64 || selectedReport.photoUrl) ? (
                      <div 
                        onClick={() => setPreviewPhoto({
                          url: selectedReport.photoBase64 || selectedReport.photoUrl,
                          title: `Deposit Proof: ${selectedReport.token} (${selectedReport.binId})`,
                          subtitle: `Citizen: ${selectedReport.userName || 'Citizen'} • ${selectedReport.stripCount} deposited`,
                          isLive: selectedReport.isLivePhoto
                        })}
                        className="relative rounded-2xl overflow-hidden border border-slate-700 group cursor-pointer bg-black"
                        title="Click to view full photo"
                      >
                        <img
                          src={selectedReport.photoBase64 || selectedReport.photoUrl}
                          alt="Citizen Uploaded Waste"
                          className="w-full max-h-64 object-cover rounded-2xl transition-transform group-hover:scale-[1.02]"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-bold">
                          <Eye className="w-4 h-4" />
                          <span>Click to Enlarge Full Photo</span>
                        </div>
                        {selectedReport.photoTimestamp && (
                          <span className="absolute bottom-2 left-2 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-mono text-emerald-300 border border-white/10">
                            Capture Timestamp: {new Date(selectedReport.photoTimestamp).toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="p-6 bg-slate-950/60 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
                        Citizen did not upload a photo for this drop-off.
                      </div>
                    )}
                  </div>

                  {selectedReport.notes && (
                    <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Citizen Voice / Deposit Notes</span>
                      <p className="text-xs text-slate-200 italic">"{selectedReport.notes}"</p>
                    </div>
                  )}

                  {/* Pipeline Actions */}
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Update Fleet Recovery Status:</span>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => updateStatus(selectedReport.token, 'Assigned')}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          selectedReport.status === 'Assigned'
                            ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-400'
                            : 'bg-slate-800 hover:bg-slate-700 text-blue-300'
                        }`}
                      >
                        1. Assign Route
                      </button>
                      <button
                        type="button"
                        onClick={() => updateStatus(selectedReport.token, 'In Progress')}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          selectedReport.status === 'In Progress'
                            ? 'bg-amber-600 text-white shadow-lg ring-2 ring-amber-400'
                            : 'bg-slate-800 hover:bg-slate-700 text-amber-300'
                        }`}
                      >
                        2. Picked up from Bin
                      </button>
                      <button
                        type="button"
                        onClick={() => updateStatus(selectedReport.token, 'Resolved')}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          selectedReport.status === 'Resolved'
                            ? 'bg-emerald-600 text-white shadow-lg ring-2 ring-emerald-400'
                            : 'bg-slate-800 hover:bg-slate-700 text-emerald-300'
                        }`}
                      >
                        3. Foil Recovered
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center bg-slate-950 border border-slate-800 rounded-3xl text-slate-500 text-xs">
                  Select a blister batch from the queue to inspect details & actions
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 2: RECOVERY GRAPHS ================= */}
        {activeTab === 'analytics' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-emerald-400" />
                  Blister Recovery Distribution Graphs
                </h3>
                <p className="text-xs text-slate-400">
                  Real-time visualization of pharmaceutical blister waste collected across Bengaluru chemist shops & zones
                </p>
              </div>

              {/* Graph Toggle */}
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setGraphMode('shops')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    graphMode === 'shops'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  By Chemist / Hospital Shops
                </button>
                <button
                  type="button"
                  onClick={() => setGraphMode('areas')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    graphMode === 'areas'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  By Bengaluru Area / Zone
                </button>
              </div>
            </div>

            {/* Shop Graph View */}
            {graphMode === 'shops' && (
              <div className="bg-slate-950 p-5 rounded-3xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
                  <span className="font-bold text-white">Partner Chemist Hub</span>
                  <div className="flex items-center gap-6">
                    <span>Batch Volume</span>
                    <span className="hidden sm:inline">Aluminum Yield</span>
                    <span className="font-bold text-emerald-400">Total Strips Recovered</span>
                  </div>
                </div>

                <div className="space-y-3">
                  {shopRecoveryData.map((shop, i) => {
                    const pct = Math.round((shop.strips / maxShopStrips) * 100);
                    return (
                      <div key={shop.name} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-200 flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-slate-800 text-[10px] flex items-center justify-center text-emerald-400 font-mono font-bold">
                              #{i + 1}
                            </span>
                            {shop.name}
                          </span>
                          <div className="flex items-center gap-6 text-[11px]">
                            <span className="text-slate-400">{shop.count} batches</span>
                            <span className="text-teal-300 font-mono hidden sm:inline">~{shop.aluGrams}g pure Al</span>
                            <span className="font-bold font-mono text-emerald-400">{shop.strips} strips</span>
                          </div>
                        </div>

                        {/* Animated Bar Meter */}
                        <div className="h-3 w-full bg-slate-800/80 rounded-full overflow-hidden flex">
                          <div
                            style={{ width: `${pct}%` }}
                            className="h-full bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-400 rounded-full transition-all duration-700"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Area Graph View */}
            {graphMode === 'areas' && (
              <div className="bg-slate-950 p-5 rounded-3xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
                  <span className="font-bold text-white">Bengaluru Geographic Zone</span>
                  <div className="flex items-center gap-6">
                    <span>Active Hubs</span>
                    <span className="hidden sm:inline">Polymer Recovered</span>
                    <span className="font-bold text-emerald-400">Total Strips Recovered</span>
                  </div>
                </div>

                <div className="space-y-4">
                  {areaRecoveryData.map((area, i) => {
                    const pct = Math.round((area.strips / maxAreaStrips) * 100);
                    return (
                      <div key={area.zone} className="space-y-1.5 p-3 bg-slate-900/60 rounded-2xl border border-slate-800">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-white flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-emerald-400" />
                            {area.zone}
                          </span>
                          <div className="flex items-center gap-6 text-[11px]">
                            <span className="text-slate-400">{area.count} drop points</span>
                            <span className="text-amber-300 font-mono hidden sm:inline">~{area.polymerGrams}g polymers</span>
                            <span className="font-black font-mono text-emerald-400">{area.strips} strips</span>
                          </div>
                        </div>

                        <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden flex">
                          <div
                            style={{ width: `${pct}%` }}
                            className="h-full bg-gradient-to-r from-teal-500 via-emerald-500 to-amber-400 rounded-full transition-all duration-700"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: MASTER RECOVERY DATA TABLE ================= */}
        {activeTab === 'table' && (
          <div className="bg-slate-950 p-4 sm:p-5 rounded-3xl border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-teal-400" />
                  Master Blister Recovery Database
                </h3>
                <p className="text-xs text-slate-400">Comprehensive log of all blister deposits, materials yield, and issued vouchers</p>
              </div>

              {/* Actions & CSV Export */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={downloadCSV}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download CSV</span>
                </button>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search token, pharmacy shop, citizen, or material..."
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <select
                value={tableStatusFilter}
                onChange={(e) => setTableStatusFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 w-full sm:w-auto"
              >
                <option value="ALL">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>

            {/* Data Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-3">Photo</th>
                    <th className="py-3 px-3">Batch Token</th>
                    <th className="py-3 px-3">Citizen Name</th>
                    <th className="py-3 px-3">Drop-off Shop</th>
                    <th className="py-3 px-3">Material</th>
                    <th className="py-3 px-3">Quantity</th>
                    <th className="py-3 px-3">Yield (Alu / Poly)</th>
                    <th className="py-3 px-3">Issued Voucher</th>
                    <th className="py-3 px-3">Redemption Status</th>
                    <th className="py-3 px-3">Pipeline</th>
                    <th className="py-3 px-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredTableData.map((row) => {
                    const exact = Number(row.exactStrips) || 12;
                    const alu = (exact * 0.5).toFixed(1);
                    const poly = (exact * 1.1).toFixed(1);
                    const hasPhoto = !!(row.photoBase64 || row.photoUrl);
                    return (
                      <tr key={row.token || row.id} className="hover:bg-slate-900/50 transition-colors">
                        {/* Photo Thumbnail Column */}
                        <td className="py-2 px-3 whitespace-nowrap">
                          {hasPhoto ? (
                            <div 
                              onClick={() => setPreviewPhoto({
                                url: row.photoBase64 || row.photoUrl,
                                title: `${row.token} - ${row.userName || 'Citizen'}`,
                                subtitle: `${row.binId} • ${new Date(row.date).toLocaleString('en-IN')}`,
                                isLive: row.isLivePhoto
                              })}
                              className="relative w-10 h-10 rounded-xl overflow-hidden border border-slate-700 cursor-pointer group shadow-xs bg-black"
                              title="Click to view full photo"
                            >
                              <img
                                src={row.photoBase64 || row.photoUrl}
                                alt="Blister proof"
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                              />
                              {row.isLivePhoto ? (
                                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400 ring-1 ring-black" title="Live Camera Verified"></span>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-500 font-mono">No Photo</span>
                          )}
                        </td>

                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-400 whitespace-nowrap">{row.token}</td>
                        <td className="py-2.5 px-3 font-semibold text-white whitespace-nowrap">{row.userName || 'Citizen'}</td>
                        <td className="py-2.5 px-3 text-slate-300 max-w-xs truncate">{row.binId}</td>
                        <td className="py-2.5 px-3 text-teal-300 text-[11px] whitespace-nowrap">{row.materialType || 'PVC Blister'}</td>
                        <td className="py-2.5 px-3 font-bold text-white whitespace-nowrap">{row.stripCount}</td>
                        <td className="py-2.5 px-3 font-mono text-[11px] whitespace-nowrap text-slate-300">
                          {alu}g Al • {poly}g Poly
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-amber-300 whitespace-nowrap">
                          {row.promoCode || 'ECOBLISTER-VOUCHER'}
                        </td>

                        {/* Customer Phone & Redemption Status Column */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {row.isRedeemed ? (
                            <div className="space-y-0.5">
                              <span className="text-emerald-400 font-mono font-bold block text-[11px]">
                                ✓ {row.redeemedPhone || 'Redeemed'}
                              </span>
                              {row.redeemedAt && (
                                <span className="text-slate-400 text-[10px] block font-mono">
                                  {new Date(row.redeemedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-amber-400/90 font-semibold text-[11px]">● Unclaimed Voucher</span>
                          )}
                        </td>

                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            row.status === 'Resolved' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                            row.status === 'In Progress' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                            'bg-rose-950 text-rose-400 border border-rose-800'
                          }`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 text-[11px] whitespace-nowrap">
                          {new Date(row.date).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="text-[11px] text-slate-500 text-right">
              Showing {filteredTableData.length} recorded recovery transactions
            </div>
          </div>
        )}

        {/* ================= TAB 4: ACTIVE PROMOCODES ================= */}
        {activeTab === 'promocodes' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
                <span className="text-xs text-slate-400 block font-medium">Total Promocodes Issued</span>
                <span className="text-2xl font-black text-white">{promocodesList.length}</span>
              </div>
              <div className="p-4 bg-slate-950 rounded-2xl border border-emerald-800/40">
                <span className="text-xs text-emerald-400 block font-medium">Active (Ready for Chemist)</span>
                <span className="text-2xl font-black text-emerald-400">{activePromosCount}</span>
              </div>
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
                <span className="text-xs text-slate-400 block font-medium">Redeemed at Stores</span>
                <span className="text-2xl font-black text-amber-400">{redeemedPromosCount}</span>
              </div>
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
                <span className="text-xs text-slate-400 block font-medium">Average Discount Tier</span>
                <span className="text-2xl font-black text-teal-300">{avgDiscount}% OFF</span>
              </div>
            </div>

            <div className="bg-slate-950 p-5 rounded-3xl border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                    <Tag className="w-4 h-4 text-emerald-400" />
                    Active Pharmacy Promocode Registry
                  </h3>
                  <p className="text-xs text-slate-400">Verifiable discount promo vouchers generated upon verified blister deposits</p>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search promocode or citizen..."
                    value={promoSearch}
                    onChange={(e) => setPromoSearch(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-xl pl-8 pr-3 py-1.5 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {promocodesList
                  .filter(p => 
                    p.promoCode.toLowerCase().includes(promoSearch.toLowerCase()) || 
                    p.userName.toLowerCase().includes(promoSearch.toLowerCase())
                  )
                  .map((promo) => (
                    <div
                      key={promo.id}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        promo.isRedeemed 
                          ? 'bg-slate-900/40 border-slate-800 opacity-60' 
                          : 'bg-slate-900 border-emerald-500/40 shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-black bg-emerald-500/20 text-emerald-300">
                          {promo.discount}% DISCOUNT
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          promo.isRedeemed ? 'bg-slate-800 text-slate-400' : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        }`}>
                          {promo.isRedeemed ? 'Claimed' : '● Active'}
                        </span>
                      </div>

                      <div className="my-2.5 p-2 bg-slate-950 rounded-xl border border-slate-800 text-center">
                        <span className="font-mono font-black text-sm text-emerald-400 tracking-wider block">
                          {promo.promoCode}
                        </span>
                      </div>

                      <div className="text-[11px] space-y-1 text-slate-300">
                        <p className="flex justify-between">
                          <span className="text-slate-400">Citizen:</span>
                          <span className="font-semibold text-white">{promo.userName}</span>
                        </p>
                        <p className="flex justify-between">
                          <span className="text-slate-400">Deposit Hub:</span>
                          <span className="font-medium text-slate-300 truncate max-w-[150px]">{promo.shop}</span>
                        </p>
                        <p className="flex justify-between">
                          <span className="text-slate-400">Validity:</span>
                          <span className="text-teal-300">Valid 30 Days</span>
                        </p>
                      </div>

                      {promo.isRedeemed ? (
                        <div className="mt-3 p-2.5 bg-emerald-950/70 border border-emerald-800 rounded-xl space-y-1 text-[11px]">
                          <div className="flex justify-between items-center">
                            <span className="text-emerald-400 font-bold flex items-center gap-1">
                              <Phone className="w-3 h-3" /> Customer Phone:
                            </span>
                            <span className="font-mono font-black text-white">{promo.redeemedPhone || 'Recorded'}</span>
                          </div>
                          {promo.redeemedAt && (
                            <div className="flex justify-between text-[10px] text-emerald-300/80">
                              <span>Redeemed Date:</span>
                              <span>{new Date(promo.redeemedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setAdminRedeemModal(promo);
                            setAdminRedeemPhone('');
                            setAdminRedeemError(null);
                          }}
                          className="w-full mt-3 py-2 rounded-xl text-xs font-black transition-all bg-emerald-600 hover:bg-emerald-500 text-white shadow cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Mark Redeemed (Req. Phone)</span>
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 5: SHOPS PROFIT & CITY IMPACT ================= */}
        {activeTab === 'impact' && (
          <div className="space-y-4">
            
            {/* 1. Partner Shops Profitability */}
            <div className="bg-slate-950 p-5 rounded-3xl border border-slate-800 space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <span className="text-xs font-bold uppercase text-emerald-400 tracking-wider block">Commercial Partnership Model</span>
                <h3 className="text-lg font-black text-white">How Partner Medical Shops Profit from Eco-Blisters</h3>
                <p className="text-xs text-slate-400">Blister collection drop-boxes convert local citizen footfall into high-margin pharmacy retail sales</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800">
                  <span className="text-xs text-slate-400 block font-medium">Active Partner Stores</span>
                  <span className="text-2xl font-black text-white">8 Hubs</span>
                  <span className="text-[10px] text-emerald-400 mt-1 block">Bengaluru Network</span>
                </div>
                <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800">
                  <span className="text-xs text-slate-400 block font-medium">New Customer Footfall</span>
                  <span className="text-2xl font-black text-emerald-400">+24.8%</span>
                  <span className="text-[10px] text-slate-400 mt-1 block">Walk-in deposit visitors</span>
                </div>
                <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800">
                  <span className="text-xs text-slate-400 block font-medium">Avg Basket Additions</span>
                  <span className="text-2xl font-black text-amber-400">₹340 / visit</span>
                  <span className="text-[10px] text-slate-400 mt-1 block">Vitamins, skincare & OTC</span>
                </div>
                <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800">
                  <span className="text-xs text-slate-400 block font-medium">Store Retention Rate</span>
                  <span className="text-2xl font-black text-teal-300">100%</span>
                  <span className="text-[10px] text-slate-400 mt-1 block">Zero partner churn</span>
                </div>
              </div>

              {/* Chemist Profit Mechanism Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3.5 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                    Footfall to Prescription Conversion
                  </span>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Citizens visiting to drop empty foils stay to refill prescriptions and redeem their 10%–25% voucher on spot.
                  </p>
                </div>
                <div className="p-3.5 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                    FMCG & OTC Basket Upsell
                  </span>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Chemist stores earn full gross margin on supplementary products bought alongside the discounted items.
                  </p>
                </div>
                <div className="p-3.5 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-teal-400" />
                    Zero Capital Cost for Chemist
                  </span>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Eco-Blisters provides drop-boxes, real-time fleet collection, and marketing collateral 100% free of charge.
                  </p>
                </div>
              </div>
            </div>

            {/* 2. How We Collect - Standard Operating Procedure */}
            <div className="bg-slate-950 p-5 rounded-3xl border border-slate-800 space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <span className="text-xs font-bold uppercase text-teal-400 tracking-wider block">Standard Operating Procedure</span>
                <h3 className="text-lg font-black text-white">How We Collect & Recover Blister Waste</h3>
                <p className="text-xs text-slate-400">Step-by-step reverse logistics pipeline from patient drop-off to scientific recovery</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 font-black text-sm flex items-center justify-center">
                    01
                  </div>
                  <h4 className="text-xs font-bold text-white">In-Store Drop-Box Deposit</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Citizens drop empty medicine foils into dedicated tamper-evident Eco-Blister bins inside partner pharmacies.
                  </p>
                </div>

                <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 font-black text-sm flex items-center justify-center">
                    02
                  </div>
                  <h4 className="text-xs font-bold text-white">EV Fleet Sweeps</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Low-emission electric collection vans route through Bengaluru clusters on scheduled geo-optimized sweeps.
                  </p>
                </div>

                <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 font-black text-sm flex items-center justify-center">
                    03
                  </div>
                  <h4 className="text-xs font-bold text-white">QR Batch Verification</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Fleet officers scan the bin QR code, weigh batches, and update live collection timestamps on the Fleet app.
                  </p>
                </div>

                <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 font-black text-sm flex items-center justify-center">
                    04
                  </div>
                  <h4 className="text-xs font-bold text-white">Scientific Delamination</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    At our facility, foils undergo low-temperature delamination to separate 99.2% pure aluminum powder & polymer pellets.
                  </p>
                </div>
              </div>
            </div>

            {/* 3. How Much We Clean the City (Environmental Footprint) */}
            <div className="bg-slate-950 p-5 rounded-3xl border border-slate-800 space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <span className="text-xs font-bold uppercase text-emerald-400 tracking-wider block">Environmental Health & Cleanliness</span>
                <h3 className="text-lg font-black text-white">How Much We Clean Bengaluru City</h3>
                <p className="text-xs text-slate-400">Preventing toxic landfilling, drain clogs, and open incineration across the city</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-1.5">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <Leaf className="w-4 h-4 text-emerald-400" />
                    100% Landfill Diversion
                  </span>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Zero collected blister packaging enters municipal landfills (Mandur/Mittaganahalli), eliminating non-degradable composite foil waste.
                  </p>
                </div>

                <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-1.5">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <Shield className="w-4 h-4 text-teal-400" />
                    Drainage & Lake Protection
                  </span>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Prevents microplastics and non-degradable film from choking Bengaluru storm water drains (Rajakaluves) and water bodies like Bellandur lake.
                  </p>
                </div>

                <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-1.5">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Toxic Dioxin Prevention
                  </span>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Diverts PVC blister plastics from open street garbage burning, halting emissions of carcinogenic chlorinated dioxins.
                  </p>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ================= TAB 6: UNIT ECONOMICS CALCULATOR ================= */}
        {activeTab === 'economics' && (
          <div className="bg-slate-950 p-5 rounded-3xl border border-slate-800 space-y-5">
            <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-emerald-400" />
                  Blister Recovery Unit Economics Calculator
                </h3>
                <p className="text-xs text-slate-400">Interactive financial model simulating circular material recovery revenue, OPEX, and net margins</p>
              </div>

              {/* Scenario Presets */}
              <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => applyScenario(10000, 'Pilot')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                    stripsMonthly === 10000 ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🚀 Pilot (10k)
                </button>
                <button
                  type="button"
                  onClick={() => applyScenario(50000, 'City')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                    stripsMonthly === 50000 ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🏙️ City (50k)
                </button>
                <button
                  type="button"
                  onClick={() => applyScenario(200000, 'Scale')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                    stripsMonthly === 200000 ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🇮🇳 Scale (200k)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Sliders & Inputs Column */}
              <div className="lg:col-span-6 space-y-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Operational & Pricing Parameters</span>
                
                {/* Monthly Strips Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-300">Monthly Strips Collected:</span>
                    <span className="font-bold text-emerald-400 font-mono">{stripsMonthly.toLocaleString()} strips</span>
                  </div>
                  <input
                    type="range"
                    min="5000"
                    max="500000"
                    step="5000"
                    value={stripsMonthly}
                    onChange={(e) => setStripsMonthly(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>5,000</span>
                    <span>250,000</span>
                    <span>500,000</span>
                  </div>
                </div>

                {/* Aluminum Scrap Price */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-300">Aluminum Scrap Value:</span>
                    <span className="font-bold text-teal-300 font-mono">₹{aluPricePerKg} / kg</span>
                  </div>
                  <input
                    type="range"
                    min="150"
                    max="350"
                    step="5"
                    value={aluPricePerKg}
                    onChange={(e) => setAluPricePerKg(Number(e.target.value))}
                    className="w-full accent-teal-500 cursor-pointer"
                  />
                </div>

                {/* Polymer Scrap Price */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-300">Polymer Pellets Value:</span>
                    <span className="font-bold text-amber-300 font-mono">₹{polymerPricePerKg} / kg</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="80"
                    step="2"
                    value={polymerPricePerKg}
                    onChange={(e) => setPolymerPricePerKg(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                {/* Affiliate Fee per Voucher */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-300">Chemist / Brand Affiliate Fee:</span>
                    <span className="font-bold text-purple-300 font-mono">₹{affiliateFeePerVoucher} / voucher</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="30"
                    step="1"
                    value={affiliateFeePerVoucher}
                    onChange={(e) => setAffiliateFeePerVoucher(Number(e.target.value))}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                </div>

                {/* Costs */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 block">EV Logistics Cost/Strip</label>
                    <input
                      type="number"
                      step="0.05"
                      value={logisticsCostPerStrip}
                      onChange={(e) => setLogisticsCostPerStrip(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-2.5 py-1.5 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 block">Processing Cost/Strip</label>
                    <input
                      type="number"
                      step="0.05"
                      value={processingCostPerStrip}
                      onChange={(e) => setProcessingCostPerStrip(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-2.5 py-1.5 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Real-time Financial Breakdown Output */}
              <div className="lg:col-span-6 space-y-4">
                
                {/* Net Profit Card */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/80 via-slate-950 to-teal-950/80 border border-emerald-500/40 space-y-2">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">Estimated Monthly Net Profit</span>
                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl font-black text-white">
                      ₹{netMonthlyProfit.toLocaleString()}
                    </span>
                    <span className="text-sm font-bold text-emerald-400 bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                      {profitMarginPercent}% Margin
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Yields <strong className="text-white">₹{unitProfitPerStrip} net profit per strip</strong> collected & recovered.
                  </p>
                </div>

                {/* Financial Breakdown Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {/* Revenue Stream */}
                  <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800 space-y-1.5">
                    <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">Revenue Streams</span>
                    <div className="flex justify-between text-slate-300">
                      <span>Pure Aluminum ({Math.round(aluWeightKg)} kg):</span>
                      <span className="font-mono font-bold text-white">₹{revenueAlu.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Polymer Pellets ({Math.round(polymerWeightKg)} kg):</span>
                      <span className="font-mono font-bold text-white">₹{revenuePolymer.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Chemist Affiliate Vouchers:</span>
                      <span className="font-mono font-bold text-white">₹{revenueAffiliate.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-slate-800 font-bold text-emerald-400">
                      <span>Total Gross Revenue:</span>
                      <span className="font-mono">₹{totalMonthlyRevenue.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* OPEX */}
                  <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800 space-y-1.5">
                    <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider block">Monthly OPEX</span>
                    <div className="flex justify-between text-slate-300">
                      <span>EV Logistics & Sweeps:</span>
                      <span className="font-mono font-bold text-white">₹{costLogistics.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Delamination Processing:</span>
                      <span className="font-mono font-bold text-white">₹{costProcessing.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-slate-800 font-bold text-rose-400 mt-4">
                      <span>Total Operating Cost:</span>
                      <span className="font-mono">₹{totalMonthlyCost.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Environmental Bonus Output */}
                <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Leaf className="w-4 h-4 text-emerald-400" />
                    <span className="text-slate-300">City Landfill Diverted:</span>
                    <span className="font-bold text-white font-mono">{Math.round(totalWeightKg).toLocaleString()} kg/mo</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-teal-300">
                    <span>🌱 {co2AvoidedKg.toLocaleString()} kg CO₂e Offset</span>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 7: REFINERY & RECOVERY PARTNER DATA ================= */}
        {activeTab === 'partner' && (
          <div className="bg-slate-950 p-5 rounded-3xl border border-slate-800 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Factory className="w-5 h-5 text-teal-400" />
                  Smelting & Recovery Partner Refinery Feed
                </h3>
                <p className="text-xs text-slate-400">
                  Live data submitted by EcoMetals Hydrometallurgical Refinery Hub (Peenya, Bengaluru). Synchronized with Partner Portal.
                </p>
              </div>

              {/* Timeframe switch */}
              <div className="inline-flex p-1 bg-slate-900 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setPartnerTimeframe('daily')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    partnerTimeframe === 'daily' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Daily
                </button>
                <button
                  type="button"
                  onClick={() => setPartnerTimeframe('monthly')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    partnerTimeframe === 'monthly' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setPartnerTimeframe('yearly')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    partnerTimeframe === 'yearly' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Yearly
                </button>
              </div>
            </div>

            {/* Partner Summary Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 bg-slate-900 rounded-2xl border border-slate-800">
                <span className="text-[11px] text-slate-400 block">Total Material Inflow</span>
                <span className="text-xl font-black text-white font-mono">
                  {partnerSummary?.[partnerTimeframe]?.inflowKg || 0} kg
                </span>
                <span className="text-[10px] text-teal-400 font-semibold block mt-0.5">
                  {partnerSummary?.[partnerTimeframe]?.batchesCount || 0} Batches Processed
                </span>
              </div>

              <div className="p-3.5 bg-slate-900 rounded-2xl border border-slate-800">
                <span className="text-[11px] text-slate-400 block">Aluminum Recovered</span>
                <span className="text-xl font-black text-amber-500 font-mono">
                  {partnerSummary?.[partnerTimeframe]?.aluminumKg || 0} kg
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">99.2% Pure Ingot Flakes</span>
              </div>

              <div className="p-3.5 bg-slate-900 rounded-2xl border border-slate-800">
                <span className="text-[11px] text-slate-400 block">Polymer Granulate</span>
                <span className="text-xl font-black text-emerald-400 font-mono">
                  {partnerSummary?.[partnerTimeframe]?.polymerKg || 0} kg
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Clean PVC/PVDC Flakes</span>
              </div>

              <div className="p-3.5 bg-slate-900 rounded-2xl border border-slate-800">
                <span className="text-[11px] text-slate-400 block">Carbon Abatement</span>
                <span className="text-xl font-black text-blue-400 font-mono">
                  {Math.round((partnerSummary?.[partnerTimeframe]?.aluminumKg || 0) * 3.2)} kg
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">CO₂e emissions saved</span>
              </div>
            </div>

            {/* Partner Batches Table in Admin */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Batches Logged by Recovery Partner
                </h4>
                <button
                  type="button"
                  onClick={fetchPartnerData}
                  className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1 cursor-pointer font-semibold"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh Partner Feed</span>
                </button>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-800">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Batch ID</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Material Category</th>
                      <th className="py-2.5 px-3">Source Hub</th>
                      <th className="py-2.5 px-3 text-right">Inflow (kg)</th>
                      <th className="py-2.5 px-3 text-right">Alu Output</th>
                      <th className="py-2.5 px-3 text-right">Polymer Output</th>
                      <th className="py-2.5 px-3 text-center">Efficiency</th>
                      <th className="py-2.5 px-3">Operator</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {partnerRecords.length > 0 ? (
                      partnerRecords.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-900/50">
                          <td className="py-2.5 px-3 font-mono font-bold text-teal-400">{r.batchId}</td>
                          <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                            {new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </td>
                          <td className="py-2.5 px-3 text-white">{r.materialType}</td>
                          <td className="py-2.5 px-3 text-slate-400 truncate max-w-[140px]">{r.sourceHub}</td>
                          <td className="py-2.5 px-3 text-right font-black text-white">{r.inflowKg} kg</td>
                          <td className="py-2.5 px-3 text-right font-bold text-amber-500">{r.recycledAluminumKg} kg</td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-400">{r.recycledPolymerKg} kg</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 text-[10px] font-bold border border-emerald-800">
                              {r.recoveryEfficiencyPercent}%
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-300 whitespace-nowrap">{r.operatorName}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={9} className="py-6 text-center text-slate-500">
                          No refinery batch records available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* ================================================================ */}
      {/* LIGHTBOX MODAL: FULL-SCREEN CUSTOMER PHOTO PREVIEW               */}
      {/* ================================================================ */}
      {previewPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
          <div className="relative max-w-3xl w-full bg-slate-900 rounded-3xl border border-slate-700 overflow-hidden shadow-2xl space-y-3">
            <div className="p-4 bg-slate-950 flex items-center justify-between border-b border-slate-800">
              <div>
                <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <Camera className="w-4 h-4 text-emerald-400" />
                  {previewPhoto.title || 'Customer Deposit Photo Proof'}
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">{previewPhoto.subtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="p-1.5 rounded-full hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 flex flex-col items-center justify-center">
              <img
                src={previewPhoto.url}
                alt="Enlarged Blister Photo"
                className="max-h-[70vh] w-auto max-w-full rounded-2xl object-contain border border-slate-800 shadow-2xl"
              />
            </div>

            <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                {previewPhoto.isLive ? 'Live Camera Snapshot with Watermark' : 'Camera Snapshot Verification'}
              </span>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* ADMIN REDEEM MODAL: MANDATORY PHONE NUMBER VERIFICATION         */}
      {/* ================================================================ */}
      {adminRedeemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative max-w-md w-full bg-slate-900 rounded-3xl border border-slate-700 overflow-hidden shadow-2xl text-left">
            <div className="p-5 bg-gradient-to-r from-emerald-800 to-slate-950 text-white flex items-center justify-between">
              <div>
                <h4 className="text-base font-black">Chemist Redemption Verification</h4>
                <p className="text-xs text-emerald-200">Customer Phone Number is Strictly Mandatory</p>
              </div>
              <button
                type="button"
                onClick={() => setAdminRedeemModal(null)}
                className="p-1 rounded-full hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdminRedeemSubmit} className="p-5 space-y-4">
              {adminRedeemError && (
                <div className="p-3 bg-red-950/80 border border-red-800 rounded-xl text-xs text-red-300">
                  {adminRedeemError}
                </div>
              )}

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Voucher Code</span>
                <span className="text-base font-black font-mono text-emerald-400">{adminRedeemModal.promoCode}</span>
                <span className="text-xs text-slate-300 block">{adminRedeemModal.userName} • {adminRedeemModal.discount}% OFF</span>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  Customer Phone Number <span className="text-red-400">* (Mandatory)</span>
                </label>
                <input
                  type="tel"
                  required
                  value={adminRedeemPhone}
                  onChange={(e) => setAdminRedeemPhone(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm font-semibold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setAdminRedeemModal(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adminRedeeming}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl shadow cursor-pointer flex items-center gap-1.5"
                >
                  {adminRedeeming ? 'Validating...' : 'Confirm & Redeem Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full flex justify-center bg-slate-950 min-h-screen">
      {phoneFrameMode ? (
        <div className="w-full max-w-sm my-6 border-[8px] border-slate-800 rounded-[44px] overflow-hidden shadow-2xl bg-slate-900 relative">
          <div className="w-32 h-4 bg-slate-800 absolute top-0 left-1/2 -translate-x-1/2 rounded-b-xl z-50 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-slate-950 mr-2" />
            <div className="w-10 h-1 bg-slate-900 rounded-full" />
          </div>
          {content}
        </div>
      ) : (
        <div className="w-full">{content}</div>
      )}
    </div>
  );
}
