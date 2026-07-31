import { getRecords } from '../lib/idtemporal.js';

export default async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ success: false, message: 'Método no permitido' });
    return;
  }

  try {
    const forceRefresh = req.query.refresh === 'true';
    const result = await getRecords(forceRefresh);

    res.status(200).json({
      success: true,
      fetchedAt: result.fetchedAt,
      stale: Boolean(result.error),
      error: result.error || null,
      totalRecords: result.records.length,
      records: result.records
    });
  } catch (error) {
    res.status(502).json({ success: false, message: error.message });
  }
};
