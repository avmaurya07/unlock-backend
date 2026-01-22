const paymentSchema = new mongoose.Schema({
    publisherId: { type: mongoose.Schema.Types.ObjectId, ref: "Publisher" },
  
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,
  
    amount: Number,
    status: { type: String, enum: ["success", "failed"], default: "success" }
  
  }, { timestamps: true });
  
  module.exports = mongoose.model("Payment", paymentSchema);
  