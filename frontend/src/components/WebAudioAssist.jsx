import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Sparkles, Check, AlertCircle } from 'lucide-react';

export default function WebAudioAssist({ notes, onNotesChange, currentLang = 'en', t }) {
  const [isListening, setIsListening] = useState(false);
  const [isPlayingAudioGuide, setIsPlayingAudioGuide] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [interimText, setInterimText] = useState('');
  const [voiceStatus, setVoiceStatus] = useState('');
  const [voices, setVoices] = useState([]);

  const recognitionRef = useRef(null);
  const notesRef = useRef(notes);
  notesRef.current = notes;

  // Map all 8 Indian language codes to BCP-47 speech tags
  const speechLangMap = {
    en: 'en-IN',
    hi: 'hi-IN',
    kn: 'kn-IN', // Kannada
    ta: 'ta-IN', // Tamil
    te: 'te-IN', // Telugu
    ml: 'ml-IN', // Malayalam
    bn: 'bn-IN', // Bengali
    mr: 'mr-IN'  // Marathi
  };

  const currentSpeechCode = speechLangMap[currentLang] || 'en-IN';

  // Load and cache voices properly (handling async Chrome voice loading)
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const updateVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      if (availableVoices && availableVoices.length > 0) {
        setVoices(availableVoices);
      }
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // Initialize Speech Recognition instance safely
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false; // Note: false avoids runaway Chrome duplicates, restarts smoothly
      recognition.interimResults = true;
      recognition.lang = currentSpeechCode;

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceStatus('Listening in ' + currentSpeechCode + '...');
      };

      recognition.onresult = (event) => {
        let interim = '';
        let finalChunk = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalChunk += transcript;
          } else {
            interim += transcript;
          }
        }

        setInterimText(interim);

        if (finalChunk.trim()) {
          const base = (notesRef.current || '').trim();
          const updated = base ? `${base} ${finalChunk.trim()}` : finalChunk.trim();
          onNotesChange(updated);
          setInterimText('');
        }
      };

      recognition.onerror = (event) => {
        if (event.error === 'no-speech') {
          setVoiceStatus('No speech detected. Tap mic to try again.');
        } else if (event.error === 'not-allowed') {
          setVoiceStatus('Mic permission blocked. Please allow mic in browser.');
        } else {
          setVoiceStatus('');
        }
        setIsListening(false);
        setInterimText('');
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimText('');
      };

      recognitionRef.current = recognition;
    } catch (e) {
      console.warn('Speech Recognition setup error:', e);
      setSpeechSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [currentLang, currentSpeechCode]);

  // Toggle voice dictation
  const toggleListening = () => {
    if (!speechSupported || !recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Please use Chrome on Android or Desktop.');
      return;
    }

    // Stop TTS narration if active before listening
    if (isPlayingAudioGuide && typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsPlayingAudioGuide(false);
    }

    if (isListening) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      setIsListening(false);
      setVoiceStatus('');
    } else {
      try {
        setVoiceStatus('Connecting mic...');
        recognitionRef.current.lang = currentSpeechCode;
        recognitionRef.current.start();
      } catch (err) {
        console.error('Error starting recognition:', err);
        // If it was already running, abort and restart
        try {
          recognitionRef.current.abort();
          setTimeout(() => {
            try {
              recognitionRef.current.start();
            } catch (err2) {
              setIsListening(false);
            }
          }, 150);
        } catch (err3) {
          setIsListening(false);
        }
      }
    }
  };

  // Text-to-Speech audio narration in all 8 Indian languages
  const playAudioGuide = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      alert('Text-to-speech is not supported in this browser.');
      return;
    }

    if (isPlayingAudioGuide) {
      window.speechSynthesis.cancel();
      setIsPlayingAudioGuide(false);
      return;
    }

    // Stop mic dictation if active
    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      setIsListening(false);
    }

    window.speechSynthesis.cancel();

    const guideTexts = {
      en: "Welcome to Eco-Blisters. Enter your name, choose your drop-off hospital or pharmacy, select your packaging material and strip count to receive your instant medical discount voucher!",
      hi: "इको-ब्लिस्टर्स में आपका स्वागत है। अपना नाम लिखें, नजदीकी फार्मेसी चुनें, और स्ट्रिप्स की संख्या चुनकर अपना मेडिकल डिस्काउंट वाउचर प्राप्त करें!",
      kn: "ಇಕೋ-ಬ್ಲಿಸ್ಟರ್ಸ್‌ಗೆ ಸುಸ್ವಾಗತ. ನಿಮ್ಮ ಹೆಸರು ಬರೆಯಿರಿ, ಹತ್ತಿರದ ಮೆಡಿಕಲ್ ಶಾಪ್ ಆಯ್ಕೆಮಾಡಿ, ಮತ್ತು ಖಾಲಿ ಸ್ಟ್ರಿಪ್‌ಗಳನ್ನು ನೀಡಿ ರಿಯಾಯಿತಿ ವೋಚರ್ ಪಡೆಯಿರಿ!",
      ta: "Eco-Blisters-க்கு நல்வரவு. உங்கள் பெயரை உள்ளிட்டு, மருந்தகம் மற்றும் அட்டைகளின் எண்ணிக்கையைத் தேர்ந்தெடுத்து உடனடி மெடிக்கல் தள்ளுபடி வவுச்சரைப் பெறுங்கள்!",
      te: "Eco-Blisters కు స్వాగతం. మీ పేరు నమోదు చేసి, సమీప మెడికల్ షాప్ ఎంచుకుని, ఖాళీ స్ట్రిప్స్ ఇచ్చి ఇన్స్టంట్ మెడిసిన్ డిస్కౌంట్ వోచర్ పొందండి!",
      ml: "Eco-Blisters-ലേക്ക് സ്വാഗതം. നിങ്ങളുടെ പേര് നൽകി, ഫാർമസിയും സ്ട്രിപ്പുകളുടെ എണ്ണവും തിരഞ്ഞെടുത്ത് മെഡിക്കൽ ഡിസ്കൗണ്ട് വൗച്ചർ നേടൂ!",
      bn: "Eco-Blisters-এ স্বাগতম। আপনার নাম লিখুন, ফার্মেসি ও স্ট্রিপের সংখ্যা বেছে নিন এবং তাত্ক্ষণিক ডিসকাউন্ট ভাউচার পান!",
      mr: "इको-ब्लिस्टर्स मध्ये आपले स्वागत आहे. आपले नाव भरा, मेडिकल शॉप निवडा आणि औषध सवलतीसाठी तात्काळ प्रोमोकोड वाउचर मिळवा!"
    };

    const textToSpeak = guideTexts[currentLang] || guideTexts.en;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = currentSpeechCode;
    utterance.rate = 0.95;

    // Pick best available voice from cache
    const available = voices.length > 0 ? voices : window.speechSynthesis.getVoices();
    const matchingVoice = available.find(v => v.lang.toLowerCase().replace('_', '-').startsWith(currentLang))
      || available.find(v => v.lang.toLowerCase().includes('in'))
      || available.find(v => v.lang.startsWith('en'))
      || available[0];

    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    utterance.onend = () => setIsPlayingAudioGuide(false);
    utterance.onerror = () => setIsPlayingAudioGuide(false);

    setIsPlayingAudioGuide(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          {t.audioSectionLabel}
        </label>
        
        {/* Audio Guide Narration Button */}
        <button
          type="button"
          onClick={playAudioGuide}
          className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
            isPlayingAudioGuide
              ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
          }`}
          title="Audio Narration"
        >
          {isPlayingAudioGuide ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          <span>{isPlayingAudioGuide ? t.readingOut : t.playAudioGuideBtn}</span>
        </button>
      </div>

      {/* Voice Dictation Box */}
      <div className="relative">
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder={t.voiceNotesPlaceholder}
          className="w-full px-3.5 py-2.5 pr-14 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all resize-none shadow-inner"
        />

        {/* Floating Microphone Button */}
        <button
          type="button"
          onClick={toggleListening}
          className={`absolute right-3 bottom-3 p-2.5 rounded-full shadow-md flex items-center justify-center transition-all cursor-pointer ${
            isListening
              ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse ring-4 ring-red-200'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white hover:scale-105 active:scale-95'
          }`}
          title={isListening ? t.stopVoiceBtn : t.startVoiceBtn}
        >
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>
      </div>

      {/* Real-time Voice Status or Live Interim Speech Preview */}
      {(isListening || interimText || voiceStatus) && (
        <div className={`flex items-center justify-between px-3.5 py-2 rounded-xl text-xs border transition-all ${
          isListening ? 'bg-red-50 border-red-200 text-red-700' : 'bg-slate-50 border-slate-200 text-slate-600'
        }`}>
          <div className="flex items-center gap-2 truncate">
            {isListening && <span className="w-2 h-2 rounded-full bg-red-500 animate-ping shrink-0" />}
            <span className="font-semibold truncate">
              {interimText ? `"${interimText}..."` : (voiceStatus || t.listening)}
            </span>
          </div>
          <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded-md border text-slate-600 shrink-0 ml-2">
            {currentSpeechCode}
          </span>
        </div>
      )}
    </div>
  );
}
