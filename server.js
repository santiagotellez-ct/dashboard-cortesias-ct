try {
  process.loadEnvFile();
} catch {
  // .env is optional if the variables are already in the environment
}

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { getRecords } from './lib/idtemporal.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

const PORT = Number(process.env.PORT || 3000);

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/records', async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    const result = await getRecords(forceRefresh);

    res.json({
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
