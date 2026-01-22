const mongoose = require("mongoose");

const listingSchema = new mongoose.Schema({

  publisherId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Publisher", 
    required: true 
  },

  type: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ListingType",
    required: true
  },

  title: { type: String, required: true },
  description: { type: String, required: true },

  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending"
  },

  location: String,
  deadline: Date,
  startDate: Date,
  endDate: Date,

  attachments: [
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    resourceType: { type: String, default: "image" } // image/raw/video
  }
],

  // Event-specific fields (optional)
  eventCategory: { type: String },
  startDateTime: { type: Date },
  endDateTime: { type: Date },
  venueName: { type: String },
  fullAddress: { type: String },
  eventFormat: { type: String, enum: ["in-person", "online", "hybrid"], default: undefined },
  organizationName: { type: String },
  organizerContactPerson: { type: String },
  workEmail: { type: String },
  phoneNumber: { type: String },
  eventDescription: { type: String },
  targetAudience: [{ type: String }],
  keyTopics: [{ type: String }],
  registrationType: { type: String },
  registrationDeadline: { type: Date },
  registrationUrl: { type: String },
  eligibility: { type: String },
  applicationProcess: { type: String },
  mainImage: {
    url: String,
    publicId: String,
    resourceType: { type: String, default: "image" }
  },

  // Job-specific fields (optional)
  jobCategory: { type: String },
  jobType: { type: String }, // full-time/part-time/contract/internship etc.
  workMode: [{ type: String }], // remote/hybrid/onsite
  experienceLevel: { type: String },
  openings: { type: Number },
  companyName: { type: String },
  companyDescription: { type: String },
  companySize: { type: String },
  companyLogo: {
    url: String,
    publicId: String,
    resourceType: { type: String, default: "image" }
  },
  hiringManagerName: { type: String },
  hiringManagerEmail: { type: String },
  hiringManagerPhone: { type: String },
  keyResponsibilities: { type: String },
  yearsExperienceRequired: { type: Number },
  mustHaveSkills: { type: String },
  salaryMin: { type: Number },
  salaryMax: { type: Number },
  jobLocationAddress: { type: String },
  jobLocationCity: { type: String },
  jobLocationState: { type: String },
  jobLocationCountry: { type: String },
  applyLastDate: { type: Date },
  applyDate: { type: Date },
  externalApplicationUrl: { type: String },
  isActive: { type: Boolean, default: true },

  // Funding Challenge fields (optional)
  challengeCategory: { type: String },
  launchDate: { type: Date },
  submissionDeadline: { type: Date },
  resultDate: { type: Date },
  organizingCompany: { type: String },
  organizerType: { type: String },
  contactPersonName: { type: String },
  officialEmail: { type: String },
  contactPhone: { type: String },
  keyFocusAreas: { type: String },
  eligibleParticipants: { type: String },
  startupStage: { type: String },
  registrationLink: { type: String },
  thumbImage: {
    url: String,
    publicId: String,
    resourceType: { type: String, default: "image" }
  },

}, { timestamps: true });

module.exports = mongoose.model("Listing", listingSchema);
