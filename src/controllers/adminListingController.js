const mongoose = require("mongoose");
const Listing = require("../models/Listing");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

exports.adminListListings = async (req, res) => {
  try {
    const {
      status,        // pending | approved | rejected
      type,          // ListingType ObjectId
      publisherId,   // Publisher ObjectId
      q,             // search text
      from,          // YYYY-MM-DD (createdAt >=)
      to,            // YYYY-MM-DD (createdAt <=)
      page = 1,
      limit = 20,
      sort = "new"   // new | old
    } = req.query;

    // pagination sanitize
    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip = (p - 1) * l;

    const filter = {};

    if (status) {
      if (!["pending", "approved", "rejected"].includes(status)) {
        return res.status(400).json({ success: false, message: "Invalid status filter" });
      }
      filter.status = status;
    }

    if (type) {
      if (!isValidObjectId(type)) {
        return res.status(400).json({ success: false, message: "Invalid type id" });
      }
      filter.type = type;
    }

    if (publisherId) {
      if (!isValidObjectId(publisherId)) {
        return res.status(400).json({ success: false, message: "Invalid publisherId" });
      }
      filter.publisherId = publisherId;
    }

    // Date range filter on createdAt
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) {
        // include whole day
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    // Search (basic). If you added text index, switch to $text for better performance.
    if (q && q.trim()) {
      const keyword = q.trim();
      filter.$or = [
        { title: { $regex: keyword, $options: "i" } },
        { description: { $regex: keyword, $options: "i" } },
      ];
    }

    const sortObj = sort === "old" ? { createdAt: 1 } : { createdAt: -1 };

    const [total, listings] = await Promise.all([
      Listing.countDocuments(filter),
      Listing.find(filter)
        .sort(sortObj)
        .skip(skip)
        .limit(l)
        .populate("type", "name")
        .populate({
          path: "publisherId",
          select: "companyName userId",
          populate: { path: "userId", select: "name email" }
        }),
    ]);

    const totalPages = Math.ceil(total / l) || 1;

    return res.json({
      success: true,
      meta: {
        page: p,
        limit: l,
        total,
        totalPages,
        hasNext: p < totalPages,
        hasPrev: p > 1,
      },
      listings,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.adminGetListingById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid listing id" });
    }

    const listing = await Listing.findById(id)
      .populate("type", "name description")
      .populate({
        path: "publisherId",
        select: "companyName website userId",
        populate: { path: "userId", select: "name email phone" }
      })
      .populate("reviewedBy", "name email");

    if (!listing) {
      return res.status(404).json({ success: false, message: "Listing not found" });
    }

    return res.json({ success: true, listing });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.adminApproveListing = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid listing id" });
    }

    const listing = await Listing.findById(id);
    if (!listing) {
      return res.status(404).json({ success: false, message: "Listing not found" });
    }

    listing.status = "approved";
    listing.approvedAt = new Date();
    listing.rejectedAt = null;
    listing.rejectionReason = null;
    listing.reviewedBy = req.user.id;

    await listing.save();

    return res.json({ success: true, message: "Listing approved", listing });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.adminRejectListing = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid listing id" });
    }

    const listing = await Listing.findById(id);
    if (!listing) {
      return res.status(404).json({ success: false, message: "Listing not found" });
    }

    listing.status = "rejected";
    listing.rejectedAt = new Date();
    listing.approvedAt = null;
    listing.rejectionReason = (reason || "").trim() || "Rejected by admin";
    listing.reviewedBy = req.user.id;

    await listing.save();

    return res.json({ success: true, message: "Listing rejected", listing });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
