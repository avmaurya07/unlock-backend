const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const subscriptionCheck = require("../middleware/subscriptionCheck");

const {
  getPublisherEvents,
  createPublisherEvent,
  updatePublisherEvent,
  deletePublisherEvent,
} = require("../controllers/publisherDashboardController");

const allowAll = (req, res, next) => next();

// In dev mode, allow no-auth, but if a token is present, still parse it
const optionalAuth = async (req, res, next) => {
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) {
    // try normal protect to populate req.user
    return protect(req, res, next);
  }
  return next();
};

const AUTH = process.env.DISABLE_AUTH === "true" ? optionalAuth : protect;
const PUB  = process.env.DISABLE_AUTH === "true" ? allowAll : role("publisher");
const SUB  = process.env.DISABLE_AUTH === "true" ? allowAll : subscriptionCheck;

// ✅ Events
router.get("/events", AUTH, PUB, getPublisherEvents);
router.post("/events", AUTH, PUB, SUB, createPublisherEvent);
router.patch("/events/:id", AUTH, PUB, SUB, updatePublisherEvent);
router.delete("/events/:id", AUTH, PUB, SUB, deletePublisherEvent);

module.exports = router;
