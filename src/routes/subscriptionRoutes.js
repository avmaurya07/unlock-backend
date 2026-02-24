const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");

const {
  getPlans,
  createOrder,
  verifyPayment,
} = require("../controllers/subscriptionController");

// Public: get plans
router.get("/plans", getPlans);

// Publisher: create order
router.post("/create-order", protect, role("publisher"), createOrder);

// Publisher: verify payment and activate
router.post("/verify", protect, role("publisher"), verifyPayment);

module.exports = router;
