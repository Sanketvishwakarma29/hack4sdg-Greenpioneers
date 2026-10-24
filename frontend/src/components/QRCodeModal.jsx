import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { QrCode, Smartphone, ExternalLink, Copy, Check, X, Wifi } from 'lucide-react';

export default function QRCodeModal({ isOpen, onClose }) {
  const [webQrDataUrl, setWebQrDataUrl] = useState('');
  const [driverQrDataUrl, setDriverQrDataUrl] = useState('');
  const [activeTab, setActiveTab] = useState('web'); // 'web' or 'driver'
  const [copied, setCopied] = useState(false);
  const [networkInfo, setNetworkInfo] = useState({
    localIp: '192.168.88.21',
    port: '5173',
    webUrl: 'https://frontpage-vocal-morgan-cons.trycloudflare.com',
    lanUrl: 'http://192.168.88.21:5173',
    driverUrl: 'https://frontpage-vocal-morgan-cons.trycloudflare.com/#driver'
  });

  useEffect(() => {
    // Fetch network info from backend if available
    fetch('/api/network-info')
      .then(res => res.json())
      .then(data => {
        if (data && data.webUrl) {
          setNetworkInfo(data);
          QRCode.toDataURL(data.webUrl, { width: 300, margin: 2 }).then(setWebQrDataUrl);
          QRCode.toDataURL(data.driverUrl, { width: 300, margin: 2 }).then(setDriverQrDataUrl);
        }
      })
      .catch(() => {
        // Fallback to current browser location
        const currentOrigin = window.location.origin;
        QRCode.toDataURL(currentOrigin, { width: 300, margin: 2 }).then(setWebQrDataUrl);
        QRCode.toDataURL(`${currentOrigin}/#driver`, { width: 300, margin: 2 }).then(setDriverQrDataUrl);
      });
  }, []);

  if (!isOpen) return null;

  const currentUrl = activeTab === 'web' ? networkInfo.webUrl : networkInfo.driverUrl;
  const currentQr = activeTab === 'web' ? webQrDataUrl : driverQrDataUrl;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
              <QrCode className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Scan QR Code</h3>
              <p className="text-xs text-emerald-100">Open instantly on your Android phone</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex gap-2">
          <button
            onClick={() => setActiveTab('web')}
            className={`flex-1 py-2 px-3 rounded-xl font-medium text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
              activeTab === 'web'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            Citizen Web Portal
          </button>
          <button
            onClick={() => setActiveTab('driver')}
            className={`flex-1 py-2 px-3 rounded-xl font-medium text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
              activeTab === 'driver'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            <QrCode className="w-4 h-4" />
            Android Driver App
          </button>
        </div>

        {/* QR Display */}
        <div className="p-6 flex flex-col items-center text-center">
          <div className="p-4 bg-white rounded-2xl shadow-inner border border-slate-200 mb-4 inline-block">
            {currentQr ? (
              <img 
                src={currentQr} 
                alt="QR Code" 
                className="w-56 h-56 object-contain rounded-lg"
              />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center text-slate-400">
                Generating QR...
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full mb-3">
            <Wifi className="w-3.5 h-3.5" />
            Connect phone to same Wi-Fi & scan camera
          </div>

          <p className="text-xs text-slate-500 mb-4 max-w-xs">
            {activeTab === 'web' 
              ? 'Scan to open the Citizen Waste Reporting page directly on your phone.'
              : 'Scan to open the Android Municipal Driver Control App with real-time sync.'}
          </p>

          {/* URL Box & Copy */}
          <div className="w-full flex items-center bg-slate-100 rounded-xl p-2 border border-slate-200 text-xs text-slate-700 font-mono">
            <span className="truncate flex-1 text-left px-2 select-all">{currentUrl}</span>
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 font-medium rounded-lg border border-slate-200 shadow-sm flex items-center gap-1.5 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
