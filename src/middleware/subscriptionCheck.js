const Publisher = require("../models/Publisher");

module.exports = async function subscriptionCheck(req, res, next) {
  try {
    if (process.env.DISABLE_AUTH === "true" || process.env.BYPASS_SUBSCRIPTION_CHECK === "true") {
      return next();
    }

    const publisher = await Publisher.findOne({ userId: req.user.id });
    if (!publisher) {
      return res.status(404).json({ success: false, message: "Publisher profile not found" });
    }

    if (publisher.subscriptionStatus !== "active") {
      return res.status(403).json({
        success: false,
        message: "Subscription not active. Please purchase a plan.",
      });
    }

    if (publisher.subscriptionExpiry && new Date(publisher.subscriptionExpiry) < new Date()) {
      return res.status(403).json({
        success: false,
        message: "Subscription expired. Please renew.",
      });
    }

    next();
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
