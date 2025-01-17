const express = require("express");   
const {authenticateAccessToken} = require("../middleware/auth");
const {
  getUsers,
  getJobs,
  getAllJobs,
  filterRole,
  deactivateUser,
  activateUser,
  deleteJob,
  getTopTrendingJobs,
} = require("../controller/adminController");

const router = express.Router();
// Routes
router.get("/users",authenticateAccessToken, getUsers);
router.get('/job_management/all',authenticateAccessToken, getAllJobs);
router.get("/jobs",authenticateAccessToken, getJobs);

// User Management APIs
router.get("/filter-role",authenticateAccessToken, filterRole);
router.post("/deactivate/:userId",authenticateAccessToken, deactivateUser);
router.post("/activate/:userId",authenticateAccessToken, activateUser);

// Job Management APIs
router.get('/job_management/all/:id/delete',authenticateAccessToken, deleteJob);
router.get('/top_trending_jobs',authenticateAccessToken, getTopTrendingJobs);


module.exports = router;
