const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");

const {
  createPublisher,
  getMyPublisherProfile,
  updatePublisher,
} = require("../controllers/publisherController");


console.log("authMiddleware resolved path:", require.resolve("../middleware/authMiddleware"));
console.log("authMiddleware exports:", require("../middleware/authMiddleware"));

console.log("typeof protect:", typeof protect);
console.log("typeof role:", typeof role);
console.log("typeof role('publisher'):", typeof role("publisher"));
console.log("typeof createPublisher:", typeof createPublisher);


// Create onboarding profile
router.post("/create", protect, role("publisher"), createPublisher);

// Fetch profile
router.get("/me", protect, role("publisher"), getMyPublisherProfile);

// Update profile
router.patch("/update", protect, role("publisher"), updatePublisher);

console.log("typeof protect:", typeof protect);
console.log("typeof role:", typeof role);
console.log("typeof role('publisher'):", typeof role("publisher"));
console.log("AUTH TYPE:", typeof auth);

module.exports = router;
