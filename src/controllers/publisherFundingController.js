const Listing = require("../models/Listing");
const ListingType = require("../models/ListingType");
const Publisher = require("../models/Publisher");
const ChallengeCategory = require("../models/ChallengeCategory");
const OrganizerType = require("../models/OrganizerType");
const StartupStage = require("../models/StartupStage");
const mongoose = require("mongoose");

const authDisabled = () => process.env.DISABLE_AUTH === "true";

async function ensureFundingTypeId() {
  let t = await ListingType.findOne({ name: "funding" }).select("_id");
  if (!t) {
    t = await ListingType.create({ name: "funding", description: "Startup Funding Calls", isActive: true });
  }
  return t?._id || null;
}

async function resolvePublisher(req) {
  if (authDisabled()) {
    if (req.body?.publisherId) return req.body.publisherId;
    if (req.query?.publisherId) return req.query.publisherId;
    if (req.user?.id) {
      const pub = await Publisher.findOne({ userId: req.user.id }).select("_id");
      return pub?._id;
    }
    return null;
  }
  const pub = await Publisher.findOne({ userId: req.user.id }).select("_id");
  return pub?._id;
}

const isObjectId = (v) => mongoose.Types.ObjectId.isValid(String(v || ""));

async function resolveActiveName(Model, value, label) {
  if (!value) return null;

  const q = isObjectId(value)
    ? { _id: value, isActive: true }
    : { name: String(value).trim(), isActive: true };

  const doc = await Model.findOne(q).select("name");
  if (!doc) {
    const display = typeof value === "string" ? value : String(value);
    throw new Error(`Invalid or inactive ${label}: ${display}`);
  }
  return doc.name;
}

