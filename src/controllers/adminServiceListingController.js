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
    const { serviceTitle, companyName, contactEmail } = req.body;
    if (
      !serviceTitle?.trim() ||
      !companyName?.trim() ||
      !contactEmail?.trim()
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Service title, company name, and contact email are required",
        });
    }

    let slug = slugify(serviceTitle);
    const exists = await ServiceListing.findOne({ slug });
    if (exists) slug = `${slug}-${Date.now()}`;

    const listing = await ServiceListing.create({
      ...req.body,
      slug,
      approvalStatus: "approved",
      isActive: true,
      createdBy: req.user?.id,
    });

    return res
      .status(201)
      .json({ success: true, message: "Service listing created", listing });
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

    const updates = { ...req.body, updatedBy: req.user?.id };
    if (updates.serviceTitle && updates.serviceTitle !== listing.serviceTitle) {
      let newSlug = slugify(updates.serviceTitle);
      const conflict = await ServiceListing.findOne({
        slug: newSlug,
        _id: { $ne: id },
      });
      if (conflict) newSlug = `${newSlug}-${Date.now()}`;
      updates.slug = newSlug;
    }

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

    const listing = await ServiceListing.findByIdAndDelete(id);
    if (!listing)
      return res
        .status(404)
        .json({ success: false, message: "Listing not found" });

    return res.json({ success: true, message: "Listing deleted" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getListingsAdmin = async (req, res) => {
  try {
    const { status, approvalStatus, category, q } = req.query;
    const filter = {};

    if (status === "active") filter.isActive = true;
    if (status === "inactive") filter.isActive = false;
    if (approvalStatus && approvalStatus !== "all")
      filter.approvalStatus = approvalStatus;
    if (category) filter.serviceCategory = category;
    if (q?.trim()) {
      const rx = new RegExp(escapeRegex(q.trim()), "i");
      filter.$or = [
        { serviceTitle: rx },
        { companyName: rx },
        { serviceCategory: rx },
      ];
    }

    const listings = await ServiceListing.find(filter)
      .sort({ createdAt: -1 })
      .populate("createdBy", "name email");

    return res.json({ success: true, listings });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.approveListing = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id))
      return res.status(400).json({ success: false, message: "Invalid ID" });

    const listing = await ServiceListing.findByIdAndUpdate(
      id,
      {
        approvalStatus: "approved",
        isActive: true,
        rejectionReason: "",
        updatedBy: req.user?.id,
      },
      { new: true },
    );
    if (!listing)
      return res
        .status(404)
        .json({ success: false, message: "Listing not found" });

    return res.json({ success: true, message: "Listing approved", listing });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.rejectListing = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    if (!isValidObjectId(id))
      return res.status(400).json({ success: false, message: "Invalid ID" });
    if (!reason?.trim())
      return res
        .status(400)
        .json({ success: false, message: "Rejection reason is required" });

    const listing = await ServiceListing.findByIdAndUpdate(
      id,
      {
        approvalStatus: "rejected",
        isActive: false,
        rejectionReason: reason.trim(),
        updatedBy: req.user?.id,
      },
      { new: true },
    );
    if (!listing)
      return res
        .status(404)
        .json({ success: false, message: "Listing not found" });

    return res.json({ success: true, message: "Listing rejected", listing });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
