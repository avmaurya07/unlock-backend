const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");

const {
  createPublisher,
  getMyPublisherProfile,
  updatePublisher,
} = require("../controllers/publisherController");

// Create onboarding profile
router.post("/create", protect, role("publisher"), createPublisher);

// Fetch profile
router.get("/me", protect, role("publisher"), getMyPublisherProfile);

// Update profile
router.patch("/update", protect, role("publisher"), updatePublisher);

module.exports = router;
