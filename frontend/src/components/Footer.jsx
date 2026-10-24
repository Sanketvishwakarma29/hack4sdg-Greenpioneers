import React from 'react';
import { 
  Phone, Mail, MapPin, Heart, ShieldCheck, Sparkles 
} from 'lucide-react';
import BrandLogo from './BrandLogo';
import { InstagramIcon, FacebookIcon, XTwitterIcon } from './SocialIcons';

export default function Footer({ 
  onOpenAdminLogin, 
  isAdminLoggedIn,
  onOpenPartnerLogin,
  isPartnerLoggedIn
}) {
  return (
    <footer className="bg-slate-950 text-slate-300 border-t border-slate-800 pt-12 pb-8 mt-16 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-slate-800">
          
          {/* Col 1: Uniform Brand & Tagline */}
          <div className="space-y-3 md:col-span-1">
            <BrandLogo size="md" theme="dark" />
            
            <p className="text-xs text-slate-400 leading-relaxed pt-1">
              India's specialized pharmaceutical blister package recovery network. Currently collecting empty medicine foil packs across Bengaluru and rapidly expanding to more cities across India to recover aluminum and polymers.
            </p>

            <div className="pt-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Sparkles className="w-3 h-3" />
                Company: Ecoblister
              </span>
            </div>
          </div>

          {/* Col 2: Partner Network */}
          <div className="space-y-3">
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Active Drop-off Hubs
              </h4>
              <span className="text-[10px] font-semibold text-emerald-400 block mt-0.5">
                Bengaluru • Spreading across India soon
              </span>
            </div>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>🏥 Victoria Hospital, Fort Road</li>
              <li>🏥 Manipal Hospital, Old Airport Rd</li>
              <li>🏥 Apollo Hospitals, Bannerghatta</li>
              <li>🏥 Bowring & Lady Curzon Hospital</li>
              <li>💊 Apollo Pharmacy & MedPlus Stores</li>
              <li>🚇 Kempegowda Majestic Metro Hub</li>
            </ul>
          </div>

          {/* Col 3: Contact Details */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Contact Ecoblister
            </h4>
            <ul className="space-y-3 text-xs text-slate-300">
              <li className="flex items-center gap-2.5">
                <div className="p-2 bg-slate-900 rounded-xl border border-slate-800 text-emerald-400">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Helpline / WhatsApp</span>
                  <a href="tel:+919117472155" className="font-bold text-white hover:text-emerald-400 transition-colors">
                    +91 9117472155
                  </a>
                </div>
              </li>

              <li className="flex items-center gap-2.5">
                <div className="p-2 bg-slate-900 rounded-xl border border-slate-800 text-emerald-400">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Support Email</span>
                  <a href="mailto:xxxxxxxxxx@gmail.com" className="font-medium text-white hover:text-emerald-400 transition-colors">
                    xxxxxxxxxx@gmail.com
                  </a>
                </div>
              </li>

              <li className="flex items-start gap-2.5">
                <div className="p-2 bg-slate-900 rounded-xl border border-slate-800 text-emerald-400 shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Headquarters</span>
                  <span className="text-slate-300">Bengaluru, Karnataka, India</span>
                </div>
              </li>
            </ul>
          </div>

          {/* Col 4: Social Media Links */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Follow Us on Social Media
            </h4>
            <p className="text-xs text-slate-400">
              Stay updated on new pharmacy drop boxes, monthly collection drives, and highest recycling discount rewards!
            </p>

            <div className="flex items-center gap-3">
              {/* Instagram */}
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shadow-md hover:scale-110 transition-transform"
                title="Follow Ecoblister on Instagram"
              >
                <InstagramIcon className="w-5 h-5" />
              </a>

              {/* Facebook */}
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noreferrer"
                className="w-10 h-10 rounded-2xl bg-[#1877F2] flex items-center justify-center text-white shadow-md hover:scale-110 transition-transform"
                title="Follow Ecoblister on Facebook"
              >
                <FacebookIcon className="w-5 h-5" />
              </a>

              {/* X (formerly Twitter) */}
              <a
                href="https://x.com"
                target="_blank"
                rel="noreferrer"
                className="w-10 h-10 rounded-2xl bg-black border border-slate-700 flex items-center justify-center text-white shadow-md hover:scale-110 transition-transform"
                title="Follow Ecoblister on X"
              >
                <XTwitterIcon className="w-5 h-5" />
              </a>
            </div>

            <div className="p-3 bg-emerald-950/40 border border-emerald-800/40 rounded-2xl text-[11px] text-emerald-300">
              💡 Collected pharmaceutical blisters are separated into pure aluminum powder and polymer granules.
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <p>© 2026 Ecoblister Inc. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={onOpenPartnerLogin}
              className="text-slate-400 hover:text-teal-400 flex items-center gap-1 cursor-pointer transition-colors"
            >
              🏭 <span>{isPartnerLoggedIn ? 'Recycler Terminal' : 'Recycler Partner Portal'}</span>
            </button>
            <span className="text-slate-700">|</span>
            <button
              type="button"
              onClick={onOpenAdminLogin}
              className="text-slate-400 hover:text-emerald-400 flex items-center gap-1 cursor-pointer transition-colors"
            >
              🔒 <span>{isAdminLoggedIn ? 'Open Logistics Fleet' : 'Staff & Fleet Login'}</span>
            </button>
            <p className="flex items-center gap-1 text-slate-400 hidden md:inline">
              Pioneering Sustainable Healthcare Packaging Across India
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
