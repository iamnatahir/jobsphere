// controllers/adminController.js
const User = require('../models/user');
const Job = require('../models/job');
const Application = require('../models/Application');
const UserStatus = require("../models/UserStatus");
const ErrorHandler = require("../middleware/error");
const catchAsyncErrors = require("../middleware/catchAsyncError");
const nodemailer = require('nodemailer'); // For sending emails

exports.getJobs = async (req, res) => {
  try {
    const jobs = await Job.find().populate("postedBy", "name email");
    res.status(200).json(jobs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Fetch all jobs with their respective application counts
exports.getAllJobs = async (req, res) => {
  try {
    const { search, industry } = req.query;
    let query = {};

    // Handle search filtering
    if (search) {
      query = {
        $or: [
          { jobTitle: { $regex: search, $options: 'i' } },
          { companyName: { $regex: search, $options: 'i' } }
        ]
      };
    }

    // Handle industry filtering
    if (industry) {
      query.industry = industry;
    }

    // Fetch all jobs matching the query
    const jobs = await Job.find(query);

    // Aggregate application counts by jobId
    const applicationCounts = await Application.aggregate([
      { $group: { _id: "$jobId", count: { $sum: 1 } } }, // Group by jobId and count
      {
        $lookup: {
          from: "jobs", // Join with the jobs collection
          localField: "_id", 
          foreignField: "_id",
          as: "jobDetails",
        },
      },
      { $unwind: "$jobDetails" },
      { $project: { jobId: "$_id", count: 1 } }, // Select only required fields
    ]);

    // Map application counts to jobs
    const jobWithApplicationCounts = jobs.map(job => {
      const applicationData = applicationCounts.find(app => app.jobId.toString() === job._id.toString());
      return {
        ...job.toObject(),
        applicationCount: applicationData ? applicationData.count : 0, // Show 0 if no applications exist
      };
    });

    // Render the data
    res.render('dashboard/job_management', { jobs: jobWithApplicationCounts });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).send('Server Error');
  }
};


// Delete a specific job by ID
exports.deleteJob = async (req, res) => {
  try {
    const { id } = req.params;
    await Job.findByIdAndDelete(id);
    res.redirect('/admin/job_management/all'); // Redirect back after deletion
  } catch (error) {
    console.error('Error deleting job:', error);
    res.status(500).send('Server Error');
  }
};

// Fetch top 10 trending jobs based on the number of applications
exports.getTopTrendingJobs = async (req, res) => {
  try {
    // Aggregate the top 10 jobs by number of applications
    const trendingJobs = await Application.aggregate([
      { $group: { _id: "$jobId", count: { $sum: 1 } } }, // Group by jobId and count applications
      {
        $lookup: {
          from: "jobs", // Join with the jobs collection
          localField: "_id", // Match the jobId
          foreignField: "_id",
          as: "jobDetails",
        },
      },
      { $unwind: "$jobDetails" }, // Flatten the jobDetails array
      { $project: { jobId: "$_id", title: "$jobDetails.jobTitle", company: "$jobDetails.companyName", count: 1 } }, // Select relevant fields
      { $sort: { count: -1 } }, // Sort by number of applications
      { $limit: 10 } // Get only the top 10 results
    ]);

    res.render('dashboard/top_trending_jobs', { trendingJobs });
  } catch (error) {
    console.error('Error fetching top 10 trending jobs:', error);
    res.status(500).send('Server Error');
  }
};

// Dashboard Stats
exports.getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalJobs = await Job.countDocuments();
    const totalApplications = await Application.countDocuments();

    // Aggregate jobs by industry and count
    const jobsByIndustry = await Job.aggregate([
      { $group: { _id: "$industry", count: { $sum: 1 } } }, // Group by industry and count
      { $sort: { count: -1 } } // Sort by job count in descending order
    ]);

    const mostAppliedJob = await Application.aggregate([
      { $group: { _id: "$jobId", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 },
      {
        $lookup: {
          from: "jobs", // Name of the Job collection
          localField: "_id", // `_id` from the Application aggregation
          foreignField: "_id", // `_id` in the Job collection
          as: "jobDetails", // Alias for the joined data
        },
      },
      { $unwind: "$jobDetails" }, // Unwind the jobDetails array to get a single document
      { $project: { jobId: "$_id", title: "$jobDetails.jobTitle",companyName: "$jobDetails.companyName", count: 1 } },
    ]);

    const mostAppliedJobDetails = mostAppliedJob.length
      ? { jobId: mostAppliedJob[0].jobId, title: mostAppliedJob[0].title, companyName: mostAppliedJob[0].companyName, count: mostAppliedJob[0].count }
      : null;

    res.render('dashboard/user_dashboard', {
      totalUsers,
      totalJobs,
      totalApplications,
      mostAppliedJob: mostAppliedJobDetails,
      jobsByIndustry, // Pass the jobs by industry
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).send('Error');
  }
};



// filter user on behalf of role
exports.filterRole = async (req, res) => {
  try {
    const { role, isActive } = req.query;

    const query = {};
    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === "true";

    console.log("Generated Query Object:", query); // Log the query for debugging

    const users = await User.find(query, "name email role isActive createdAt");
    console.log("Matched Users:", users); // Log the matched users for debugging

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getUsersWithStatus = async (req, res) => {
  try {
    const users = await User.aggregate([
      {
        $lookup: {
          from: "userstatuses", // Collection name (lowercase + pluralized)
          localField: "_id",
          foreignField: "userId",
          as: "status"
        }
      },
      {
        $addFields: {
          isActive: { $ifNull: [{ $arrayElemAt: ["$status.isActive", 0] }, true] }
        }
      },
      {
        $project: { status: 0 } // Remove status field after merging
      }
    ]);

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Error fetching users", error });
  }
};

// Fetch all users with filtering options and their statuses
exports.getUsers = async (req, res) => {
  try {
    const { role, name } = req.query;

    // Build dynamic query for users
    let query = {};
    if (role) query.role = role; // Filter by role if provided
    if (name) query.name = { $regex: name, $options: "i" }; // Case-insensitive search for name

    // Fetch users and statuses
    const users = await User.find(query); // Filter users based on query
    const statuses = await UserStatus.find();

    // Map userId to isActive
    const userStatusMap = {};
    statuses.forEach((status) => {
      userStatusMap[status.userId] = status.isActive;
    });

    // Combine users with their statuses
    const usersWithStatus = users.map((user) => ({
      ...user._doc,
      isActive: userStatusMap[user._id] ?? true, // Default to true if no status exists
    }));

    // Render user management page with users and statuses
    res.render("dashboard/user_management", { users: usersWithStatus });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching users");
  }
};

// Deactivate a user by modifying the UserStatus
exports.deactivateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    await UserStatus.findOneAndUpdate(
      { userId },
      { isActive: false },
      { upsert: true }
    );
    res.redirect("/admin/users");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error deactivating user");
  }
};

// Activate a user by modifying the UserStatus
exports.activateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    await UserStatus.findOneAndUpdate(
      { userId },
      { isActive: true },
      { upsert: true }
    );
    res.redirect("/admin/users");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error activating user");
  }
};


// // Delete expired jobs
// exports.deleteExpiredJobs = async () => {
//   const expiryDate = new Date();
//   expiryDate.setMonth(expiryDate.getMonth() - 3); // Jobs older than 3 months

//   const result = await Job.deleteMany({ createdAt: { $lt: expiryDate } });
//   console.log('Deleted expired jobs:', result);
// };
exports.markExpiredJobs = async () => {
  const expiryDate = new Date(); 
  expiryDate.setMonth(expiryDate.getMonth() - 3); // Jobs older than 3 months 

  const result = await Job.updateMany(
    { createdAt: { $lt: expiryDate } }, // Filter jobs older than 3 months
    { $set: { expired: true } }          // Update the expired field to true
  );

  console.log('Marked expired jobs:', result);
};

// Deactivate users who have been inactive for a long period
exports.deactivateInactiveUsers = async () => {
  const inactivityDate = new Date();
  inactivityDate.setFullYear(inactivityDate.getFullYear() - 1); // Users inactive for over a year

  const result = await User.updateMany(
    { lastLogin: { $lt: inactivityDate } },
    { $set: { isActive: false } }
  );
  console.log('Deactivated users:', result);
};