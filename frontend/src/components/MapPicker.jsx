import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Navigation, Crosshair, CheckCircle2, Loader2 } from 'lucide-react';

// Custom Leaflet Pin Icon (SVG)
const customBinIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36" fill="%2310b981"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/><path d="M9 7h6v1H9zm1 2h4v1h-4z" fill="%23ffffff"/></svg>',
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -32]
});

// Component to handle map clicks & center changes
function LocationMarker({ position, onPositionChange }) {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.setView([position.lat, position.lng], map.getZoom());
    }
  }, [position, map]);

  useMapEvents({
    click(e) {
      onPositionChange(e.latlng.lat, e.latlng.lng);
    },
  });

  return position === null ? null : (
    <Marker position={[position.lat, position.lng]} icon={customBinIcon} />
  );
}

export default function MapPicker({ latitude, longitude, address, onLocationChange, t }) {
  const [detecting, setDetecting] = useState(false);
  const [geoLocked, setGeoLocked] = useState(false);

  // Reverse geocode to get human address
  const fetchAddress = async (lat, lng) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.display_name) {
          const shortAddr = data.address?.road 
            ? `${data.address.road}, ${data.address.suburb || data.address.city || ''}`
            : data.display_name.split(',').slice(0, 3).join(',');
          return shortAddr;
        }
      }
    } catch (e) {
      console.warn('Reverse geocoding failed:', e);
    }
    return `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
  };

  const handlePositionChange = async (lat, lng) => {
    const detectedAddr = await fetchAddress(lat, lng);
    onLocationChange({
      latitude: lat,
      longitude: lng,
      address: detectedAddr
    });
    setGeoLocked(true);
  };

  // Detect GPS
  const detectGpsLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const detectedAddr = await fetchAddress(lat, lng);
        onLocationChange({
          latitude: lat,
          longitude: lng,
          address: detectedAddr
        });
        setDetecting(false);
        setGeoLocked(true);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setDetecting(false);
        // Fallback default
        onLocationChange({
          latitude: 19.0760,
          longitude: 72.8777,
          address: 'Default City Center (GPS permission denied)'
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    // Auto-detect on first load if default
    if (!latitude || !longitude) {
      detectGpsLocation();
    }
  }, []);

  const currentLat = latitude || 19.0760;
  const currentLng = longitude || 72.8777;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-emerald-600" />
          {t.locationLabel} <span className="text-red-500">*</span>
        </label>
        <button
          type="button"
          onClick={detectGpsLocation}
          disabled={detecting}
          className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-full font-medium text-xs flex items-center gap-1.5 border border-emerald-200 transition-colors shadow-sm"
        >
          {detecting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : geoLocked ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          ) : (
            <Crosshair className="w-3.5 h-3.5" />
          )}
          <span>{detecting ? 'Locating GPS...' : geoLocked ? t.locationDetected : t.detectLocationBtn}</span>
        </button>
      </div>

      {/* Map View */}
      <div className="h-56 w-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm relative z-0">
        <MapContainer
          center={[currentLat, currentLng]}
          zoom={15}
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker
            position={{ lat: currentLat, lng: currentLng }}
            onPositionChange={handlePositionChange}
          />
        </MapContainer>
      </div>

      {/* Pin Coordinates Row - Clean natural flow, prevents text overlap */}
      <div className="flex items-center justify-between text-[11px] text-slate-600 bg-slate-100/80 px-3 py-1.5 rounded-xl border border-slate-200">
        <span className="font-mono font-medium text-emerald-700 flex items-center gap-1">
          📍 GPS: {currentLat.toFixed(5)}° N, {currentLng.toFixed(5)}° E
        </span>
        <span className="text-[10px] text-slate-400 hidden sm:inline">
          Tap or drag marker to calibrate pin
        </span>
      </div>

      {/* Address / Landmark Field */}
      <div className="space-y-1.5">
        <div className="min-h-[20px] flex items-center">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
            {t.addressLabel || 'Address / Landmark'}
          </label>
        </div>
        <input
          type="text"
          value={address || ''}
          onChange={(e) => onLocationChange({ latitude: currentLat, longitude: currentLng, address: e.target.value })}
          placeholder={t.addressPlaceholder}
          className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#bef264] focus:border-emerald-500 transition-all shadow-xs"
        />
      </div>
    </div>
  );
}
