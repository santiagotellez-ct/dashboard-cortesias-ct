import { getRecords } from '../lib/idtemporal.js';
import { getRedemptions } from '../lib/insforge.js';
import { mergeRedemptionState } from '../lib/merge.js';

export default async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ success: false, message: 'Método no permitido' });
    return;
  }

  try {
    const forceRefresh = req.query.refresh === 'true';
    const [result, redemptions] = await Promise.all([getRecords(forceRefresh), getRedemptions()]);

    res.status(200).json({
      success: true,
      fetchedAt: result.fetchedAt,
      stale: Boolean(result.error),
      error: result.error || null,
      totalRecords: result.records.length,
      records: mergeRedemptionState(result.records, redemptions)
    });
  } catch (error) {
    res.status(502).json({ success: false, message: error.message });
  }
};
