const Listing = require("../models/Listing");
const ListingType = require("../models/ListingType");
const Publisher = require("../models/Publisher");
const JobCategory = require("../models/JobCategory");

const authDisabled = () => process.env.DISABLE_AUTH === "true";

async function ensureJobTypeId() {
  let t = await ListingType.findOne({ name: "job" }).select("_id");
  if (!t) {
    t = await ListingType.create({
      name: "job",
      description: "Jobs",
      isActive: true,
    });
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

exports.listJobs = async (req, res) => {
  try {
    const typeId = await ensureJobTypeId();
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

exports.createJob = async (req, res) => {
  try {
    const typeId = await ensureJobTypeId();
    const publisherId = await resolvePublisher(req);
    if (!publisherId) return res.status(404).json({ success: false, message: "Publisher profile not found" });

    const {
      title,
      jobCategory,
      jobType,
      workMode,
      experienceLevel,
      openings,
      companyName,
      companyDescription,
      companySize,
      companyLogo,
      hiringManagerName,
      hiringManagerEmail,
      hiringManagerPhone,
      keyResponsibilities,
      yearsExperienceRequired,
      mustHaveSkills,
      salaryMin,
      salaryMax,
      jobLocationAddress,
      jobLocationCity,
      jobLocationState,
      jobLocationCountry,
      applyLastDate,
      applyDate,
      externalApplicationUrl,
      about,
    } = req.body;

    if (!title || !jobCategory || !jobType) {
      return res.status(400).json({ success: false, message: "title, jobCategory, jobType are required" });
    }

    // Validate job category active
    const cat = await JobCategory.findOne({ name: jobCategory, isActive: true }).select("_id");
    if (!cat) return res.status(400).json({ success: false, message: "Invalid or inactive job category" });

    const workModes = Array.isArray(workMode)
      ? workMode.filter(Boolean)
      : (workMode || "").split(",").map((s) => s.trim()).filter(Boolean);

    const doc = await Listing.create({
      publisherId,
      type: typeId,
      title,
      description: companyDescription || keyResponsibilities || title, // required by Listing schema
      jobCategory,
      jobType,
      workMode: workModes,
      experienceLevel,
      openings,
      companyName,
      companyDescription: about || companyDescription,
      companySize,
      companyLogo: companyLogo?.url ? {
        url: companyLogo.url,
        publicId: companyLogo.publicId,
        resourceType: companyLogo.resourceType || "image"
      } : undefined,
      hiringManagerName,
      hiringManagerEmail,
      hiringManagerPhone,
      keyResponsibilities,
      yearsExperienceRequired,
      mustHaveSkills,
      salaryMin,
      salaryMax,
      jobLocationAddress,
      jobLocationCity,
      jobLocationState,
      jobLocationCountry,
      applyLastDate,
      applyDate,
      externalApplicationUrl,
      status: "pending",
      isActive: true,
    });

    return res.json({ success: true, message: "Job created (pending approval)", item: doc });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateJob = async (req, res) => {
  try {
    const typeId = await ensureJobTypeId();
    const publisherId = await resolvePublisher(req);
    if (!publisherId) return res.status(404).json({ success: false, message: "Publisher profile not found" });

    const { id } = req.params;
    const existing = await Listing.findById(id);
    if (!existing) return res.status(404).json({ success: false, message: "Job not found" });
    if (String(existing.type) !== String(typeId)) return res.status(400).json({ success: false, message: "Listing is not a job" });
    if (String(existing.publisherId) !== String(publisherId)) return res.status(403).json({ success: false, message: "Not allowed" });

    const update = req.body || {};

    if (update.jobCategory) {
      const cat = await JobCategory.findOne({ name: update.jobCategory, isActive: true }).select("_id");
      if (!cat) return res.status(400).json({ success: false, message: "Invalid or inactive job category" });
    }

    if (update.workMode) {
      update.workMode = Array.isArray(update.workMode)
        ? update.workMode.filter(Boolean)
        : String(update.workMode).split(",").map((s) => s.trim()).filter(Boolean);
    }

    if (update.companyLogo?.url && update.companyLogo?.publicId) {
      update.companyLogo = {
        url: update.companyLogo.url,
        publicId: update.companyLogo.publicId,
        resourceType: update.companyLogo.resourceType || "image"
      };
    }

    // reset to pending on edit
    update.status = "pending";
    // keep Listing.description in sync
    if (update.companyDescription || update.keyResponsibilities || update.title) {
      update.description = update.companyDescription || update.keyResponsibilities || update.title || existing.description;
    }

    const allowed = [
      "title","jobCategory","jobType","workMode","experienceLevel","openings",
      "companyName","companyDescription","companySize","companyLogo",
      "hiringManagerName","hiringManagerEmail","hiringManagerPhone",
      "keyResponsibilities","yearsExperienceRequired","mustHaveSkills",
      "salaryMin","salaryMax","jobLocationAddress","jobLocationCity","jobLocationState","jobLocationCountry",
      "applyLastDate","applyDate","externalApplicationUrl","status","isActive","description"
    ];

    const safe = {};
    for (const k of allowed) {
      if (k in update) safe[k] = update[k];
    }

    const updated = await Listing.findByIdAndUpdate(existing._id, safe, { new: true });
    return res.json({ success: true, message: "Job updated (pending approval)", item: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteJob = async (req, res) => {
  try {
    const typeId = await ensureJobTypeId();
    const publisherId = await resolvePublisher(req);
    if (!publisherId) return res.status(404).json({ success: false, message: "Publisher profile not found" });

    const { id } = req.params;
    const existing = await Listing.findById(id);
    if (!existing) return res.status(404).json({ success: false, message: "Job not found" });
    if (String(existing.type) !== String(typeId)) return res.status(400).json({ success: false, message: "Listing is not a job" });
    if (String(existing.publisherId) !== String(publisherId)) return res.status(403).json({ success: false, message: "Not allowed" });

    await Listing.deleteOne({ _id: existing._id });
    return res.json({ success: true, message: "Job deleted" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.toggleActive = async (req, res) => {
  try {
    const typeId = await ensureJobTypeId();
    const publisherId = await resolvePublisher(req);
    if (!publisherId) return res.status(404).json({ success: false, message: "Publisher profile not found" });

    const { id } = req.params;
    const existing = await Listing.findById(id);
    if (!existing) return res.status(404).json({ success: false, message: "Job not found" });
    if (String(existing.type) !== String(typeId)) return res.status(400).json({ success: false, message: "Listing is not a job" });
    if (String(existing.publisherId) !== String(publisherId)) return res.status(403).json({ success: false, message: "Not allowed" });

    existing.isActive = !existing.isActive;
    await existing.save();

    return res.json({ success: true, message: `Job ${existing.isActive ? "activated" : "deactivated"}`, item: existing });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
