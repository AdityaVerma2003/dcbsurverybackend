const express = require("express");
const router = express.Router();
const { excelQueue } = require("../queue");
const { excelQueueEvents } = require("../queueEvents");

// POST /api/export  -> enqueue job
router.post("/export", async (req, res) => {
  try {
    const filters = req.body?.filters || {};
    const job = await excelQueue.add("generate-excel", { filters }, {
      removeOnComplete: { age: 60 * 60 * 24 * 7, count: 10 },
      removeOnFail: { age: 60 * 60 * 24 * 7, count: 10 },
      attempts: 2,
      backoff: { type: "exponential", delay: 5000 },
    });

    res.json({ ok: true, jobId: job.id });
  } catch (e) {
    console.error("Error enqueueing export job:", e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 🔥 NEW: SSE stream for job status
router.get("/export/:jobId/stream", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const { jobId } = req.params;

  // Progress updates
  excelQueueEvents.on("progress", ({ jobId: id, data }) => {
    if (id === jobId) {
      res.write(`event: progress\n`);
      res.write(`data: ${JSON.stringify({ progress: data })}\n\n`);
    }
  });

  // Completed
  excelQueueEvents.on("completed", ({ jobId: id, returnvalue }) => {
    if (id === jobId) {
      res.write(`event: completed\n`);
      res.write(`data: ${JSON.stringify(returnvalue)}\n\n`);
      res.end();
    }
  });

  // Failed
  excelQueueEvents.on("failed", ({ jobId: id, failedReason }) => {
    if (id === jobId) {
      res.write(`event: failed\n`);
      res.write(`data: ${JSON.stringify({ error: failedReason })}\n\n`);
      res.end();
    }
  });
});

module.exports = router;
