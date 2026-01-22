const mongoose = require("mongoose");
const PublisherType = require("../models/PublisherType");

const escapeRegex = (str = "") => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const slugify = (val = "") =>
  val
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

exports.createPublisherType = async (req, res) => {
  try {
    let { name, description } = req.body;
    name = (name || "").trim();
    description = (description || "").trim();

    if (!name) {
      return res.status(400).json({ success: false, message: "Name is required" });
    }

    const slug = slugify(name);

    const exists = await PublisherType.findOne({
      $or: [
        { name: { $regex: new RegExp(`^${escapeRegex(name)}$`, "i") } },
        { slug }
      ]
    });

    if (exists) {
      return res.status(409).json({ success: false, message: "Type already exists" });
    }

    const type = await PublisherType.create({ name, slug, description, isActive: true });

    res.status(201).json({ success: true, message: "Publisher type created", type });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getPublisherTypes = async (req, res) => {
  try {
    const types = await PublisherType.find({ isActive: true }).sort({ name: 1 });
    res.json({ success: true, types });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updatePublisherType = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid id" });
    }

    const { name, description, isActive } = req.body;
    const updates = {};

    if (name) {
      updates.name = name.trim();
      updates.slug = slugify(name);

      const conflict = await PublisherType.findOne({
        _id: { $ne: id },
        $or: [
          { slug: updates.slug },
          { name: { $regex: new RegExp(`^${escapeRegex(name)}$`, "i") } }
        ]
      });
      if (conflict) {
        return res.status(409).json({ success: false, message: "Type with this name already exists" });
      }
    }

    if (typeof description === "string") updates.description = description.trim();
    if (typeof isActive === "boolean") updates.isActive = isActive;

    const updated = await PublisherType.findByIdAndUpdate(id, updates, { new: true });
    if (!updated) return res.status(404).json({ success: false, message: "Publisher type not found" });

    return res.json({ success: true, message: "Publisher type updated", type: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deletePublisherType = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid id" });
    }

    const deleted = await PublisherType.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ success: false, message: "Publisher type not found" });

    return res.json({ success: true, message: "Publisher type deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deactivatePublisherType = async (req, res) => {
  try {
    await PublisherType.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: "Publisher type deactivated" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAllPublisherTypesAdmin = async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    const status = (req.query.status || "all").toLowerCase(); // all|active|inactive

    const filter = {};
    if (q) filter.name = { $regex: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") };
    if (status === "active") filter.isActive = true;
    if (status === "inactive") filter.isActive = false;

    const types = await PublisherType.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, types });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
