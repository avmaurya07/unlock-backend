const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const subscriptionCheck = require("../middleware/subscriptionCheck");

const {
  listFunding,
  createFunding,
  updateFunding,
  deleteFunding,
  toggleActive,
} = require("../controllers/publisherFundingController");

const allowAll = (req, res, next) => next();
const optionalAuth = async (req, res, next) => {
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) return protect(req, res, next);
  return next();
};

const AUTH = process.env.DISABLE_AUTH === "true" ? optionalAuth : protect;
const PUB = process.env.DISABLE_AUTH === "true" ? allowAll : role("publisher");
const SUB = process.env.DISABLE_AUTH === "true" ? allowAll : subscriptionCheck;

router.get("/", AUTH, PUB, listFunding);
router.post("/", AUTH, PUB, SUB, createFunding);
router.patch("/:id", AUTH, PUB, SUB, updateFunding);
router.delete("/:id", AUTH, PUB, SUB, deleteFunding);
router.post("/:id/toggle", AUTH, PUB, SUB, toggleActive);

module.exports = router;
