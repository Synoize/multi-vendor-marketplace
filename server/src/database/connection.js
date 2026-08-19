/**
 * Damini Marketplace - MySQL Database Connection
 * Uses mysql2 connection pool for performance
 */

const mysql = require("mysql2/promise");
const config = require("config");
const logger = require("../utils/logger.util");

const NODE_ENV = process.env.NODE_ENV || config.get("app.env");

// node-config loads local.yaml last, and local.yaml (a dev-only file) would
// otherwise override production.yaml with local dev credentials. In production,
// read the database block directly from production.yaml so dev settings never
// leak onto the server.
let dbConfig = config.get("database");
if (NODE_ENV === "production") {
  const src = config.util.getConfigSources().find((s) => /production\.(ya?ml|json)$/i.test(s.name));
  if (src && src.parsed && src.parsed.database) {
    dbConfig = src.parsed.database;
  }
}

// Create connection pool
// Env vars (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD) override
// config files so credentials can be set in Hostinger without committing them.
const pool = mysql.createPool({
  host: process.env.DB_HOST || dbConfig.host,
  port: Number(process.env.DB_PORT) || dbConfig.port,
  database: process.env.DB_NAME || dbConfig.name,
  user: process.env.DB_USER || dbConfig.user,
  password: process.env.DB_PASSWORD || dbConfig.password,
  connectionLimit: dbConfig.connectionLimit || 25,
  charset: dbConfig.charset || "utf8mb4",
  waitForConnections: true,
  queueLimit: 0,
  acquireTimeout: 30000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  idleTimeout: 10000,
  timezone: "+05:30",
  dateStrings: false,
  multipleStatements: false,
});

pool.on("acquire", (connection) => {
  logger.debug(`Connection ${connection.threadId} acquired`);
});

pool.on("release", (connection) => {
  logger.debug(`Connection ${connection.threadId} released`);
});

pool.on("enqueue", () => {
  logger.warn("Waiting for available connection slot");
});

/**
 * Execute a parameterized query
 * @param {string} sql - SQL query with ? placeholders
 * @param {Array} params - Query parameters
 * @returns {Promise<[results, fields]>}
 */
async function query(sql, params = []) {
  const connection = await pool.getConnection();
  try {
    const [results, fields] = await connection.execute(sql, params);
    return [results, fields];
  } finally {
    connection.release();
  }
}

/**
 * Execute a query and return only results array
 */
async function queryRows(sql, params = []) {
  const [rows] = await query(sql, params);
  return rows;
}

/**
 * Execute a query and return first row or null
 */
async function queryOne(sql, params = []) {
  const rows = await queryRows(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Execute multiple queries in a transaction
 * @param {Function} callback - Receives connection, returns Promise
 */
async function transaction(callback) {
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  try {
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Test database connection
 */
async function testConnection() {
  const [rows] = await query("SELECT 1 AS ok");
  if (rows[0].ok !== 1) throw new Error("Database health check failed");
  return true;
}

/**
 * Get raw pool for advanced use cases
 */
function getPool() {
  return pool;
}

module.exports = {
  pool,
  query,
  queryRows,
  queryOne,
  transaction,
  testConnection,
  getPool,
};
