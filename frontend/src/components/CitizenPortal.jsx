import React, { useState } from 'react';
import { 
  Pill, Award, QrCode, Building2, Layers, Calendar, 
  MapPin, User, Mail, Phone, Tag, Sparkles, Hash, 
  Leaf, AlertTriangle, ShieldCheck, CheckCircle2, ChevronRight,
  Clock, ArrowRight, Loader2, Info, Star, CheckCircle, Shield,
  Plus, Minus
} from 'lucide-react';
import MapPicker from './MapPicker';
import CameraCapture from './CameraCapture';
import WebAudioAssist from './WebAudioAssist';
import OtpVerificationModal from './OtpVerificationModal';
import { playNotificationSound } from '../services/socket';

export default function CitizenPortal({ onReportSuccess, onOpenQrModal, currentLang, t }) {
  const tr = t || {};

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);

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
  
  // Custom exact strip count input directly entered by user
  const [stripCountInput, setStripCountInput] = useState(12);

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

  // Dynamic Discount Tier Calculation strictly on user's own entered count
  const calculateTier = (count) => {
    const num = Math.max(1, Number(count) || 1);
    if (num >= 31) return { percent: 25, label: "25% OFF" };
    if (num >= 16) return { percent: 20, label: "20% OFF" };
    if (num >= 6) return { percent: 15, label: "15% OFF" };
    return { percent: 10, label: "10% OFF" };
  };

  const currentTier = calculateTier(stripCountInput);

  const handleStripCountChange = (val) => {
    const parsed = parseInt(val, 10);
    if (isNaN(parsed) || parsed < 1) {
      setStripCountInput(1);
    } else {
      setStripCountInput(Math.min(999, parsed));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError(null);

    // Validate Mandatory Name
    if (!fullName.trim()) {
      setFormError(tr.nameMissingAlert || 'Please enter your Full Name (mandatory to issue your personalized medical discount voucher).');
      const formEl = document.getElementById('deposit-form-card');
      if (formEl) formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    // Validate Mandatory Phone (minimum 10 digits for OTP verification)
    const cleanPhone = (phone || '').trim().replace(/[^0-9]/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      setFormError(tr.phoneMissingAlert || 'Please enter a valid 10-digit Mobile Phone Number. Required for OTP verification before promo code issuance.');
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

    // Open Mobile OTP Verification Modal
    setIsOtpModalOpen(true);
  };

  // Called once citizen verifies their 4-digit phone OTP
  const handleOtpVerified = async () => {
    setIsOtpModalOpen(false);
    setSubmitting(true);
    setFormError(null);

    try {
      const dropPointName = isCustomPoint ? customPointText.trim() : selectedDropPoint;
      const payload = {
        userName: fullName.trim(),
        userEmail: email.trim() || null,
        userPhone: phone.trim() || null,
        phoneVerified: true,
        isPhoneVerified: true,
        binId: dropPointName,
        materialType,
        stripCount: `${stripCountInput} Strips`,
        exactStrips: Number(stripCountInput) || 12,
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
      onReportSuccess(result.token, result.report);
    } catch (err) {
      console.error('Submission error:', err);
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Marquee list from dynamic translation or default array
  const marqueeItemsList = tr.marqueeItems || [
    'Smart Medicine Blister Foil Recovery',
    '100+ Verified Pharmacy Drop-boxes',
    '10%–25% Instant Prescription Discounts',
    'Pure Aluminum & Polymer Separation',
    '99.2% Foil Delamination Recovery',
    'Zero Toxic Landfill Incineration',
    'Bengaluru Live Healthcare Network',
    'Closed-Loop Pharmaceutical Logistics'
  ];

  return (
    <div className="w-full max-w-7xl mx-auto space-y-10 lg:space-y-14 animate-fade-in-up pb-16">
      
      {/* ============================================================== */}
      {/* 1. HERO SECTION: DEDICATED PHARMACEUTICAL BLISTER RECYCLING    */}
      {/* ============================================================== */}
      <section className="bg-[#062e1b] text-white rounded-3xl sm:rounded-[36px] overflow-hidden shadow-2xl border border-emerald-800/50">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          
          {/* Left Column: Authentic Pharmaceutical Headline & Actions */}
          <div className="lg:col-span-7 p-6 sm:p-10 lg:p-14 xl:p-16 flex flex-col justify-center space-y-6 text-left">
            
            {/* Reviews Rating Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-900/80 border border-emerald-700/60 text-xs lg:text-sm font-bold w-fit shadow-xs">
              <span className="font-black text-amber-300">4.9</span>
              <div className="flex text-amber-300 text-xs lg:text-sm tracking-tighter">
                ★★★★★
              </div>
              <span className="text-emerald-400">•</span>
              <span className="text-emerald-200">{tr.heroBadge || "5,000+ Bengalureans Recycled"}</span>
            </div>

            {/* Dynamic Localized Headline focusing on Pharmaceutical Recovery */}
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.15]">
              {tr.heroHeading || "Pharmaceutical Blister Pack Recovery & Medicine Discount Initiative"}
            </h1>

            {/* Subtitle */}
            <p className="text-emerald-100/90 text-xs sm:text-sm lg:text-base leading-relaxed font-normal max-w-xl">
              {tr.heroSub || "Deposit empty tablet and capsule blister foil packs at verified pharmacies across Bengaluru. Help recover pure aluminum and polymers while receiving 10%–25% OFF on your next prescription medicine purchase."}
            </p>

            {/* CTA Button Row */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-5 pt-2">
              <button
                type="button"
                onClick={() => {
                  const formEl = document.getElementById('deposit-form-card');
                  if (formEl) formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="px-6 py-3 sm:px-7 sm:py-3.5 bg-[#bef264] hover:bg-[#a3e635] text-emerald-950 font-black rounded-full text-xs sm:text-sm lg:text-base flex items-center gap-2.5 shadow-lg shadow-lime-400/25 transition-all cursor-pointer active:scale-95 group"
              >
                <span>{tr.depositStripsBtn || "Deposit Blister Packs Now"}</span>
                <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-950 text-[#bef264] flex items-center justify-center text-xs font-black transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                  ↗
                </span>
              </button>

              <a 
                href="tel:+919117472155" 
                className="inline-flex items-center gap-3 text-white hover:text-[#bef264] transition-colors py-1.5 px-2 rounded-full"
              >
                <div className="w-11 h-11 lg:w-12 lg:h-12 rounded-full bg-emerald-800/90 border border-emerald-600/70 flex items-center justify-center text-[#bef264] shadow-xs">
                  <Phone className="w-5 h-5 lg:w-6 lg:h-6" />
                </div>
                <div>
                  <span className="text-[10px] lg:text-xs text-emerald-300 font-bold uppercase tracking-wider block">
                    {tr.callUsAnytime || "Call Us Anytime"}
                  </span>
                  <span className="text-sm lg:text-base font-black font-mono tracking-tight text-white">+91 9117472155</span>
                </div>
              </a>
            </div>

          </div>

          {/* Right Column: AUTHENTIC MEDICINE BLISTER DISPOSING IMAGE */}
          <div className="lg:col-span-5 relative min-h-[300px] lg:min-h-[480px] overflow-hidden">
            <img 
              src="https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=1200&q=80" 
              alt="Empty medicine blister packaging and tablets ready for specialized recycling"
              className="absolute inset-0 w-full h-full object-cover object-center"
            />
            {/* Seamless gradient blend */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#062e1b] via-[#062e1b]/40 to-transparent pointer-events-none hidden lg:block" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#062e1b] via-transparent to-transparent pointer-events-none lg:hidden" />

            {/* Live Facility Badge Overlay */}
            <div className="absolute bottom-5 right-5 left-5 sm:left-auto bg-black/75 backdrop-blur-md border border-white/20 text-white rounded-2xl p-4 max-w-xs shadow-2xl space-y-1">
              <span className="text-[10px] lg:text-xs font-black uppercase text-[#bef264] tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#bef264] animate-ping" />
                {tr.facilityBadge || "Live Bengaluru Recovery Line"}
              </span>
              <p className="text-xs lg:text-sm text-slate-200 font-medium">
                {tr.facilitySub || "Delaminating pharmaceutical blister foils into 99.2% pure secondary aluminum & polymers."}
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ============================================================== */}
      {/* 2. DYNAMIC MARQUEE TICKER TAPE (LOCALIZED FOR ALL 8 LANGUAGES) */}
      {/* ============================================================== */}
      <div className="w-full bg-[#bef264] text-emerald-950 font-black text-xs sm:text-sm py-2.5 sm:py-3 px-4 rounded-2xl shadow-sm overflow-hidden select-none border border-lime-300">
        <div className="flex items-center gap-8 whitespace-nowrap animate-marquee">
          {marqueeItemsList.map((item, idx) => (
            <span key={idx} className="flex items-center gap-2">
              <span>✱</span>
              <span>{item}</span>
            </span>
          ))}
          {/* Duplicate loop to make continuous marquee infinite */}
          {marqueeItemsList.map((item, idx) => (
            <span key={`dup-${idx}`} className="flex items-center gap-2">
              <span>✱</span>
              <span>{item}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. SPLIT SECTION: FORM CARD & ABOUT VALUE PROPOSITIONS         */}
      {/* ============================================================== */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start pt-2">
        
        {/* ------------------------------------------------------------ */}
        {/* LEFT COLUMN: THE SIGNATURE FORM CARD WITH LIME BORDER        */}
        {/* ------------------------------------------------------------ */}
        <div className="lg:col-span-6 w-full">
          <form 
            id="deposit-form-card"
            onSubmit={handleSubmit} 
            className="bg-white rounded-3xl sm:rounded-[32px] p-6 sm:p-8 lg:p-9 shadow-xl shadow-slate-200/50 border border-emerald-100 ring-2 ring-[#bef264] space-y-6 text-left relative transition-all"
          >
            {/* Card Header */}
            <div className="text-center pb-4 border-b border-slate-100 space-y-2">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
                {tr.formTitle || "Record Blister Packaging Deposit"}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-md mx-auto leading-relaxed">
                {tr.formSubtitle || "Enter the number of empty medicine strips you are depositing to receive your instant pharmacy discount voucher."}
              </p>
              
              {/* Current Reward Badge */}
              <div className="pt-1 flex justify-center">
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-900 border border-emerald-200 shadow-2xs">
                  <Award className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    {tr.currentRewardText || "Current Reward Tier"}: <strong className="text-emerald-700 font-black">{currentTier.percent}% {tr.offText || "OFF"}</strong>
                  </span>
                </span>
              </div>
            </div>

            {/* Error Alert */}
            {formError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-900 animate-shake shadow-xs">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-0.5">
                  <span className="font-extrabold block text-rose-950">Missing Requirement</span>
                  <span className="font-medium">{formError}</span>
                </div>
              </div>
            )}

            {/* STEP 1: IDENTITY & VOUCHER OWNERSHIP */}
            <div className="space-y-3.5">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-black inline-flex items-center justify-center shrink-0 shadow-2xs">
                  1
                </span>
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900">
                  {tr.step1Title || "Citizen Recycler Details"}
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <div className="min-h-[20px] flex items-center">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1">
                      <span>{tr.nameLabel || "Full Name"}</span>
                      <span className="text-rose-500 font-bold">*</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={tr.namePlaceholder || "e.g. Ramesh Sharma"}
                    className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#bef264] focus:border-emerald-500 transition-all shadow-xs"
                  />
                </div>

                {/* Email (OPTIONAL FOR DIGITAL RECEIPT) */}
                <div className="space-y-1.5">
                  <div className="min-h-[20px] flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      {tr.emailLabel || "Email Address"}
                    </label>
                    <span className="text-[10px] text-slate-400 font-normal lowercase">{tr.optionalText || "(optional)"}</span>
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={tr.emailPlaceholder || "e.g. ramesh@example.com"}
                    className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#bef264] focus:border-emerald-500 transition-all shadow-xs"
                  />
                </div>

                {/* Phone Number (Mandatory to redeem voucher at store) */}
                <div className="space-y-1.5 sm:col-span-2">
                  <div className="min-h-[20px] flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1">
                      <span>{tr.phoneLabel || "Mobile Phone Number"}</span>
                      <span className="text-rose-500 font-bold">*</span>
                    </label>
                    <span className="text-[10px] sm:text-[11px] text-emerald-800 font-semibold bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full">
                      {tr.phoneRedeemNote || "Required to Redeem Voucher at Chemist Store"}
                    </span>
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={tr.phonePlaceholder || "+91 98765 43210"}
                    className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#bef264] focus:border-emerald-500 transition-all shadow-xs"
                  />
                </div>
              </div>
            </div>

            {/* STEP 2: BLISTER STRIPS QUANTITY & DROP-OFF POINT */}
            <div className="space-y-4 pt-5 border-t border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-black inline-flex items-center justify-center shrink-0 shadow-2xs">
                  2
                </span>
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900">
                  {tr.step2Title || "Blister Strips Quantity & Drop-off Point"}
                </h3>
              </div>

              {/* Number of Strips Stepper Card */}
              <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200/90 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <label className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 block">
                      {tr.stripsInputLabel || "Enter Number of Empty Medicine Strips Deposited"} *
                    </label>
                    <span className="text-[11px] text-emerald-800 font-medium block">
                      {tr.stripsHelper || "Enter your exact strip count directly"}
                    </span>
                  </div>

                  {/* Direct Number of Strips Stepper */}
                  <div className="inline-flex items-center bg-white p-1 rounded-xl border border-emerald-300 shadow-2xs self-start sm:self-auto shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStripCountChange(stripCountInput - 1)}
                      className="w-8 h-8 rounded-lg bg-emerald-100/90 hover:bg-emerald-200 text-emerald-950 font-black flex items-center justify-center transition-colors cursor-pointer"
                      title="Decrease"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex items-center px-2">
                      <input
                        type="number"
                        min="1"
                        max="999"
                        value={stripCountInput}
                        onChange={(e) => handleStripCountChange(e.target.value)}
                        className="w-14 py-0.5 text-center font-black text-lg text-emerald-950 focus:outline-none bg-transparent"
                      />
                      <span className="text-xs font-bold text-slate-500 ml-1">
                        {tr.stripsUnit || "Strips"}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleStripCountChange(stripCountInput + 1)}
                      className="w-8 h-8 rounded-lg bg-emerald-100/90 hover:bg-emerald-200 text-emerald-950 font-black flex items-center justify-center transition-colors cursor-pointer"
                      title="Increase"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Quick Add Buttons Row */}
                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-emerald-200/60">
                  <span className="text-[11px] text-emerald-900/80 font-bold mr-1">Quick Add:</span>
                  {[5, 10, 15, 25, 50].map((addNum) => (
                    <button
                      key={addNum}
                      type="button"
                      onClick={() => handleStripCountChange(stripCountInput + addNum)}
                      className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-900 rounded-lg text-xs font-bold border border-emerald-300 shadow-2xs transition-all cursor-pointer"
                    >
                      +{addNum}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleStripCountChange(1)}
                    className="px-2.5 py-1 bg-slate-200/80 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold cursor-pointer ml-auto"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Drop-off Pharmacy / Medical Store Drop-box */}
              <div className="space-y-1.5">
                <div className="min-h-[20px] flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1">
                    <span>{tr.dropPointLabel || "Drop-off Pharmacy / Medical Store"}</span>
                    <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCustomPoint(!isCustomPoint)}
                    className="text-xs text-emerald-700 font-bold hover:underline cursor-pointer"
                  >
                    {isCustomPoint ? (tr.chooseFromList || "Choose from Drop-box List") : (tr.otherMedicalStore || "+ Other Medical Store")}
                  </button>
                </div>

                {!isCustomPoint ? (
                  <select
                    value={selectedDropPoint}
                    onChange={(e) => setSelectedDropPoint(e.target.value)}
                    className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#bef264] focus:border-emerald-500 transition-all shadow-xs"
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
                    placeholder={tr.customStorePlaceholder || "e.g. Sanjeevani Medicals, Near Malleshwaram 8th Cross"}
                    className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#bef264] focus:border-emerald-500 transition-all shadow-xs"
                  />
                )}

                {/* Quick Select Chips */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[11px] text-slate-500 font-semibold mr-1">{tr.quickSelect || "Quick Select:"}</span>
                  {["Victoria Hospital", "Apollo Pharmacy Indiranagar", "Manipal Hospital", "Majestic Metro Hub"].map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => {
                        setIsCustomPoint(false);
                        const found = bengaluruLocations.flatMap(g => g.items).find(i => i.label.includes(name));
                        if (found) setSelectedDropPoint(found.id);
                      }}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold border border-slate-200/90 transition-all cursor-pointer shadow-2xs"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Material Type */}
              <div className="space-y-1.5">
                <div className="min-h-[20px] flex items-center">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                    {tr.materialLabel || "Blister Packaging Material / Foil Type"}
                  </label>
                </div>
                <select
                  value={materialType}
                  onChange={(e) => setMaterialType(e.target.value)}
                  className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#bef264] focus:border-emerald-500 transition-all shadow-xs"
                >
                  <option value="Alu-Alu Blister Foil (Cold Form Opaque)">
                    {tr.materials?.aluAlu || "Alu-Alu Cold-Form Opaque Foil (Highest Aluminum Yield)"}
                  </option>
                  <option value="PVC / PVDC Transparent + Aluminum Foil">
                    {tr.materials?.pvcAlu || "PVC / PVDC Transparent Plastic + Aluminum Backing Foil"}
                  </option>
                  <option value="High-Barrier Aclar / Alu Pharmaceutical Strip">
                    {tr.materials?.highBarrier || "High-Barrier Aclar / Aluminum Pharmaceutical Strip"}
                  </option>
                  <option value="Mixed Pharmaceutical Blister Packs">
                    {tr.materials?.mixed || "Mixed Pharmaceutical Blister Packaging"}
                  </option>
                </select>
              </div>
            </div>

            {/* STEP 3: MANDATORY CAMERA PHOTO PROOF */}
            <div id="camera-section" className="space-y-3.5 pt-5 border-t border-slate-100 scroll-mt-24">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-black inline-flex items-center justify-center shrink-0 shadow-2xs">
                  3
                </span>
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900">
                  {tr.step3Title || "Camera Photo Verification"}
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

            {/* STEP 4: LOCATION MAP & VOICE ASSIST */}
            <div className="space-y-4 pt-5 border-t border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-black inline-flex items-center justify-center shrink-0 shadow-2xs">
                  4
                </span>
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900">
                  {tr.step4Title || "Location & Voice Assistance"}
                </h3>
              </div>

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

            {/* SUBMIT BUTTON */}
            <div className="pt-4 border-t border-slate-100 space-y-2.5">
              <button
                type="submit"
                disabled={submitting}
                className="w-full h-12 sm:h-13 py-3.5 px-6 bg-[#062e1b] hover:bg-[#073c24] text-[#bef264] font-black text-sm sm:text-base rounded-full shadow-lg shadow-emerald-950/20 flex items-center justify-center gap-2.5 transition-all duration-200 cursor-pointer active:scale-[0.99] group disabled:opacity-70"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-[#bef264]" />
                    <span>{tr.submittingText || `Generating ${currentTier.percent}% OFF Medical Voucher...`}</span>
                  </>
                ) : (
                  <>
                    <span>{tr.submitBtnText || `Submit Deposit & Verify via Phone OTP (${currentTier.percent}% OFF)`}</span>
                    <span className="w-6 h-6 rounded-full bg-[#bef264] text-emerald-950 inline-flex items-center justify-center text-xs font-black transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                      ↗
                    </span>
                  </>
                )}
              </button>

              <p className="text-center text-[11px] text-slate-500 font-medium flex items-center justify-center gap-1.5 pt-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{tr.voucherNotice || "Fast 4-digit phone OTP verification. In-store chemist then validates your physical strips to activate your discount promo code."}</span>
              </p>
            </div>

          </form>
        </div>

        {/* ------------------------------------------------------------ */}
        {/* RIGHT COLUMN: ABOUT SECTION (PURE PHARMACEUTICAL RECYCLING) */}
        {/* ------------------------------------------------------------ */}
        <div className="lg:col-span-6 space-y-7 text-left pt-2 lg:sticky lg:top-24">
          
          {/* Section Tag */}
          <div className="space-y-2.5">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
              <span>✱</span>
              <span>{tr.aboutBadge || "About Eco-Blisters"}</span>
            </span>

            {/* Headline */}
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight">
              {tr.aboutHeading || "Specialized Medicine Blister Foil Recovery Network"}
            </h2>

            {/* Description */}
            <p className="text-slate-600 text-xs sm:text-sm lg:text-base leading-relaxed">
              {tr.aboutDesc || "Eco-Blisters is India's dedicated pharmaceutical blister recovery network. We collect empty tablet and capsule packaging from households and clinics, delaminating composite aluminum and plastic foils into high-purity recycled raw materials while providing citizens with instant prescription discounts."}
            </p>
          </div>

          {/* 4 Checkmark Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm font-bold text-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle className="w-3.5 h-3.5" />
              </div>
              <span>{tr.feature1 || "Verified Hospital & Chemist Drop-boxes"}</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle className="w-3.5 h-3.5" />
              </div>
              <span>{tr.feature2 || "Reliable Scheduled Fleet Collection"}</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle className="w-3.5 h-3.5" />
              </div>
              <span>{tr.feature3 || "Closed-Loop Secondary Aluminum Recovery"}</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle className="w-3.5 h-3.5" />
              </div>
              <span>{tr.feature4 || "Instant 10%–25% Medical Discounts"}</span>
            </div>
          </div>

          {/* Metric Cards (Avatar Cluster & Percentage Card) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            
            {/* Card 1: Avatars Cluster */}
            <div className="p-5 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-2.5">
              <div className="flex items-center -space-x-2.5">
                <img 
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 border-white object-cover" 
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80" 
                  alt="Customer avatar 1" 
                />
                <img 
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 border-white object-cover" 
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80" 
                  alt="Customer avatar 2" 
                />
                <img 
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 border-white object-cover" 
                  src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80" 
                  alt="Customer avatar 3" 
                />
              </div>
              <div>
                <span className="text-lg sm:text-xl font-black text-slate-900 block">1,250+</span>
                <span className="text-xs text-slate-600 font-semibold">{tr.satisfiedClients || "Satisfied Citizens & Patients"}</span>
              </div>
            </div>

            {/* Card 2: Percentage Box */}
            <div className="p-5 bg-emerald-50/70 rounded-2xl border border-emerald-200/70 space-y-1">
              <span className="text-3xl sm:text-4xl font-black text-emerald-950 block tracking-tight">98%</span>
              <span className="text-xs font-bold text-emerald-900 block">{tr.stat98 || "Customer Satisfaction Rate"}</span>
              <span className="text-[11px] text-emerald-700 block">& {tr.stat99 || "99.2% Aluminum Recovery Yield"}</span>
            </div>

          </div>

          {/* Pill Button: More About Us */}
          <div className="pt-1">
            <button
              type="button"
              onClick={onOpenQrModal}
              className="px-5 py-2.5 sm:px-6 sm:py-3 bg-[#bef264] hover:bg-[#a3e635] text-emerald-950 font-black rounded-full text-xs sm:text-sm inline-flex items-center gap-2 shadow-md shadow-lime-400/20 transition-all cursor-pointer active:scale-95 group"
            >
              <span>{tr.moreAboutUsBtn || "More About Us"}</span>
              <span className="w-5 h-5 rounded-full bg-emerald-950 text-[#bef264] flex items-center justify-center text-[10px] font-black transition-transform group-hover:translate-x-0.5">
                ↗
              </span>
            </button>
          </div>

        </div>

      </section>

      {/* ============================================================== */}
      {/* 4. MISSION AND VISION: PHARMACEUTICAL RECOVERY EMPHASIS        */}
      {/* ============================================================== */}
      <section className="bg-slate-50/70 rounded-[36px] p-6 sm:p-12 border border-slate-200/80 space-y-8 text-left">
        
        {/* Top Header & Visual Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          <div className="lg:col-span-6 space-y-4">
            <span className="text-xs lg:text-sm font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
              <span>✱</span>
              <span>{tr.missionVisionBadge || "Mission and Vision"}</span>
            </span>

            <h2 className="text-2xl sm:text-4xl lg:text-4xl xl:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              {tr.missionVisionHeading || "Pioneering Circular Pharmaceutical Packaging in India"}
            </h2>

            <p className="text-slate-600 text-sm sm:text-base lg:text-lg leading-relaxed">
              {tr.missionVisionDesc || "Our mission is to eliminate pharmaceutical packaging waste from entering landfills and open incineration by separating multi-material blister foils into high-value pure aluminum and clean polymers."}
            </p>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  const formEl = document.getElementById('deposit-form-card');
                  if (formEl) formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="px-6 py-3 lg:px-7 lg:py-3.5 bg-[#062e1b] hover:bg-[#073c24] text-[#bef264] font-black rounded-full text-xs sm:text-sm lg:text-base inline-flex items-center gap-2 shadow-md transition-all cursor-pointer active:scale-95 group"
              >
                <span>{tr.getStartedBtn || "Deposit Blister Packs Now"}</span>
                <span className="w-5 h-5 rounded-full bg-[#bef264] text-emerald-950 flex items-center justify-center text-[10px] font-black transition-transform group-hover:translate-x-0.5">
                  ↗
                </span>
              </button>
            </div>
          </div>

          {/* Featured PHARMACY COLLECTION DROP-OFF COUNTER IMAGE */}
          <div className="lg:col-span-6 overflow-hidden rounded-3xl h-64 sm:h-80 lg:h-96 shadow-lg relative border border-slate-200">
            <img 
              src="https://images.unsplash.com/photo-1576602976047-174e57a47881?auto=format&fit=crop&w=1200&q=80" 
              alt="Pharmacy counter with verified medicine blister pack disposal point"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end p-5">
              <span className="text-xs lg:text-sm font-bold text-white bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20">
                🏥 {tr.fleetBadge || "Dedicated Pharmaceutical Logistics Fleet"}
              </span>
            </div>
          </div>

        </div>

        {/* Dual Cards Row: Mission & Vision */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          
          {/* Card 1: Mission — Building Zero Pharmaceutical Waste */}
          <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 hover:border-emerald-300 transition-all">
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <Leaf className="w-5 h-5 lg:w-6 lg:h-6 text-emerald-700" />
                </div>
                <h3 className="text-base lg:text-lg font-black text-slate-900">
                  {tr.missionTitle || "Mission — Zero Pharmaceutical Packaging Landfill"}
                </h3>
              </div>

              <p className="text-xs lg:text-sm text-slate-600 leading-relaxed">
                {tr.missionDesc || "Empowering citizens and clinics to deposit empty medicine strips at convenient pharmacy counters across Bengaluru."}
              </p>

              <div className="space-y-1 text-xs lg:text-sm font-bold text-slate-800">
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-emerald-600" />
                  <span>{tr.missionBullet1 || "Citywide hospital and chemist drop-box network"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-emerald-600" />
                  <span>{tr.missionBullet2 || "Preventing toxic medicinal plastic incineration"}</span>
                </div>
              </div>
            </div>

            {/* AUTHENTIC MEDICINE BLISTER PACK THUMBNAIL */}
            <img 
              src="https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=400&q=80" 
              alt="Prescription medicine blister packaging" 
              className="w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 rounded-2xl object-cover shrink-0 shadow-xs border border-slate-100"
            />
          </div>

          {/* Card 2: Vision — Greener Future Vision */}
          <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 hover:border-emerald-300 transition-all">
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 lg:w-6 lg:h-6 text-emerald-700" />
                </div>
                <h3 className="text-base lg:text-lg font-black text-slate-900">
                  {tr.visionTitle || "Vision — 100% Closed-Loop Medicine Foil Recovery"}
                </h3>
              </div>

              <p className="text-xs lg:text-sm text-slate-600 leading-relaxed">
                {tr.visionDesc || "Extracting secondary pharmaceutical-grade aluminum and polymers for clean industrial circular manufacturing."}
              </p>

              <div className="space-y-1 text-xs lg:text-sm font-bold text-slate-800">
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-emerald-600" />
                  <span>{tr.visionBullet1 || "Long-term environmental and public health protection"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-emerald-600" />
                  <span>{tr.visionBullet2 || "Advanced chemical and thermal delamination solutions"}</span>
                </div>
              </div>
            </div>

            {/* CLINICAL HEALTHCARE STERILE RECOVERY THUMBNAIL */}
            <img 
              src="https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=400&q=80" 
              alt="Medical pharmaceutical packaging research" 
              className="w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 rounded-2xl object-cover shrink-0 shadow-xs border border-slate-100"
            />
          </div>

        </div>

      </section>

      {/* Mandatory Mobile Phone OTP Verification Modal */}
      <OtpVerificationModal
        isOpen={isOtpModalOpen}
        onClose={() => setIsOtpModalOpen(false)}
        phone={phone}
        onVerifySuccess={handleOtpVerified}
        t={tr}
      />

    </div>
  );
}
