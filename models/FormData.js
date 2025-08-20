const mongoose = require('mongoose');

const formDataSchema = new mongoose.Schema({
  surveyorName: { type: String, required: true },
  phone: { type: String, required: true },
  date: { type: Date, required: true },
  wardNo: { type: String, required: true },
  propertyAddress: { type: String, required: true },
  zipCode: { type: String, required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  occupiersName: { type: String, required: true },
  gender: { type: String, required: true },
  fatherName: { type: String, required: true },
  motherName: { type: String, required: true },
  contactNumber: { type: String, required: true },
  ownerOrTenant: { type: String, required: true },
  tenantDetails: {
    monthlyRent: { type: Number, required: false },
    ownerName: { type: String, required: false },
    ownerFatherName: { type: String, required: false },
    ownerMotherName: { type: String, required: false },
    ownerContactNumber: { type: String, required: false },
    streetAddress: { type: String, required: false },
    zipCode: { type: String, required: false },
  },
  areaOfPlot: { type: Number, required: true },
  natureOfBuilding: { type: String, required: true },
  numberOfFloors: { type: [String], required: true },
  floorArea: { type: Number, required: true },
  usageType: { type: String, required: true },
  mainGatePhoto: { type: String, required: true },
  buildingPhoto: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const FormData = mongoose.model('FormData', formDataSchema);
module.exports = FormData;