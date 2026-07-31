const API_URL = 'https://app.idtemporal.com/apis/event_tags';
const CACHE_TTL_MS = 20_000;

let cache = { records: null, fetchedAt: 0, error: null };
let inFlight = null;

async function fetchAllRecords() {
  const apiKey = process.env.IDTEMPORAL_API_KEY;
  const eventId = Number(process.env.EVENT_ID || 177);

  if (!apiKey) {
    throw new Error('Falta IDTEMPORAL_API_KEY en el servidor.');
  }

  const allRecords = [];
  let page = 1;

  while (true) {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey
      },
      body: JSON.stringify({ eventId, page })
    });

    if (!response.ok) {
      throw new Error(`La API respondió con estado ${response.status}`);
    }

    const payload = await response.json();
    if (!payload.success) {
      throw new Error(payload.message || 'La API reportó un error');
    }

    const records = Array.isArray(payload.records) ? payload.records : [];
    allRecords.push(...records);

    const limit = Number(payload.limit || 5000);
    const totalRecords = Number(payload.totalRecords || allRecords.length);

    if (records.length < limit || allRecords.length >= totalRecords) {
      break;
    }

    page += 1;
  }

  return allRecords;
}

async function getRecords(forceRefresh) {
  const isFresh = cache.records && Date.now() - cache.fetchedAt < CACHE_TTL_MS;
  if (isFresh && !forceRefresh) {
    return cache;
  }

  if (!inFlight) {
    inFlight = fetchAllRecords()
      .then((records) => {
        cache = { records, fetchedAt: Date.now(), error: null };
        return cache;
      })
      .catch((error) => {
        if (cache.records) {
          return { ...cache, error: error.message };
        }
        throw error;
      })
      .finally(() => {
        inFlight = null;
      });
  }

  return inFlight;
}

export { getRecords };
