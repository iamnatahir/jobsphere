
const Application = require("../models/application");
const mongoose = require("mongoose");
const Job  = require("../models/job");
const axios = require("../axiosConfig"); // Use CommonJS require syntax

const ErrorHandler = require("../middleware/error");
const catchAsyncErrors = require("../middleware/catchAsyncError");


exports.postApplication = catchAsyncErrors(async (req, res, next) => {
  // if (req.user.role === "Employer") {
  //   return next(new ErrorHandler("Employers are not allowed to apply for jobs.", 400));
  // }

  const { name, email, coverLetter, phone, address, jobId } = req.body;

  if (!name || !email || !coverLetter || !phone || !address || !jobId) {
    return next(new ErrorHandler("Please fill in all required fields.", 400));
  }

  const job = await Job.findById(jobId);
  if (!job) return next(new ErrorHandler("Job not found.", 404));
  if (job.expired) return next(new ErrorHandler("This job has expired.", 400));

  const application = await Application.create({
    jobId,
    name,
    email,
    coverLetter,
    phone,
    address,
    applicantID: req.user.id,
    employerID: job.postedBy,
  });

  res.status(200).json({
    success: true,
    message: "Application submitted successfully!",
    application,
  });
});

exports.employerGetAllApplications = catchAsyncErrors(async (req, res, next) => {

  const applications = await Application.find({ employerID: req.user.id })
    .populate("jobId", "jobTitle") // Populate job title
    .populate("applicantID", "name email"); // Populate applicant name and email

  if (!applications || applications.length === 0) {
    return next(new ErrorHandler("No applications found.", 404));
  }

  res.status(200).json({ applications });
});

exports.jobseekerGetAllApplications = catchAsyncErrors(async (req, res, next) => {
  const applications = await Application.find({ applicantID: req.user.id })
    .populate("jobId", "jobTitle companyName");

  res.status(200).json({
    success: true,
    applications,
  });
});

exports.jobseekerDeleteApplication = catchAsyncErrors(async (req, res, next) => {
  if (req.user.role === "Employer") {
    return next(new ErrorHandler("Employers are not allowed to access this resource.", 400));
  }

  const { id } = req.params;
  const application = await Application.findById(id);

  if (!application) {
    return next(new ErrorHandler("Application not found.", 404));
  }

  if (application.applicantID.toString() !== req.user.id) {
    return next(new ErrorHandler("Unauthorized to delete this application.", 403));
  }

  await application.deleteOne();
  res.status(200).json({
    success: true,
    message: "Application deleted successfully!",
  });
});


// Controller function for updating application status
exports.updateApplicationStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  // Validate the new status
  if (!['Pending', 'Accepted', 'Rejected'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  try {
    // Find the application by ID
    const application = await Application.findById(id);
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Update the status
    application.status = status;
    await application.save();

    res.status(200).json({ message: 'Application status updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};
