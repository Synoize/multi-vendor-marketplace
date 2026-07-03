/**
 * Damini Marketplace - Database Fresh (Drop + Migrate + Seed)
 * WARNING: This destroys all data!
 */

const mysql = require('mysql2/promise');
const config = require('config');

async function fresh() {
  const dbConfig = config.get('database');

  const conn = await mysql.createConnection({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    multipleStatements: true,
  });

  console.log('⚠️  WARNING: This will DROP and recreate the database!');
  console.log(`📦 Dropping database: ${dbConfig.name}`);

  await conn.query(`DROP DATABASE IF EXISTS \`${dbConfig.name}\``);
  console.log('✅ Database dropped');
  await conn.end();

  // Run migration
  console.log('🔄 Running migration...');
  require('./migrate');
}

fresh().catch(err => {
  console.error('❌ Fresh failed:', err.message);
  process.exit(1);
});
