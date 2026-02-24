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
      approvalStatus: "pending", // Publisher submissions start as pending
      isActive: false, // Not active until approved
      createdBy: req.user?.id,
    });

    return res.status(201).json({
      success: true,
      message:
        "Product submitted successfully. It will be reviewed by our team.",
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

    // Find the product first
    const existingProduct = await InnovationProduct.findById(id);
    if (!existingProduct) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    // Check ownership
    if (existingProduct.createdBy?.toString() !== req.user?.id?.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only edit your own products",
      });
    }

    // Only allow editing if pending or rejected
    if (existingProduct.approvalStatus === "approved") {
      return res.status(403).json({
        success: false,
        message:
          "Cannot edit approved products. Please contact admin for changes.",
      });
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

    // If editing a rejected product, reset to pending
    if (existingProduct.approvalStatus === "rejected") {
      updates.approvalStatus = "pending";
      updates.rejectionReason = "";
    }

    updates.updatedBy = req.user?.id;

    const updated = await InnovationProduct.findByIdAndUpdate(id, updates, {
      new: true,
    });

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

    const product = await InnovationProduct.findById(id);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    // Check ownership
    if (product.createdBy?.toString() !== req.user?.id?.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own products",
      });
    }

    await InnovationProduct.findByIdAndDelete(id);

    return res.json({ success: true, message: "Product deleted successfully" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMyProducts = async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    const status = (req.query.status || "all").toLowerCase();

    const filter = { createdBy: req.user?.id };

    if (q) {
      filter.$or = [
        { productName: { $regex: new RegExp(escapeRegex(q), "i") } },
        { companyName: { $regex: new RegExp(escapeRegex(q), "i") } },
      ];
    }

    if (status === "pending") filter.approvalStatus = "pending";
    if (status === "approved") filter.approvalStatus = "approved";
    if (status === "rejected") filter.approvalStatus = "rejected";

    const products = await InnovationProduct.find(filter).sort({
      createdAt: -1,
    });

    return res.json({ success: true, products });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid product ID" });
    }

    const product = await InnovationProduct.findById(id);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    // Check ownership
    if (product.createdBy?.toString() !== req.user?.id?.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only view your own products",
      });
    }

    return res.json({ success: true, product });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
