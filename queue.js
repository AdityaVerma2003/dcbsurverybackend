// queue.js
const { Queue } = require("bullmq");
const { redisConnection } = require("./redis");

console.log("⚙️  Initializing Excel Queue with Redis connection:");

const excelQueue = new Queue("excelQueue", {
  connection: redisConnection,
});

// Log when the queue is ready
excelQueue.on("ready", () => {
  console.log("✅ Excel Queue is ready and successfully connected to Redis!");
});

// Log whenever a job is added
excelQueue.on("waiting", (jobId) => {
  console.log(`⏳ Job with ID ${jobId} is waiting in the queue...`);
});

// Log whenever a job becomes active
excelQueue.on("active", (job) => {
  console.log(`🚀 Job ${job.id} is now being processed...`);
});

// Log whenever a job is completed
excelQueue.on("completed", (job) => {
  console.log(`✅ Job ${job.id} has been completed!`);
});

// Log whenever a job fails
excelQueue.on("failed", (job, err) => {
  console.error(`❌ Job ${job.id} failed with error:`, err);
});

// Log if queue itself errors
excelQueue.on("error", (err) => {
  console.error("❌ Excel Queue connection error:", err);
});

module.exports = { excelQueue };
