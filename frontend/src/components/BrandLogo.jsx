import React from 'react';

export default function BrandLogo({ size = 'md', theme = 'light', onClick, className = '' }) {
  // Size presets
  const sizeClasses = {
    sm: {
      iconBox: 'w-8 h-8 rounded-xl',
      iconSvg: 'w-4 h-4',
      title: 'text-base',
      tagline: 'text-[9px] tracking-wider'
    },
    md: {
      iconBox: 'w-10 h-10 rounded-2xl',
      iconSvg: 'w-5 h-5',
      title: 'text-xl',
      tagline: 'text-[10px] tracking-widest'
    },
    lg: {
      iconBox: 'w-12 h-12 rounded-2xl',
      iconSvg: 'w-6 h-6',
      title: 'text-2xl',
      tagline: 'text-[11px] tracking-widest'
    }
  };

  const currentSize = sizeClasses[size] || sizeClasses.md;
  const isDark = theme === 'dark';

  return (
    <div 
      onClick={onClick}
      className={`inline-flex items-center gap-2.5 select-none ${onClick ? 'cursor-pointer group' : ''} ${className}`}
    >
      {/* Uniform Brand Icon Emblem: Blister Foil Cell + Eco Leaf Loop */}
      <div className={`${currentSize.iconBox} bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-600/25 border border-emerald-400/30 shrink-0 transition-transform ${onClick ? 'group-hover:scale-105' : ''}`}>
        <svg 
          className={currentSize.iconSvg} 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          {/* Pill Capsule */}
          <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
          <path d="m8.5 8.5 7 7" strokeOpacity="0.8" />
          {/* Blister foil perforation dots */}
          <circle cx="5" cy="5" r="1" fill="currentColor" stroke="none" />
          <circle cx="19" cy="19" r="1" fill="currentColor" stroke="none" />
        </svg>
      </div>

      {/* Uniform Wordmark & Tagline on single uniform line */}
      <div className="flex flex-col justify-center">
        <div className={`font-black tracking-tight leading-none ${currentSize.title} ${isDark ? 'text-white' : 'text-slate-900'}`}>
          Eco<span className="text-emerald-500">-Blisters</span>
          <span className="text-emerald-500">.</span>
        </div>
        <div className={`font-extrabold uppercase whitespace-nowrap tracking-wider text-[9px] sm:text-[10px] leading-tight mt-1 flex items-center gap-1.5 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
          <span>Collect</span>
          <span className="text-emerald-500/60 font-black">•</span>
          <span>Track</span>
          <span className="text-emerald-500/60 font-black">•</span>
          <span>Recover</span>
        </div>
      </div>
    </div>
  );
}
