import React, { useState } from 'react';
import { 
  Pill, Award, QrCode, Building2, Layers, Calendar, 
  MapPin, User, Mail, Phone, Tag, Sparkles, Hash, 
  Leaf, AlertTriangle, ShieldCheck, CheckCircle2, ChevronRight,
  Clock, ArrowRight, Loader2, Info, Star, CheckCircle, Shield
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
      const formEl = document.getElementById('deposit-form-card');
      if (formEl) formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
    <div className="w-full max-w-7xl mx-auto space-y-10 animate-fade-in-up pb-16">
      
      {/* ============================================================== */}
      {/* 1. HERO SECTION: MATCHING REFERENCE DESIGN (DARK FOREST GREEN) */}
      {/* ============================================================== */}
      <section className="bg-[#062e1b] text-white rounded-3xl sm:rounded-[36px] overflow-hidden shadow-2xl border border-emerald-800/50">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          
          {/* Left Column: Bold Headline & Call to Action */}
          <div className="lg:col-span-7 p-6 sm:p-10 lg:p-14 flex flex-col justify-center space-y-6 text-left">
            
            {/* Reviews Rating Badge matching reference */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-900/80 border border-emerald-700/60 text-xs font-bold w-fit shadow-xs">
              <span className="font-black text-amber-300">4.9</span>
              <div className="flex text-amber-300 text-xs tracking-tighter">
                ★★★★★
              </div>
              <span className="text-emerald-400">•</span>
              <span className="text-emerald-200">5,000+ Bengalureans Recycled</span>
            </div>

            {/* Headline with Lime Highlight */}
            <h1 className="text-3xl sm:text-5xl lg:text-5xl xl:text-6xl font-black text-white tracking-tight leading-[1.12]">
              Clean-safe-reliable waste <span className="text-[#bef264]">management</span> for home & clinic
            </h1>

            {/* Subtitle */}
            <p className="text-emerald-100/90 text-sm sm:text-base leading-relaxed font-normal max-w-xl">
              {tr.heroSub || "Keep your property and community clean with dependable pharmaceutical blister foil recovery. Delivering timely collection, pure aluminum recovery, and instant 10%–25% medicine discount vouchers."}
            </p>

            {/* CTA Button Row matching reference */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-2">
              <button
                type="button"
                onClick={() => {
                  const formEl = document.getElementById('deposit-form-card');
                  if (formEl) formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="px-7 py-3.5 bg-[#bef264] hover:bg-[#a3e635] text-emerald-950 font-black rounded-full text-sm sm:text-base flex items-center gap-3 shadow-lg shadow-lime-400/25 transition-all cursor-pointer active:scale-95 group"
              >
                <span>Deposit Strips Now</span>
                <span className="w-6 h-6 rounded-full bg-emerald-950 text-[#bef264] flex items-center justify-center text-xs font-black transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                  ↗
                </span>
              </button>

              <a 
                href="tel:+919117472155" 
                className="inline-flex items-center gap-3 text-white hover:text-[#bef264] transition-colors py-1.5 px-2 rounded-full"
              >
                <div className="w-11 h-11 rounded-full bg-emerald-800/90 border border-emerald-600/70 flex items-center justify-center text-[#bef264] shadow-xs">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider block">Call Us Anytime</span>
                  <span className="text-sm font-black font-mono tracking-tight text-white">+91 9117472155</span>
                </div>
              </a>
            </div>

          </div>

          {/* Right Column: Visual Machinery & Foil Recovery Showcase */}
          <div className="lg:col-span-5 relative min-h-[300px] lg:min-h-[480px] overflow-hidden">
            <img 
              src="https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=1200&q=80" 
              alt="Blister foil recovery facility and processing machinery"
              className="absolute inset-0 w-full h-full object-cover object-center"
            />
            {/* Seamless gradient blend matching reference image */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#062e1b] via-[#062e1b]/40 to-transparent pointer-events-none hidden lg:block" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#062e1b] via-transparent to-transparent pointer-events-none lg:hidden" />

            {/* Live Facility Badge Overlay */}
            <div className="absolute bottom-5 right-5 left-5 sm:left-auto bg-black/65 backdrop-blur-md border border-white/20 text-white rounded-2xl p-4 max-w-xs shadow-2xl space-y-1">
              <span className="text-[10px] font-black uppercase text-[#bef264] tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#bef264] animate-ping" />
                Live Bengaluru Recovery Line
              </span>
              <p className="text-xs text-slate-200 font-medium">
                Active delamination extracting 99.2% pure secondary aluminum & polymers.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ============================================================== */}
      {/* 2. TICKER TAPE / MARQUEE BANNER (MATCHING REFERENCE STRIP)     */}
      {/* ============================================================== */}
      <div className="w-full bg-[#bef264] text-emerald-950 font-black text-xs sm:text-sm py-3.5 px-4 rounded-2xl shadow-sm overflow-hidden select-none border border-lime-300">
        <div className="flex items-center gap-8 whitespace-nowrap animate-marquee">
          <span className="flex items-center gap-2">✱ Smart Blister Foil Solutions</span>
          <span className="flex items-center gap-2">✱ Reliable Pharmacy Drop-boxes</span>
          <span className="flex items-center gap-2">✱ 10%–25% Medical Discounts</span>
          <span className="flex items-center gap-2">✱ Sustainable Recycling Services</span>
          <span className="flex items-center gap-2">✱ 99.2% Pure Aluminum Recovery</span>
          <span className="flex items-center gap-2">✱ Clean Greener Communities</span>
          <span className="flex items-center gap-2">✱ Zero Toxic Landfill Incineration</span>
          <span className="flex items-center gap-2">✱ Bengaluru Live Network</span>
          <span className="flex items-center gap-2">✱ Closed-Loop Logistics Fleet</span>
          {/* Loop repeat for seamless continuous animation */}
          <span className="flex items-center gap-2">✱ Smart Blister Foil Solutions</span>
          <span className="flex items-center gap-2">✱ Reliable Pharmacy Drop-boxes</span>
          <span className="flex items-center gap-2">✱ 10%–25% Medical Discounts</span>
          <span className="flex items-center gap-2">✱ Sustainable Recycling Services</span>
          <span className="flex items-center gap-2">✱ 99.2% Pure Aluminum Recovery</span>
          <span className="flex items-center gap-2">✱ Clean Greener Communities</span>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. SPLIT SECTION: "GET FREE QUOTE" FORM & ABOUT VALUE PROPS    */}
      {/* ============================================================== */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start pt-2">
        
        {/* ------------------------------------------------------------ */}
        {/* LEFT COLUMN: THE SIGNATURE FORM CARD WITH LIME BORDER        */}
        {/* ------------------------------------------------------------ */}
        <div className="lg:col-span-6 w-full">
          <form 
            id="deposit-form-card"
            onSubmit={handleSubmit} 
            className="bg-white rounded-[32px] p-6 sm:p-9 shadow-xl border-2 border-[#bef264] space-y-6 text-left relative transition-all"
          >
            {/* Card Header matching "Get free Quote" font styling */}
            <div className="text-center pb-3 border-b border-slate-100 space-y-1.5">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Get Free Quote & Voucher
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-md mx-auto">
                {tr.depositSectionSub || "Enter your drop-off details to receive your instant pharmacy discount voucher."}
              </p>
              
              {/* Current Reward Badge */}
              <div className="pt-2 flex justify-center">
                <span className="px-4 py-1.5 rounded-full text-xs font-black bg-emerald-50 text-emerald-900 border border-emerald-300 shadow-xs flex items-center gap-2 animate-pulse">
                  <Award className="w-4 h-4 text-emerald-600" />
                  <span>Current Reward: <strong className="text-emerald-700 font-black">{currentTier.percent}% OFF</strong></span>
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

            {/* STEP 1: IDENTITY & VOUCHER OWNERSHIP (WITH RESTORED EMAIL) */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Full Name */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-800 flex items-center gap-1">
                    <span>NAME</span>
                    <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={tr.fullNamePlaceholder || "Your Name"}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#a3e635] transition-all shadow-xs"
                  />
                </div>

                {/* Email (RESTORED - OPTIONAL FOR RECEIPT) */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-800 flex items-center justify-between">
                    <span>EMAIL</span>
                    <span className="text-[10px] text-slate-400 font-normal lowercase">(optional)</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter E-mail"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#a3e635] transition-all shadow-xs"
                  />
                </div>

                {/* Phone Number (Mandatory to redeem at store) */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-800 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <span>PHONE NUMBER</span>
                      <span className="text-rose-600">*</span>
                    </span>
                    <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded-md">
                      Required to Redeem Voucher at Store
                    </span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#a3e635] transition-all shadow-xs"
                  />
                </div>
              </div>
            </div>

            {/* STEP 2: STRIP QUANTITY & DROP POINT */}
            <div className="space-y-4 pt-2 border-t border-slate-100">
              
              {/* Strips Count Presets */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-800">
                    BLISTER STRIPS QUANTITY *
                  </span>
                  <div className="flex items-center gap-1.5 font-bold">
                    <span className="text-slate-500 text-[11px]">Exact count:</span>
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
                      className="w-14 px-2 py-1 bg-white border border-slate-300 rounded-lg text-center font-black text-xs text-emerald-800 focus:outline-none focus:ring-2 focus:ring-[#a3e635]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                        className={`p-3 rounded-2xl border text-center transition-all duration-200 cursor-pointer relative ${
                          isSelected
                            ? 'bg-[#062e1b] text-white border-[#062e1b] shadow-md scale-[1.02]'
                            : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                        }`}
                      >
                        <div className="text-xs font-black">{opt.label}</div>
                        <div className={`text-[11px] font-black mt-1 px-2 py-0.5 rounded-full inline-block ${
                          isSelected ? 'bg-[#bef264] text-emerald-950 font-black' : 'bg-emerald-100 text-emerald-900'
                        }`}>
                          {opt.discount}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Progress bar to next tier */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-slate-800 flex items-center gap-1.5 text-[11px]">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{tr.stripTierBadge || "Tier Status"}: <strong className="text-slate-900">{currentTier.label}</strong></span>
                    </span>
                    <span className="text-emerald-800 text-[11px] font-black">
                      {currentTier.nextNeeded > 0
                        ? `+${currentTier.nextNeeded} more strips to ${currentTier.nextTier}!`
                        : `🏆 Maximum 25% Discount Unlocked!`}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-600 via-teal-500 to-[#bef264] transition-all duration-700 ease-out rounded-full"
                      style={{ width: `${currentTier.progress}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Drop-off Pharmacy / Medical Store */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-800 flex items-center gap-1">
                    <span>DROP-OFF LOCATION / PHARMACY</span>
                    <span className="text-rose-600">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCustomPoint(!isCustomPoint)}
                    className="text-xs text-emerald-700 font-bold hover:underline cursor-pointer"
                  >
                    {isCustomPoint ? "Choose from Drop-box List" : "+ Other Medical Store"}
                  </button>
                </div>

                {!isCustomPoint ? (
                  <select
                    value={selectedDropPoint}
                    onChange={(e) => setSelectedDropPoint(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#a3e635] shadow-xs"
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
                    placeholder="e.g. Sanjeevani Medicals, Near Malleshwaram 8th Cross"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#a3e635] shadow-xs"
                  />
                )}
              </div>

              {/* Material Type */}
              <div className="space-y-1">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-800">
                  BLISTER PACKAGING MATERIAL
                </label>
                <select
                  value={materialType}
                  onChange={(e) => setMaterialType(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#a3e635] shadow-xs"
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

            {/* STEP 3: MANDATORY CAMERA PHOTO PROOF */}
            <div id="camera-section" className="space-y-3 pt-2 border-t border-slate-100 scroll-mt-24">
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

            {/* STEP 4: LOCATION MAP & VOICE ASSIST */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <MapPicker
                latitude={location.latitude}
                longitude={location.longitude}
                address={location.address}
                onLocationChange={setLocation}
                t={tr}
              />

              <WebAudioAssist
                notes={notes}
                onNotesChange={setNotes}
                currentLang={currentLang}
                t={tr}
              />
            </div>

            {/* SUBMIT BUTTON MATCHING REFERENCE "Send Message" DARK PILL BUTTON */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 px-8 bg-[#062e1b] hover:bg-[#073c24] text-[#bef264] font-black text-sm sm:text-base rounded-full shadow-xl flex items-center justify-center gap-3 transition-all duration-200 cursor-pointer active:scale-95 group"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-[#bef264]" />
                    <span>{tr.generatingVoucher || `Generating ${currentTier.percent}% OFF Medical Voucher...`}</span>
                  </>
                ) : (
                  <>
                    <span>Submit & Claim {currentTier.percent}% OFF Voucher</span>
                    <span className="w-6 h-6 rounded-full bg-[#bef264] text-emerald-950 flex items-center justify-center text-xs font-black transition-transform duration-200 group-hover:translate-x-1">
                      ↗
                    </span>
                  </>
                )}
              </button>

              <p className="text-center text-[11px] text-slate-500 font-medium pt-2 flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Instant verified voucher code with barcode for chemist checkout billing.</span>
              </p>
            </div>

          </form>
        </div>

        {/* ------------------------------------------------------------ */}
        {/* RIGHT COLUMN: VALUE PROPOSITIONS & SOCIAL PROOF              */}
        {/* ------------------------------------------------------------ */}
        <div className="lg:col-span-6 space-y-8 text-left pt-2">
          
          {/* Section Tag */}
          <div className="space-y-3">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
              <span>✱</span>
              <span>About Eco-Blisters</span>
            </span>

            {/* Big Headline */}
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
              Keeping communities clean & trusted waste solutions
            </h2>

            {/* Description */}
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              Eco-Blisters delivers dependable blister foil recovery and junk packaging removal for households and healthcare clinics, combining specialized delamination technology, eco-friendly collection, and dependable customer incentives to create cleaner spaces and healthier communities.
            </p>
          </div>

          {/* 4 Checkmark Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm font-bold text-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle className="w-3.5 h-3.5" />
              </div>
              <span>Fast junk removal services</span>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle className="w-3.5 h-3.5" />
              </div>
              <span>Reliable collection scheduling</span>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle className="w-3.5 h-3.5" />
              </div>
              <span>Trusted recycling solutions</span>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle className="w-3.5 h-3.5" />
              </div>
              <span>Licensed professional team</span>
            </div>
          </div>

          {/* Metric Cards matching reference (Avatar Cluster & Percentage Card) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            
            {/* Card 1: Avatars Cluster */}
            <div className="p-6 bg-slate-50/80 rounded-3xl border border-slate-200/80 space-y-3">
              <div className="flex items-center -space-x-3">
                <img 
                  className="w-10 h-10 rounded-full border-2 border-white object-cover" 
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80" 
                  alt="Customer avatar 1" 
                />
                <img 
                  className="w-10 h-10 rounded-full border-2 border-white object-cover" 
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80" 
                  alt="Customer avatar 2" 
                />
                <img 
                  className="w-10 h-10 rounded-full border-2 border-white object-cover" 
                  src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80" 
                  alt="Customer avatar 3" 
                />
              </div>
              <div>
                <span className="text-xl font-black text-slate-900 block">1,250+</span>
                <span className="text-xs text-slate-600 font-semibold">Satisfied clients & recyclers</span>
              </div>
            </div>

            {/* Card 2: Percentage Box */}
            <div className="p-6 bg-emerald-50/70 rounded-3xl border border-emerald-200/70 space-y-1">
              <span className="text-4xl font-black text-emerald-950 block tracking-tight">98%</span>
              <span className="text-xs font-bold text-emerald-900 block">Customer Satisfaction Rate</span>
              <span className="text-[11px] text-emerald-700 block">& 99.2% Material Separation Yield</span>
            </div>

          </div>

          {/* Pill Button: More About Us */}
          <div className="pt-2">
            <button
              type="button"
              onClick={onOpenQrModal}
              className="px-6 py-3 bg-[#bef264] hover:bg-[#a3e635] text-emerald-950 font-black rounded-full text-xs sm:text-sm inline-flex items-center gap-2 shadow-md shadow-lime-400/20 transition-all cursor-pointer active:scale-95 group"
            >
              <span>More About Us</span>
              <span className="w-5 h-5 rounded-full bg-emerald-950 text-[#bef264] flex items-center justify-center text-[10px] font-black transition-transform group-hover:translate-x-0.5">
                ↗
              </span>
            </button>
          </div>

        </div>

      </section>

      {/* ============================================================== */}
      {/* 4. MISSION AND VISION SECTION (MATCHING REFERENCE BOTTOM)       */}
      {/* ============================================================== */}
      <section className="bg-slate-50/70 rounded-[36px] p-6 sm:p-12 border border-slate-200/80 space-y-8 text-left">
        
        {/* Top Header & Visual Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          <div className="lg:col-span-6 space-y-4">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
              <span>✱</span>
              <span>Mission and Vision</span>
            </span>

            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
              Building a cleaner future through responsible waste management
            </h2>

            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              Our vision embraces cleaner environments through responsible disposal, circular foil recovery initiatives, and customer-focused incentives that support healthier communities for future generations.
            </p>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  const formEl = document.getElementById('deposit-form-card');
                  if (formEl) formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="px-6 py-3 bg-[#062e1b] hover:bg-[#073c24] text-[#bef264] font-black rounded-full text-xs sm:text-sm inline-flex items-center gap-2 shadow-md transition-all cursor-pointer active:scale-95 group"
              >
                <span>Get Started Now</span>
                <span className="w-5 h-5 rounded-full bg-[#bef264] text-emerald-950 flex items-center justify-center text-[10px] font-black transition-transform group-hover:translate-x-0.5">
                  ↗
                </span>
              </button>
            </div>
          </div>

          {/* Featured Vehicle / Machinery Card */}
          <div className="lg:col-span-6 overflow-hidden rounded-3xl h-64 sm:h-80 shadow-lg relative border border-slate-200">
            <img 
              src="https://images.unsplash.com/photo-1605600659908-0ef719419d41?auto=format&fit=crop&w=1200&q=80" 
              alt="Waste collection truck and recycling facility"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-5">
              <span className="text-xs font-bold text-white bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
                🚛 Dedicated Pharmaceutical Logistics Fleet
              </span>
            </div>
          </div>

        </div>

        {/* Dual Cards Row: Mission & Vision */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          
          {/* Card 1: Mission — Building Zero Waste */}
          <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 hover:border-emerald-300 transition-all">
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <Leaf className="w-5 h-5 text-emerald-700" />
                </div>
                <h3 className="text-base font-black text-slate-900">
                  Mission — Building zero waste
                </h3>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Helping communities reduce waste through responsible collection and urban pharmaceutical drop-boxes.
              </p>

              <div className="space-y-1 text-xs font-bold text-slate-800">
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Responsible waste collection</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Sustainable community impact</span>
                </div>
              </div>
            </div>

            <img 
              src="https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=400&q=80" 
              alt="Medical blister foils collected" 
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover shrink-0 shadow-xs border border-slate-100"
            />
          </div>

          {/* Card 2: Vision — Greener Future Vision */}
          <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 hover:border-emerald-300 transition-all">
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-emerald-700" />
                </div>
                <h3 className="text-base font-black text-slate-900">
                  Vision — Greener future vision
                </h3>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Creating cleaner communities through innovative pharmaceutical recycling and secondary aluminum yield.
              </p>

              <div className="space-y-1 text-xs font-bold text-slate-800">
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Long-term environmental protection</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Advanced recycling solutions</span>
                </div>
              </div>
            </div>

            <img 
              src="https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=400&q=80" 
              alt="Worker in clean environment" 
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover shrink-0 shadow-xs border border-slate-100"
            />
          </div>

        </div>

      </section>

    </div>
  );
}
