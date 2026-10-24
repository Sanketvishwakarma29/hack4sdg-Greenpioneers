import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, RefreshCw, Trash2, Video, Upload, CheckCircle2, 
  AlertCircle, ShieldCheck, Sparkles, X, Eye, ShieldAlert,
  Clock, Zap
} from 'lucide-react';

// Simple perceptual hash function to detect identical duplicate photos
function generateImageHash(canvas) {
  try {
    const ctx = canvas.getContext('2d');
    const smallCanvas = document.createElement('canvas');
    smallCanvas.width = 16;
    smallCanvas.height = 16;
    const sCtx = smallCanvas.getContext('2d');
    sCtx.drawImage(canvas, 0, 0, 16, 16);
    const imgData = sCtx.getImageData(0, 0, 16, 16).data;
    let hash = '';
    for (let i = 0; i < imgData.length; i += 4) {
      // Grayscale average
      const gray = Math.round((imgData[i] + imgData[i + 1] + imgData[i + 2]) / 3);
      hash += gray > 128 ? '1' : '0';
    }
    return hash;
  } catch (e) {
    return `hash-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  }
}

export default function CameraCapture({ onPhotoCapture, currentPhoto, t }) {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // back camera preferred
  const [isLivePhoto, setIsLivePhoto] = useState(false);
  const [photoTimestamp, setPhotoTimestamp] = useState(null);
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [liveTimer, setLiveTimer] = useState('');

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  // Live timer for viewfinder
  useEffect(() => {
    let interval;
    if (isCameraActive) {
      interval = setInterval(() => {
        setLiveTimer(new Date().toLocaleTimeString('en-IN', { hour12: false }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isCameraActive]);

  // Stop video stream
  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopStream();
    };
  }, []);

  // Start live camera stream
  const startCamera = async () => {
    setCameraError(null);
    setDuplicateWarning(null);
    try {
      stopStream();
      const constraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err) {
      console.error('Camera error:', err);
      setCameraError('Unable to access live camera. Please grant camera permission or use photo upload.');
      setIsCameraActive(false);
    }
  };

  // Flip camera between front and back
  const toggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    if (isCameraActive) {
      setTimeout(() => startCamera(), 100);
    }
  };

  // Take LIVE snapshot from video feed with anti-duplicate watermark
  const captureLiveSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');

    // Draw camera image
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Burn Anti-Fraud Live Watermark directly onto canvas
    const now = new Date();
    const timeStr = now.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
    });
    const uniqueShotId = Math.random().toString(36).substring(2, 7).toUpperCase();

    // Dark semi-transparent banner at bottom
    ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
    ctx.fillRect(0, canvas.height - 48, canvas.width, 48);

    // Watermark text
    ctx.fillStyle = '#10b981'; // emerald green
    ctx.font = 'bold 16px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('🌿 ECO-BLISTERS VERIFIED LIVE SHOT', 16, canvas.height - 22);

    ctx.fillStyle = '#ffffff';
    ctx.font = '13px monospace';
    ctx.fillText(`${timeStr} IST • #LIVE-${uniqueShotId}`, canvas.width - 320, canvas.height - 22);

    const hash = generateImageHash(canvas);
    const photoDataUrl = canvas.toDataURL('image/jpeg', 0.88);

    stopStream();
    setIsLivePhoto(true);
    setPhotoTimestamp(timeStr);
    setDuplicateWarning(null);

    // Pass data URL and live metadata to parent
    onPhotoCapture(photoDataUrl, {
      isLivePhoto: true,
      timestamp: now.toISOString(),
      hash
    });
  };

  // Handle file upload with anti-duplicate hash check
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setDuplicateWarning(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width || 640;
        canvas.height = img.height || 480;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const hash = generateImageHash(canvas);
        const storedHashes = JSON.parse(localStorage.getItem('ecoblister_submitted_hashes') || '[]');

        if (storedHashes.includes(hash)) {
          setDuplicateWarning('⚠️ Duplicate photo detected! You have already submitted this exact photo before. Please use Live Photography to snap a fresh photo of your actual blister packs.');
          return;
        }

        setIsLivePhoto(false);
        setPhotoTimestamp(new Date().toLocaleString());
        onPhotoCapture(dataUrl, {
          isLivePhoto: false,
          timestamp: new Date().toISOString(),
          hash
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = () => {
    stopStream();
    setIsLivePhoto(false);
    setPhotoTimestamp(null);
    setDuplicateWarning(null);
    onPhotoCapture(null, { isLivePhoto: false, timestamp: null, hash: null });
  };

  return (
    <div className="space-y-3">
      {/* Label and Status */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <Camera className="w-4 h-4 text-emerald-600" />
          {t.cameraLabel || "Blister Pack Photo Verification"}
        </label>
        
        {currentPhoto && (
          <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
            isLivePhoto 
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
              : 'bg-slate-100 text-slate-700 border border-slate-200'
          }`}>
            {isLivePhoto ? <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> : <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />}
            {isLivePhoto ? 'Live Camera Verified' : 'Photo Attached'}
          </span>
        )}
      </div>

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        className="hidden"
      />

      {duplicateWarning && (
        <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900 animate-shake">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold block">Anti-Duplicate Protection</span>
            <span>{duplicateWarning}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setDuplicateWarning(null)} 
            className="text-amber-500 hover:text-amber-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Mode 1: Live Camera Active Viewfinder */}
      {isCameraActive && (
        <div className="relative rounded-2xl overflow-hidden bg-black border-2 border-emerald-500 shadow-xl aspect-video max-h-80">
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full h-full object-cover"
          />

          {/* Viewfinder HUD Overlays */}
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <span className="px-2.5 py-1 bg-red-600/90 text-white rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow">
              <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
              Live Camera Stream
            </span>
            <span className="px-2 py-0.5 bg-black/60 backdrop-blur-md text-emerald-300 rounded-md text-[10px] font-mono font-bold">
              {liveTimer}
            </span>
          </div>

          {/* Targeting Crosshairs & Guidance */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-3/4 h-3/4 border-2 border-dashed border-emerald-400/60 rounded-2xl flex flex-col items-center justify-between p-3">
              <span className="text-[10px] bg-black/60 text-emerald-300 font-bold px-2 py-0.5 rounded-full">
                Center medicine blister foil strips inside frame
              </span>
              <span className="text-[9px] text-white/70">
                Live anti-duplicate timestamp will be watermarked
              </span>
            </div>
          </div>

          {/* Live Action Controls Overlay */}
          <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex items-center justify-between gap-3 z-20">
            <button
              type="button"
              onClick={toggleFacingMode}
              className="p-2.5 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white transition-all cursor-pointer"
              title="Flip Camera (Front/Back)"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Snap Live Photo Button */}
            <button
              type="button"
              onClick={captureLiveSnapshot}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm rounded-full shadow-lg shadow-emerald-500/40 flex items-center gap-2 transform active:scale-95 transition-all cursor-pointer"
            >
              <Camera className="w-4 h-4 text-slate-950" />
              <span>Snap Live Verified Photo</span>
            </button>

            <button
              type="button"
              onClick={stopStream}
              className="p-2.5 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white transition-all cursor-pointer"
              title="Cancel Live Camera"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Mode 2: Photo Captured / Attached Preview */}
      {!isCameraActive && currentPhoto && (
        <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-400/80 bg-slate-950 shadow-md">
          <img
            src={currentPhoto}
            alt="Blister Deposit Evidence"
            className="w-full max-h-64 object-cover"
          />

          {/* Verified Live Badge Overlay */}
          <div className="absolute top-2 left-2 flex items-center gap-1.5">
            {isLivePhoto ? (
              <span className="px-2.5 py-1 bg-emerald-600 text-white text-[10px] font-black uppercase rounded-full shadow flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
                Live Camera Verified Shot
              </span>
            ) : (
              <span className="px-2.5 py-1 bg-slate-800 text-slate-200 text-[10px] font-bold rounded-full shadow flex items-center gap-1">
                <Upload className="w-3 h-3 text-emerald-400" />
                Gallery Upload
              </span>
            )}
            {photoTimestamp && (
              <span className="px-2 py-0.5 bg-black/70 text-slate-300 text-[9px] font-mono rounded-md hidden sm:inline">
                {photoTimestamp}
              </span>
            )}
          </div>

          {/* Action Bar */}
          <div className="absolute top-2 right-2 flex items-center gap-1.5">
            <button
              type="button"
              onClick={startCamera}
              className="p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-xl text-xs backdrop-blur-md transition-colors cursor-pointer"
              title="Retake Live Photo"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="p-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded-xl text-xs backdrop-blur-md transition-colors cursor-pointer"
              title="Remove Photo"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Mode 3: Selection Buttons (When no photo or camera not active) */}
      {!isCameraActive && !currentPhoto && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Button 1: Live Photography (Direct Camera with Live Anti-Duplicate Watermark) */}
          <button
            type="button"
            onClick={startCamera}
            className="p-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl shadow-md flex items-center justify-center gap-2 text-xs sm:text-sm font-bold transition-all transform active:scale-98 cursor-pointer"
          >
            <Camera className="w-4 h-4 text-amber-300" />
            <span>Live Photography</span>
            <span className="text-[9px] bg-white/20 px-1.5 py-0.5 rounded-full font-black uppercase">
              Live Feed
            </span>
          </button>

          {/* Button 2: Upload File / Gallery */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl border border-slate-200 flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4 text-emerald-600" />
            <span>Upload Photo File</span>
          </button>
        </div>
      )}

      {cameraError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{cameraError}</span>
        </div>
      )}

      <p className="text-[11px] text-slate-500 flex items-center gap-1 pt-0.5">
        <Sparkles className="w-3 h-3 text-emerald-600" />
        Live photography burns a verified timestamp onto the image to ensure authentic, non-duplicate blister waste recovery.
      </p>
    </div>
  );
}
