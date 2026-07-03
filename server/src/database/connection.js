/**
 * Damini Marketplace - MySQL Database Connection
 * Uses mysql2 connection pool for performance
 */

const mysql = require('mysql2/promise');
const config = require('config');
const logger = require('../utils/logger.util');

const dbConfig = config.get('database');

// Create connection pool
const pool = mysql.createPool({
  host: dbConfig.host,
  port: dbConfig.port,
  database: dbConfig.name,
  user: dbConfig.user,
  password: dbConfig.password,
  connectionLimit: dbConfig.connectionLimit || 10,
  charset: dbConfig.charset || 'utf8mb4',
  waitForConnections: true,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  timezone: '+05:30',
  dateStrings: false,
  multipleStatements: false, // Security: prevent SQL injection via multiple statements
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
  const [rows] = await query('SELECT 1 AS ok');
  if (rows[0].ok !== 1) throw new Error('Database health check failed');
  return true;
}

/**
 * Get raw pool for advanced use cases
 */
function getPool() {
  return pool;
}

module.exports = { pool, query, queryRows, queryOne, transaction, testConnection, getPool };
