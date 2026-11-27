import { openDatabase } from './db/connection.js';
import { seedDemoData } from './db/seed.js';
import { createApp } from './app.js';

const HOST = '127.0.0.1';
const PORT = Number(process.env.API_PORT || 8787);

const db = openDatabase();
seedDemoData(db);

const app = createApp(db);
app.listen(PORT, HOST, () => {
  console.log(`AquaBest temporary local backend listening at http://${HOST}:${PORT}`);
  console.log(`Health check: http://${HOST}:${PORT}/api/health`);
});
