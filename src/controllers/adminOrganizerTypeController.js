const mongoose = require("mongoose");
const OrganizerType = require("../models/OrganizerType");

const escapeRegex = (str = "") => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const slugify = (val = "") =>
  val
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

exports.createType = async (req, res) => {
  try {
    let { name, description } = req.body;
    name = (name || "").trim();
    description = (description || "").trim();

    if (!name) return res.status(400).json({ success: false, message: "Name is required" });

    const slug = slugify(name);
    const exists = await OrganizerType.findOne({
      $or: [
        { slug },
        { name: { $regex: new RegExp(`^${escapeRegex(name)}$`, "i") } },
      ],
    });
    if (exists) return res.status(409).json({ success: false, message: "Organizer type already exists" });

    const doc = await OrganizerType.create({
      name,
      slug,
      description,
      isActive: true,
      createdBy: req.user?.id,
    });

    return res.status(201).json({ success: true, message: "Organizer type created", type: doc });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateType = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid id" });

    const { name, description, isActive } = req.body;
    const updates = {};

    if (name) {
      updates.name = name.trim();
      updates.slug = slugify(name);
      const conflict = await OrganizerType.findOne({
        _id: { $ne: id },
        $or: [
          { slug: updates.slug },
          { name: { $regex: new RegExp(`^${escapeRegex(name)}$`, "i") } },
        ],
      });
      if (conflict) return res.status(409).json({ success: false, message: "Organizer type exists" });
    }

    if (typeof description === "string") updates.description = description.trim();
    if (typeof isActive === "boolean") updates.isActive = isActive;
    updates.updatedBy = req.user?.id;

    const updated = await OrganizerType.findByIdAndUpdate(id, updates, { new: true });
    if (!updated) return res.status(404).json({ success: false, message: "Organizer type not found" });

    return res.json({ success: true, message: "Organizer type updated", type: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteType = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid id" });
    const deleted = await OrganizerType.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ success: false, message: "Organizer type not found" });
    return res.json({ success: true, message: "Organizer type deleted" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getTypesAdmin = async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    const status = (req.query.status || "all").toLowerCase();
    const filter = {};
    if (q) filter.name = { $regex: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") };
    if (status === "active") filter.isActive = true;
    if (status === "inactive") filter.isActive = false;
    const types = await OrganizerType.find(filter).sort({ createdAt: -1 });
    return res.json({ success: true, types });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getPublicTypes = async (_req, res) => {
  try {
    const types = await OrganizerType.find({ isActive: true }).sort({ name: 1 });
    return res.json({ success: true, types });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
