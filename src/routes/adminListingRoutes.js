const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");

const {
  adminListListings,
  adminGetListingById,
  adminApproveListing,
  adminRejectListing,
} = require("../controllers/adminListingController");

// List with filters + pagination
router.get("/", protect, role("admin"), adminListListings);

// Single listing detail (for review screen)
router.get("/:id", protect, role("admin"), adminGetListingById);

// Approve / Reject
router.patch("/:id/approve", protect, role("admin"), adminApproveListing);
router.patch("/:id/reject", protect, role("admin"), adminRejectListing);

module.exports = router;
