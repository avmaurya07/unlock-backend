const mongoose = require("mongoose");

const slugify = (val = "") =>
  val
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const serviceListingSchema = new mongoose.Schema(
  {
    companyName: { type: String, required: true, trim: true },
    serviceTitle: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
    },

    serviceCategory: {
      type: String,
      required: true,
      enum: [
        "IT Services",
        "Marketing",
        "Legal",
        "Finance",
        "HR & Recruitment",
        "Design",
        "Consulting",
        "Education & Training",
        "Healthcare",
        "Logistics",
        "Other",
      ],
    },

    serviceDescription: { type: String, required: true, trim: true },
    keyDeliverables: { type: String, required: true, trim: true },

    serviceMode: {
      type: String,
      required: true,
      enum: ["Online", "Offline", "Hybrid"],
      default: "Online",
    },

    targetAudience: { type: String, required: true, trim: true },

    pricingModel: {
      type: String,
      required: true,
      enum: [
        "Fixed Price",
        "Hourly Rate",
        "Subscription",
        "Custom Quote",
        "Free",
      ],
      default: "Custom Quote",
    },

    priceRange: { type: String, trim: true, default: "" },
    duration: { type: String, trim: true, default: "" },
    technologiesUsed: { type: String, trim: true, default: "" },

    contactEmail: { type: String, required: true, trim: true, lowercase: true },
    contactNumber: { type: String, trim: true, default: "" },
    websiteUrl: { type: String, trim: true, default: "" },
    portfolioUrl: { type: String, trim: true, default: "" },

    serviceBanner: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
      resourceType: { type: String, default: "image" },
    },

    location: { type: String, trim: true, default: "" },
    experienceYears: { type: String, trim: true, default: "" },
    certifications: { type: String, trim: true, default: "" },

    availability: {
      type: String,
      required: true,
      enum: [
        "Available Now",
        "Available in 1 Week",
        "Available in 1 Month",
        "Booked",
      ],
      default: "Available Now",
    },

    disclosureConsent: { type: Boolean, default: false },

    // Approval workflow
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    rejectionReason: { type: String, default: "" },
    isActive: { type: Boolean, default: false },

    // Audit
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("ServiceListing", serviceListingSchema);
