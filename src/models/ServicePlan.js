const mongoose = require("mongoose");

const servicePlanSchema = new mongoose.Schema({
  yearlyPrice: {
    type: Number,
    required: true
  },

  isActive: {
    type: Boolean,
    default: true
  }

}, { timestamps: true });

module.exports = mongoose.model("ServicePlan", servicePlanSchema);
