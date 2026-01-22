const subscriptionPlanSchema = new mongoose.Schema({
    publisherId: { type: mongoose.Schema.Types.ObjectId, ref: "Publisher", required: true },
  
    plan: { type: String, enum: ["3m", "6m", "9m"], required: true },
    price: { type: Number, required: true },
  
    startDate: { type: Date, default: Date.now },
    expiryDate: { type: Date, required: true },

    isActive: {
    type: Boolean,
    default: true
  },
  
    paymentId: String, // Razorpay payment reference
  }, { timestamps: true });
  
  module.exports = mongoose.model("SubscriptionPlan", subscriptionPlanSchema);
  