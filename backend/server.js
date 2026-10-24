const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const QRCode = require('qrcode');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH']
  }
});

const PORT = process.env.PORT || 5001;
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'reports.json');
const PARTNER_FILE = path.join(DATA_DIR, 'partner_recovery.json');
const REDEMPTIONS_FILE = path.join(DATA_DIR, 'redemptions.json');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `blister-${Date.now()}-${Math.round(Math.random() * 1e4)}${ext}`);
  }
});
const upload = multer({ storage });

// Helper: Get local LAN IP
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  if (interfaces['en0']) {
    for (const iface of interfaces['en0']) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const LOCAL_IP = getLocalIp();

// Helper: Calculate discount percentage strictly based on strips count
function calculateDiscountFromStrips(stripCountStr, exactCountNum) {
  let count = Number(exactCountNum);
  if (isNaN(count) || count <= 0) {
    const str = String(stripCountStr || '');
    if (str.includes('30+')) count = 35;
    else if (str.includes('16')) count = 20;
    else if (str.includes('6')) count = 10;
    else count = 4;
  }

  // Tiered discount formula:
  // 1-5 strips: 10%
  // 6-15 strips: 15%
  // 16-30 strips: 20%
  // 31+ strips: 25%
  if (count >= 31) return 25;
  if (count >= 16) return 20;
  if (count >= 6) return 15;
  return 10;
}

// Helper: Generate tracking token & pharmacy promo code
function generateToken() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 4; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const dateStr = Date.now().toString().slice(-3);
  return `ECO-${rand}-${dateStr}`;
}

function generatePromoCode(discountPercent = 15) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ3456789';
  let rand = '';
  for (let i = 0; i < 4; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `ECOBLISTER-${discountPercent}OFF-${rand}`;
}

// Seed initial reports if DB file doesn't exist
function loadReports() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading reports file:', err);
  }

  // Pre-seeded demo reports for Bengaluru hospitals & pharmacies
  const seedReports = [
    {
      id: 'rep-seed-1',
      token: 'ECO-K9X-201',
      promoCode: 'ECOBLISTER-20OFF-M81B',
      binId: 'Apollo Pharmacy - Indiranagar 100ft Rd',
      materialType: 'PVC / PVDC Transparent + Aluminum Foil',
      stripCount: '16 – 30 Strips',
      latitude: 12.9716,
      longitude: 77.6412,
      address: '100 Feet Road, HAL 2nd Stage, Indiranagar, Bengaluru',
      date: new Date(Date.now() - 3600000 * 2).toISOString(),
      status: 'In Progress',
      notes: 'Paracetamol and antibiotic empty blister strips deposited in store collection box.',
      photoUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=60',
      assignedDriver: 'Kiran Kumar (Logistics Van #03)',
      discountPercentage: 20,
      partnerPharmacy: 'Apollo Pharmacy Bengaluru Network',
      history: [
        { status: 'Pending', time: new Date(Date.now() - 3600000 * 2).toISOString(), note: 'Deposited in Pharmacy Collection Bin' },
        { status: 'Assigned', time: new Date(Date.now() - 3600000 * 1.5).toISOString(), note: 'Assigned to Eco-Blisters Van #03' },
        { status: 'In Progress', time: new Date(Date.now() - 3600000 * 0.5).toISOString(), note: 'In transit to Material Recovery Facility' }
      ]
    },
    {
      id: 'rep-seed-2',
      token: 'ECO-H3A-812',
      promoCode: 'ECOBLISTER-15OFF-T44K',
      binId: 'Victoria Hospital - Fort Road OPD Counter',
      materialType: 'Alu-Alu Blister Foil (Cold Form Opaque)',
      stripCount: '30+ Bulk Strips',
      latitude: 12.9634,
      longitude: 77.5756,
      address: 'Near OPD Counter 3, Victoria Hospital, Kalasipalyam, Bengaluru',
      date: new Date(Date.now() - 3600000 * 5).toISOString(),
      status: 'Pending',
      notes: 'Monthly prescription empty tablet foils deposited after outpatient consultation.',
      photoUrl: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=500&auto=format&fit=crop&q=60',
      assignedDriver: null,
      discountPercentage: 15,
      partnerPharmacy: 'Victoria Hospital Med Store & MedPlus',
      history: [
        { status: 'Pending', time: new Date(Date.now() - 3600000 * 5).toISOString(), note: 'Deposited in Hospital Drop-box' }
      ]
    },
    {
      id: 'rep-seed-3',
      token: 'ECO-M7V-459',
      promoCode: 'ECOBLISTER-25OFF-R99Z',
      binId: 'Manipal Hospital - Old Airport Road',
      materialType: 'High-Barrier Aclar / Alu Pharmaceutical Strip',
      stripCount: '6 – 15 Strips',
      latitude: 12.9592,
      longitude: 77.6534,
      address: 'Near Main Pharmacy Hall, 98 HAL Old Airport Rd, Kodihalli, Bengaluru',
      date: new Date(Date.now() - 3600000 * 8).toISOString(),
      status: 'Resolved',
      notes: 'Cardiac and diabetic tablet packaging foils safely deposited.',
      photoUrl: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=500&auto=format&fit=crop&q=60',
      assignedDriver: 'Anand Gowda (Van #01)',
      resolutionPhotoUrl: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=500&auto=format&fit=crop&q=60',
      discountPercentage: 25,
      partnerPharmacy: 'Manipal Hospital Chemist & Wellness Forever',
      history: [
        { status: 'Pending', time: new Date(Date.now() - 3600000 * 8).toISOString(), note: 'Deposited in Collection Box' },
        { status: 'Assigned', time: new Date(Date.now() - 3600000 * 7).toISOString(), note: 'Collected by Logistics Team' },
        { status: 'In Progress', time: new Date(Date.now() - 3600000 * 6).toISOString(), note: 'Arrived at Recovery Facility' },
        { status: 'Resolved', time: new Date(Date.now() - 3600000 * 4).toISOString(), note: 'Foil separated & recycled into raw aluminum ingots & polymer' }
      ]
    }
  ];

  saveReports(seedReports);
  return seedReports;
}

