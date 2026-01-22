const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const {
  createType,
  updateType,
  deleteType,
  getTypesAdmin,
} = require("../controllers/adminOrganizerTypeController");

router.post("/", protect, role("admin"), createType);
router.get("/", protect, role("admin"), getTypesAdmin);
router.patch("/:id", protect, role("admin"), updateType);
router.delete("/:id", protect, role("admin"), deleteType);

module.exports = router;
