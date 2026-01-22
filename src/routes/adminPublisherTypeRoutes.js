const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const {
  createPublisherType,
  getPublisherTypes,
  getAllPublisherTypesAdmin,
  deactivatePublisherType,
  updatePublisherType,
  deletePublisherType
} = require("../controllers/adminPublisherTypeController");

// Admin only
router.post("/create", protect, role("admin"), createPublisherType);
router.get("/", protect, role("admin"), getAllPublisherTypesAdmin);
router.patch("/:id", protect, role("admin"), updatePublisherType);
router.delete("/:id", protect, role("admin"), deletePublisherType);
router.patch("/deactivate/:id", protect, role("admin"), deactivatePublisherType);

module.exports = router;
