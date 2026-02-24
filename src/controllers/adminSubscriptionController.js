const SubscriptionPlan = require("../models/SubscriptionPlan");
const ServicePlan = require("../models/ServicePlan");
const Publisher = require("../models/Publisher");

// Get consolidated subscription config for admin UI
exports.getSubscriptionConfig = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find({ isActive: true });
    const service = await ServicePlan.findOne({});

    const planMap = {};
    for (const p of plans) {
      planMap[String(p.durationInMonths)] = p.price;
    }

    const config = {
      plans: {
        3: planMap['3'] || 0,
        6: planMap['6'] || 0,
        9: planMap['9'] || 0,
        12: planMap['12'] || 0,
      },
      serviceListingYearlyFee: service?.yearlyPrice || 0,
      currency: process.env.CURRENCY || 'INR'
    };

    return res.json({ success: true, config });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Update consolidated config (admin)
exports.updateSubscriptionConfig = async (req, res) => {
  try {
    const { plans = {}, serviceListingYearlyFee } = req.body;

    // upsert individual plans
    for (const duration of [3,6,9,12]) {
      if (plans[String(duration)] !== undefined) {
        await SubscriptionPlan.findOneAndUpdate(
          { durationInMonths: duration },
          { price: Number(plans[String(duration)]) || 0, isActive: true },
          { new: true, upsert: true }
        );
      }
    }

    if (serviceListingYearlyFee !== undefined) {
      await ServicePlan.findOneAndUpdate({}, { yearlyPrice: Number(serviceListingYearlyFee) || 0 }, { new: true, upsert: true });
    }

    return res.json({ success: true, message: 'Config updated' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};


// CREATE OR UPDATE Subscription plan (3/6/9 months)
exports.createOrUpdateSubscriptionPlan = async (req, res) => {
  try {
    const { durationInMonths, price } = req.body;

    if (![3, 6, 9, 12].includes(durationInMonths)) {
      return res.status(400).json({
        success: false,
        message: "Invalid duration. Allowed: 3, 6, 9, 12 months"
      });
    }

    const plan = await SubscriptionPlan.findOneAndUpdate(
      { durationInMonths },
      { price, isActive: true },
      { new: true, upsert: true }
    );

    res.json({
      success: true,
      message: "Plan saved successfully",
      plan
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


// GET all subscription plans
exports.getSubscriptionPlans = async (req, res) => {
  const plans = await SubscriptionPlan.find({ isActive: true });
  res.json({ success: true, plans });
};


// CREATE or UPDATE Yearly Service Fee
exports.createOrUpdateServicePlan = async (req, res) => {
  try {
    const { yearlyPrice } = req.body;

    const plan = await ServicePlan.findOneAndUpdate(
      {},
      { yearlyPrice },
      { new: true, upsert: true }
    );

    res.json({
      success: true,
      message: "Service plan updated",
      plan
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


// GET yearly service fee
exports.getServicePlan = async (req, res) => {
  const plan = await ServicePlan.findOne({});
  res.json({ success: true, plan });
};


// ADMIN Extend Subscription
exports.extendPublisherSubscription = async (req, res) => {
  try {
    const { months } = req.body;
    const { publisherId } = req.params;

    const publisher = await Publisher.findById(publisherId);
    if (!publisher) return res.status(404).json({ success: false, message: "Publisher not found" });

    const newExpiry = new Date(publisher.subscriptionExpiry || new Date());
    newExpiry.setMonth(newExpiry.getMonth() + months);

    publisher.subscriptionExpiry = newExpiry;
    publisher.subscriptionStatus = "active";

    await publisher.save();

    res.json({
      success: true,
      message: "Subscription extended",
      expiry: newExpiry
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


// ADMIN Suspend Publisher Subscription
exports.suspendPublisherSubscription = async (req, res) => {
  try {
    const { publisherId } = req.params;

    const publisher = await Publisher.findByIdAndUpdate(
      publisherId,
      { subscriptionStatus: "suspended" },
      { new: true }
    );

    res.json({
      success: true,
      message: "Subscription suspended",
      publisher
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
