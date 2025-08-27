const express = require('express');
const router = express.Router();
const FormData = require('../models/FormData');

const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');
const uploadBase64Image = require("../helpers/uploadBase64");


router.get("/ping", (req, res) => {
  res.status(200).json({ ok: true, time: new Date().toISOString() });
});

// Submit form data - now stores Cloudinary URLs instead of saving local files
router.post('/submit', async (req, res) => {
  try {
    const { buildingPhoto, mainGatePhoto, ...formData } = req.body;

    if (!buildingPhoto || !mainGatePhoto) {
      return res.status(400).json({ error: 'Both buildingPhoto and mainGatePhoto are required.' });
    }

    // Upload to Cloudinary
    const [buildingPhotoUrl, mainGatePhotoUrl] = await Promise.all([
      uploadBase64Image(buildingPhoto, "dcbsurvey"),
      uploadBase64Image(mainGatePhoto, "dcbsurvey"),
    ]);

    const newFormEntry = new FormData({
      ...formData,
      buildingPhoto: buildingPhotoUrl,
      mainGatePhoto: mainGatePhotoUrl,
    });

    await newFormEntry.save();
    res.status(201).json({ message: 'Form submitted successfully', data: newFormEntry });
  } catch (err) {
    console.error('Error submitting form:', err);
    res.status(500).send('Server error');
  }
});

// Get all form data (Admin only)
router.get('/data', async (req, res) => {
    try {
        const data = await FormData.find().sort({ createdAt: -1 });
        res.json(data);
    } catch (err) {
        console.error('Error fetching data:', err);
        res.status(500).send('Server error');
    }
});

// Delete a form entry by ID
router.delete('/delete/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const entry = await FormData.findById(id);

        if (!entry) {
            return res.status(404).json({ error: "Form entry not found" });
        }

        // Optionally: remove uploaded images from disk
        const deleteFile = (filePath) => {
            try {
                const fullPath = path.join(__dirname, '..', filePath);
                if (fs.existsSync(fullPath)) {
                    fs.unlinkSync(fullPath);
                }
            } catch (err) {
                console.error("Error deleting file:", err);
            }
        };

        if (entry.buildingPhoto) deleteFile(entry.buildingPhoto);
        if (entry.mainGatePhoto) deleteFile(entry.mainGatePhoto);

        await FormData.findByIdAndDelete(id);

        res.json({ message: "Form entry deleted successfully" });
    } catch (err) {
        console.error("Error deleting form entry:", err);
        res.status(500).send("Server error");
    }
});


module.exports = router;