function saveReports(reports) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(reports, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving reports file:', err);
  }
}

let reports = loadReports();

// Helper: Load & Save Partner Recovery Records
function loadPartnerRecords() {
  try {
    if (fs.existsSync(PARTNER_FILE)) {
      return JSON.parse(fs.readFileSync(PARTNER_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error loading partner records:', e);
  }

  const seed = [
    {
      id: 'rec-batch-2026-10-04',
      batchId: 'REC-BLISTER-2026-104',
      date: new Date(Date.now() - 3600000 * 3).toISOString(), // 3 hours ago
      facilityName: 'EcoMetals Hydrometallurgical Refinery Hub (Peenya Industrial Area, Bengaluru)',
      operatorName: 'Rajesh Varma (Lead Metallurgy Engineer)',
      materialType: 'Alu-Alu Blister Foil (Cold Form Opaque)',
      sourceHub: 'Victoria Hospital & Bowring Hospital Aggregate',
      inflowKg: 142.5,
      recycledAluminumKg: 45.6,
      recycledPolymerKg: 94.2,
      residueKg: 2.7,
      recoveryEfficiencyPercent: 98.1,
      purityGrade: '99.2% Secondary Aluminum Ingot Quality',
      notes: 'Delamination solvent recovery cycle #44 completed. 0% toxic gas emission.'
    },
    {
      id: 'rec-batch-2026-10-03',
      batchId: 'REC-BLISTER-2026-103',
      date: new Date(Date.now() - 3600000 * 10).toISOString(), // 10 hours ago
      facilityName: 'EcoMetals Hydrometallurgical Refinery Hub (Peenya Industrial Area, Bengaluru)',
      operatorName: 'Anita Deshmukh (Recovery Specialist)',
      materialType: 'PVC / PVDC Transparent + Aluminum Foil',
      sourceHub: 'Apollo Pharmacy & MedPlus Indiranagar Collection',
      inflowKg: 198.0,
      recycledAluminumKg: 63.4,
      recycledPolymerKg: 130.8,
      residueKg: 3.8,
      recoveryEfficiencyPercent: 98.0,
      purityGrade: '99.4% Aluminum Flakes + Clean PVC Granulate',
      notes: 'High-purity PVC granulate sent to industrial conduit pipe manufacturer.'
    },
    {
      id: 'rec-batch-2026-10-02',
      batchId: 'REC-BLISTER-2026-102',
      date: new Date(Date.now() - 86400000).toISOString(), // Yesterday
      facilityName: 'EcoMetals Hydrometallurgical Refinery Hub (Peenya Industrial Area, Bengaluru)',
      operatorName: 'Suresh Patil (Refinery Supervisor)',
      materialType: 'High-Barrier Aclar / Alu Pharmaceutical Strip',
      sourceHub: 'Manipal Hospital & Fortis Hospital Consignment',
      inflowKg: 220.0,
      recycledAluminumKg: 70.4,
      recycledPolymerKg: 145.2,
      residueKg: 4.4,
      recoveryEfficiencyPercent: 98.0,
      purityGrade: '99.1% High Purity Aluminum Ingot',
      notes: 'Special high-barrier delamination temperature profile applied successfully.'
    },
    {
      id: 'rec-batch-2026-10-01',
      batchId: 'REC-BLISTER-2026-101',
      date: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
      facilityName: 'EcoMetals Hydrometallurgical Refinery Hub (Peenya Industrial Area, Bengaluru)',
      operatorName: 'Rajesh Varma (Lead Metallurgy Engineer)',
      materialType: 'Mixed Pharmaceutical Blister Packs',
      sourceHub: 'Kempegowda Majestic Metro & Central Hub Drop-boxes',
      inflowKg: 175.5,
      recycledAluminumKg: 56.2,
      recycledPolymerKg: 115.8,
      residueKg: 3.5,
      recoveryEfficiencyPercent: 98.0,
      purityGrade: 'Commercial Secondary Alloy Grade',
      notes: 'Mixed blister packs mechanically shredded and electrostatically separated.'
    },
    {
      id: 'rec-batch-2026-09-28',
      batchId: 'REC-BLISTER-2026-098',
      date: '2026-09-28T11:00:00.000Z',
      facilityName: 'EcoMetals Hydrometallurgical Refinery Hub (Peenya Industrial Area, Bengaluru)',
      operatorName: 'Anita Deshmukh (Recovery Specialist)',
      materialType: 'PVC / PVDC Transparent + Aluminum Foil',
      sourceHub: 'Bengaluru September Month-End Pharmacy Sweep',
      inflowKg: 640.0,
      recycledAluminumKg: 204.8,
      recycledPolymerKg: 422.4,
      residueKg: 12.8,
      recoveryEfficiencyPercent: 98.0,
      purityGrade: '99.3% Secondary Aluminum Ingot',
      notes: 'Month-end bulk recovery cycle complete.'
    },
    {
      id: 'rec-batch-2026-08-30',
      batchId: 'REC-BLISTER-2026-085',
      date: '2026-08-30T10:00:00.000Z',
      facilityName: 'EcoMetals Hydrometallurgical Refinery Hub (Peenya Industrial Area, Bengaluru)',
      operatorName: 'Rajesh Varma (Lead Metallurgy Engineer)',
      materialType: 'Alu-Alu Blister Foil (Cold Form Opaque)',
      sourceHub: 'August Month-End Hospital Sweep',
      inflowKg: 580.0,
      recycledAluminumKg: 185.6,
      recycledPolymerKg: 382.8,
      residueKg: 11.6,
      recoveryEfficiencyPercent: 98.0,
      purityGrade: '99.5% High Grade Ingot',
      notes: 'August refinery batch passed all metallurgy tests.'
    }
  ];

  savePartnerRecords(seed);
  return seed;
}

function savePartnerRecords(records) {
  try {
    fs.writeFileSync(PARTNER_FILE, JSON.stringify(records, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving partner records:', e);
  }
}

let partnerRecords = loadPartnerRecords();

// Helper: Load & Save Redemptions
function loadRedemptions() {
  try {
    if (fs.existsSync(REDEMPTIONS_FILE)) {
      return JSON.parse(fs.readFileSync(REDEMPTIONS_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error loading redemptions:', e);
  }

  const seed = [
    {
      promoCode: 'ECOBLISTER-25OFF-R99Z',
      phone: '+91 98451 23456',
      redeemedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      storeName: 'Manipal Hospital Chemist (HAL Airport Rd)',
      discountPercentage: 25,
      userName: 'Kavitha Hegde',
      binId: 'Manipal Hospital - Old Airport Road'
    }
  ];

  saveRedemptions(seed);
  return seed;
}

function saveRedemptions(records) {
  try {
    fs.writeFileSync(REDEMPTIONS_FILE, JSON.stringify(records, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving redemptions:', e);
  }
}

let redemptions = loadRedemptions();

// REST Endpoints

// Network and QR Info
app.get('/api/network-info', async (req, res) => {
  const clientPort = 5173;
  const webUrl = `http://${LOCAL_IP}:${clientPort}`;
  const driverUrl = `http://${LOCAL_IP}:${clientPort}/#driver`;

  try {
    const webQr = await QRCode.toDataURL(webUrl);
    const driverQr = await QRCode.toDataURL(driverUrl);
    res.json({
      localIp: LOCAL_IP,
      serverPort: PORT,
      clientPort,
      webUrl,
      driverUrl,
      webQr,
      driverQr
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate QR codes' });
  }
});

// QR Code Generator for arbitrary text/URL
app.get('/api/qr', async (req, res) => {
  const text = req.query.text || `http://${LOCAL_IP}:5173`;
  try {
    const qrDataUrl = await QRCode.toDataURL(text, {
      width: 320,
      margin: 2,
      color: {
        dark: '#064e3b',
        light: '#ffffff'
      }
    });
    res.json({ text, qrDataUrl });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// Get all reports
app.get('/api/reports', (req, res) => {
  res.json(reports);
});

// Get single report by token or promoCode
app.get('/api/reports/:token', (req, res) => {
  const query = req.params.token.toUpperCase();
  const report = reports.find(r => r.token === query || r.promoCode === query || r.id === req.params.token);
  if (!report) {
    return res.status(404).json({ error: 'Deposit record not found' });
  }
  res.json(report);
});

// Create new report (Citizen / Patient / Pharmacy deposit)
app.post('/api/reports', upload.single('photo'), async (req, res) => {
  try {
    const body = req.body;

    // 1. Anti-Duplicate Photo Verification
    if (body.photoHash) {
      const duplicate = reports.find(r => r.photoHash && r.photoHash === body.photoHash);
      if (duplicate) {
        return res.status(400).json({
          error: `Duplicate photo detected! This exact blister pack image was already submitted in deposit #${duplicate.token}. Please use Live Photography to snap a fresh photo of your actual blister packs.`
        });
      }
    }

    // 2. High-Fidelity Photo Persistence (Ensures photo always displays in admin portal)
    const rawPhoto = body.photoBase64 || null;
    let savedPhotoUrl = rawPhoto;

    if (req.file) {
      savedPhotoUrl = `/uploads/${req.file.filename}`;
    } else if (rawPhoto && rawPhoto.startsWith('data:image')) {
      try {
        const matches = rawPhoto.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const ext = matches[1].split('/')[1] || 'jpg';
          const filename = `blister-${Date.now()}-${Math.round(Math.random() * 1e4)}.${ext}`;
          const filepath = path.join(UPLOADS_DIR, filename);
          fs.writeFileSync(filepath, Buffer.from(matches[2], 'base64'));
          // Keep rawPhoto as fallback data URI for 100% reliable rendering across serverless & all networks
          savedPhotoUrl = rawPhoto;
        }
      } catch (e) {
        console.error('Error saving base64 photo:', e);
      }
    }

    const discountPercentage = calculateDiscountFromStrips(body.stripCount, body.exactStrips);
    const token = generateToken();
    const promoCode = generatePromoCode(discountPercentage);

    const newReport = {
      id: `rep-${Date.now()}`,
      token,
      promoCode,
      userName: body.userName || 'Anonymous Citizen',
      userEmail: body.userEmail || null,
      userPhone: body.userPhone || null,
      binId: body.binId || 'Apollo Pharmacy - Indiranagar',
      materialType: body.materialType || 'PVC / PVDC Transparent + Aluminum Foil',
      stripCount: body.stripCount || '6 – 15 Strips',
      exactStrips: Number(body.exactStrips) || 10,
      latitude: parseFloat(body.latitude) || 12.9716,
      longitude: parseFloat(body.longitude) || 77.6412,
      address: body.address || 'Bengaluru Medical Center',
      date: body.date || new Date().toISOString(),
      status: 'Pending Verification',
      validationStatus: 'Pending',
      promoCodeIssued: false,
      isPhoneVerified: Boolean(body.isPhoneVerified || body.phoneVerified),
      validatedBy: null,
      validatedStore: null,
      validatedAt: null,
      rejectionReason: null,
      notes: body.notes || '',
      photoUrl: savedPhotoUrl || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=60',
      photoBase64: rawPhoto || null,
      isLivePhoto: !!body.isLivePhoto,
      photoTimestamp: body.photoTimestamp || new Date().toISOString(),
      photoHash: body.photoHash || null,
      isRedeemed: false,
      redeemedPhone: null,
      redeemedAt: null,
      redeemedStore: null,
      audioNoteUrl: body.audioNoteUrl || null,
      assignedDriver: null,
      resolutionPhotoUrl: null,
      discountPercentage,
      partnerPharmacy: 'Apollo Pharmacy, MedPlus & Wellness Forever Bengaluru',
      history: [
        {
          status: 'Pending Verification',
          time: new Date().toISOString(),
          note: `Deposit of ${body.exactStrips || 10} strips registered with phone OTP verification. Awaiting Chemist physical inspection.`
        }
      ]
    };

    reports.unshift(newReport);
    saveReports(reports);

    // Broadcast in real-time to Android Logistics App
    io.emit('report:new', newReport);

    console.log(`[+] New Blister Deposit: ${token} | Promo: ${promoCode} (Loc: ${newReport.binId})`);

    res.status(201).json({
      success: true,
      message: 'Blister deposit logged successfully',
      token,
      promoCode,
      report: newReport
    });
  } catch (err) {
    console.error('Error creating report:', err);
    res.status(500).json({ error: 'Failed to create report' });
  }
});

// Helper to handle report status updates
function handleReportStatusUpdate(rawIdentifier, body, res) {
  try {
    const raw = (rawIdentifier || body.token || body.id || '').trim();
    if (!raw) {
      return res.status(400).json({ error: 'Report token or ID is required' });
    }

    const index = reports.findIndex(
      r => (r.token && r.token.toUpperCase() === raw.toUpperCase()) ||
           (r.id && r.id.toLowerCase() === raw.toLowerCase()) ||
           r.id === raw
    );

    if (index === -1) {
      return res.status(404).json({ error: 'Deposit record not found' });
    }

    const { status, driverName, note, resolutionPhotoUrl, validationStatus, promoCodeIssued, rejectionReason, validatedBy, validatedStore } = body;
    const report = reports[index];

    if (status) report.status = status;
    if (validationStatus) report.validationStatus = validationStatus;
    if (promoCodeIssued !== undefined) report.promoCodeIssued = promoCodeIssued;
    if (rejectionReason !== undefined) report.rejectionReason = rejectionReason;
    if (validatedBy) report.validatedBy = validatedBy;
    if (validatedStore) report.validatedStore = validatedStore;
    if (driverName) report.assignedDriver = driverName;
    if (resolutionPhotoUrl) report.resolutionPhotoUrl = resolutionPhotoUrl;

    if (!report.history) report.history = [];
    report.history.push({
      status: status || report.status,
      time: new Date().toISOString(),
      note: note || `Status updated to ${status} by logistics team`
    });

    saveReports(reports);

    // Broadcast status change in real time via socket
    io.emit('report:status_changed', {
      token: report.token,
      id: report.id,
      status: report.status,
      report
    });

    console.log(`[~] Deposit ${report.token} status updated to: ${status}`);

    return res.json({
      success: true,
      message: 'Status updated',
      report
    });
  } catch (err) {
    console.error('Error updating status:', err);
    return res.status(500).json({ error: 'Failed to update status' });
  }
}

// Chemist Blister Verification & Promo Issuance Endpoint
app.post('/api/pharmacy/validate', (req, res) => {
  try {
    const { token, action, pharmacistName, storeName, rejectionReason } = req.body || {};
    if (!token) {
      return res.status(400).json({ error: 'Deposit token is required' });
    }

    const cleanToken = String(token).trim().toUpperCase();
    const report = reports.find(
      r => (r.token && r.token.toUpperCase() === cleanToken) ||
           (r.promoCode && r.promoCode.toUpperCase() === cleanToken) ||
           (r.id && r.id.toUpperCase() === cleanToken)
    );

    if (!report) {
      return res.status(404).json({ error: `Deposit record #${cleanToken} not found` });
    }

    const pName = pharmacistName || 'Lead Chemist';
    const sName = storeName || report.binId || 'Partner Pharmacy';

    if (action === 'approve') {
      report.validationStatus = 'Verified';
      report.promoCodeIssued = true;
      report.validatedBy = pName;
      report.validatedStore = sName;
      report.validatedAt = new Date().toISOString();
      report.status = 'Verified & Promo Issued';

      if (!report.history) report.history = [];
      report.history.push({
        status: 'Verified & Promo Issued',
        time: new Date().toISOString(),
        note: `Physical blister strips inspected and verified by ${pName} at ${sName}. Promo code activated.`
      });

      saveReports(reports);

      // Broadcast real-time event to socket so customer screen immediately updates
      io.emit('report:validated', report);
      io.emit('report:status_changed', {
        token: report.token,
        id: report.id,
        status: report.status,
        report
      });

      console.log(`[✓] Deposit ${report.token} verified by ${pName}. Promo Code activated.`);

      return res.json({
        success: true,
        message: 'Deposit verified and Promo Code officially issued to customer',
        report
      });
    }

    if (action === 'reject') {
      const reason = rejectionReason || 'Blister strips in bin did not match submitted photo proof';
      report.validationStatus = 'Rejected';
      report.promoCodeIssued = false;
      report.validatedBy = pName;
      report.validatedStore = sName;
      report.validatedAt = new Date().toISOString();
      report.rejectionReason = reason;
      report.status = 'Rejected (Fake Proof)';

      if (!report.history) report.history = [];
      report.history.push({
        status: 'Rejected (Fake Proof)',
        time: new Date().toISOString(),
        note: `Deposit flagged as fake/invalid by ${pName} at ${sName}: ${reason}. Promo code blocked.`
      });

      saveReports(reports);

      io.emit('report:rejected', report);
      io.emit('report:status_changed', {
        token: report.token,
        id: report.id,
        status: report.status,
        report
      });

      console.log(`[✕] Deposit ${report.token} rejected by ${pName}: ${reason}`);

      return res.json({
        success: true,
        message: 'Deposit flagged as fake/invalid. Promo code blocked.',
        report
      });
    }

    return res.status(400).json({ error: 'Invalid action. Expected "approve" or "reject"' });
  } catch (err) {
    console.error('Error in /api/pharmacy/validate:', err);
    return res.status(500).json({ error: 'Server error during pharmacy validation' });
  }
});

// Update report status (supports /api/reports/:token/status, /api/reports/:token, and /api/reports)
app.patch('/api/reports/:token/status', (req, res) => {
  handleReportStatusUpdate(req.params.token, req.body, res);
});

app.patch('/api/reports/:token', (req, res) => {
  handleReportStatusUpdate(req.params.token, req.body, res);
});

app.patch('/api/reports', (req, res) => {
  handleReportStatusUpdate(req.body.token || req.body.id, req.body, res);
});

// ============================================================================
// PROMO CODE REDEMPTION API (MANDATORY PHONE NUMBER REQUIRED)
// ============================================================================

app.post('/api/promocodes/redeem', (req, res) => {
  try {
    const { promoCode, phone, storeName } = req.body;

    if (!promoCode) {
      return res.status(400).json({ error: 'Promo Code / Voucher ID is required.' });
    }

    // Phone number is strictly mandatory
    const cleanPhone = (phone || '').trim().replace(/[^0-9+ -]/g, '');
    const digitsOnly = cleanPhone.replace(/[^0-9]/g, '');
    if (!cleanPhone || digitsOnly.length < 10) {
      return res.status(400).json({
        error: 'Customer phone number (at least 10 digits) is strictly mandatory to redeem this discount voucher.'
      });
    }

    const codeUpper = promoCode.trim().toUpperCase();
    const reportIndex = reports.findIndex(r =>
      (r.promoCode && r.promoCode.toUpperCase() === codeUpper) ||
      (r.token && r.token.toUpperCase() === codeUpper)
    );

    if (reportIndex === -1) {
      return res.status(404).json({ error: 'Discount voucher not found. Please verify your promo code.' });
    }

    const report = reports[reportIndex];

    if (report.isRedeemed) {
      return res.status(400).json({
        error: `This voucher has already been redeemed on ${new Date(report.redeemedAt).toLocaleString('en-IN')} with phone number ${report.redeemedPhone}. It cannot be reused.`
      });
    }

    const redemptionDate = new Date().toISOString();
    report.isRedeemed = true;
    report.redeemedPhone = cleanPhone;
    report.redeemedAt = redemptionDate;
    report.redeemedStore = storeName || report.binId || 'Partner Pharmacy (Bengaluru)';

    report.history.push({
      status: report.status,
      time: redemptionDate,
      note: `Voucher redeemed by customer (Phone: ${cleanPhone}) at ${report.redeemedStore}.`
    });

    saveReports(reports);

    // Save to redemptions master log
    const redemptionRecord = {
      promoCode: report.promoCode || report.token,
      phone: cleanPhone,
      redeemedAt: redemptionDate,
      storeName: report.redeemedStore,
      discountPercentage: report.discountPercentage || 20,
      userName: report.userName || 'Citizen',
      binId: report.binId
    };

    redemptions.unshift(redemptionRecord);
    saveRedemptions(redemptions);

    // Broadcast in real-time
    io.emit('promocode:redeemed', {
      promoCode: report.promoCode,
      token: report.token,
      phone: cleanPhone,
      redeemedAt: redemptionDate,
      storeName: report.redeemedStore,
      report
    });

    console.log(`[✓] Voucher Redeemed: ${report.promoCode} | Phone: ${cleanPhone} | Store: ${report.redeemedStore}`);

    res.json({
      success: true,
      message: 'Voucher successfully redeemed!',
      redemption: redemptionRecord,
      report
    });
  } catch (err) {
    console.error('Error redeeming promo code:', err);
    res.status(500).json({ error: 'Failed to redeem promo code' });
  }
});

app.get('/api/promocodes/redemptions', (req, res) => {
  res.json(redemptions);
});

// ============================================================================
// RECOVERY PARTNER & REFINERY FACILITY API (DAILY, MONTHLY, YEARLY DATA)
// ============================================================================

// Get all recovery partner batch records
app.get('/api/partner/records', (req, res) => {
  res.json(partnerRecords);
});

// Create new batch record from recovery partner
app.post('/api/partner/records', (req, res) => {
  try {
    const {
      date,
      facilityName,
      operatorName,
      materialType,
      sourceHub,
      inflowKg,
      recycledAluminumKg,
      recycledPolymerKg,
      purityGrade,
      notes
    } = req.body;

    const inflow = Number(inflowKg) || 0;
    const alu = Number(recycledAluminumKg) || 0;
    const polymer = Number(recycledPolymerKg) || 0;

    if (inflow <= 0) {
      return res.status(400).json({ error: 'Inflow material weight (kg) must be greater than zero.' });
    }

    const residue = Math.max(0, parseFloat((inflow - (alu + polymer)).toFixed(1)));
    const efficiency = inflow > 0 ? Math.min(100, parseFloat(((alu + polymer) / inflow * 100).toFixed(1))) : 98.0;

    const newRecord = {
      id: `rec-batch-${Date.now()}`,
      batchId: `REC-BLISTER-${Date.now().toString().slice(-4)}`,
      date: date || new Date().toISOString(),
      facilityName: facilityName || 'EcoMetals Hydrometallurgical Refinery Hub (Peenya, Bengaluru)',
      operatorName: operatorName || 'Recovery Technician',
      materialType: materialType || 'PVC / PVDC Transparent + Aluminum Foil',
      sourceHub: sourceHub || 'City Logistics Sweep',
      inflowKg: inflow,
      recycledAluminumKg: alu,
      recycledPolymerKg: polymer,
      residueKg: residue,
      recoveryEfficiencyPercent: efficiency,
      purityGrade: purityGrade || '99.2% Secondary Aluminum Ingot Quality',
      notes: notes || 'Delamination and recovery cycle completed successfully.'
    };

    partnerRecords.unshift(newRecord);
    savePartnerRecords(partnerRecords);

    // Broadcast in real-time to admin and partner dashboards
    io.emit('partner:new_batch', newRecord);

    console.log(`[⚙️] New Recovery Partner Batch: ${newRecord.batchId} | Inflow: ${inflow}kg | Alu: ${alu}kg`);

    res.status(201).json({
      success: true,
      message: 'Recovery partner batch logged successfully',
      record: newRecord
    });
  } catch (err) {
    console.error('Error logging partner batch:', err);
    res.status(500).json({ error: 'Failed to record batch' });
  }
});

// Aggregated Summary: Daily, Monthly, Yearly Metrics
app.get('/api/partner/summary', (req, res) => {
  try {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const thisMonthStr = now.toISOString().slice(0, 7); // YYYY-MM
    const thisYearStr = now.toISOString().slice(0, 4); // YYYY

    // 1. Daily (Today)
    const dailyRecords = partnerRecords.filter(r => (r.date || '').slice(0, 10) === todayStr);
    const dailyInflow = dailyRecords.reduce((sum, r) => sum + (Number(r.inflowKg) || 0), 0);
    const dailyAlu = dailyRecords.reduce((sum, r) => sum + (Number(r.recycledAluminumKg) || 0), 0);
    const dailyPolymer = dailyRecords.reduce((sum, r) => sum + (Number(r.recycledPolymerKg) || 0), 0);

    // 2. Monthly (This Month)
    const monthlyRecords = partnerRecords.filter(r => (r.date || '').slice(0, 7) === thisMonthStr);
    const monthlyInflow = monthlyRecords.reduce((sum, r) => sum + (Number(r.inflowKg) || 0), 0);
    const monthlyAlu = monthlyRecords.reduce((sum, r) => sum + (Number(r.recycledAluminumKg) || 0), 0);
    const monthlyPolymer = monthlyRecords.reduce((sum, r) => sum + (Number(r.recycledPolymerKg) || 0), 0);

    // 3. Yearly (This Year)
    const yearlyRecords = partnerRecords.filter(r => (r.date || '').slice(0, 4) === thisYearStr);
    const yearlyInflow = yearlyRecords.reduce((sum, r) => sum + (Number(r.inflowKg) || 0), 0);
    const yearlyAlu = yearlyRecords.reduce((sum, r) => sum + (Number(r.recycledAluminumKg) || 0), 0);
    const yearlyPolymer = yearlyRecords.reduce((sum, r) => sum + (Number(r.recycledPolymerKg) || 0), 0);

    // 4. Monthly Trend (Jan - Dec this year)
    const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyBreakdown = months.map((m, idx) => {
      const ym = `${thisYearStr}-${m}`;
      const recs = partnerRecords.filter(r => (r.date || '').slice(0, 7) === ym);
      const inf = recs.reduce((s, r) => s + (Number(r.inflowKg) || 0), 0);
      const al = recs.reduce((s, r) => s + (Number(r.recycledAluminumKg) || 0), 0);
      const pol = recs.reduce((s, r) => s + (Number(r.recycledPolymerKg) || 0), 0);
      return {
        month: monthNames[idx],
        yearMonth: ym,
        inflowKg: parseFloat(inf.toFixed(1)),
        aluminumKg: parseFloat(al.toFixed(1)),
        polymerKg: parseFloat(pol.toFixed(1)),
        batchCount: recs.length
      };
    });

    res.json({
      daily: {
        date: todayStr,
        inflowKg: parseFloat(dailyInflow.toFixed(1)),
        aluminumKg: parseFloat(dailyAlu.toFixed(1)),
        polymerKg: parseFloat(dailyPolymer.toFixed(1)),
        batchesCount: dailyRecords.length,
        records: dailyRecords
      },
      monthly: {
        month: thisMonthStr,
        inflowKg: parseFloat(monthlyInflow.toFixed(1)),
        aluminumKg: parseFloat(monthlyAlu.toFixed(1)),
        polymerKg: parseFloat(monthlyPolymer.toFixed(1)),
        batchesCount: monthlyRecords.length,
        records: monthlyRecords
      },
      yearly: {
        year: thisYearStr,
        inflowKg: parseFloat(yearlyInflow.toFixed(1)),
        aluminumKg: parseFloat(yearlyAlu.toFixed(1)),
        polymerKg: parseFloat(yearlyPolymer.toFixed(1)),
        batchesCount: yearlyRecords.length,
        co2SavedKg: Math.round(yearlyAlu * 3.2),
        monthlyBreakdown
      }
    });
  } catch (err) {
    console.error('Error compiling partner summary:', err);
    res.status(500).json({ error: 'Failed to compile partner summary' });
  }
});

// Real-time Socket.IO Connection & Events
io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);
  socket.emit('reports:init', reports);

  socket.on('driver:location', (locationData) => {
    socket.broadcast.emit('driver:location_update', locationData);
  });

  socket.on('reports:request_refresh', () => {
    socket.emit('reports:init', reports);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

// Serve compiled frontend production build if available
const FRONTEND_DIST = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
}

// Start Server
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`
==================================================
🌿 ECO-BLISTERS (Collect Track Recover) RUNNING
==================================================
📡 Local Server:   http://localhost:${PORT}
🌐 Network Server: http://${LOCAL_IP}:${PORT}
📱 Mobile Web App: http://${LOCAL_IP}:5173
🚗 Logistics App:  http://${LOCAL_IP}:5173/#driver
==================================================
    `);
  });
}

module.exports = app;
