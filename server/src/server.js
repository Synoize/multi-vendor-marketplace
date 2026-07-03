/**
 * Damini Marketplace - HTTP Server + Socket.io Bootstrap
 */

const http = require('http');
const config = require('config');
const app = require('./app');
const { initSocket } = require('./socket/socket');
const { testConnection } = require('./database/connection');
const logger = require('./utils/logger.util');

const PORT = config.get('app.port');
const ENV = config.get('app.env');

const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

// Boot sequence
async function boot() {
  try {
    // Test database connection
    await testConnection();
    logger.info('Database connection established');

    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} [${ENV}]`);
      logger.info(`Health: http://localhost:${PORT}/health`);
      logger.info(`API:    http://localhost:${PORT}/api/v1`);
    });
  } catch (err) {
    logger.error('❌ Server failed to start:', err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received — shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
  process.exit(1);
});

boot();
