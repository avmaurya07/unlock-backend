const { uploadBufferToCloudinary } = require("../utils/cloudinaryUpload");
const cloudinary = require("../config/cloudinary");

exports.uploadFiles = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: "No files uploaded" });
    }

    const folder = process.env.CLOUDINARY_FOLDER || "unlock";

    const uploaded = [];

    for (const file of req.files) {
      const result = await uploadBufferToCloudinary(file.buffer, {
        folder: `${folder}/listings`,
      });

      uploaded.push({
        url: result.secure_url,
        publicId: result.public_id,
        resourceType: result.resource_type, // image / raw / video
        originalName: file.originalname,
        mimeType: file.mimetype,
        bytes: result.bytes,
      });
    }

    return res.json({
      success: true,
      message: "Files uploaded successfully",
      files: uploaded,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Upload failed",
      error: err.message,
    });
  }
};

exports.deleteFile = async (req, res) => {
  try {
    const { publicId, resourceType } = req.body;

    if (!publicId) {
      return res.status(400).json({ success: false, message: "publicId is required" });
    }

    // resourceType matters sometimes (image vs raw). Default to "image" if missing.
    const rt = resourceType || "image";

    const result = await cloudinary.uploader.destroy(publicId, { resource_type: rt });

    return res.json({
      success: true,
      message: "File delete attempted",
      result,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Delete failed", error: err.message });
  }
};
