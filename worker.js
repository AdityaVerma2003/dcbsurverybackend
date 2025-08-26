// worker.js
require("dotenv").config();
const mongoose = require("mongoose");
const { Worker, QueueEvents } = require("bullmq");
const { redisConnection } = require("./redis"); // ✅ use redisConnection directly
const { generateExcelFile } = require("./helpers/generateExcel");

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ Worker: MongoDB connected successfully"))
.catch(err => { 
  console.error("❌ Worker: MongoDB connection error", err); 
  process.exit(1); 
});

// Worker setup
const worker = new Worker(
  "excelQueue", // ✅ must match queue name in queue.js
  async (job) => {
    console.log(`📥 Worker: Received job ${job.id} with data:`, job.data);

    try {
      const filters = job.data?.filters || {};
      console.log(`⚙️ Worker: Starting Excel generation for job ${job.id}...`);

      // Call the generator
      const result = await generateExcelFile(filters, job);

      console.log(`✅ Worker: Job ${job.id} completed successfully`);
      return result;

    } catch (err) {
      console.error(`❌ Worker: Error processing job ${job.id}`, err);
      throw err;
    }
  },
  { connection: redisConnection } // ✅ proper connection
);

// Queue Events
const qe = new QueueEvents("excelQueue", { connection: redisConnection });

qe.on("completed", ({ jobId }) => {
  console.log(`🎉 QueueEvents: Job ${jobId} marked as completed`);
});

qe.on("failed", ({ jobId, failedReason }) => {
  console.error(`🔥 QueueEvents: Job ${jobId} failed - Reason: ${failedReason}`);
});

qe.on("active", ({ jobId }) => {
  console.log(`⏳ QueueEvents: Job ${jobId} is now active`);
});

// Worker error handling
worker.on("error", (err) => {
  console.error("🚨 Worker internal error:", err);
});

// Redis connection test
(async () => {
  try {
    const { default: IORedis } = await import("ioredis");
    const client = new IORedis(redisConnection);
    await client.ping();
    console.log("🔗 Worker: Successfully connected to Redis");
    client.disconnect();
  } catch (err) {
    console.error("❌ Worker: Redis connection error", err);
  }
})();
