const User = require("../models/User");
const Publisher = require("../models/Publisher");
const redis = require("../config/redis");
const bcrypt = require("bcrypt");
const generateOTP = require("../utils/generateOTP");
const { sendEmailOTP } = require("../utils/email");
const { generateToken } = require("../utils/jwt");

// --------------------------------------
// REGISTER WITH PASSWORD
// --------------------------------------
exports.register = async (req, res) => {
  try {
    const { name, email, password, role = "user" } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    if (!["user", "publisher"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: "Account already exists. Please login." });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashed,
      role,
      isVerified: true, // email-based signup without OTP
    });

    const token = generateToken(user);
    const userObj = user.toObject();
    delete userObj.password;

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      token,
      user: userObj,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// --------------------------------------
// LOGIN WITH PASSWORD
// --------------------------------------
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Ensure publisher profile exists for publisher users
    if (user.role === "publisher") {
      const existingPublisher = await Publisher.findOne({ userId: user._id });
      if (!existingPublisher) {
        await Publisher.create({
          userId: user._id,
          publisherType: null,
          subscriptionStatus: "expired",
        });
      }
    }

    const token = generateToken(user);
    const userObj = user.toObject();
    delete userObj.password;

    return res.json({
      success: true,
      message: "Login successful",
      token,
      user: userObj,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// --------------------------------------
// SEND OTP
// --------------------------------------
exports.sendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) return res.status(400).json({ message: "Email required" });

    const otp = generateOTP();

    // Save OTP in Redis for 5 min
    await redis.set(`otp:${email}`, otp, { EX: 300 });

    const emailSent = await sendEmailOTP(email, otp);
    if (!emailSent)
      return res.status(500).json({ message: "Failed to send OTP" });

    res.json({ success: true, message: "OTP sent to email" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// --------------------------------------
// VERIFY OTP & LOGIN / REGISTER
// --------------------------------------
exports.verifyOtp = async (req, res) => {
  try {
    const {
      email,
      otp,
      role,
      password,
      publisherType,
      companyName,
      organizationName,
      organizationType,
      publisherName,
      website,
      description,
      address
    } = req.body;

    const storedOtp = await redis.get(`otp:${email}`);

    if (!storedOtp) return res.status(400).json({ message: "OTP expired" });

    if (storedOtp !== otp)
      return res.status(400).json({ message: "Invalid OTP" });

    let user = await User.findOne({ email }).select("+password");

    // If user does not exist → create new one
    if (!user) {
      if (!password) {
        return res.status(400).json({ message: "Password is required to register" });
      }

      const hashed = await bcrypt.hash(password, 10);

      user = await User.create({
        email,
        role: role || "user",
        password: hashed,
        isVerified: true,
      });

      // If role is publisher → create publisher profile (with details if provided)
      if (role === "publisher") {
        await Publisher.create({
          userId: user._id,
          publisherType: publisherType || null,
          companyName: companyName || organizationName || "",
          organizationName: organizationName || companyName || "",
          organizationType: organizationType || "",
          contactName: publisherName || "",
          website: website || "",
          description: description || "",
          address: address || "",
          subscriptionStatus: "expired",
        });
      }
    }
    else {
      // Existing user logging in via OTP
      const updates = {};
      if (!user.isVerified) {
        updates.isVerified = true;
      }
      // Allow setting password if it was missing and provided now
      if (!user.password && password) {
        updates.password = await bcrypt.hash(password, 10);
      }

      if (Object.keys(updates).length) {
        await User.updateOne({ _id: user._id }, updates, { runValidators: false });
        Object.assign(user, updates);
      }
      // ensure publisher profile exists for publisher role
      if (user.role === "publisher") {
        const existingPublisher = await Publisher.findOne({ userId: user._id });
        if (existingPublisher) {
          // update with any onboarding fields provided
          const updatesPub = {};
          if (publisherType) updatesPub.publisherType = publisherType;
          if (companyName || organizationName) {
            updatesPub.companyName = companyName || organizationName;
            updatesPub.organizationName = organizationName || companyName;
          }
          if (organizationType) updatesPub.organizationType = organizationType;
          if (publisherName) updatesPub.contactName = publisherName;
          if (website) updatesPub.website = website;
          if (description) updatesPub.description = description;
          if (address) updatesPub.address = address;
          if (Object.keys(updatesPub).length) {
            await Publisher.updateOne({ _id: existingPublisher._id }, updatesPub);
          }
        } else {
          await Publisher.create({
            userId: user._id,
            publisherType: publisherType || null,
            companyName: companyName || organizationName || "",
            organizationName: organizationName || companyName || "",
            organizationType: organizationType || "",
            contactName: publisherName || "",
            website: website || "",
            description: description || "",
            address: address || "",
            subscriptionStatus: "expired",
          });
        }
      }
    }

    // OTP correct -> remove from Redis
    await redis.del(`otp:${email}`);

    const token = generateToken(user);
    const userObj = user.toObject();
    delete userObj.password;

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: userObj,
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
