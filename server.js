require("dotenv").config();
const connectDB = require("./src/config/db");
const app = require("./src/app");

const PORT = process.env.PORT || 5000;

(async () => {
  await connectDB();
  console.log("Razorpay keys present:", !!process.env.RAZORPAY_KEY_ID, !!process.env.RAZORPAY_KEY_SECRET);
  console.log("DISABLE_AUTH:", process.env.DISABLE_AUTH);
  console.log("BYPASS_SUBSCRIPTION_CHECK:", process.env.BYPASS_SUBSCRIPTION_CHECK);
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
})();
