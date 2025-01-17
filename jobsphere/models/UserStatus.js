const mongoose = require("mongoose");

const UserStatusSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  isActive: { type: Boolean, default: true }, // Active by default
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("UserStatus", UserStatusSchema);
