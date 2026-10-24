import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { QrCode, Smartphone, ExternalLink, Copy, Check, X, Globe } from 'lucide-react';

export default function QRCodeModal({ isOpen, onClose }) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);

  // Global permanent public URL accessible worldwide from any mobile network (4G/5G/Wi-Fi)
  const GLOBAL_URL = 'https://eco-blisters.vercel.app';

  useEffect(() => {
    // Generate QR code encoding the global permanent URL
    QRCode.toDataURL(GLOBAL_URL, {
      width: 340,
      margin: 2,
      color: {
        dark: '#022c22',
        light: '#ffffff'
      }
    }).then(setQrDataUrl);
  }, []);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(GLOBAL_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden text-center">
        
        {/* Header */}
        <div className="px-6 pt-6 pb-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <h3 className="font-extrabold text-base leading-tight">Scan QR Code</h3>
              <p className="text-[11px] text-emerald-100">Global Public Link • Any Network</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 transition-colors text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Access Badge */}
        <div className="bg-emerald-50 px-4 py-2 border-b border-emerald-100 flex items-center justify-center gap-1.5 text-[11px] font-bold text-emerald-800">
          <Globe className="w-3.5 h-3.5 text-emerald-600" />
          <span>Opens on Any Mobile Data (4G/5G) or Any Wi-Fi</span>
        </div>

        {/* QR Code Presentation */}
        <div className="p-6 flex flex-col items-center space-y-4">
          <div className="p-3 bg-white border-2 border-dashed border-emerald-300 rounded-3xl shadow-md">
            {qrDataUrl ? (
              <img 
                src={qrDataUrl} 
                alt="Eco-Blisters Global Public QR Code" 
                className="w-56 h-56 rounded-2xl"
              />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center text-slate-400 text-xs">
                Generating QR...
              </div>
            )}
          </div>

          <div className="text-center space-y-1">
            <p className="text-xs font-bold text-slate-800">Scan with your Phone's Camera</p>
            <p className="text-[11px] text-slate-500 max-w-xs">
              Opens the Eco-Blisters web app directly on your phone with zero app download required.
            </p>
          </div>

          {/* Copyable Permanent URL Box */}
          <div className="w-full flex items-center justify-between p-2.5 bg-slate-50 rounded-2xl border border-slate-200">
            <span className="text-xs font-mono font-bold text-slate-700 truncate pl-2">
              {GLOBAL_URL}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition-colors cursor-pointer shrink-0 ml-2"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <a
            href={GLOBAL_URL}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 transition-colors"
          >
            <span>Open Link in New Tab</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

      </div>
    </div>
  );
}
