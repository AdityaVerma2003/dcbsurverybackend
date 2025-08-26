// helpers/uploadBase64.js
const cloudinary = require("../cloudinary");

async function uploadBase64Image(base64String, folder = "dcbsurvey") {
  if (!base64String) return null;
  // cloudinary can accept data URIs directly
  // limit allowed types in frontend / validate on backend if needed
  const result = await cloudinary.uploader.upload(base64String, {
    folder,
    resource_type: "image",
    use_filename: true,
    unique_filename: false,
  });
  return result.secure_url; // store this in DB
}

module.exports = uploadBase64Image;
