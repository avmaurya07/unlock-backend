const mongoose = require("mongoose");
const JobCategory = require("../models/JobCategory");

const escapeRegex = (str = "") => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const slugify = (val = "") =>
  val
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

exports.createCategory = async (req, res) => {
  try {
    let { name, description } = req.body;
    name = (name || "").trim();
    description = (description || "").trim();

    if (!name) return res.status(400).json({ success: false, message: "Name is required" });

    const slug = slugify(name);
    const exists = await JobCategory.findOne({
      $or: [
        { slug },
        { name: { $regex: new RegExp(`^${escapeRegex(name)}$`, "i") } },
      ],
    });
    if (exists) return res.status(409).json({ success: false, message: "Category already exists" });

    const cat = await JobCategory.create({
      name,
      slug,
      description,
      isActive: true,
      createdBy: req.user?.id,
    });

    return res.status(201).json({ success: true, message: "Job category created", category: cat });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid id" });

    const { name, description, isActive } = req.body;
    const updates = {};

    if (name) {
      updates.name = name.trim();
      updates.slug = slugify(name);
      const conflict = await JobCategory.findOne({
        _id: { $ne: id },
        $or: [
          { slug: updates.slug },
          { name: { $regex: new RegExp(`^${escapeRegex(name)}$`, "i") } },
        ],
      });
      if (conflict) {
        return res.status(409).json({ success: false, message: "Category with this name already exists" });
      }
    }

    if (typeof description === "string") updates.description = description.trim();
    if (typeof isActive === "boolean") updates.isActive = isActive;
    updates.updatedBy = req.user?.id;

    const updated = await JobCategory.findByIdAndUpdate(id, updates, { new: true });
    if (!updated) return res.status(404).json({ success: false, message: "Category not found" });

    return res.json({ success: true, message: "Job category updated", category: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid id" });

    const deleted = await JobCategory.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ success: false, message: "Category not found" });

    return res.json({ success: true, message: "Job category deleted" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getCategoriesAdmin = async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    const status = (req.query.status || "all").toLowerCase();

    const filter = {};
    if (q) filter.name = { $regex: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") };
    if (status === "active") filter.isActive = true;
    if (status === "inactive") filter.isActive = false;

    const categories = await JobCategory.find(filter).sort({ createdAt: -1 });
    return res.json({ success: true, categories });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getPublicCategories = async (_req, res) => {
  try {
    const categories = await JobCategory.find({ isActive: true }).sort({ name: 1 });
    return res.json({ success: true, categories });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
