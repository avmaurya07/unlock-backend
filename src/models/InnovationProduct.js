const mongoose = require("mongoose");

const slugify = (val = "") =>
  val
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const innovationProductSchema = new mongoose.Schema(
  {
    // Company Information
    companyName: { type: String, required: true, trim: true },
    establishedYear: { type: String, required: true, trim: true },
    brandName: { type: String, required: true, trim: true },

    // Product Details
    productName: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
    },
    productLogo: { type: String, default: "" }, // URL to uploaded image
    innovationCategory: {
      type: String,
      required: true,
      enum: [
        "AI/ML",
        "Blockchain",
        "IoT",
        "Quantum Computing",
        "Biotech",
        "ClimaTech",
        "FinTech",
        "EdTech",
        "HealthTech",
        "DeepTech",
      ],
    },
    technology: { type: String, required: true, trim: true },
    detailedDescription: { type: String, required: true, trim: true },
    keyFeatures: { type: String, required: true, trim: true }, // Stored as text, can be bullet points

    // Media
    productDemoUrl: { type: String, default: "", trim: true },

    // Legal & IP
    patentStatus: {
      type: String,
      required: true,
      enum: [
        "Patent granted",
        "Patent pending",
        "Provisional patent",
        "Trade secret",
        "Open-source",
        "No protection",
      ],
    },

    // Target Market
    targetIndustry: { type: String, required: true, trim: true },
    challengeSolved: { type: String, required: true, trim: true },

    // Organization
    companyInstitution: { type: String, required: true, trim: true },
    contactEmail: { type: String, required: true, trim: true, lowercase: true },
    contactNumber: { type: String, default: "", trim: true },
    websiteUrl: { type: String, default: "", trim: true },

    // Status
    innovationStatus: {
      type: String,
      required: true,
      enum: [
        "Commercialized",
        "Market-ready",
        "Pilot phase",
        "Research",
        "Seeking investment",
      ],
    },
    productStatus: {
      type: String,
      required: true,
      enum: ["Live", "Beta", "Coming Soon", "Prototype"],
    },

    // Lead
    founderName: { type: String, required: true, trim: true },

    // Consent
    disclosureConsent: { type: Boolean, default: false },

    // Approval Workflow
    approvalStatus: {
      type: String,
      default: "pending",
      enum: ["pending", "approved", "rejected"],
    },
    rejectionReason: { type: String, default: "", trim: true },

    // Active Status
    isActive: { type: Boolean, default: true },

    // Audit
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

// Auto-generate slug from product name
innovationProductSchema.pre("validate", function () {
  if (!this.slug && this.productName) {
    this.slug = slugify(this.productName);
  }
});

module.exports = mongoose.model("InnovationProduct", innovationProductSchema);
