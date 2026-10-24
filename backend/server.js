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
    let photoUrl = body.photoBase64 || null;

    if (req.file) {
      photoUrl = `http://${LOCAL_IP}:${PORT}/uploads/${req.file.filename}`;
    } else if (body.photoBase64 && body.photoBase64.startsWith('data:image')) {
      try {
        const matches = body.photoBase64.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const ext = matches[1].split('/')[1] || 'jpg';
          const filename = `blister-${Date.now()}-${Math.round(Math.random() * 1e4)}.${ext}`;
          const filepath = path.join(UPLOADS_DIR, filename);
          fs.writeFileSync(filepath, Buffer.from(matches[2], 'base64'));
          photoUrl = `http://${LOCAL_IP}:${PORT}/uploads/${filename}`;
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
      status: 'Pending',
      notes: body.notes || '',
      photoUrl: photoUrl || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=60',
      audioNoteUrl: body.audioNoteUrl || null,
      assignedDriver: null,
      resolutionPhotoUrl: null,
      discountPercentage,
      partnerPharmacy: 'Apollo Pharmacy, MedPlus & Wellness Forever Bengaluru',
      history: [
        {
          status: 'Pending',
          time: new Date().toISOString(),
          note: `Deposit of ${body.exactStrips || 10} strips registered. ${discountPercentage}% OFF Promo code issued.`
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

// Update report status (Logistics agent action)
app.patch('/api/reports/:token/status', (req, res) => {
  try {
    const token = req.params.token.toUpperCase();
    const index = reports.findIndex(r => r.token === token || r.id === req.params.token);

    if (index === -1) {
      return res.status(404).json({ error: 'Deposit record not found' });
    }

    const { status, driverName, note, resolutionPhotoUrl } = req.body;
    const report = reports[index];

    if (status) report.status = status;
    if (driverName) report.assignedDriver = driverName;
    if (resolutionPhotoUrl) report.resolutionPhotoUrl = resolutionPhotoUrl;

    report.history.push({
      status: status || report.status,
      time: new Date().toISOString(),
      note: note || `Status updated to ${status} by logistics team`
    });

    saveReports(reports);

    // Broadcast status change in real time
    io.emit('report:status_changed', {
      token: report.token,
      id: report.id,
      status: report.status,
      report
    });

    console.log(`[~] Deposit ${token} status updated to: ${status}`);

    res.json({
      success: true,
      message: 'Status updated',
      report
    });
  } catch (err) {
    console.error('Error updating status:', err);
    res.status(500).json({ error: 'Failed to update status' });
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
