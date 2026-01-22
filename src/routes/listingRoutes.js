const express = require("express");
const router = express.Router();

const {protect} = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const subscriptionCheck = require("../middleware/subscriptionCheck");

const {
  createListing,
  updateListing,
  deleteListing,
  getMyListings,
  getPublicListings,
  getListingById
} = require("../controllers/listingController");

// Publisher actions
router.post("/", protect, role("publisher"), subscriptionCheck, createListing);
router.patch("/:id", protect, role("publisher"), subscriptionCheck, updateListing);
router.delete("/:id", protect, role("publisher"), subscriptionCheck, deleteListing);
router.get("/mine", protect, role("publisher"), getMyListings);

// Public
router.get("/public", getPublicListings);
router.get("/:id", getListingById);

module.exports = router;
