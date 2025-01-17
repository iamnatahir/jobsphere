const express = require("express");
const {
  getUsers,
  getJobs,
  getDashboardStats,
  deleteExpiredJobs,
} = require("../controller/adminController");
const { getDashboard } = require('../controller/dashboardController');
const { authenticateAccessToken } = require('../middleware/auth');

const router = express.Router();

//get users
router.get("/getUsers", getUsers);

//get jobs
router.get("/getJobs", getJobs);

// Dashboard stats
router.get('/stats',authenticateAccessToken, getDashboardStats);

// Delete expired jobs
router.delete("/jobs/delete-expired", async (req, res) => {
  try {
    await deleteExpiredJobs();
    res.status(200).json({ message: "Expired jobs deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Deactivate users who have been inactive
router.post("/users/deactivate-inactive", async (req, res) => {
  try {
    await deactivateInactiveUsers();
    res.status(200).json({ message: "Inactive users deactivated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;