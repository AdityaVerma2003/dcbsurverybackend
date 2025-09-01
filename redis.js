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
console.log("🔧 Redis Connected");
module.exports = { redisConnection };
