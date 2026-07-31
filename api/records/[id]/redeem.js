import { setRedemption } from '../../../lib/insforge.js';

export default async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, message: 'Método no permitido' });
    return;
  }

  const id = Number(req.query.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ success: false, message: 'Id inválido' });
    return;
  }

  const redeemed = Boolean(req.body?.redeemed);

  try {
    const redeemedAt = await setRedemption(id, redeemed);
    res.status(200).json({ success: true, id, redeemed, redeemedAt });
  } catch (error) {
    res.status(502).json({ success: false, message: error.message });
  }
};
