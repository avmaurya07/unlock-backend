const express = require("express");
const router = express.Router();

const {protect} = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const subscriptionCheck = require("../middleware/subscriptionCheck");
const upload = require("../middleware/uploadMiddleware");

const { uploadFiles, deleteFile } = require("../controllers/uploadController");

// Upload multiple files: field name "files"
router.post(
  "/",
  protect,
  role("publisher"),
  subscriptionCheck,
  upload.array("files", 10),
  uploadFiles
);

// Delete file by publicId
router.delete("/", protect, role("publisher"), subscriptionCheck, deleteFile);

module.exports = router;
