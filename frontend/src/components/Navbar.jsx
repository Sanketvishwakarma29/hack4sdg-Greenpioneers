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
    <header className="sticky top-0 z-40 w-full">
      {/* Top Refined Announcement Strip */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white px-4 sm:px-6 lg:px-8 py-1.5 text-[11px] font-medium border-b border-white/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 font-bold text-emerald-300">
              <Sparkles className="w-3 h-3 text-emerald-400 shrink-0" />
              <span>Bengaluru Blister Foil Recovery Network:</span>
            </span>
            <span className="text-slate-200 hidden sm:inline">
              Deposit empty tablet strips at 100+ partner chemists & earn 10%–25% OFF
            </span>
          </div>

          <div className="flex items-center gap-4 text-slate-300">
            <a 
              href="tel:+919117472155" 
              className="flex items-center gap-1.5 text-emerald-300 hover:text-white transition-colors font-bold"
            >
              <Phone className="w-3 h-3 text-emerald-400" />
              <span>Helpline: +91 9117472155</span>
            </a>

            <div className="hidden md:flex items-center gap-2.5 border-l border-white/20 pl-3">
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

      {/* Main Glass Navbar */}
      <div className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3">
            
            {/* Logo */}
            <BrandLogo 
              size="md" 
              theme="light" 
              onClick={() => setCurrentTab('report')} 
            />

            {/* Desktop Navigation Segmented Pills */}
            <nav className="hidden lg:flex items-center p-1 bg-slate-100/90 rounded-2xl border border-slate-200/70 gap-1 text-xs font-bold">
              {/* Deposit Tab */}
              <button
                type="button"
                onClick={() => setCurrentTab('report')}
                className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  currentTab === 'report'
                    ? 'bg-white text-emerald-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <PlusCircle className={`w-3.5 h-3.5 ${currentTab === 'report' ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>{t.newReportNav || 'New Deposit'}</span>
              </button>

              {/* Track Voucher Tab */}
              <button
                type="button"
                onClick={() => setCurrentTab('track')}
                className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  currentTab === 'track'
                    ? 'bg-white text-emerald-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <Search className={`w-3.5 h-3.5 ${currentTab === 'track' ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>Track Voucher</span>
              </button>

              {/* Admin Fleet Portal */}
              {isAdminLoggedIn ? (
                <div className="flex items-center bg-white rounded-xl shadow-xs border border-emerald-200/60 pl-1 pr-1.5 py-0.5">
                  <button
                    type="button"
                    onClick={() => setCurrentTab('driver')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                      currentTab === 'driver'
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-700 hover:text-emerald-700'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Fleet Admin</span>
                  </button>
                  <button
                    type="button"
                    onClick={onAdminLogout}
                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer ml-1"
                    title="Sign Out of Admin Fleet"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onOpenAdminLogin}
                  className="px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-slate-500 hover:text-slate-900 hover:bg-white/50"
                  title="Staff & Logistics Login"
                >
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Fleet Login</span>
                </button>
              )}

              {/* Recovery Partner Portal */}
              {isPartnerLoggedIn ? (
                <div className="flex items-center bg-white rounded-xl shadow-xs border border-teal-200/60 pl-1 pr-1.5 py-0.5">
                  <button
                    type="button"
                    onClick={() => setCurrentTab('partner')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                      currentTab === 'partner'
                        ? 'bg-teal-700 text-white'
                        : 'text-slate-700 hover:text-teal-800'
                    }`}
                  >
                    <Factory className="w-3.5 h-3.5" />
                    <span>Refinery Partner</span>
                  </button>
                  <button
                    type="button"
                    onClick={onPartnerLogout}
                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer ml-1"
                    title="Sign Out of Partner Portal"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onOpenPartnerLogin}
                  className="px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-slate-500 hover:text-teal-800 hover:bg-teal-50/60"
                  title="Recycling & Refinery Unit Login"
                >
                  <Factory className="w-3.5 h-3.5 text-teal-600" />
                  <span>Recycler Partner</span>
                </button>
              )}
            </nav>

            {/* Right Tools: Language & QR Action */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Language Switcher */}
              <div className="relative">
                <select
                  value={currentLang}
                  onChange={(e) => setCurrentLang(e.target.value)}
                  className="appearance-none pl-8 pr-6 py-2 bg-slate-100 hover:bg-slate-200/80 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors shadow-2xs"
                >
                  {languages.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.flag} {l.label}
                    </option>
                  ))}
                </select>
                <Globe className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5 pointer-events-none" />
                <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-3 pointer-events-none" />
              </div>

              {/* Mobile Quick Auth Icons */}
              <div className="flex items-center gap-1.5 lg:hidden">
                <button
                  type="button"
                  onClick={isAdminLoggedIn ? () => setCurrentTab('driver') : onOpenAdminLogin}
                  className={`p-2 rounded-xl text-xs font-bold flex items-center ${
                    isAdminLoggedIn ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                  }`}
                  title="Admin Fleet"
                >
                  <Shield className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={isPartnerLoggedIn ? () => setCurrentTab('partner') : onOpenPartnerLogin}
                  className={`p-2 rounded-xl text-xs font-bold flex items-center ${
                    isPartnerLoggedIn ? 'bg-teal-100 text-teal-800' : 'bg-teal-50 text-teal-700'
                  }`}
                  title="Recycler Partner"
                >
                  <Factory className="w-4 h-4" />
                </button>
              </div>

              {/* QR Modal Trigger Pill */}
              <button
                type="button"
                onClick={onOpenQrModal}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm shadow-emerald-600/30 cursor-pointer active:scale-95"
                title="Open mobile website QR code"
              >
                <QrCode className="w-4 h-4" />
                <span className="hidden sm:inline">{t.scanQrBtn || 'Scan QR'}</span>
              </button>
            </div>

          </div>
        </div>
      </div>
    </header>
  );
}
