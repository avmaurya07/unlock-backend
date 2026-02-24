const mongoose = require("mongoose");
const InnovationProduct = require("../models/InnovationProduct");

const escapeRegex = (str = "") => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const slugify = (val = "") =>
  val
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

exports.createProduct = async (req, res) => {
  try {
    const {
      companyName,
      establishedYear,
      brandName,
      productName,
      productLogo,
      innovationCategory,
      technology,
      detailedDescription,
      keyFeatures,
      productDemoUrl,
      patentStatus,
      targetIndustry,
      challengeSolved,
      companyInstitution,
      contactEmail,
      contactNumber,
      websiteUrl,
      innovationStatus,
      productStatus,
      founderName,
      disclosureConsent,
    } = req.body;

    // Validate required fields
    if (!companyName || !establishedYear || !brandName || !productName) {
      return res.status(400).json({
        success: false,
        message:
          "Company name, established year, brand name, and product name are required",
      });
    }

    if (
      !innovationCategory ||
      !technology ||
      !detailedDescription ||
      !keyFeatures
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Innovation category, technology, description, and key features are required",
      });
    }

    if (!patentStatus || !targetIndustry || !challengeSolved) {
      return res.status(400).json({
        success: false,
        message:
          "Patent status, target industry, and challenge solved are required",
      });
    }

    if (
      !companyInstitution ||
      !contactEmail ||
      !innovationStatus ||
      !productStatus ||
      !founderName
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Company/institution, contact email, innovation status, product status, and founder name are required",
      });
    }

    const slug = slugify(productName);
    const exists = await InnovationProduct.findOne({
      $or: [
        { slug },
        {
          productName: {
            $regex: new RegExp(`^${escapeRegex(productName)}$`, "i"),
          },
        },
      ],
    });

    if (exists) {
      return res.status(409).json({
        success: false,
        message: "Product with this name already exists",
      });
    }

    const product = await InnovationProduct.create({
      companyName: companyName.trim(),
      establishedYear: establishedYear.trim(),
      brandName: brandName.trim(),
      productName: productName.trim(),
      slug,
      productLogo: productLogo || "",
      innovationCategory,
      technology: technology.trim(),
      detailedDescription: detailedDescription.trim(),
      keyFeatures: keyFeatures.trim(),
      productDemoUrl: productDemoUrl || "",
      patentStatus,
      targetIndustry: targetIndustry.trim(),
      challengeSolved: challengeSolved.trim(),
      companyInstitution: companyInstitution.trim(),
      contactEmail: contactEmail.trim().toLowerCase(),
      contactNumber: contactNumber || "",
      websiteUrl: websiteUrl || "",
      innovationStatus,
      productStatus,
      founderName: founderName.trim(),
      disclosureConsent: disclosureConsent || false,
      approvalStatus: "approved", // Admin-created products are auto-approved
      isActive: true,
      createdBy: req.user?.id,
    });

    return res.status(201).json({
      success: true,
      message: "Innovation product created successfully",
      product,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid product ID" });
    }

    const updates = {};
    const allowedFields = [
      "companyName",
      "establishedYear",
      "brandName",
      "productName",
      "productLogo",
      "innovationCategory",
      "technology",
      "detailedDescription",
      "keyFeatures",
      "productDemoUrl",
      "patentStatus",
      "targetIndustry",
      "challengeSolved",
      "companyInstitution",
      "contactEmail",
      "contactNumber",
      "websiteUrl",
      "innovationStatus",
      "productStatus",
      "founderName",
      "disclosureConsent",
      "isActive",
      "approvalStatus",
      "rejectionReason",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (typeof req.body[field] === "string") {
          updates[field] = req.body[field].trim();
        } else {
          updates[field] = req.body[field];
        }
      }
    });

    // If productName is updated, update slug too
    if (updates.productName) {
      updates.slug = slugify(updates.productName);

      // Check for conflicts
      const conflict = await InnovationProduct.findOne({
        _id: { $ne: id },
        $or: [
          { slug: updates.slug },
          {
            productName: {
              $regex: new RegExp(`^${escapeRegex(updates.productName)}$`, "i"),
            },
          },
        ],
      });

      if (conflict) {
        return res.status(409).json({
          success: false,
          message: "Product with this name already exists",
        });
      }
    }

    updates.updatedBy = req.user?.id;

    const updated = await InnovationProduct.findByIdAndUpdate(id, updates, {
      new: true,
    });
    if (!updated) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    return res.json({
      success: true,
      message: "Product updated successfully",
      product: updated,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid product ID" });
    }

    const deleted = await InnovationProduct.findByIdAndDelete(id);
    if (!deleted) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    return res.json({ success: true, message: "Product deleted successfully" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getProductsAdmin = async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    const status = (req.query.status || "all").toLowerCase();
    const approvalStatus = (req.query.approvalStatus || "all").toLowerCase();
    const category = (req.query.category || "").trim();

    const filter = {};

    if (q) {
      filter.$or = [
        { productName: { $regex: new RegExp(escapeRegex(q), "i") } },
        { companyName: { $regex: new RegExp(escapeRegex(q), "i") } },
        { brandName: { $regex: new RegExp(escapeRegex(q), "i") } },
      ];
    }

    if (status === "active") filter.isActive = true;
    if (status === "inactive") filter.isActive = false;

    if (approvalStatus === "pending") filter.approvalStatus = "pending";
    if (approvalStatus === "approved") filter.approvalStatus = "approved";
    if (approvalStatus === "rejected") filter.approvalStatus = "rejected";

    if (category) filter.innovationCategory = category;

    const products = await InnovationProduct.find(filter)
      .sort({ createdAt: -1 })
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    return res.json({ success: true, products });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.approveProduct = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid product ID" });
    }

    const product = await InnovationProduct.findByIdAndUpdate(
      id,
      {
        approvalStatus: "approved",
        rejectionReason: "",
        isActive: true,
        updatedBy: req.user?.id,
      },
      { new: true },
    );

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    return res.json({
      success: true,
      message: "Product approved successfully",
      product,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.rejectProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!isValidObjectId(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid product ID" });
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required",
      });
    }

    const product = await InnovationProduct.findByIdAndUpdate(
      id,
      {
        approvalStatus: "rejected",
        rejectionReason: reason.trim(),
        updatedBy: req.user?.id,
      },
      { new: true },
    );

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    return res.json({
      success: true,
      message: "Product rejected",
      product,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
