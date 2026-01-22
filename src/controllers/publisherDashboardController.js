const Listing = require("../models/Listing");
const Publisher = require("../models/Publisher");
const ListingType = require("../models/ListingType");

const authDisabled = () => process.env.DISABLE_AUTH === "true";


// DASHBOARD SUMMARY
exports.getDashboardSummary = async (req, res) => {
  try {
    const publisher = await Publisher.findOne({ userId: req.user.id });
    if (!publisher) {
      return res.status(404).json({
        success: false,
        message: "Publisher profile not found"
      });
    }

    // Count by type
    const counts = await Listing.aggregate([
      { $match: { publisherId: publisher._id } },
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 }
        }
      }
    ]);

    // Convert aggregation results into object { typeId: count }
    const countMap = {};
    counts.forEach(item => (countMap[item._id] = item.count));

    // Pending, Approved, Rejected counts
    const statusCounts = await Listing.aggregate([
      { $match: { publisherId: publisher._id } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    const statusMap = {};
    statusCounts.forEach(s => (statusMap[s._id] = s.count));

    res.json({
      success: true,
      counts: countMap,
      statusCounts: statusMap
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


// RECENT LISTINGS
exports.getRecentListings = async (req, res) => {
  try {
    const publisher = await Publisher.findOne({ userId: req.user.id });

    const listings = await Listing.find({ publisherId: publisher._id })
      .populate("type", "name")
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      listings
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


// SUBSCRIPTION INFO
exports.getSubscriptionInfo = async (req, res) => {
  try {
    const publisher = await Publisher.findOne({ userId: req.user.id });

    res.json({
      success: true,
      subscriptionStatus: publisher.subscriptionStatus,
      expiry: publisher.subscriptionExpiry,
      servicePlanActive: publisher.servicePlanActive
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};






// const ListingType = require("../models/ListingType");

async function ensureEventTypeId() {
  let t = await ListingType.findOne({ name: "event" }).select("_id");

  if (!t) {
    t = await ListingType.create({
      name: "event",
      description: "Events",
      isActive: true,
    });
  }

  return t?._id || null;
}

exports.getPublisherEvents = async (req, res) => {
  try {
    const { status = "all", q = "", page = 1, limit = 10, publisherId } = req.query;

    const typeId = await ensureEventTypeId();

    const filter = { type: typeId };

    if (authDisabled()) {
      if (publisherId) {
        filter.publisherId = publisherId;
      } else if (req.user?.id) {
        const publisher = await Publisher.findOne({ userId: req.user.id }).select("_id");
        if (publisher) filter.publisherId = publisher._id;
      }
      if (!filter.publisherId) {
        return res.status(400).json({ success: false, message: "DEV MODE: send publisherId in query or include auth token" });
      }
    } else {
      const publisher = await Publisher.findOne({ userId: req.user.id }).select("_id");
      if (!publisher) {
        return res.status(404).json({ success: false, message: "Publisher profile not found" });
      }
      filter.publisherId = publisher._id;
    }

    if (status !== "all") filter.status = status;
    if (q?.trim()) filter.title = { $regex: q.trim(), $options: "i" };

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);
    const skip = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      Listing.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .select("+attachments"),
      Listing.countDocuments(filter),
    ]);

    res.json({
      success: true,
      items,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.log("getPublisherEvents error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};


exports.createPublisherEvent = async (req, res) => {
  try {
    const typeId = await ensureEventTypeId();

    const {
      title,
      eventCategory,
      startDateTime,
      endDateTime,
      venueName,
      fullAddress,
      eventFormat,
      organizationName,
      organizerContactPerson,
      workEmail,
      phoneNumber,
      eventDescription,
      targetAudience,
      keyTopics,
      registrationType,
      registrationDeadline,
      registrationUrl,
      banner, // { url, publicId }
      eligibility,
      applicationProcess,
      publisherId, // DEV only
    } = req.body;

    if (!title || !eventCategory || !startDateTime || !endDateTime || !workEmail) {
      return res.status(400).json({ success: false, message: "title, eventCategory, startDateTime, endDateTime, workEmail are required" });
    }

    let resolvedPublisherId = publisherId;
    if (authDisabled()) {
      if (publisherId) {
        resolvedPublisherId = publisherId;
      } else if (req.user?.id) {
        const publisherDoc = await Publisher.findOne({ userId: req.user.id }).select("_id");
        if (publisherDoc) resolvedPublisherId = publisherDoc._id;
      }
      if (!resolvedPublisherId) {
        return res.status(400).json({
          success: false,
          message: "DEV MODE: send publisherId in body or include auth token",
        });
      }
    } else {
      const publisherDoc = await Publisher.findOne({ userId: req.user.id }).select("_id");
      if (!publisherDoc) {
        return res.status(404).json({ success: false, message: "Publisher profile not found" });
      }
      resolvedPublisherId = publisherDoc._id;
    }

    const targets = Array.isArray(targetAudience)
      ? targetAudience.filter(Boolean)
      : (targetAudience || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

    const topics = Array.isArray(keyTopics)
      ? keyTopics.filter(Boolean)
      : (keyTopics || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

    const bannerAttachment = banner?.url && banner?.publicId
      ? [{
          url: banner.url,
          publicId: banner.publicId,
          resourceType: banner.resourceType || "image",
        }]
      : [];

    const doc = await Listing.create({
      publisherId: resolvedPublisherId,
      type: typeId,           // ✅ ObjectId
      title,
      description: eventDescription || "",
      location: venueName || "",
      startDate: startDateTime,
      endDate: endDateTime,
      eventCategory,
      startDateTime,
      endDateTime,
      venueName,
      fullAddress,
      eventFormat,
      organizationName,
      organizerContactPerson,
      workEmail,
      phoneNumber,
      eventDescription,
      eligibility,
      applicationProcess,
      targetAudience: targets,
      keyTopics: topics,
      registrationType,
      registrationDeadline,
      registrationUrl,
      mainImage: bannerAttachment[0] || undefined,
      attachments: bannerAttachment,
      status: "pending",
    });

    res.json({ success: true, message: "Event created", item: doc });
  } catch (err) {
    console.log("createPublisherEvent error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// UPDATE EVENT
exports.updatePublisherEvent = async (req, res) => {
  try {
    const typeId = await ensureEventTypeId();

    const { id } = req.params;
    const update = req.body || {};

    // Resolve publisher from token or explicit publisherId (dev)
    const pubDoc = authDisabled()
      ? (req.body.publisherId
          ? await Publisher.findById(req.body.publisherId).select("_id")
          : req.user?.id
            ? await Publisher.findOne({ userId: req.user.id }).select("_id")
            : null)
      : await Publisher.findOne({ userId: req.user.id }).select("_id");

    if (!pubDoc) {
      return res.status(404).json({ success: false, message: "Publisher profile not found" });
    }

    const existing = await Listing.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    if (String(existing.type) !== String(typeId)) {
      return res.status(400).json({ success: false, message: "Listing is not an event" });
    }

    if (existing.publisherId && String(existing.publisherId) !== String(pubDoc._id)) {
      return res.status(403).json({ success: false, message: "Not allowed to edit this event" });
    }

    // normalize arrays
    if (update.targetAudience) {
      update.targetAudience = Array.isArray(update.targetAudience)
        ? update.targetAudience.filter(Boolean)
        : String(update.targetAudience)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
    }
    if (update.keyTopics) {
      update.keyTopics = Array.isArray(update.keyTopics)
        ? update.keyTopics.filter(Boolean)
        : String(update.keyTopics)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
    }

    if (update.banner?.url && update.banner?.publicId) {
      update.attachments = [{
        url: update.banner.url,
        publicId: update.banner.publicId,
        resourceType: update.banner.resourceType || "image"
      }];
      update.mainImage = update.attachments[0];
    }

    // event fields
    const allowed = [
      "title","eventCategory","startDateTime","endDateTime","venueName","fullAddress","eventFormat",
      "organizationName","organizerContactPerson","workEmail","phoneNumber","eventDescription",
      "targetAudience","keyTopics","registrationType","registrationDeadline","registrationUrl","location",
      "eligibility","applicationProcess","mainImage",
    ];

    const safeUpdate = {};
    for (const k of allowed) {
      if (k in update) safeUpdate[k] = update[k];
    }

    // reset status to pending on edit
    safeUpdate.status = "pending";

    const updated = await Listing.findByIdAndUpdate(existing._id, safeUpdate, { new: true });

    return res.json({ success: true, message: "Event updated (pending approval)", item: updated });
  } catch (err) {
    console.log("updatePublisherEvent error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE EVENT
exports.deletePublisherEvent = async (req, res) => {
  try {
    const typeId = await ensureEventTypeId();

    const { id } = req.params;
    const pubDoc = authDisabled()
      ? (req.body.publisherId
          ? await Publisher.findById(req.body.publisherId).select("_id")
          : req.user?.id
            ? await Publisher.findOne({ userId: req.user.id }).select("_id")
            : null)
      : await Publisher.findOne({ userId: req.user.id }).select("_id");

    if (!pubDoc) return res.status(404).json({ success: false, message: "Publisher profile not found" });

    const existing = await Listing.findById(id);
    if (!existing) return res.status(404).json({ success: false, message: "Event not found" });
    if (String(existing.type) !== String(typeId)) {
      return res.status(400).json({ success: false, message: "Listing is not an event" });
    }
    if (existing.publisherId && String(existing.publisherId) !== String(pubDoc._id)) {
      return res.status(403).json({ success: false, message: "Not allowed to delete this event" });
    }

    await Listing.deleteOne({ _id: existing._id });

    return res.json({ success: true, message: "Event deleted" });
  } catch (err) {
    console.log("deletePublisherEvent error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
