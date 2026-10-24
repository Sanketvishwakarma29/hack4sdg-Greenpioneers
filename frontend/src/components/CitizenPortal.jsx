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

    // Validate Mandatory Camera Photo Verification
    if (!photo) {
      setFormError('📷 Camera photo is strictly mandatory! Please open the camera and take a photo of the empty medicine blister packs before submitting.');
      const cameraEl = document.getElementById('camera-section');
      if (cameraEl) {
        cameraEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
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
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-fade-in pb-16">
      
      {/* ============================================================== */}
      {/* 1. HERO SECTION: CLEAN, CONFIDENT & MINIMALIST                 */}
      {/* ============================================================== */}
      <section className="text-center space-y-4 pt-2 sm:pt-6">
        {/* Pill Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-bold shadow-2xs">
          <Pill className="w-3.5 h-3.5 text-emerald-600" />
          <span>India's Specialized Blister Foil Recovery Network</span>
          <span className="text-emerald-400">•</span>
          <span className="text-emerald-700">Bengaluru Live</span>
        </div>

        {/* Headline */}
        <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight max-w-3xl mx-auto">
          Turn Empty Blister Packs Into <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">Medicine Discounts</span>.
        </h1>

        {/* Subtitle */}
        <p className="text-slate-600 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed font-normal">
          Drop off used medicine tablet foils at verified pharmacies across Bengaluru. Help extract pure aluminum and polymers while receiving <strong className="text-slate-900 font-bold">10%–25% OFF</strong> your next prescription purchase.
        </p>

        {/* Stat Badges Row */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 pt-2 text-xs font-semibold text-slate-600">
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200/80 rounded-xl shadow-2xs">
            🏥 <strong className="text-slate-900">100+</strong> Drop Hubs
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200/80 rounded-xl shadow-2xs text-emerald-700">
            🎁 <strong className="text-emerald-800">10%–25%</strong> Store Voucher
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200/80 rounded-xl shadow-2xs">
            ♻️ <strong className="text-slate-900">99.2%</strong> Foil Delamination
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200/80 rounded-xl shadow-2xs">
            🌱 Zero Toxic Landfill
          </span>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 2. UNIFIED MAIN DEPOSIT CARD                                   */}
      {/* ============================================================== */}
      <form 
        onSubmit={handleSubmit} 
        className="bg-white rounded-3xl p-6 sm:p-10 shadow-sm border border-slate-200/90 space-y-8 text-left"
      >
        {/* Card Header with Live Reward Preview */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-slate-100">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900">
              Record Your Blister Drop-Off
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Fill in your drop-off details to receive your instant pharmacy discount promo code.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-2xs flex items-center gap-1.5">
              <Award className="w-4 h-4 text-emerald-600" />
              <span>Current Reward: <strong>{currentTier.percent}% OFF</strong></span>
            </span>
          </div>
        </div>

        {/* Error Alert */}
        {formError && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-xs text-rose-800 animate-shake">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold block">Submission Requirement Missing</span>
              <span>{formError}</span>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------ */}
        {/* STEP 1: RECYCLER IDENTITY                                    */}
        {/* ------------------------------------------------------------ */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center shrink-0">
              1
            </span>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Your Details (Voucher Identity)
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-emerald-600" />
                <span>Full Name</span>
                <span className="text-rose-500 font-black">*</span>
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Ramesh Sharma"
                className="w-full px-4 py-2.5 bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-2xs"
              />
            </div>

            {/* Phone Number */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Mobile Phone Number</span>
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md">
                  Required to Redeem at Store
                </span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-4 py-2.5 bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-2xs"
              />
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------ */}
        {/* STEP 2: BLISTER QUANTITY & DROP-OFF POINT                     */}
        {/* ------------------------------------------------------------ */}
        <div className="space-y-5 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center shrink-0">
                2
              </span>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                Blister Quantity & Drop-off Point
              </h3>
            </div>
            <span className="text-xs font-bold text-emerald-700">
              Reward Tier: <span className="font-mono">{currentTier.percent}% OFF</span>
            </span>
          </div>

          {/* Quantity Tier Selector */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">How many empty strips are you recycling?</span>
              <div className="flex items-center gap-1.5 font-bold">
                <span className="text-slate-500 text-[11px]">Exact count:</span>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={exactStrips}
                  onChange={(e) => setExactStrips(e.target.value)}
                  className="w-14 px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-center font-black text-xs text-emerald-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {stripPresets.map((opt) => {
                const isSelected = stripCount === opt.label;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => {
                      setStripCount(opt.label);
                      setExactStrips(opt.count.toString());
                    }}
                    className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer relative overflow-hidden ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20 scale-[1.01]'
                        : 'bg-slate-50/70 hover:bg-slate-100/80 border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold">{opt.label}</div>
                    <div className={`text-xs font-black mt-1 px-2 py-0.5 rounded-full inline-block ${
                      isSelected ? 'bg-white text-emerald-800 shadow-2xs' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {opt.discount}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Dynamic Progress Bar to Next Discount Tier */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-1.5 text-xs">
              <div className="flex items-center justify-between font-bold">
                <span className="text-slate-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Tier Status: <strong>{currentTier.label}</strong></span>
                </span>
                <span className="text-emerald-700 text-[11px]">
                  {currentTier.nextNeeded > 0
                    ? `+${currentTier.nextNeeded} more strips to unlock ${currentTier.nextTier}!`
                    : '🏆 Maximum 25% Discount Tier Unlocked!'}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-200/80 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500 rounded-full"
                  style={{ width: `${currentTier.progress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Pharmacy Drop-off Point Selector */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Drop-off Pharmacy / Medical Store</span>
                <span className="text-rose-500 font-black">*</span>
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
                className="w-full px-4 py-2.5 bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-2xs"
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
                className="w-full px-4 py-2.5 bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-2xs"
              />
            )}

            {/* Quick Chips for Bengaluru */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-slate-400 font-semibold mr-1">Quick Select:</span>
              {["Victoria Hospital", "Apollo Pharmacy Indiranagar", "Manipal Hospital", "Majestic Metro Hub"].map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    setIsCustomPoint(false);
                    const found = bengaluruLocations.flatMap(g => g.items).find(i => i.label.includes(name));
                    if (found) setSelectedDropPoint(found.id);
                  }}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold border border-slate-200/80 transition-colors cursor-pointer"
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          {/* Material Type */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              <span>Blister Foil Packaging Material</span>
            </label>
            <select
              value={materialType}
              onChange={(e) => setMaterialType(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-2xs"
            >
              <option value="Alu-Alu Blister Foil (Cold Form Opaque)">Alu-Alu Cold-Form Opaque Foil (Highest Aluminum Yield)</option>
              <option value="PVC / PVDC Transparent + Aluminum Backing">PVC / PVDC Transparent + Aluminum Backing Foil</option>
              <option value="High-Barrier Aclar / Alu Pharmaceutical Strip">High-Barrier Aclar / Aluminum Foil Strip</option>
              <option value="Mixed Pharmaceutical Blister Packs">Mixed Medical Blister Packaging</option>
            </select>
          </div>
        </div>

        {/* ------------------------------------------------------------ */}
        {/* STEP 3: MANDATORY CAMERA PHOTO PROOF                         */}
        {/* ------------------------------------------------------------ */}
        <div id="camera-section" className="space-y-4 pt-2 border-t border-slate-100 scroll-mt-24">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center shrink-0">
              3
            </span>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <span>Photo Verification</span>
              <span className="text-rose-500 font-black">* (Mandatory)</span>
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
            t={t}
          />
        </div>

        {/* ------------------------------------------------------------ */}
        {/* STEP 4: LOCATION & OPTIONAL AUDIO ASSIST                      */}
        {/* ------------------------------------------------------------ */}
        <div className="space-y-4 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 text-xs font-black flex items-center justify-center shrink-0">
              4
            </span>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Location & Audio Assistance (Optional)
            </h3>
          </div>

          {/* Map & GPS Picker */}
          <MapPicker
            latitude={location.latitude}
            longitude={location.longitude}
            address={location.address}
            onLocationChange={setLocation}
            t={t}
          />

          {/* Voice Notes */}
          <WebAudioAssist
            notes={notes}
            onNotesChange={setNotes}
            currentLang={currentLang}
            t={t}
          />
        </div>

        {/* ------------------------------------------------------------ */}
        {/* SUBMIT ACTION BAR                                            */}
        {/* ------------------------------------------------------------ */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 px-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-black text-sm sm:text-base rounded-2xl shadow-xl shadow-emerald-700/25 flex items-center justify-center gap-2.5 transform active:scale-[0.99] transition-all cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Generating {currentTier.percent}% OFF Medical Voucher...</span>
              </>
            ) : (
              <>
                <Award className="w-5 h-5 text-amber-300" />
                <span>Submit Deposit & Generate {currentTier.percent}% OFF Voucher</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </button>

          <p className="text-center text-xs text-slate-500 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Your discount voucher is generated instantly with barcode & promo code for chemist checkout.</span>
          </p>
        </div>

      </form>
    </div>
  );
}
