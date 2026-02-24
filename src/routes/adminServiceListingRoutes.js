const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const {
  createListing,
  updateListing,
  deleteListing,
  getListingsAdmin,
  approveListing,
  rejectListing,
} = require("../controllers/adminServiceListingController");

router.post("/", protect, role("admin"), createListing);
router.get("/", protect, role("admin"), getListingsAdmin);
router.patch("/:id", protect, role("admin"), updateListing);
router.delete("/:id", protect, role("admin"), deleteListing);
router.patch("/:id/approve", protect, role("admin"), approveListing);
router.patch("/:id/reject", protect, role("admin"), rejectListing);

module.exports = router;
