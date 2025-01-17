// controllers/dashboardController.js
const Notification = require('../models/notification');

exports.getDashboard = async (req, res) => {
    try {
        const notifications = await Notification.find({ userId: req.session.user._id }).sort({ createdAt: -1 });

        res.render('dashboard', {
            notifications,
            user: req.session.user // Pass other necessary data
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
