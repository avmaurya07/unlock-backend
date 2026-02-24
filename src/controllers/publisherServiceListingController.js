const mongoose = require("mongoose");
const ServiceListing = require("../models/ServiceListing");

const escapeRegex = (str = "") => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const slugify = (val = "") =>
  val
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

exports.createListing = async (req, res) => {
  try {
    const {
      companyName,
      serviceTitle,
      serviceCategory,
      serviceDescription,
      keyDeliverables,
      serviceMode,
      targetAudience,
      pricingModel,
      priceRange,
      duration,
      technologiesUsed,
      contactEmail,
      contactNumber,
      websiteUrl,
      portfolioUrl,
      serviceBanner,
      location,
      experienceYears,
      certifications,
      availability,
      disclosureConsent,
    } = req.body;

    if (
      !serviceTitle?.trim() ||
      !companyName?.trim() ||
      !serviceCategory ||
      !serviceDescription?.trim()
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Service title, company name, category, and description are required",
        });
    }
    if (
      !keyDeliverables?.trim() ||
      !targetAudience?.trim() ||
      !pricingModel ||
      !availability
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Key deliverables, target audience, pricing model, and availability are required",
        });
    }
    if (!contactEmail?.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Contact email is required" });
    }

    let slug = slugify(serviceTitle);
    const exists = await ServiceListing.findOne({ slug });
    if (exists) slug = `${slug}-${Date.now()}`;

    const listing = await ServiceListing.create({
      companyName: companyName.trim(),
      serviceTitle: serviceTitle.trim(),
      serviceCategory,
      serviceDescription: serviceDescription.trim(),
      keyDeliverables: keyDeliverables.trim(),
      serviceMode: serviceMode || "Online",
      targetAudience: targetAudience.trim(),
      pricingModel: pricingModel || "Custom Quote",
      priceRange: priceRange || "",
      duration: duration || "",
      technologiesUsed: technologiesUsed || "",
      contactEmail: contactEmail.trim().toLowerCase(),
      contactNumber: contactNumber || "",
      websiteUrl: websiteUrl || "",
      portfolioUrl: portfolioUrl || "",
      serviceBanner:
        serviceBanner && serviceBanner.url
          ? serviceBanner
          : { url: "", publicId: "", resourceType: "image" },
      location: location || "",
      experienceYears: experienceYears || "",
      certifications: certifications || "",
      availability: availability || "Available Now",
      disclosureConsent: disclosureConsent || false,
      slug,
      approvalStatus: "pending",
      isActive: false,
      createdBy: req.user?.id,
    });

    return res.status(201).json({
      success: true,
      message: "Service listing submitted. It will be reviewed by our team.",
      listing,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateListing = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id))
      return res.status(400).json({ success: false, message: "Invalid ID" });

    const listing = await ServiceListing.findById(id);
    if (!listing)
      return res
        .status(404)
        .json({ success: false, message: "Listing not found" });
    if (listing.createdBy?.toString() !== req.user?.id?.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only edit your own listings",
      });
    }
    if (listing.approvalStatus === "approved") {
      return res.status(403).json({
        success: false,
        message: "Cannot edit approved listings. Contact admin for changes.",
      });
    }

    const allowedFields = [
      "companyName",
      "serviceTitle",
      "serviceCategory",
      "serviceDescription",
      "keyDeliverables",
      "serviceMode",
      "targetAudience",
      "pricingModel",
      "priceRange",
      "duration",
      "technologiesUsed",
      "contactEmail",
      "contactNumber",
      "websiteUrl",
      "portfolioUrl",
      "serviceBanner",
      "location",
      "experienceYears",
      "certifications",
      "availability",
      "disclosureConsent",
    ];

    const updates = {};
    allowedFields.forEach((f) => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });

    if (updates.serviceTitle && updates.serviceTitle !== listing.serviceTitle) {
      let newSlug = slugify(updates.serviceTitle);
      const conflict = await ServiceListing.findOne({
        slug: newSlug,
        _id: { $ne: id },
      });
      if (conflict) newSlug = `${newSlug}-${Date.now()}`;
      updates.slug = newSlug;
    }

    if (listing.approvalStatus === "rejected") {
      updates.approvalStatus = "pending";
      updates.rejectionReason = "";
    }

    updates.updatedBy = req.user?.id;
    const updated = await ServiceListing.findByIdAndUpdate(id, updates, {
      new: true,
    });
    return res.json({
      success: true,
      message: "Listing updated",
      listing: updated,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteListing = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id))
      return res.status(400).json({ success: false, message: "Invalid ID" });

    const listing = await ServiceListing.findById(id);
    if (!listing)
      return res
        .status(404)
        .json({ success: false, message: "Listing not found" });
    if (listing.createdBy?.toString() !== req.user?.id?.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own listings",
      });
    }

    await ServiceListing.findByIdAndDelete(id);
    return res.json({ success: true, message: "Listing deleted" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMyListings = async (req, res) => {
  try {
    const { status, q } = req.query;
    const filter = { createdBy: req.user?.id };

    if (status && status !== "all") filter.approvalStatus = status;
    if (q?.trim()) {
      const rx = new RegExp(escapeRegex(q.trim()), "i");
      filter.$or = [{ serviceTitle: rx }, { companyName: rx }];
    }

    const listings = await ServiceListing.find(filter).sort({ createdAt: -1 });
    return res.json({ success: true, listings });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getListingById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id))
      return res.status(400).json({ success: false, message: "Invalid ID" });

    const listing = await ServiceListing.findById(id);
    if (!listing)
      return res
        .status(404)
        .json({ success: false, message: "Listing not found" });
    if (listing.createdBy?.toString() !== req.user?.id?.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only view your own listings",
      });
    }

    return res.json({ success: true, listing });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
