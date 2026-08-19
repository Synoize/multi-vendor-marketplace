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

    // Add 'mid' to banners position ENUM if not already present
    await conn.query(
      `ALTER TABLE \`${dbConfig.name}\`.\`banners\`
       MODIFY COLUMN \`position\` ENUM('hero','category','offer','sidebar','popup','mid')
       NOT NULL DEFAULT 'hero'`
    ).catch(() => {/* ignore if already updated */});

    // Add email column to addresses table
    await conn.query(
      `ALTER TABLE \`${dbConfig.name}\`.\`addresses\`
       ADD COLUMN IF NOT EXISTS \`email\` VARCHAR(200) NULL AFTER \`phone\``
    ).catch(async () => {
      try {
        await conn.query(`SELECT \`email\` FROM \`${dbConfig.name}\`.\`addresses\` LIMIT 1`);
      } catch {
        await conn.query(
          `ALTER TABLE \`${dbConfig.name}\`.\`addresses\`
           ADD COLUMN \`email\` VARCHAR(200) NULL AFTER \`phone\``
        );
      }
    });

    // Add new KYC document columns to vendors table
    const newColumns = [
      { name: 'business_email', type: 'VARCHAR(200) NULL' },
      { name: 'business_email_verified', type: 'TINYINT(1) NOT NULL DEFAULT 0' },
      { name: 'business_email_otp', type: 'VARCHAR(200) NULL' },
      { name: 'business_email_otp_expires', type: 'DATETIME NULL' },
      { name: 'aadhar_image_front', type: 'VARCHAR(500) NULL' },
      { name: 'aadhar_image_back', type: 'VARCHAR(500) NULL' },
      { name: 'passport_photo', type: 'VARCHAR(500) NULL' },
      { name: 'udyam_certificate', type: 'VARCHAR(500) NULL' },
      { name: 'bank_passbook', type: 'VARCHAR(500) NULL' },
    ];
    for (const col of newColumns) {
      await conn.query(
        `ALTER TABLE \`${dbConfig.name}\`.\`vendors\`
         ADD COLUMN IF NOT EXISTS \`${col.name}\` ${col.type}`
      ).catch(async () => {
        // Fallback for MySQL < 8.0
        try {
          await conn.query(`SELECT \`${col.name}\` FROM \`${dbConfig.name}\`.\`vendors\` LIMIT 1`);
        } catch {
          await conn.query(
            `ALTER TABLE \`${dbConfig.name}\`.\`vendors\`
             ADD COLUMN \`${col.name}\` ${col.type}`
          );
        }
      });
    }

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
