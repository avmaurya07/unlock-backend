const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const {
  createProduct,
  updateProduct,
  deleteProduct,
  getProductsAdmin,
  approveProduct,
  rejectProduct,
} = require("../controllers/adminInnovationProductController");

router.post("/", protect, role("admin"), createProduct);
router.get("/", protect, role("admin"), getProductsAdmin);
router.patch("/:id", protect, role("admin"), updateProduct);
router.delete("/:id", protect, role("admin"), deleteProduct);
router.patch("/:id/approve", protect, role("admin"), approveProduct);
router.patch("/:id/reject", protect, role("admin"), rejectProduct);

module.exports = router;
