// routes/notificationRoutes.js
const express = require("express");
const { sendNotification } = require("../controller/notificationController");
const { authenticateAccessToken } = require("../middleware/auth");
const { getJobSeekerDashboard, getUserNotifications } = require("../controller/notificationController");
const router = express.Router();

router.post("/", sendNotification);
//router.get("/:userId", getNotifications);
router.get("/users/jobSeeker_dashboard", getJobSeekerDashboard);
router.get("/notifications", authenticateAccessToken, getUserNotifications);
module.exports = router;
