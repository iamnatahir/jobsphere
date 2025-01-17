const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String, required: true },
    job: { type: mongoose.Schema.Types.ObjectId, ref: "Job" }, // Add if linking jobs
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true } // Ensures createdAt and updatedAt fields
);

module.exports = mongoose.model("Notification", notificationSchema);
