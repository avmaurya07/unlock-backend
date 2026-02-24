const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const {
  createListing,
  updateListing,
  deleteListing,
  getMyListings,
  getListingById,
} = require("../controllers/publisherServiceListingController");

router.post("/", protect, role("publisher"), createListing);
router.get("/", protect, role("publisher"), getMyListings);
router.get("/:id", protect, role("publisher"), getListingById);
router.patch("/:id", protect, role("publisher"), updateListing);
router.delete("/:id", protect, role("publisher"), deleteListing);

module.exports = router;
