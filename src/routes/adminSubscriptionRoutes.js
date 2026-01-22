const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");

const {
  createOrUpdateSubscriptionPlan,
  getSubscriptionPlans,

  createOrUpdateServicePlan,
  getServicePlan,

  extendPublisherSubscription,
  suspendPublisherSubscription
} = require("../controllers/adminSubscriptionController");

router.post("/plan", protect, role("admin"), createOrUpdateSubscriptionPlan);
router.get("/plan", protect, role("admin"), getSubscriptionPlans);

router.post("/service", protect, role("admin"), createOrUpdateServicePlan);
router.get("/service", protect, role("admin"), getServicePlan);

router.post("/extend/:publisherId", protect, role("admin"), extendPublisherSubscription);
router.post("/suspend/:publisherId", protect, role("admin"), suspendPublisherSubscription);

module.exports = router;
