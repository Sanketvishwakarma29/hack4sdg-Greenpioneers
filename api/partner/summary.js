// Vercel Serverless Function: /api/partner/summary
import { partnerRecords } from './records.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

    return res.status(200).json({
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
        records: yearlyRecords
      },
      monthlyBreakdown
    });
  } catch (err) {
    console.error('Error in partner summary:', err);
    return res.status(500).json({ error: 'Failed to generate summary' });
  }
}
