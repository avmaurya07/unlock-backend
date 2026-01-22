const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");

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

// ✅ Events
router.get("/events", AUTH, PUB, getPublisherEvents);
router.post("/events", AUTH, PUB, createPublisherEvent);
router.patch("/events/:id", AUTH, PUB, updatePublisherEvent);
router.delete("/events/:id", AUTH, PUB, deletePublisherEvent);

module.exports = router;
