import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, Phone, CheckCircle2, AlertCircle, X, Sparkles, RefreshCw, ArrowRight, Lock } from 'lucide-react';

export default function OtpVerificationModal({ isOpen, onClose, phone, onVerifySuccess, t }) {
  // Generate random 4-digit OTP for realistic simulation
  const [generatedOtp, setGeneratedOtp] = useState(() => Math.floor(1000 + Math.random() * 9000).toString());
  const [digits, setDigits] = useState(['', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [countdown, setCountdown] = useState(30);
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  // Reset digits and timer when modal opens
  useEffect(() => {
    if (isOpen) {
      const newOtp = Math.floor(1000 + Math.random() * 9000).toString();
      setGeneratedOtp(newOtp);
      setDigits(['', '', '', '']);
      setOtpError('');
      setCountdown(30);
      setIsVerifying(false);
      setTimeout(() => inputRefs[0].current?.focus(), 150);
    }
  }, [isOpen]);

  // 30s Countdown timer for resend
  useEffect(() => {
    if (!isOpen || countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, countdown]);

  if (!isOpen) return null;

  const handleDigitChange = (index, value) => {
    // Only accept numeric single digit
    const clean = value.replace(/[^0-9]/g, '');
    const newDigits = [...digits];

    if (clean.length > 0) {
      newDigits[index] = clean.slice(-1);
      setDigits(newDigits);
      setOtpError('');
      // Auto-advance to next input
      if (index < 3) {
        inputRefs[index + 1].current?.focus();
      }
    } else {
      newDigits[index] = '';
      setDigits(newDigits);
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 4);
    if (pasted.length > 0) {
      const newDigits = ['', '', '', ''];
      for (let i = 0; i < pasted.length; i++) {
        newDigits[i] = pasted[i];
      }
      setDigits(newDigits);
      setOtpError('');
      const focusIndex = Math.min(pasted.length, 3);
      inputRefs[focusIndex].current?.focus();
    }
  };

  // Quick auto-fill helper for demo & fast testing
  const handleQuickFill = () => {
    const chars = generatedOtp.split('');
    setDigits(chars);
    setOtpError('');
  };

  const handleResend = () => {
    if (countdown > 0) return;
    const newOtp = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedOtp(newOtp);
    setDigits(['', '', '', '']);
    setOtpError('');
    setCountdown(30);
    setTimeout(() => inputRefs[0].current?.focus(), 100);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const entered = digits.join('');
    if (entered.length < 4) {
      setOtpError('Please enter all 4 digits of the OTP.');
      return;
    }

    if (entered !== generatedOtp) {
      setOtpError('Invalid OTP code. Please enter the 4-digit code shown in the SMS alert.');
      return;
    }

    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      onVerifySuccess();
    }, 400);
  };

  const formattedPhone = phone ? (phone.startsWith('+91') ? phone : `+91 ${phone}`) : '+91 XXXXX XXXXX';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border-2 border-emerald-500 overflow-hidden transform animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header Banner */}
        <div className="bg-[#062e1b] text-white p-6 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-emerald-300 hover:text-white p-1 rounded-full hover:bg-emerald-800 transition-colors cursor-pointer"
            title="Cancel"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600/80 border border-emerald-400 flex items-center justify-center text-[#bef264] shadow-md">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#bef264] block">
                Security & Fraud Protection
              </span>
              <h3 className="text-lg font-black text-white">
                Mobile OTP Verification
              </h3>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-left">
          
          {/* Simulated SMS Alert Banner (Guarantees effortless testing with no external SMS bill) */}
          <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-300/80 space-y-1.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-900 flex items-center gap-1.5 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                Live SMS Simulation
              </span>
              <button
                type="button"
                onClick={handleQuickFill}
                className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-extrabold rounded-md shadow-2xs transition-all cursor-pointer"
              >
                Auto-Fill {generatedOtp}
              </button>
            </div>
            <p className="text-xs text-emerald-950 font-mono font-bold bg-white px-3 py-1.5 rounded-lg border border-emerald-200">
              💬 "Your Eco-Blisters voucher verification code is <span className="text-emerald-700 font-black text-sm underline">{generatedOtp}</span>. Valid for 5 mins."
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-slate-600 font-medium">
              We sent a 4-digit verification code to:
            </p>
            <div className="flex items-center gap-2 text-sm font-black text-slate-900 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
              <Phone className="w-4 h-4 text-emerald-600" />
              <span>{formattedPhone}</span>
            </div>
          </div>

          {/* 4-Digit Input Boxes */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
              Enter 4-Digit Verification Code:
            </label>
            <div className="flex items-center justify-between gap-3">
              {digits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={inputRefs[idx]}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleDigitChange(idx, e.target.value)}
                  onKeyDown={e => handleKeyDown(idx, e)}
                  onPaste={idx === 0 ? handlePaste : undefined}
                  className="w-14 h-14 text-center font-black text-2xl text-emerald-950 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#bef264] focus:border-emerald-600 transition-all shadow-xs"
                />
              ))}
            </div>
          </div>

          {/* Error Message */}
          {otpError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-rose-800 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{otpError}</span>
            </div>
          )}

          {/* Resend OTP Row */}
          <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
            <span>Didn't receive code?</span>
            {countdown > 0 ? (
              <span className="text-slate-400 font-mono font-semibold">
                Resend in {countdown}s
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                className="text-emerald-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Resend Code</span>
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-2 space-y-2">
            <button
              type="submit"
              disabled={isVerifying}
              className="w-full py-3.5 px-6 bg-[#062e1b] hover:bg-[#073c24] text-[#bef264] font-black text-sm rounded-full shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
            >
              {isVerifying ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-[#bef264]" />
                  <span>Verifying Mobile...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-[#bef264]" />
                  <span>Verify OTP & Complete Deposit</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              Cancel & Return to Form
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
