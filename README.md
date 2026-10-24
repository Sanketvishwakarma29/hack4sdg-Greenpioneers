# EcoBin - Smart Municipal Waste Reporting & Android Fleet Real-Time App

An end-to-end Smart Waste Management platform built for Hackathons:
1. **Citizen Web Portal**: Scannable via QR code on any mobile phone or browser. Citizens submit reports with live GPS, camera capture, multi-language speech-to-text, date/time, and instant tracking tokens.
2. **Android Driver / Collector App**: Real-time fleet control system that receives live bin alerts with sound chimes, interactive map radar, turn-by-turn navigation, and status updating (`Pending` ➔ `Assigned` ➔ `In Progress` ➔ `Cleaned`).
3. **Real-time Backend (Socket.IO + Express)**: Instant bi-directional synchronization between the web page and Android devices.

---

## 🌟 Key Features

### 1. Web Portal (Citizen Reporting)
- **Live QR Code Generator**: Modal displaying a scannable QR code of the web portal and Android driver app pointing to your Wi-Fi LAN IP (`http://10.54.179.36:5173`) so anyone can scan and test instantly on their phone.
- **Bin ID Identification**: Quick preset selection (`BIN-104`, `BIN-204`, `BIN-312`) or custom Bin ID entry.
- **Waste Category**: Categorize as Plastic & Recyclable, Organic / Wet, E-Waste / Hazardous, General Mixed, or Biomedical.
- **Severity / Fill Level**: Visual percentage levels (25%, 50%, 75%, 100% Overflowing).
- **Date & Time Picker**: Auto-populated with current moment, editable.
- **Live Camera**: Direct browser camera capture with front/back camera switching or phone photo upload.
- **Live Geolocation & Map**: OpenStreetMap Leaflet integration with one-click "Detect Current GPS" and reverse geocoding address lookup.
- **Multi-Language Support (i18n)**: Instant switcher for 6 languages:
  - English 🇺🇸
  - हिन्दी (Hindi) 🇮🇳
  - मराठी (Marathi) 🇮🇳
  - Español (Spanish) 🇪🇸
  - Français (French) 🇫🇷
  - ગુજરાતી (Gujarati) 🇮🇳
- **Web Audio Assistance**:
  - **Speech-to-Text**: Dictate complaint / notes by speaking into the microphone in any supported language.
  - **Text-to-Speech**: Spoken audio guide instructions read aloud in the selected language.
  - **Synthesized Audio Chimes**: Web Audio sound effects on submission and alerts.
- **Unique Token Generation**:
  - Automatically generates a unique tracking token (e.g. `BIN-89K2-201`) with celebration confetti!
  - Dedicated Token Tracking Screen with a scannable token QR code and a 4-step live progress stepper.

### 2. Android App (Municipal Fleet & Driver)
- **Instant Real-Time Sync**: Socket.IO connects the web page and Android app. Submitting on the web triggers an immediate alert in the app!
- **In-App & Audio Notifications**: Audio chime + animated banner when new bins need pickup.
- **Live GPS Map & Radar**: Color-coded bin markers (Red = Urgent, Amber = In Progress, Green = Cleaned) plus driver location marker.
- **Turn-by-Turn Navigation**: One-tap button opens Google Maps navigation to exact bin coordinates.
- **Status Tracker Actions**: Update bin status with one tap. Changes reflect instantly on the Citizen's tracker!
- **Dual Android Modes**:
  1. Accessible via browser/PWA on Android (`/#driver`) with optional Android phone mockup preview.
  2. Native React Native Expo project in `mobile-expo-android/`.

---

## 🚀 How to Run the Project

### Option 1: Start Both Backend and Web Portal Together
```bash
# In the project root directory:
./start.sh
```
Or:
```bash
# Terminal 1: Backend Server (Port 5001)
cd backend
node server.js

# Terminal 2: Frontend Web Portal (Port 5173)
cd frontend
npm run dev
```

### URLs:
- **Citizen Web Portal**: `http://localhost:5173`
- **Network Mobile URL**: `http://10.54.179.36:5173`
- **Android Driver App**: `http://localhost:5173/#driver` (or click "Android Driver App" in navbar)
- **Backend API & Sockets**: `http://localhost:5001`

---

## 📱 Testing on Your Android Phone

1. Make sure your phone is connected to the same Wi-Fi network as this computer.
2. Open `http://localhost:5173` on your laptop and click **"📱 Scan QR on Phone"** in the top navbar.
3. Open your phone's camera and scan the QR code to open the reporting portal!
4. Submit a report with photo and voice note on your phone, and watch it appear in real-time on the Android Driver app!
