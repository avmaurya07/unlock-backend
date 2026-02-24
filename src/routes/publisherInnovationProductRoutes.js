const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const {
  createProduct,
  updateProduct,
  deleteProduct,
  getMyProducts,
  getProductById,
} = require("../controllers/publisherInnovationProductController");

router.post("/", protect, role("publisher"), createProduct);
router.get("/", protect, role("publisher"), getMyProducts);
router.get("/:id", protect, role("publisher"), getProductById);
router.patch("/:id", protect, role("publisher"), updateProduct);
router.delete("/:id", protect, role("publisher"), deleteProduct);

module.exports = router;
