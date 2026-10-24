import React, { useState } from 'react';
import { 
  Pill, Award, QrCode, Building2, Layers, Calendar, 
  MapPin, User, Mail, Phone, Tag, Sparkles, Hash, 
  Leaf, AlertTriangle, ShieldCheck, CheckCircle2, ChevronRight,
  Clock, ArrowRight, Loader2, Info
} from 'lucide-react';
import MapPicker from './MapPicker';
import CameraCapture from './CameraCapture';
import WebAudioAssist from './WebAudioAssist';
import { playNotificationSound } from '../services/socket';

export default function CitizenPortal({ onReportSuccess, onOpenQrModal, currentLang, t }) {
  const tr = t || {};

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Drop-off points across Bengaluru
  const bengaluruLocations = [
    { group: "🏥 Major Hospitals Drop-boxes", items: [
      { id: "Victoria Hospital - Fort Rd OPD Counter", label: "Victoria Hospital (Fort Road OPD Counter)" },
      { id: "Manipal Hospital - Old Airport Road", label: "Manipal Hospital (Old Airport Road, Kodihalli)" },
      { id: "Apollo Hospitals - Bannerghatta Road", label: "Apollo Hospitals (Bannerghatta Road)" },
      { id: "Bowring & Lady Curzon Hospital - Shivajinagar", label: "Bowring & Lady Curzon Hospital (Shivajinagar)" },
      { id: "Fortis Hospital - Cunningham Road", label: "Fortis Hospital (Cunningham Road)" },
      { id: "NIMHANS - Hosur Road OPD", label: "NIMHANS Brain Center (Hosur Road OPD)" },
      { id: "St. John's Medical College Hospital - Koramangala", label: "St. John's Medical College Hospital (Koramangala)" }
    ]},
    { group: "💊 Pharmacy Chains & Medical Stores", items: [
      { id: "Apollo Pharmacy - Indiranagar 100ft Rd", label: "Apollo Pharmacy (100 Feet Rd, Indiranagar)" },
      { id: "MedPlus Pharmacy - Koramangala 5th Block", label: "MedPlus Pharmacy (Koramangala 5th Block)" },
      { id: "Wellness Forever - Jayanagar 4th Block", label: "Wellness Forever 24x7 (Jayanagar 4th Block)" },
      { id: "Netmeds Store - Whitefield Main Road", label: "Netmeds Pharmacy (Whitefield Main Road)" },
      { id: "Frank Ross Pharmacy - MG Road", label: "Frank Ross Pharmacy (MG Road / Brigade Rd)" }
    ]},
    { group: "🚇 Transit Hubs & Metro Drop-boxes", items: [
      { id: "Majestic KSRTC Terminal Drop-box", label: "Majestic KSRTC Terminal Drop-box (Platform 1)" },
      { id: "Kempegowda Majestic Metro Station Hub", label: "Kempegowda Majestic Metro Station (Interchange)" },
      { id: "Commercial Street Entry Drop-box", label: "Commercial Street Market Entry Gate" },
      { id: "Forum Mall Pharmacy Counter - Koramangala", label: "Forum Mall Pharmacy Counter (Koramangala)" },
      { id: "Phoenix Marketcity - Mahadevapura Hub", label: "Phoenix Marketcity (Mahadevapura, Whitefield)" }
    ]}
  ];

  const [selectedDropPoint, setSelectedDropPoint] = useState('Apollo Pharmacy - Indiranagar 100ft Rd');
  const [isCustomPoint, setIsCustomPoint] = useState(false);
  const [customPointText, setCustomPointText] = useState('');
  
  const [materialType, setMaterialType] = useState('PVC / PVDC Transparent + Aluminum Foil');
  const [exactStrips, setExactStrips] = useState('12');
  const [selectedPresetId, setSelectedPresetId] = useState('medium');

  const [date, setDate] = useState(() => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });

  const [location, setLocation] = useState({
    latitude: 12.9716,
    longitude: 77.6412,
    address: 'Near Apollo Pharmacy, 100 Feet Road, Indiranagar, Bengaluru'
  });

  const [photo, setPhoto] = useState(null);
  const [photoMeta, setPhotoMeta] = useState({ isLivePhoto: false, timestamp: null, hash: null });
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Strip Count presets dynamically mapped to i18n
  const stripPresets = [
    { id: 'few', label: tr.stripOptions?.few || "1 – 5 Strips", sub: "Quick Deposit", count: 5, discount: "10% OFF", percent: 10 },
    { id: 'medium', label: tr.stripOptions?.medium || "6 – 15 Strips", sub: "Monthly Prescription", count: 12, discount: "15% OFF", percent: 15 },
    { id: 'bulk', label: tr.stripOptions?.bulk || "16 – 30 Strips", sub: "Family Medical Pack", count: 25, discount: "20% OFF", percent: 20 },
    { id: 'heavy', label: tr.stripOptions?.heavy || "30+ Bulk Strips", sub: "Bulk Recovery", count: 45, discount: "25% OFF", percent: 25 }
  ];

  // Calculate discount tier strictly based on strips count
  const calculateTier = (count) => {
    const num = Number(count) || 1;
    if (num >= 31) return { percent: 25, nextNeeded: 0, nextTier: 'MAX TIER', progress: 100, label: "Tier 4 (Bulk Recovery)" };
    if (num >= 16) return { percent: 20, nextNeeded: 31 - num, nextTier: '25% OFF', progress: 75, label: "Tier 3 (Family Pack)" };
    if (num >= 6) return { percent: 15, nextNeeded: 16 - num, nextTier: '20% OFF', progress: 50, label: "Tier 2 (Monthly Prescription)" };
    return { percent: 10, nextNeeded: 6 - num, nextTier: '15% OFF', progress: 25, label: "Tier 1 (Quick Deposit)" };
  };

  const currentTier = calculateTier(exactStrips);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    // Validate Mandatory Name
    if (!fullName.trim()) {
      setFormError(tr.nameMissingAlert || 'Please enter your Full Name (mandatory to issue your personalized medical discount voucher).');
      window.scrollTo({ top: 320, behavior: 'smooth' });
      return;
    }

    const dropPointName = isCustomPoint ? customPointText.trim() : selectedDropPoint;
    if (!dropPointName) {
      setFormError(tr.storeMissingAlert || 'Please select or specify a drop-off location / pharmacy store.');
      return;
    }

    // Validate Mandatory Camera Photo Verification
    if (!photo) {
      setFormError(tr.photoMandatoryAlert || '📷 Camera photo is strictly mandatory! Please open the camera and take a photo of the empty medicine blister packs before submitting.');
      const cameraEl = document.getElementById('camera-section');
      if (cameraEl) {
        cameraEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setSubmitting(true);

    try {
      const activePreset = stripPresets.find(p => p.id === selectedPresetId);
      const payload = {
        userName: fullName.trim(),
        userEmail: email.trim() || null,
        userPhone: phone.trim() || null,
        binId: dropPointName,
        materialType,
        stripCount: activePreset ? activePreset.label : `${exactStrips} Strips`,
        exactStrips: Number(exactStrips) || 12,
        date: new Date(date).toISOString(),
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address,
        notes,
        photoBase64: photo,
        isLivePhoto: photoMeta.isLivePhoto,
        photoTimestamp: photoMeta.timestamp,
        photoHash: photoMeta.hash
      };

      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to record blister deposit. Please try again.');
      }

      const result = await res.json();

      // Save hash locally to prevent immediate reuse
      if (photoMeta.hash) {
        try {
          const currentHashes = JSON.parse(localStorage.getItem('ecoblister_submitted_hashes') || '[]');
          currentHashes.push(photoMeta.hash);
          localStorage.setItem('ecoblister_submitted_hashes', JSON.stringify(currentHashes.slice(-50)));
        } catch (e) {}
      }

      playNotificationSound('success');
      onReportSuccess(result.promoCode || result.token);
    } catch (err) {
      console.error('Submission error:', err);
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-fade-in-up pb-16">
      
      {/* ============================================================== */}
      {/* 1. HERO SECTION: CONFIDENT, MODERN & HIGH-CONTRAST             */}
      {/* ============================================================== */}
      <section className="text-center space-y-4 pt-2 sm:pt-6">
        {/* Floating Pill Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/90 text-emerald-900 text-xs font-black shadow-sm transition-all hover:bg-emerald-100/80">
          <Pill className="w-4 h-4 text-emerald-600 animate-pulse" />
          <span>{tr.badge || "India's Specialized Blister Foil Recovery Network"}</span>
          <span className="text-emerald-400 font-bold">•</span>
          <span className="text-emerald-700 font-bold">{tr.bengaluruLive || "Bengaluru Live"}</span>
        </div>

        {/* Dynamic Localized Headline */}
        <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-snug sm:leading-tight max-w-3xl mx-auto">
          {tr.heroHeading || "Turn Empty Blister Packs Into Medicine Discounts."}
        </h1>

        {/* Dynamic Localized Subtitle */}
        <p className="text-slate-700 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed font-medium">
          {tr.heroSub || "Drop off used medicine tablet foils at verified pharmacies across Bengaluru. Help extract pure aluminum and polymers while receiving 10%–25% OFF your next prescription purchase."}
        </p>

        {/* Stat Badges Row with High Contrast */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 pt-2 text-xs font-bold text-slate-800">
          <span className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-slate-200 rounded-xl shadow-xs hover:border-emerald-300 transition-colors">
            🏥 <strong className="text-slate-900">{tr.statDropHubs || "100+ Drop Hubs"}</strong>
          </span>
          <span className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 border border-emerald-300 rounded-xl shadow-xs text-emerald-900">
            🎁 <strong className="text-emerald-800">{tr.statVoucher || "10%–25% Store Voucher"}</strong>
          </span>
          <span className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-slate-200 rounded-xl shadow-xs hover:border-emerald-300 transition-colors">
            ♻️ <strong className="text-slate-900">{tr.statDelamination || "99.2% Foil Delamination"}</strong>
          </span>
          <span className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-slate-200 rounded-xl shadow-xs hover:border-emerald-300 transition-colors">
            🌱 <span className="text-slate-800">{tr.statZeroLandfill || "Zero Toxic Landfill"}</span>
          </span>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 2. UNIFIED MAIN DEPOSIT FORM CARD                              */}
      {/* ============================================================== */}
      <form 
        onSubmit={handleSubmit} 
        className="bg-white rounded-3xl p-6 sm:p-10 shadow-sm border border-slate-200/90 space-y-8 text-left transition-all"
      >
        {/* Card Header with Live Reward Preview */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-slate-100">
          <div>
            <h2 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">
              {tr.depositSectionTitle || "Record Your Blister Drop-Off"}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1">
              {tr.depositSectionSub || "Fill in your drop-off details to receive your instant pharmacy discount promo code."}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="px-3.5 py-1.5 rounded-full text-xs font-black bg-emerald-50 text-emerald-900 border border-emerald-300 shadow-xs flex items-center gap-2 animate-pulse">
              <Award className="w-4 h-4 text-emerald-600" />
              <span>{tr.stripTierBadge || "Reward"}: <strong className="text-emerald-700 font-black">{currentTier.percent}% OFF</strong></span>
            </span>
          </div>
        </div>

        {/* Error Alert */}
        {formError && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-xs text-rose-900 animate-shake">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-extrabold block text-rose-950">Missing Requirement</span>
              <span className="font-medium">{formError}</span>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------ */}
        {/* STEP 1: RECYCLER IDENTITY (WITH RESTORED EMAIL FIELD)        */}
        {/* ------------------------------------------------------------ */}
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center shadow-xs shrink-0">
              1
            </span>
            <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-900">
              {tr.step1Title || tr.citizenDetailsTitle || "Your Details (Voucher Identity)"}
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name (Mandatory) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-600" />
                <span>{tr.fullNameLabel || "Full Name"}</span>
                <span className="text-rose-600 font-black">* {tr.requiredBadge || "(Required)"}</span>
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={tr.fullNamePlaceholder || "e.g. Ramesh Sharma"}
                className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-50/80 focus:bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-xs"
              />
            </div>

            {/* Mobile Phone Number (Required for store redemption) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-900 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{tr.phoneLabel || "Mobile Phone Number"}</span>
                </span>
                <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded-md">
                  {tr.phoneRedeemNote || "Required at Store"}
                </span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-50/80 focus:bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-xs"
              />
            </div>

            {/* Email Address (RESTORED - Optional for digital copy & update) */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-slate-900 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{tr.emailLabel || "Email Address"}</span>
                  <span className="text-slate-500 font-normal text-[11px]">{tr.optionalBadge || "(Optional)"}</span>
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  {tr.emailReceiptNote || "Receive digital voucher copy"}
                </span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. yourname@example.com"
                className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-50/80 focus:bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-xs"
              />
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------ */}
        {/* STEP 2: BLISTER QUANTITY & DROP-OFF POINT                     */}
        {/* ------------------------------------------------------------ */}
        <div className="space-y-5 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center shadow-xs shrink-0">
                2
              </span>
              <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-900">
                {tr.step2Title || tr.stripsLabel || "Blister Quantity & Drop-off Point"}
              </h3>
            </div>
            <span className="text-xs font-extrabold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              {tr.stripTierBadge || "Tier"}: <span className="font-mono">{currentTier.percent}% OFF</span>
            </span>
          </div>

          {/* Quantity Tier Selector */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-900">{tr.stripsLabel || "Number of Blister Strips Deposited"}:</span>
              <div className="flex items-center gap-1.5 font-bold">
                <span className="text-slate-600 text-[11px]">{tr.exactStripsLabel || "Exact count"}:</span>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={exactStrips}
                  onChange={(e) => {
                    const val = e.target.value;
                    setExactStrips(val);
                    const num = Number(val);
                    if (num >= 31) setSelectedPresetId('heavy');
                    else if (num >= 16) setSelectedPresetId('bulk');
                    else if (num >= 6) setSelectedPresetId('medium');
                    else setSelectedPresetId('few');
                  }}
                  className="w-16 px-2 py-1 bg-white border border-slate-300 rounded-lg text-center font-black text-xs text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                />
              </div>
            </div>

            {/* Micro-animated preset cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {stripPresets.map((opt) => {
                const isSelected = selectedPresetId === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setSelectedPresetId(opt.id);
                      setExactStrips(opt.count.toString());
                    }}
                    className={`p-3.5 rounded-2xl border text-center transition-all duration-200 cursor-pointer relative overflow-hidden group hover:-translate-y-1 hover:shadow-md ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-600/25 scale-[1.02]'
                        : 'bg-slate-50/90 hover:bg-white border-slate-200 text-slate-800'
                    }`}
                  >
                    <div className="text-xs font-extrabold">{opt.label}</div>
                    <div className={`text-xs font-black mt-1.5 px-2.5 py-0.5 rounded-full inline-block transition-transform duration-200 group-hover:scale-105 ${
                      isSelected ? 'bg-white text-emerald-800 shadow-xs' : 'bg-emerald-100 text-emerald-900'
                    }`}>
                      {opt.discount}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Dynamic Progress Bar to Next Discount Tier */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5 text-xs">
              <div className="flex items-center justify-between font-bold">
                <span className="text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{tr.stripTierBadge || "Tier Status"}: <strong className="text-slate-900">{currentTier.label}</strong></span>
                </span>
                <span className="text-emerald-800 text-[11px] font-extrabold">
                  {currentTier.nextNeeded > 0
                    ? `+${currentTier.nextNeeded} ${tr.moreStripsNeeded || 'more strips to unlock'} ${currentTier.nextTier}!`
                    : `🏆 ${tr.unlockedTier || 'Maximum 25% Discount Tier Unlocked!'}`}
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden p-0.5">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 transition-all duration-700 ease-out rounded-full shadow-xs"
                  style={{ width: `${currentTier.progress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Pharmacy Drop-off Point Selector */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{tr.binIdLabel || "Drop-off Pharmacy / Medical Store"}</span>
                <span className="text-rose-600 font-black">*</span>
              </label>

              <button
                type="button"
                onClick={() => setIsCustomPoint(!isCustomPoint)}
                className="text-xs text-emerald-700 hover:text-emerald-800 font-bold hover:underline cursor-pointer transition-colors"
              >
                {isCustomPoint ? (tr.chooseFromList || "Choose from Drop-box List") : (tr.otherMedicalStore || "+ Other Medical Store")}
              </button>
            </div>

            {!isCustomPoint ? (
              <select
                value={selectedDropPoint}
                onChange={(e) => setSelectedDropPoint(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-50/80 focus:bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-xs"
              >
                {bengaluruLocations.map((group) => (
                  <optgroup key={group.group} label={group.group}>
                    {group.items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            ) : (
              <input
                type="text"
                required
                value={customPointText}
                onChange={(e) => setCustomPointText(e.target.value)}
                placeholder={tr.binIdPlaceholder || "e.g. Sanjeevani Medicals, Near Malleshwaram 8th Cross"}
                className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-50/80 focus:bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-xs"
              />
            )}

            {/* Quick Chips for Bengaluru */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-slate-500 font-bold mr-1">{tr.quickSelectHub || "Quick Select:"}</span>
              {["Victoria Hospital", "Apollo Pharmacy Indiranagar", "Manipal Hospital", "Majestic Metro Hub"].map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    setIsCustomPoint(false);
                    const found = bengaluruLocations.flatMap(g => g.items).find(i => i.label.includes(name));
                    if (found) setSelectedDropPoint(found.id);
                  }}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[11px] font-bold border border-slate-200/90 transition-all hover:scale-105 cursor-pointer shadow-2xs"
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          {/* Material Type (Dynamic localized) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              <span>{tr.materialLabel || "Blister Foil Packaging Material"}</span>
            </label>
            <select
              value={materialType}
              onChange={(e) => setMaterialType(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-50/80 focus:bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-xs"
            >
              <option value="Alu-Alu Blister Foil (Cold Form Opaque)">
                {tr.materials?.aluAlu || "Alu-Alu Cold-Form Opaque Foil (Highest Aluminum Yield)"}
              </option>
              <option value="PVC / PVDC Transparent + Aluminum Foil">
                {tr.materials?.pvcAlu || "PVC / PVDC Transparent + Aluminum Backing Foil"}
              </option>
              <option value="High-Barrier Aclar / Alu Pharmaceutical Strip">
                {tr.materials?.highBarrier || "High-Barrier Aclar / Aluminum Foil Strip"}
              </option>
              <option value="Mixed Pharmaceutical Blister Packs">
                {tr.materials?.mixed || "Mixed Medical Blister Packaging"}
              </option>
            </select>
          </div>
        </div>

        {/* ------------------------------------------------------------ */}
        {/* STEP 3: MANDATORY CAMERA PHOTO PROOF                         */}
        {/* ------------------------------------------------------------ */}
        <div id="camera-section" className="space-y-4 pt-3 border-t border-slate-100 scroll-mt-24">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center shadow-xs shrink-0">
              3
            </span>
            <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-900 flex items-center gap-1.5">
              <span>{tr.step3Title || tr.photoProofTitle || "Photo Verification"}</span>
              <span className="text-rose-600 font-black">* ({tr.photoOptionalBadge || "Mandatory"})</span>
            </h3>
          </div>

          <CameraCapture
            onPhotoCapture={(dataUrl, meta) => {
              setPhoto(dataUrl);
              if (meta) setPhotoMeta(meta);
              if (dataUrl) setFormError(null);
            }}
            currentPhoto={photo}
            isRequired={true}
            t={tr}
          />
        </div>

        {/* ------------------------------------------------------------ */}
        {/* STEP 4: LOCATION & OPTIONAL AUDIO ASSIST                      */}
        {/* ------------------------------------------------------------ */}
        <div className="space-y-4 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-full bg-slate-200 text-slate-800 text-xs font-black flex items-center justify-center shrink-0">
              4
            </span>
            <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-900">
              {tr.step4Title || tr.audioSectionLabel || "Location & Audio Assistance (Optional)"}
            </h3>
          </div>

          {/* Map & GPS Picker */}
          <MapPicker
            latitude={location.latitude}
            longitude={location.longitude}
            address={location.address}
            onLocationChange={setLocation}
            t={tr}
          />

          {/* Voice Notes */}
          <WebAudioAssist
            notes={notes}
            onNotesChange={setNotes}
            currentLang={currentLang}
            t={tr}
          />
        </div>

        {/* ------------------------------------------------------------ */}
        {/* SUBMIT ACTION BAR WITH HOVER & GLOW ANIMATIONS               */}
        {/* ------------------------------------------------------------ */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 px-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-black text-sm sm:text-base rounded-2xl shadow-xl shadow-emerald-700/25 flex items-center justify-center gap-2.5 transform hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-200 cursor-pointer group"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{tr.generatingVoucher || `Generating ${currentTier.percent}% OFF Medical Voucher...`}</span>
              </>
            ) : (
              <>
                <Award className="w-5 h-5 text-amber-300 animate-pulse" />
                <span>{tr.submitAndGetDiscount || `Submit Deposit & Generate ${currentTier.percent}% OFF Voucher`}</span>
                <ArrowRight className="w-4 h-4 ml-1 transition-transform duration-200 group-hover:translate-x-1" />
              </>
            )}
          </button>

          <p className="text-center text-xs text-slate-600 font-medium flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{tr.instantVoucherNotice || "Your discount voucher is generated instantly with barcode & promo code for chemist checkout."}</span>
          </p>
        </div>

      </form>
    </div>
  );
}
