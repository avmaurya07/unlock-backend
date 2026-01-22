// Usage: node scripts/ensurePublisher.js --email user@example.com --company "My Co" --publisherType <id>
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../src/models/User");
const Publisher = require("../src/models/Publisher");

const args = process.argv.slice(2);
const params = {};
for (let i = 0; i < args.length; i += 2) {
  const key = args[i];
  const val = args[i + 1];
  if (key === "--email") params.email = val;
  if (key === "--company") params.companyName = val;
  if (key === "--website") params.website = val;
  if (key === "--description") params.description = val;
  if (key === "--address") params.address = val;
  if (key === "--publisherType") params.publisherType = val;
}

async function main() {
  if (!params.email) {
    console.error("Email is required: --email user@example.com");
    process.exit(1);
  }
  if (!process.env.MONGO_URL) {
    console.error("MONGO_URL is required in env");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URL);

  const user = await User.findOne({ email: params.email });
  if (!user) {
    throw new Error(`User not found for email ${params.email}`);
  }

  let publisher = await Publisher.findOne({ userId: user._id });
  if (publisher) {
    console.log("Publisher already exists. Updating fields...");
    Object.assign(publisher, {
      companyName: params.companyName || publisher.companyName,
      website: params.website || publisher.website,
      description: params.description || publisher.description,
      address: params.address || publisher.address,
    });
    if (params.publisherType) publisher.publisherType = params.publisherType;
    await publisher.save();
    console.log("Updated publisher:", publisher._id.toString());
  } else {
    publisher = await Publisher.create({
      userId: user._id,
      publisherType: params.publisherType || null,
      companyName: params.companyName || "",
      website: params.website || "",
      description: params.description || "",
      address: params.address || "",
      subscriptionStatus: "expired",
    });
    console.log("Created publisher:", publisher._id.toString());
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
