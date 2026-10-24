import React, { useState, useEffect } from 'react';
import { 
  QrCode, Globe, PlusCircle, Phone, Tag,
  Lock, Shield, LogOut, Factory, Search, ChevronDown, Sparkles
} from 'lucide-react';
import BrandLogo from './BrandLogo';
import { InstagramIcon, FacebookIcon, XTwitterIcon } from './SocialIcons';
import { socket } from '../services/socket';

export default function Navbar({ 
  currentTab, 
  setCurrentTab, 
  onOpenQrModal, 
  onOpenAdminLogin,
  isAdminLoggedIn,
  onAdminLogout,
  onOpenPartnerLogin,
  isPartnerLoggedIn,
  onPartnerLogout,
  currentLang, 
  setCurrentLang, 
  t 
}) {
  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  // Indian Regional Languages
  const languages = [
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
    { code: 'kn', label: 'ಕನ್ನಡ', flag: '🇮🇳' },
    { code: 'ta', label: 'தமிழ்', flag: '🇮🇳' },
    { code: 'te', label: 'తెలుగు', flag: '🇮🇳' },
    { code: 'ml', label: 'മലയാളം', flag: '🇮🇳' },
    { code: 'bn', label: 'বাংলা', flag: '🇮🇳' },
    { code: 'mr', label: 'मराठी', flag: '🇮🇳' }
  ];

  return (
    <header className="sticky top-0 z-40 w-full shadow-md">
      {/* Top Refined Announcement Strip */}
      <div className="bg-[#041c10] text-emerald-200 px-4 sm:px-6 lg:px-8 py-1.5 text-[11px] font-medium border-b border-emerald-900/60">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 font-bold text-[#bef264]">
              <Sparkles className="w-3 h-3 text-[#bef264] shrink-0" />
              <span>Bengaluru Blister Foil Recovery Network:</span>
            </span>
            <span className="text-slate-300 hidden sm:inline">
              Deposit empty tablet strips at 100+ partner chemists & earn 10%–25% OFF
            </span>
          </div>

          <div className="flex items-center gap-4 text-slate-300">
            <a 
              href="tel:+919117472155" 
              className="flex items-center gap-1.5 text-[#bef264] hover:text-white transition-colors font-bold"
            >
              <Phone className="w-3 h-3 text-[#bef264]" />
              <span>Helpline: +91 9117472155</span>
            </a>

            <div className="hidden md:flex items-center gap-2.5 border-l border-emerald-800/80 pl-3">
              <a href="https://instagram.com" target="_blank" rel="noreferrer" className="text-slate-400 hover:text-pink-400 transition-colors" title="Instagram">
                <InstagramIcon className="w-3.5 h-3.5" />
              </a>
              <a href="https://facebook.com" target="_blank" rel="noreferrer" className="text-slate-400 hover:text-blue-400 transition-colors" title="Facebook">
                <FacebookIcon className="w-3.5 h-3.5" />
              </a>
              <a href="https://x.com" target="_blank" rel="noreferrer" className="text-slate-400 hover:text-white transition-colors" title="X (Twitter)">
                <XTwitterIcon className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Main Curved Dark Forest Green Navbar matching Reference Aesthetic */}
      <div className="bg-[#062c19] backdrop-blur-md border-b border-emerald-800/60 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3">
            
            {/* Logo in Dark Theme */}
            <BrandLogo 
              size="md" 
              theme="dark" 
              onClick={() => setCurrentTab('report')} 
            />

            {/* Desktop Navigation Segmented Links */}
            <nav className="hidden lg:flex items-center p-1 bg-emerald-950/70 rounded-2xl border border-emerald-800/60 gap-1 text-xs font-bold">
              {/* Deposit Tab */}
              <button
                type="button"
                onClick={() => setCurrentTab('report')}
                className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  currentTab === 'report'
                    ? 'bg-emerald-800 text-[#bef264] shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-emerald-900/40'
                }`}
              >
                <PlusCircle className={`w-3.5 h-3.5 ${currentTab === 'report' ? 'text-[#bef264]' : 'text-slate-400'}`} />
                <span>{t.newReportNav || 'New Deposit'}</span>
              </button>

              {/* Track Voucher Tab */}
              <button
                type="button"
                onClick={() => setCurrentTab('track')}
                className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  currentTab === 'track'
                    ? 'bg-emerald-800 text-[#bef264] shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-emerald-900/40'
                }`}
              >
                <Search className={`w-3.5 h-3.5 ${currentTab === 'track' ? 'text-[#bef264]' : 'text-slate-400'}`} />
                <span>Track Voucher</span>
              </button>

              {/* Admin Fleet Portal */}
              {isAdminLoggedIn ? (
                <div className="flex items-center bg-emerald-900/80 rounded-xl shadow-xs border border-emerald-700/60 pl-1 pr-1.5 py-0.5">
                  <button
                    type="button"
                    onClick={() => setCurrentTab('driver')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                      currentTab === 'driver'
                        ? 'bg-emerald-600 text-white'
                        : 'text-emerald-200 hover:text-white'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Fleet Admin</span>
                  </button>
                  <button
                    type="button"
                    onClick={onAdminLogout}
                    className="p-1.5 text-rose-400 hover:bg-rose-950/60 rounded-lg cursor-pointer ml-1"
                    title="Sign Out of Admin Fleet"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onOpenAdminLogin}
                  className="px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-slate-300 hover:text-white hover:bg-emerald-900/40"
                  title="Staff & Logistics Login"
                >
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Fleet Login</span>
                </button>
              )}

              {/* Recovery Partner Portal */}
              {isPartnerLoggedIn ? (
                <div className="flex items-center bg-teal-950/80 rounded-xl shadow-xs border border-teal-700/60 pl-1 pr-1.5 py-0.5">
                  <button
                    type="button"
                    onClick={() => setCurrentTab('partner')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                      currentTab === 'partner'
                        ? 'bg-teal-700 text-white'
                        : 'text-teal-200 hover:text-white'
                    }`}
                  >
                    <Factory className="w-3.5 h-3.5" />
                    <span>Refinery Partner</span>
                  </button>
                  <button
                    type="button"
                    onClick={onPartnerLogout}
                    className="p-1.5 text-rose-400 hover:bg-rose-950/60 rounded-lg cursor-pointer ml-1"
                    title="Sign Out of Partner Portal"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onOpenPartnerLogin}
                  className="px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-slate-300 hover:text-teal-300 hover:bg-emerald-900/40"
                  title="Recycling & Refinery Unit Login"
                >
                  <Factory className="w-3.5 h-3.5 text-teal-400" />
                  <span>Recycler Partner</span>
                </button>
              )}
            </nav>

            {/* Right Tools: Language & QR Action (Matching Reference Lime Pill) */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Language Switcher in Dark Emerald Glass */}
              <div className="relative">
                <select
                  value={currentLang}
                  onChange={(e) => setCurrentLang(e.target.value)}
                  className="appearance-none pl-8 pr-6 py-2 bg-emerald-950/90 hover:bg-emerald-900/90 border border-emerald-700/70 rounded-full text-xs font-bold text-emerald-100 cursor-pointer focus:outline-none focus:ring-2 focus:ring-lime-400 transition-colors shadow-xs"
                >
                  {languages.map((l) => (
                    <option key={l.code} value={l.code} className="bg-slate-900 text-white">
                      {l.flag} {l.label}
                    </option>
                  ))}
                </select>
                <Globe className="w-3.5 h-3.5 text-emerald-300 absolute left-2.5 top-2.5 pointer-events-none" />
                <ChevronDown className="w-3 h-3 text-emerald-400 absolute right-2.5 top-3 pointer-events-none" />
              </div>

              {/* Mobile Quick Auth Icons */}
              <div className="flex items-center gap-1.5 lg:hidden">
                <button
                  type="button"
                  onClick={isAdminLoggedIn ? () => setCurrentTab('driver') : onOpenAdminLogin}
                  className={`p-2 rounded-full text-xs font-bold flex items-center ${
                    isAdminLoggedIn ? 'bg-emerald-800 text-[#bef264]' : 'bg-emerald-950 border border-emerald-800 text-slate-300'
                  }`}
                  title="Admin Fleet"
                >
                  <Shield className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={isPartnerLoggedIn ? () => setCurrentTab('partner') : onOpenPartnerLogin}
                  className={`p-2 rounded-full text-xs font-bold flex items-center ${
                    isPartnerLoggedIn ? 'bg-teal-800 text-teal-200' : 'bg-emerald-950 border border-emerald-800 text-teal-300'
                  }`}
                  title="Recycler Partner"
                >
                  <Factory className="w-4 h-4" />
                </button>
              </div>

              {/* Signature Lime Pill Button matching "Get Free Quote ↗" from Reference */}
              <button
                type="button"
                onClick={onOpenQrModal}
                className="px-4 py-2 bg-[#bef264] hover:bg-[#a3e635] text-emerald-950 rounded-full text-xs font-black flex items-center gap-2 shadow-md shadow-lime-400/20 cursor-pointer active:scale-95 transition-all"
                title="Open mobile website QR code"
              >
                <span>{t.scanQrBtn || 'Scan QR'}</span>
                <span className="w-5 h-5 rounded-full bg-emerald-950 text-[#bef264] flex items-center justify-center text-[10px] font-black">
                  ↗
                </span>
              </button>
            </div>

          </div>
        </div>
      </div>
    </header>
  );
}
