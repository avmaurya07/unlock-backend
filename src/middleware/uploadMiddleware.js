const multer = require("multer");

// Memory storage (best for servers like DigitalOcean)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Allow images + pdf (customize if needed)
  const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

  if (!allowed.includes(file.mimetype)) {
    return cb(new Error("Only JPG, PNG, WEBP, PDF allowed"), false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
});

module.exports = upload;
