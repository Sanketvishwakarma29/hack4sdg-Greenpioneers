// Vercel Serverless Function: /api/partner/records
export let partnerRecords = [
  {
    id: 'rec-batch-2026-10-04',
    batchId: 'REC-BLISTER-2026-104',
    date: new Date(Date.now() - 3600000 * 3).toISOString(),
    facilityName: 'EcoMetals Hydrometallurgical Refinery Hub (Peenya Industrial Area, Bengaluru)',
    operatorName: 'Rajesh Varma (Lead Metallurgy Engineer)',
    materialType: 'Alu-Alu Blister Foil (Cold Form Opaque)',
    sourceHub: 'Victoria Hospital & Bowring Hospital Aggregate',
    inflowKg: 142.5,
    recycledAluminumKg: 45.6,
    recycledPolymerKg: 94.2,
    residueKg: 2.7,
    recoveryEfficiencyPercent: 98.1,
    purityGrade: '99.2% Secondary Aluminum Ingot Quality',
    notes: 'Delamination solvent recovery cycle #44 completed. 0% toxic gas emission.'
  },
  {
    id: 'rec-batch-2026-10-03',
    batchId: 'REC-BLISTER-2026-103',
    date: new Date(Date.now() - 3600000 * 10).toISOString(),
    facilityName: 'EcoMetals Hydrometallurgical Refinery Hub (Peenya Industrial Area, Bengaluru)',
    operatorName: 'Anita Deshmukh (Recovery Specialist)',
    materialType: 'PVC / PVDC Transparent + Aluminum Foil',
    sourceHub: 'Apollo Pharmacy & MedPlus Indiranagar Collection',
    inflowKg: 198.0,
    recycledAluminumKg: 63.4,
    recycledPolymerKg: 130.8,
    residueKg: 3.8,
    recoveryEfficiencyPercent: 98.0,
    purityGrade: '99.4% Aluminum Flakes + Clean PVC Granulate',
    notes: 'High-purity PVC granulate sent to industrial conduit pipe manufacturer.'
  },
  {
    id: 'rec-batch-2026-10-02',
    batchId: 'REC-BLISTER-2026-102',
    date: new Date(Date.now() - 86400000).toISOString(),
    facilityName: 'EcoMetals Hydrometallurgical Refinery Hub (Peenya Industrial Area, Bengaluru)',
    operatorName: 'Suresh Patil (Refinery Supervisor)',
    materialType: 'High-Barrier Aclar / Alu Pharmaceutical Strip',
    sourceHub: 'Manipal Hospital & Fortis Hospital Consignment',
    inflowKg: 220.0,
    recycledAluminumKg: 70.4,
    recycledPolymerKg: 145.2,
    residueKg: 4.4,
    recoveryEfficiencyPercent: 98.0,
    purityGrade: '99.1% High Purity Aluminum Ingot',
    notes: 'Special high-barrier delamination temperature profile applied successfully.'
  },
  {
    id: 'rec-batch-2026-10-01',
    batchId: 'REC-BLISTER-2026-101',
    date: new Date(Date.now() - 86400000 * 2).toISOString(),
    facilityName: 'EcoMetals Hydrometallurgical Refinery Hub (Peenya Industrial Area, Bengaluru)',
    operatorName: 'Rajesh Varma (Lead Metallurgy Engineer)',
    materialType: 'Mixed Pharmaceutical Blister Packs',
    sourceHub: 'Kempegowda Majestic Metro & Central Hub Drop-boxes',
    inflowKg: 175.5,
    recycledAluminumKg: 56.2,
    recycledPolymerKg: 115.8,
    residueKg: 3.5,
    recoveryEfficiencyPercent: 98.0,
    purityGrade: 'Commercial Secondary Alloy Grade',
    notes: 'Mixed blister packs mechanically shredded and electrostatically separated.'
  },
  {
    id: 'rec-batch-2026-09-28',
    batchId: 'REC-BLISTER-2026-098',
    date: '2026-09-28T11:00:00.000Z',
    facilityName: 'EcoMetals Hydrometallurgical Refinery Hub (Peenya Industrial Area, Bengaluru)',
    operatorName: 'Anita Deshmukh (Recovery Specialist)',
    materialType: 'PVC / PVDC Transparent + Aluminum Foil',
    sourceHub: 'Bengaluru September Month-End Pharmacy Sweep',
    inflowKg: 640.0,
    recycledAluminumKg: 204.8,
    recycledPolymerKg: 422.4,
    residueKg: 12.8,
    recoveryEfficiencyPercent: 98.0,
    purityGrade: '99.3% Secondary Aluminum Ingot',
    notes: 'Month-end bulk recovery cycle complete.'
  },
  {
    id: 'rec-batch-2026-08-30',
    batchId: 'REC-BLISTER-2026-085',
    date: '2026-08-30T10:00:00.000Z',
    facilityName: 'EcoMetals Hydrometallurgical Refinery Hub (Peenya Industrial Area, Bengaluru)',
    operatorName: 'Rajesh Varma (Lead Metallurgy Engineer)',
    materialType: 'Alu-Alu Blister Foil (Cold Form Opaque)',
    sourceHub: 'August Month-End Hospital Sweep',
    inflowKg: 580.0,
    recycledAluminumKg: 185.6,
    recycledPolymerKg: 382.8,
    residueKg: 11.6,
    recoveryEfficiencyPercent: 98.0,
    purityGrade: '99.5% High Grade Ingot',
    notes: 'August refinery batch passed all metallurgy tests.'
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

  if (req.method === 'GET') {
    return res.status(200).json(partnerRecords);
  }

  if (req.method === 'POST') {
    try {
      const {
        date,
        facilityName,
        operatorName,
        materialType,
        sourceHub,
        inflowKg,
        recycledAluminumKg,
        recycledPolymerKg,
        purityGrade,
        notes
      } = req.body || {};

      const inflow = Number(inflowKg) || 0;
      const alu = Number(recycledAluminumKg) || 0;
      const polymer = Number(recycledPolymerKg) || 0;

      if (inflow <= 0) {
        return res.status(400).json({ error: 'Inflow material weight (kg) must be greater than zero.' });
      }

      const residue = Math.max(0, parseFloat((inflow - (alu + polymer)).toFixed(1)));
      const efficiency = inflow > 0 ? Math.min(100, parseFloat(((alu + polymer) / inflow * 100).toFixed(1))) : 98.0;

      const newRecord = {
        id: `rec-batch-${Date.now()}`,
        batchId: `REC-BLISTER-${Date.now().toString().slice(-4)}`,
        date: date || new Date().toISOString(),
        facilityName: facilityName || 'EcoMetals Hydrometallurgical Refinery Hub (Peenya, Bengaluru)',
        operatorName: operatorName || 'Recovery Technician',
        materialType: materialType || 'PVC / PVDC Transparent + Aluminum Foil',
        sourceHub: sourceHub || 'City Logistics Sweep',
        inflowKg: inflow,
        recycledAluminumKg: alu,
        recycledPolymerKg: polymer,
        residueKg: residue,
        recoveryEfficiencyPercent: efficiency,
        purityGrade: purityGrade || '99.2% Secondary Aluminum Ingot Quality',
        notes: notes || 'Delamination and recovery cycle completed successfully.'
      };

      partnerRecords.unshift(newRecord);

      return res.status(201).json({
        success: true,
        message: 'Recovery partner batch logged successfully',
        record: newRecord
      });
    } catch (err) {
      console.error('Error logging partner batch:', err);
      return res.status(500).json({ error: 'Failed to record batch' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
