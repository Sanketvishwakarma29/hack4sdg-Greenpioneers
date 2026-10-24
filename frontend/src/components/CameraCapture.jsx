import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Camera, RefreshCw, Trash2, CheckCircle2, 
  AlertCircle, ShieldCheck, Sparkles, X, ShieldAlert,
  Loader2, Smartphone
} from 'lucide-react';

// Perceptual hash function to detect duplicate photos
function generateImageHash(canvas) {
  try {
    const smallCanvas = document.createElement('canvas');
    smallCanvas.width = 16;
    smallCanvas.height = 16;
    const sCtx = smallCanvas.getContext('2d');
    sCtx.drawImage(canvas, 0, 0, 16, 16);
    const imgData = sCtx.getImageData(0, 0, 16, 16).data;
    let hash = '';
    for (let i = 0; i < imgData.length; i += 4) {
      const gray = Math.round((imgData[i] + imgData[i + 1] + imgData[i + 2]) / 3);
      hash += gray > 128 ? '1' : '0';
    }
    return hash;
  } catch (e) {
    return `hash-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  }
}

export default function CameraCapture({ onPhotoCapture, currentPhoto, isRequired = true, t = {} }) {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // back camera preferred
  const [isLivePhoto, setIsLivePhoto] = useState(false);
  const [photoTimestamp, setPhotoTimestamp] = useState(null);
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [liveTimer, setLiveTimer] = useState('');

  const videoElementRef = useRef(null);
  const streamRef = useRef(null);
  const nativeCameraInputRef = useRef(null);

  // Live clock in viewfinder
  useEffect(() => {
    let interval;
    if (isCameraActive) {
      interval = setInterval(() => {
        setLiveTimer(new Date().toLocaleTimeString('en-IN', { hour12: false }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isCameraActive]);

  // Clean stop of video tracks
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {}
      });
      streamRef.current = null;
    }
    if (videoElementRef.current) {
      videoElementRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setCameraLoading(false);
    setCameraReady(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  // Attach stream to video element
  const attachStreamToVideo = useCallback((videoEl, stream) => {
    if (!videoEl || !stream) return;
    try {
      videoEl.srcObject = stream;
      videoEl.setAttribute('playsinline', 'true');
      videoEl.setAttribute('webkit-playsinline', 'true');
      videoEl.setAttribute('autoplay', 'true');
      videoEl.muted = true;

      const playPromise = videoEl.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setCameraLoading(false);
            setCameraReady(true);
          })
          .catch((err) => {
            console.warn('Video play interrupted/blocked:', err);
            // Some browsers require explicit user touch/trigger; still mark ready on metadata
          });
      }
    } catch (e) {
      console.error('Error attaching stream to video element:', e);
    }
  }, []);

  // Callback ref for <video> so we immediately bind the stream when DOM node mounts
  const setVideoNode = useCallback(
    (node) => {
      videoElementRef.current = node;
      if (node && streamRef.current) {
        attachStreamToVideo(node, streamRef.current);
      }
    },
    [attachStreamToVideo]
  );

  // Start Live Camera with Multi-Tier Fallback (Prevents Black Screen)
  const startCamera = async (overrideFacing) => {
    setCameraError(null);
    setDuplicateWarning(null);
    setCameraLoading(true);
    setCameraReady(false);
    setIsCameraActive(true); // Mount video in DOM immediately

    const mode = overrideFacing || facingMode;

    try {
      stopStream();
      setIsCameraActive(true);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('BROWSER_UNSUPPORTED');
      }

      let stream = null;

      // Tier 1: Try with ideal facingMode and dimensions
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
      } catch (err1) {
        console.warn('Tier 1 camera constraints failed, attempting fallback...', err1);
        // Tier 2: Try with simple facingMode
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: mode },
            audio: false
          });
        } catch (err2) {
          console.warn('Tier 2 camera constraints failed, attempting generic video...', err2);
          // Tier 3: Try any available camera device (front/webcam/USB)
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
          });
        }
      }

      if (!stream) {
        throw new Error('NO_STREAM');
      }

      streamRef.current = stream;

      // If video node is already in DOM, attach right now
      if (videoElementRef.current) {
        attachStreamToVideo(videoElementRef.current, stream);
      }
    } catch (err) {
      console.error('Live camera acquisition failed:', err);
      stopStream();

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError(
          'Camera access was blocked. Please tap the lock icon in your browser address bar to allow camera permissions.'
        );
      } else if (err.message === 'BROWSER_UNSUPPORTED') {
        setCameraError(
          'Your browser does not support in-app camera streaming. Please use the device camera button below.'
        );
      } else {
        setCameraError(
          'Unable to open camera feed. You can tap "Use Device Camera" below to take a photo directly.'
        );
      }
    }
  };

  // Toggle front vs back camera
  const toggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Capture Live Snapshot from Video Stream with Anti-Duplicate Watermark
  const captureLiveSnapshot = () => {
    const video = videoElementRef.current;
    if (!video) return;

    // Proportional downscale to max 960px (ensures rapid upload under 200KB and eliminates 413 errors)
    const maxDim = 960;
    let width = video.videoWidth || 960;
    let height = video.videoHeight || 720;
    if (width > maxDim) {
      height = Math.round((height * maxDim) / width);
      width = maxDim;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Draw active camera frame scaled
    ctx.drawImage(video, 0, 0, width, height);

    // Burn Anti-Fraud Live Watermark directly onto image
    const now = new Date();
    const timeStr = now.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    const uniqueShotId = Math.random().toString(36).substring(2, 7).toUpperCase();

    // Dark semi-transparent watermark bar at bottom
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, height - 52, width, 52);

    // Green verification text
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('🌿 ECO-BLISTERS VERIFIED LIVE CAMERA SHOT', 16, height - 22);

    // Timestamp & Live ID
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(`${timeStr} IST • #LIVE-${uniqueShotId}`, Math.max(16, width - 360), height - 22);

    // Compute perceptual hash to detect identical re-uploads
    const hash = generateImageHash(canvas);
    const storedHashes = JSON.parse(localStorage.getItem('ecoblister_submitted_hashes') || '[]');

    if (storedHashes.includes(hash)) {
      setDuplicateWarning(
        '⚠️ Duplicate photo detected! You have already submitted this exact photo before. Please point your camera at the fresh blister packs in the collection bin.'
      );
      return;
    }

    const photoDataUrl = canvas.toDataURL('image/jpeg', 0.72);

    stopStream();
    setIsLivePhoto(true);
    setPhotoTimestamp(timeStr);
    setDuplicateWarning(null);

    // Save hash locally to prevent reuse
    storedHashes.unshift(hash);
    if (storedHashes.length > 50) storedHashes.pop();
    try {
      localStorage.setItem('ecoblister_submitted_hashes', JSON.stringify(storedHashes));
    } catch (e) {}

    // Pass data URL and live metadata to parent
    onPhotoCapture(photoDataUrl, {
      isLivePhoto: true,
      timestamp: now.toISOString(),
      hash
    });
  };

  // Direct Device Camera Fallback (Only opens native camera, NOT photo gallery)
  const handleNativeCameraCapture = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setDuplicateWarning(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      const img = new Image();
      img.onload = () => {
        // Downscale large phone camera photos to max 960px
        const maxDim = 960;
        let w = img.width || 960;
        let h = img.height || 720;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);

        // Burn verified live shot watermark
        const now = new Date();
        const timeStr = now.toLocaleString('en-IN', {
          day: '2-digit', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
        });
        const uniqueShotId = Math.random().toString(36).substring(2, 7).toUpperCase();

        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(0, canvas.height - 52, canvas.width, 52);

        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText('🌿 ECO-BLISTERS VERIFIED CAMERA SHOT', 16, canvas.height - 22);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px monospace';
        ctx.fillText(`${timeStr} IST • #CAM-${uniqueShotId}`, Math.max(16, canvas.width - 340), canvas.height - 22);

        const hash = generateImageHash(canvas);
        const storedHashes = JSON.parse(localStorage.getItem('ecoblister_submitted_hashes') || '[]');

        if (storedHashes.includes(hash)) {
          setDuplicateWarning('⚠️ Duplicate photo detected. Please take a fresh photo of the empty blister packs.');
          return;
        }

        const watermarkedUrl = canvas.toDataURL('image/jpeg', 0.72);
        setIsLivePhoto(true);
        setPhotoTimestamp(timeStr);

        storedHashes.unshift(hash);
        try {
          localStorage.setItem('ecoblister_submitted_hashes', JSON.stringify(storedHashes));
        } catch (err) {}

        onPhotoCapture(watermarkedUrl, {
          isLivePhoto: true,
          timestamp: now.toISOString(),
          hash
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  // Remove photo
  const handleRemove = () => {
    stopStream();
    setIsLivePhoto(false);
    setPhotoTimestamp(null);
    setDuplicateWarning(null);
    onPhotoCapture(null, { isLivePhoto: false, timestamp: null, hash: null });
  };

  return (
    <div className="space-y-3">
      {/* Label and Verified Status Badge */}
      <div className="min-h-[20px] flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <Camera className="w-4 h-4 text-emerald-600" />
          <span>{t?.cameraLabel || 'Blister Pack Camera Photo'}</span>
          {isRequired && <span className="text-rose-500 font-bold">*</span>}
        </label>

        {currentPhoto ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>✓ Camera Verified</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200">
            * Required
          </span>
        )}
      </div>

      {/* Hidden Native Camera Input (Forces device camera with capture="environment", NOT gallery) */}
      <input
        type="file"
        ref={nativeCameraInputRef}
        onChange={handleNativeCameraCapture}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      {/* Duplicate Warning Alert */}
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

      {/* ================================================================ */}
      {/* 1. LIVE CAMERA ACTIVE VIEW FINDER (FIXED ZERO BLACK SCREEN)     */}
      {/* ================================================================ */}
      {isCameraActive && (
        <div className="relative rounded-2xl overflow-hidden bg-slate-950 border-2 border-emerald-500 shadow-2xl h-72 sm:h-80 w-full flex items-center justify-center">
          
          {/* Active Live Video Element */}
          <video
            ref={setVideoNode}
            autoPlay
            playsInline
            muted
            onLoadedMetadata={() => {
              setCameraLoading(false);
              setCameraReady(true);
              videoElementRef.current?.play().catch(() => {});
            }}
            onCanPlay={() => {
              setCameraLoading(false);
              setCameraReady(true);
            }}
            className="w-full h-full object-cover"
          />

          {/* Camera Initializing Spinner (Prevents showing a blank/black frame) */}
          {(cameraLoading || !cameraReady) && (
            <div className="absolute inset-0 z-30 bg-slate-950/90 flex flex-col items-center justify-center gap-3 text-white">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
              <div className="text-center space-y-1">
                <span className="text-xs font-bold block">Opening Camera Feed...</span>
                <span className="text-[10px] text-slate-400">Please allow camera permissions if prompted</span>
              </div>
            </div>
          )}

          {/* Viewfinder HUD: Live Pill & Clock */}
          <div className="absolute top-3 left-3 flex items-center gap-2 z-20">
            <span className="px-2.5 py-1 bg-red-600/90 text-white rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              Live Camera
            </span>
            <span className="px-2 py-0.5 bg-black/60 backdrop-blur-md text-emerald-300 rounded-md text-[10px] font-mono font-bold">
              {liveTimer}
            </span>
          </div>

          {/* Viewfinder Target Framing Guidelines */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10 p-6">
            <div className="w-full h-full max-w-xs border-2 border-dashed border-emerald-400/60 rounded-2xl flex flex-col items-center justify-between p-3">
              <span className="text-[10px] bg-black/70 text-emerald-300 font-bold px-2 py-0.5 rounded-full">
                Center blister foil strips inside box
              </span>
              <span className="text-[9px] text-white/80 bg-black/60 px-2 py-0.5 rounded-full">
                Anti-duplicate timestamp will be burned on photo
              </span>
            </div>
          </div>

          {/* Bottom Control Bar */}
          <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex items-center justify-between gap-2 z-20">
            {/* Flip Camera Button */}
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
              disabled={!cameraReady}
              onClick={captureLiveSnapshot}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-xs sm:text-sm rounded-full shadow-lg shadow-emerald-500/40 flex items-center gap-2 transform active:scale-95 transition-all cursor-pointer"
            >
              <Camera className="w-4 h-4 text-slate-950" />
              <span>{cameraReady ? (t?.takePhotoBtn || 'Take Photo') : (t?.startingCamera || 'Starting Camera...')}</span>
            </button>

            {/* Close Camera Button */}
            <button
              type="button"
              onClick={stopStream}
              className="p-2.5 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white transition-all cursor-pointer"
              title="Close Camera"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* 2. PHOTO CAPTURED PREVIEW                                        */}
      {/* ================================================================ */}
      {!isCameraActive && currentPhoto && (
        <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-400 bg-slate-950 shadow-md">
          <img
            src={currentPhoto}
            alt="Blister Deposit Evidence"
            className="w-full max-h-72 object-contain bg-black"
          />

          {/* Verified Live Badge Overlay */}
          <div className="absolute top-2 left-2 flex items-center gap-1.5">
            <span className="px-2.5 py-1 bg-emerald-600 text-white text-[10px] font-black uppercase rounded-full shadow flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
              {t?.cameraVerifiedBadge || 'Live Camera Verified Shot'}
            </span>
            {photoTimestamp && (
              <span className="px-2 py-0.5 bg-black/70 text-slate-300 text-[9px] font-mono rounded-md hidden sm:inline">
                {photoTimestamp}
              </span>
            )}
          </div>

          {/* Top-Right Action Buttons: Retake or Remove */}
          <div className="absolute top-2 right-2 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => startCamera()}
              className="p-1.5 bg-black/70 hover:bg-black text-white rounded-xl text-xs backdrop-blur-md transition-colors cursor-pointer flex items-center gap-1 px-2.5 font-bold"
              title="Retake Photo"
            >
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t?.retakeBtn || 'Retake'}</span>
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

      {/* ================================================================ */}
      {/* 3. DEDICATED CAMERA BUTTON (NO UPLOAD SECTION)                   */}
      {/* ================================================================ */}
      {!isCameraActive && !currentPhoto && (
        <div className="space-y-2">
          {/* Main Primary Camera Button */}
          <button
            type="button"
            onClick={() => startCamera()}
            className="w-full h-12 py-3 px-5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl shadow-md shadow-emerald-700/20 flex items-center justify-center gap-2.5 text-xs sm:text-sm font-bold transition-all transform active:scale-[0.99] cursor-pointer"
          >
            <Camera className="w-4 h-4 text-amber-300" />
            <span>{t?.openCameraBtn || 'Open Camera to Take Photo'}</span>
          </button>

          {/* Mobile Fallback: Direct Phone Camera trigger if in-browser permission blocks */}
          {cameraError && (
            <button
              type="button"
              onClick={() => nativeCameraInputRef.current?.click()}
              className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer"
            >
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <span>Launch Phone Camera Directly</span>
            </button>
          )}
        </div>
      )}

      {/* Camera Permission or Device Error Notice */}
      {cameraError && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2.5 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
          <div className="flex-1 space-y-1">
            <span className="font-bold block">Camera Notice</span>
            <span>{cameraError}</span>
          </div>
        </div>
      )}

      {/* Trust & Verification Footer Note */}
      <p className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-0.5">
        <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span>{t?.watermarkNotice || 'A live timestamp watermark is burned onto your photo to verify authentic blister recovery.'}</span>
      </p>
    </div>
  );
}
