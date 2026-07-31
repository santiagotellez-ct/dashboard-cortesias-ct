import { createAdminClient } from '@insforge/sdk';

let client = null;

function getClient() {
  if (!client) {
    const baseUrl = process.env.INSFORGE_URL;
    const apiKey = process.env.INSFORGE_API_KEY;
    if (!baseUrl || !apiKey) {
      throw new Error('Faltan INSFORGE_URL / INSFORGE_API_KEY en el servidor.');
    }
    client = createAdminClient({ baseUrl, apiKey });
  }
  return client;
}

async function getRedemptions() {
  const { data, error } = await getClient().database.from('redemptions').select('record_id, redeemed_at');
  if (error) throw new Error(error.message || 'No se pudieron leer las redenciones');

  const map = {};
  (data || []).forEach((row) => {
    map[row.record_id] = row.redeemed_at;
  });
  return map;
}

async function setRedemption(id, redeemed) {
  const db = getClient().database;

  const { error: delError } = await db.from('redemptions').delete().eq('record_id', id);
  if (delError) throw new Error(delError.message || 'No se pudo actualizar la redención');

  if (!redeemed) return null;

  const redeemedAt = new Date().toISOString();
  const { error: insError } = await db.from('redemptions').insert([{ record_id: id, redeemed_at: redeemedAt }]);
  if (insError) throw new Error(insError.message || 'No se pudo guardar la redención');

  return redeemedAt;
}

export { getRedemptions, setRedemption };
