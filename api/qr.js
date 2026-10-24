// Vercel Serverless Function: /api/qr
import QRCode from 'qrcode';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const text = req.query.text || 'https://eco-blisters.vercel.app';
  try {
    const qrDataUrl = await QRCode.toDataURL(text, {
      width: 320,
      margin: 2,
      color: {
        dark: '#064e3b',
        light: '#ffffff'
      }
    });
    return res.status(200).json({ text, qrDataUrl });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to generate QR code' });
  }
}
