// routes/export.js
const express = require("express");
const router = express.Router();
const { excelQueue } = require("../queue");

// POST /api/export  -> enqueue job
router.post("/export", async (req, res) => {
  try {
    const filters = req.body?.filters || {}; // optional filters
    const job = await excelQueue.add("generate-excel", { filters }, {
      removeOnComplete: { age: 60 * 60 * 24 * 7, count: 10 }, // keep meta for a week
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

// GET /api/export/:jobId/status -> poll for job state + downloadUrl when ready
router.get("/export/:jobId/status", async (req, res) => {
  const job = await excelQueue.getJob(req.params.jobId);
  if (!job) return res.status(404).json({ status: "notfound" });

  const state = await job.getState();
  const progress = job.progress;
  const returnValue = job.returnvalue;

  res.json({
    status: state,
    progress,
    downloadUrl: returnValue?.downloadUrl || null,
  });
});

module.exports = router;
