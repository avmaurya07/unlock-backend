const Publisher = require("../models/Publisher");
const PublisherType = require("../models/PublisherType");

// CREATE Publisher Onboarding
exports.createPublisher = async (req, res) => {
  try {
    const {
      publisherType,
      companyName,
      organizationName,
      organizationType,
      publisherName,
      website,
      description,
      address
    } = req.body;

    // Validate publisher type
    const typeExists = await PublisherType.findOne({
      _id: publisherType,
      isActive: true
    });

    if (!typeExists) {
      return res.status(400).json({
        success: false,
        message: "Invalid or inactive publisher type"
      });
    }

    // Check if user already onboarded
    const existing = await Publisher.findOne({ userId: req.user.id });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Publisher profile already exists"
      });
    }

    // Start 30-day free trial
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 30);

    const publisher = await Publisher.create({
      userId: req.user.id,
      publisherType,
      companyName: companyName || organizationName,
      organizationName: organizationName || companyName,
      organizationType,
      contactName: publisherName,
      website,
      description,
      address,
      subscriptionStatus: "active",
      subscriptionExpiry: expiry,
    });

    res.json({
      success: true,
      message: "Publisher onboarding completed",
      publisher
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error in onboarding",
      error: error.message
    });
  }
};


// GET Logged-in Publisher Profile
exports.getMyPublisherProfile = async (req, res) => {
  try {
    let publisher = await Publisher.findOne({ userId: req.user.id })
      .populate("publisherType", "name description")
      .populate("userId", "email name");

    if (!publisher && req.user.role === "publisher") {
      // create a stub profile so profile page works even if onboarding was skipped
      publisher = await Publisher.create({
        userId: req.user.id,
        publisherType: null,
        subscriptionStatus: "expired",
      });
      publisher = await publisher.populate("publisherType", "name description");
      await publisher.populate("userId", "email name");
    }

    if (!publisher) {
      return res.status(404).json({
        success: false,
        message: "Publisher profile not found"
      });
    }

    res.json({
      success: true,
      publisher
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error loading profile",
      error: error.message
    });
  }
};


// UPDATE Publisher Profile
exports.updatePublisher = async (req, res) => {
  try {
    const updates = req.body;

    // If publisherType is passed → validate
    if (updates.publisherType) {
      const validType = await PublisherType.findOne({
        _id: updates.publisherType,
        isActive: true
      });

      if (!validType) {
        return res.status(400).json({
          success: false,
          message: "Invalid or inactive publisher type"
        });
      }
    }

    const publisher = await Publisher.findOneAndUpdate(
      { userId: req.user.id },
      updates,
      { new: true }
    ).populate("publisherType");

    if (!publisher) {
      return res.status(404).json({
        success: false,
        message: "Publisher profile not found"
      });
    }

    res.json({
      success: true,
      message: "Profile updated successfully",
      publisher
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating profile",
      error: error.message
    });
  }
};
