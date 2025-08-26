
const ExcelJS = require("exceljs");
const os = require("os");
const path = require("path");
const fs = require("fs");
const cloudinary = require("../cloudinary");
const FormData = require("../models/FormData");

async function generateExcelFile(filters = {}, job = null) {
  // count for progress estimation (optional, but helpful)
const totalSteps = 100; // simulate for now, or use rows.length
  for (let i = 0; i <= totalSteps; i += 10) {
    await new Promise(r => setTimeout(r, 500)); // simulate work
    if (job) await job.updateProgress(i); // 👈 report progress
  }

  const total = await FormData.countDocuments(filters);

  const tmpDir = os.tmpdir();
  const fileName = `surveys_${Date.now()}.xlsx`;
  const filePath = path.join(tmpDir, fileName);

  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
    filename: filePath,
    useStyles: true,
    useSharedStrings: true,
  });

  const sheet = workbook.addWorksheet("Surveys");

  // Define columns based on your schema (adjust widths as needed)
  sheet.columns = [
    { header: "Surveyor Name", key: "surveyorName", width: 20 },
    { header: "Phone", key: "phone", width: 15 },
    { header: "Date", key: "date", width: 20 },
    { header: "Ward No", key: "wardNo", width: 10 },
    { header: "Property Address", key: "propertyAddress", width: 30 },
    { header: "Zip Code", key: "zipCode", width: 12 },
    { header: "Latitude", key: "latitude", width: 12 },
    { header: "Longitude", key: "longitude", width: 12 },
    { header: "Occupiers Name", key: "occupiersName", width: 20 },
    { header: "Gender", key: "gender", width: 10 },
    { header: "Father Name", key: "fatherName", width: 20 },
    { header: "Mother Name", key: "motherName", width: 20 },
    { header: "Contact Number", key: "contactNumber", width: 15 },
    { header: "Owner Or Tenant", key: "ownerOrTenant", width: 12 },

    // tenantDetails fields (flattened)
    { header: "Monthly Rent", key: "tenantDetails.monthlyRent", width: 12 },
    { header: "Owner Name", key: "tenantDetails.ownerName", width: 20 },
    { header: "Owner Father Name", key: "tenantDetails.ownerFatherName", width: 20 },
    { header: "Owner Mother Name", key: "tenantDetails.ownerMotherName", width: 20 },
    { header: "Owner Contact Number", key: "tenantDetails.ownerContactNumber", width: 15 },
    { header: "Tenant Street Address", key: "tenantDetails.streetAddress", width: 30 },
    { header: "Tenant Zip Code", key: "tenantDetails.zipCode", width: 12 },

    { header: "Area Of Plot", key: "areaOfPlot", width: 12 },
    { header: "Nature Of Building", key: "natureOfBuilding", width: 20 },
    { header: "Number Of Floors", key: "numberOfFloors", width: 12 },
    { header: "Floor", key: "floor", width: 10 },
    { header: "Floor Area", key: "floorArea", width: 12 },
    { header: "Usage Type", key: "usageType", width: 15 },

    // Image URLs (Cloudinary)
    { header: "Main Gate Photo URL", key: "mainGatePhoto", width: 50 },
    { header: "Building Photo URL", key: "buildingPhoto", width: 50 },

    { header: "Created At", key: "createdAt", width: 20 },
  ];

  // Stream DB cursor (keeps memory low)
  const cursor = FormData.find(filters).sort({ createdAt: -1 }).cursor();
  let count = 0;

  for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
    const obj = doc.toObject();

    // Flatten tenantDetails
    if (obj.tenantDetails) {
      for (const k of Object.keys(obj.tenantDetails)) {
        obj[`tenantDetails.${k}`] = obj.tenantDetails[k];
      }
    }

    const row = {
      surveyorName: obj.surveyorName || "",
      phone: obj.phone || "",
      date: obj.date ? new Date(obj.date).toISOString() : "",
      wardNo: obj.wardNo || "",
      propertyAddress: obj.propertyAddress || "",
      zipCode: obj.zipCode || "",
      latitude: obj.latitude ?? "",
      longitude: obj.longitude ?? "",
      occupiersName: obj.occupiersName || "",
      gender: obj.gender || "",
      fatherName: obj.fatherName || "",
      motherName: obj.motherName || "",
      contactNumber: obj.contactNumber || "",
      ownerOrTenant: obj.ownerOrTenant || "",

      "tenantDetails.monthlyRent": obj["tenantDetails.monthlyRent"] ?? "",
      "tenantDetails.ownerName": obj["tenantDetails.ownerName"] || "",
      "tenantDetails.ownerFatherName": obj["tenantDetails.ownerFatherName"] || "",
      "tenantDetails.ownerMotherName": obj["tenantDetails.ownerMotherName"] || "",
      "tenantDetails.ownerContactNumber": obj["tenantDetails.ownerContactNumber"] || "",
      "tenantDetails.streetAddress": obj["tenantDetails.streetAddress"] || "",
      "tenantDetails.zipCode": obj["tenantDetails.zipCode"] || "",

      areaOfPlot: obj.areaOfPlot ?? "",
      natureOfBuilding: obj.natureOfBuilding || "",
      numberOfFloors: obj.numberOfFloors || "",
      floor: obj.floor || "",
      floorArea: obj.floorArea ?? "",
      usageType: obj.usageType || "",

      mainGatePhoto: obj.mainGatePhoto || "",
      buildingPhoto: obj.buildingPhoto || "",

      createdAt: obj.createdAt ? new Date(obj.createdAt).toISOString() : "",
    };

    sheet.addRow(row).commit();
    count++;

    // Update job progress every N rows if job object provided
    if (job && total > 0 && count % 200 === 0) {
      const percent = Math.min(99, Math.floor((count / total) * 100));
      try { await job.updateProgress(percent); } catch (e) { /* ignore */ }
    }
  }

  sheet.commit();
  await workbook.commit();

  // Upload XLSX to Cloudinary as raw file
  const uploadResult = await cloudinary.uploader.upload(filePath, {
    resource_type: "raw",
    folder: "dcbsurvey",
    use_filename: true,
    unique_filename: false,
    overwrite: true,
  });

  // Clean up temp file
  try { fs.unlinkSync(filePath); } catch (e) { /* ignore */ }

  return { downloadUrl: uploadResult.secure_url, totalRows: count };
}

module.exports = { generateExcelFile };
