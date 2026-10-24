// Vercel Serverless Function: /api/pharmacy/validate
import { reports } from '../store.js';

export default async function handler(req, res) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
      return res.status(404).json({ error: `Deposit record #${cleanToken} not found in database` });
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

      return res.status(200).json({
        success: true,
        message: 'Deposit verified and Promo Code officially issued to customer',
        report
      });
    }

    if (action === 'reject') {
      const reason = rejectionReason || 'Blister strips in collection bin did not match submitted photo proof';
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

      return res.status(200).json({
        success: true,
        message: 'Deposit flagged as fake/invalid. Promo code blocked.',
        report
      });
    }

    return res.status(400).json({ error: 'Invalid action. Expected "approve" or "reject"' });
  } catch (err) {
    console.error('Error in pharmacy validate API:', err);
    return res.status(500).json({ error: 'Internal server error during validation' });
  }
}
