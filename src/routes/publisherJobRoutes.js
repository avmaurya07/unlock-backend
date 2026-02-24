const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const subscriptionCheck = require("../middleware/subscriptionCheck");

const {
  listJobs,
  createJob,
  updateJob,
  deleteJob,
  toggleActive,
} = require("../controllers/publisherJobController");

const allowAll = (req, res, next) => next();
const optionalAuth = async (req, res, next) => {
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) return protect(req, res, next);
  return next();
};

const AUTH = process.env.DISABLE_AUTH === "true" ? optionalAuth : protect;
const PUB = process.env.DISABLE_AUTH === "true" ? allowAll : role("publisher");
const SUB = process.env.DISABLE_AUTH === "true" ? allowAll : subscriptionCheck;

router.get("/", AUTH, PUB, listJobs);
router.post("/", AUTH, PUB, SUB, createJob);
router.patch("/:id", AUTH, PUB, SUB, updateJob);
router.delete("/:id", AUTH, PUB, SUB, deleteJob);
router.post("/:id/toggle", AUTH, PUB, SUB, toggleActive);

module.exports = router;
