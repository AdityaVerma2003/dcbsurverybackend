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

        // Define columns dynamically
        const columns = Object.keys(FormData.schema.paths).map(key => ({
            header: key.replace(/([A-Z])/g, ' $1').trim(), // Make headers more readable
            key: key,
            width: 20
        }));
        worksheet.columns = columns;

        // Add rows with image handling
        for (const entry of data) {
            const entryObject = entry.toObject();
            const row = worksheet.addRow(entryObject);

            // Function to add an image to a specific cell
            const addImageToCell = (key, cellIndex) => {
                if (entryObject[key]) {
                    const imagePath = path.join(__dirname, '..', entryObject[key]);
                    if (fs.existsSync(imagePath)) {
                        const imageId = workbook.addImage({
                            filename: imagePath,
                            extension: imagePath.split('.').pop()
                        });

                        // Set a fixed height for image rows
                        const currentRow = worksheet.getRow(row.number);
                        currentRow.height = 100;

                        // Add the image to the cell
                        worksheet.addImage(imageId, {
                            tl: { col: cellIndex, row: row.number - 1 },
                            ext: { width: 100, height: 100 }
                        });
                    }
                }
            };
            
            // Find the column index for 'buildingPhoto' and 'mainGatePhoto'
            const buildingPhotoColIndex = columns.findIndex(col => col.key === 'buildingPhoto');
            const mainGatePhotoColIndex = columns.findIndex(col => col.key === 'mainGatePhoto');
            
            // Add images if paths exist
            if (buildingPhotoColIndex !== -1) {
                addImageToCell('buildingPhoto', buildingPhotoColIndex);
            }
            if (mainGatePhotoColIndex !== -1) {
                addImageToCell('mainGatePhoto', mainGatePhotoColIndex);
            }
        }
        
        // Set headers to trigger file download
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=formData.xlsx');

        // Write the workbook and send it
        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {
        console.error('Error generating Excel file:', err);
        res.status(500).send('Server error');
    }
});

module.exports = router;