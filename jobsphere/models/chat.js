const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
    chatId: { type: String, required: true, unique: true },
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
});

module.exports = mongoose.model('Chat', chatSchema);