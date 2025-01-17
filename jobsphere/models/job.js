const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema({
  jobTitle: {
    type: String,
    required: true,
    trim: true
  },
  companyName: {
    type: String,
    required: true,
    trim: true
  },
  industry: {
    type: String,
    enum: [
      'technology', 'healthcare', 'finance', 'education', 'manufacturing', 'retail', 'other'
    ],
    required: true
  },
  jobType: {
    type: String,
    enum: [
      'Full-time', 'Part-time', 'Contract', 'Temporary', 'Internship', 'Remote'
    ],
    required: true
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  salaryRange: {
    type: String,
    trim: true
  },
  jobDescription: {
    type: String,
    required: true,
    trim: true
  },
  responsibilities: {
    type: String,
    required: true,
    trim: true
  },
  requiredSkills: {
    type: String,
    required: true,
    trim: true
  },


  postedBy: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: true,
  },

  expired: {
    type: Boolean,
    default: false,
  },

  keywords: {
    type: [String], // Array of keywords
    required: true
  },
}, { timestamps: true });

// Create the Job model
const Job = mongoose.model('Job', jobSchema);
module.exports = Job;

//job expired
// job posted by whom in job sheema