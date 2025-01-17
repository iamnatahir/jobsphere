//models/Message.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    chatId: { type: String, required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    isRead: { type: Boolean, default: false },
});

module.exports = mongoose.model('Message', messageSchema);
