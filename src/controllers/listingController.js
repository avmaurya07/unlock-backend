const Listing = require("../models/Listing");
const ListingType = require("../models/ListingType");
const Publisher = require("../models/Publisher");
const cloudinary = require("../config/cloudinary");

// CREATE Listing
exports.createListing = async (req, res) => {
  try {
    const { type, title, description, location, deadline, startDate, endDate, attachments } = req.body;

    // Validate type
    const validType = await ListingType.findOne({ _id: type, isActive: true });
    if (!validType) {
      return res.status(400).json({ success: false, message: "Invalid listing type" });
    }

    // Find publisher
    const publisher = await Publisher.findOne({ userId: req.user.id });
    if (!publisher) {
      return res.status(404).json({ success: false, message: "Publisher not found" });
    }

    // Validate attachments (optional)
    let safeAttachments = [];
    if (attachments) {
      if (!Array.isArray(attachments)) {
        return res.status(400).json({ success: false, message: "attachments must be an array" });
      }

      if (attachments.length > 10) {
        return res.status(400).json({ success: false, message: "Max 10 attachments allowed" });
      }

      for (const a of attachments) {
        if (!a?.url || !a?.publicId) {
          return res.status(400).json({
            success: false,
            message: "Each attachment must contain url and publicId"
          });
        }
        safeAttachments.push({
          url: a.url,
          publicId: a.publicId,
          resourceType: a.resourceType || "image"
        });
      }
    }

    const listing = await Listing.create({
      publisherId: publisher._id,
      type,
      title,
      description,
      location,
      deadline,
      startDate,
      endDate,
       attachments: safeAttachments,
      status: "pending"
    });

    res.json({
      success: true,
      message: "Listing created successfully and is pending admin approval.",
      listing
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


// UPDATE Listing
exports.updateListing = async (req, res) => {
  try {
    const updates = req.body;

    const publisher = await Publisher.findOne({ userId: req.user.id });
    if (!publisher) return res.status(404).json({ success: false, message: "Publisher not found" });

    // Optional attachments validation if provided
    if (updates.attachments) {
      if (!Array.isArray(updates.attachments)) {
        return res.status(400).json({ success: false, message: "attachments must be an array" });
      }
      if (updates.attachments.length > 10) {
        return res.status(400).json({ success: false, message: "Max 10 attachments allowed" });
      }

      updates.attachments = updates.attachments.map(a => ({
        url: a.url,
        publicId: a.publicId,
        resourceType: a.resourceType || "image"
      }));
    }

    const listing = await Listing.findOneAndUpdate(
      { _id: req.params.id, publisherId: publisher._id },
      updates,
      { new: true }
    );

    if (!listing) {
      return res.status(404).json({ success: false, message: "Listing not found" });
    }

    listing.status = "pending"; // force admin re-approval
    await listing.save();

    return res.json({ success: true, message: "Listing updated and sent for re-approval", listing });

  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};



// DELETE Listing
exports.deleteListing = async (req, res) => {
  try {
    const publisher = await Publisher.findOne({ userId: req.user.id });
    if (!publisher) return res.status(404).json({ success: false, message: "Publisher not found" });

    const listing = await Listing.findOneAndDelete({
      _id: req.params.id,
      publisherId: publisher._id
    });

    if (!listing) {
      return res.status(404).json({ success: false, message: "Listing not found" });
    }

    // best-effort cleanup
    if (listing.attachments?.length) {
      for (const a of listing.attachments) {
        try {
          await cloudinary.uploader.destroy(a.publicId, { resource_type: a.resourceType || "image" });
        } catch (e) {
          // don't fail the request if cleanup fails
          console.error("Cloudinary delete failed:", e.message);
        }
      }
    }

    return res.json({ success: true, message: "Listing deleted" });

  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};


// GET My Listings
exports.getMyListings = async (req, res) => {
  try {
    const publisher = await Publisher.findOne({ userId: req.user.id });

    const listings = await Listing.find({ publisherId: publisher._id }).populate("type", "name");

    res.json({ success: true, listings });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


// PUBLIC: GET Approved Listings
exports.getPublicListings = async (req, res) => {
  try {
    const listings = await Listing.find({ status: "approved" })
      .populate("type", "name");

    res.json({ success: true, listings });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


// PUBLIC: GET Single Listing
exports.getListingById = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id)
      .populate("type", "name")
      .populate("publisherId", "companyName");

    res.json({ success: true, listing });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
