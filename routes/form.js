const express = require('express');
const router = express.Router();
const FormData = require('../models/FormData');
const jwt = require('jsonwebtoken'); // You might not need this if you're not using JWT
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');

// Helper function to handle Base64 decoding and saving
const saveBase64Image = (base64String, uploadDir) => {
    // Check if the uploads directory exists, if not, create it
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Regular expression to match the data URI prefix and extract the data
    const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
        throw new Error('Invalid Base64 string format.');
    }

    const type = matches[1]; // e.g., 'image/png'
    const data = matches[2];
    const buffer = Buffer.from(data, 'base64');
    const extension = type.split('/')[1];
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;
    const filePath = path.join(uploadDir, fileName);

    fs.writeFileSync(filePath, buffer);
    return `/uploads/${fileName}`; // Return the path relative to the server
};



// Set up the static directory for serving uploaded files
router.use('/uploads', express.static('uploads'));

// Submit form data
router.post('/submit', async (req, res) => {
    try {
        const { buildingPhoto, mainGatePhoto, ...formData } = req.body;
        const uploadsDir = path.join(__dirname, '..', 'uploads');

        // Check if both Base64 strings were provided
        if (!buildingPhoto || !mainGatePhoto) {
            return res.status(400).json({ error: 'Both buildingPhoto and mainGatePhoto are required.' });
        }

        // Save the Base64 images and get their file paths
        const buildingPhotoPath = saveBase64Image(buildingPhoto, uploadsDir);
        const mainGatePhotoPath = saveBase64Image(mainGatePhoto, uploadsDir);

        // Create a new form entry with the file paths
        const newFormEntry = new FormData({
            ...formData,
            buildingPhoto: buildingPhotoPath,
            mainGatePhoto: mainGatePhotoPath,
        });

        await newFormEntry.save();
        res.status(201).json({ message: 'Form submitted successfully' });
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

// New route to download all data as an Excel sheet with images
router.get('/download-excel', async (req, res) => {
    try {
        const data = await FormData.find().sort({ createdAt: -1 });

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Form Data');

        // Dynamically create columns from the schema, including nested tenant details
        const columns = [];
        for (const key of Object.keys(FormData.schema.paths)) {
            // Check if the path is a nested object and if it contains 'tenantDetails'
            if (key.includes('tenantDetails.')) {
                // Format nested path for the header (e.g., 'tenantDetails.monthlyRent' -> 'Monthly Rent')
                const header = key.split('.')[1].replace(/([A-Z])/g, ' $1').trim();
                columns.push({ header: header, key: key, width: 20 });
            } else if (key !== 'tenantDetails') {
                // Exclude the parent 'tenantDetails' key itself
                const header = key.replace(/([A-Z])/g, ' $1').trim();
                columns.push({ header: header, key: key, width: 20 });
            }
        }
        worksheet.columns = columns;

        // Add rows with image handling
        for (const entry of data) {
            const entryObject = entry.toObject();

            // Flatten tenantDetails
            if (entryObject.tenantDetails) {
                for (const detailKey in entryObject.tenantDetails) {
                    entryObject[`tenantDetails.${detailKey}`] = entryObject.tenantDetails[detailKey];
                }
                delete entryObject.tenantDetails;
            }

            // Remove image paths so they don’t get added as text
            const buildingPath = entryObject.buildingPhoto;
            const mainGatePath = entryObject.mainGatePhoto;
            delete entryObject.buildingPhoto;
            delete entryObject.mainGatePhoto;

            // Add row without image fields
            const row = worksheet.addRow(entryObject);

            // Helper to embed an image
            const addImageToCell = (filePath, colIndex) => {
                if (filePath) {
                    const imagePath = path.join(__dirname, '..', filePath);

                    if (fs.existsSync(imagePath)) {
                        const imageId = workbook.addImage({
                            filename: imagePath,
                            extension: imagePath.split('.').pop()
                        });

                        const currentRow = worksheet.getRow(row.number);
                        currentRow.height = 100;

                        worksheet.addImage(imageId, {
                            tl: { col: colIndex, row: row.number - 1 },
                            ext: { width: 100, height: 100 }
                        });
                    }
                }
            };

            const buildingPhotoColIndex = columns.findIndex(col => col.key === 'buildingPhoto');
            const mainGatePhotoColIndex = columns.findIndex(col => col.key === 'mainGatePhoto');

            if (buildingPhotoColIndex !== -1) addImageToCell(buildingPath, buildingPhotoColIndex);
            if (mainGatePhotoColIndex !== -1) addImageToCell(mainGatePath, mainGatePhotoColIndex);
        }



        // Set headers and write the workbook
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=formData.xlsx');
        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error('Error generating Excel file:', err);
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