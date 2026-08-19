/**
 * Damini Marketplace - HTTP Server + Socket.io Bootstrap
 */

const path = require('path');

// Pin config resolution to the server directory so the app always finds
// server/config even when launched from a different working directory
// (e.g. Hostinger hPanel running "node server/src/server.js" from the repo root).
process.env.NODE_CONFIG_DIR = path.join(__dirname, '..', 'config');

const http = require('http');
const config = require('config');
const app = require('./app');
const { initSocket } = require('./socket/socket');
const { testConnection, getPool } = require('./database/connection');
const logger = require('./utils/logger.util');

// Hostinger (and most Node.js hosts) inject the port via the PORT env var.
const PORT = process.env.PORT || config.get('app.port');
const ENV = config.get('app.env');

if (process.env.NODE_ENV === 'production' && ENV !== 'production') {
  logger.error(`⚠️ NODE_ENV=production but config app.env is "${ENV}". server/config/local.yaml is overriding production.yaml.`);
  logger.error('   Remove local.yaml from the server (or its app/database sections) and restart.');
}

const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

// Connect to the database in the background with automatic retries.
// The HTTP server starts listening immediately, so the app is never
// unreachable (503) while it waits on the database.
async function connectDatabase() {
  const maxRetries = 12; // Retry for up to 60 seconds (12 * 5s)
  const retryDelay = 5000; // 5 seconds
  let retries = 0;

  while (retries < maxRetries) {
    try {
      logger.info(`Connecting to database (Attempt ${retries + 1}/${maxRetries})...`);
      await testConnection();
      logger.info('✅ Database connection established successfully');
      return;
    } catch (err) {
      retries++;
      logger.warn(`⚠️ Database connection attempt ${retries} failed: ${err.message}`);
      if (retries >= maxRetries) {
        logger.error('❌ Maximum database connection retries reached.');
        logger.error('   Fix the "database" section in server/config/production.yaml,');
        logger.error('   or set DB_HOST / DB_PORT / DB_NAME / DB_USER / DB_PASSWORD env vars,');
        logger.error('   then restart the app. The API is up, but DB routes will fail.');
        return;
      }
      logger.info(`Retrying connection in ${retryDelay / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
}

server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} [${ENV}]`);
  logger.info(`Health: http://localhost:${PORT}/health`);
  logger.info(`API:    http://localhost:${PORT}/api/v1`);
});

connectDatabase();

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

async function shutdown() {
  logger.info('Shutting down gracefully...');
  server.close(() => {
    logger.info('HTTP server closed');
  });
  try {
    await getPool().end();
    logger.info('Database pool drained');
  } catch (err) {
    logger.error('Error draining pool:', err.message);
  }
  process.exit(0);
}

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
  process.exit(1);
});
