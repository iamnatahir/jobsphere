// controller/jobController.js
const ErrorHandler = require("../middleware/error");
const catchAsyncErrors = require("../middleware/catchAsyncError");
const Job = require("../models/job");
const User = require('../models/user');
const Notification = require('../models/notification');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.MY_GMAIL,
    pass: process.env.MY_PASSWORD,
  },
});
//updatejob
exports.updateJob = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate the request body to prevent invalid updates
    const updateData = req.body;

    // Perform the update and return the updated document
    const updatedJob = await Job.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true, // Return the updated document
        runValidators: true, // Enforce schema validations on update
      }
    );

    // If no job was found with the given ID
    if (!updatedJob) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    res.status(200).json({
      success: true,
      message: "Job updated successfully",
      updatedJob,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "An error occurred while updating the job",
      error: error.message,
    });
  }
};

// get my jobs
exports.getMyJobs = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.user; // Fetch the logged-in user's ID from the token

  const myJobs = await Job.find({ postedBy: id }); // Fetch jobs where postedBy matches the user's ID

  res.status(200).render('job/myJobs', {
    jobs: myJobs,
  });
});


//delete an existing job posting
exports.deleteJob = async (req, res) => {
  try {
    const { id } = req.params; // Extract job ID from request parameters
    const deletedJob = await Job.findByIdAndDelete(id); // Find the job by ID and delete it

    if (!deletedJob) {
      return res.status(404).json({ message: "Job not found" }); // If job is not found, return a 404 error
    }

    res.status(200).json({ message: "Job deleted successfully", deletedJob }); // Respond with success message
  } catch (err) {
    res.status(500).json({ error: err.message }); // Handle any server errors
  }
};

exports.getSingleJob = catchAsyncErrors(async (req, res, next) => {

  const { id } = req.params;
  try {
    const job = await Job.findById(id);
    if (!job) {
      return next(new ErrorHandler("Job not found.", 404));
    }
    res.status(200).json({
      success: true,
      job,
    });
  } catch (error) {
    return next(new ErrorHandler(`Invalid ID / CastError`, 404));
  }
});



// Post Job
exports.postJob = catchAsyncErrors(async (req, res, next) => {
  if (req.user.role === "Job Seeker") {
    return next(new ErrorHandler("Job Seekers cannot post jobs.", 403));
  }

  const {
    jobTitle,
    companyName,
    industry,
    jobType,
    location,
    salaryRange,
    jobDescription,
    responsibilities,
    requiredSkills,
    keywords,
  } = req.body;

  if (
    !jobTitle ||
    !companyName ||
    !industry ||
    !jobType ||
    !location ||
    !salaryRange ||
    !jobDescription ||
    !responsibilities ||
    !requiredSkills
  ) {
    return next(new ErrorHandler("Please provide all job details.", 400));
  }

  const job = await Job.create({
    jobTitle,
    companyName,
    industry,
    jobType,
    location,
    salaryRange,
    jobDescription,
    responsibilities,
    requiredSkills,
    keywords,
    postedBy: req.user.id,
  });
  if (!jobTitle || !companyName || !industry || !jobType || !location || !salaryRange || !jobDescription ||
    !responsibilities || !requiredSkills) {
    return next(new ErrorHandler("Please provide full job details.", 400));
  }else{
    return res.redirect("/job/MyJobs");

  }

  // Find users with matching keywords 
  const users = await User.find({ keywords: { $in: keywords } });
  console.log(users);
  // Notify users 
  users.forEach(async (user) => {
    try {
      const notification = await Notification.create({
        user: user._id,
        message: `New job posted: ${jobTitle}`,
        job: job._id,
      });
      // Send email
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: `New Job Posted: ${jobTitle}`,
        text: ` Hi ${user.name}, 
           A new job has been posted that matches your keywords: 
           Job Title: ${jobTitle} Company: ${companyName} Location: ${location} Job Type: ${jobType} Industry: ${industry} Salary Range: ${salaryRange} Description: ${jobDescription} Responsibilities: ${responsibilities} Required Skills: ${requiredSkills} Apply now! Best, Job Portal Team `,
      };
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.log(`Error sending email to ${user.email}:`, error);
        } else {
          console.log(`Email sent to ${user.email}:`, info.response);
        }
      });


      console.log("Notification created:", notification);
    } catch (err) {
      console.error("Error creating notification for user:", user._id, err.message);
    }
  });

  

});




exports.getSingleJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id); // Replace with your DB query logic
    if (!job) {
      return res.status(404).send("Job not found");
    }
    res.render("job/jobDetails", {
      job: {
        ...job._doc, // Spreads job document properties
        responsibilities: job.responsibilities || [], // Default to an empty array if undefined
        requiredSkills: job.requiredSkills || [], // Default to an empty array if undefined
      },
    });
  } catch (error) {
    next(error);
  }
}

// Get All Jobs
exports.getAllJobs = catchAsyncErrors(async (req, res, next) => {
  const { searchQuery } = req.query;
  const searchOptions = searchQuery
    ? {
      $or: [
        { jobTitle: new RegExp(searchQuery, "i") },
        { companyName: new RegExp(searchQuery, "i") },
        { location: new RegExp(searchQuery, "i") },
        { jobType: new RegExp(searchQuery, "i") },
        { industry: new RegExp(searchQuery, "i") },
      ],
    }
    : {};

  const jobs = await Job.find({ ...searchOptions, expired: false });

  res.status(200).render("job/viewJob", {
    jobs,
    searchQuery,
  });
});



