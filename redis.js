// redis.js
require("dotenv").config();
const { URL } = require("url");

if (!process.env.REDIS_URL) {
  throw new Error("❌ REDIS_URL is not defined in environment variables");
}

const redisUrl = new URL(process.env.REDIS_URL);

const redisConnection = {
  host: redisUrl.hostname,
  port: redisUrl.port,
  password: redisUrl.password || undefined,
  username: redisUrl.username || undefined,
  // TLS only if "rediss://" is used in Render
  ...(redisUrl.protocol === "rediss:" ? { tls: { rejectUnauthorized: false } } : {}),
};

// Debug logs (don’t log password directly)
console.log("🔧 Redis Connection Details:");
console.log("Host:", redisConnection.host);
console.log("Port:", redisConnection.port);
console.log("Username:", redisConnection.username || "❌ None");
console.log("Password:", redisConnection.password ? "✅ Exists" : "❌ Missing");
console.log("TLS Enabled:", !!redisConnection.tls);

module.exports = { redisConnection };
