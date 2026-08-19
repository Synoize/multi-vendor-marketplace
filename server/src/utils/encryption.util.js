const crypto = require("crypto");
const config = require("config");

const ALGORITHM = "aes-256-gcm";
const KEY = crypto.scryptSync(config.get("app.encryptionKey"), "damini_kyc_salt", 32);

function encrypt(buffer) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]);
}

function decrypt(encrypted) {
  const iv = encrypted.subarray(0, 16);
  const authTag = encrypted.subarray(16, 32);
  const data = encrypted.subarray(32);
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(data), decipher.final()]);
}

module.exports = { encrypt, decrypt };
