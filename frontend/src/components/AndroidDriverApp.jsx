import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import { 
  Truck, AlertTriangle, CheckCircle2, Clock, MapPin, 
  Navigation, Radio, Bell, RefreshCw, Filter, ExternalLink,
  Shield, Check, ArrowUpRight, Camera, Smartphone, ChevronRight
} from 'lucide-react';
import { socket, playNotificationSound } from '../services/socket';
import BrandLogo from './BrandLogo';

// Custom Map Icons
const createIcon = (color, label = '') => new L.DivIcon({
  className: 'custom-pin',
  html: `<div style="background-color: ${color}; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 11px;">${label || '🗑️'}</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -18]
});

const driverTruckIcon = new L.DivIcon({
  className: 'truck-pin',
  html: `<div style="background-color: #2563eb; width: 36px; height: 36px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 15px rgba(37,99,235,0.7); display: flex; align-items: center; justify-content: center; color: white; font-size: 16px;">🚚</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

export default function AndroidDriverApp({ t }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('feed'); // 'feed', 'map', 'my-jobs'
  const [selectedReport, setSelectedReport] = useState(null);
  const [newAlert, setNewAlert] = useState(null);
  const [driverName, setDriverName] = useState('Officer R. Sharma (Truck #07)');
  const [driverLocation, setDriverLocation] = useState({ lat: 19.0740, lng: 72.8750 });
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [phoneFrameMode, setPhoneFrameMode] = useState(false);

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

  useEffect(() => {
    fetchReports();

    // Get live driver location from browser GPS
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setDriverLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {}
      );
    }

    // Socket.io real-time listeners
    const handleNewReport = (newReport) => {
      setReports((prev) => [newReport, ...prev]);
      setNewAlert(newReport);
      playNotificationSound('alert');

      // Auto clear alert banner after 6s
      setTimeout(() => setNewAlert(null), 6000);
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

    socket.on('report:new', handleNewReport);
    socket.on('report:status_changed', handleStatusChanged);

    return () => {
      socket.off('report:new', handleNewReport);
      socket.off('report:status_changed', handleStatusChanged);
    };
  }, []);

  // Update status action
  const updateStatus = async (token, newStatus) => {
    try {
      const res = await fetch(`/api/reports/${encodeURIComponent(token)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          driverName: driverName,
          note: `Status updated to ${newStatus} by ${driverName}`,
          resolutionPhotoUrl: newStatus === 'Resolved' 
            ? 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=500&auto=format&fit=crop&q=60' 
            : null
        })
      });
      const data = await res.json();
      playNotificationSound('success');
      if (data.report) {
        setSelectedReport(data.report);
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

  // Stats calculation
  const total = reports.length;
  const pendingCount = reports.filter((r) => r.status === 'Pending').length;
  const inProgressCount = reports.filter((r) => r.status === 'In Progress' || r.status === 'Assigned').length;
  const resolvedCount = reports.filter((r) => r.status === 'Resolved').length;

  const filteredReports = reports.filter((r) => {
    if (activeTab === 'my-jobs') return r.assignedDriver?.includes('Sharma');
    if (filterCategory === 'ALL') return true;
    return r.status === filterCategory;
  });

  const content = (
    <div className="bg-slate-900 text-slate-100 min-h-screen pb-20 sm:pb-8 flex flex-col font-sans">
      {/* Real-time Notification Banner */}
      {newAlert && (
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white p-3 sm:px-6 shadow-xl flex items-center justify-between animate-bounce">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-full animate-pulse">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-xs sm:text-sm block">🚨 {t.realtimeNotification}</span>
              <span className="text-[11px] text-white/90">
                Bin #{newAlert.binId} ({newAlert.fillLevel}) at {newAlert.address}
              </span>
            </div>
          </div>
          <button
            onClick={() => { setSelectedReport(newAlert); setNewAlert(null); setActiveTab('feed'); }}
            className="px-3 py-1 bg-white text-red-700 font-bold text-xs rounded-xl shadow hover:bg-slate-100"
          >
            View
          </button>
        </div>
      )}

      {/* Android Top App Bar */}
      <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <BrandLogo size="sm" theme="dark" />
          <span className="hidden sm:inline-block text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
            Fleet
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Desktop Frame Toggle */}
          <button
            type="button"
            onClick={() => setPhoneFrameMode(!phoneFrameMode)}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700"
            title="Toggle Android Device Frame Preview"
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
            <span>{phoneFrameMode ? 'Full Screen' : 'Android Frame'}</span>
          </button>

          <button
            type="button"
            onClick={fetchReports}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 p-3 sm:p-6 max-w-6xl mx-auto w-full space-y-4">
        {/* Status Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 bg-slate-800/80 border border-slate-700/60 rounded-2xl">
            <span className="text-[11px] text-slate-400 block">{t.totalReports}</span>
            <span className="text-xl font-black text-white">{total}</span>
          </div>
          <div className="p-3 bg-rose-950/40 border border-rose-800/50 rounded-2xl">
            <span className="text-[11px] text-rose-300 block">{t.pendingAlert}</span>
            <span className="text-xl font-black text-rose-400">{pendingCount}</span>
          </div>
          <div className="p-3 bg-amber-950/40 border border-amber-800/50 rounded-2xl">
            <span className="text-[11px] text-amber-300 block">{t.activeJobs}</span>
            <span className="text-xl font-black text-amber-400">{inProgressCount}</span>
          </div>
          <div className="p-3 bg-emerald-950/40 border border-emerald-800/50 rounded-2xl">
            <span className="text-[11px] text-emerald-300 block">{t.cleanedToday}</span>
            <span className="text-xl font-black text-emerald-400">{resolvedCount}</span>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-2 p-1 bg-slate-950 rounded-2xl border border-slate-800">
          <button
            onClick={() => setActiveTab('feed')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'feed'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            📋 {t.viewListTab} ({reports.length})
          </button>
          <button
            onClick={() => setActiveTab('map')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'map'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🗺️ {t.viewMapTab}
          </button>
          <button
            onClick={() => setActiveTab('my-jobs')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'my-jobs'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🚛 My Truck Queue
          </button>
        </div>

        {/* Tab 1: Live GPS Map */}
        {activeTab === 'map' && (
          <div className="h-[480px] rounded-3xl overflow-hidden border border-slate-800 shadow-xl relative">
            <MapContainer
              center={[driverLocation.lat, driverLocation.lng]}
              zoom={14}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Driver Location Marker */}
              <Marker position={[driverLocation.lat, driverLocation.lng]} icon={driverTruckIcon}>
                <Popup>
                  <div className="text-xs font-bold text-slate-800">
                    🚚 {driverName} (Your Current Location)
                  </div>
                </Popup>
              </Marker>
              <Circle
                center={[driverLocation.lat, driverLocation.lng]}
                radius={300}
                pathOptions={{ color: '#2563eb', fillColor: '#3b82f6', fillOpacity: 0.15 }}
              />

              {/* Bin Markers */}
              {reports.map((r) => {
                const color =
                  r.status === 'Resolved' ? '#10b981' : r.status === 'In Progress' ? '#f59e0b' : '#ef4444';

                return (
                  <Marker
                    key={r.id}
                    position={[r.latitude, r.longitude]}
                    icon={createIcon(color, r.status === 'Resolved' ? '✓' : '🗑')}
                    eventHandlers={{ click: () => setSelectedReport(r) }}
                  >
                    <Popup>
                      <div className="text-xs space-y-1 text-slate-900">
                        <span className="font-bold block text-sm">{r.binId}</span>
                        <span className="block text-slate-600">{r.address}</span>
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold text-white" style={{ backgroundColor: color }}>
                          {r.status}
                        </span>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>

            {/* Radar status pill */}
            <div className="absolute top-3 left-3 z-[400] bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700 flex items-center gap-2 text-xs font-semibold text-emerald-400 shadow">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
              {t.driverStatusActive}
            </div>
          </div>
        )}

        {/* Tab 2: Feed & Queue (Split View on Large screens) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Reports List Column */}
          <div className="lg:col-span-6 space-y-3">
            {/* Filter Pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
              {['ALL', 'Pending', 'In Progress', 'Resolved'].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterCategory(st)}
                  className={`px-3 py-1 rounded-xl font-medium shrink-0 transition-all ${
                    filterCategory === st
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Report cards */}
            <div className="space-y-2.5 max-h-[550px] overflow-y-auto pr-1">
              {filteredReports.map((r) => {
                const isSelected = selectedReport?.id === r.id;
                const distance = calcDistance(
                  driverLocation.lat,
                  driverLocation.lng,
                  r.latitude,
                  r.longitude
                );

                return (
                  <div
                    key={r.id}
                    onClick={() => setSelectedReport(r)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex gap-3 ${
                      isSelected
                        ? 'bg-slate-800/95 border-emerald-500 shadow-lg ring-1 ring-emerald-500/50'
                        : 'bg-slate-850/60 border-slate-800 hover:bg-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-900 shrink-0 border border-slate-700">
                      <img src={r.photoUrl} alt="Bin" className="w-full h-full object-cover" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-extrabold text-sm text-white truncate">{r.binId}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                            r.status === 'Resolved'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : r.status === 'In Progress'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {r.status}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 truncate mb-1">{r.address}</p>

                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span className="text-emerald-400 font-mono">📍 {distance} km {t.distanceAway}</span>
                        <span>{new Date(r.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredReports.length === 0 && (
                <div className="p-8 text-center bg-slate-800/40 rounded-2xl border border-slate-800 text-slate-500 text-xs">
                  No bin reports match this category.
                </div>
              )}
            </div>
          </div>

          {/* Report Detail & Action Panel */}
          <div className="lg:col-span-6">
            {selectedReport ? (
              <div className="p-5 bg-slate-800/90 rounded-3xl border border-slate-700/80 shadow-2xl space-y-4 sticky top-16">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 font-mono">TOKEN: {selectedReport.token}</span>
                    <h2 className="text-xl font-black text-white flex items-center gap-2">
                      {selectedReport.binId}
                      <span className="text-xs font-normal text-slate-400">({selectedReport.category})</span>
                    </h2>
                  </div>

                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${selectedReport.latitude},${selectedReport.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow flex items-center gap-1.5 transition-colors"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Navigate</span>
                  </a>
                </div>

                {/* Evidence Image */}
                <div className="h-48 rounded-2xl overflow-hidden border border-slate-700 bg-black">
                  <img src={selectedReport.photoUrl} alt="Bin" className="w-full h-full object-cover" />
                </div>

                {/* Location & Info */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{selectedReport.address}</span>
                  </div>

                  {selectedReport.notes && (
                    <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-700 text-slate-300 italic">
                      "{selectedReport.notes}"
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 bg-slate-900/60 rounded-xl border border-slate-700">
                      <span className="text-slate-400 block font-semibold">Strips Count</span>
                      <span className="font-bold text-emerald-400">{selectedReport.stripCount || selectedReport.fillLevel}</span>
                    </div>
                    <div className="p-2 bg-slate-900/60 rounded-xl border border-slate-700">
                      <span className="text-slate-400 block font-semibold">Material</span>
                      <span className="font-bold text-slate-200 truncate block">{selectedReport.materialType || selectedReport.category}</span>
                    </div>
                  </div>
                </div>

                {/* Driver Actions - Real-time Status Changers */}
                <div className="pt-2 border-t border-slate-700 space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Update Field Status (Live Sync)
                  </span>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      disabled={selectedReport.status === 'Assigned'}
                      onClick={() => updateStatus(selectedReport.token, 'Assigned')}
                      className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all ${
                        selectedReport.status === 'Assigned'
                          ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50'
                          : 'bg-slate-700 hover:bg-slate-600 text-white'
                      }`}
                    >
                      {t.actionAssign}
                    </button>

                    <button
                      type="button"
                      disabled={selectedReport.status === 'In Progress'}
                      onClick={() => updateStatus(selectedReport.token, 'In Progress')}
                      className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all ${
                        selectedReport.status === 'In Progress'
                          ? 'bg-amber-600/30 text-amber-300 border border-amber-500/50'
                          : 'bg-amber-600 hover:bg-amber-500 text-white'
                      }`}
                    >
                      {t.actionRoute}
                    </button>

                    <button
                      type="button"
                      disabled={selectedReport.status === 'Resolved'}
                      onClick={() => updateStatus(selectedReport.token, 'Resolved')}
                      className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all ${
                        selectedReport.status === 'Resolved'
                          ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/50'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      }`}
                    >
                      {t.actionResolve}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-800/40 rounded-3xl border border-slate-800 text-slate-500 text-xs">
                Select a report from the list to view details and update municipal status.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // If phone mockup mode is activated on desktop, render inside an authentic Android phone frame!
  if (phoneFrameMode) {
    return (
      <div className="py-6 flex flex-col items-center justify-center min-h-screen bg-slate-950">
        <div className="mb-4 text-center">
          <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            📱 ANDROID DEVICE SIMULATION
          </span>
          <button
            onClick={() => setPhoneFrameMode(false)}
            className="ml-3 text-xs text-slate-400 hover:text-white underline"
          >
            Switch to Full Screen
          </button>
        </div>

        {/* Smartphone Shell */}
        <div className="relative w-[390px] h-[820px] bg-black rounded-[48px] p-3 shadow-2xl border-4 border-slate-700 ring-1 ring-slate-800 overflow-hidden flex flex-col">
          {/* Top Speaker & Camera Notch */}
          <div className="absolute top-0 inset-x-0 h-6 flex items-center justify-center z-50">
            <div className="w-20 h-4 bg-black rounded-b-xl flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-slate-900 border border-slate-800 mr-2"></div>
              <div className="w-8 h-1 bg-slate-800 rounded-full"></div>
            </div>
          </div>

          {/* Android Screen */}
          <div className="w-full h-full rounded-[38px] overflow-y-auto overflow-x-hidden bg-slate-900">
            {content}
          </div>
        </div>
      </div>
    );
  }

  return content;
}
