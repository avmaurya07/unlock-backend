// Usage: node scripts/createAdmin.js --email admin@example.com --password StrongPass123
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const path = require("path");

// Load User model relative to project root
const User = require(path.join(__dirname, "..", "src", "models", "User"));

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i += 1) {
    const key = args[i];
    const val = args[i + 1];
    if (key === "--email") out.email = val;
    if (key === "--password") out.password = val;
  }
  return out;
}

async function main() {
  const { email, password } = parseArgs();

  if (!email || !password) {
    console.error("Usage: node scripts/createAdmin.js --email you@example.com --password StrongPass123");
    process.exit(1);
  }

  if (!process.env.MONGO_URL) {
    console.error("MONGO_URL is required in environment to connect to MongoDB");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URL);

  const existing = await User.findOne({ email }).select("+password");
  const hashed = await bcrypt.hash(password, 10);

  if (existing) {
    existing.role = "admin";
    existing.isVerified = true;
    existing.password = hashed;
    await existing.save();
    console.log(`Updated existing user to admin: ${email}`);
  } else {
    await User.create({
      email,
      password: hashed,
      role: "admin",
      isVerified: true,
    });
    console.log(`Created admin user: ${email}`);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Failed to create admin:", err.message);
  process.exit(1);
});