exports.listFunding = async (req, res) => {
  try {
    const typeId = await ensureFundingTypeId();
    const { status = "all", q = "", page = 1, limit = 10 } = req.query;

    const publisherId = await resolvePublisher(req);
    if (!publisherId) return res.status(404).json({ success: false, message: "Publisher profile not found" });

    const filter = { type: typeId, publisherId };
    if (status !== "all") filter.status = status;
    if (q?.trim()) filter.title = { $regex: q.trim(), $options: "i" };

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);
    const skip = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      Listing.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      Listing.countDocuments(filter),
    ]);

    return res.json({
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
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.createFunding = async (req, res) => {
  try {
    const typeId = await ensureFundingTypeId();
    const publisherId = await resolvePublisher(req);
    if (!publisherId) return res.status(404).json({ success: false, message: "Publisher profile not found" });

    const {
      title,
      challengeCategory,
      launchDate,
      submissionDeadline,
      resultDate,
      organizingCompany,
      organizerType,
      contactPersonName,
      officialEmail,
      contactPhone,
      description,
      keyFocusAreas,
      eligibleParticipants,
      startupStage,
      location,
      registrationLink,
      thumbImage,
    } = req.body;

    if (!title || !challengeCategory || !submissionDeadline || !organizingCompany || !organizerType || !officialEmail || !description || !startupStage || !location || !registrationLink) {
      return res.status(400).json({
        success: false,
        message: "title, challengeCategory, submissionDeadline, organizingCompany, organizerType, officialEmail, description, startupStage, location, registrationLink are required"
      });
    }

    let resolvedChallengeCategory;
    let resolvedOrganizerType;
    let resolvedStartupStage;
    try {
      resolvedChallengeCategory = await resolveActiveName(ChallengeCategory, challengeCategory, "challenge category");
      resolvedOrganizerType = await resolveActiveName(OrganizerType, organizerType, "organizer type");
      resolvedStartupStage = await resolveActiveName(StartupStage, startupStage, "startup stage");
    } catch (e) {
      return res.status(400).json({ success: false, message: e.message });
    }

    const thumb = thumbImage?.url && thumbImage?.publicId ? {
      url: thumbImage.url,
      publicId: thumbImage.publicId,
      resourceType: thumbImage.resourceType || "image",
    } : undefined;

    const doc = await Listing.create({
      publisherId,
      type: typeId,
      title,
      description: description || title,
      challengeCategory: resolvedChallengeCategory,
      launchDate,
      submissionDeadline,
      resultDate,
      organizingCompany,
      organizerType: resolvedOrganizerType,
      contactPersonName,
      officialEmail,
      contactPhone,
      keyFocusAreas,
      eligibleParticipants,
      startupStage: resolvedStartupStage,
      location,
      registrationLink,
      thumbImage: thumb,
      status: "pending",
      isActive: true,
    });

    return res.json({ success: true, message: "Funding call created (pending approval)", item: doc });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateFunding = async (req, res) => {
  try {
    const typeId = await ensureFundingTypeId();
    const publisherId = await resolvePublisher(req);
    if (!publisherId) return res.status(404).json({ success: false, message: "Publisher profile not found" });

    const { id } = req.params;
    const existing = await Listing.findById(id);
    if (!existing) return res.status(404).json({ success: false, message: "Funding call not found" });
    if (String(existing.type) !== String(typeId)) return res.status(400).json({ success: false, message: "Listing is not a funding call" });
    if (String(existing.publisherId) !== String(publisherId)) return res.status(403).json({ success: false, message: "Not allowed" });

    const update = req.body || {};

    try {
      if (update.challengeCategory) {
        update.challengeCategory = await resolveActiveName(ChallengeCategory, update.challengeCategory, "challenge category");
      }
      if (update.organizerType) {
        update.organizerType = await resolveActiveName(OrganizerType, update.organizerType, "organizer type");
      }
      if (update.startupStage) {
        update.startupStage = await resolveActiveName(StartupStage, update.startupStage, "startup stage");
      }
    } catch (e) {
      return res.status(400).json({ success: false, message: e.message });
    }

    if (update.thumbImage?.url && update.thumbImage?.publicId) {
      update.thumbImage = {
        url: update.thumbImage.url,
        publicId: update.thumbImage.publicId,
        resourceType: update.thumbImage.resourceType || "image",
      };
    }

    if (update.description || update.title) {
      update.description = update.description || update.title || existing.description;
    }

    update.status = "pending";

    const allowed = [
      "title","challengeCategory","launchDate","submissionDeadline","resultDate",
      "organizingCompany","organizerType","contactPersonName","officialEmail","contactPhone",
      "description","keyFocusAreas","eligibleParticipants","startupStage","location","registrationLink",
      "thumbImage","status","isActive"
    ];

    const safe = {};
    for (const k of allowed) {
      if (k in update) safe[k] = update[k];
    }

    const updated = await Listing.findByIdAndUpdate(existing._id, safe, { new: true });
    return res.json({ success: true, message: "Funding call updated (pending approval)", item: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteFunding = async (req, res) => {
  try {
    const typeId = await ensureFundingTypeId();
    const publisherId = await resolvePublisher(req);
    if (!publisherId) return res.status(404).json({ success: false, message: "Publisher profile not found" });

    const { id } = req.params;
    const existing = await Listing.findById(id);
    if (!existing) return res.status(404).json({ success: false, message: "Funding call not found" });
    if (String(existing.type) !== String(typeId)) return res.status(400).json({ success: false, message: "Listing is not a funding call" });
    if (String(existing.publisherId) !== String(publisherId)) return res.status(403).json({ success: false, message: "Not allowed" });

    await Listing.deleteOne({ _id: existing._id });
    return res.json({ success: true, message: "Funding call deleted" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.toggleActive = async (req, res) => {
  try {
    const typeId = await ensureFundingTypeId();
    const publisherId = await resolvePublisher(req);
    if (!publisherId) return res.status(404).json({ success: false, message: "Publisher profile not found" });

    const { id } = req.params;
    const existing = await Listing.findById(id);
    if (!existing) return res.status(404).json({ success: false, message: "Funding call not found" });
    if (String(existing.type) !== String(typeId)) return res.status(400).json({ success: false, message: "Listing is not a funding call" });
    if (String(existing.publisherId) !== String(publisherId)) return res.status(403).json({ success: false, message: "Not allowed" });

    existing.isActive = !existing.isActive;
    await existing.save();

    return res.json({ success: true, message: `Funding call ${existing.isActive ? "activated" : "deactivated"}`, item: existing });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
