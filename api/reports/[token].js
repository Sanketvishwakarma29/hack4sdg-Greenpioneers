// Vercel Serverless Function: /api/reports/[token]
import { initialReports } from '../seedData.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { token } = req.query || {};
  if (!token) {
    return res.status(400).json({ error: 'Token or promoCode parameter required' });
  }

  const decoded = decodeURIComponent(token).trim().toUpperCase();
  const found = initialReports.find(
    r => (r.token && r.token.toUpperCase() === decoded) ||
         (r.promoCode && r.promoCode.toUpperCase() === decoded) ||
         (r.id && r.id.toUpperCase() === decoded)
  );

  if (found) {
    return res.status(200).json(found);
  }

  // Fallback demo report for testing any valid token format
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
