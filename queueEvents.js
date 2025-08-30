// queueEvents.js
const { QueueEvents } = require("bullmq");
const { redisConnection } = require("./redis");

const excelQueueEvents = new QueueEvents("excelQueue", {
  connection: redisConnection,
});

// Important: wait until connected
excelQueueEvents.on("completed", ({ jobId, returnvalue }) => {
  console.log(`✅ Job ${jobId} completed`);
});

excelQueueEvents.on("failed", ({ jobId, failedReason }) => {
  console.error(`❌ Job ${jobId} failed: ${failedReason}`);
});

module.exports = { excelQueueEvents };
