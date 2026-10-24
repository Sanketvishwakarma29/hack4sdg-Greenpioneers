// Vercel Serverless Function: /api/reports/[token]/status
import { reports } from '../../store.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { token } = req.query || {};
  const rawParam = decodeURIComponent(token || '').trim();
  const index = reports.findIndex(
    r => (r.token && r.token.toUpperCase() === rawParam.toUpperCase()) ||
         (r.id && r.id.toLowerCase() === rawParam.toLowerCase()) ||
         r.id === rawParam
  );

  if (index === -1) {
    return res.status(404).json({ error: 'Deposit record not found' });
  }

  const report = reports[index];

  if (req.method === 'GET') {
    return res.status(200).json(report);
  }

  if (req.method === 'PATCH' || req.method === 'POST') {
    try {
      const { status, driverName, note, resolutionPhotoUrl } = req.body || {};

      if (status) report.status = status;
      if (driverName) report.assignedDriver = driverName;
      if (resolutionPhotoUrl) report.resolutionPhotoUrl = resolutionPhotoUrl;

      if (!report.history) report.history = [];
      report.history.push({
        status: status || report.status,
        time: new Date().toISOString(),
        note: note || `Status updated to ${status} by logistics fleet`
      });

      return res.status(200).json({
        success: true,
        message: 'Status updated successfully',
        report
      });
    } catch (err) {
      console.error('Error updating status:', err);
      return res.status(500).json({ error: 'Failed to update report status' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
