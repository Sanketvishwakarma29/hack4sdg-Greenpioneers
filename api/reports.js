// Vercel Serverless Function: /api/reports
import { reports, submittedPhotoHashes } from './store.js';

function calculateDiscountFromStrips(stripCountStr, exactCountNum) {
  let count = Number(exactCountNum);
  if (isNaN(count) || count <= 0) {
    const str = String(stripCountStr || '');
    if (str.includes('31') || str.includes('30+')) count = 35;
    else if (str.includes('16')) count = 20;
    else if (str.includes('6')) count = 10;
    else count = 4;
  }
  if (count >= 31) return 25;
  if (count >= 16) return 20;
  if (count >= 6) return 15;
  return 10;
}

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

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // GET: Fetch all reports or single report by token
  if (req.method === 'GET') {
    const { token } = req.query || {};
    if (token) {
      const found = reports.find(r => r.token === token || r.id === token);
      if (!found) return res.status(404).json({ error: 'Report not found' });
      return res.status(200).json(found);
    }
    return res.status(200).json(reports);
  }

  // POST: Create a new report
  if (req.method === 'POST') {
    try {
      const body = req.body || {};

      // Anti-duplicate photo check
      if (body.photoHash) {
        if (submittedPhotoHashes.has(body.photoHash)) {
          return res.status(400).json({
            error: 'Duplicate photo detected. Please take a fresh live photo of the empty medicine blisters in the bin.'
          });
        }
        submittedPhotoHashes.add(body.photoHash);
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
        photoUrl: body.photoBase64 || body.photoUrl || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=60',
        photoBase64: body.photoBase64 || null,
        isLivePhoto: Boolean(body.isLivePhoto),
        photoTimestamp: body.photoTimestamp || new Date().toISOString(),
        photoHash: body.photoHash || null,
        assignedDriver: null,
        discountPercentage,
        partnerPharmacy: 'Apollo Pharmacy Bengaluru Network',
        isRedeemed: false,
        redeemedPhone: null,
        redeemedAt: null,
        redeemedStore: null,
        history: [
          { status: 'Pending', time: new Date().toISOString(), note: 'Deposited in Pharmacy Collection Bin' }
        ]
      };

      reports.unshift(newReport);

      return res.status(201).json({
        success: true,
        message: 'Blister deposit recorded successfully',
        token,
        promoCode,
        discountPercentage,
        report: newReport
      });
    } catch (err) {
      console.error('Error creating report:', err);
      return res.status(500).json({ error: 'Failed to record deposit' });
    }
  }

  // PATCH: Update status
  if (req.method === 'PATCH') {
    try {
      const { token, status, driverName, note, isRedeemed, redeemedPhone, redeemedStore } = req.body || {};
      const report = reports.find(r => r.token === token || r.id === token);
      if (!report) {
        return res.status(404).json({ error: 'Report not found' });
      }

      if (status) report.status = status;
      if (driverName) report.assignedDriver = driverName;
      if (isRedeemed !== undefined) report.isRedeemed = isRedeemed;
      if (redeemedPhone) report.redeemedPhone = redeemedPhone;
      if (redeemedStore) report.redeemedStore = redeemedStore;

      report.history.push({
        status: report.status,
        time: new Date().toISOString(),
        note: note || `Status updated to ${report.status}`
      });

      return res.status(200).json({ success: true, report });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to update status' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
