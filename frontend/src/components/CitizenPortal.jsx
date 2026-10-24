import React, { useState } from 'react';
import { 
  Send, AlertTriangle, Pill, Calendar, Hash, Layers, 
  MapPin, CheckCircle2, QrCode, Sparkles, Loader2, Tag, 
  Building2, PlusCircle, Check, User, Mail, Phone, Award,
  Flame, TrendingUp, ShieldCheck, HelpCircle, Leaf, Zap
} from 'lucide-react';
import CameraCapture from './CameraCapture';
import MapPicker from './MapPicker';
import WebAudioAssist from './WebAudioAssist';
import { playNotificationSound } from '../services/socket';

export default function CitizenPortal({ onReportSuccess, onOpenQrModal, currentLang, t }) {
  // User Details (Name mandatory, Email & Phone optional)
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
  const [stripCount, setStripCount] = useState('6 – 15 Strips');
  const [exactStrips, setExactStrips] = useState('12');

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

  // Strip Count presets
  const stripPresets = [
    { label: "1 – 5 Strips", sub: "Quick Deposit", count: 5, discount: "10% OFF", percent: 10 },
    { label: "6 – 15 Strips", sub: "Monthly Prescription", count: 12, discount: "15% OFF", percent: 15 },
    { label: "16 – 30 Strips", sub: "Family Medical Pack", count: 25, discount: "20% OFF", percent: 20 },
    { label: "30+ Bulk Strips", sub: "Bulk Recovery", count: 45, discount: "25% OFF", percent: 25 }
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
      setFormError('Please enter your Full Name (mandatory to issue your personalized medical discount voucher).');
      window.scrollTo({ top: 350, behavior: 'smooth' });
      return;
    }

    const dropPointName = isCustomPoint ? customPointText.trim() : selectedDropPoint;
    if (!dropPointName) {
      setFormError('Please select or specify a drop-off location / pharmacy store.');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        userName: fullName.trim(),
        userEmail: email.trim() || null,
        userPhone: phone.trim() || null,
        binId: dropPointName,
        materialType,
        stripCount: `${stripCount}`,
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
    <div className="w-full">
      {/* Dual Screen Ratio Grid:
          - On Mobile Phones (< 1024px): 1-column vertical flow, 100% native phone ratio.
          - On Laptops & Desktops (>= 1024px): Widescreen 12-column ratio taking full advantage of wide screens.
      */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        
        {/* ============================================================== */}
        {/* LEFT COLUMN (Laptops: 5 Cols sticky; Mobile: Top of Screen)    */}
        {/* ============================================================== */}
        <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-24">
          
          {/* Hero Banner with Modern Gradient & Attractive Glow Effects */}
          <div className="relative rounded-3xl p-6 sm:p-7 bg-gradient-to-br from-slate-950 via-emerald-950 to-teal-950 text-white shadow-2xl overflow-hidden border border-emerald-500/20">
            {/* Animated decorative glow meshes */}
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
            <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-60 h-60 bg-teal-500/15 rounded-full blur-2xl pointer-events-none"></div>

            <div className="relative z-10 space-y-3.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-400/30 rounded-full text-emerald-300 text-[10px] sm:text-[11px] font-bold tracking-wider uppercase flex items-center gap-1.5 shadow-xs">
                  <Pill className="w-3.5 h-3.5 text-emerald-400" />
                  {t.badge}
                </span>
                <span className="px-3 py-1 bg-amber-500/20 border border-amber-400/30 rounded-full text-amber-300 text-[10px] sm:text-[11px] font-bold tracking-wider uppercase flex items-center gap-1 shadow-xs">
                  <Tag className="w-3.5 h-3.5" />
                  Up to 25% Pharmacy Discount
                </span>
              </div>

              <h1 className="text-xl sm:text-3xl font-black tracking-tight text-white leading-tight">
                {t.heroHeading}
              </h1>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
                {t.heroSub}
              </p>

              {/* Action Buttons & Quick Hubs */}
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={onOpenQrModal}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all transform active:scale-95 cursor-pointer"
                >
                  <QrCode className="w-4 h-4" />
                  <span>{t.scanQrBtn}</span>
                </button>
                <span className="text-[11px] text-emerald-300/90 font-semibold flex items-center gap-1">
                  📍 Bengaluru Live • Expanding Pan-India
                </span>
              </div>
            </div>
          </div>

          {/* Gamified Reward Tiers Card (Desktop Guide & Live Tier Tracker) */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-500" />
                Voucher Reward Tiers
              </span>
              <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Current: {currentTier.percent}% OFF
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {stripPresets.map((tier) => {
                const isActive = currentTier.percent === tier.percent;
                return (
                  <div 
                    key={tier.label}
                    className={`p-2.5 rounded-2xl border transition-all ${
                      isActive 
                        ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-400/30' 
                        : 'bg-slate-50 border-slate-200/80 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className={isActive ? 'text-emerald-950 font-black' : 'text-slate-800'}>{tier.label}</span>
                      <span className={`text-[11px] font-black px-1.5 py-0.5 rounded-md ${isActive ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                        {tier.discount}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">{tier.sub}</div>
                  </div>
                );
              })}
            </div>

            {/* Dynamic Progress Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                <span>Progress to next tier</span>
                <span className="text-emerald-700 font-bold">
                  {currentTier.nextNeeded > 0 
                    ? `+${currentTier.nextNeeded} strips for ${currentTier.nextTier}` 
                    : '🏆 Maximum Tier Unlocked!'}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                  style={{ width: `${currentTier.progress}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Environmental Mission & Circular Economy Note (Visible on Laptop Screens) */}
          <div className="hidden lg:block bg-gradient-to-br from-teal-50 to-emerald-50/50 rounded-3xl p-5 border border-emerald-200/60 shadow-xs space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
              <Leaf className="w-4 h-4 text-emerald-600" />
              Circular Recovery Impact
            </span>
            <p className="text-xs text-slate-600 leading-relaxed">
              Medicine blister packs combine cold-form aluminum with thermoform PVC/PVDC plastic. Eco-Blisters separates 
              them into <strong>99.2% pure secondary aluminum</strong> and clean polymer granulate, keeping toxic waste 
              out of Indian landfills.
            </p>
          </div>

        </div>

        {/* ============================================================== */}
        {/* RIGHT COLUMN (Laptops: 7 Cols Form; Mobile: Full Native Flow)   */}
        {/* ============================================================== */}
        <div className="lg:col-span-7">
          <form onSubmit={handleSubmit} className="bg-white rounded-[32px] p-5 sm:p-7 shadow-xl border border-slate-200 space-y-6">
            
            {/* Form Title & Subtitle */}
            <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900">
                  {t.depositSectionTitle || "Deposit Blister Packaging"}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t.depositSectionSub || "Deposit empty medicine strips to receive your instant pharmacy discount voucher."}
                </p>
              </div>
              <span className="text-[11px] font-black text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 hidden sm:inline shadow-xs">
                🎁 {t.stripTierBadge || "Strip-Tiered Voucher"}
              </span>
            </div>

            {formError && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2 text-xs text-red-700 animate-shake">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span className="font-semibold">{formError}</span>
              </div>
            )}

            {/* 1. CITIZEN DETAILS: Name (MANDATORY), Email & Phone (OPTIONAL) */}
            <div className="p-5 bg-gradient-to-br from-slate-50 to-emerald-50/40 rounded-2xl border border-emerald-100/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-emerald-600" />
                  {t.citizenDetailsTitle || "Recycler / Citizen Details"}
                </span>
                <span className="text-[11px] text-emerald-700 font-medium">
                  {t.voucherIssuedToName || "Voucher will be issued to your name"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Name: Mandatory */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    {t.fullNameLabel || "Full Name"} <span className="text-red-500 font-black">* {t.requiredBadge || "(Required)"}</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={t.fullNamePlaceholder || "e.g. Ramesh Sharma"}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-semibold shadow-xs"
                  />
                </div>

                {/* Email: Optional */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600 flex items-center gap-1">
                    {t.emailLabel || "Email Address"} <span className="text-slate-400 text-[10px]">{t.optionalBadge || "(Optional)"}</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ramesh@example.com"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                  />
                </div>

                {/* Phone: Optional */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600 flex items-center gap-1">
                    {t.phoneLabel || "Phone Number"} <span className="text-slate-400 text-[10px]">{t.optionalBadge || "(Optional)"}</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                  />
                </div>
              </div>
            </div>

            {/* 2. NUMBER OF STRIPS & DYNAMIC DISCOUNT TIER CALCULATOR */}
            <div className="space-y-3 p-5 bg-gradient-to-r from-emerald-50/50 via-teal-50/40 to-slate-50 rounded-2xl border border-emerald-200/60 shadow-xs">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Hash className="w-4 h-4 text-emerald-600" />
                  {t.stripsLabel} <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600">{t.exactStripsLabel || "Exact Strips Count"}:</span>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={exactStrips}
                    onChange={(e) => setExactStrips(e.target.value)}
                    className="w-16 px-2.5 py-1 bg-white border-2 border-emerald-500 rounded-xl text-center font-black text-sm text-emerald-800 shadow-sm"
                  />
                </div>
              </div>

              {/* Preset Buttons with Explicit Discount Values */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {stripPresets.map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => { setStripCount(opt.label); setExactStrips(opt.count.toString()); }}
                    className={`p-3 rounded-2xl border-2 text-center transition-all cursor-pointer ${
                      stripCount === opt.label
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg scale-[1.02] font-black'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/40 font-medium'
                    }`}
                  >
                    <div className="text-xs font-black">{opt.label}</div>
                    <div className={`text-[11px] font-black mt-1 px-2 py-0.5 rounded-full inline-block ${stripCount === opt.label ? 'bg-white text-emerald-800' : 'bg-emerald-100 text-emerald-800'}`}>
                      {opt.discount}
                    </div>
                  </button>
                ))}
              </div>

              {/* Gamified Reward Progress Bar */}
              <div className="p-3 bg-white rounded-xl border border-emerald-100 shadow-xs space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-emerald-700 flex items-center gap-1">
                    <Award className="w-4 h-4 text-amber-500" />
                    Voucher Reward: <strong className="text-base text-emerald-900">{currentTier.percent}% OFF</strong>
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {currentTier.nextNeeded > 0 
                      ? `Add ${currentTier.nextNeeded} more strips to unlock ${currentTier.nextTier}!` 
                      : `🏆 Maximum Reward Tier Unlocked!`}
                  </span>
                </div>

                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-500 transition-all duration-500"
                    style={{ width: `${currentTier.progress}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* 3. Drop-off Point / Pharmacy Location */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  {t.binIdLabel} <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsCustomPoint(!isCustomPoint)}
                  className="text-xs text-emerald-700 font-semibold hover:underline cursor-pointer"
                >
                  {isCustomPoint ? "Choose from Drop-box List" : "+ Add Other Medical Shop / Hospital"}
                </button>
              </div>

              {!isCustomPoint ? (
                <select
                  value={selectedDropPoint}
                  onChange={(e) => setSelectedDropPoint(e.target.value)}
                  className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                  value={customPointText}
                  onChange={(e) => setCustomPointText(e.target.value)}
                  placeholder="e.g. Sanjeevani Medicals, Near Malleshwaram 8th Cross"
                  className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  required
                />
              )}

              {/* Quick Selection Chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[11px] text-slate-400 font-medium self-center mr-1">Popular:</span>
                {["Victoria Hospital", "Apollo Pharmacy Indiranagar", "Manipal Hospital", "Majestic Metro Hub"].map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      setIsCustomPoint(false);
                      const found = bengaluruLocations.flatMap(g => g.items).find(i => i.label.includes(name));
                      if (found) setSelectedDropPoint(found.id);
                    }}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-[11px] text-slate-700 font-medium border border-slate-200 transition-colors cursor-pointer"
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Blister Packaging Material */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-600" />
                {t.materialLabel} <span className="text-red-500">*</span>
              </label>
              <select
                value={materialType}
                onChange={(e) => setMaterialType(e.target.value)}
                className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Alu-Alu Blister Foil (Cold Form Opaque)">{t.materials.aluAlu}</option>
                <option value="PVC / PVDC Transparent + Aluminum Backing">{t.materials.pvcAlu}</option>
                <option value="High-Barrier Aclar / Alu Pharmaceutical Strip">{t.materials.highBarrier}</option>
                <option value="Empty Medicine Bottles & Plastic Containers">{t.materials.bottlesCaps}</option>
                <option value="Mixed Pharmaceutical Blister Packs">{t.materials.mixed}</option>
              </select>
            </div>

            {/* 5. Date & Time */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-600" />
                {t.dateLabel}
              </label>
              <input
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>

            {/* 6. Photo Evidence (Optional) */}
            <div className="space-y-1">
              <CameraCapture
                onPhotoCapture={(dataUrl, meta) => {
                  setPhoto(dataUrl);
                  if (meta) setPhotoMeta(meta);
                }}
                currentPhoto={photo}
                t={t}
              />
            </div>

            {/* 7. Location with Map & GPS */}
            <MapPicker
              latitude={location.latitude}
              longitude={location.longitude}
              address={location.address}
              onLocationChange={setLocation}
              t={t}
            />

            {/* 8. Web Audio Assistance (Speech-to-Text & Narration in Tamil, Malayalam, Hindi, Kannada, etc.) */}
            <WebAudioAssist
              notes={notes}
              onNotesChange={setNotes}
              currentLang={currentLang}
              t={t}
            />

            {/* Submit Button */}
            <div className="pt-2 space-y-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 px-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-black text-sm sm:text-base rounded-2xl shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 transform active:scale-[0.99] transition-all cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Generating {currentTier.percent}% OFF Medical Voucher...</span>
                  </>
                ) : (
                  <>
                    <Award className="w-5 h-5 text-amber-300" />
                    <span>Submit & Generate {currentTier.percent}% OFF Medical Voucher</span>
                  </>
                )}
              </button>

              <p className="text-center text-[11px] text-slate-500 flex items-center justify-center gap-1">
                <Tag className="w-3.5 h-3.5 text-emerald-600" />
                Upon submitting, your personalized voucher code will be generated immediately for chemist checkout.
              </p>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
