try {
  process.loadEnvFile();
} catch {
  // .env is optional if the variables are already in the environment
}

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { getRecords } from './lib/idtemporal.js';
import { getRedemptions, setRedemption } from './lib/insforge.js';
import { mergeRedemptionState } from './lib/merge.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT || 3000);

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/records', async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    const [result, redemptions] = await Promise.all([getRecords(forceRefresh), getRedemptions()]);

    res.json({
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
});

app.post('/api/records/:id/redeem', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ success: false, message: 'Id inválido' });
  }

  const redeemed = Boolean(req.body?.redeemed);

  try {
    const redeemedAt = await setRedemption(id, redeemed);
    res.json({ success: true, id, redeemed, redeemedAt });
  } catch (error) {
    res.status(502).json({ success: false, message: error.message });
  }
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

function startServer(port) {
  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`Dashboard corriendo en http://localhost:${port}`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE' && port < PORT + 10) {
      console.warn(`Puerto ${port} ocupado. Probando ${port + 1}...`);
      server.close(() => startServer(port + 1));
    } else {
      throw error;
    }
  });
}

startServer(PORT);
