const mongoose = require("mongoose");

const publisherSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  publisherType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "PublisherType",
    required: false
  },

  companyName: String,
  organizationName: String,
  organizationType: String,
  contactName: String, // publisher name / primary contact
  website: String,
  description: String,
  address: String,

  subscriptionStatus: {
    type: String,
    enum: ["active", "expired", "suspended"],
    default: "active"
  },

  subscriptionExpiry: Date,

  servicePlanActive: { type: Boolean, default: false }

}, { timestamps: true });

module.exports = mongoose.model("Publisher", publisherSchema);
