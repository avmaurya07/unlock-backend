const applicationSchema = new mongoose.Schema({
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: "Listing", required: true },
  
    applicantId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  
    answers: {}, // dynamic fields
    resume: String, // optional
    status: {
      type: String,
      enum: ["submitted", "reviewed", "shortlisted", "rejected"],
      default: "submitted"
    },
  
  }, { timestamps: true });
  
  module.exports = mongoose.model("Application", applicationSchema);
  