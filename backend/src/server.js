import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

// Dynamic imports — run AFTER dotenv so env vars are available
const { default: app } = await import('./app.js');
const { default: db }  = await import('./config/db.js');

const PORT = process.env.PORT || 3000;

try {
  await db.query('SELECT 1');
  console.log('Database connected');

  app.listen(PORT, () => {
    console.log(`ShipPilot API running on http://localhost:${PORT}`);
  });
} catch (err) {
  console.error('Failed to start server:', err.message);
  process.exit(1);
}
