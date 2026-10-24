import React, { useState, useEffect } from 'react';
import { 
  QrCode, Smartphone, Globe, 
  Search, PlusCircle, Wifi, WifiOff, Phone, Tag
} from 'lucide-react';
import BrandLogo from './BrandLogo';
import { InstagramIcon, FacebookIcon, XTwitterIcon } from './SocialIcons';
import { socket } from '../services/socket';

export default function Navbar({ 
  currentTab, 
  setCurrentTab, 
  onOpenQrModal, 
  currentLang, 
  setCurrentLang, 
  t 
}) {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);
    const onNewReport = () => setUnreadCount(prev => prev + 1);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('report:new', onNewReport);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('report:new', onNewReport);
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
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-xs">
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
          <nav className="hidden md:flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200/80">
            <button
              onClick={() => setCurrentTab('report')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                currentTab === 'report'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{t.newReportNav}</span>
            </button>

            <button
              onClick={() => setCurrentTab('track')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                currentTab === 'track'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>{t.trackStatusNav}</span>
            </button>

            <button
              onClick={() => { setCurrentTab('driver'); setUnreadCount(0); }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all relative ${
                currentTab === 'driver'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>{t.driverModeBtn}</span>
              {unreadCount > 0 && (
                <span className="w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                  {unreadCount}
                </span>
              )}
            </button>
          </nav>

          {/* Right Action Tools: Language & QR */}
          <div className="flex items-center gap-2">
            {/* Live Socket Status */}
            <div 
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                isConnected 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              {isConnected ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  <span>Live Network</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-amber-600" />
                  <span>Connecting...</span>
                </>
              )}
            </div>

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

            {/* QR Modal Trigger */}
            <button
              type="button"
              onClick={onOpenQrModal}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
              title="Open on phone camera"
            >
              <QrCode className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">{t.scanQrBtn}</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="flex md:hidden border-t border-slate-100 py-2 gap-1 overflow-x-auto">
          <button
            onClick={() => setCurrentTab('report')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg text-center ${
              currentTab === 'report' ? 'bg-emerald-100 text-emerald-800' : 'text-slate-600'
            }`}
          >
            {t.newReportNav}
          </button>
          <button
            onClick={() => setCurrentTab('track')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg text-center ${
              currentTab === 'track' ? 'bg-emerald-100 text-emerald-800' : 'text-slate-600'
            }`}
          >
            {t.trackStatusNav}
          </button>
          <button
            onClick={() => setCurrentTab('driver')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg text-center ${
              currentTab === 'driver' ? 'bg-emerald-600 text-white' : 'text-slate-600'
            }`}
          >
            Logistics App
          </button>
        </div>
      </div>
    </header>
  );
}
