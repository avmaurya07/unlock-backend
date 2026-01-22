const express = require("express");
const router = express.Router();

const adminPublisherTypeController = require("../controllers/adminPublisherTypeController");
const { getPublicCategories } = require("../controllers/adminEventCategoryController");
const { getPublicCategories: getPublicJobCategories } = require("../controllers/adminJobCategoryController");
const { getPublicCategories: getPublicChallengeCategories } = require("../controllers/adminChallengeCategoryController");
const { getPublicTypes: getPublicOrganizerTypes } = require("../controllers/adminOrganizerTypeController");
const { getPublicStages: getPublicStartupStages } = require("../controllers/adminStartupStageController");

// ✅ IMPORTANT: do NOT write getPublisherTypes() with ()
router.get("/publisher-types", adminPublisherTypeController.getPublisherTypes);
router.get("/event-categories", getPublicCategories);
router.get("/job-categories", getPublicJobCategories);
router.get("/challenge-categories", getPublicChallengeCategories);
router.get("/organizer-types", getPublicOrganizerTypes);
router.get("/startup-stages", getPublicStartupStages);

module.exports = router;
