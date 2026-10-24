import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import CitizenPortal from './components/CitizenPortal';
import TokenTracker from './components/TokenTracker';
import AndroidDriverApp from './components/AndroidDriverApp';
import QRCodeModal from './components/QRCodeModal';
import Footer from './components/Footer';
import { translations } from './translations/i18n';

export default function App() {
  const [currentTab, setCurrentTab] = useState('report'); // 'report', 'track', 'driver'
  const [activeToken, setActiveToken] = useState(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState('en');

  const t = translations[currentLang] || translations.en;

  // Handle URL hash on initial load (e.g. #driver or #track=TOKEN)
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#driver')) {
        setCurrentTab('driver');
      } else if (hash.startsWith('#track')) {
        const tokenPart = hash.replace('#track=', '').replace('#track', '');
        if (tokenPart) {
          setActiveToken(tokenPart);
        }
        setCurrentTab('track');
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // When a citizen submits a new report
  const handleReportSuccess = (token) => {
    setActiveToken(token);
    setCurrentTab('track');
    window.location.hash = `#track=${token}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenQrModal={() => setIsQrModalOpen(true)}
        currentLang={currentLang}
        setCurrentLang={setCurrentLang}
        t={t}
      />

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        {currentTab === 'report' && (
          <CitizenPortal
            onReportSuccess={handleReportSuccess}
            onOpenQrModal={() => setIsQrModalOpen(true)}
            currentLang={currentLang}
            t={t}
          />
        )}

        {currentTab === 'track' && (
          <TokenTracker
            initialToken={activeToken}
            onNewReport={() => {
              setActiveToken(null);
              setCurrentTab('report');
              window.location.hash = '';
            }}
            t={t}
          />
        )}

        {currentTab === 'driver' && (
          <AndroidDriverApp t={t} />
        )}
      </main>

      {/* Global Footer with Company Ecoblister info, phone, email, and social links */}
      {currentTab !== 'driver' && <Footer />}

      {/* QR Code Modal for Phone Connectivity */}
      <QRCodeModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
      />
    </div>
  );
}
