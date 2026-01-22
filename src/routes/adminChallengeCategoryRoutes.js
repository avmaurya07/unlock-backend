const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const {
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoriesAdmin,
} = require("../controllers/adminChallengeCategoryController");

router.post("/", protect, role("admin"), createCategory);
router.get("/", protect, role("admin"), getCategoriesAdmin);
router.patch("/:id", protect, role("admin"), updateCategory);
router.delete("/:id", protect, role("admin"), deleteCategory);

module.exports = router;
