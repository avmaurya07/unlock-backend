const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");

const {
  getAdminSummaryStats,
  getListingsByTypeStats,
  getListingsTrendStats
} = require("../controllers/adminDashboardController");

router.get("/summary", protect, role("admin"), getAdminSummaryStats);
router.get("/listings-by-type", protect, role("admin"), getListingsByTypeStats);
router.get("/listings-trends", protect, role("admin"), getListingsTrendStats);

module.exports = router;
