const express = require("express");
const {
  postApplication,
  employerGetAllApplications,
  jobseekerGetAllApplications,
  jobseekerDeleteApplication,
  updateApplicationStatus
} = require("../controller/applicationController");

const { authenticateAccessToken } = require("../middleware/auth");

const router = express.Router();

// Routes for job applications
router.post("/post", authenticateAccessToken, postApplication);
router.get("/employer/getall", authenticateAccessToken, employerGetAllApplications);
router.get("/jobseeker/getall", authenticateAccessToken, jobseekerGetAllApplications);
router.delete("/delete/:id", authenticateAccessToken, jobseekerDeleteApplication);
// Route for updating application status
router.put('/update/status/:id', authenticateAccessToken, updateApplicationStatus);


module.exports = router;





