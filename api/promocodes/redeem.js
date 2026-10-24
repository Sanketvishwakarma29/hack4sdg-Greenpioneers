// Vercel Serverless Function: /api/promocodes/redeem
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
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const { promoCode, customerPhone, phone, storeName, storeId } = req.body || {};
  const rawPhone = (customerPhone || phone || '').trim();

  if (!promoCode || !promoCode.trim()) {
    return res.status(400).json({ error: 'Promo code is required.' });
  }

  if (!rawPhone) {
    return res.status(400).json({ error: 'Customer phone number is strictly mandatory to redeem discounts.' });
  }

  const cleanPhone = rawPhone.replace(/[^0-9+]/g, '');
  if (cleanPhone.length < 10) {
    return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number.' });
  }

  const redemptionRecord = {
    id: `red-${Date.now()}`,
    promoCode: promoCode.trim().toUpperCase(),
    customerPhone: cleanPhone,
    storeName: storeName || 'Apollo Pharmacy Bengaluru Hub',
    storeId: storeId || 'STORE-GEN-01',
    redeemedAt: new Date().toISOString(),
    status: 'VERIFIED_REDEEMED'
  };

  redemptions.unshift(redemptionRecord);

  return res.status(200).json({
    success: true,
    message: 'Promocode successfully verified and redeemed!',
    redemption: redemptionRecord
  });
}
