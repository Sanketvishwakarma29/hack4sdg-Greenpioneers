// Vercel Serverless Function: /api/promocodes/redemptions
let redemptions = [
  {
    id: 'red-seed-1',
    promoCode: 'ECOBLISTER-25OFF-W91P',
    token: 'ECO-M7B-490',
    customerPhone: '+91 98451 22340',
    storeName: 'Manipal Hospital Partner Dispensary',
    storeId: 'MAN-BLR-01',
    redeemedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    discountApplied: '25% OFF',
    billAmount: '₹ 1,450',
    discountAmount: '₹ 362.50'
  }
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  }

  return res.status(200).json(redemptions);
}
