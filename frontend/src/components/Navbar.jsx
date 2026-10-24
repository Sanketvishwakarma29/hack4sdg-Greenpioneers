import React, { useState, useEffect } from 'react';
import { 
  QrCode, Smartphone, Globe, 
  Search, PlusCircle, Wifi, WifiOff, Phone, Tag,
  Lock, Shield, LogOut, Factory
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
    { code: 'kn', label: 'ಕನ್ನಡ (Kannada)', flag: '🇮🇳' },
    { code: 'hi', label: 'हिन्दी (Hindi)', flag: '🇮🇳' },
    { code: 'ta', label: 'தமிழ் (Tamil)', flag: '🇮🇳' },
    { code: 'te', label: 'తెలుగు (Telugu)', flag: '🇮🇳' },
    { code: 'ml', label: 'മലയാളം (Malayalam)', flag: '🇮🇳' },
    { code: 'bn', label: 'বাংলা (Bengali)', flag: '🇮🇳' },
    { code: 'mr', label: 'मराठी (Marathi)', flag: '🇮🇳' }
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      {/* Top Micro-Bar with Helpline & Social Links */}
      <div className="bg-slate-900 text-slate-300 px-4 sm:px-6 lg:px-8 py-1.5 text-[11px] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 font-medium text-emerald-400">
            <Tag className="w-3 h-3" />
            Recycle Blisters & Earn 10%–25% Off at Partner Medical Stores
          </span>
          <span className="hidden md:inline text-slate-500">|</span>
          <span className="hidden md:flex items-center gap-1 text-slate-300">
            <Phone className="w-3 h-3 text-emerald-400" />
            Helpline: <a href="tel:+919117472155" className="font-semibold text-white hover:underline">+91 9117472155</a>
          </span>
        </div>

        {/* Social Icons Header */}
        <div className="flex items-center gap-3">
          <span className="text-slate-400 hidden sm:inline">Follow Ecoblister:</span>
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">
          
          {/* Uniform Brand Logo & Tagline */}
          <BrandLogo 
            size="md" 
            theme="light" 
            onClick={() => setCurrentTab('report')} 
          />

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200/80 gap-0.5">
            <button
              onClick={() => setCurrentTab('report')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                currentTab === 'report'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>{t.newReportNav}</span>
            </button>

            {/* Admin Authenticated Tab */}
            {isAdminLoggedIn ? (
              <>
                <button
                  onClick={() => setCurrentTab('driver')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    currentTab === 'driver'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Fleet Admin</span>
                </button>
                <button
                  onClick={onAdminLogout}
                  className="px-2 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-1 cursor-pointer"
                  title="Sign out of Admin Fleet"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Out</span>
                </button>
              </>
            ) : (
              <button
                onClick={onOpenAdminLogin}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition-all cursor-pointer hover:bg-slate-200/60"
                title="Staff / Admin Authentication"
              >
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Staff / Admin</span>
              </button>
            )}

            {/* Recovery Partner Tab */}
            {isPartnerLoggedIn ? (
              <>
                <button
                  onClick={() => setCurrentTab('partner')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    currentTab === 'partner'
                      ? 'bg-teal-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Factory className="w-3.5 h-3.5 text-teal-300" />
                  <span>Recycler Partner</span>
                </button>
                <button
                  onClick={onPartnerLogout}
                  className="px-2 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-1 cursor-pointer"
                  title="Sign out of Partner Portal"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Out</span>
                </button>
              </>
            ) : (
              <button
                onClick={onOpenPartnerLogin}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-teal-800 flex items-center gap-1.5 transition-all cursor-pointer hover:bg-teal-50"
                title="Recovery Partner Portal"
              >
                <Factory className="w-3.5 h-3.5 text-teal-600" />
                <span>Recycler Portal</span>
              </button>
            )}
          </nav>

          {/* Right Action Tools: Language, Staff Lock & QR */}
          <div className="flex items-center gap-2">
            
            {/* Indian Regional Language Switcher */}
            <div className="relative">
              <select
                value={currentLang}
                onChange={(e) => setCurrentLang(e.target.value)}
                className="appearance-none pl-7 pr-4 py-1.5 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
              >
                {languages.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.flag} {l.label}
                  </option>
                ))}
              </select>
              <Globe className="w-3.5 h-3.5 text-slate-500 absolute left-2 top-2.5 pointer-events-none" />
            </div>

            {/* Mobile Auth Quick Buttons */}
            <div className="flex items-center gap-1 md:hidden">
              {/* Partner mobile button */}
              {isPartnerLoggedIn ? (
                <button
                  type="button"
                  onClick={() => setCurrentTab('partner')}
                  className="p-2 bg-teal-100 text-teal-800 rounded-xl text-xs font-bold flex items-center"
                  title="Recycler Partner"
                >
                  <Factory className="w-4 h-4 text-teal-700" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenPartnerLogin}
                  className="p-2 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-xl"
                  title="Recycler Portal"
                >
                  <Factory className="w-4 h-4" />
                </button>
              )}

              {/* Admin mobile button */}
              {isAdminLoggedIn ? (
                <button
                  type="button"
                  onClick={() => setCurrentTab('driver')}
                  className="p-2 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold flex items-center"
                  title="Admin Fleet"
                >
                  <Shield className="w-4 h-4 text-emerald-700" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenAdminLogin}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl"
                  title="Staff Login"
                >
                  <Lock className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* QR Modal Trigger */}
            <button
              type="button"
              onClick={onOpenQrModal}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              title="Open on phone camera"
            >
              <QrCode className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">{t.scanQrBtn}</span>
            </button>
          </div>
        </div>

      </div>
    </header>
  );
}
