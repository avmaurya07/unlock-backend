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

exports.submitProduct = async (req, res) => {
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

    // Validate consent
    if (!disclosureConsent) {
      return res.status(400).json({
        success: false,
        message: "You must provide consent for disclosure before submitting",
      });
    }

    const slug = slugify(productName);

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
      disclosureConsent: true,
      approvalStatus: "pending",
      isActive: false,
    });

    return res.status(201).json({
      success: true,
      message:
        "Thank you for your submission. Please note that submitting an application does not guarantee product listing. Our team will review all company and product information, and only approved applications will be updated and published in the Innovation Product Listing.",
      product,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getApprovedProducts = async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    const category = (req.query.category || "").trim();
    const innovationStatus = (req.query.innovationStatus || "").trim();

    const filter = {
      approvalStatus: "approved",
      isActive: true,
    };

    if (q) {
      filter.$or = [
        { productName: { $regex: new RegExp(escapeRegex(q), "i") } },
        { companyName: { $regex: new RegExp(escapeRegex(q), "i") } },
        { brandName: { $regex: new RegExp(escapeRegex(q), "i") } },
        { technology: { $regex: new RegExp(escapeRegex(q), "i") } },
      ];
    }

    if (category) filter.innovationCategory = category;
    if (innovationStatus) filter.innovationStatus = innovationStatus;

    const products = await InnovationProduct.find(filter)
      .select("-createdBy -updatedBy -rejectionReason") // Hide internal fields
      .sort({ createdAt: -1 });

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

    const product = await InnovationProduct.findOne({
      _id: id,
      approvalStatus: "approved",
      isActive: true,
    }).select("-createdBy -updatedBy -rejectionReason");

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    return res.json({ success: true, product });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
