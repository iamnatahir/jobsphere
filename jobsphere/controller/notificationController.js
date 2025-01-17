// controllers/notificationController.js
const Notification = require("../models/notification");

exports.sendNotification = async (req, res) => {
  try {
    console.log("Request body:", req.body);
    const { userId, message } = req.body;
    const notification = new Notification({ user: userId, message });
    await notification.save();
    res.status(201).json({ message: "Notification sent successfully", notification });
  } catch (err) {
    console.error("Error sending notification:", err.message);
    res.status(500).json({ error: err.message });
  }
};


exports.getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const notifications = await Notification.find({ user: userId }).sort({ createdAt: -1 }).populate("job");;

    res.render("notifications/notifications", { notifications });
  } catch (err) {
    console.error("Error rendering notifications view:", err.message);
    res.status(500).send("Unable to load notifications view");
  }
};


// controllers/notificationController.js
exports.getJobSeekerDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    const notifications = await Notification.find({ user: userId }).sort({ createdAt: -1 });

    console.log("Notifications:", notifications);
    res.render("dashboard", { user: req.user, notifications });
  } catch (err) {
    console.error("Error fetching notifications:", err.message);
    res.status(500).send("An error occurred while loading the dashboard.");
  }
};



