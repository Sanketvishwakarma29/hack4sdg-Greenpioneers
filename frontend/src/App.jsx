import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import CitizenPortal from './components/CitizenPortal';
import TokenTracker from './components/TokenTracker';
import AndroidDriverApp from './components/AndroidDriverApp';
import RecoveryPartnerPortal from './components/RecoveryPartnerPortal';
import QRCodeModal from './components/QRCodeModal';
import AdminLoginModal from './components/AdminLoginModal';
import PartnerLoginModal from './components/PartnerLoginModal';
import Footer from './components/Footer';
import { translations } from './translations/i18n';

export default function App() {
  // Always default to 'report' (new deposit form) on load and refresh
  const [currentTab, setCurrentTab] = useState('report'); 
  const [activeToken, setActiveToken] = useState(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
  const [isPartnerLoggedIn, setIsPartnerLoggedIn] = useState(false);
  const [currentLang, setCurrentLang] = useState('en');

  const t = translations[currentLang] || translations.en;

  // Check persistent session authentication & ensure fresh form on page refresh
  useEffect(() => {
    // Check if admin is authenticated in this browser session
    const savedAdmin = sessionStorage.getItem('ecoblister_admin');
    if (savedAdmin === 'true') {
      setIsAdminLoggedIn(true);
    }

    // Check if partner is authenticated in this browser session
    const savedPartner = sessionStorage.getItem('ecoblister_partner');
    if (savedPartner === 'true') {
      setIsPartnerLoggedIn(true);
    }

    // Always reset to a clean new deposit form on page refresh / load
    // Clears any previous session hash so customers never get stuck on old tracking views
    if (window.location.hash.startsWith('#track')) {
      window.history.replaceState(null, '', window.location.pathname);
      setCurrentTab('report');
    } else if (window.location.hash.startsWith('#driver') || window.location.hash.startsWith('#admin')) {
      if (savedAdmin === 'true') {
        setCurrentTab('driver');
      } else {
        // Not logged in -> redirect to fresh form and open admin login modal
        window.history.replaceState(null, '', window.location.pathname);
        setCurrentTab('report');
        setIsAdminModalOpen(true);
      }
    } else if (window.location.hash.startsWith('#partner') || window.location.hash.startsWith('#refinery')) {
      if (savedPartner === 'true') {
        setCurrentTab('partner');
      } else {
        window.history.replaceState(null, '', window.location.pathname);
        setCurrentTab('report');
        setIsPartnerModalOpen(true);
      }
    } else {
      setCurrentTab('report');
    }

    // Handle hash change events during active browsing
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#driver') || hash.startsWith('#admin')) {
        const isAdmin = sessionStorage.getItem('ecoblister_admin') === 'true';
        if (isAdmin) {
          setCurrentTab('driver');
        } else {
          setIsAdminModalOpen(true);
          window.history.replaceState(null, '', window.location.pathname);
        }
      } else if (hash.startsWith('#partner') || hash.startsWith('#refinery')) {
        const isPartner = sessionStorage.getItem('ecoblister_partner') === 'true';
        if (isPartner) {
          setCurrentTab('partner');
        } else {
          setIsPartnerModalOpen(true);
          window.history.replaceState(null, '', window.location.pathname);
        }
      }
    };

    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // When a citizen submits a new report -> show their generated voucher
  const handleReportSuccess = (token) => {
    setActiveToken(token);
    setCurrentTab('track');
  };

  // Admin login handler
  const handleAdminLoginSuccess = () => {
    sessionStorage.setItem('ecoblister_admin', 'true');
    setIsAdminLoggedIn(true);
    setCurrentTab('driver');
    window.location.hash = '#driver';
  };

  // Admin logout handler
  const handleAdminLogout = () => {
    sessionStorage.removeItem('ecoblister_admin');
    setIsAdminLoggedIn(false);
    setCurrentTab('report');
    window.history.replaceState(null, '', window.location.pathname);
  };

  // Attempting to open Driver / Admin tab
  const handleOpenAdminTab = () => {
    if (isAdminLoggedIn) {
      setCurrentTab('driver');
      window.location.hash = '#driver';
    } else {
      setIsAdminModalOpen(true);
    }
  };

  // Partner login handler
  const handlePartnerLoginSuccess = () => {
    sessionStorage.setItem('ecoblister_partner', 'true');
    setIsPartnerLoggedIn(true);
    setCurrentTab('partner');
    window.location.hash = '#partner';
  };

  // Partner logout handler
  const handlePartnerLogout = () => {
    sessionStorage.removeItem('ecoblister_partner');
    setIsPartnerLoggedIn(false);
    setCurrentTab('report');
    window.history.replaceState(null, '', window.location.pathname);
  };

  // Attempting to open Partner tab
  const handleOpenPartnerTab = () => {
    if (isPartnerLoggedIn) {
      setCurrentTab('partner');
      window.location.hash = '#partner';
    } else {
      setIsPartnerModalOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenQrModal={() => setIsQrModalOpen(true)}
        onOpenAdminLogin={handleOpenAdminTab}
        isAdminLoggedIn={isAdminLoggedIn}
        onAdminLogout={handleAdminLogout}
        onOpenPartnerLogin={handleOpenPartnerTab}
        isPartnerLoggedIn={isPartnerLoggedIn}
        onPartnerLogout={handlePartnerLogout}
        currentLang={currentLang}
        setCurrentLang={setCurrentLang}
        t={t}
      />

      {/* Main Content Area: Responsive across Laptop & Mobile phone ratios */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-3 sm:p-6 lg:p-8">
        
        {/* Tab 1: Citizen Blister Deposit Form (Clean & Fresh on Refresh) */}
        {currentTab === 'report' && (
          <CitizenPortal
            onReportSuccess={handleReportSuccess}
            onOpenQrModal={() => setIsQrModalOpen(true)}
            currentLang={currentLang}
            t={t}
          />
        )}

        {/* Tab 2: User Voucher Card */}
        {currentTab === 'track' && (
          <TokenTracker
            initialToken={activeToken}
            onNewReport={() => {
              setActiveToken(null);
              setCurrentTab('report');
              window.history.replaceState(null, '', window.location.pathname);
            }}
            t={t}
          />
        )}

        {/* Tab 3: Admin & Logistics Fleet Recovery (Password Protected) */}
        {currentTab === 'driver' && (
          isAdminLoggedIn ? (
            <AndroidDriverApp 
              t={t} 
              onLogout={handleAdminLogout}
            />
          ) : (
            <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-3xl border border-slate-200 shadow-xl text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600">
                🔒
              </div>
              <h2 className="text-lg font-black text-slate-900">Admin Authentication Required</h2>
              <p className="text-xs text-slate-500">
                This dashboard is restricted to Eco-Blisters collection drivers, logistics officers, and partner chemists.
              </p>
              <button
                type="button"
                onClick={() => setIsAdminModalOpen(true)}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow cursor-pointer"
              >
                Sign In to Admin Fleet
              </button>
            </div>
          )
        )}

        {/* Tab 4: Recovery Partner & Refinery Portal (Dedicated Recycler Authentication) */}
        {currentTab === 'partner' && (
          isPartnerLoggedIn ? (
            <RecoveryPartnerPortal 
              t={t} 
              onLogout={handlePartnerLogout}
            />
          ) : (
            <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-3xl border border-teal-200 shadow-xl text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center mx-auto text-teal-600">
                🏭
              </div>
              <h2 className="text-lg font-black text-slate-900">Recovery Partner Authentication Required</h2>
              <p className="text-xs text-slate-500">
                Dedicated terminal for industrial smelters, hydrometallurgical recycling units, and blister foil separators.
              </p>
              <button
                type="button"
                onClick={() => setIsPartnerModalOpen(true)}
                className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl shadow cursor-pointer"
              >
                Sign In to Partner Portal
              </button>
            </div>
          )
        )}
      </main>

      {/* Global Footer */}
      {currentTab !== 'driver' && currentTab !== 'partner' && (
        <Footer 
          onOpenAdminLogin={handleOpenAdminTab}
          isAdminLoggedIn={isAdminLoggedIn}
          onOpenPartnerLogin={handleOpenPartnerTab}
          isPartnerLoggedIn={isPartnerLoggedIn}
        />
      )}

      {/* QR Code Modal for Global Public Mobile Access */}
      <QRCodeModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
      />

      {/* Admin Login Modal */}
      <AdminLoginModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        onLoginSuccess={handleAdminLoginSuccess}
      />

      {/* Recovery Partner Login Modal */}
      <PartnerLoginModal
        isOpen={isPartnerModalOpen}
        onClose={() => setIsPartnerModalOpen(false)}
        onLoginSuccess={handlePartnerLoginSuccess}
      />
    </div>
  );
}
