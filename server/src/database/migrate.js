/**
 * Damini Marketplace - Database Migration Runner
 * Reads schema.sql and applies it to MySQL
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const config = require('config');

async function migrate() {
  const dbConfig = config.get('database');

  // Connect without database specified first (to create it if needed)
  const conn = await mysql.createConnection({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    multipleStatements: true,
    charset: 'utf8mb4',
  });

  console.log('🔗 Connected to MySQL');
  console.log('📦 Running migrations...');

  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    // Execute the entire schema
    await conn.query(sql);

    console.log('✅ All tables created/updated successfully!');
    console.log('');
    console.log('Tables created:');
    const [tables] = await conn.query(`SHOW TABLES FROM \`${dbConfig.name}\``);
    tables.forEach(t => console.log(`  ✓ ${Object.values(t)[0]}`));

  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

migrate();
