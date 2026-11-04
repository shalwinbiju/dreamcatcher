
import 'dotenv/config';

console.log("Gemini key loaded:", !!process.env.GEMINI_API_KEY);
console.log("Gemini model:", process.env.GEMINI_MODEL);

import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import helmet from 'helmet';

import {
  getDatabase,
  closeDatabase
} from './config/database.js';

import { initDatabase } from './config/database-init.js';
import dreamsRouter from './routes/dreams.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

const PORT = process.env.PORT || 3001;

// Security middleware
if (process.env.NODE_ENV === 'production') {
  app.use(helmet());
}

// Middleware
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

// Application and Database Health Check
app.get('/health', async (req, res) => {
  try {
    const db = await getDatabase();

    // SQLite health check
    await db.get('SELECT 1 AS health');

    res.status(200).json({
      status: 'UP',
      application: 'Dream Catcher',
      database: 'CONNECTED',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Health check failed:', error.message);

    res.status(503).json({
      status: 'DOWN',
      application: 'Dream Catcher',
      database: 'DISCONNECTED',
      error: error.message,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  }
});

// Manual shutdown endpoint
app.get('/shutdown', (req, res) => {
  console.log('=== MANUAL SHUTDOWN TRIGGERED ===');

  res.send('Shutting down...');

  setTimeout(() => {
    process.kill(process.pid, 'SIGTERM');
  }, 100);
});

// API Routes
app.use('/api/dreams', dreamsRouter);

// Server and shutdown management
let server;
let isShuttingDown = false;

// Graceful shutdown
async function gracefulShutdown(signal) {
  if (isShuttingDown) return;

  isShuttingDown = true;

  console.log(`${signal} received, shutting down gracefully`);

  if (server) {
    server.close(async (error) => {
      if (error) {
        console.error('Error closing HTTP server:', error);
        process.exitCode = 1;
      } else {
        console.log('HTTP server closed');
      }

      try {
        await closeDatabase();
      } catch (dbError) {
        console.error('Error closing SQLite database:', dbError);
        process.exitCode = 1;
      }
    });
  } else {
    try {
      await closeDatabase();
    } catch (error) {
      console.error('Error closing SQLite database:', error);
      process.exitCode = 1;
    }
  }
}

// Signal handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Initialize database then start server
try {
  await initDatabase();

  server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
  });

} catch (error) {
  console.error('Failed to initialize database:', error);
  process.exit(1);
}
