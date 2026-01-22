const mongoose = require("mongoose");

const listingTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },

  description: String,
  isActive: { type: Boolean, default: true }

}, { timestamps: true });

module.exports = mongoose.model("ListingType", listingTypeSchema);
