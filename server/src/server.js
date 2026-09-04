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
const { ensureDefaultSettings } = require('./database/default-settings');
const shipmentService = require('./services/shipment.service');
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
      // Insert any missing platform settings (never overwrites admin edits)
      await ensureDefaultSettings();
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

  // Periodic background sync of live Shiprocket order statuses (every 60s).
  // When a shipment's status changes, it is pushed in real time to the customer
  // app, vendor apps and admin panel over socket.io. Safe to run before the DB
  // is connected: syncActiveShipments() fails gracefully.
  const SR_SYNC_INTERVAL_MS = 60 * 1000;
  const syncTimer = setInterval(async () => {
    try {
      const n = await shipmentService.syncActiveShipments();
      if (n > 0) logger.info(`[ShipmentSync] Refreshed ${n} shipment(s)`);
    } catch (err) {
      logger.warn(`[ShipmentSync] Background sync skipped: ${err.message}`);
    }
  }, SR_SYNC_INTERVAL_MS);
  syncTimer.unref();

  // Automated vendor settlement: every 7 days. For every vendor with an
  // eligible payable balance at/above the min_payout threshold, a payout
  // record is created and the vendor is notified. Runs in the background and
  // fails gracefully without affecting the running server.
  const payoutService = require('./services/payout.service');
  const SETTLE_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
  const settleTimer = setInterval(async () => {
    try {
      const result = await payoutService.runSettlementCycle();
      if (result.created > 0) {
        logger.info(`[PayoutCycle] Released ${result.created} payout(s), ${result.skippedUnderMin} below min, ${result.skippedNoBank} missing bank details`);
      }
    } catch (err) {
      logger.warn(`[PayoutCycle] Settlement cycle skipped: ${err.message}`);
    }
  }, SETTLE_INTERVAL_MS);
  settleTimer.unref();

  // Automated ads-wallet low-balance alerts: every 6h. For any vendor whose ads
  // wallet dropped below their alert threshold (and who hasn't been emailed in
  // the last 24h), an email + in-app notification is sent. Fails gracefully.
  const adsService = require('./services/ads.service');
  const LOW_BALANCE_ALERT_INTERVAL_MS = 6 * 60 * 60 * 1000;
  const lowBalanceTimer = setInterval(async () => {
    try {
      const result = await adsService.runLowBalanceAlertSweep();
      if (result.alerted > 0) {
        logger.info(`[LowBalanceAlert] Sent ${result.alerted} low-balance alert(s) across ${result.checked} vendor(s)`);
      }
    } catch (err) {
      logger.warn(`[LowBalanceAlert] Sweep skipped: ${err.message}`);
    }
  }, LOW_BALANCE_ALERT_INTERVAL_MS);
  lowBalanceTimer.unref();
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
