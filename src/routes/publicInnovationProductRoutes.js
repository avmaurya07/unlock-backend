const express = require("express");
const router = express.Router();

const {
  submitProduct,
  getApprovedProducts,
  getProductById,
} = require("../controllers/publicInnovationProductController");

router.post("/submit", submitProduct);
router.get("/", getApprovedProducts);
router.get("/:id", getProductById);

module.exports = router;
