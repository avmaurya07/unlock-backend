const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const {
  createStage,
  updateStage,
  deleteStage,
  getStagesAdmin,
} = require("../controllers/adminStartupStageController");

router.post("/", protect, role("admin"), createStage);
router.get("/", protect, role("admin"), getStagesAdmin);
router.patch("/:id", protect, role("admin"), updateStage);
router.delete("/:id", protect, role("admin"), deleteStage);

module.exports = router;
