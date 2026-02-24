const Razorpay = require("razorpay");
const crypto = require("crypto");
const SubscriptionPlan = require("../models/SubscriptionPlan");
const Subscription = require("../models/Subscription");
const Publisher = require("../models/Publisher");

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

function razorpayClient() {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) throw new Error("Razorpay keys not configured");
  return new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });
}

exports.getPlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find({ isActive: true }).sort({ durationInMonths: 1 });
    return res.json({ success: true, plans });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.createOrder = async (req, res) => {
  try {
    const { durationInMonths } = req.body;
    const plan = await SubscriptionPlan.findOne({ durationInMonths, isActive: true });
    if (!plan) return res.status(400).json({ success: false, message: "Invalid plan" });

    const amount = Math.round((plan.price || 0) * 100); // rupees -> paise

    // ensure Razorpay client available
    let rzp;
    try {
      rzp = razorpayClient();
    } catch (e) {
      console.error("Razorpay client init error:", e);
      return res.status(500).json({ success: false, message: "Razorpay configuration error" });
    }

    try {
      if (!amount || amount <= 0) {
        return res.status(400).json({ success: false, message: "Invalid plan price (must be > 0)" });
      }

      // Razorpay requires receipt length <= 40. Build a short receipt id.
      const shortUser = String(req.user.id).slice(-6);
      const shortTs = String(Date.now()).slice(-6);
      let receiptId = `sub_${shortUser}_${shortTs}`;
      if (receiptId.length > 40) receiptId = receiptId.slice(0, 40);

      console.log("Creating Razorpay order", { amount, currency: "INR", receipt: receiptId });
      const order = await rzp.orders.create({
        amount,
        currency: "INR",
        receipt: receiptId,
        payment_capture: 1,
      });

      return res.json({ success: true, order, plan });
    } catch (e) {
      console.error("Razorpay orders.create failed:", e && e.message ? e.message : e);
      if (process.env.NODE_ENV !== "production") {
        return res.status(500).json({ success: false, message: e.message || "Razorpay error", stack: e.stack });
      }
      return res.status(500).json({ success: false, message: "Failed to create order" });
    }
  } catch (err) {
    console.error("createOrder unexpected error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Verify payment signature and activate subscription
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, durationInMonths } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !durationInMonths) {
      return res.status(400).json({ success: false, message: "Missing payment fields" });
    }

    const expectedSignature = crypto
      .createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Invalid signature" });
    }

    const plan = await SubscriptionPlan.findOne({ durationInMonths, isActive: true });
    if (!plan) return res.status(400).json({ success: false, message: "Invalid plan" });

    // resolve publisher document
    const pub = await Publisher.findOne({ userId: req.user.id }).select("_id");
    if (!pub) return res.status(404).json({ success: false, message: "Publisher profile not found" });

    // create subscription record for publisher
    const startDate = new Date();
    const expiryDate = new Date(startDate);
    expiryDate.setMonth(expiryDate.getMonth() + Number(durationInMonths));

    const sub = await Subscription.create({
      publisherId: pub._id,
      plan: `${durationInMonths}m`,
      price: plan.price,
      startDate,
      expiryDate,
      isActive: true,
      paymentId: razorpay_payment_id,
    });

    // update publisher profile
    await Publisher.findByIdAndUpdate(pub._id, {
      subscriptionStatus: "active",
      subscriptionExpiry: expiryDate,
    });

    return res.json({ success: true, message: "Payment verified and subscription activated", subscription: sub });
  } catch (err) {
    console.error("verifyPayment error:", err);
    if (process.env.NODE_ENV !== "production") {
      return res.status(500).json({ success: false, message: err.message, stack: err.stack });
    }
    return res.status(500).json({ success: false, message: err.message });
  }
};
