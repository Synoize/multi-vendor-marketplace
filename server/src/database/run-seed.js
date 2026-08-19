const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
const config = require("config");

async function runSeed() {
  const dbConfig = config.get("database");
  const conn = await mysql.createConnection({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    multipleStatements: true,
    charset: "utf8mb4",
  });

  console.log("🌱 Seeding database...");
  try {
    const sql = fs.readFileSync(path.join(__dirname, "seed.sql"), "utf8");
    await conn.query(sql);
    console.log("✅ Database seeding complete!");
    console.log("");
    console.log("Default credentials:");
    console.log("  Admin:    admin@damini.com    / Admin@123");
  } catch (err) {
    console.error("❌ Seeder failed:", err.message);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

runSeed();
