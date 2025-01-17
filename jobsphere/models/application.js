const mongoose = require("mongoose");
const validator = require('validator');


const applicationSchema = new mongoose.Schema({
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },
    name: {
      type: String,
      required: [true, "Please enter your Name!"],
      minLength: [3, "Name must contain at least 3 Characters!"],
      maxLength: [30, "Name cannot exceed 30 Characters!"],
    },
    email: {
      type: String,
      required: [true, "Please enter your Email!"],
      validate: [validator.isEmail, "Please provide a valid Email!"],
    },
    coverLetter: {
      type: String,
      required: [true, "Please provide a cover letter!"],
    },
    phone: {
      type: String,
      required: [true, "Please enter your Phone Number!"],
    },
    address: {
      type: String,
      required: [true, "Please enter your Address!"],
    },
    applicantID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    employerID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Reviewed', 'Shortlisted', 'Rejected', 'Accepted'],
      default: 'Pending',
    },
  }, { timestamps: true });
  
  module.exports = mongoose.models.Application || mongoose.model("Application", applicationSchema);
  