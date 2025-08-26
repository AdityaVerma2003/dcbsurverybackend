// redis.js
require("dotenv").config();
const { URL } = require("url");

const redisUrl = new URL(process.env.UPSTASH_REDIS_URL);

// Extracted connection details
const redisConnection = {
  host: redisUrl.hostname,
  port: redisUrl.port,
  username: redisUrl.username,
  password: redisUrl.password,
  tls: { rejectUnauthorized: false }, // Upstash requires TLS
};

// Debug logs
console.log("🔧 Redis Connection Details:");
console.log("Host:", redisConnection.host);
console.log("Port:", redisConnection.port);
console.log("Username:", redisConnection.username);
console.log("Password:", redisConnection.password ? "✅ Exists" : "❌ Missing");
console.log("TLS Enabled:", !!redisConnection.tls);

module.exports = { redisConnection };
