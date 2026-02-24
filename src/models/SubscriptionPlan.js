const mongoose = require("mongoose");

const subscriptionPlanDefSchema = new mongoose.Schema({
  durationInMonths: { type: Number, required: true },
  price: { type: Number, required: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model("SubscriptionPlan", subscriptionPlanDefSchema);
