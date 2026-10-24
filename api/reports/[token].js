// Vercel Serverless Function: /api/reports/[token]
import { reports } from '../store.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { token } = req.query || {};
  if (!token) {
    return res.status(400).json({ error: 'Token or promoCode parameter required' });
  }

  const decoded = decodeURIComponent(token).trim().toUpperCase();
  const index = reports.findIndex(
    r => (r.token && r.token.toUpperCase() === decoded) ||
         (r.promoCode && r.promoCode.toUpperCase() === decoded) ||
         (r.id && r.id.toUpperCase() === decoded)
  );

  if (req.method === 'GET') {
    if (index !== -1) {
      return res.status(200).json(reports[index]);
    }

    return res.status(200).json({
      token: decoded,
      promoCode: `ECOBLISTER-15OFF-${decoded.slice(-4)}`,
      status: 'In Progress',
      binId: 'Apollo Pharmacy - Bengaluru Central',
      date: new Date().toISOString(),
      stripCount: '16 – 30 Strips',
      materialType: 'PVC / PVDC Transparent + Aluminum Foil',
      discountPercentage: 15,
      userName: 'Citizen Recycler',
      isRedeemed: false,
      history: [
        { status: 'Pending', time: new Date(Date.now() - 3600000).toISOString(), note: 'Deposited in drop-box' },
        { status: 'In Progress', time: new Date().toISOString(), note: 'Collected by logistics fleet' }
      ]
    });
  }

  if (req.method === 'PATCH' || req.method === 'POST') {
    if (index === -1) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const report = reports[index];
    const { status, driverName, note, resolutionPhotoUrl, validationStatus, promoCodeIssued, rejectionReason, validatedBy, validatedStore } = req.body || {};

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
      note: note || `Status updated to ${status}`
    });

    return res.status(200).json({
      success: true,
      message: 'Status updated',
      report
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
