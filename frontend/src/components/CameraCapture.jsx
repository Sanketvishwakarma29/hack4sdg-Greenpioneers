import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, Trash2, Video, Upload, CheckCircle2, AlertCircle } from 'lucide-react';

export default function CameraCapture({ onPhotoCapture, currentPhoto, t }) {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // back camera preferred
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

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

  // Start video stream
  const startCamera = async () => {
    setCameraError(null);
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
      setCameraError('Unable to access camera. Please allow permission or upload an image file.');
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

  // Take snapshot from video feed
  const captureSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const photoDataUrl = canvas.toDataURL('image/jpeg', 0.85);

    stopStream();
    onPhotoCapture(photoDataUrl);
  };

  // Handle manual file upload (gallery or camera fallback)
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      onPhotoCapture(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <Camera className="w-4 h-4 text-emerald-600" />
          {t.cameraLabel}
        </label>
        {currentPhoto && (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5" /> Photo Attached
          </span>
        )}
      </div>

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      {/* Case 1: Live Camera Active */}
      {isCameraActive && (
        <div className="relative rounded-2xl overflow-hidden bg-black border-2 border-emerald-500 shadow-lg aspect-video max-h-72">
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          {/* Controls overlay */}
          <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={toggleFacingMode}
              className="p-2.5 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white transition-all"
              title="Flip Camera"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={captureSnapshot}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-full shadow-lg shadow-emerald-500/40 flex items-center gap-2 transform active:scale-95 transition-all"
            >
              <Camera className="w-5 h-5" />
              <span>{t.captureBtn}</span>
            </button>
            <button
              type="button"
              onClick={stopStream}
              className="px-3 py-2 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-medium backdrop-blur-md transition-all"
            >
              {t.closeCameraBtn}
            </button>
          </div>
        </div>
      )}

      {/* Case 2: Photo is already captured */}
      {!isCameraActive && currentPhoto && (
        <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 group shadow-sm max-h-72">
          <img
            src={currentPhoto}
            alt="Bin Evidence"
            className="w-full h-56 object-cover"
          />
          <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={startCamera}
              className="px-4 py-2 bg-white/90 hover:bg-white text-slate-800 rounded-xl font-medium text-xs shadow flex items-center gap-1.5 transition-all"
            >
              <RefreshCw className="w-4 h-4 text-emerald-600" />
              {t.retakeBtn}
            </button>
            <button
              type="button"
              onClick={() => onPhotoCapture(null)}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium text-xs shadow flex items-center gap-1.5 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              {t.removePhotoBtn}
            </button>
          </div>
        </div>
      )}

      {/* Case 3: No photo, Camera closed */}
      {!isCameraActive && !currentPhoto && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={startCamera}
            className="p-4 rounded-2xl border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50 transition-all flex flex-col items-center justify-center text-center group cursor-pointer"
          >
            <div className="p-3 bg-emerald-100 group-hover:bg-emerald-200 text-emerald-700 rounded-full mb-2 transition-colors">
              <Camera className="w-6 h-6" />
            </div>
            <span className="font-semibold text-xs sm:text-sm text-slate-800">{t.takePhotoBtn}</span>
            <span className="text-[11px] text-slate-500 mt-0.5">Use device camera live</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-4 rounded-2xl border-2 border-dashed border-slate-300 hover:border-slate-400 bg-slate-50 hover:bg-slate-100 transition-all flex flex-col items-center justify-center text-center group cursor-pointer"
          >
            <div className="p-3 bg-slate-200 group-hover:bg-slate-300 text-slate-700 rounded-full mb-2 transition-colors">
              <Upload className="w-6 h-6" />
            </div>
            <span className="font-semibold text-xs sm:text-sm text-slate-800">{t.uploadFileBtn}</span>
            <span className="text-[11px] text-slate-500 mt-0.5">Choose from phone gallery</span>
          </button>
        </div>
      )}

      {cameraError && (
        <div className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>{cameraError}</span>
        </div>
      )}
    </div>
  );
}
